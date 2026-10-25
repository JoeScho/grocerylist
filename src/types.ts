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
  id: string // recipe id
  title: string
  image: string | null
  portions: number
  itemIds: string[]
}
