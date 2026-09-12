import { create } from 'zustand'
import { SPECIES } from '../data/species'
import type { Reaction, ReactionEffect } from '../data/reactions'
import { matchReaction, findNearMiss, type NearMiss } from '../engine/matchReaction'
import { applyReaction } from '../engine/applyReaction'
import type { SpeciesCounts } from '../engine/types'

/** Distance in angstroms within which two molecules count as "mixed together". */
export const MIXING_DISTANCE = 5

/** Half-width of the usable bench. Molecules cannot be dragged beyond it. */
export const WORKSPACE_BOUND = 26

const clamp = (v: number) => Math.max(-WORKSPACE_BOUND, Math.min(WORKSPACE_BOUND, v))

export interface Entity {
  id: string
  speciesId: string
  position: [number, number, number]
}

export interface LogEntry {
  id: string
  equation: string
  detail: string
}

/** A cluster of touching molecules, and whatever it can be made to do. */
export interface PendingReaction {
  reaction: Reaction
  entityIds: string[]
  centre: [number, number, number]
  counts: SpeciesCounts
}

/**
 * The reaction that just fired, for the workspace to animate.
 *
 * `at` is a timestamp rather than a boolean so that firing the same reaction
 * twice in a row still restarts the burst — a changed identity is what the
 * scene watches.
 */
export interface ReactionFlash {
  effect: ReactionEffect
  centre: [number, number, number]
  at: number
}

interface SandboxState {
  entities: Entity[]
  selectedId: string | null
  log: LogEntry[]
  lastFlash: ReactionFlash | null
  add: (speciesId: string, position?: [number, number, number]) => void
  move: (id: string, position: [number, number, number]) => void
  remove: (id: string) => void
  select: (id: string | null) => void
  clear: () => void
  /** Fire a pending reaction. Only ever called once the user supplies activation. */
  trigger: (pending: PendingReaction) => void
}

let nextId = 0
const makeId = () => `e${nextId++}`

const distance = (a: [number, number, number], b: [number, number, number]) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

/**
 * Where to drop a newly added molecule.
 *
 * New molecules must land clear of everything already on the bench: dropping
 * them on top of each other would trigger reactions the user never asked for,
 * and the whole interaction is meant to be "drag things together yourself".
 * Spirals outwards until it finds space.
 */
function findFreeSpot(entities: Entity[]): [number, number, number] {
  const clearance = MIXING_DISTANCE + 2

  for (let step = 0; step < 200; step++) {
    // Golden-angle spiral gives an even spread without obvious rows.
    const angle = step * 2.39996
    const radius = 7 + step * 0.6
    const candidate: [number, number, number] = [
      Math.cos(angle) * radius,
      0,
      Math.sin(angle) * radius,
    ]
    if (entities.every((e) => distance(e.position, candidate) >= clearance)) {
      return candidate
    }
  }

  return [(Math.random() - 0.5) * 30, 0, (Math.random() - 0.5) * 30]
}

