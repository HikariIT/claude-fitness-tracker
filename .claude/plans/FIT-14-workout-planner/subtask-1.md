# 1. Schema, migration, seed and pure workout helpers
**Decisions:** D3, D4, D5, D7, D10, D11

Change the schema, generate the migration, update the seed, and add the pure helpers the rest of the feature uses. There is no UI or server code in this subtask.

## Schema: `src/db/schema/workouts.ts`
1. In `treadmillSessions`, **remove** the `distanceKm` column (D3: distance is computed, not stored).
2. Add a new table in the same file (it already imports `check`, `date`, `integer`, `pgTable`, `sql`, `timestamps`):
```ts
// One row per day (D7). kcal is stored as entered (prefilled from an estimate in the UI).
export const dailySteps = pgTable(
  "daily_steps",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    date: date({ mode: "string" }).notNull().unique(),
    steps: integer().notNull(),
    kcal: integer().notNull(),
    ...timestamps,
  },
  (t) => [
    check("daily_steps_steps_non_negative", sql`${t.steps} >= 0`),
    check("daily_steps_kcal_non_negative", sql`${t.kcal} >= 0`),
  ],
);
```
`src/db/schema/index.ts` already has `export * from "./workouts"`, so the table is exported. It needs no relations, so do not edit `index.ts`.

3. Generate the migration: `npm run db:generate -- --name workouts_steps`. This creates `src/db/migrations/0002_workouts_steps.sql` and a snapshot. Check that the SQL only does `ALTER TABLE "treadmill_sessions" DROP COLUMN "distance_km"` and `CREATE TABLE "daily_steps" ...` with the unique constraint and the two checks. Do not hand-edit the meta files.

4. In `src/db/schema/CLAUDE.md`, update the `workouts.ts` bullet to: `workouts`, `treadmill_sessions` (no distance: it is computed), `exercises`, `workout_sets`, `daily_steps` (one row per date, `steps`, `kcal`).

## Seed: `src/db/seed.ts`
- Import `dailySteps` from `@/db/schema` with the other tables.
- Add `daily_steps` to the `TRUNCATE ... RESTART IDENTITY CASCADE` list (around line 87).
- Remove `distanceKm: 4.33,` from the `treadmillSessions` insert (around line 170).
- After the training sets insert, add `await tx.insert(dailySteps).values([{ date: today, steps: 8500, kcal: 340 }, { date: yesterday, steps: 6200, kcal: 248 }]);` (`today` and `yesterday` are already defined there).
- In the relation checks section (after the workout checks, around line 186), add:
  `const stepsRows = await db.select().from(dailySteps);` then `expect("daily steps count", stepsRows.length, 2);` and `expect("steps are numbers", stepsRows.find((r) => r.date === today)?.steps, 8500);` (check how `today` is in scope there and reuse the same variable).

## Numbers: `src/lib/numbers.ts`
The current file is:
```ts
const DECIMAL = /^-?\d+(\.\d+)?$/;
/** Parses a decimal with a comma or dot separator and rounds it to 1 decimal. Returns null if not numeric. */
export function parseDecimal(raw: string): number | null { ... Math.round(Number(normalized) * 10) / 10; }
```
Change it to `parseDecimal(raw: string, places = 1): number | null`, rounding to `places` decimals (`const f = 10 ** places; Math.round(n * f) / f`). Existing callers pass one argument, so they keep the 1-decimal behaviour. Update the doc comment.
Add:
```ts
/** Parses a non-negative whole number ("12", " 7 "). Returns null for decimals, signs or text. */
export function parseInteger(raw: string): number | null; // regex /^\d+$/ after trim, then Number()
```
Add tests in `src/lib/numbers.test.ts`: `parseDecimal("42,125", 2) === 42.13`, `parseDecimal("1.25", 2) === 1.25`, the default stays at 1 decimal, and `parseInteger("12") === 12`, `parseInteger(" 7 ") === 7`, and `parseInteger` returns null for `"1.5"`, `"-3"`, `""` and `"abc"`.

