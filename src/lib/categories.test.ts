import { describe, expect, it } from 'vitest'
import { categorise } from './categories'

describe('categorise', () => {
  it.each([
    ['onion', 'produce'],
    ['red pepper', 'produce'],
    ['black pepper', 'spices'],
    ['salt and pepper', 'spices'],
    ['fennel seed', 'spices'],
    ['ground coriander', 'spices'],
    ['coriander', 'produce'],
    ['coconut milk', 'pantry'],
    ['milk', 'dairy'],
    ['salted butter', 'dairy'],
    ['butter bean', 'pantry'],
    ['peanut butter', 'pantry'],
    ['chicken thigh', 'meat'],
    ['chicken stock', 'pantry'],
    ['olive oil', 'pantry'],
    ['frozen pea', 'frozen'],
    ['chickpea', 'pantry'],
    ['peach', 'produce'],
    ['strawberry', 'produce'],
    ['sweet potato', 'produce'],
    ['soy sauce', 'world'],
    ['egg noodle', 'pantry'],
    ['sourdough', 'bakery'],
    ['loo roll', 'household'],
    ['nutmeg', 'spices'],
    ['halloumi', 'dairy'],
    ['gnocchi', 'chilled'],
    ['dragon fruit thing', 'misc'],
  ])('%s -> %s', (name, cat) => expect(categorise(name)).toBe(cat))

  it('respects overrides', () => {
    expect(categorise('Coconut', { coconut: 'produce' })).toBe('produce')
  })
})
