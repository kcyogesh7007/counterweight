// balance.test.ts — automatic checks for balance.ts.
//
// Run with:  npm test
//
// Each `it(...)` block is one small check. `expect(x).toBe(y)` means
// "x must equal y, otherwise fail". Most checks use the numbers from the
// table in the design PDF, so if the maths ever breaks, we'll know at once.

import { describe, expect, it } from 'vitest'
import {
  MAX_TILT_DEGREES,
  allHooksFilled,
  collectBars,
  collectHooks,
  getTiltDegrees,
  getTorques,
  isBarBalanced,
  isSolved,
  totalWeight,
} from './balance.ts'
import { DAILY_PUZZLES, TUTORIAL_PUZZLES } from './puzzles.ts'
import type { Bar, Placement, Puzzle } from './types.ts'

const pdfPuzzle = DAILY_PUZZLES[0] // Day #1 is the example from the design PDF
const tutorials = TUTORIAL_PUZZLES

/** Finds a bar in a puzzle by its id, e.g. "B". */
function findBar(puzzle: Puzzle, id: string): Bar {
  const bar = collectBars(puzzle.root).find((b) => b.id === id)
  if (!bar) throw new Error(`No bar called ${id}`)
  return bar
}

describe('walking the tree', () => {
  it('finds all 7 hooks and 6 bars of the PDF puzzle', () => {
    expect(collectHooks(pdfPuzzle.root).map((h) => h.id)).toEqual(['a', 'c1', 'c2', 'd1', 'd2', 'e1', 'e2'])
    expect(collectBars(pdfPuzzle.root).map((b) => b.id)).toEqual(['TOP', 'A', 'C', 'B', 'D', 'E'])
  })
})

describe('totalWeight', () => {
  it('counts an empty hook as 0', () => {
    expect(totalWeight({ kind: 'hook', id: 'a' }, {})).toBe(0)
  })

  it('adds up everything below a bar', () => {
    const s = pdfPuzzle.solution
    expect(totalWeight(findBar(pdfPuzzle, 'D'), s)).toBe(8) // 6 + 2
    expect(totalWeight(findBar(pdfPuzzle, 'B'), s)).toBe(14) // 6 + 2 + 1 + 5
    expect(totalWeight(pdfPuzzle.root, s)).toBe(28) // 1 + 2 + ... + 7
  })

  it('ignores empty hooks in a half-filled mobile', () => {
    expect(totalWeight(pdfPuzzle.root, { a: 7, e2: 5 })).toBe(12)
  })
})

describe('torque and balance (numbers from the PDF table)', () => {
  const table: [barId: string, left: number, right: number][] = [
    ['E', 5, 5],
    ['D', 6, 6],
    ['C', 12, 12],
    ['B', 24, 24],
    ['A', 7, 7],
    ['TOP', 14, 14],
  ]

  for (const [barId, left, right] of table) {
    it(`bar ${barId}: ${left} = ${right}`, () => {
      const bar = findBar(pdfPuzzle, barId)
      expect(getTorques(bar, pdfPuzzle.solution)).toEqual({ left, right })
      expect(isBarBalanced(bar, pdfPuzzle.solution)).toBe(true)
    })
  }

  it('says a bar is NOT balanced when the sides differ', () => {
    // Bar E is 5 : 1. Putting 5 on the left and 1 on the right gives 25 vs 1.
    expect(isBarBalanced(findBar(pdfPuzzle, 'E'), { e1: 5, e2: 1 })).toBe(false)
  })
})

describe('isSolved', () => {
  it('accepts the PDF solution', () => {
    expect(isSolved(pdfPuzzle, pdfPuzzle.solution)).toBe(true)
  })

  it('accepts both tutorial solutions', () => {
    for (const t of tutorials) expect(isSolved(t, t.solution)).toBe(true)
  })

  it('rejects a mobile with one empty hook', () => {
    const missingOne: Placement = { ...pdfPuzzle.solution }
    delete missingOne.a
    expect(allHooksFilled(pdfPuzzle, missingOne)).toBe(false)
    expect(isSolved(pdfPuzzle, missingOne)).toBe(false)
  })

  it('rejects a full mobile with two weights swapped', () => {
    const swapped: Placement = { ...pdfPuzzle.solution, e1: 5, e2: 1 }
    expect(allHooksFilled(pdfPuzzle, swapped)).toBe(true)
    expect(isSolved(pdfPuzzle, swapped)).toBe(false)
  })

  it('rejects an empty mobile (even though every bar is "level" at 0 = 0)', () => {
    expect(isSolved(pdfPuzzle, {})).toBe(false)
  })
})

describe('getTiltDegrees', () => {
  const bar = findBar(pdfPuzzle, 'E') // arms 5 : 1, hooks e1 and e2

  it('stays level, with no division by zero, when both sides weigh 0', () => {
    const tilt = getTiltDegrees(bar, {})
    expect(tilt).toBe(0)
    expect(Number.isNaN(tilt)).toBe(false)
  })

  it('stays level when balanced', () => {
    expect(getTiltDegrees(bar, { e1: 1, e2: 5 })).toBe(0)
  })

  it('tips right (positive) when the right side is heavier', () => {
    // left 1 × 5 = 5, right 7 × 1 = 7  ->  15 × 2 ÷ 12 = 2.5°
    expect(getTiltDegrees(bar, { e1: 1, e2: 7 })).toBe(2.5)
  })

  it('tips left (negative) when the left side is heavier', () => {
    expect(getTiltDegrees(bar, { e1: 2, e2: 5 })).toBeLessThan(0)
  })

  it('tips fully, but no further than the maximum, when one side is empty', () => {
    expect(getTiltDegrees(bar, { e1: 7 })).toBe(-MAX_TILT_DEGREES)
    expect(getTiltDegrees(bar, { e2: 7 })).toBe(MAX_TILT_DEGREES)
  })
})
