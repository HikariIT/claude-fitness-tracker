# 3. Shared layout and data components
**Decisions:** D2, D3, D4, D9, D10, D14, D15, D16

**Status:** Done

**Notes:** `LanguageToggle` buttons also get `disabled={isPending}` during the locale transition (not in the spec). The `DatePager` today link has no extra height class. Lint reports 93 warnings, all in `.claude/skills/impeccable/scripts/` (pre-existing, not in `src/`).

Goal: build the reusable shell components and a small pure date helper. Nothing in this subtask renders on a page yet (subtask 4 does that). No raw UI strings: every visible label comes from `useTranslations` or from props (which callers fill with translated text).

Context from earlier subtasks:
- `@/i18n/navigation` exports `Link`, `usePathname` (returns the path **without** the locale, e.g. `/foods`), `useRouter`.
- Message keys exist: `nav.label|profile|foods|planner|workouts|balance`, `language.label|pl|en`, `datePager.label|previous|next|today`, `common.emptyTitle|comingSoon`.
- `cn()` is in `@/lib/utils`. shadcn primitives are in `@/components/ui/*` (`Button` with `variant`/`size`, `Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardDescription`).
- Tailwind tokens: `bg-background`, `text-primary`, `text-muted-foreground`, `border-border`, palette classes such as `bg-icy-blue-800`, `bg-platinum-900`, `text-dusk-blue-500`, the `font-hand` font class, and the `notebook-paper` utility.
- Layering: `src/components/` must not import from `features/`, `server/` or `db/`. `src/lib/` is pure (no React, no I/O).
- next-intl hooks (`useTranslations`, `useFormatter`, `useLocale`) work in both server components (non-async) and client components.

## Components
1. `src/lib/dates.ts` (pure):
   - `isIsoDate(value: string): boolean`: matches `^\d{4}-\d{2}-\d{2}$` and is a real calendar date.
   - `addDays(iso: string, days: number): string`: parse as UTC (`Date.UTC(y, m - 1, d)`), add days, return `YYYY-MM-DD`. There is no timezone drift.
   - `isoToUtcDate(iso: string): Date`: `new Date(Date.UTC(y, m - 1, d))`.
   `src/lib/dates.test.ts`: covers `isIsoDate` (valid, `2026-02-30` invalid, garbage), `addDays` across a month end, a year end and a leap day (`2028-02-28` + 1 → `2028-02-29`), and negative days.

2. `src/components/layout/NotebookSheet.tsx` (server): `{ children: ReactNode; className?: string }`. It renders a `<section>` with `notebook-paper` and `rounded-b-md rounded-tr-md border border-border shadow-sm`, padding `pl-16 pr-4 sm:pr-8 py-7`, `min-h-[70vh]` and `leading-7` (matches the 1.75rem line gap).

3. `src/components/layout/PageHeader.tsx` (server): `{ title: string; description?: string; actions?: ReactNode }`. An `<h1 className="font-hand text-4xl text-primary">`, an optional `<p className="text-muted-foreground">`, and actions aligned right (flex, wraps on mobile).

4. `src/components/layout/EmptyState.tsx` (server): `{ title: string; description?: string; icon?: LucideIcon }` (`import type { LucideIcon } from "lucide-react"`). The content is centred, with the icon at `size-10 text-steel-blue-500`, the title in `font-hand text-2xl` and a muted description.

5. `src/components/data/StatCard.tsx` (no hooks other than next-intl, so it works on the server): `{ label: string; value: number; unit?: string; hint?: string; maximumFractionDigits?: number }` (default 0). It uses `useFormatter().number(value, { maximumFractionDigits })` (D15) and renders in a shadcn `Card`: the label in a small muted style, the value in `font-hand text-3xl text-primary` followed by the unit, and an optional hint.

6. `src/components/data/DatePager.tsx` (server-compatible, no `"use client"`): `{ date: string; basePath: "/planner" | "/workouts" | "/balance" }`.
   - `<nav aria-label={t("label")}>` with a prev `Link` to `` `${basePath}/${addDays(date, -1)}` `` (icon `ChevronLeft`, `aria-label={t("previous")}`), a centred label, a next `Link` (`ChevronRight`, `t("next")`), and a "today" `Link` to `basePath` itself. Do NOT call `new Date()` here: it breaks prerendering under `cacheComponents`; the base route will mean "today".
   - Label: `format.dateTime(isoToUtcDate(date), { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })`.
   - Style the links with `buttonVariants({ variant: "ghost", size: "icon" })` from `@/components/ui/button` (use `variant: "outline", size: "sm"` for today).

7. `src/components/layout/LanguageToggle.tsx` (`"use client"`): `useLocale()`, `useRouter()` and `usePathname()` from `@/i18n/navigation` (`useLocale` from `next-intl`), `useTranslations("language")`, `useTransition()`. It renders a `role="group"` with `aria-label={t("label")}` and two small buttons, `PL` and `EN`. The visible text is the locale code uppercased from the `routing.locales` array (`import { routing } from "@/i18n/routing"`), not a literal string. Each button has `aria-label={t(locale)}` and `aria-pressed={locale === current}`. On click: `startTransition(() => router.replace(pathname, { locale }))` (D14). The active one uses `Button variant="default"`, the other `variant="ghost"`, `size="sm"`.

8. `src/components/layout/AppNav.tsx` (`"use client"`): notebook index tabs (D10).
```ts
const items = [
  { key: "profile", href: "/profile", icon: User },
  { key: "foods", href: "/foods", icon: Apple },
  { key: "planner", href: "/planner", icon: CalendarDays },
  { key: "workouts", href: "/workouts", icon: Dumbbell },
  { key: "balance", href: "/balance", icon: Scale },
] as const;
```
   - `<nav aria-label={t("label")}>` (`useTranslations("nav")`) → `<ul className="flex gap-1 overflow-x-auto">` with no wrapping (`shrink-0` items) so it scrolls horizontally on mobile.
   - Active when `pathname === href || pathname.startsWith(href + "/")`. Set `aria-current="page"` when active.
   - Tab style: `rounded-t-lg border border-b-0 border-border px-4 py-2 font-hand text-lg inline-flex items-center gap-2`. Active: `bg-platinum-900 text-primary relative top-px` (merges into the sheet below). Inactive: `bg-icy-blue-800 text-muted-foreground hover:bg-icy-blue-700`.
   - Icon `size-4`, then `t(item.key)`.

**Files:**
- Create: `src/lib/dates.ts`, `src/lib/dates.test.ts`
- Create: `src/components/layout/NotebookSheet.tsx`, `src/components/layout/PageHeader.tsx`, `src/components/layout/EmptyState.tsx`, `src/components/layout/LanguageToggle.tsx`, `src/components/layout/AppNav.tsx`
- Create: `src/components/data/StatCard.tsx`, `src/components/data/DatePager.tsx`

**Read:** `src/i18n/navigation.ts`, `src/i18n/routing.ts`, `src/messages/en.json` (key names), `src/lib/utils.ts`, `src/components/ui/button.tsx` (exports `Button`, `buttonVariants`), `src/components/ui/card.tsx` (export names), `src/app/globals.css` (token / utility names only)

**Verify:** `npx tsc --noEmit && npm run lint && npm test`
