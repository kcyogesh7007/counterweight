// streaks.test.ts — checks the streak rules.
// Run with:  npm test

import { describe, expect, it } from 'vitest'
import { computeStreaks } from './streaks.ts'

describe('computeStreaks', () => {
  it('is 0 / 0 for a new player', () => {
    expect(computeStreaks([], 5)).toEqual({ current: 0, best: 0 })
  })

  it('is 1 / 1 after solving the first puzzle', () => {
    expect(computeStreaks([1], 1)).toEqual({ current: 1, best: 1 })
  })

  it('counts days in a row up to today', () => {
    expect(computeStreaks([3, 4, 5], 5)).toEqual({ current: 3, best: 3 })
  })

  it('keeps yesterday\'s streak alive until today is played', () => {
    expect(computeStreaks([3, 4, 5], 6)).toEqual({ current: 3, best: 3 })
  })

  it('drops to 0 once a whole day is missed', () => {
    expect(computeStreaks([3, 4, 5], 7)).toEqual({ current: 0, best: 3 })
  })

  it('starts again after a gap, and remembers the best run', () => {
    // The example from streaks.ts: days 1–3, gap, days 5–6.
    expect(computeStreaks([1, 2, 3, 5, 6], 6)).toEqual({ current: 2, best: 3 })
  })

  it('does not care about order or repeats', () => {
    expect(computeStreaks([6, 5, 5, 1, 3, 2, 6], 6)).toEqual({ current: 2, best: 3 })
  })

  it('the best is never smaller than the current streak', () => {
    expect(computeStreaks([1, 2, 10, 11, 12, 13], 13)).toEqual({ current: 4, best: 4 })
  })
})
