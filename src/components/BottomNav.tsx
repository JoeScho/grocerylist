import { motion } from 'motion/react'

export type Tab = 'recipes' | 'week' | 'shop'

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'recipes', label: 'Recipes', emoji: '📖' },
  { id: 'week', label: 'Week', emoji: '📅' },
  { id: 'shop', label: 'Shop', emoji: '🛒' },
]

export function BottomNav({
  tab, onChange, shopCount, weekCount,
}: { tab: Tab; onChange: (t: Tab) => void; shopCount: number; weekCount: number }) {
  return (
    <nav className="nav">
      {TABS.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
          {tab === t.id && <motion.div layoutId="nav-pill" className="pill" transition={{ type: 'spring', damping: 22, stiffness: 320 }} />}
          <span>{t.emoji}</span>
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
