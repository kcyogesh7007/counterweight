// App.tsx — the top-level component. Decides WHICH screen to show.
//
// Screens:
//   home      the starting page: today's puzzle + other ways to play
//   daily     today's puzzle (everyone gets the same one; new at local midnight)
//   tutorialIntro  "How to play" picture cards (3 short cards)
//   tutorial  then 3 small practice puzzles, with a live balance meter
//   levels    the level map (60 levels, stars)
//   level     playing one level
//   practice  choose Easy / Medium / Hard, then endless puzzles made on the spot
//   archive   past daily puzzles (playing them late never changes your streak)
//
// Flow:
//   every visit opens on home. How to play opens from the "?" button (and,
//   until it's been seen once, a "New here?" link on home); it ends back on home.
// The ← button (and the phone's own back gesture) returns to the previous
// screen; see hooks/useScreens.ts.
//
// What the browser remembers (see storage.ts): whether the tutorial is
// done, your result for each day you solved, and today's half-finished puzzle.

import { useState } from 'react'
import { countEvent } from './analytics.ts'
import { DailyPuzzle } from './components/DailyPuzzle.tsx'
import { GameScreen } from './components/GameScreen.tsx'
import { HomeScreen } from './components/HomeScreen.tsx'
import { ArchiveScreen } from './components/ArchiveScreen.tsx'
import { BackIcon, Logo, SoundOffIcon, SoundOnIcon } from './components/Icons.tsx'
import { LevelPuzzle } from './components/LevelPuzzle.tsx'
import { LevelsScreen } from './components/LevelsScreen.tsx'
import { PracticePuzzle } from './components/PracticePuzzle.tsx'
import { PracticeScreen } from './components/PracticeScreen.tsx'
import { TutorialIntro } from './components/TutorialIntro.tsx'
import { dayNumber } from './game/daily.ts'
import { isUnlocked } from './game/levels.ts'
import { newSeed, PRACTICE_DIFFICULTIES, type PracticeDifficulty } from './game/practice.ts'
import { LEVEL_PUZZLES, TUTORIAL_PUZZLES } from './game/puzzles.ts'
import { useScreens } from './hooks/useScreens.ts'
import { isSoundOn, playSound, setSoundOn } from './sound.ts'
import { hasSeenTutorial, loadLevelStars, markTutorialSeen } from './storage.ts'

/** Every screen the game can show. */
type Screen =
  | { kind: 'home' }
  | { kind: 'daily' }
  | { kind: 'tutorialIntro' } // "How to play" picture cards
  | { kind: 'tutorial'; step: number }
  | { kind: 'levels' } // the level map
  | { kind: 'level'; level: number } // playing one level
  | { kind: 'practice' } // choose a Practice difficulty
  | { kind: 'practicePuzzle'; difficulty: PracticeDifficulty; seed: number } // one Practice puzzle
  | { kind: 'archive' } // the list of past daily puzzles
  | { kind: 'archiveDay'; day: number } // playing one past daily puzzle

const HOME: Screen = { kind: 'home' }

