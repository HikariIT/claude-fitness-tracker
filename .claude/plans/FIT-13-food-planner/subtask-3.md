# 3. PL/EN message keys, entry dialog and confirm-delete dialog
**Decisions:** D1, D4, D5, D7, D8, D11, D12

Add every planner UI string to both message files, then build the two planner dialogs. No raw UI strings: every visible text goes through `useTranslations`.

## Messages (`src/messages/en.json` and `src/messages/pl.json`, same keys in both)
Add a top-level `"planner"` namespace (and keep the existing `pages.planner`):
```jsonc
"planner": {
  "meals": { "breakfast": "Breakfast", "lunch": "Lunch", "dinner": "Dinner", "snack": "Snack", "other": "Other" },
  // pl: "Śniadanie", "Obiad", "Kolacja", "Przekąska", "Inne"
  "columns": { "food": "Food", "quantity": "Amount", "kcal": "Energy", "proteinG": "Protein", "carbsG": "Carbs", "fatG": "Fat", "actions": "Actions" },
  "units": { "kcal": "kcal", "g": "g" },
  "fields": { "meal": "Meal", "food": "Food", "quantityG": "Amount" },
  "search": { "label": "Search foods", "placeholder": "Search by name…", "noMatches": "No matching foods.", "selected": "Selected: {name}", "change": "Change" },
  "preview": "This portion: {kcal} kcal · P {proteinG} g · C {carbsG} g · F {fatG} g",
  "archivedBadge": "Removed",
  "subtotal": "Meal total",
  "totals": { "title": "Day total", "kcal": "Energy", "proteinG": "Protein", "carbsG": "Carbs", "fatG": "Fat",
              "goal": "{eaten} of {goal} kcal", "remaining": "{kcal} kcal left", "over": "{kcal} kcal over goal",
              "noGoal": "Fill in your personal data to see your calorie goal.", "noGoalLink": "Go to personal data" },
  "empty": { "title": "No meals yet", "description": "Add the first entry for this day." },
  "actions": { "add": "Add entry", "edit": "Edit {name}", "delete": "Delete {name}", "cancel": "Cancel", "save": "Save", "saving": "Saving…", "confirmDelete": "Delete", "deleting": "Deleting…" },
  "dialog": { "addTitle": "Add entry", "editTitle": "Edit entry", "description": "Pick a food, amount and meal." },
  "confirmDelete": { "title": "Delete entry?", "description": "{name} ({grams} g) will be removed from this day." },
  "errors": { "dateInvalid": "Invalid date.", "mealInvalid": "Pick a meal.", "foodRequired": "Pick a food.",
              "foodUnavailable": "This food is no longer available.", "quantityRange": "Enter 0.1–5000 g." },
  "toast": { "created": "Entry added.", "updated": "Entry updated.", "deleted": "Entry deleted.", "failed": "Something went wrong. Try again." }
}
```
Write natural Polish translations for every key (for example "Dodaj wpis", "Suma dnia", "Usunąć wpis?"). Keep the ICU placeholders identical. `src/messages/messages.test.ts` checks key parity and that no string is empty.

## `src/features/planner/components/EntryFormDialog.tsx` (new, client)
Pattern: `src/features/foods/components/FoodFormDialog.tsx` (outer Dialog plus an inner form mounted per open, `useActionState`, `handledRef` effect, toasts, `fieldError` helper, `FormField` / `NumberInput` / `SubmitButton`). Use the food search from `CompositeFoodDialog.tsx` (around lines 120–230).
```ts
type EntryFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;              // YYYY-MM-DD
  foods: Food[];             // all foods incl. archived (from @/server/dal/foods type)
  entry: DiaryEntry | null;  // null = add (type from @/server/dal/diary)
  defaultMeal: Meal;         // used when entry is null (D5)
};
```
- Action: `saveDiaryEntry` from `@/features/planner/actions` (state type `DiaryEntryFormState`).
- Hidden inputs: `id` (entry id or ""), `date`, `meal`, `foodId`.
- Meal: shadcn `Select` over `MEALS` (from `@/lib/diary`) labelled `planner.meals.<meal>`, plus a hidden input. Copy the pattern from `ProfileForm.tsx` (around lines 100–121).
- Food: a search input filtering **non-archived** foods with `matchesQuery(food.name, query)` (`@/lib/search`) (D7), showing up to 8 matches as buttons. Picking one sets `foodId` and shows `search.selected` with a `search.change` button. In edit mode the current food is preselected even if archived (show the `archivedBadge`), but picking another food only offers non-archived ones.
- Grams: `NumberInput` name `quantityG`, unit `planner.units.g`.
- Live preview (D11): when a food is selected and `parseDecimal(grams)` is within 0.1–5000, show `planner.preview` using `portionNutrition(food, grams)` (`@/lib/diary`) and `useFormatter().number(v, { maximumFractionDigits: 1 })`.
- Errors: `t(\`errors.${code}\`)` for fields `meal`, `foodId`, `quantityG`. Toasts: `toast.created` / `toast.updated` / `toast.failed`.

## `src/features/planner/components/ConfirmEntryDialog.tsx` (new, client)
Pattern: `src/features/foods/components/ConfirmFoodDialog.tsx` (`useTransition`, Dialog, toast).
```ts
type ConfirmEntryDialogProps = {
  target: { entry: DiaryEntry; foodName: string } | null; // null = closed
  onOpenChange: (open: boolean) => void;
};
```
It calls `deleteDiaryEntryAction(entry.id)` and shows `toast.deleted` or `toast.failed` (D12). The title is `confirmDelete.title`, and the description is `confirmDelete.description` with `{ name, grams }`.

**Files:**
- Modify: `src/messages/en.json`: add `planner` namespace
- Modify: `src/messages/pl.json`: same keys, Polish
- Create: `src/features/planner/components/EntryFormDialog.tsx`
- Create: `src/features/planner/components/ConfirmEntryDialog.tsx`

**Read:** `src/features/foods/components/FoodFormDialog.tsx`, `src/features/foods/components/ConfirmFoodDialog.tsx`, `src/features/foods/components/CompositeFoodDialog.tsx:110-240` (search UI), `src/features/profile/components/ProfileForm.tsx:95-125` (Select + hidden input), `src/features/planner/actions.ts`, `src/lib/diary.ts`, `src/messages/en.json` (`foods` namespace for style)

**Verify:** `npx tsc --noEmit && npm test -- src/messages`

**Notes:** The date error has no field to attach to, so it is shown as a standalone alert above the footer. The selected food row is a `div`, not a `p`, because it contains a Badge.
