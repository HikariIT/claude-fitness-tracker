# 4. PL/EN message keys and the dish dialog
**Decisions:** D2, D5, D6, D7, D9

Goal: all new UI strings, and the add/edit dish dialog. No raw UI strings: every label comes from `useTranslations("foods")`. Copy the structure and styling of `src/features/foods/components/FoodFormDialog.tsx` (Dialog wrapper + inner form that remounts on open, `useActionState`, `handledRef` effect, `FormField`, `NumberInput`, `SubmitButton`, `DialogFooter`). Every row must stay one ruled line tall (`h-9` / `leading-9`), as in the existing dialog.

## 1. Message keys (modify `src/messages/en.json` and `src/messages/pl.json`)
Both files get the same keys (a test checks parity and no empty strings). `src/global.d.ts` types message keys from `pl.json`, so missing keys fail `tsc`. Inside `"foods"`:
- `actions`: add `addComposite` (en "Add dish", pl "Dodaj danie"), `removeComponent` (en "Remove ingredient", pl "Usuń składnik"), `showComponents` (en "Show ingredients of {name}", pl "Pokaż składniki: {name}"), `hideComponents` (en "Hide ingredients of {name}", pl "Ukryj składniki: {name}").
- `compositeBadge`: en "Dish", pl "Danie".
- New object `composite`:
  | key | en | pl |
  |---|---|---|
  | `addTitle` | Add dish | Dodaj danie |
  | `editTitle` | Edit dish | Edytuj danie |
  | `description` | Made from other foods. Values per 100 g are calculated from the ingredients. | Danie z innych produktów. Wartości na 100 g są liczone ze składników. |
  | `components` | Ingredients | Składniki |
  | `searchLabel` | Add ingredient | Dodaj składnik |
  | `searchPlaceholder` | Search foods… | Szukaj produktów… |
  | `noMatches` | No matching foods. | Brak pasujących produktów. |
  | `quantity` | Amount of {name} | Ilość: {name} |
  | `emptyComponents` | No ingredients yet. Search above to add one. | Brak składników. Wyszukaj produkt powyżej, aby go dodać. |
  | `totalWeight` | Ingredients weight: {grams} g | Waga składników: {grams} g |
  | `finalWeightG` | Final weight after cooking (optional) | Waga po ugotowaniu (opcjonalnie) |
  | `finalWeightHint` | Leave empty to use the ingredients weight. | Zostaw puste, aby użyć wagi składników. |
  | `preview` | Per 100 g: {kcal} kcal · protein {proteinG} g · carbs {carbsG} g · fat {fatG} g | Na 100 g: {kcal} kcal · białko {proteinG} g · węglowodany {carbsG} g · tłuszcz {fatG} g |
  | `editHint` | Dishes that use this dish are recalculated. Days already logged keep their values. | Dania, które zawierają to danie, zostaną przeliczone. Zapisane dni zachowują swoje wartości. |
- `toast`: add `dishCreated` (en "Dish added", pl "Danie dodane"), `dishUpdated` (en "Dish saved", pl "Danie zapisane").
- `errors`: add
  | key | en | pl |
  |---|---|---|
  | `componentsRequired` | Add at least one ingredient. | Dodaj co najmniej jeden składnik. |
  | `componentsTooMany` | Use at most 30 ingredients. | Użyj najwyżej 30 składników. |
  | `componentDuplicate` | Each food can be added only once. | Każdy produkt można dodać tylko raz. |
  | `componentQuantityRange` | Enter an amount from 0.1 to 5000 g. | Podaj ilość od 0,1 do 5000 g. |
  | `componentUnavailable` | An ingredient is no longer available. Remove it and try again. | Jeden ze składników jest niedostępny. Usuń go i spróbuj ponownie. |
  | `componentCycle` | A dish can’t contain itself, directly or through another dish. | Danie nie może zawierać samego siebie, ani bezpośrednio, ani przez inne danie. |
  | `finalWeightRange` | Enter a weight from 1 to 20000 g. | Podaj wagę od 1 do 20000 g. |
  | `finalWeightTooLow` | The final weight is too low for these ingredients. | Waga końcowa jest za mała dla tych składników. |

The keys `nameRequired`, `nameTooLong`, `nameTaken` already exist and are reused. Use the Polish quotes „…” in pl, as the file already does.

