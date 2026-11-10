# 5. Documentation (navigators, architecture doc)
**Decisions:** D1, D2, D3, D9, D12, D13, D17

Goal: document the shell so future agents can find things. Each navigator is ≤ ~40 lines, terse, as a list of bullets/tables. Describe only what exists after subtasks 1–4.

## Steps
1. `src/i18n/CLAUDE.md`:
   - Files: `routing.ts` (locales `pl` default + `en`, `localePrefix: "always"`, detection on), `navigation.ts` (always import `Link`, `redirect`, `usePathname`, `useRouter` from here, never from `next/link` / `next/navigation` for internal links), `request.ts` (loads `src/messages/<locale>.json`), `src/proxy.ts` (locale redirect), `src/global.d.ts` (typed keys).
   - **No raw UI strings.** To add a string: add the same key to both `src/messages/pl.json` and `en.json`, then use `useTranslations("ns")` (sync/client components) or `await getTranslations("ns")` (async server components). `npm test` fails if the keys differ or a value is empty.
   - Pages and layouts must call `setRequestLocale(locale)` before translating (static rendering).
   - Format dates/numbers with `useFormatter` / `getFormatter`, never by hand. Use `timeZone: "UTC"` with `isoToUtcDate` from `@/lib/dates`.
   - Slugs are the same English words in both locales (no `pathnames` config).
2. `src/app/CLAUDE.md`:
   - Route map: `[locale]/layout.tsx` (root layout: html lang, fonts, `NextIntlClientProvider`, header + `LanguageToggle`, `AppNav`, `NotebookSheet`, `Toaster`), `[locale]/page.tsx` → redirect to `/planner`, the 5 views (`profile`, `foods`, `planner`, `workouts`, `balance`, all placeholders for now), `[...rest]` + `not-found.tsx`. There are no other views (see root CLAUDE.md).
   - Thin-page rule: pages compose `features/` + `components/` and read through `server/dal`; never import `db/`.
   - `cacheComponents` is on: no `new Date()`/`cookies()`/`headers()` in the static shell; `params` is a Promise; use `LayoutProps`/`PageProps` helpers.
   - `globals.css` holds the palette tokens + `notebook-paper` utility; `fonts.ts` holds the Google Fonts (`font-sans` Nunito, `font-hand` Patrick Hand).
   - Read `node_modules/next/dist/docs/` before writing Next code.
3. `src/components/CLAUDE.md`:
   - `ui/`: generated shadcn primitives (list them). Add more with `npx shadcn@latest add <name>`, then pin new deps exactly. Do not hand-edit (except `sonner.tsx`, which is light-only, without next-themes).
   - `layout/`: `AppNav`, `LanguageToggle`, `NotebookSheet`, `PageHeader`, `EmptyState` (one line each, with props).
   - `data/`: `StatCard`, `DatePager` (props; DatePager links to `<basePath>/<YYYY-MM-DD>`, and `basePath` alone means today).
   - Rules: no imports from `features/`, `server/`, `db/`; labels come in as translated props or via `useTranslations`; style with the palette tokens (`primary`, `accent`, `muted-foreground`, `bg-icy-blue-*`…), not raw hex; light mode only.
4. `CLAUDE_ARCHITECTURE.md`:
   - Decisions table: add a row `i18n | next-intl, locale URL segment (/pl, /en), JSON messages in src/messages | No raw UI strings; bilingual user`. Add a row `UI | shadcn/ui + Tailwind 4 tokens from the palette, notebook look, Patrick Hand + Nunito | CLAUDE.md style rule`.
   - Directory tree: replace the `app/` block with the `[locale]` routes (profile, foods, planner, workouts, balance, `[...rest]`, not-found) and drop the `diary/`, `settings/` and `(later)` lines. Add `i18n/` (routing, navigation, request), `messages/` (pl.json, en.json), `proxy.ts`, `global.d.ts`. Update `components/` (`layout/`: AppNav, LanguageToggle, NotebookSheet, PageHeader, EmptyState; `data/`: StatCard, DatePager, later MacroBar, KcalRing). Under `features/`, rename the `diary` slice to `planner` and `settings` to `profile` in names only, and add `balance/`.
   - Request flow line: change the example tag to the planner (e.g. `cacheTag("planner:2026-11-10")`).
   - Sub-CLAUDE.md table: add a row for `src/i18n/CLAUDE.md`.
   - Setup steps: mark step 4 done (`(done: FIT-8)`) and change step 6 to "Build foods, then profile, then the planner, workouts and balance."
   - Scope line: replace "V1 views are the food diary and the food library…" with "Five views: profile, foods, planner, workouts, balance."

**Files:**
- Create: `src/i18n/CLAUDE.md`, `src/app/CLAUDE.md`, `src/components/CLAUDE.md`
- Modify: `CLAUDE_ARCHITECTURE.md`: decisions, tree, flow, navigator table, setup steps, scope

**Read:** `CLAUDE_ARCHITECTURE.md`, `src/db/schema/CLAUDE.md` (style reference for navigators), `plan.md` Change Log (to confirm what was actually built)

**Verify:** `npm run lint` (sanity; docs only), then check that each new `CLAUDE.md` is ≤ 45 lines: `wc -l src/i18n/CLAUDE.md src/app/CLAUDE.md src/components/CLAUDE.md`
