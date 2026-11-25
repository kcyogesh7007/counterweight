import { describe, expect, it } from 'vitest'
import { GAME_URL, shareText } from './share.ts'

describe('shareText', () => {
  it('shows the number, time, hints, streak and link', () => {
    expect(shareText({ day: 14, elapsed: 102_000, hints: 0, streak: 3 })).toBe(
      `Counterweight #14 ⚖️\n⏱ 1:42 · 💡 0 hints\n🔥 3-day streak\n${GAME_URL}`,
    )
  })

  it('says "1 hint", and leaves out a streak of 1', () => {
    const text = shareText({ day: 2, elapsed: 5_000, hints: 1, streak: 1 })
    expect(text).toContain('💡 1 hint\n')
    expect(text).not.toContain('streak')
  })
})
