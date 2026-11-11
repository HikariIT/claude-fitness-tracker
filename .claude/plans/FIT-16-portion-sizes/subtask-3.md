# 3. Foods backend: validators, service, actions
**Decisions:** D1, D2, D5, D6, D12, D15

Goal: saving a food or dish also saves its portions, and dish ingredients can be entered as a portion count, which is stored with a snapshot. UI stays as is apart from one renamed field (subtask 5 builds the UI). Uses `src/lib/portions.ts` and `src/lib/validation/portions.ts` from subtask 2, and the `foodPortions` table plus the new `food_components` columns (`portionName`, `portionG`, `portionCount`) from subtask 1.

## Key types already available
```ts
// @/lib/portions
export type PortionAmount = { kind: "grams"; quantityG: number } | { kind: "portion"; portionId: number; count: number };
export const NO_PORTION_SNAPSHOT; export function portionGrams(count: number, grams: number): number;
export const PORTION_COUNT_MIN = 0.1, PORTION_COUNT_MAX = 100, QUANTITY_G_MIN = 0.1, QUANTITY_G_MAX = 5000;
// @/lib/validation/portions
export const PORTION_ERROR_CODES; export type PortionErrorCode; export type PortionErrorField = "portions" | `portion.${number}`;
export type PortionInput = { name: string; grams: number };
export function parsePortionsForm(formData: FormData): { ok: true; data: PortionInput[] } | { ok: false; fieldErrors: Partial<Record<PortionErrorField, PortionErrorCode>> };
// @/db/schema
foodPortions: { id, foodId, name, grams, sortOrder, createdAt, updatedAt }
```

## Steps
1. `src/lib/validation/foods.ts`: keep `FOOD_ERROR_CODES`, `FoodErrorCode`, `FoodErrorField`, `FoodInput`, `validateFoodFields` **unchanged** (the JSON import uses them, and D10 keeps it grams-only). Add:
```ts
export type FoodFormInput = FoodInput & { portions: PortionInput[] };
export type FoodFormErrorCode = FoodErrorCode | PortionErrorCode;
export type FoodFormErrorField = FoodErrorField | PortionErrorField;
export type FoodFormParseResult =
  | { ok: true; data: FoodFormInput }
  | { ok: false; fieldErrors: Partial<Record<FoodFormErrorField, FoodFormErrorCode>> };
```
   `parseFoodForm(formData)` now returns `FoodFormParseResult`. It runs `validateFoodFields` and `parsePortionsForm`, merges both error maps, and returns `{ ...base.data, portions }` when both pass.
