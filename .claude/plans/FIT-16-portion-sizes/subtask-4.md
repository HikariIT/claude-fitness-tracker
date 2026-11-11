# 4. Planner: portion units end to end
**Decisions:** D4, D6, D7, D9, D11, D13, D14, D15
**Status:** Done

**Notes:** `createDiaryEntry` also runs in a transaction now (needed to read the portion row in the same tx). `errors.quantityRange` text was already grams-based, so it is unchanged.

Goal: in the food planner the user picks grams or one of the food's portions and types an amount. The entry stores the grams plus a portion snapshot, and the table shows "2 × Łyżka (30 g)". Uses subtask 1 (`diary_entries.portionName/portionG/portionCount`, `listFoodPortions`), subtask 2 (`@/lib/portions`, `PortionAmountInput`).

## Key types already available
```ts
// @/lib/portions
export type PortionAmount = { kind: "grams"; quantityG: number } | { kind: "portion"; portionId: number; count: number };
export const NO_PORTION_SNAPSHOT; export function portionGrams(count: number, grams: number): number;
export function defaultPortion<T extends { sortOrder: number }>(p: readonly T[]): T | null;
export function findPortionByName<T extends { name: string }>(p: readonly T[], name: string | null): T | null;
export const PORTION_COUNT_MIN = 0.1, PORTION_COUNT_MAX = 100, QUANTITY_G_MIN = 0.1, QUANTITY_G_MAX = 5000;
// @/server/dal/foods
export type FoodPortion = { id; foodId; name: string; grams: number; sortOrder: number; ... };
export async function listFoodPortions(): Promise<FoodPortion[]>; // ordered by foodId, sortOrder
// @/components/forms/PortionAmountInput
PortionAmountInput({ id, amountName, portionIdName, portions: {id, label}[], portionId, onPortionIdChange,
  amount, onAmountChange, gramsLabel, unitLabel, amountLabel?, computedGramsText?, invalid?, describedBy? })
```

