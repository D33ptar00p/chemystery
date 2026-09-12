import { describe, it, expect } from 'vitest'
import { canonicalKey, keyOfCounts } from '../reactionKey'
import { matchReaction, matchReactions, findNearMiss } from '../matchReaction'
import { applyReaction, timesRunnable } from '../applyReaction'
import { REACTIONS } from '../../data/reactions'
import { SPECIES } from '../../data/species'
import { ELEMENTS } from '../../data/elements'
import { useSandboxStore, WORKSPACE_BOUND, inspectGroups } from '../../state/useSandboxStore'
import { coordinatesFor } from '../geometry'

const byId = (id: string) => {
  const r = REACTIONS.find((x) => x.id === id)
  if (!r) throw new Error(`no reaction ${id}`)
  return r
}

describe('canonicalKey', () => {
  it('is order independent', () => {
    expect(canonicalKey(['H2', 'O2'])).toBe(canonicalKey(['O2', 'H2']))
  })

  it('collapses duplicates, because the key says which species not how many', () => {
    expect(canonicalKey(['H2', 'H2', 'O2'])).toBe('H2+O2')
  })

  it('ignores species whose count has dropped to zero', () => {
    expect(keyOfCounts({ H2: 2, O2: 1, Cl2: 0 })).toBe('H2+O2')
  })
})

describe('matching', () => {
  it('finds the hero reaction from hydrogen and oxygen', () => {
    expect(matchReaction({ H2: 2, O2: 1 })?.id).toBe('hydrogen-combustion')
  })

  it('matches regardless of the order species were added', () => {
    expect(matchReaction({ O2: 1, H2: 2 })?.id).toBe('hydrogen-combustion')
  })

  it('returns null when nothing can react', () => {
    expect(matchReaction({ H2O: 1, NaCl: 1 })).toBeNull()
  })

  it('does not match when a reactant is too scarce', () => {
    // One H2 is not enough: the equation needs two.
    expect(matchReaction({ H2: 1, O2: 1 })).toBeNull()
  })

  it('still matches when an unrelated spectator species is present', () => {
    expect(matchReaction({ H2: 2, O2: 1, NaCl: 5 })?.id).toBe('hydrogen-combustion')
  })

  it('offers every runnable reaction when several are possible', () => {
    // Methane + oxygen can burn; hydrogen + oxygen can too.
    const ids = matchReactions({ CH4: 1, H2: 2, O2: 4 }).map((r) => r.id)
    expect(ids).toContain('methane-combustion')
    expect(ids).toContain('hydrogen-combustion')
  })
})

describe('stoichiometry', () => {
  it('runs the hero reaction once and produces two waters', () => {
    const out = applyReaction(byId('hydrogen-combustion'), { H2: 2, O2: 1 })!
    expect(out.times).toBe(1)
    expect(out.produced).toEqual({ H2O: 2 })
    expect(out.leftover).toEqual({})
  })

  it('scales with the limiting reagent and keeps the remainder', () => {
    // 3 H2 + 1 O2: oxygen runs out first, one H2 is left behind.
    const out = applyReaction(byId('hydrogen-combustion'), { H2: 3, O2: 1 })!
    expect(out.times).toBe(1)
    expect(out.limitingSpeciesId).toBe('O2')
    expect(out.produced).toEqual({ H2O: 2 })
    expect(out.leftover).toEqual({ H2: 1 })
  })

  it('identifies hydrogen as limiting when oxygen is in excess', () => {
    const out = applyReaction(byId('hydrogen-combustion'), { H2: 2, O2: 10 })!
    expect(out.limitingSpeciesId).toBe('H2')
    expect(out.leftover).toEqual({ O2: 9 })
  })

  it('runs multiple times when both reactants allow', () => {
    const out = applyReaction(byId('hydrogen-combustion'), { H2: 7, O2: 3 })!
    expect(out.times).toBe(3)
    expect(out.produced).toEqual({ H2O: 6 })
    expect(out.leftover).toEqual({ H2: 1 })
  })

  it('handles a reaction with two products', () => {
    const out = applyReaction(byId('methane-combustion'), { CH4: 2, O2: 5 })!
    expect(out.times).toBe(2)
    expect(out.produced).toEqual({ CO2: 2, H2O: 4 })
    expect(out.leftover).toEqual({ O2: 1 })
  })

  it('handles a single-reactant decomposition', () => {
    const out = applyReaction(byId('water-electrolysis'), { H2O: 5 })!
    expect(out.times).toBe(2)
    expect(out.produced).toEqual({ H2: 4, O2: 2 })
    expect(out.leftover).toEqual({ H2O: 1 })
  })

  it('refuses to run when the reagents are insufficient', () => {
    expect(applyReaction(byId('hydrogen-combustion'), { H2: 1, O2: 1 })).toBeNull()
    expect(timesRunnable(byId('hydrogen-combustion'), { H2: 1, O2: 1 }).times).toBe(0)
  })
})

