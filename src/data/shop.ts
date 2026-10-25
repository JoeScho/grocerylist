import { useEffect, useState } from 'react'
import {
  collection, doc, onSnapshot, runTransaction, serverTimestamp, updateDoc, writeBatch,
  type DocumentData, type Transaction,
} from 'firebase/firestore'
import { db } from '../firebase'
import { categorise } from '../lib/categories'
import { parseIngredient, toBase } from '../lib/ingredients'
import { itemKey, manualQtyForTotal, recipeContributions } from '../lib/list'
import { cookedDay } from '../lib/week'
import type { Household, PlanEntry, Recipe, ShopItem } from '../types'

const itemsCol = (hid: string) => collection(db, 'households', hid, 'items')
const planCol = (hid: string) => collection(db, 'households', hid, 'plan')

export function useItems(hid: string | undefined) {
  const [items, setItems] = useState<ShopItem[] | null>(null)
  useEffect(() => {
    if (!hid) return
    return onSnapshot(itemsCol(hid), snap => setItems(snap.docs.map(d => ({ id: d.id, ...d.data() }) as ShopItem)))
  }, [hid])
  return items
}

export function usePlan(hid: string | undefined) {
  const [plan, setPlan] = useState<PlanEntry[]>([])
  useEffect(() => {
    if (!hid) return
    return onSnapshot(planCol(hid), snap => setPlan(snap.docs.map(d => {
      const data = d.data()
      // Meals from before the planner used the recipe id as their id and had no day.
      return {
        id: d.id, ...data, recipeId: data.recipeId ?? d.id, cooked: data.cooked ?? false, day: data.day ?? null, cookedAt: data.cookedAt ?? null,
      } as PlanEntry
    })))
  }, [hid])
  return plan
}

// Documents as they were before a change, so Undo can put them back.
export interface Snapshot {
  meals: { id: string; data: DocumentData }[]
  items: { id: string; data: DocumentData }[]
}

export async function restoreSnapshot(hid: string, snap: Snapshot) {
  const batch = writeBatch(db)
  snap.meals.forEach(m => batch.set(doc(planCol(hid), m.id), m.data))
  snap.items.forEach(i => batch.set(doc(itemsCol(hid), i.id), i.data))
  await batch.commit()
}

const withoutId = ({ id: _id, ...data }: { id: string } & DocumentData) => data

// Rewrites one meal's share of each item. Items left with nothing on them are deleted.
// Returns the items as they were before, for Undo.
async function applyMeal(
  tx: Transaction,
  household: Household,
  mealId: string,
  previousIds: string[],
  contributions: { key: string; name: string; unit: string | null; qty: number | null }[],
) {
  const byKey = new Map(contributions.map(c => [c.key, c]))
  const ids = [...new Set([...previousIds, ...byKey.keys()])]
  const snaps = await Promise.all(ids.map(id => tx.get(doc(itemsCol(household.id), id))))
  const before: Snapshot['items'] = []
  snaps.forEach((snap, i) => {
    const id = ids[i]
    const c = byKey.get(id)
    if (!snap.exists()) {
      if (!c) return
      tx.set(snap.ref, {
        name: c.name,
        unit: c.unit,
        category: categorise(c.name, household.categoryOverrides),
        checked: false,
        manual: false,
        manualQty: null,
        contributions: { [mealId]: c.qty },
        createdAt: serverTimestamp(),
      })
      return
    }
    before.push({ id, data: snap.data() })
    const item = snap.data() as ShopItem
    const next = { ...item.contributions }
    delete next[mealId]
    if (c) next[mealId] = c.qty
    if (Object.keys(next).length === 0 && !item.manual) tx.delete(snap.ref)
    else tx.update(snap.ref, { contributions: next, ...(c ? { checked: false } : {}) })
  })
  return before
}

// Reuses the recipe's uncooked meal if there is one, so its day survives; otherwise starts a new meal.
export async function addRecipeToShop(
  household: Household, recipe: Recipe, portions: number, ingredients: string[], openMeal: PlanEntry | undefined,
) {
  const mealRef = openMeal ? doc(planCol(household.id), openMeal.id) : doc(planCol(household.id))
  const contributions = recipeContributions(ingredients, recipe.servings, portions)
  await runTransaction(db, async tx => {
    const existing = await tx.get(mealRef)
    const previous = (existing.data()?.itemIds as string[] | undefined) ?? []
    await applyMeal(tx, household, mealRef.id, previous, contributions)
    tx.set(mealRef, {
      recipeId: recipe.id,
      title: recipe.title,
      image: recipe.image?.startsWith('data:') ? null : recipe.image,
      portions,
      itemIds: contributions.map(c => c.key),
      cooked: false,
      day: existing.data()?.day ?? null,
      cookedAt: null,
    })
  })
}

