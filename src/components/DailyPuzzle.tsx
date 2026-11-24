// DailyPuzzle.tsx — the puzzle for one day, e.g. "#1 · Mon 23 Nov".
//
// Two ways to play it:
//   today  (from home)          progress is saved as you play, and once solved
//                               you see your streaks and the countdown to tomorrow.
//   past   (from Past puzzles)  an earlier day's puzzle. The result is saved but
//                               marked "late", so it never changes your streak.
//                               Half-finished past puzzles aren't saved (so they
//                               can't overwrite today's saved progress).

import { dailyDifficulty, dayDate, formatShortDate, puzzleForDay } from '../game/daily.ts'
import { DAILY_PUZZLES } from '../game/puzzles.ts'
import { clearInProgress, loadInProgress, loadResult, saveInProgress, saveResult } from '../storage.ts'
import { Difficulty } from './Difficulty.tsx'
import { GameScreen } from './GameScreen.tsx'
import { NextPuzzleCountdown } from './NextPuzzleCountdown.tsx'
import { StreakStats } from './StreakStats.tsx'

type Props = {
  day: number
  mode: 'today' | 'past'
  /** Today only: after midnight, the countdown's "Play #N" button. */
  onPlayNextDay?: () => void
  /** The win card's button: "More puzzles" (today) or "More past puzzles" (past). */
  onDone: () => void
}

export function DailyPuzzle({ day, mode, onPlayNextDay, onDone }: Props) {
  const base = puzzleForDay(day, DAILY_PUZZLES)
  const date = dayDate(day)
  const puzzle = { ...base, id: `day-${day}`, title: `#${day} · ${formatShortDate(date)}` }
  const weekday = date.toLocaleDateString('en-GB', { weekday: 'long' })
  const isToday = mode === 'today'
  const earlier = loadResult(day)

  return (
    <GameScreen
      key={puzzle.id}
      puzzle={puzzle}
      subtitle={<Difficulty level={dailyDifficulty(day)} label={isToday ? weekday : `${weekday} · past puzzle`} />}
      isTutorial={false}
      earlierResult={earlier}
      // Today only: carry on where you left off, saved as you play.
      resumeFrom={isToday ? loadInProgress(day) : null}
      onProgress={isToday ? (progress) => saveInProgress({ day, ...progress }) : undefined}
      onSolved={(result) => {
        saveResult(day, { ...result, late: !isToday })
        if (isToday) clearInProgress()
      }}
      winButtonLabel={isToday ? 'More puzzles' : 'More past puzzles'}
      onWinButton={onDone}
      winExtra={
        isToday ? (
          <>
            <StreakStats day={day} />
            <NextPuzzleCountdown nextDay={day + 1} onPlayNext={onPlayNextDay ?? onDone} />
          </>
        ) : (
          <p className="win-subtitle">
            {earlier && !earlier.late
              ? 'You solved this one on its day.'
              : "Played late, so it doesn't change your streak."}
          </p>
        )
      }
    />
  )
}
