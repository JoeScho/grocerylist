import { useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import {
  addDoc, arrayRemove, arrayUnion, collection, doc, FieldPath, getDoc, getDocs, onSnapshot, query, setDoc, updateDoc, where,
} from 'firebase/firestore'
import { auth, db } from '../firebase'
import type { Household } from '../types'

export const DEFAULT_LABELS = ['Breakfast', 'Lunch', 'Dinner', 'Special occasions']

export const DEFAULT_STAPLES = ['salt', 'black pepper', 'pepper', 'salt and pepper', 'olive oil', 'vegetable oil', 'sunflower oil', 'water']

export function useAuth() {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  useEffect(() => onAuthStateChanged(auth, setUser), [])
  return user
}

const lower = (email: string | null) => (email ?? '').toLowerCase()

// Finds (or creates) the household this user belongs to and remembers the choice.
async function resolveHouseholdId(user: User): Promise<string> {
  const userRef = doc(db, 'users', user.uid)
  const userSnap = await getDoc(userRef)
  const saved = userSnap.data()?.householdId as string | undefined
  if (saved) {
    const h = await getDoc(doc(db, 'households', saved)).catch(() => null)
    if (h?.exists()) return saved
  }
  const email = lower(user.email)
  const found = await getDocs(query(collection(db, 'households'), where('memberEmails', 'array-contains', email)))
  // Prefer a household someone else invited us to over one we made ourselves.
  const pick = found.docs.find(d => d.data().ownerUid !== user.uid) ?? found.docs[0]
  let id = pick?.id
  if (!id) {
    const first = user.displayName?.split(' ')[0]
    const ref = await addDoc(collection(db, 'households'), {
      name: first ? `${first}'s kitchen` : 'Our kitchen',
      ownerUid: user.uid,
      ownerEmail: email,
      memberEmails: [email],
      staples: DEFAULT_STAPLES,
      recipeLabels: DEFAULT_LABELS,
      categoryOverrides: {},
    })
    id = ref.id
  }
  await setDoc(userRef, { householdId: id }, { merge: true })
  return id
}

export function useHousehold(user: User | null | undefined) {
  const [household, setHousehold] = useState<Household | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [householdId, setHouseholdId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) { setHouseholdId(null); setHousehold(null); return }
    resolveHouseholdId(user).then(setHouseholdId, e => setError(String(e?.message ?? e)))
    // Follow the saved choice so switching households updates live.
    return onSnapshot(doc(db, 'users', user.uid), snap => {
      const id = snap.data()?.householdId
      if (id) setHouseholdId(id)
    })
  }, [user])

  useEffect(() => {
    if (!householdId) return
    return onSnapshot(
      doc(db, 'households', householdId),
      snap => {
        if (!snap.exists()) return
        const d = snap.data()
        setHousehold({
          id: snap.id,
          name: d.name,
          ownerUid: d.ownerUid,
          ownerEmail: d.ownerEmail,
          memberEmails: d.memberEmails ?? [],
          staples: d.staples ?? [],
          categoryOverrides: d.categoryOverrides ?? {},
          // Households created before labels existed get the defaults.
          recipeLabels: d.recipeLabels ?? DEFAULT_LABELS,
        })
      },
      // Losing access (removed by the owner) drops back to resolving a fresh household.
      () => { if (user) updateDoc(doc(db, 'users', user.uid), { householdId: null }).then(() => resolveHouseholdId(user)).then(setHouseholdId) },
    )
  }, [householdId, user])

  return { household, error }
}

// Other households this user has been invited to.
export function useInvites(user: User | null | undefined, currentId: string | undefined) {
  const [invites, setInvites] = useState<{ id: string; name: string; ownerEmail: string }[]>([])
  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'households'), where('memberEmails', 'array-contains', lower(user.email)))
    return onSnapshot(q, snap =>
      setInvites(snap.docs.filter(d => d.id !== currentId).map(d => ({ id: d.id, name: d.data().name, ownerEmail: d.data().ownerEmail }))),
    )
  }, [user, currentId])
  return invites
}

export const switchHousehold = (uid: string, householdId: string) =>
  setDoc(doc(db, 'users', uid), { householdId }, { merge: true })

const hRef = (id: string) => doc(db, 'households', id)

export const addMember = (h: Household, email: string) => updateDoc(hRef(h.id), { memberEmails: arrayUnion(email.trim().toLowerCase()) })
export const removeMember = (h: Household, email: string) => updateDoc(hRef(h.id), { memberEmails: arrayRemove(email) })
export const renameHousehold = (h: Household, name: string) => updateDoc(hRef(h.id), { name })
export const addStaple = (h: Household, name: string) => updateDoc(hRef(h.id), { staples: arrayUnion(name.trim().toLowerCase()) })
export const removeStaple = (h: Household, name: string) => updateDoc(hRef(h.id), { staples: arrayRemove(name) })
export const setCategoryOverride = (h: Household, name: string, category: string) =>
  updateDoc(hRef(h.id), new FieldPath('categoryOverrides', name), category)

export const setRecipeLabels = (h: Household, labels: string[]) => updateDoc(hRef(h.id), { recipeLabels: labels })
