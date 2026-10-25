# Week Planner and Shop Quick Wins Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Week tab into a Monday–Sunday planner with history and drag-and-drop days, decouple meals from the shopping list, and ship five shop/recipe quick wins.

**Architecture:** Pure date and quantity logic lives in `src/lib/` with Vitest tests. Firestore writes stay in `src/data/shop.ts`; deletions return a snapshot that an Undo toast restores. The Week screen computes which meals belong to each day from the `plan` collection, so no rollover job exists.

**Tech Stack:** React 19, motion 14, Firebase 13 (Firestore), Vite 8, Vitest 5.

**Spec:** `docs/superpowers/specs/2026-10-25-week-planner-design.md`

## Global Constraints

- Weeks run Monday to Sunday in the device's local time zone. Days are stored as `YYYY-MM-DD` strings.
- Plan documents: `recipeId` (missing means the document id), `title`, `image`, `portions`, `itemIds`, `cooked`, `day: string | null`, `cookedAt: Timestamp | null`. No migration script.
- Shop item `contributions` are keyed by meal (plan document) id.
- A meal is "on the list" when `itemIds.length > 0`. At most one uncooked meal per recipe.
- Deleting a meal anywhere strips its contributions from items (deleting items left empty) and is undoable.
- Past weeks are read-only. Forward navigation is limited to 4 weeks ahead.
- Firestore rules unchanged.
- Match existing style: playful, motion-animated, emoji, big touch targets; comment density as in surrounding code.

## Review Focus

- Week maths across a DST change (last Sunday of March / October): `addDays` must not drift by an hour into the wrong date. Test in Task 1.
- Sunday belongs to the week that started the previous Monday. Test in Task 1.
- Quantity editing below the recipe amount gives a negative `manualQty` and a correct total; zero is the floor. Test in Task 1.
- Dragging a meal when the target day is offscreen: the page must auto-scroll while dragging. Manual check in Task 5.
- Adding a recipe again after its meal was cooked creates a second meal and doesn't merge into the cooked one's contributions. Covered by `openMealFor` test in Task 1.

---

### Task 1: Pure week and quantity logic

**Files:**
- Create: `src/lib/week.ts`, `src/lib/week.test.ts`
- Modify: `src/lib/list.ts`, `src/lib/list.test.ts`, `src/types.ts`

**Interfaces:**
- Produces (`src/types.ts`): `PlanEntry` gains `recipeId: string`, `day: string | null`, `cookedAt: Timestamp | null`.
- Produces (`src/lib/week.ts`):
  - `toISODate(d: Date): string`
  - `parseISODate(iso: string): Date` (local midnight)
  - `addDays(iso: string, n: number): string`
  - `weekStart(iso: string): string` (the Monday)
  - `weekDays(start: string): string[]` (7 dates)
  - `cookedDay(day: string | null, today: string): string` (day if set and not after today, else today)
  - `openMealFor(plan: PlanEntry[], recipeId: string): PlanEntry | undefined` (uncooked meal for that recipe)
  - `layoutWeek(plan: PlanEntry[], start: string, today: string): { tray: PlanEntry[] | null; days: { date: string; meals: PlanEntry[] }[] }`
    - past week (`start < weekStart(today)`): `tray: null`, days hold cooked meals only
    - current/future: days hold every meal with `day` in the week; tray holds uncooked meals with `day` null or before `weekStart(today)`
    - meals within a day sorted uncooked first, then title
- Produces (`src/lib/list.ts`): `manualQtyForTotal(item: ItemQuantities, total: number): number` returns `max(total, 0) - sum(numeric contributions)`; `qtyStep(unit: string | null): number` (50 for g/ml, else 1).

- [ ] **Step 1: Write failing tests** in `week.test.ts`: `weekStart('2026-10-25') === '2026-10-19'` (Sunday), `weekStart('2026-10-19') === '2026-10-19'`; `addDays('2026-10-24', 2) === '2026-10-26'` and `addDays('2026-03-28', 2) === '2026-03-30'` (DST); `weekDays('2026-10-19')` ends `'2026-10-25'`; `cookedDay(null, t) === t`, `cookedDay('2026-12-01', '2026-10-25') === '2026-10-25'`, `cookedDay('2026-10-20', '2026-10-25') === '2026-10-20'`; `openMealFor` ignores cooked meals; `layoutWeek` cases: past week hides uncooked and has null tray; current week tray includes a null-day meal and an uncooked meal dated last week, excludes a cooked meal dated last week; future week shows its dated meals plus the tray. In `list.test.ts`: `manualQtyForTotal({manual:false, manualQty:null, contributions:{a:200, b:null}}, 150) === -50`; total `-10` gives `-200`; `qtyStep('g') === 50`, `qtyStep(null) === 1`.
- [ ] **Step 2: Run** `npm test` — expect failures for missing exports.
- [ ] **Step 3: Implement.** Use `new Date(y, m - 1, d)` and `setDate` for date maths, never millisecond arithmetic.
- [ ] **Step 4: Run** `npm test && npm run typecheck` — tests pass (typecheck may fail on `PlanEntry` consumers; fixed in Task 2).
- [ ] **Step 5: Commit** `feat: week date and quantity helpers`.

### Task 2: Data layer

**Files:** Modify `src/data/shop.ts`.

