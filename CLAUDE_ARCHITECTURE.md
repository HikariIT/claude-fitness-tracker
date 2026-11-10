# Architecture Plan: Fitness Tracker

**Stack:** Next.js 16.4 App Router (`cacheComponents: true`), React 19.3, TypeScript strict, Tailwind 4 + shadcn/ui, PostgreSQL + Drizzle ORM, Zod, Vitest, npm.
**Scope:** one user with no auth. V1 views are the food diary and the food library. The workout schema is in from day one, but its views come later.

## Decisions
| Topic | Choice | Why |
|---|---|---|
| DB | PostgreSQL (docker-compose service) | Enums, numeric precision, `date` type |
| Types | Drizzle schema → inferred types → `drizzle-zod` | One source of truth, no codegen |
| Backend | Server Components read through the DAL; Server Actions mutate | Idiomatic Next 16, no REST layer needed |
| Caching | DAL reads use `"use cache"` + `cacheTag`; actions call `updateTag` | Required by `cacheComponents` |
| Users | None. Settings is a singleton row (`id = 1`) | Add `userId` FKs later if auth is ever needed |

## Directory tree
```
fitness-tracker/
├─ CLAUDE.md                    # Root navigator: stack, rules, links to sub-CLAUDE.md files
├─ drizzle.config.ts            # drizzle-kit: schema path, migrations out, DATABASE_URL
├─ docker-compose*.yml          # + `db` service (postgres:17) with a volume
├─ vitest.config.ts
└─ src/
   ├─ app/                      # ROUTING ONLY: pages, layouts, loading/error. Thin.
   │  ├─ CLAUDE.md
   │  ├─ layout.tsx             # Shell: <AppNav/>, fonts, theme
   │  ├─ page.tsx               # Redirects to /diary (dashboard later)
   │  ├─ diary/
   │  │  ├─ page.tsx            # Today's diary
   │  │  └─ [date]/page.tsx     # Diary for YYYY-MM-DD: meals, entries, totals vs goal
   │  ├─ foods/
   │  │  ├─ page.tsx            # Food library list + search
   │  │  ├─ new/page.tsx
   │  │  └─ [foodId]/edit/page.tsx
   │  ├─ settings/page.tsx      # Daily kcal/macro goals (small, needed for "vs goal")
   │  └─ (later) workouts/, exercises/, dashboard/, history/
   ├─ features/                 # Vertical slices: feature-specific UI + actions
   │  ├─ CLAUDE.md
   │  ├─ diary/
   │  │  ├─ components/         # MealSection, EntryRow, AddEntryDialog, DayTotals
   │  │  └─ actions.ts          # "use server": addEntry, updateEntry, deleteEntry
   │  ├─ foods/
   │  │  ├─ components/         # FoodForm, FoodTable, FoodPicker
   │  │  └─ actions.ts          # createFood, updateFood, archiveFood
   │  ├─ settings/              # GoalsForm + actions.ts
   │  └─ workouts/              # (later) same shape
   ├─ components/               # SHARED, feature-agnostic UI
   │  ├─ CLAUDE.md
   │  ├─ ui/                    # shadcn/ui primitives (generated; do not hand-edit much)
   │  ├─ layout/                # AppNav, PageHeader, EmptyState
   │  ├─ forms/                 # FormField, NumberInput, SubmitButton (useActionState/pending)
   │  └─ data/                  # MacroBar, KcalRing, StatCard, DatePager
   ├─ db/                       # DATABASE: schema + client + migrations
   │  ├─ CLAUDE.md
   │  ├─ client.ts              # `import "server-only"`; drizzle(pg Pool) singleton
   │  ├─ schema/
   │  │  ├─ enums.ts            # meal_type, exercise_kind, unit_basis
   │  │  ├─ foods.ts
   │  │  ├─ diary.ts
   │  │  ├─ workouts.ts
   │  │  ├─ settings.ts
   │  │  └─ index.ts            # Re-exports + relations()
   │  ├─ migrations/            # drizzle-kit generated SQL (committed)
   │  └─ seed.ts                # Sample foods/exercises for dev
   ├─ server/                   # BACKEND: data access layer (server-only)
   │  ├─ CLAUDE.md
   │  ├─ dal/                   # Read functions: getDiaryDay(date), listFoods(q), getGoals()
   │  └─ services/              # Multi-table writes in transactions, used by actions
   ├─ lib/                      # Pure, isomorphic, unit-tested
   │  ├─ CLAUDE.md
   │  ├─ validation/            # Zod schemas (drizzle-zod + refinements) per feature
   │  ├─ nutrition.ts           # Portion → kcal/macros, day totals, % of goal
   │  ├─ dates.ts               # ISO date helpers (local day, no TZ drift)
   │  └─ utils.ts               # cn(), formatters
   └─ types/                    # Cross-cutting derived types (DiaryDayView, ActionResult<T>)
```
Tests sit next to their code (`*.test.ts`). They focus on `lib/` and on `server/` against a test DB.

