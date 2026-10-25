import { describe, expect, it } from 'vitest'
import { parseCaption } from './caption'

describe('parseCaption', () => {
  it('reads a caption with headings, emoji and hashtags', () => {
    const caption = `🔥 Creamy Tuscan Chicken Orzo 🔥
Ready in 30 mins and serves 4!

Ingredients:
🍗 500g chicken thighs
🧅 1 onion, diced
- 3 cloves garlic
• 300g orzo

Method:
1. Fry the chicken until golden.
2. Add the onion and garlic.
3) Stir in the orzo and stock.

Save this for later! 👇
#dinner #orzo #easyrecipes`
    const r = parseCaption(caption)
    expect(r.title).toBe('Creamy Tuscan Chicken Orzo')
    expect(r.servings).toBe(4)
    expect(r.ingredients).toEqual(['500g chicken thighs', '1 onion, diced', '3 cloves garlic', '300g orzo'])
    expect(r.steps).toEqual([
      'Fry the chicken until golden.',
      'Add the onion and garlic.',
      'Stir in the orzo and stock.',
    ])
  })

  it('falls back to quantity lines and numbered lines when there are no headings', () => {
    const r = parseCaption(`Easy pancakes
2 eggs
100g flour
300ml milk
1. Whisk everything together.
2. Fry in a hot pan.`)
    expect(r.title).toBe('Easy pancakes')
    expect(r.ingredients).toEqual(['2 eggs', '100g flour', '300ml milk'])
    expect(r.steps).toHaveLength(2)
  })

  it('accepts other heading wording', () => {
    const r = parseCaption(`Soup\nYou'll need\n1 leek\nHow to make it\nChop and simmer.`)
    expect(r.ingredients).toEqual(['1 leek'])
    expect(r.steps).toEqual(['Chop and simmer.'])
  })
})
