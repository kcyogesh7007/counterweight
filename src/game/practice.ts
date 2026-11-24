// practice.ts — Practice mode: endless puzzles, made on the spot.
//
//   Easy    4 or 5 weights
//   Medium  6 weights
//   Hard    7 weights, with at most one easy starting point ("foothold")
//
// Every puzzle comes from a SEED number: the same seed always makes the same
// puzzle. So we only need to remember the seed (e.g. to survive a reload),
// not the whole puzzle. Each puzzle has exactly one solution (see the note in
// scripts/verify-puzzles.ts), and its hooks always fit a 360px phone.

import { countFootholds, DEFAULT_MAX_NOTCHES, makeRandom, tryMakePuzzle } from './generator.ts'
import { MIN_HOOK_SPACING_PX, minHookSpacingOnPhone } from './layout.ts'
import type { Puzzle } from './types.ts'

export type PracticeDifficulty = 'easy' | 'medium' | 'hard'

export const PRACTICE_DIFFICULTIES: PracticeDifficulty[] = ['easy', 'medium', 'hard']

/** Names and one-line descriptions, for the screens. */
export const PRACTICE_INFO: Record<PracticeDifficulty, { name: string; text: string }> = {
  easy: { name: 'Easy', text: '4–5 weights. A gentle warm-up.' },
  medium: { name: 'Medium', text: '6 weights. A proper think.' },
  hard: { name: 'Hard', text: '7 weights, few easy starts.' },
}

/** A new random seed (a whole number). */
export function newSeed(): number {
  return Math.floor(Math.random() * 2 ** 31)
}

/**
 * Makes the practice puzzle for this difficulty and seed. Keeps trying random
 * shapes (all driven by the seed, so the result is always the same) until one
 * fits the difficulty and the phone screen.
 */
export function makePracticePuzzle(difficulty: PracticeDifficulty, seed: number): Puzzle {
  const random = makeRandom(seed)
  for (let attempt = 0; attempt < 10_000; attempt++) {
    const weightCount = difficulty === 'easy' ? (random() < 0.5 ? 4 : 5) : difficulty === 'medium' ? 6 : 7
    // "portable" shuffle: the same seed makes the same puzzle in every browser
    const puzzle = tryMakePuzzle(weightCount, random, DEFAULT_MAX_NOTCHES, 'portable')
    if (!puzzle) continue
    if (Math.round(minHookSpacingOnPhone(puzzle.root)) < MIN_HOOK_SPACING_PX) continue
    if (difficulty === 'hard' && countFootholds(puzzle) > 1) continue
    return { ...puzzle, id: `practice-${difficulty}-${seed}`, title: `Practice · ${PRACTICE_INFO[difficulty].name}` }
  }
  // Practically never happens; a fixed seed that's known to work is the safety net.
  return makePracticePuzzle(difficulty, 1)
}
