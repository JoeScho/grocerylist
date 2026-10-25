import { useEffect, useState } from 'react'
import {
  collection, deleteDoc, doc, onSnapshot, runTransaction, serverTimestamp, updateDoc, writeBatch, type Transaction,
} from 'firebase/firestore'
import { db } from '../firebase'
import { categorise } from '../lib/categories'
import { parseIngredient, toBase } from '../lib/ingredients'
import { itemKey, recipeContributions } from '../lib/list'
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
    return onSnapshot(planCol(hid), snap => setPlan(snap.docs.map(d => ({ id: d.id, ...d.data(), cooked: d.data().cooked ?? false }) as PlanEntry)))
  }, [hid])
  return plan
}

// Rewrites one recipe's share of each item. Items left with nothing on them are deleted.
async function applyRecipe(
  tx: Transaction,
  household: Household,
  recipeId: string,
  previousIds: string[],
  contributions: { key: string; name: string; unit: string | null; qty: number | null }[],
) {
  const byKey = new Map(contributions.map(c => [c.key, c]))
  const ids = [...new Set([...previousIds, ...byKey.keys()])]
  const snaps = await Promise.all(ids.map(id => tx.get(doc(itemsCol(household.id), id))))
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
        contributions: { [recipeId]: c.qty },
        createdAt: serverTimestamp(),
      })
      return
    }
    const item = snap.data() as ShopItem
    const next = { ...item.contributions }
    delete next[recipeId]
    if (c) next[recipeId] = c.qty
    if (Object.keys(next).length === 0 && !item.manual) tx.delete(snap.ref)
    else tx.update(snap.ref, { contributions: next, ...(c ? { checked: false } : {}) })
  })
}

export async function addRecipeToShop(household: Household, recipe: Recipe, portions: number, ingredients: string[]) {
  const planRef = doc(planCol(household.id), recipe.id)
  const contributions = recipeContributions(ingredients, recipe.servings, portions)
  await runTransaction(db, async tx => {
    const existing = await tx.get(planRef)
    const previous = (existing.data()?.itemIds as string[] | undefined) ?? []
    await applyRecipe(tx, household, recipe.id, previous, contributions)
    tx.set(planRef, {
      title: recipe.title,
      image: recipe.image?.startsWith('data:') ? null : recipe.image,
      portions,
      itemIds: contributions.map(c => c.key),
      // Changing portions shouldn't un-tick a meal you've already cooked.
      cooked: existing.data()?.cooked ?? false,
    })
  })
}

export async function removeRecipeFromShop(household: Household, entry: PlanEntry) {
  const planRef = doc(planCol(household.id), entry.id)
  await runTransaction(db, async tx => {
    await applyRecipe(tx, household, entry.id, entry.itemIds, [])
    tx.delete(planRef)
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

export const setCooked = (hid: string, id: string, cooked: boolean) => updateDoc(doc(planCol(hid), id), { cooked })
export const setChecked = (hid: string, id: string, checked: boolean) => updateDoc(doc(itemsCol(hid), id), { checked })
export const setItemCategory = (hid: string, id: string, category: string) => updateDoc(doc(itemsCol(hid), id), { category })
export const deleteItem = (hid: string, id: string) => deleteDoc(doc(itemsCol(hid), id))

export async function clearChecked(hid: string, items: ShopItem[]) {
  const batch = writeBatch(db)
  items.filter(i => i.checked).forEach(i => batch.delete(doc(itemsCol(hid), i.id)))
  await batch.commit()
}

export async function clearAll(hid: string, items: ShopItem[], plan: PlanEntry[]) {
  const batch = writeBatch(db)
  items.forEach(i => batch.delete(doc(itemsCol(hid), i.id)))
  plan.forEach(p => batch.delete(doc(planCol(hid), p.id)))
  await batch.commit()
}
