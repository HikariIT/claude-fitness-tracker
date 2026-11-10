# 1. Drizzle schema files and client wiring
**Decisions:** D1, D2, D3, D4, D5, D6, D7, D8, D11

Goal: write the full Drizzle schema in `src/db/schema/` and pass it to the Drizzle client so `db.query.*.findMany({ with })` works. No migrations, seed, drizzle-zod or tests here (D11).

Installed: `drizzle-orm` 0.45.4 (classic `relations()` API, D8), `pg` 8.23.1. `tsconfig.json` maps `@/*` to `./src/*`.

## Conventions (all files)
- Import from `drizzle-orm/pg-core` and `drizzle-orm`.
- Use **relative imports** between schema files (`./enums`, `./shared`), never `@/`, because drizzle-kit loads these files (subtask 2) and may not resolve the alias.
- Schema files must NOT import `server-only` or `@/db/client`.
- Column names are written in camelCase in TS with no explicit DB names. snake_case comes from `casing: "snake_case"` on `drizzle()` (this subtask) and in `drizzle.config.ts` (subtask 2).
- Primary key on every table (D7): `id: integer().primaryKey().generatedAlwaysAsIdentity()`. Exception: `settings.id` (see below).
- Nutrition values: `numeric({ precision: 7, scale: 2, mode: "number" })` (D3).
- Table and enum DB names are snake_case strings: `pgTable("diary_entries", ...)`, `pgEnum("meal", [...])`.
- Constraints and indexes use the third `pgTable` argument returning an array: `(t) => [index(...).on(...), check("name", sql`...`)]`.

## Files

### `src/db/schema/shared.ts`
```ts
import { timestamp } from "drizzle-orm/pg-core";

export const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};
```
Spread `...timestamps` into every table (D7).

### `src/db/schema/enums.ts`
```ts
export const sexEnum = pgEnum("sex", ["male", "female"]);
export const activityLevelEnum = pgEnum("activity_level", ["sedentary", "light", "moderate", "active", "very_active"]);
export const mealEnum = pgEnum("meal", ["breakfast", "lunch", "dinner", "snack", "other"]);
export const workoutTypeEnum = pgEnum("workout_type", ["treadmill", "training"]);
```

### `src/db/schema/settings.ts` (D2)
Table `settings`, single row:
- `id: integer().primaryKey().default(1)` (NOT identity), plus `check("settings_singleton", sql\`${t.id} = 1\`)`
- `sex: sexEnum().notNull()`
- `birthDate: date({ mode: "string" }).notNull()`
- `heightCm: numeric({ precision: 5, scale: 1, mode: "number" }).notNull()`
- `weightKg: numeric({ precision: 5, scale: 1, mode: "number" }).notNull()`
- `activityLevel: activityLevelEnum().notNull()`
- `kcalGoal: integer().notNull()`
- `proteinGoalG: integer()` (nullable). There are no carbs or fat goals.
- `...timestamps`

### `src/db/schema/foods.ts` (D1, D3)
Table `foods`, all nutrition per 100 g:
- `id`, `name: text().notNull()`
- `kcal`, `proteinG`, `carbsG`, `fatG`: `numeric(7,2, mode number).notNull()`
- `archivedAt: timestamp({ withTimezone: true })` (nullable)
- `...timestamps`
- Checks: `foods_nutrition_non_negative` (all four `>= 0`).
- No `basis`, `brand`, `servingSizeG`. No `food_components` table (D1).

