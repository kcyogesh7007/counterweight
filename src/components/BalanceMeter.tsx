// BalanceMeter.tsx — the tutorial's live "maths helper".
//
// For every bar it shows each side's pull, worked out the way the game does:
//   pull = (total weight hanging on that side) × (notches on that side)
// and whether the bar is level or which way it tips. It updates as you play,
// so you can SEE why a bar tips and what would level it.

import { collectBars, getTorques, totalWeight } from '../game/balance.ts'
import type { Placement, Puzzle } from '../game/types.ts'
import './BalanceMeter.css'

export function BalanceMeter({ puzzle, placement }: { puzzle: Puzzle; placement: Placement }) {
  const bars = collectBars(puzzle.root)

  return (
    <div className="meter" aria-label="Balance meter">
      <p className="meter-title">Pull on each side = weight × notches</p>
      <ul className="meter-list">
        {bars.map((bar) => {
          const leftWeight = totalWeight(bar.left, placement)
          const rightWeight = totalWeight(bar.right, placement)
          const { left, right } = getTorques(bar, placement)
          const empty = left === 0 && right === 0

          let state = 'level ✓'
          let stateClass = 'is-level'
          if (empty) {
            state = 'empty'
            stateClass = 'is-empty'
          } else if (left > right) {
            state = 'tips left'
            stateClass = 'is-tipping'
          } else if (right > left) {
            state = 'tips right'
            stateClass = 'is-tipping'
          }

          return (
            <li key={bar.id} className={`meter-row ${stateClass}`}>
              <span className="meter-name">{puzzle.barNames?.[bar.id] ?? `Bar ${bar.id}`}</span>
              <span className="meter-sum">
                <span className="meter-side">
                  {leftWeight} × {bar.leftNotches} = <strong>{left}</strong>
                </span>
                <span className="meter-vs" aria-hidden="true">
                  {left === right ? '=' : left > right ? '>' : '<'}
                </span>
                <span className="meter-side">
                  {rightWeight} × {bar.rightNotches} = <strong>{right}</strong>
                </span>
              </span>
              <span className="meter-state">{state}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
