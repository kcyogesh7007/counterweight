// Difficulty.tsx — "Monday ●○○○○○○": seven dots, filled up to the difficulty.

export function Difficulty({ level, label }: { level: number; label: string }) {
  return (
    <p className="difficulty" aria-label={`${label}: difficulty ${level} of 7`}>
      <span aria-hidden="true">{label}</span>
      <span className="difficulty-pips" aria-hidden="true">
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i} className={`difficulty-pip${i < level ? ' is-on' : ''}`} />
        ))}
      </span>
    </p>
  )
}
