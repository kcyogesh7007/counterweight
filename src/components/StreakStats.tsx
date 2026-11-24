// StreakStats.tsx — "Current streak 3 · Best streak 5" on the win card.

import { dayNumber } from '../game/daily.ts'
import { computeStreaks } from '../game/streaks.ts'
import { onTimeSolvedDays } from '../storage.ts'
import './StreakStats.css'

/** @param day the puzzle just solved (it counts even if saving was blocked) */
export function StreakStats({ day }: { day: number }) {
  // Only puzzles solved on their own day count (not ones played late from Past puzzles).
  const { current, best } = computeStreaks([...onTimeSolvedDays(), day], dayNumber(new Date()))

  return (
    <dl className="streaks">
      <div>
        <dt>Current streak</dt>
        <dd>{current}</dd>
      </div>
      <div>
        <dt>Best streak</dt>
        <dd>{best}</dd>
      </div>
    </dl>
  )
}
