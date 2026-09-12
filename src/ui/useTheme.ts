import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AccentId } from './designs'

/**
 * Light/dark theme, resolved as: stored override -> system preference -> dark.
 *
 * The stored value is deliberately tri-state. `null` means "no override", which
 * is NOT the same as "dark": a user who has never touched the toggle should keep
 * tracking their OS, including when it changes mid-session.
 */

export type Theme = 'light' | 'dark'
export type ThemeChoice = Theme | 'system'

const STORAGE_KEY = 'chemystery:theme'
const ACCENT_KEY = 'chemystery:accent'

/** Pure, so the precedence can be tested without a DOM or storage. */
export function resolveTheme(stored: string | null, systemPrefersLight: boolean): Theme {
  if (stored === 'light' || stored === 'dark') return stored
  return systemPrefersLight ? 'light' : 'dark'
}

/** Reading storage throws in some privacy modes; never let that break the app. */
function readStored(): ThemeChoice {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system'
  }
}

function writeStored(choice: ThemeChoice) {
  try {
    if (choice === 'system') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, choice)
  } catch {
    // Preference simply will not persist. Not worth surfacing.
  }
}

const lightQuery = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: light)')
    : null

function readAccent(): AccentId {
  try {
    return (localStorage.getItem(ACCENT_KEY) as AccentId) || 'sodium'
  } catch {
    return 'sodium'
  }
}

export function useTheme() {
  const [accent, setAccentState] = useState<AccentId>(readAccent)
  const [choice, setChoice] = useState<ThemeChoice>(readStored)
  const [systemLight, setSystemLight] = useState(() => lightQuery()?.matches ?? false)

  // Track the OS while no explicit override is set.
  useEffect(() => {
    const query = lightQuery()
    if (!query) return
    const onChange = (e: MediaQueryListEvent) => setSystemLight(e.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const theme = resolveTheme(choice === 'system' ? null : choice, systemLight)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.dataset.accent = accent
  }, [theme, accent])

  const setAccent = useCallback((next: AccentId) => {
    setAccentState(next)
    try {
      localStorage.setItem(ACCENT_KEY, next)
    } catch {
      // Preference simply will not persist.
    }
  }, [])

  const setTheme = useCallback((next: ThemeChoice) => {
    setChoice(next)
    writeStored(next)
  }, [])

  const toggle = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [setTheme, theme])

  return { theme, choice, setTheme, toggle, accent, setAccent }
}

/**
 * Scene colours for the current design.
 *
 * The canvas and accent are read back from the stylesheet rather than duplicated
 * in TypeScript, so each design defines its palette in exactly one place. The
 * rest of the scene — rim, lighting, particle physics — comes from SCENE, which
 * varies by mode rather than by direction.
 */
export function useSceneTheme(theme: Theme, accent: AccentId): SceneTheme {
  const [css, setCss] = useState<{ canvas: string; glow: string } | null>(null)

  useEffect(() => {
    const read = () => {
      const style = getComputedStyle(document.documentElement)
      const canvas = style.getPropertyValue('--canvas').trim()
      const glow = style.getPropertyValue('--accent').trim()
      if (canvas && glow) setCss({ canvas, glow })
    }
    // A frame's delay lets the new data-design attribute take effect first.
    const id = requestAnimationFrame(read)
    return () => cancelAnimationFrame(id)
  }, [theme, accent])

  return useMemo(
    () => (css ? { ...SCENE[theme], canvas: css.canvas, glow: css.glow } : SCENE[theme]),
    [theme, css],
  )
}

/**
 * Scene colours for the 3D workspace.
 *
 * Kept in TypeScript rather than CSS because react-three-fiber materials take
 * colour values directly and cannot read CSS custom properties.
 */
export interface SceneTheme {
  canvas: string
  fogNear: number
  fogFar: number
  /** Back-face shell behind every atom: the outline that defines sphere shape. */
  rim: string
  rimScale: number
  /** Opacity for colourless gases. Higher on light, or they dissolve away. */
  translucentOpacity: number
  ambient: number
  keyLight: number
  fillLight: number
  fillColour: string
  hemiSky: string
  hemiGround: string
  shadowOpacity: number
  glow: string
  /** Strength of the studio environment metals reflect. */
  envIntensity: number
}

export const SCENE: Record<Theme, SceneTheme> = {
  dark: {
    canvas: '#0b1622',
    fogNear: 32,
    fogFar: 70,
    rim: '#0d1b26',
    rimScale: 1.06,
    translucentOpacity: 0.78,
    ambient: 0.55,
    keyLight: 1.6,
    fillLight: 0.5,
    fillColour: '#88bbff',
    hemiSky: '#cfe6ff',
    hemiGround: '#0b1622',
    shadowOpacity: 0.35,
    glow: '#ffb648',
    envIntensity: 0.45,
  },
  light: {
    canvas: '#eef3f8',
    fogNear: 38,
    fogFar: 85,
    // A near-black outline is what keeps the 73 near-white elements legible on a
    // light canvas. Slightly thicker than in dark mode, where the canvas itself
    // already provides the contrast.
    rim: '#16242f',
    rimScale: 1.085,
    translucentOpacity: 0.9,
    ambient: 0.72,
    keyLight: 1.45,
    fillLight: 0.38,
    fillColour: '#b9d4ff',
    hemiSky: '#ffffff',
    hemiGround: '#c3d0dc',
    shadowOpacity: 0.28,
    glow: '#e08a00',
    envIntensity: 1,
  },
}


/* ------------------------------------------------------------------ *
 * Atom legibility
 * ------------------------------------------------------------------ */

function channel(hex: string, index: number): number {
  const c = parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/** WCAG relative luminance of a #rrggbb colour. */
export function luminance(hex: string): number {
  return 0.2126 * channel(hex, 0) + 0.7152 * channel(hex, 1) + 0.0722 * channel(hex, 2)
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** Below this, an atom's fill is too close to the canvas to read on its own. */
const LEGIBLE = 1.6

/**
 * Outline thickness for one atom, widened when its colour approaches the canvas.
 *
 * Element colours are factual and must not be adjusted to suit a background, and
 * darkening the canvas is not the answer either: most element colours are light
 * silvery greys, so a mid-tone canvas collides with far MORE of them than a pale
 * one does (82 elements below 1.3:1 at #c6d3e0, versus 11 at #eef3f8).
 *
 * The problem is therefore narrow — a few near-white elements, hydrogen worst at
 * 1.07:1 on the light canvas — and the fix is targeted: give exactly those atoms
 * a heavier outline, and leave every well-contrasted atom alone.
 */
export function rimScaleFor(colour: string, scene: SceneTheme): number {
  const contrast = contrastRatio(colour, scene.canvas)
  if (contrast >= LEGIBLE) return scene.rimScale
  const shortfall = (LEGIBLE - Math.max(contrast, 1)) / (LEGIBLE - 1)
  return scene.rimScale + shortfall * 0.075
}
