/**
 * Interface accent colours.
 *
 * The app's visual direction is "Benchtop": black phenolic resin — the matte
 * surface of a school lab bench — against porcelain, with no colour in the
 * chrome. Molecules already carry real, saturated colour, and those colours are
 * factual claims the app exists to make.
 *
 * Exactly one accent is allowed, and it belongs to activation energy.
 *
 * The accent marks activation energy, so it is drawn from what elements
 * actually emit in a flame rather than chosen to suit the interface. Sodium's
 * 589 nm doublet is the yellow of a street lamp; copper burns blue-green;
 * potassium lilac. Every one clears 4.5:1 as text and as ink on its own fill,
 * in both modes.
 */
export type AccentId = 'bunsen' | 'sodium' | 'copper' | 'potassium' | 'strontium' | 'barium'

export interface Accent {
  id: AccentId
  name: string
  note: string
  /** Swatch for the picker: the dark-mode fill. */
  swatch: string
}

export const ACCENTS: Accent[] = [
  { id: 'bunsen', name: 'Bunsen', note: 'The blue of a roaring inner cone.', swatch: '#2f9bdd' },
  { id: 'sodium', name: 'Sodium', note: 'The 589 nm doublet — a street lamp.', swatch: '#ffab00' },
  { id: 'copper', name: 'Copper', note: 'Blue-green, the halide flame test.', swatch: '#14b8a6' },
  { id: 'potassium', name: 'Potassium', note: 'Lilac, seen through cobalt glass.', swatch: '#a77bf0' },
  { id: 'strontium', name: 'Strontium', note: 'Scarlet — the red in fireworks.', swatch: '#ff4d5e' },
  { id: 'barium', name: 'Barium', note: 'Pale apple green.', swatch: '#8fd14f' },
]

