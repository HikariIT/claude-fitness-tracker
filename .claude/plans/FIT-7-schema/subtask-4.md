# 4. Documentation (architecture, AGENTS.md, schema CLAUDE.md, README)
**Decisions:** D1, D2, D3, D4, D5, D6, D7, D8, D9, D10, D12, D13

Goal: make the docs match what subtasks 1-3 built. Docs only, no code changes. Keep the existing writing style (short sentences, plain Markdown). Before writing, skim the real files listed under **Read** and describe what is actually there; if something differs from this subtask, the code wins.

## 1. `CLAUDE_ARCHITECTURE.md` (D12)
- Replace the whole **"Data model (Drizzle, `src/db/schema`)"** section (bullets for foods, diary_entries, settings, exercises, workouts, workout_sets, and the paragraph after them) with the actual model:
  - **settings**: singleton row (`id = 1`, check constraint) with `sex`, `birthDate`, `heightCm`, `weightKg`, `activityLevel`, `kcalGoal`, `proteinGoalG?`. No carbs or fat goals. The base requirement (BMR × activity) is computed in `lib/`, not stored (D2).
  - **foods**: `name`, `kcal`, `proteinG`, `carbsG`, `fatG` (all required, per 100 g), `archivedAt?`. Archive instead of delete. No basis, brand or serving size (D3). Foods made from other foods come in a later task (D1).
  - **diary_entries**: `date`, `meal` (enum breakfast/lunch/dinner/snack/other), `foodId` FK (restrict), `quantityG`, snapshot `kcal`/`proteinG`/`carbsG`/`fatG` computed at insert time. Index on `(date, meal)` (D4).
  - **workouts**: `type` (treadmill/training), `date`, `name?`, `notes?`, `kcalBurned?` (D5).
  - **treadmill_sessions**: 1:1 with a treadmill workout (`workoutId` unique, cascade): `durationMin`, `speedKmh`, `inclinePct`, `distanceKm?` (D5).
  - **exercises**: `name` (unique), `archivedAt?` (D6).
  - **workout_sets**: `workoutId` (cascade), `exerciseId` (restrict), `order`, `reps` (> 0), `weightKg?` (D6). "Treadmill has a session and no sets; training has sets and no session" is enforced by a service, not the DB.
  - Closing paragraph: identity integer keys and `createdAt`/`updatedAt` everywhere (D7); `numeric` columns read as `number` via `mode: "number"`; snake_case through `casing: "snake_case"` in `drizzle()` and `drizzle.config.ts`; relations via classic `relations()` in `schema/index.ts` (D8); types from `$inferSelect`/`$inferInsert`.
- Directory tree under `src/db/`: replace `enums.ts`'s comment with `sex, activity_level, meal, workout_type`; add `shared.ts` (timestamps helper); add `CLAUDE.md` inside `schema/`; add `migrate.ts` (programmatic migrator) and `check.ts`; keep `migrations/` and `seed.ts`.
- **Decisions** table, "Users" row: "Settings is a singleton row (`id = 1`)" stays; add "with personal data and goals".
- In the Scope line at the top, change "The workout schema is in from day one, but its views come later." to say the workout schema and views are part of V1.
- **Setup steps**: append ` (done: FIT-7, plus npm run db:generate / db:migrate / db:seed)` to step 5. Nothing else in that list.
- Do not touch the route tree or other sections.

## 2. `src/db/AGENTS.md` (D12)
Rewrite it (at most ~45 lines) to describe what exists now:
- **Files:** `client.ts` (now passes `schema` and `casing: "snake_case"`), `check.ts`, `migrate.ts`, `seed.ts`, `schema/` (link to `schema/CLAUDE.md`), `migrations/` (generated, committed, never hand-edited).
- **Commands:** `npm run db:check`, `npm run db:generate` (after changing the schema), `npm run db:migrate`, `npm run db:seed` (wipes all tables and inserts Polish sample data, then checks relations; exits 1 on mismatch). Dev compose runs `db:migrate` before `next dev`.
- Turn the "Conventions (planned)" list into real conventions; drop the "Next steps" section (the schema task is done).
- Keep the Purpose and Connection sections.

## 3. `src/db/schema/CLAUDE.md` (D13), new, at most ~40 lines
- One line per file: `enums.ts`, `shared.ts` (`timestamps`), `settings.ts`, `foods.ts`, `diary.ts`, `workouts.ts` (workouts, treadmill_sessions, exercises, workout_sets), `index.ts` (re-exports + `relations()`).
- Rules: relative imports only (drizzle-kit loads these files); no `server-only` import; camelCase TS names, snake_case comes from `casing`; every table has an identity `id` (except `settings`) and `...timestamps`; nutrition `numeric(7,2)` with `mode: "number"`; archive (`archivedAt`) instead of delete for foods and exercises; diary entries store snapshots.
- How to change the schema: edit the file → `npm run db:generate` → review SQL → `npm run db:migrate` → update `seed.ts` if needed.
- Point to `CLAUDE_ARCHITECTURE.md` ("Data model").

## 4. `README.md`
In the dev setup steps (near the `cp .env.example ...` lines), add after starting the DB: `npm run db:migrate` and optionally `npm run db:seed` (dev sample data; wipes tables). Keep it to 2-3 lines.

**Files:**
- Modify: `CLAUDE_ARCHITECTURE.md`: data model, tree, scope, setup step 5
- Modify: `src/db/AGENTS.md`: current files, commands, conventions
- Create: `src/db/schema/CLAUDE.md`: schema folder navigator
- Modify: `README.md`: migrate/seed commands

**Read:** `CLAUDE_ARCHITECTURE.md`, `src/db/AGENTS.md`, `README.md`, `src/db/schema/index.ts`, `src/db/schema/workouts.ts`, `drizzle.config.ts`, `package.json` (scripts only)

**Verify:** `npm run lint; if ($?) { npx tsc --noEmit }`
