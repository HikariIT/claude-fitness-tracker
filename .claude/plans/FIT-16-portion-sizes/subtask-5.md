# 5. Foods UI: portion editor, dish ingredient units, foods table, docs
**Decisions:** D2, D3, D5, D6, D7, D8, D9, D11, D12, D13, D14, D15

Goal: the food and dish dialogs get a "Portions" section, dish ingredients get a unit picker, and the foods table lists portions. The backend from subtask 3 already accepts the fields `portionName`/`portionGrams` (repeated) and, per ingredient, `componentFoodId`/`componentPortionId`/`componentAmount`. Error keys are `portions`, `portion.<i>`, `component.<i>`, `components`.

## Key types already available
```ts
// @/server/dal/foods
export type FoodPortion = { id: number; foodId: number; name: string; grams: number; sortOrder: number; ... };
export async function listFoodPortions(): Promise<FoodPortion[]>; // ordered by foodId, sortOrder
export type FoodComponent // now also has portionName: string | null; portionG: number | null; portionCount: number | null
// @/lib/portions
PORTION_MAX = 10; PORTION_NAME_MAX = 30; PORTION_COUNT_MIN = 0.1; PORTION_COUNT_MAX = 100;
portionGrams(count, grams); defaultPortion(portions); findPortionByName(portions, name)
// @/lib/validation/foods: FoodFormErrorField (= FoodErrorField | "portions" | `portion.${number}`)
// @/lib/validation/composite-foods: CompositeFoodErrorField (includes the portion keys)
// @/components/forms/PortionAmountInput
PortionAmountInput({ id, amountName, portionIdName, portions: {id, label}[], portionId, onPortionIdChange,
  amount, onAmountChange, gramsLabel, unitLabel, amountLabel?, computedGramsText?, invalid?, describedBy? })
```

## Steps
1. Create `src/features/foods/components/PortionsEditor.tsx` (client):
```tsx
export type PortionRow = { key: number; name: string; grams: string; placeholder?: boolean };
type PortionsEditorProps = {
  idPrefix: string;                                 // "food" | "dish"
  rows: PortionRow[];
  onChange: (rows: PortionRow[]) => void;
  rowError: (index: number) => string | undefined;  // translated error of `portion.${index}`
  listError?: string;                               // translated error of "portions"
};
```
   - A `<section className="grid">` with `<h3 className="text-sm font-medium leading-9">{t("portions.title")}</h3>` and a muted hint `t("portions.hint")` ("e.g. Tablespoon = 15 g").
   - One flex row per item: `Input` (name, `maxLength={PORTION_NAME_MAX}`, `aria-label={t("portions.name")}`), `NumberInput` (grams, `unit={t("units.g")}`, `w-32`, `aria-label={t("portions.grams")}`), and a ghost icon button with `X` (`aria-label={t("portions.remove")}`). The row error goes under it, like the ingredient rows in `CompositeFoodDialog`.
   - Input `name` attributes are `portionName` / `portionGrams`, **except** a row with `placeholder && grams.trim() === ""`, which renders without `name`s, so it is not submitted (D3). Editing a row's name clears `placeholder`.
   - An "Add portion" outline button (`Plus` icon, `t("portions.add")`) appends `{ key: nextKey, name: "", grams: "" }`. It is disabled when `rows.length >= PORTION_MAX`. `listError` is shown under the list as `role="alert"`.
   - Translations come from `useTranslations("foods")`.
