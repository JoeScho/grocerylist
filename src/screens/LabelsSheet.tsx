import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { labelColour } from '../components/LabelTabs'
import { Sheet } from '../components/Sheet'
import { useToast } from '../components/Toast'
import { setRecipeLabels } from '../data/household'
import { deleteLabel, renameLabel } from '../data/recipes'
import type { Household, Recipe } from '../types'

export function LabelsSheet({
  open, onClose, household, recipes, onRenamed, onDeleted,
}: {
  open: boolean
  onClose: () => void
  household: Household
  recipes: Recipe[]
  onRenamed: (from: string, to: string) => void
  onDeleted: (label: string) => void
}) {
  const toast = useToast()
  const [text, setText] = useState('')
  const [editing, setEditing] = useState<{ from: string; to: string } | null>(null)
  const labels = household.recipeLabels
  const exists = (name: string) => labels.some(l => l.toLowerCase() === name.toLowerCase())

  const add = async () => {
    const name = text.trim()
    if (!name) return
    if (exists(name)) { toast(`“${name}” already exists`); return }
    setText('')
    await setRecipeLabels(household, [...labels, name])
  }

  const saveRename = async () => {
    if (!editing) return
    const to = editing.to.trim()
    setEditing(null)
    if (!to || to === editing.from) return
    if (exists(to) && to.toLowerCase() !== editing.from.toLowerCase()) { toast(`“${to}” already exists`); return }
    await renameLabel(household, recipes, editing.from, to)
    onRenamed(editing.from, to)
  }

  const remove = async (label: string) => {
    const used = recipes.filter(r => r.labels.includes(label)).length
    const msg = used ? `Delete “${label}”? It's on ${used} recipe${used === 1 ? '' : 's'}. The recipes stay, just without this label.` : `Delete “${label}”?`
    if (!confirm(msg)) return
    await deleteLabel(household, recipes, label)
    onDeleted(label)
  }

  return (
    <Sheet open={open} onClose={() => { setEditing(null); onClose() }}>
      <h2>Recipe labels</h2>
      <form className="add-item" onSubmit={e => { e.preventDefault(); add() }}>
        <input placeholder="New label, e.g. Batch cook" value={text} onChange={e => setText(e.target.value)} maxLength={30} />
        <button className="btn small mint" type="submit">Add</button>
      </form>
      {labels.length === 0 && <p className="subtle">No labels yet.</p>}
      <div className="label-list">
        <AnimatePresence initial={false}>
          {labels.map(l => (
            <motion.div
              key={l}
              className="label-row"
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <span className="dot" style={{ background: labelColour(labels, l) }} />
              {editing?.from === l ? (
                <form style={{ flex: 1, display: 'flex', gap: 8 }} onSubmit={e => { e.preventDefault(); saveRename() }}>
                  <input value={editing.to} onChange={e => setEditing({ from: l, to: e.target.value })} autoFocus maxLength={30} />
                  <button className="btn small" type="submit">Save</button>
                </form>
              ) : (
                <>
                  <span style={{ flex: 1, fontWeight: 800 }}>{l}</span>
                  <span className="subtle" style={{ fontSize: 14 }}>{recipes.filter(r => r.labels.includes(l)).length}</span>
                  <button className="text-btn" onClick={() => setEditing({ from: l, to: l })}>Rename</button>
                  <button className="text-btn danger" onClick={() => remove(l)} aria-label={`Delete ${l}`}>✕</button>
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Sheet>
  )
}
