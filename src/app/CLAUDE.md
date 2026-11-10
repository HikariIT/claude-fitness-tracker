# src/app: routing only

Next.js App Router. Every route lives under `[locale]/` (`/pl/...`, `/en/...`). Read `node_modules/next/dist/docs/` before writing Next code (this is Next 16, APIs differ from training data).

**Route map:**
- `fonts.ts`: Google Fonts. `font-sans` = Nunito (body), `font-hand` = Patrick Hand (headings).
- `[locale]/layout.tsx`: root layout. `<html lang>`, fonts, `NextIntlClientProvider`, header with `LanguageToggle`, `AppNav`, `NotebookSheet`, sonner `Toaster`. `hasLocale` → `notFound()`, `setRequestLocale`, `generateStaticParams`.
- `[locale]/page.tsx`: redirects to `/planner`.
- `[locale]/profile/page.tsx`: personal data form. Async `ProfileSection` in `<Suspense>` reads settings after `await connection()` (D8).
- `[locale]/foods/page.tsx`: placeholder (food database).
- `[locale]/planner/page.tsx`: placeholder (food planner).
- `[locale]/workouts/page.tsx`: placeholder (workout planner).
- `[locale]/balance/page.tsx`: placeholder (total balance).
- `[locale]/[...rest]/page.tsx`: catch-all, calls `notFound()`.
- `[locale]/not-found.tsx`: localized 404.

There are exactly these 5 views, no others (see root `CLAUDE.md`).

**Rules:**
- **Thin pages.** Pages and layouts compose `features/` and `components/` and read data through `server/dal`. They never import `db/`.
- `cacheComponents` is on: no `new Date()`, `cookies()` or `headers()` in the static shell.
- `params` is a Promise: `await params`. Use the `LayoutProps` / `PageProps` helpers for typing.
- Every page calls `setRequestLocale(locale)` before translating.
- Styling lives in `globals.css` (palette `@theme` tokens, `notebook-paper` utility). Do not put raw hex values in pages.
- Internal links use `@/i18n/navigation`, not `next/link`.
