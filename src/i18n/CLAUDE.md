# src/i18n: locales, routing and messages

next-intl setup. Locale is a URL segment (`/pl/...`, `/en/...`). PL is the default.

**Files:**
- `routing.ts`: locales `pl` (default) and `en`, `localePrefix: "always"`, locale detection on (cookie).
- `navigation.ts`: locale-aware `Link`, `redirect`, `usePathname`, `useRouter`, `getPathname`.
- `request.ts`: loads `src/messages/<locale>.json` for the request.
- `src/proxy.ts` (outside this folder): locale detection and redirect (Next 16 name for middleware).
- `src/global.d.ts`: augments `AppConfig` with `Messages: typeof pl`, so `t()` keys are type-checked.

**Rules:**
- Always import `Link`, `redirect`, `usePathname`, `useRouter` from `@/i18n/navigation`. Never from `next/link` or `next/navigation` for internal links.
- **No raw UI strings.** To add a string: add the same key to both `src/messages/pl.json` and `src/messages/en.json`, then use `useTranslations("ns")` (client components) or `await getTranslations("ns")` (async server components).
- `npm test` fails if the two message files differ in keys or contain an empty string (`src/messages/messages.test.ts`).
- Pages and layouts call `setRequestLocale(locale)` before translating (static rendering).
- Format dates and numbers with `useFormatter` / `getFormatter`, never by hand. For ISO dates use `timeZone: "UTC"` with `isoToUtcDate` from `@/lib/dates`.
- Slugs are the same English words in both locales (no `pathnames` config). Only the locale segment changes.
