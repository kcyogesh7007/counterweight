// DailyPuzzle.tsx — the puzzle for one day, e.g. "#1 · Mon 23 Nov".
// Loads and saves your progress and result for that day, and shows your
// streaks and the countdown to tomorrow once it's solved.

import { dailyDifficulty, dayDate, formatShortDate, puzzleForDay } from '../game/daily.ts'
import { DAILY_PUZZLES } from '../game/puzzles.ts'
import { clearInProgress, loadInProgress, loadResult, saveInProgress, saveResult } from '../storage.ts'
import { Difficulty } from './Difficulty.tsx'
import { GameScreen } from './GameScreen.tsx'
import { NextPuzzleCountdown } from './NextPuzzleCountdown.tsx'
import { StreakStats } from './StreakStats.tsx'

type Props = {
  day: number
  /** After midnight, the countdown's "Play #N" button. */
  onPlayNextDay: () => void
  /** "More puzzles" on the win card. */
  onHome: () => void
}

export function DailyPuzzle({ day, onPlayNextDay, onHome }: Props) {
  const base = puzzleForDay(day, DAILY_PUZZLES)
  const date = dayDate(day)
  const puzzle = { ...base, id: `day-${day}`, title: `#${day} · ${formatShortDate(date)}` }
  const weekday = date.toLocaleDateString('en-GB', { weekday: 'long' })

  return (
    <GameScreen
      key={puzzle.id}
      puzzle={puzzle}
      subtitle={<Difficulty level={dailyDifficulty(day)} label={weekday} />}
      isTutorial={false}
      earlierResult={loadResult(day)}
      // Half-finished? Carry on where you left off. Saved as you play.
      resumeFrom={loadInProgress(day)}
      onProgress={(progress) => saveInProgress({ day, ...progress })}
      onSolved={(result) => {
        saveResult(day, result)
        clearInProgress()
      }}
      winButtonLabel="More puzzles"
      onWinButton={onHome}
      winExtra={
        <>
          <StreakStats day={day} />
          <NextPuzzleCountdown nextDay={day + 1} onPlayNext={onPlayNextDay} />
        </>
      }
    />
  )
}
