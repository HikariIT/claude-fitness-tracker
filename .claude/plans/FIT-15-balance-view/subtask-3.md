# 3. StatCard sign option, DaySummary and WeekTable
**Decisions:** D3, D4, D5, D6

Build the two presentational components of the balance view, plus a small option on the shared `StatCard`. They get computed data through props and do no data fetching. Subtask 4 wires them into the page.

## Types from subtask 1 (`src/lib/balance.ts`, already exists)
```ts
export type DayBalance = {
  date: string; logged: boolean; eatenKcal: number; baselineKcal: number; burnedKcal: number;
  expenditureKcal: number; balanceKcal: number; weightChangeKg: number;
};
export type WeekBalance = { loggedDays: number; eatenKcal: number; expenditureKcal: number; balanceKcal: number; weightChangeKg: number };
export type BalanceStatus = "deficit" | "surplus" | "even";
export function balanceStatus(balanceKcal: number): BalanceStatus; // rounded: <0 deficit, >0 surplus, 0 even
```
Date helpers in `src/lib/dates.ts`: `isoToUtcDate(iso): Date` (UTC midnight). Always format dates with `timeZone: "UTC"`.

## Message keys (namespace `balance`, added in subtask 2)
`units.kcal`, `units.kg`; `day.title`, `day.eaten`, `day.expenditure`, `day.expenditureHint` ({baseline}, {burned}), `day.balance`, `day.weightChange`, `day.notLogged`, `day.notLoggedLink`; `status.deficit` ({kcal}), `status.surplus` ({kcal}), `status.even`; `week.title` ({from}, {to}), `week.day`, `week.eaten`, `week.expenditure`, `week.balance`, `week.weightChange`, `week.status`, `week.notLogged`, `week.total`, `week.loggedDays` ({count}). Use `useTranslations("balance")` and `useFormatter()` from `next-intl`. No raw UI strings.

## Shared: `src/components/data/StatCard.tsx` (modify)
Add an optional prop `signDisplay?: "auto" | "exceptZero"` (default `"auto"`) and pass it to `format.number(value, { maximumFractionDigits, signDisplay })`. Existing callers are unchanged. Add one line about it in the StatCard bullet of `src/components/CLAUDE.md`.

## `src/features/balance/components/BalanceStatusLabel.tsx` (new, `"use client"`)
`export function BalanceStatusLabel({ balanceKcal }: { balanceKcal: number })`. D4: picks `balanceStatus(balanceKcal)`. `kcal` is `format.number(Math.abs(Math.round(balanceKcal)))`. Deficit → `t("status.deficit", { kcal })` in `text-steel-blue-300`; surplus → `t("status.surplus", { kcal })` in `text-destructive`; even → `t("status.even")` in `text-muted-foreground`. Render a `<span>` with that class. The text always states the status, so colour is not the only signal.

## `src/features/balance/components/DaySummary.tsx` (new, `"use client"`)
`export function DaySummary({ day }: { day: DayBalance })`. Follow the layout of `src/features/planner/components/DayTotals.tsx` (section with `aria-labelledby`, `h2` in `font-hand text-2xl leading-9 text-primary`, then `mt-9` content, notebook ruling of 36px lines).
- Heading: `t("day.title")`.
- `day.logged === false` (D6): a `<p className="mt-9 text-muted-foreground">` with `t("day.notLogged")` and a `Link` (from `@/i18n/navigation`) to `` `/planner/${day.date}` `` with `t("day.notLoggedLink")`, styled `text-primary underline underline-offset-4`.
- Otherwise a grid `mt-9 grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-4` of 4 `StatCard`s with `className="min-h-27 py-3"`:
  1. `t("day.eaten")`, `day.eatenKcal`, unit `t("units.kcal")`.
  2. `t("day.expenditure")`, `day.expenditureKcal`, unit kcal, `hint={t("day.expenditureHint", { baseline: format.number(Math.round(day.baselineKcal)), burned: format.number(Math.round(day.burnedKcal)) })}`.
  3. `t("day.balance")`, `day.balanceKcal`, unit kcal, `signDisplay="exceptZero"`.
  4. `t("day.weightChange")`, `day.weightChangeKg`, unit `t("units.kg")`, `maximumFractionDigits={2}`, `signDisplay="exceptZero"` (D3).
  Then `<p className="mt-9 font-hand text-xl leading-9"><BalanceStatusLabel balanceKcal={day.balanceKcal} /></p>`.

## `src/features/balance/components/WeekTable.tsx` (new, `"use client"`)
```ts
type WeekTableProps = { days: DayBalance[]; total: WeekBalance; selectedDate: string }; // days: 7 entries Mon..Sun
```
Use `Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell` from `@/components/ui/table`. Copy the notebook row styling constants from `src/features/planner/components/EntriesTable.tsx` (`rowClass`, `headClass`, `cellClass`, `numClass`) and the `<Table className="text-base">` / `<TableHeader className="[&_tr]:border-0">` setup.
- Section with `aria-labelledby="week-title"`. The heading `h2` uses the same class as DaySummary, with text `t("week.title", { from, to })`, where `from`/`to` are `format.dateTime(isoToUtcDate(days[0].date), { day: "numeric", month: "long", timeZone: "UTC" })` and the same for `days[6].date`. Put the table in a `mt-9` wrapper.
- Columns: `week.day` | `week.eaten` | `week.expenditure` | `week.balance` | `week.weightChange` | `week.status`. The numeric columns use `numClass`.
- One row per day. The day cell is a `Link` to `` `/balance/${day.date}` `` showing `format.dateTime(isoToUtcDate(day.date), { weekday: "short", day: "numeric", month: "numeric", timeZone: "UTC" })`. The row for `selectedDate` gets `bg-icy-blue-900` and `aria-current="date"` on the link.
- Logged day: eaten / expenditure as whole kcal (`format.number(Math.round(v))`), balance with `signDisplay: "exceptZero"` and rounded, kg with `maximumFractionDigits: 2, minimumFractionDigits: 2, signDisplay: "exceptZero"`, and status `<BalanceStatusLabel balanceKcal={day.balanceKcal} />`.
- Not logged (D6): `"—"` (a dash is a symbol, not a UI string) in the 4 numeric cells, and `t("week.notLogged")` in muted text in the status cell.
- `TableFooter` row (D6): `t("week.total")` in the first cell; the sums from `total` formatted like a logged row; and in the status cell `t("week.loggedDays", { count: total.loggedDays })` followed by the `BalanceStatusLabel` of `total.balanceKcal` when `total.loggedDays > 0`. The footer row uses `rowClass` with `font-hand text-lg` and the top border `shadow-[inset_0_2px_0_var(--color-steel-blue-600)]`. Reset the default footer background with `bg-transparent`.

**Files:**
- Modify: `src/components/data/StatCard.tsx`: `signDisplay` prop
- Modify: `src/components/CLAUDE.md`: StatCard note
- Create: `src/features/balance/components/BalanceStatusLabel.tsx`
- Create: `src/features/balance/components/DaySummary.tsx`
- Create: `src/features/balance/components/WeekTable.tsx`

**Read:** `src/components/data/StatCard.tsx`, `src/features/planner/components/DayTotals.tsx`, `src/features/planner/components/EntriesTable.tsx:1-60` (styling constants and table header), `src/components/ui/table.tsx:41-53` (`TableFooter` default classes), `src/lib/balance.ts` (types), `src/components/CLAUDE.md`

**Verify:** `npx tsc --noEmit && npm run lint`
