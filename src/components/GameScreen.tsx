// GameScreen.tsx — one playable puzzle: the mobile, the tray, and the win card.
// The same screen is used for tutorial steps and the daily puzzle.
//
// App gives this component a `key` equal to the puzzle id. When the key
// changes, React throws the old screen away and builds a fresh one, so each
// puzzle automatically starts with empty hooks, 0:00 and 0 re-hangs (or,
// if it was solved before, straight on the solved view).

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { countEvent } from '../analytics.ts'
import { findHint, hintMessage, MAX_HINTS, type Hint } from '../game/hints.ts'
import { weightRadius } from '../game/layout.ts'
import { formatTime, type SavedProgress } from '../game/moves.ts'
import type { Puzzle } from '../game/types.ts'
import { useDrag } from '../hooks/useDrag.ts'
import { useGame } from '../hooks/useGame.ts'
import { playSound } from '../sound.ts'
import type { DayResult } from '../storage.ts'
import { BalanceMeter } from './BalanceMeter.tsx'
import { BulbIcon, ClockIcon, RehangIcon, ResetIcon } from './Icons.tsx'
import { MobileView } from './MobileView.tsx'
import { weightBackground } from './weightStyle.ts'
import { WeightTray } from './WeightTray.tsx'
import { WinScreen } from './WinScreen.tsx'

type GameScreenProps = {
  puzzle: Puzzle
  /** A line under the title, e.g. the difficulty. */
  subtitle?: ReactNode
  /** Tutorial steps hide the timer and re-hangs, and show `puzzle.intro` / `puzzle.outro`. */
  isTutorial: boolean
  /** If this puzzle was solved before: start solved, showing this result. */
  earlierResult?: DayResult | null
  /** A half-finished game saved earlier: carry on from it. */
  resumeFrom?: SavedProgress | null
  /** Called about once a second while playing, with what to save. */
  onProgress?: (progress: SavedProgress) => void
  /** Button on the win card (optional). */
  /** Hide the "Every bar is level." line (Levels shows its own star message instead). */
  hideWinMessage?: boolean
  winButtonLabel?: string
  onWinButton?: () => void
  /** Extra content on the win card, e.g. the countdown to tomorrow. */
  /** Extra content on the win card. Can be a function of the result (time, re-hangs). */
  winExtra?: ReactNode | ((result: DayResult) => ReactNode)
  /** Called when the puzzle is solved, with the result (used to save it). */
  onSolved?: (result: DayResult) => void
}

