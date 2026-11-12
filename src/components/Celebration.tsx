import { AnimatePresence, motion } from 'motion/react'
import { useEffect } from 'react'
import { useTheme } from '../lib/theme'
import { DrawnTick } from './Confetti'
import { Emoji } from './Emoji'

const RING_COLOURS = ['var(--sun)', 'var(--pink)', 'var(--sky)', 'var(--mint)']

export function Celebration({ show, onDone }: { show: boolean; onDone: () => void }) {
  const quiet = useTheme().celebration === 'flourish'
  useEffect(() => {
    if (!show) return
    const t = window.setTimeout(onDone, 4200)
    return () => window.clearTimeout(t)
  }, [show, onDone])

  return (
    <AnimatePresence>
      {show && quiet && (
        <motion.div
          key="quiet"
          className="celebration quiet"
          onClick={onDone}
          role="status"
          aria-live="polite"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="celebration-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <DrawnTick size={96} />
            <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 0.8 }}>
              Shop done
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 0.8 }}>
              Every item ticked off. Time to cook.
            </motion.p>
            <motion.span className="subtle" style={{ fontSize: 13 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}>
              Tap anywhere to close
            </motion.span>
          </motion.div>
        </motion.div>
      )}
      {show && !quiet && (
        <motion.div
          key="loud"
          className="celebration"
          onClick={onDone}
          role="status"
          aria-live="polite"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.4 } }}
        >
          {RING_COLOURS.map((c, i) => (
            <motion.span
              key={c}
              className="celebration-ring"
              style={{ borderColor: c }}
              initial={{ scale: 0.2, opacity: 0.9 }}
              animate={{ scale: 3.2, opacity: 0 }}
              transition={{ duration: 1.8, delay: i * 0.25, repeat: 1, ease: 'easeOut' }}
            />
          ))}
          <motion.div
            className="celebration-card"
            initial={{ scale: 0.3, y: 60, rotate: -8 }}
            animate={{ scale: 1, y: 0, rotate: 0 }}
            exit={{ scale: 0.6, y: 40 }}
            transition={{ type: 'spring', stiffness: 260, damping: 14 }}
          >
            <motion.span
              className="celebration-emoji"
              animate={{ y: [0, -28, 0, -14, 0], rotate: [0, -12, 10, -6, 0] }}
              transition={{ duration: 1.2, delay: 0.3, repeat: 2, repeatDelay: 0.3 }}
            >
              🧺
            </motion.span>
            <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              Shop done!
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
              Every item ticked off. Time to cook&nbsp;<Emoji>🍳</Emoji>
            </motion.p>
            <motion.span className="subtle" style={{ fontSize: 13 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
              Tap anywhere to close
            </motion.span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
