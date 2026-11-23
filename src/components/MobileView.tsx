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
}

type ShadingIds = { wood: string; brass: string; bead: string; shadow: string }

/**
 * Reusable "shading recipes" for the drawing, defined once inside the SVG:
 *   wood   – the beam: lighter on top, darker underneath (a rounded look)
 *   brass  – pivots and rivets: a shiny metal sphere
 *   bead   – laid OVER a weight's colour: light top-left, shadow bottom-right
 *   shadow – a soft drop shadow
 * Colours come from CSS variables, so dark mode changes them automatically.
 * Each recipe needs a unique id; useId() gives us one that can't clash.
 */
function ShadingDefs({ ids }: { ids: ShadingIds }) {
  return (
    <defs>
      <linearGradient id={ids.wood} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" style={{ stopColor: 'var(--beam-light)' }} />
        <stop offset="55%" style={{ stopColor: 'var(--beam-mid)' }} />
        <stop offset="100%" style={{ stopColor: 'var(--beam-dark)' }} />
      </linearGradient>
      <radialGradient id={ids.brass} cx="35%" cy="30%" r="75%">
        <stop offset="0%" style={{ stopColor: 'var(--brass-light)' }} />
        <stop offset="55%" style={{ stopColor: 'var(--brass-mid)' }} />
        <stop offset="100%" style={{ stopColor: 'var(--brass-dark)' }} />
      </radialGradient>
      <radialGradient id={ids.bead} cx="34%" cy="28%" r="80%">
        <stop offset="0%" stopColor="#fff" stopOpacity="0.55" />
        <stop offset="22%" stopColor="#fff" stopOpacity="0.12" />
        <stop offset="60%" stopColor="#fff" stopOpacity="0" />
        <stop offset="100%" stopColor="#000" stopOpacity="0.18" />
      </radialGradient>
      <filter id={ids.shadow} x="-20%" y="-40%" width="140%" height="220%">
        <feDropShadow dx="0" dy="1.6" stdDeviation="1.4" style={{ floodColor: 'var(--shadow-color)' }} floodOpacity="0.28" />
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
  onHookTap: (hookId: string) => void
  onWeightPointerDown: (event: PointerEvent, hookId: string, weight: number) => void
}

export function MobileView(props: MobileViewProps) {
  const { puzzle, placement, selected, isDragging, dropTargetId, solved, celebrate, onHookTap, onWeightPointerDown } = props
  // Only recalculate the layout when the puzzle changes (not on every tap).
  const layout = useMemo(() => computeLayout(puzzle.root), [puzzle])
  const { x, y, width, height } = layout.viewBox

  const bars = collectBars(puzzle.root)
  const hookCount = collectHooks(puzzle.root).length
  // useId gives a unique text like ":r1:"; we strip the colons so it's safe inside url(#…).
  const uid = useId().replace(/:/g, '')
  const ids: ShadingIds = { wood: `wood${uid}`, brass: `brass${uid}`, bead: `bead${uid}`, shadow: `shadow${uid}` }
  const ctx: DrawContext = { layout, placement, dropTargetId, onHookTap, onWeightPointerDown, ids }
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
        <rect className="mobile-ceiling" x={-32} y={-8} width={64} height={11} rx={5.5} fill={`url(#${ids.wood})`} filter={`url(#${ids.shadow})`} />
        <circle cx={-21} cy={-2.5} r={2.2} fill={`url(#${ids.brass})`} />
        <circle cx={21} cy={-2.5} r={2.2} fill={`url(#${ids.brass})`} />
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
        {/* The beam: wood shading + soft shadow, then a thin light edge along the top */}
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
        <rect
          className="mobile-bar-shine"
          x={leftEnd}
          y={-beam / 2 + 1.2}
          width={rightEnd - leftEnd}
          height={1.6}
          rx={0.8}
        />

        {/* Notch marks: one small inset dot per notch on each arm */}
        {notchPositions(bar.leftNotches - 1, -unit).map((nx) => (
          <circle key={`l${nx}`} className="mobile-notch" cx={nx} cy={0.5} r={1.5} />
        ))}
        {notchPositions(bar.rightNotches - 1, unit).map((nx) => (
          <circle key={`r${nx}`} className="mobile-notch" cx={nx} cy={0.5} r={1.5} />
        ))}

        {/* Brass rivets at both tips, where the strings hang from */}
        <circle className="mobile-rivet" cx={leftEnd} cy={0} r={2.6} fill={`url(#${ids.brass})`} />
        <circle className="mobile-rivet" cx={rightEnd} cy={0} r={2.6} fill={`url(#${ids.brass})`} />

        {/* Notch numbers, above the middle of each arm */}
        <text className="mobile-notch-label" x={leftEnd / 2} y={-beam / 2 - 5}>
          {bar.leftNotches}
        </text>
        <text className="mobile-notch-label" x={rightEnd / 2} y={-beam / 2 - 5}>
          {bar.rightNotches}
        </text>

        {/* The pivot: a polished brass knob (turns green when solved) */}
        <circle className="mobile-pivot" cx={0} cy={0} r={6} fill={`url(#${ids.brass})`} filter={`url(#${ids.shadow})`} />
        <circle className="mobile-pivot-shine" cx={-1.8} cy={-2} r={1.6} />

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
      {/* A small brass "J" hook: down a little, then curve up to the left */}
      <path className="mobile-hook" d={`M 0 ${hookTop} V ${hookBottom - 4} A 4 4 0 0 1 -8 ${hookBottom - 4}`} />

      {weight === undefined ? (
        // Empty hook: a dashed circle showing where a weight can go
        <circle className="mobile-empty" cx={0} cy={hookBottom + SIZES.emptyRadius} r={SIZES.emptyRadius} />
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
      {/* 1. the bead's colour, with a soft shadow underneath */}
      <circle className="mobile-weight-disc" cx={cx} cy={cy} r={r} style={{ fill: `var(--weight-${weight})` }} filter={`url(#${ids.shadow})`} />
      {/* 2. light and shade on top, so it looks round */}
      <circle cx={cx} cy={cy} r={r} fill={`url(#${ids.bead})`} />
      {/* 3. a crisp little shine near the top-left */}
      <ellipse className="mobile-weight-shine" cx={cx - r * 0.36} cy={cy - r * 0.45} rx={r * 0.26} ry={r * 0.16} transform={`rotate(-30 ${cx - r * 0.36} ${cy - r * 0.45})`} />
      <text className="mobile-weight-label" x={cx} y={cy}>
        {weight}
      </text>
    </g>
  )
}

/**
 * The win celebration: little coloured sparkles burst out from the middle of
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
          fill: `var(--weight-${(i % 7) + 1})`,
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
