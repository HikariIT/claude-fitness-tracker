# Define Drizzle Schema, Generate Migrations and Seed Data
**Linear:** FIT-7

## Task Description
Define the Drizzle schema (settings, foods, diary entries, workouts with treadmill sessions and training sets) following `CLAUDE.md` where it differs from `CLAUDE_ARCHITECTURE.md`. Add drizzle-kit migration tooling, generate and apply the first migration, and run it automatically in dev compose. Add a repeatable seed that inserts mock Polish records and verifies the relations with relational queries.

## Design Decisions
- **D1:** Follow `CLAUDE.md` where the architecture doc differs. Foods made from other foods come in a later task, so there is no `food_components` table now.
- **D2:** `settings` is a single row (`id = 1`) with `sex` (male/female), `birthDate`, `heightCm`, `weightKg`, `activityLevel` (sedentary/light/moderate/active/very_active), `kcalGoal` (not null) and `proteinGoalG` (nullable). The base requirement is calculated later in `lib/`.
- **D3:** `foods` has `name`, plus `kcal`, `proteinG`, `carbsG` and `fatG`, all required, per 100 g, `numeric(7,2)` read as `number`. It has `archivedAt` and no basis, brand or serving size.
- **D4:** `diary_entries` has `date`, `meal` (enum breakfast/lunch/dinner/snack/other), `foodId` FK (restrict), `quantityG`, and required snapshot columns `kcal`/`proteinG`/`carbsG`/`fatG`, with an index on `(date, meal)`.
- **D5:** `workouts` has `type` (treadmill/training), `date`, `name?`, `notes?` and `kcalBurned?`. `treadmill_sessions` is 1:1 with it (`workoutId` unique FK, cascade), with `durationMin`, `speedKmh`, `inclinePct` and `distanceKm?`.
- **D6:** `exercises` has `name` (unique) and `archivedAt?`, with no kind. `workout_sets` has `workoutId` (cascade), `exerciseId` (restrict), `order`, `reps` (not null, > 0) and `weightKg?`.
- **D7:** Every table uses integer identity keys and has `createdAt`/`updatedAt` (`timestamptz`, with `$onUpdate`).
- **D8:** Classic `relations()` helpers, with `{ schema }` passed to `drizzle()` in `client.ts`.
- **D9:** `drizzle.config.ts`, `db:generate`, and `db:migrate` (`src/db/migrate.ts` through `tsx`). The dev compose runs `db:migrate` before `dev`.
- **D10:** `db:seed` can be run again (it truncates and resets IDs) and inserts Polish names with diacritics. It then runs relational queries, checks the counts and that diacritics come back intact, and exits 1 on any mismatch.
- **D11:** No drizzle-zod schemas and no Vitest tests in this task.
- **D12:** Update the "Data model" section of `CLAUDE_ARCHITECTURE.md` (and related mentions) and `src/db/AGENTS.md`.
- **D13:** Every new directory created by this task that holds hand-written code gets its own `CLAUDE.md` navigator (here: `src/db/schema/CLAUDE.md`). The generated `src/db/migrations/` does not.

## Implementation Progress
| # | Subtask | File | Status |
|---|---|---|---|
| 1 | Drizzle schema files and client wiring | [subtask-1.md](subtask-1.md) | Done |
| 2 | Migration tooling, first migration, dev compose | [subtask-2.md](subtask-2.md) | Done |
| 3 | Seed script with relation checks | [subtask-3.md](subtask-3.md) | Done |
| 4 | Documentation (architecture, AGENTS.md, schema CLAUDE.md, README) | [subtask-4.md](subtask-4.md) | Done |

## Change Log
<!-- Filled by /plan-realize: one bullet per finished subtask, "- <n>. <change>". Used to build commit-message.txt after the last subtask. -->
- 1. Add Drizzle schema in src/db/schema (settings, foods, diary entries, workouts, treadmill sessions, exercises, workout sets) with relations, and pass it to the db client with snake_case casing
- 2. Add drizzle.config.ts, db:generate and db:migrate scripts, src/db/migrate.ts, generated first migration in src/db/migrations, and run db:migrate before next dev in docker-compose.dev.yml
- 3. Add repeatable db:seed script (src/db/seed.ts) that truncates and inserts Polish mock foods, diary entries, settings, exercises and workouts, then checks the relations and exits 1 on mismatch
- 4. Update the data model in CLAUDE_ARCHITECTURE.md, rewrite src/db/AGENTS.md, add src/db/schema/CLAUDE.md, and document db:migrate and db:seed in README
