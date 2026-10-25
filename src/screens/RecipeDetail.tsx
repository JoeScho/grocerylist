import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { labelColour } from '../components/LabelTabs'
import { RecipeImage } from '../components/RecipeImage'
import { Tabs } from '../components/Tabs'
import { CATEGORY_BY_ID, categorise } from '../lib/categories'
import { parseIngredient } from '../lib/ingredients'
import { isStaple } from '../lib/list'
import type { Household, PlanEntry, Recipe } from '../types'

const STEP_COLOURS = ['var(--coral)', 'var(--grape)', 'var(--sky)', 'var(--mint)', 'var(--orange)', 'var(--pink)']

export function RecipeDetail({
  recipe, household, planEntry, onBack, onEdit, onDelete, onAddToShop, onToggleStaple,
}: {
  recipe: Recipe
  household: Household
  planEntry: PlanEntry | undefined
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
  onAddToShop: () => void
  onToggleStaple: (name: string, staple: boolean) => void
}) {
  const [tab, setTab] = useState<'ingredients' | 'steps'>('ingredients')
  const [done, setDone] = useState<Set<number>>(new Set())
  const [menu, setMenu] = useState(false)
  const host = (() => {
    try { return recipe.sourceUrl ? new URL(recipe.sourceUrl).hostname.replace(/^www\./, '') : null } catch { return null }
  })()

  return (
    <motion.div className="screen" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}>
      <div className="hero">
        <RecipeImage src={recipe.image} seed={recipe.id} />
        <div className="top">
          <button className="icon-btn" onClick={onBack} aria-label="Back">←</button>
          <div style={{ position: 'relative' }}>
            <button className="icon-btn" onClick={() => setMenu(m => !m)} aria-label="More">⋯</button>
            <AnimatePresence>
              {menu && (
                <motion.div
                  className="card"
                  style={{ position: 'absolute', right: 0, top: 52, padding: 8, minWidth: 150, zIndex: 5 }}
                  initial={{ opacity: 0, scale: 0.8, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <button className="text-btn" style={{ display: 'block', width: '100%', textAlign: 'left', padding: 10 }} onClick={onEdit}>✏️ Edit</button>
                  <button className="text-btn danger" style={{ display: 'block', width: '100%', textAlign: 'left', padding: 10 }} onClick={() => confirm('Delete this recipe?') && onDelete()}>🗑️ Delete</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <h1 className="detail-title">{recipe.title}</h1>
      <div className="chips">
        {recipe.labels.filter(l => household.recipeLabels.includes(l)).map(l => (
          <span key={l} className="chip" style={{ background: labelColour(household.recipeLabels, l), color: '#fff', boxShadow: 'none' }}>{l}</span>
        ))}
        {recipe.servings && <span className="chip">🍽️ Serves {recipe.servings}</span>}
        {host && <a className="chip" href={recipe.sourceUrl!} target="_blank" rel="noreferrer">🔗 {host}</a>}
        {planEntry && <span className="chip" style={{ background: 'var(--mint)', color: '#fff', boxShadow: '0 3px 0 #2aa955' }}>🛒 In shop · {planEntry.portions} portions</span>}
      </div>

      <Tabs
        id="recipe"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'ingredients', label: `Ingredients (${recipe.ingredients.length})` },
          { value: 'steps', label: `Steps (${recipe.steps.length})` },
        ]}
      />

      <AnimatePresence mode="wait">
        {tab === 'ingredients' ? (
          <motion.ul key="ing" className="ing-list" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            {recipe.ingredients.length === 0 && <p className="subtle">No ingredients yet.</p>}
            {recipe.ingredients.map((text, i) => {
              const p = parseIngredient(text)
              const staple = isStaple(p.name, household.staples)
              const cat = CATEGORY_BY_ID[categorise(p.name, household.categoryOverrides)]
              return (
                <motion.li key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.025 }}>
                  <span className="dot" style={{ background: cat.color }} />
                  <span className="txt">{text}</span>
                  <button
                    className="staple-tag"
                    style={staple ? undefined : { background: 'transparent', color: 'var(--ink-soft)', border: '2px dashed var(--line)' }}
                    onClick={() => onToggleStaple(p.name, !staple)}
                    title={staple ? 'Cupboard staple: left off the shop by default' : 'Mark as cupboard staple'}
                  >
                    {staple ? '★ Staple' : '☆ Staple'}
                  </button>
                </motion.li>
              )
            })}
          </motion.ul>
        ) : (
          <motion.ol key="steps" className="steps" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            {recipe.steps.length === 0 && <p className="subtle">No steps yet.</p>}
            {recipe.steps.map((s, i) => (
              <motion.li
                key={i}
                className={done.has(i) ? 'done' : ''}
                onClick={() => setDone(d => { const n = new Set(d); n.has(i) ? n.delete(i) : n.add(i); return n })}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: done.has(i) ? 0.45 : 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="num" style={{ background: STEP_COLOURS[i % STEP_COLOURS.length] }}>{done.has(i) ? '✓' : i + 1}</span>
                <span className="body">{s}</span>
              </motion.li>
            ))}
            {recipe.steps.length > 0 && <p className="subtle" style={{ textAlign: 'center', fontSize: 14 }}>Tap a step to tick it off.</p>}
          </motion.ol>
        )}
      </AnimatePresence>

      <div style={{ height: 80 }} />
      <div className="sticky-cta">
        <motion.button className="btn block" onClick={onAddToShop} whileTap={{ scale: 0.97 }} initial={{ y: 80 }} animate={{ y: 0 }} transition={{ type: 'spring', delay: 0.2 }}>
          🛒 {planEntry ? 'Update in shop' : 'Add to shop'}
        </motion.button>
      </div>
    </motion.div>
  )
}
