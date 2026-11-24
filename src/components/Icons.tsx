// Icons.tsx — small drawings used around the game.
// They use "currentColor" or the theme's CSS colours, so dark mode just works.
// aria-hidden: they're decoration; the text next to them says what they mean.

/** The Counterweight logo: a tiny balanced mobile. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <line x1="16" y1="3" x2="16" y2="10" stroke="var(--color-bar)" strokeWidth="1.6" />
      <line x1="5" y1="10" x2="27" y2="10" stroke="var(--color-bar)" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="16" cy="10" r="2.2" fill="var(--color-pivot)" />
      <line x1="7" y1="10" x2="7" y2="17" stroke="var(--color-bar)" strokeWidth="1.3" />
      <line x1="23" y1="10" x2="23" y2="20" stroke="var(--color-bar)" strokeWidth="1.3" />
      <circle cx="7" cy="21.5" r="4.5" fill="var(--weight-1)" />
      <circle cx="23" cy="24" r="3.6" fill="var(--weight-6)" />
    </svg>
  )
}

/** A clock (for the timer). */
export function ClockIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 4.5V8l2.5 1.5" />
    </svg>
  )
}

/** An arrow going up and back (for re-hangs: a weight taken back down). */
export function RehangIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 3v6.5a3 3 0 0 0 6 0V5" />
      <path d="M2.75 5.25 5 3l2.25 2.25" />
    </svg>
  )
}

/** A left arrow (Back). */
export function BackIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.5 4.5 7 10l5.5 5.5" />
    </svg>
  )
}

/** A right chevron (on list cards). */
export function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.5 4.5 13 10l-5.5 5.5" />
    </svg>
  )
}

/** A small flame (streak). */
export function FlameIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M8 1.5c.4 2-1 3.2-2.2 4.6C4.6 7.4 4 8.6 4 10a4 4 0 0 0 8 0c0-1.6-.8-2.7-1.5-3.5-.2 1-.7 1.6-1.4 1.8.4-2.4-.1-4.9-1.1-6.8Z"
        fill="#e8743b"
      />
      <path d="M8 9.2c.9.9 1.6 1.6 1.6 2.6a1.6 1.6 0 0 1-3.2 0c0-.9.6-1.6 1.6-2.6Z" fill="#f6c64a" />
    </svg>
  )
}

/** Levels: three steps with a star on top. */
export function LevelsIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect x="4" y="20" width="7" height="8" rx="1.5" fill="var(--weight-7)" />
      <rect x="12.5" y="15" width="7" height="13" rx="1.5" fill="var(--weight-6)" />
      <rect x="21" y="10" width="7" height="18" rx="1.5" fill="var(--weight-5)" />
      <path d="m24.5 2.5 1.3 2.7 3 .4-2.2 2 .5 3-2.6-1.4-2.6 1.4.5-3-2.2-2 3-.4Z" fill="var(--brass-mid)" />
    </svg>
  )
}

/** Practice: an infinity loop (endless). */
export function PracticeIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" fill="none" strokeWidth="3.2" strokeLinecap="round">
      <path d="M16 16c-2.5-3.5-4.5-5-7-5a5 5 0 0 0 0 10c2.5 0 4.5-1.5 7-5Z" stroke="var(--weight-2)" />
      <path d="M16 16c2.5 3.5 4.5 5 7 5a5 5 0 0 0 0-10c-2.5 0-4.5 1.5-7 5Z" stroke="var(--weight-4)" />
    </svg>
  )
}

/** Past puzzles: a calendar page. */
export function ArchiveIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect x="5" y="7" width="22" height="20" rx="3.5" fill="var(--color-surface)" stroke="var(--color-notch)" strokeWidth="1.6" />
      <rect x="5" y="7" width="22" height="6" rx="3" fill="var(--weight-3)" />
      <rect x="10" y="4" width="2.4" height="6" rx="1.2" fill="var(--color-notch)" />
      <rect x="19.6" y="4" width="2.4" height="6" rx="1.2" fill="var(--color-notch)" />
      <circle cx="11" cy="18" r="1.6" fill="var(--weight-1)" />
      <circle cx="16" cy="18" r="1.6" fill="var(--weight-6)" />
      <circle cx="21" cy="18" r="1.6" fill="var(--weight-7)" />
      <circle cx="11" cy="23" r="1.6" fill="var(--weight-5)" />
      <circle cx="16" cy="23" r="1.6" fill="var(--weight-2)" />
    </svg>
  )
}

/** A circular arrow (for Reset). */
export function ResetIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 10a5.5 5.5 0 1 0 1.8-4.07" />
      <path d="M4 3.5v3.25h3.25" />
    </svg>
  )
}
