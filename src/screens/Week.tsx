import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { useMemo } from 'react'
import { useConfetti } from '../components/Confetti'
import { RecipeImage } from '../components/RecipeImage'
import { SettingsButton } from '../components/SettingsButton'
import { useToast } from '../components/Toast'
import { setCooked } from '../data/shop'
import type { Household, PlanEntry, Recipe } from '../types'

export function Week({
  household, plan, recipes, onOpenRecipe, onBrowse, onSettings, settingsAlert,
}: {
  household: Household
  plan: PlanEntry[]
  recipes: Recipe[] | null
  onOpenRecipe: (id: string) => void
  onBrowse: () => void
  onSettings: () => void
  settingsAlert: boolean
}) {
  const toast = useToast()
  const confetti = useConfetti()
  const recipeById = useMemo(() => new Map((recipes ?? []).map(r => [r.id, r])), [recipes])
  // Still to cook first; ticked meals sink to the bottom.
  const sorted = useMemo(
    () => [...plan].sort((a, b) => Number(a.cooked) - Number(b.cooked) || a.title.localeCompare(b.title)),
    [plan],
  )
  const cooked = plan.filter(p => p.cooked).length

  const toggle = async (p: PlanEntry) => {
    const next = !p.cooked
    await setCooked(household.id, p.id, next)
    if (!next) return
    if (cooked + 1 === plan.length) {
      confetti()
      toast('Every meal cooked this week 🎉')
    } else {
      toast(`👩‍🍳 ${p.title} cooked`)
    }
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <h1>This week</h1>
        <div className="row">
          {plan.length > 0 && <span className="subtle" style={{ fontWeight: 800 }}>{cooked} of {plan.length} cooked</span>}
          <SettingsButton onClick={onSettings} alert={settingsAlert} />
        </div>
      </div>

      {plan.length === 0 ? (
        <motion.div className="empty" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <motion.span className="big" animate={{ rotate: [0, -8, 8, 0] }} transition={{ repeat: Infinity, duration: 2.4 }}>📅</motion.span>
          <h2>No meals planned</h2>
          <p className="subtle">Recipes you add to the shop show up here, ready to tick off once they're cooked.</p>
          <button className="btn" onClick={onBrowse} style={{ marginTop: 12 }}>Pick some recipes</button>
        </motion.div>
      ) : (
        <>
          <div className="week-bar">
            <motion.div initial={false} animate={{ width: `${(cooked / plan.length) * 100}%` }} transition={{ type: 'spring', damping: 20 }} />
          </div>
          <LayoutGroup>
            <div className="week-list">
              <AnimatePresence initial={false}>
                {sorted.map(p => (
                  <motion.div
                    key={p.id}
                    layout
                    className={`week-card ${p.cooked ? 'cooked' : ''}`}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: p.cooked ? 0.55 : 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: 'spring', damping: 24, stiffness: 300 }}
                  >
                    <button className="pic" onClick={() => onOpenRecipe(p.id)} aria-label={`Open ${p.title}`}>
                      <RecipeImage src={recipeById.get(p.id)?.image ?? p.image} seed={p.id} />
                    </button>
                    <button className="body" onClick={() => onOpenRecipe(p.id)}>
                      <div className="t">{p.title}</div>
                      <div className="subtle" style={{ fontSize: 14, marginTop: 4 }}>{p.portions} portions</div>
                    </button>
                    <motion.button
                      className={`cook-btn ${p.cooked ? 'on' : ''}`}
                      onClick={() => toggle(p)}
                      whileTap={{ scale: 0.85 }}
                      animate={{ rotate: p.cooked ? [0, -15, 10, 0] : 0, scale: p.cooked ? [1, 1.2, 1] : 1 }}
                      transition={{ duration: 0.4 }}
                      aria-label={p.cooked ? `Mark ${p.title} as not cooked` : `Mark ${p.title} as cooked`}
                    >
                      {p.cooked ? '✓' : '🍳'}
                    </motion.button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </LayoutGroup>
        </>
      )}
    </div>
  )
}
