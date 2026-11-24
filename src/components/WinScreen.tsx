// WinScreen.tsx — shown in place of the tray once every bar balances.
// Used for the daily puzzle (time + re-hangs + countdown) and for tutorial
// steps (an explanation and a "Next" button).

import { useEffect, useRef, type ReactNode } from 'react'
import { formatTime } from '../game/moves.ts'
import './WinScreen.css'

type WinScreenProps = {
  /** Line under "Balanced!". */
  message?: string
  /** Time and re-hangs to show. Leave out for tutorial steps. */
  stats?: { elapsed: number; rehangs: number; hints?: number }
  /** Text on the button, e.g. "Next". Leave out for no button. */
  buttonLabel?: string
  onButton?: () => void
  /** Anything extra to show at the bottom (e.g. the countdown to tomorrow). */
  children?: ReactNode
}

export function WinScreen({ message, stats, buttonLabel, onButton, children }: WinScreenProps) {
  // Move keyboard / screen-reader focus to the heading when the screen appears,
  // so the win is announced. useRef gives us a handle on the real HTML element.
  // Also scroll the whole card into view, so its buttons are visible on short phones.
  const headingRef = useRef<HTMLHeadingElement>(null)
  const cardRef = useRef<HTMLElement>(null)
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
    cardRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [])

  return (
    <section ref={cardRef} className="card win" aria-labelledby="win-title">
      <h2 id="win-title" className="win-title" ref={headingRef} tabIndex={-1}>
        Balanced!
      </h2>
      {message && <p className="win-subtitle">{message}</p>}

      {stats && (
        <dl className="win-stats">
          <div>
            <dt>Time</dt>
            <dd>{formatTime(stats.elapsed)}</dd>
          </div>
          <div>
            <dt>Re-hangs</dt>
            <dd>{stats.rehangs}</dd>
          </div>
        </dl>
      )}
      {stats?.hints ? <p className="win-hints">{stats.hints === 1 ? '1 hint used' : `${stats.hints} hints used`}</p> : null}

      {children}

      {buttonLabel && onButton && (
        <button type="button" className="button" onClick={onButton}>
          {buttonLabel}
        </button>
      )}
    </section>
  )
}
