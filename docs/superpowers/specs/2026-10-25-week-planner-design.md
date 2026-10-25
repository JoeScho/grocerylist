# Week planner, history and shop quick wins

Date: 2026-10-25

## Why

Today the Week tab is a flat list of whatever is in the current shop, and "Start new shop" wipes it. The household shops at the weekend or early in the week and wants to decide which day each meal gets cooked, leave some days empty (takeaway, eating out), and look back at what they ate in earlier weeks. Alongside that, five small fixes from a review of the app.

## Part A: quick wins

1. **Default portions.** `AddToShopSheet` opens at 4 portions. It should open at the existing meal's portions, else the recipe's `servings`, else 4.
2. **Screen stays on while cooking.** While the Steps tab of a recipe is open, hold a screen wake lock (`navigator.wakeLock.request('screen')`). Release it when leaving the tab or the page. Re-acquire when the page becomes visible again (the browser drops the lock when the app is backgrounded). Do nothing where the API is missing.
3. **Undo.** The toast gains an optional action button ("Undo"). Use it on: removing a meal from the shop, removing an item from the list, "Clear ticked", and the new "Clear week" (Part B). Undo restores the documents as they were just before the action. Restoring by overwriting is acceptable; we don't need to merge with edits a partner made in the few seconds in between. "Start new shop" keeps its confirm dialog and gets no undo.
4. **Change an item's quantity.** The item options sheet on Shop gets a quantity control. The user sets the total they want to buy. Store the difference from the recipe contributions in `manualQty` (and set `manual: true`) so the existing `totalQty` sum still works and recipe changes still adjust the line. The total can't go below zero. Items with no number (e.g. "salt") can be given one.
5. **Remove from shop on the recipe page.** When the recipe has an uncooked meal whose ingredients are on the list, the recipe page offers "Remove from shop" next to the main button (with undo, as in 3). It does the same as the ✕ on Shop: see "Meals and the list" in Part B.

## Part B: Week planner

### Behaviour the user decided

- Adding a recipe to the shop creates a **meal**. The meal stays in the plan, across weeks, until it is ticked as cooked. The shopping list and the meals are independent: "Start new shop" clears the list only and no longer deletes meals.
- The Week page shows one **Monday to Sunday** week as seven day sections.
- Meals without a day sit in an **"Unplanned"** tray at the top. The user picks a day for each meal on the Week page. Days can be left empty.
- A day can hold **more than one meal**.
- **Earlier weeks are viewable**, Monday to Sunday, by stepping back from the current week.
- A **"Clear week"** button on the Week page deletes the week's **uncooked** meals. Cooked meals stay as history. Re-adding a recipe is easy, so deleting is fine.
- **Swipe to delete** a meal on the Week page.
- **Meals and the list.** "Start new shop" unlinks meals from the list: they stay planned on the Week page, but the "In shop" chips and the "Meals this shop" row on Shop only show meals whose ingredients are on the current list. Removing a meal from the shop (the ✕ on Shop, "Remove from shop" on the recipe page) takes its ingredients off the list **and** deletes the meal from the week.
- Opening a recipe **from the Week page** makes the main button "Cooked!" instead of "Update in shop". Opened from anywhere else, the recipe page behaves as now.

### Rules I've proposed (playback, not corrected by the user)

- When a week ends, meals that were given a day in it but weren't cooked go back to Unplanned for the current week. Nothing is lost.
- Past weeks show what was cooked on each day and are read-only (no swipe, no clear, no day picker).

### My calls