### `src/db/schema/diary.ts` (D4)
Table `diary_entries`:
- `id`, `date: date({ mode: "string" }).notNull()`, `meal: mealEnum().notNull()`
- `foodId: integer().notNull().references(() => foods.id, { onDelete: "restrict" })`
- `quantityG: numeric(7,2, mode number).notNull()`
- Snapshot columns (values for the eaten quantity, computed at insert time so later food edits don't change past days): `kcal`, `proteinG`, `carbsG`, `fatG`, all `numeric(7,2, mode number).notNull()`
- `...timestamps`
- `index("diary_entries_date_meal_idx").on(t.date, t.meal)`, `check("diary_entries_quantity_positive", sql\`${t.quantityG} > 0\`)`

### `src/db/schema/workouts.ts` (D5, D6)
- `workouts`: `id`, `type: workoutTypeEnum().notNull()`, `date: date({ mode: "string" }).notNull()`, `name: text()`, `notes: text()`, `kcalBurned: integer()` (all three nullable), `...timestamps`, `index("workouts_date_idx").on(t.date)`.
- `treadmill_sessions` (1:1 with `workouts`): `id`, `workoutId: integer().notNull().unique().references(() => workouts.id, { onDelete: "cascade" })`, `durationMin: numeric({ precision: 5, scale: 1, mode: "number" }).notNull()`, `speedKmh: numeric({ precision: 4, scale: 1, mode: "number" }).notNull()`, `inclinePct: numeric({ precision: 4, scale: 1, mode: "number" }).notNull()`, `distanceKm: numeric({ precision: 5, scale: 2, mode: "number" })` (nullable), `...timestamps`. Checks: duration > 0, speed > 0, incline >= 0.
- `exercises`: `id`, `name: text().notNull().unique()`, `archivedAt: timestamp({ withTimezone: true })`, `...timestamps`. No `kind` column.
- `workout_sets`: `id`, `workoutId` FK -> `workouts.id` `onDelete: "cascade"`, `exerciseId` FK -> `exercises.id` `onDelete: "restrict"`, `order: integer().notNull()`, `reps: integer().notNull()`, `weightKg: numeric({ precision: 6, scale: 2, mode: "number" })` (nullable), `...timestamps`. Check `workout_sets_reps_positive` (`reps > 0`). Index on `workoutId`. No duration or distance columns.
- The rule "treadmill workout has a session and no sets; training has sets and no session" is NOT in the DB; a service enforces it later.

### `src/db/schema/index.ts` (D8)
Re-export everything (`export * from "./enums"`, etc., except `shared`) and define relations with `relations` from `drizzle-orm`:
- `foodsRelations`: `diaryEntries: many(diaryEntries)`
- `diaryEntriesRelations`: `food: one(foods, { fields: [diaryEntries.foodId], references: [foods.id] })`
- `workoutsRelations`: `treadmillSession: one(treadmillSessions)`, `sets: many(workoutSets)`
- `treadmillSessionsRelations`: `workout: one(workouts, { fields: [treadmillSessions.workoutId], references: [workouts.id] })`
- `exercisesRelations`: `sets: many(workoutSets)`
- `workoutSetsRelations`: `workout: one(workouts, ...)`, `exercise: one(exercises, ...)`

Export names: `settings`, `foods`, `diaryEntries`, `workouts`, `treadmillSessions`, `exercises`, `workoutSets`, plus the enums above.

### `src/db/client.ts` (modify)
Change only the last line to:
```ts
import * as schema from "@/db/schema";
// ...
export const db = drizzle({ client: pool, schema, casing: "snake_case" });
```
Keep `import "server-only"`, the env check and the pool code unchanged.

**Files:**
- Create: `src/db/schema/shared.ts`: `timestamps` column helper
- Create: `src/db/schema/enums.ts`: pg enums
- Create: `src/db/schema/settings.ts`: singleton settings table
- Create: `src/db/schema/foods.ts`: foods table
- Create: `src/db/schema/diary.ts`: diary entries table
- Create: `src/db/schema/workouts.ts`: workouts, treadmill sessions, exercises, workout sets
- Create: `src/db/schema/index.ts`: re-exports + relations
- Modify: `src/db/client.ts`: pass `schema` and `casing`

**Read:** `src/db/client.ts`, `src/db/AGENTS.md`, `tsconfig.json`, `node_modules/drizzle-orm/pg-core/columns/numeric.d.ts` (only if the `mode` option type is unclear)

**Verify:** `npx tsc --noEmit; if ($?) { npm run lint }; if ($?) { npm run db:check }`