// Deletes meals and takes their ingredients off the list.
export async function deleteMeals(household: Household, meals: PlanEntry[]): Promise<Snapshot> {
  return runTransaction(db, async tx => {
    const refs = meals.map(m => doc(planCol(household.id), m.id))
    const mealSnaps = await Promise.all(refs.map(r => tx.get(r)))
    const snapshot: Snapshot = { meals: [], items: [] }
    mealSnaps.forEach(s => { if (s.exists()) snapshot.meals.push({ id: s.id, data: s.data() }) })
    // Reads must all happen before writes in a transaction, so read every item first.
    const itemIds = [...new Set(meals.flatMap(m => m.itemIds))]
    const itemSnaps = await Promise.all(itemIds.map(id => tx.get(doc(itemsCol(household.id), id))))
    const mealIds = new Set(meals.map(m => m.id))
    const items = new Map(itemSnaps.filter(s => s.exists()).map(s => [s.id, s.data() as ShopItem]))
    for (const [id, data] of items) snapshot.items.push({ id, data })
    for (const [id, item] of items) {
      const next = Object.fromEntries(Object.entries(item.contributions).filter(([k]) => !mealIds.has(k)))
      const ref = doc(itemsCol(household.id), id)
      if (Object.keys(next).length === 0 && !item.manual) tx.delete(ref)
      else tx.update(ref, { contributions: next })
    }
    refs.forEach(r => tx.delete(r))
    return snapshot
  })
}

export async function addManualItem(household: Household, text: string) {
  const p = parseIngredient(text)
  if (!p.name) return
  const base = p.qty === null ? { qty: null, unit: p.unit } : toBase(p.qty, p.unit)
  const ref = doc(itemsCol(household.id), itemKey(p.name, base.unit))
  await runTransaction(db, async tx => {
    const snap = await tx.get(ref)
    if (snap.exists()) {
      const item = snap.data() as ShopItem
      const qty = base.qty === null ? item.manualQty : (item.manualQty ?? 0) + base.qty
      tx.update(ref, { manual: true, manualQty: qty, checked: false })
    } else {
      tx.set(ref, {
        name: p.name,
        unit: base.unit,
        category: categorise(p.name, household.categoryOverrides),
        checked: false,
        manual: true,
        manualQty: base.qty,
        contributions: {},
        createdAt: serverTimestamp(),
      })
    }
  })
}

export const setMealDay = (hid: string, id: string, day: string | null) => updateDoc(doc(planCol(hid), id), { day })

export const setCooked = (hid: string, meal: PlanEntry, cooked: boolean, today: string) =>
  updateDoc(doc(planCol(hid), meal.id), cooked
    ? { cooked: true, day: cookedDay(meal.day, today), cookedAt: serverTimestamp() }
    : { cooked: false, cookedAt: null })

// Meals ticked before the planner existed have no day; file them under today.
export async function backfillCookedDays(hid: string, plan: PlanEntry[], today: string) {
  const undated = plan.filter(p => p.cooked && p.day === null)
  if (!undated.length) return
  const batch = writeBatch(db)
  undated.forEach(p => batch.update(doc(planCol(hid), p.id), { day: today }))
  await batch.commit()
}

export const setChecked = (hid: string, id: string, checked: boolean) => updateDoc(doc(itemsCol(hid), id), { checked })
export const setItemCategory = (hid: string, id: string, category: string) => updateDoc(doc(itemsCol(hid), id), { category })

export const setItemTotal = (hid: string, item: ShopItem, total: number) =>
  updateDoc(doc(itemsCol(hid), item.id), { manual: true, manualQty: manualQtyForTotal(item, total) })

export async function deleteItems(hid: string, items: ShopItem[]): Promise<Snapshot> {
  const batch = writeBatch(db)
  items.forEach(i => batch.delete(doc(itemsCol(hid), i.id)))
  await batch.commit()
  return { meals: [], items: items.map(i => ({ id: i.id, data: withoutId(i) })) }
}

export const clearChecked = (hid: string, items: ShopItem[]) => deleteItems(hid, items.filter(i => i.checked))

// A new shop empties the list but keeps the meals planned; they just stop pointing at items.
export async function clearAll(hid: string, items: ShopItem[], plan: PlanEntry[]) {
  const batch = writeBatch(db)
  items.forEach(i => batch.delete(doc(itemsCol(hid), i.id)))
  plan.filter(p => p.itemIds.length).forEach(p => batch.update(doc(planCol(hid), p.id), { itemIds: [] }))
  await batch.commit()
}
