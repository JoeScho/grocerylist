import { AnimatePresence, LayoutGroup, motion, useDragControls } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useConfetti } from '../components/Confetti'
import { RecipeImage } from '../components/RecipeImage'
import { SettingsButton } from '../components/SettingsButton'
import { useToast } from '../components/Toast'
import { useMealDrag } from '../components/useMealDrag'
import { backfillCookedDays, deleteMeals, restoreSnapshot, setCooked, setMealDay, type Snapshot } from '../data/shop'
import { addDays, parseISODate, toISODate, weekStart, layoutWeek } from '../lib/week'
import type { Household, PlanEntry, Recipe } from '../types'

const WEEKS_AHEAD = 4
const TRAY = 'tray'

const dayName = (iso: string) => parseISODate(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })
const shortDate = (iso: string) => parseISODate(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

function weekTitle(start: string, current: string) {
  if (start === current) return 'This week'
  if (start === addDays(current, 7)) return 'Next week'
  if (start === addDays(current, -7)) return 'Last week'
  return `${shortDate(start)} – ${shortDate(addDays(start, 6))}`
}

export function Week({
  household, plan, recipes, onOpenRecipe, onBrowse, onSettings, settingsAlert,
}: {
  household: Household
  plan: PlanEntry[]
  recipes: Recipe[] | null
  onOpenRecipe: (id: string) => void
  onBrowse: () => void
  onSettings: () => void
  settingsAlert: boolean
}) {
  const toast = useToast()
  const confetti = useConfetti()
  const today = toISODate(new Date())
  const current = weekStart(today)
  const [start, setStart] = useState(current)
  const past = start < current
  const recipeById = useMemo(() => new Map((recipes ?? []).map(r => [r.id, r])), [recipes])
  const { tray, days } = useMemo(() => layoutWeek(plan, start, today), [plan, start, today])

  // Meals ticked before the planner existed have no day yet.
  const backfilled = useRef(false)
  useEffect(() => {
    if (backfilled.current || !plan.some(p => p.cooked && p.day === null)) return
    backfilled.current = true
    backfillCookedDays(household.id, plan, today)
  }, [plan, household.id, today])

  const { drag, over, start: startDrag } = useMealDrag((id, target) => {
    const meal = plan.find(p => p.id === id)
    const day = target === TRAY ? null : target
    if (meal && meal.day !== day) setMealDay(household.id, id, day)
  })

  const inDays = days.flatMap(d => d.meals)
  const cooked = inDays.filter(p => p.cooked).length
  // What "Clear week" removes: uncooked meals on these days, plus the tray when it's this week.
  const clearable = [...inDays.filter(p => !p.cooked), ...(start === current ? tray ?? [] : [])]
  const undo = (message: string) => (snap: Snapshot) => toast(message, { label: 'Undo', onClick: () => restoreSnapshot(household.id, snap) })

  const toggle = async (p: PlanEntry) => {
    const next = !p.cooked
    await setCooked(household.id, p, next, today)
    if (!next) return
    const left = plan.filter(m => !m.cooked && m.id !== p.id && (m.day === null || m.day <= addDays(current, 6)))
    if (left.length === 0) {
      confetti()
      toast('Every meal cooked this week 🎉')
    } else {
      toast(`👩‍🍳 ${p.title} cooked`)
    }
  }

  const remove = (p: PlanEntry) => deleteMeals(household, [p]).then(undo(`Removed ${p.title}`))

  const clearWeek = async () => {
    if (!confirm(`Clear ${clearable.length} uncooked meal${clearable.length === 1 ? '' : 's'}? Their ingredients come off the shopping list too.`)) return
    deleteMeals(household, clearable).then(undo('Week cleared'))
  }

  const card = (p: PlanEntry) => (
    <MealCard
      key={p.id}
      meal={p}
      image={recipeById.get(p.recipeId)?.image ?? p.image}
      readOnly={past}
      lifted={drag?.id === p.id}
      onOpen={() => onOpenRecipe(p.recipeId)}
      onToggle={() => toggle(p)}
      onRemove={() => remove(p)}
      onDragStart={e => startDrag(e, p.id)}
    />
  )

  const dragged = drag ? plan.find(p => p.id === drag.id) : undefined
  const nothingPlanned = !past && inDays.length === 0 && !tray?.length

  return (
    <div className="screen">
      <div className="screen-header">
        <h1>{weekTitle(start, current)}</h1>
        <SettingsButton onClick={onSettings} alert={settingsAlert} />
      </div>

      <div className="week-nav">
        <motion.button whileTap={{ scale: 0.85 }} className="icon-btn" onClick={() => setStart(addDays(start, -7))} aria-label="Previous week">‹</motion.button>
        <span className="subtle">
          {shortDate(start)} – {shortDate(addDays(start, 6))}
          {inDays.length > 0 && (past ? ` · ${cooked} cooked` : ` · ${cooked} of ${inDays.length} cooked`)}
        </span>
        <motion.button
          whileTap={{ scale: 0.85 }}
          className="icon-btn"
          disabled={start >= addDays(current, 7 * WEEKS_AHEAD)}
          onClick={() => setStart(addDays(start, 7))}
          aria-label="Next week"
        >
          ›
        </motion.button>
      </div>
      {start !== current && (
        <div style={{ textAlign: 'center', marginTop: -6, marginBottom: 12 }}>
          <button className="text-btn" onClick={() => setStart(current)}>Back to this week</button>
        </div>
      )}

      {!past && inDays.length > 0 && (
        <div className="week-bar">
          <motion.div initial={false} animate={{ width: `${(cooked / inDays.length) * 100}%` }} transition={{ type: 'spring', damping: 20 }} />
        </div>
      )}

      {nothingPlanned && (
        <motion.div className="empty" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ paddingTop: 10, paddingBottom: 10 }}>
          <motion.span className="big" animate={{ rotate: [0, -8, 8, 0] }} transition={{ repeat: Infinity, duration: 2.4 }}>📅</motion.span>
          <h2>No meals planned</h2>
          <p className="subtle">Recipes you add to the shop land here, ready to drag onto a day.</p>
          <button className="btn" onClick={onBrowse} style={{ marginTop: 12 }}>Pick some recipes</button>
        </motion.div>
      )}

      <LayoutGroup>
        {tray && (tray.length > 0 || drag) && (
          <section className={`day tray ${over === TRAY ? 'over' : ''}`} data-drop={TRAY}>
            <div className="day-head">
              <span>📥 To plan</span>
              <span className="subtle" style={{ fontSize: 13 }}>Drag ⠿ onto a day</span>
            </div>
            <div className="day-meals">
              <AnimatePresence initial={false}>{tray.map(card)}</AnimatePresence>
            </div>
          </section>
        )}

        {days.map(({ date, meals }) => (
          <section key={date} className={`day ${date === today ? 'today' : ''} ${over === date ? 'over' : ''}`} data-drop={past ? undefined : date}>
            <div className="day-head">
              <span>{dayName(date)}</span>
              {date === today && <span className="today-pill">Today</span>}
            </div>
            <div className="day-meals">
              <AnimatePresence initial={false}>{meals.map(card)}</AnimatePresence>
              {meals.length === 0 && <div className="day-empty">{past ? '—' : 'Nothing planned'}</div>}
            </div>
          </section>
        ))}
      </LayoutGroup>

      {!past && clearable.length > 0 && (
        <div className="row" style={{ justifyContent: 'center', marginTop: 10 }}>
          <button className="btn small ghost" onClick={clearWeek}>Clear week ({clearable.length})</button>
        </div>
      )}

      {drag && dragged && (
        <div className="meal-ghost" style={{ left: drag.x - drag.dx, top: drag.y - drag.dy, width: drag.width }}>
          <div className="week-card">
            <div className="pic"><RecipeImage src={recipeById.get(dragged.recipeId)?.image ?? dragged.image} seed={dragged.recipeId} /></div>
            <div className="body"><div className="t">{dragged.title}</div></div>
          </div>
        </div>
      )}
    </div>
  )
}