- **Data model.** Keep the `plan` collection. Each document is a meal: `recipeId`, `title`, `image`, `portions`, `itemIds`, `cooked`, plus new `day` (ISO date string `YYYY-MM-DD` or `null`) and `cookedAt` (timestamp or null). Existing documents use the recipe id as document id and have no `recipeId` field; treat a missing `recipeId` as the document id, so no migration script is needed.
- **One open meal per recipe.** Adding a recipe that already has an uncooked meal updates that meal (same as "Update in shop" today). Adding a recipe whose only meals are cooked creates a new meal document with an auto id. This is what lets the same recipe appear in more than one week of history.
- **Shop contributions are keyed by meal id**, not recipe id. For existing data the two are the same, so nothing changes for it. The "For:" line in the item sheet and the meal chips on Shop look up the meal, then its recipe.
- **"Unplanned" is computed, not stored.** The tray shows uncooked meals whose `day` is null or before the current week's Monday. No background job or rollover write. The tray shows on the current week and on future weeks (so a weekend shop can be planned into next week); the day picker offers the days of whichever week is being viewed.
- **Link to the list.** A meal is "on the list" when its `itemIds` is non-empty. "Start new shop" deletes all items and sets `itemIds: []` on every meal in the same batch. Adding a recipe that has an uncooked meal re-links that meal (fills `itemIds` again) and keeps its day.
- **Deleting a meal always takes its ingredients off the list.** Swipe to delete, Clear week and Remove from shop all go through the same path as `removeRecipeFromShop` today (strip the meal's contributions, delete items left with nothing on them, delete the meal). For unlinked meals there is nothing to strip. This avoids orphaned contributions that would double-count if the recipe is added again. Undo restores both the meals and the items.
- **Old cooked meals.** Meals already ticked cooked before this change have no `day`. When the Week page loads, give any cooked meal without a `day` today's date (a one-off write per meal), so they appear in this week's history.
- **Ticking cooked.** Ticking a meal cooked sets `cooked: true` and `cookedAt`. If it had no day, or its day is in the future, its `day` becomes today, so it lands in the right week of history. Unticking clears `cookedAt` and keeps the day.
- **Which meals a week shows.** Current and future weeks: meals whose `day` falls in that week, cooked or not. Past weeks: only cooked meals whose `day` falls in that week.
- **Looking ahead.** The user can step forward to future weeks too, so a weekend shop can be planned into the coming Monday to Sunday. Stepping forward is limited to a few weeks (builder's choice, around 4).
- **Choosing a day (user's decision: drag and drop is the main way).** Each meal card on the current or a future week has a drag handle. Dragging by the handle moves the card freely; dropping it on a day section sets that day, dropping it on the Unplanned tray sets `day: null`. The target day highlights while hovering. Horizontal swipe on the card body (not the handle) is swipe to delete, so the two gestures don't collide. Tapping the card still opens the recipe. Must work with touch on iOS Safari and Android Chrome without the page scrolling under the finger mid-drag.
- **Cooked toggle on the Week page** stays as now (the 🍳 button) on each meal, alongside the new "Cooked!" CTA on the recipe page.
- **"Cooked!" on the recipe page** marks the open uncooked meal for that recipe as cooked, shows the existing confetti/toast, and goes back to the Week page. The route carries a `from: 'week'` flag to decide this.
- **Clear week** deletes the uncooked meals on the days of the week being viewed (current or future weeks), plus the Unplanned tray when viewing the current week. On a future week the tray is left alone. It asks for confirmation, then offers Undo.
- **Swipe to delete** is a horizontal drag on a meal card (current and future weeks, tray included), with Undo. No confirmation.
- **Bottom nav badge** on Week keeps counting uncooked meals.
- **Deleting a recipe** removes its uncooked meal from the shop as today, and leaves its cooked meals in history (they carry their own title and image).
- **Loading.** One listener on the whole `plan` collection, as now. A household adds a few hundred meals a year, which is fine to load in full. Revisit with a date-range query if it ever matters.
- **Week maths** uses the device's local time zone and treats Monday as the first day.

## Non-goals

- Breakfast / lunch / dinner slots within a day.
- Marking a day as "takeaway" or "eating out"; an empty day is enough.
- Sharing the shopping list as text (deferred).
- Moving meals between weeks by dragging (the tray shows on every current/future week, so a meal can be dropped into any of them from there).

## Left to the builder

Visual layout of the day sections, tray and drag handle, wording of empty states, the quantity control's step sizes per unit, how far forward weeks can go, and where the Undo and "Remove from shop" buttons sit. Match the existing style: playful, motion-animated, emoji, big touch targets. Add unit tests for the week date maths and the quantity difference logic in the style of the existing `src/lib/*.test.ts` files. Firestore rules need no change since `plan` is already allowed.