describe('reaction data integrity', () => {
  it('every reaction is balanced atom by atom', () => {
    const tally = (terms: { speciesId: string; coefficient: number }[]) => {
      const atoms: Record<string, number> = {}
      for (const { speciesId, coefficient } of terms) {
        for (const atom of SPECIES[speciesId].atoms) {
          atoms[atom.element] = (atoms[atom.element] ?? 0) + coefficient
        }
      }
      return atoms
    }

    for (const reaction of REACTIONS) {
      expect(tally(reaction.reactants), `${reaction.id} (${reaction.equation})`).toEqual(
        tally(reaction.products),
      )
    }
  })

  it('every reaction references species that exist', () => {
    for (const reaction of REACTIONS) {
      for (const { speciesId } of [...reaction.reactants, ...reaction.products]) {
        expect(SPECIES[speciesId], `${reaction.id} -> ${speciesId}`).toBeDefined()
      }
    }
  })

  it('reaction ids are unique', () => {
    const ids = REACTIONS.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every atom references an element that exists', () => {
    for (const species of Object.values(SPECIES)) {
      for (const atom of species.atoms) {
        expect(ELEMENTS[atom.element], `${species.id} -> ${atom.element}`).toBeDefined()
      }
    }
  })

  it('every bond points at real atoms in the same species', () => {
    for (const species of Object.values(SPECIES)) {
      for (const bond of species.bonds) {
        expect(species.atoms[bond.a], `${species.id} bond.a`).toBeDefined()
        expect(species.atoms[bond.b], `${species.id} bond.b`).toBeDefined()
        expect(bond.a).not.toBe(bond.b)
      }
    }
  })

  it('generated coordinates are centred, so molecules rotate about themselves', () => {
    for (const species of Object.values(SPECIES)) {
      const coords = coordinatesFor(species)
      for (const axis of [0, 1, 2]) {
        const mean = coords.reduce((sum, p) => sum + p[axis], 0) / coords.length
        expect(Math.abs(mean), `${species.id} axis ${axis}`).toBeLessThan(1e-3)
      }
    }
  })

  it('bonded atoms are close enough to fuse but not coincident', () => {
    for (const species of Object.values(SPECIES)) {
      const coords = coordinatesFor(species)
      for (const bond of species.bonds) {
        const a = coords[bond.a]
        const b = coords[bond.b]
        const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
        // Bounds span the real range: H-H is 0.741 A at one end; at the other,
        // ionic separations run long (K-I 3.048 A, the N...Cl contact in
        // ammonium chloride 3.35 A) and are not covalent bonds at all.
        expect(d, `${species.id} bond length`).toBeGreaterThan(0.5)
        expect(d, `${species.id} bond length`).toBeLessThan(3.6)
      }
    }
  })
})

describe('water geometry', () => {
  const water = SPECIES.H2O

  it('has the real bond length and bond angle', () => {
    const [o, h1, h2] = coordinatesFor(water)
    const v1 = [h1[0] - o[0], h1[1] - o[1], h1[2] - o[2]]
    const v2 = [h2[0] - o[0], h2[1] - o[1], h2[2] - o[2]]
    const len = Math.hypot(...v1)
    const dot = v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]
    const angle = (Math.acos(dot / (Math.hypot(...v1) * Math.hypot(...v2))) * 180) / Math.PI

    expect(len).toBeCloseTo(0.958, 2)
    expect(angle).toBeCloseTo(104.5, 1)
  })

  it('is bent, not linear — the single most visible correctness check', () => {
    const [o, h1, h2] = coordinatesFor(water)
    const v1 = [h1[0] - o[0], h1[1] - o[1], h1[2] - o[2]]
    const v2 = [h2[0] - o[0], h2[1] - o[1], h2[2] - o[2]]
    const dot = v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]
    const angle = (Math.acos(dot / (Math.hypot(...v1) * Math.hypot(...v2))) * 180) / Math.PI
    expect(angle).toBeLessThan(170)
  })
})

