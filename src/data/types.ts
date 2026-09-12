/**
 * Shared data shapes for CheMystery.
 *
 * Species carry CONNECTIVITY, not coordinates: atoms, bonds, and the lone-pair
 * count on each atom. 3D positions are computed by the VSEPR generator in
 * `src/engine/geometry.ts`.
 *
 * Hand-authoring coordinates was viable for ten molecules and is not viable for
 * a hundred. Lone pairs are the load-bearing field — they are what makes water
 * bent and ammonia pyramidal rather than both being tetrahedral.
 */

export type Phase = 'solid' | 'liquid' | 'gas' | 'aqueous'

export interface SpeciesAtom {
  element: string
  /** Lone pairs on THIS atom. Bonded neighbours + lone pairs = steric number. */
  lonePairs: number
}

export interface SpeciesBond {
  a: number
  b: number
  order: 1 | 2 | 3
}

export interface BondLengthOverride {
  a: number
  b: number
  /** Angstroms. Overrides the covalent-radii estimate for this specific bond. */
  length: number
}

export interface Species {
  id: string
  /** Display formula, with subscripts. */
  formula: string
  name: string
  phase: Phase
  atoms: SpeciesAtom[]
  bonds: SpeciesBond[]
  /** Atom the geometry is built outward from. Usually the central atom. */
  rootAtom: number
  /** VSEPR shape of the root, for display only. */
  shape: string | null
  /** What the SUBSTANCE looks like in bulk — not the colour of its atoms. */
  bulkAppearance: string
  bulkColour: string
  /** Present when this is not a discrete molecule (ionic, metallic, network). */
  latticeCaveat?: string
  bondLengthOverrides?: BondLengthOverride[]
  /**
   * Explicit coordinates in angstroms, bypassing the VSEPR generator.
   *
   * An escape hatch for structures the generator genuinely cannot build: cages
   * and fused ring systems, where several rings must close at once. The
   * generator lays out one ring and grows a tree from it, which cannot satisfy
   * a second independent closure. Use sparingly — authored coordinates are the
   * thing this schema exists to avoid.
   */
  coordinates?: [number, number, number][]
}

export type ReactionType =
  | 'synthesis'
  | 'decomposition'
  | 'combustion'
  | 'single-displacement'
  | 'double-displacement'
  | 'acid-base'
  | 'precipitation'
  | 'redox'
  | 'esterification'
  | 'addition'
  | 'substitution'
  | 'oxidation'
  | 'reduction'

/** What the user must supply before the reaction will proceed. */
export type Activation = 'spontaneous' | 'spark' | 'heat' | 'electricity' | 'light' | 'catalyst'

export interface Term {
  speciesId: string
  coefficient: number
}

/**
 * The visual character of a reaction, driving the burst played in the workspace.
 *
 * Derived once from each reaction's `observable` text and then stored
 * explicitly, rather than matched at runtime: keyword-sniffing a prose sentence
 * every time a reaction fires would be both slower and quietly fragile — an
 * edit to the wording would silently change the animation.
 */
export type ReactionEffect =
  /** Bright sustained flame — combustion. */
  | 'flame'
  /** A single brilliant instant — explosive or photochemical. */
  | 'flash'
  /** Gas evolved: fizzing, effervescence, electrolysis. */
  | 'bubbles'
  /** An insoluble solid dropping out of solution. */
  | 'precipitate'
  /** Dense fumes or vapour. */
  | 'smoke'
  /** Incandescence without flame — glowing embers, rusting, slow oxidation. */
  | 'glow'
  /** A colour appearing, fading or shifting. */
  | 'colour-change'
  /** No visible change; the mixture simply warms. */
  | 'warmth'

export interface Reaction {
  id: string
  equation: string
  reactants: Term[]
  products: Term[]
  type: ReactionType
  activation: Activation
  /** What a person would actually see. The source of `effect`. */
  observable: string
  /** How that observable is drawn in the workspace. */
  effect: ReactionEffect
  explanation: string
}