2. `src/lib/validation/foods.test.ts`: existing `parseFoodForm` expectations gain `portions: []`. Add one case with two portion rows, and one case where a field error and a portion error are both reported.
3. `src/lib/validation/composite-foods.ts`:
   - Codes: append `"componentPortionCountRange"`, `"componentPortionUnavailable"` (bad id here; missing or another food's portion in the service), `"componentGramsRange"` (service: count × grams outside 0.1–5000), then `...PORTION_ERROR_CODES`.
   - `CompositeFoodErrorField` also includes `PortionErrorField`.
   - `CompositeComponentInput = { foodId: number; amount: PortionAmount }`. `CompositeFoodInput` gains `portions: PortionInput[]` (the dish's own portions, D2).
   - Form fields per ingredient row are now repeated `componentFoodId`, `componentPortionId` (`""` = grams) and `componentAmount` (it replaces `componentQuantityG`). If no `componentPortionId` values were sent at all, treat every row as grams. Otherwise its length must equal the ids' length, else `components: "componentUnavailable"` (same as an ids/amounts length mismatch).
   - Per row `i`: grams → `parseDecimal(amount)` within 0.1–5000, else `component.${i}: "componentQuantityRange"`. Portion → `parseFoodId(portionIdRaw)` null gives `component.${i}: "componentPortionUnavailable"`; otherwise the count must be within `PORTION_COUNT_MIN..PORTION_COUNT_MAX`, else `component.${i}: "componentPortionCountRange"`.
   - Keep every existing rule (name, final weight, required, too many, duplicates). Merge the `parsePortionsForm(formData)` errors in.
4. `src/lib/validation/composite-foods.test.ts`: the `form()` helper appends `componentAmount` (and `componentPortionId` when a row has `portionId`). Expected data becomes `{ foodId: 3, amount: { kind: "grams", quantityG: 150.5 } }` plus `portions: []`. Add cases for a portion row (`{ kind: "portion", portionId: 7, count: 0.5 }`), a count of 0 and 100.1 (`componentPortionCountRange`), portion id `"x"` (`componentPortionUnavailable`), a missing `componentPortionId` list (all grams), and a mismatched `componentPortionId` length.
5. `src/server/services/foods.ts`:
   - `createFood(input: FoodFormInput)` / `updateFood(id, input: FoodFormInput)`: write only `{ name, kcal, proteinG, carbsG, fatG }` to `foods` (take `portions` out first), then call a new helper in the same transaction:
```ts
/** D1: replaces all portions of a food, keeping the submitted order as sortOrder. */
async function replacePortions(tx: Tx, foodId: number, portions: PortionInput[]): Promise<void>
// delete from foodPortions where foodId; if portions.length > 0 insert { foodId, name, grams, sortOrder: index }
```
     In `updateFood`, call it only after the update returned a row. `importFoods` is unchanged.
   - New helper used by both dish writes, after the ingredient foods are loaded and checked:
```ts
type ResolvedComponent = { foodId: number; quantityG: number } & PortionSnapshot;
async function resolveComponents(tx: Tx, components: CompositeComponentInput[]):
  Promise<{ ok: true; rows: ResolvedComponent[] } | { ok: false; reason: "componentPortionUnavailable" | "componentGramsRange" }>
```
     Grams rows → `{ foodId, quantityG, ...NO_PORTION_SNAPSHOT }`. Portion rows load `foodPortions` where `inArray(id, portionIds)` (one query). The portion must exist and have `foodId === component.foodId`, else `componentPortionUnavailable`. `quantityG = portionGrams(count, portion.grams)` must be within `QUANTITY_G_MIN..QUANTITY_G_MAX`, else `componentGramsRange`. The snapshot is `{ portionName: portion.name, portionG: portion.grams, portionCount: count }` (D5).
   - `createCompositeFood` / `updateCompositeFood`: use the resolved `quantityG` for `compositeNutrition`, insert `food_components` rows with the three snapshot columns, then `replacePortions(tx, dishId, input.portions)`. Add `"componentPortionUnavailable" | "componentGramsRange"` to the `CompositeWriteResult` reasons. `recomputeDependents` is unchanged (it reads `quantityG`).
6. `src/features/foods/actions.ts`: `FoodFormState` uses `FoodFormErrorCode`. `saveCompositeFood` maps the two new reasons to `{ ok: false, code: "validation", fieldErrors: { components: <reason> } }`. `FoodRowActionResult` stays `FoodErrorCode`.
7. Messages (`foods.errors`, same keys in both files; `npm test` checks parity):
   - en: `portionsTooMany` "Up to 10 portions.", `portionsInvalid` "Portion list is invalid.", `portionNameRequired` "Enter a portion name.", `portionNameTooLong` "Portion name can have up to 30 characters.", `portionGramsRange` "Portion weight must be 0.1–5000 g.", `portionDuplicate` "This portion name is already used.", `componentPortionCountRange` "Amount must be 0.1–100 portions.", `componentPortionUnavailable` "This portion no longer exists. Pick the unit again.", `componentGramsRange` "An ingredient's weight must be 0.1–5000 g."
   - pl: `portionsTooMany` "Maksymalnie 10 porcji.", `portionsInvalid` "Lista porcji jest nieprawidłowa.", `portionNameRequired` "Podaj nazwę porcji.", `portionNameTooLong` "Nazwa porcji może mieć do 30 znaków.", `portionGramsRange` "Waga porcji musi wynosić 0,1–5000 g.", `portionDuplicate` "Ta nazwa porcji już istnieje.", `componentPortionCountRange` "Ilość musi wynosić 0,1–100 porcji.", `componentPortionUnavailable` "Ta porcja już nie istnieje. Wybierz jednostkę ponownie.", `componentGramsRange` "Waga składnika musi wynosić 0,1–5000 g."
8. `src/features/foods/components/CompositeFoodDialog.tsx`: only rename the ingredient `NumberInput` prop `name="componentQuantityG"` to `name="componentAmount"` (line ~255), so dishes keep saving as grams until subtask 5.

**Files:**
- Modify: `src/lib/validation/foods.ts`, `src/lib/validation/foods.test.ts`
- Modify: `src/lib/validation/composite-foods.ts`, `src/lib/validation/composite-foods.test.ts`
- Modify: `src/server/services/foods.ts`: portions replace, component resolution and snapshot
- Modify: `src/features/foods/actions.ts`: error types and reason mapping
- Modify: `src/messages/en.json`, `src/messages/pl.json`: `foods.errors.*`
- Modify: `src/features/foods/components/CompositeFoodDialog.tsx`: field rename only

**Read:** the files above, plus `src/lib/portions.ts`, `src/lib/validation/portions.ts`, `src/db/schema/foods.ts` (`foodPortions`, `foodComponents`)

**Verify:** `npx tsc --noEmit && npm test && npm run lint`
