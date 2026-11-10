# 1. Pure logic: dish nutrition, cycle check, recompute order, dish form validation
**Decisions:** D2, D3, D4, D9

Goal: pure, unit-tested helpers that the schema seed, the services and the dialog will use. These files are in `src/lib/`, so they have **no imports from `@/db`, `server/`, `features/` or React**. `src/lib/composite.ts` must have **no imports at all**, because the seed script imports it.

## 1. `src/lib/composite.ts` (create)
```ts
/** Nutrition values per 100 g. */
export type Nutrition = { kcal: number; proteinG: number; carbsG: number; fatG: number };
/** One ingredient: its per-100 g values plus the grams used in the dish. */
export type ComponentPortion = Nutrition & { quantityG: number };

/** Sum of quantityG over all portions. */
export function totalQuantity(components: readonly ComponentPortion[]): number;

/**
 * Per-100 g values of a dish (D2).
 * absolute_x = Σ x_i · quantityG_i / 100; totalG = finalWeightG ?? totalQuantity(components);
 * result_x = absolute_x / totalG · 100, rounded to 2 decimals (Math.round(v * 100) / 100).
 * Empty list or totalG <= 0 → all zeros.
 */
export function compositeNutrition(
  components: readonly ComponentPortion[],
  finalWeightG: number | null,
): Nutrition;

/**
 * D3: true when `parentId` would (transitively) contain itself if its components were `componentIds`.
 * `graph` maps a dish id → its component ids, for every OTHER dish (the caller leaves out parentId's old edges).
 * Cycle if parentId ∈ componentIds, or parentId is reachable from any componentId by following `graph`.
 * Iterative DFS with a visited set. Ids missing from `graph` are plain foods (no children).
 */
export function wouldCreateCycle(
  parentId: number,
  componentIds: readonly number[],
  graph: ReadonlyMap<number, readonly number[]>,
): boolean;

/**
 * D4: ids of every dish that (transitively) contains `changedId`, in an order where each dish comes
 * AFTER every affected dish it contains, so recalculating them in this order uses fresh values.
 * `usedBy` maps a food id → ids of dishes that list it as a component.
 * Algorithm: DFS from changedId over usedBy, push to `post` in post-order, reverse `post`, drop changedId.
 * Each id appears once. Unknown changedId or no users → [].
 */
export function dependentsInOrder(
  changedId: number,
  usedBy: ReadonlyMap<number, readonly number[]>,
): number[];
```

## 2. `src/lib/composite.test.ts` (create)
Vitest, `import { describe, expect, it } from "vitest"`. Cases:
- `compositeNutrition`: Sos curry `{kcal 110, P 2, C 9.5, F 7}` × 150 g + Ryż `{kcal 130, P 2.7, C 28.2, F 0.3}` × 200 g, no final weight → kcal 121.43, proteinG 2.4, carbsG 20.17, fatG 3.17. With `finalWeightG = 300` → kcal 141.67. Empty list → zeros. A single ingredient with no final weight → same values as the ingredient.
- `totalQuantity`: 150 + 200 = 350.
- `wouldCreateCycle`: self (1, [1]) → true. Direct: graph {2: [1]}, (1, [2]) → true. Indirect: {2: [3], 3: [1]} → true. No cycle: {2: [3]}, (1, [2]) → false. Empty components → false.
- `dependentsInOrder`: chain 1 ← 2 ← 3 (usedBy {1: [2], 2: [3]}) → [2, 3]. Diamond: usedBy {1: [2, 3], 3: [2]} → 3 before 2, i.e. [3, 2]. No users → []. Each id only once.

## 3. `src/lib/validation/composite-foods.ts` (create)
Form contract (the dialog in subtask 4 sends exactly these fields):
- `name`: text.
- `finalWeightG`: text, may be empty.
- `componentFoodId`: repeated, one per ingredient row (read with `formData.getAll`).
- `componentQuantityG`: repeated, same order and count as `componentFoodId`.

