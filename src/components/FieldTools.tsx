import { useRef, type ReactNode } from 'react'
import { useToast } from './Toast'

const canPaste = typeof navigator !== 'undefined' && typeof navigator.clipboard?.readText === 'function'

// Wraps one text input or textarea with a paste button, and for links a clear button
// that takes the paste button's place once there's something in the box.
export function FieldTools({
  value, onChange, url = false, className = '', children,
}: {
  value: string
  onChange: (value: string) => void
  url?: boolean
  className?: string
  children: ReactNode
}) {
  const toast = useToast()
  const box = useRef<HTMLDivElement>(null)
  const control = () => box.current?.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea') ?? null

  const paste = async () => {
    let text: string
    try {
      text = await navigator.clipboard.readText()
    } catch {
      toast("Couldn't read the clipboard. Long-press the box and paste instead.")
      return
    }
    if (!text) return toast('The clipboard is empty')
    const el = control()
    if (url) {
      onChange(text.trim())
      return
    }
    // Into the cursor if the box is being typed in, otherwise added to what's there.
    // Email boxes have no cursor position to read (selectionStart is null).
    const hasCaret = el !== null && el.selectionStart !== null
    let at: [number, number]
    if (hasCaret && el === document.activeElement) at = [el.selectionStart ?? value.length, el.selectionEnd ?? value.length]
    else if (el instanceof HTMLTextAreaElement && value.trim()) {
      text = (value.endsWith('\n') ? '' : '\n') + text
      at = [value.length, value.length]
    } else at = [0, value.length]
    onChange(value.slice(0, at[0]) + text + value.slice(at[1]))
    const caret = at[0] + text.length
    requestAnimationFrame(() => { el?.focus(); if (hasCaret) el.setSelectionRange(caret, caret) })
  }

  const clear = () => {
    onChange('')
    control()?.focus()
  }

  const showClear = url && value !== ''
  const tools = showClear || canPaste
  return (
    <div ref={box} className={`field-tools ${tools ? 'has-tools' : ''} ${className}`}>
      {children}
      {tools && (
        <div className="field-tools-btns">
          {showClear ? (
            <button type="button" onPointerDown={e => e.preventDefault()} onClick={clear} aria-label="Clear" title="Clear">✕</button>
          ) : (
            <button type="button" onPointerDown={e => e.preventDefault()} onClick={paste} aria-label="Paste" title="Paste">📋</button>
          )}
        </div>
      )}
    </div>
  )
}