**Interfaces:**
- Consumes: Task 1 types and helpers.
- Produces:
  - `usePlan` maps `recipeId: d.recipeId ?? d.id`, `day: d.day ?? null`, `cookedAt: d.cookedAt ?? null`.
  - `type Snapshot = { meals: { id: string; data: DocumentData }[]; items: { id: string; data: DocumentData }[] }`
  - `restoreSnapshot(hid: string, snap: Snapshot): Promise<void>` (batch `set`)
  - `addRecipeToShop(household, recipe, portions, ingredients, openMeal: PlanEntry | undefined): Promise<void>` — reuses `openMeal` (keeps its `day`, `cooked: false`) or creates an auto-id meal with `day: null`; `applyRecipe` keyed by meal id.
  - `deleteMeals(household: Household, meals: PlanEntry[]): Promise<Snapshot>` — one transaction: reads meals and their items, records them, strips contributions, deletes meals. Replaces `removeRecipeFromShop`.
  - `setMealDay(hid, id, day: string | null)`
  - `setCooked(hid, meal: PlanEntry, cooked: boolean, today: string)` — on cook sets `day: cookedDay(meal.day, today)` and `cookedAt: serverTimestamp()`; on uncook `cookedAt: null`.
  - `backfillCookedDays(hid, plan, today)` — sets `day: today` on cooked meals with `day === null`.
  - `deleteItems(hid, items: ShopItem[]): Promise<Snapshot>` — replaces `deleteItem`; `clearChecked` returns `Snapshot`.
  - `setItemTotal(hid, item: ShopItem, total: number)` — writes `manual: true`, `manualQty: manualQtyForTotal(item, total)`.
  - `clearAll(hid, items, plan)` deletes items and sets `itemIds: []` on every meal; meals kept.
- [ ] Implement, then `npm run typecheck` reports errors only in screens/App (fixed in Tasks 3–5). Commit `feat: meals outlive the shopping list`.

### Task 3: Toast undo and Shop screen

**Files:** Modify `src/components/Toast.tsx`, `src/screens/Shop.tsx`, `src/styles.css`.

**Interfaces:**
- Produces: `useToast()` returns `(message: string, action?: { label: string; onClick: () => void }) => void`. With an action the toast stays 5s and shows a button.
- Shop: "Meals this shop" lists meals with `itemIds.length > 0`. ✕ calls `deleteMeals`, toast "Removed X" + Undo → `restoreSnapshot`. "Remove from list" and "Clear ticked" likewise. "For:" resolves contribution keys via plan entry title, then recipe title. Item sheet gets a −/+ stepper (step `qtyStep(item.unit)`, floor 0) showing `formatQty` and calling `setItemTotal`.
- [ ] Implement, commit `feat: undo and quantity editing on the shop`.

### Task 4: Recipe page and add-to-shop

**Files:** Modify `src/App.tsx`, `src/screens/RecipeDetail.tsx`, `src/screens/AddToShopSheet.tsx`, `src/screens/Recipes.tsx`.

- Route `{ name: 'recipe'; id: string; fromWeek?: boolean }`; Week opens recipes with `fromWeek: true`.
- `planEntry` in App = `openMealFor(plan, recipe.id)`; `onConfirm` passes it to `addRecipeToShop`. Recipe delete: `deleteMeals` on the open meal only.
- AddToShopSheet: `setPortions(planEntry?.portions ?? recipe.servings ?? 4)`.
- RecipeDetail: wake lock while `tab === 'steps'` (request on enter and on `visibilitychange` to visible; release on leave/unmount; no-op without `navigator.wakeLock`). "In shop" chip when the open meal is linked. CTA: if `fromWeek` and open meal → "🍳 Cooked!" (calls `setCooked`, confetti, toast, back); else "Add to shop" / "Update in shop" (linked). A secondary "Remove from shop" when the open meal is linked → `deleteMeals` + Undo.
- Recipes tab "In shop" set = recipe ids of linked uncooked meals.
- [ ] Implement, `npm run typecheck`, commit `feat: cooked button, wake lock and remove from shop on recipes`.

### Task 5: Week screen

**Files:** Modify `src/screens/Week.tsx`, `src/styles.css`. Create `src/components/useMealDrag.ts`.

**Interfaces:**
- `useMealDrag(onDrop: (mealId: string, target: string | null) => void)` — custom pointer drag from a handle: `setPointerCapture`, a fixed-position ghost following the pointer, drop zones found by `document.elementsFromPoint` on `[data-drop]` (value is a date or `"tray"`), hovered zone exposed for highlighting, auto-scroll within 90px of viewport top/bottom. Returns `{ dragging: string | null; over: string | null; ghost: {x, y} | null; start(e, mealId) }`.
- Week: header with ‹ week label › (back unlimited, forward to `weekStart(today) + 28 days`), "This week"/"Next week"/date range. Progress bar for the viewed week. Tray section (when `tray !== null`). Seven day sections ("Mon 20", today highlighted, empty → "Nothing planned"). Meal card: pic and title open the recipe (`fromWeek`), 🍳 toggle, ⠿ handle (current/future), swipe-left to delete via motion `drag="x"` started from the card body with `dragControls`, threshold −100px offset or −500 velocity → `deleteMeals` + Undo. "Clear week" button (current/future, only when uncooked meals exist) → confirm, `deleteMeals` on uncooked meals in the days (plus tray on the current week), Undo. Calls `backfillCookedDays` once per load when needed.
- [ ] Implement, `npm test && npm run typecheck && npm run build`, check in the browser at phone width, commit `feat: Monday to Sunday week planner with drag and drop`.

### Task 6: README

- [ ] Update the Week and Merging bullets in `README.md`. Commit `docs: describe the week planner`.
