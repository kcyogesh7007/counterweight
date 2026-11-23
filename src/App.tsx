// App.tsx — the top-level component. Decides WHICH screen to show.
//
// Counterweight is a DAILY puzzle: everyone gets the same puzzle each day,
// numbered from #1 (23 Nov 2026). A new one appears at local midnight.
//
// Flow:  first visit -> How to play 1 -> How to play 2 -> today's puzzle
// After solving, you see your result, your streaks, and a countdown to
// tomorrow's puzzle.
// If you come back the same day, you see your result again (no re-tries).
//
// What the browser remembers (see storage.ts): whether the tutorial is
// done, and your result for each day you solved.

import { useState } from 'react'
import { GameScreen } from './components/GameScreen.tsx'
import { NextPuzzleCountdown } from './components/NextPuzzleCountdown.tsx'
import { StreakStats } from './components/StreakStats.tsx'
import { dayNumber, formatShortDate, puzzleForDay } from './game/daily.ts'
import { DAILY_PUZZLES, TUTORIAL_PUZZLES } from './game/puzzles.ts'
import { hasSeenTutorial, loadResult, markTutorialSeen, saveResult } from './storage.ts'

/** Which screen is showing: a tutorial step, or the daily puzzle. */
type Screen = { kind: 'tutorial'; step: number } | { kind: 'daily' }

function App() {
  const [screen, setScreen] = useState<Screen>(() => (hasSeenTutorial() ? { kind: 'daily' } : { kind: 'tutorial', step: 0 }))
  // Today's puzzle number. Worked out when the game opens; the countdown's
  // "Play #N" button moves it on after midnight.
  const [day, setDay] = useState(() => dayNumber(new Date()))

  function finishTutorial() {
    markTutorialSeen()
    setScreen({ kind: 'daily' })
  }

  const isTutorial = screen.kind === 'tutorial'

  return (
    <main className="app">
      <header className="app-header">
        <div>
          <h1 className="app-title">Counterweight</h1>
          <p className="app-subtitle">Hang every weight so every bar balances.</p>
        </div>
        {isTutorial ? (
          <button type="button" className="link-button" onClick={finishTutorial}>
            Skip
          </button>
        ) : (
          <button type="button" className="link-button" onClick={() => setScreen({ kind: 'tutorial', step: 0 })}>
            How to play
          </button>
        )}
      </header>

      {screen.kind === 'tutorial' ? (
        <TutorialStep step={screen.step} onNext={(next) => setScreen({ kind: 'tutorial', step: next })} onDone={finishTutorial} />
      ) : (
        <DailyPuzzle day={day} onPlayNextDay={() => setDay(dayNumber(new Date()))} />
      )}
    </main>
  )
}

/** One tutorial step. The last step's button leads to today's puzzle. */
function TutorialStep({ step, onNext, onDone }: { step: number; onNext: (next: number) => void; onDone: () => void }) {
  const isLast = step === TUTORIAL_PUZZLES.length - 1
  const puzzle = TUTORIAL_PUZZLES[step]
  return (
    <GameScreen
      key={puzzle.id}
      puzzle={puzzle}
      isTutorial
      winButtonLabel={isLast ? "Play today's puzzle" : 'Next'}
      onWinButton={isLast ? onDone : () => onNext(step + 1)}
    />
  )
}

/** The puzzle for one day, e.g. "#1 · Mon 23 Nov". */
function DailyPuzzle({ day, onPlayNextDay }: { day: number; onPlayNextDay: () => void }) {
  const base = puzzleForDay(day, DAILY_PUZZLES)
  // The calendar date of this day number (day #1 = 23 Nov 2026).
  const date = new Date(2026, 10, 23 + (day - 1))
  const puzzle = { ...base, id: `day-${day}`, title: `#${day} · ${formatShortDate(date)}` }

  return (
    <GameScreen
      key={puzzle.id}
      puzzle={puzzle}
      isTutorial={false}
      earlierResult={loadResult(day)}
      onSolved={(result) => saveResult(day, result)}
      winExtra={
        <>
          <StreakStats day={day} />
          <NextPuzzleCountdown nextDay={day + 1} onPlayNext={onPlayNextDay} />
        </>
      }
    />
  )
}

export default App
