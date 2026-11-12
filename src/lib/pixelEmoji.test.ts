import { afterEach, describe, expect, it, vi } from 'vitest'
import { pixelEmojiUrl, snapAlpha, snapChannel } from './pixelEmoji'

describe('snapChannel', () => {
  it('snaps to the nearest of six levels', () => {
    expect(snapChannel(0)).toBe(0)
    expect(snapChannel(25)).toBe(0)
    expect(snapChannel(26)).toBe(51)
    expect(snapChannel(128)).toBe(153)
    expect(snapChannel(255)).toBe(255)
  })
})

describe('snapAlpha', () => {
  it('makes faint pixels clear and the rest solid', () => {
    expect(snapAlpha(0)).toBe(0)
    expect(snapAlpha(109)).toBe(0)
    expect(snapAlpha(110)).toBe(255)
    expect(snapAlpha(255)).toBe(255)
  })
})

describe('pixelEmojiUrl', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns null when there is no canvas to draw on', () => {
    vi.stubGlobal('document', undefined)
    expect(pixelEmojiUrl('🥕')).toBeNull()
  })
})
