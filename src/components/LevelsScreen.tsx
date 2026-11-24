// LevelsScreen.tsx — the level map: all 60 levels with your stars.
//
// Levels are grouped by size (3 weights, 4 weights, …). Solved levels show
// their best stars; the next one to play glows; locked ones show a padlock.
// The map scrolls so the next level is in view when it opens.

import { useEffect, useRef } from 'react'
import { isUnlocked, levelTotals, nextLevel } from '../game/levels.ts'
import { LEVEL_PUZZLES } from '../game/puzzles.ts'
import { loadLevelStars } from '../storage.ts'
import { Stars } from './Stars.tsx'
import './LevelsScreen.css'

/** A friendly name for each group, by number of weights. */
const GROUP_NAMES: Record<number, string> = {
  3: 'First steps',
  4: 'Warming up',
  5: 'Getting serious',
  6: 'Tricky',
  7: 'Fiendish',
}

export function LevelsScreen({ onPlay }: { onPlay: (level: number) => void }) {
  const stars = loadLevelStars()
  const total = LEVEL_PUZZLES.length
  const { solved, stars: starCount } = levelTotals(stars)
  const next = nextLevel(stars, total)

  // Scroll the next level into view when the map opens.
  const nextRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    nextRef.current?.scrollIntoView({ block: 'center' })
  }, [])

  // Group level numbers by how many weights they have: { 3: [1..5], 4: [6..12], … }
  const groups = new Map<number, number[]>()
  LEVEL_PUZZLES.forEach((p, i) => {
    const size = p.weights.length
    groups.set(size, [...(groups.get(size) ?? []), i + 1])
  })

  return (
    <section className="levels" aria-labelledby="levels-title">
      <div className="levels-top">
        <h2 id="levels-title" className="levels-title">
          Levels
        </h2>
        <p className="levels-totals">
          <span>
            <strong>{solved}</strong> / {total} solved
          </span>
          <span className="levels-star-total">
            <Stars count={1} total={1} />
            <strong>{starCount}</strong> / {total * 3}
          </span>
        </p>
        <div className="levels-progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={solved} aria-label="Levels solved">
          <span style={{ width: `${(solved / total) * 100}%` }} />
        </div>
      </div>

      {[...groups].map(([size, levels]) => (
        <div key={size} className="levels-group">
          <h3 className="levels-group-title">
            {GROUP_NAMES[size] ?? `${size} weights`}
            <span>
              {size} weights · {levels[0]}–{levels.at(-1)}
            </span>
          </h3>
          <ol className="levels-grid">
            {levels.map((n) => {
              const unlocked = isUnlocked(n, stars)
              const best = stars[n]
              const isNext = n === next && unlocked
              const label = !unlocked ? `Level ${n}, locked` : best ? `Level ${n}, ${best} of 3 stars` : `Level ${n}, not solved yet`
              return (
                <li key={n}>
                  <button
                    ref={isNext ? nextRef : undefined}
                    type="button"
                    className={`level-tile${best ? ' is-solved' : ''}${isNext ? ' is-next' : ''}`}
                    disabled={!unlocked}
                    aria-label={label}
                    onClick={() => onPlay(n)}
                  >
                    {unlocked ? <span className="level-number">{n}</span> : <LockIcon />}
                    {unlocked && <Stars count={best ?? 0} />}
                  </button>
                </li>
              )
            })}
          </ol>
        </div>
      ))}
    </section>
  )
}

function LockIcon() {
  return (
    <svg className="level-lock" viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="4.5" y="9" width="11" height="8" rx="2" />
      <path d="M7 9V6.5a3 3 0 0 1 6 0V9" />
    </svg>
  )
}
