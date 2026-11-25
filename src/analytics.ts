// analytics.ts — anonymous visitor and game-event counting with GoatCounter.
//
// WHAT IS SENT (and what isn't)
// GoatCounter (goatcounter.com) is a privacy-friendly, open-source counter.
// It uses no cookies and does not store IP addresses or anything that
// identifies a person. For a visit it records: the page, the site the
// visitor came from, the browser/device type, screen size and country.
// Game events below are just names like "daily-solved": no puzzle answers,
// no times, nothing personal.
//
// HOW TO TURN IT ON
// 1. Sign up (free) at https://www.goatcounter.com and pick a code (this game uses "counterweight-puzzle").
// 2. Put that code in GOATCOUNTER_CODE below, then publish.
// While the code is empty, NOTHING is loaded or sent.
//
// It never counts while you're testing on your own computer (localhost).
// In the Android app it does count, under the page name "/android-app", so
// app players can be told apart from website players.

import { Capacitor } from '@capacitor/core'

/** Your GoatCounter code, e.g. 'counterweight' (empty = counting switched off). */
export const GOATCOUNTER_CODE = 'counterweight-puzzle'

/** The game events we count. Each is just a name. */
export type GameEvent =
  | 'tutorial-finished'
  | 'daily-solved'
  | 'past-puzzle-solved'
  | 'level-solved'
  | 'practice-solved'
  | 'hint-used'

/** The shape of the `goatcounter` object GoatCounter's script adds to the page. */
type GoatCounter = { count: (options: { path: string; title?: string; event?: boolean }) => void }

/** Is counting switched on, and are we on the real website (not localhost)? */
function isEnabled(): boolean {
  if (!GOATCOUNTER_CODE) return false
  // The Android app runs the game from "localhost" inside the phone: that's real players
  if (Capacitor.isNativePlatform()) return true
  const host = window.location.hostname
  return host !== 'localhost' && host !== '127.0.0.1' && host !== ''
}

/**
 * Loads GoatCounter's small script once, when the game starts. The script
 * counts the visit by itself. Call this once (from main.tsx).
 */
export function startAnalytics(): void {
  if (!isEnabled() || document.querySelector('script[data-goatcounter]')) return
  if (Capacitor.isNativePlatform()) {
    // Settings GoatCounter reads before it loads: count even though the
    // address is "localhost", and name the visit "/android-app".
    ;(window as unknown as { goatcounter: object }).goatcounter = { allow_local: true, path: () => '/android-app' }
  }
  const script = document.createElement('script')
  script.async = true
  script.src = 'https://gc.zgo.at/count.js'
  script.dataset.goatcounter = `https://${GOATCOUNTER_CODE}.goatcounter.com/count`
  document.head.appendChild(script)
}

/**
 * Counts one game event, e.g. countEvent('daily-solved'). Safe to call any
 * time: if counting is off, or GoatCounter hasn't loaded (e.g. blocked by an
 * ad blocker), it simply does nothing.
 */
export function countEvent(event: GameEvent): void {
  if (!isEnabled()) return
  const goatcounter = (window as unknown as { goatcounter?: GoatCounter }).goatcounter
  try {
    goatcounter?.count({ path: event, title: event, event: true })
  } catch {
    // Never let counting break the game.
  }
}
