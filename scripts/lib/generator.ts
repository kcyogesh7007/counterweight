// generator.ts — the building blocks for making puzzles. Used by
// generate-puzzles.ts and build-daily.ts. A developer tool, NOT part of the game.
//
// Recipe (from the design PDF):
//   1. Pick a random tree shape with N hooks (at most 4 levels of bars).
//   2. Put the weights 1…N onto the hooks.
//   3. Working bottom-up, set each bar's notches to the reduced ratio
//      (right total : left total), so it balances by construction.
//   4. Reject it if any arm is longer than the limit (the PDF says 6).
//
// One change from the PDF: in step 2, a purely random shuffle almost never
// passes step 4. (7 next to a single other weight x always needs an arm of
// 7 notches, since 7 shares no factor with x.) So instead we SEARCH, in
// random order, for an arrangement whose arms all stay within the limit.

import { collectBars, collectHooks, totalWeight } from '../../src/game/balance.ts'
import type { Bar, MobileNode, Placement, Puzzle } from '../../src/game/types.ts'

export const DEFAULT_MAX_NOTCHES = 6
const MAX_BAR_LEVELS = 4

// ---------- A small seeded random number generator ----------
// Math.random() gives different numbers every run. This one ("mulberry32")
// gives the same sequence for the same seed, so a good puzzle can be re-made.
export function makeRandom(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------- Step 1: a random tree shape ----------
function randomShape(hookCount: number, levelsLeft: number, random: () => number, ids: { bar: number; hook: number }): MobileNode | null {
  if (hookCount === 1) return { kind: 'hook', id: `h${++ids.hook}` }
  if (levelsLeft === 0) return null // too deep
  const leftCount = 1 + Math.floor(random() * (hookCount - 1))
  const left = randomShape(leftCount, levelsLeft - 1, random, ids)
  const right = randomShape(hookCount - leftCount, levelsLeft - 1, random, ids)
  if (!left || !right) return null
  return { kind: 'bar', id: `B${++ids.bar}`, leftNotches: 0, rightNotches: 0, left, right }
}

// ---------- Step 3: notches that balance by construction ----------
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

/** Sets every bar's notches bottom-up (left notches = right total ÷ gcd, and vice versa). */
function setNotches(node: MobileNode, placement: Placement): void {
  if (node.kind === 'hook') return
  setNotches(node.left, placement)
  setNotches(node.right, placement)
  const leftTotal = totalWeight(node.left, placement)
  const rightTotal = totalWeight(node.right, placement)
  const g = gcd(leftTotal, rightTotal)
  node.leftNotches = rightTotal / g // left total × left notches = right total × right notches
  node.rightNotches = leftTotal / g
}

/**
 * Tries weights on hooks (in a random order) until every bar's ratio fits
 * within maxNotches. Gives up on a branch as soon as a bar whose hooks are
 * all filled breaks the limit. Returns null if no arrangement works.
 */
function findShortArmPlacement(root: Bar, weights: number[], random: () => number, maxNotches: number): Placement | null {
  const hooks = collectHooks(root)
  const bars = collectBars(root)
  const armsTooLong = (l: number, r: number) => l / gcd(l, r) > maxNotches || r / gcd(l, r) > maxNotches
  // The last hook (in left-to-right order) under each bar: once it's filled, we can check that bar.
  const lastHookOf = new Map(bars.map((bar) => [bar, collectHooks(bar).at(-1)!.id]))
  const placement: Placement = {}
  const used = new Set<number>()

  function tryHook(i: number): boolean {
    if (i === hooks.length) return true
    for (const w of [...weights].sort(() => random() - 0.5)) {
      if (used.has(w)) continue
      placement[hooks[i].id] = w
      used.add(w)
      const finishedBars = bars.filter((bar) => lastHookOf.get(bar) === hooks[i].id)
      const fine = finishedBars.every((bar) => !armsTooLong(totalWeight(bar.left, placement), totalWeight(bar.right, placement)))
      if (fine && tryHook(i + 1)) return true
      used.delete(w)
      delete placement[hooks[i].id]
    }
    return false
  }

  return tryHook(0) ? placement : null
}

/** Gives bars readable names: TOP, then A, B, C… top to bottom. Hooks become a, b, c… left to right. */
function renameNodes(root: Bar, solution: Placement): Placement {
  const renamed: Placement = {}
  collectHooks(root).forEach((hook, i) => {
    const newId = String.fromCharCode(97 + i) // a, b, c…
    renamed[newId] = solution[hook.id]
    hook.id = newId
  })
  // Breadth-first so letters run top to bottom.
  const queue: MobileNode[] = [root]
  let letter = 0
  while (queue.length > 0) {
    const node = queue.shift()!
    if (node.kind === 'hook') continue
    node.id = node === root ? 'TOP' : String.fromCharCode(65 + letter++) // A, B, C…
    queue.push(node.left, node.right)
  }
  return renamed
}

/** Makes ONE random puzzle, or null if this attempt's shape didn't work out. */
export function tryMakePuzzle(weightCount: number, random: () => number, maxNotches = DEFAULT_MAX_NOTCHES): Puzzle | null {
  const weights = Array.from({ length: weightCount }, (_, i) => i + 1)
  const root = randomShape(weightCount, MAX_BAR_LEVELS, random, { bar: 0, hook: 0 })
  if (!root || root.kind !== 'bar') return null
  const placement = findShortArmPlacement(root, weights, random, maxNotches)
  if (!placement) return null // this shape can't be done with short enough arms
  setNotches(root, placement)
  const solution = renameNodes(root, placement)
  return { id: 'candidate', title: 'Candidate', weights, root, solution }
}

// ---------- Measuring puzzles ----------

/**
 * Difficulty score 1: a careful step-by-step solver tries weights hook by
 * hook, giving up on a branch as soon as a fully-filled bar is unbalanced.
 * Counts every placement it tries. Higher = harder (roughly).
 */
export function countSearchSteps(puzzle: Puzzle): number {
  const hooks = collectHooks(puzzle.root)
  const bars = collectBars(puzzle.root)
  const hooksUnder = new Map(bars.map((bar) => [bar, collectHooks(bar).map((h) => h.id)]))
  const placement: Placement = {}
  const used = new Set<number>()
  let steps = 0
  let found = false

  const barsOk = () =>
    bars.every((bar) => {
      if (!hooksUnder.get(bar)!.every((id) => placement[id] !== undefined)) return true
      return totalWeight(bar.left, placement) * bar.leftNotches === totalWeight(bar.right, placement) * bar.rightNotches
    })

  function tryHook(i: number) {
    if (found) return
    if (i === hooks.length) {
      found = true
      return
    }
    for (const w of puzzle.weights) {
      if (used.has(w)) continue
      steps++
      placement[hooks[i].id] = w
      used.add(w)
      if (barsOk()) tryHook(i + 1)
      used.delete(w)
      delete placement[hooks[i].id]
      if (found) return
    }
  }

  tryHook(0)
  return steps
}

/**
 * Difficulty score 2: FOOTHOLDS. A bar holding two hooks whose notch ratio
 * fits only ONE pair of weights (e.g. 5 : 1 can only be 1 and 5) is an easy
 * place to start. More footholds = easier.
 */
export function countFootholds(puzzle: Puzzle): number {
  const w = puzzle.weights
  return collectBars(puzzle.root).filter((bar) => {
    if (bar.left.kind !== 'hook' || bar.right.kind !== 'hook') return false
    const pairs = w.flatMap((x) => w.filter((y) => y !== x && x * bar.leftNotches === y * bar.rightNotches))
    return pairs.length === 1
  }).length
}

/** How many levels of bars (1 = a single bar). */
export function barLevels(node: MobileNode): number {
  return node.kind === 'hook' ? 0 : 1 + Math.max(barLevels(node.left), barLevels(node.right))
}

/**
 * A text "fingerprint" of a puzzle's shape and notches. Two puzzles with the
 * same fingerprint are the same puzzle. A mirror image (left and right
 * swapped everywhere) counts as the same puzzle too.
 */
export function puzzleFingerprint(root: MobileNode): string {
  const forward = (n: MobileNode): string => (n.kind === 'hook' ? 'h' : `(${forward(n.left)}${n.leftNotches}:${n.rightNotches}${forward(n.right)})`)
  const mirror = (n: MobileNode): string => (n.kind === 'hook' ? 'h' : `(${mirror(n.right)}${n.rightNotches}:${n.leftNotches}${mirror(n.left)})`)
  const a = forward(root)
  const b = mirror(root)
  return a < b ? a : b
}
