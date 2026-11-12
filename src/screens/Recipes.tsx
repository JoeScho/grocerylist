import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { ALL, LabelTabs, labelColour } from '../components/LabelTabs'
import { RecipeImage } from '../components/RecipeImage'
import { ScoreBar } from '../components/ScoreBar'
import { SettingsButton } from '../components/SettingsButton'
import { loadRecipeOrder, orderRecipes, RECIPE_ORDERS, saveRecipeOrder, type RecipeOrder } from '../lib/recipeOrder'
import { currentMonth, scoreLabel, scoreRecipe } from '../lib/seasons'
import type { Household, PlanEntry, Recipe } from '../types'

export function Recipes({
  recipes, plan, shopMeals, household, label, onLabel, onManageLabels, onOpen, onAdd, onSettings, settingsAlert,
}: {
  recipes: Recipe[] | null
  plan: PlanEntry[]
  shopMeals: PlanEntry[]
  household: Household
  label: string
  onLabel: (label: string) => void
  onManageLabels: () => void
  onOpen: (id: string) => void
  onAdd: () => void
  onSettings: () => void
  settingsAlert: boolean
}) {
  const [search, setSearch] = useState('')
  const [order, setOrder] = useState<RecipeOrder>(loadRecipeOrder)
  const [month] = useState(currentMonth)
  const chooseOrder = (next: RecipeOrder) => { setOrder(next); saveRecipeOrder(next) }
  const inShop = useMemo(() => new Set(shopMeals.filter(p => !p.cooked).map(p => p.recipeId)), [shopMeals])
  const labels = household.recipeLabels
  const counts = useMemo(() => {
    const c: Record<string, number> = { [ALL]: recipes?.length ?? 0 }
    for (const r of recipes ?? []) for (const l of r.labels) c[l] = (c[l] ?? 0) + 1
    return c
  }, [recipes])
  // Scored once per recipe list, and only while ordering by sustainability,
  // which is also the only time the bar and percentage show.
  const scores = useMemo(
    () => (order === 'sustainability' && recipes ? new Map(recipes.map(r => [r.id, scoreRecipe(r.ingredients, month)])) : null),
    [recipes, order, month],
  )
  const filtered = useMemo(() => {
    if (!recipes) return recipes
    const q = search.trim().toLowerCase()
    const matches = recipes.filter(r =>
      (label === ALL || r.labels.includes(label)) &&
      (!q || r.title.toLowerCase().includes(q) || r.ingredients.some(i => i.toLowerCase().includes(q))),
    )
    return orderRecipes(matches, order, { plan, month, scores: scores ?? undefined })
  }, [recipes, search, label, order, plan, month, scores])

  return (
    <div className="screen">
      <div className="screen-header">
        <h1>Recipes</h1>
        <SettingsButton onClick={onSettings} alert={settingsAlert} />
      </div>
      {recipes && recipes.length > 0 && (
        <input className="search" placeholder="Search recipes or ingredients" value={search} onChange={e => setSearch(e.target.value)} />
      )}
      {recipes && recipes.length > 0 && (
        <label className="order-by">
          <span>Order by</span>
          <select value={order} onChange={e => chooseOrder(e.target.value as RecipeOrder)}>
            {RECIPE_ORDERS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      )}
      {recipes && recipes.length > 0 && (
        <LabelTabs labels={labels} counts={counts} value={label} onChange={onLabel} onManage={onManageLabels} />
      )}

      {!filtered ? (
        <Loading />
      ) : recipes?.length === 0 ? (
        <motion.div className="empty" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <motion.span className="big emo" animate={{ rotate: [0, -10, 10, 0] }} transition={{ repeat: Infinity, duration: 2.5 }}>🍳</motion.span>
          <h2>No recipes yet</h2>
          <p className="subtle">Paste a link, an Instagram caption, or write one yourself.</p>
          <button className="btn" onClick={onAdd} style={{ marginTop: 12 }}>Add your first recipe</button>
        </motion.div>
      ) : filtered.length === 0 ? (
        <motion.div className="empty" key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ paddingTop: 30 }}>
          <span className="big emo">🔍</span>
          <p className="subtle">
            {search ? `Nothing matches “${search}”${label !== ALL ? ` in ${label}` : ''}.` : `No ${label} recipes yet. Tap the + to add one, or label an existing recipe when you edit it.`}
          </p>
        </motion.div>
      ) : (
        <div className="grid" key={label}>
          {filtered.map((r, i) => (
            <motion.button
              key={r.id}
              className="recipe-card"
              style={{ position: 'relative' }}
              onClick={() => onOpen(r.id)}
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: Math.min(i, 10) * 0.04, type: 'spring', damping: 20 }}
              whileTap={{ scale: 0.96 }}
            >
              <RecipeImage className="thumb" src={r.image} seed={r.id} />
              {scores?.has(r.id) && <ScoreBar score={scores.get(r.id)!} />}
              {inShop.has(r.id) && <span className="in-shop">In shop</span>}
              <div className="meta">
                <div className="title">{r.title || 'Untitled recipe'}</div>
                <div className="subtle" style={{ fontSize: 13, marginTop: 4 }}>
                  {r.ingredients.length} ingredients
                </div>
                {scores?.has(r.id) && (
                  <div className="subtle" style={{ fontSize: 13, marginTop: 2 }}>{scoreLabel(scores.get(r.id)!)}</div>
                )}
                {r.labels.length > 0 && (
                  <div className="card-labels">
                    {r.labels.filter(l => labels.includes(l)).map(l => (
                      <span key={l} className="card-label" style={{ background: labelColour(labels, l) }}>{l}</span>
                    ))}
                  </div>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      )}

      <motion.button
        className="fab"
        onClick={onAdd}
        aria-label="Add recipe"
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        whileTap={{ scale: 0.85, rotate: 90 }}
        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      >
        +
      </motion.button>
    </div>
  )
}

export function Loading() {
  return (
    <div className="loader">
      <motion.span className="loader-spin" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}><span className="emo">🍋</span></motion.span>
    </div>
  )
}
