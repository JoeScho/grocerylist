import { pixelEmojiUrl } from '../lib/pixelEmoji'
import { useTheme } from '../lib/theme'

// An emoji drawn the way the current look wants it: as it comes, or as pixel art.
export function EmojiGlyph({ children }: { children: string }) {
  const { pixelEmoji } = useTheme()
  const src = pixelEmoji ? pixelEmojiUrl(children) : null
  return src ? <img className="emo-px" src={src} alt="" /> : <>{children}</>
}

// A decorative emoji. Looks without emoji hide it and show `alt` in its place, if given.
// That switch is CSS only (see [data-emoji] in styles.css).
export function Emoji({ children, alt }: { children: string; alt?: string }) {
  return (
    <>
      <span className="emo" aria-hidden><EmojiGlyph>{children}</EmojiGlyph></span>
      {alt && <span className="emo-alt">{alt}</span>}
    </>
  )
}
