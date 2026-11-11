# Sustainability score and recipe ordering

Date: 2026-11-11

## Why

The owner picks the week's recipes on the Recipes screen and wants to favour ones whose fresh produce is British and in season at that moment. Today the screen only lists recipes alphabetically and says nothing about produce. The aim is a single score per recipe that can be used to order the list, so the more sustainable choices come first without anything being taken away.

The audience is UK households only. Other countries are a later project, described in `docs/ideas/multi-country.md`.

## Behaviour the owner decided

- **Order by.** The Recipes screen gets an "Order by" control. Ordering never hides a recipe.
- **One score, called Sustainability.** An earlier version of the idea had two scores (Seasonal and Local). The owner merged them into one so users don't have to work out which matters more.
- **Only fresh produce is scored**: fruit, vegetables and fresh herbs. Meat, fish, dairy and cupboard items are ignored. The owner's view is that a beef stew with winter veg is a fair 100%: sourcing the beef well is the cook's decision and the score doesn't judge it.
- **Credit per fresh produce ingredient:**
  - UK-grown and in season this month: full credit (1).
  - Never grown in the UK at scale, so imported all year (lemon, ginger, banana): half credit (0.5).
  - A UK crop that is out of season this month (courgette in November): no credit (0).
- **The score is the average credit** across the recipe's fresh produce, as a percentage.
- **Stored crops count as in season all year** (potatoes, onions, apples and similar).
- **A recipe with no fresh produce gets a full score.**
- **The score is shown as a bar across the top of the recipe image** that fills from the left to the score, coloured red through yellow to green, so a low score stops in red and a high one reaches green. The owner chose this over a marker on a fixed gradient and over five segments.
- **No country setting, no Europe option.** Both were discussed and dropped for this version.

Worked examples, which make good test cases:

| Recipe | Fresh produce | Score |
|---|---|---|
| Leek and potato traybake with lemon, November | leek 1, potato 1, lemon 0.5 | 83% |
| Thai curry, any month | lime 0.5, ginger 0.5, lemongrass 0.5 | 50% |
| Greek salad, November | tomato 0, cucumber 0, pepper 0, onion 1 | 25% |
| Greek salad, August | tomato 1, cucumber 1, pepper 1, onion 1 | 100% |
| Carbonara | none | 100% |

## My calls

The owner saw most of these in a playback and didn't change them. They are still my choices and can be overturned.

### Order by

- Options: **Alphabetical** (default, the current behaviour), **Most used**, **Sustainability**, **Recently added**.
- The choice is remembered on the device (local storage), not synced across the household. If storage is unavailable, fall back to Alphabetical.
- Ordering applies after the existing search and label filter.
- **Most used** orders by the number of meals in the `plan` collection marked cooked for that recipe, highest first. The Recipes screen already receives `plan`.
- **Recently added** orders by `createdAt`, newest first. Recipes with no `createdAt` go last.
- **Sustainability** orders by score, highest first, using the unrounded score.
- Ties in any ordering fall back to the existing alphabetical comparison.
- Placement and styling of the control on the Recipes screen are the builder's choice. It should sit near the search box and label tabs and match the app's existing look.

### Where the score appears

- **Recipes grid:** the bar and a text line show only while ordering by Sustainability. Under the other orderings the cards look as they do today.
- The text line replaces nothing; it sits with the card's existing meta text and reads "83% sustainable". For a recipe with no fresh produce it reads "No fresh produce" and the bar is full.
- **Recipe page:** always shown, whatever the ordering, with the same filling bar and the percentage together at the top of the Ingredients tab (the owner asked for the score to stay visible on this page). The bar is not laid over the page's large image, which already has the Back and More buttons along its top edge. On the Ingredients tab each scored ingredient carries a small tag: "In season", "Out of season" or "Imported". Ingredients that aren't scored carry no tag. The row already holds a staple tag; fitting the two together is the builder's choice.
- Nothing changes on the Week or Shop screens.

### The bar

Taken from the mockup the owner picked:

- 10px tall, pinned to the top edge of the recipe image, full width.
- Track: `rgba(43, 33, 64, 0.25)`.
- Fill: a left-to-right gradient of `--coral`, `--sun` at the midpoint, `--mint`. The gradient is sized to the full width of the card and the fill clips it, so a 40% bar shows only the red-to-orange part.
- The existing "In shop" pill sits 10px from the top and doesn't need to move.
- Colour is not the only signal: the percentage text carries the same information, and the bar should have an accessible label.

### Scoring rules

