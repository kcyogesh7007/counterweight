// daily.test.ts — checks the day numbering and countdown.
// Run with:  npm test
//
// new Date(2026, 10, 23, 9, 30) means 23 Nov 2026, 09:30 in the computer's
// own time zone (months start at 0, so 10 = November).

import { describe, expect, it } from 'vitest'
import { dayNumber, formatCountdown, formatShortDate, msUntilNextDay, puzzleForDay } from './daily.ts'
import { DAILY_PUZZLES } from './puzzles.ts'

describe('dayNumber', () => {
  it('is #1 all day on launch day, from just after midnight to just before the next', () => {
    expect(dayNumber(new Date(2026, 10, 23, 0, 0, 1))).toBe(1)
    expect(dayNumber(new Date(2026, 10, 23, 23, 59, 59))).toBe(1)
  })

  it('goes up by one each day, across months and years', () => {
    expect(dayNumber(new Date(2026, 10, 24, 0, 0, 0))).toBe(2)
    expect(dayNumber(new Date(2026, 11, 1, 12))).toBe(9) // 1 Dec
    expect(dayNumber(new Date(2027, 0, 1, 12))).toBe(40) // 1 Jan 2027
    expect(dayNumber(new Date(2027, 10, 23, 12))).toBe(366) // one year later
  })

  it('is correct across daylight-saving changes (counts calendar days, not hours)', () => {
    // Every day for two years must be exactly one more than the day before.
    let previous = dayNumber(new Date(2026, 10, 23, 12))
    for (let i = 1; i < 730; i++) {
      const today = dayNumber(new Date(2026, 10, 23 + i, 0, 30))
      expect(today).toBe(previous + 1)
      previous = today
    }
  })

  it('never goes below #1 if the clock is set before launch', () => {
    expect(dayNumber(new Date(2026, 0, 1))).toBe(1)
  })
})

describe('puzzleForDay', () => {
  it('day #1 is the original Puzzle 1 (the design PDF example)', () => {
    expect(puzzleForDay(1, DAILY_PUZZLES).solution).toEqual({ a: 7, c1: 3, c2: 4, d1: 6, d2: 2, e1: 1, e2: 5 })
  })

  it('starts again from the top after the list runs out', () => {
    expect(puzzleForDay(DAILY_PUZZLES.length + 1, DAILY_PUZZLES)).toBe(DAILY_PUZZLES[0])
  })
})

describe('countdown to the next puzzle', () => {
  it('counts down to local midnight', () => {
    expect(msUntilNextDay(new Date(2026, 10, 23, 23, 59, 0))).toBe(60_000)
    expect(msUntilNextDay(new Date(2026, 10, 23, 0, 0, 0))).toBe(24 * 3600 * 1000)
  })

  it('is shown as h:mm:ss, never negative', () => {
    expect(formatCountdown(60_000)).toBe('0:01:00')
    expect(formatCountdown(7 * 3600_000 + 42 * 60_000 + 9_000)).toBe('7:42:09')
    expect(formatCountdown(-5)).toBe('0:00:00')
  })
})

describe('formatShortDate', () => {
  it('shows weekday, day and month', () => {
    expect(formatShortDate(new Date(2026, 10, 23))).toBe('Mon 23 Nov')
  })
})
