import { describe, expect, it } from 'vitest'
import { isStaple, itemKey, manualQtyForTotal, qtyStep, recipeContributions, totalQty } from './list'

describe('recipeContributions', () => {
  it('scales to portions and converts to base units', () => {
    const c = recipeContributions(['1 kg potatoes', '2 onions'], 2, 4)
    expect(c).toEqual([
      { key: itemKey('potato', 'g'), name: 'potato', unit: 'g', qty: 2000 },
      { key: itemKey('onion', null), name: 'onion', unit: null, qty: 4 },
    ])
  })

  it('merges duplicates within one recipe', () => {
    const c = recipeContributions(['1 onion, sliced', '1 red onion', '1 onion, diced'], 4, 4)
    expect(c.find(x => x.name === 'onion')?.qty).toBe(2)
    expect(c.find(x => x.name === 'red onion')?.qty).toBe(1)
  })

  it('treats a missing servings count as already matching the portions', () => {
    expect(recipeContributions(['3 eggs'], null, 4)[0].qty).toBe(3)
  })
})

describe('totalQty', () => {
  it('adds recipe and manual quantities', () => {
    expect(totalQty({ manual: true, manualQty: 1, contributions: { a: 2, b: 3 } })).toBe(6)
  })
  it('returns null when nothing has a number', () => {
    expect(totalQty({ manual: false, manualQty: null, contributions: { a: null } })).toBeNull()
  })
})

describe('isStaple', () => {
  it('matches exact names and more specific variants', () => {
    const staples = ['salt', 'olive oil']
    expect(isStaple('salt', staples)).toBe(true)
    expect(isStaple('extra virgin olive oil', staples)).toBe(true)
    expect(isStaple('salted butter', staples)).toBe(false)
  })
})

describe('manualQtyForTotal', () => {
  const item = { manual: false, manualQty: null, contributions: { a: 200, b: null } }
  it('stores the difference from the recipe amounts', () => {
    expect(manualQtyForTotal(item, 150)).toBe(-50)
    expect(manualQtyForTotal(item, 300)).toBe(100)
  })
  it('never goes below a zero total', () => {
    expect(manualQtyForTotal(item, -10)).toBe(-200)
  })
})

describe('qtyStep', () => {
  it('steps weights and volumes in 50s, everything else in ones', () => {
    expect(qtyStep('g')).toBe(50)
    expect(qtyStep('ml')).toBe(50)
    expect(qtyStep(null)).toBe(1)
    expect(qtyStep('tbsp')).toBe(1)
  })
})
