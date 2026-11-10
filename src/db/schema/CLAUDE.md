# src/db/schema: table definitions

Drizzle table definitions for PostgreSQL. Data model: `CLAUDE_ARCHITECTURE.md` ("Data model").

**Files:**
- `enums.ts`: `sex`, `activity_level`, `meal`, `workout_type` (pgEnum).
- `shared.ts`: `timestamps` helper (`createdAt`, `updatedAt` with `$onUpdate`).
- `settings.ts`: singleton row (`id = 1`) with personal data and goals.
- `foods.ts`: food library, nutrition per 100 g, `archivedAt`.
- `diary.ts`: `diary_entries` with nutrition snapshots and a `(date, meal)` index.
- `workouts.ts`: `workouts`, `treadmill_sessions`, `exercises`, `workout_sets`.
- `index.ts`: re-exports every file and defines all `relations()`.

**Rules:**
- Relative imports only. drizzle-kit loads these files directly, so no `@/` alias and no `server-only`.
- TS names are camelCase. Column names in SQL are snake_case, from `casing`.
- Every table has an integer identity `id` (except `settings`) and `...timestamps`.
- Nutrition and measurement columns are `numeric` with `mode: "number"`.
- Foods and exercises are archived (`archivedAt`), never deleted.
- Diary entries store kcal and macro snapshots, computed when the entry is written.
- Treadmill and training rules (which workout type has a session or sets) are enforced in services, not the DB.

**Changing the schema:** edit the file → `npm run db:generate` → review the SQL in `src/db/migrations/` → `npm run db:migrate` → update `src/db/seed.ts` if needed → `npm run db:seed`.
