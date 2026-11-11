# 4. Planner view: section, meal groups, day totals
**Decisions:** D2, D5, D6, D7, D12, D13

Build the planner's server section and client view. The routes are wired in subtask 5. Message keys in the `planner` namespace already exist (subtask 3): `meals.*`, `columns.*`, `units.*`, `archivedBadge`, `subtotal`, `totals.*` (`title`, `kcal`, `proteinG`, `carbsG`, `fatG`, `goal` {eaten, goal}, `remaining` {kcal}, `over` {kcal}, `noGoal`, `noGoalLink`), `empty.title`/`empty.description`, `actions.add`/`edit` {name}/`delete` {name}.

Available code:
```ts
// @/server/dal/diary
export type DiaryEntry = { id: number; date: string; meal: Meal; foodId: number; quantityG: number; kcal: number; proteinG: number; carbsG: number; fatG: number; createdAt: Date; updatedAt: Date };
export async function getDiaryDay(date: string): Promise<DiaryEntry[]>;   // ordered by id
// @/server/dal/foods
export type Food; export async function listFoods(): Promise<Food[]>;       // includes archived (archivedAt)
// @/server/dal/settings
export type Settings; export async function getSettings(): Promise<Settings | null>; // kcalGoal: number
// @/lib/diary
export const MEALS; export type Meal; export function sumNutrition(rows): Nutrition;
export function groupByMeal<T extends { id: number; meal: Meal }>(entries: readonly T[]): { meal: Meal; entries: T[] }[];
export function defaultMeal(entries): Meal;
// @/lib/dates
export function isIsoDate(s: string): boolean; export function localIsoDate(now: Date): string;
// dialogs (subtask 3)
EntryFormDialog({ open, onOpenChange, date, foods, entry: DiaryEntry | null, defaultMeal })
ConfirmEntryDialog({ target: { entry, foodName } | null, onOpenChange })
// shared UI
DatePager({ date, basePath: "/planner" })   // @/components/data/DatePager
StatCard({ label, value, unit?, hint?, maximumFractionDigits? })  // @/components/data/StatCard
EmptyState({ icon, title, description })    // @/components/layout/EmptyState
```

## `src/features/planner/components/PlannerSection.tsx` (new, async server component)
```ts
/** `dateParam` undefined = today. Awaited inside <Suspense> (cacheComponents). */
export async function PlannerSection({ dateParam }: { dateParam?: Promise<string> })
```
- `await connection()` (from `next/server`), as in `FoodsSection.tsx`.
- `const date = dateParam ? await dateParam : localIsoDate(new Date())`. If `!isIsoDate(date)`, call `notFound()` (from `next/navigation`) (D2).
- `Promise.all([getDiaryDay(date), listFoods(), getSettings()])`, then render `<PlannerView date={date} entries={...} foods={...} kcalGoal={settings?.kcalGoal ?? null} />`.

## `src/features/planner/components/PlannerView.tsx` (new, client)
Holds dialog state, like `FoodsView.tsx`: `editing: DiaryEntry | null`, `formOpen`, `deleting: { entry; foodName } | null`.
Layout, top to bottom:
1. `<DatePager date={date} basePath="/planner" />`. DatePager uses `useTranslations`/`useFormatter` without hooks that need a server component, so it works in a client tree. If tsc or lint complains, render DatePager in PlannerSection above PlannerView instead.
2. `<DayTotals>`.
3. An "Add entry" button (`actions.add`, lucide `Plus`). It opens `EntryFormDialog` with `entry=null` and `defaultMeal={defaultMeal(entries)}` (D5).
4. With no entries: `EmptyState` (icon `Utensils`, `empty.*`). Otherwise `groupByMeal(entries).map(g => <MealSection …/>)` (D5, D13).
Build `foodsById = new Map(foods.map(f => [f.id, f]))` for names and the archived flag.

## `src/features/planner/components/MealSection.tsx` (new, client)
```ts
type MealSectionProps = { meal: Meal; entries: DiaryEntry[]; foodsById: Map<number, Food>; onEdit: (e: DiaryEntry) => void; onDelete: (e: DiaryEntry, foodName: string) => void };
```
- A heading `meals.<meal>` in `font-hand text-2xl text-primary`.
- A shadcn `Table` (`@/components/ui/table`, see `FoodsTable.tsx`) with columns food, quantity (`{n} g`), kcal, P, C, F, actions. If the food is archived, show `Badge` `archivedBadge` next to its name (D7). Edit and delete are icon buttons (lucide `Pencil`, `Trash2`) with `aria-label` `actions.edit` / `actions.delete` `{ name }`. Delete calls `onDelete`, which opens the confirm dialog (D12).
- A footer row with `subtotal` and `sumNutrition(entries)` (D6).
- Format numbers with `useFormatter().number(v, { maximumFractionDigits: 1 })` (kcal: 0).

## `src/features/planner/components/DayTotals.tsx` (new, client)
```ts
type DayTotalsProps = { totals: Nutrition; kcalGoal: number | null };
```
- A grid of 4 `StatCard`s (kcal, protein, carbs, fat), `grid-cols-2 sm:grid-cols-4`.
- With `kcalGoal`: a line `totals.goal` and either `totals.remaining` (eaten ≤ goal) or `totals.over`, rounded to whole kcal. Use the palette's primary/destructive text tokens, never raw hex.
- Without a goal: `totals.noGoal` plus a `Link` (`@/i18n/navigation`) to `/profile` with the text `totals.noGoalLink` (D6).

**Files:**
- Create: `src/features/planner/components/PlannerSection.tsx`
- Create: `src/features/planner/components/PlannerView.tsx`
- Create: `src/features/planner/components/MealSection.tsx`
- Create: `src/features/planner/components/DayTotals.tsx`

**Read:** `src/features/foods/components/FoodsSection.tsx`, `src/features/foods/components/FoodsView.tsx` (dialog state pattern), `src/features/foods/components/FoodsTable.tsx` (table, badge, icon buttons), `src/components/data/DatePager.tsx`, `src/components/data/StatCard.tsx`, `src/components/layout/EmptyState.tsx`, `src/features/planner/components/EntryFormDialog.tsx:1-40` (props), `src/features/planner/components/ConfirmEntryDialog.tsx:1-30` (props), `src/lib/diary.ts`

**Verify:** `npx tsc --noEmit && npm run lint`
