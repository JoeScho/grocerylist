// The ways the Recipes screen can be ordered, and the choice remembered on this device.

import type { PlanEntry, Recipe } from '../types'
import { scoreRecipe, type RecipeScore } from './seasons'

export type RecipeOrder = 'alphabetical' | 'most-used' | 'sustainability' | 'recent'

export const RECIPE_ORDERS: { value: RecipeOrder; label: string }[] = [
  { value: 'alphabetical', label: 'Alphabetical' },
  { value: 'most-used', label: 'Most used' },
  { value: 'sustainability', label: 'Sustainability' },
  { value: 'recent', label: 'Recently added' },
]

const byTitle = (a: Recipe, b: Recipe) => a.title.localeCompare(b.title, 'en-GB', { sensitivity: 'base', numeric: true })

// Highest rank first, falling back to the title so equal recipes keep a steady order.
function byRank(recipes: Recipe[], rank: (r: Recipe) => number): Recipe[] {
  const ranks = new Map(recipes.map(r => [r.id, rank(r)]))
  return [...recipes].sort((a, b) => ranks.get(b.id)! - ranks.get(a.id)! || byTitle(a, b))
}

// `scores` lets a caller that has already scored the recipes avoid doing it twice.
export function orderRecipes(
  recipes: Recipe[],
  order: RecipeOrder,
  ctx: { plan: PlanEntry[]; month: number; scores?: Map<string, RecipeScore> },
): Recipe[] {
  switch (order) {
    case 'most-used': {
      const cooked = new Map<string, number>()
      for (const meal of ctx.plan) if (meal.cooked) cooked.set(meal.recipeId, (cooked.get(meal.recipeId) ?? 0) + 1)
      return byRank(recipes, r => cooked.get(r.id) ?? 0)
    }
    case 'sustainability':
      return byRank(recipes, r => (ctx.scores?.get(r.id) ?? scoreRecipe(r.ingredients, ctx.month)).score)
    case 'recent':
      // A recipe saved moments ago has no server timestamp yet. It is the newest, so it goes first.
      return byRank(recipes, r => r.createdAt?.toMillis() ?? Infinity)
    default:
      return [...recipes].sort(byTitle)
  }
}

const KEY = 'schoceries.recipeOrder'

// Storage can be missing or blocked (private browsing); the order then just isn't remembered.
export function loadRecipeOrder(): RecipeOrder {
  try {
    const saved = localStorage.getItem(KEY)
    return RECIPE_ORDERS.find(o => o.value === saved)?.value ?? 'alphabetical'
  } catch {
    return 'alphabetical'
  }
}

export function saveRecipeOrder(order: RecipeOrder): void {
  try {
    localStorage.setItem(KEY, order)
  } catch {
    // Not remembered; nothing else to do.
  }
}
