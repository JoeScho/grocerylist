import { describe, expect, it } from 'vitest'
import { isStaple, itemKey, keepItem, manualQtyForTotal, mealsOnShop, nextContributions, qtyStep, recipeContributions, totalQty } from './list'

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

describe('nextContributions', () => {
  it('replaces a cooked meal of the same recipe instead of adding to it', () => {
    expect(nextContributions({ A: 400 }, 'B', 400, ['A'])).toEqual({ B: 400 })
  })
  it('keeps other meals and drops this meal when it has no share', () => {
    expect(nextContributions({ A: 1, B: 2 }, 'B', undefined, [])).toEqual({ A: 1 })
  })
})

describe('keepItem', () => {
  it('drops a line whose only manual amount was a reduction', () => {
    expect(keepItem({ manual: true, manualQty: -100, contributions: {} })).toBe(false)
    expect(keepItem({ manual: true, manualQty: 0, contributions: {} })).toBe(false)
  })
  it('keeps manual lines with an amount or no number', () => {
    expect(keepItem({ manual: true, manualQty: 2, contributions: {} })).toBe(true)
    expect(keepItem({ manual: true, manualQty: null, contributions: {} })).toBe(true)
    expect(keepItem({ manual: false, manualQty: null, contributions: { a: 1 } })).toBe(true)
    expect(keepItem({ manual: false, manualQty: null, contributions: {} })).toBe(false)
  })
})

describe('totalQty floor', () => {
  it('never shows a negative amount', () => {
    expect(totalQty({ manual: true, manualQty: -100, contributions: { a: 50 } })).toBe(0)
  })
})

describe('mealsOnShop', () => {
  const stew = { id: 'stew', itemIds: ['leek', 'potato'] }
  const curry = { id: 'curry', itemIds: ['lime'] }
  const item = (id: string, checked = false) => ({ id, checked })

  it('keeps a meal while any of its ingredients is still to buy', () => {
    expect(mealsOnShop([stew, curry], [item('leek', true), item('potato'), item('lime')])).toEqual([stew, curry])
  })

  it('drops a meal once all its ingredients are ticked', () => {
    expect(mealsOnShop([stew, curry], [item('leek', true), item('potato', true), item('lime')])).toEqual([curry])
  })

  it('drops a meal once its ingredients have been cleared off the list', () => {
    expect(mealsOnShop([stew, curry], [item('lime')])).toEqual([curry])
  })

  it('brings a meal back when one of its ingredients is unticked', () => {
    expect(mealsOnShop([stew], [item('leek'), item('potato', true)])).toEqual([stew])
  })

  it('has no meals when the whole list is done, or while it is loading', () => {
    expect(mealsOnShop([stew, curry], [item('leek', true), item('potato', true), item('lime', true)])).toEqual([])
    expect(mealsOnShop([stew, curry], null)).toEqual([])
  })

  it('ignores meals that were never linked to the list', () => {
    expect(mealsOnShop([{ id: 'old', itemIds: [] }], [item('leek')])).toEqual([])
  })
})
