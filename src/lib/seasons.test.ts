import { describe, expect, it } from 'vitest'
import { classifyIngredient } from './seasons'

const NOV = 11, AUG = 8

describe('classifyIngredient', () => {
  it.each([
    ['2 leeks, sliced', NOV, 'leek', 'in-season'],
    ['500g potatoes', NOV, 'potato', 'in-season'],
    ['1 red onion', 6, 'onion', 'in-season'],
    ['2 courgettes', NOV, 'courgette', 'out-of-season'],
    ['2 courgettes', AUG, 'courgette', 'in-season'],
    ['1 red pepper', NOV, 'pepper', 'out-of-season'],
    ['2 peppers', AUG, 'pepper', 'in-season'],
    ['1 lemon', AUG, 'lemon', 'imported'],
    ['Juice of 1 lemon', NOV, 'lemon', 'imported'],
    ['Zest of 1 lime', NOV, 'lime', 'imported'],
    ['Thumb of ginger', NOV, 'ginger', 'imported'],
    ['2 cloves garlic', NOV, 'garlic', 'in-season'],
    ['200g cherry tomatoes', AUG, 'tomato', 'in-season'],
    ['2 sweet potatoes', NOV, 'sweet-potato', 'imported'],
    ['4 spring onions', NOV, 'spring-onion', 'out-of-season'],
    ['1 butternut squash', NOV, 'squash', 'in-season'],
    ['300g Brussels sprouts', 12, 'brussels-sprout', 'in-season'],
    ['1 swede', NOV, 'swede', 'in-season'],
    ['400g rhubarb', 3, 'rhubarb', 'in-season'],
    ['150g sugar snap peas', 7, 'sugar-snap', 'in-season'],
    ['Handful of fresh mint', 7, 'mint', 'in-season'],
    ['1 bag salad leaves', NOV, 'lettuce', 'out-of-season'],
  ])('%s in month %i -> %s %s', (line, month, id, status) => {
    expect(classifyIngredient(line, month)).toEqual({ id, status })
  })

  it.each([
    '2 chicken thighs', '200ml coconut milk', '1 tin chopped tomatoes', '2 tbsp tomato puree',
    '1 tsp ground ginger', '1 tsp dried basil', '50g sun-dried tomatoes', '1 tsp garlic powder',
    '200g frozen spinach', '1 tsp chilli flakes', 'Black pepper', 'Salt and pepper',
    'Pepper, to taste', 'Freshly ground pepper', '1 tsp pepper',
    '2 tbsp apple cider vinegar', '200g frozen peas',
    'For the salad:', '', '   ', '1 dragon fruit',
  ])('does not score %j', line => {
    expect(classifyIngredient(line, 8)).toBeNull()
  })

  it('handles seasons that wrap the year end', () => {
    for (const m of [9, 12, 1, 3]) expect(classifyIngredient('1 leek', m)?.status).toBe('in-season')
    for (const m of [4, 8]) expect(classifyIngredient('1 leek', m)?.status).toBe('out-of-season')
  })

  it('treats stored crops as in season every month', () => {
    for (let m = 1; m <= 12; m++) expect(classifyIngredient('1 apple', m)?.status).toBe('in-season')
  })

  it('does not find apple inside pineapple', () => {
    expect(classifyIngredient('1 pineapple', 8)).toEqual({ id: 'pineapple', status: 'imported' })
  })
})
