import { parseIngredient, scale, toBase } from './ingredients'

export interface Contribution {
  key: string
  name: string
  unit: string | null
  qty: number | null
}

export interface ItemQuantities {
  manual: boolean
  manualQty: number | null
  contributions: Record<string, number | null>
}

// Items with the same normalised name and base unit share one list line.
export function itemKey(name: string, unit: string | null): string {
  return `${name}|${unit ?? ''}`.replace(/[/.#$[\]]/g, '_')
}

export function recipeContributions(
  ingredients: string[],
  servings: number | null,
  portions: number,
): Contribution[] {
  const byKey = new Map<string, Contribution>()
  for (const text of ingredients) {
    const p = parseIngredient(text)
    if (!p.name) continue
    const scaled = scale(p.qty, servings ?? portions, portions)
    const base = scaled === null ? { qty: null, unit: p.unit } : toBase(scaled, p.unit)
    const key = itemKey(p.name, base.unit)
    const existing = byKey.get(key)
    if (existing) {
      existing.qty = existing.qty === null || base.qty === null ? (existing.qty ?? base.qty) : existing.qty + base.qty
    } else {
      byKey.set(key, { key, name: p.name, unit: base.unit, qty: base.qty })
    }
  }
  return [...byKey.values()]
}

// Sum of everything that put this item on the list; null when nobody gave a number.
export function totalQty(item: ItemQuantities): number | null {
  const values = Object.values(item.contributions)
  if (item.manual) values.push(item.manualQty)
  const nums = values.filter((v): v is number => typeof v === 'number')
  // A manual reduction can outlast the recipe amount it was taken off; never show below zero.
  return nums.length ? Math.max(0, nums.reduce((a, b) => a + b, 0)) : null
}

// One meal's new share of an item. Meals in `drop` (an earlier, cooked meal of the same
// recipe) lose theirs, so adding a recipe again replaces its amounts rather than doubling them.
export function nextContributions(
  current: Record<string, number | null>,
  mealId: string,
  qty: number | null | undefined,
  drop: string[],
): Record<string, number | null> {
  const next = { ...current }
  delete next[mealId]
  drop.forEach(id => delete next[id])
  if (qty !== undefined) next[mealId] = qty
  return next
}

// An item stays on the list while a meal needs it or someone typed it in with an amount.
export function keepItem(item: ItemQuantities): boolean {
  if (Object.keys(item.contributions).length > 0) return true
  return item.manual && (item.manualQty === null || item.manualQty > 0)
}

export function isStaple(name: string, staples: string[]): boolean {
  const n = name.toLowerCase()
  return staples.some(s => n === s || n.endsWith(' ' + s))
}

// The manual part of an item is whatever makes the line add up to the total the user asked for.
export function manualQtyForTotal(item: ItemQuantities, total: number): number {
  const fromRecipes = Object.values(item.contributions).reduce<number>((sum, v) => sum + (typeof v === 'number' ? v : 0), 0)
  return Math.max(total, 0) - fromRecipes
}

export function qtyStep(unit: string | null): number {
  return unit === 'g' || unit === 'ml' ? 50 : 1
}
