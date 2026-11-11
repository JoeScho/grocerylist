# Sustainability Score Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the Recipes screen be ordered by a per-recipe sustainability score based on whether its fresh produce is British and in season this month, shown as a filling bar on each recipe image.

**Architecture:** Two new pure modules in `src/lib`: `seasons.ts` (UK produce calendar, ingredient classification, recipe scoring) and `recipeOrder.ts` (the four orderings and the remembered choice). The Recipes screen and recipe page call them at render time. Nothing is stored in Firestore.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, plain CSS in `src/styles.css`. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-11-sustainability-score-design.md`. Read it before starting; this plan refers to its tables instead of repeating them.

## Global Constraints

- Do not change `src/lib/categories.ts`, `firestore.rules`, `src/types.ts` or any Firestore document shape.
- No new npm dependencies.
- With "Alphabetical" selected the Recipes screen must look and behave exactly as it does today.
- Ordering never hides a recipe.
- Exact copy: order labels "Alphabetical", "Most used", "Sustainability", "Recently added"; control label "Order by"; score text "83% sustainable" (whole number) and "No fresh produce"; ingredient tags "In season", "Out of season", "Imported".
- Credits: in season 1, imported 0.5, out of season 0. A recipe with no scored produce scores 1.
- Months are numbers 1 to 12, taken from the device's local time.
- British spelling in code comments and copy. Comments say why, in the style of the existing `src/lib` files.
- Work on a branch `feat/sustainability-score`, not `main`. Commit messages follow the repo's `feat:` / `fix:` style and end with `Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>`.
- There are no component tests in this repo. UI tasks are verified with `npm run typecheck`, `npm run build` and a look in the browser (`npm run dev`).

## Review Focus

1. **Season ranges that wrap the year end.** Leek (September to March) must be in season in December, January and March, and out in April and August. Test in Task 1.
2. **Names that contain another produce name.** "Cherry tomatoes" is a tomato, "sweet potato" is not a potato, "pineapple" is not an apple, "spring onions" are not onions. Test in Task 1.
3. **Lines that aren't ingredients.** Empty strings, whitespace, and headings such as "For the salad:" must score nothing and must not throw. Test in Task 1.
4. **A remembered order that can't be read.** Storage that throws (private browsing) or holds an unknown value must give Alphabetical. Test in Task 3.
5. **Recipes with missing data when ordering.** A recipe with no `createdAt` (including one just created, whose server timestamp is still pending) goes last under "Recently added"; cooked meals whose recipe was deleted must not break "Most used". Test in Task 3.

---

### Task 1: Classify an ingredient line

**Files:**
- Create: `src/lib/seasons.ts`
- Test: `src/lib/seasons.test.ts`
- Modify: `.gitignore` (add `.superpowers/`)

**Interfaces:**
- Consumes: `parseIngredient(text)` from `src/lib/ingredients.ts` (returns `{ text, qty, unit, name }`); `categorise(name)` from `src/lib/categories.ts`, called with no overrides.
- Produces:

```ts
export type ProduceStatus = 'in-season' | 'out-of-season' | 'imported'
export interface ProduceMatch { id: string; status: ProduceStatus }
export const STATUS_LABEL: Record<ProduceStatus, string> // 'In season' | 'Out of season' | 'Imported'
export function classifyIngredient(line: string, month: number): ProduceMatch | null
export function currentMonth(): number // 1-12, device local time
```

- [ ] **Step 1: Branch and housekeeping**

```bash
git checkout -b feat/sustainability-score
```

Add `.superpowers/` to `.gitignore`. Commit it together with the two untracked docs (`docs/ideas/multi-country.md`, `docs/superpowers/specs/2026-11-11-sustainability-score-design.md`) and this plan as `docs: sustainability score design and plan`.

- [ ] **Step 2: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { classifyIngredient } from './seasons'

const NOV = 11, AUG = 8

describe('classifyIngredient', () => {
  it.each([
    // line, month, id, status
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
```

- [ ] **Step 3: Run the tests and see them fail**

Run: `npx vitest run src/lib/seasons.test.ts`
Expected: FAIL, cannot resolve `./seasons`.

- [ ] **Step 4: Write the calendar data in `src/lib/seasons.ts`**

