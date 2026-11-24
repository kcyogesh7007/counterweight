// Stars.tsx — a row of 3 stars, some filled: ★★☆
// `animate` makes them pop in one after another (used on the win card).

import './Stars.css'

type Props = {
  count: number
  /** How many stars to draw (3 normally; 1 for a single decorative star). */
  total?: number
  size?: 'small' | 'large'
  animate?: boolean
}

export function Stars({ count, total = 3, size = 'small', animate = false }: Props) {
  const label = total === 1 ? 'stars' : `${count} of ${total} stars`
  return (
    <span className={`stars stars-${size}${animate ? ' is-animated' : ''}`} role="img" aria-label={label}>
      {Array.from({ length: total }, (_, k) => k + 1).map((i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          className={`star${i <= count ? ' is-on' : ''}`}
          // Each star pops in a little after the one before, once the win card is up.
          style={animate ? { animationDelay: `calc(var(--tilt-duration) + ${300 + i * 180}ms)` } : undefined}
          aria-hidden="true"
        >
          <path d="M12 2.6l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8Z" />
        </svg>
      ))}
    </span>
  )
}
