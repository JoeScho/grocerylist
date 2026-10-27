import { describe, expect, it } from 'vitest'
import { localiseRecipe, titleCase } from './localise'

const ingredients = (...lines: string[]) => localiseRecipe({ title: 'x', ingredients: lines, steps: [] }).ingredients
const steps = (...lines: string[]) => localiseRecipe({ title: 'x', ingredients: [], steps: lines }).steps

describe('coriander', () => {
  it.each([
    '1 bunch fresh cilantro, chopped',
    'Coriander, to serve',
    'A handful of coriander leaves',
    '1 tsp ground coriander',
    '2 tsp coriander seeds',
  ])('drops "%s"', line => {
    expect(ingredients(line)).toEqual([])
  })

  it.each([
    ['Mint and coriander, to serve', 'Mint, to serve'],
    ['1 tsp ground coriander and cumin', '1 tsp cumin'],
    ['Fresh herbs (cilantro)', 'Fresh herbs'],
    ['Parsley or coriander', 'Parsley'],
  ])('keeps the rest of "%s"', (line, out) => {
    expect(ingredients(line)).toEqual([out])
  })

  it.each([
    ['Garnish with coriander and lime wedges.', 'Garnish with lime wedges.'],
    ['Add the cilantro, lime juice and salt.', 'Add lime juice and salt.'],
    ['Serve with rice and coriander.', 'Serve with rice.'],
    ['Simmer for 5 minutes. Scatter over the coriander. Serve.', 'Simmer for 5 minutes. Serve.'],
  ])('edits the step "%s"', (line, out) => {
    expect(steps(line)).toEqual([out])
  })

  it('drops a step that was only about coriander', () => {
    expect(steps('Top with cilantro.', 'Eat.')).toEqual(['Eat.'])
    expect(steps('Stir in the chopped cilantro and serve.')).toEqual([])
  })

  it('takes it out of the title', () => {
    expect(localiseRecipe({ title: 'Coriander Chicken', ingredients: [], steps: [] }).title).toBe('Chicken')
    expect(localiseRecipe({ title: 'Chicken with lime and cilantro rice', ingredients: [], steps: [] }).title).toBe('Chicken with Lime Rice')
  })
})

describe('British names', () => {
  it.each([
    ['4 scallions, sliced', '4 spring onions, sliced'],
    ['1 eggplant', '1 aubergine'],
    ['2 Zucchini', '2 Courgette'],
    ['1 red bell pepper', '1 red pepper'],
    ['500g ground beef', '500g beef mince'],
    ['200ml heavy cream', '200ml double cream'],
    ['2 tbsp cornstarch', '2 tbsp cornflour'],
    ['1 tsp baking soda', '1 tsp bicarbonate of soda'],
    ['2 tbsp tomato paste', '2 tbsp tomato puree'],
    ['1 tsp red pepper flakes', '1 tsp chilli flakes'],
    ['2 green chilies', '2 green chillies'],
    ['200g shrimp', '200g prawns'],
    ['1 tbsp shrimp paste', '1 tbsp shrimp paste'],
    ['100g arugula', '100g rocket'],
  ])('%s', (line, out) => {
    expect(ingredients(line)).toEqual([out])
  })

  it('changes kit in the method', () => {
    expect(steps('Heat a skillet on the stovetop, then broil for 3 minutes.')).toEqual(['Heat a frying pan on the hob, then grill for 3 minutes.'])
    expect(steps('Line a baking sheet with parchment paper.')).toEqual(['Line a baking tray with baking paper.'])
  })
})

describe('metric', () => {
  it.each([
    ['1 cup all-purpose flour', '125g plain flour'],
    ['½ cup sugar', '100g sugar'],
    ['1/3 cup milk', '80ml milk'],
    ['1 1/2 cups chicken broth', '360ml chicken stock'],
    ['2 cups cooked rice', '380g cooked rice'],
    ['1 cup water for the rice', '240ml water for the rice'],
    ['1-2 cups spinach', '240–480ml spinach'],
    ['1 lb ground beef', '450g beef mince'],
    ['2 lbs potatoes', '910g potatoes'],
    ['3 pounds chicken thighs', '1.4kg chicken thighs'],
    ['8 oz cream cheese', '225g cream cheese'],
    ['1 (14 oz) can chickpeas', '1 (400g) can chickpeas'],
    ['4 fl oz cream', '120ml cream'],
    ['1 stick unsalted butter', '115g unsalted butter'],
    ['1-inch piece ginger', '2.5cm piece ginger'],
    ['1 cup (120g) flour', '120g flour'],
    ['600g/ 1.2lb chicken thigh', '600g chicken thigh'],
    ['250ml (1 cup) stock', '250ml stock'],
    ['2 tbsp olive oil', '2 tbsp olive oil'],
    ['1 tsp salt', '1 tsp salt'],
  ])('%s', (line, out) => {
    expect(ingredients(line)).toEqual([out])
  })

  it.each([
    ['Preheat the oven to 350°F.', 'Preheat the oven to 180°C.'],
    ['Bake at 400 F for 20 minutes.', 'Bake at 200°C for 20 minutes.'],
    ['Preheat oven to 425 degrees.', 'Preheat oven to 220°C.'],
    ['Preheat to 350°F (180°C).', 'Preheat to 180°C.'],
    ['Preheat to 200°C / 400°F.', 'Preheat to 200°C.'],
    ['Heat the oven to 200°C (180°C fan).', 'Heat the oven to 200°C (180°C fan).'],
    ['Grease a 9x13-inch dish.', 'Grease a 23 x 33cm dish.'],
    ['Pour in 2 cups of stock.', 'Pour in 480ml of stock.'],
    ['Simmer for 20 minutes in a large pan.', 'Simmer for 20 minutes in a large pan.'],
  ])('%s', (line, out) => {
    expect(steps(line)).toEqual([out])
  })
})

describe('capitals', () => {
  it.each([
    ['creamy chicken orzo', 'Creamy Chicken Orzo'],
    ['Chicken With Rice And Peas', 'Chicken with Rice and Peas'],
    ['the best BBQ ribs', 'The Best BBQ Ribs'],
    ['one-pan pasta (easy)', 'One-pan Pasta (Easy)'],
    ["mac 'n' cheese", "Mac 'n' Cheese"],
  ])('%s', (title, out) => {
    expect(titleCase(title)).toBe(out)
  })

  it('starts ingredients and steps with a capital', () => {
    const r = localiseRecipe({ title: 'x', ingredients: ['salt', '2 onions', '½ lemon'], steps: ['fry the onions.', '"stir" well'] })
    expect(r.ingredients).toEqual(['Salt', '2 onions', '½ lemon'])
    expect(r.steps).toEqual(['Fry the onions.', '"Stir" well'])
  })
})
