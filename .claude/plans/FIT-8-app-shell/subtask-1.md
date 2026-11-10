# 1. next-intl setup, message files, proxy, message test
**Decisions:** D1, D2, D3, D11, D12

Goal: install `next-intl` and wire up locale routing (`pl` default, `en`), the PL/EN message files, the request config, the proxy and the typed `AppConfig`. Add a Vitest test for message key parity. Do NOT touch `src/app/` in this subtask (the layout moves to `[locale]` in subtask 4).

## Steps
1. `npm install next-intl@4.14.10` (exact version, no caret: set `"next-intl": "4.14.10"` in `package.json` if npm adds `^`).

2. `src/i18n/routing.ts`:
```ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["pl", "en"],
  defaultLocale: "pl",
  localePrefix: "always",
  localeDetection: true,
});
```

3. `src/i18n/navigation.ts`:
```ts
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
```

4. `src/i18n/request.ts`:
```ts
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
```

5. `src/proxy.ts` (Next 16 renamed `middleware` to `proxy`; a default export is allowed):
```ts
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
```

6. `src/global.d.ts`:
```ts
import type { routing } from "@/i18n/routing";
import type messages from "@/messages/pl.json";

declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
```

7. `next.config.ts`: keep every existing option and wrap the export:
```ts
import createNextIntlPlugin from "next-intl/plugin";
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
// ...existing nextConfig unchanged...
export default withNextIntl(nextConfig);
```

8. `src/messages/pl.json` (exact content; later subtasks rely on these keys):
```json
{
  "app": {
    "name": "Notatnik Fit",
    "description": "Dziennik jedzenia i treningów z bilansem kalorii"
  },
  "nav": {
    "label": "Główna nawigacja",
    "profile": "Dane osobowe",
    "foods": "Baza produktów",
    "planner": "Plan posiłków",
    "workouts": "Treningi",
    "balance": "Bilans"
  },
  "language": {
    "label": "Język",
    "pl": "Polski",
    "en": "English"
  },
  "pages": {
    "profile": {
      "title": "Dane osobowe",
      "description": "Wzrost, waga, wiek i aktywność do wyliczenia zapotrzebowania kalorycznego."
    },
    "foods": {
      "title": "Baza produktów",
      "description": "Twoje produkty i dania z wartościami odżywczymi na 100 g."
    },
    "planner": {
      "title": "Plan posiłków",
      "description": "Posiłki na dany dzień w wybranych kategoriach."
    },
    "workouts": {
      "title": "Treningi",
      "description": "Bieżnia i trening siłowy wykonane danego dnia."
    },
    "balance": {
      "title": "Bilans",
      "description": "Dzienny bilans kalorii i informacja o deficycie."
    }
  },
  "common": {
    "emptyTitle": "Nic tu jeszcze nie ma",
    "comingSoon": "Ten widok pojawi się wkrótce."
  },
  "datePager": {
    "label": "Wybór dnia",
    "previous": "Poprzedni dzień",
    "next": "Następny dzień",
    "today": "Dziś"
  },
  "notFound": {
    "title": "Nie znaleziono strony",
    "description": "Ta kartka notatnika jest pusta.",
    "back": "Wróć do planu posiłków"
  }
}
```

9. `src/messages/en.json`: the same keys, in English:
`app.name` "Fit Notebook", `app.description` "Food and workout diary with a calorie balance";
`nav`: "Main navigation", "Personal data", "Food database", "Meal planner", "Workouts", "Balance";
`language`: "Language", "Polski", "English";
`pages.*.title` = the matching nav label; descriptions: profile "Height, weight, age and activity to estimate your calorie requirement.", foods "Your foods and dishes with nutrition values per 100 g.", planner "Meals for the day in categories you choose.", workouts "Treadmill and training sessions done on a given day.", balance "Daily calorie balance and whether you are in a deficit.";
`common`: "Nothing here yet", "This view is coming soon.";
`datePager`: "Day picker", "Previous day", "Next day", "Today";
`notFound`: "Page not found", "This notebook page is empty.", "Back to the meal planner".

10. `src/messages/messages.test.ts`: import both JSON files (`import pl from "./pl.json"`, `import en from "./en.json"`). Write a small helper `flatten(obj, prefix = ""): Record<string, unknown>` that returns dotted keys for leaf values. Tests:
   - the sorted key lists of `pl` and `en` are equal (`expect(enKeys).toEqual(plKeys)`)
   - every leaf in both files is a string with `trim().length > 0`

**Files:**
- Modify: `package.json`, `package-lock.json`: add `next-intl` 4.14.10
- Create: `src/i18n/routing.ts`, `src/i18n/navigation.ts`, `src/i18n/request.ts`: next-intl config
- Create: `src/proxy.ts`: locale redirect / detection
- Create: `src/global.d.ts`: `AppConfig` augmentation
- Modify: `next.config.ts`: wrap with `createNextIntlPlugin`
- Create: `src/messages/pl.json`, `src/messages/en.json`: message files
- Create: `src/messages/messages.test.ts`: key parity test

**Read:** `next.config.ts`, `tsconfig.json` (`resolveJsonModule` is already on; `@/*` → `./src/*`), `vitest.config.mts` (includes `src/**/*.test.ts`)

**Verify:** `npx tsc --noEmit && npm test`
