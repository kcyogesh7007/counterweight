// WeightTray.tsx — the row of weights below the mobile.
//
// Every weight keeps its own slot. When a weight is hanging on the mobile,
// its slot shows an empty dashed circle, so the other weights never jump
// around as you play.

import type { PointerEvent } from 'react'
import { weightRadius } from '../game/layout.ts'
import { isHung } from '../game/moves.ts'
import { weightBackground } from './weightStyle.ts'
import type { Placement } from '../game/types.ts'
import './WeightTray.css'

type WeightTrayProps = {
  weights: number[]
  placement: Placement
  selected: number | null
  /** The weight being dragged out of the tray right now (shown faded), or null. */
  liftedWeight: number | null
  onWeightTap: (weight: number) => void
  /** Called when a finger/mouse presses a weight (it may become a drag). */
  onWeightPointerDown: (event: PointerEvent, weight: number) => void
}

/** Most weights we put in one row before wrapping (6 fit nicely on a 360px phone). */
const MAX_PER_ROW = 6

export function WeightTray(props: WeightTrayProps) {
  const { weights, placement, selected, liftedWeight, onWeightTap, onWeightPointerDown } = props
  // Split into evenly sized rows: 7 weights -> 4 + 3, 10 weights -> 5 + 5.
  const rows = Math.ceil(weights.length / MAX_PER_ROW)
  const columns = Math.ceil(weights.length / rows)

  return (
    <div className="tray" style={{ gridTemplateColumns: `repeat(${columns}, var(--tap-size))` }}>
      {weights.map((weight) => {
        const hung = isHung(placement, weight)
        const isSelected = selected === weight
        const size = 2 * weightRadius(weight) // same size as on the mobile

        if (hung) {
          // An empty slot. Not a button: you take a weight down by tapping or dragging it on the mobile.
          return (
            <span key={weight} className="tray-slot" aria-hidden="true">
              <span className="tray-slot-empty" style={{ width: size, height: size }} />
            </span>
          )
        }

        return (
          <button
            key={weight}
            type="button"
            className={`tray-slot tray-weight${isSelected ? ' is-selected' : ''}${liftedWeight === weight ? ' is-lifted' : ''}`}
            aria-pressed={isSelected}
            aria-label={`Weight ${weight}`}
            onClick={() => onWeightTap(weight)}
            onPointerDown={(event) => onWeightPointerDown(event, weight)}
          >
            <span
              className="tray-disc"
              style={{ width: size, height: size, background: weightBackground(weight) }}
            >
              {weight}
            </span>
          </button>
        )
      })}
    </div>
  )
}