describe('methane geometry', () => {
  it('has four equivalent C–H bonds at the tetrahedral angle', () => {
    const [c, ...hs] = coordinatesFor(SPECIES.CH4)
    const lengths = hs.map((h) => Math.hypot(h[0] - c[0], h[1] - c[1], h[2] - c[2]))
    for (const l of lengths) expect(l).toBeCloseTo(1.087, 2)

    const v = (h: number[]) => [h[0] - c[0], h[1] - c[1], h[2] - c[2]]
    const a = v(hs[0])
    const b = v(hs[1])
    const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
    const angle = (Math.acos(dot / (Math.hypot(...a) * Math.hypot(...b))) * 180) / Math.PI
    expect(angle).toBeCloseTo(109.47, 1)
  })
})

describe('near-miss hints', () => {
  it('tells you one more H2 is needed', () => {
    const miss = findNearMiss({ H2: 1, O2: 1 })
    expect(miss?.reaction.id).toBe('hydrogen-combustion')
    expect(miss?.missing).toEqual({ H2: 1 })
  })

  it('tells you one more Na is needed — the case that looked broken', () => {
    const miss = findNearMiss({ Na: 1, Cl2: 1 })
    expect(miss?.reaction.id).toBe('sodium-chlorine')
    expect(miss?.missing).toEqual({ Na: 1 })
  })

  it('says nothing when the reaction can already run', () => {
    expect(findNearMiss({ H2: 2, O2: 1 })).toBeNull()
  })

  it('says nothing when a reactant is missing entirely', () => {
    // One lone H2 is not "almost water" — you have no oxygen at all.
    expect(findNearMiss({ H2: 1 })).toBeNull()
  })

  it('says nothing for species that react with nothing', () => {
    expect(findNearMiss({ NaCl: 1, CO2: 1 })).toBeNull()
  })

  it('prefers the reaction needing the fewest extra molecules', () => {
    // CH4 + 2 O2 is short one O2; H2 + O2 would need a whole extra H2 too.
    const miss = findNearMiss({ CH4: 1, O2: 1 })
    expect(miss?.reaction.id).toBe('methane-combustion')
    expect(miss?.missing).toEqual({ O2: 1 })
  })
})

describe('selection', () => {
  it('selects whatever was just dropped', () => {
    const store = useSandboxStore.getState()
    store.clear()
    store.add('H2')
    const first = useSandboxStore.getState()
    expect(first.selectedId).toBe(first.entities[0].id)

    useSandboxStore.getState().add('O2')
    const second = useSandboxStore.getState()
    expect(second.entities).toHaveLength(2)
    expect(second.selectedId, 'the newest drop takes the selection').toBe(
      second.entities[1].id,
    )
    useSandboxStore.getState().clear()
  })

  it('selects the product after a reaction', () => {
    const store = useSandboxStore.getState()
    store.clear()
    store.add('H2', [0, 0, 0])
    store.add('H2', [1, 0, 0])
    store.add('O2', [2, 0, 0])

    const { pending } = inspectGroups(useSandboxStore.getState().entities)
    expect(pending?.reaction.id).toBe('hydrogen-combustion')
    useSandboxStore.getState().trigger(pending!)

    const after = useSandboxStore.getState()
    expect(after.entities.map((e) => e.speciesId)).toEqual(['H2O', 'H2O'])
    const selected = after.entities.find((e) => e.id === after.selectedId)
    expect(selected?.speciesId, 'the product should be selected').toBe('H2O')
    useSandboxStore.getState().clear()
  })

  it('clears the selection when the selected entity is removed', () => {
    useSandboxStore.getState().clear()
    useSandboxStore.getState().add('H2')
    const id = useSandboxStore.getState().entities[0].id
    useSandboxStore.getState().remove(id)
    expect(useSandboxStore.getState().selectedId).toBeNull()
  })
})

describe('workspace bounds', () => {
  it('clamps molecules dragged past the edge so they cannot be lost', () => {
    const store = useSandboxStore.getState()
    store.clear()
    store.add('H2', [0, 0, 0])
    const id = useSandboxStore.getState().entities[0].id
    useSandboxStore.getState().move(id, [9999, 0, -9999])
    const moved = useSandboxStore.getState().entities[0]
    expect(moved.position[0]).toBe(WORKSPACE_BOUND)
    expect(moved.position[2]).toBe(-WORKSPACE_BOUND)
    useSandboxStore.getState().clear()
  })
})
