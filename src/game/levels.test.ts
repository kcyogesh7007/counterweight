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
  // The real list has sections starting at levels 1, 6, 13, 26 and 41
  const L = LEVEL_PUZZLES

  it('the first level of every section is always open', () => {
    for (const first of [1, 6, 13, 26, 41]) expect(isUnlocked(first, {}, L)).toBe(true)
  })

  it('inside a section, a level opens after the one before is solved', () => {
    expect(isUnlocked(2, {}, L)).toBe(false)
    expect(isUnlocked(2, { 1: 1 }, L)).toBe(true) // even 1 star is enough
    expect(isUnlocked(3, { 1: 3 }, L)).toBe(false)
    expect(isUnlocked(42, {}, L)).toBe(false) // Fiendish 2 needs Fiendish 1
    expect(isUnlocked(42, { 41: 2 }, L)).toBe(true)
  })

  it('every other level starts locked (only the 5 section starts are open)', () => {
    const open = L.map((_, i) => i + 1).filter((n) => isUnlocked(n, {}, L))
    expect(open).toEqual([1, 6, 13, 26, 41])
  })

  it('a level number that does not exist is never open', () => {
    expect(isUnlocked(61, {}, L)).toBe(false)
    expect(isUnlocked(0, {}, L)).toBe(false)
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
