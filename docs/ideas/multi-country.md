# Idea: support households outside the UK

Status: not started. Written on 2026-11-11 as a handover note for whoever picks this up, human or AI. It records what the owner said they wanted, what was deliberately left out, and where the code assumes Britain today. It is a starting point for a design conversation, and nothing here has been approved as a spec.

## Background

The app is being given a seasonality feature: recipes can be ordered by how much of their fresh produce is in season, with a bar across each recipe image showing the score. The first version is for the UK only. Its design is (or will be) in `docs/superpowers/specs/`; read that first, because this idea extends it.

The owner's longer-term aim is to offer the app to households in other countries, starting from the UK. They chose to defer that so the first version stays small.

## What the owner asked for

These came from the owner directly:

- A setting for which country the household is in.
- Seasonality should follow that country, so a recipe's score reflects what is being harvested there in the current month.
- A choice of how wide "in season" reaches: the household's own country, or its continent. With the UK selected in November, "country" counts leeks and squash, and "continent" also counts Spanish citrus.
- The purpose is to help people pick more sustainable recipes.

A third "global" reach was considered and dropped. Almost everything is in season somewhere in the world in any month, so every recipe would score full and the ordering would carry no information.

## What already works

Multiple households need no new work. Every person who signs in gets a household (`src/data/household.ts`), can invite others by email, and Firestore rules (`firestore.rules`) keep each household's recipes, list and plan private to its members.

## Where the code assumes Britain

- `src/lib/localise.ts` rewrites every imported recipe into British ingredient names (aubergine, courgette, prawns) and metric units. It is called from `src/screens/AddRecipeSheet.tsx`. A household in the US would want the reverse or nothing at all.
- The same file strips coriander from imported recipes. That is the owner's personal taste and has nothing to do with country. It should become a household preference before anyone else uses the app.
- `src/lib/categories.ts` orders shop list categories "roughly the way a UK supermarket is laid out" and matches ingredients by British keywords.
- `src/lib/ingredients.ts` normalises ingredient names in English only.
- Dates and sorting use the `en-GB` locale in `src/screens/Week.tsx` and `src/screens/Recipes.tsx`.
- The UK seasonality feature will ship with one built-in UK produce calendar.

## Suggested shape

These are suggestions from the AI that wrote this note. The owner has not agreed to them.

1. Add `country` to the `Household` document, defaulting to the UK for existing households, with a picker in Settings. Add the country-or-continent choice next to it.
2. Store season calendars as data keyed by country: for each produce item, the months it is harvested. The continent reach is then the union of the calendars for that continent's countries, so no separate continent data is needed.
3. Keep one canonical name per produce item and map local names onto it (courgette and zucchini are the same item). The seasonality matcher and `localise.ts` both need this mapping, so build it once.
4. Make the import tidy-up follow the household's country: target dialect and unit system become parameters of `localiseRecipe`. Move coriander removal to a per-household list of ingredients to strip.
5. Make shop category order a per-country list, falling back to the UK order.
6. Add countries one at a time. Each needs a calendar, a dialect decision and a category order.

## Open questions for the owner

- Which countries come first after the UK?
- Where does the season data come from, and who checks it? Large countries (the US, Australia) have regions with different seasons, so "country" may be too coarse there. Southern hemisphere seasons are offset by six months.
- Is the interface itself translated, or does it stay in English with only ingredient names and units adapting?
- Should produce that a country never grows count against a recipe's score? The same question is being settled for the UK version; reuse that answer.
- Does opening the app to the public change sign-in, costs (the recipe import runs in a Cloud Function), or data protection obligations?

## Related idea, also deferred

The owner also wants the shop list to be sent to a supermarket basket, or for the app to suggest nearby farm shops likely to stock the items. That work depends on which supermarkets operate in a household's country, so the country setting described here is a prerequisite for doing it beyond the UK.
