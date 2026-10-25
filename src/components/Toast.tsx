import { AnimatePresence, motion } from 'motion/react'
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

interface ToastAction { label: string; onClick: () => void }

const ToastContext = createContext<(message: string, action?: ToastAction) => void>(() => {})

export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<{ id: number; text: string; action?: ToastAction } | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const show = useCallback((text: string, action?: ToastAction) => {
    window.clearTimeout(timer.current)
    setMessage({ id: Date.now(), text, action })
    // Leave time to reach the Undo button.
    timer.current = window.setTimeout(() => setMessage(null), action ? 5000 : 2600)
  }, [])
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-wrap">
        <AnimatePresence>
          {message && (
            <motion.div
              key={message.id}
              className="toast"
              initial={{ y: -40, opacity: 0, scale: 0.8 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -40, opacity: 0 }}
              transition={{ type: 'spring', damping: 18, stiffness: 320 }}
            >
              {message.text}
              {message.action && (
                <button
                  className="toast-action"
                  onClick={() => { message.action!.onClick(); window.clearTimeout(timer.current); setMessage(null) }}
                >
                  {message.action.label}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
