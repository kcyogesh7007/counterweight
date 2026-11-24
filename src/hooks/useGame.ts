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

import { useEffect, useRef, useState } from 'react'
import {
  createInitialState,
  createResumedState,
  createSolvedState,
  dropWeight,
  elapsedMs,
  progressSnapshot,
  resetBoard,
  takeHint,
  selectWeight,
  tapHook,
  type DragSource,
  type GameState,
  type SavedProgress,
} from '../game/moves.ts'
import type { Puzzle } from '../game/types.ts'

type Options = {
  /** If this puzzle was already solved before, its result: the game starts solved. */
  earlierResult?: { elapsed: number; rehangs: number; hints?: number } | null
  /** A half-finished game saved earlier: the game carries on from it. */
  resumeFrom?: SavedProgress | null
  /** Called about once a second (and after every move) with what to save. */
  onProgress?: (progress: SavedProgress) => void
}

/** @param puzzle the puzzle being played */
export function useGame(puzzle: Puzzle, { earlierResult, resumeFrom, onProgress }: Options = {}) {
  // Pick the starting state once: solved before? half-finished? or fresh.
  const [state, setState] = useState<GameState>(() => {
    if (earlierResult) return createSolvedState(puzzle, earlierResult)
    if (resumeFrom) return createResumedState(puzzle, resumeFrom, Date.now())
    return createInitialState()
  })
  const [now, setNow] = useState(() => Date.now())

  const isRunning = state.startedAt !== null && state.solvedAt === null

  // While the timer runs, update `now` every second (to redraw the clock).
  // The returned function stops the ticking when it's no longer needed.
  useEffect(() => {
    if (!isRunning) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [isRunning])

  // Save the game in progress: after every move and every clock tick, and
  // once more if the page is being closed or hidden (so no time is lost).
  // A "ref" holds the latest callback without re-running the effects.
  const onProgressRef = useRef(onProgress)
  useEffect(() => {
    onProgressRef.current = onProgress
  })
  useEffect(() => {
    const snapshot = progressSnapshot(state, Date.now())
    if (snapshot) onProgressRef.current?.(snapshot)
  }, [state, now])
  useEffect(() => {
    function saveNow() {
      const snapshot = progressSnapshot(state, Date.now())
      if (snapshot) onProgressRef.current?.(snapshot)
    }
    window.addEventListener('pagehide', saveNow)
    document.addEventListener('visibilitychange', saveNow)
    return () => {
      window.removeEventListener('pagehide', saveNow)
      document.removeEventListener('visibilitychange', saveNow)
    }
  }, [state])

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
    /** Player pressed the hint button (counts it; which hint to show is decided in GameScreen). */
    onTakeHint: () => {
      const t = Date.now()
      setNow(t)
      setState((s) => takeHint(s, t))
    },
  }
}
