import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

export interface MealDrag {
  id: string
  x: number
  y: number
  // Where the finger is inside the card, so the ghost doesn't jump.
  dx: number
  dy: number
  width: number
}

const EDGE = 90
const SPEED = 14
// How long a meal is held over a `data-dwell` element before it fires, and again while it stays.
export const DWELL_MS = 900

// Drag a meal card by its handle onto any element marked `data-drop="<target>"`.
// The ghost is position: fixed, so the page can auto-scroll underneath it near the screen edges.
// Holding the meal over an element marked `data-dwell="<key>"` calls `onDwell` with that key,
// which is how a drag changes week without letting go.
export function useMealDrag(onDrop: (id: string, target: string) => void, onDwell?: (key: string) => void) {
  const [drag, setDrag] = useState<MealDrag | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const pointer = useRef({ x: 0, y: 0 })
  const [dwell, setDwell] = useState<string | null>(null)
  const dropRef = useRef(onDrop)
  dropRef.current = onDrop
  const dwellRef = useRef(onDwell)
  dwellRef.current = onDwell

  const start = useCallback((e: ReactPointerEvent, id: string) => {
    const card = (e.currentTarget as HTMLElement).closest('[data-meal]')
    if (!card) return
    e.preventDefault()
    e.stopPropagation()
    // The card under the finger disappears when the week changes mid-drag. Handing the pointer
    // to the page keeps the move and release events coming.
    try { document.body.setPointerCapture(e.pointerId) } catch { /* the drag still works within a week */ }
    const rect = card.getBoundingClientRect()
    pointer.current = { x: e.clientX, y: e.clientY }
    setDrag({ id, x: e.clientX, y: e.clientY, dx: e.clientX - rect.left, dy: e.clientY - rect.top, width: rect.width })
  }, [])

  const dragging = drag?.id ?? null
  useEffect(() => {
    if (!dragging) return
    const targetAt = (x: number, y: number) =>
      (document.elementsFromPoint(x, y).find(el => el instanceof HTMLElement && el.dataset.drop) as HTMLElement | undefined)?.dataset.drop ?? null

    const dwellAt = (x: number, y: number) =>
      (document.elementsFromPoint(x, y).find(el => el instanceof HTMLElement && el.dataset.dwell) as HTMLElement | undefined)?.dataset.dwell ?? null

    let held: string | null = null
    let timer = 0
    const watchDwell = (x: number, y: number) => {
      const key = dwellAt(x, y)
      if (key === held) return
      window.clearInterval(timer)
      held = key
      setDwell(key)
      if (key) timer = window.setInterval(() => dwellRef.current?.(key), DWELL_MS)
    }

    const move = (e: PointerEvent) => {
      pointer.current = { x: e.clientX, y: e.clientY }
      setDrag(d => (d ? { ...d, x: e.clientX, y: e.clientY } : d))
      setOver(targetAt(e.clientX, e.clientY))
      watchDwell(e.clientX, e.clientY)
    }
    const end = (e: PointerEvent) => {
      const target = e.type === 'pointerup' ? targetAt(e.clientX, e.clientY) : null
      setDrag(null)
      setOver(null)
      if (target) dropRef.current(dragging, target)
    }

    let frame = 0
    const scroll = () => {
      const { x, y } = pointer.current
      const step = y < EDGE ? -SPEED : y > window.innerHeight - EDGE ? SPEED : 0
      if (step) {
        window.scrollBy(0, step)
        setOver(targetAt(x, y))
        watchDwell(x, y)
      }
      frame = requestAnimationFrame(scroll)
    }
    frame = requestAnimationFrame(scroll)

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    return () => {
      cancelAnimationFrame(frame)
      window.clearInterval(timer)
      setDwell(null)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
    }
  }, [dragging])

  return { drag, over, dwell, start }
}
