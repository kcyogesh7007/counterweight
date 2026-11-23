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

/** A circular arrow (for Reset). */
export function ResetIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 10a5.5 5.5 0 1 0 1.8-4.07" />
      <path d="M4 3.5v3.25h3.25" />
    </svg>
  )
}