export const useSandboxStore = create<SandboxState>((set) => ({
  entities: [],
  selectedId: null,
  log: [],
  lastFlash: null,

  add: (speciesId, position) =>
    set((state) => {
      const entity: Entity = {
        id: makeId(),
        speciesId,
        position: position ?? findFreeSpot(state.entities),
      }
      return {
        entities: [...state.entities, entity],
        // Select what was just dropped, so its details appear without a second
        // click. Dropping something IS an expression of interest in it.
        selectedId: entity.id,
      }
    }),

  move: (id, position) =>
    set((state) => ({
      entities: state.entities.map((e) =>
        // Clamped here rather than in the drag handler, so every code path that
        // moves a molecule keeps it on the bench.
        e.id === id ? { ...e, position: [clamp(position[0]), position[1], clamp(position[2])] } : e,
      ),
    })),

  remove: (id) =>
    set((state) => ({
      entities: state.entities.filter((e) => e.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    })),

  select: (id) => set({ selectedId: id }),

  clear: () => set({ entities: [], selectedId: null, lastFlash: null }),

  trigger: (pending) =>
    set((state) => {
      const outcome = applyReaction(pending.reaction, pending.counts)
      if (!outcome) return state

      // Consume exactly as many of each reactant as the equation used, leaving
      // any excess molecules sitting on the canvas.
      const toConsume: SpeciesCounts = { ...outcome.consumed }
      const consumedIds = new Set<string>()
      for (const entityId of pending.entityIds) {
        const entity = state.entities.find((e) => e.id === entityId)
        if (!entity) continue
        const remaining = toConsume[entity.speciesId] ?? 0
        if (remaining > 0) {
          toConsume[entity.speciesId] = remaining - 1
          consumedIds.add(entityId)
        }
      }

      const products: Entity[] = []
      let slot = 0
      const total = Object.values(outcome.produced).reduce((a, b) => a + b, 0)
      for (const [speciesId, count] of Object.entries(outcome.produced)) {
        for (let i = 0; i < count; i++) {
          // Fan the products out around where the reaction happened.
          const angle = (slot / Math.max(total, 1)) * Math.PI * 2
          const radius = total > 1 ? 3.2 : 0
          products.push({
            id: makeId(),
            speciesId,
            position: [
              pending.centre[0] + Math.cos(angle) * radius,
              0,
              pending.centre[2] + Math.sin(angle) * radius,
            ],
          })
          slot++
        }
      }

      const describe = (counts: SpeciesCounts) =>
        Object.entries(counts)
          .map(([id, n]) => `${n} × ${SPECIES[id].formula}`)
          .join(' + ')

      const leftoverText = Object.keys(outcome.leftover).length
        ? ` ${describe(outcome.leftover)} left over — ${SPECIES[outcome.limitingSpeciesId].formula} ran out first.`
        : ''

      return {
        entities: [...state.entities.filter((e) => !consumedIds.has(e.id)), ...products],
        // Select what was just made: the product is the whole point of the
        // reaction, so its details should be on screen without a further click.
        selectedId: products[0]?.id ?? null,
        lastFlash: {
          effect: pending.reaction.effect,
          centre: pending.centre,
          at: Date.now(),
        },
        log: [
          {
            id: `${pending.reaction.id}-${Date.now()}`,
            equation: pending.reaction.equation,
            detail: `Made ${describe(outcome.produced)}.${leftoverText}`,
          },
          ...state.log,
        ].slice(0, 30),
      }
    }),
}))

/**
 * Group entities that are touching, then report the first group that has a
 * reaction available. Pure, so it is driven by state rather than owning any.
 */
export interface GroupInspection {
  pending: PendingReaction | null
  /** Set when a cluster has the right species but not enough of one. */
  nearMiss: (NearMiss & { centre: [number, number, number] }) | null
}

export function inspectGroups(entities: Entity[]): GroupInspection {
  const unvisited = new Set(entities.map((e) => e.id))
  const byId = new Map(entities.map((e) => [e.id, e]))
  let nearMiss: GroupInspection['nearMiss'] = null

  while (unvisited.size > 0) {
    const seed = unvisited.values().next().value as string
    const queue = [seed]
    const group: Entity[] = []
    unvisited.delete(seed)

    // Flood fill outwards through anything within mixing distance.
    while (queue.length > 0) {
      const current = byId.get(queue.pop()!)!
      group.push(current)
      for (const id of [...unvisited]) {
        if (distance(current.position, byId.get(id)!.position) <= MIXING_DISTANCE) {
          unvisited.delete(id)
          queue.push(id)
        }
      }
    }

    if (group.length < 2) continue

    const counts: SpeciesCounts = {}
    for (const entity of group) {
      counts[entity.speciesId] = (counts[entity.speciesId] ?? 0) + 1
    }

    let cx = 0
    let cz = 0
    for (const entity of group) {
      cx += entity.position[0]
      cz += entity.position[2]
    }
    const groupCentre: [number, number, number] = [cx / group.length, 0, cz / group.length]

    const reaction = matchReaction(counts)
    if (!reaction) {
      // Keep the first near miss found, but carry on looking for a real reaction.
      if (!nearMiss) {
        const miss = findNearMiss(counts)
        if (miss) nearMiss = { ...miss, centre: groupCentre }
      }
      continue
    }

    return {
      pending: { reaction, entityIds: group.map((e) => e.id), centre: groupCentre, counts },
      nearMiss: null,
    }
  }

  return { pending: null, nearMiss }
}
