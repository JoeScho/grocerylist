// The looks the app can wear, and the choice remembered on this device.
// The colours and shapes of each one live in styles.css under [data-theme].

import { useSyncExternalStore } from 'react'

export type Theme = 'fun' | 'elegant' | 'midnight' | 'market' | 'retro'

export interface ThemeInfo {
  value: Theme
  label: string
  blurb: string
  // Food emoji as decoration. Themes without it show line icons or nothing.
  emoji: boolean
  // What a small win looks like: emoji confetti, or a quiet drawn tick.
  celebration: 'confetti' | 'flourish'
  // Page background, primary colour and highlight, for the picker swatch and the browser bar.
  swatch: [string, string, string]
}

export const THEMES: ThemeInfo[] = [
  { value: 'fun', label: 'Fun', blurb: 'Bright, bubbly and bouncy', emoji: true, celebration: 'confetti', swatch: ['#fff8ef', '#ff5a5f', '#ffd23f'] },
  { value: 'elegant', label: 'Elegant', blurb: 'Serif type on warm ivory', emoji: false, celebration: 'flourish', swatch: ['#efe7d8', '#241f19', '#8a6a35'] },
  { value: 'midnight', label: 'Midnight', blurb: 'Dark, with deep green', emoji: false, celebration: 'flourish', swatch: ['#0f1412', '#2e7d4f', '#5fbf8a'] },
  { value: 'market', label: 'Market', blurb: 'Greengrocer paper and ink', emoji: true, celebration: 'confetti', swatch: ['#efe6d5', '#2f5d3a', '#f0c75e'] },
  { value: 'retro', label: 'Retro', blurb: 'Seventies orange and mustard', emoji: true, celebration: 'confetti', swatch: ['#f3e3c3', '#d9541e', '#e9a820'] },
]

const DEFAULT: Theme = 'fun'
const KEY = 'schoceries.theme'

export const themeInfo = (theme: Theme): ThemeInfo => THEMES.find(t => t.value === theme) ?? THEMES[0]

// Storage can be missing or blocked (private browsing); the theme then just isn't remembered.
export function loadTheme(): Theme {
  try {
    const saved = localStorage.getItem(KEY)
    return THEMES.find(t => t.value === saved)?.value ?? DEFAULT
  } catch {
    return DEFAULT
  }
}

export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // Not remembered; nothing else to do.
  }
}

// Emoji and the invisible characters that join or style them, plus the space that follows.
const EMOJI = /[\p{Extended_Pictographic}‍️]+\s*/gu

// For themes without emoji: "🛒 Ragu added" becomes "Ragu added".
export const stripEmoji = (text: string): string => text.replace(EMOJI, '').trim()

let current: Theme = DEFAULT
const listeners = new Set<() => void>()

function paint(theme: Theme): void {
  const info = themeInfo(theme)
  const root = document.documentElement
  root.dataset.theme = theme
  root.dataset.emoji = info.emoji ? 'on' : 'off'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', info.swatch[0])
}

// Called once before the first render so the saved look is there from the start.
export function initTheme(): void {
  current = loadTheme()
  paint(current)
}

export function setTheme(theme: Theme): void {
  current = theme
  saveTheme(theme)
  paint(theme)
  listeners.forEach(l => l())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const useTheme = (): ThemeInfo => themeInfo(useSyncExternalStore(subscribe, () => current))
