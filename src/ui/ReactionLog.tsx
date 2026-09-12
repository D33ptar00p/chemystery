import { useSandboxStore } from '../state/useSandboxStore'

export function ReactionLog() {
  const log = useSandboxStore((s) => s.log)
  if (log.length === 0) return null

  return (
    <div className="panel log">
      <h2>What you&rsquo;ve made</h2>
      <ul>
        {log.map((entry) => (
          <li key={entry.id}>
            <code>{entry.equation}</code>
            <span>{entry.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
