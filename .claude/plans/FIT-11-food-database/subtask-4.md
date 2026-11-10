# 4. Foods list view, archive confirm dialog and the `/foods` page
**Decisions:** D2, D3, D4, D5, D9

Goal: replace the `/foods` placeholder with the working view: a searchable table of foods, an "Add food" button, Edit / Remove on active rows, and Restore on archived rows. Use only the message keys under `foods.*` (added in subtask 3), with no raw strings. Style with palette tokens (`text-primary`, `text-muted-foreground`, `font-hand`, `bg-white`), light mode only. Keep things on the notebook ruling: `h-9` controls and `gap-y-9` / `space-y-9` between blocks.

Existing pieces:
- `listFoods(): Promise<Food[]>` and `type Food` from `@/server/dal/foods` (includes archived rows, `archivedAt: Date | null`).
- `archiveFoodAction(id)`, `restoreFoodAction(id)` from `@/features/foods/actions` → `ActionResult<null, FoodErrorCode>`, where `nameTaken` comes as `{ ok: false, code: "validation", fieldErrors: { name: "nameTaken" } }`.
- `FoodFormDialog({ open, onOpenChange, food: Food | null })` from `./FoodFormDialog`.
- `matchesQuery(name, query)` from `@/lib/search`.
- `EmptyState({ title, description?, icon? })`, `Button`, `Input`, `Badge`, `Label`, Table parts (`Table, TableHeader, TableBody, TableRow, TableHead, TableCell`), Dialog parts, `fieldControlClass`.

## 1. `src/features/foods/components/FoodsSection.tsx` (create, async server component)
```tsx
export async function FoodsSection() {
  await connection();          // from "next/server": keeps the DB read out of the build-time prerender (same as ProfileSection)
  const foods = await listFoods();
  return <FoodsView foods={foods} />;
}
```

## 2. `src/features/foods/components/FoodsView.tsx` (create, `"use client"`)
Props: `{ foods: Food[] }`. State: `query` (string), `showArchived` (boolean, default false), `dialogFood: Food | null`, `dialogOpen` (boolean), `archiveTarget: Food | null`.
- Visible rows: `foods.filter((f) => (showArchived || f.archivedAt === null) && matchesQuery(f.name, query))`, sorted with a module-level `const collator = new Intl.Collator("pl", { sensitivity: "base" })` via `collator.compare(a.name, b.name)` (D5). Wrap it in `useMemo`.
- Toolbar (`flex flex-wrap items-end gap-x-4`): a search `Input type="search"` (`aria-label={t("search.label")}`, `placeholder={t("search.placeholder")}`, `className={fieldControlClass}`), a native checkbox `<input type="checkbox" id="foods-show-archived" className="size-4 accent-primary">` with `<Label htmlFor>` `showArchived`, and on the right `<Button onClick={openAdd}>` with lucide `Plus` + `actions.add`.
- Under the toolbar, a muted `per100g` note.
- When there are no active foods at all and `showArchived` is off: `<EmptyState icon={Apple} title={t("empty.title")} description={t("empty.description")} />`. Otherwise, when the filtered list is empty: `<p className="text-muted-foreground">{t("noResults", { query })}</p>`. Otherwise `<FoodsTable … />`.
- `openAdd`: `setDialogFood(null); setDialogOpen(true)`. `openEdit(food)`: `setDialogFood(food); setDialogOpen(true)`.
- Render `<FoodFormDialog open={dialogOpen} onOpenChange={setDialogOpen} food={dialogFood} />` and `<ArchiveFoodDialog food={archiveTarget} onOpenChange={(o) => { if (!o) setArchiveTarget(null); }} />`.
- Restore (D3, D9): `const [pendingId, setPendingId] = useState<number | null>(null)` and `useTransition`. In `startTransition(async () => { const r = await restoreFoodAction(food.id); … })`: `ok` → `toast.success(t("toast.restored"))`, `fieldErrors?.name === "nameTaken"` → `toast.error(t("toast.nameTaken", { name: food.name }))`, otherwise `toast.error(t("toast.failed"))`. Clear `pendingId` at the end.

## 3. `src/features/foods/components/FoodsTable.tsx` (create, `"use client"`)
```ts
type FoodsTableProps = {
  foods: Food[];                       // already filtered and sorted
  pendingId: number | null;            // disables that row's buttons
  onEdit: (food: Food) => void;
  onArchive: (food: Food) => void;
  onRestore: (food: Food) => void;
};
```
- Columns: `columns.name`, `columns.kcal`, `columns.proteinG`, `columns.carbsG`, `columns.fatG` (numbers right-aligned, `tabular-nums`), and `columns.actions` (`<span className="sr-only">` header, right-aligned cell).
- Numbers: `const format = useFormatter()` (next-intl), `format.number(value, { maximumFractionDigits: 1 })`. Append the unit in the header cell (`{t("columns.kcal")} ({t("units.kcal")})`, `… ({t("units.g")})`), not in every cell.
- Active row: `Button variant="ghost" size="sm"` with `Pencil` (`actions.edit`) and `Trash2` (`actions.archive`). Archived row: name in `text-muted-foreground` plus `<Badge variant="outline">{t("archivedBadge")}</Badge>`, and only a `RotateCcw` `actions.restore` button. Icon buttons keep visible text labels (or an `aria-label` when the label is hidden on small screens).
- Wrap the table in `<div className="overflow-x-auto">` so the page has no horizontal scroll on phones.

## 4. `src/features/foods/components/ArchiveFoodDialog.tsx` (create, `"use client"`)
Props: `{ food: Food | null; onOpenChange: (open: boolean) => void }`. `<Dialog open={food !== null} onOpenChange>`. Title `confirmArchive.title`, description `confirmArchive.description` with `{ name: food.name }`, footer `DialogClose` Cancel (`actions.cancel`) and a `Button variant="destructive"` that runs `archiveFoodAction(food.id)` in `useTransition`. While pending, show `confirmArchive.removing` and disable the button. `ok` → `toast.success(t("toast.archived"))` and `onOpenChange(false)`, otherwise `toast.error(t("toast.failed"))`. If `buttonVariants` has no `destructive` variant, use the default variant.

## 5. `src/app/[locale]/foods/page.tsx` (modify)
Keep `generateMetadata`, `setRequestLocale`, and `PageHeader` with `pages.foods` title and description. Replace the `EmptyState` (and drop the now-unused `Apple`, `EmptyState` and `common` imports) with:
```tsx
<Suspense fallback={null}>
  <FoodsSection />
</Suspense>
```
Use `src/app/[locale]/profile/page.tsx` as the model.

**Files:**
- Create: `src/features/foods/components/FoodsSection.tsx`, `FoodsView.tsx`, `FoodsTable.tsx`, `ArchiveFoodDialog.tsx`
- Modify: `src/app/[locale]/foods/page.tsx`

**Read:** `src/app/[locale]/profile/page.tsx`, `src/features/profile/components/ProfileSection.tsx`, `src/features/foods/components/FoodFormDialog.tsx` (props), `src/features/foods/actions.ts` (exports), `src/lib/search.ts`, `src/components/ui/table.tsx`, `src/components/ui/button.tsx` (variants), `src/components/ui/badge.tsx` (variants), `src/components/layout/EmptyState.tsx`, `src/messages/en.json` (`foods` object only)

**Verify:** `npx tsc --noEmit && npm run lint && npm test && npm run build`
