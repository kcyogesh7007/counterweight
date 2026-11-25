// ShareButton.tsx — "Share result" on today's win card.
//
// On phones it opens the phone's own share menu (WhatsApp, Messenger…).
// Where there is no share menu (most computers, the Android app) it copies
// the message instead, so it can be pasted anywhere.

import { useState } from 'react'
import { countEvent } from '../analytics.ts'
import './ShareButton.css'

export function ShareButton({ text }: { text: string }) {
  const [note, setNote] = useState('')

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ text })
        countEvent('shared')
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return // they closed the menu
      }
    }
    try {
      await navigator.clipboard.writeText(text)
      countEvent('shared')
      setNote('Copied! Paste it to your friends.')
    } catch {
      setNote("Couldn't copy. Try a screenshot instead.")
    }
  }

  return (
    <div className="share">
      <button type="button" className="share-button" onClick={() => void share()}>
        Share result
      </button>
      <p className="share-note" role="status">{note}</p>
    </div>
  )
}
