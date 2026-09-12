import { describe, it, expect } from 'vitest'
import { resolveTheme, SCENE, rimScaleFor, contrastRatio } from '../../ui/useTheme'
import { REACTIONS } from '../../data/reactions'
import { BURSTS } from '../../scene/ReactionBurst'

describe('theme resolution', () => {
  it('honours an explicit override over the system preference', () => {
    expect(resolveTheme('light', false)).toBe('light')
    expect(resolveTheme('dark', true)).toBe('dark')
  })

  it('follows the system when no override is stored', () => {
    expect(resolveTheme(null, true)).toBe('light')
    expect(resolveTheme(null, false)).toBe('dark')
  })

  it('falls back to dark when neither is available', () => {
    expect(resolveTheme(null, false)).toBe('dark')
  })

  it('ignores a stored value that is not a theme', () => {
    // Corrupt or stale storage must not produce an invalid theme.
    expect(resolveTheme('', true)).toBe('light')
    expect(resolveTheme('midnight', false)).toBe('dark')
    expect(resolveTheme('LIGHT', false)).toBe('dark')
  })
})

describe('scene theme', () => {
  it('defines both themes with every field', () => {
    for (const theme of ['dark', 'light'] as const) {
      const s = SCENE[theme]
      for (const [key, value] of Object.entries(s)) {
        expect(value, `${theme}.${key}`).toBeDefined()
        if (typeof value === 'string') expect(value, `${theme}.${key}`).toMatch(/^#[0-9a-f]{3,8}$/i)
      }
    }
  })

  it('keeps the light rim dark — it is what outlines near-white atoms', () => {
    const luminance = (hex: string) => {
      const v = [1, 3, 5]
        .map((i) => parseInt(hex.substr(i, 2), 16) / 255)
        .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
      return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]
    }
    expect(luminance(SCENE.light.rim)).toBeLessThan(0.1)
    // And thicker than in dark mode, where the canvas supplies the contrast.
    expect(SCENE.light.rimScale).toBeGreaterThan(SCENE.dark.rimScale)
  })

  it('makes colourless gases more opaque on light, or they vanish', () => {
    expect(SCENE.light.translucentOpacity).toBeGreaterThan(SCENE.dark.translucentOpacity)
  })

  it('gives metals an environment to reflect in both themes', () => {
    // Without this a metalness-0.85 material renders near-black: it reflects its
    // surroundings and there are none. Silvery sodium looked like coal.
    expect(SCENE.dark.envIntensity).toBeGreaterThan(0)
    expect(SCENE.light.envIntensity).toBeGreaterThan(0)
  })
})

describe('atom legibility', () => {
  it('measures contrast the WCAG way', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 0)
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 3)
  })

  it('leaves a well-contrasted atom at the base outline', () => {
    // Carbon is near-black on the light canvas: 13.5:1, nothing to fix.
    expect(rimScaleFor('#26262b', SCENE.light)).toBe(SCENE.light.rimScale)
    // Sulfur's yellow is fine on dark.
    expect(rimScaleFor('#e8d44d', SCENE.dark)).toBe(SCENE.dark.rimScale)
  })

  it('thickens the outline for near-white atoms on the light canvas', () => {
    // Hydrogen sits at about 1.07:1 against the light canvas.
    const h = rimScaleFor('#f6e7ec', SCENE.light)
    expect(h).toBeGreaterThan(SCENE.light.rimScale)
    expect(h).toBeGreaterThan(rimScaleFor('#26262b', SCENE.light))
  })

  it('thickens the outline for near-black atoms on the dark canvas', () => {
    // The same rule protects carbon on dark, which is the mirror case.
    expect(rimScaleFor('#26262b', SCENE.dark)).toBeGreaterThan(SCENE.dark.rimScale)
  })

  it('never runs away — the boost is bounded', () => {
    for (const theme of [SCENE.light, SCENE.dark]) {
      for (const colour of ['#ffffff', '#000000', '#808080', '#f6e7ec']) {
        const scale = rimScaleFor(colour, theme)
        expect(scale).toBeGreaterThanOrEqual(theme.rimScale)
        expect(scale).toBeLessThan(theme.rimScale + 0.08)
      }
    }
  })
})

describe('reaction effects', () => {
  it('every reaction declares an effect the renderer knows', () => {
    for (const r of REACTIONS) {
      expect(BURSTS[r.effect], `${r.id} -> ${r.effect}`).toBeDefined()
    }
  })

  it('effects match the kind of reaction they describe', () => {
    // Spot-checks tying the classification back to the authored observable.
    const effectOf = (id: string) => REACTIONS.find((r) => r.id === id)?.effect
    expect(effectOf('magnesium-burning')).toBe('flame')
    expect(effectOf('hydrogen-chlorine')).toBe('flash')
    expect(effectOf('silver-chloride-precipitate')).toBe('precipitate')
    expect(effectOf('carbonate-acid')).toBe('bubbles')
    expect(effectOf('ammonia-hydrochloric')).toBe('smoke')
    expect(effectOf('neutralisation-naoh-hcl')).toBe('warmth')
    // "a dull red glow with NO bright flame" — the word 'flame' is a red herring.
    expect(effectOf('carbon-incomplete')).toBe('glow')
    // "decolourise bromine water" describes a later test, not this reaction.
    expect(effectOf('ethene-hydrogenation')).toBe('warmth')
  })

  it('every combustion reaction looks like combustion', () => {
    for (const r of REACTIONS.filter((x) => x.type === 'combustion')) {
      expect(['flame', 'flash', 'glow'], `${r.id}`).toContain(r.effect)
    }
  })

  it('every precipitation reaction draws a precipitate', () => {
    for (const r of REACTIONS.filter((x) => x.type === 'precipitation')) {
      expect(['precipitate', 'colour-change'], `${r.id}`).toContain(r.effect)
    }
  })

  it('burst specs are physically sensible', () => {
    for (const [name, spec] of Object.entries(BURSTS)) {
      expect(spec.count, name).toBeGreaterThan(0)
      expect(spec.life, name).toBeGreaterThan(0.2)
      expect(spec.life, name).toBeLessThan(4)
      expect(spec.opacity, name).toBeGreaterThan(0)
      expect(spec.opacity, name).toBeLessThanOrEqual(1)
    }
    // A precipitate falls; bubbles and smoke rise.
    expect(BURSTS.precipitate.gravity).toBeGreaterThan(0)
    expect(BURSTS.bubbles.gravity).toBeLessThan(0)
    expect(BURSTS.smoke.gravity).toBeLessThan(0)
    // A flash is the shortest thing on screen.
    expect(BURSTS.flash.life).toBeLessThan(BURSTS.flame.life)
  })
})