One array of entries shaped `{ id: string; names: string[]; season: 'all' | 'import' | [from: number, to: number] }`, where `[9, 3]` means September to March inclusive.

- Take every row from the spec's "Produce calendar (draft)" section: the "All year" list becomes `'all'`, the table rows become month ranges, the "Imported all year" list becomes `'import'`.
- `id` is the singular name in kebab case (`brussels-sprout`, `sweet-potato`, `spring-onion`, `sugar-snap`, `pak-choi`, `bean-sprout`). Rows that group several things split into one entry each where the tests need separate ids (mint, basil, dill, parsley, chive; mangetout and sugar-snap), and otherwise share one entry with several names (pumpkin and squash under `squash`; green, runner and French beans under `green-bean`; lettuce, rocket, salad leaves, salad and mixed leaves under `lettuce`).
- `names` are singular, lower case, as `normaliseName` would produce them, with common aliases: `pak choi`/`bok choy`, `bean sprout`/`beansprout`, `lemongrass`/`lemon grass`, `sweetcorn`/`corn`, `sugar snap`/`sugar snap pea`, `chilli`/`chili`. "Other citrus" means clementine, satsuma, tangerine, mandarin and grapefruit, each its own import entry.
- The generic words "herb" and "berries" get no entry.

- [ ] **Step 5: Implement `classifyIngredient`, `STATUS_LABEL` and `currentMonth`**

Rules, in this order. Return `null` as soon as one excludes the line.

1. Trimmed line is empty or ends with `:` (a heading): `null`.
2. The raw line matches a processed form, whole word, case-insensitive: `dried`, `sun-dried`/`sundried`, `ground`, `powder`/`powdered`, `flake(s)`, `frozen`, `tinned`, `canned`, `tin(s)`, `can(s)`, `pickled`, `sauce`, `puree`/`purée`, `paste`, `ketchup`: `null`. This looks at the raw line because `parseIngredient` strips "ground".
3. Parse with `parseIngredient`. Find calendar names that occur in the parsed name as whole words, allowing a plural `s`/`es` (the parsed name only singularises its last word). Choose the match that ends latest in the name, and among those the longest. This is what makes "cherry tomato" a tomato and "sweet potato" a sweet potato. No match: `null`.
4. If the match is `pepper` and the whole parsed name is just `pepper`: score it only when `qty` is a number and `unit` is `null` ("2 peppers"). Otherwise it is the seasoning: `null`.
5. Aisle check: `categorise(name)` must be `produce` or `misc`, else `null`. The `sugar-snap` entry skips this check, because `categorise` files it under `pantry`.
6. Status: `'import'` gives `imported`; `'all'` gives `in-season`; a range gives `in-season` when the month is inside it (handle `from > to` as wrapping), else `out-of-season`.

- [ ] **Step 6: Run the tests and see them pass**

Run: `npx vitest run src/lib/seasons.test.ts`
Expected: PASS. Then `npm test` to confirm nothing else broke.

- [ ] **Step 7: Check the calendar against a published guide**

If you have web access, compare the month ranges with one published UK seasonality calendar (Vegetarian Society, BBC Good Food or Eat Seasonably). Correct `seasons.ts`, the spec table and any test rows a correction affects. If you have no web access, leave the data as drafted and say so in your final report so the owner knows it is unverified.

- [ ] **Step 8: Commit**

```bash
git add src/lib/seasons.ts src/lib/seasons.test.ts
git commit -m "feat: classify recipe ingredients against a UK produce calendar"
```

---

### Task 2: Score a recipe

**Files:**
- Modify: `src/lib/seasons.ts`
- Test: `src/lib/seasons.test.ts`

**Interfaces:**
- Consumes: `classifyIngredient(line, month)` from Task 1.
- Produces:

```ts
export interface RecipeScore { score: number; scored: number } // score 0-1 unrounded; scored = distinct produce counted
export function scoreRecipe(ingredients: string[], month: number): RecipeScore
export function scoreLabel(s: RecipeScore): string // '83% sustainable' | 'No fresh produce'
```

- [ ] **Step 1: Write the failing tests**

