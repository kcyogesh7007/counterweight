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

import { useId, useMemo, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { collectBars, collectHooks, getTiltDegrees } from '../game/balance.ts'
import { SIZES, computeLayout, weightRadius, type MobileLayout } from '../game/layout.ts'
import type { Hint } from '../game/hints.ts'
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
  /** Unique names of the shading recipes in <defs> (see ShadingDefs). */
  ids: ShadingIds
  /** The hint being shown (a hook or bar to highlight), or null. */
  hint: Hint | null
  /** True for a picture only (e.g. the How-to-play cards): hooks can't be tapped or focused. */
  readOnly: boolean
}

type ShadingIds = { wood: string; brass: string; bead: string; shadow: string }

/**
 * Reusable "shading recipes" for the drawing, defined once inside the SVG:
 *   wood   – the bars: glossy gold, bright along the top, darker underneath
 *   brass  – joints, caps and screws: a shiny gold sphere
 *   bead   – laid OVER a weight's colour: light top-left, shadow bottom-right
 *   shadow – a soft drop shadow (deeper, for the dark room)
 * Colours come from CSS variables in global.css.
 * Each recipe needs a unique id; useId() gives us one that can't clash.
 */
function ShadingDefs({ ids }: { ids: ShadingIds }) {
  return (
    <defs>
      <linearGradient id={ids.wood} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" style={{ stopColor: 'var(--beam-light)' }} />
        <stop offset="35%" style={{ stopColor: 'var(--beam-mid)' }} />
        <stop offset="70%" style={{ stopColor: 'var(--beam-dark)' }} />
        <stop offset="100%" style={{ stopColor: 'var(--beam-mid)' }} />
      </linearGradient>
      <radialGradient id={ids.brass} cx="35%" cy="30%" r="75%">
        <stop offset="0%" style={{ stopColor: 'var(--brass-light)' }} />
        <stop offset="45%" style={{ stopColor: 'var(--brass-mid)' }} />
        <stop offset="100%" style={{ stopColor: 'var(--brass-dark)' }} />
      </radialGradient>
      <radialGradient id={ids.bead} cx="34%" cy="26%" r="85%">
        <stop offset="0%" stopColor="#fff" stopOpacity="0.45" />
        <stop offset="30%" stopColor="#fff" stopOpacity="0.08" />
        <stop offset="62%" stopColor="#000" stopOpacity="0" />
        <stop offset="100%" stopColor="#000" stopOpacity="0.38" />
      </radialGradient>
      <filter id={ids.shadow} x="-30%" y="-50%" width="160%" height="260%">
        <feDropShadow dx="0" dy="2.5" stdDeviation="2.2" style={{ floodColor: 'var(--shadow-color)' }} floodOpacity="0.6" />
      </filter>
    </defs>
  )
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
  /** True to play the "you did it!" sparkle burst (fresh solves only). */
  celebrate: boolean
  /** A hint to show on the drawing (see game/hints.ts), or null. */
  hint?: Hint | null
  /** A picture only: nothing can be tapped (used on the How-to-play cards). */
  readOnly?: boolean
  onHookTap: (hookId: string) => void
  onWeightPointerDown: (event: PointerEvent, hookId: string, weight: number) => void
}

