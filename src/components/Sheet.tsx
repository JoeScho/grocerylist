import { AnimatePresence, motion, useDragControls } from 'motion/react'
import type { ReactNode } from 'react'

export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const controls = useDragControls()
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="sheet"
            role="dialog"
            aria-modal="true"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            // Only the grabber starts a drag, so scrolling and text inputs inside still work.
            drag="y"
            dragListener={false}
            dragControls={controls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => { if (info.offset.y > 120 || info.velocity.y > 600) onClose() }}
          >
            <div style={{ padding: '6px 0', touchAction: 'none' }} onPointerDown={e => controls.start(e)}>
              <div className="grabber" />
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
