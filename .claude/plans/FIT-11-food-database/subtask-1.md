# 1. Pure logic: food validation, kcal from macros, search normalization
**Decisions:** D5, D6, D8

**Status:** Done

**Notes:** The plan's "protein `100` ok" case would hit `macrosSum` with the default carbs/fat, so the test zeroes carbs and fat for the protein boundary. `parseDecimal` now also trims before the comma replace.

Goal: add the pure, unit-tested helpers the foods view needs. Everything here lives in `src/lib/`. It must stay pure: no I/O, no React, no `@/db`, no `server-only`, and imports use relative paths or `@/lib/...` only. Tests use Vitest (`import { describe, expect, it } from "vitest"`) and sit next to the code.

## 1. Shared decimal parser: `src/lib/numbers.ts` (create)
Move the private `parseDecimal` out of `src/lib/validation/profile.ts` so both validators share it:
```ts
const DECIMAL = /^-?\d+(\.\d+)?$/;
/** Parses a decimal with a comma or dot separator and rounds it to 1 decimal. Returns null if not numeric. */
export function parseDecimal(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (!DECIMAL.test(normalized)) return null;
  return Math.round(Number(normalized) * 10) / 10;
}
```
In `src/lib/validation/profile.ts`, delete the local `parseDecimal` function and the `DECIMAL` constant, and add `import { parseDecimal } from "@/lib/numbers";`. Keep `INTEGER` and everything else exactly as it is. `src/lib/validation/profile.test.ts` must still pass unchanged.

`src/lib/numbers.test.ts` (create): `"12,5"` → 12.5, `"12.55"` → 12.6, `" 7 "` → 7, `"0"` → 0, `""` → null, `"abc"` → null, `"1e3"` → null, `"-3"` → -3.

## 2. Kcal from macros: `src/lib/nutrition.ts` (modify, append)
```ts
/** Atwater estimate: 4 kcal/g protein, 4 kcal/g carbs, 9 kcal/g fat, rounded to a whole kcal (D8). */
export function kcalFromMacros(m: { proteinG: number; carbsG: number; fatG: number }): number {
  return Math.round(4 * m.proteinG + 4 * m.carbsG + 9 * m.fatG);
}
```
Add cases to `src/lib/nutrition.test.ts` in a new `describe("kcalFromMacros")`: `{2.7, 28.2, 0.3}` → 126, all zeros → 0, `{0, 0, 100}` → 900.

## 3. Search: `src/lib/search.ts` (create)
```ts
/** Lowercases, strips diacritics (NFD + remove U+0300–U+036F), maps "ł"→"l", trims and collapses whitespace. */
export function normalizeForSearch(text: string): string;
/** True when the normalized query is empty or a substring of the normalized name (D5). */
export function matchesQuery(name: string, query: string): boolean;
```
Note: `ł`/`Ł` do not decompose under NFD, so replace them explicitly (after lowercasing, `ł` → `l`).

`src/lib/search.test.ts` (create): `normalizeForSearch("  Jabłko  Zielone ")` → `"jablko zielone"`, `"Żółć"` → `"zolc"`, `"ĄĘŚĆŃ"` → `"aescn"`. `matchesQuery("Jabłko", "jablko")` true, `matchesQuery("Pierś z kurczaka", "KURCZ")` true, `matchesQuery("Ryż", "")` true, `matchesQuery("Ryż", "   ")` true, `matchesQuery("Ryż", "owies")` false.

## 4. Food validation: `src/lib/validation/foods.ts` (create)
Follow the shape of `parseProfileForm` (codes, not strings; field names equal FormData names).
```ts
export const FOOD_FIELDS = ["name", "kcal", "proteinG", "carbsG", "fatG"] as const;
export type FoodField = (typeof FOOD_FIELDS)[number];
/** Fields an error can attach to; "macros" is the combined protein + carbs + fat row. */
export type FoodErrorField = FoodField | "macros";

export const FOOD_ERROR_CODES = [
  "nameRequired", "nameTooLong", "nameTaken",
  "kcalRange", "proteinRange", "carbsRange", "fatRange", "macrosSum",
] as const;
export type FoodErrorCode = (typeof FOOD_ERROR_CODES)[number];

export const FOOD_NAME_MAX = 100;

export type FoodInput = { name: string; kcal: number; proteinG: number; carbsG: number; fatG: number };

export type FoodParseResult =
  | { ok: true; data: FoodInput }
  | { ok: false; fieldErrors: Partial<Record<FoodErrorField, FoodErrorCode>> };

/** Reads the 5 fields from FormData and validates them per D6. Never produces "nameTaken" (the service does). */
export function parseFoodForm(formData: FormData): FoodParseResult;

/** A positive safe integer id from a string ("12") or a number, else null. Empty string → null. */
export function parseFoodId(raw: unknown): number | null;
```
Rules (D6):
- `name`: trim, then collapse inner runs of whitespace into one space. Empty → `nameRequired`; longer than `FOOD_NAME_MAX` → `nameTooLong`.
- `kcal`: `parseDecimal`; null or outside 0–900 → `kcalRange`.
- `proteinG` / `carbsG` / `fatG`: `parseDecimal`; null or outside 0–100 → `proteinRange` / `carbsRange` / `fatRange`.
- Only when all three macros are individually valid: if `proteinG + carbsG + fatG > 100` (compare after rounding: use `Math.round((p + c + f) * 10) / 10 > 100`), set `fieldErrors.macros = "macrosSum"`.
- Missing FormData fields count as `""`.

`src/lib/validation/foods.test.ts` (create): build FormData with a helper. Cover: a valid case (`"  Ryż   gotowany "`, `"130"`, `"2,7"`, `"28.2"`, `"0.3"` → name `"Ryż gotowany"`, numbers 130 / 2.7 / 28.2 / 0.3); empty name; 101-char name (100 chars passes); kcal `-1`, `900` ok, `900.1` error, `"abc"` error; protein `100` ok, `100.1` error; sum `50 + 30 + 20` ok, `50 + 30 + 20.1` → `macros: "macrosSum"`; an invalid fat plus a large sum → only `fatRange` (no `macrosSum`). `parseFoodId`: `"12"` → 12, `12` → 12, `"0"`, `"-1"`, `"1.5"`, `""`, `null`, `"abc"` → null.

**Files:**
- Create: `src/lib/numbers.ts`, `src/lib/numbers.test.ts`: shared `parseDecimal`
- Create: `src/lib/search.ts`, `src/lib/search.test.ts`: `normalizeForSearch`, `matchesQuery`
- Create: `src/lib/validation/foods.ts`, `src/lib/validation/foods.test.ts`: `parseFoodForm`, `parseFoodId`, codes and types
- Modify: `src/lib/validation/profile.ts`: import `parseDecimal` from `@/lib/numbers`, remove the local copy and `DECIMAL`
- Modify: `src/lib/nutrition.ts`, `src/lib/nutrition.test.ts`: add `kcalFromMacros` and its tests

**Read:** `src/lib/validation/profile.ts` (pattern to follow), `src/lib/nutrition.ts`, `src/lib/nutrition.test.ts` (test style), `src/lib/CLAUDE.md`

**Verify:** `npx tsc --noEmit && npm run lint && npm test`
