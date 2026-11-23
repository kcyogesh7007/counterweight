// MobileView.tsx — draws the mobile as an SVG picture.
//
// HOW IT'S BUILT
// SVG lets us group shapes with <g> and move a whole group with
// transform="translate(x, y)". We use that to draw the tree recursively:
//
//   <NodeView> is drawn at the point it hangs from (0, 0 in its own group).
//     - A BAR draws: its string down to the pivot, the bar, the notches,
//       then a <NodeView> for each child, moved to the end of each arm.
//     - A HOOK draws: its string, the little hook, and its weight (or a
//       dashed circle if empty).
//
// Because every child is positioned relative to its parent, we never have
// to work out absolute coordinates by hand.
//
// TILTING: each bar's group is rotated by its tilt angle (from balance.ts),
// and each child's group is rotated BACK by the same angle, so strings and
// weights always hang straight down. The rotation is set with a CSS
// `transform`, so a CSS `transition` animates it smoothly: when a weight is
// hung, the bars swing to their new angles instead of jumping.
//
// TAPPING: each hook has an invisible 44-unit-wide rectangle on top of it.
// That's what the player actually taps, so small hooks are still easy to hit.

import { useMemo, type KeyboardEvent, type PointerEvent } from 'react'
import { collectBars, collectHooks, getTiltDegrees } from '../game/balance.ts'
import { SIZES, computeLayout, weightRadius, type MobileLayout } from '../game/layout.ts'
import type { Bar, Hook, MobileNode, Placement, Puzzle } from '../game/types.ts'
import './MobileView.css'

/** Largest zoom we allow (1 SVG unit = at most 1.5 screen pixels). */
const MAX_SCALE = 1.5

/** Things every part of the drawing needs to know. Passed down the tree. */
type DrawContext = {
  layout: MobileLayout
  /** Which weight is on which hook. */
  placement: Placement
  /** The hook a dragged weight is over right now (highlighted), or null. */
  dropTargetId: string | null
  /** Called when the player taps a hook. */
  onHookTap: (hookId: string) => void
  /** Called when the player presses on a hung weight (it may become a drag). */
  onWeightPointerDown: (event: PointerEvent, hookId: string, weight: number) => void
}

type MobileViewProps = {
  puzzle: Puzzle
  placement: Placement
  selected: number | null
  /** True while the player drags a weight: empty hooks light up. */
  isDragging: boolean
  dropTargetId: string | null
  /** True once every bar balances: pivots turn green and hooks stop responding. */
  solved: boolean
  onHookTap: (hookId: string) => void
  onWeightPointerDown: (event: PointerEvent, hookId: string, weight: number) => void
}

export function MobileView(props: MobileViewProps) {
  const { puzzle, placement, selected, isDragging, dropTargetId, solved, onHookTap, onWeightPointerDown } = props
  // Only recalculate the layout when the puzzle changes (not on every tap).
  const layout = useMemo(() => computeLayout(puzzle.root), [puzzle])
  const { x, y, width, height } = layout.viewBox

  const bars = collectBars(puzzle.root)
  const hookCount = collectHooks(puzzle.root).length
  const ctx: DrawContext = { layout, placement, dropTargetId, onHookTap, onWeightPointerDown }
  const isHolding = selected !== null || isDragging

  return (
    <>
      {/* Screen readers can't "see" a bar tilt, so we describe each bar in
          hidden text. Same information as the picture, nothing more. */}
      <ul className="visually-hidden" aria-label="Bars">
        {bars.map((bar) => (
          <li key={bar.id}>{describeBar(bar, placement)}</li>
        ))}
      </ul>

      <svg
        className={`mobile${isHolding ? ' is-holding' : ''}${solved ? ' is-solved' : ''}`}
        viewBox={`${x} ${y} ${width} ${height}`}
        // Never draw bigger than 1.5× natural size, so small mobiles (like the
        // tutorial) don't balloon to fill the screen.
        style={{ maxWidth: width * MAX_SCALE }}
        role="group"
        aria-label={`A mobile with ${bars.length} bars and ${hookCount} hooks`}
      >
        {/* The ceiling the whole mobile hangs from */}
        <line className="mobile-ceiling" x1={-24} y1={0} x2={24} y2={0} />
        <NodeView node={puzzle.root} ctx={ctx} />
      </svg>
    </>
  )
}

/** e.g. "Bar B, 3 notches left, 4 notches right: right side lower." */
function describeBar(bar: Bar, placement: Placement): string {
  const tilt = getTiltDegrees(bar, placement)
  const state = tilt === 0 ? 'level' : tilt > 0 ? 'right side lower' : 'left side lower'
  const notches = (n: number) => `${n} ${n === 1 ? 'notch' : 'notches'}`
  return `Bar ${bar.id}, ${notches(bar.leftNotches)} left, ${notches(bar.rightNotches)} right: ${state}.`
}

// ---------- Drawing one node (a bar or a hook) ----------

function NodeView({ node, ctx }: { node: MobileNode; ctx: DrawContext }) {
  if (node.kind === 'hook') return <HookView hook={node} ctx={ctx} />
  return <BarView bar={node} ctx={ctx} />
}

