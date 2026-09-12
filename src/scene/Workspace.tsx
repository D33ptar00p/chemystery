import { Canvas } from '@react-three/fiber'
import { OrbitControls, ContactShadows, Html } from '@react-three/drei'
import { useSandboxStore, type PendingReaction } from '../state/useSandboxStore'
import { SPECIES } from '../data/species'
import { MoleculeMesh, moleculeTopOffset } from './MoleculeMesh'
import { Draggable } from './Draggable'
import { ReactionGlow } from './ReactionEffect'
import { StudioEnvironment } from './StudioEnvironment'
import { ReactionBurst } from './ReactionBurst'
import { useSceneTheme, type Theme } from '../ui/useTheme'
import type { AccentId } from '../ui/designs'

/** Height above the ground plane at which molecules sit. */
const HOVER_HEIGHT = 2

export function Workspace({
  pending,
  theme,
  accent,
}: {
  pending: PendingReaction | null
  /* Passed as props rather than read from context: react-three-fiber renders
     through a separate reconciler root, so React context does not cross into
     <Canvas> without an explicit bridge. */
  theme: Theme
  accent: AccentId
}) {
  const scene = useSceneTheme(theme, accent)
  const entities = useSandboxStore((s) => s.entities)
  const selectedId = useSandboxStore((s) => s.selectedId)
  const move = useSandboxStore((s) => s.move)
  const lastFlash = useSandboxStore((s) => s.lastFlash)
  const select = useSandboxStore((s) => s.select)

  const highlighted = new Set(pending?.entityIds ?? [])

  return (
    <Canvas
      camera={{ position: [0, 26, 30], fov: 40 }}
      dpr={[1, 2]}
      onPointerMissed={() => select(null)}
    >
      <color attach="background" args={[scene.canvas]} />
      <fog attach="fog" args={[scene.canvas, scene.fogNear, scene.fogFar]} />

      <ambientLight intensity={scene.ambient} />
      <directionalLight position={[8, 14, 6]} intensity={scene.keyLight} castShadow />
      <directionalLight position={[-10, 6, -8]} intensity={scene.fillLight} color={scene.fillColour} />
      <hemisphereLight args={[scene.hemiSky, scene.hemiGround, 0.7]} />
      <StudioEnvironment intensity={scene.envIntensity} />

      <ContactShadows position={[0, 0, 0]} opacity={scene.shadowOpacity} scale={60} blur={2.4} far={12} />

      {entities.map((entity) => (
        <Draggable
          key={entity.id}
          position={entity.position}
          onDrag={(p) => move(entity.id, p)}
          onSelect={() => select(entity.id)}
        >
          {/* Float molecules clear of the ground so spheres are not half-buried. */}
          <group position={[0, HOVER_HEIGHT, 0]}>
            <MoleculeMesh
              speciesId={entity.speciesId}
              selected={selectedId === entity.id || highlighted.has(entity.id)}
              scene={scene}
            />
            <Html
              position={[0, moleculeTopOffset(entity.speciesId) + 0.3, 0]}
              // Not `center`: a world-space Y offset gets foreshortened by the
              // overhead camera, so the label lands on the molecule. Nudging in
              // screen space instead keeps it clear at any camera angle.
              style={{
                pointerEvents: 'none',
                userSelect: 'none',
                transform: 'translate(-50%, -190%)',
              }}
            >
              <span
                className={
                  selectedId === entity.id || highlighted.has(entity.id)
                    ? 'mol-label active'
                    : 'mol-label'
                }
              >
                {SPECIES[entity.speciesId].formula}
              </span>
            </Html>
          </group>
        </Draggable>
      ))}

      {pending && <ReactionGlow centre={pending.centre} colour={scene.glow} />}
      <ReactionBurst flash={lastFlash} />

      <OrbitControls
        makeDefault
        enablePan={false}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2.2}
        minDistance={12}
        maxDistance={70}
      />
    </Canvas>
  )
}
