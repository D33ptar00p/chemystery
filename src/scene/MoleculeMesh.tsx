import { useMemo } from 'react'
import { SPECIES } from '../data/species'
import { ELEMENTS } from '../data/elements'
import { coordinatesFor } from '../engine/geometry'
import { rimScaleFor, type SceneTheme } from '../ui/useTheme'

/**
 * One species drawn as a space-filling (CPK) model: a sphere per atom at its
 * van der Waals radius, positioned so bonded spheres interpenetrate. No bond
 * cylinders — in this representation the fusion IS the bond.
 *
 * Because there are no sticks to imply structure, two same-coloured spheres
 * (the pair in H2, in O2) would read as one blob. A slightly darker, slightly
 * larger backing sphere gives each atom a rim so the boundary stays visible.
 */
/**
 * Height of the tallest point of a molecule, so a label can sit just clear of it
 * rather than at a fixed guess that clips into big atoms like chlorine.
 */
export function moleculeTopOffset(speciesId: string): number {
  const species = SPECIES[speciesId]
  const coords = coordinatesFor(species)
  return Math.max(
    ...coords.map((p, i) => p[1] + (ELEMENTS[species.atoms[i].element]?.vdwRadius ?? 1.5)),
  )
}

export function MoleculeMesh({
  speciesId,
  selected,
  scene,
}: {
  speciesId: string
  selected: boolean
  scene: SceneTheme
}) {
  const species = SPECIES[speciesId]

  const atoms = useMemo(() => {
    const coords = coordinatesFor(species)
    return species.atoms.map((atom, i) => ({
      key: i,
      position: coords[i],
      element: ELEMENTS[atom.element],
    }))
  }, [species])

  return (
    <group>
      {atoms.map(({ key, position, element }) => (
        <group key={key} position={position}>
          {/*
            Rim shell: renders back faces only, so it shows as an outline.
            Selection is signalled HERE rather than by tinting the sphere —
            an emissive tint on the atom overwhelms its element colour
            (silvery sodium turned blue), which defeats the whole point of
            colouring atoms by real appearance.
          */}
          {/* Outline widens for atoms whose colour is close to the canvas, so a
              near-white hydrogen still reads without touching its colour. */}
          <mesh
            scale={
              element.vdwRadius *
              (rimScaleFor(element.colour, scene) + (selected ? 0.05 : 0))
            }
          >
            <sphereGeometry args={[1, 32, 24]} />
            <meshBasicMaterial color={selected ? scene.glow : scene.rim} side={1} />
          </mesh>

          <mesh scale={element.vdwRadius}>
            <sphereGeometry args={[1, 48, 32]} />
            <meshStandardMaterial
              color={element.colour}
              roughness={element.material === 'metallic' ? 0.25 : element.material === 'gas' ? 0.5 : 0.8}
              metalness={element.material === 'metallic' ? 0.85 : 0.05}
              transparent={element.translucent}
              opacity={element.translucent ? scene.translucentOpacity : 1}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}
