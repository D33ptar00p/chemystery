import { SPECIES } from '../data/species'
import { ELEMENTS, COLOUR_BASIS_NOTE } from '../data/elements'

import { useSandboxStore } from '../state/useSandboxStore'
import { SpeciesPhoto } from './SpeciesPhoto'
import { ElementTile } from './ElementTile'

/**
 * Detail for the selected species.
 *
 * Three honesty jobs beyond listing facts:
 *  - An ELEMENT's colour is not a COMPOUND's colour. Water is not "red and
 *    white" — its atoms are drawn that way. The bulk swatch and the photograph
 *    say what the substance actually looks like.
 *  - Sodium, graphite and salt are lattices, not molecules; their caveat shows
 *    wherever they appear.
 *  - Every atom colour states WHERE it comes from, so a colourless gas is never
 *    silently presented as coloured.
 */
export function InfoPanel() {
  const selectedId = useSandboxStore((s) => s.selectedId)
  const entity = useSandboxStore((s) => s.entities.find((e) => e.id === s.selectedId))
  const remove = useSandboxStore((s) => s.remove)
  if (!selectedId || !entity) return null

  const species = SPECIES[entity.speciesId]
  const symbols = [...new Set(species.atoms.map((a) => a.element))]
  const elements = symbols.map((sym) => ELEMENTS[sym]).filter(Boolean)

  // A species built from one kind of atom IS that element, so it earns the
  // periodic-table line.
  const asElement = symbols.length === 1 ? ELEMENTS[symbols[0]] : undefined

  return (
    <div className="panel info">
      <div className="info-head">
        <div>
          <h2>
            {species.formula} <small>{species.name}</small>
          </h2>
        </div>
        <button className="ghost" onClick={() => remove(entity.id)}>
          Remove
        </button>
      </div>

      {asElement && <ElementTile element={asElement} />}

      <SpeciesPhoto species={species} />

      <dl>
        {!asElement && (
          <>
            <dt>State</dt>
            <dd>{species.phase} at room temperature</dd>
          </>
        )}
        {species.shape && (
          <>
            <dt>Shape</dt>
            <dd>{species.shape}</dd>
          </>
        )}
        <dt>Atoms</dt>
        <dd>{species.atoms.length}</dd>
      </dl>

      <div className="bulk">
        <span className="swatch large" style={{ background: species.bulkColour }} />
        <div>
          <strong>What it actually looks like</strong>
          <p>{species.bulkAppearance}</p>
        </div>
      </div>

      {species.latticeCaveat && <p className="caveat">⚠ {species.latticeCaveat}</p>}

      <h3>Why these colours</h3>
      <ul className="elements">
        {elements.map((element) => (
          <li key={element.symbol}>
            <span className="swatch" style={{ background: element.colour }} />
            <div>
              <strong>
                {element.name} ({element.symbol})
              </strong>
              <p>{element.appearance}</p>
              <p className="basis">{COLOUR_BASIS_NOTE[element.colourBasis]}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