```ts
import { parseDecimal } from "@/lib/numbers";
import { FOOD_NAME_MAX, parseFoodId } from "@/lib/validation/foods";

export const COMPOSITE_MAX_COMPONENTS = 30;
export const COMPOSITE_FOOD_ERROR_CODES = [
  "nameRequired",
  "nameTooLong",
  "nameTaken",            // service only
  "componentsRequired",
  "componentsTooMany",
  "componentDuplicate",
  "componentQuantityRange",
  "componentUnavailable", // bad id here; archived/missing food in the service
  "componentCycle",       // service only
  "finalWeightRange",
  "finalWeightTooLow",    // service only
] as const;
export type CompositeFoodErrorCode = (typeof COMPOSITE_FOOD_ERROR_CODES)[number];
/** "name" | "components" | "finalWeightG" | `component.${index}` (row index in submitted order). */
export type CompositeFoodErrorField = "name" | "components" | "finalWeightG" | `component.${number}`;

export type CompositeComponentInput = { foodId: number; quantityG: number };
export type CompositeFoodInput = {
  name: string;
  finalWeightG: number | null;
  components: CompositeComponentInput[];
};
export type CompositeFoodParseResult =
  | { ok: true; data: CompositeFoodInput }
  | { ok: false; fieldErrors: Partial<Record<CompositeFoodErrorField, CompositeFoodErrorCode>> };

export function parseCompositeFoodForm(formData: FormData): CompositeFoodParseResult;
```
Rules (D9), collect all errors then return:
- name: same as plain foods: `String(value).trim().replace(/\s+/g, " ")`. Empty → `name: "nameRequired"`. Longer than `FOOD_NAME_MAX` → `name: "nameTooLong"`.
- finalWeightG: trimmed empty (or missing) → `null`. Otherwise `parseDecimal`. null or outside 1–20000 → `finalWeightG: "finalWeightRange"`.
- components: `ids = formData.getAll("componentFoodId")`, `qs = formData.getAll("componentQuantityG")`. Non-string entries count as "".
  - lengths differ → `components: "componentUnavailable"`.
  - 0 rows → `components: "componentsRequired"`. More than 30 → `components: "componentsTooMany"`.
  - Any id where `parseFoodId` returns null → `components: "componentUnavailable"`.
  - Same id twice → `components: "componentDuplicate"`.
  - For each row i, `parseDecimal(q)` null or outside 0.1–5000 → `` `component.${i}` ``: `"componentQuantityRange"`.
- Only the first error on `components` is kept (check in the order listed above).

## 4. `src/lib/validation/composite-foods.test.ts` (create)
Build FormData with a helper (`fd.append("componentFoodId", "3")` per row). Cases: valid 2-row dish (comma decimal "150,5" → 150.5, finalWeightG "" → null), finalWeightG "300" → 300, finalWeightG "0" and "20001" → finalWeightRange, empty name, 101-char name, 0 rows, 31 rows, duplicate id, id "abc", quantity "0", "0.04" (rounds to 0), "5000.1" → `component.1` error on the second row, quantity "5000" ok, mismatched counts.

## 5. `src/lib/CLAUDE.md` (modify)
Under **Files**, add two bullets after `validation/foods.ts`:
- `composite.ts`: `compositeNutrition` (per-100 g from ingredient grams and an optional final weight), `totalQuantity`, `wouldCreateCycle`, `dependentsInOrder` (recalculation order). No imports, so `src/db/seed.ts` can use it.
- `validation/composite-foods.ts`: `parseCompositeFoodForm` (fields `name`, `finalWeightG`, repeated `componentFoodId`/`componentQuantityG`), `COMPOSITE_FOOD_ERROR_CODES`. Row errors use the key `component.<index>`.

**Files:**
- Create: `src/lib/composite.ts`: nutrition, cycle and order helpers
- Create: `src/lib/composite.test.ts`: tests
- Create: `src/lib/validation/composite-foods.ts`: `parseCompositeFoodForm` and error codes
- Create: `src/lib/validation/composite-foods.test.ts`: tests
- Modify: `src/lib/CLAUDE.md`: list the two new files

**Read:** `src/lib/numbers.ts`, `src/lib/validation/foods.ts` (exports `FOOD_NAME_MAX`, `parseFoodId`, and the name rules in `parseFoodForm`), `src/lib/validation/foods.test.ts` (test style), `src/lib/CLAUDE.md`

**Verify:** `npx tsc --noEmit && npm run lint && npm test -- src/lib`
