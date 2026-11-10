# 5. Foods view and table integration, docs
**Decisions:** D5, D6, D7, D8

Goal: show dishes in `/foods` and open the dish dialog. All strings already exist in `src/messages/*.json` (subtasks 3–4): `foods.actions.addComposite`, `foods.actions.showComponents` / `hideComponents` (`{name}`), `foods.compositeBadge`, `foods.archivedBadge`, `foods.toast.inComposite` (`{name}`), `foods.units.g`.

Existing context:
- `@/server/dal/foods`: `Food` (has `isComposite: boolean`, `finalWeightG: number | null`), `FoodComponent` (`id`, `foodId`, `componentFoodId`, `quantityG`), `listFoods()`, `listFoodComponents()`.
- `CompositeFoodDialog` (`./CompositeFoodDialog`): props `{ open: boolean; onOpenChange(open): void; food: Food | null; foods: Food[]; components: FoodComponent[] }`.
- `deleteFoodAction` returns `fieldErrors.name === "foodInComposite"` when the food is an ingredient.

## 1. `src/features/foods/components/FoodsSection.tsx` (modify)
Load both in parallel: `const [foods, components] = await Promise.all([listFoods(), listFoodComponents()]);` and render `<FoodsView foods={foods} components={components} />`.

## 2. `src/features/foods/components/FoodsView.tsx` (modify)
- Props: `{ foods: Food[]; components: FoodComponent[] }`.
- New state: `compositeFood: Food | null`, `compositeOpen: boolean`.
- `openEdit(food)`: if `food.isComposite` (D8), set `compositeFood` and open the dish dialog; else the existing plain dialog.
- Add a second button after "Add food": `<Button variant="outline" onClick={openAddComposite}><CookingPot aria-hidden="true" />{t("actions.addComposite")}</Button>` (`CookingPot` from `lucide-react`).
- `componentsByFood = useMemo(() => Map<number, FoodComponent[]>, [components])` and `foodsById = useMemo(() => new Map(foods.map(f => [f.id, f])), [foods])`. Pass both to `FoodsTable`.
- Render `<CompositeFoodDialog open={compositeOpen} onOpenChange={setCompositeOpen} food={compositeFood} foods={foods} components={components} />` next to `FoodFormDialog`.

## 3. `src/features/foods/components/FoodsTable.tsx` (modify) (D7)
- New props: `componentsByFood: ReadonlyMap<number, FoodComponent[]>`, `foodsById: ReadonlyMap<number, Food>`.
- Local state `expanded: Set<number>` (toggle by id).
- Name cell of a dish: wrap the name in a `<button type="button">` (no default styles: `inline-flex items-center gap-1 text-left`) with `aria-expanded`, `aria-label={t(open ? "actions.hideComponents" : "actions.showComponents", { name: food.name })}`, and a `ChevronRight` / `ChevronDown` icon (`aria-hidden`). Then a `<Badge variant="secondary">{t("compositeBadge")}</Badge>`, before the existing archived badge. Plain foods render as now.
- Rows must be wrapped in `<Fragment key={food.id}>` so a dish can render extra rows.
- When a dish is expanded, render one extra `TableRow` per component, right after it, with the same `rowClass` and `h-9` cells (each row stays one ruled line): first cell `pl-8 text-muted-foreground` with `{component name} · {num(quantityG)} {t("units.g")}` and, if that food is archived, an outline `archivedBadge` (D5); then 5 empty cells. Look up the name in `foodsById`.
- Do not change the column classes or the per-100 g number cells.

## 4. `src/features/foods/components/ConfirmFoodDialog.tsx` (modify)
After the existing `foodInUse` branch, add: `else if (result.fieldErrors?.name === "foodInComposite") toast.error(t("toast.inComposite", { name: food.name }));`.

## 5. `src/features/CLAUDE.md` (modify)
In the `foods/` bullet: `FoodsSection` reads `listFoods` and `listFoodComponents`; add `CompositeFoodDialog` (add/edit dish, `useActionState(saveCompositeFood)`, ingredient search, live per-100 g preview); `FoodsTable` shows a "Dish" badge and expandable ingredient rows; add `saveCompositeFood` to the actions list.

## 6. `CLAUDE_ARCHITECTURE.md` (modify)
- Data model, **foods** bullet: replace "Foods made from other foods come in a later task." with: "A dish (`isComposite = true`, fixed at creation) is a food made of other foods. Its ingredients are in **food_components** (`foodId` cascade, `componentFoodId` restrict, `quantityG`, unique pair). Its per-100 g values are computed from the ingredient grams divided by `finalWeightG` (or the sum of grams when null) and are recalculated in the same transaction whenever an ingredient changes. Dishes may contain dishes, and cycles are refused. A food used as an ingredient may be archived but not deleted."
- Directory tree: in `features/foods/components` add `CompositeFoodDialog`; in `lib/` add `composite.ts  # Dish per-100 g values, cycle check, recalculation order (exists)`; in `server/dal` mention `listFoodComponents`.
- Setup step 6: add "composite foods FIT-12" to the done list.

**Files:**
- Modify: `src/features/foods/components/FoodsSection.tsx`
- Modify: `src/features/foods/components/FoodsView.tsx`
- Modify: `src/features/foods/components/FoodsTable.tsx`
- Modify: `src/features/foods/components/ConfirmFoodDialog.tsx`
- Modify: `src/features/CLAUDE.md`
- Modify: `CLAUDE_ARCHITECTURE.md`

**Read:** the four component files above, `src/features/foods/components/CompositeFoodDialog.tsx` (props only), `src/server/dal/foods.ts`, `src/messages/en.json` (`foods` section), `src/features/CLAUDE.md`, `CLAUDE_ARCHITECTURE.md` ("Directory tree", "Data model", "Setup steps")

**Verify:** `npx tsc --noEmit && npm run lint && npm test && npm run build`
