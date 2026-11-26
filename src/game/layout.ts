// layout.ts — works out SIZES for drawing the mobile. No drawing happens here.
//
// All numbers are in "SVG units". The SVG scales to fit the screen, and on a
// 360px phone one unit is roughly one pixel, so we size things in pixels.
//
// THE MAIN PROBLEM: each bar's arms must keep their notch RATIO (a 3 : 4 bar
// must look 3 : 4), but the things hanging from neighbouring arms must not
// bump into each other. So every bar gets its own "notch size" (unit):
//   - big enough that its left and right branches don't overlap,
//   - never smaller than MIN_NOTCH_UNIT, so short arms stay visible.
//
// We work BOTTOM-UP with recursion: to size a bar we first measure the two
// things hanging under it (which measure the things under THEM, and so on).

import type { Bar, MobileNode } from './types.ts'

/** Drawing sizes, in SVG units (~ pixels on a 360px phone). */
export const SIZES = {
  /** String from an arm's end (or the ceiling) down to a bar's pivot. */
  barString: 46,
  /** String from an arm's end down to a hook. */
  hookString: 32,
  /** How thick each wooden beam is drawn. */
  beamThickness: 11,
  /** Height of the little "J" hook shape. */
  hookHeight: 9,
  /** Half the width reserved for each hook: 22 each side = 44 wide, a comfortable tap target. */
  hookHalfWidth: 22,
  /** Radius of the dashed circle shown on an empty hook. */
  emptyRadius: 15,
  /** Radius of the smallest (1) and largest (10) weights. */
  weightMinRadius: 13,
  weightMaxRadius: 20,
  /** Minimum space between two neighbouring branches. */
  minGap: 12,
  /** Smallest allowed size of one notch. */
  minNotchUnit: 10,
  /** Empty space around the whole drawing (room for tilting in Step 6). */
  padSide: 8,
  padTop: 28,
  padBottom: 28,
}

/** How big to draw a weight. Heavier weights are a little bigger. */
export function weightRadius(weight: number): number {
  const { weightMinRadius: min, weightMaxRadius: max } = SIZES
  const clamped = Math.min(Math.max(weight, 1), 10)
  return min + ((clamped - 1) * (max - min)) / 9
}

/** How much space a branch needs, measured from the point it hangs from. */
type Extent = {
  /** How far it reaches to the LEFT of its hanging point. */
  left: number
  /** How far it reaches to the RIGHT of its hanging point. */
  right: number
  /** How far it reaches DOWN from its hanging point. */
  height: number
}

export type MobileLayout = {
  /** bar id -> size of one notch on that bar. Arm length = notches × unit. */
  notchUnit: Record<string, number>
  /** The visible area for the SVG's viewBox: x, y, width, height. */
  viewBox: { x: number; y: number; width: number; height: number }
}

/**
 * How many notches long to DRAW each arm. Normally the real lengths. A bar
 * with a "?" arm is drawn with two equal arms (and no notch marks), so the
 * picture doesn't give the secret length away.
 */
export function drawnNotches(bar: Bar): { left: number; right: number } {
  return bar.hidden ? { left: 3, right: 3 } : { left: bar.leftNotches, right: bar.rightNotches }
}

/** Measures one branch (recursively) and records each bar's notch size. */
function measure(node: MobileNode, notchUnit: Record<string, number>): Extent {
  if (node.kind === 'hook') {
    return {
      left: SIZES.hookHalfWidth,
      right: SIZES.hookHalfWidth,
      height: SIZES.hookString + SIZES.hookHeight + 2 * SIZES.weightMaxRadius,
    }
  }

  // Measure the two branches hanging under this bar first.
  const left = measure(node.left, notchUnit)
  const right = measure(node.right, notchUnit)

  // The left branch hangs at  −leftNotches × unit, the right at  +rightNotches × unit.
  // Distance between them = (leftNotches + rightNotches) × unit. That must fit the
  // right half of the left branch + the left half of the right branch + a gap.
  const drawn = drawnNotches(node)
  const spaceNeeded = left.right + right.left + SIZES.minGap
  const unit = Math.max(SIZES.minNotchUnit, spaceNeeded / (drawn.left + drawn.right))
  notchUnit[node.id] = unit

  return {
    left: drawn.left * unit + left.left,
    right: drawn.right * unit + right.right,
    height: SIZES.barString + Math.max(left.height, right.height),
  }
}

/** Works out every bar's notch size and the overall drawing area. */
export function computeLayout(root: MobileNode): MobileLayout {
  const notchUnit: Record<string, number> = {}
  const size = measure(root, notchUnit)
  return {
    notchUnit,
    viewBox: {
      x: -(size.left + SIZES.padSide),
      y: -SIZES.padTop,
      width: size.left + size.right + 2 * SIZES.padSide,
      height: size.height + SIZES.padTop + SIZES.padBottom,
    },
  }
}

// ---------- Checking puzzles fit on a phone ----------

/** Width (px) the mobile gets on the smallest phone we support: 360 − 2 × 16px margins. */
export const SMALLEST_PHONE_WIDTH = 328

/** Smallest comfortable distance between two hooks, in screen pixels. */
export const MIN_HOOK_SPACING_PX = 44

/** x position of every hook (bars level), left to right, in SVG units. */
export function hookXPositions(root: MobileNode, layout: MobileLayout): number[] {
  const xs: number[] = []
  function walk(node: MobileNode, x: number) {
    if (node.kind === 'hook') {
      xs.push(x)
      return
    }
    const unit = layout.notchUnit[node.id]
    const drawn = drawnNotches(node)
    walk(node.left, x - drawn.left * unit)
    walk(node.right, x + drawn.right * unit)
  }
  walk(root, 0)
  return xs.sort((a, b) => a - b)
}

/**
 * The closest two hooks get on a 360px phone, in screen pixels.
 * The drawing is shrunk (or grown, up to 1.5×) to fit SMALLEST_PHONE_WIDTH.
 */
export function minHookSpacingOnPhone(root: MobileNode): number {
  const layout = computeLayout(root)
  const scale = Math.min(SMALLEST_PHONE_WIDTH / layout.viewBox.width, 1.5)
  const xs = hookXPositions(root, layout)
  let smallest = Infinity
  for (let i = 1; i < xs.length; i++) smallest = Math.min(smallest, xs[i] - xs[i - 1])
  return smallest * scale
}
