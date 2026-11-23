// moves.test.ts — checks the tapping rules, the re-hang count, the timer and winning.
// Run with:  npm test
//
// Times are made-up milliseconds (e.g. 1000 = "1 second after page load"),
// so the tests never depend on the real clock.

import { describe, expect, it } from 'vitest'
import {
  createInitialState,
  createSolvedState,
  dropWeight,
  elapsedMs,
  formatTime,
  resetBoard,
  selectWeight,
  tapHook,
  trayWeights,
  type GameState,
} from './moves.ts'
import { DAILY_PUZZLES } from './puzzles.ts'

const puzzle = DAILY_PUZZLES[0] // Day #1, the design PDF example
const SOLUTION = Object.entries(puzzle.solution) // [['a', 7], ['c1', 3], ...]

/** Shortcut: select a weight, then tap a hook, at the given time. */
function hang(state: GameState, weight: number, hookId: string, now = 1000): GameState {
  return tapHook(selectWeight(state, weight, now), hookId, puzzle, now)
}

/** Hangs the whole solution, one weight per second starting at `start`. */
function hangSolution(state: GameState, start: number): GameState {
  return SOLUTION.reduce((s, [hookId, weight], i) => hang(s, weight, hookId, start + i * 1000), state)
}

describe('selecting weights', () => {
  it('selects, then deselects on a second tap', () => {
    const s1 = selectWeight(createInitialState(), 3, 0)
    expect(s1.selected).toBe(3)
    expect(selectWeight(s1, 3, 0).selected).toBe(null)
  })

  it('switches the selection to a different weight', () => {
    const s = selectWeight(selectWeight(createInitialState(), 3, 0), 5, 0)
    expect(s.selected).toBe(5)
  })

  it('ignores a weight that is already hanging', () => {
    const s = hang(createInitialState(), 7, 'a')
    expect(selectWeight(s, 7, 0).selected).toBe(null)
  })
})

