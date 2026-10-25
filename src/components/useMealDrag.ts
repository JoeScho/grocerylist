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

// Drag a meal card by its handle onto any element marked `data-drop="<target>"`.
// The ghost is position: fixed, so the page can auto-scroll underneath it near the screen edges.
export function useMealDrag(onDrop: (id: string, target: string) => void) {
  const [drag, setDrag] = useState<MealDrag | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const pointer = useRef({ x: 0, y: 0 })
  const dropRef = useRef(onDrop)
  dropRef.current = onDrop

  const start = useCallback((e: ReactPointerEvent, id: string) => {
    const card = (e.currentTarget as HTMLElement).closest('[data-meal]')
    if (!card) return
    e.preventDefault()
    e.stopPropagation()
    const rect = card.getBoundingClientRect()
    pointer.current = { x: e.clientX, y: e.clientY }
    setDrag({ id, x: e.clientX, y: e.clientY, dx: e.clientX - rect.left, dy: e.clientY - rect.top, width: rect.width })
  }, [])

  const dragging = drag?.id ?? null
  useEffect(() => {
    if (!dragging) return
    const targetAt = (x: number, y: number) =>
      (document.elementsFromPoint(x, y).find(el => el instanceof HTMLElement && el.dataset.drop) as HTMLElement | undefined)?.dataset.drop ?? null

    const move = (e: PointerEvent) => {
      pointer.current = { x: e.clientX, y: e.clientY }
      setDrag(d => (d ? { ...d, x: e.clientX, y: e.clientY } : d))
      setOver(targetAt(e.clientX, e.clientY))
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
      }
      frame = requestAnimationFrame(scroll)
    }
    frame = requestAnimationFrame(scroll)

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
    }
  }, [dragging])

  return { drag, over, start }
}
