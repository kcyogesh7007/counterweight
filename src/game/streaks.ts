// streaks.ts — how many days in a row the player has solved the puzzle.
//
//   current: days in a row, counting back from TODAY. If today isn't solved
//            yet, a run that ended YESTERDAY still counts (you can still keep
//            it going today). Miss a whole day and it drops to 0.
//   best:    the longest run of days in a row, ever.
//
// Example: solved days 1, 2, 3, 5, 6 and today is day 6
//   -> current = 2 (days 5–6), best = 3 (days 1–3).

export type Streaks = { current: number; best: number }

/**
 * @param solvedDays day numbers the player has solved (any order, repeats are fine)
 * @param today      today's day number
 */
export function computeStreaks(solvedDays: number[], today: number): Streaks {
  const solved = new Set(solvedDays)

  // Current: start at today (or yesterday, if today isn't solved yet) and count back.
  let day = solved.has(today) ? today : today - 1
  let current = 0
  while (solved.has(day)) {
    current++
    day--
  }

  // Best: walk through the solved days in order, counting each run.
  let best = 0
  let run = 0
  let previous = -Infinity
  for (const d of [...solved].sort((a, b) => a - b)) {
    run = d === previous + 1 ? run + 1 : 1
    best = Math.max(best, run)
    previous = d
  }

  return { current, best }
}
