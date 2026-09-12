import { useMemo, useState } from 'react'
import { Workspace } from './scene/Workspace'
import { Palette } from './ui/Palette'
import { InfoPanel } from './ui/InfoPanel'
import { ReactionLog } from './ui/ReactionLog'
import { useSandboxStore, inspectGroups } from './state/useSandboxStore'
import { ACTIVATION_LABEL, ACTIVATION_ACTION } from './data/reactions'
import { SPECIES } from './data/species'
import { ActivationIcon } from './ui/ActivationIcon'
import { useDemoTour } from './ui/useDemoTour'
import { useTheme } from './ui/useTheme'
import { ThemeToggle } from './ui/ThemeToggle'
import { AccentPicker } from './ui/AccentPicker'

export function App() {
  const entities = useSandboxStore((s) => s.entities)
  const trigger = useSandboxStore((s) => s.trigger)
  const clear = useSandboxStore((s) => s.clear)
  const [explainOpen, setExplainOpen] = useState(false)
  const demoCaption = useDemoTour()
  const { theme, toggle, accent, setAccent } = useTheme()

  const { pending, nearMiss } = useMemo(() => inspectGroups(entities), [entities])

  return (
    <div className="app">
      <header className="topbar">
        <h1>
          Che<span className="brand-accent">Mystery</span>
        </h1>
        <p>
          An interactive chemistry bench. Drop elements and compounds into the workspace, push
          them together, and supply the energy a real reaction would need.
        </p>
        <AccentPicker accent={accent} onChange={setAccent} />
        <ThemeToggle theme={theme} onToggle={toggle} />
      </header>

      <div className="workbench">
      <aside className="sidebar left">
        <Palette />
        {entities.length > 0 && (
          <button className="ghost wide shrink-none" onClick={clear}>
            Clear workspace
          </button>
        )}
      </aside>

      <main className="stage">
        <Workspace pending={pending} theme={theme} accent={accent} />

        {entities.length === 0 && !demoCaption && (
          <div className="empty">
            <p>
              Pick something from the palette to begin. Try two <strong>H₂</strong> and one{' '}
              <strong>O₂</strong>.
            </p>
          </div>
        )}

        {demoCaption && (
          <div className="demo-banner">
            <span className="demo-tag">Demo</span>
            <p>{demoCaption}</p>
            <span className="demo-hint">click anywhere to take over</span>
          </div>
        )}

        {!pending && nearMiss && (
          <div className="prompt near-miss">
            <div className="prompt-body">
              <code>{nearMiss.reaction.equation}</code>
              <p className="activation muted">Almost — not enough to react yet</p>
              <p className="detail">
                Add{' '}
                {Object.entries(nearMiss.missing)
                  .map(([id, n]) => `${n} more ${SPECIES[id].formula}`)
                  .join(' and ')}
                .
              </p>
            </div>
          </div>
        )}

        {pending && (
          <div className="prompt">
            <div className="prompt-body">
              <code>{pending.reaction.equation}</code>
              <div className="act-row">
                <ActivationIcon activation={pending.reaction.activation} />
                <div className="act-text">
                  <p className="activation">{ACTIVATION_LABEL[pending.reaction.activation]}</p>
                  <p className="detail">
                    {pending.reaction.activation === 'spontaneous'
                      ? pending.reaction.observable
                      : 'These are mixed but nothing is happening yet — the reaction needs energy to start.'}
                  </p>
                </div>
              </div>
              {explainOpen && <p className="explain">{pending.reaction.explanation}</p>}
              <div className="prompt-actions">
                <button className="primary" onClick={() => trigger(pending)}>
                  <ActivationIcon activation={pending.reaction.activation} />
                  {ACTIVATION_ACTION[pending.reaction.activation]}
                </button>
                <button className="ghost" onClick={() => setExplainOpen((v) => !v)}>
                  {explainOpen ? 'Hide' : 'Why?'}
                </button>
              </div>
            </div>
          </div>
        )}

        <footer className="disclaimer">
          <p>
            Space-filling model. Spheres are drawn at van der Waals radii — real molecules are
            constantly vibrating, and atoms have no hard surface.
          </p>
          <a
            className="repo-link"
            href="https://github.com/D33ptar00p/chemystery"
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Source code on GitHub"
            title="Source code on GitHub"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </a>
        </footer>
      </main>

      <aside className="sidebar right">
        <InfoPanel />
        <ReactionLog />
        {entities.length > 0 && (
          <div className="panel counts">
            <h2>On the bench</h2>
            <ul>
              {Object.entries(
                entities.reduce<Record<string, number>>((acc, e) => {
                  acc[e.speciesId] = (acc[e.speciesId] ?? 0) + 1
                  return acc
                }, {}),
              ).map(([id, n]) => (
                <li key={id}>
                  <code>{SPECIES[id].formula}</code> × {n}
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
      </div>
    </div>
  )
}
