// useDrag.ts — lets the player drag a weight with a finger or mouse.
//
// HOW IT WORKS
// "Pointer events" are the browser's single way of handling mouse, finger
// and pen. When the player presses on a weight we start listening to the
// whole window for pointer moves:
//
//   1. Small wobble (under 8px)? Not a drag yet. If they let go now it was a
//      normal TAP, and the usual tap code runs. (So tapping still works.)
//   2. Moved further? It's a DRAG. We show a copy of the weight following the
//      pointer, a little ABOVE a finger so the finger doesn't hide it, and we
//      look up which hook is under that copy.
//   3. Let go: we report (weight, where it came from, hook under it or null).
//
// After a drag the browser also fires a "click" on the weight we started
// from. `shouldIgnoreClick()` tells the tap code to ignore that one click.
//
// STOPPING THE PAGE SCROLLING: on phones, moving a finger normally scrolls
// the page. CSS `touch-action: none` prevents that on the tray buttons, but
// browsers ignore it inside an SVG drawing (our hooks). So we also listen to
// the finger's "touchmove" events ourselves and cancel the scroll while a
// weight is pressed. The listener must be registered as `passive: false`,
// which means "I might cancel scrolling", or the browser won't let us.

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { DragSource } from '../game/moves.ts'

/** How far (px) the pointer must move before a press becomes a drag. */
const DRAG_THRESHOLD = 8
/** How far (px) above a finger the dragged weight is shown. A mouse needs no lift. */
const FINGER_LIFT = 44

export type DragState = {
  weight: number
  from: DragSource
  /** Where to draw the dragged weight (screen pixels). */
  x: number
  y: number
  /** The hook under the dragged weight right now, or null. */
  overHookId: string | null
}

type OnDrop = (weight: number, from: DragSource, toHookId: string | null) => void

/** Finds the hook (if any) at a point on the screen. */
function hookAt(x: number, y: number): string | null {
  const element = document.elementFromPoint(x, y)
  const hook = element?.closest('[data-hook-id]')
  return hook instanceof SVGElement ? (hook.dataset.hookId ?? null) : null
}

export function useDrag(onDrop: OnDrop, enabled: boolean) {
  const [drag, setDrag] = useState<DragState | null>(null)
  const ignoreNextClick = useRef(false)
  /** True from the moment a finger presses a weight until it lifts. */
  const fingerOnWeight = useRef(false)

  // Cancel page scrolling while a finger is on a weight (see note at the top).
  useEffect(() => {
    function blockScroll(e: TouchEvent) {
      if (fingerOnWeight.current) e.preventDefault()
    }
    document.addEventListener('touchmove', blockScroll, { passive: false })
    return () => document.removeEventListener('touchmove', blockScroll)
  }, [])

  /** Call from onPointerDown on anything draggable. */
  function startDrag(event: ReactPointerEvent, weight: number, from: DragSource) {
    if (!enabled) return
    if (event.pointerType === 'mouse' && event.button !== 0) return // left mouse button only
    if (event.pointerType === 'touch') fingerOnWeight.current = true

    const pointerId = event.pointerId
    const startX = event.clientX
    const startY = event.clientY
    const lift = event.pointerType === 'mouse' ? 0 : FINGER_LIFT
    let dragging = false
    let latest: DragState | null = null

    function onMove(e: PointerEvent) {
      if (e.pointerId !== pointerId) return
      if (!dragging && Math.hypot(e.clientX - startX, e.clientY - startY) < DRAG_THRESHOLD) return
      dragging = true
      const x = e.clientX
      const y = e.clientY - lift
      latest = { weight, from, x, y, overHookId: hookAt(x, y) }
      setDrag(latest)
    }

    function finish(e: PointerEvent, cancelled: boolean) {
      if (e.pointerId !== pointerId) return
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      fingerOnWeight.current = false
      if (!dragging) return // it was a tap: let the normal click happen

      ignoreNextClick.current = true
      setTimeout(() => (ignoreNextClick.current = false), 0) // in case no click arrives
      setDrag(null)
      if (!cancelled && latest) onDrop(latest.weight, latest.from, latest.overHookId)
    }
    const onUp = (e: PointerEvent) => finish(e, false)
    const onCancel = (e: PointerEvent) => finish(e, true)

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
  }

  /** Tap handlers call this first: true means "this click was the end of a drag, skip it". */
  function shouldIgnoreClick(): boolean {
    if (!ignoreNextClick.current) return false
    ignoreNextClick.current = false
    return true
  }

  return { drag, startDrag, shouldIgnoreClick }
}