## 2. `src/features/foods/components/CompositeFoodDialog.tsx` (create)
`"use client"`. Exports:
```ts
type CompositeFoodDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  food: Food | null;             // null = add, else edit this dish (food.isComposite === true)
  foods: Food[];                 // all foods, archived included (for names and the picker)
  components: FoodComponent[];   // all ingredient rows; filter by foodId === food.id
};
export function CompositeFoodDialog(props: CompositeFoodDialogProps): JSX.Element;
```
Imports: `Food`, `FoodComponent` types from `@/server/dal/foods`; `saveCompositeFood`, `CompositeFoodFormState` from `@/features/foods/actions`; `compositeNutrition`, `totalQuantity` from `@/lib/composite`; `parseDecimal` from `@/lib/numbers`; `matchesQuery` from `@/lib/search`; `CompositeFoodErrorField` from `@/lib/validation/composite-foods`; UI from `@/components/forms/*` and `@/components/ui/*` (`Badge`, `Button`, `Input`, `Dialog*`); icons `Plus`, `X` from `lucide-react`.

Inner form behaviour:
- State: `name`, `finalWeightG` (string, from `food.finalWeightG ?? ""`), `rows: { foodId: number; quantity: string }[]` (initially this dish's `components`, `quantity: String(c.quantityG)`), `query`.
- `foodsById = new Map(foods.map(f => [f.id, f]))`.
- Hidden `<input name="id" value={food?.id ?? ""} />`.
- Name field like `FoodFormDialog` (`id="dish-name"`, `name="name"`, `maxLength={100}`, `autoFocus`).
- **Ingredient search** (D6): `Input type="search"` with `aria-label={t("composite.searchLabel")}`. When the trimmed query is not empty, list up to 8 candidates: foods with `archivedAt === null`, `id !== food?.id`, not already in `rows`, and `matchesQuery(f.name, query)`, sorted with `new Intl.Collator("pl", { sensitivity: "base" })`. Each is a `Button variant="ghost" type="button"` with a `Plus` icon; a click appends `{ foodId, quantity: "100" }` and clears the query. No candidates → `t("composite.noMatches")`. (Dishes that would create a cycle are not hidden; the server answers `componentCycle`.)
- **Rows**: heading `t("composite.components")`. No rows → `t("composite.emptyComponents")`. For each row i: the food name (if `archivedAt !== null`, add `<Badge variant="outline">{t("archivedBadge")}</Badge>`, D5), a hidden `<input name="componentFoodId" value={row.foodId} />`, a `NumberInput name="componentQuantityG"` with `unit={t("units.g")}` and `aria-label={t("composite.quantity", { name })}`, and an icon `Button type="button" variant="ghost"` with `X` and `aria-label={t("actions.removeComponent")}`. Error for `` `component.${i}` `` is shown under the row (`role="alert"`, `text-sm leading-9 text-destructive`).
- List error `components` shown under the rows.
- `t("composite.totalWeight", { grams })` with `grams = totalQuantity` of the rows whose quantity parses (format with `useFormatter().number(…, { maximumFractionDigits: 1 })`).
- **Final weight**: `FormField id="dish-finalWeightG" label={t("composite.finalWeightG")} hint={t("composite.finalWeightHint")} error={…finalWeightG}` + `NumberInput name="finalWeightG" unit={t("units.g")}`.
- **Preview** (D2, D6): when at least one row has a valid quantity (`parseDecimal` > 0) and a known food, show `t("composite.preview", { kcal, proteinG, carbsG, fatG })`, each formatted with 1 fraction digit, from `compositeNutrition(validRows.map(r => ({ ...foodsById.get(r.foodId)!, quantityG })), parsedFinalWeight)`; use the final weight only when it parses and is > 0, else `null`.
- When editing, show `t("composite.editHint")`.
- Result effect like `FoodFormDialog`: success → `toast.success(t(mode === "created" ? "toast.dishCreated" : "toast.dishUpdated"))` and close; `unexpected` → `toast.error(t("toast.failed"))`.
- `fieldError(field: CompositeFoodErrorField)` → `t(\`errors.${code}\`)`.
- Footer: Cancel (`DialogClose`) + `SubmitButton pendingLabel={t("actions.saving")}` with `t("actions.save")`.
- Wider than the plain dialog: `DialogContent className="sm:max-w-xl"`, title `t(food ? "composite.editTitle" : "composite.addTitle")` styled like the plain dialog (`font-hand text-2xl text-primary`), description `t("composite.description")`.

This subtask does not wire the dialog into the view (subtask 5 does).

**Files:**
- Modify: `src/messages/en.json`, `src/messages/pl.json`: new `foods.*` keys
- Create: `src/features/foods/components/CompositeFoodDialog.tsx`: the dish dialog

**Read:** `src/features/foods/components/FoodFormDialog.tsx`, `src/components/forms/FormField.tsx`, `src/components/forms/NumberInput.tsx`, `src/features/foods/actions.ts` (exports), `src/server/dal/foods.ts`, `src/lib/composite.ts` (exports), `src/lib/validation/composite-foods.ts` (exports), `src/lib/search.ts` (exports), `src/messages/en.json` (`foods` section), `src/messages/pl.json` (`foods` section)

**Verify:** `npx tsc --noEmit && npm run lint && npm test -- src/messages`
