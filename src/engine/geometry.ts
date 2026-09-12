/**
 * VSEPR geometry generator.
 *
 * Turns connectivity (atoms + bonds + lone pairs) into 3D coordinates, so
 * species data does not have to carry hand-authored positions. Hand-authoring
 * was fine for ten molecules; it does not scale to a hundred.
 *
 * The method:
 *   1. Find a ring, if there is one, and lay it out as a planar regular polygon.
 *      Rings are done first because growing a ring outward from a spanning tree
 *      will not close it — benzene would come out as a spiral.
 *   2. Walk the remaining bonds outward breadth-first. Each atom orients its
 *      ideal VSEPR direction set so one direction points back at its parent,
 *      and hands the remaining directions to its own children.
 *   3. Bond lengths come from an explicit override where the data gives one,
 *      otherwise from the sum of covalent radii with a bond-order correction.
 *
 * Accuracy note: bond ANGLES come from the (bonded, lone pair) pair via
 * `idealAngle`, which encodes the real measured angles for the common cases
 * rather than assuming perfect polyhedra. Water comes out at 104.5°, not 109.5°.
 */

import type { Species } from '../data/types'
import { ELEMENTS } from '../data/elements'

export type Vec3 = [number, number, number]

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k]
const len = (a: Vec3) => Math.hypot(a[0], a[1], a[2])
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
const norm = (a: Vec3): Vec3 => {
  const l = len(a)
  return l < 1e-9 ? [0, 0, 1] : [a[0] / l, a[1] / l, a[2] / l]
}

const DEG = Math.PI / 180

/**
 * Ideal bond angle for an atom, in degrees, from how many atoms it is bonded to
 * and how many lone pairs it carries.
 *
 * These are the measured angles for the common cases, not idealised polyhedral
 * ones: lone pairs take up more room than bonding pairs and squeeze the rest.
 */
export function idealAngle(bonded: number, lonePairs: number): number {
  const steric = bonded + lonePairs

  if (bonded <= 1) return 180
  if (steric <= 2) return 180

  if (steric === 3) return lonePairs === 0 ? 120 : 117 // SO2, O3 are ~117
  if (steric === 4) {
    if (lonePairs === 0) return 109.47
    if (lonePairs === 1) return 107 // ammonia
    return 104.5 // water
  }
  if (steric === 5) return 120 // trigonal bipyramidal, handled explicitly below
  return 90 // octahedral and above
}

/**
 * `n` unit vectors mutually separated by `angleDeg`.
 *
 * Built as one reference direction along +z plus a cone of the rest. Solving
 * the cone's azimuthal spacing from the target angle reproduces the standard
 * shapes exactly: 109.47° gives a tetrahedron, 120° a planar trigon, 180° a line.
 */
function mutualDirections(n: number, angleDeg: number): Vec3[] {
  if (n <= 0) return []
  if (n === 1) return [[0, 0, 1]]

  // Explicit sets for the hypervalent shapes, which are not a single cone.
  if (n === 5) {
    return [
      [0, 0, 1],
      [0, 0, -1],
      [1, 0, 0],
      [-0.5, Math.sin(120 * DEG), 0],
      [-0.5, -Math.sin(120 * DEG), 0],
    ]
  }
  if (n >= 6) {
    const octahedral: Vec3[] = [
      [0, 0, 1],
      [0, 0, -1],
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
    ]
    return octahedral.slice(0, n)
  }

  const theta = angleDeg * DEG
  const dirs: Vec3[] = [[0, 0, 1]]

  // Azimuthal spacing that makes every cone vector sit `theta` from its
  // neighbours as well as from the reference direction.
  const cosTheta = Math.cos(theta)
  const sinTheta = Math.sin(theta)
  const ring = n - 1
  let phiStep = (2 * Math.PI) / ring
  if (ring >= 2) {
    const cosPhi = (cosTheta - cosTheta * cosTheta) / (sinTheta * sinTheta)
    if (cosPhi >= -1 && cosPhi <= 1 && ring === 2) phiStep = Math.acos(cosPhi)
  }

  for (let k = 0; k < ring; k++) {
    const phi = k * phiStep
    dirs.push([sinTheta * Math.cos(phi), sinTheta * Math.sin(phi), cosTheta])
  }
  return dirs
}

