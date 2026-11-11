import type { Timestamp } from 'firebase/firestore'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PlanEntry, Recipe } from '../types'
import { loadRecipeOrder, orderRecipes, RECIPE_ORDERS, saveRecipeOrder } from './recipeOrder'

const recipe = (id: string, title: string, extra: Partial<Recipe> = {}): Recipe => ({
  id, title, image: null, sourceUrl: null, servings: null, ingredients: [], steps: [], labels: [], createdBy: 'u', ...extra,
})
const at = (ms: number) => ({ toMillis: () => ms }) as Timestamp
const meal = (recipeId: string, cooked: boolean): PlanEntry => ({
  id: `${recipeId}-${Math.random()}`, recipeId, title: '', image: null, portions: 2, itemIds: [], cooked, day: null, cookedAt: null,
})
const titles = (rs: Recipe[]) => rs.map(r => r.title)
const ctx = { plan: [] as PlanEntry[], month: 11 }

describe('RECIPE_ORDERS', () => {
  it('lists the four orderings with their labels', () => {
    expect(RECIPE_ORDERS).toEqual([
      { value: 'alphabetical', label: 'Alphabetical' },
      { value: 'most-used', label: 'Most used' },
      { value: 'sustainability', label: 'Sustainability' },
      { value: 'recent', label: 'Recently added' },
    ])
  })
})

describe('orderRecipes', () => {
  it('alphabetical uses the existing en-GB, case-insensitive, numeric comparison', () => {
    const rs = [recipe('1', 'banana bread'), recipe('2', 'Curry 10'), recipe('3', 'Apple pie'), recipe('4', 'Curry 2')]
    expect(titles(orderRecipes(rs, 'alphabetical', ctx))).toEqual(['Apple pie', 'banana bread', 'Curry 2', 'Curry 10'])
  })

  it('most used counts cooked meals per recipe, highest first, ties alphabetical', () => {
    const rs = [recipe('c', 'C'), recipe('a', 'A'), recipe('d', 'D'), recipe('b', 'B')]
    const plan = [meal('b', true), meal('b', true), meal('a', true), meal('c', false), meal('deleted', true)]
    expect(titles(orderRecipes(rs, 'most-used', { plan, month: 11 }))).toEqual(['B', 'A', 'C', 'D'])
  })

  it('sustainability orders by unrounded score, highest first, ties alphabetical', () => {
    const rs = [
      recipe('1', 'Greek salad', { ingredients: ['4 tomatoes'] }),
      recipe('2', 'Thai curry', { ingredients: ['2 limes'] }),
      recipe('3', 'Leek soup', { ingredients: ['2 leeks'] }),
      recipe('4', 'Carbonara'),
    ]
    expect(titles(orderRecipes(rs, 'sustainability', ctx))).toEqual(['Carbonara', 'Leek soup', 'Thai curry', 'Greek salad'])
  })

  it('sustainability follows the month', () => {
    const rs = [recipe('1', 'Greek salad', { ingredients: ['4 tomatoes'] }), recipe('2', 'Thai curry', { ingredients: ['2 limes'] })]
    expect(titles(orderRecipes(rs, 'sustainability', { plan: [], month: 8 }))).toEqual(['Greek salad', 'Thai curry'])
  })

  it('uses scores it is given instead of working them out again', () => {
    const rs = [recipe('1', 'Leek soup', { ingredients: ['2 leeks'] }), recipe('2', 'Greek salad', { ingredients: ['4 tomatoes'] })]
    const scores = new Map([['1', { score: 0.1, scored: 1 }], ['2', { score: 0.9, scored: 1 }]])
    expect(titles(orderRecipes(rs, 'sustainability', { plan: [], month: 11, scores }))).toEqual(['Greek salad', 'Leek soup'])
  })

  // A recipe saved moments ago has a null createdAt until the server confirms it.
  it('recently added is newest first, with a just-saved recipe at the top', () => {
    const rs = [
      recipe('1', 'Oldest', { createdAt: at(100) }),
      recipe('2', 'Pending', { createdAt: null as unknown as Timestamp }),
      recipe('3', 'Newest', { createdAt: at(300) }),
      recipe('4', 'Middle', { createdAt: at(200) }),
    ]
    expect(titles(orderRecipes(rs, 'recent', ctx))).toEqual(['Pending', 'Newest', 'Middle', 'Oldest'])
  })

  it('does not mutate its input', () => {
    const rs = [recipe('1', 'B'), recipe('2', 'A')]
    const copy = [...rs]
    orderRecipes(rs, 'alphabetical', ctx)
    expect(rs).toEqual(copy)
  })
})

describe('remembered order', () => {
  afterEach(() => vi.unstubAllGlobals())
  const stub = (getItem: () => string | null, setItem: (k: string, v: string) => void = () => {}) =>
    vi.stubGlobal('localStorage', { getItem, setItem })

  it('returns the saved order', () => {
    stub(() => 'sustainability')
    expect(loadRecipeOrder()).toBe('sustainability')
  })

  it('falls back to alphabetical for an unknown value', () => {
    stub(() => 'nonsense')
    expect(loadRecipeOrder()).toBe('alphabetical')
  })

  it('falls back to alphabetical when nothing is saved', () => {
    stub(() => null)
    expect(loadRecipeOrder()).toBe('alphabetical')
  })

  it('falls back to alphabetical when storage throws', () => {
    stub(() => { throw new Error('blocked') })
    expect(loadRecipeOrder()).toBe('alphabetical')
  })

  it('falls back to alphabetical when there is no storage at all', () => {
    vi.stubGlobal('localStorage', undefined)
    expect(loadRecipeOrder()).toBe('alphabetical')
  })

  it('saves under the app key', () => {
    const saved: Record<string, string> = {}
    stub(() => null, (k, v) => { saved[k] = v })
    saveRecipeOrder('recent')
    expect(saved).toEqual({ 'schoceries.recipeOrder': 'recent' })
  })

  it('saving does not throw when storage throws', () => {
    stub(() => null, () => { throw new Error('full') })
    expect(() => saveRecipeOrder('recent')).not.toThrow()
  })
})
