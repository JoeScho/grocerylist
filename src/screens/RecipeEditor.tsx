import { motion } from 'motion/react'
import { useRef, useState } from 'react'
import { labelColour } from '../components/LabelTabs'
import { FieldTools } from '../components/FieldTools'
import { RecipeImage } from '../components/RecipeImage'
import { fileToDataUrl } from '../lib/image'
import type { RecipeDraft } from '../types'

const splitIngredients = (text: string) => text.split('\n').map(s => s.trim()).filter(Boolean)
// Steps are separated by blank lines, or one per line when there are none.
const splitSteps = (text: string) =>
  (/\n\s*\n/.test(text) ? text.split(/\n\s*\n/) : text.split('\n')).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean)

export function RecipeEditor({
  initial, labels, warning, isNew, onSave, onCancel,
}: {
  initial: RecipeDraft
  labels: string[]
  warning?: string
  isNew: boolean
  onSave: (draft: RecipeDraft) => Promise<void>
  onCancel: () => void
}) {
  const [title, setTitle] = useState(initial.title)
  const [image, setImage] = useState(initial.image)
  const [sourceUrl, setSourceUrl] = useState(initial.sourceUrl ?? '')
  const [servings, setServings] = useState(initial.servings ? String(initial.servings) : '')
  const [ingredients, setIngredients] = useState(initial.ingredients.join('\n'))
  const [steps, setSteps] = useState(initial.steps.join('\n\n'))
  const [chosen, setChosen] = useState<string[]>(initial.labels ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const pickImage = async (file: File | undefined) => {
    if (!file) return
    try {
      setImage(await fileToDataUrl(file))
    } catch {
      setError("That image couldn't be loaded.")
    }
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      await onSave({
        title: title.trim() || 'Untitled recipe',
        image,
        sourceUrl: sourceUrl.trim() || null,
        servings: Number(servings) > 0 ? Number(servings) : null,
        labels: chosen.filter(l => labels.includes(l)),
        ingredients: splitIngredients(ingredients),
        steps: splitSteps(steps),
      })
    } catch (e: unknown) {
      setError((e as { message?: string }).message ?? 'Could not save.')
      setSaving(false)
    }
  }

  return (
    <motion.div className="screen" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
      <div className="screen-header">
        <button className="text-btn" onClick={onCancel}>Cancel</button>
        <h2>{isNew ? 'New recipe' : 'Edit recipe'}</h2>
        <button className="btn small mint" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>

      {warning && <div className="hint">{warning}</div>}
      {error && <div className="error-box">{error}</div>}

      <div style={{ marginBottom: 16 }}>
        <input ref={fileInput} type="file" accept="image/*" hidden onChange={e => pickImage(e.target.files?.[0])} />
        {image ? (
          <div style={{ position: 'relative' }}>
            <RecipeImage className="editor-img" src={image} seed={title} />
            <div className="row" style={{ position: 'absolute', bottom: 12, right: 12 }}>
              <button className="btn small ghost" onClick={() => fileInput.current?.click()}>Change</button>
              <button className="btn small ghost" onClick={() => setImage(null)}>Remove</button>
            </div>
          </div>
        ) : (
          <button className="img-drop" onClick={() => fileInput.current?.click()}>
            <span><span style={{ fontSize: 40, display: 'block' }}>📷</span>Add a photo</span>
          </button>
        )}
      </div>

      <label className="field">
        <span>Title</span>
        <FieldTools value={title} onChange={setTitle}>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Grandma's lasagne" />
        </FieldTools>
      </label>
      {labels.length > 0 && (
        <div className="field">
          <span style={{ display: 'block', fontWeight: 800, fontSize: 14, margin: '0 0 8px 4px', color: 'var(--ink-soft)' }}>Labels</span>
          <div className="label-picker">
            {labels.map(l => {
              const on = chosen.includes(l)
              return (
                <motion.button
                  key={l}
                  type="button"
                  className={`label-choice ${on ? 'on' : ''}`}
                  style={on ? { background: labelColour(labels, l) } : undefined}
                  animate={{ scale: on ? [1, 1.12, 1] : 1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setChosen(c => (on ? c.filter(x => x !== l) : [...c, l]))}
                >
                  {on ? '✓ ' : ''}{l}
                </motion.button>
              )
            })}
          </div>
        </div>
      )}
      <div className="row" style={{ alignItems: 'flex-start', marginTop: 16 }}>
        <label className="field" style={{ width: 110 }}>
          <span>Serves</span>
          <input type="number" inputMode="numeric" min={1} value={servings} onChange={e => setServings(e.target.value)} placeholder="4" />
        </label>
        <label className="field" style={{ flex: 1 }}>
          <span>Source link</span>
          <FieldTools value={sourceUrl} onChange={setSourceUrl} url>
            <input type="url" inputMode="url" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://…" />
          </FieldTools>
        </label>
      </div>
      <label className="field">
        <span>Ingredients · one per line</span>
        <FieldTools value={ingredients} onChange={setIngredients}>
          <textarea value={ingredients} onChange={e => setIngredients(e.target.value)} style={{ minHeight: 200 }} placeholder={'500g chicken thighs\n1 onion, diced\n2 tbsp olive oil'} />
        </FieldTools>
      </label>
      <label className="field">
        <span>Steps · leave a blank line between steps</span>
        <FieldTools value={steps} onChange={setSteps}>
          <textarea value={steps} onChange={e => setSteps(e.target.value)} style={{ minHeight: 240 }} placeholder={'Fry the onion until soft.\n\nAdd the chicken and brown all over.'} />
        </FieldTools>
      </label>

      {error && <div className="error-box">{error}</div>}
      <motion.button className="btn block mint" onClick={save} disabled={saving} whileTap={{ scale: 0.97 }} style={{ marginTop: 8 }}>
        {saving ? 'Saving…' : isNew ? 'Save recipe' : 'Save changes'}
      </motion.button>
      <button className="btn block ghost" onClick={onCancel} style={{ marginTop: 14 }}>Cancel</button>
    </motion.div>
  )
}