function BarView({ bar, ctx }: { bar: Bar; ctx: DrawContext }) {
  const unit = ctx.layout.notchUnit[bar.id]
  const leftEnd = -bar.leftNotches * unit // x of the left arm's tip
  const rightEnd = bar.rightNotches * unit // x of the right arm's tip
  // Degrees to rotate: positive = right side dips, negative = left side dips, 0 = level.
  const tilt = getTiltDegrees(bar, ctx.placement)

  return (
    <g>
      {/* String from the hanging point down to this bar's pivot */}
      <line className="mobile-string" x1={0} y1={0} x2={0} y2={SIZES.barString} />

      {/* Everything below is positioned relative to the pivot, then tilted */}
      <g className="mobile-swing" style={{ transform: `translate(0px, ${SIZES.barString}px) rotate(${tilt}deg)` }}>
        {/* The bar itself */}
        <line className="mobile-bar" x1={leftEnd} y1={0} x2={rightEnd} y2={0} />

        {/* Notch marks: one small dot per notch on each arm */}
        {notchPositions(bar.leftNotches, -unit).map((nx) => (
          <circle key={`l${nx}`} className="mobile-notch" cx={nx} cy={0} r={1.6} />
        ))}
        {notchPositions(bar.rightNotches, unit).map((nx) => (
          <circle key={`r${nx}`} className="mobile-notch" cx={nx} cy={0} r={1.6} />
        ))}

        {/* Notch numbers, above the middle of each arm */}
        <text className="mobile-notch-label" x={leftEnd / 2} y={-8}>
          {bar.leftNotches}
        </text>
        <text className="mobile-notch-label" x={rightEnd / 2} y={-8}>
          {bar.rightNotches}
        </text>

        {/* The pivot (where this bar hangs from) */}
        <circle className="mobile-pivot" cx={0} cy={0} r={4.5} />

        {/* Children, hanging from each arm's tip. rotate(-tilt) undoes the
            bar's tilt so strings always hang straight down. */}
        <g className="mobile-swing" style={{ transform: `translate(${leftEnd}px, 0px) rotate(${-tilt}deg)` }}>
          <NodeView node={bar.left} ctx={ctx} />
        </g>
        <g className="mobile-swing" style={{ transform: `translate(${rightEnd}px, 0px) rotate(${-tilt}deg)` }}>
          <NodeView node={bar.right} ctx={ctx} />
        </g>
      </g>
    </g>
  )
}

function HookView({ hook, ctx }: { hook: Hook; ctx: DrawContext }) {
  const weight = ctx.placement[hook.id] // undefined = empty
  const hookTop = SIZES.hookString
  const hookBottom = hookTop + SIZES.hookHeight
  const tapAreaHeight = hookBottom + 2 * SIZES.weightMaxRadius

  // Words a screen reader says for this hook, e.g. "Hook c1, holding 3".
  const label = weight === undefined ? `Hook ${hook.id}, empty` : `Hook ${hook.id}, holding ${weight}`

  // Let keyboard users press Enter or Space as well as clicking.
  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      ctx.onHookTap(hook.id)
    }
  }

  const classes = ['mobile-hook-group']
  if (weight !== undefined) classes.push('has-weight') // can be dragged away
  if (ctx.dropTargetId === hook.id) classes.push('is-drop-target')

  return (
    <g
      className={classes.join(' ')}
      data-hook-id={hook.id}
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={() => ctx.onHookTap(hook.id)}
      onKeyDown={handleKeyDown}
      onPointerDown={(event) => weight !== undefined && ctx.onWeightPointerDown(event, hook.id, weight)}
    >
      <line className="mobile-string" x1={0} y1={0} x2={0} y2={hookTop} />
      {/* A small "J" shape: down a little, then curve up to the left */}
      <path className="mobile-hook" d={`M 0 ${hookTop} V ${hookBottom - 4} A 4 4 0 0 1 -8 ${hookBottom - 4}`} />

      {weight === undefined ? (
        // Empty hook: a dashed circle showing where a weight can go
        <circle className="mobile-empty" cx={0} cy={hookBottom + SIZES.emptyRadius} r={SIZES.emptyRadius} />
      ) : (
        <WeightShape weight={weight} cx={0} cy={hookBottom + weightRadius(weight)} />
      )}

      {/* The invisible tap area, drawn last so it sits on top */}
      <rect
        className="mobile-tap-area"
        x={-SIZES.hookHalfWidth}
        y={hookTop - 8}
        width={2 * SIZES.hookHalfWidth}
        height={tapAreaHeight - hookTop + 8}
        rx={10}
      />
    </g>
  )
}

/** A coloured disc with its number. Exported so the tray (Step 5) can reuse it. */
export function WeightShape({ weight, cx, cy }: { weight: number; cx: number; cy: number }) {
  const r = weightRadius(weight)
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} style={{ fill: `var(--weight-${weight})` }} />
      <text className="mobile-weight-label" x={cx} y={cy}>
        {weight}
      </text>
    </g>
  )
}

/** x positions of the notch dots along one arm: e.g. 3 notches, unit 20 -> [20, 40, 60]. */
function notchPositions(notches: number, unit: number): number[] {
  return Array.from({ length: notches }, (_, i) => (i + 1) * unit)
}
