// hints.test.ts — checks which hint is given in each situation.
// Run with:  npm test
//
// Puzzle 1 (the design PDF example): bars C (4:3), D (1:3) and E (5:1) each
// hold two hooks. C and E are "footholds" (only one pair fits: 3 & 4, 1 & 5);
// D is not (it fits 3 & 1 or 6 & 2).

import { describe, expect, it } from 'vitest'
import { findHint, hintMessage } from './hints.ts'
import { DAILY_PUZZLES } from './puzzles.ts'

const puzzle = DAILY_PUZZLES[0]

describe('findHint', () => {
  it('points at a weight on the wrong hook first', () => {
    // a should hold 7, not 3
    expect(findHint(puzzle, { a: 3 })).toEqual({ kind: 'wrong-weight', hookId: 'a', weight: 3 })
  })

  it('otherwise points at an untouched foothold bar', () => {
    expect(findHint(puzzle, {})).toEqual({ kind: 'foothold', barId: 'C' })
  })

  it('skips footholds that already have a weight on them', () => {
    // C started (correctly), so the next foothold is E
    expect(findHint(puzzle, { c1: 3 })).toEqual({ kind: 'foothold', barId: 'E' })
  })

  it('reveals a correct weight once no foothold is left', () => {
    // C and E both started correctly; D isn't a foothold -> reveal the first empty hook
    expect(findHint(puzzle, { c1: 3, e1: 1 })).toEqual({ kind: 'place', hookId: 'a', weight: 7 })
  })

  it('gives nothing when the puzzle is already solved', () => {
    expect(findHint(puzzle, puzzle.solution)).toBe(null)
  })
})

describe('hintMessage', () => {
  it('says something clear for each kind', () => {
    expect(hintMessage({ kind: 'wrong-weight', hookId: 'a', weight: 3 })).toBe('Hint: the 3 is in the wrong place.')
    expect(hintMessage({ kind: 'place', hookId: 'a', weight: 7 })).toBe('Hint: the 7 goes here.')
    expect(hintMessage({ kind: 'foothold', barId: 'C' })).toBe('Hint: only one pair fits this bar.')
  })
})
