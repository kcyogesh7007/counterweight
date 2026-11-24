// build-daily.ts — builds src/data/daily.json: one puzzle per day for a year.
// A developer tool, NOT part of the game.
//
// Run it with:   npm run build-daily
//
// How it works:
//   1. Days #1–3 are the original Puzzles 1–3 (src/data/puzzles.json).
//      Day #1 is the launch date, 23 Nov 2026, a Monday.
//   2. It generates lots of 7-weight puzzles and keeps only DIFFERENT ones
//      (no duplicates, no mirror images) whose hooks fit a 360px phone.
//   3. It sorts them from easiest to hardest:
//        more footholds (easy starting points) = easier, then
//        fewer solver steps                    = easier.
//   4. It splits that list into 7 equal groups: Monday gets puzzles from the
//      easiest group, Tuesday the next, ... Sunday the hardest.
//
// The seed is fixed, so running it again gives exactly the same year.
// Always run `npm run verify` afterwards.

import { readFileSync, writeFileSync } from 'node:fs'
import { MIN_HOOK_SPACING_PX, minHookSpacingOnPhone } from '../src/game/layout.ts'
import type { Puzzle } from '../src/game/types.ts'
import { countFootholds, countSearchSteps, makeRandom, puzzleFingerprint, tryMakePuzzle } from '../src/game/generator.ts'

const DAYS = 365
const POOL_ATTEMPTS = 9000 // how many random tries to make the pool (more = better variety)
const SEED = 20261123
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ---------- 1. The first three days ----------
const original = JSON.parse(readFileSync('src/data/puzzles.json', 'utf8')) as Puzzle[]
const used = new Set(original.map((p) => puzzleFingerprint(p.root)))

// ---------- 2. A pool of different puzzles ----------
const random = makeRandom(SEED)
type Scored = { puzzle: Puzzle; footholds: number; steps: number }
const pool: Scored[] = []
for (let i = 0; i < POOL_ATTEMPTS; i++) {
  const puzzle = tryMakePuzzle(7, random)
  if (!puzzle) continue
  const fingerprint = puzzleFingerprint(puzzle.root)
  if (used.has(fingerprint)) continue
  if (Math.round(minHookSpacingOnPhone(puzzle.root)) < MIN_HOOK_SPACING_PX) continue
  used.add(fingerprint)
  pool.push({ puzzle, footholds: countFootholds(puzzle), steps: countSearchSteps(puzzle) })
}

// ---------- 3. Easiest to hardest ----------
pool.sort((a, b) => b.footholds - a.footholds || a.steps - b.steps)

// ---------- 4. Seven groups, one per weekday ----------
const groupSize = Math.floor(pool.length / 7)
const groups = WEEKDAYS.map((_, i) => {
  const group = pool.slice(i * groupSize, (i + 1) * groupSize)
  // Shuffle within the group (seeded) so each weekday isn't slowly getting harder all year.
  for (let j = group.length - 1; j > 0; j--) {
    const k = Math.floor(random() * (j + 1))
    ;[group[j], group[k]] = [group[k], group[j]]
  }
  return group
})

const days: Puzzle[] = []
const picked: Scored[][] = WEEKDAYS.map(() => [])
for (let day = 1; day <= DAYS; day++) {
  const weekday = (day - 1) % 7 // day 1 is a Monday -> 0
  let puzzle: Puzzle
  if (day <= original.length) {
    puzzle = original[day - 1]
  } else {
    const next = groups[weekday].shift()
    if (!next) throw new Error(`Not enough ${WEEKDAYS[weekday]} puzzles: raise POOL_ATTEMPTS`)
    picked[weekday].push(next)
    puzzle = next.puzzle
  }
  days.push({ ...puzzle, id: `day-${day}`, title: `Day ${day}` })
}

// One puzzle per line: compact, but still readable and easy to compare.
writeFileSync('src/data/daily.json', '[\n' + days.map((p) => JSON.stringify(p)).join(',\n') + '\n]\n')

// ---------- Report ----------
console.log(`Pool: ${pool.length} different puzzles from ${POOL_ATTEMPTS} attempts. Wrote ${days.length} days to src/data/daily.json.`)
console.log('Average difficulty of the generated days, by weekday:')
WEEKDAYS.forEach((name, i) => {
  const list = picked[i]
  const avg = (f: (s: Scored) => number) => (list.reduce((sum, s) => sum + f(s), 0) / list.length).toFixed(1)
  console.log(`  ${name}: ${String(list.length).padStart(3)} puzzles   footholds ${avg((s) => s.footholds)}   solver steps ${avg((s) => s.steps).padStart(6)}`)
})
