// PracticePuzzle.tsx — one Practice puzzle, made from a difficulty + seed.
// After solving: your time and re-hangs, then "Next puzzle" (a fresh one at
// the same difficulty) or "Change difficulty" (back to the picker).

import { useMemo } from 'react'
import { makePracticePuzzle, type PracticeDifficulty } from '../game/practice.ts'
import { addPracticeSolve } from '../storage.ts'
import { GameScreen } from './GameScreen.tsx'

type Props = {
  difficulty: PracticeDifficulty
  seed: number
  onNext: () => void
  onChangeDifficulty: () => void
}

export function PracticePuzzle({ difficulty, seed, onNext, onChangeDifficulty }: Props) {
  // Making a puzzle takes a few milliseconds; only do it when the seed changes.
  const puzzle = useMemo(() => makePracticePuzzle(difficulty, seed), [difficulty, seed])

  return (
    <GameScreen
      key={puzzle.id}
      puzzle={puzzle}
      subtitle={
        <p className="difficulty">{puzzle.weights.length} weights</p>
      }
      isTutorial={false}
      onSolved={() => addPracticeSolve(difficulty)}
      winButtonLabel="Next puzzle"
      onWinButton={onNext}
      winExtra={
        <div className="win-links">
          <button type="button" className="link-button" onClick={onChangeDifficulty}>
            Change difficulty
          </button>
        </div>
      }
    />
  )
}
