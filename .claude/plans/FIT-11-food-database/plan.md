# Food Database View (CRUD for Foods and Nutritional Values)
**Linear:** FIT-11

## Task Description
Build the `/foods` view, where the user adds, edits and removes foods with their nutrition values per 100 g (kcal, protein, carbs, fat). Removing archives the food, so past diary days stay intact, and archived foods can be shown and restored. Writes go through validated Server Actions, and the list is searchable on the client.

## Design Decisions
- **D1:** Only plain foods are in scope. Composite foods (built from other foods) get their own Linear issue later.
- **D2:** Remove always archives (sets `archivedAt`). Foods are never hard-deleted.
- **D3:** Archived foods are hidden by default. A "show removed foods" toggle shows them, with a Restore action on each archived row.
- **D4:** Layout: a table (name, kcal, protein, carbs, fat per 100 g), a search box and an "Add food" button. Add and Edit share one dialog form, and Remove asks for confirmation in a dialog.
- **D5:** Search filters by name on the client, ignoring case and diacritics ("jablko" finds "Jabłko"). The list is sorted by name with Polish collation and has no pagination.
- **D6:** Validation: name trimmed, 1–100 chars, unique among non-archived foods ignoring case (checked in the service, error code `nameTaken`). kcal 0–900, protein/carbs/fat 0–100 g each and protein + carbs + fat ≤ 100 g. Values are rounded to 1 decimal, and a comma or a dot works as the decimal separator.
- **D7:** Editing a food only changes the `foods` row. Past diary entries keep their snapshot values, and the edit dialog shows a hint saying so.
- **D8:** The dialog shows a live "≈ X kcal from macros" hint (4·protein + 4·carbs + 9·fat) with a "Use" button that copies it into kcal. It is not enforced.
- **D9:** Restoring a food is refused with a `nameTaken` toast when a non-archived food already has the same name.

## Implementation Progress
| # | Subtask | File | Status |
|---|---|---|---|
| 1 | Pure logic: food validation, kcal from macros, search normalization (with tests) | [subtask-1.md](subtask-1.md) | Done |
| 2 | Server side: foods DAL, services and Server Actions | [subtask-2.md](subtask-2.md) | Done |
| 3 | PL/EN message keys and the add/edit food dialog | [subtask-3.md](subtask-3.md) | Done |
| 4 | Foods list view, archive confirm dialog and the `/foods` page | [subtask-4.md](subtask-4.md) | Done |
| 5 | Documentation (navigators, architecture doc) | [subtask-5.md](subtask-5.md) | Done |

## Change Log
<!-- Filled by /plan-realize: one bullet per finished subtask, "- <n>. <change>". Used to build commit-message.txt after the last subtask. -->
- 1. Add shared `parseDecimal` (`src/lib/numbers.ts`), `normalizeForSearch`/`matchesQuery` (`src/lib/search.ts`), `kcalFromMacros`, and `parseFoodForm`/`parseFoodId` (`src/lib/validation/foods.ts`), with Vitest cases; profile validator now imports `parseDecimal`.
- 2. Add foods DAL `listFoods` (`src/server/dal/foods.ts`), foods services `createFood`/`updateFood`/`archiveFood`/`restoreFood` with name-uniqueness checks in transactions (`src/server/services/foods.ts`), and Server Actions `saveFood`/`archiveFoodAction`/`restoreFoodAction` (`src/features/foods/actions.ts`).
- 3. Add `foods` message keys to `en.json` and `pl.json`, and the add/edit `FoodFormDialog` (`src/features/foods/components/FoodFormDialog.tsx`) with live kcal-from-macros hint and inline validation errors.
- 4. Add `/foods` list view: `FoodsSection` (server, reads `listFoods`), `FoodsView` (client search, show-removed toggle, sorted with Polish collator), `FoodsTable` (kcal and macros per 100 g, Edit/Remove or Restore), `ArchiveFoodDialog` (confirm archive), and replace the `/foods` placeholder page.
- 5. Update navigator docs (`src/features/CLAUDE.md`, `src/server/CLAUDE.md`, `src/lib/CLAUDE.md`, `src/app/CLAUDE.md`) and `CLAUDE_ARCHITECTURE.md` for the foods view, its DAL/services, cache tag `foods`, and the new lib files.
