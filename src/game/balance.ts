// balance.ts — all the maths of Counterweight, in one place.
//
// These are "pure functions": you give them a mobile and the current
// placement, and they give back an answer. They don't draw anything and
// don't remember anything, so they are easy to test and easy to trust.
// The game screen, the tests and the verify script all use this file.

import type { Bar, Hook, MobileNode, Placement, Puzzle } from './types.ts'

/** Largest tilt we ever draw, in degrees. Keeps the mobile readable on a phone. */
export const MAX_TILT_DEGREES = 15

// ---------- Walking the tree ----------

/** Lists every hook in the mobile, from left to right. */
export function collectHooks(node: MobileNode): Hook[] {
  if (node.kind === 'hook') return [node]
  return [...collectHooks(node.left), ...collectHooks(node.right)]
}

/** Lists every bar in the mobile, top bar first. */
export function collectBars(node: MobileNode): Bar[] {
  if (node.kind === 'hook') return []
  return [node, ...collectBars(node.left), ...collectBars(node.right)]
}

// ---------- Weight and torque ----------

/**
 * Total weight hanging at or below this point.
 * - A hook: the weight on it, or 0 if it's empty.
 * - A bar:  everything under its left arm + everything under its right arm.
 *   (Bars themselves weigh nothing.)
 */
export function totalWeight(node: MobileNode, placement: Placement): number {
  if (node.kind === 'hook') return placement[node.id] ?? 0
  return totalWeight(node.left, placement) + totalWeight(node.right, placement)
}

/**
 * The "turning force" on each side of a bar:
 *   torque = (total weight under that arm) × (that arm's notches)
 */
export function getTorques(bar: Bar, placement: Placement): { left: number; right: number } {
  return {
    left: totalWeight(bar.left, placement) * bar.leftNotches,
    right: totalWeight(bar.right, placement) * bar.rightNotches,
  }
}

/** A bar balances when its left and right torques are equal. */
export function isBarBalanced(bar: Bar, placement: Placement): boolean {
  const { left, right } = getTorques(bar, placement)
  return left === right
}

// ---------- Winning ----------

/** True when every hook holds a weight. */
export function allHooksFilled(puzzle: Puzzle, placement: Placement): boolean {
  return collectHooks(puzzle.root).every((hook) => placement[hook.id] !== undefined)
}

/** The puzzle is solved when every hook holds a weight AND every bar balances. */
export function isSolved(puzzle: Puzzle, placement: Placement): boolean {
  return (
    allHooksFilled(puzzle, placement) &&
    collectBars(puzzle.root).every((bar) => isBarBalanced(bar, placement))
  )
}

// ---------- Tilt (for drawing only) ----------

/**
 * How far to rotate a bar, in degrees.
 *   positive = clockwise   = RIGHT end goes down (right side heavier)
 *   negative = anticlockwise = LEFT end goes down (left side heavier)
 *   0 = level
 *
 * Formula:  MAX × (right − left) ÷ (right + left)
 * The fraction is always between −1 and +1, so the tilt never exceeds MAX.
 * e.g. left 10, right 30  ->  15 × 20 ÷ 40 = 7.5°  (right side dips)
 *
 * If both sides weigh nothing (right + left = 0) we return 0 straight away:
 * the bar stays level, and we never divide by zero.
 */
export function getTiltDegrees(bar: Bar, placement: Placement): number {
  const { left, right } = getTorques(bar, placement)
  const total = left + right
  if (total === 0) return 0
  return (MAX_TILT_DEGREES * (right - left)) / total
}
