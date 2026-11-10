# Support Composite Foods Built from Other Foods
**Linear:** FIT-12

## Task Description
Let the user build a food ("dish") out of other foods, e.g. Curry z ryżem from Sos curry and Ryż gotowany, with ingredient grams and an optional final cooked weight. The dish is stored as a regular `foods` row with computed per-100 g values, so the planner and diary can use it like any food. When an ingredient changes, every dish that uses it is recalculated automatically.

## Design Decisions
- **D1:** A dish is a `foods` row with `isComposite = true` and stored per-100 g values. A new `food_components` table (`foodId`, `componentFoodId`, `quantityG`) holds its ingredients.
- **D2:** The per-100 g values are computed from the total weight. By default that is the sum of ingredient grams, but the user may enter an optional final cooked weight (`finalWeightG`) instead.
- **D3:** Dishes may contain other dishes. The service rejects cycles (A contains B, and B contains A), including a dish containing itself.
- **D4:** Editing an ingredient (or a dish) recalculates the stored values of every dish that uses it, transitively and in the same transaction. Diary snapshots are never touched.
- **D5:** Archiving a food that is an ingredient is allowed, and the dish keeps it and its values. Archived foods cannot be added as new ingredients. A food that is an ingredient cannot be permanently deleted (`foodInComposite`).
- **D6:** A separate "Add dish" button and dialog: name, ingredient rows (search to add a food, grams, remove), optional final weight, and a live per-100 g preview.
- **D7:** In the foods table, dishes get a "Dish" badge, and clicking a dish's name expands rows that list its ingredients and grams.
- **D8:** The type is fixed at creation. A plain food never becomes a dish and a dish never becomes a plain food.
- **D9:** Limits: 1–30 ingredients, each 0.1–5000 g (1 decimal), no food twice in one dish. The final weight is optional, 1–20000 g, and is refused (`finalWeightTooLow`) when protein + carbs + fat would exceed 100 g per 100 g.
- **D10:** The dev seed adds the dish "Curry z ryżem" (Sos curry 150 g + Ryż gotowany 200 g).

## Implementation Progress
| # | Subtask | File | Status |
|---|---|---|---|
| 1 | Pure logic: dish nutrition, cycle check, recompute order, dish form validation (with tests) | [subtask-1.md](subtask-1.md) | Done |
| 2 | Schema: `isComposite`, `finalWeightG`, `food_components`, migration and seed | [subtask-2.md](subtask-2.md) | Done |
| 3 | Server side: DAL, dish services with recalculation, Server Actions | [subtask-3.md](subtask-3.md) | Done |
| 4 | PL/EN message keys and the dish dialog | [subtask-4.md](subtask-4.md) | Done |
| 5 | Foods view and table integration, docs | [subtask-5.md](subtask-5.md) | Done |

## Change Log
<!-- Filled by /plan-realize: one bullet per finished subtask, "- <n>. <change>". Used to build commit-message.txt after the last subtask. -->
- 1. Add pure composite helpers (`compositeNutrition`, `totalQuantity`, `wouldCreateCycle`, `dependentsInOrder`) and `parseCompositeFoodForm` with Vitest cases, and list them in `src/lib/CLAUDE.md`
- 2. Add `isComposite` and `finalWeightG` columns to `foods`, the `food_components` table with its relations, migration `0001_cheerful_warpath.sql`, and the dish "Curry z ryżem" seed with checks
- 3. Add `createCompositeFood` and `updateCompositeFood` with transactional recalculation of dependent dishes (`recomputeDependents`), guard `updateFood` against dishes, block deleting ingredients (`usedInComposite`), add `listFoodComponents`, `saveCompositeFood` action, and the `foodInComposite` message keys
- 4. Add `foods.composite`, `actions.addComposite`/`removeComponent`/`showComponents`/`hideComponents`, `compositeBadge`, `toast.dishCreated`/`dishUpdated` and the dish error keys to PL/EN, and create `CompositeFoodDialog` (name, ingredient search and rows, optional final weight, live per-100 g preview)
- 5. Load `listFoodComponents` in `FoodsSection`, add the "Add dish" button and `CompositeFoodDialog` to `FoodsView` (dishes open the dish dialog), show a "Dish" badge and expandable ingredient rows in `FoodsTable`, report `foodInComposite` in `ConfirmFoodDialog`, and document composite foods in `CLAUDE_ARCHITECTURE.md` and `src/features/CLAUDE.md`
