# 2. Pure portion helpers, portion validator, shared amount input
**Decisions:** D6, D7, D11, D12, D13, D15

Goal: add the pure helpers and the validator for portion rows that later subtasks share, plus one shared client component that combines an amount input with a unit select. Nothing calls them yet.

## Steps
1. Create `src/lib/portions.ts` (pure, no imports):
```ts
/** D6 limits. */
export const PORTION_MAX = 10;
export const PORTION_NAME_MAX = 30;
export const PORTION_GRAMS_MIN = 0.1;
export const PORTION_GRAMS_MAX = 5000;
export const PORTION_COUNT_MIN = 0.1;
export const PORTION_COUNT_MAX = 100;
/** Range of the resulting grams, same as a grams entry. */
export const QUANTITY_G_MIN = 0.1;
export const QUANTITY_G_MAX = 5000;

/** What the user typed: grams, or a count of one of the food's portions (by food_portions id). */
export type PortionAmount =
  | { kind: "grams"; quantityG: number }
  | { kind: "portion"; portionId: number; count: number };

/** Snapshot stored on diary entries and dish ingredients (D4, D5). All null = grams. */
export type PortionSnapshot =
  | { portionName: string; portionG: number; portionCount: number }
  | { portionName: null; portionG: null; portionCount: null };
export const NO_PORTION_SNAPSHOT = { portionName: null, portionG: null, portionCount: null } as const;

/** D15: count × grams per portion, rounded to 0.1 g. */
export function portionGrams(count: number, grams: number): number {
  return Math.round(count * grams * 10) / 10;
}

/** D7: the food's first portion by sortOrder, or null when it has none. */
export function defaultPortion<T extends { sortOrder: number }>(portions: readonly T[]): T | null { ... }

/** A portion whose name matches (trimmed, case-insensitive with the "pl" locale), or null. `name` null → null. Used to reopen a saved unit (D7). */
export function findPortionByName<T extends { name: string }>(portions: readonly T[], name: string | null): T | null { ... }
```
2. Create `src/lib/portions.test.ts`: `portionGrams` (2 × 15 = 30, 0.5 × 33.3 = 16.7 rounded, 3 × 0.1 = 0.3), `defaultPortion` (lowest sortOrder regardless of array order, empty → null), `findPortionByName` ("łyżka" matches "Łyżka", " Łyżka " matches, null → null, no match → null).
3. Create `src/lib/validation/portions.ts`. Do **not** import `@/lib/validation/foods` (it will import this file in subtask 3). Use `parseDecimal` from `@/lib/numbers` (default 1 decimal place, accepts comma) and constants from `@/lib/portions`.
```ts
export const PORTION_ERROR_CODES = [
  "portionsTooMany",     // field "portions": more than PORTION_MAX non-empty rows
  "portionsInvalid",     // field "portions": names and grams lists differ in length
  "portionNameRequired", // row: grams typed, name empty (D12)
  "portionNameTooLong",  // row: > PORTION_NAME_MAX chars
  "portionGramsRange",   // row: grams empty, unparsable or outside 0.1–5000 (D12)
  "portionDuplicate",    // row: same name as an earlier row, ignoring case
] as const;
export type PortionErrorCode = (typeof PORTION_ERROR_CODES)[number];
export type PortionErrorField = "portions" | `portion.${number}`;
export type PortionInput = { name: string; grams: number };
export type PortionsParseResult =
  | { ok: true; data: PortionInput[] }
  | { ok: false; fieldErrors: Partial<Record<PortionErrorField, PortionErrorCode>> };

/** Validates parallel lists of raw names and grams. Row errors use the submitted index. */
export function parsePortionRows(names: string[], grams: string[]): PortionsParseResult;
/** Reads repeated form fields "portionName" and "portionGrams" (both may be absent → no portions). */
export function parsePortionsForm(formData: FormData): PortionsParseResult;
```
   Rules for `parsePortionRows`:
   - Different lengths → `{ portions: "portionsInvalid" }`.
   - Per row `i`: name is trimmed and inner whitespace collapsed to one space; grams raw is trimmed. Both empty → skip the row silently (D12).
   - One error per row, checked in this order: empty name → `portionNameRequired`; name too long → `portionNameTooLong`; grams `parseDecimal` null or outside `PORTION_GRAMS_MIN..PORTION_GRAMS_MAX` → `portionGramsRange`; name equal (`toLocaleLowerCase("pl")`) to an earlier valid row → `portionDuplicate`. The key is `portion.${i}`.
   - More than `PORTION_MAX` non-empty rows → also set `portions: "portionsTooMany"`.
   - Output keeps the order of the submitted rows (that order becomes `sortOrder` later).
   - Non-string `FormDataEntryValue`s are read as `""`.
