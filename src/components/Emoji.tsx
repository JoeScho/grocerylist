// A decorative emoji. Themes without emoji hide it and show `alt` in its place, if given.
// The switch is CSS only (see [data-emoji] in styles.css), so this needs no theme lookup.
export function Emoji({ children, alt }: { children: string; alt?: string }) {
  return (
    <>
      <span className="emo" aria-hidden>{children}</span>
      {alt && <span className="emo-alt">{alt}</span>}
    </>
  )
}
