// LevelPuzzle.tsx — playing one level, e.g. "Level 12".
//
// When you solve it you see your stars (0 re-hangs = ★★★), whether it's a
// new best, and buttons for the next level, replaying, or the level map.
// Your best stars are saved; replaying can only ever improve them.

import { useState } from 'react'
import { starsFor } from '../game/levels.ts'
import { LEVEL_PUZZLES } from '../game/puzzles.ts'
import { loadLevelStars, saveLevelStars } from '../storage.ts'
import { GameScreen } from './GameScreen.tsx'
import { Stars } from './Stars.tsx'

type Props = {
  level: number
  onNextLevel: () => void
  onMap: () => void
}

const MESSAGES = {
  3: 'Perfect: no re-hangs!',
  2: 'Great! Solve it with no re-hangs for ★★★.',
  1: 'Solved! Fewer re-hangs earn more stars.',
}

/** Stars for a solve: from re-hangs, but at most ★★ if a hint was used. */
function levelStars(result: { rehangs: number; hints?: number }): 1 | 2 | 3 {
  const stars = starsFor(result.rehangs)
  return result.hints ? (Math.min(stars, 2) as 1 | 2) : stars
}

export function LevelPuzzle({ level, onNextLevel, onMap }: Props) {
  // Your best BEFORE this attempt (so we can say "New best!").
  const [bestBefore, setBestBefore] = useState(() => loadLevelStars()[level] ?? 0)
  // Changing this number restarts the level (the Replay button).
  const [attempt, setAttempt] = useState(0)

  function replay() {
    setBestBefore(loadLevelStars()[level] ?? 0)
    setAttempt((a) => a + 1)
  }

  const base = LEVEL_PUZZLES[level - 1]
  const puzzle = { ...base, title: `Level ${level}` }
  const isLast = level === LEVEL_PUZZLES.length

  return (
    <GameScreen
      key={`level-${level}-${attempt}`}
      puzzle={puzzle}
      subtitle={
        <p className="difficulty level-subtitle">
          <span>{base.weights.length} weights</span>
          {bestBefore > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="visually-hidden">Best:</span>
              <Stars count={bestBefore} />
            </>
          )}
        </p>
      }
      isTutorial={false}
      hideWinMessage
      onSolved={(result) => saveLevelStars(level, levelStars(result))}
      winExtra={(result) => {
        const stars = levelStars(result)
        return (
          <>
            <Stars count={stars} size="large" animate />
            <p className="level-message">
              {result.hints ? 'A hint was used, so this solve is worth up to ★★.' : MESSAGES[stars]}
              {stars > bestBefore && bestBefore > 0 && <strong className="new-best"> New best!</strong>}
            </p>
            <button type="button" className="button" onClick={isLast ? onMap : onNextLevel}>
              {isLast ? 'All levels' : 'Next level'}
            </button>
            <div className="win-links">
              <button type="button" className="link-button" onClick={replay}>
                Replay
              </button>
              {!isLast && (
                <button type="button" className="link-button" onClick={onMap}>
                  All levels
                </button>
              )}
            </div>
          </>
        )
      }}
    />
  )
}
