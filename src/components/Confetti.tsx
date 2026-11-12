import { AnimatePresence, motion } from 'motion/react'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { useTheme } from '../lib/theme'

const BITS = ['🥕', '🍋', '🥑', '🍅', '🧄', '🌶️', '🥦', '🍓', '🧀', '🥖', '✨', '🎉']

const ConfettiContext = createContext<() => void>(() => {})
export const useConfetti = () => useContext(ConfettiContext)

// A ring and a tick drawn in one stroke each: the quiet themes' answer to confetti.
export function DrawnTick({ size }: { size: number }) {
  const draw = (delay: number) => ({
    initial: { pathLength: 0, opacity: 0 },
    animate: { pathLength: 1, opacity: 1 },
    transition: { pathLength: { duration: 0.7, delay, ease: 'easeInOut' as const }, opacity: { duration: 0.01, delay } },
  })
  return (
    <svg className="drawn-tick" width={size} height={size} viewBox="0 0 64 64" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <motion.circle cx="32" cy="32" r="27" strokeWidth="1.5" transform="rotate(-90 32 32)" {...draw(0)} />
      <motion.path d="M21 33l8 8 15-17" strokeWidth="2" {...draw(0.45)} />
    </svg>
  )
}

export function ConfettiProvider({ children }: { children: ReactNode }) {
  const { celebration } = useTheme()
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
        {burst && celebration === 'flourish' && (
          <motion.div
            className="confetti flourish"
            key={burst}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.5, times: [0, 0.12, 0.75, 1] }}
          >
            <motion.span className="flourish-ring" initial={{ scale: 0.6, opacity: 0.5 }} animate={{ scale: 2.4, opacity: 0 }} transition={{ duration: 1.3, ease: 'easeOut' }} />
            <DrawnTick size={84} />
          </motion.div>
        )}
        {burst && celebration === 'confetti' && (
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
