import { useEffect, useState } from 'react'
import { ELEMENTS } from '../data/elements'
import type { Species } from '../data/types'

/**
 * A real photograph of the substance, from Wikipedia's article lead image.
 *
 * WHY THE LEAD IMAGE SPECIFICALLY: it is the article's representative image, so
 * for a chemical article it is either the substance itself or its structural
 * formula — never something incidental. Listing all images on the page and
 * picking the first photograph was tried and is badly unsafe: it offers Jupiter
 * for ammonia and a photograph of the moon Io for sulfur.
 *
 * Structural diagrams are rejected: the app already draws the molecule, and a
 * Lewis diagram is not what "what it really looks like" means. Many compounds
 * therefore have no photo, and that is the honest outcome — nothing is shown.
 *
 * This is the app's ONLY runtime network dependency. It is deliberately
 * best-effort: offline, blocked, rate-limited or missing all degrade to showing
 * nothing at all, and never to a broken image or an error the user must dismiss.
 */

const SUMMARY = 'https://en.wikipedia.org/api/rest_v1/page/summary/'
const API = 'https://en.wikipedia.org/w/api.php'
const COMMONS = 'https://commons.wikimedia.org/w/api.php'

/**
 * Hand-picked Wikimedia Commons files, tried before anything automatic.
 *
 * Some substances simply defeat both automatic passes. Water is the clearest
 * case: its article's lead image is a structural diagram, and every photograph
 * on the page is of a lake, a tap or a starfish, so the filename rule correctly
 * refuses all of them — yet water obviously has good photographs. For a handful
 * of important species a curated file is more honest than a clever rule.
 *
 * Keep this list short and verified. It is a patch over the heuristics, not a
 * replacement for them: 240-odd species cannot be curated by hand.
 */
const PHOTO_OVERRIDES: Record<string, string> = {
  H2O: 'Water drop 001.jpg',
  CH4: 'Frozen Methane Bubbles (11927906233).jpg',
  H2O2: 'Hydrogen Peroxide Bottle.jpg',
  HCl: 'Hydrochloric acid 01.jpg',
  NaOH: 'NaOH beads.jpg',
  NaCl: 'Selpologne.jpg',
  // Its best photograph is "Ethanol Flasche.jpg"; "Flasche" is German for
  // bottle, so the filename rule cannot know it is safe.
  C2H5OH: 'Ethanol Flasche.jpg',
}

/**
 * Words allowed in a candidate filename besides the article's own words.
 * Anything else disqualifies it — this is what rejects "Ammonia Train.jpg"
 * and a photograph of a sheep being tested for methane.
 */
const SAFE_WORDS = new Set([
  'sample', 'samples', 'crystal', 'crystals', 'crystalline', 'powder', 'solution',
  'bottle', 'vial', 'ampoule', 'flask', 'jar', 'lump', 'piece', 'pieces', 'granule',
  'granules', 'liquid', 'solid', 'pure', 'anhydrous', 'hydrate', 'pentahydrate',
  'white', 'blue', 'green', 'yellow', 'brown', 'test', 'tube', 'glass', 'close',
  'macro', 'photo', 'image', 'chemical', 'compound', 'acid', 'salt',
])

const significantWords = (text: string) =>
  text.toLowerCase().replace(/\(.*?\)/g, ' ').split(/[^a-z]+/).filter((w) => w.length >= 4)

/**
 * Photographs are essentially always JPEG; structural diagrams, crystal
 * structures and chemboxes are PNG or SVG. Requiring JPEG rejects that entire
 * class at a stroke, which keyword matching cannot: it let through
 * "Kristallstruktur_Calciumchlorid.png" because the German spelling is
 * "struktur", not "structur".
 */
const IS_JPEG = /\.jpe?g(?:$|[/?])/i

/** Filenames that signal a drawing even when the file happens to be a JPEG. */
const NOT_A_PHOTO =
  /2D|3D|structur|struktur|lewis|skeletal|formula|diagram|unit.?cell|spectrum|ball|stick|chembox|orbital/i

/**
 * Compound names that differ from their Wikipedia article title.
 * Elements need no entry: their name is the article title.
 */
