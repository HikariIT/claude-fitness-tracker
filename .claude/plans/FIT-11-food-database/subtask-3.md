# 3. PL/EN message keys and the add/edit food dialog
**Decisions:** D4, D6, D7, D8

**Notes:** The name field is controlled (not `defaultValue`), because React 19 resets uncontrolled form fields after an action and would wipe the name on a validation error. The result effect keeps a ref so each result is handled once.

Goal: add every `foods.*` message key in both languages, and build the client dialog that adds or edits one food. There are no raw UI strings: all text comes from `useTranslations("foods")`.

## 1. Messages
Add a top-level `"foods"` object to BOTH `src/messages/en.json` and `src/messages/pl.json`, right after `"profile"`. Use the same keys in both files with no empty strings (`messages.test.ts` enforces this). Keep the files' formatting: 2-space indent, one key per line. `AppConfig` types keys from `pl.json`.
```jsonc
// en
"foods": {
  "columns": { "name": "Name", "kcal": "Energy", "proteinG": "Protein", "carbsG": "Carbs", "fatG": "Fat", "actions": "Actions" },
  "fields": { "name": "Name", "kcal": "Energy", "proteinG": "Protein", "carbsG": "Carbohydrates", "fatG": "Fat" },
  "units": { "kcal": "kcal", "g": "g" },
  "per100g": "Values per 100 g",
  "search": { "label": "Search foods", "placeholder": "Search by name…" },
  "showArchived": "Show removed foods",
  "archivedBadge": "Removed",
  "empty": { "title": "No foods yet", "description": "Add your first food to start planning meals." },
  "noResults": "No foods match “{query}”.",
  "actions": { "add": "Add food", "edit": "Edit", "archive": "Remove", "restore": "Restore",
               "save": "Save", "saving": "Saving…", "cancel": "Cancel" },
  "dialog": { "addTitle": "Add food", "editTitle": "Edit food", "description": "Nutrition values per 100 g.",
              "editHint": "Changes apply to new meals only. Days already logged keep their values." },
  "macros": { "hint": "≈ {kcal} kcal from macros", "use": "Use" },
  "confirmArchive": { "title": "Remove food?",
                      "description": "“{name}” will be hidden from the list and the meal planner. Days already logged keep it. You can restore it later.",
                      "confirm": "Remove", "removing": "Removing…" },
  "toast": { "created": "Food added", "updated": "Food saved", "archived": "Food removed", "restored": "Food restored",
             "nameTaken": "A food named “{name}” already exists.", "failed": "Something went wrong. Try again." },
  "errors": { "nameRequired": "Enter a name.", "nameTooLong": "Use at most 100 characters.",
              "nameTaken": "A food with this name already exists.", "kcalRange": "Enter energy from 0 to 900 kcal.",
              "proteinRange": "Enter protein from 0 to 100 g.", "carbsRange": "Enter carbohydrates from 0 to 100 g.",
              "fatRange": "Enter fat from 0 to 100 g.", "macrosSum": "Protein, carbohydrates and fat together cannot exceed 100 g." }
}
```
```jsonc
// pl
"foods": {
  "columns": { "name": "Nazwa", "kcal": "Energia", "proteinG": "Białko", "carbsG": "Węglowodany", "fatG": "Tłuszcz", "actions": "Akcje" },
  "fields": { "name": "Nazwa", "kcal": "Energia", "proteinG": "Białko", "carbsG": "Węglowodany", "fatG": "Tłuszcz" },
  "units": { "kcal": "kcal", "g": "g" },
  "per100g": "Wartości na 100 g",
  "search": { "label": "Szukaj produktów", "placeholder": "Szukaj po nazwie…" },
  "showArchived": "Pokaż usunięte produkty",
  "archivedBadge": "Usunięty",
  "empty": { "title": "Brak produktów", "description": "Dodaj pierwszy produkt, aby planować posiłki." },
  "noResults": "Brak produktów pasujących do „{query}”.",
  "actions": { "add": "Dodaj produkt", "edit": "Edytuj", "archive": "Usuń", "restore": "Przywróć",
               "save": "Zapisz", "saving": "Zapisywanie…", "cancel": "Anuluj" },
  "dialog": { "addTitle": "Dodaj produkt", "editTitle": "Edytuj produkt", "description": "Wartości odżywcze na 100 g.",
              "editHint": "Zmiany dotyczą tylko nowych posiłków. Zapisane dni zachowują swoje wartości." },
  "macros": { "hint": "≈ {kcal} kcal z makroskładników", "use": "Użyj" },
  "confirmArchive": { "title": "Usunąć produkt?",
                      "description": "„{name}” zniknie z listy i z planera posiłków. Zapisane dni go zachowają. Możesz go później przywrócić.",
                      "confirm": "Usuń", "removing": "Usuwanie…" },
  "toast": { "created": "Dodano produkt", "updated": "Zapisano produkt", "archived": "Usunięto produkt", "restored": "Przywrócono produkt",
             "nameTaken": "Produkt o nazwie „{name}” już istnieje.", "failed": "Coś poszło nie tak. Spróbuj ponownie." },
  "errors": { "nameRequired": "Podaj nazwę.", "nameTooLong": "Użyj maksymalnie 100 znaków.",
              "nameTaken": "Produkt o tej nazwie już istnieje.", "kcalRange": "Podaj energię od 0 do 900 kcal.",
              "proteinRange": "Podaj białko od 0 do 100 g.", "carbsRange": "Podaj węglowodany od 0 do 100 g.",
              "fatRange": "Podaj tłuszcz od 0 do 100 g.", "macrosSum": "Białko, węglowodany i tłuszcz razem nie mogą przekroczyć 100 g." }
}
```

