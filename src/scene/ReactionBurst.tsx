import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, Object3D, type InstancedMesh, type PointLight } from 'three'
import type { ReactionEffect } from '../data/reactions'
import type { ReactionFlash } from '../state/useSandboxStore'

/**
 * The visual payoff when a reaction fires.
 *
 * Every reaction already carried an authored `observable` — "a brilliant white
 * flame too bright to look at", "the purple colour fades", "a curdy white
 * precipitate appears the instant the solutions meet". Until now all 68 were
 * rendered as text only and nothing was drawn. These bursts give that writing
 * something to do.
 *
 * One parameterised particle system covers every effect rather than eight
 * bespoke ones: they differ in colour, direction, gravity and lifetime, not in
 * kind. A single InstancedMesh keeps the whole burst to one draw call.
 */

interface BurstSpec {
  colour: string
  secondary: string
  count: number
  /** Initial speed, in angstroms per second. */
  speed: number
  /** Upward bias added to the initial direction. */
  rise: number
  /** Downward acceleration. Negative makes particles float. */
  gravity: number
  /** Radius of the initial emission sphere. */
  spread: number
  size: number
  /** How much each particle grows over its life. 1 = no growth. */
  growth: number
  life: number
  /** Peak intensity of the accompanying light. 0 for no light. */
  light: number
  opacity: number
}

const BURSTS: Record<ReactionEffect, BurstSpec> = {
  flame: {
    colour: '#ff9126', secondary: '#ffe066',
    count: 90, speed: 7, rise: 1.4, gravity: -2.5, spread: 1.4,
    size: 0.55, growth: 0.6, life: 1.1, light: 14, opacity: 0.95,
  },
  flash: {
    // Short, violent and mostly white: a single brilliant instant.
    colour: '#fff6d8', secondary: '#ffd36b',
    count: 70, speed: 15, rise: 0.2, gravity: 0, spread: 0.6,
    size: 0.5, growth: 0.4, life: 0.55, light: 26, opacity: 1,
  },
  bubbles: {
    colour: '#cfe8f5', secondary: '#ffffff',
    count: 60, speed: 2.4, rise: 3.2, gravity: -1.2, spread: 2.2,
    size: 0.42, growth: 1.25, life: 1.8, light: 0, opacity: 0.62,
  },
  precipitate: {
    // Falls and settles, rather than rising.
    colour: '#ffffff', secondary: '#dfe8ef',
    count: 85, speed: 2.6, rise: 0.4, gravity: 5.5, spread: 2.4,
    size: 0.4, growth: 1, life: 1.7, light: 0, opacity: 0.9,
  },
  smoke: {
    colour: '#c9d2da', secondary: '#eef2f5',
    count: 55, speed: 2, rise: 2.4, gravity: -0.6, spread: 1.8,
    size: 0.9, growth: 2.2, life: 2.2, light: 0, opacity: 0.4,
  },
  glow: {
    colour: '#ff6a1a', secondary: '#ffc247',
    count: 40, speed: 1.6, rise: 1, gravity: -0.8, spread: 1.6,
    size: 0.6, growth: 0.8, life: 1.6, light: 9, opacity: 0.85,
  },
  'colour-change': {
    colour: '#8f5fd8', secondary: '#4aa8ff',
    count: 60, speed: 5.5, rise: 0.3, gravity: 0, spread: 1.2,
    size: 0.45, growth: 1.4, life: 1.3, light: 0, opacity: 0.55,
  },
  warmth: {
    // Nothing to see but heat: a few faint wisps, deliberately understated.
    colour: '#ffd9a8', secondary: '#ffffff',
    count: 26, speed: 1.2, rise: 2.6, gravity: -0.9, spread: 1.4,
    size: 0.38, growth: 1.6, life: 1.4, light: 0, opacity: 0.3,
  },
}

interface Particle {
  dir: [number, number, number]
  speed: number
  origin: [number, number, number]
  spin: number
  scale: number
}

const scratch = new Object3D()

