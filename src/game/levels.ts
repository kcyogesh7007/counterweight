// levels.ts — the rules for Levels mode.
//
//   Stars (for one solve):   0 re-hangs -> ★★★,  1–2 -> ★★☆,  3 or more -> ★☆☆
//   You keep your BEST stars for each level (replay to improve).
//   Level 1 is always open. Every other level opens once the one before it
//   has been solved (with any number of stars).

/** Stars for one solve, from the number of re-hangs. */
export function starsFor(rehangs: number): 1 | 2 | 3 {
  if (rehangs === 0) return 3
  if (rehangs <= 2) return 2
  return 1
}

/** Best stars so far: level number -> 1, 2 or 3. Missing = not solved yet. */
export type LevelStars = Record<number, number>

/** Can this level be played yet? */
export function isUnlocked(level: number, stars: LevelStars): boolean {
  return level === 1 || stars[level - 1] !== undefined
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
