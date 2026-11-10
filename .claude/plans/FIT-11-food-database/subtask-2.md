# 2. Server side: foods DAL, services and Server Actions
**Decisions:** D2, D3, D6, D7, D9

Goal: the read, the writes and the Server Actions for foods. Follow the existing settings and profile code exactly: `src/server/dal/settings.ts`, `src/server/services/settings.ts`, `src/features/profile/actions.ts`.

Rules: every `src/server/` file starts with `import "server-only"`. Reads use `"use cache"` + `cacheTag("foods")`. Actions call `updateTag("foods")` only after a successful write. Services take validated input and do not throw for expected failures. They return a result instead. Types come from Drizzle `$inferSelect`.

Existing context:
- `foods` table (`@/db/schema`): `id` (identity), `name` text, `kcal`, `proteinG`, `carbsG`, `fatG` (numeric, `mode: "number"`), `archivedAt` timestamptz nullable, `createdAt`, `updatedAt`.
- `db` from `@/db/client`.
- `ActionResult<T, E>` from `@/types/action-result`:
  `{ ok: true; data: T } | { ok: false; code: "validation" | "unexpected"; fieldErrors?: Partial<Record<string, E>> }`.
- From subtask 1 (`@/lib/validation/foods`): `parseFoodForm(formData): { ok: true; data: FoodInput } | { ok: false; fieldErrors }`, `parseFoodId(raw: unknown): number | null`, types `FoodInput`, `FoodErrorCode`.

## 1. `src/server/dal/foods.ts` (create)
```ts
import "server-only";
export type Food = typeof foods.$inferSelect;
/** All foods, including archived ones (the UI filters, D3), ordered by name. */
export async function listFoods(): Promise<Food[]> {
  "use cache";
  cacheTag("foods");
  return db.select().from(foods).orderBy(asc(foods.name));
}
```

## 2. `src/server/services/foods.ts` (create)
```ts
import "server-only";
export type FoodWriteResult = { ok: true; food: Food } | { ok: false; reason: "nameTaken" | "notFound" };
export type FoodToggleResult = { ok: true } | { ok: false; reason: "nameTaken" | "notFound" };

export async function createFood(input: FoodInput): Promise<FoodWriteResult>;
/** Updates only a non-archived food; an archived or missing id → notFound (D7: diary snapshots are not touched). */
export async function updateFood(id: number, input: FoodInput): Promise<FoodWriteResult>;
/** Sets archivedAt = now on a non-archived food (D2); else notFound. */
export async function archiveFood(id: number): Promise<FoodToggleResult>;
/** Clears archivedAt on an archived food; nameTaken if an active food has the same name (D9); else notFound. */
export async function restoreFood(id: number): Promise<FoodToggleResult>;
```
Implementation notes:
- Private helper `isNameTaken(tx, name, excludeId?)`: a select of `foods.id` with `limit(1)` where `sql\`lower(${foods.name}) = lower(${name})\``, `isNull(foods.archivedAt)` and, when `excludeId` is given, `ne(foods.id, excludeId)`. Combine with `and(...)` from `drizzle-orm`.
- Run each write in `db.transaction(async (tx) => ...)`: check the name first, then write with `.returning()`. Empty `returning` → `notFound`.
- Update and archive filter with `and(eq(foods.id, id), isNull(foods.archivedAt))`, restore with `and(eq(foods.id, id), isNotNull(foods.archivedAt))`. For restore, first read the archived row to get its name, then check `isNameTaken(tx, row.name, id)`.
- Every update sets `updatedAt: new Date()`.

## 3. `src/features/foods/actions.ts` (create)
```ts
"use server";
export type FoodFormState =
  | ActionResult<{ savedAt: number; mode: "created" | "updated" }, FoodErrorCode>
  | null;
export type FoodRowActionResult = ActionResult<null, FoodErrorCode>;

/** useActionState action for the add/edit dialog. Hidden field "id": empty → create, else update. */
export async function saveFood(_prev: FoodFormState, formData: FormData): Promise<FoodFormState>;
/** Called directly from the list (not a form). */
export async function archiveFoodAction(id: number): Promise<FoodRowActionResult>;
export async function restoreFoodAction(id: number): Promise<FoodRowActionResult>;
```
Behaviour:
- `saveFood`: read `formData.get("id")`. If it is a non-empty string and `parseFoodId` returns null → `{ ok: false, code: "unexpected" }`. Parse with `parseFoodForm`; on failure → `{ ok: false, code: "validation", fieldErrors }`. Call `createFood` or `updateFood` inside try/catch (`console.error("saveFood failed", e)` → `unexpected`). `reason: "nameTaken"` → `{ ok: false, code: "validation", fieldErrors: { name: "nameTaken" } }`. `reason: "notFound"` → `unexpected`. On success: `updateTag("foods")`, then return `{ ok: true, data: { savedAt: Date.now(), mode } }`.
- `archiveFoodAction` / `restoreFoodAction`: validate with `parseFoodId(id)` (null → `unexpected`), then call the service in try/catch. `nameTaken` → `{ ok: false, code: "validation", fieldErrors: { name: "nameTaken" } }`, `notFound` → `unexpected`. On success: `updateTag("foods")`, then return `{ ok: true, data: null }`.
- Features never import `@/db` directly. Only the services and the DAL do.

**Files:**
- Create: `src/server/dal/foods.ts`: `Food` type, `listFoods()`
- Create: `src/server/services/foods.ts`: `createFood`, `updateFood`, `archiveFood`, `restoreFood`
- Create: `src/features/foods/actions.ts`: `saveFood`, `archiveFoodAction`, `restoreFoodAction`, state types

**Read:** `src/server/dal/settings.ts`, `src/server/services/settings.ts`, `src/features/profile/actions.ts`, `src/types/action-result.ts`, `src/db/schema/foods.ts`, `src/lib/validation/foods.ts` (exports only), `src/server/CLAUDE.md`

**Verify:** `npx tsc --noEmit && npm run lint && npm test`
