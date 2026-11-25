// levels.ts — the rules for Levels mode.
//
//   Stars (for one solve):   0 re-hangs -> ★★★,  1–2 -> ★★☆,  3 or more -> ★☆☆
//   You keep your BEST stars for each level (replay to improve).
//   Levels come in sections by size (3 weights, 4 weights, … 7 weights).
//   The FIRST level of every section is always open, so you can start with
//   the hard ones if you like. Inside a section, each level opens once the
//   one before it has been solved (with any number of stars).

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
 * where each section starts: a section starts where the number of weights changes).
 */
export function isUnlocked(level: number, stars: LevelStars, levels: { weights: number[] }[]): boolean {
  const current = levels[level - 1]
  if (!current) return false // no such level
  const before = levels[level - 2]
  if (!before || before.weights.length !== current.weights.length) return true // first of its section
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

/** How many weights a level has: used for the group headings on the map. */
export function weightCountOf(level: { weights: number[] }): number {
  return level.weights.length
}
