# src/server: data access and writes (server-only)

Every file starts with `import "server-only"`. Only `server/` and `db/` touch the database.

**Layers:**
- `dal/`: read functions for Server Components. Example: `dal/settings.ts` exports `getSettings()`.
  - Each read uses `"use cache"` and `cacheTag("<name>")`, because `cacheComponents` requires it.
  - Reads never write and never call `updateTag`.
- `services/`: writes used by actions. Example: `services/settings.ts` exports `saveSettings(input)`, an upsert of row `id = 1`.
  - Multi-table writes run in a transaction (`db.transaction`).
  - Services enforce cross-table rules that the DB does not, such as treadmill-only sessions.
  - `services/foods.ts`: `createFood`, `updateFood`, `archiveFood`, `restoreFood`, `deleteFood` return `{ ok } | { ok: false, reason: "nameTaken" | "notFound" | "inUse" }`. Names are unique among non-archived foods, ignoring case (D6, D9). `deleteFood` hard-deletes only an archived food that no diary entry references (`inUse` otherwise).
  - `dal/foods.ts`: `listFoods()` returns archived rows too. The UI filters them.

**Cache tags:**
- `settings`: the singleton settings row.
- `foods`: the food list (`dal/foods.ts`).
- `planner:<YYYY-MM-DD>`: one diary day (planned).
- Tag names are plain strings and match the DAL function they invalidate.

**Rules:**
- Actions call `updateTag(<tag>)` after a successful write, never before.
- Services take already-validated input (from `lib/validation`). They don't parse FormData.
- Return domain rows (`Settings`, etc.) typed from Drizzle `$inferSelect`. Do not hand-write types.
- Expected failures are not thrown from here. Actions turn them into `ActionResult`.
- Tests for `server/` run against a test DB (not in FIT-10).
