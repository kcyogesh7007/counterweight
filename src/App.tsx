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
import { Logo } from './components/Icons.tsx'
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
        <div className="brand">
          <Logo className="brand-logo" />
          <h1 className="app-title">Counterweight</h1>
        </div>
        {isTutorial ? (
          <button type="button" className="link-button" onClick={finishTutorial}>
            Skip
          </button>
        ) : (
          <button
            type="button"
            className="icon-button"
            aria-label="How to play"
            title="How to play"
            onClick={() => setScreen({ kind: 'tutorial', step: 0 })}
          >
            ?
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
  // Difficulty follows the weekday: Monday (1) is the easiest, Sunday (7) the hardest.
  const level = ((day - 1) % 7) + 1
  const weekday = date.toLocaleDateString('en-GB', { weekday: 'long' })

  return (
    <GameScreen
      key={puzzle.id}
      puzzle={puzzle}
      subtitle={<Difficulty level={level} label={weekday} />}
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

/** "Monday ●○○○○○○": seven dots, filled up to today's difficulty. */
function Difficulty({ level, label }: { level: number; label: string }) {
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

export default App