export function MobileView(props: MobileViewProps) {
  const { puzzle, placement, selected, isDragging, dropTargetId, solved, celebrate, hint = null, readOnly = false, onHookTap, onWeightPointerDown } = props
  // Only recalculate the layout when the puzzle changes (not on every tap).
  const layout = useMemo(() => computeLayout(puzzle.root), [puzzle])
  const { x, y, width, height } = layout.viewBox

  const bars = collectBars(puzzle.root)
  const hookCount = collectHooks(puzzle.root).length
  // useId gives a unique text like ":r1:"; we strip the colons so it's safe inside url(#…).
  const uid = useId().replace(/:/g, '')
  const ids: ShadingIds = {
    wood: `wood${uid}`,
    brass: `brass${uid}`,
    bead: `bead${uid}`,
    shadow: `shadow${uid}`,
  }
  const ctx: DrawContext = { layout, placement, dropTargetId, onHookTap, onWeightPointerDown, ids, hint, readOnly }
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
        className={`mobile${isHolding ? ' is-holding' : ''}${solved ? ' is-solved' : ''}${celebrate ? ' is-celebrating' : ''}`}
        viewBox={`${x} ${y} ${width} ${height}`}
        // Never draw bigger than 1.5× natural size, so small mobiles (like the
        // tutorial) don't balloon to fill the screen.
        style={{ maxWidth: width * MAX_SCALE }}
        role="group"
        aria-label={`A mobile with ${bars.length} bars and ${hookCount} hooks`}
      >
        <ShadingDefs ids={ids} />

        {/* The ceiling mount the whole mobile hangs from: a wooden plate with two brass screws */}
        <rect className="mobile-ceiling" x={-34} y={-9} width={68} height={11} rx={5.5} fill={`url(#${ids.wood})`} filter={`url(#${ids.shadow})`} />
        <rect className="mobile-bar-shine" x={-28} y={-8} width={56} height={1.3} rx={0.65} />
        <circle cx={-23} cy={-3.5} r={2.4} fill={`url(#${ids.brass})`} />
        <circle cx={23} cy={-3.5} r={2.4} fill={`url(#${ids.brass})`} />
        {/* A small gold ring where the main string is tied on */}
        <circle className="mobile-eyelet" cx={0} cy={3.5} r={2.6} />
        <NodeView node={puzzle.root} ctx={ctx} />
        {celebrate && <Sparkles x={x} y={y} width={width} height={height} />}
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

/** An arm's length in notches, shown above the arm like a measurement on a drawing: |—— 5 ——| */
function ArmLength({ from, to, notches, beam }: { from: number; to: number; notches: number; beam: number }) {
  const y = -beam / 2 - 10 // just above the bar
  const start = Math.min(from, to) + 4 // stop short of the pivot and the tip
  const end = Math.max(from, to) - 4
  const middle = (from + to) / 2
  const tagWidth = notches >= 10 ? 20 : 15
  return (
    <g className="mobile-arm-length" aria-hidden="true">
      {/* The measuring line, with a tick at each end */}
      <line className="mobile-ruler" x1={start} y1={y} x2={end} y2={y} />
      <line className="mobile-ruler" x1={start} y1={y - 3.5} x2={start} y2={y + 3.5} />
      <line className="mobile-ruler" x1={end} y1={y - 3.5} x2={end} y2={y + 3.5} />
      {/* A dark tag behind the number makes a gap in the line */}
      <rect className="mobile-ruler-tag" x={middle - tagWidth / 2} y={y - 7} width={tagWidth} height={14} rx={3} />
      <text className="mobile-notch-label" x={middle} y={y + 3.8}>
        {notches}
      </text>
    </g>
  )
}

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

  // The beam is a rounded rectangle from the left tip to the right tip.
  const beam = SIZES.beamThickness
  const ids = ctx.ids

  return (
    <g>
      {/* String from the hanging point down to this bar's pivot */}
      <line className="mobile-string" x1={0} y1={0} x2={0} y2={SIZES.barString} />

      {/* Everything below is positioned relative to the pivot, then tilted */}
      <g className="mobile-swing" style={{ transform: `translate(0px, ${SIZES.barString}px) rotate(${tilt}deg)` }}>
        {/* Hint "start here": a soft gold glow behind this bar */}
        {ctx.hint?.kind === 'foothold' && ctx.hint.barId === bar.id && (
          <rect
            className="mobile-bar-hint"
            x={leftEnd - beam / 2 - 6}
            y={-beam / 2 - 6}
            width={rightEnd - leftEnd + beam + 12}
            height={beam + 12}
            rx={beam / 2 + 6}
          />
        )}
        {/* The bar: glossy gold with a soft shadow, a bright line of light
            along the top, and a darker edge underneath */}
        <rect
          className="mobile-bar"
          x={leftEnd - beam / 2}
          y={-beam / 2}
          width={rightEnd - leftEnd + beam}
          height={beam}
          rx={beam / 2}
          fill={`url(#${ids.wood})`}
          filter={`url(#${ids.shadow})`}
        />
        <rect className="mobile-bar-shine" x={leftEnd} y={-beam / 2 + 1} width={rightEnd - leftEnd} height={1.3} rx={0.65} />

        {/* Notch marks: small engraved lines across the bar, one per notch
            (the last notch is the tip, where the gold cap sits) */}
        {[...notchPositions(bar.leftNotches - 1, -unit), ...notchPositions(bar.rightNotches - 1, unit)].map((nx) => (
          <g key={nx}>
            <line className="mobile-notch" x1={nx} y1={-beam / 2 + 1.5} x2={nx} y2={beam / 2 - 1.5} />
            <line className="mobile-notch-light" x1={nx + 0.9} y1={-beam / 2 + 1.5} x2={nx + 0.9} y2={beam / 2 - 1.5} />
          </g>
        ))}

        {/* Gold end caps at both tips, where the strings hang from */}
        <circle className="mobile-rivet" cx={leftEnd} cy={0} r={3.4} fill={`url(#${ids.brass})`} />
        <circle className="mobile-rivet" cx={rightEnd} cy={0} r={3.4} fill={`url(#${ids.brass})`} />

        {/* How long each arm is (in notches), drawn like a ruler measurement
            so it can't be mistaken for a weight */}
        <ArmLength from={0} to={leftEnd} notches={bar.leftNotches} beam={beam} />
        <ArmLength from={0} to={rightEnd} notches={bar.rightNotches} beam={beam} />

        {/* The pivot: a gold ball joint in a dark collar, with a bright
            highlight. It glows (and turns emerald) when the puzzle is solved. */}
        <circle className="mobile-pivot-collar" cx={0} cy={0} r={7.6} />
        <circle className="mobile-pivot" cx={0} cy={0} r={6.2} fill={`url(#${ids.brass})`} filter={`url(#${ids.shadow})`} />
        <circle className="mobile-pivot-shine" cx={-2} cy={-2.2} r={1.7} />

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
  // Hint pointing at this hook: a wrong weight here, or "the N goes here"
  const hookHint = ctx.hint && ctx.hint.kind !== 'foothold' && ctx.hint.hookId === hook.id ? ctx.hint : null
  if (hookHint) classes.push('is-hinted')

  return (
    <g
      className={classes.join(' ')}
      data-hook-id={hook.id}
      // In a read-only picture the hook is not a button at all.
      role={ctx.readOnly ? undefined : 'button'}
      tabIndex={ctx.readOnly ? undefined : 0}
      aria-label={ctx.readOnly ? undefined : label}
      onClick={ctx.readOnly ? undefined : () => ctx.onHookTap(hook.id)}
      onKeyDown={ctx.readOnly ? undefined : handleKeyDown}
      onPointerDown={ctx.readOnly ? undefined : (event) => weight !== undefined && ctx.onWeightPointerDown(event, hook.id, weight)}
    >
      <line className="mobile-string" x1={0} y1={0} x2={0} y2={hookTop} />
      {/* A small gold ring the string is tied to, then the "J" hook below it */}
      <circle className="mobile-eyelet" cx={0} cy={hookTop - 1.5} r={2} />
      <path className="mobile-hook" d={`M 0 ${hookTop + 0.5} V ${hookBottom - 4} A 4 4 0 0 1 -8 ${hookBottom - 4} l 0.6 -1.6`} />

      {weight === undefined ? (
        // Empty hook: a dashed circle showing where a weight can go
        <>
          <circle className="mobile-empty" cx={0} cy={hookBottom + SIZES.emptyRadius} r={SIZES.emptyRadius} />
          {/* "The N goes here": a faint ghost of the number in the empty circle */}
          {hookHint?.kind === 'place' && (
            <text className="mobile-hint-ghost" x={0} y={hookBottom + SIZES.emptyRadius}>
              {hookHint.weight}
            </text>
          )}
        </>
      ) : (
        <WeightShape weight={weight} cx={0} cy={hookBottom + weightRadius(weight)} ids={ctx.ids} />
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

/** A glossy coloured bead with its number. */
function WeightShape({ weight, cx, cy, ids }: { weight: number; cx: number; cy: number; ids: ShadingIds }) {
  const r = weightRadius(weight)
  return (
    <g className="mobile-weight">
      {/* 1. the glossy coloured ball, with a soft shadow underneath */}
      <circle className="mobile-weight-disc" cx={cx} cy={cy} r={r} style={{ fill: `var(--weight-${weight})` }} filter={`url(#${ids.shadow})`} />
      {/* 2. light and shade on top, so it looks round */}
      <circle cx={cx} cy={cy} r={r} fill={`url(#${ids.bead})`} />
      {/* 3. a soft light bouncing up from below (rim light) */}
      <path
        className="mobile-weight-rim"
        d={`M ${cx - r * 0.62} ${cy + r * 0.5} A ${r * 0.8} ${r * 0.8} 0 0 0 ${cx + r * 0.62} ${cy + r * 0.5}`}
      />
      {/* 4. a crisp curved shine near the top-left */}
      <ellipse
        className="mobile-weight-shine"
        cx={cx - r * 0.3}
        cy={cy - r * 0.48}
        rx={r * 0.36}
        ry={r * 0.17}
        transform={`rotate(-24 ${cx - r * 0.3} ${cy - r * 0.48})`}
      />
      <text className="mobile-weight-label" x={cx} y={cy + 0.5}>
        {weight}
      </text>
    </g>
  )
}

/**
 * The win celebration: little gold and coloured sparkles burst out from the middle of
 * the mobile and fade. Each sparkle gets its own direction through CSS
 * variables (--dx, --dy); the animation itself is in MobileView.css.
 */
function Sparkles({ x, y, width, height }: { x: number; y: number; width: number; height: number }) {
  const centreX = x + width / 2
  const centreY = y + height * 0.42
  const count = 24
  // The group sits at the centre; each sparkle starts at (0, 0) inside it and
  // its CSS animation moves it outwards by (--dx, --dy).
  return (
    <g className="sparkles" aria-hidden="true" transform={`translate(${centreX} ${centreY})`}>
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2
        const reach = (i % 2 === 0 ? 0.46 : 0.32) // alternate long and short bursts
        const dx = Math.cos(angle) * width * reach
        const dy = Math.sin(angle) * height * reach
        const style = {
          '--dx': `${dx.toFixed(1)}px`,
          '--dy': `${dy.toFixed(1)}px`,
          fill: i % 3 === 0 ? 'var(--gold-light)' : `var(--weight-${(i % 9) + 1})`,
          animationDelay: `calc(var(--tilt-duration) + ${(i % 4) * 40}ms)`,
        } as CSSProperties
        // A 4-point star, drawn around (0, 0).
        return (
          <path
            key={i}
            className="sparkle"
            d="M0 -6 L1.6 -1.6 L6 0 L1.6 1.6 L0 6 L-1.6 1.6 L-6 0 L-1.6 -1.6 Z"
            style={style}
          />
        )
      })}
    </g>
  )
}

/** x positions of the notch dots along one arm: e.g. 3 notches, unit 20 -> [20, 40, 60]. */
function notchPositions(notches: number, unit: number): number[] {
  return Array.from({ length: notches }, (_, i) => (i + 1) * unit)
}
