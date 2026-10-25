import { AnimatePresence, motion } from 'motion/react'
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

const ToastContext = createContext<(message: string) => void>(() => {})

export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<{ id: number; text: string } | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const show = useCallback((text: string) => {
    window.clearTimeout(timer.current)
    setMessage({ id: Date.now(), text })
    timer.current = window.setTimeout(() => setMessage(null), 2600)
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
