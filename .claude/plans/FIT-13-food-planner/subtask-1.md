# 1. Pure logic: meals, portion nutrition, totals, local date, entry form validation
**Decisions:** D1, D3, D5, D6, D8, D10, D13

Add the pure, unit-tested helpers the planner needs. Everything goes in `src/lib/` and must stay pure: no I/O, no React, no `@/db`, no `server-only`, and no `new Date()` inside lib functions (take a `Date` or a `today` string as a parameter).

## `src/lib/diary.ts` (new)
```ts
/** Must match mealEnum in src/db/schema/enums.ts; this order is the display order (D5). */
export const MEALS = ["breakfast", "lunch", "dinner", "snack", "other"] as const;
export type Meal = (typeof MEALS)[number];
export function isMeal(value: string): value is Meal;

export type Nutrition = { kcal: number; proteinG: number; carbsG: number; fatG: number };

/** Snapshot for `quantityG` grams of a food whose values are per 100 g (D3). Each value is rounded to 2 decimals. */
export function portionNutrition(per100: Nutrition, quantityG: number): Nutrition;
// value = Math.round(per100.x * quantityG / 100 * 100) / 100  (matches round2 in src/db/seed.ts)

/** Sum of rows (D6). Each value is rounded to 2 decimals. Empty → all zeros. */
export function sumNutrition(rows: readonly Nutrition[]): Nutrition;

/** Groups entries by meal in MEALS order, skipping empty meals (D5). Entries in a group keep ascending `id` order (D13). */
export function groupByMeal<T extends { id: number; meal: Meal }>(entries: readonly T[]): { meal: Meal; entries: T[] }[];

/** Meal of the entry with the highest id, or "breakfast" when there are none (D5). */
export function defaultMeal(entries: readonly { id: number; meal: Meal }[]): Meal;
```

## `src/lib/dates.ts` (modify)
Add:
```ts
/** The local calendar date of `now` as "YYYY-MM-DD" (D2). Uses getFullYear/getMonth/getDate, not UTC. */
export function localIsoDate(now: Date): string;
```
It is the same logic as the inline code in `src/features/profile/components/ProfileSection.tsx` (padStart). Do not touch ProfileSection here.

## `src/lib/validation/diary.ts` (new)
Follow the shape of `src/lib/validation/composite-foods.ts` (`readString`, `inRange`, `{ ok, data } | { ok: false, fieldErrors }`, error codes, never strings).
```ts
export const DIARY_ENTRY_ERROR_CODES = [
  "dateInvalid",
  "mealInvalid",
  "foodRequired",
  "foodUnavailable", // service only: missing or archived food (D7)
  "quantityRange",
] as const;
export type DiaryEntryErrorCode = (typeof DIARY_ENTRY_ERROR_CODES)[number];
export type DiaryEntryErrorField = "date" | "meal" | "foodId" | "quantityG";
export type DiaryEntryInput = { date: string; meal: Meal; foodId: number; quantityG: number };
export type DiaryEntryParseResult =
  | { ok: true; data: DiaryEntryInput }
  | { ok: false; fieldErrors: Partial<Record<DiaryEntryErrorField, DiaryEntryErrorCode>> };

/** Reads form fields "date", "meal", "foodId", "quantityG". */
export function parseDiaryEntryForm(formData: FormData): DiaryEntryParseResult;
```
Rules:
- `date`: `isIsoDate` from `@/lib/dates`, otherwise `dateInvalid`. Any valid date, past or future (D10).
- `meal`: `isMeal`, otherwise `mealInvalid`.
- `foodId`: empty → `foodRequired`; non-empty but `parseFoodId(raw) === null` → `foodUnavailable`. Import `parseFoodId` from `@/lib/validation/foods` (signature: `parseFoodId(raw: unknown): number | null`, a positive safe integer from a string or a number).
- `quantityG`: `parseDecimal` from `@/lib/numbers` (comma or dot, rounds to 1 decimal, null if not numeric), and it must be in 0.1–5000 (D8), otherwise `quantityRange`.

## Tests (Vitest, next to the code)
- `src/lib/diary.test.ts`: `portionNutrition` (100 g = per100, 150 g, 0.1 g rounding), `sumNutrition` (empty, rounding), `groupByMeal` (MEALS order regardless of input order, empty meals skipped, id order within a group), `defaultMeal` (empty → breakfast, highest id wins over array order), `isMeal`.
- `src/lib/dates.test.ts` (modify): add `localIsoDate(new Date(2026, 0, 5, 23, 30))` → `"2026-01-05"`, plus month/day padding.
- `src/lib/validation/diary.test.ts`: valid input; comma decimal; boundaries 0.1 / 5000 OK, 0.04 / 5000.1 rejected (`parseDecimal` rounds to 1 decimal before the range check, so `"0.05"` becomes 0.1 and is accepted, the same as dish ingredient grams; add that as an accepted case); empty foodId → `foodRequired`; `"abc"` foodId → `foodUnavailable`; bad meal; bad date `2026-02-30`. Build inputs with `new FormData()` and `fd.set(...)`.

## Docs
In `src/lib/CLAUDE.md`, add bullets for `diary.ts` and `validation/diary.ts`, add `localIsoDate` to the `dates.ts` bullet, and extend the enum rule: "`MEALS` in `diary.ts` must match `mealEnum`".

**Files:**
- Create: `src/lib/diary.ts`: meals, portion/total nutrition, grouping, default meal
- Create: `src/lib/diary.test.ts`
- Create: `src/lib/validation/diary.ts`: `parseDiaryEntryForm`, error codes
- Create: `src/lib/validation/diary.test.ts`
- Modify: `src/lib/dates.ts`: add `localIsoDate`
- Modify: `src/lib/dates.test.ts`: cases for `localIsoDate`
- Modify: `src/lib/CLAUDE.md`: document the new files

**Read:** `src/lib/CLAUDE.md`, `src/lib/dates.ts`, `src/lib/validation/composite-foods.ts` (style template), `src/lib/validation/foods.ts:85-98` (`parseFoodId`), `src/lib/numbers.ts`, `src/db/schema/enums.ts` (`mealEnum`)

**Verify:** `npm test -- src/lib`