4. Create `src/lib/validation/portions.test.ts`: valid rows with a comma decimal; an empty row in the middle is skipped and later errors keep their submitted index; name only → `portionGramsRange`; grams only → `portionNameRequired`; 31-char name; grams 0 and 5000.1 (errors) and 0.1 and 5000 (ok); "Łyżka" vs "łyżka" → `portionDuplicate` on the second row; 11 rows → `portionsTooMany`; mismatched lengths; `parsePortionsForm` with no fields → `{ ok: true, data: [] }`.
5. Create `src/components/forms/PortionAmountInput.tsx` (client, `"use client"`). It is feature-agnostic: it gets ready-made labels and imports nothing from `features/`, `server/` or `db/`.
```tsx
export type PortionOption = { id: number; label: string }; // label is pre-formatted by the parent, e.g. "Łyżka (15 g)"

type PortionAmountInputProps = {
  id: string;                         // id of the amount <input>, for <label htmlFor>
  amountName: string;                 // form field name of the amount, e.g. "amount" or "componentAmount"
  portionIdName: string;              // form field name of the hidden portion id, e.g. "portionId" or "componentPortionId"
  portions: readonly PortionOption[]; // the picked food's portions in sortOrder; may be empty
  portionId: number | null;           // null = grams
  onPortionIdChange: (id: number | null) => void;
  amount: string;
  onAmountChange: (value: string) => void;
  gramsLabel: string;                 // translated "g"
  unitLabel: string;                  // aria-label of the unit select
  amountLabel?: string;               // aria-label of the amount input, for rows without a visible label
  computedGramsText?: string;         // D13: e.g. "= 30 g", shown muted after the select when a portion is chosen
  invalid?: boolean;                  // sets aria-invalid on the amount input
  describedBy?: string;               // aria-describedby of the amount input
};
```
   Rendering:
   - Always render `<input type="hidden" name={portionIdName} value={portionId ?? ""} />`, so repeated rows keep aligned lists.
   - `portions.length === 0`: render only `NumberInput` (`@/components/forms/NumberInput`) with `unit={gramsLabel}` (grams only).
   - Otherwise render a `flex items-start gap-2` row: a `NumberInput` without a unit (`className="w-24"`), then a shadcn `Select` (`@/components/ui/select`) whose trigger uses `fieldControlClass` from `./field-styles` and `aria-label={unitLabel}`. The options are `"g"` → `gramsLabel` first (D11), then each portion with value `String(id)` and its `label`. Value: `portionId === null ? "g" : String(portionId)`. On change call `onPortionIdChange(value === "g" ? null : Number(value))`. Then, if `computedGramsText` is set and `portionId !== null`, a `<span className="text-sm leading-9 text-muted-foreground whitespace-nowrap">`.
   - Keep the typed amount when the unit changes. The parent decides on resets.
   - Everything stays one ruled line tall (`h-9` controls, `leading-9` text).
6. Docs:
   - `src/lib/CLAUDE.md`: add bullets for `portions.ts` (limits, `PortionAmount`, `PortionSnapshot`, `portionGrams`, `defaultPortion`, `findPortionByName`) and `validation/portions.ts` (`parsePortionRows`, `parsePortionsForm`, fields `portionName`/`portionGrams`, keys `portions` / `portion.<index>`, `PORTION_ERROR_CODES`).
   - `src/components/CLAUDE.md` under **`forms/`**: add `PortionAmountInput` with a one-line description of its props (amount + unit select, hidden portion id, grams-only when no portions).

**Files:**
- Create: `src/lib/portions.ts`, `src/lib/portions.test.ts`
- Create: `src/lib/validation/portions.ts`, `src/lib/validation/portions.test.ts`
- Create: `src/components/forms/PortionAmountInput.tsx`
- Modify: `src/lib/CLAUDE.md`, `src/components/CLAUDE.md`

**Read:** `src/lib/numbers.ts`, `src/lib/validation/composite-foods.ts` (style of a parser with indexed row errors), `src/components/forms/NumberInput.tsx`, `src/components/forms/field-styles.ts`, `src/features/planner/components/EntryFormDialog.tsx:144-167` (how the shadcn `Select` is used), `src/components/CLAUDE.md`, `src/lib/CLAUDE.md`

**Verify:** `npx tsc --noEmit && npm test -- src/lib && npm run lint`
