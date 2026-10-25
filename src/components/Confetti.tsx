import { AnimatePresence, motion } from 'motion/react'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

const BITS = ['🥕', '🍋', '🥑', '🍅', '🧄', '🌶️', '🥦', '🍓', '🧀', '🥖', '✨', '🎉']

const ConfettiContext = createContext<() => void>(() => {})
export const useConfetti = () => useContext(ConfettiContext)

export function ConfettiProvider({ children }: { children: ReactNode }) {
  const [burst, setBurst] = useState<number | null>(null)
  const fire = useCallback(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = Date.now()
    setBurst(id)
    window.setTimeout(() => setBurst(b => (b === id ? null : b)), 1600)
  }, [])
  return (
    <ConfettiContext.Provider value={fire}>
      {children}
      <AnimatePresence>
        {burst && (
          <div className="confetti" key={burst}>
            {Array.from({ length: 22 }, (_, i) => {
              const angle = (i / 22) * Math.PI * 2 + Math.random() * 0.4
              const dist = 140 + Math.random() * 160
              return (
                <motion.span
                  key={i}
                  initial={{ x: 0, y: 0, scale: 0.3, rotate: 0, opacity: 1 }}
                  animate={{
                    x: Math.cos(angle) * dist,
                    y: [0, Math.sin(angle) * dist - 120, Math.sin(angle) * dist + 220],
                    scale: [0.3, 1.3, 1],
                    rotate: Math.random() * 540 - 270,
                    opacity: [1, 1, 0],
                  }}
                  transition={{ duration: 1.4, ease: 'easeOut' }}
                >
                  {BITS[i % BITS.length]}
                </motion.span>
              )
            })}
          </div>
        )}
      </AnimatePresence>
    </ConfettiContext.Provider>
  )
}