## Steps
1. `src/lib/validation/diary.ts`:
   - Codes: add `"portionUnavailable"` (bad id here; not this food's portion in the service) and `"portionCountRange"`. `"quantityRange"` stays (grams out of range, also used by the service when count × grams is out of range).
   - `DiaryEntryErrorField = "date" | "meal" | "foodId" | "portionId" | "amount"`.
   - `DiaryEntryInput = { date: string; meal: Meal; foodId: number; amount: PortionAmount }`.
   - Form fields: `date`, `meal`, `foodId`, `portionId` (missing or `""` = grams), `amount` (replaces `quantityG`). Grams: `parseDecimal(amount)` within 0.1–5000, else `amount: "quantityRange"`. Portion: `parseFoodId(portionId)` null gives `portionId: "portionUnavailable"`; the count must be within `PORTION_COUNT_MIN..PORTION_COUNT_MAX`, else `amount: "portionCountRange"`.
2. `src/lib/validation/diary.test.ts`: rename the `quantityG` field to `amount` and expect `amount: { kind: "grams", quantityG: 150 }`. Add a portion case, count bounds (0.1 / 100 ok, 0 / 100.1 error), and portion id `"abc"`.
3. `src/server/services/diary.ts`:
```ts
/** D4, D15: grams and snapshot for the input; the portion must belong to foodId. */
async function resolveAmount(tx: typeof db | Tx, foodId: number, amount: PortionAmount):
  Promise<{ ok: true; quantityG: number; snapshot: PortionSnapshot } | { ok: false; reason: "portionUnavailable" | "quantityRange" }>
```
   Grams → `{ quantityG, snapshot: NO_PORTION_SNAPSHOT }`. Portion → select the `foodPortions` row by id. If it is missing or `row.foodId !== foodId` → `portionUnavailable`. `quantityG = portionGrams(count, row.grams)` must be within `QUANTITY_G_MIN..QUANTITY_G_MAX`, else `quantityRange`. Snapshot = `{ portionName: row.name, portionG: row.grams, portionCount: count }`. Define `type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]`.
   `createDiaryEntry` / `updateDiaryEntry` call it after the food checks and write `quantityG`, the snapshot columns and `portionNutrition(food, quantityG)`. `DiaryWriteResult` reasons gain `"portionUnavailable" | "quantityRange"`.
4. `src/features/planner/actions.ts`: map `portionUnavailable` → `fieldErrors: { portionId: "portionUnavailable" }` and `quantityRange` → `fieldErrors: { amount: "quantityRange" }`.
5. `src/features/planner/components/PlannerSection.tsx`: also read `listFoodPortions()` in the `Promise.all`, and pass `portions` to `PlannerView`. `PlannerView.tsx`: new prop `portions: FoodPortion[]`, passed through to `EntryFormDialog`.
6. `src/features/planner/components/EntryFormDialog.tsx` (props gain `portions: FoodPortion[]`, all rows):
   - State: replace `grams` with `portionId: number | null` and `amount: string`. `foodPortions = portions.filter(p => p.foodId === foodId)` (already in sortOrder).
   - Initial state (D7): when editing, `match = findPortionByName(portionsOf(entry.foodId), entry.portionName)`. With a match → `portionId = match.id`, `amount = String(entry.portionCount)`. Otherwise → `null` and `String(entry.quantityG)` (D14: old entries and deleted portions fall back to grams). When adding → `null`, `""`.
   - Picking a food from the search: `def = defaultPortion(portionsOf(f.id))`, then `portionId = def?.id ?? null` and `amount = def ? "1" : ""`. "Change" keeps the current behaviour.
   - Effective grams for the preview: grams → `parseDecimal(amount)`. Portion → `portionGrams(count, portion.grams)` when the count parses within the count range. The preview shows only when the grams are within 0.1–5000.
   - Replace the quantity `FormField`/`NumberInput` with `FormField id="entry-amount" label={t("fields.amount")} error={amountError}` wrapping `PortionAmountInput` with `id="entry-amount"`, `amountName="amount"`, `portionIdName="portionId"`, `portions={foodPortions.map(p => ({ id: p.id, label: t("portionOption", { name: p.name, grams: formatOneDecimal(p.grams) }) }))}`, `gramsLabel={t("units.g")}`, `unitLabel={t("fields.unit")}`, `computedGramsText={grams !== null ? t("computedGrams", { grams: formatOneDecimal(grams) }) : undefined}`. Before a food is picked, pass `portions={[]}`.
   - Errors: `amountError = fieldError("amount")`. `portionError = fieldError("portionId")` goes in a `role="alert"` paragraph under the field, like `dateError`.
7. `src/features/planner/components/EntriesTable.tsx` (line ~82): when `entry.portionName !== null`, the quantity cell is `t("portionQuantity", { count: num(entry.portionCount ?? 0), name: entry.portionName, grams: num(entry.quantityG) })`. Otherwise keep `${num(entry.quantityG)} ${t("units.g")}` (D9, D14).
8. Messages `planner` (both files, same keys):
   - `fields.amount`: en "Amount", pl "Ilość". Remove `fields.quantityG` once nothing uses it (grep first).
   - `fields.unit`: en "Unit", pl "Jednostka".
   - `portionOption`: "{name} ({grams} g)" (both).
   - `computedGrams`: "= {grams} g" (both).
   - `portionQuantity`: "{count} × {name} ({grams} g)" (both).
   - `errors.portionUnavailable`: en "This portion no longer exists. Pick the unit again.", pl "Ta porcja już nie istnieje. Wybierz jednostkę ponownie."
   - `errors.portionCountRange`: en "Amount must be 0.1–100 portions.", pl "Ilość musi wynosić 0,1–100 porcji."
   - `errors.quantityRange`: make sure the text talks about the weight in grams (0.1–5000 g), since it now also covers count × portion.

**Files:**
- Modify: `src/lib/validation/diary.ts`, `src/lib/validation/diary.test.ts`
- Modify: `src/server/services/diary.ts`
- Modify: `src/features/planner/actions.ts`
- Modify: `src/features/planner/components/PlannerSection.tsx`, `PlannerView.tsx`, `EntryFormDialog.tsx`, `EntriesTable.tsx`
- Modify: `src/messages/en.json`, `src/messages/pl.json`: `planner.*`

**Read:** the files above, plus `src/lib/portions.ts`, `src/components/forms/PortionAmountInput.tsx`, `src/db/schema/diary.ts`, `src/server/dal/foods.ts` (`FoodPortion`, `listFoodPortions`)

**Verify:** `npx tsc --noEmit && npm test && npm run lint`
