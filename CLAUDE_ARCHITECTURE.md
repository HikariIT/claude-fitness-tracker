# Architecture Plan: Fitness Tracker

**Stack:** Next.js 16.4 App Router (`cacheComponents: true`), React 19.3, TypeScript strict, Tailwind 4 + shadcn/ui, PostgreSQL + Drizzle ORM, Zod, Vitest, npm.
**Scope:** one user with no auth. Five views: profile, foods, planner, workouts, balance.

## Decisions
| Topic | Choice | Why |
|---|---|---|
| DB | PostgreSQL (docker-compose service) | Enums, numeric precision, `date` type |
| Types | Drizzle schema → inferred types → `drizzle-zod` | One source of truth, no codegen |
| Backend | Server Components read through the DAL; Server Actions mutate | Idiomatic Next 16, no REST layer needed |
| Caching | DAL reads use `"use cache"` + `cacheTag`; actions call `updateTag` | Required by `cacheComponents` |
| Users | None. Settings is a singleton row (`id = 1`) with personal data and goals | Add `userId` FKs later if auth is ever needed |
| i18n | next-intl, locale URL segment (/pl, /en), JSON messages in src/messages | No raw UI strings; bilingual user |
| UI | shadcn/ui + Tailwind 4 tokens from the palette, notebook look, Patrick Hand + Nunito | CLAUDE.md style rule |

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
   │  ├─ fonts.ts               # next/font/google: Nunito (font-sans), Patrick Hand (font-hand)
   │  ├─ [locale]/
   │  │  ├─ layout.tsx          # Root layout: html lang, fonts, NextIntlClientProvider, AppNav, Toaster
   │  │  ├─ page.tsx            # Redirects to /planner
   │  │  ├─ profile/page.tsx    # Personal data (placeholder)
   │  │  ├─ foods/page.tsx      # Food database (exists: FoodsSection in Suspense)
   │  │  ├─ planner/page.tsx    # Food planner, today (exists: PlannerSection in Suspense)
   │  │  ├─ planner/[date]/page.tsx # Food planner, any ISO day; invalid → 404 (exists)
   │  │  ├─ workouts/page.tsx   # Workout planner (placeholder)
   │  │  ├─ balance/page.tsx    # Total balance (placeholder)
   │  │  ├─ [...rest]/page.tsx  # Catch-all → notFound()
   │  │  └─ not-found.tsx       # Localized 404
   ├─ features/                 # Vertical slices: feature-specific UI + actions
   │  ├─ CLAUDE.md
   │  ├─ planner/               # Food planner (exists)
   │  │  ├─ components/         # PlannerSection (server), PlannerView, EntriesTable, DayTotals, EntryFormDialog, ConfirmEntryDialog
   │  │  └─ actions.ts          # "use server": saveDiaryEntry, deleteDiaryEntryAction
   │  ├─ foods/
   │  │  ├─ components/         # FoodsView, FoodsTable, FoodFormDialog, CompositeFoodDialog, ConfirmFoodDialog (exists: FoodsSection too)
   │  │  └─ actions.ts          # saveFood, saveCompositeFood, archiveFoodAction, restoreFoodAction, deleteFoodAction (exists)
   │  ├─ profile/               # Personal data form + actions.ts (was settings/) (exists: ProfileForm, ProfileSection, actions.ts)
   │  ├─ workouts/              # Same shape
   │  └─ balance/               # Daily balance components
   ├─ components/               # SHARED, feature-agnostic UI
   │  ├─ CLAUDE.md
   │  ├─ ui/                    # shadcn/ui primitives (generated; do not hand-edit much)
   │  ├─ layout/                # AppNav, LanguageToggle, NotebookSheet, PageHeader, EmptyState
   │  ├─ forms/                 # FormField, NumberInput, SubmitButton (useActionState/pending) (exists)
   │  └─ data/                  # StatCard, DatePager; later MacroBar, KcalRing
   ├─ i18n/                     # next-intl: routing, navigation (Link/useRouter), request
   │  ├─ CLAUDE.md
   │  ├─ routing.ts             # Locales pl (default) + en, localePrefix "always"
   │  ├─ navigation.ts          # Locale-aware Link, redirect, usePathname, useRouter
   │  └─ request.ts             # Loads src/messages/<locale>.json
   ├─ messages/                 # UI strings, same keys in both files
   │  ├─ pl.json
   │  ├─ en.json
   │  └─ messages.test.ts       # Key parity and no empty strings
   ├─ proxy.ts                  # Locale detection and redirect (Next 16 name for middleware)
   ├─ global.d.ts               # AppConfig augmentation: typed message keys
   ├─ db/                       # DATABASE: schema + client + migrations
   │  ├─ CLAUDE.md
   │  ├─ client.ts              # `import "server-only"`; drizzle(pg Pool) singleton, schema + snake_case
   │  ├─ check.ts               # CLI: SELECT 1 connection check
   │  ├─ migrate.ts             # CLI: applies migrations (dev compose runs it before `next dev`)
   │  ├─ schema/
   │  │  ├─ CLAUDE.md
   │  │  ├─ enums.ts            # sex, activity_level, meal, workout_type
   │  │  ├─ shared.ts           # timestamps helper (createdAt/updatedAt)
   │  │  ├─ settings.ts
   │  │  ├─ foods.ts
   │  │  ├─ diary.ts
   │  │  ├─ workouts.ts         # workouts, treadmill_sessions, exercises, workout_sets
   │  │  └─ index.ts            # Re-exports + relations()
   │  ├─ migrations/            # drizzle-kit generated SQL (committed)
   │  └─ seed.ts                # Repeatable dev seed: Polish sample data + relation checks
   ├─ server/                   # BACKEND: data access layer (server-only)
   │  ├─ CLAUDE.md
   │  ├─ dal/                   # Read functions: getDiaryDay(date), listFoods(), listFoodComponents(), getGoals() (exists: settings.ts, foods.ts, diary.ts)
   │  └─ services/              # Multi-table writes in transactions, used by actions (exists: settings.ts, foods.ts, diary.ts)
   ├─ lib/                      # Pure, isomorphic, unit-tested
   │  ├─ CLAUDE.md
   │  ├─ validation/            # Zod schemas (drizzle-zod + refinements) per feature (exists: profile.ts, foods.ts)
   │  ├─ nutrition.ts           # Portion → kcal/macros, day totals, % of goal (exists: BMR, TDEE, age, kcalFromMacros)
   │  ├─ composite.ts           # Dish per-100 g values, cycle check, recalculation order (exists)
   │  ├─ numbers.ts             # parseDecimal (shared by validators) (exists)
   │  ├─ search.ts              # normalizeForSearch, matchesQuery: case- and diacritics-insensitive (exists)
   │  ├─ dates.ts               # ISO date helpers (local day, no TZ drift) (exists: localIsoDate, isIsoDate)
   │  ├─ diary.ts               # Meal grouping and order, portion/total nutrition, default meal (exists)
   │  └─ utils.ts               # cn(), formatters
   └─ types/                    # Cross-cutting derived types (DiaryDayView, ActionResult<T>)
