import { describe, expect, it } from 'vitest'
import type { PlanEntry } from '../types'
import { addDays, cookedDay, layoutWeek, openMealFor, toISODate, weekDays, weekStart } from './week'

const meal = (id: string, over: Partial<PlanEntry> = {}): PlanEntry => ({
  id, recipeId: id, title: id, image: null, portions: 2, itemIds: [], cooked: false, day: null, cookedAt: null, ...over,
})

describe('dates', () => {
  it('formats local dates as YYYY-MM-DD', () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
  it('puts Sunday in the week that started the Monday before', () => {
    expect(weekStart('2026-10-25')).toBe('2026-10-19')
    expect(weekStart('2026-10-19')).toBe('2026-10-19')
  })
  it('adds days across a month end and a clock change', () => {
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26')
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30')
    expect(addDays('2026-11-02', -7)).toBe('2026-10-26')
  })
  it('lists the seven days from Monday', () => {
    const days = weekDays('2026-10-19')
    expect(days).toHaveLength(7)
    expect(days[0]).toBe('2026-10-19')
    expect(days[6]).toBe('2026-10-25')
  })
})

describe('cookedDay', () => {
  it('uses today when the meal had no day', () => {
    expect(cookedDay(null, '2026-10-25')).toBe('2026-10-25')
  })
  it('pulls a future day back to today', () => {
    expect(cookedDay('2026-12-01', '2026-10-25')).toBe('2026-10-25')
  })
  it('keeps a planned day in the past', () => {
    expect(cookedDay('2026-10-20', '2026-10-25')).toBe('2026-10-20')
  })
})

describe('openMealFor', () => {
  it('ignores cooked meals for the same recipe', () => {
    const plan = [meal('a', { recipeId: 'r', cooked: true }), meal('b', { recipeId: 'r' })]
    expect(openMealFor(plan, 'r')?.id).toBe('b')
    expect(openMealFor([plan[0]], 'r')).toBeUndefined()
  })
})

describe('layoutWeek', () => {
  const today = '2026-10-22' // Thursday
  const plan = [
    meal('unplanned'),
    meal('missed', { day: '2026-10-14' }),
    meal('ateLastWeek', { day: '2026-10-14', cooked: true }),
    meal('tue', { day: '2026-10-20' }),
    meal('tueCooked', { day: '2026-10-20', cooked: true }),
    meal('nextMon', { day: '2026-10-26' }),
  ]

  it('shows only cooked meals in a past week, with no tray', () => {
    const w = layoutWeek(plan, '2026-10-12', today)
    expect(w.tray).toBeNull()
    expect(w.days[2].meals.map(m => m.id)).toEqual(['ateLastWeek'])
  })

  it('collects unplanned and missed meals in the current week tray', () => {
    const w = layoutWeek(plan, '2026-10-19', today)
    expect(w.tray?.map(m => m.id).sort()).toEqual(['missed', 'unplanned'])
    expect(w.days[1].meals.map(m => m.id)).toEqual(['tue', 'tueCooked'])
  })

  it('shows a future week with the same tray', () => {
    const w = layoutWeek(plan, '2026-10-26', today)
    expect(w.tray?.map(m => m.id).sort()).toEqual(['missed', 'unplanned'])
    expect(w.days[0].meals.map(m => m.id)).toEqual(['nextMon'])
  })
})