const TITLE_ALIASES: Record<string, string> = {
  NaHCO3: 'Sodium bicarbonate',
  CH3COOH: 'Acetic acid',
  CH3COCH3: 'Acetone',
  HCHO: 'Formaldehyde',
  CH3CHO: 'Acetaldehyde',
  HCOOH: 'Formic acid',
  C2H5COOH: 'Propionic acid',
  CH3COOC2H5: 'Ethyl acetate',
  CH3COONa: 'Sodium acetate',
  CH3COCl: 'Acetyl chloride',
  CONH22: 'Urea',
  NH2CH2COOH: 'Glycine',
  C2H6O2: 'Ethylene glycol',
  C3H8O3: 'Glycerol',
  C2H5OC2H5: 'Diethyl ether',
  C6H5CH3: 'Toluene',
  C6H5OH: 'Phenol',
  C6H5NH2: 'Aniline',
  C6H12O6: 'Glucose',
  P4O10: 'Phosphorus pentoxide',
  HCl: 'Hydrogen chloride',
  C: 'Graphite',
  CaOH2: 'Calcium hydroxide',
  MgOH2: 'Magnesium hydroxide',
  CuOH2: 'Copper(II) hydroxide',
  FeOH3: 'Iron(III) oxide-hydroxide',
  PbNO32: 'Lead(II) nitrate',
  C2H4Br2: '1,2-Dibromoethane',
}

function titleFor(species: Species): string {
  if (TITLE_ALIASES[species.id]) return TITLE_ALIASES[species.id]
  // A single-element species is the element itself, and the element's name is
  // reliably the Wikipedia article title.
  const elements = new Set(species.atoms.map((a) => a.element))
  if (elements.size === 1) {
    return ELEMENTS[species.atoms[0].element]?.name ?? species.name
  }
  return species.name
}

interface Photo {
  src: string
  page: string
  /** Author, where Commons records one. */
  credit?: string
  /** Short licence name, e.g. "CC BY-SA 4.0". */
  licence?: string
}

/**
 * The Commons file a thumbnail came from.
 *
 * Thumbnail URLs look like
 *   .../commons/thumb/d/d7/Gold-crystals.jpg/330px-Gold-crystals.jpg
 * so the original file name is the segment before the sized one. Non-thumb URLs
 * end with the file name directly.
 */
function fileTitleFromUrl(src: string): string | null {
  try {
    const parts = new URL(src).pathname.split('/').filter(Boolean)
    const thumb = parts.indexOf('thumb')
    const name = thumb >= 0 ? parts[parts.length - 2] : parts[parts.length - 1]
    return name ? decodeURIComponent(name) : null
  } catch {
    return null
  }
}

const stripTags = (html: string) =>
  html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * Author and licence for a Commons file.
 *
 * CC BY-SA asks for the creator to be named. Linking to the source page, where
 * both are recorded, is defensible, but naming them is what the licence actually
 * asks for — and it costs one cached request.
 */
async function creditFor(fileTitle: string): Promise<Pick<Photo, 'credit' | 'licence'>> {
  const url =
    `${COMMONS}?action=query&titles=${encodeURIComponent('File:' + fileTitle)}` +
    `&prop=imageinfo&iiprop=extmetadata&format=json&origin=*`
  const response = await fetch(url)
  if (!response.ok) return {}
  const data = await response.json()
  const page = Object.values(data?.query?.pages ?? {})[0] as
    | { imageinfo?: { extmetadata?: Record<string, { value?: string }> }[] }
    | undefined
  const meta = page?.imageinfo?.[0]?.extmetadata
  if (!meta) return {}

  const artist = meta.Artist?.value ? stripTags(meta.Artist.value) : undefined
  const licence = meta.LicenseShortName?.value ? stripTags(meta.LicenseShortName.value) : undefined
  return {
    // A very long author string is usually a full institutional credit; the
    // link carries the detail, so keep the caption short.
    credit: artist && artist.length <= 48 ? artist : undefined,
    licence,
  }
}

/** Cached across selections, including misses, so nothing is fetched twice. */
const cache = new Map<string, Photo | null>()

