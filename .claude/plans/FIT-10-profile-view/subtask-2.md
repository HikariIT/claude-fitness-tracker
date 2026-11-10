# 2. Server side: ActionResult, settings DAL, service, Server Action
**Decisions:** D3, D7, D8

Goal: read and write the singleton `settings` row. Layering: only `server/` and `db/` touch the database; actions in `features/` call `server/services`; pages call `server/dal`. This is Next 16 with `cacheComponents`: read the docs below before writing code.

Context from subtask 1 (already done):
- `@/lib/validation/profile` exports `parseProfileForm(formData: FormData, today: string): ProfileParseResult`, `ProfileInput`, `ProfileField`, `ProfileErrorCode`.
- `@/lib/nutrition` exports `Sex`, `ActivityLevel`.
- `@/db/client` exports `db` (Drizzle, `casing: "snake_case"`, schema attached) and starts with `import "server-only"`. `@/db/schema` exports `settings`.

## `src/types/action-result.ts`
```ts
export type ActionResult<T, E extends string = string> =
  | { ok: true; data: T }
  | { ok: false; code: "validation" | "unexpected"; fieldErrors?: Partial<Record<string, E>> };
```

## `src/server/dal/settings.ts`
```ts
import "server-only";
export type Settings = typeof settings.$inferSelect;
export async function getSettings(): Promise<Settings | null>
```
Start the function body with `"use cache"` and `cacheTag("settings")` (`import { cacheTag } from "next/cache"`). Query `db.query.settings.findFirst({ where: eq(settings.id, 1) })` and return `?? null`. Check `cacheTag.md` / `use-cache.md` for whether `cacheLife` is needed.

## `src/server/services/settings.ts`
```ts
import "server-only";
export async function saveSettings(input: ProfileInput): Promise<Settings>
```
Upsert: `db.insert(settings).values({ id: 1, ...input }).onConflictDoUpdate({ target: settings.id, set: { ...input, updatedAt: new Date() } }).returning()`, return the first row. `ProfileInput` must be assignable to the insert type (this is the compile-time check that the lib enums match the DB enums). Read `src/db/schema/shared.ts` to see how `updatedAt` is defined and keep `set` consistent with it.

## `src/features/profile/actions.ts`
```ts
"use server";
export type ProfileActionState = ActionResult<{ savedAt: number }, ProfileErrorCode> | null;
export async function saveProfile(prev: ProfileActionState, formData: FormData): Promise<ProfileActionState>
```
Steps: compute `today` as the server-local ISO date (`new Date()` is allowed in an action; format with `toISOString().slice(0,10)` of a date shifted to local, or build from `getFullYear/getMonth/getDate` padded) → `parseProfileForm(formData, today)` → on failure return `{ ok:false, code:"validation", fieldErrors }` → `await saveSettings(data)` inside try/catch (on error `console.error` and return `{ ok:false, code:"unexpected" }`) → `updateTag("settings")` (`import { updateTag } from "next/cache"`) → return `{ ok:true, data:{ savedAt: Date.now() } }`. The action never throws for expected errors. `prev` is unused (prefix `_prev` or disable the lint rule locally if lint complains).

**Files:**
- Create: `src/types/action-result.ts`
- Create: `src/server/dal/settings.ts`
- Create: `src/server/services/settings.ts`
- Create: `src/features/profile/actions.ts`

**Read:** `src/db/client.ts`, `src/db/schema/settings.ts`, `src/db/schema/shared.ts`, `src/lib/validation/profile.ts` (exports only), `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache.md`, `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cacheTag.md`, `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/updateTag.md`, `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`

**Verify:** `npx tsc --noEmit && npm run lint`
