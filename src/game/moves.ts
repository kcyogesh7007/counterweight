// moves.ts — what happens when the player taps something.
//
// Every function here takes the CURRENT game state and returns a NEW state.
// It never changes the old one. (React needs new objects to notice a change,
// and it also makes these functions easy to test.)
//
// Rules (from the design PDF + your decisions):
//   - Tap a weight in the tray      -> select it (tap it again to deselect).
//   - Tap an empty hook             -> hang the selected weight there.
//   - Tap a full hook, weight held  -> SWAP: new weight goes on, old one back to the tray.
//   - Tap a full hook, nothing held -> send that weight back to the tray.
//   - Every removal or swap counts as one RE-HANG. First placements don't count.
//   - The TIMER starts the first time the player picks up a weight.
//   - The moment every hook is full and every bar balances, the puzzle is
//     SOLVED: the timer stops and no more moves are allowed.
//
// About `now`: functions that need the time are GIVEN it (milliseconds, from
// Date.now()) instead of reading the clock themselves. In tests we can then
// pass simple made-up times like 1000 and 5000.

import { collectHooks, isSolved } from './balance.ts'
import type { Placement, Puzzle } from './types.ts'

export type GameState = {
  /** Which weight is on which hook. */
  placement: Placement
  /** The weight the player picked from the tray, or null if none. */
  selected: number | null
  /** How many times a hung weight was taken off or swapped. */
  rehangs: number
  /** When the player first picked up a weight (ms), or null if not started. */
  startedAt: number | null
  /** When the puzzle was solved (ms), or null if not solved yet. */
  solvedAt: number | null
}

export function createInitialState(): GameState {
  return { placement: {}, selected: null, rehangs: 0, startedAt: null, solvedAt: null }
}

/** A half-finished puzzle, as saved between visits. */
export type SavedProgress = {
  placement: Placement
  rehangs: number
  /** Milliseconds played so far. */
  elapsed: number
}

/** What to save right now for a puzzle in progress (null = nothing worth saving). */
export function progressSnapshot(state: GameState, now: number): SavedProgress | null {
  if (state.startedAt === null || state.solvedAt !== null) return null
  return { placement: { ...state.placement }, rehangs: state.rehangs, elapsed: elapsedMs(state, now) }
}

/**
 * Carry on a half-finished puzzle. The timer continues from the saved time:
 * we pretend the clock started `elapsed` ms before `now`.
 * The saved weights are checked against the puzzle first; anything odd
 * (unknown hooks, weights not in the tray, the same weight twice) means we
 * start fresh instead.
 */
export function createResumedState(puzzle: Puzzle, saved: SavedProgress, now: number): GameState {
  const hookIds = new Set(collectHooks(puzzle.root).map((h) => h.id))
  const entries = Object.entries(saved.placement)
  const weights = entries.map(([, w]) => w)
  const valid =
    entries.every(([hookId, w]) => hookIds.has(hookId) && puzzle.weights.includes(w)) &&
    new Set(weights).size === weights.length &&
    Number.isFinite(saved.elapsed) && saved.elapsed >= 0 &&
    Number.isInteger(saved.rehangs) && saved.rehangs >= 0
  if (!valid) return createInitialState()

  const placement = { ...saved.placement }
  const startedAt = now - saved.elapsed
  return {
    placement,
    selected: null,
    rehangs: saved.rehangs,
    startedAt,
    // (Can't normally happen, but if the saved weights already balance everything, it's solved.)
    solvedAt: isSolved(puzzle, placement) ? now : null,
  }
}

/**
 * A puzzle that was already solved earlier (e.g. you come back to today's
 * puzzle after solving it). Shows the solution, with your time and re-hangs.
 */
export function createSolvedState(puzzle: Puzzle, result: { elapsed: number; rehangs: number }): GameState {
  return { placement: { ...puzzle.solution }, selected: null, rehangs: result.rehangs, startedAt: 0, solvedAt: result.elapsed }
}

