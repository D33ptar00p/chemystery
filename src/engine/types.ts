import type { Reaction } from '../data/reactions'

/** How many of each species are present in one group on the canvas. */
export type SpeciesCounts = Record<string, number>

export interface ReactionOutcome {
  reaction: Reaction
  /** How many times the balanced equation runs, set by the limiting reagent. */
  times: number
  /** Species consumed, in whole units. */
  consumed: SpeciesCounts
  /** Species produced. */
  produced: SpeciesCounts
  /** Reactants left over after the limiting reagent runs out. */
  leftover: SpeciesCounts
  /** The reactant that ran out first and capped the reaction. */
  limitingSpeciesId: string
}
