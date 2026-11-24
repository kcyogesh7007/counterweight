// hints.ts — what the hint button tells you. Picks the most useful nudge
// for where you are right now, without giving away more than it needs to:
//
//   1. A weight is on the wrong hook?   -> point at that hook
//   2. An untouched "foothold" bar?     -> point at that bar ("only one pair fits")
//      (a bar holding two hooks that only ONE pair of weights can balance)
//   3. Otherwise                        -> show one correct weight on an empty hook
//
// Each puzzle has exactly one solution, so "wrong" and "correct" are clear.

import { collectBars } from './balance.ts'
import type { Placement, Puzzle } from './types.ts'

/** Hints allowed per puzzle. */
export const MAX_HINTS = 1

export type Hint =
  | { kind: 'wrong-weight'; hookId: string; weight: number }
  | { kind: 'foothold'; barId: string }
  | { kind: 'place'; hookId: string; weight: number }

/** The words shown for a hint. */
export function hintMessage(hint: Hint): string {
  switch (hint.kind) {
    case 'wrong-weight':
      return `Hint: the ${hint.weight} is in the wrong place.`
    case 'foothold':
      return 'Hint: only one pair fits this bar.'
    case 'place':
      return `Hint: the ${hint.weight} goes here.`
  }
}

/** Finds the best hint for the weights hung so far (null if the puzzle is already solved). */
export function findHint(puzzle: Puzzle, placement: Placement): Hint | null {
  // 1. A wrong weight (the first one, left to right, so it's predictable).
  for (const [hookId, weight] of Object.entries(placement)) {
    if (puzzle.solution[hookId] !== weight) return { kind: 'wrong-weight', hookId, weight }
  }

  // 2. A foothold bar whose two hooks are both still empty.
  const w = puzzle.weights
  for (const bar of collectBars(puzzle.root)) {
    if (bar.left.kind !== 'hook' || bar.right.kind !== 'hook') continue
    if (placement[bar.left.id] !== undefined || placement[bar.right.id] !== undefined) continue
    const pairs = w.flatMap((x) => w.filter((y) => y !== x && x * bar.leftNotches === y * bar.rightNotches))
    if (pairs.length === 1) return { kind: 'foothold', barId: bar.id }
  }

  // 3. Reveal one correct weight: the first empty hook, left to right.
  for (const [hookId, weight] of Object.entries(puzzle.solution)) {
    if (placement[hookId] === undefined) return { kind: 'place', hookId, weight }
  }

  return null // every hook is full and correct: already solved
}
