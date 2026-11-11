# Portion Sizes
**Linear:** FIT-16

## Task Description
Foods and dishes get named portion sizes defined in grams (e.g. "Tablespoon" = 15 g, a dish's "Portion" = 350 g), so the user does not have to remember weights. When adding a food to the planner or an ingredient to a dish, the user picks grams or one of the food's portions and types an amount; grams are computed from that. The chosen portion is stored as a snapshot next to the grams, so lists can show "2 × Tablespoon (30 g)".

## Design Decisions
- **D1:** Portions live in a new table `food_portions` (`foodId` FK cascade, `name`, `grams`, `sortOrder`), with names unique per food ignoring case.
- **D2:** Dishes use the same portion editor as plain foods. A new dish starts with one row named "Portion" in the current UI language ("Porcja" / "Portion"), stored as plain text and editable or removable.
- **D3:** The dish's default "Portion" row starts with empty grams (no prefill from the final weight). If it is left empty, no portion is saved.
- **D4:** A planner entry keeps `quantityG` (used for the kcal snapshot) and also stores snapshot columns `portionName`, `portionG`, `portionCount` (nullable, no FK), so later edits to portions don't change past days.
- **D5:** `food_components` gets the same three snapshot columns, so a dish ingredient remembers the unit it was entered in.
- **D6:** Limits: at most 10 portions per food, name 1–30 chars (unique per food, ignoring case), grams 0.1–5000, count 0.1–100 (decimals allowed), and the resulting grams must stay within 0.1–5000.
- **D7:** When a food is picked (planner or dish ingredient), the unit defaults to its first portion with amount 1, or to grams when it has none. Editing reopens the unit that was saved.
- **D8:** Portions are edited only inside the existing food and dish dialogs (a "Portions" section with name + grams rows). No new view.
- **D9:** The foods table shows a food's portions as a muted line under its name ("Łyżka 15 g · Łyżeczka 5 g"). The planner table and the dish ingredient rows show "2 × Łyżka (30 g)".
- **D10:** JSON import and the `food-json` skill stay grams-only (out of scope).
- **D11:** Grams ("g") is always offered in the unit selector, next to the food's portions.
- **D12:** A portion row with only a name or only grams is a validation error on that row. Fully empty rows are dropped silently.
- **D13:** With a portion unit selected, the user types a count, and the computed grams are shown read-only next to it (e.g. "= 30 g").
- **D14:** Existing diary entries and dish ingredients keep null snapshots and display as grams. Existing dishes get no automatic "Portion" row.
- **D15:** Grams = count × portion grams, rounded to 0.1 g.

## Implementation Progress
| # | Subtask | File | Status |
|---|---|---|---|
| 1 | Schema, migration, DAL read, docs | [subtask-1.md](subtask-1.md) | Done |
| 2 | Pure portion helpers, portion validator, shared amount input | [subtask-2.md](subtask-2.md) | Done |
| 3 | Foods backend: validators, service, actions | [subtask-3.md](subtask-3.md) | Done |
| 4 | Planner: portion units end to end | [subtask-4.md](subtask-4.md) | Done |
| 5 | Foods UI: portion editor, dish ingredient units, foods table, docs | [subtask-5.md](subtask-5.md) | Done |

## Change Log
- 1. Add `food_portions` table, portion snapshot columns and checks on `food_components` and `diary_entries`, migration 0003, `listFoodPortions()` read, and docs
- 2. Add portion helpers (`lib/portions.ts`), the portion row validator (`lib/validation/portions.ts`) with tests, and the shared `PortionAmountInput` component, plus docs
- 3. Save food and dish portions with snapshot-aware dish ingredients (`parseFoodForm`/`parseCompositeFoodForm` read portion rows and units, `createFood`/`updateFood`/`createCompositeFood`/`updateCompositeFood` replace portions and store ingredient snapshots, new `foods.errors.*` messages in en and pl)
- 4. Add portion units to planner entries: `diary.ts` validator reads `portionId`/`amount`, services resolve portion snapshots in a transaction, `EntryFormDialog` uses `PortionAmountInput` with computed grams, entries table shows "count × name (g)", planner messages in en and pl (`fields.quantityG` removed)
- 5. Add the foods "Portions" editor (`PortionsEditor`) to the food and dish dialogs, ingredient unit picker (`PortionAmountInput`) in the dish dialog, portion list under food names and "count × name (g)" ingredient rows in the foods table, `foods.portions.*` / `portionOption` / `computedGrams` / `portionQuantity` / `fields.unit` messages in en and pl, and feature and server docs
