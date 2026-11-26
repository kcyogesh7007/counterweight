// types.ts — describes the SHAPE of our game data.
//
// TypeScript "types" don't run any code. They are a contract: if a puzzle
// is missing a field, or a number is written as text, TypeScript shows an
// error in the editor before we ever open the browser.
//
// A mobile is a TREE: the top bar holds two things, each of which is either
// a hook (the end of a branch) or another bar (which holds two more things).

/** An empty hook at the end of an arm. The player hangs exactly one weight here. */
export type Hook = {
  kind: 'hook'
  /** A short name, unique within the puzzle, e.g. "a" or "c1". */
  id: string
}

/** A horizontal bar hanging from a pivot, with a left arm and a right arm. */
export type Bar = {
  kind: 'bar'
  /** A short name, unique within the puzzle, e.g. "TOP" or "B". */
  id: string
  /** Length of the left arm, in notches (distance from the pivot). */
  leftNotches: number
  /** Length of the right arm, in notches. */
  rightNotches: number
  /**
   * Hardest levels only: one arm's length is kept secret and shown as "?".
   * The player works it out. (The game still knows it, to check balance.)
   */
  hidden?: 'left' | 'right'
  /** What hangs at the end of the left arm. */
  left: MobileNode
  /** What hangs at the end of the right arm. */
  right: MobileNode
}

/** Anything that can hang from an arm: a hook or another bar. */
export type MobileNode = Hook | Bar

/**
 * Which weight hangs on which hook: hook id -> weight.
 * A hook that is missing from this object is EMPTY.
 * Example: { a: 7, c1: 3 } means hook "a" holds 7, "c1" holds 3, the rest are empty.
 */
export type Placement = Record<string, number>

/** One complete puzzle, exactly as stored in the JSON files. */
export type Puzzle = {
  /** Unique id, e.g. "puzzle-1" or "tutorial-1". */
  id: string
  /** Name shown to the player. */
  title: string
  /** Tutorial only: the instruction shown above the mobile. */
  intro?: string
  /** Tutorial only: the explanation shown after it's solved. */
  outro?: string
  /** Tutorial only: friendly names for the bars, for the balance meter (bar id -> name). */
  barNames?: Record<string, string>
  /**
   * The weights in the tray, e.g. [1, 2, 3, 4, 5, 6, 7]. Each is used at most once.
   * Usually there is one weight per hook. Hard levels have MORE weights than
   * hooks: the extra ones are "spare" and stay in the tray.
   */
  weights: number[]
  /** The top bar of the mobile. */
  root: Bar
  /**
   * The known answer: hook id -> weight. The GAME never reads this (it wins by
   * checking balance). It is only used by the verify script and tests.
   */
  solution: Record<string, number>
}
