# src/db/schema: table definitions

Drizzle table definitions for PostgreSQL. Data model: `CLAUDE_ARCHITECTURE.md` ("Data model").

**Files:**
- `enums.ts`: `sex`, `activity_level`, `meal`, `workout_type` (pgEnum).
- `shared.ts`: `timestamps` helper (`createdAt`, `updatedAt` with `$onUpdate`).
- `settings.ts`: singleton row (`id = 1`) with personal data and goals.
- `foods.ts`: food library, nutrition per 100 g, `archivedAt`, `isComposite`, `finalWeightG`, `food_portions` (named portion sizes: `foodId` cascade, `name` unique per food ignoring case, `grams`, `sortOrder`), and `food_components` (dish ingredients: `foodId` cascade, `componentFoodId` restrict, `quantityG`, unique pair, plus the `portionName`/`portionG`/`portionCount` snapshot).
- `diary.ts`: `diary_entries` with nutrition snapshots, the same `portionName`/`portionG`/`portionCount` snapshot, and a `(date, meal)` index.
- `workouts.ts`: `workouts`, `treadmill_sessions` (no distance: it is computed), `exercises`, `workout_sets`, `daily_steps` (one row per date, `steps`, `kcal`).
- `index.ts`: re-exports every file and defines all `relations()`.

**Rules:**
- Relative imports only. drizzle-kit loads these files directly, so no `@/` alias and no `server-only`.
- TS names are camelCase. Column names in SQL are snake_case, from `casing`.
- Every table has an integer identity `id` (except `settings`) and `...timestamps`.
- Nutrition and measurement columns are `numeric` with `mode: "number"`.
- Foods and exercises are archived (`archivedAt`). An archived food may be hard-deleted only when no diary entry references it (FK `restrict`).
- Diary entries store kcal and macro snapshots, computed when the entry is written.
- Portion snapshots (`portionName`, `portionG`, `portionCount`) are all set or all null; null means grams. They have no FK, so editing or deleting a portion never changes history.
- A dish is a `foods` row with `isComposite = true`. Its stored per-100 g values are computed from `food_components` by the service (`lib/composite.ts`) and recalculated when an ingredient changes. A food used as an ingredient cannot be hard-deleted (FK `restrict`). Cycles are prevented in the service.
- Treadmill and training rules (which workout type has a session or sets) are enforced in services, not the DB.

**Changing the schema:** edit the file → `npm run db:generate` → review the SQL in `src/db/migrations/` → `npm run db:migrate` → update `src/db/seed.ts` if needed → `npm run db:seed`.