describe('hanging weights', () => {
  it('places a selected weight on an empty hook, with no re-hang', () => {
    const s = hang(createInitialState(), 7, 'a')
    expect(s.placement).toEqual({ a: 7 })
    expect(s.selected).toBe(null)
    expect(s.rehangs).toBe(0)
    expect(trayWeights(puzzle, s.placement)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('does nothing when tapping an empty hook with nothing selected', () => {
    const s = createInitialState()
    expect(tapHook(s, 'a', puzzle, 0)).toBe(s)
  })
})

describe('swapping and returning (re-hangs)', () => {
  it('swaps: new weight on the hook, old one back in the tray, +1 re-hang', () => {
    let s = hang(createInitialState(), 7, 'a')
    s = hang(s, 3, 'a')
    expect(s.placement).toEqual({ a: 3 })
    expect(trayWeights(puzzle, s.placement)).toContain(7)
    expect(s.rehangs).toBe(1)
  })

  it('returns a hung weight to the tray when tapped with nothing selected, +1 re-hang', () => {
    let s = hang(createInitialState(), 7, 'a')
    s = tapHook(s, 'a', puzzle, 0)
    expect(s.placement).toEqual({})
    expect(s.rehangs).toBe(1)
  })

  it('counts each removed weight as a re-hang on reset', () => {
    let s = hang(createInitialState(), 7, 'a')
    s = hang(s, 1, 'e1')
    s = resetBoard(s)
    expect(s.placement).toEqual({})
    expect(s.rehangs).toBe(2)
  })

  it('counts nothing when resetting an empty board', () => {
    expect(resetBoard(createInitialState()).rehangs).toBe(0)
  })
})

describe('timer', () => {
  it('has not started before the first tap', () => {
    const s = createInitialState()
    expect(s.startedAt).toBe(null)
    expect(elapsedMs(s, 99_000)).toBe(0)
  })

  it('starts when the first weight is picked up, and not again after that', () => {
    let s = selectWeight(createInitialState(), 3, 5000)
    expect(s.startedAt).toBe(5000)
    s = selectWeight(s, 4, 9000)
    expect(s.startedAt).toBe(5000)
    expect(elapsedMs(s, 12_000)).toBe(7000)
  })

  it('keeps running through a reset', () => {
    let s = hang(createInitialState(), 7, 'a', 1000)
    s = resetBoard(s)
    expect(s.startedAt).toBe(1000)
  })
})

describe('winning', () => {
  it('is not solved while hooks are still empty', () => {
    const s = hang(createInitialState(), 7, 'a')
    expect(s.solvedAt).toBe(null)
  })

  it('is not solved when every hook is full but bars are unbalanced', () => {
    // The solution with 1 and 5 swapped on bar E.
    const wrong = SOLUTION.map(([h, w]) => [h, h === 'e1' ? 5 : h === 'e2' ? 1 : w] as const)
    const s = wrong.reduce((st, [h, w]) => hang(st, w, h), createInitialState())
    expect(Object.keys(s.placement)).toHaveLength(7)
    expect(s.solvedAt).toBe(null)
  })

  it('stops the clock at the moment the last weight balances everything', () => {
    // Weights hung at 10s, 11s, ... 16s. The last one finishes it at 16s.
    const s = hangSolution(createInitialState(), 10_000)
    expect(s.startedAt).toBe(10_000)
    expect(s.solvedAt).toBe(16_000)
    expect(elapsedMs(s, 999_999)).toBe(6000) // clock no longer moves
  })

  it('ignores every tap after the puzzle is solved', () => {
    const solved = hangSolution(createInitialState(), 0)
    expect(selectWeight(solved, 1, 0)).toBe(solved)
    expect(tapHook(solved, 'a', puzzle, 0)).toBe(solved)
    expect(resetBoard(solved)).toBe(solved)
  })
})

describe('dragging (dropWeight)', () => {
  const drop = (s: GameState, w: number, from: string, to: string | null) => dropWeight(s, w, from, to, puzzle, 1000)

  it('tray -> empty hook: hangs it, no re-hang, starts the timer', () => {
    const s = drop(createInitialState(), 7, 'tray', 'a')
    expect(s.placement).toEqual({ a: 7 })
    expect(s.rehangs).toBe(0)
    expect(s.startedAt).toBe(1000)
  })

  it('tray -> full hook: swaps, old weight back to the tray, +1 re-hang', () => {
    let s = drop(createInitialState(), 7, 'tray', 'a')
    s = drop(s, 3, 'tray', 'a')
    expect(s.placement).toEqual({ a: 3 })
    expect(s.rehangs).toBe(1)
  })

  it('tray -> nowhere: nothing changes (and any selection is cleared)', () => {
    const s0 = selectWeight(createInitialState(), 2, 0)
    const s = drop(s0, 5, 'tray', null)
    expect(s.placement).toEqual({})
    expect(s.selected).toBe(null)
    expect(s.rehangs).toBe(0)
  })

  it('hook -> nowhere: takes it down, +1 re-hang', () => {
    let s = drop(createInitialState(), 7, 'tray', 'a')
    s = drop(s, 7, 'a', null)
    expect(s.placement).toEqual({})
    expect(s.rehangs).toBe(1)
  })

  it('hook -> empty hook: moves it, +1 re-hang', () => {
    let s = drop(createInitialState(), 7, 'tray', 'a')
    s = drop(s, 7, 'a', 'c1')
    expect(s.placement).toEqual({ c1: 7 })
    expect(s.rehangs).toBe(1)
  })

  it('hook -> full hook: moves it, the other weight goes to the tray, +2 re-hangs', () => {
    let s = drop(createInitialState(), 7, 'tray', 'a')
    s = drop(s, 3, 'tray', 'c1')
    s = drop(s, 7, 'a', 'c1')
    expect(s.placement).toEqual({ c1: 7 })
    expect(trayWeights(puzzle, s.placement)).toContain(3)
    expect(s.rehangs).toBe(2)
  })

  it('hook -> same hook: nothing changes', () => {
    const s0 = drop(createInitialState(), 7, 'tray', 'a')
    expect(drop(s0, 7, 'a', 'a')).toBe(s0)
  })

  it('wins when the last weight is dragged into place, and ignores drags after that', () => {
    let s = createInitialState()
    for (const [hookId, weight] of SOLUTION) s = drop(s, weight, 'tray', hookId)
    expect(s.solvedAt).toBe(1000)
    expect(drop(s, 7, 'a', null)).toBe(s)
  })
})

describe('createSolvedState (coming back to a puzzle you already solved)', () => {
  it('shows the solution, your time and re-hangs, and is locked', () => {
    const s = createSolvedState(puzzle, { elapsed: 134_000, rehangs: 2 })
    expect(s.placement).toEqual(puzzle.solution)
    expect(s.rehangs).toBe(2)
    expect(elapsedMs(s, 999_999_999)).toBe(134_000)
    expect(tapHook(s, 'a', puzzle, 0)).toBe(s) // no more moves
  })
})

describe('formatTime', () => {
  it('shows minutes and two-digit seconds', () => {
    expect(formatTime(0)).toBe('0:00')
    expect(formatTime(5_400)).toBe('0:05')
    expect(formatTime(65_000)).toBe('1:05')
    expect(formatTime(250_000)).toBe('4:10')
  })

  it('adds hours when needed', () => {
    expect(formatTime(3_725_000)).toBe('1:02:05')
  })
})