```ts
describe('scoreRecipe', () => {
  const traybake = ['2 leeks', '500g potatoes', 'Juice of 1 lemon', '6 chicken thighs', '2 tbsp olive oil']
  const curry = ['2 limes', 'Thumb of ginger', '2 stalks lemongrass', '400ml coconut milk']
  const greek = ['4 tomatoes', '1 cucumber', '1 red pepper', '1 red onion', '200g feta']
  const carbonara = ['400g spaghetti', '150g pancetta', '3 eggs', '50g parmesan']

  it('matches the worked examples in the spec', () => {
    expect(scoreRecipe(traybake, 11).score).toBeCloseTo(2.5 / 3)
    expect(scoreRecipe(curry, 11).score).toBe(0.5)
    expect(scoreRecipe(curry, 6).score).toBe(0.5)
    expect(scoreRecipe(greek, 11).score).toBe(0.25)
    expect(scoreRecipe(greek, 8).score).toBe(1)
  })

  it('gives a full score when there is no fresh produce', () => {
    expect(scoreRecipe(carbonara, 11)).toEqual({ score: 1, scored: 0 })
    expect(scoreRecipe([], 11)).toEqual({ score: 1, scored: 0 })
  })

  it('counts each produce once however often it appears', () => {
    expect(scoreRecipe(['1 onion', '2 red onions', '2 courgettes'], 11)).toEqual({ score: 0.5, scored: 2 })
  })

  it('ignores produce it does not recognise', () => {
    expect(scoreRecipe(['1 dragon fruit', '1 leek'], 11)).toEqual({ score: 1, scored: 1 })
  })
})

describe('scoreLabel', () => {
  it.each([
    [{ score: 2.5 / 3, scored: 3 }, '83% sustainable'],
    [{ score: 1, scored: 2 }, '100% sustainable'],
    [{ score: 0, scored: 1 }, '0% sustainable'],
    [{ score: 1, scored: 0 }, 'No fresh produce'],
  ])('%j -> %s', (s, label) => expect(scoreLabel(s)).toBe(label))
})
```

- [ ] **Step 2: Run and see them fail**

Run: `npx vitest run src/lib/seasons.test.ts`
Expected: FAIL, `scoreRecipe` is not exported.

- [ ] **Step 3: Implement `scoreRecipe` and `scoreLabel`**

Classify every line, keep one result per `id`, average the credits (1, 0.5, 0). No results gives `{ score: 1, scored: 0 }`. `scoreLabel` rounds with `Math.round(score * 100)`.

- [ ] **Step 4: Run and see them pass**

Run: `npx vitest run src/lib/seasons.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/seasons.ts src/lib/seasons.test.ts
git commit -m "feat: score a recipe by how much of its produce is British and in season"
```

---

### Task 3: Recipe orderings and the remembered choice

**Files:**
- Create: `src/lib/recipeOrder.ts`
- Test: `src/lib/recipeOrder.test.ts`

**Interfaces:**
- Consumes: `scoreRecipe(ingredients, month)` from Task 2; `Recipe`, `PlanEntry` from `src/types.ts`.
- Produces:

```ts
export type RecipeOrder = 'alphabetical' | 'most-used' | 'sustainability' | 'recent'
export const RECIPE_ORDERS: { value: RecipeOrder; label: string }[] // in the order: Alphabetical, Most used, Sustainability, Recently added
export function orderRecipes(recipes: Recipe[], order: RecipeOrder, ctx: { plan: PlanEntry[]; month: number }): Recipe[] // new array, input untouched
export function loadRecipeOrder(): RecipeOrder
export function saveRecipeOrder(order: RecipeOrder): void
```

Storage key: `schoceries.recipeOrder`.

- [ ] **Step 1: Write the failing tests**

Build recipes with a small factory (`recipe('a', 'Apple pie', { ingredients, createdAt })`) and fake timestamps as `{ toMillis: () => n } as Timestamp`. Build plan entries with only the fields used (`recipeId`, `cooked`). Assert on the resulting titles.

