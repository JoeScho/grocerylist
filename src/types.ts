import type { Timestamp } from 'firebase/firestore'

export interface Household {
  id: string
  name: string
  ownerUid: string
  ownerEmail: string
  memberEmails: string[]
  staples: string[]
  categoryOverrides: Record<string, string>
  recipeLabels: string[]
}

export interface Recipe {
  id: string
  title: string
  image: string | null
  sourceUrl: string | null
  servings: number | null
  ingredients: string[]
  steps: string[]
  labels: string[]
  createdBy: string
  createdAt?: Timestamp
}

export type RecipeDraft = Omit<Recipe, 'id' | 'createdBy' | 'createdAt'>

export interface ShopItem {
  id: string
  name: string
  unit: string | null
  category: string
  checked: boolean
  manual: boolean
  manualQty: number | null
  contributions: Record<string, number | null>
  createdAt?: Timestamp
}

export interface PlanEntry {
  id: string // meal id; older meals use the recipe id
  recipeId: string
  title: string
  image: string | null
  portions: number
  itemIds: string[] // empty once the meal's ingredients have left the list
  cooked: boolean
  day: string | null // YYYY-MM-DD
  cookedAt: Timestamp | null
}