- The month is the current month in the device's local time zone.
- Scores are computed on the device when needed. Nothing is stored in Firestore and there are no data model or rules changes.
- Each ingredient line is parsed with the existing `parseIngredient` and its normalised name is used for matching.
- A line is scored when its normalised name matches an entry in the produce calendar below, unless one of these exclusions applies:
  - The existing `categorise` rules (without household overrides, which are about shop aisles) put it in an aisle other than `produce` or `misc`. This keeps "chopped tomatoes", "tomato puree", "coconut milk" and "black pepper" out. `misc` is allowed through because `categorise` doesn't know several calendar entries (swede, celeriac, chard, rhubarb, Brussels sprouts, broad beans, blackberries and others).
  - The original line text shows a preserved or processed form: dried, sun-dried, ground, powder, flakes, frozen, tinned or canned, pickled, sauce, puree or paste, ketchup. `parseIngredient` strips "ground" as a descriptor, so this check has to look at the raw line, not the normalised name.
  - The name is a bare "pepper" and the line has no count (for example "pepper, to taste" or "freshly ground pepper"). That is the seasoning. "2 peppers" or "1 red pepper" is the vegetable.
- Sugar snap peas are scored even though `categorise` puts them in `pantry`; handle that as a named exception in the new module.
- Lemon, lime and orange juice or zest count as the fruit, since recipes nearly always mean a squeezed or grated fresh one.
- `src/lib/categories.ts` is not changed. Adding the missing produce keywords there would move items between aisles on the shop list, which is outside this work.
- Produce the calendar doesn't recognise is ignored: it neither helps nor hurts.
- Each produce entry counts once per recipe, however many lines mention it and whatever the quantity. A squeeze of lemon weighs the same as a kilo of leeks. Quantity weighting was considered and left out because ingredient lines are free text.
- Matching should prefer the most specific entry ("sweet potato" before "potato", "spring onion" before "onion"), the same way `categorise` orders its rules.
- Displayed percentages are rounded to whole numbers.

### Code shape

- A new pure module (suggested: `src/lib/seasons.ts`) holding the calendar data and functions to classify an ingredient and score a recipe for a given month, with Vitest tests alongside, in the style of the other `src/lib` modules. The month is a parameter so tests don't depend on the clock.

## Produce calendar (draft)

This is a draft I wrote from general knowledge of UK growing seasons. Before shipping, the builder should check it against a published UK seasonality guide (for example the Vegetarian Society, BBC Good Food or Eat Seasonably calendars) and correct it. The owner has been told they can look it over. Months are inclusive and wrap around the year end.

**All year (stored, or grown year-round under cover):** potato, onion, shallot, garlic, carrot, apple, pear, beetroot, cabbage, swede, cauliflower, mushroom, bean sprouts.

**Seasonal UK crops:**

| Produce | In season |
|---|---|
| Asparagus | May to June |
| Aubergine | June to September |
| Blackberry | August to September |
| Blueberry | July to September |
| Broad bean | June to August |
| Broccoli | June to October |
| Brussels sprout | October to February |
| Celeriac | September to March |
| Celery | July to October |
| Chard | June to October |
| Cherry | June to July |
| Chilli | July to October |
| Courgette | June to September |
| Cucumber | May to September |
| Fennel | June to September |
| Green, runner and French beans | July to September |
| Kale | September to March |
| Leek | September to March |
| Lettuce, rocket, salad leaves | May to October |
| Mangetout, sugar snap | June to August |
| Pak choi | May to October |
| Parsnip | September to March |
| Pepper | July to October |
| Plum | August to September |
| Pumpkin, squash | September to January |
| Radish | April to September |
| Raspberry | June to September |
| Rhubarb | January to June |
| Spinach | April to October |
| Spring onion | April to September |
| Strawberry | May to September |
| Sweetcorn | August to September |
| Tomato | June to October |
| Fresh herbs: parsley, chive | April to October |
| Fresh herbs: basil, mint, dill | May to September |

**Imported all year:** lemon, lime, orange and other citrus, banana, avocado, mango, pineapple, melon, kiwi, pomegranate, fig, date, grape, peach, nectarine, apricot, ginger, lemongrass, sweet potato.

Garlic counts as a stored UK crop, in season all year. This is the owner's decision; an earlier draft listed it as an import.

Generic words that `categorise` treats as produce ("salad", "herb", "berries") can be mapped to the nearest entry or left unrecognised; builder's choice.

## Non-goals

- Other countries, a country setting, or a Europe option. See `docs/ideas/multi-country.md`.
- Sending the list to a supermarket basket, or suggesting farm shops. Deferred by the owner.
- Scoring meat, fish, dairy or cupboard items, or where any ingredient was actually bought.
- Weighting by quantity.
- Letting a household edit the calendar or override an ingredient's classification.
- Filtering or hiding recipes by score.
- Scores for a future month when planning ahead in the Week screen.

## Anti-goals

- The feature must not hide recipes or make any recipe harder to find than it is today.
- It must not change the default experience: with Alphabetical selected, the Recipes screen looks and behaves as it does now.
- No warnings or negative wording on low-scoring recipes beyond the "Out of season" and "Imported" tags.
