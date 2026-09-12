import type { Reaction } from '../data/reactions'
import type { ReactionOutcome, SpeciesCounts } from './types'

/**
 * How many whole times `reaction` can run given `counts`, and which reactant
 * caps it. Returns times = 0 when any reactant is missing or too scarce.
 */
export function timesRunnable(
  reaction: Reaction,
  counts: SpeciesCounts,
): { times: number; limitingSpeciesId: string } {
  let minRatio = Infinity
  let limitingSpeciesId = reaction.reactants[0].speciesId

  for (const { speciesId, coefficient } of reaction.reactants) {
    const available = counts[speciesId] ?? 0
    // Compare the UNFLOORED ratio. Flooring first makes 3 H2 and 1 O2 tie at
    // one run each, which hides that the oxygen is what actually ran out.
    const ratio = available / coefficient
    if (ratio < minRatio) {
      minRatio = ratio
      limitingSpeciesId = speciesId
    }
  }

  return { times: Math.floor(minRatio), limitingSpeciesId }
}

/**
 * Run a reaction to exhaustion of its limiting reagent.
 *
 * Leftovers are deliberately kept: dropping three H₂ and one O₂ should leave
 * one H₂ behind, because that is what actually happens and it is the clearest
 * way to show a limiting reagent.
 */
export function applyReaction(reaction: Reaction, counts: SpeciesCounts): ReactionOutcome | null {
  const { times, limitingSpeciesId } = timesRunnable(reaction, counts)
  if (times < 1) return null

  const consumed: SpeciesCounts = {}
  const produced: SpeciesCounts = {}
  const leftover: SpeciesCounts = { ...counts }

  for (const { speciesId, coefficient } of reaction.reactants) {
    const used = coefficient * times
    consumed[speciesId] = used
    leftover[speciesId] = (leftover[speciesId] ?? 0) - used
  }

  for (const { speciesId, coefficient } of reaction.products) {
    produced[speciesId] = (produced[speciesId] ?? 0) + coefficient * times
  }

  for (const id of Object.keys(leftover)) {
    if (leftover[id] <= 0) delete leftover[id]
  }

  return { reaction, times, consumed, produced, leftover, limitingSpeciesId }
}
