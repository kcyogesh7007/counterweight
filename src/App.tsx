// App.tsx — the top-level component. Decides WHICH screen to show.
//
// Screens:
//   home      the starting page: today's puzzle + other ways to play
//   daily     today's puzzle (everyone gets the same one; new at local midnight)
//   tutorial  "How to play", 2 small puzzles
//   levels    the level map (60 levels, stars)
//   level     playing one level
//
// Flow:
//   first visit:  How to play 1 -> How to play 2 -> today's puzzle
//   later visits: home -> today's puzzle (or another mode)
// The ← button (and the phone's own back gesture) returns to the previous
// screen; see hooks/useScreens.ts.
//
// What the browser remembers (see storage.ts): whether the tutorial is
// done, your result for each day you solved, and today's half-finished puzzle.

import { useState } from 'react'
import { DailyPuzzle } from './components/DailyPuzzle.tsx'
import { GameScreen } from './components/GameScreen.tsx'
import { HomeScreen } from './components/HomeScreen.tsx'
import { BackIcon, Logo } from './components/Icons.tsx'
import { LevelPuzzle } from './components/LevelPuzzle.tsx'
import { LevelsScreen } from './components/LevelsScreen.tsx'
import { dayNumber } from './game/daily.ts'
import { isUnlocked } from './game/levels.ts'
import { LEVEL_PUZZLES, TUTORIAL_PUZZLES } from './game/puzzles.ts'
import { useScreens } from './hooks/useScreens.ts'
import { hasSeenTutorial, loadLevelStars, markTutorialSeen } from './storage.ts'

/** Every screen the game can show. */
type Screen =
  | { kind: 'home' }
  | { kind: 'daily' }
  | { kind: 'tutorial'; step: number }
  | { kind: 'levels' } // the level map
  | { kind: 'level'; level: number } // playing one level

const HOME: Screen = { kind: 'home' }

function App() {
  const screens = useScreens<Screen>(() => (hasSeenTutorial() ? HOME : { kind: 'tutorial', step: 0 }), HOME)
  const { go, replace, back } = screens
  // Safety net: a screen restored after a reload that no longer makes sense shows home.
  const screen = isKnownScreen(screens.screen) ? screens.screen : HOME
  // Today's puzzle number. Worked out when the game opens; the countdown's
  // "Play #N" button moves it on after midnight.
  const [day, setDay] = useState(() => dayNumber(new Date()))

  function finishTutorial() {
    markTutorialSeen()
    // Put home "behind" today's puzzle, so Back leads home (not out of the site).
    replace(HOME)
    go({ kind: 'daily' })
  }

  return (
    <main className="app">
      <header className="app-header">
        <div className="brand">
          {screen.kind !== 'home' && screen.kind !== 'tutorial' && (
            <button type="button" className="back-button" aria-label="Back" title="Back" onClick={back}>
              <BackIcon />
            </button>
          )}
          <Logo className="brand-logo" />
          <h1 className="app-title">Counterweight</h1>
        </div>
        {screen.kind === 'tutorial' ? (
          <button type="button" className="link-button" onClick={finishTutorial}>
            Skip
          </button>
        ) : (
          <button
            type="button"
            className="icon-button"
            aria-label="How to play"
            title="How to play"
            onClick={() => go({ kind: 'tutorial', step: 0 })}
          >
            ?
          </button>
        )}
      </header>

      {screen.kind === 'home' && (
        <HomeScreen day={day} onPlayDaily={() => go({ kind: 'daily' })} onOpenLevels={() => go({ kind: 'levels' })} />
      )}

      {screen.kind === 'levels' && <LevelsScreen onPlay={(level) => go({ kind: 'level', level })} />}

      {screen.kind === 'level' && (
        <LevelPuzzle
          key={screen.level}
          level={screen.level}
          // Next level replaces this one, so Back still leads to the map.
          onNextLevel={() => replace({ kind: 'level', level: screen.level + 1 })}
          onMap={back}
        />
      )}

      {screen.kind === 'daily' && (
        <DailyPuzzle day={day} onPlayNextDay={() => setDay(dayNumber(new Date()))} onHome={back} />
      )}

      {screen.kind === 'tutorial' && (
        <TutorialStep
          step={screen.step}
          // Moving between tutorial steps doesn't add history: Back leaves the tutorial.
          onNext={(next) => replace({ kind: 'tutorial', step: next })}
          onDone={finishTutorial}
        />
      )}
    </main>
  )
}

function isKnownScreen(screen: Screen): boolean {
  switch (screen.kind) {
    case 'home':
    case 'daily':
    case 'levels':
      return true
    case 'tutorial':
      return TUTORIAL_PUZZLES[screen.step] !== undefined
    case 'level':
      return LEVEL_PUZZLES[screen.level - 1] !== undefined && isUnlocked(screen.level, loadLevelStars())
    default:
      return false
  }
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

export default App