## 2. `src/features/foods/components/FoodFormDialog.tsx` (create, `"use client"`)
```ts
type FoodFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  food: Food | null; // null = add, otherwise edit this food
};
export function FoodFormDialog(props: FoodFormDialogProps);
```
Structure:
- `<Dialog open onOpenChange>` → `<DialogContent>` → `<DialogHeader>` with `<DialogTitle className="font-hand text-2xl text-primary">` (`dialog.addTitle` / `dialog.editTitle`) and `<DialogDescription>` (`dialog.description`), then an inner `<FoodForm food onDone={() => onOpenChange(false)} />`. Radix unmounts the content when the dialog closes, so putting `useActionState` and the field state in the inner `FoodForm` resets them on each open.
- `FoodForm` (same file, not exported): `const [state, formAction] = useActionState(saveFood, null)`. Field state is strings, prefilled from `food` with `String(food.kcal)` etc., or `""` when adding.
- `useEffect` on `state`: `ok` → `toast.success(t(state.data.mode === "created" ? "toast.created" : "toast.updated"))`, then `onDone()`. `code === "unexpected"` → `toast.error(t("toast.failed"))`. Validation errors show inline.
- `fieldError(field: FoodErrorField)` → `t(\`errors.${code}\`)` or undefined (same pattern as `ProfileForm`).
- Form (`<form action={formAction}>`):
  - `<input type="hidden" name="id" value={food?.id ?? ""} />`
  - Name: `FormField` + `Input` (`name="name"`, `className={fieldControlClass}`, `maxLength={100}`, `autoFocus`).
  - Kcal: `FormField` + `NumberInput` (`name="kcal"`, `unit={t("units.kcal")}`), then a macros hint row (D8). Parse the three macro strings with `parseDecimal` from `@/lib/numbers`. When all three are non-null, show `<p className="text-sm text-muted-foreground">{t("macros.hint", { kcal })}</p>` with `kcal = kcalFromMacros(...)` from `@/lib/nutrition`, plus a `Button type="button" variant="outline" size="sm"` (`macros.use`) that sets the kcal field to `String(kcal)`.
  - Protein / carbs / fat: three `FormField` + `NumberInput` (`unit={t("units.g")}`) in `grid gap-x-4 sm:grid-cols-3`. Under the grid, when `fieldError("macros")` is set, show `<p role="alert" className="text-sm text-destructive">`.
  - Every control sets `aria-invalid` and `aria-describedby="<id>-error"` when it has an error, like `ProfileForm`. Ids: `food-name`, `food-kcal`, `food-proteinG`, `food-carbsG`, `food-fatG`.
  - When editing (`food !== null`), show `<p className="text-sm text-muted-foreground">{t("dialog.editHint")}</p>` (D7).
  - `<DialogFooter>`: `<DialogClose asChild><Button type="button" variant="outline">{t("actions.cancel")}</Button></DialogClose>` and `<SubmitButton pendingLabel={t("actions.saving")}>{t("actions.save")}</SubmitButton>`.

Imports: `type Food` from `@/server/dal/foods` (type-only, like `ProfileForm` imports `Settings`), `saveFood` from `@/features/foods/actions`, `type FoodErrorField` from `@/lib/validation/foods`, `FormField`, `NumberInput`, `SubmitButton` from `@/components/forms/*`, `fieldControlClass` from `@/components/forms/field-styles`, Dialog parts from `@/components/ui/dialog`, `Button`, `Input`, `toast` from `sonner`.

**Files:**
- Modify: `src/messages/en.json`, `src/messages/pl.json`: add the `foods` object
- Create: `src/features/foods/components/FoodFormDialog.tsx`

**Read:** `src/features/profile/components/ProfileForm.tsx` (form, toast and error patterns), `src/features/foods/actions.ts` (exports `saveFood`, `FoodFormState`), `src/lib/validation/foods.ts` (types only), `src/components/ui/dialog.tsx:50-160`, `src/components/forms/FormField.tsx`, `src/components/forms/NumberInput.tsx`, `src/messages/pl.json`

**Verify:** `npx tsc --noEmit && npm run lint && npm test`
