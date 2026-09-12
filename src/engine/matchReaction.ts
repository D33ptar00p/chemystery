import { REACTIONS, type Reaction } from '../data/reactions'
import { timesRunnable } from './applyReaction'
import type { SpeciesCounts } from './types'

/**
 * Every reaction that could run at least once given what is present.
 *
 * Matching is by SUBSET, not exact set: having a spectator species sitting in
 * the same group must not stop a valid reaction from being offered.
 *
 * This is the seam where rule-based prediction (solubility rules, activity
 * series, neutralisation) would later be appended to the curated results.
 */
export function matchReactions(counts: SpeciesCounts): Reaction[] {
  return REACTIONS.filter((reaction) => timesRunnable(reaction, counts).times >= 1)
}

/**
 * The single reaction to offer the user. Prefers the one consuming the most
 * reactant species, so a specific match beats a more generic one; ties break
 * on table order, which keeps the choice deterministic.
 */
export function matchReaction(counts: SpeciesCounts): Reaction | null {
  const candidates = matchReactions(counts)
  if (candidates.length === 0) return null

  return candidates.reduce((best, next) =>
    next.reactants.length > best.reactants.length ? next : best,
  )
}

export interface NearMiss {
  reaction: Reaction
  /** How many more of each species are needed, keyed by species id. */
  missing: Record<string, number>
}

/**
 * A reaction the user has all the right ingredients for but not enough of one.
 *
 * Deliberately strict: every reactant must already be present at least once.
 * "You have Na and Cl2, you just need one more Na" is genuinely useful;
 * "you need two things you haven't got" is noise.
 *
 * Without this, one Na beside one Cl2 looks identical to two unrelated
 * molecules sitting together, and the app appears broken.
 */
export function findNearMiss(counts: SpeciesCounts): NearMiss | null {
  let best: NearMiss | null = null
  let fewestMissing = Infinity

  for (const reaction of REACTIONS) {
    if (timesRunnable(reaction, counts).times >= 1) continue
    if (!reaction.reactants.every((r) => (counts[r.speciesId] ?? 0) >= 1)) continue

    const missing: Record<string, number> = {}
    let total = 0
    for (const { speciesId, coefficient } of reaction.reactants) {
      const shortfall = coefficient - (counts[speciesId] ?? 0)
      if (shortfall > 0) {
        missing[speciesId] = shortfall
        total += shortfall
      }
    }

    if (total > 0 && total < fewestMissing) {
      fewestMissing = total
      best = { reaction, missing }
    }
  }

  return best
}
