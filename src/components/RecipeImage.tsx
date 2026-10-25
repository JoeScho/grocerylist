import { useState } from 'react'

const FALLBACKS = ['🍝', '🥘', '🍲', '🥗', '🌮', '🍛', '🍜', '🥙']
const TINTS = ['#ffe3e3', '#fff1c2', '#dcf7e6', '#dff2ff', '#efe1ff', '#ffe0ef']

function pick<T>(list: T[], seed: string): T {
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) | 0
  return list[Math.abs(h) % list.length]
}

// Remote images are loaded without a referrer because some recipe sites block hotlinking.
export function RecipeImage({ src, seed, className }: { src: string | null; seed: string; className?: string }) {
  const [broken, setBroken] = useState(false)
  if (src && !broken) {
    return <img className={className} src={src} alt="" referrerPolicy="no-referrer" loading="lazy" onError={() => setBroken(true)} />
  }
  return (
    <div className={`${className ?? ''} placeholder`} style={{ background: pick(TINTS, seed) }}>
      {pick(FALLBACKS, seed)}
    </div>
  )
}
