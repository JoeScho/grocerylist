import { motion } from 'motion/react'

export function Check({ on }: { on: boolean }) {
  return (
    <motion.span
      className={`check ${on ? 'on' : ''}`}
      animate={{ scale: on ? [1, 1.3, 1] : 1 }}
      transition={{ duration: 0.3 }}
      aria-hidden
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <motion.path
          d="M3 8.5l3.2 3L13 4.5"
          stroke="currentColor"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: on ? 1 : 0 }}
          transition={{ duration: 0.25 }}
        />
      </svg>
    </motion.span>
  )
}