```ts
describe('orderRecipes', () => {
  it('alphabetical uses the existing en-GB, case-insensitive, numeric comparison', () => {
    // titles 'banana bread', 'Apple pie', 'Curry 10', 'Curry 2' -> Apple pie, banana bread, Curry 2, Curry 10
  })
  it('most used counts cooked meals per recipe, highest first, ties alphabetical', () => {
    // plan: B cooked twice, A cooked once, C planned but uncooked, plus a cooked meal for a deleted recipe id
    // -> B, A, C; no throw
  })
  it('sustainability orders by unrounded score, highest first, ties alphabetical', () => {
    // month 11: 'Leek soup' ['2 leeks'] (1), 'Carbonara' [] (1), 'Thai curry' ['2 limes'] (0.5), 'Greek salad' ['4 tomatoes'] (0)
    // -> Carbonara, Leek soup, Thai curry, Greek salad
  })
  it('recently added is newest first, with missing createdAt last', () => {
    // createdAt 300, 100, undefined, 200 -> 300, 200, 100, undefined
  })
  it('does not mutate its input', () => { /* copy the array, order it, compare the original to the copy */ })
})

describe('loadRecipeOrder', () => {
  // use vi.stubGlobal('localStorage', ...) and vi.unstubAllGlobals() in afterEach
  it('returns the saved order', () => { /* getItem returns 'sustainability' */ })
  it('falls back to alphabetical for an unknown value', () => { /* getItem returns 'nonsense' */ })
  it('falls back to alphabetical when nothing is saved', () => { /* getItem returns null */ })
  it('falls back to alphabetical when storage throws', () => { /* getItem throws */ })
  it('saveRecipeOrder does not throw when storage throws', () => { /* setItem throws */ })
})
```

Write each body out in full with real assertions; the comments above give the data and expected result.

- [ ] **Step 2: Run and see them fail**

Run: `npx vitest run src/lib/recipeOrder.test.ts`
Expected: FAIL, cannot resolve `./recipeOrder`.

- [ ] **Step 3: Implement `src/lib/recipeOrder.ts`**

The alphabetical comparison is the one currently inline in `src/screens/Recipes.tsx`: `a.title.localeCompare(b.title, 'en-GB', { sensitivity: 'base', numeric: true })`. Every other ordering uses it as the tie-break. For sustainability, compute each recipe's score once before sorting, not inside the comparator.

- [ ] **Step 4: Run and see them pass**

Run: `npx vitest run src/lib/recipeOrder.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/recipeOrder.ts src/lib/recipeOrder.test.ts
git commit -m "feat: recipe orderings with a remembered choice"
```

---

### Task 4: Order by control and score bar on the Recipes screen

**Files:**
- Create: `src/components/ScoreBar.tsx`
- Modify: `src/screens/Recipes.tsx`
- Modify: `src/styles.css` (near the `.recipe-card` rules, around line 135)

**Interfaces:**
- Consumes: `RECIPE_ORDERS`, `orderRecipes`, `loadRecipeOrder`, `saveRecipeOrder`, `RecipeOrder` from Task 3; `scoreRecipe`, `scoreLabel`, `currentMonth`, `RecipeScore` from Tasks 1 and 2.
- Produces: `ScoreBar({ score, inline }: { score: RecipeScore; inline?: boolean })`, a presentational component. Without `inline` it pins itself to the top of a positioned parent; with it, it sits in the normal flow.

- [ ] **Step 1: Add the control**

In `Recipes.tsx`, hold the order in state initialised from `loadRecipeOrder()`; on change, set state and call `saveRecipeOrder`. Render a native `<select>` with a visible "Order by" label, between the search input and `LabelTabs`, shown under the same condition as the search input (`recipes && recipes.length > 0`). Options come from `RECIPE_ORDERS`. Style it to match the search input (same border, radius and font weight); class names `order-by` for the wrapper.

- [ ] **Step 2: Apply the ordering**

Replace the inline `.sort(...)` in the `filtered` memo with `orderRecipes(matches, order, { plan, month })`, where `matches` is the result of the existing search and label filter and `month` is `currentMonth()` read once per mount. Add `order` and `plan` to the memo's dependencies.

- [ ] **Step 3: Build `ScoreBar` and its CSS**

`ScoreBar` renders a track with a fill whose width is the rounded percentage, `role="img"` and `aria-label` set to `scoreLabel(score)`.

