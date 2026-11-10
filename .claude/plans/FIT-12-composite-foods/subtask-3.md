# 3. Server side: DAL, dish services with recalculation, Server Actions
**Decisions:** D1, D2, D3, D4, D5, D8, D9

Goal: read the ingredients, create and edit dishes, recalculate dependent dishes, and guard the plain-food writes. Follow the existing code in `src/server/dal/foods.ts`, `src/server/services/foods.ts` and `src/features/foods/actions.ts` exactly (same result shapes, `try/catch` + `console.error`, `updateTag("foods")` only after success).

Existing context:
- `foods` (`@/db/schema`): `id`, `name`, `kcal`, `proteinG`, `carbsG`, `fatG`, `isComposite` (boolean), `finalWeightG` (number | null), `archivedAt`, timestamps. `foodComponents`: `id`, `foodId` (cascade), `componentFoodId` (restrict), `quantityG`, timestamps.
- `@/lib/composite`: `compositeNutrition(portions: {kcal, proteinG, carbsG, fatG, quantityG}[], finalWeightG: number | null): Nutrition`, `wouldCreateCycle(parentId, componentIds, graph: Map<number, number[]>): boolean`, `dependentsInOrder(changedId, usedBy: Map<number, number[]>): number[]`.
- `@/lib/validation/composite-foods`: `parseCompositeFoodForm(formData)` → `{ ok: true; data: CompositeFoodInput } | { ok: false; fieldErrors }`, types `CompositeFoodInput = { name; finalWeightG: number | null; components: { foodId; quantityG }[] }`, `CompositeFoodErrorCode`.
- In `services/foods.ts`: private `type Tx` and `isNameTaken(tx, name, excludeId?)` already exist.

## 1. `src/server/dal/foods.ts` (modify)
```ts
export type FoodComponent = typeof foodComponents.$inferSelect;
/** Every dish ingredient row (tag "foods"), ordered by foodId, then id. The UI groups them by foodId. */
export async function listFoodComponents(): Promise<FoodComponent[]> {
  "use cache";
  cacheTag("foods");
  return db.select().from(foodComponents).orderBy(asc(foodComponents.foodId), asc(foodComponents.id));
}
```

## 2. `src/server/services/foods.ts` (modify)
New result type:
```ts
export type CompositeWriteResult =
  | { ok: true; food: Food }
  | { ok: false; reason: "nameTaken" | "notFound" | "componentUnavailable" | "componentCycle" | "finalWeightTooLow" };
```
Extend `FoodToggleResult` reasons with `"usedInComposite"`.

Private helper `recomputeDependents(tx: Tx, changedId: number): Promise<void>` (D4):
1. Load all `foods` (id, kcal, proteinG, carbsG, fatG, finalWeightG) into a `Map<number, row>`, and all `foodComponents` rows.
2. Build `usedBy: Map<componentFoodId, foodId[]>` and `byDish: Map<foodId, rows[]>`.
3. For each id in `dependentsInOrder(changedId, usedBy)`: compute `compositeNutrition(byDish.get(id).map(c => ({ ...foodMap.get(c.componentFoodId), quantityG: c.quantityG })), foodMap.get(id).finalWeightG)`, `tx.update(foods).set({ ...values, updatedAt: new Date() }).where(eq(foods.id, id))`, and write the new values back into `foodMap` so dishes later in the order see them. Archived dishes are recalculated too.

Private helper `loadComponentFoods(tx, ids)` → `tx.select().from(foods).where(inArray(foods.id, ids))`.

New exports:
```ts
/** D1, D9: creates a dish and its ingredient rows in one transaction. */
export async function createCompositeFood(input: CompositeFoodInput): Promise<CompositeWriteResult>;
/** D3, D4, D5, D8: replaces name, final weight and ingredients of an active dish, then recalculates dishes that use it. */
export async function updateCompositeFood(id: number, input: CompositeFoodInput): Promise<CompositeWriteResult>;
```
`createCompositeFood`, inside `db.transaction`:
1. `isNameTaken(tx, input.name)` → `nameTaken`.
2. Load the component foods. Any id missing, or any found row with `archivedAt !== null` (D5) → `componentUnavailable`.
3. `values = compositeNutrition(rows joined with input quantities, input.finalWeightG)`. If `values.proteinG + values.carbsG + values.fatG > 100` → `finalWeightTooLow` (D9).
4. Insert into `foods` `{ name, ...values, isComposite: true, finalWeightG: input.finalWeightG }` with `.returning()`, then insert the `foodComponents` rows. Return `{ ok: true, food }`.

