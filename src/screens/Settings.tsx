import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { signOut, type User } from 'firebase/auth'
import { auth } from '../firebase'
import { Emoji } from '../components/Emoji'
import { FieldTools } from '../components/FieldTools'
import { useToast } from '../components/Toast'
import {
  addMember, addStaple, removeMember, removeStaple, renameHousehold, switchHousehold,
} from '../data/household'
import { isIos, isStandalone, useInstallPrompt } from '../lib/install'
import { normaliseName } from '../lib/ingredients'
import { setTheme, THEMES, useTheme } from '../lib/theme'
import type { Household } from '../types'

interface Invite { id: string; name: string; ownerEmail: string }

const AVATAR_COLOURS = ['var(--coral)', 'var(--grape)', 'var(--sky)', 'var(--mint)', 'var(--orange)']

export function Settings({
  user, household, invites, onBack,
}: { user: User; household: Household; invites: Invite[]; onBack: () => void }) {
  const toast = useToast()
  const theme = useTheme()
  const { available, install } = useInstallPrompt()
  const [email, setEmail] = useState('')
  const [staple, setStaple] = useState('')
  const [name, setName] = useState(household.name)
  const isOwner = household.ownerUid === user.uid
  const me = (user.email ?? '').toLowerCase()

  const invite = async () => {
    const value = email.trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(value)) { toast('That email doesn’t look right'); return }
    await addMember(household, value)
    setEmail('')
    const link = window.location.origin
    const message = `I've added you to our shopping list on Schoceries. Sign in with this Google account (${value}): ${link}`
    if (navigator.share) {
      navigator.share({ title: 'Join our shopping list', text: message }).catch(() => {})
    } else {
      window.location.href = `mailto:${value}?subject=${encodeURIComponent('Join our shopping list')}&body=${encodeURIComponent(message)}`
    }
    toast(`${value} can now sign in and see everything`)
  }

  const addStapleItem = async () => {
    const value = normaliseName(staple)
    if (!value) return
    setStaple('')
    await addStaple(household, value)
  }

  return (
    <motion.div className="screen" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}>
      <div className="screen-header">
        <button className="icon-btn" onClick={onBack} aria-label="Back">←</button>
        <h1 style={{ flex: 1 }}>Settings</h1>
        <button className="text-btn" onClick={() => signOut(auth)}>Sign out</button>
      </div>

      <AnimatePresence>
        {invites.map(inv => (
          <motion.div key={inv.id} className="card section invite" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <h3 style={{ marginBottom: 6 }}><Emoji>💌</Emoji> You've been invited</h3>
            <p style={{ margin: '0 0 12px' }}>{inv.ownerEmail} shared “{inv.name}” with you.</p>
            <button className="btn small" onClick={() => switchHousehold(user.uid, inv.id)}>Switch to this list</button>
          </motion.div>
        ))}
      </AnimatePresence>

      {!isStandalone() && (
        <div className="card section promo">
          <h3 style={{ marginBottom: 6 }}><Emoji>📲</Emoji> Put Schoceries on your home screen</h3>
          {available ? (
            <button className="btn small grape" onClick={install}>Install app</button>
          ) : isIos() ? (
            <p style={{ margin: 0 }}>In Safari, tap the Share button, then <b>Add to Home Screen</b>.</p>
          ) : (
            <p style={{ margin: 0 }}>Open your browser menu and choose <b>Install app</b> or <b>Add to Home screen</b>.</p>
          )}
        </div>
      )}

      <div className="card section">
        <h3 style={{ marginBottom: 6 }}><Emoji>🎨</Emoji> Look</h3>
        <p className="subtle" style={{ marginTop: 0 }}>Changes how the app looks on this device only.</p>
        <div className="theme-list" role="radiogroup" aria-label="Look">
          {THEMES.map(t => (
            <button
              key={t.value}
              role="radio"
              aria-checked={theme.value === t.value}
              className={`theme-choice ${theme.value === t.value ? 'on' : ''}`}
              onClick={() => setTheme(t.value)}
            >
              <span className="theme-swatch" style={{ background: t.swatch[0] }}>
                <i style={{ background: t.swatch[1] }} />
                <i style={{ background: t.swatch[2] }} />
              </span>
              <span className="theme-name">{t.label}<small>{t.blurb}</small></span>
              <span className="theme-tick" aria-hidden>✓</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card section">
        <h3 style={{ marginBottom: 10 }}><Emoji>🏡</Emoji> Household</h3>
        <form className="add-item" style={{ marginBottom: 6 }} onSubmit={e => { e.preventDefault(); renameHousehold(household, name.trim() || household.name); toast('Renamed') }}>
          <input value={name} onChange={e => setName(e.target.value)} />
          {name !== household.name && <button className="btn small" type="submit">Save</button>}
        </form>

        {household.memberEmails.map((m, i) => (
          <div className="member" key={m}>
            <span className="avatar" style={{ background: AVATAR_COLOURS[i % AVATAR_COLOURS.length] }}>{m[0].toUpperCase()}</span>
            <span style={{ flex: 1, fontWeight: 'var(--w-mid)', wordBreak: 'break-all' }}>
              {m}
              {m === household.ownerEmail && <span className="subtle" style={{ fontSize: 13 }}> · owner</span>}
              {m === me && <span className="subtle" style={{ fontSize: 13 }}> · you</span>}
            </span>
            {m !== household.ownerEmail && (isOwner || m === me) && (
              <button
                className="text-btn danger"
                onClick={() => confirm(m === me ? 'Leave this household?' : `Remove ${m}?`) && removeMember(household, m)}
              >
                {m === me ? 'Leave' : 'Remove'}
              </button>
            )}
          </div>
        ))}

        <p className="subtle" style={{ margin: '12px 0 8px' }}>Share recipes and the list with someone by adding their Google email.</p>
        <form className="add-item" style={{ marginBottom: 0 }} onSubmit={e => { e.preventDefault(); invite() }}>
          <FieldTools value={email} onChange={setEmail}>
            <input type="email" inputMode="email" placeholder="partner@gmail.com" value={email} onChange={e => setEmail(e.target.value)} />
          </FieldTools>
          <button className="btn small grape" type="submit">Invite</button>
        </form>
      </div>

      <div className="card section">
        <h3 style={{ marginBottom: 6 }}><Emoji>⭐</Emoji> Cupboard staples</h3>
        <p className="subtle" style={{ marginTop: 0 }}>These start unticked when you add a recipe to the shop. You can still tick them if you've run out.</p>
        <form className="add-item" onSubmit={e => { e.preventDefault(); addStapleItem() }}>
          <input placeholder="e.g. soy sauce" value={staple} onChange={e => setStaple(e.target.value)} />
          <button className="btn small mint" type="submit">Add</button>
        </form>
        <div className="staple-chips">
          <AnimatePresence>
            {[...household.staples].sort().map(s => (
              <motion.span key={s} className="staple-chip" layout initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                {s}
                <button aria-label={`Remove ${s}`} onClick={() => removeStaple(household, s)}>✕</button>
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
