# src/lib: pure, unit-tested logic

Isomorphic helpers with no side effects. Tests sit next to the code (`*.test.ts`, Vitest).

**Files:**
- `dates.ts`: ISO date helpers (`isIsoDate`, `isoToUtcDate`, `addDays`), `weekStart` (Monday of the ISO week), `weekDays` (Mon..Sun), and `localIsoDate` (today's local date as `YYYY-MM-DD`). Local day strings, no timezone drift.
- `numbers.ts`: `parseDecimal(raw, places = 1)` (comma or dot decimal separator), `parseInteger` (non-negative whole number), shared by validators.
- `workouts.ts`: `WORKOUT_TYPES`, `isWorkoutType`, `treadmillDistanceKm` (D3), `estimateTreadmillKcal` (ACSM walking/running, D4), `estimateStepsKcal` (D7), `sumBurned` (D10), `groupConsecutiveSets` (workout card grouping). `WORKOUT_TYPES` must match `workoutTypeEnum`.
- `balance.ts`: `KCAL_PER_KG` (7700, D3), `BASELINE_MULTIPLIER` (sedentary 1.2, D1), `baselineKcal`, `dayBalance` (eaten − (baseline + workouts + steps)), `weekBalance` (logged days only, D6), `balanceStatus` (deficit/surplus/even).
- `search.ts`: `normalizeForSearch`, `matchesQuery`. Case- and diacritics-insensitive, `ł` → `l`.
- `nutrition.ts`: `SEXES`, `ACTIVITY_LEVELS`, `ACTIVITY_MULTIPLIERS` (D5), `ageOn`, `calcBmr` (Mifflin-St Jeor, D1), `calcTdee`, `kcalFromMacros` (4/4/9).
- `validation/profile.ts`: `parseProfileForm(formData, today)` returns `{ ok, data }` or `{ ok: false, fieldErrors }`. Errors are stable codes (`PROFILE_ERROR_CODES`, e.g. `heightRange`), never strings (D7).
- `validation/foods.ts`: `parseFoodForm`, `validateFoodFields` (the rules shared with the JSON import), `normalizeFoodName`, `parseFoodId`, `FOOD_ERROR_CODES`. The `macros` pseudo-field carries the `macrosSum` error (protein + carbs + fat ≤ 100 g).
- `composite.ts`: `compositeNutrition` (per-100 g from ingredient grams and an optional final weight), `totalQuantity`, `wouldCreateCycle`, `dependentsInOrder` (recalculation order). No imports, so `src/db/seed.ts` can use it.
- `validation/composite-foods.ts`: `parseCompositeFoodForm` (fields `name`, `finalWeightG`, repeated `componentFoodId`/`componentQuantityG`), `COMPOSITE_FOOD_ERROR_CODES`. Row errors use the key `component.<index>`.
- `validation/food-imports.ts`: `parseFoodImport(text)` for the JSON import (`{ foods: [...] }`, a bare array or one object; max 100 items and 100 000 chars; same rules as the form; duplicate names in the file give `nameDuplicate`). Returns `{ ok, data: FoodInput[] }` or `{ ok: false, errors }` with `index`/`name`/`field`/`code`. `foodImportErrorKey` / `parseFoodImportErrorKey` map errors to `ActionResult` keys (`file`, `<index>`, `<index>.<field>`). Runs on the client for the preview and again in the action.
- `diary.ts`: `MEALS`, `isMeal`, `portionNutrition` (per-100 g to a grams snapshot), `sumNutrition`, `groupByMeal` (MEALS order, empty meals skipped), `defaultMeal`. `MEALS` must match `mealEnum`.
- `validation/diary.ts`: `parseDiaryEntryForm` (fields `date`, `meal`, `foodId`, `quantityG`), `DIARY_ENTRY_ERROR_CODES`.
- `utils.ts`: `cn()` (class merging).

**Rules:**
- Pure only: no I/O, no React, no `@/db`, no `server-only`.
- Enum values in `nutrition.ts` (`SEXES`, `ACTIVITY_LEVELS`) and `MEALS` in `diary.ts` must match `src/db/schema/enums.ts`.
- Validation lives here as Zod schemas or parsers, one file per feature under `validation/`.
- Every formula and parser gets a Vitest case, including boundary values.
- Code takes `today` as a parameter. It never calls `new Date()` itself.
- Relative imports or `@/lib/...` only. No imports from `features/`, `components/` or `server/`.
