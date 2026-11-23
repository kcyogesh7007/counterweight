// NextPuzzleCountdown.tsx — "Next puzzle in 7:42:09", ticking every second.
// When it reaches zero (midnight), it turns into a button to play the new puzzle.

import { useEffect, useState } from 'react'
import { formatCountdown, msUntilNextDay } from '../game/daily.ts'

type Props = {
  /** The number of the puzzle that comes next, e.g. 2. */
  nextDay: number
  /** The player tapped "Play #2". */
  onPlayNext: () => void
}

export function NextPuzzleCountdown({ nextDay, onPlayNext }: Props) {
  // When the countdown should hit zero. Worked out once, when this appears.
  const [deadline] = useState(() => Date.now() + msUntilNextDay(new Date()))
  const [now, setNow] = useState(() => Date.now())

  // Tick once a second until the deadline.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const msLeft = deadline - now

  if (msLeft <= 0) {
    return (
      <button type="button" className="button" onClick={onPlayNext}>
        Play #{nextDay}
      </button>
    )
  }

  return (
    <p className="countdown">
      Next puzzle in <strong>{formatCountdown(msLeft)}</strong>
    </p>
  )
}
