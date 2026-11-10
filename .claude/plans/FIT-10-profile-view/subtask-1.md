# 1. Pure logic: nutrition formulas and profile validation
**Decisions:** D1, D4, D5, D6, D7, D9

Goal: add pure, tested functions for BMR/TDEE/age and a Zod parser for the profile form. `src/lib/` is pure: no React, no I/O, no `@/db` or `server-only` imports. Zod is v4 (`zod` 4.6.7): `import { z } from "zod"`.

## `src/lib/nutrition.ts`
```ts
export const SEXES = ["male", "female"] as const;
export const ACTIVITY_LEVELS = ["sedentary", "light", "moderate", "active", "very_active"] as const;
export type Sex = (typeof SEXES)[number];
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
};

/** Full years between birthDate and today (both "YYYY-MM-DD"). Uses string/number parts, no Date, no timezone. */
export function ageOn(birthDate: string, today: string): number;

/** Mifflin-St Jeor, kcal/day, not rounded. */
export function calcBmr(input: { sex: Sex; weightKg: number; heightCm: number; age: number }): number;

/** BMR × ACTIVITY_MULTIPLIERS[level], not rounded. */
export function calcTdee(bmr: number, level: ActivityLevel): number;
```
`ageOn`: `age = ty − by`, minus 1 if `(tm, td)` is before `(bm, bd)`. A Feb 29 birthday counts as passed on Mar 1 (so on Feb 28 of a non-leap year it is not yet passed).

## `src/lib/nutrition.test.ts` (Vitest, `import { describe, expect, it } from "vitest"`)
- `ageOn("1995-04-12", "2026-11-10")` → 31; `ageOn("1995-12-01", "2026-11-10")` → 30; birthday today → counts (`ageOn("2000-11-10","2026-11-10")` → 26); `ageOn("2000-02-29","2001-02-28")` → 0 and `("2000-02-29","2001-03-01")` → 1.
- `calcBmr({sex:"female", weightKg:62.5, heightCm:168, age:31})` → 1359 (`toBeCloseTo(1359, 5)`); `calcBmr({sex:"male", weightKg:80, heightCm:180, age:30})` → 1780.
- `calcTdee(1359, "moderate")` → 2106.45 (`toBeCloseTo(…, 2)`); `calcTdee(1000, "sedentary")` → 1200; every level is in `ACTIVITY_MULTIPLIERS` and the values strictly increase along `ACTIVITY_LEVELS`.

## `src/lib/validation/profile.ts`
```ts
import type { ActivityLevel, Sex } from "@/lib/nutrition";

export const PROFILE_FIELDS = ["sex","birthDate","heightCm","weightKg","activityLevel","kcalGoal","proteinGoalG"] as const;
export type ProfileField = (typeof PROFILE_FIELDS)[number];

export const PROFILE_ERROR_CODES = [
  "sexInvalid","birthDateInvalid","birthDateFuture","heightRange","weightRange",
  "activityInvalid","kcalGoalRange","proteinGoalRange",
] as const;
export type ProfileErrorCode = (typeof PROFILE_ERROR_CODES)[number];

export type ProfileInput = {
  sex: Sex; birthDate: string; heightCm: number; weightKg: number;
  activityLevel: ActivityLevel; kcalGoal: number; proteinGoalG: number | null;
};

export type ProfileParseResult =
  | { ok: true; data: ProfileInput }
  | { ok: false; fieldErrors: Partial<Record<ProfileField, ProfileErrorCode>> };

/** Reads the 7 fields from FormData (names equal ProfileField), validates per D6. `today` is "YYYY-MM-DD". */
export function parseProfileForm(formData: FormData, today: string): ProfileParseResult;
```
Rules (D6): each field's missing / empty / non-numeric / out-of-range value gives that field's code. `heightCm`/`weightKg` accept a comma or dot decimal separator (`"62,5"` → 62.5) and are rounded to 1 decimal. `kcalGoal` must be an integer (round non-integers is NOT allowed: reject with `kcalGoalRange`). `proteinGoalG`: empty string or missing → `null`; otherwise integer 0–500 else `proteinGoalRange`. `birthDate`: not a valid ISO date (use `isIsoDate` from `@/lib/dates`) or before `1900-01-01` → `birthDateInvalid`; after `today` (string comparison works for ISO dates) → `birthDateFuture`. `sex` / `activityLevel` must be in `SEXES` / `ACTIVITY_LEVELS`. Collect ALL field errors, not just the first. A hand-written parser is fine; Zod is optional. If you use Zod, keep the exported API above unchanged.

## `src/lib/validation/profile.test.ts`
Build a helper `form(overrides)` returning a `FormData` with valid defaults (`sex=female, birthDate=1995-04-12, heightCm=168, weightKg=62.5, activityLevel=moderate, kcalGoal=1800, proteinGoalG=110`). Cover: valid input parsed with correct types; `"62,5"` → 62.5; weight `"70.04"` → 70; empty protein → `null`; each range boundary accepted (100/250, 30/300, 800/10000, 0/500) and just outside rejected with the right code; `2026-02-30` → `birthDateInvalid`; future date → `birthDateFuture`; `1899-12-31` → `birthDateInvalid`; unknown sex / activity; several invalid fields at once return several codes; `kcalGoal=1800.5` → `kcalGoalRange`.

**Files:**
- Create: `src/lib/nutrition.ts`, `src/lib/nutrition.test.ts`
- Create: `src/lib/validation/profile.ts`, `src/lib/validation/profile.test.ts`

**Read:** `src/lib/dates.ts` (exports `isIsoDate`), `src/db/schema/enums.ts` (enum values must match `SEXES` / `ACTIVITY_LEVELS` exactly), `src/db/schema/settings.ts` (column types)

**Verify:** `npx tsc --noEmit && npm run lint && npm test`
