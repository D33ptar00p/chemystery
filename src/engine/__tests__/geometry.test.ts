import { describe, it, expect } from 'vitest'
import { generateCoordinates, idealAngle, type Vec3 } from '../geometry'
import type { Species } from '../../data/types'

const angleAt = (p: Vec3[], centre: number, a: number, b: number) => {
  const v1: Vec3 = [p[a][0] - p[centre][0], p[a][1] - p[centre][1], p[a][2] - p[centre][2]]
  const v2: Vec3 = [p[b][0] - p[centre][0], p[b][1] - p[centre][1], p[b][2] - p[centre][2]]
  const d = v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]
  return (Math.acos(d / (Math.hypot(...v1) * Math.hypot(...v2))) * 180) / Math.PI
}
const dist = (p: Vec3[], a: number, b: number) =>
  Math.hypot(p[a][0] - p[b][0], p[a][1] - p[b][1], p[a][2] - p[b][2])

const make = (partial: Partial<Species> & Pick<Species, 'atoms' | 'bonds'>): Species => ({
  id: 'x',
  formula: 'x',
  name: 'x',
  phase: 'gas',
  rootAtom: 0,
  shape: null,
  bulkAppearance: '',
  bulkColour: '#fff',
  ...partial,
})

describe('idealAngle encodes measured angles, not ideal polyhedra', () => {
  it('water is 104.5, not 109.5', () => expect(idealAngle(2, 2)).toBe(104.5))
  it('ammonia is 107', () => expect(idealAngle(3, 1)).toBe(107))
  it('methane is tetrahedral', () => expect(idealAngle(4, 0)).toBeCloseTo(109.47, 2))
  it('CO2 is linear', () => expect(idealAngle(2, 0)).toBe(180))
  it('BF3 is trigonal planar', () => expect(idealAngle(3, 0)).toBe(120))
})

