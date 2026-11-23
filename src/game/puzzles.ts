// puzzles.ts — the ONE place that loads the puzzle JSON files.
//
// Why the "as unknown as Puzzle[]"?
// TypeScript reads "kind": "hook" in a JSON file as "any text", not as the
// exact word 'hook' our types require, so it can't prove the file matches
// the Puzzle type. We tell it to trust us. That's safe because
// `npm run verify` checks every puzzle file before it ships.
//
// (src/data/puzzles.json holds the hand-picked Puzzles 1–3. It isn't loaded
// by the game directly: `npm run build-daily` copies them in as Days #1–3.)

import dailyData from '../data/daily.json'
import tutorialData from '../data/tutorial.json'
import type { Puzzle } from './types.ts'

/** One puzzle per day: index 0 = Day #1 (23 Nov 2026). */
export const DAILY_PUZZLES = dailyData as unknown as Puzzle[]

/** The tutorial puzzles, in order. */
export const TUTORIAL_PUZZLES = tutorialData as unknown as Puzzle[]
