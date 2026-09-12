# CheMystery

An interactive 3D chemistry sandbox. Drag molecules into the workspace, push them
together, and supply the energy needed to make them react.

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # engine + data-integrity tests
npm run build    # static bundle in dist/
```

No backend. The production build is static files.

## How it is put together

Three layers, deliberately decoupled so the chemistry is testable without a browser.

| Layer | Location | Depends on |
| --- | --- | --- |
| Data | `src/data/` | nothing |
| Engine | `src/engine/` | data only — no React, no three.js |
| Presentation | `src/scene/`, `src/ui/` | both |

Adding chemistry should be a **data edit**. If a new species or reaction requires an
engine change, the abstraction is wrong — fix it there rather than special-casing.

### Data (`src/data/`)

- `elements.ts` — all **118 elements**: van der Waals and covalent radii, real-world
  colours with an honest `colourBasis`, appearance text, category, phase.
- `species.ts` — merges four sources into one table of ~246 species:
  - `species-elements.ts` — **derived from `ELEMENTS`**, so all 118 elements are
    droppable automatically and can never drift out of sync.
  - `species-inorganic.ts` — ~80 acids, oxides, salts, bases and covalent halides.
  - `species-organic.ts` — ~48 alkanes, alkenes, aromatics, alcohols, carbonyls,
    acids, esters, halogenoalkanes and amines.
  Each species gives atoms, bonds, and the **lone-pair count on each atom**. No coordinates.
- `reactions.ts` — **68 balanced reactions** across combustion, synthesis,
  decomposition, acid-base, precipitation, displacement, redox and the organic types.

### Geometry is computed, not stored

`src/engine/geometry.ts` turns connectivity into 3D coordinates using VSEPR rules.
Species declare atoms, bonds and **lone pairs**; positions are derived.

Coordinates were originally hand-authored, which was fine for ten molecules and does
not scale to a hundred. Fetching them was not an option either — NIST WebBook and
ChemSpider both forbid redistributing their structure files. Generating them removes
the whole problem: no RDKit/WASM, no runtime fetching, no licence exposure.

How it works:

1. **Rings first.** Any ring is laid out as a planar regular polygon. Growing a ring
   outward from a spanning tree does not close it — benzene would come out a spiral.
2. **Then outward, breadth-first.** Each atom orients its ideal VSEPR direction set so
   one direction points back at its parent, and hands the rest to its children.
3. **Bond lengths** come from an explicit per-bond override where the data gives one,
   otherwise the sum of covalent radii with a bond-order correction.

Bond *angles* come from `idealAngle(bonded, lonePairs)`, which encodes real measured
angles rather than ideal polyhedra — water is 104.5°, ammonia 107°, not both 109.5°.
**Lone pairs are the load-bearing field**: they are the difference between bent water
and linear water.

Aromatic rings need their delocalised bond length set as an override (1.39 Å for
benzene); Kekulé alternating bond orders in the data are a drawing convention, and
feeding them to a naive length estimate would give a lumpy ring.

### Engine (`src/engine/`)

Pure functions over a `Record<speciesId, count>`:

- `reactionKey.ts` — canonical, order-independent key for a set of species.
- `matchReaction.ts` — which curated reactions can run. Matching is by **subset**, so a
  spectator species sitting nearby does not block a valid reaction. Also exports
  `findNearMiss`, for when the right species are present but one is too scarce.
- `applyReaction.ts` — limiting reagent, products, and leftovers.

`matchReaction` is the seam where rule-based prediction (solubility rules, activity
series, neutralisation) would be appended to the curated results later.

## Design decisions worth knowing

**Space-filling, not ball-and-stick.** Every atom is a sphere at its van der Waals
radius and bonded spheres interpenetrate. There are no bond cylinders — the fusion is
the bond. Because nothing implies structure the way a stick does, each atom gets a
dark backing shell so two same-coloured spheres stay visually distinct.

**Reactions do not fire on contact.** A hydrogen/oxygen mixture is kinetically stable
at room temperature; it sits inert until something ignites it. Each reaction declares
an `activation` requirement, and the UI asks the user to supply it. The correctness
requirement turned out to be the most satisfying interaction in the app.

**Colours are real where real is possible.** Carbon is graphite black, chlorine is
yellow-green, sodium is silvery — those are true bulk appearances. Hydrogen and oxygen
are colourless gases, so a strictly literal palette would render H₂, O₂ and H₂O as
identical blobs. Each element therefore records a `colourBasis` saying where its colour
comes from (`bulk`, `liquid`, `discharge`) and the UI states that explicitly rather
than implying a colourless gas is coloured.

**Near misses are explained, not silent.** `2 Na + Cl₂` needs *two* sodiums; one Na
beside one Cl₂ produces nothing. Without feedback that is indistinguishable from a
broken app — it caught out the first two people to use it. A cluster holding every
required species but too little of one now shows a muted "Add 1 more Na" hint.

**Elements show their periodic-table placement.** Atomic number, category, period,
group and block are *derived* from the atomic number in `periodicTable.ts` rather than
stored — position is a consequence of Z, so storing it would be 118 more chances to be
wrong. Group 3 follows the modern IUPAC assignment (Sc, Y, Lu, Lr), and a test checks the
computed placement against each element's declared category.

**An element's colour is not a compound's colour.** Water is not "red and white" — its
atoms are drawn that way. Every species carries a separate bulk-appearance swatch.

**Some entries are not molecules.** Sodium, graphite and sodium chloride are metallic,
covalent-network and ionic lattices. They are included for the reactions they enable,
but each carries a `latticeCaveat` shown wherever it appears, so the app does not teach
that NaCl is a diatomic molecule.

**Selection is shown on the rim, not the atom.** Tinting a selected atom emissively
washed out its element colour — silvery sodium rendered blue — which defeats the point
of colouring by real appearance. The highlight lives on the outline shell instead.

### Reaction effects

Every reaction carries an authored `observable` — *"a brilliant white flame too bright to
look at"*, *"a curdy white precipitate appears the instant the solutions meet"*. Each also
carries an `effect` (`flame`, `flash`, `bubbles`, `precipitate`, `smoke`, `glow`,
`colour-change`, `warmth`) that decides how that sentence is drawn.

`effect` is stored explicitly rather than matched from the prose at runtime: keyword
-sniffing a sentence on every reaction would be slower and quietly fragile, since
rewording an observable would silently change its animation. The values were derived once
by classifying all 68 observables, then hand-corrected where the keywords misread the
sentence — *"a dull red glow with **no** bright flame"* is a glow, and *"no longer
decolourises bromine water"* describes a later test rather than the reaction itself.

`src/scene/ReactionBurst.tsx` renders all eight from one parameterised particle system —
they differ in colour, direction, gravity and lifetime, not in kind — in a single
InstancedMesh, so a burst costs one draw call. Precipitates fall, bubbles and smoke rise,
and a flash is the shortest thing on screen; tests assert each of those.

### Visual direction

The interface is **Benchtop**: black phenolic resin — the matte surface of a school lab
bench — against porcelain, set in Archivo with IBM Plex Mono for every formula and figure.

The governing rule comes from the subject. Molecules already carry real, saturated colour,
and those colours are factual claims the app exists to make, so **the chrome owns none of
its own**. Exactly one accent is allowed, and it belongs to *activation energy* — the
selection ring, the activation label, the button that supplies the spark — because
supplying that energy is the app's central mechanic and the only moment the interface
should raise its voice.

The accent is therefore chosen from real **flame-test emission colours** rather than
arbitrary hues, picked from the dropdown beside the theme toggle. Sodium's 589 nm doublet
is the default. Each option is defined for both modes and clears 4.5:1 as text on panel
and as ink on its own fill; the lowest is 4.95:1.

Two further directions, **Squared paper** and **Periodic**, remain selectable in the
left-hand dropdown as design alternatives. They carry their own typefaces, so removing
them would cut the font payload from roughly 364 KB to 120 KB.

### Themes

Light and dark, following `prefers-color-scheme` on first load with a toggle in the title
bar that overrides it and persists. An inline script in `index.html` stamps `data-theme`
before first paint, so a light-preference user never sees a flash of the dark UI.

Every chrome colour is a token on `:root` (dark) and `[data-theme="light"]`. Two accent
tokens exist deliberately: `--accent` is a *fill*, `--accent-text` is the same idea used
*as text* — `#ffb648` reads well on a dark panel and fails contrast badly on a light one.
All text pairs clear 4.5:1 in both themes.