```
Tests sit next to their code (`*.test.ts`). They focus on `lib/` and on `server/` against a test DB.

## Data model (Drizzle, `src/db/schema`)
- **settings**: singleton row (`id = 1`, check constraint) with `sex` (male/female), `birthDate`, `heightCm`, `weightKg`, `activityLevel` (sedentary/light/moderate/active/very_active), `kcalGoal`, `proteinGoalG?`. No carbs or fat goals. BMR is Mifflin-St Jeor (`10·kg + 6.25·cm − 5·age + 5` male / `−161` female); TDEE is BMR × activity multiplier (1.2 / 1.375 / 1.55 / 1.725 / 1.9). Both are computed in `lib/nutrition.ts`, not stored. `kcalGoal` is user-editable and prefilled from TDEE.
- **foods**: `name`, `kcal`, `proteinG`, `carbsG`, `fatG` (all required, per 100 g), `archivedAt?`, timestamps. Removing archives the food so the history stays intact; an archived food that no diary entry references can then be deleted permanently. No basis, brand or serving size. Protein + carbs + fat ≤ 100 g. Names are unique among non-archived foods, ignoring case (enforced in the service, not the DB). A dish (`isComposite = true`, fixed at creation) is a food made of other foods. Its ingredients are in **food_components** (`foodId` cascade, `componentFoodId` restrict, `quantityG`, unique pair). Its per-100 g values are computed from the ingredient grams divided by `finalWeightG` (or the sum of grams when null) and are recalculated in the same transaction whenever an ingredient changes. Dishes may contain dishes, and cycles are refused. A food used as an ingredient may be archived but not deleted.
- **diary_entries**: `date`, `meal` (enum breakfast/lunch/dinner/snack/other), `foodId` FK (restrict), `quantityG`, plus **snapshot** columns `kcal`, `proteinG`, `carbsG`, `fatG` computed at insert time, so later food edits don't change past days. Index on `(date, meal)`.
- **workouts**: `type` (treadmill/training), `date`, `name?`, `notes?`, `kcalBurned?`.
- **treadmill_sessions**: 1:1 with a workout (`workoutId` unique FK, cascade): `durationMin`, `speedKmh`, `inclinePct`, `distanceKm?`. Only treadmill workouts have one. A service enforces the type rule, not the DB.
- **exercises**: `name` (unique), `archivedAt?`. No kind.
- **workout_sets**: `workoutId` FK (cascade), `exerciseId` FK (restrict), `order`, `reps` (> 0), `weightKg?`. Only training workouts have sets. A service enforces this, not the DB.

Every table has `createdAt` / `updatedAt` (`timestamptz`). Keys are integer identity columns, except the fixed `id = 1` of `settings`. Nutrition columns use `numeric` mapped to `number` through the Drizzle `mode` option. The client and `drizzle.config.ts` use `casing: "snake_case"`. Relations are classic `relations()` helpers in `schema/index.ts`. Types come from `typeof foods.$inferSelect` / `$inferInsert` and are never hand-written.

## Request flow
`page.tsx` (Server Component) → `server/dal/*` (`"use cache"`, `cacheTag("planner:2026-11-10")`) → `db`
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
| `src/i18n/CLAUDE.md` | Locale routing, navigation imports, no-raw-strings rule, message keys |
| `src/features/CLAUDE.md` | Slice anatomy, how to add a feature, action template |
| `src/components/CLAUDE.md` | Shared vs feature UI, shadcn add command, prop typing conventions |
| `src/db/CLAUDE.md` | Schema conventions (snake_case DB, camelCase TS), snapshot rule, migration workflow |
| `src/server/CLAUDE.md` | DAL vs services, cache tag naming, transaction pattern |
| `src/lib/CLAUDE.md` | Purity rule, where the Zod schemas live, testing expectations |

## Setup steps
1. Move `app/` to `src/app`, and change the tsconfig paths entry `@/*` to `./src/*`.
2. Add deps: `drizzle-orm pg zod drizzle-zod server-only`; dev: `drizzle-kit @types/pg vitest`.
3. Add the Postgres service to the compose files, and add `DATABASE_URL` to `.env.local`/`.env.production`. (done: FIT-6, plus npm run db:check)
4. Run `shadcn init` (Tailwind 4) and add the primitives. (done: FIT-8)
5. Write the schema, generate the first migration, and seed. (done: FIT-7, plus npm run db:generate / db:migrate / db:seed)
6. Build foods, then profile, then the planner, workouts and balance. (done: foods FIT-11, profile FIT-10, composite foods FIT-12, planner FIT-13)
