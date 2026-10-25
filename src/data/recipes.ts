import { useEffect, useState } from 'react'
import {
  addDoc, arrayRemove, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, writeBatch,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../firebase'
import { parseServings } from '../lib/ingredients'
import type { Household, Recipe, RecipeDraft } from '../types'

const recipesCol = (hid: string) => collection(db, 'households', hid, 'recipes')

export function useRecipes(hid: string | undefined) {
  const [recipes, setRecipes] = useState<Recipe[] | null>(null)
  useEffect(() => {
    if (!hid) return
    return onSnapshot(query(recipesCol(hid), orderBy('createdAt', 'desc')), snap =>
      setRecipes(snap.docs.map(d => ({ id: d.id, ...d.data(), labels: d.data().labels ?? [] }) as Recipe)),
    )
  }, [hid])
  return recipes
}

export async function createRecipe(hid: string, uid: string, draft: RecipeDraft) {
  const ref = await addDoc(recipesCol(hid), { ...draft, createdBy: uid, createdAt: serverTimestamp() })
  return ref.id
}

export const updateRecipe = (hid: string, id: string, draft: RecipeDraft) =>
  updateDoc(doc(recipesCol(hid), id), { ...draft })

export const deleteRecipe = (hid: string, id: string) => deleteDoc(doc(recipesCol(hid), id))

interface Imported {
  title: string
  image: string | null
  servings: string | null
  ingredients: string[]
  steps: string[]
  sourceUrl: string
}

const importCall = httpsCallable<{ url: string }, Imported>(functions, 'importRecipe')

export async function importFromUrl(url: string): Promise<RecipeDraft> {
  const { data } = await importCall({ url })
  return {
    title: data.title,
    image: data.image,
    sourceUrl: data.sourceUrl,
    servings: parseServings(data.servings),
    ingredients: data.ingredients,
    steps: data.steps,
    labels: [],
  }
}

// Renaming or deleting a label rewrites the household list and every recipe using it in one batch.
export async function renameLabel(h: Household, recipes: Recipe[], from: string, to: string) {
  const batch = writeBatch(db)
  batch.update(doc(db, 'households', h.id), { recipeLabels: h.recipeLabels.map(l => (l === from ? to : l)) })
  for (const r of recipes.filter(r => r.labels.includes(from))) {
    batch.update(doc(recipesCol(h.id), r.id), { labels: [...new Set(r.labels.map(l => (l === from ? to : l)))] })
  }
  await batch.commit()
}

export async function deleteLabel(h: Household, recipes: Recipe[], label: string) {
  const batch = writeBatch(db)
  batch.update(doc(db, 'households', h.id), { recipeLabels: h.recipeLabels.filter(l => l !== label) })
  for (const r of recipes.filter(r => r.labels.includes(label))) {
    batch.update(doc(recipesCol(h.id), r.id), { labels: arrayRemove(label) })
  }
  await batch.commit()
}
