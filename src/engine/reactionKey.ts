/**
 * Canonical key for a set of species, so that {H2, O2} and {O2, H2} are the
 * same combination. Duplicates collapse: the key describes WHICH species are
 * present, never how many.
 */
export function canonicalKey(speciesIds: string[]): string {
  return [...new Set(speciesIds)].sort().join('+')
}

/** Convenience: the canonical key of whatever is present in a counts map. */
export function keyOfCounts(counts: Record<string, number>): string {
  return canonicalKey(Object.keys(counts).filter((id) => counts[id] > 0))
}
