/**
 * Where an element sits in the periodic table, derived from its atomic number.
 *
 * Derived rather than stored: position is a consequence of atomic number, so
 * storing it in the element table would just be 118 more chances to be wrong.
 *
 * Group 3 follows the modern IUPAC assignment — Sc, Y, Lu, Lr — which puts
 * lanthanum and actinium in the f-block with their series.
 */

const PERIOD_ENDS = [2, 10, 18, 36, 54, 86, 118]
const PERIOD_STARTS: Record<number, number> = { 1: 1, 2: 3, 3: 11, 4: 19, 5: 37, 6: 55, 7: 87 }

export type Block = 's' | 'p' | 'd' | 'f'

export function periodOf(atomicNumber: number): number {
  return PERIOD_ENDS.findIndex((end) => atomicNumber <= end) + 1
}

/** Group 1–18, or null for the f-block, which sits outside the numbered groups. */
export function groupOf(atomicNumber: number): number | null {
  if (atomicNumber === 1) return 1
  if (atomicNumber === 2) return 18

  const period = periodOf(atomicNumber)
  const index = atomicNumber - PERIOD_STARTS[period]

  if (period <= 3) return index < 2 ? index + 1 : index + 11
  if (period <= 5) return index + 1

  // Periods 6 and 7 carry a 14-element f-block between groups 2 and 3.
  if (index < 2) return index + 1
  if (index < 16) return null
  return index - 13
}

export function blockOf(atomicNumber: number): Block {
  const group = groupOf(atomicNumber)
  if (group === null) return 'f'
  if (atomicNumber === 2) return 's'
  if (group <= 2) return 's'
  if (group <= 12) return 'd'
  return 'p'
}

/** Human-readable category, e.g. 'alkali-metal' -> 'Alkali metal'. */
export function categoryLabel(category: string): string {
  const words = category.replace(/-/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** One-line placement summary, e.g. 'Period 6, group 11 · d-block'. */
export function placementOf(atomicNumber: number): string {
  const group = groupOf(atomicNumber)
  const period = periodOf(atomicNumber)
  const block = blockOf(atomicNumber)
  return group === null
    ? `Period ${period} · ${block}-block`
    : `Period ${period}, group ${group} · ${block}-block`
}

/* ------------------------------------------------------------------ *
 * Electron configuration
 * ------------------------------------------------------------------ */

/** Subshells in Madelung (n + l) filling order. */
const FILL_ORDER: [number, string][] = [
  [1, 's'], [2, 's'], [2, 'p'], [3, 's'], [3, 'p'], [4, 's'], [3, 'd'], [4, 'p'],
  [5, 's'], [4, 'd'], [5, 'p'], [6, 's'], [4, 'f'], [5, 'd'], [6, 'p'], [7, 's'],
  [5, 'f'], [6, 'd'], [7, 'p'],
]

const CAPACITY: Record<string, number> = { s: 2, p: 6, d: 10, f: 14 }

/** Noble gases, for the shorthand prefix. */
const NOBLE: [number, string][] = [
  [86, 'Rn'], [54, 'Xe'], [36, 'Kr'], [18, 'Ar'], [10, 'Ne'], [2, 'He'],
]

/**
 * Ground-state configurations that do NOT follow the Madelung rule.
 *
 * These are real, measured exceptions — a half- or fully-filled d or f subshell
 * is more stable than the rule predicts, so an s electron moves across. They are
 * listed explicitly because no simple rule generates them correctly.
 */
const ANOMALIES: Record<number, string> = {
  24: '[Ar] 3d⁵ 4s¹', // Cr
  29: '[Ar] 3d¹⁰ 4s¹', // Cu
  41: '[Kr] 4d⁴ 5s¹', // Nb
  42: '[Kr] 4d⁵ 5s¹', // Mo
  44: '[Kr] 4d⁷ 5s¹', // Ru
  45: '[Kr] 4d⁸ 5s¹', // Rh
  46: '[Kr] 4d¹⁰', // Pd
  47: '[Kr] 4d¹⁰ 5s¹', // Ag
  57: '[Xe] 5d¹ 6s²', // La
  58: '[Xe] 4f¹ 5d¹ 6s²', // Ce
  64: '[Xe] 4f⁷ 5d¹ 6s²', // Gd
  78: '[Xe] 4f¹⁴ 5d⁹ 6s¹', // Pt
  79: '[Xe] 4f¹⁴ 5d¹⁰ 6s¹', // Au
  89: '[Rn] 6d¹ 7s²', // Ac
  90: '[Rn] 6d² 7s²', // Th
  91: '[Rn] 5f² 6d¹ 7s²', // Pa
  92: '[Rn] 5f³ 6d¹ 7s²', // U
  93: '[Rn] 5f⁴ 6d¹ 7s²', // Np
  96: '[Rn] 5f⁷ 6d¹ 7s²', // Cm
  103: '[Rn] 5f¹⁴ 7s² 7p¹', // Lr
}

const SUPERSCRIPT = '⁰¹²³⁴⁵⁶⁷⁸⁹'
const superscript = (n: number) =>
  String(n)
    .split('')
    .map((d) => SUPERSCRIPT[Number(d)])
    .join('')

/**
 * Ground-state electron configuration in noble-gas shorthand, e.g. Au -> '[Xe] 4f¹⁴ 5d¹⁰ 6s¹'.
 *
 * Follows the Madelung rule, with the measured anomalies applied on top.
 */
export function electronConfiguration(atomicNumber: number): string {
  if (ANOMALIES[atomicNumber]) return ANOMALIES[atomicNumber]

  const shells: [number, string, number][] = []
  let left = atomicNumber
  for (const [n, l] of FILL_ORDER) {
    if (left <= 0) break
    const put = Math.min(left, CAPACITY[l])
    shells.push([n, l, put])
    left -= put
  }

  const core = NOBLE.find(([z]) => z < atomicNumber)
  const coreZ = core ? core[0] : 0

  // Drop the subshells already accounted for by the noble-gas core.
  let counted = 0
  const outer = shells.filter(([, , count]) => {
    const inCore = counted + count <= coreZ
    counted += count
    return !inCore
  })

  const written = outer
    .map(([n, l, count]) => `${n}${l}${superscript(count)}`)
    // Written in shell order, which is how configurations are conventionally read.
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .join(' ')

  return core ? `[${core[1]}] ${written}` : written
}

/* ------------------------------------------------------------------ *
 * Category colours
 * ------------------------------------------------------------------ */

/**
 * Conventional periodic-table colouring, by element family.
 *
 * Distinct from the element's own `colour`, which is its real-world appearance.
 * Both are meaningful and they answer different questions: "where does this sit
 * in the table" versus "what does it actually look like". The tile is coloured
 * by family; the sphere in the workspace and the bulk swatch stay true to life.
 *
 * Tuned for the app's near-black canvas, so these are saturated rather than the
 * pastels a printed table uses.
 */
export const CATEGORY_COLOUR: Record<string, string> = {
  'alkali-metal': '#f2645a',
  'alkaline-earth': '#f08b3c',
  'transition-metal': '#f0c14b',
  'post-transition-metal': '#7fbf6a',
  metalloid: '#46b5a0',
  'reactive-nonmetal': '#4aa8ff',
  halogen: '#7d7bf0',
  'noble-gas': '#b478e8',
  lanthanide: '#e86ab0',
  actinide: '#d4557a',
  unknown: '#8a8f96',
}

export const categoryColour = (category: string) => CATEGORY_COLOUR[category] ?? CATEGORY_COLOUR.unknown
