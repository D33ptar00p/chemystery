/**
 * Palette entries for the elements themselves, derived from ELEMENTS.
 *
 * Derived rather than hand-listed so that all 118 are covered automatically and
 * cannot drift out of sync with the element table.
 *
 * Three different physical realities are represented honestly here:
 *
 *  - **Diatomic molecules** (H₂, N₂, O₂, F₂, Cl₂, Br₂, I₂) are real discrete
 *    molecules. No caveat needed.
 *  - **Noble gases** genuinely are single atoms. No caveat needed either —
 *    this is the only case where one sphere is the literal truth.
 *  - **Everything else** is a lattice: metallic, covalent-network or molecular.
 *    A single sphere is a stand-in for one atom inside that lattice, and each
 *    carries a caveat saying so. Without it the app would teach that a lump of
 *    iron is a box of loose iron atoms.
 */

import { ELEMENTS, type Element } from './elements'
import type { Species } from './types'

interface DiatomicSpec {
  length: number
  order: 1 | 2 | 3
  lonePairs: number
}

/** Bond lengths are equilibrium gas-phase values (CRC Handbook). */
const DIATOMIC: Record<string, DiatomicSpec> = {
  H: { length: 0.741, order: 1, lonePairs: 0 },
  N: { length: 1.098, order: 3, lonePairs: 1 },
  O: { length: 1.208, order: 2, lonePairs: 2 },
  F: { length: 1.412, order: 1, lonePairs: 3 },
  Cl: { length: 1.988, order: 1, lonePairs: 3 },
  Br: { length: 2.281, order: 1, lonePairs: 3 },
  I: { length: 2.666, order: 1, lonePairs: 3 },
}

const METAL_CATEGORIES = new Set([
  'alkali-metal',
  'alkaline-earth',
  'transition-metal',
  'post-transition-metal',
  'lanthanide',
  'actinide',
])

/** Subscript digits, so formulas read as chemistry rather than code. */
const SUBSCRIPT: Record<string, string> = { '2': '₂', '4': '₄', '8': '₈' }
const sub = (s: string) => s.replace(/[0-9]/g, (d) => SUBSCRIPT[d] ?? d)

function caveatFor(element: Element): string | undefined {
  if (element.category === 'noble-gas') return undefined

  if (METAL_CATEGORIES.has(element.category)) {
    return `${element.name} metal is a lattice of atoms sharing a sea of delocalised electrons, not a collection of separate atoms. This sphere stands for one atom inside that metal.`
  }
  if (element.category === 'metalloid') {
    return `Solid ${element.name.toLowerCase()} is an extended covalent network where every atom is bonded to its neighbours. This sphere stands for one atom inside that network.`
  }
  if (element.symbol === 'C') {
    return 'Graphite is a covalent network of bonded sheets, not a single loose atom. This sphere stands for one carbon atom within that lattice.'
  }
  if (element.symbol === 'S') {
    return 'Solid sulfur is really made of S₈ rings — eight atoms in a crown. This single sphere is a simplification used so that equations can be written the usual way.'
  }
  if (element.symbol === 'P') {
    return 'White phosphorus is really P₄, a tetrahedron of four atoms. This single sphere is a simplification used so that equations can be written the usual way.'
  }
  if (element.category === 'unknown') {
    return `Only a handful of atoms of ${element.name.toLowerCase()} have ever been made, and never enough to see. Everything shown here is inference, not observation.`
  }
  return `Elemental ${element.name.toLowerCase()} does not exist as isolated atoms under ordinary conditions. This sphere stands for one atom inside the solid.`
}

function speciesFor(element: Element): Species {
  const diatomic = DIATOMIC[element.symbol]

  if (diatomic) {
    return {
      id: `${element.symbol}2`,
      formula: sub(`${element.symbol}2`),
      name: element.name,
      phase: element.phase,
      rootAtom: 0,
      shape: 'linear',
      atoms: [
        { element: element.symbol, lonePairs: diatomic.lonePairs },
        { element: element.symbol, lonePairs: diatomic.lonePairs },
      ],
      bonds: [{ a: 0, b: 1, order: diatomic.order }],
      bondLengthOverrides: [{ a: 0, b: 1, length: diatomic.length }],
      bulkAppearance: element.appearance,
      bulkColour: element.colour,
    }
  }

  return {
    id: element.symbol,
    formula: element.symbol,
    name: element.name,
    phase: element.phase,
    rootAtom: 0,
    shape: null,
    atoms: [{ element: element.symbol, lonePairs: element.category === 'noble-gas' ? 4 : 0 }],
    bonds: [],
    bulkAppearance: element.appearance,
    bulkColour: element.colour,
    latticeCaveat: caveatFor(element),
  }
}

export const ELEMENT_SPECIES: Record<string, Species> = Object.fromEntries(
  Object.values(ELEMENTS).map((element) => {
    const species = speciesFor(element)
    return [species.id, species]
  }),
)
