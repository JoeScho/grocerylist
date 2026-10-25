import { motion } from 'motion/react'
import { useEffect, useRef } from 'react'

const COLOURS = ['var(--orange)', 'var(--sky)', 'var(--grape)', 'var(--pink)', 'var(--mint)', 'var(--coral)']

export const labelColour = (labels: string[], label: string) => COLOURS[Math.max(0, labels.indexOf(label)) % COLOURS.length]

export const ALL = '__all__'

export function LabelTabs({
  labels, counts, value, onChange, onManage,
}: {
  labels: string[]
  counts: Record<string, number>
  value: string
  onChange: (label: string) => void
  onManage: () => void
}) {
  const row = useRef<HTMLDivElement>(null)
  // Keep the selected tab visible when the row is wider than the screen.
  useEffect(() => {
    row.current?.querySelector('.label-tab.active')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [value])
  const tabs = [{ id: ALL, label: 'All', colour: 'var(--ink)' }, ...labels.map(l => ({ id: l, label: l, colour: labelColour(labels, l) }))]
  return (
    <div className="label-tabs" role="tablist" ref={row}>
      {tabs.map(t => {
        const active = value === t.id
        return (
          <motion.button
            key={t.id}
            role="tab"
            aria-selected={active}
            className={`label-tab ${active ? 'active' : ''}`}
            onClick={() => onChange(t.id)}
            whileTap={{ scale: 0.92 }}
          >
            {active && (
              <motion.span
                layoutId="label-pill"
                className="label-pill"
                style={{ background: t.colour }}
                transition={{ type: 'spring', damping: 22, stiffness: 320 }}
              />
            )}
            <span>{t.label}</span>
            <span className="label-count">{counts[t.id] ?? 0}</span>
          </motion.button>
        )
      })}
      <motion.button className="label-tab add" onClick={onManage} whileTap={{ scale: 0.9 }} aria-label="Manage labels">
        <span>＋</span>
      </motion.button>
    </div>
  )
}
