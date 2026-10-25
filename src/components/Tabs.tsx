import { motion } from 'motion/react'

export function Tabs<T extends string>({
  tabs, value, onChange, id,
}: { tabs: { value: T; label: string }[]; value: T; onChange: (v: T) => void; id: string }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map(t => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          className={value === t.value ? 'active' : ''}
          onClick={() => onChange(t.value)}
        >
          {value === t.value && <motion.div layoutId={`${id}-pill`} className="tab-pill" transition={{ type: 'spring', damping: 22, stiffness: 300 }} />}
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  )
}
