/**
 * Interim species set — replaced wholesale once the full generated tables land.
 *
 * Coordinates are NOT stored. Each species gives connectivity plus the lone-pair
 * count on every atom, and `src/engine/geometry.ts` computes 3D positions from
 * VSEPR rules. Bond lengths are equilibrium gas-phase values (CRC Handbook).
 */

import type { Species } from './types'
import { ELEMENT_SPECIES } from './species-elements'
import { INORGANIC } from './species-inorganic'
import { ORGANIC } from './species-organic'

export type { Species, SpeciesAtom, SpeciesBond, Phase } from './types'

/** Small inorganic set authored by hand; merged with the generated tables below. */
const BASE: Record<string, Species> = {
  H2: {
    id: 'H2',
    formula: 'H₂',
    name: 'Hydrogen',
    phase: 'gas',
    rootAtom: 0,
    shape: 'linear',
    atoms: [
      { element: 'H', lonePairs: 0 },
      { element: 'H', lonePairs: 0 },
    ],
    bonds: [{ a: 0, b: 1, order: 1 }],
    bondLengthOverrides: [{ a: 0, b: 1, length: 0.741 }],
    bulkAppearance: 'Colourless, odourless, extremely flammable gas.',
    bulkColour: '#eef2f4',
  },

  O2: {
    id: 'O2',
    formula: 'O₂',
    name: 'Oxygen',
    phase: 'gas',
    rootAtom: 0,
    shape: 'linear',
    atoms: [
      { element: 'O', lonePairs: 2 },
      { element: 'O', lonePairs: 2 },
    ],
    bonds: [{ a: 0, b: 1, order: 2 }],
    bondLengthOverrides: [{ a: 0, b: 1, length: 1.208 }],
    bulkAppearance: 'Colourless, odourless gas. Supports combustion but does not itself burn.',
    bulkColour: '#eef2f4',
  },

  H2O: {
    id: 'H2O',
    formula: 'H₂O',
    name: 'Water',
    phase: 'liquid',
    rootAtom: 0,
    shape: 'bent (104.5°)',
    atoms: [
      { element: 'O', lonePairs: 2 },
      { element: 'H', lonePairs: 0 },
      { element: 'H', lonePairs: 0 },
    ],
    bonds: [
      { a: 0, b: 1, order: 1 },
      { a: 0, b: 2, order: 1 },
    ],
    bondLengthOverrides: [
      { a: 0, b: 1, length: 0.958 },
      { a: 0, b: 2, length: 0.958 },
    ],
    bulkAppearance: 'Colourless, transparent liquid. Faintly blue in a deep layer.',
    bulkColour: '#cfe6f0',
  },

  CO2: {
    id: 'CO2',
    formula: 'CO₂',
    name: 'Carbon dioxide',
    phase: 'gas',
    rootAtom: 1,
    shape: 'linear (180°)',
    atoms: [
      { element: 'O', lonePairs: 2 },
      { element: 'C', lonePairs: 0 },
      { element: 'O', lonePairs: 2 },
    ],
    bonds: [
      { a: 1, b: 0, order: 2 },
      { a: 1, b: 2, order: 2 },
    ],
    bondLengthOverrides: [
      { a: 1, b: 0, length: 1.163 },
      { a: 1, b: 2, length: 1.163 },
    ],
    bulkAppearance: 'Colourless, odourless gas. Turns limewater milky.',
    bulkColour: '#eef2f4',
  },

  CH4: {
    id: 'CH4',
    formula: 'CH₄',
    name: 'Methane',
    phase: 'gas',
    rootAtom: 0,
    shape: 'tetrahedral (109.5°)',
    atoms: [
      { element: 'C', lonePairs: 0 },
      { element: 'H', lonePairs: 0 },
      { element: 'H', lonePairs: 0 },
      { element: 'H', lonePairs: 0 },
      { element: 'H', lonePairs: 0 },
    ],
    bonds: [
      { a: 0, b: 1, order: 1 },
      { a: 0, b: 2, order: 1 },
      { a: 0, b: 3, order: 1 },
      { a: 0, b: 4, order: 1 },
    ],
    bondLengthOverrides: [1, 2, 3, 4].map((b) => ({ a: 0, b, length: 1.087 })),
    bulkAppearance: 'Colourless, odourless flammable gas. (Household gas is odourised artificially.)',
    bulkColour: '#eef2f4',
  },

  Cl2: {
    id: 'Cl2',
    formula: 'Cl₂',
    name: 'Chlorine',
    phase: 'gas',
    rootAtom: 0,
    shape: 'linear',
    atoms: [
      { element: 'Cl', lonePairs: 3 },
      { element: 'Cl', lonePairs: 3 },
    ],
    bonds: [{ a: 0, b: 1, order: 1 }],
    bondLengthOverrides: [{ a: 0, b: 1, length: 1.988 }],
    bulkAppearance: 'Pale yellow-green, acrid, toxic gas.',
    bulkColour: '#d7e663',
  },

  HCl: {
    id: 'HCl',
    formula: 'HCl',
    name: 'Hydrogen chloride',
    phase: 'gas',
    rootAtom: 1,
    shape: 'linear',
    atoms: [
      { element: 'H', lonePairs: 0 },
      { element: 'Cl', lonePairs: 3 },
    ],
    bonds: [{ a: 0, b: 1, order: 1 }],
    bondLengthOverrides: [{ a: 0, b: 1, length: 1.275 }],
    bulkAppearance: 'Colourless gas that fumes in moist air; dissolves to give hydrochloric acid.',
    bulkColour: '#eef2f4',
  },

  C: {
    id: 'C',
    formula: 'C',
    name: 'Carbon (graphite)',
    phase: 'solid',
    rootAtom: 0,
    shape: null,
    atoms: [{ element: 'C', lonePairs: 0 }],
    bonds: [],
    bulkAppearance: 'Soft, black, opaque solid with a metallic sheen.',
    bulkColour: '#26262b',
    latticeCaveat:
      'Graphite is a covalent network of bonded sheets, not a single loose atom. This sphere stands in for one carbon atom within that lattice.',
  },

  Na: {
    id: 'Na',
    formula: 'Na',
    name: 'Sodium',
    phase: 'solid',
    rootAtom: 0,
    shape: null,
    atoms: [{ element: 'Na', lonePairs: 0 }],
    bonds: [],
    bulkAppearance: 'Soft silvery metal, dull grey once tarnished. Cut surface is bright.',
    bulkColour: '#d9d9d2',
    latticeCaveat:
      'Sodium metal is a lattice of atoms sharing delocalised electrons, not isolated atoms. This sphere stands in for one atom within that metal.',
  },

  NaCl: {
    id: 'NaCl',
    formula: 'NaCl',
    name: 'Sodium chloride',
    phase: 'solid',
    rootAtom: 0,
    shape: null,
    atoms: [
      { element: 'Na', lonePairs: 0 },
      { element: 'Cl', lonePairs: 3 },
    ],
    bonds: [{ a: 0, b: 1, order: 1 }],
    bondLengthOverrides: [{ a: 0, b: 1, length: 2.361 }],
    bulkAppearance: 'White crystalline solid. Colourless as individual crystals.',
    bulkColour: '#f4f4f0',
    latticeCaveat:
      'Solid salt is a repeating ionic lattice where every Na⁺ is surrounded by six Cl⁻ — there is no "NaCl molecule". This ion pair is the gas-phase form, shown here to stand for one formula unit.',
  },
}

/**
 * Everything the palette can offer.
 *
 * Later entries win, so the generated tables supersede any hand-authored
 * placeholder of the same id.
 */
export const SPECIES: Record<string, Species> = {
  ...ELEMENT_SPECIES,
  ...BASE,
  ...INORGANIC,
  ...ORGANIC,
}