2. `src/features/foods/components/FoodFormDialog.tsx`: props gain `portions: FoodPortion[]` (this food's rows only). The state is `rows` initialised from `portions.map((p, i) => ({ key: i, name: p.name, grams: String(p.grams) }))`, or `[]` for a new food. Render `PortionsEditor` (idPrefix "food") after the macros block. Type `fieldError` with `FoodFormErrorField`, and pass `rowError={(i) => fieldError(\`portion.${i}\`)}` and `listError={fieldError("portions")}`.
3. `src/features/foods/components/CompositeFoodDialog.tsx`: props gain `portions: FoodPortion[]` (all rows).
   - The dish's own portions: a new dish starts with `[{ key: 0, name: t("portions.defaultName"), grams: "", placeholder: true }]` (D2, D3). An existing dish starts from its own rows (`portions.filter(p => p.foodId === food.id)`), and gets no automatic row (D14). Render `PortionsEditor` (idPrefix "dish") before the final weight field. Wire the errors as in step 2.
   - Ingredient rows: `type CompositeRow = { foodId: number; portionId: number | null; amount: string }`. To initialise from the components, find the ingredient's portions; `match = findPortionByName(them, c.portionName)`. With a match → `{ portionId: match.id, amount: String(c.portionCount) }`. Otherwise → `{ portionId: null, amount: String(c.quantityG) }`. `addRow(foodId)`: `def = defaultPortion(portionsOf(foodId))`, then `{ portionId: def?.id ?? null, amount: def ? "1" : "100" }` (D7).
   - Replace the ingredient `NumberInput` with `PortionAmountInput`: `id={\`dish-quantity-${index}\`}`, `amountName="componentAmount"`, `portionIdName="componentPortionId"`, `portions` mapped to `{ id, label: t("portionOption", { name, grams }) }`, `gramsLabel={t("units.g")}`, `unitLabel={t("fields.unit")}`, `amountLabel={t("composite.quantity", { name: rowName })}`, `computedGramsText` = `t("computedGrams", { grams })` when a portion is chosen and the count parses (D13). Widen the container from `w-32` as needed (e.g. `w-auto`), while staying one line tall.
   - Preview and total weight: a row's grams are `portionGrams(count, portion.grams)` for a portion, else the parsed amount.
4. `src/features/foods/components/FoodsSection.tsx`: read `listFoodPortions()` too and pass `portions` to `FoodsView`.
5. `src/features/foods/components/FoodsView.tsx`: new prop `portions: FoodPortion[]`. Build `portionsByFood` with `useMemo` (a `Map<number, FoodPortion[]>`, input order kept). Pass `portions={dialogFood ? (portionsByFood.get(dialogFood.id) ?? []) : []}` to `FoodFormDialog`, `portions={portions}` to `CompositeFoodDialog`, and `portionsByFood` to `FoodsTable`.
6. `src/features/foods/components/FoodsTable.tsx`: new prop `portionsByFood: ReadonlyMap<number, FoodPortion[]>`.
   - Name cell (lines ~95–122): when the food has portions, add under the existing `inline-flex` span a `<span className="block text-xs font-normal leading-9 text-muted-foreground">` with `list.map(p => \`${p.name} ${num(p.grams)} ${t("units.g")}\`).join(" · ")` (D9).
   - Ingredient rows (line ~185): when `c.portionName !== null`, show `${ingredient?.name ?? "—"} · ${t("portionQuantity", { count: num(c.portionCount ?? 0), name: c.portionName, grams: num(c.quantityG) })}`. Otherwise keep the grams text.
7. Messages `foods` (both files, same keys):
   - `portions.title`: en "Portions", pl "Porcje". `portions.hint`: en "Named sizes, e.g. Tablespoon = 15 g.", pl "Nazwane miary, np. Łyżka = 15 g.". `portions.name`: en "Portion name", pl "Nazwa porcji". `portions.grams`: en "Portion weight", pl "Waga porcji". `portions.add`: en "Add portion", pl "Dodaj porcję". `portions.remove`: en "Remove portion", pl "Usuń porcję". `portions.defaultName`: en "Portion", pl "Porcja".
   - `fields.unit`: en "Unit", pl "Jednostka". `portionOption`: "{name} ({grams} g)". `computedGrams`: "= {grams} g". `portionQuantity`: "{count} × {name} ({grams} g)".
8. Docs:
   - `src/features/CLAUDE.md` (foods slice): mention `PortionsEditor` (portion rows in the food and dish dialogs, placeholder "Portion" row for new dishes), the ingredient unit picker (`PortionAmountInput`), `FoodsSection` reading `listFoodPortions`, and the planner `EntryFormDialog` unit picker.
   - `src/server/CLAUDE.md`: in the `services/foods.ts` bullets add that food and dish writes replace all `food_portions` of the food (order = `sortOrder`), and that dish ingredients given as a portion are resolved to grams plus a snapshot (`componentPortionUnavailable`, `componentGramsRange`). In the `services/diary.ts` bullet add the portion resolution (`portionUnavailable`, `quantityRange`) and the snapshot columns.

**Files:**
- Create: `src/features/foods/components/PortionsEditor.tsx`
- Modify: `src/features/foods/components/FoodFormDialog.tsx`, `CompositeFoodDialog.tsx`, `FoodsSection.tsx`, `FoodsView.tsx`, `FoodsTable.tsx`
- Modify: `src/messages/en.json`, `src/messages/pl.json`: `foods.*`
- Modify: `src/features/CLAUDE.md`, `src/server/CLAUDE.md`

**Read:** the files above, plus `src/components/forms/PortionAmountInput.tsx`, `src/lib/portions.ts`, `src/features/planner/components/EntryFormDialog.tsx` (how subtask 4 wired `PortionAmountInput`, as a pattern)

**Verify:** `npx tsc --noEmit && npm test && npm run lint && npm run build`