**The hard part was the 3D canvas.** Element colours are factual claims about real
appearance, so they cannot be recoloured to suit a background — and darkening the canvas
turns out to be the wrong lever too. Most element colours are light silvery greys, so a
mid-tone canvas collides with *more* of them than a pale one: 82 elements fall below
1.3:1 at `#c6d3e0`, against 11 at `#eef3f8`.

The fix is `rimScaleFor` in `src/ui/useTheme.ts`: measure each atom's WCAG contrast
against the canvas and widen its outline only when the fill cannot carry itself. Atoms
that read fine keep a thin outline. The rule is symmetric and helps both themes — on
light it catches hydrogen (1.07:1) and the silvery metals; on dark it catches carbon
(1.21:1), the one element that was always slightly weak there.

Colourless gases are also rendered more opaque on light. Scene values live in `SCENE`,
passed to `Workspace` as a **prop** — React context does not cross into `<Canvas>`, which
renders through a separate reconciler root.

### Metals need something to reflect

`src/scene/StudioEnvironment.tsx` installs three's bundled `RoomEnvironment` as the scene
environment map. Without it a `metalness: 0.85` material renders near-black — it reflects
its surroundings and there are none — so silvery sodium and magnesium looked like lumps of
coal. The dark canvas hid this; the light one made it obvious, but it was wrong in both.
`RoomEnvironment` ships inside three, so this costs no network request, unlike drei's
`<Environment preset>` which fetches an HDR from a CDN and was removed for that reason.

