import type { Activation } from '../data/reactions'

/**
 * Animated glyph for the energy a reaction needs before it will go.
 *
 * These are inline SVG with CSS animation rather than an icon font or a
 * library, to keep the app free of runtime network fetches.
 */
export function ActivationIcon({ activation }: { activation: Activation }) {
  return (
    <span className={`act-icon act-${activation}`} aria-hidden="true">
      {activation === 'spark' && (
        <svg viewBox="0 0 40 40">
          <g className="act-burst">
            {[0, 60, 120, 180, 240, 300].map((angle) => (
              <line
                key={angle}
                x1="20"
                y1="20"
                x2="20"
                y2="5"
                transform={`rotate(${angle} 20 20)`}
                strokeLinecap="round"
              />
            ))}
          </g>
          <path className="act-bolt" d="M22 6 L11 22 h7 l-2 12 13-18 h-8 z" />
        </svg>
      )}

      {activation === 'heat' && (
        <svg viewBox="0 0 40 40">
          <path
            className="act-flame-outer"
            d="M20 4c3 6 8 8 8 14a8 8 0 1 1-16 0c0-3 1.5-5 3-6.5 0 2.5 1.6 3.5 2.6 3.5C19 10 15.5 8 20 4z"
          />
          <path
            className="act-flame-inner"
            d="M20 18c1.6 2.6 3.4 3.6 3.4 6.4a3.6 3.6 0 1 1-7.2 0c0-2 1.3-3.2 2.2-4 0 1.2.8 1.7 1.3 1.7-.5-1.9-1.3-2.6.3-4.1z"
          />
        </svg>
      )}

      {activation === 'electricity' && (
        <svg viewBox="0 0 40 40">
          <line className="act-plate" x1="8" y1="10" x2="8" y2="30" strokeLinecap="round" />
          <line className="act-plate" x1="32" y1="10" x2="32" y2="30" strokeLinecap="round" />
          <path className="act-arc" d="M9 20 L16 14 L14 21 L22 15 L20 23 L27 18 L31 20" />
        </svg>
      )}

      {activation === 'light' && (
        <svg viewBox="0 0 40 40">
          <g className="act-rays">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
              <line
                key={angle}
                x1="20"
                y1="4"
                x2="20"
                y2="10"
                transform={`rotate(${angle} 20 20)`}
                strokeLinecap="round"
              />
            ))}
          </g>
          <circle className="act-sun" cx="20" cy="20" r="7" />
        </svg>
      )}

      {activation === 'spontaneous' && (
        <svg viewBox="0 0 40 40">
          <g className="act-converge">
            <path d="M6 20 h9 m-4 -4 l4 4 l-4 4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M34 20 h-9 m4 -4 l-4 4 l4 4" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <circle className="act-sun" cx="20" cy="20" r="3.2" />
        </svg>
      )}
    </span>
  )
}
