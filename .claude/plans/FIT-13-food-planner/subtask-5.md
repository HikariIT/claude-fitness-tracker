# 5. Planner routes (today and `[date]`) and docs
**Decisions:** D2, D10

**Notes:** The build blocker (layout `usePathname` suspends on the unknown `[date]` param) was fixed outside this subtask's Files. `AppNav` and `LanguageToggle` now wrap their `usePathname` part in their own `<Suspense>`, with a fallback that looks the same (no active tab, or disabled buttons), as `use-pathname.md` ("Cache Components") recommends. The `[date]` page awaits `params` inside `<Suspense>` and passes the date with `Promise.resolve`.

Wire `PlannerSection` (subtask 4) into the two routes and update the docs. This is Next 16 with `cacheComponents: true`. **Before writing code, read** `node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md` lines 600–700 ("`generateStaticParams` and `dynamicParams`" and "Await `params` inside `<Suspense>`").

`PlannerSection` signature:
```ts
export async function PlannerSection({ dateParam }: { dateParam?: Promise<string> })
// undefined = today (server local date); invalid date → notFound()
```

## `src/app/[locale]/planner/page.tsx` (modify)
Replace the placeholder (`EmptyState` "coming soon") with the same shape as `src/app/[locale]/foods/page.tsx`: `generateMetadata`, `setRequestLocale`, `PageHeader` (`pages.planner.title`/`description`), then `<Suspense fallback={null}><PlannerSection /></Suspense>`. Drop the now unused `EmptyState`, `CalendarDays` and `common` imports.

## `src/app/[locale]/planner/[date]/page.tsx` (new)
- Type it with `PageProps<"/[locale]/planner/[date]">`. Do **not** export `generateStaticParams` or `dynamicParams` for `date`: any date is valid (D10), so the param is only known at request time.
- Follow the doc's "await params inside Suspense" pattern. The page awaits only what the static shell needs. `locale` is known from the layout's `generateStaticParams`, but `params` is a single promise, so if awaiting it at the top blocks the shell (build error about uncached data outside Suspense), move the header into the Suspense child too. Pass the date as `params.then((p) => p.date)` to `<PlannerSection dateParam={…} />` inside `<Suspense fallback={null}>`.
- `generateMetadata` can stay like the other pages (it reads `locale` only).

## `src/app/[locale]/[...rest]/page.tsx`
No change. The more specific `planner/[date]` route wins over the catch-all.

## Docs
- `src/app/CLAUDE.md`: replace the planner placeholder line with `[locale]/planner/page.tsx` (today) and `[locale]/planner/[date]/page.tsx` (any ISO day, invalid → 404, params awaited inside `<Suspense>`), both rendering `PlannerSection`.
- `src/features/CLAUDE.md`: replace "`planner/` … planned" with a `planner/` bullet: `PlannerSection` (server; date or today, reads `getDiaryDay`, `listFoods`, `getSettings`), `PlannerView` (client, dialog state, `DatePager`), `MealSection` (one meal table + subtotal), `DayTotals` (stat cards, kcal vs goal), `EntryFormDialog` (add/edit, food search over non-archived foods, live preview), `ConfirmEntryDialog`, `actions.ts` (`saveDiaryEntry`, `deleteDiaryEntryAction`). Keep `workouts/`, `balance/` as planned.
- `CLAUDE_ARCHITECTURE.md`: in the tree, mark `planner/page.tsx` as built and add `planner/[date]/page.tsx`, update the `features/planner` comment to the real component names, add `dal/diary.ts` / `services/diary.ts` and `lib/diary.ts`, and in "Setup steps" item 6 add "planner FIT-13".

## Manual check (after Verify)
With `npm run dev` and a seeded DB, `/pl/planner` shows today's seeded entries (breakfast, lunch, dinner). The prev arrow goes to `/pl/planner/<yesterday>`, and `/pl/planner/2026-02-30` gives the 404 page.

**Files:**
- Modify: `src/app/[locale]/planner/page.tsx`
- Create: `src/app/[locale]/planner/[date]/page.tsx`
- Modify: `src/app/CLAUDE.md`
- Modify: `src/features/CLAUDE.md`
- Modify: `CLAUDE_ARCHITECTURE.md`

**Read:** `node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md:600-700`, `src/app/[locale]/foods/page.tsx`, `src/app/[locale]/planner/page.tsx`, `src/app/CLAUDE.md`, `src/features/CLAUDE.md`, `CLAUDE_ARCHITECTURE.md:17-60,133-140`, `src/features/planner/components/PlannerSection.tsx:1-20`

**Verify:** `npx tsc --noEmit && npm run lint && npm run build`