/** The article's lead image, if it is a photograph rather than a drawing. */
async function fromLeadImage(title: string): Promise<Photo | null> {
  const response = await fetch(SUMMARY + encodeURIComponent(title), {
    headers: { accept: 'application/json' },
  })
  if (!response.ok) return null
  const data = await response.json()
  const source: string | undefined = data?.thumbnail?.source
  if (!source) return null
  const decoded = decodeURIComponent(source)
  if (!IS_JPEG.test(decoded) || NOT_A_PHOTO.test(decoded)) return null
  return {
    src: source,
    page: data?.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${title}`,
  }
}

/**
 * Fallback for compounds, whose lead image is usually a structural formula.
 *
 * Scans the article's images for a JPEG whose filename is made ENTIRELY of
 * words from the article title plus a small safe vocabulary. The completeness
 * requirement is the whole point: merely containing the title word lets through
 * "Ammonia Train.jpg" and a photograph of a sheep on the methane article.
 */
async function fromPageImages(title: string): Promise<Photo | null> {
  const url =
    `${API}?action=query&generator=images&titles=${encodeURIComponent(title)}` +
    `&gimlimit=40&prop=imageinfo&iiprop=url|mime&iiurlwidth=400&format=json&origin=*`
  const response = await fetch(url)
  if (!response.ok) return null
  const data = await response.json()

  const titleWords = significantWords(title)
  const pages: Record<string, unknown>[] = Object.values(data?.query?.pages ?? {})

  for (const page of pages) {
    const info = (page.imageinfo as { mime?: string; thumburl?: string; url?: string }[] | undefined)?.[0]
    const name = String(page.title ?? '').replace(/^File:/, '').replace(/\.[a-z]+$/i, '')
    if (!info || info.mime !== 'image/jpeg' || NOT_A_PHOTO.test(name)) continue

    const words = significantWords(name)
    if (!words.some((w) => titleWords.includes(w))) continue
    if (!words.every((w) => titleWords.includes(w) || SAFE_WORDS.has(w))) continue

    const src = info.thumburl ?? info.url
    if (!src) continue
    return {
      src,
      page: `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
    }
  }
  return null
}

/** Resolve a specific Commons file to a thumbnail URL. */
async function fromCommonsFile(file: string): Promise<Photo | null> {
  const url =
    `${COMMONS}?action=query&titles=${encodeURIComponent('File:' + file)}` +
    `&prop=imageinfo&iiprop=url&iiurlwidth=400&format=json&origin=*`
  const response = await fetch(url)
  if (!response.ok) return null
  const data = await response.json()
  const page = Object.values(data?.query?.pages ?? {})[0] as
    | { imageinfo?: { thumburl?: string; url?: string }[] }
    | undefined
  const info = page?.imageinfo?.[0]
  const src = info?.thumburl ?? info?.url
  if (!src) return null
  return {
    src,
    page: `https://commons.wikimedia.org/wiki/${encodeURIComponent('File:' + file)}`,
  }
}

async function resolvePhoto(title: string, speciesId: string): Promise<Photo | null> {
  const override = PHOTO_OVERRIDES[speciesId]
  const found =
    (override ? await fromCommonsFile(override).catch(() => null) : null) ??
    (await fromLeadImage(title).catch(() => null)) ??
    (await fromPageImages(title).catch(() => null))
  if (!found) return null

  const file = fileTitleFromUrl(found.src)
  if (!file) return found
  const credit = await creditFor(file).catch(() => ({}))
  return { ...found, ...credit }
}

export function SpeciesPhoto({ species }: { species: Species }) {
  const title = titleFor(species)
  // Keyed by species as well as title: an override is per-species, so two
  // species sharing an article must not share a cached result.
  const key = `${species.id}|${title}`
  const [photo, setPhoto] = useState<Photo | null>(() => cache.get(key) ?? null)
  const [state, setState] = useState<'idle' | 'loading'>(() =>
    cache.has(key) ? 'idle' : 'loading',
  )

  useEffect(() => {
    if (cache.has(key)) {
      setPhoto(cache.get(key) ?? null)
      setState('idle')
      return
    }

    let cancelled = false
    setState('loading')
    setPhoto(null)

    resolvePhoto(title, species.id)
      .catch(() => null)
      .then((found) => {
        cache.set(key, found)
        if (!cancelled) {
          setPhoto(found)
          setState('idle')
        }
      })

    return () => {
      cancelled = true
    }
  }, [key, title, species.id])

  if (state === 'loading') return <div className="photo-slot loading" />
  if (!photo) return null

  return (
    <figure className="photo">
      <img src={photo.src} alt={`Photograph of ${species.name}`} loading="lazy" />
      <figcaption>
        {photo.credit && <span className="photo-credit">{photo.credit}</span>}
        <a href={photo.page} target="_blank" rel="noreferrer noopener">
          {photo.licence ? `${photo.licence} — via Wikimedia` : 'Photo via Wikimedia — source and licence'}
        </a>
      </figcaption>
    </figure>
  )
}
