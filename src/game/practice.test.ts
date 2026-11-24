// practice.test.ts — checks that Practice puzzles are fair, fit the phone,
// match their difficulty, and are always the same for the same seed.
// Run with:  npm test

import { describe, expect, it } from 'vitest'
import { collectBars, collectHooks, isBarBalanced } from './balance.ts'
import { countFootholds } from './generator.ts'
import { MIN_HOOK_SPACING_PX, minHookSpacingOnPhone } from './layout.ts'
import { makePracticePuzzle, PRACTICE_DIFFICULTIES } from './practice.ts'
import type { Placement, Puzzle } from './types.ts'

/** Brute force: how many ways to hang the weights balance every bar? (stops at 2) */
function countSolutions(puzzle: Puzzle): number {
  const hooks = collectHooks(puzzle.root)
  const bars = collectBars(puzzle.root)
  const placement: Placement = {}
  const used = new Set<number>()
  let found = 0
  function tryHook(i: number) {
    if (found >= 2) return
    if (i === hooks.length) {
      if (bars.every((b) => isBarBalanced(b, placement))) found++
      return
    }
    for (const w of puzzle.weights) {
      if (used.has(w)) continue
      placement[hooks[i].id] = w
      used.add(w)
      tryHook(i + 1)
      used.delete(w)
      delete placement[hooks[i].id]
    }
  }
  tryHook(0)
  return found
}

describe('practice puzzles', () => {
  for (const difficulty of PRACTICE_DIFFICULTIES) {
    it(`${difficulty}: 10 puzzles, each with exactly one solution that fits a phone`, () => {
      for (let seed = 1; seed <= 10; seed++) {
        const p = makePracticePuzzle(difficulty, seed * 7919)
        expect(countSolutions(p)).toBe(1)
        expect(Math.round(minHookSpacingOnPhone(p.root))).toBeGreaterThanOrEqual(MIN_HOOK_SPACING_PX)
        const size = p.weights.length
        if (difficulty === 'easy') expect([4, 5]).toContain(size)
        if (difficulty === 'medium') expect(size).toBe(6)
        if (difficulty === 'hard') {
          expect(size).toBe(7)
          expect(countFootholds(p)).toBeLessThanOrEqual(1)
        }
      }
    })
  }

  it('the same seed always makes the same puzzle', () => {
    expect(makePracticePuzzle('hard', 12345)).toEqual(makePracticePuzzle('hard', 12345))
  })

  it('different seeds make different puzzles', () => {
    const a = JSON.stringify(makePracticePuzzle('medium', 1).root)
    const b = JSON.stringify(makePracticePuzzle('medium', 2).root)
    expect(a).not.toBe(b)
  })
})