describe('generated geometry', () => {
  it('water comes out bent at 104.5 with correct bond length', () => {
    const water = make({
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
    })
    const p = generateCoordinates(water)
    expect(angleAt(p, 0, 1, 2)).toBeCloseTo(104.5, 1)
    expect(dist(p, 0, 1)).toBeCloseTo(0.958, 3)
    expect(dist(p, 0, 2)).toBeCloseTo(0.958, 3)
  })

  it('methane comes out tetrahedral with four equal bonds', () => {
    const methane = make({
      atoms: [
        { element: 'C', lonePairs: 0 },
        ...Array.from({ length: 4 }, () => ({ element: 'H', lonePairs: 0 })),
      ],
      bonds: [1, 2, 3, 4].map((b) => ({ a: 0, b, order: 1 as const })),
      bondLengthOverrides: [1, 2, 3, 4].map((b) => ({ a: 0, b, length: 1.087 })),
    })
    const p = generateCoordinates(methane)
    for (const h of [1, 2, 3, 4]) expect(dist(p, 0, h)).toBeCloseTo(1.087, 3)
    expect(angleAt(p, 0, 1, 2)).toBeCloseTo(109.47, 1)
    expect(angleAt(p, 0, 3, 4)).toBeCloseTo(109.47, 1)
  })

  it('ammonia is pyramidal at 107, not flat', () => {
    const ammonia = make({
      atoms: [
        { element: 'N', lonePairs: 1 },
        ...Array.from({ length: 3 }, () => ({ element: 'H', lonePairs: 0 })),
      ],
      bonds: [1, 2, 3].map((b) => ({ a: 0, b, order: 1 as const })),
      bondLengthOverrides: [1, 2, 3].map((b) => ({ a: 0, b, length: 1.012 })),
    })
    const p = generateCoordinates(ammonia)
    expect(angleAt(p, 0, 1, 2)).toBeCloseTo(107, 0.5)
    // Pyramidal, so the three H are NOT coplanar with N.
    expect(angleAt(p, 0, 1, 2)).toBeLessThan(119)
  })

  it('CO2 is linear', () => {
    const co2 = make({
      atoms: [
        { element: 'C', lonePairs: 0 },
        { element: 'O', lonePairs: 2 },
        { element: 'O', lonePairs: 2 },
      ],
      bonds: [
        { a: 0, b: 1, order: 2 },
        { a: 0, b: 2, order: 2 },
      ],
      bondLengthOverrides: [
        { a: 0, b: 1, length: 1.163 },
        { a: 0, b: 2, length: 1.163 },
      ],
    })
    const p = generateCoordinates(co2)
    expect(angleAt(p, 0, 1, 2)).toBeCloseTo(180, 0)
  })

  it('benzene closes into a planar hexagon', () => {
    const ringBonds = Array.from({ length: 6 }, (_, i) => ({
      a: i,
      b: (i + 1) % 6,
      order: (i % 2 === 0 ? 2 : 1) as 1 | 2,
    }))
    const benzene = make({
      atoms: [
        ...Array.from({ length: 6 }, () => ({ element: 'C', lonePairs: 0 })),
        ...Array.from({ length: 6 }, () => ({ element: 'H', lonePairs: 0 })),
      ],
      bonds: [
        ...ringBonds,
        ...Array.from({ length: 6 }, (_, i) => ({ a: i, b: 6 + i, order: 1 as const })),
      ],
      // Real delocalised ring bond length, not alternating 1.34/1.54.
      bondLengthOverrides: ringBonds.map((b) => ({ a: b.a, b: b.b, length: 1.39 })),
    })
    const p = generateCoordinates(benzene)

    // Every ring bond equal.
    for (let i = 0; i < 6; i++) expect(dist(p, i, (i + 1) % 6)).toBeCloseTo(1.39, 2)
    // Every internal ring angle 120.
    for (let i = 0; i < 6; i++) {
      expect(angleAt(p, i, (i + 5) % 6, (i + 1) % 6)).toBeCloseTo(120, 0)
    }
    // Ring is planar: all six carbons share a z.
    const zs = [0, 1, 2, 3, 4, 5].map((i) => p[i][2])
    expect(Math.max(...zs) - Math.min(...zs)).toBeLessThan(1e-6)
  })

it('a chain keeps its real bond angle — regression for an inverted dihedral frame', () => {
    // Propane. The C-C-C angle is measured at the MIDDLE carbon, which is placed
    // with one anchor, so it exercises the dihedral path rather than the root path.
    const propane = make({
      atoms: [
        { element: 'C', lonePairs: 0 },
        { element: 'C', lonePairs: 0 },
        { element: 'C', lonePairs: 0 },
        ...Array.from({ length: 8 }, () => ({ element: 'H', lonePairs: 0 })),
      ],
      rootAtom: 1,
      bonds: [
        { a: 1, b: 0, order: 1 },
        { a: 1, b: 2, order: 1 },
        { a: 0, b: 3, order: 1 },
        { a: 0, b: 4, order: 1 },
        { a: 0, b: 5, order: 1 },
        { a: 2, b: 6, order: 1 },
        { a: 2, b: 7, order: 1 },
        { a: 2, b: 8, order: 1 },
        { a: 1, b: 9, order: 1 },
        { a: 1, b: 10, order: 1 },
      ],
    })
    const p = generateCoordinates(propane)
    // Was coming out at 180 - 109.47 = 70.5 when the frame was reversed.
    expect(angleAt(p, 1, 0, 2)).toBeCloseTo(109.47, 0)
    // And an H on a terminal carbon must sit at the tetrahedral angle too.
    expect(angleAt(p, 0, 1, 3)).toBeCloseTo(109.47, 0)
  })

  it('a linear molecule stays linear instead of folding onto itself', () => {
    // Ethyne. Each carbon has one anchor, so this is the dihedral path at 180.
    const ethyne = make({
      atoms: [
        { element: 'C', lonePairs: 0 },
        { element: 'C', lonePairs: 0 },
        { element: 'H', lonePairs: 0 },
        { element: 'H', lonePairs: 0 },
      ],
      bonds: [
        { a: 0, b: 1, order: 3 },
        { a: 0, b: 2, order: 1 },
        { a: 1, b: 3, order: 1 },
      ],
      bondLengthOverrides: [
        { a: 0, b: 1, length: 1.203 },
        { a: 0, b: 2, length: 1.06 },
        { a: 1, b: 3, length: 1.06 },
      ],
    })
    const p = generateCoordinates(ethyne)
    expect(angleAt(p, 0, 1, 2)).toBeCloseTo(180, 0)
    expect(angleAt(p, 1, 0, 3)).toBeCloseTo(180, 0)
    // The two hydrogens must end up at opposite ends, not on top of each other.
    expect(dist(p, 2, 3)).toBeCloseTo(1.06 * 2 + 1.203, 1)
  })

  it('a ring substituent points outward, not into the ring', () => {
    const ringBonds = Array.from({ length: 6 }, (_, i) => ({
      a: i,
      b: (i + 1) % 6,
      order: (i % 2 === 0 ? 2 : 1) as 1 | 2,
    }))
    const benzene = make({
      atoms: [
        ...Array.from({ length: 6 }, () => ({ element: 'C', lonePairs: 0 })),
        ...Array.from({ length: 6 }, () => ({ element: 'H', lonePairs: 0 })),
      ],
      bonds: [
        ...ringBonds,
        ...Array.from({ length: 6 }, (_, i) => ({ a: i, b: 6 + i, order: 1 as const })),
      ],
      bondLengthOverrides: ringBonds.map((b) => ({ a: b.a, b: b.b, length: 1.39 })),
    })
    const p = generateCoordinates(benzene)
    // Each H must be FURTHER from the ring centre than its carbon is.
    for (let i = 0; i < 6; i++) {
      const rC = Math.hypot(p[i][0], p[i][1], p[i][2])
      const rH = Math.hypot(p[6 + i][0], p[6 + i][1], p[6 + i][2])
      expect(rH, `H on ring carbon ${i} points inward`).toBeGreaterThan(rC)
    }
  })

  it('centres every molecule on its centroid', () => {
    const ethanol = make({
      atoms: [
        { element: 'C', lonePairs: 0 },
        { element: 'C', lonePairs: 0 },
        { element: 'O', lonePairs: 2 },
        { element: 'H', lonePairs: 0 },
      ],
      bonds: [
        { a: 0, b: 1, order: 1 },
        { a: 1, b: 2, order: 1 },
        { a: 2, b: 3, order: 1 },
      ],
    })
    const p = generateCoordinates(ethanol)
    for (const axis of [0, 1, 2]) {
      const mean = p.reduce((s, q) => s + q[axis], 0) / p.length
      expect(Math.abs(mean)).toBeLessThan(1e-9)
    }
  })

  it('never places two bonded atoms on top of each other', () => {
    const chain = make({
      atoms: Array.from({ length: 8 }, () => ({ element: 'C', lonePairs: 0 })),
      bonds: Array.from({ length: 7 }, (_, i) => ({ a: i, b: i + 1, order: 1 as const })),
    })
    const p = generateCoordinates(chain)
    for (let i = 0; i < 7; i++) expect(dist(p, i, i + 1)).toBeGreaterThan(0.6)
  })
})

