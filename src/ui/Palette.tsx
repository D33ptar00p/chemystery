import { useMemo, useState } from 'react'
import { SPECIES } from '../data/species'
import { ELEMENTS } from '../data/elements'
import type { Species } from '../data/types'
import { useSandboxStore } from '../state/useSandboxStore'

/**
 * Species picker.
 *
 * Categories are DERIVED from the data, so adding a species to the data files
 * makes it appear here with no change to this file. With ~250 species, one
 * category is shown at a time; stacking them all made the list unusable.
 */

type Category = 'Elements' | 'Inorganic' | 'Organic'

const CATEGORIES: Category[] = ['Elements', 'Inorganic', 'Organic']

function categoryOf(species: Species): Category {
  const elements = new Set(species.atoms.map((a) => a.element))
  if (elements.size === 1) return 'Elements'
  // Carbon AND hydrogen together is the usual dividing line; it puts CO2 and
  // the carbonates on the inorganic side, which is where a chemist expects them.
  if (elements.has('C') && elements.has('H')) return 'Organic'
  return 'Inorganic'
}

const atomicNumber = (s: Species) =>
  ELEMENTS[s.atoms[0]?.element]?.atomicNumber ?? Number.MAX_SAFE_INTEGER

/** Elements read in atomic-number order; compounds simplest-first. */
function sortFor(category: Category) {
  return category === 'Elements'
    ? (a: Species, b: Species) => atomicNumber(a) - atomicNumber(b)
    : (a: Species, b: Species) => a.atoms.length - b.atoms.length || a.id.localeCompare(b.id)
}

function matches(species: Species, needle: string) {
  if (!needle) return true
  return (
    species.name.toLowerCase().includes(needle) ||
    species.id.toLowerCase().includes(needle) ||
    species.formula.toLowerCase().includes(needle)
  )
}

function Swatch({ species }: { species: Species }) {
  const colours = [...new Set(species.atoms.map((a) => ELEMENTS[a.element]?.colour ?? '#888'))]
  const background =
    colours.length === 1
      ? colours[0]
      : `linear-gradient(135deg, ${colours[0]} 0%, ${colours[0]} 48%, ${colours[1]} 52%, ${colours[1]} 100%)`
  return <span className="swatch" style={{ background }} />
}

export function Palette() {
  const add = useSandboxStore((s) => s.add)
  const [category, setCategory] = useState<Category>('Elements')
  const [query, setQuery] = useState('')

  const { shown, totals, elsewhere } = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const buckets = new Map<Category, Species[]>(CATEGORIES.map((c) => [c, []]))
    const hits = new Map<Category, number>(CATEGORIES.map((c) => [c, 0]))

    for (const species of Object.values(SPECIES)) {
      const bucket = categoryOf(species)
      buckets.get(bucket)!.push(species)
      if (matches(species, needle)) hits.set(bucket, hits.get(bucket)! + 1)
    }

    const list = buckets
      .get(category)!
      .filter((s) => matches(s, needle))
      .sort(sortFor(category))

    // Where else a search would find something, so a miss is never a dead end.
    const other = CATEGORIES.filter((c) => c !== category && hits.get(c)! > 0).map(
      (c) => ({ category: c, count: hits.get(c)! }),
    )

    return {
      shown: list,
      totals: new Map([...buckets].map(([c, list]) => [c, list.length])),
      elsewhere: needle ? other : [],
    }
  }, [category, query])

  return (
    <div className="panel palette">
      <div className="palette-controls">
        <span className="select category">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            aria-label="Species category"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c} ({totals.get(c) ?? 0})
              </option>
            ))}
          </select>
        </span>

        <input
          className="search"
          type="search"
          placeholder="Search name or formula…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="chips scroll">
        {shown.map((species) => (
          <button
            key={species.id}
            className="chip"
            onClick={() => add(species.id)}
            title={`${species.name}${species.latticeCaveat ? ' — not a discrete molecule' : ''}`}
          >
            <Swatch species={species} />
            <span className="formula">{species.formula}</span>
          </button>
        ))}

        {shown.length === 0 && <p className="hint">Nothing in {category} matches “{query}”.</p>}
      </div>

      {elsewhere.length > 0 && (
        <p className="elsewhere">
          Also found in{' '}
          {elsewhere.map((e, i) => (
            <span key={e.category}>
              {i > 0 && ', '}
              <button className="link" onClick={() => setCategory(e.category)}>
                {e.category} ({e.count})
              </button>
            </span>
          ))}
        </p>
      )}
    </div>
  )
}