export function GameScreen(props: GameScreenProps) {
  const { puzzle, subtitle, isTutorial, earlierResult, resumeFrom, onProgress, winButtonLabel, onWinButton, winExtra, onSolved, hideWinMessage } = props
  const game = useGame(puzzle, { earlierResult, resumeFrom, onProgress })
  const { drag, startDrag, shouldIgnoreClick } = useDrag(game.onDrop, !game.isSolved)
  const hungCount = Object.keys(game.placement).length

  // When the puzzle becomes solved, tell App the result (so it can be saved)
  // EXACTLY ONCE. A ref remembers that we've already told it, and holds the
  // latest onSolved function without making the effect run again.
  const { isSolved, elapsed, rehangs, hintsUsed } = game
  // (A puzzle that opens already solved, e.g. coming back to today's, was
  // reported when it was first solved, so it isn't reported again.)
  const reported = useRef(Boolean(earlierResult))
  const onSolvedRef = useRef(onSolved)
  useEffect(() => {
    onSolvedRef.current = onSolved
  })
  useEffect(() => {
    if (isSolved && !reported.current) {
      reported.current = true
      onSolvedRef.current?.({ elapsed, rehangs, hints: hintsUsed })
    }
  }, [isSolved, elapsed, rehangs, hintsUsed])

  // ---------- Hints ----------
  // The hint being shown right now (see game/hints.ts), or null. It's cleared
  // as soon as the player moves a weight (the placement changes).
  const [shownHint, setShownHint] = useState<Hint | null>(null)
  useEffect(() => {
    setShownHint(null)
  }, [game.placement])
  const hintsLeft = MAX_HINTS - hintsUsed
  function showHint() {
    const found = findHint(puzzle, game.placement)
    if (!found || hintsLeft <= 0) return
    game.onTakeHint()
    countEvent('hint-used')
    playSound('hint')
    setShownHint(found)
  }

  // ---------- Sounds ----------
  // Each sound follows a CHANGE in the game (see sound.ts). Refs remember the
  // previous state, so opening or resuming a puzzle makes no sound.
  const before = useRef({ placement: game.placement, selected: game.selected, dragging: false, solved: game.isSolved })
  const dragging = drag !== null
  const resetting = useRef(false) // set by the Reset button, so it always whooshes
  useEffect(() => {
    const prev = before.current
    before.current = { placement: game.placement, selected: game.selected, dragging, solved: game.isSolved }
    if (game.placement !== prev.placement) {
      const was = Object.keys(prev.placement).length
      const now = Object.keys(game.placement).length
      if (resetting.current) playSound('reset')
      else if (now >= was) playSound('hang') // a new weight, or a swap
      else playSound('remove')
      resetting.current = false
    } else if ((game.selected !== null && game.selected !== prev.selected) || (dragging && !prev.dragging)) {
      playSound('pick')
    }
    if (game.isSolved && !prev.solved) playSound('win') // after the last clink
  }, [game.placement, game.selected, game.isSolved, dragging])

  // While a weight is being dragged OFF a hook, draw that hook as empty
  // (the weight is "in the player's hand", following the pointer), and let
  // the bars react as if it's been lifted, like a real mobile.
  const shownPlacement = { ...game.placement }
  if (drag && drag.from !== 'tray') delete shownPlacement[drag.from]

  // Taps are ignored if they're really the end of a drag.
  const onHookTap = (hookId: string) => !shouldIgnoreClick() && game.onHookTap(hookId)
  const onWeightTap = (weight: number) => !shouldIgnoreClick() && game.onWeightTap(weight)

  // A short line telling the player what they can do next.
  let hint = 'Tap or drag a weight onto a hook.'
  if (drag) hint = drag.overHookId ? `Let go to hang the ${drag.weight}.` : 'Drag it over a hook.'
  else if (game.selected !== null) hint = `Now tap a hook to hang the ${game.selected}.`
  else if (hungCount > 0) hint = 'Tap or drag a hung weight to take it down.'
  if (shownHint && !drag) hint = hintMessage(shownHint)

  return (
    <>
      <section className="play-area" aria-label={puzzle.title}>
        <div className="puzzle-heading">
          <h2 className="puzzle-title">{puzzle.title}</h2>
          {subtitle}
        </div>
        {puzzle.intro && <p className="intro">{puzzle.intro}</p>}
        <MobileView
          puzzle={puzzle}
          placement={shownPlacement}
          selected={game.selected}
          isDragging={drag !== null}
          dropTargetId={drag?.overHookId ?? null}
          solved={game.isSolved}
          // Celebrate only a FRESH solve, not when coming back to one solved earlier.
          celebrate={game.isSolved && !earlierResult}
          hint={shownHint}
          onHookTap={onHookTap}
          onWeightPointerDown={(event, hookId, weight) => startDrag(event, weight, hookId)}
        />
        {/* Tutorial only: the live maths for every bar */}
        {isTutorial && <BalanceMeter puzzle={puzzle} placement={shownPlacement} />}
      </section>

      {/* The weight in the player's "hand" while dragging */}
      {drag && <DragGhost weight={drag.weight} x={drag.x} y={drag.y} />}

      {game.isSolved ? (
        <WinScreen
          message={hideWinMessage ? undefined : (isTutorial && puzzle.outro) || 'Every bar is level.'}
          stats={isTutorial ? undefined : { elapsed: game.elapsed, rehangs: game.rehangs, hints: hintsUsed }}
          buttonLabel={winButtonLabel}
          onButton={onWinButton}
        >
          {typeof winExtra === 'function' ? winExtra({ elapsed: game.elapsed, rehangs: game.rehangs, hints: hintsUsed }) : winExtra}
        </WinScreen>
      ) : (
        <section className="tray-panel" aria-label="Weights">
          <p className={`hint${shownHint ? ' is-hint' : ''}`} aria-live="polite">
            {hint}
          </p>
          {/* Tutorial, nothing done yet: the weights gently pulse to say "start here" */}
          <div className={isTutorial && hungCount === 0 && game.selected === null && !drag ? 'is-guiding' : undefined}>
            <WeightTray
              weights={puzzle.weights}
              placement={game.placement}
              selected={game.selected}
              liftedWeight={drag?.from === 'tray' ? drag.weight : null}
              onWeightTap={onWeightTap}
              onWeightPointerDown={(event, weight) => startDrag(event, weight, 'tray')}
            />
          </div>
          <div className="controls">
            {!isTutorial && (
              <>
                <span className="stat" title="Time">
                  <ClockIcon />
                  <span className="visually-hidden">Time</span>
                  <strong>{formatTime(game.elapsed)}</strong>
                </span>
                <span className="stat" title="Re-hangs">
                  <RehangIcon />
                  <strong>{game.rehangs}</strong>{' '}
                  {/* On narrow phones the word is hidden from view (screen readers still hear it) */}
                  <span className="stat-word">{game.rehangs === 1 ? 're-hang' : 're-hangs'}</span>
                </span>
              </>
            )}
            {!isTutorial && (
              <button
                type="button"
                className="hint-button"
                aria-label={hintsLeft > 0 ? 'Get a hint (1 per puzzle)' : 'No hints left'}
                title={hintsLeft > 0 ? 'Hint' : 'No hints left'}
                onClick={showHint}
                disabled={hintsLeft <= 0}
              >
                <BulbIcon />
                {hintsLeft > 0 && <span className="hint-badge">{hintsLeft}</span>}
              </button>
            )}
            <button
              type="button"
              className="reset-button"
              aria-label="Reset: take every weight down"
              title="Reset"
              onClick={() => {
                resetting.current = true
                game.onReset()
              }}
              disabled={hungCount === 0}
            >
              <ResetIcon />
            </button>
          </div>
        </section>
      )}
    </>
  )
}

/** The dragged weight, drawn on top of everything at the pointer. */
function DragGhost({ weight, x, y }: { weight: number; x: number; y: number }) {
  const size = 2 * weightRadius(weight) * 1.15 // a touch bigger: it's "lifted"
  return (
    <div
      className="drag-ghost"
      aria-hidden="true"
      style={{ left: x, top: y, width: size, height: size, background: weightBackground(weight) }}
    >
      {weight}
    </div>
  )
}
