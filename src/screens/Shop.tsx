import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { Check } from '../components/Check'
import { RecipeImage } from '../components/RecipeImage'
import { SettingsButton } from '../components/SettingsButton'
import { Sheet } from '../components/Sheet'
import { useToast } from '../components/Toast'
import {
  addManualItem, clearAll, clearChecked, deleteItem, removeRecipeFromShop, setChecked, setItemCategory,
} from '../data/shop'
import { setCategoryOverride } from '../data/household'
import { CATEGORIES, CATEGORY_BY_ID } from '../lib/categories'
import { formatQty } from '../lib/ingredients'
import { totalQty } from '../lib/list'
import type { Household, PlanEntry, Recipe, ShopItem } from '../types'
import { Loading } from './Recipes'

export function Shop({
  household, items, plan, recipes, onOpenRecipe, onSettings, settingsAlert,
}: {
  household: Household
  items: ShopItem[] | null
  plan: PlanEntry[]
  recipes: Recipe[] | null
  onOpenRecipe: (id: string) => void
  onSettings: () => void
  settingsAlert: boolean
}) {
  const toast = useToast()
  const [text, setText] = useState('')
  const [editing, setEditing] = useState<ShopItem | null>(null)
  const recipeById = useMemo(() => new Map((recipes ?? []).map(r => [r.id, r])), [recipes])

  const groups = useMemo(() => {
    if (!items) return []
    return CATEGORIES.map(cat => ({
      cat,
      items: items
        .filter(i => (CATEGORY_BY_ID[i.category] ? i.category : 'misc') === cat.id)
        .sort((a, b) => Number(a.checked) - Number(b.checked) || a.name.localeCompare(b.name)),
    })).filter(g => g.items.length > 0)
  }, [items])

  if (!items) return <div className="screen"><Loading /></div>

  const done = items.filter(i => i.checked).length
  const total = items.length

  const add = async () => {
    const value = text.trim()
    if (!value) return
    setText('')
    await addManualItem(household, value)
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <h1>Shop</h1>
        <div className="row">
          {total > 0 && <Progress done={done} total={total} />}
          <SettingsButton onClick={onSettings} alert={settingsAlert} />
        </div>
      </div>

      {plan.length > 0 && (
        <>
          <h3 style={{ margin: '0 0 8px 4px' }}>Meals this shop</h3>
          <div className="meals">
            <AnimatePresence>
              {plan.map(p => (
                <motion.div
                  key={p.id}
                  className="meal"
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                >
                  <button style={{ display: 'block', width: '100%', textAlign: 'left' }} onClick={() => onOpenRecipe(p.id)}>
                    <RecipeImage src={recipeById.get(p.id)?.image ?? p.image} seed={p.id} />
                    <div className="info">
                      <div>{p.title}</div>
                      <span className="subtle">{p.portions} portions</span>
                    </div>
                  </button>
                  <button
                    className="x"
                    aria-label={`Remove ${p.title}`}
                    onClick={async () => { await removeRecipeFromShop(household, p); toast(`Removed ${p.title}`) }}
                  >
                    ✕
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </>
      )}

      <form className="add-item" onSubmit={e => { e.preventDefault(); add() }}>
        <input placeholder="Add an item, e.g. 2 lemons" value={text} onChange={e => setText(e.target.value)} enterKeyHint="done" />
        <motion.button className="btn mint" type="submit" whileTap={{ scale: 0.9 }} aria-label="Add">＋</motion.button>
      </form>

      {total === 0 ? (
        <motion.div className="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <motion.span className="big" animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 1.8 }}>🛒</motion.span>
          <h2>Your list is empty</h2>
          <p className="subtle">Add recipes from the Recipes tab, or type items above.</p>
        </motion.div>
      ) : (
        <LayoutGroup>
          {groups.map(({ cat, items: list }) => (
            <motion.section className="cat" key={cat.id} layout>
              <motion.div className="cat-head" style={{ background: cat.color }} layout>
                <span>{cat.emoji}</span> {cat.label}
                <span className="count">{list.filter(i => !i.checked).length}</span>
              </motion.div>
              <motion.div className="items" layout>
                <AnimatePresence initial={false}>
                  {list.map(item => {
                    const qty = totalQty(item)
                    return (
                      <motion.div
                        key={item.id}
                        layout
                        className={`item ${item.checked ? 'checked' : ''}`}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0, x: 60 }}
                        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
                        onClick={() => setChecked(household.id, item.id, !item.checked)}
                      >
                        <Check on={item.checked} />
                        <span className="name">{item.name}</span>
                        {qty !== null && <span className="qty">{formatQty(qty, item.unit)}</span>}
                        <button className="more" aria-label="Item options" onClick={e => { e.stopPropagation(); setEditing(item) }}>⋯</button>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </motion.div>
            </motion.section>
          ))}
        </LayoutGroup>
      )}

      {total > 0 && (
        <div className="row" style={{ justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
          {done > 0 && <button className="btn small ghost" onClick={() => clearChecked(household.id, items)}>Clear ticked ({done})</button>}
          <button
            className="btn small ghost"
            onClick={async () => {
              if (!confirm('Start a new shop? This clears the whole list and the meals.')) return
              await clearAll(household.id, items, plan)
              toast('Fresh list ✨')
            }}
          >
            Start new shop
          </button>
        </div>
      )}

      <Sheet open={!!editing} onClose={() => setEditing(null)}>
        {editing && (
          <>
            <h2 style={{ textTransform: 'capitalize' }}>{editing.name}</h2>
            {Object.keys(editing.contributions).length > 0 && (
              <p className="subtle" style={{ marginTop: -8 }}>
                For: {Object.keys(editing.contributions).map(id => recipeById.get(id)?.title ?? plan.find(p => p.id === id)?.title ?? 'a recipe').join(', ')}
              </p>
            )}
            <h3 style={{ margin: '12px 0 10px' }}>Move to aisle</h3>
            <div className="cat-grid">
              {CATEGORIES.map(c => (
                <motion.button
                  key={c.id}
                  whileTap={{ scale: 0.92 }}
                  className={`cat-option ${editing.category === c.id ? 'current' : ''}`}
                  style={{ background: c.color }}
                  onClick={async () => {
                    setEditing(null)
                    await Promise.all([
                      setItemCategory(household.id, editing.id, c.id),
                      setCategoryOverride(household, editing.name, c.id),
                    ])
                    toast(`${c.emoji} ${editing.name} will go in ${c.label} from now on`)
                  }}
                >
                  <span className="e">{c.emoji}</span>
                  {c.label}
                </motion.button>
              ))}
            </div>
            <button
              className="btn block ghost danger"
              style={{ marginTop: 20 }}
              onClick={async () => { setEditing(null); await deleteItem(household.id, editing.id) }}
            >
              Remove from list
            </button>
          </>
        )}
      </Sheet>
    </div>
  )
}

function Progress({ done, total }: { done: number; total: number }) {
  const r = 20
  const c = 2 * Math.PI * r
  const pct = total ? done / total : 0
  return (
    <div className="progress">
      <span className="subtle" style={{ fontWeight: 800 }}>{done}/{total}</span>
      <svg width="52" height="52" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r={r} fill="none" stroke="var(--line)" strokeWidth="7" />
        <motion.circle
          cx="26" cy="26" r={r} fill="none" stroke="var(--mint)" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={c}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transform="rotate(-90 26 26)"
          transition={{ type: 'spring', damping: 20 }}
        />
        <text x="26" y="31" textAnchor="middle" fontSize="16">{pct === 1 ? '🎉' : '🛒'}</text>
      </svg>
    </div>
  )
}
