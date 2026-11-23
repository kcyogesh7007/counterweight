// generate-puzzles.ts — prints new puzzle candidates. A developer tool, NOT part of the game.
//
// Run it with:   npm run generate -- <weights> <how many> [seed] [longest arm]
//   e.g.         npm run generate -- 7 5 42
//
// The building blocks (and the recipe) are in scripts/lib/generator.ts.
// For each candidate it prints:
//   - spacingPx:   closest two hooks on a 360px phone (want >= 44).
//   - searchSteps: how hard a step-by-step solver finds it (higher = harder).
//   - footholds:   easy starting points (more = easier).
//   - levels:      how many levels of bars.
// The SAME seed always gives the SAME puzzles, so results can be repeated.

import { computeLayout, minHookSpacingOnPhone } from '../src/game/layout.ts'
import { barLevels, countFootholds, countSearchSteps, DEFAULT_MAX_NOTCHES, makeRandom, tryMakePuzzle } from './lib/generator.ts'

const weightCount = Number(process.argv[2] ?? 7)
const wanted = Number(process.argv[3] ?? 5)
const seed = Number(process.argv[4] ?? 1)
const maxNotches = Number(process.argv[5] ?? DEFAULT_MAX_NOTCHES)
const random = makeRandom(seed)

const candidates = []
let attempts = 0
while (candidates.length < wanted && attempts < 200_000) {
  attempts++
  const puzzle = tryMakePuzzle(weightCount, random, maxNotches)
  if (!puzzle) continue
  candidates.push({
    puzzle,
    spacingPx: Math.round(minHookSpacingOnPhone(puzzle.root)),
    searchSteps: countSearchSteps(puzzle),
    footholds: countFootholds(puzzle),
    levels: barLevels(puzzle.root),
    width: Math.round(computeLayout(puzzle.root).viewBox.width),
  })
}

console.log(JSON.stringify({ weightCount, seed, attempts, candidates }, null, 2))
