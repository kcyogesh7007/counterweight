// hints.ts — what the hint button tells you. You get ONE hint per puzzle, so
// it should really help: it SHOWS where weights go (gold numbers in the empty
// circles) and SAYS why, in plain words. It picks the most useful nudge for
// where you are right now:
//
//   1. A weight is on the wrong hook?   -> say so, and show where it belongs
//   2. An untouched "foothold" bar?     -> show the ONE pair that balances it,
//      (a bar holding two hooks that       with the sum that proves it
//       only one pair of weights can balance)
//   3. Otherwise                        -> show one correct weight on an empty hook
//
// Each puzzle has exactly one solution, so "wrong" and "correct" are clear.

import { collectBars } from './balance.ts'
import type { Placement, Puzzle } from './types.ts'

/** Hints allowed per puzzle. */
export const MAX_HINTS = 1

export type Hint =
  /** `weight` is on `hookId` but belongs on `correctHookId` (`correctIsFree`: that hook is empty, so it can be shown). */
  | { kind: 'wrong-weight'; hookId: string; weight: number; correctHookId: string; correctIsFree: boolean }
  /** On bar `barId`, only `leftWeight` (on `leftHookId`) and `rightWeight` (on `rightHookId`) balance. */
  | {
      kind: 'foothold'
      barId: string
      leftHookId: string
      rightHookId: string
      leftWeight: number
      rightWeight: number
      leftNotches: number
      rightNotches: number
    }
  /** `weight` goes on the empty hook `hookId`. */
  | { kind: 'place'; hookId: string; weight: number }

/** The words shown for a hint. */
export function hintMessage(hint: Hint): string {
  switch (hint.kind) {
    case 'wrong-weight':
      return hint.correctIsFree
        ? `Hint: the ${hint.weight} is on the wrong hook. Move it to the gold ${hint.weight}.`
        : `Hint: the ${hint.weight} is on the wrong hook. Take it down and try another one.`
    case 'foothold': {
      const { leftWeight: a, rightWeight: b, leftNotches: l, rightNotches: r } = hint
      return `Hint: start with this bar. ${a} × ${l} = ${b} × ${r}, so the ${a} and the ${b} go here.`
    }
    case 'place':
      return `Hint: put the ${hint.weight} on the gold ${hint.weight}.`
  }
}

/** The gold numbers a hint draws in empty circles: { hookId: weight }. */
export function hintGhosts(hint: Hint): Record<string, number> {
  switch (hint.kind) {
    case 'wrong-weight':
      return hint.correctIsFree ? { [hint.correctHookId]: hint.weight } : {}
    case 'foothold':
      return { [hint.leftHookId]: hint.leftWeight, [hint.rightHookId]: hint.rightWeight }
    case 'place':
      return { [hint.hookId]: hint.weight }
  }
}

/**
 * Is a hint still worth showing after the player moved something? Yes while
 * some of its gold numbers are still waiting on empty hooks, and no hinted
 * hook has been given a different weight. (So a two-weight hint stays up
 * until both are hung.)
 */
export function isHintStillUseful(hint: Hint, placement: Placement): boolean {
  const ghosts = Object.entries(hintGhosts(hint))
  if (ghosts.some(([hookId, weight]) => placement[hookId] !== undefined && placement[hookId] !== weight)) return false
  return ghosts.some(([hookId]) => placement[hookId] === undefined)
}

/** Finds the best hint for the weights hung so far (null if the puzzle is already solved). */
export function findHint(puzzle: Puzzle, placement: Placement): Hint | null {
  // 1. A wrong weight (the first one, left to right, so it's predictable).
  for (const [hookId, weight] of Object.entries(placement)) {
    if (puzzle.solution[hookId] !== weight) {
      const correctHookId = Object.keys(puzzle.solution).find((id) => puzzle.solution[id] === weight)!
      return { kind: 'wrong-weight', hookId, weight, correctHookId, correctIsFree: placement[correctHookId] === undefined }
    }
  }

  // 2. A foothold bar whose two hooks are both still empty: only one pair fits.
  const w = puzzle.weights
  for (const bar of collectBars(puzzle.root)) {
    if (bar.left.kind !== 'hook' || bar.right.kind !== 'hook') continue
    if (placement[bar.left.id] !== undefined || placement[bar.right.id] !== undefined) continue
    const pairs = w.flatMap((x) => w.filter((y) => y !== x && x * bar.leftNotches === y * bar.rightNotches).map((y) => [x, y]))
    if (pairs.length === 1) {
      const [leftWeight, rightWeight] = pairs[0]
      return {
        kind: 'foothold',
        barId: bar.id,
        leftHookId: bar.left.id,
        rightHookId: bar.right.id,
        leftWeight,
        rightWeight,
        leftNotches: bar.leftNotches,
        rightNotches: bar.rightNotches,
      }
    }
  }

  // 3. Reveal one correct weight: the first empty hook, left to right.
  for (const [hookId, weight] of Object.entries(puzzle.solution)) {
    if (placement[hookId] === undefined) return { kind: 'place', hookId, weight }
  }

  return null // every hook is full and correct: already solved
}
