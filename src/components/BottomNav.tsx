import { motion } from 'motion/react'

export type Tab = 'recipes' | 'shop' | 'home'

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'recipes', label: 'Recipes', emoji: '📖' },
  { id: 'shop', label: 'Shop', emoji: '🛒' },
  { id: 'home', label: 'Home', emoji: '🏡' },
]

export function BottomNav({ tab, onChange, shopCount }: { tab: Tab; onChange: (t: Tab) => void; shopCount: number }) {
  return (
    <nav className="nav">
      {TABS.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
          {tab === t.id && <motion.div layoutId="nav-pill" className="pill" transition={{ type: 'spring', damping: 22, stiffness: 320 }} />}
          <span>{t.emoji}</span>
          <span>{t.label}</span>
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