```css
.score-bar { position: absolute; top: 0; left: 0; right: 0; height: 10px; background: rgba(43, 33, 64, 0.25); }
.score-fill { height: 100%; border-radius: 0 5px 5px 0; background-image: linear-gradient(90deg, var(--coral), var(--sun) 50%, var(--mint)); background-repeat: no-repeat; }
```

Set `width: N%` and `background-size: (10000 / N)% 100%` inline on the fill so the gradient spans the full card and the fill reveals only its left part. When N is 0, render the track with no fill. At 100 the fill has no right-hand radius.

`ScoreBar` takes an optional `inline?: boolean` prop for Task 5. Inline adds the class `inline`:

```css
.score-bar.inline { position: relative; border-radius: 5px; overflow: hidden; }
```

- [ ] **Step 4: Show the bar and text on the cards**

Only when `order === 'sustainability'`: render `<ScoreBar>` inside each `.recipe-card` (the card is already `position: relative`), and add a line with `scoreLabel(score)` in the card's meta block directly under the "N ingredients" line, in the same `subtle` 13px style. Compute each visible recipe's score once (a memo keyed by recipe id), not once for the bar and again for the text. Under any other order the card markup is unchanged from today.

- [ ] **Step 5: Verify**

Run: `npm run typecheck && npm test && npm run build`
Expected: all pass.

Then `npm run dev` and check in the browser at phone width:
- Default is Alphabetical and the screen looks as before, apart from the new control.
- Choosing Sustainability reorders the grid, shows bars and percentages, and the "In shop" pill still reads clearly below the bar.
- A recipe with no fresh produce shows a full bar and "No fresh produce".
- Search and label tabs still filter, with the chosen order kept.
- Reloading keeps the chosen order.

If you cannot open a browser, say so in your report; do not claim the visual checks passed.

- [ ] **Step 6: Commit**

```bash
git add src/components/ScoreBar.tsx src/screens/Recipes.tsx src/styles.css
git commit -m "feat: order recipes and show the sustainability bar"
```

---

### Task 5: Score and ingredient tags on the recipe page

**Files:**
- Modify: `src/screens/RecipeDetail.tsx` (the Ingredients tab, around lines 87 to 108)
- Modify: `src/styles.css` (next to `.staple-tag`, around line 183)

**Interfaces:**
- Consumes: `classifyIngredient`, `STATUS_LABEL`, `scoreRecipe`, `scoreLabel`, `currentMonth` from Tasks 1 and 2; `ScoreBar` with `inline` from Task 4.
- Produces: nothing used elsewhere.

- [ ] **Step 1: Show the recipe's score**

At the top of the Ingredients list, before the first ingredient, render `<ScoreBar inline>` with one line below it showing `scoreLabel(scoreRecipe(recipe.ingredients, month))` in the `subtle` style. Show both whenever the recipe has at least one ingredient, whatever order the Recipes screen is using. Do not lay the bar over the hero image.

- [ ] **Step 2: Tag each scored ingredient**

In the ingredient row, when `classifyIngredient(text, month)` returns a match, render a non-interactive tag with `STATUS_LABEL[match.status]` between the ingredient text and the staple button. Lines that return `null` get no tag.

```css
.season-tag { font-size: 12px; font-weight: 800; padding: 3px 9px; border-radius: 999px; white-space: nowrap; }
.season-tag.in-season { color: #1f8f47; background: rgba(62, 207, 110, 0.16); }
.season-tag.imported { color: #8a6a00; background: rgba(255, 210, 63, 0.28); }
.season-tag.out-of-season { color: var(--coral-dark); background: rgba(255, 90, 95, 0.12); }
```

On a narrow screen a long ingredient with both tags must wrap without pushing the staple button off the row; let the tags wrap under the text if needed.

- [ ] **Step 3: Verify**

Run: `npm run typecheck && npm test && npm run build`
Expected: all pass.

In the browser: open a recipe with a mix of produce and check that fresh produce carries the right tag for the current month, that meat and cupboard items carry none, that the staple button still toggles, and that the percentage matches the one on the Recipes grid.

- [ ] **Step 4: Commit**

```bash
git add src/screens/RecipeDetail.tsx src/styles.css
git commit -m "feat: show sustainability score and season tags on the recipe page"
```
