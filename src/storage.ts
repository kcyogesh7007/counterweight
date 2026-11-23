// storage.ts — remembers small things in the browser between visits.
//
// localStorage is a tiny key -> text store that the browser keeps for this
// website. It can be unavailable (private browsing, blocked cookies), and
// then reading or writing throws an error. We catch that and carry on:
// the worst case is that the tutorial shows again, or a solved puzzle can
// be played again.
//
// What we store:
//   counterweight:tutorialDone  "yes" once the tutorial is finished or skipped
//   counterweight:results       your result for each day you solved, e.g.
//                               {"1":{"elapsed":134000,"rehangs":2}}
//   counterweight:inProgress    today's half-finished puzzle (deleted once solved), e.g.
//                               {"day":1,"placement":{"a":7},"rehangs":0,"elapsed":42000}

const TUTORIAL_DONE_KEY = 'counterweight:tutorialDone'
const RESULTS_KEY = 'counterweight:results'
const IN_PROGRESS_KEY = 'counterweight:inProgress'

/** How you did on one day's puzzle. */
export type DayResult = {
  /** Time taken, in milliseconds. */
  elapsed: number
  rehangs: number
}

/** Has this player finished or skipped the tutorial before? */
export function hasSeenTutorial(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_DONE_KEY) === 'yes'
  } catch {
    return false
  }
}

/** Remember that the tutorial is done, so next visit starts at the puzzle. */
export function markTutorialSeen(): void {
  try {
    localStorage.setItem(TUTORIAL_DONE_KEY, 'yes')
  } catch {
    // Storage blocked: nothing we can do, and nothing breaks.
  }
}

/** Is this a sensible DayResult? (Saved data could be damaged or edited by hand.) */
function isDayResult(value: unknown): value is DayResult {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.elapsed === 'number' && Number.isFinite(v.elapsed) && v.elapsed >= 0 &&
    typeof v.rehangs === 'number' && Number.isInteger(v.rehangs) && v.rehangs >= 0
  )
}

/** Every saved result: day number -> result. Damaged entries are skipped. */
export function loadAllResults(): Record<number, DayResult> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(RESULTS_KEY) ?? '{}')
    if (typeof parsed !== 'object' || parsed === null) return {}
    const results: Record<number, DayResult> = {}
    for (const [day, result] of Object.entries(parsed)) {
      const n = Number(day)
      if (Number.isInteger(n) && n >= 1 && isDayResult(result)) results[n] = result
    }
    return results
  } catch {
    return {} // storage blocked, or the saved text isn't valid JSON
  }
}

/** Your result for one day, or null if you haven't solved it. */
export function loadResult(day: number): DayResult | null {
  return loadAllResults()[day] ?? null
}

/** A half-finished puzzle, as stored. */
export type InProgress = {
  day: number
  placement: Record<string, number>
  rehangs: number
  elapsed: number
}

/**
 * The half-finished puzzle for this day, or null. A save from another day is
 * ignored. (The game double-checks the weights against the puzzle before
 * using them; see createResumedState in moves.ts.)
 */
export function loadInProgress(day: number): InProgress | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(IN_PROGRESS_KEY) ?? 'null')
    if (typeof parsed !== 'object' || parsed === null) return null
    const p = parsed as Record<string, unknown>
    if (p.day !== day) return null
    if (typeof p.placement !== 'object' || p.placement === null) return null
    if (!Object.values(p.placement).every((w) => typeof w === 'number')) return null
    if (typeof p.rehangs !== 'number' || typeof p.elapsed !== 'number') return null
    return { day, placement: p.placement as Record<string, number>, rehangs: p.rehangs, elapsed: p.elapsed }
  } catch {
    return null
  }
}

/** Remember the puzzle in progress (called about once a second while playing). */
export function saveInProgress(progress: InProgress): void {
  try {
    localStorage.setItem(IN_PROGRESS_KEY, JSON.stringify(progress))
  } catch {
    // Storage blocked: you just can't resume after a reload.
  }
}

/** Forget the puzzle in progress (once it's solved). */
export function clearInProgress(): void {
  try {
    localStorage.removeItem(IN_PROGRESS_KEY)
  } catch {
    // Nothing to do.
  }
}

/** Save a solved day. The FIRST result for a day is kept (no re-tries for a better time). */
export function saveResult(day: number, result: DayResult): void {
  try {
    const all = loadAllResults()
    if (all[day]) return
    all[day] = { elapsed: result.elapsed, rehangs: result.rehangs }
    localStorage.setItem(RESULTS_KEY, JSON.stringify(all))
  } catch {
    // Storage blocked: the game still works, it just won't remember.
  }
}