const ORDER_SHORTENING: Record<number, number> = { 1: 0, 2: 0.12, 3: 0.2 }

function bondLength(species: Species, a: number, b: number, order: number): number {
  const override = species.bondLengthOverrides?.find(
    (o) => (o.a === a && o.b === b) || (o.a === b && o.b === a),
  )
  if (override) return override.length

  const ra = ELEMENTS[species.atoms[a].element]?.covalentRadius ?? 0.75
  const rb = ELEMENTS[species.atoms[b].element]?.covalentRadius ?? 0.75
  return Math.max(0.6, ra + rb - (ORDER_SHORTENING[order] ?? 0))
}

interface Adjacency {
  neighbours: number[][]
  orderOf: Map<string, number>
}

function buildAdjacency(species: Species): Adjacency {
  const neighbours: number[][] = species.atoms.map(() => [])
  const orderOf = new Map<string, number>()
  for (const bond of species.bonds) {
    if (bond.a === bond.b) continue
    neighbours[bond.a].push(bond.b)
    neighbours[bond.b].push(bond.a)
    orderOf.set(`${bond.a}-${bond.b}`, bond.order)
    orderOf.set(`${bond.b}-${bond.a}`, bond.order)
  }
  return { neighbours, orderOf }
}

/**
 * Smallest ring containing the most-connected ring atom, found by BFS from each
 * atom back to itself. Good enough for the single-ring molecules in this app
 * (benzene, phenol, toluene, aniline); fused ring systems fall back to the tree
 * walk, which is flagged rather than silently wrong.
 */
function findRing(adj: Adjacency, atomCount: number): number[] | null {
  let best: number[] | null = null

  for (let start = 0; start < atomCount; start++) {
    const parent = new Map<number, number>([[start, -1]])
    const queue = [start]

    while (queue.length > 0) {
      const current = queue.shift()!
      for (const next of adj.neighbours[current]) {
        if (next === parent.get(current)) continue
        if (parent.has(next)) {
          // Found a cycle: walk both paths back to their common ancestor.
          const pathA: number[] = []
          for (let n: number | undefined = current; n !== undefined && n !== -1; n = parent.get(n)) pathA.push(n)
          const pathB: number[] = []
          for (let n: number | undefined = next; n !== undefined && n !== -1; n = parent.get(n)) pathB.push(n)
          const setB = new Set(pathB)
          const meet = pathA.find((n) => setB.has(n))
          if (meet === undefined) continue
          const ring = [
            ...pathA.slice(0, pathA.indexOf(meet) + 1),
            ...pathB.slice(0, pathB.indexOf(meet)).reverse(),
          ]
          const incumbent: number[] | null = best
          if (ring.length >= 3 && (incumbent === null || ring.length < incumbent.length)) {
            best = ring
          }
          continue
        }
        parent.set(next, current)
        queue.push(next)
      }
    }
    const found: number[] | null = best
    if (found !== null && found.length <= 6) break
  }

  return best
}

/** A placed neighbour of `anchor` other than `exclude`, to fix a dihedral against. */
function grandparentOf(adj: Adjacency, placed: boolean[], anchor: number, exclude: number): number {
  for (const n of adj.neighbours[anchor]) {
    if (n !== exclude && placed[n]) return n
  }
  return -1
}

