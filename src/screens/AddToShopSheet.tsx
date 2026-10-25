import { motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { Check } from '../components/Check'
import { Sheet } from '../components/Sheet'
import { formatQty, parseIngredient, scale } from '../lib/ingredients'
import { isStaple } from '../lib/list'
import type { Household, PlanEntry, Recipe } from '../types'

export function AddToShopSheet({
  open, onClose, recipe, household, planEntry, onConfirm,
}: {
  open: boolean
  onClose: () => void
  recipe: Recipe
  household: Household
  planEntry: PlanEntry | undefined
  onConfirm: (portions: number, ingredients: string[]) => Promise<void>
}) {
  const parsed = useMemo(() => recipe.ingredients.map(parseIngredient), [recipe.ingredients])
  const [portions, setPortions] = useState(4)
  const [selected, setSelected] = useState<boolean[]>([])
  const [busy, setBusy] = useState(false)

  // Reset each time the sheet opens: staples start unticked.
  useEffect(() => {
    if (!open) return
    setPortions(planEntry?.portions ?? 4)
    setSelected(parsed.map(p => !isStaple(p.name, household.staples)))
    setBusy(false)
  }, [open, parsed, household.staples, planEntry])

  const confirm = async () => {
    setBusy(true)
    try {
      await onConfirm(portions, recipe.ingredients.filter((_, i) => selected[i]))
    } finally {
      setBusy(false)
    }
  }

  const count = selected.filter(Boolean).length

  return (
    <Sheet open={open} onClose={onClose}>
      <h2>How many portions?</h2>
      <div className="stepper">
        <motion.button whileTap={{ scale: 0.85 }} onClick={() => setPortions(p => Math.max(1, p - 1))} aria-label="Fewer">−</motion.button>
        <motion.span key={portions} className="value" initial={{ scale: 1.4, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }}>{portions}</motion.span>
        <motion.button whileTap={{ scale: 0.85 }} onClick={() => setPortions(p => Math.min(30, p + 1))} aria-label="More">+</motion.button>
      </div>
      {!recipe.servings && <p className="subtle" style={{ textAlign: 'center', marginTop: -8 }}>This recipe doesn't say how many it serves, so quantities aren't scaled.</p>}

      <div className="row" style={{ marginBottom: 6 }}>
        <h3>Ingredients</h3>
        <span className="spacer" />
        <button className="text-btn" onClick={() => setSelected(s => s.map(() => count < s.length))}>
          {count < selected.length ? 'Select all' : 'Select none'}
        </button>
      </div>
      <ul className="ing-list" style={{ marginBottom: 20 }}>
        {parsed.map((p, i) => {
          const staple = isStaple(p.name, household.staples)
          const qty = scale(p.qty, recipe.servings ?? portions, portions)
          return (
            <li key={i} onClick={() => setSelected(s => s.map((v, j) => (j === i ? !v : v)))} style={{ cursor: 'pointer' }}>
              <Check on={!!selected[i]} />
              <span className="txt" style={{ opacity: selected[i] ? 1 : 0.5 }}>
                <span style={{ textTransform: 'capitalize', fontWeight: 800 }}>{p.name}</span>
                {qty !== null && <span className="subtle"> · {formatQty(qty, p.unit)}</span>}
              </span>
              {staple && <span className="staple-tag">Staple</span>}
            </li>
          )
        })}
      </ul>
      <button className="btn block" disabled={busy || count === 0} onClick={confirm}>
        {busy ? 'Adding…' : `Add ${count} item${count === 1 ? '' : 's'} to shop`}
      </button>
    </Sheet>
  )
}
