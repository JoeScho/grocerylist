import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { Emoji } from './Emoji'

export type Tab = 'recipes' | 'week' | 'shop'

const icon = (paths: ReactNode) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {paths}
  </svg>
)

// The line icon is what themes without emoji show; the switch between the two is CSS.
const TABS: { id: Tab; label: string; emoji: string; icon: ReactNode }[] = [
  { id: 'recipes', label: 'Recipes', emoji: '📖', icon: icon(<><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" /><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20" /></>) },
  { id: 'week', label: 'Week', emoji: '📅', icon: icon(<><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>) },
  { id: 'shop', label: 'Shop', emoji: '🛒', icon: icon(<><path d="M3 4h2.5l2.2 11h10.6L20.5 7H6.6" /><circle cx="9.5" cy="19.5" r="1.3" /><circle cx="16.5" cy="19.5" r="1.3" /></>) },
]

export function BottomNav({
  tab, onChange, shopCount, weekCount,
}: { tab: Tab; onChange: (t: Tab) => void; shopCount: number; weekCount: number }) {
  return (
    <nav className="nav">
      {TABS.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
          {tab === t.id && <motion.div layoutId="nav-pill" className="pill" transition={{ type: 'spring', damping: 22, stiffness: 320 }} />}
          <span className="nav-icon">
            <Emoji>{t.emoji}</Emoji>
            <span className="emo-alt">{t.icon}</span>
          </span>
          <span>{t.label}</span>
          {t.id === 'week' && weekCount > 0 && (
            <motion.span key={weekCount} className="badge" initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 12 }}>
              {weekCount}
            </motion.span>
          )}
          {t.id === 'shop' && shopCount > 0 && (
            <motion.span key={shopCount} className="badge" initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 12 }}>
              {shopCount}
            </motion.span>
          )}
        </button>
      ))}
    </nav>
  )
}
