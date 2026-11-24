// useScreens.ts — which screen is showing, connected to the browser's history.
//
// WHY: on phones, people press the system "back" button or swipe back. Without
// this, that would leave the website. Each time we open a screen we add an
// entry to the browser's history (history.pushState), so "back" returns to
// the previous screen instead, just like a normal app.
//
//   go(screen)      open a screen ("back" will return here)
//   replace(screen) switch screen without adding a history entry
//   back()          return to the previous screen (or home if there isn't one)
//
// Nothing is added to the web address; only the history list changes.

import { useEffect, useState } from 'react'

type Entry<S> = { screen: S; depth: number }

/** Is this a history entry we saved? (After a reload the browser gives it back to us.) */
function isEntry<S>(value: unknown): value is Entry<S> {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.depth === 'number' && typeof v.screen === 'object' && v.screen !== null
}

export function useScreens<S>(initial: () => S, home: S) {
  // After a reload, stay on the same screen (the browser kept our entry).
  const [entry, setEntry] = useState<Entry<S>>(() =>
    isEntry<S>(history.state) ? history.state : { screen: initial(), depth: 0 },
  )

  useEffect(() => {
    // Remember the starting screen in the current history entry.
    history.replaceState(entry, '')
    // The browser's back/forward buttons: show whatever screen that entry had.
    function onPopState(event: PopStateEvent) {
      const saved = event.state as Entry<S> | null
      setEntry(saved ?? { screen: home, depth: 0 })
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
    // Only on first load: `entry` and `home` are the starting values here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function go(screen: S) {
    const next = { screen, depth: entry.depth + 1 }
    history.pushState(next, '')
    setEntry(next)
  }

  function replace(screen: S) {
    const next = { screen, depth: entry.depth }
    history.replaceState(next, '')
    setEntry(next)
  }

  function back() {
    if (entry.depth > 0) history.back() // the popstate listener above updates the screen
    else replace(home)
  }

  return { screen: entry.screen, go, replace, back }
}
