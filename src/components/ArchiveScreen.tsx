// ArchiveScreen.tsx — "Past puzzles": every earlier daily puzzle, newest first.
// Each row shows the date, difficulty and whether you've solved it (and how
// fast). Tap a row to play it. Today's puzzle isn't here: it's on the home screen.

import { dailyDifficulty, dayDate, formatShortDate } from '../game/daily.ts'
import { formatTime } from '../game/moves.ts'
import { loadAllResults } from '../storage.ts'
import { ChevronIcon } from './Icons.tsx'
import './ArchiveScreen.css'

export function ArchiveScreen({ today, onPlay }: { today: number; onPlay: (day: number) => void }) {
  const results = loadAllResults()
  // Every day before today, newest first: today-1, today-2, … 1
  const days = Array.from({ length: Math.max(0, today - 1) }, (_, i) => today - 1 - i)
  const unsolved = days.filter((d) => !results[d]).length

  return (
    <section className="archive" aria-labelledby="archive-title">
      <div className="archive-top">
        <h2 id="archive-title" className="archive-title">
          Past puzzles
        </h2>
        <p className="archive-text">
          {days.length === 0
            ? 'No past puzzles yet. Come back tomorrow!'
            : `${days.length} earlier ${days.length === 1 ? 'puzzle' : 'puzzles'} · ${unsolved} still to solve. Playing them late doesn't change your streak.`}
        </p>
      </div>

      <ul className="archive-list">
        {days.map((day) => {
          const result = results[day]
          const level = dailyDifficulty(day)
          let status = 'Not played'
          if (result) status = result.late ? `Solved late · ${formatTime(result.elapsed)}` : `Solved · ${formatTime(result.elapsed)}`
          return (
            <li key={day}>
              <button type="button" className={`archive-row${result ? ' is-solved' : ''}`} onClick={() => onPlay(day)}>
                <span className="archive-number">#{day}</span>
                <span className="archive-body">
                  <span className="archive-date">{formatShortDate(dayDate(day))}</span>
                  <span className="archive-meta">
                    <span className="difficulty-pips" aria-label={`difficulty ${level} of 7`}>
                      {Array.from({ length: 7 }, (_, i) => (
                        <span key={i} className={`difficulty-pip${i < level ? ' is-on' : ''}`} />
                      ))}
                    </span>
                    <span className="archive-status">{status}</span>
                  </span>
                </span>
                <span className="archive-chevron">{result ? <span className="archive-tick">✓</span> : <ChevronIcon />}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
