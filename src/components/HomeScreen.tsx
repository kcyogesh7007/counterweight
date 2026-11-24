// HomeScreen.tsx — the starting page: today's puzzle, plus the other ways to play.
//
// Today's card shows whether you've played it yet:
//   not started -> "Play"
//   half done   -> "Continue · 0:42"
//   solved      -> "Solved in 2:14 ✓"
// The other cards (Levels, Practice, Past puzzles) are added in Steps 18–20;
// until then they say "Coming soon" and can't be opened.

import type { ReactNode } from 'react'
import { dailyDifficulty, dayDate, formatShortDate } from '../game/daily.ts'
import { levelTotals } from '../game/levels.ts'
import { formatTime } from '../game/moves.ts'
import { LEVEL_PUZZLES } from '../game/puzzles.ts'
import { computeStreaks } from '../game/streaks.ts'
import { loadAllResults, loadInProgress, loadLevelStars } from '../storage.ts'
import { Difficulty } from './Difficulty.tsx'
import { ArchiveIcon, ChevronIcon, FlameIcon, LevelsIcon, Logo, PracticeIcon } from './Icons.tsx'
import './HomeScreen.css'

type Props = {
  day: number
  onPlayDaily: () => void
  onOpenLevels: () => void
}

export function HomeScreen({ day, onPlayDaily, onOpenLevels }: Props) {
  const levelProgress = levelTotals(loadLevelStars())
  const results = loadAllResults()
  const todayResult = results[day]
  const inProgress = todayResult ? null : loadInProgress(day)
  const streak = computeStreaks(Object.keys(results).map(Number), day).current
  const date = dayDate(day)
  const weekday = date.toLocaleDateString('en-GB', { weekday: 'long' })

  let status = 'A new puzzle, just for today.'
  let action = 'Play'
  if (todayResult) {
    status = `Solved in ${formatTime(todayResult.elapsed)} ✓`
    action = 'View'
  } else if (inProgress) {
    status = `In progress · ${formatTime(inProgress.elapsed)}`
    action = 'Continue'
  }

  return (
    <section className="home" aria-label="Home">
      <p className="home-tagline">Hang every weight so every bar balances.</p>

      {/* Today's puzzle: the big card */}
      <button type="button" className="home-today" onClick={onPlayDaily}>
        <span className="home-today-art" aria-hidden="true">
          <Logo className="home-today-logo" />
        </span>
        <span className="home-today-body">
          <span className="home-eyebrow">Today's puzzle</span>
          <span className="home-today-title">
            #{day} · {formatShortDate(date)}
          </span>
          <Difficulty level={dailyDifficulty(day)} label={weekday} />
          <span className={`home-status${todayResult ? ' is-done' : ''}`}>{status}</span>
        </span>
        <span className="home-today-footer">
          <span className="home-streak" title="Current streak">
            <FlameIcon />
            {streak} {streak === 1 ? 'day' : 'days'}
          </span>
          <span className="home-play">{action}</span>
        </span>
      </button>

      {/* Other ways to play (Practice and Past puzzles come in the next steps) */}
      <ul className="home-list">
        <ModeCard
          icon={<LevelsIcon />}
          title="Levels"
          text={
            levelProgress.solved === 0
              ? `${LEVEL_PUZZLES.length} levels, easy to fiendish. Earn stars.`
              : `${levelProgress.solved} / ${LEVEL_PUZZLES.length} solved · ★ ${levelProgress.stars}`
          }
          onOpen={onOpenLevels}
        />
        <ModeCard icon={<PracticeIcon />} title="Practice" text="Endless puzzles: easy, medium or hard." />
        <ModeCard icon={<ArchiveIcon />} title="Past puzzles" text="Play any daily puzzle you missed." />
      </ul>
    </section>
  )
}

type ModeCardProps = {
  icon: ReactNode
  title: string
  text: string
  /** Leave out while the mode isn't built yet: the card shows "Coming soon". */
  onOpen?: () => void
}

function ModeCard({ icon, title, text, onOpen }: ModeCardProps) {
  const ready = onOpen !== undefined
  return (
    <li>
      <button type="button" className="home-mode" onClick={onOpen} disabled={!ready}>
        <span className="home-mode-icon">{icon}</span>
        <span className="home-mode-body">
          <span className="home-mode-title">{title}</span>
          <span className="home-mode-text">{text}</span>
        </span>
        {ready ? (
          <span className="home-mode-chevron">
            <ChevronIcon />
          </span>
        ) : (
          <span className="home-soon">Coming soon</span>
        )}
      </button>
    </li>
  )
}
