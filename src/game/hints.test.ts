// hints.test.ts — checks which hint is given in each situation.
// Run with:  npm test
//
// Puzzle 1 (the design PDF example): bars C (4:3), D (1:3) and E (5:1) each
// hold two hooks. C and E are "footholds" (only one pair fits: 3 & 4, 1 & 5);
// D is not (it fits 3 & 1 or 6 & 2).

import { describe, expect, it } from 'vitest'
import { findHint, hintGhosts, hintMessage, isHintStillUseful, type Hint } from './hints.ts'
import { DAILY_PUZZLES } from './puzzles.ts'
import type { Placement } from './types.ts'

const puzzle = DAILY_PUZZLES[0]
const C: Hint = { kind: 'foothold', barId: 'C', leftHookId: 'c1', rightHookId: 'c2', leftWeight: 3, rightWeight: 4, leftNotches: 4, rightNotches: 3 }

describe('findHint', () => {
  it('points at a weight on the wrong hook first, and says where it belongs', () => {
    // a should hold 7, not 3 (the 3 belongs on c1, which is empty)
    expect(findHint(puzzle, { a: 3 })).toEqual({ kind: 'wrong-weight', hookId: 'a', weight: 3, correctHookId: 'c1', correctIsFree: true })
  })

  it('knows when the right hook for a wrong weight is taken', () => {
    // 3 on a (wrong), and c1 holds the 7 (also wrong): the 3's place is taken
    expect(findHint(puzzle, { a: 3, c1: 7 })).toMatchObject({ kind: 'wrong-weight', weight: 3, correctIsFree: false })
  })

  it('otherwise shows the one pair that fits a foothold bar', () => {
    expect(findHint(puzzle, {})).toEqual(C)
  })

  it('skips footholds that already have a weight on them', () => {
    // C started (correctly), so the next foothold is E
    expect(findHint(puzzle, { c1: 3 })).toMatchObject({ kind: 'foothold', barId: 'E', leftWeight: 1, rightWeight: 5 })
  })

  it('reveals a correct weight once no foothold is left', () => {
    // C and E both started correctly; D isn't a foothold -> reveal the first empty hook
    expect(findHint(puzzle, { c1: 3, e1: 1 })).toEqual({ kind: 'place', hookId: 'a', weight: 7 })
  })

  it('gives nothing when the puzzle is already solved', () => {
    expect(findHint(puzzle, puzzle.solution)).toBe(null)
  })

  it("every hint's gold numbers really are the solution", () => {
    const placements: Placement[] = [{}, { a: 3 }, { c1: 3 }, { c1: 3, e1: 1 }]
    for (const placement of placements) {
      const hint = findHint(puzzle, placement)!
      for (const [hookId, weight] of Object.entries(hintGhosts(hint))) expect(puzzle.solution[hookId]).toBe(weight)
    }
  })
})

describe('hintMessage', () => {
  it('says what to do, and why, for each kind', () => {
    expect(hintMessage({ kind: 'wrong-weight', hookId: 'a', weight: 3, correctHookId: 'c1', correctIsFree: true })).toBe(
      'Hint: the 3 is on the wrong hook. Move it to the gold 3.',
    )
    expect(hintMessage({ kind: 'wrong-weight', hookId: 'a', weight: 3, correctHookId: 'c1', correctIsFree: false })).toBe(
      'Hint: the 3 is on the wrong hook. Take it down and try another one.',
    )
    expect(hintMessage({ kind: 'place', hookId: 'a', weight: 7 })).toBe('Hint: put the 7 on the gold 7.')
    expect(hintMessage(C)).toBe('Hint: start with this bar. 3 × 4 = 4 × 3, so the 3 and the 4 go here.')
  })
})

describe('isHintStillUseful', () => {
  it('keeps a two-weight hint until both are hung', () => {
    expect(isHintStillUseful(C, {})).toBe(true)
    expect(isHintStillUseful(C, { c1: 3 })).toBe(true) // one done, one to go
    expect(isHintStillUseful(C, { c1: 3, c2: 4 })).toBe(false) // both done
  })

  it('drops the hint if a hinted hook gets a different weight', () => {
    expect(isHintStillUseful(C, { c1: 5 })).toBe(false)
  })

  it('drops a "take it down" hint (nothing to show) after any move', () => {
    const takeDown: Hint = { kind: 'wrong-weight', hookId: 'a', weight: 3, correctHookId: 'c1', correctIsFree: false }
    expect(isHintStillUseful(takeDown, {})).toBe(false)
  })
})
