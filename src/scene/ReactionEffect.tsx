import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'

/**
 * A pulsing ring marking a cluster that is ready to react but is waiting for
 * the user to supply activation energy. It deliberately does NOT fire on its
 * own: a hydrogen/oxygen mixture really does sit inert until something ignites it.
 */
export function ReactionGlow({
  centre,
  colour,
}: {
  centre: [number, number, number]
  colour: string
}) {
  const ref = useRef<Mesh>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    const pulse = 1 + Math.sin(t * 3) * 0.06
    ref.current.scale.set(pulse, pulse, 1)
    const material = ref.current.material as { opacity: number }
    material.opacity = 0.35 + Math.sin(t * 3) * 0.15
  })

  return (
    <mesh ref={ref} position={[centre[0], 0.02, centre[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[4.4, 5.1, 64]} />
      <meshBasicMaterial color={colour} transparent opacity={0.4} />
    </mesh>
  )
}
