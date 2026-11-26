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
//   levels 61–80  Master: 7 hooks, 9 weights (2 are spare)
//   levels 81–100 Grandmaster: 7 hooks, 9 weights, and one arm shown as "?"
// Within each group, puzzles go from easiest to hardest (more footholds =
// easier, then fewer solver steps = easier), picked evenly across that
// range so each level is a small step up from the one before.
//
// No level repeats a daily puzzle or a tutorial puzzle (mirror images count
// as the same). The seed is fixed, so running it again gives the same levels.
// Always run `npm run verify` afterwards.

import { readFileSync, writeFileSync } from 'node:fs'
import { MIN_HOOK_SPACING_PX, minHookSpacingOnPhone } from '../src/game/layout.ts'
import type { Bar, Puzzle } from '../src/game/types.ts'
import { collectBars } from '../src/game/balance.ts'
import {
  countFootholds,
  countFullSearchSteps,
  countSearchSteps,
  findSolutions,
  makeRandom,
  puzzleFingerprint,
  tryMakePuzzle,
} from '../src/game/generator.ts'

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
// (Days replaced by daily-overrides.json are skipped here, and the original
// hand-picked puzzles are counted instead, so the levels stay exactly the
// same as when they were first built. The override puzzles were chosen to
// not match any level.)
const overriddenDays = new Set(Object.keys(JSON.parse(readFileSync('src/data/daily-overrides.json', 'utf8'))).map(Number))
const daily = (JSON.parse(readFileSync('src/data/daily.json', 'utf8')) as Puzzle[]).filter((_, i) => !overriddenDays.has(i + 1))
const others = ['src/data/puzzles.json', 'src/data/tutorial.json'].flatMap((file) => JSON.parse(readFileSync(file, 'utf8')) as Puzzle[])
for (const p of [...daily, ...others]) taken.add(puzzleFingerprint(p.root))

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

// ---------- Levels 1–60 are FROZEN ----------
// They're published, and players have stars on them, so they must never
// change. The steps above made them, but since then the tutorial changed
// (which changes which puzzles are skipped), so they'd now pick a slightly
// different level 8. To be safe we always keep the published 1–60 exactly.
const PUBLISHED = (JSON.parse(readFileSync('src/data/levels.json', 'utf8')) as Puzzle[]).slice(0, 60)
if (PUBLISHED.length === 60) {
  levels.splice(0, 60, ...PUBLISHED)
  for (const p of PUBLISHED) taken.add(puzzleFingerprint(p.root))
}

// ---------- The expert sections (added later) ----------
//
// Why: with one weight per hook, the total is always 1 + 2 + … + 7 = 28, so a
// sharp player can split 28 down the bars and read off every weight. With
// SPARE weights the total is unknown, so that shortcut is gone. A "?" arm
// hides one more number. Every puzzle is checked to have exactly ONE answer
// (findSolutions tries every possibility, spare weights and "?" lengths too),
// and has no "foothold" bar that gives a pair away.
//
// A separate seed, so the levels above stay exactly as they were.
const EXPERT_GROUPS = [
  { name: 'Master', hooks: 7, tray: 9, count: 20, hideArm: false },
  { name: 'Grandmaster', hooks: 7, tray: 9, count: 20, hideArm: true },
]
const EXPERT_ATTEMPTS = 2500
const expertRandom = makeRandom(9191)

for (const group of EXPERT_GROUPS) {
  const pool: { puzzle: Puzzle; steps: number }[] = []
  const seen = new Set<string>()
  for (let i = 0; i < EXPERT_ATTEMPTS; i++) {
    const puzzle = tryMakePuzzle(group.hooks, expertRandom, undefined, 'portable', group.tray)
    if (!puzzle) continue
    const fingerprint = puzzleFingerprint(puzzle.root)
    if (seen.has(fingerprint) || taken.has(fingerprint)) continue
    if (countFootholds(puzzle) > 0) continue
    if (findSolutions(puzzle).length !== 1) continue
    if (group.hideArm) {
      // Try hiding each arm; keep the one that makes the puzzle hardest while
      // still having exactly one answer.
      let best: { bar: Bar; side: 'left' | 'right'; steps: number } | null = null
      const bars = collectBars(puzzle.root)
      for (const bar of bars) {
        for (const side of ['left', 'right'] as const) {
          bar.hidden = side
          if (findSolutions(puzzle).length === 1 && Math.round(minHookSpacingOnPhone(puzzle.root)) >= MIN_HOOK_SPACING_PX) {
            const steps = countFullSearchSteps(puzzle)
            if (!best || steps > best.steps) best = { bar, side, steps }
          }
          delete bar.hidden
        }
      }
      if (!best) continue
      best.bar.hidden = best.side
    }
    if (Math.round(minHookSpacingOnPhone(puzzle.root)) < MIN_HOOK_SPACING_PX) continue
    seen.add(fingerprint)
    pool.push({ puzzle, steps: countFullSearchSteps(puzzle) })
  }
  // Only the hardest third, then easiest to hardest within it.
  pool.sort((a, b) => a.steps - b.steps)
  const hardest = pool.slice(Math.floor((pool.length * 2) / 3))
  if (hardest.length < group.count) throw new Error(`Only ${hardest.length} ${group.name} puzzles`)
  const picked = Array.from({ length: group.count }, (_, i) =>
    hardest[Math.round((i * (hardest.length - 1)) / Math.max(1, group.count - 1))],
  )
  for (const p of picked) taken.add(puzzleFingerprint(p.puzzle.root))
  console.log(`${group.name}: pool ${pool.length}, picked ${group.count}  (steps ${picked[0].steps} -> ${picked.at(-1)!.steps})`)
  for (const p of picked) {
    const n = levels.length + 1
    levels.push({ ...p.puzzle, id: `level-${n}`, title: `Level ${n}` })
  }
}

writeFileSync('src/data/levels.json', '[\n' + levels.map((p) => JSON.stringify(p)).join(',\n') + '\n]\n')
console.log(`Wrote ${levels.length} levels to src/data/levels.json`)
