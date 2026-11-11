# 1. Week date helpers and pure balance helpers
**Decisions:** D1, D2, D3, D4, D5, D6

Add the pure logic the balance view uses. There is no UI, DB or server code in this subtask. `lib/` rules: no I/O, no React, no `@/db`, no `server-only`, never call `new Date()`. Every formula gets a Vitest case.

## Dates: `src/lib/dates.ts` (modify)
The file already exports `isIsoDate(value)`, `isoToUtcDate(iso): Date` (UTC midnight, throws `RangeError` on an invalid date), `addDays(iso, days): string` and `localIsoDate(now)`. Add, reusing `isoToUtcDate` and `addDays`:
```ts
/** D5: the Monday of the ISO week containing `iso` ("YYYY-MM-DD"). Monday maps to itself, Sunday to the Monday 6 days earlier. */
export function weekStart(iso: string): string; // offset = (isoToUtcDate(iso).getUTCDay() + 6) % 7; return addDays(iso, -offset)

/** D5: the 7 dates Monday..Sunday of the week containing `iso`. */
export function weekDays(iso: string): string[]; // Array.from({ length: 7 }, (_, i) => addDays(weekStart(iso), i))
```
Tests in `src/lib/dates.test.ts` (extend the existing file, same style):
- `weekStart("2026-11-11")` (a Wednesday) → `"2026-11-09"`; Monday `"2026-11-09"` → itself; Sunday `"2026-11-15"` → `"2026-11-09"`.
- Across a month/year boundary: `weekStart("2027-01-01")` (Friday) → `"2026-12-28"`.
- `weekDays("2026-11-11")` → `["2026-11-09", …, "2026-11-15"]` (length 7, last is the Sunday).

## Balance: `src/lib/balance.ts` (new)
Existing helpers to import:
- `src/lib/nutrition.ts`: `type Sex`, `ageOn(birthDate: string, today: string): number`, `calcBmr({ sex, weightKg, heightCm, age }): number` (not rounded), `ACTIVITY_MULTIPLIERS` (`sedentary: 1.2`).
- `src/lib/workouts.ts`: `sumBurned(workouts: readonly { kcalBurned: number | null }[], steps: { kcal: number } | null): { workouts; steps; total }`.

```ts
/** D3: kcal in 1 kg of body fat. */
export const KCAL_PER_KG = 7700;

/** D1: the baseline always uses the sedentary multiplier, not the profile activity level. */
export const BASELINE_MULTIPLIER = ACTIVITY_MULTIPLIERS.sedentary;

/** D2: the current profile fields the balance needs (a subset of the settings row). */
export type BalanceProfile = { sex: Sex; birthDate: string; heightCm: number; weightKg: number };

/** D1, D2: calcBmr with age = ageOn(birthDate, date), × BASELINE_MULTIPLIER. Not rounded. */
export function baselineKcal(profile: BalanceProfile, date: string): number;

export type DayBalance = {
  date: string;              // YYYY-MM-DD
  logged: boolean;           // D6: true when the day has at least one diary entry
  eatenKcal: number;         // sum of diary entry kcal
  baselineKcal: number;      // D1
  burnedKcal: number;        // sumBurned(workouts, steps).total
  expenditureKcal: number;   // baselineKcal + burnedKcal
  balanceKcal: number;       // D4: eatenKcal − expenditureKcal
  weightChangeKg: number;    // D3: balanceKcal / KCAL_PER_KG (negative = loss)
};

/** Computes one day. Values are not rounded; the UI formats them. Numbers are computed even when not logged. */
export function dayBalance(input: {
  date: string;
  profile: BalanceProfile;
  diary: readonly { kcal: number }[];
  workouts: readonly { kcalBurned: number | null }[];
  steps: { kcal: number } | null;
}): DayBalance;

export type WeekBalance = {
  loggedDays: number;        // D6
  eatenKcal: number;
  expenditureKcal: number;
  balanceKcal: number;
  weightChangeKg: number;    // balanceKcal / KCAL_PER_KG
};

/** D6: sums only the days with logged === true. With no logged days, every number is 0. */
export function weekBalance(days: readonly DayBalance[]): WeekBalance;

export type BalanceStatus = "deficit" | "surplus" | "even";

/** D4: by the value rounded to a whole kcal: < 0 deficit, > 0 surplus, 0 even (so −0.4 is "even"). */
export function balanceStatus(balanceKcal: number): BalanceStatus;
```

## Tests: `src/lib/balance.test.ts` (new)
Vitest (`import { describe, expect, it } from "vitest"`). Use a profile `{ sex: "male", birthDate: "1990-06-15", heightCm: 180, weightKg: 80 }`.
- `baselineKcal(profile, "2026-11-11")`: age 36, BMR = 800 + 1125 − 180 + 5 = 1750, × 1.2 = 2100.
- Age changes on the birthday: `baselineKcal(profile, "2026-06-14")` (age 35) is 6 more than on `"2026-06-15"` (age 36), i.e. 5 × 1.2.
- Female: same numbers with `sex: "female"` give (1750 − 166) × 1.2.
- `dayBalance` with diary `[{ kcal: 600 }, { kcal: 1100.5 }]`, workouts `[{ kcalBurned: 300 }, { kcalBurned: null }]`, steps `{ kcal: 200 }` on `"2026-11-11"`: `eatenKcal 1700.5`, `burnedKcal 500`, `expenditureKcal 2600`, `balanceKcal −899.5`, `weightChangeKg` ≈ −899.5 / 7700 (`toBeCloseTo`), `logged true`.
- Empty diary → `logged false`, `eatenKcal 0`; `steps null` and no workouts → `burnedKcal 0`.
- `weekBalance` of 3 days where one is not logged sums only the 2 logged days and gives `loggedDays 2`; `weekBalance([])` and all-unlogged give all zeros.
- `balanceStatus(-1) === "deficit"`, `balanceStatus(1) === "surplus"`, `balanceStatus(0)`, `balanceStatus(-0.4)` and `balanceStatus(0.4)` are `"even"`.

## Docs: `src/lib/CLAUDE.md`
- In the `dates.ts` bullet, add `weekStart` (Monday of the week) and `weekDays` (Mon..Sun).
- Add a bullet after `workouts.ts`: `balance.ts`: `KCAL_PER_KG` (7700, D3), `BASELINE_MULTIPLIER` (sedentary 1.2, D1), `baselineKcal`, `dayBalance` (eaten − (baseline + workouts + steps)), `weekBalance` (logged days only, D6), `balanceStatus`.

**Files:**
- Modify: `src/lib/dates.ts`: add `weekStart`, `weekDays`
- Modify: `src/lib/dates.test.ts`: week tests
- Create: `src/lib/balance.ts`: balance helpers above
- Create: `src/lib/balance.test.ts`: tests above
- Modify: `src/lib/CLAUDE.md`: dates and balance bullets

**Read:** `src/lib/dates.ts`, `src/lib/dates.test.ts`, `src/lib/nutrition.ts`, `src/lib/workouts.ts:40-55` (`sumBurned`), `src/lib/CLAUDE.md`

**Verify:** `npx tsc --noEmit && npm test -- src/lib`
