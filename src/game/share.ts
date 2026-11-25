// share.ts — the short message people send to friends after solving the daily puzzle.
//
//   Counterweight #14 ⚖️
//   ⏱ 1:42 · 💡 0 hints
//   🔥 3-day streak
//   https://kcyogesh7007.github.io/counterweight/
//
// It never gives away the answer. The streak line only appears from 2 days up.

import { formatTime } from './moves.ts'

export const GAME_URL = 'https://kcyogesh7007.github.io/counterweight/'

export function shareText({ day, elapsed, hints, streak }: { day: number; elapsed: number; hints: number; streak: number }): string {
  const lines = [
    `Counterweight #${day} ⚖️`,
    `⏱ ${formatTime(elapsed)} · 💡 ${hints} ${hints === 1 ? 'hint' : 'hints'}`,
  ]
  if (streak >= 2) lines.push(`🔥 ${streak}-day streak`)
  lines.push(GAME_URL)
  return lines.join('\n')
}