function App() {
  const screens = useScreens<Screen>(() => HOME, HOME)
  const { go, replace, back } = screens
  // Safety net: a screen restored after a reload that no longer makes sense shows home.
  const screen = isKnownScreen(screens.screen) ? screens.screen : HOME
  // Today's puzzle number. Worked out when the game opens; the countdown's
  // "Play #N" button moves it on after midnight.
  const [day, setDay] = useState(() => dayNumber(new Date()))
  const [soundOn, setSoundOnState] = useState(isSoundOn)

  function toggleSound() {
    setSoundOn(!soundOn)
    setSoundOnState(!soundOn)
    if (!soundOn) playSound('pick') // a little "yes, sound is on"
  }

  const inTutorial = screen.kind === 'tutorial' || screen.kind === 'tutorialIntro'

  /** Finishing or skipping How to play: remember it, and return to home. */
  function finishTutorial() {
    markTutorialSeen()
    back()
  }

  return (
    <main className="app">
      <header className="app-header">
        <div className="brand">
          {screen.kind !== 'home' && !inTutorial && (
            <button type="button" className="back-button" aria-label="Back" title="Back" onClick={back}>
              <BackIcon />
            </button>
          )}
          <Logo className="brand-logo" />
          <h1 className="app-title">Counterweight</h1>
        </div>
        {inTutorial ? (
          <button type="button" className="link-button" onClick={finishTutorial}>
            Skip
          </button>
        ) : (
          <div className="header-actions">
            {/* Sound on/off lives on home (other screens need the room for ←) */}
            {screen.kind === 'home' && (
              <button
                type="button"
                className="icon-button"
                aria-label="Sound"
                aria-pressed={soundOn}
                title={soundOn ? 'Sound on' : 'Sound off'}
                onClick={toggleSound}
              >
                {soundOn ? <SoundOnIcon /> : <SoundOffIcon />}
              </button>
            )}
            <button
              type="button"
              className="icon-button"
              aria-label="How to play"
              title="How to play"
              onClick={() => go({ kind: 'tutorialIntro' })}
            >
              ?
            </button>
          </div>
        )}
      </header>

      {screen.kind === 'home' && (
        <HomeScreen
          day={day}
          onPlayDaily={() => go({ kind: 'daily' })}
          onOpenLevels={() => go({ kind: 'levels' })}
          onOpenPractice={() => go({ kind: 'practice' })}
          onOpenArchive={() => go({ kind: 'archive' })}
          // Until How to play has been seen once, home offers it with a small link
          onHowToPlay={hasSeenTutorial() ? undefined : () => go({ kind: 'tutorialIntro' })}
        />
      )}

      {screen.kind === 'levels' && <LevelsScreen onPlay={(level) => go({ kind: 'level', level })} />}

      {screen.kind === 'archive' && <ArchiveScreen today={day} onPlay={(pastDay) => go({ kind: 'archiveDay', day: pastDay })} />}

      {screen.kind === 'archiveDay' && <DailyPuzzle key={screen.day} day={screen.day} mode="past" onDone={back} />}

      {screen.kind === 'practice' && (
        <PracticeScreen onPlay={(difficulty) => go({ kind: 'practicePuzzle', difficulty, seed: newSeed() })} />
      )}

      {screen.kind === 'practicePuzzle' && (
        <PracticePuzzle
          difficulty={screen.difficulty}
          seed={screen.seed}
          // A new puzzle replaces this one, so Back still leads to the picker.
          onNext={() => replace({ kind: 'practicePuzzle', difficulty: screen.difficulty, seed: newSeed() })}
          onChangeDifficulty={back}
        />
      )}

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
        <DailyPuzzle day={day} mode="today" onPlayNextDay={() => setDay(dayNumber(new Date()))} onDone={back} />
      )}

      {screen.kind === 'tutorialIntro' && (
        // The cards lead into the practice puzzles (replacing, so Back leaves the tutorial).
        <TutorialIntro onDone={() => replace({ kind: 'tutorial', step: 0 })} />
      )}

      {screen.kind === 'tutorial' && (
        <TutorialStep
          step={screen.step}
          // Moving between tutorial steps doesn't add history: Back leaves the tutorial.
          onNext={(next) => replace({ kind: 'tutorial', step: next })}
          // Finishing the tutorial (not skipping it) is counted.
          onDone={() => {
            countEvent('tutorial-finished')
            finishTutorial()
          }}
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
    case 'practice':
    case 'archive':
    case 'tutorialIntro':
      return true
    case 'practicePuzzle':
      return PRACTICE_DIFFICULTIES.includes(screen.difficulty) && Number.isInteger(screen.seed)
    case 'archiveDay':
      // Only days before today (today's puzzle is played from home)
      return Number.isInteger(screen.day) && screen.day >= 1 && screen.day < dayNumber(new Date())
    case 'tutorial':
      return TUTORIAL_PUZZLES[screen.step] !== undefined
    case 'level':
      return LEVEL_PUZZLES[screen.level - 1] !== undefined && isUnlocked(screen.level, loadLevelStars())
    default:
      return false
  }
}

/** One tutorial step. The last step's button ends the tutorial (back to home). */
function TutorialStep({ step, onNext, onDone }: { step: number; onNext: (next: number) => void; onDone: () => void }) {
  const isLast = step === TUTORIAL_PUZZLES.length - 1
  const puzzle = TUTORIAL_PUZZLES[step]
  return (
    <GameScreen
      key={puzzle.id}
      puzzle={puzzle}
      isTutorial
      winButtonLabel={isLast ? 'Done' : 'Next'}
      onWinButton={isLast ? onDone : () => onNext(step + 1)}
    />
  )
}

export default App
