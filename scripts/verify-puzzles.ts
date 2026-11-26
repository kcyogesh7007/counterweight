// verify-puzzles.ts — a developer tool, NOT part of the game.
//
// Run it with:   npm run verify
//
// For every puzzle in src/data/*.json it checks:
//   1. The data is well-formed (ids unique, notches are whole numbers 1–6,
//      at least one weight per hook, weights all different).
//   2. The stored solution fills every hook, using each tray weight at most
//      once. (The hardest levels have SPARE weights: more weights than hooks.)
//   3. The stored solution really balances every bar.
//   4. BRUTE FORCE: it tries every possible way to hang the weights and
//      counts how many balance everything. A fair puzzle must have exactly 1.
//
//      Why it is always 1 (if checks 1–3 pass): each bar gives one equation,
//      so N hooks get N − 1 equations. They fix the PROPORTIONS of all the
//      weights, and since the tray is a fixed set, the total is fixed too,
//      which leaves only one possible answer. With spare weights or a "?"
//      arm that reasoning no longer holds, so the brute force really matters:
//      it tries every choice of weights AND every possible "?" length (1–6).
//   5. It fits a 360px phone: no two hooks closer than 44px (a finger's width).
//   6. No two puzzles in the same file are the same puzzle (mirror images count as the same).
//
// If anything is wrong it prints the problem and exits with an error code,
// so a broken puzzle can never slip into the game unnoticed.
//
// It uses the SAME maths as the game (src/game/balance.ts), so if the
// checker says a puzzle balances, the game will agree.

import { readFileSync } from 'node:fs'
import { collectBars, collectHooks, isBarBalanced } from '../src/game/balance.ts'
import { MIN_HOOK_SPACING_PX, minHookSpacingOnPhone } from '../src/game/layout.ts'
import type { Bar, Placement, Puzzle } from '../src/game/types.ts'
import { puzzleFingerprint } from '../src/game/generator.ts'

// By default it checks our real puzzle files. You can also check other files:
//   npm run verify -- path/to/some-puzzles.json
const DEFAULT_FILES = ['src/data/tutorial.json', 'src/data/puzzles.json', 'src/data/daily.json', 'src/data/levels.json']

/** Files with more puzzles than this print a summary instead of one line per puzzle. */
const QUIET_ABOVE = 10
const filesFromCommandLine = process.argv.slice(2)
const PUZZLE_FILES = filesFromCommandLine.length > 0 ? filesFromCommandLine : DEFAULT_FILES

/** The design PDF rejects arms longer than 6 notches. */
const MAX_NOTCHES = 6

function allBarsBalanced(bars: Bar[], placement: Placement): boolean {
  return bars.every((bar) => isBarBalanced(bar, placement))
}

/** Like allBarsBalanced, but a "?" arm may be ANY length from 1 to MAX_NOTCHES (what the player sees). */
function couldAllBalance(bars: Bar[], placement: Placement): boolean {
  return bars.every((bar) => {
    if (!bar.hidden) return isBarBalanced(bar, placement)
    for (let n = 1; n <= MAX_NOTCHES; n++) {
      const tryBar = bar.hidden === 'left' ? { ...bar, leftNotches: n } : { ...bar, rightNotches: n }
      if (isBarBalanced(tryBar, placement)) return true
    }
    return false
  })
}

// ---------- Check 1 & 2: is the data well-formed? ----------

function findDataProblems(puzzle: Puzzle): string[] {
  const problems: string[] = []
  const hooks = collectHooks(puzzle.root)
  const bars = collectBars(puzzle.root)

  // Every id (hooks and bars together) must be unique.
  const ids = [...hooks, ...bars].map((n) => n.id)
  const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i)
  if (duplicates.length > 0) problems.push(`duplicate ids: ${duplicates.join(', ')}`)

  // Notches must be whole numbers from 1 to MAX_NOTCHES.
  for (const bar of bars) {
    for (const n of [bar.leftNotches, bar.rightNotches]) {
      if (!Number.isInteger(n) || n < 1 || n > MAX_NOTCHES) {
        problems.push(`bar ${bar.id} has an invalid notch value: ${n}`)
      }
    }
  }

  // Weights: positive whole numbers, all different, one per hook.
  const w = puzzle.weights
  if (w.some((x) => !Number.isInteger(x) || x < 1)) problems.push('weights must be positive whole numbers')
  if (new Set(w).size !== w.length) problems.push('weights must all be different')
  if (w.length < hooks.length) {
    problems.push(`${hooks.length} hooks but only ${w.length} weights`)
  }

  // Stored solution: covers every hook, and uses each weight exactly once.
  const hookIds = hooks.map((h) => h.id).sort()
  const solutionIds = Object.keys(puzzle.solution).sort()
  if (hookIds.join() !== solutionIds.join()) {
    problems.push(`solution hooks [${solutionIds}] don't match puzzle hooks [${hookIds}]`)
  }
  const used = Object.values(puzzle.solution)
  if (new Set(used).size !== used.length || used.some((x) => !w.includes(x))) {
    problems.push(`solution uses weights [${used}] but the tray has [${w}] (each at most once)`)
  }
  if (bars.filter((bar) => bar.hidden).length > 1) problems.push('more than one "?" arm')

  return problems
}

