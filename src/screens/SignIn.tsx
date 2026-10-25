import { motion } from 'motion/react'
import { useState } from 'react'
import { signInWithPopup, signInWithRedirect } from 'firebase/auth'
import { auth, googleProvider } from '../firebase'

const FLOATERS = [
  { e: '🥕', x: '8%', y: '12%', d: 0 },
  { e: '🍋', x: '82%', y: '9%', d: 0.6 },
  { e: '🥑', x: '86%', y: '72%', d: 1.1 },
  { e: '🍅', x: '6%', y: '78%', d: 0.3 },
  { e: '🧀', x: '70%', y: '40%', d: 1.6 },
  { e: '🌶️', x: '14%', y: '45%', d: 0.9 },
]

export function SignIn() {
  const [error, setError] = useState<string | null>(null)

  const signIn = async () => {
    setError(null)
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (e: unknown) {
      const code = (e as { code?: string }).code
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
        await signInWithRedirect(auth, googleProvider)
      } else if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        setError('Sign-in did not work. Please try again.')
      }
    }
  }

  return (
    <div className="signin">
      {FLOATERS.map(f => (
        <motion.span
          key={f.e}
          className="float"
          style={{ left: f.x, top: f.y }}
          animate={{ y: [0, -18, 0], rotate: [0, 10, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, delay: f.d, ease: 'easeInOut' }}
        >
          {f.e}
        </motion.span>
      ))}
      <div>
        <motion.span
          className="logo"
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 12 }}
        >
          🧺
        </motion.span>
        <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
          Schoceries
        </motion.h1>
        <motion.p className="subtle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          Recipes in, sorted shopping list out.
        </motion.p>
        {error && <div className="error-box" style={{ marginTop: 20 }}>{error}</div>}
        <motion.button
          className="google-btn"
          onClick={signIn}
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.45, type: 'spring' }}
          whileTap={{ scale: 0.95 }}
        >
          <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden>
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
            <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
          </svg>
          Continue with Google
        </motion.button>
      </div>
    </div>
  )
}