function Burst({ spec, centre }: { spec: BurstSpec; centre: [number, number, number] }) {
  const mesh = useRef<InstancedMesh>(null)
  const light = useRef<PointLight>(null)
  const start = useRef<number | null>(null)

  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: spec.count }, () => {
        // Even spherical distribution, then biased upward by `rise`.
        const theta = Math.random() * Math.PI * 2
        const phi = Math.acos(2 * Math.random() - 1)
        const dir: [number, number, number] = [
          Math.sin(phi) * Math.cos(theta),
          Math.cos(phi) + spec.rise,
          Math.sin(phi) * Math.sin(theta),
        ]
        return {
          dir,
          speed: spec.speed * (0.45 + Math.random() * 0.75),
          origin: [
            (Math.random() - 0.5) * spec.spread,
            Math.random() * spec.spread * 0.6,
            (Math.random() - 0.5) * spec.spread,
          ],
          spin: Math.random() * Math.PI,
          scale: 0.55 + Math.random() * 0.8,
        }
      }),
    [spec],
  )

  const colours = useMemo(() => {
    const a = new Color(spec.colour)
    const b = new Color(spec.secondary)
    const array = new Float32Array(spec.count * 3)
    for (let i = 0; i < spec.count; i++) {
      const c = a.clone().lerp(b, Math.random())
      array.set([c.r, c.g, c.b], i * 3)
    }
    return array
  }, [spec])

  useFrame(({ clock }) => {
    const node = mesh.current
    if (!node) return
    if (start.current === null) start.current = clock.getElapsedTime()

    const t = clock.getElapsedTime() - start.current
    const progress = t / spec.life

    if (progress >= 1) {
      node.visible = false
      if (light.current) light.current.intensity = 0
      return
    }

    // Ease-out so the burst is fastest at the instant of the reaction.
    const eased = 1 - (1 - progress) ** 2
    const fade = 1 - progress ** 1.6

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]
      const travel = p.speed * eased
      scratch.position.set(
        centre[0] + p.origin[0] + p.dir[0] * travel,
        p.origin[1] + p.dir[1] * travel - 0.5 * spec.gravity * t * t,
        centre[2] + p.origin[2] + p.dir[2] * travel,
      )
      // Never sink through the bench.
      if (scratch.position.y < 0.1) scratch.position.y = 0.1
      const grow = 1 + (spec.growth - 1) * progress
      scratch.scale.setScalar(Math.max(0.001, spec.size * p.scale * grow * (0.4 + fade * 0.6)))
      scratch.rotation.set(p.spin, p.spin * 1.3, 0)
      scratch.updateMatrix()
      node.setMatrixAt(i, scratch.matrix)
    }
    node.instanceMatrix.needsUpdate = true

    const material = node.material as { opacity: number }
    material.opacity = spec.opacity * fade

    if (light.current && spec.light > 0) {
      // Peaks immediately, then decays fast — light is the first thing to go.
      light.current.intensity = spec.light * (1 - progress) ** 2.2
    }
  })

  return (
    <group>
      <instancedMesh
        ref={mesh}
        args={[undefined, undefined, spec.count]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 10, 8]}>
          <instancedBufferAttribute attach="attributes-color" args={[colours, 3]} />
        </sphereGeometry>
        <meshBasicMaterial vertexColors transparent opacity={spec.opacity} depthWrite={false} />
      </instancedMesh>

      {spec.light > 0 && (
        <pointLight
          ref={light}
          position={[centre[0], 2.2, centre[2]]}
          color={spec.colour}
          intensity={0}
          distance={26}
        />
      )}
    </group>
  )
}

export function ReactionBurst({ flash }: { flash: ReactionFlash | null }) {
  if (!flash) return null
  // Keyed on the timestamp so firing the same reaction twice restarts the burst
  // rather than leaving the finished one on screen.
  return <Burst key={flash.at} spec={BURSTS[flash.effect]} centre={flash.centre} />
}

export { BURSTS }