## Pure helpers: `src/lib/workouts.ts` (new)
No imports from `db/`, no I/O, no React (lib purity rule).
```ts
/** Must match workoutTypeEnum in src/db/schema/enums.ts. */
export const WORKOUT_TYPES = ["treadmill", "training"] as const;
export type WorkoutType = (typeof WORKOUT_TYPES)[number];
export function isWorkoutType(value: string): value is WorkoutType;

/** Speed at or above which the ACSM running equation is used instead of walking (D4). */
export const RUNNING_THRESHOLD_KMH = 8;

/** D3: km = speed × minutes / 60, rounded to 2 decimals. */
export function treadmillDistanceKm(speedKmh: number, durationMin: number): number;

/**
 * D4: ACSM gross energy estimate, rounded to a whole kcal.
 * s = speedKmh × 1000 / 60 (m/min), g = inclinePct / 100.
 * Walking (speed < RUNNING_THRESHOLD_KMH): VO2 = 0.1·s + 1.8·s·g + 3.5 (ml/kg/min)
 * Running (speed ≥ threshold):             VO2 = 0.2·s + 0.9·s·g + 3.5
 * kcal = VO2 × weightKg × durationMin / 1000 × 5
 */
export function estimateTreadmillKcal(input: {
  speedKmh: number; inclinePct: number; durationMin: number; weightKg: number;
}): number;

/** D7: round(steps × weightKg × 0.0005). */
export function estimateStepsKcal(steps: number, weightKg: number): number;

/** D10: kcal from workouts (null kcal counts as 0), from steps (null row = 0) and their sum. */
export function sumBurned(
  workouts: readonly { kcalBurned: number | null }[],
  steps: { kcal: number } | null,
): { workouts: number; steps: number; total: number };

/**
 * For the workout card: sorts sets by `order`, then groups runs of consecutive sets with the
 * same exerciseId ([squat, squat, bench, squat] → 3 groups). Each group keeps its sets in order.
 */
export function groupConsecutiveSets<T extends { exerciseId: number; order: number }>(
  sets: readonly T[],
): { exerciseId: number; sets: T[] }[];
```

## Tests: `src/lib/workouts.test.ts` (new)
Use vitest (`import { describe, expect, it } from "vitest"`), as in `src/lib/diary.test.ts`. Cover:
- `isWorkoutType("treadmill")` is true and `isWorkoutType("run")` is false.
- `treadmillDistanceKm(6.5, 40) === 4.33`.
- Walking: `estimateTreadmillKcal({ speedKmh: 6.5, inclinePct: 8, durationMin: 40, weightKg: 80 }) === 479`.
- Running: `estimateTreadmillKcal({ speedKmh: 10, inclinePct: 0, durationMin: 30, weightKg: 70 }) === 387`.
- The threshold: 8 km/h uses the running equation (compare it with the walking formula computed by hand in the test).
- `estimateStepsKcal(10000, 80) === 400` and `estimateStepsKcal(0, 80) === 0`.
- `sumBurned([{ kcalBurned: 300 }, { kcalBurned: null }, { kcalBurned: 120 }], { kcal: 250 })` → `{ workouts: 420, steps: 250, total: 670 }`, and `sumBurned([], null)` → all zeros.
- `groupConsecutiveSets` with unsorted `order` and an A, A, B, A pattern gives 3 groups in order. An empty array gives `[]`.

## Docs
In `src/lib/CLAUDE.md`, add one bullet for `workouts.ts` (types, distance, ACSM and steps estimates, `sumBurned`, `groupConsecutiveSets`) and note the new `parseDecimal(raw, places)` / `parseInteger` in the `numbers.ts` bullet.

**Files:**
- Modify: `src/db/schema/workouts.ts`: drop `distanceKm`, add `dailySteps`
- Create: `src/db/migrations/0002_workouts_steps.sql` (+ meta snapshot/journal): generated by drizzle-kit
- Modify: `src/db/schema/CLAUDE.md`: workouts bullet
- Modify: `src/db/seed.ts`: truncate, no distance, steps rows and a check
- Modify: `src/lib/numbers.ts`, `src/lib/numbers.test.ts`
- Create: `src/lib/workouts.ts`, `src/lib/workouts.test.ts`
- Modify: `src/lib/CLAUDE.md`

**Read:** `src/db/schema/workouts.ts`, `src/db/schema/CLAUDE.md`, `src/db/seed.ts:1-20,80-200` (imports, truncate, workout inserts, workout checks), `src/lib/numbers.ts`, `src/lib/numbers.test.ts`, `src/lib/diary.test.ts:1-20` (test style), `src/lib/CLAUDE.md`

**Verify:** `npm run db:generate -- --name workouts_steps && npx tsc --noEmit && npm test`
