import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { PMREMGenerator } from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

/**
 * A neutral studio environment for metals to reflect.
 *
 * A `metalness: 0.85` material reflects its surroundings and emits almost no
 * diffuse colour of its own. With no environment map it therefore renders
 * near-black — which is why silvery sodium and magnesium looked like lumps of
 * coal. On the dark canvas that passed unnoticed; on a light one it is obviously
 * wrong, and it was wrong in both.
 *
 * `RoomEnvironment` is bundled inside three itself, so this costs no network
 * request — unlike drei's `<Environment preset>`, which fetches an HDR from a CDN
 * and was removed from this app for exactly that reason.
 */
export function StudioEnvironment({ intensity }: { intensity: number }) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)

  useEffect(() => {
    const pmrem = new PMREMGenerator(gl)
    const target = pmrem.fromScene(new RoomEnvironment(), 0.04)
    scene.environment = target.texture
    return () => {
      scene.environment = null
      target.dispose()
      pmrem.dispose()
    }
  }, [gl, scene])

  // Separate effect: intensity changes with the theme, but the costly PMREM
  // bake must not be redone for it.
  useEffect(() => {
    scene.environmentIntensity = intensity
  }, [scene, intensity])

  return null
}