### Layout

A full-width title bar carries the flame-colour and light/dark controls, above three
columns: the palette, the 3D workspace, and the
details panel. The palette shows one category at a time in a fixed three-column grid,
scrolling internally so it fills the window height whatever the species count.

Each chip carries its element colour as a bar down its leading edge rather than as a
circle — a circle plus its gap costs about 17px, which is most of the available text
width once three chips share a 300px column. Long formulas (CH₃COONa) still ellipsis and
carry their full name in the chip's title attribute.

### Real-world photographs

The info panel shows a photograph of the selected substance, fetched from Wikipedia's
article lead image. **This is the app's only runtime network dependency**, and it is
deliberately best-effort: offline, blocked, rate-limited or simply absent all degrade to
showing nothing — never a broken image or an error to dismiss.

Getting this right needed two rules, both learned the hard way:

1. **Only the lead image, never arbitrary page images.** The lead image is the article's
   representative image, so for a chemical article it is either the substance or its
   structural formula. Scanning all images on the page and taking the first photograph
   was tried and is badly unsafe — it offers Jupiter for ammonia and the moon Io for
   sulfur.
2. **Structural diagrams are rejected.** The app already draws the molecule; a Lewis
   diagram is not "what it really looks like".

Elements resolve reliably this way (verified across 22 — hydrogen gives a discharge tube
and oxygen gives liquid oxygen in a beaker, which happily corroborates their
`colourBasis` values). Most compounds have a structural formula as their lead image, so
there is a second pass over the article's images that accepts a JPEG only when **every**
significant word in its filename comes from the article title or a small safe vocabulary
(`sample`, `crystal`, `solution`…). Merely requiring the title word is not enough: that
is exactly what lets "Ammonia Train.jpg" through.

Where neither pass finds a photograph, none is shown. That is the honest outcome.

## Development

In dev builds the store is exposed as `window.__chemystery` for debugging, so molecules
can be placed at exact coordinates without fighting the drag:

```js
const s = window.__chemystery.getState()
s.clear(); s.add('Na', [-2.2, 0, 0]); s.add('Cl2', [2.2, 0, 0])
```

The guard is `import.meta.env.DEV`, so it is stripped from production builds.

### Where the escape hatch is

`Species.coordinates` bypasses the generator with explicit positions. It exists for
structures the generator genuinely cannot build — cages and fused ring systems, where
several rings must close at once and a single-ring layout plus a tree walk cannot
satisfy the second closure. Currently used by exactly one species, P₄O₁₀. Reach for it
only when a geometry test fails for that reason.

## Status

This is a vertical slice built around one hero reaction, **2 H₂ + O₂ → 2 H₂O**, plus
five more to prove the data model generalises. Deliberately not built yet: rule-based
reaction prediction, reaction animation beyond the pending-state indicator, challenge
or lesson modes.

Known rough edge: molecules are repositioned by dragging against the ground plane, and
missing a molecule orbits the camera instead. Drag positions are clamped to
`WORKSPACE_BOUND` so nothing can be flung out of reach.

### Chemistry data needs review

**Provenance is mixed, and this matters.** The organic table was produced by the
project's `chemistry-specialist` agent with its bond lengths corroborated against
literature sources. The element table, the inorganic table and the reaction table were
authored from standard reference values **without** source-by-source verification,
because the specialist agents building them were killed by a session rate limit.

Everything is machine-checked for *internal consistency* — every equation balances atom
by atom against the species table, every bond indexes real atoms, no two atoms coincide,
and bond lengths are physically plausible. That catches structural errors, not wrong
numbers. A wrong-but-plausible bond length or van der Waals radius will pass every test
in this repo.

Least certain, in order:
1. van der Waals radii for the heavy transition metals, and everything above Z = 99
   (superheavy elements carry a uniform 2.46 Å placeholder — not a measurement).
2. Lattice separations used as "bond lengths" in the ionic salts.
3. Acetyl chloride's C–Cl and C=O, flagged by the chemistry specialist as recalled
   rather than sourced.

Run `src/data/*.ts` past the `chemistry-specialist` agent before relying on any single
number.
