// levels.test.ts — checks the Levels rules and the level list.
// Run with:  npm test

import { describe, expect, it } from 'vitest'
import { isUnlocked, levelTotals, nextLevel, starsFor } from './levels.ts'
import { LEVEL_PUZZLES } from './puzzles.ts'

describe('starsFor', () => {
  it('gives 3 stars for no re-hangs, 2 for one or two, 1 for more', () => {
    expect(starsFor(0)).toBe(3)
    expect(starsFor(1)).toBe(2)
    expect(starsFor(2)).toBe(2)
    expect(starsFor(3)).toBe(1)
    expect(starsFor(40)).toBe(1)
  })
})

describe('unlocking', () => {
  it('level 1 is always open; others open after the one before is solved', () => {
    expect(isUnlocked(1, {})).toBe(true)
    expect(isUnlocked(2, {})).toBe(false)
    expect(isUnlocked(2, { 1: 1 })).toBe(true) // even 1 star is enough
    expect(isUnlocked(3, { 1: 3 })).toBe(false)
  })

  it('suggests the first unsolved level, or the last one when all are done', () => {
    expect(nextLevel({}, 60)).toBe(1)
    expect(nextLevel({ 1: 3, 2: 1 }, 60)).toBe(3)
    const all = Object.fromEntries(Array.from({ length: 60 }, (_, i) => [i + 1, 3]))
    expect(nextLevel(all, 60)).toBe(60)
  })

  it('adds up solved levels and stars', () => {
    expect(levelTotals({ 1: 3, 2: 2, 3: 1 })).toEqual({ solved: 3, stars: 6 })
  })
})

describe('the level list', () => {
  it('has 60 levels, numbered in order', () => {
    expect(LEVEL_PUZZLES).toHaveLength(60)
    LEVEL_PUZZLES.forEach((p, i) => expect(p.id).toBe(`level-${i + 1}`))
  })

  it('never gets smaller: weights go 3, 4, 5, 6, 7 as levels go up', () => {
    const sizes = LEVEL_PUZZLES.map((p) => p.weights.length)
    expect(sizes[0]).toBe(3)
    expect(sizes.at(-1)).toBe(7)
    for (let i = 1; i < sizes.length; i++) expect(sizes[i]).toBeGreaterThanOrEqual(sizes[i - 1])
  })
})
