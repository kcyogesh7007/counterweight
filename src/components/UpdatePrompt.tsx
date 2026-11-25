// UpdatePrompt.tsx — "A new version of Counterweight is ready. [Update] [Later]"
//
// The game keeps an offline copy of itself (the service worker, set up in
// vite.config.ts). When a new version is published, that copy downloads it
// quietly in the background; this bar then lets the player switch to it
// right away. "Update" reloads the page into the new version (today's
// half-finished puzzle is saved, so nothing is lost). "Later" hides the bar;
// the new version then starts next time the game is opened.
//
// It also checks for a new version whenever the player comes back to the
// game (and every hour while it stays open), so a game left open on a phone
// for days still finds updates.
//
// In the Android app the offline copy is switched off, so this never shows
// there (app updates come from the Play Store).

import { useEffect, useRef } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import './UpdatePrompt.css'

const HOUR = 60 * 60 * 1000

export function UpdatePrompt() {
  const registration = useRef<ServiceWorkerRegistration | null>(null)
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      registration.current = reg ?? null
    },
  })

  // Look for a new version when the player comes back to the game, and every hour.
  useEffect(() => {
    const check = () => {
      if (document.visibilityState === 'visible') registration.current?.update().catch(() => {})
    }
    document.addEventListener('visibilitychange', check)
    const timer = window.setInterval(check, HOUR)
    return () => {
      document.removeEventListener('visibilitychange', check)
      window.clearInterval(timer)
    }
  }, [])

  if (!needRefresh) return null
  return (
    <div className="update-prompt" role="status">
      <p className="update-text">A new version of Counterweight is ready.</p>
      <div className="update-actions">
        <button type="button" className="link-button" onClick={() => setNeedRefresh(false)}>
          Later
        </button>
        <button type="button" className="button update-button" onClick={() => updateServiceWorker(true)}>
          Update
        </button>
      </div>
    </div>
  )
}
