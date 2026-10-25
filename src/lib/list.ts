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
  return nums.length ? nums.reduce((a, b) => a + b, 0) : null
}

export function isStaple(name: string, staples: string[]): boolean {
  const n = name.toLowerCase()
  return staples.some(s => n === s || n.endsWith(' ' + s))
}