/** Is this weight currently hanging somewhere? */
export function isHung(placement: Placement, weight: number): boolean {
  return Object.values(placement).includes(weight)
}

/** Weights still in the tray (in the puzzle's order). */
export function trayWeights(puzzle: Puzzle, placement: Placement): number[] {
  return puzzle.weights.filter((w) => !isHung(placement, w))
}

/** Milliseconds played so far (or in total, once solved). */
export function elapsedMs(state: GameState, now: number): number {
  if (state.startedAt === null) return 0
  return (state.solvedAt ?? now) - state.startedAt
}

/** Tap a weight in the tray: select it, or deselect it if it was already selected. */
export function selectWeight(state: GameState, weight: number, now: number): GameState {
  if (state.solvedAt !== null) return state // puzzle finished: nothing changes
  if (isHung(state.placement, weight)) return state // can't pick a hung weight from the tray
  const selected = state.selected === weight ? null : weight
  return { ...state, selected, startedAt: state.startedAt ?? now }
}

/** Tap a hook. What happens depends on whether a weight is selected and the hook is full. */
export function tapHook(state: GameState, hookId: string, puzzle: Puzzle, now: number): GameState {
  if (state.solvedAt !== null) return state // puzzle finished: nothing changes
  const current = state.placement[hookId] // undefined = empty hook

  // Nothing selected.
  if (state.selected === null) {
    if (current === undefined) return state // empty hook, nothing to do
    // Send the hung weight back to the tray. (Counts as a re-hang.)
    const placement = { ...state.placement }
    delete placement[hookId]
    return { ...state, placement, rehangs: state.rehangs + 1 }
  }

  // A weight is selected: hang it here. If the hook was full, the old
  // weight automatically returns to the tray (it's no longer in `placement`).
  const placement = { ...state.placement, [hookId]: state.selected }
  const wasSwap = current !== undefined
  return {
    ...state,
    placement,
    selected: null,
    rehangs: wasSwap ? state.rehangs + 1 : state.rehangs,
    // Did this move finish the puzzle? Then stop the clock now.
    solvedAt: isSolved(puzzle, placement) ? now : null,
  }
}

/** Where a dragged weight came from: the tray, or a hook (by its id). */
export type DragSource = 'tray' | string

/**
 * The player dragged a weight and let go, over a hook (`toHookId`) or over
 * nothing (null). A drag is just a quicker way of doing the same taps, so it
 * is built from the tap rules above, and the two can never disagree:
 *
 *   tray -> hook        = select it, tap the hook (a full hook swaps: +1 re-hang)
 *   tray -> nowhere     = nothing happens
 *   hook -> nowhere     = tap the hook to take it down (+1 re-hang)
 *   hook -> other hook  = take it down (+1), then hang it on the other hook
 *                         (if that hook was full, its weight goes to the tray: +1 more)
 *   hook -> same hook   = nothing happens
 */
export function dropWeight(
  state: GameState,
  weight: number,
  from: DragSource,
  toHookId: string | null,
  puzzle: Puzzle,
  now: number,
): GameState {
  if (state.solvedAt !== null) return state
  if (from === toHookId) return state

  // Step 1: get the weight "in hand" (and nothing else selected).
  let s: GameState = { ...state, selected: null }
  if (from !== 'tray') s = tapHook(s, from, puzzle, now) // take it off its hook

  // Step 2: hang it, or leave it in the tray.
  if (toHookId === null) return s
  return tapHook(selectWeight(s, weight, now), toHookId, puzzle, now)
}

/**
 * Put every weight back in the tray. Each weight taken down counts as a
 * re-hang (otherwise "reset" would be a way to dodge the count).
 * The timer keeps running: resetting is part of the same attempt.
 */
export function resetBoard(state: GameState): GameState {
  if (state.solvedAt !== null) return state
  const removed = Object.keys(state.placement).length
  return { ...state, placement: {}, selected: null, rehangs: state.rehangs + removed }
}

/** Turns milliseconds into a clock like "1:05" (or "1:02:05" past an hour). */
export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`
  return `${minutes}:${seconds}`
}
