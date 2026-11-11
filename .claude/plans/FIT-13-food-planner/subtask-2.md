# 2. Server side: diary DAL, entry services, planner Server Actions
**Decisions:** D3, D4, D7, D12, D13

Add the read, the writes and the actions for diary entries. The table `diaryEntries` already exists in `src/db/schema/diary.ts` (columns: `id`, `date` (string `YYYY-MM-DD`), `meal` (enum), `foodId` FK restrict, `quantityG`, `kcal`, `proteinG`, `carbsG`, `fatG` (numeric mapped to number), timestamps). No schema change or migration is needed.

From subtask 1 (already in `src/lib`):
```ts
// @/lib/diary
export type Meal = "breakfast" | "lunch" | "dinner" | "snack" | "other";
export type Nutrition = { kcal: number; proteinG: number; carbsG: number; fatG: number };
export function portionNutrition(per100: Nutrition, quantityG: number): Nutrition;
// @/lib/validation/diary
export type DiaryEntryInput = { date: string; meal: Meal; foodId: number; quantityG: number };
export type DiaryEntryErrorCode = "dateInvalid" | "mealInvalid" | "foodRequired" | "foodUnavailable" | "quantityRange";
export function parseDiaryEntryForm(formData: FormData): { ok: true; data: DiaryEntryInput } | { ok: false; fieldErrors: Partial<Record<"date" | "meal" | "foodId" | "quantityG", DiaryEntryErrorCode>> };
// @/lib/validation/foods
export function parseFoodId(raw: unknown): number | null;
```

## `src/server/dal/diary.ts` (new)
Copy the pattern of `src/server/dal/foods.ts` (`import "server-only"`, `"use cache"`, `cacheTag`).
```ts
export type DiaryEntry = typeof diaryEntries.$inferSelect;
/** Entries of one day, ordered by id (D13). Tag `planner:<date>`. */
export async function getDiaryDay(date: string): Promise<DiaryEntry[]>;
```
Return only diary rows. Do not join food names: the UI joins `foodId` against `listFoods()` (tag `foods`), so renaming a food does not need to invalidate planner tags.

## `src/server/services/diary.ts` (new)
Follow `src/server/services/foods.ts` (`import "server-only"`, result unions, `db.transaction`, no throwing for expected failures).
```ts
export type DiaryWriteResult =
  | { ok: true; entry: DiaryEntry }
  | { ok: false; reason: "notFound" | "foodUnavailable" };
export type DiaryDeleteResult = { ok: true; date: string } | { ok: false; reason: "notFound" };

export async function createDiaryEntry(input: DiaryEntryInput): Promise<DiaryWriteResult>;
export async function updateDiaryEntry(id: number, input: DiaryEntryInput): Promise<DiaryWriteResult>;
export async function deleteDiaryEntry(id: number): Promise<DiaryDeleteResult>;
```
Rules:
- create: load the food by id. If it is missing or `archivedAt !== null` → `foodUnavailable` (D7). Insert with `...portionNutrition(food, input.quantityG)` (D3).
- update (in a transaction): load the entry (`notFound` if missing). Load the food for `input.foodId`. If it is missing → `foodUnavailable`. If it is archived **and** `input.foodId !== entry.foodId` → `foodUnavailable`. Keeping the same archived food is allowed (D7). Recompute the snapshot from the food's current values (D4) and set `meal`, `foodId`, `quantityG`, the snapshot and `updatedAt: new Date()`. Keep the entry's stored `date` (ignore `input.date`; the date is not editable).
- delete: delete by id with `.returning({ date })`. No row → `notFound`, otherwise return its date.

## `src/features/planner/actions.ts` (new)
`"use server"`. Mirror `saveFood` and `deleteFoodAction` in `src/features/foods/actions.ts` (hidden "id" field: empty → create, else update; `try/catch` → `unexpected`; `updateTag` after the write).
```ts
export type DiaryEntryFormState =
  | ActionResult<{ savedAt: number; mode: "created" | "updated" }, DiaryEntryErrorCode>
  | null;
export type DiaryRowActionResult = ActionResult<null, DiaryEntryErrorCode>;

/** useActionState action for the entry dialog. */
export async function saveDiaryEntry(_prev: DiaryEntryFormState, formData: FormData): Promise<DiaryEntryFormState>;
export async function deleteDiaryEntryAction(id: number): Promise<DiaryRowActionResult>;
```
- Validation failure → `{ ok: false, code: "validation", fieldErrors }`.
- Service `foodUnavailable` → `{ ok: false, code: "validation", fieldErrors: { foodId: "foodUnavailable" } }`. `notFound` → `{ ok: false, code: "unexpected" }`.
- On success: `updateTag(\`planner:${entry.date}\`)` (for delete, use the returned date).
- `deleteDiaryEntryAction`: validate the id with `parseFoodId` (generic positive int), else `unexpected`.
- `ActionResult` comes from `@/types/action-result`: `{ ok: true; data: T } | { ok: false; code: "validation" | "unexpected"; fieldErrors?: Partial<Record<string, E>> }`.

## Docs
In `src/server/CLAUDE.md`, add bullets for `dal/diary.ts` (`getDiaryDay`, tag `planner:<date>`, no food join) and `services/diary.ts` (results and the archived-food rule), and change the `planner:<YYYY-MM-DD>` tag line from "(planned)" to point at `dal/diary.ts`.

**Files:**
- Create: `src/server/dal/diary.ts`
- Create: `src/server/services/diary.ts`
- Create: `src/features/planner/actions.ts`
- Modify: `src/server/CLAUDE.md`

**Read:** `src/server/CLAUDE.md`, `src/server/dal/foods.ts`, `src/server/services/foods.ts:1-140` (imports, result types, `Tx`, `createFood`, `updateFood`), `src/features/foods/actions.ts` (whole file, action pattern), `src/db/schema/diary.ts`, `src/types/action-result.ts`, `src/lib/diary.ts`, `src/lib/validation/diary.ts`

**Verify:** `npx tsc --noEmit`