function MealCard({
  meal, image, readOnly, lifted, onOpen, onToggle, onRemove, onDragStart,
}: {
  meal: PlanEntry
  image: string | null
  readOnly: boolean
  lifted: boolean
  onOpen: () => void
  onToggle: () => void
  onRemove: () => void
  onDragStart: (e: React.PointerEvent) => void
}) {
  const swipe = useDragControls()
  // A swipe that snaps back still ends in a click; don't open the recipe for it.
  const swiped = useRef(false)
  const open = () => { if (!swiped.current) onOpen() }

  return (
    <motion.div
      layout
      data-meal
      className="swipe-wrap"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: lifted ? 0.3 : 1, y: 0 }}
      exit={{ opacity: 0, x: -320, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', damping: 24, stiffness: 300 }}
    >
      {!readOnly && <div className="swipe-bin">🗑️</div>}
      <motion.div
        className={`week-card ${meal.cooked ? 'cooked' : ''}`}
        drag={readOnly ? false : 'x'}
        dragControls={swipe}
        dragListener={false}
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.9, right: 0 }}
        onPointerDown={e => { if (!readOnly) swipe.start(e) }}
        onDragStart={() => { swiped.current = true }}
        onDragEnd={(_, info) => {
          window.setTimeout(() => { swiped.current = false }, 50)
          if (info.offset.x < -110 || info.velocity.x < -600) onRemove()
        }}
        style={{ touchAction: 'pan-y' }}
      >
        <button className="pic" onClick={open} aria-label={`Open ${meal.title}`}>
          <RecipeImage src={image} seed={meal.recipeId} />
        </button>
        <button className="body" onClick={open}>
          <div className="t">{meal.title}</div>
          <div className="subtle" style={{ fontSize: 13, marginTop: 2 }}>{meal.portions} portions</div>
        </button>
        {readOnly ? (
          meal.cooked && <span className="cook-btn on">✓</span>
        ) : (
          <motion.button
            className={`cook-btn ${meal.cooked ? 'on' : ''}`}
            onPointerDown={e => e.stopPropagation()}
            onClick={onToggle}
            whileTap={{ scale: 0.85 }}
            animate={{ rotate: meal.cooked ? [0, -15, 10, 0] : 0, scale: meal.cooked ? [1, 1.2, 1] : 1 }}
            transition={{ duration: 0.4 }}
            aria-label={meal.cooked ? `Mark ${meal.title} as not cooked` : `Mark ${meal.title} as cooked`}
          >
            {meal.cooked ? '✓' : '🍳'}
          </motion.button>
        )}
        {!readOnly && !meal.cooked && (
          <span className="handle" onPointerDown={onDragStart} aria-label={`Move ${meal.title} to another day`} role="button">⠿</span>
        )}
      </motion.div>
    </motion.div>
  )
}