## Data model (Drizzle, `src/db/schema`)
- **foods**: `id`, `name`, `brand?`, `basis` (`per_100g` | `per_serving`), `servingSizeG?`, `kcal`, `proteinG`, `carbsG`, `fatG`, `archivedAt?`, timestamps. Archive instead of delete so the history stays intact.
- **diary_entries**: `id`, `date` (`date`), `meal` (enum breakfast/lunch/dinner/snack), `foodId` FK, `quantity` (grams or servings), plus **snapshot** columns `kcal`, `proteinG`, `carbsG`, `fatG` computed at insert time, so later food edits don't change past days. Index on `(date, meal)`.
- **settings**: singleton row with `kcalGoal`, `proteinGoalG`, `carbsGoalG`, `fatGoalG`.
- **exercises**: `id`, `name`, `kind` (strength/cardio), `archivedAt?`.
- **workouts**: `id`, `date`, `name?`, `notes?`, `kcalBurned?`.
- **workout_sets**: `id`, `workoutId` FK (cascade), `exerciseId` FK, `order`, `reps?`, `weightKg?`, `durationS?`, `distanceM?`. A check constraint enforces the per-kind fields.

Nutrition values use `numeric(7,2)` columns mapped to `number` through the Drizzle `mode` option. Types come from `typeof foods.$inferSelect` / `$inferInsert` and are never hand-written.

## Request flow
`page.tsx` (Server Component) → `server/dal/*` (`"use cache"`, `cacheTag("diary:2026-11-10")`) → `db`
Form (Client, `useActionState`) → `features/*/actions.ts` → Zod `parse` → `server/services` → `updateTag(...)` → returns `ActionResult<T>`

## Layering rules
1. `app/` only composes: it never imports `db/` directly.
2. Only `server/` and `db/` touch the database, and both are `server-only`.
3. `components/` never imports `features/`, `server/`, or `db/`. `features/` may import `components/`.
4. Every action input passes Zod validation and every action returns `ActionResult<T>`. Actions don't throw for expected errors.
5. `lib/` is pure: no I/O and no React.

## Sub-CLAUDE.md navigators (each ≤ ~40 lines)
| File | Content |
|---|---|
| `/CLAUDE.md` | Keep the existing text, then add: stack, commands (`npm run dev`, `db:generate`, `db:migrate`, `db:seed`, `test`), layering rules, a map of the sub-files |
| `src/app/CLAUDE.md` | Route map, thin-page rule, loading/error conventions, "read the Next docs first" |
| `src/features/CLAUDE.md` | Slice anatomy, how to add a feature, action template |
| `src/components/CLAUDE.md` | Shared vs feature UI, shadcn add command, prop typing conventions |
| `src/db/CLAUDE.md` | Schema conventions (snake_case DB, camelCase TS), snapshot rule, migration workflow |
| `src/server/CLAUDE.md` | DAL vs services, cache tag naming, transaction pattern |
| `src/lib/CLAUDE.md` | Purity rule, where the Zod schemas live, testing expectations |

## Setup steps
1. Move `app/` to `src/app`, and change the tsconfig paths entry `@/*` to `./src/*`.
2. Add deps: `drizzle-orm pg zod drizzle-zod server-only`; dev: `drizzle-kit @types/pg vitest`.
3. Add the Postgres service to the compose files, and add `DATABASE_URL` to `.env.local`/`.env.production`.
4. Run `shadcn init` (Tailwind 4) and add the primitives.
5. Write the schema, generate the first migration, and seed.
6. Build foods, then settings, then the diary. Workouts come in phase 2.
