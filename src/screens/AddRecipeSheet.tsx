import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { FieldTools } from '../components/FieldTools'
import { Sheet } from '../components/Sheet'
import { importFromUrl } from '../data/recipes'
import { parseCaption } from '../lib/caption'
import type { RecipeDraft } from '../types'

type Mode = 'choose' | 'link' | 'caption'

const EMPTY: RecipeDraft = { title: '', image: null, sourceUrl: null, servings: 4, ingredients: [], steps: [], labels: [] }

export function AddRecipeSheet({
  open, onClose, onDraft,
}: { open: boolean; onClose: () => void; onDraft: (draft: RecipeDraft, warning?: string) => void }) {
  const [mode, setMode] = useState<Mode>('choose')
  const [url, setUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [captionLink, setCaptionLink] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const close = () => {
    onClose()
    window.setTimeout(() => { setMode('choose'); setError(null); setBusy(false) }, 300)
  }

  const doImport = async () => {
    setError(null)
    setBusy(true)
    try {
      const draft = await importFromUrl(url.trim())
      setUrl('')
      const warning = draft.ingredients.length === 0
        ? "Couldn't find a recipe on that page. Fill in the gaps below, or paste the text instead."
        : undefined
      onDraft(draft, warning)
      close()
    } catch (e: unknown) {
      setError((e as { message?: string }).message || 'Could not import that link.')
    } finally {
      setBusy(false)
    }
  }

  const doCaption = () => {
    const parsed = parseCaption(caption)
    onDraft(
      { ...EMPTY, ...parsed, servings: parsed.servings ?? 4, sourceUrl: captionLink.trim() || null },
      parsed.ingredients.length === 0 ? "Couldn't spot the ingredients. Add them below, one per line." : undefined,
    )
    setCaption('')
    setCaptionLink('')
    close()
  }

  // Pasting an Instagram link into the link box is the most likely mistake.
  const looksInstagram = /instagram\.com/i.test(url)

  return (
    <Sheet open={open} onClose={close}>
      <AnimatePresence mode="wait">
        {mode === 'choose' && (
          <motion.div key="choose" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
            <h2>Add a recipe</h2>
            <div className="option-grid">
              {[
                { m: 'link' as const, e: '🔗', t: 'From a website', s: 'Paste a recipe link', c: 'var(--sky)' },
                { m: 'caption' as const, e: '📸', t: 'From Instagram', s: 'Paste the caption text', c: 'var(--pink)' },
                { m: 'manual' as const, e: '✍️', t: 'Write it myself', s: 'Type ingredients and steps', c: 'var(--mint)' },
              ].map((o, i) => (
                <motion.button
                  key={o.m}
                  className="option"
                  style={{ background: o.c }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => (o.m === 'manual' ? (onDraft(EMPTY), close()) : setMode(o.m))}
                >
                  <span className="emoji">{o.e}</span>
                  <span>{o.t}<small>{o.s}</small></span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {mode === 'link' && (
          <motion.div key="link" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}>
            <button className="text-btn" onClick={() => setMode('choose')}>← Back</button>
            <h2 style={{ marginTop: 6 }}>🔗 Paste a link</h2>
            {error && <div className="error-box">{error}</div>}
            {looksInstagram && <div className="hint">Instagram won't let apps read posts. Use “From Instagram” and paste the caption, or open the website link from the post.</div>}
            <label className="field">
              <span>Recipe web address</span>
              <FieldTools value={url} onChange={setUrl} url>
                <input type="url" inputMode="url" placeholder="https://…" value={url} onChange={e => setUrl(e.target.value)} autoFocus />
              </FieldTools>
            </label>
            <button className="btn block" disabled={!url.trim() || busy} onClick={doImport}>
              {busy ? <Cooking /> : 'Fetch recipe'}
            </button>
          </motion.div>
        )}

        {mode === 'caption' && (
          <motion.div key="caption" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}>
            <button className="text-btn" onClick={() => setMode('choose')}>← Back</button>
            <h2 style={{ marginTop: 6 }}>📸 Paste the caption</h2>
            <label className="field">
              <span>Caption text</span>
              <FieldTools value={caption} onChange={setCaption}>
                <textarea
                  placeholder={'Creamy chicken orzo\n\nIngredients:\n500g chicken thighs\n1 onion\n\nMethod:\n1. Fry the chicken…'}
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  style={{ minHeight: 220 }}
                  autoFocus
                />
              </FieldTools>
            </label>
            <label className="field">
              <span>Post link (optional)</span>
              <FieldTools value={captionLink} onChange={setCaptionLink} url>
                <input type="url" inputMode="url" placeholder="https://instagram.com/p/…" value={captionLink} onChange={e => setCaptionLink(e.target.value)} />
              </FieldTools>
            </label>
            <button className="btn block" disabled={!caption.trim()} onClick={doCaption}>Read caption</button>
          </motion.div>
        )}
      </AnimatePresence>
    </Sheet>
  )
}

function Cooking() {
  return (
    <span className="row" style={{ gap: 6 }}>
      {['🍳', '🥄', '🔥'].map((e, i) => (
        <motion.span key={e} animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.12 }}>{e}</motion.span>
      ))}
      <span style={{ marginLeft: 6 }}>Fetching…</span>
    </span>
  )
}
