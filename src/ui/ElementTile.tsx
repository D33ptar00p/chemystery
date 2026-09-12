import type { Element } from '../data/elements'
import {
  blockOf,
  categoryColour,
  categoryLabel,
  electronConfiguration,
  groupOf,
  periodOf,
} from '../data/periodicTable'

/**
 * A periodic-table tile for the selected element.
 *
 * Laid out like a real periodic table cell — atomic number top-left, symbol
 * large in the middle, name and mass beneath — and coloured by element FAMILY,
 * the way a printed periodic table is.
 *
 * That is deliberately a different colour from the sphere in the workspace,
 * which shows the element's real-world appearance. The two answer different
 * questions, so the tile carries a small true-colour dot as well to make the
 * distinction explicit rather than confusing.
 */
export function ElementTile({ element }: { element: Element }) {
  const group = groupOf(element.atomicNumber)
  const family = categoryColour(element.category)

  // Labels stay short: the panel is 300px wide and long ones overflow it.
  const facts: [string, string][] = [
    ['State at 25 °C', element.phase],
    ['Electronegativity', element.electronegativity === null ? '—' : String(element.electronegativity)],
    ['vdW radius', `${element.vdwRadius} Å`],
    ['Covalent radius', `${element.covalentRadius} Å`],
  ]

  const placement = [
    `Period ${periodOf(element.atomicNumber)}`,
    group === null ? 'f-block series' : `Group ${group}`,
    `${blockOf(element.atomicNumber)}-block`,
  ].join(' · ')

  return (
    <div className="element-tile-wrap">
      <div className="tile-head">
      <div
        className="element-tile"
        style={{ borderColor: family, background: `linear-gradient(160deg, ${family}22, ${family}0d)` }}
      >
        <span className="tile-z">{element.atomicNumber}</span>
        <span
          className="tile-truecolour"
          style={{ background: element.colour }}
          title={`Actual appearance: ${element.appearance}`}
        />
        <span className="tile-symbol" style={{ color: family }}>
          {element.symbol}
        </span>
        <span className="tile-name">{element.name}</span>
        <span className="tile-mass">{element.atomicMass}</span>
      </div>

        <div className="tile-summary">
          <p className="tile-family" style={{ color: family }}>
            {categoryLabel(element.category)}
          </p>
          <p className="tile-place">{placement}</p>
        </div>
      </div>

      <dl className="tile-facts">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <div className="tile-config">
        <dt>Electron configuration</dt>
        <dd className="config">{electronConfiguration(element.atomicNumber)}</dd>
      </div>
    </div>
  )
}
