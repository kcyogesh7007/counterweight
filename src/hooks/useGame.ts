// useGame.ts — connects the game rules (moves.ts) to React.
//
// A "custom hook" is just a function starting with "use" that bundles up
// some React state. Components call useGame() and get back the current
// state plus simple functions to call when the player taps something.
//
// React's useState keeps a value between redraws. When we call setState
// with a new value, React redraws the screen with it.
//
// useEffect runs code AFTER React draws. We use it to start a 1-second
// "tick" while the timer is running, so the clock on screen updates.

import { useEffect, useState } from 'react'
import {
  createInitialState,
  createSolvedState,
  dropWeight,
  elapsedMs,
  resetBoard,
  selectWeight,
  tapHook,
  type DragSource,
  type GameState,
} from '../game/moves.ts'
import type { Puzzle } from '../game/types.ts'

/**
 * @param puzzle        the puzzle being played
 * @param earlierResult if this puzzle was already solved before, its result:
 *                      the game then starts solved, showing that result
 */
export function useGame(puzzle: Puzzle, earlierResult?: { elapsed: number; rehangs: number } | null) {
  const [state, setState] = useState<GameState>(() =>
    earlierResult ? createSolvedState(puzzle, earlierResult) : createInitialState(),
  )
  const [now, setNow] = useState(() => Date.now())

  const isRunning = state.startedAt !== null && state.solvedAt === null

  // While the timer runs, update `now` every second (to redraw the clock).
  // The returned function stops the ticking when it's no longer needed.
  useEffect(() => {
    if (!isRunning) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [isRunning])

  return {
    ...state,
    isSolved: state.solvedAt !== null,
    elapsed: elapsedMs(state, now),
    /** Player tapped a weight in the tray. */
    onWeightTap: (weight: number) => {
      const t = Date.now()
      setNow(t)
      setState((s) => selectWeight(s, weight, t))
    },
    /** Player tapped a hook on the mobile. */
    onHookTap: (hookId: string) => {
      const t = Date.now()
      setNow(t)
      setState((s) => tapHook(s, hookId, puzzle, t))
    },
    /** Player dragged a weight and let go over a hook (or over nothing: null). */
    onDrop: (weight: number, from: DragSource, toHookId: string | null) => {
      const t = Date.now()
      setNow(t)
      setState((s) => dropWeight(s, weight, from, toHookId, puzzle, t))
    },
    /** Player pressed Reset. */
    onReset: () => setState((s) => resetBoard(s)),
  }
}
