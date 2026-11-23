// daily.ts — which puzzle is "today's", and how long until the next one.
//
// Day #1 is the launch date, 23 Nov 2026. Each new day (at the player's own
// local midnight) is the next number: #2, #3, ...
//
// Why Date.UTC below? Some countries move their clocks for daylight saving,
// so a few days are 23 or 25 hours long. Counting days with plain
// milliseconds would then be off by an hour. Using the calendar date only
// (year, month, day) avoids that.

import type { Puzzle } from './types.ts'

/** Day #1. (Months in JavaScript start at 0, so 10 = November.) */
const LAUNCH_UTC = Date.UTC(2026, 10, 23)
const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Today's puzzle number for the player's local date. Never less than 1. */
export function dayNumber(now: Date): number {
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.max(1, Math.round((today - LAUNCH_UTC) / MS_PER_DAY) + 1)
}

/** The puzzle for a day. After the list runs out it starts again from the top. */
export function puzzleForDay(day: number, puzzles: Puzzle[]): Puzzle {
  return puzzles[(day - 1) % puzzles.length]
}

/** Milliseconds until the player's next local midnight (when the next puzzle appears). */
export function msUntilNextDay(now: Date): number {
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return nextMidnight.getTime() - now.getTime()
}

/** A countdown like "7:42:09". */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
  const seconds = String(total % 60).padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

/** A short date like "Mon 23 Nov". */
export function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}