`updateCompositeFood`, inside `db.transaction`:
1. Select the row `and(eq(foods.id, id), isNull(foods.archivedAt), eq(foods.isComposite, true))`. None → `notFound` (D8: a plain food can't be edited as a dish).
2. `isNameTaken(tx, input.name, id)` → `nameTaken`.
3. Load the current component ids of this dish. Load the component foods. Missing id → `componentUnavailable`. Archived id that is NOT among the current components → `componentUnavailable` (D5: keeping an archived ingredient is fine, adding one is not).
4. Build `graph: Map<foodId, componentFoodId[]>` from all `foodComponents` rows except this dish's rows. `wouldCreateCycle(id, input.components.map(c => c.foodId), graph)` → `componentCycle` (D3).
5. Compute the values as in create, with the same `finalWeightTooLow` check.
6. Update the `foods` row (`name`, values, `finalWeightG`, `updatedAt`), `tx.delete(foodComponents).where(eq(foodComponents.foodId, id))`, insert the new rows, then `await recomputeDependents(tx, id)`. Return the updated food.

Changes to existing functions:
- `updateFood`: add `eq(foods.isComposite, false)` to the update `where` (D8: a dish → `notFound`). After a successful update, `await recomputeDependents(tx, id)` (D4).
- `deleteFood`: after the diary check, check `foodComponents` where `componentFoodId = id` (limit 1) → `{ ok: false, reason: "usedInComposite" }` (D5). Deleting a dish itself removes its ingredient rows by FK cascade.
- `archiveFood` / `restoreFood`: unchanged (values don't change).

## 3. `src/lib/validation/foods.ts` (modify)
Append `"foodInComposite"` to `FOOD_ERROR_CODES`.

## 4. `src/messages/en.json` and `src/messages/pl.json` (modify)
Both files need the same keys (a test checks parity). Under `foods.errors` add `foodInComposite`, under `foods.toast` add `inComposite`:
- en: `"foodInComposite": "This food is an ingredient of a dish and can’t be deleted."`, `"inComposite": "“{name}” is an ingredient of a dish, so it can’t be deleted. It stays removed from the list."`
- pl: `"foodInComposite": "Ten produkt jest składnikiem dania i nie można go usunąć."`, `"inComposite": "„{name}” jest składnikiem dania, więc nie można go usunąć. Pozostaje usunięty z listy."`

## 5. `src/features/foods/actions.ts` (modify)
```ts
export type CompositeFoodFormState =
  | ActionResult<{ savedAt: number; mode: "created" | "updated" }, CompositeFoodErrorCode>
  | null;
/** useActionState action for the dish dialog. Hidden field "id": empty → create, else update. */
export async function saveCompositeFood(
  _prev: CompositeFoodFormState,
  formData: FormData,
): Promise<CompositeFoodFormState>;
```
Same flow as `saveFood`, with `parseCompositeFoodForm` and `createCompositeFood` / `updateCompositeFood`. Map the reasons to `{ ok: false, code: "validation", fieldErrors }`:
- `nameTaken` → `{ name: "nameTaken" }`
- `componentUnavailable` → `{ components: "componentUnavailable" }`, `componentCycle` → `{ components: "componentCycle" }`
- `finalWeightTooLow` → `{ finalWeightG: "finalWeightTooLow" }`
- `notFound` → `{ ok: false, code: "unexpected" }`
In `runToggle`, map `usedInComposite` → `{ ok: false, code: "validation", fieldErrors: { name: "foodInComposite" } }`.

## 6. `src/server/CLAUDE.md` (modify)
Update the `services/foods.ts` bullet: add `createCompositeFood` / `updateCompositeFood` (reasons `componentUnavailable`, `componentCycle`, `finalWeightTooLow`), and say that `updateFood`/`updateCompositeFood` recalculate every dish that uses the food (`recomputeDependents`, same transaction) and that `deleteFood` returns `usedInComposite` for an ingredient. Update the `dal/foods.ts` bullet: add `listFoodComponents()` (tag `foods`).

**Files:**
- Modify: `src/server/dal/foods.ts`: `FoodComponent`, `listFoodComponents`
- Modify: `src/server/services/foods.ts`: dish services, `recomputeDependents`, guards
- Modify: `src/lib/validation/foods.ts`: `foodInComposite` code
- Modify: `src/messages/en.json`, `src/messages/pl.json`: two keys each
- Modify: `src/features/foods/actions.ts`: `saveCompositeFood`, `usedInComposite` mapping
- Modify: `src/server/CLAUDE.md`: docs

**Read:** `src/server/dal/foods.ts`, `src/server/services/foods.ts`, `src/features/foods/actions.ts`, `src/db/schema/foods.ts`, `src/lib/composite.ts` (exports), `src/lib/validation/composite-foods.ts` (exports), `src/lib/validation/foods.ts:1-20`, `src/messages/en.json` (`foods.toast`, `foods.errors`), `src/server/CLAUDE.md`

**Verify:** `npx tsc --noEmit && npm run lint && npm test`
