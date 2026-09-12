import { ACCENTS, type AccentId } from './designs'

/**
 * Flame colour for the interface accent.
 *
 * The accent marks activation energy — the selection ring, the activation
 * label, the button that supplies the spark — so the options are real flame-test
 * emission colours rather than arbitrary hues.
 */
export function AccentPicker({
  accent,
  onChange,
}: {
  accent: AccentId
  onChange: (id: AccentId) => void
}) {
  const current = ACCENTS.find((a) => a.id === accent)

  return (
    <label className="select accent-picker" title={current?.note}>
      <span className="accent-dot" style={{ background: current?.swatch }} aria-hidden="true" />
      <select
        value={accent}
        onChange={(e) => onChange(e.target.value as AccentId)}
        aria-label="Flame colour"
      >
        {ACCENTS.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
    </label>
  )
}
