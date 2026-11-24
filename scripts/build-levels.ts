// build-levels.ts — builds src/data/levels.json: 60 levels, easy to hard.
// A developer tool, NOT part of the game.
//
// Run it with:   npm run build-levels
//
// Levels grow in size, then in difficulty:
//   levels  1–5   3 weights
//   levels  6–12  4 weights
//   levels 13–25  5 weights
//   levels 26–40  6 weights
//   levels 41–60  7 weights
// Within each group, puzzles go from easiest to hardest (more footholds =
// easier, then fewer solver steps = easier), picked evenly across that
// range so each level is a small step up from the one before.
//
// No level repeats a daily puzzle or a tutorial puzzle (mirror images count
// as the same). The seed is fixed, so running it again gives the same levels.
// Always run `npm run verify` afterwards.

import { readFileSync, writeFileSync } from 'node:fs'
import { MIN_HOOK_SPACING_PX, minHookSpacingOnPhone } from '../src/game/layout.ts'
import type { Puzzle } from '../src/game/types.ts'
import { countFootholds, countSearchSteps, makeRandom, puzzleFingerprint, tryMakePuzzle } from '../src/game/generator.ts'

const GROUPS = [
  { weights: 3, count: 5 },
  { weights: 4, count: 7 },
  { weights: 5, count: 13 },
  { weights: 6, count: 15 },
  { weights: 7, count: 20 },
]
const ATTEMPTS_PER_GROUP = 6000
const SEED = 6060

// Puzzles we must not repeat.
const taken = new Set<string>()
for (const file of ['src/data/daily.json', 'src/data/tutorial.json']) {
  for (const p of JSON.parse(readFileSync(file, 'utf8')) as Puzzle[]) taken.add(puzzleFingerprint(p.root))
}

const random = makeRandom(SEED)
const levels: Puzzle[] = []

for (const group of GROUPS) {
  // 1. A pool of different puzzles of this size.
  const pool: { puzzle: Puzzle; footholds: number; steps: number }[] = []
  const seen = new Set<string>()
  for (let i = 0; i < ATTEMPTS_PER_GROUP; i++) {
    const puzzle = tryMakePuzzle(group.weights, random)
    if (!puzzle) continue
    const fingerprint = puzzleFingerprint(puzzle.root)
    if (seen.has(fingerprint) || taken.has(fingerprint)) continue
    if (Math.round(minHookSpacingOnPhone(puzzle.root)) < MIN_HOOK_SPACING_PX) continue
    seen.add(fingerprint)
    pool.push({ puzzle, footholds: countFootholds(puzzle), steps: countSearchSteps(puzzle) })
  }
  if (pool.length < group.count) throw new Error(`Only ${pool.length} puzzles with ${group.weights} weights`)

  // 2. Easiest to hardest.
  pool.sort((a, b) => b.footholds - a.footholds || a.steps - b.steps)

  // 3. Pick `count` puzzles spread evenly from the easiest to the hardest.
  const picked = Array.from({ length: group.count }, (_, i) =>
    pool[Math.round((i * (pool.length - 1)) / Math.max(1, group.count - 1))],
  )
  for (const p of picked) taken.add(puzzleFingerprint(p.puzzle.root))

  console.log(
    `${group.weights} weights: pool ${String(pool.length).padStart(4)}, picked ${group.count}` +
      `  (footholds ${picked[0].footholds} -> ${picked.at(-1)!.footholds}, steps ${picked[0].steps} -> ${picked.at(-1)!.steps})`,
  )
  for (const p of picked) {
    const n = levels.length + 1
    levels.push({ ...p.puzzle, id: `level-${n}`, title: `Level ${n}` })
  }
}

writeFileSync('src/data/levels.json', '[\n' + levels.map((p) => JSON.stringify(p)).join(',\n') + '\n]\n')
console.log(`Wrote ${levels.length} levels to src/data/levels.json`)
