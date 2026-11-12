// Turns an emoji into 16x16 pixel art for the Retro look: drawn small on a canvas,
// snapped to a limited palette with hard edges, and handed back as an image URL.
// The image is then scaled up with `image-rendering: pixelated`.

const GRID = 16
const cache = new Map<string, string | null>()

// Six levels per channel: the 216 "web-safe" colours, close to what old consoles could show.
export const snapChannel = (value: number): number => Math.round(value / 51) * 51

// A pixel is either there or not; soft edges are what make a small emoji look blurry.
export const snapAlpha = (alpha: number): number => (alpha < 110 ? 0 : 255)

// Null where there is no canvas (tests, very old browsers); callers then show the plain emoji.
export function pixelEmojiUrl(emoji: string): string | null {
  const cached = cache.get(emoji)
  if (cached !== undefined) return cached
  let url: string | null = null
  try {
    const canvas = document.createElement('canvas')
    canvas.width = GRID
    canvas.height = GRID
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (ctx) {
      ctx.font = `${GRID - 2}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(emoji, GRID / 2, GRID / 2 + 1)
      const image = ctx.getImageData(0, 0, GRID, GRID)
      const px = image.data
      for (let i = 0; i < px.length; i += 4) {
        px[i] = snapChannel(px[i])
        px[i + 1] = snapChannel(px[i + 1])
        px[i + 2] = snapChannel(px[i + 2])
        px[i + 3] = snapAlpha(px[i + 3])
      }
      ctx.putImageData(image, 0, 0)
      url = canvas.toDataURL('image/png')
    }
  } catch {
    url = null
  }
  cache.set(emoji, url)
  return url
}
