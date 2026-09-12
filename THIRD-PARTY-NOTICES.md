# Third-party notices

CheMystery itself is MIT licensed — see [LICENSE](LICENSE). This file covers everything
else the project uses or ships.

## Typefaces — redistributed, and the reason this file exists

The built site serves these font files, so their licences travel with them. Both are
**SIL Open Font License 1.1**, reproduced verbatim in [`licenses/`](licenses).

| Typeface | Copyright | Licence |
| --- | --- | --- |
| [Archivo](https://github.com/Omnibus-Type/Archivo) | 2020 The Archivo Project Authors | [OFL-1.1](licenses/Archivo-OFL-1.1.txt) |
| [IBM Plex Mono](https://github.com/IBM/plex) | 2017 IBM Corp. | [OFL-1.1](licenses/IBMPlexMono-OFL-1.1.txt) |

Neither font is modified, so the OFL Reserved Font Name clause is not engaged. If you
fork this project and alter the font files, you must rename them.

## Photographs

The detail panel fetches a photograph of the selected substance from Wikipedia and
Wikimedia Commons **at runtime**. Those images are not redistributed with this project
and are not covered by its licence. Each is individually CC BY-SA, CC BY or public
domain, and the app links every one back to its source page, where the author and licence
are recorded.

## Libraries

Every dependency is permissively licensed and compatible with MIT:

| Licence | Count | Notable |
| --- | --- | --- |
| MIT | 86 | React, three.js, react-three-fiber, drei, zustand, Vite, Vitest |
| Apache-2.0 | 9 | TypeScript |
| ISC | 5 | |
| BSD-3-Clause | 2 | |
| MPL-2.0 | 3 | lightningcss — see below |

**lightningcss (MPL-2.0)** is Vite's CSS minifier. MPL is file-level copyleft, but it
binds only code that is *distributed*, and a build tool never reaches the deployed site.
No obligation attaches to the built output.

**webgl-constants** declares no licence. It arrives transitively via
`@react-three/drei → detect-gpu`, which this project does not use; the bundle was checked
and contains no `detect-gpu` code, so it is tree-shaken away and is not shipped.

## Chemistry data

Element properties, bond lengths and reaction equations are measurements and facts, which
are not copyrightable. They were compiled from standard reference values and, for the
organic table, corroborated against literature sources.

Two sources were **deliberately avoided**: the NIST Chemistry WebBook asserts compilation
copyright under the Standard Reference Data Act, and ChemSpider's terms forbid
redistributing its structure data. No structure file from either is present. Molecular
geometry is generated from VSEPR rules at runtime rather than taken from any database,
which is part of why the project can be licensed freely at all.

Anyone extending the data should keep to that line rather than pasting in structures from
a restricted database.
