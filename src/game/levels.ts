// levels.ts — the rules for Levels mode.
//
//   Stars (for one solve):   0 re-hangs -> ★★★,  1–2 -> ★★☆,  3 or more -> ★☆☆
//   You keep your BEST stars for each level (replay to improve).
//   Levels come in sections: by size (3 weights … 7 weights), then two expert
//   sections with SPARE weights (Master), and spare weights plus a "?" arm
//   (Grandmaster).
//   The FIRST level of every section is always open, so you can start with
//   the hard ones if you like. Inside a section, each level opens once the
//   one before it has been solved (with any number of stars).

import { collectBars } from './balance.ts'
import type { Bar } from './types.ts'

/** Stars for one solve, from the number of re-hangs. */
export function starsFor(rehangs: number): 1 | 2 | 3 {
  if (rehangs === 0) return 3
  if (rehangs <= 2) return 2
  return 1
}

/** Best stars so far: level number -> 1, 2 or 3. Missing = not solved yet. */
export type LevelStars = Record<number, number>

/**
 * Can this level be played yet? `levels` is the list of all levels (to see
 * where each section starts: a section starts where sectionOf changes).
 */
export function isUnlocked(level: number, stars: LevelStars, levels: SectionInfo[]): boolean {
  const current = levels[level - 1]
  if (!current) return false // no such level
  const before = levels[level - 2]
  if (!before || sectionOf(before) !== sectionOf(current)) return true // first of its section
  return stars[level - 1] !== undefined
}

/** The level to suggest next: the first one that's open but not solved (or the last level). */
export function nextLevel(stars: LevelStars, levelCount: number): number {
  for (let n = 1; n <= levelCount; n++) {
    if (stars[n] === undefined) return n
  }
  return levelCount
}

/** How many levels are solved, and how many stars in total. */
export function levelTotals(stars: LevelStars): { solved: number; stars: number } {
  const values = Object.values(stars)
  return { solved: values.length, stars: values.reduce((sum, s) => sum + s, 0) }
}

/** What a level needs for working out its section. */
type SectionInfo = { weights: number[]; solution: Record<string, number>; root: Bar }

/** How many tray weights are spare (not used): 0 for normal levels. */
export function spareCount(level: SectionInfo): number {
  return level.weights.length - Object.keys(level.solution).length
}

/** True if some arm's length is a secret "?". */
export function hasHiddenArm(level: SectionInfo): boolean {
  return collectBars(level.root).some((bar) => bar.hidden)
}

/** Which section a level belongs to, e.g. "5" (5 weights), "9+2" (2 spare), "9+2?" (and a "?" arm). */
export function sectionOf(level: SectionInfo): string {
  const spare = spareCount(level)
  return `${level.weights.length}${spare ? `+${spare}` : ''}${hasHiddenArm(level) ? '?' : ''}`
}

/** e.g. "7 weights", "9 weights · 2 spare", or "9 weights · 2 spare · ? arm" */
export function weightsLabel(level: SectionInfo): string {
  const spare = spareCount(level)
  return `${level.weights.length} weights${spare ? ` · ${spare} spare` : ''}${hasHiddenArm(level) ? ' · ? arm' : ''}`
}