// ---------- Check 4: brute force ----------

/**
 * Tries every way to put the weights on the hooks (for 7 weights that is
 * 7 × 6 × 5 × 4 × 3 × 2 × 1 = 5,040 ways; with 9 weights on 7 hooks it's
 * 181,440) and returns every arrangement that balances all bars. Stops early once it finds 2, because 2 already means
 * "not unique".
 */
function findAllSolutions(puzzle: Puzzle): Placement[] {
  const hooks = collectHooks(puzzle.root)
  const bars = collectBars(puzzle.root)
  const solutions: Placement[] = []
  const placement: Placement = {}
  const used = new Set<number>()

  // Fill hook number `index`, then call itself to fill the next hook.
  function tryHook(index: number): void {
    if (solutions.length >= 2) return
    if (index === hooks.length) {
      // Every hook is filled: is everything balanced?
      if (couldAllBalance(bars, placement)) solutions.push({ ...placement })
      return
    }
    const hookId = hooks[index].id
    for (const weight of puzzle.weights) {
      if (used.has(weight)) continue
      placement[hookId] = weight
      used.add(weight)
      tryHook(index + 1)
      used.delete(weight)
      delete placement[hookId]
    }
  }

  tryHook(0)
  return solutions
}

// ---------- Run all checks ----------

function formatPlacement(p: Placement): string {
  return Object.entries(p)
    .map(([hook, weight]) => `${hook}=${weight}`)
    .join(', ')
}

let failures = 0

for (const file of PUZZLE_FILES) {
  // Read the JSON file as text, then turn it into JavaScript objects.
  const puzzles = JSON.parse(readFileSync(file, 'utf8')) as Puzzle[]
  const quiet = puzzles.length > QUIET_ABOVE
  const failuresBefore = failures
  const seenIds = new Set<string>()
  const seenShapes = new Map<string, string>() // fingerprint -> first puzzle id with it
  console.log(`\n${file}`)

  for (const puzzle of puzzles) {
    const problems = findDataProblems(puzzle)

    // Check 6: no two puzzles in a file are the same (or mirror images).
    if (seenIds.has(puzzle.id)) problems.push(`id "${puzzle.id}" is used twice`)
    seenIds.add(puzzle.id)
    const fingerprint = puzzleFingerprint(puzzle.root)
    const twin = seenShapes.get(fingerprint)
    if (twin) problems.push(`same puzzle as ${twin}`)
    else seenShapes.set(fingerprint, puzzle.id)

    if (problems.length === 0 && !allBarsBalanced(collectBars(puzzle.root), puzzle.solution)) {
      problems.push('the stored solution does NOT balance every bar')
    }

    if (problems.length === 0) {
      const found = findAllSolutions(puzzle)
      if (found.length === 0) problems.push('no solution exists')
      if (found.length >= 2) {
        problems.push(`more than one solution, e.g. ${formatPlacement(found[0])}  AND  ${formatPlacement(found[1])}`)
      }
    }

    // Check 5: hooks far enough apart on a 360px phone (rounded to whole pixels).
    const spacing = Math.round(minHookSpacingOnPhone(puzzle.root))
    if (problems.length === 0 && spacing < MIN_HOOK_SPACING_PX) {
      problems.push(`hooks only ${spacing}px apart on a 360px phone (need ${MIN_HOOK_SPACING_PX}px)`)
    }

    if (problems.length === 0) {
      if (!quiet) console.log(`  ✓ ${puzzle.id}: exactly one solution (${formatPlacement(puzzle.solution)}), hooks ${spacing}px apart`)
    } else {
      failures++
      console.log(`  ✗ ${puzzle.id}:`)
      for (const p of problems) console.log(`      - ${p}`)
    }
  }

  if (quiet && failures === failuresBefore) {
    console.log(`  ✓ all ${puzzles.length} puzzles: exactly one solution each, hooks at least ${MIN_HOOK_SPACING_PX}px apart, no duplicates`)
  }
}

if (failures > 0) {
  console.log(`\n${failures} puzzle(s) failed.`)
  process.exit(1)
}
console.log('\nAll puzzles OK.')
