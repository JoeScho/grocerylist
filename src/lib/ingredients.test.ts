import { describe, expect, it } from 'vitest'
import { formatQty, normaliseName, parseIngredient, parseServings, toBase } from './ingredients'

describe('parseIngredient', () => {
  it.each([
    ['200g chicken thighs, diced', 200, 'g', 'chicken thigh'],
    ['2 onions, finely chopped', 2, null, 'onion'],
    ['1 1/2 tsp ground cumin', 1.5, 'tsp', 'cumin'],
    ['1½ tbsp olive oil', 1.5, 'tbsp', 'olive oil'],
    ['½ lemon, juiced', 0.5, null, 'lemon'],
    ['3 cloves garlic, crushed', 3, 'clove', 'garlic'],
    ['2-3 tomatoes', 3, null, 'tomato'],
    ['1 x 400g tin chopped tomatoes', 1, 'can', 'tomato'],
    ['Salt and pepper to taste', null, null, 'salt and pepper'],
    ['• 1 kg potatoes (Maris Piper)', 1, 'kg', 'potato'],
    ['250 ml double cream', 250, 'ml', 'double cream'],
    ['2 large eggs', 2, null, 'egg'],
    ['1 tin coconut milk', 1, 'can', 'coconut milk'],
    ['600g/ 1.2lb chicken thigh ((boneless, skinless), cut into 3cm cubes (Note 1))', 600, 'g', 'chicken thigh'],
    ['2 garlic cloves crushed', 2, 'clove', 'garlic'],
    ['1/2 cup plain yoghurt, ( full fat best (Greek is fine))', 0.5, 'cup', 'plain yoghurt'],
  ])('%s', (text, qty, unit, name) => {
    const p = parseIngredient(text)
    expect(p.qty).toBe(qty)
    expect(p.unit).toBe(unit)
    expect(p.name).toBe(name)
  })

  it('keeps the original text', () => {
    expect(parseIngredient(' 2 onions ').text).toBe('2 onions')
  })
})

describe('normaliseName', () => {
  it('makes plurals and singulars match', () => {
    expect(normaliseName('red peppers')).toBe(normaliseName('red pepper'))
    expect(normaliseName('cherries')).toBe('cherry')
    expect(normaliseName('hummus')).toBe('hummus')
  })
})

describe('toBase / formatQty', () => {
  it('converts kg to g and back for display', () => {
    expect(toBase(1.2, 'kg')).toEqual({ qty: 1200, unit: 'g' })
    expect(formatQty(1200, 'g')).toBe('1.2kg')
  })
  it('formats fractions and counts', () => {
    expect(formatQty(1.5, 'tbsp')).toBe('1½ tbsp')
    expect(formatQty(3, null)).toBe('3')
    expect(formatQty(2, 'clove')).toBe('2 cloves')
    expect(formatQty(null, null)).toBe('')
  })
})

describe('parseServings', () => {
  it.each([['Serves 4', 4], ['4-6', 4], [['6', '6 portions'], 6], [8, 8], [undefined, null]])(
    '%s',
    (raw, n) => expect(parseServings(raw)).toBe(n),
  )
})
