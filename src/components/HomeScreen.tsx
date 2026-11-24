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
import { loadAllResults, loadInProgress, loadLevelStars, loadPracticeCounts, onTimeSolvedDays } from '../storage.ts'
import { Difficulty } from './Difficulty.tsx'
import { GOATCOUNTER_CODE } from '../analytics.ts'
import { ArchiveIcon, ChevronIcon, FlameIcon, LevelsIcon, Logo, PracticeIcon } from './Icons.tsx'
import './HomeScreen.css'

type Props = {
  day: number
  onPlayDaily: () => void
  onOpenLevels: () => void
  onOpenPractice: () => void
  onOpenArchive: () => void
  /** Shown as a "New here? How to play" link (only until the tutorial has been seen). */
  onHowToPlay?: () => void
}

export function HomeScreen({ day, onPlayDaily, onOpenLevels, onOpenPractice, onOpenArchive, onHowToPlay }: Props) {
  const levelProgress = levelTotals(loadLevelStars())
  const practiceSolved = Object.values(loadPracticeCounts()).reduce((sum, n) => sum + n, 0)
  const results = loadAllResults()
  // Past puzzles: every day before today that you haven't solved yet
  const pastUnsolved = Array.from({ length: Math.max(0, day - 1) }, (_, i) => i + 1).filter((d) => !results[d]).length
  const archiveText =
    day <= 1 ? 'Play any daily puzzle you missed.' : pastUnsolved === 0 ? 'All past puzzles solved!' : `${pastUnsolved} past ${pastUnsolved === 1 ? 'puzzle' : 'puzzles'} to play`
  const todayResult = results[day]
  const inProgress = todayResult ? null : loadInProgress(day)
  const streak = computeStreaks(onTimeSolvedDays(), day).current
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
      {onHowToPlay && (
        <p className="home-new">
          New here?{' '}
          <button type="button" className="link-button" onClick={onHowToPlay}>
            How to play
          </button>
        </p>
      )}

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

      {/* Other ways to play */}
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
        <ModeCard
          icon={<PracticeIcon />}
          title="Practice"
          text={practiceSolved === 0 ? 'Endless puzzles: easy, medium or hard.' : `Endless puzzles · ${practiceSolved} solved`}
          onOpen={onOpenPractice}
        />
        <ModeCard icon={<ArchiveIcon />} title="Past puzzles" text={archiveText} onOpen={onOpenArchive} />
      </ul>

      {/* Only shown while visitor counting is switched on (see analytics.ts) */}
      {GOATCOUNTER_CODE && (
        <p className="home-privacy">
          Anonymous visit counting by{' '}
          <a href="https://www.goatcounter.com/help/privacy" target="_blank" rel="noreferrer">
            GoatCounter
          </a>
          : no cookies, no personal data.
        </p>
      )}
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
