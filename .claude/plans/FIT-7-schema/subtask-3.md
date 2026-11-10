# 3. Seed script with relation checks
**Decisions:** D2, D3, D4, D5, D6, D8, D10, D11

Goal: `npm run db:seed` resets the dev database tables, inserts mock records with Polish names (with diacritics), then runs relational queries to prove the relations work. It exits 1 on any mismatch. No Vitest tests (D11).

Prerequisites (subtasks 1-2): schema in `src/db/schema/` and migrations applied (`npm run db:migrate`). `db` from `@/db/client` is `drizzle({ client: pool, schema, casing: "snake_case" })`, so `db.query.<table>.findMany/findFirst({ with })` works (D8).

Schema exports to use (from `@/db/schema`): `settings`, `foods`, `diaryEntries`, `workouts`, `treadmillSessions`, `exercises`, `workoutSets`. Relation names: `diaryEntries.food`, `foods.diaryEntries`, `workouts.treadmillSession`, `workouts.sets`, `workoutSets.exercise`, `workoutSets.workout`, `exercises.sets`. Numeric columns are read and written as `number`; `date` columns as `"YYYY-MM-DD"` strings.

## `src/db/seed.ts`
Same CLI shape as `src/db/check.ts` (`main()` with try/catch/finally, `process.exitCode`, `await pool.end()` in `finally`). Console text is CLI output, so the language-map rule does not apply.

1. **Reset (D10):** in one transaction, `await tx.execute(sql\`TRUNCATE settings, foods, diary_entries, workouts, treadmill_sessions, exercises, workout_sets RESTART IDENTITY CASCADE\`)`, then do all the inserts in the same transaction (`db.transaction(async (tx) => { ... })`). Use `.returning()` to get the IDs; do not hard-code them.
2. **Settings (D2):** one row `{ id: 1, sex: "female", birthDate: "1995-04-12", heightCm: 168, weightKg: 62.5, activityLevel: "moderate", kcalGoal: 1800, proteinGoalG: 110 }`.
3. **Foods (D3), per 100 g, 8 rows**, Polish names with diacritics, e.g.:
   | name | kcal | proteinG | carbsG | fatG |
   |---|---|---|---|---|
   | Ryż gotowany | 130 | 2.7 | 28.2 | 0.3 |
   | Sos curry | 110 | 2.0 | 9.5 | 7.0 |
   | Pierś z kurczaka | 120 | 23.0 | 0 | 2.6 |
   | Jajko kurze | 143 | 12.6 | 0.7 | 9.5 |
   | Płatki owsiane | 379 | 13.2 | 67.7 | 6.5 |
   | Jogurt naturalny | 61 | 4.3 | 4.7 | 3.0 |
   | Jabłko | 52 | 0.3 | 13.8 | 0.2 |
   | Chleb żytni | 259 | 8.5 | 48.3 | 3.3 |
   Insert exactly these 8, none archived.
4. **Diary entries (D4):** 3 consecutive days ending today (compute local `YYYY-MM-DD` strings; no time zone shift, build them from `getFullYear/getMonth/getDate`). Each day: 3-4 entries across different `meal` values (use at least breakfast, lunch, dinner, and `other` once overall). Compute snapshots with a local helper: `snapshot(food, quantityG) = { kcal, proteinG, carbsG, fatG }`, each `round2(value * quantityG / 100)`, where `round2 = (n) => Math.round(n * 100) / 100`. Record the total entry count for the checks.
5. **Exercises (D6):** 3 rows: `Przysiad ze sztangą`, `Wyciskanie leżąc`, `Martwy ciąg`.
6. **Workouts (D5, D6):**
   - Treadmill workout today: `{ type: "treadmill", date: today, name: "Bieżnia", kcalBurned: 320 }` + `treadmill_sessions` row `{ workoutId, durationMin: 40, speedKmh: 6.5, inclinePct: 8, distanceKm: 4.33 }`.
   - Training workout yesterday: `{ type: "training", date: yesterday, name: "Trening siłowy", kcalBurned: 250, notes: "Dzień nóg i pleców" }` + 6 `workout_sets` rows (2 per exercise, `order` 1..6, `reps` 5-10, `weightKg` set on most, `null` on one to cover the optional column).

## Checks (after the transaction commits)
Write a small helper `expect(label: string, actual: unknown, expected: unknown)` that compares with `===` (or `JSON.stringify` for arrays), logs `OK <label>` or pushes a failure message. At the end, if there are failures, print them and set `process.exitCode = 1`; otherwise print a short summary and set 0.
- `db.query.diaryEntries.findMany({ with: { food: true } })`: count equals the inserted count; every entry has `food` not null; `entry.food.name` is one of the seeded names.
- `db.query.foods.findFirst({ where: (f, { eq }) => eq(f.name, "Ryż gotowany"), with: { diaryEntries: true } })`: found, and `diaryEntries.length` equals how many entries used it.
- **Diacritics (D10):** `db.query.foods.findFirst({ where: (f, { eq }) => eq(f.name, "Płatki owsiane") })` returns a row whose `name === "Płatki owsiane"`; same for exercise `"Przysiad ze sztangą"`.
- `db.query.workouts.findMany({ with: { treadmillSession: true, sets: { with: { exercise: true } } } })`: 2 workouts; the treadmill one has `treadmillSession` not null with `speedKmh === 6.5` (checks numeric `mode: "number"`) and `sets.length === 0`; the training one has `treadmillSession === null`, `sets.length === 6`, every `set.exercise` not null.
- `db.query.settings.findFirst()`: exists, `id === 1`, `kcalGoal === 1800`.
- Running the script twice in a row must pass both times (truncate + `RESTART IDENTITY`).

## `package.json`
Add after `db:migrate`:
`"db:seed": "tsx --conditions=react-server --env-file-if-exists=.env.local src/db/seed.ts"`

**Files:**
- Create: `src/db/seed.ts`: repeatable seed + relation checks
- Modify: `package.json`: `db:seed` script

**Read:** `src/db/check.ts`, `src/db/client.ts`, `src/db/schema/index.ts`, `src/db/schema/foods.ts`, `src/db/schema/diary.ts`, `src/db/schema/workouts.ts`, `src/db/schema/settings.ts`, `package.json`

**Verify:** `docker compose -f docker-compose.dev.yml up -d --wait db; if ($?) { npm run db:migrate }; if ($?) { npm run db:seed }; if ($?) { npm run db:seed }; if ($?) { npx tsc --noEmit }; if ($?) { npm run lint }`
