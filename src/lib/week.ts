// Week maths for the planner. Days are local YYYY-MM-DD strings and weeks start on Monday.
import type { PlanEntry } from '../types'

const pad = (n: number) => String(n).padStart(2, '0')

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// setDate rather than adding milliseconds, so a clock change can't land on the wrong day.
export function addDays(iso: string, n: number): string {
  const d = parseISODate(iso)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

export function weekStart(iso: string): string {
  const day = parseISODate(iso).getDay() // 0 is Sunday
  return addDays(iso, -((day + 6) % 7))
}

export function weekDays(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

// A meal cooked before its planned day (or with none) counts as cooked today.
export function cookedDay(day: string | null, today: string): string {
  return day && day <= today ? day : today
}

export function openMealFor(plan: PlanEntry[], recipeId: string): PlanEntry | undefined {
  return plan.find(p => p.recipeId === recipeId && !p.cooked)
}

const byStatusThenTitle = (a: PlanEntry, b: PlanEntry) => Number(a.cooked) - Number(b.cooked) || a.title.localeCompare(b.title)

// Past weeks are history, so they only show what was cooked. Uncooked meals from earlier
// weeks fall back into the tray instead of disappearing.
export function layoutWeek(plan: PlanEntry[], start: string, today: string) {
  const current = weekStart(today)
  const past = start < current
  const days = weekDays(start).map(date => ({
    date,
    meals: plan.filter(p => p.day === date && (!past || p.cooked)).sort(byStatusThenTitle),
  }))
  const tray = past ? null : plan.filter(p => !p.cooked && (p.day === null || p.day < current)).sort(byStatusThenTitle)
  return { tray, days }
}