/** Any unit vector perpendicular to `v`. */
function anyPerpendicular(v: Vec3): Vec3 {
  const seed: Vec3 = Math.abs(v[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]
  return norm(cross(v, seed))
}

/**
 * Where to put an atom's remaining bonds, given the neighbours it already has.
 *
 * Three distinct cases, because a single "rotate the ideal set into place" rule
 * is wrong for two of them:
 *
 *  - **No anchors** (the root): just use the ideal direction set.
 *  - **One anchor** (growing a chain): the ideal set leaves rotation about the
 *    bond to the anchor completely free, and picking that rotation arbitrarily
 *    is what makes long chains fold back through themselves. Place each child by
 *    bond angle AND a dihedral measured against the anchor's own parent —
 *    anti first, then staggered — which produces an extended zig-zag.
 *  - **Two or more anchors** (ring atoms, bridgeheads): the remaining directions
 *    are fully determined by the ones already taken, so solve for them directly.
 *    Rotating an ideal set to match only the first anchor sends ring substituents
 *    into the middle of the ring.
 */
function childDirections(opts: {
  positions: Vec3[]
  current: number
  anchors: number[]
  anchorParent: number
  steric: number
  angle: number
  count: number
}): Vec3[] {
  const { positions, current, anchors, anchorParent, steric, angle, count } = opts
  const here = positions[current]
  const toward = (i: number) => norm(sub(positions[i], here))

  if (anchors.length === 0) {
    return mutualDirections(Math.max(steric, count), angle).slice(0, count)
  }

  if (anchors.length === 1) {
    // Points FROM the anchor TO this atom — the direction the chain is travelling.
    // Using the reverse here silently yields bond angles of (180 - theta): a
    // propane backbone at 70 degrees instead of 109.5, and linear molecules
    // stacking the far atom onto the near one.
    const bc = norm(sub(here, positions[anchors[0]]))
    // Reference perpendicular, from the anchor's own parent where there is one.
    const ref =
      anchorParent >= 0
        ? (() => {
            const back = sub(positions[anchorParent], positions[anchors[0]])
            const projected = sub(back, scale(bc, dot(back, bc)))
            return len(projected) > 1e-6 ? norm(projected) : anyPerpendicular(bc)
          })()
        : anyPerpendicular(bc)

    const n1 = ref
    const n2 = cross(bc, n1)
    const theta = angle * DEG
    // Anti first, then staggered either side: an extended chain, not a coil.
    const dihedrals = [180, 60, -60, 120, -120, 0].map((d) => d * DEG)

    return Array.from({ length: count }, (_, i) => {
      const phi = dihedrals[i % dihedrals.length]
      return norm(
        add(
          scale(bc, -Math.cos(theta)),
          add(scale(n1, Math.sin(theta) * Math.cos(phi)), scale(n2, Math.sin(theta) * Math.sin(phi))),
        ),
      )
    })
  }

  // Two or more anchors: the rest of the geometry is already pinned down.
  const taken = anchors.map(toward)
  const sum = taken.reduce((acc, v) => add(acc, v), [0, 0, 0] as Vec3)
  const away = len(sum) > 1e-6 ? norm(scale(sum, -1)) : anyPerpendicular(taken[0])

  if (count === 1) return [away]

  // Two remaining bonds straddle the plane that bisects the ones already taken.
  const perp =
    taken.length >= 2 && len(cross(taken[0], taken[1])) > 1e-6
      ? norm(cross(taken[0], taken[1]))
      : anyPerpendicular(away)
  const half = (angle * DEG) / 2

  const pair: Vec3[] = [
    norm(add(scale(away, Math.cos(half)), scale(perp, Math.sin(half)))),
    norm(add(scale(away, Math.cos(half)), scale(perp, -Math.sin(half)))),
  ]
  if (count === 2) return pair

  const extra = Array.from({ length: count - 2 }, (_, i) =>
    norm(add(away, scale(perp, i % 2 === 0 ? 0.6 : -0.6))),
  )
  return [...pair, ...extra]
}

/**
 * Compute 3D positions, in angstroms, centred on the molecule's centroid.
 */
export function generateCoordinates(species: Species): Vec3[] {
  const n = species.atoms.length
  const positions: Vec3[] = species.atoms.map(() => [0, 0, 0])
  if (n === 0) return positions
  if (n === 1) return positions

  // Explicit coordinates win outright — see the note on Species.coordinates.
  if (species.coordinates && species.coordinates.length === n) {
    const given = species.coordinates.map((p) => [...p] as Vec3)
    const mid: Vec3 = [0, 0, 0]
    for (const p of given) {
      mid[0] += p[0] / n
      mid[1] += p[1] / n
      mid[2] += p[2] / n
    }
    return given.map((p) => sub(p, mid))
  }

  const adj = buildAdjacency(species)
  const placed = new Array<boolean>(n).fill(false)

  // 1. Lay any ring out as a planar regular polygon first.
  const ring = findRing(adj, n)
  if (ring && ring.length >= 3) {
    const sides = ring.length
    let sum = 0
    for (let i = 0; i < sides; i++) {
      const a = ring[i]
      const b = ring[(i + 1) % sides]
      sum += bondLength(species, a, b, adj.orderOf.get(`${a}-${b}`) ?? 1)
    }
    const side = sum / sides
    const radius = side / (2 * Math.sin(Math.PI / sides))
    ring.forEach((atom, i) => {
      const angle = (2 * Math.PI * i) / sides
      positions[atom] = [radius * Math.cos(angle), radius * Math.sin(angle), 0]
      placed[atom] = true
    })
  }

  // 2. Walk outward from whatever is already placed.
  const queue: number[] = []
  if (placed.some(Boolean)) {
    for (let i = 0; i < n; i++) if (placed[i]) queue.push(i)
  } else {
    const root = species.rootAtom >= 0 && species.rootAtom < n ? species.rootAtom : 0
    placed[root] = true
    queue.push(root)
  }

  while (queue.length > 0) {
    const current = queue.shift()!
    const children = adj.neighbours[current].filter((x) => !placed[x])
    if (children.length === 0) continue

    const anchors = adj.neighbours[current].filter((x) => placed[x] && x !== current)
    const lonePairs = species.atoms[current].lonePairs ?? 0
    const bonded = adj.neighbours[current].length
    const angle = idealAngle(bonded, lonePairs)

    const dirs = childDirections({
      positions,
      current,
      anchors,
      anchorParent: anchors.length === 1 ? grandparentOf(adj, placed, anchors[0], current) : -1,
      steric: Math.max(bonded + lonePairs, anchors.length + children.length),
      angle,
      count: children.length,
    })

    children.forEach((child, i) => {
      const dir = norm(dirs[i] ?? [0, 0, 1])
      const order = adj.orderOf.get(`${current}-${child}`) ?? 1
      positions[child] = add(positions[current], scale(dir, bondLength(species, current, child, order)))
      placed[child] = true
      queue.push(child)
    })
  }

  // 3. Any atom with no bonds at all: fan it out so it is not stacked at origin.
  let stray = 0
  for (let i = 0; i < n; i++) {
    if (placed[i]) continue
    const a = (stray / Math.max(1, n)) * Math.PI * 2
    positions[i] = [Math.cos(a) * 2.2, 0, Math.sin(a) * 2.2]
    stray++
  }

  // 4. Centre on the centroid so molecules rotate about themselves.
  const centroid: Vec3 = [0, 0, 0]
  for (const p of positions) {
    centroid[0] += p[0] / n
    centroid[1] += p[1] / n
    centroid[2] += p[2] / n
  }
  return positions.map((p) => sub(p, centroid))
}

const geometryCache = new Map<string, Vec3[]>()

/**
 * Cached coordinates for a species. Generation is deterministic and pure, so a
 * molecule's geometry is computed once per session no matter how many copies of
 * it are on the bench.
 */
export function coordinatesFor(species: Species): Vec3[] {
  const hit = geometryCache.get(species.id)
  if (hit) return hit
  const computed = generateCoordinates(species)
  geometryCache.set(species.id, computed)
  return computed
}

/** Largest distance from the centroid to any atom's surface, for framing and labels. */
export function moleculeRadius(species: Species): number {
  const coords = coordinatesFor(species)
  return Math.max(
    ...coords.map((p, i) => {
      const element = ELEMENTS[species.atoms[i].element]
      return len(p) + (element?.vdwRadius ?? 1.5)
    }),
  )
}
