import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadTheme, saveTheme, splitEmoji, stripEmoji, themeInfo, THEMES } from './theme'

describe('remembered theme', () => {
  afterEach(() => vi.unstubAllGlobals())
  const stub = (getItem: () => string | null, setItem: (k: string, v: string) => void = () => {}) =>
    vi.stubGlobal('localStorage', { getItem, setItem })

  it('returns the saved theme', () => {
    stub(() => 'elegant')
    expect(loadTheme()).toBe('elegant')
  })

  it('falls back to fun for an unknown value', () => {
    stub(() => 'nonsense')
    expect(loadTheme()).toBe('fun')
  })

  it('falls back to fun when nothing is saved', () => {
    stub(() => null)
    expect(loadTheme()).toBe('fun')
  })

  it('falls back to fun when storage throws', () => {
    stub(() => { throw new Error('blocked') })
    expect(loadTheme()).toBe('fun')
  })

  it('falls back to fun when there is no storage at all', () => {
    vi.stubGlobal('localStorage', undefined)
    expect(loadTheme()).toBe('fun')
  })

  it('saves under the app key', () => {
    const saved: Record<string, string> = {}
    stub(() => null, (k, v) => { saved[k] = v })
    saveTheme('midnight')
    expect(saved).toEqual({ 'schoceries.theme': 'midnight' })
  })
})

describe('themeInfo', () => {
  it('finds each theme by its value', () => {
    for (const t of THEMES) expect(themeInfo(t.value)).toBe(t)
  })
})

describe('stripEmoji', () => {
  it('removes a leading emoji and its space', () => {
    expect(stripEmoji('🛒 Ragu added for 4')).toBe('Ragu added for 4')
  })

  it('removes a trailing emoji', () => {
    expect(stripEmoji('Recipe added 🎉')).toBe('Recipe added')
  })

  it('removes emoji built from several joined characters', () => {
    expect(stripEmoji('👩‍🍳 Ragu cooked')).toBe('Ragu cooked')
    expect(stripEmoji('🌶️ chilli will go in Herbs & Spices from now on')).toBe('chilli will go in Herbs & Spices from now on')
  })

  it('leaves plain text, digits and punctuation alone', () => {
    expect(stripEmoji('Removed 2 lemons (ticked)')).toBe('Removed 2 lemons (ticked)')
  })
})

describe('splitEmoji', () => {
  it('separates emoji from the text around them', () => {
    expect(splitEmoji('🛒 Ragu added 🎉')).toEqual([
      { text: '🛒', emoji: true },
      { text: ' Ragu added ', emoji: false },
      { text: '🎉', emoji: true },
    ])
  })

  it('keeps a joined emoji as one part', () => {
    expect(splitEmoji('👩‍🍳 cooked')).toEqual([{ text: '👩‍🍳', emoji: true }, { text: ' cooked', emoji: false }])
  })

  it('returns plain text as a single part', () => {
    expect(splitEmoji('Saved')).toEqual([{ text: 'Saved', emoji: false }])
  })
})
