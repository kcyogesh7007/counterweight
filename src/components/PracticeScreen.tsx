// PracticeScreen.tsx — choose a difficulty for endless Practice puzzles.

import { PRACTICE_DIFFICULTIES, PRACTICE_INFO, type PracticeDifficulty } from '../game/practice.ts'
import { loadPracticeCounts } from '../storage.ts'
import { ChevronIcon } from './Icons.tsx'
import './PracticeScreen.css'

export function PracticeScreen({ onPlay }: { onPlay: (difficulty: PracticeDifficulty) => void }) {
  const counts = loadPracticeCounts()

  return (
    <section className="practice" aria-labelledby="practice-title">
      <div className="practice-top">
        <h2 id="practice-title" className="practice-title">
          Practice
        </h2>
        <p className="practice-text">Endless puzzles, made fresh just for you. They don't affect your daily streak.</p>
      </div>

      <ul className="practice-list">
        {PRACTICE_DIFFICULTIES.map((difficulty, i) => {
          const solved = counts[difficulty] ?? 0
          return (
            <li key={difficulty}>
              <button type="button" className={`practice-card is-${difficulty}`} onClick={() => onPlay(difficulty)}>
                {/* 1, 2 or 3 gold gems show how hard it is */}
                <span className="practice-gems" aria-hidden="true">
                  {[0, 1, 2].map((g) => (
                    <span key={g} className={`practice-gem${g <= i ? ' is-on' : ''}`} />
                  ))}
                </span>
                <span className="practice-card-body">
                  <span className="practice-card-name">{PRACTICE_INFO[difficulty].name}</span>
                  <span className="practice-card-text">{PRACTICE_INFO[difficulty].text}</span>
                  <span className="practice-card-count">{solved === 0 ? 'Not played yet' : `${solved} solved`}</span>
                </span>
                <span className="practice-chevron">
                  <ChevronIcon />
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