/**
 * Data-driven checks over whatever is in the species table.
 *
 * These exist so that adding a hundred machine-generated species cannot quietly
 * introduce a molecule that renders as a tangle. Every one of these has caught
 * a real class of error: missing lone pairs, an out-of-range root, or a
 * generator failure that stacks atoms on top of each other.
 */
import { SPECIES } from '../../data/species'
import { ELEMENTS } from '../../data/elements'

describe('species data integrity', () => {
  const all = Object.values(SPECIES)

  it('has at least one species', () => expect(all.length).toBeGreaterThan(0))

  it('every id matches its key', () => {
    for (const [key, species] of Object.entries(SPECIES)) {
      expect(species.id, `key ${key}`).toBe(key)
    }
  })

  it('every atom declares a sane lone-pair count', () => {
    for (const species of all) {
      for (const [i, atom] of species.atoms.entries()) {
        expect(Number.isInteger(atom.lonePairs), `${species.id} atom ${i}`).toBe(true)
        expect(atom.lonePairs, `${species.id} atom ${i}`).toBeGreaterThanOrEqual(0)
        expect(atom.lonePairs, `${species.id} atom ${i}`).toBeLessThanOrEqual(6)
      }
    }
  })

  it('every atom references a known element', () => {
    for (const species of all) {
      for (const atom of species.atoms) {
        expect(ELEMENTS[atom.element], `${species.id} -> ${atom.element}`).toBeDefined()
      }
    }
  })

  it('rootAtom is in range', () => {
    for (const species of all) {
      expect(species.rootAtom, species.id).toBeGreaterThanOrEqual(0)
      expect(species.rootAtom, species.id).toBeLessThan(species.atoms.length)
    }
  })

  it('every bond indexes real, distinct atoms', () => {
    for (const species of all) {
      for (const bond of species.bonds) {
        expect(species.atoms[bond.a], `${species.id} bond.a`).toBeDefined()
        expect(species.atoms[bond.b], `${species.id} bond.b`).toBeDefined()
        expect(bond.a, species.id).not.toBe(bond.b)
      }
    }
  })

  it('every bond-length override points at a real bond', () => {
    for (const species of all) {
      for (const o of species.bondLengthOverrides ?? []) {
        const exists = species.bonds.some(
          (b) => (b.a === o.a && b.b === o.b) || (b.a === o.b && b.b === o.a),
        )
        expect(exists, `${species.id} override ${o.a}-${o.b} has no matching bond`).toBe(true)
        expect(o.length, `${species.id} override ${o.a}-${o.b}`).toBeGreaterThan(0.5)
        expect(o.length, `${species.id} override ${o.a}-${o.b}`).toBeLessThan(4)
      }
    }
  })

  it('a multi-atom species is connected — no atom floats free', () => {
    for (const species of all) {
      if (species.atoms.length < 2 || species.bonds.length === 0) continue
      const seen = new Set<number>([species.rootAtom])
      const queue = [species.rootAtom]
      while (queue.length) {
        const current = queue.pop()!
        for (const bond of species.bonds) {
          const next = bond.a === current ? bond.b : bond.b === current ? bond.a : null
          if (next !== null && !seen.has(next)) {
            seen.add(next)
            queue.push(next)
          }
        }
      }
      expect(seen.size, `${species.id} has atoms disconnected from the root`).toBe(
        species.atoms.length,
      )
    }
  })

  it('generated geometry never stacks two atoms on the same point', () => {
    for (const species of all) {
      const coords = generateCoordinates(species)
      for (let i = 0; i < coords.length; i++) {
        for (let j = i + 1; j < coords.length; j++) {
          const d = Math.hypot(
            coords[i][0] - coords[j][0],
            coords[i][1] - coords[j][1],
            coords[i][2] - coords[j][2],
          )
          expect(d, `${species.id}: atoms ${i} and ${j} coincide`).toBeGreaterThan(0.4)
        }
      }
    }
  })

  it('generated bond lengths are physically plausible', () => {
    for (const species of all) {
      const coords = generateCoordinates(species)
      for (const bond of species.bonds) {
        const d = Math.hypot(
          coords[bond.a][0] - coords[bond.b][0],
          coords[bond.a][1] - coords[bond.b][1],
          coords[bond.a][2] - coords[bond.b][2],
        )
        expect(d, `${species.id} bond ${bond.a}-${bond.b}`).toBeGreaterThan(0.6)
        // Ionic lattice separations are legitimately longer than covalent bonds.
        expect(d, `${species.id} bond ${bond.a}-${bond.b}`).toBeLessThan(3.6)
      }
    }
  })

  it('every species has display text the UI depends on', () => {
    for (const species of all) {
      expect(species.formula.length, species.id).toBeGreaterThan(0)
      expect(species.name.length, species.id).toBeGreaterThan(0)
      expect(species.bulkAppearance.length, species.id).toBeGreaterThan(0)
      expect(species.bulkColour, species.id).toMatch(/^#[0-9a-fA-F]{3,8}$/)
    }
  })
})
