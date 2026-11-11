# src/server: data access and writes (server-only)

Every file starts with `import "server-only"`. Only `server/` and `db/` touch the database.

**Layers:**
- `dal/`: read functions for Server Components. Example: `dal/settings.ts` exports `getSettings()`.
  - Each read uses `"use cache"` and `cacheTag("<name>")`, because `cacheComponents` requires it.
  - Reads never write and never call `updateTag`.
- `services/`: writes used by actions. Example: `services/settings.ts` exports `saveSettings(input)`, an upsert of row `id = 1`.
  - Multi-table writes run in a transaction (`db.transaction`).
  - Services enforce cross-table rules that the DB does not, such as treadmill-only sessions.
  - `services/foods.ts`: `createFood`, `updateFood`, `archiveFood`, `restoreFood`, `deleteFood` return `{ ok } | { ok: false, reason: "nameTaken" | "notFound" | "inUse" | "usedInComposite" }` (`usedInComposite` only from `deleteFood`). Names are unique among non-archived foods, ignoring case (D6, D9). `deleteFood` hard-deletes only an archived food that no diary entry references (`inUse` otherwise) and that is not an ingredient of a dish (`usedInComposite`, D5).
  - `services/foods.ts` dishes: `createCompositeFood` / `updateCompositeFood` return `{ ok, food } | { ok: false, reason: "nameTaken" | "notFound" | "componentUnavailable" | "componentCycle" | "finalWeightTooLow" }`. Both run in a transaction and compute per-100 g values with `compositeNutrition`. `updateFood` and `updateCompositeFood` call `recomputeDependents` in the same transaction, so every dish that uses the food is recalculated (D4). `updateFood` refuses dishes (`notFound`, D8). Food and dish writes replace all `food_portions` of the food (order = `sortOrder`). A dish ingredient given as a portion is resolved to grams plus a snapshot (`componentPortionUnavailable`, `componentGramsRange`).
  - `services/foods.ts` import: `importFoods(inputs)` inserts plain foods in one transaction, all or nothing. It returns `{ ok, count } | { ok: false, reason: "nameTaken", takenIndexes }` when a name is used by a non-archived food (ignoring case).
  - `dal/foods.ts`: `listFoods()` returns archived rows too. The UI filters them. `listFoodComponents()` returns every dish ingredient row (tag `foods`), ordered by `foodId`, `id`. `listFoodPortions()` returns every portion row (tag `foods`), ordered by `foodId`, `sortOrder`.
  - `dal/diary.ts`: `getDiaryDay(date)` returns the diary rows of one day ordered by `id` (tag `planner:<date>`). It does not join food names; the UI joins `foodId` against `listFoods()`, so renaming a food does not invalidate planner tags.
  - `dal/workouts.ts`: `getWorkoutDay(date)` returns the day's workouts by `id`, each with its treadmill session and sets ordered by `order` (tag `workouts:<date>`). `getDailySteps(date)` returns the day's steps row or null (same tag). `listExercises()` returns all exercises, archived included, by name (tag `exercises`).
  - `services/workouts.ts`: `createWorkout` / `updateWorkout` return `{ ok, workout, createdExercises } | { ok: false, reason: "notFound" | "exerciseUnavailable" }`. `deleteWorkout` returns `{ ok, date } | { ok: false, reason: "notFound" }`. Exercises are resolved before any write. Existing ids must be non-archived. New names reuse an exercise matching case-insensitively (even archived), otherwise they are inserted (D6). The type is fixed on update, so a type mismatch gives `notFound` (D8). The stored date is kept on update. Treadmill updates the session, and training replaces all sets. `saveDailySteps` upserts the one row per date (D7). `clearDailySteps` ignores a missing row.
  - `services/diary.ts`: `createDiaryEntry` / `updateDiaryEntry` return `{ ok, entry } | { ok: false, reason: "notFound" | "foodUnavailable" }`. `deleteDiaryEntry` returns `{ ok, date } | { ok: false, reason: "notFound" }`. Writes take the food's current per-100 g values and store a snapshot via `portionNutrition` (D3, D4). A missing or archived food gives `foodUnavailable`. On update, an archived food is accepted only when it is the entry's current food (D7). The stored date is kept on update. A portion unit is resolved to grams (`portionUnavailable`, `quantityRange`) and stored with the snapshot columns (`portionName`, `portionG`, `portionCount`).

**Cache tags:**
- `settings`: the singleton settings row.
- `foods`: the food list (`dal/foods.ts`).
- `planner:<YYYY-MM-DD>`: one diary day (`dal/diary.ts`).
- `workouts:<YYYY-MM-DD>`: one day's workouts and steps (`dal/workouts.ts`).
- `exercises`: the exercise list (`dal/workouts.ts`).
- Tag names are plain strings and match the DAL function they invalidate.

**Rules:**
- Actions call `updateTag(<tag>)` after a successful write, never before.
- Services take already-validated input (from `lib/validation`). They don't parse FormData.
- Return domain rows (`Settings`, etc.) typed from Drizzle `$inferSelect`. Do not hand-write types.
- Expected failures are not thrown from here. Actions turn them into `ActionResult`.
- Tests for `server/` run against a test DB (not in FIT-10).
