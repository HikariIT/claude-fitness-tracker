# Build App Shell with Notepad Theme, Navigation and Language Map (PL/EN)
**Linear:** FIT-8

## Task Description
Build the shared frontend shell that every later view will use: a ruled-paper notebook theme in the blueish palette, Google Fonts, shadcn/ui primitives, notebook-tab navigation for the 5 views and reusable layout/data components. All UI strings come from PL/EN message files served by `next-intl` with a locale URL segment. The 5 views are only placeholder pages in this task.

## Design Decisions
- **D1:** The locale is a URL segment (`/pl/...`, `/en/...`) under `src/app/[locale]/`, handled by `next-intl` routing and `src/proxy.ts` (Next 16 name for middleware).
- **D2:** Strings live in `src/messages/pl.json` and `src/messages/en.json`, loaded by `next-intl`. `AppConfig` is augmented with `Messages: typeof pl`, so `t()` keys are type-checked.
- **D3:** There are exactly 5 routes: `/profile` (personal data), `/foods` (food database), `/planner` (food planner), `/workouts` (workout planner), `/balance` (total balance). `/<locale>` redirects to `/<locale>/planner`. This task creates placeholder pages only.
- **D4:** The notepad look is a paper notebook: a platinum paper background, ruled lines in icy_blue, a left margin line in steel_blue, a handwriting heading font and a readable body font.
- **D5:** Fonts come from `next/font/google`: `Patrick Hand` for headings (`font-hand`) and `Nunito` for the body (`font-sans`), both with `latin` + `latin-ext` subsets for Polish diacritics. They replace Geist.
- **D6:** Light mode only, with no dark mode block.
- **D7:** The 5 palette scales (`platinum`, `dusk_blue`, `steel_blue`, `icy_blue`, `grey_olive`, 100–900) go in `@theme` as `--color-<name>-<n>`, and the shadcn semantic tokens map onto them (primary = dusk_blue, accent = icy_blue, muted = grey_olive, background = platinum, border = steel_blue).
- **D8:** Add these shadcn/ui primitives: button, input, label, card, select, table, dialog, tabs, badge, separator, sonner. `form` comes later.
- **D9:** Shared components in `src/components/`: `layout/AppNav`, `layout/LanguageToggle`, `layout/PageHeader`, `layout/NotebookSheet`, `layout/EmptyState`, `data/StatCard`, `data/DatePager`. `MacroBar`/`KcalRing` come later.
- **D10:** The nav is notebook index tabs across the top of the sheet, scrolling horizontally on mobile.
- **D11:** A Vitest test checks that both message files have the same nested keys and no empty strings.
- **D12:** PL is the default locale. `Accept-Language` detection is on (next-intl cookie), `localePrefix: "always"`, and slugs are the same English words in both locales.
- **D13:** The root layout is `src/app/[locale]/layout.tsx` (`<html lang={locale}>`, `hasLocale` → `notFound()`, `setRequestLocale`, `generateStaticParams`). There is no `src/app/layout.tsx`, and `src/app/[locale]/not-found.tsx` handles bad paths.
- **D14:** The PL/EN toggle is a client component using `useRouter().replace(pathname, { locale })` from `@/i18n/navigation`, so the current page is kept.
- **D15:** Dates and numbers are formatted with next-intl `useFormatter`, never with hand-written formatters.
- **D16:** Icons come from `lucide-react`. The `sonner` `<Toaster/>` is mounted once in the `[locale]` layout.
- **D17:** Add `CLAUDE.md` navigators to `src/app/`, `src/components/` and `src/i18n/`, and update `CLAUDE_ARCHITECTURE.md` (route tree, i18n, messages).

## Implementation Progress
| # | Subtask | File | Status |
|---|---|---|---|
| 1 | next-intl setup, message files, proxy, message test | [subtask-1.md](subtask-1.md) | Done |
| 2 | shadcn/ui init, palette theme, notebook styles, fonts | [subtask-2.md](subtask-2.md) | Done |
| 3 | Shared layout and data components | [subtask-3.md](subtask-3.md) | Done |
| 4 | Locale layout, redirect, placeholder pages, not-found | [subtask-4.md](subtask-4.md) | Done |
| 5 | Documentation (navigators, architecture doc) | [subtask-5.md](subtask-5.md) | Done |

## Change Log
<!-- Filled by /plan-realize: one bullet per finished subtask, "- <n>. <change>". Used to build commit-message.txt after the last subtask. -->
- 1. Add next-intl 4.14.10 with pl/en routing, request config, proxy, AppConfig typing, PL/EN message files and key-parity test
- 2. Add shadcn primitives (11, hand-written components.json), palette @theme with notebook-paper utility in globals.css, and Nunito/Patrick Hand fonts module
- 3. Add pure ISO date helpers with tests, and layout components (NotebookSheet, PageHeader, EmptyState, LanguageToggle, AppNav) plus data components (StatCard, DatePager)
- 4. Move app to src/app/[locale] with shell layout, locale index redirect to planner, five placeholder pages, catch-all and localized not-found; remove starter layout, page and SVG assets
- 5. Add CLAUDE.md navigators for src/i18n, src/app and src/components, and update CLAUDE_ARCHITECTURE.md with i18n/UI decisions, the [locale] route tree, planner/profile renames and the five-view scope
