# 2. Validation, workouts DAL, services and Server Actions
**Decisions:** D2, D3, D5, D6, D7, D8, D9, D11

Add the form parsers (with tests), the reads, the writes and the actions for workouts and daily steps. Subtask 1 already did the schema.

## Already in place (from subtask 1 and earlier)
```ts
// @/db/schema: workouts { id, type: "treadmill"|"training", date: string, name: string|null, notes: string|null, kcalBurned: number|null, createdAt, updatedAt }
//   treadmillSessions { id, workoutId (unique, cascade), durationMin, speedKmh, inclinePct, timestamps }
//   exercises { id, name (unique), archivedAt: Date|null, timestamps }
//   workoutSets { id, workoutId (cascade), exerciseId (restrict), order, reps, weightKg: number|null, timestamps }
//   dailySteps { id, date (unique), steps, kcal, timestamps }
//   relations: workouts → treadmillSession (one), sets (many); workoutSets → exercise (one)
// @/lib/numbers
export function parseDecimal(raw: string, places = 1): number | null;
export function parseInteger(raw: string): number | null;
// @/lib/dates
export function isIsoDate(value: string): boolean;
// @/lib/workouts
export const WORKOUT_TYPES: readonly ["treadmill", "training"]; export type WorkoutType; export function isWorkoutType(v: string): v is WorkoutType;
// @/lib/validation/foods
export function parseFoodId(raw: unknown): number | null; // generic positive integer id parser
// @/types/action-result
export type ActionResult<T, E extends string = string> =
  | { ok: true; data: T }
  | { ok: false; code: "validation" | "unexpected"; fieldErrors?: Partial<Record<string, E>> };
```

## `src/lib/validation/workouts.ts` (new)
Follow the style of `src/lib/validation/diary.ts` and `src/lib/validation/composite-foods.ts` (readString helper, `inRange`, error **codes**, never message strings).
```ts
export const WORKOUT_NAME_MAX = 100;
export const WORKOUT_NOTES_MAX = 500;   // D9
export const EXERCISE_NAME_MAX = 100;
export const WORKOUT_MAX_SETS = 100;

export const WORKOUT_ERROR_CODES = [
  "dateInvalid", "typeInvalid", "kcalRange", "notesTooLong",
  "durationRange", "speedRange", "inclineRange",
  "nameTooLong", "setsRequired", "setsTooMany",
  "setExerciseRequired", "setExerciseNameTooLong", "setRepsRange", "setWeightRange",
  "exerciseUnavailable", // service only: unknown or archived exercise id
] as const;
export type WorkoutErrorCode = (typeof WORKOUT_ERROR_CODES)[number];
/** `set.${index}`: row index in submitted order. */
export type WorkoutErrorField =
  | "date" | "type" | "kcalBurned" | "notes" | "durationMin" | "speedKmh" | "inclinePct"
  | "name" | "sets" | `set.${number}`;

type WorkoutBaseInput = { date: string; kcalBurned: number; notes: string | null };
export type TreadmillWorkoutInput = WorkoutBaseInput & {
  type: "treadmill"; durationMin: number; speedKmh: number; inclinePct: number;
};
export type SetExerciseRef = { exerciseId: number } | { newName: string };
export type WorkoutSetInput = { exercise: SetExerciseRef; reps: number; weightKg: number | null };
export type TrainingWorkoutInput = WorkoutBaseInput & {
  type: "training"; name: string | null; sets: WorkoutSetInput[];
};
export type WorkoutInput = TreadmillWorkoutInput | TrainingWorkoutInput;
export type WorkoutParseResult =
  | { ok: true; data: WorkoutInput }
  | { ok: false; fieldErrors: Partial<Record<WorkoutErrorField, WorkoutErrorCode>> };

export function parseWorkoutForm(formData: FormData): WorkoutParseResult;

export const STEPS_ERROR_CODES = ["dateInvalid", "stepsRange", "kcalRange"] as const;
export type StepsErrorCode = (typeof STEPS_ERROR_CODES)[number];
export type StepsErrorField = "date" | "steps" | "kcal";
export type StepsInput = { date: string; steps: number; kcal: number };
export function parseStepsForm(formData: FormData):
  | { ok: true; data: StepsInput }
  | { ok: false; fieldErrors: Partial<Record<StepsErrorField, StepsErrorCode>> };
```
`parseWorkoutForm` form fields:
- Common: `date` (ISO, `dateInvalid`), `type` (`isWorkoutType`, else `typeInvalid`. If the type is invalid, return only the errors found so far), `kcalBurned` (`parseInteger`, 0–5000, `kcalRange`), `notes` (trim; empty → null; length > 500 → `notesTooLong`).
- Treadmill: `durationMin` (`parseDecimal`, 1–600, `durationRange`), `speedKmh` (0.5–25, `speedRange`), `inclinePct` (0–15, `inclineRange`). Any treadmill `name` is ignored (there is no name field for treadmill).
- Training: `name` (trim, collapse whitespace with `.replace(/\s+/g, " ")`; empty → null; > 100 → `nameTooLong`). Sets come from the repeated fields `setExerciseId`, `setExerciseName`, `setReps`, `setWeightKg` (`formData.getAll`). The row count is `getAll("setReps").length`, and a missing value at an index reads as `""`. 0 rows → `sets: "setsRequired"`. More than 100 → `sets: "setsTooMany"`. Per row `i`, record only the **first** failing check as `set.${i}`:
  1. If `setExerciseId` is non-empty → `parseFoodId`. Invalid → `exerciseUnavailable`. Otherwise use `{ exerciseId }`.
  2. Else, if the name (trimmed, whitespace collapsed) is empty → `setExerciseRequired`, and if it is > 100 → `setExerciseNameTooLong`. Otherwise use `{ newName }`.
  3. `setReps` → `parseInteger`, 1–1000, else `setRepsRange`.
  4. `setWeightKg` → empty → null. Otherwise `parseDecimal(raw, 2)` must be in 0–1000, else `setWeightRange`.
- Returned sets keep the submitted order (the service sets `order = index + 1`).

`parseStepsForm`: `date` (ISO), `steps` (`parseInteger`, 0–100000, `stepsRange`), `kcal` (`parseInteger`, 0–5000, `kcalRange`).

## `src/lib/validation/workouts.test.ts` (new)
Build `FormData` in tests (see `src/lib/validation/composite-foods.test.ts` for the style). Cover:
- A valid treadmill form (with `"6,5"` speed).
- Each treadmill range error, plus an invalid type.
- A valid training form with one existing id and one new name, with weight empty → null and `"42,5"` → 42.5.
- Zero sets → `setsRequired`.
- Per-row errors land on the right `set.${i}` with only the first failing code.
- Notes of 501 chars → `notesTooLong`, and empty notes → null.
- Steps: a valid form, steps `"1.5"` → `stepsRange`, and kcal 5001 → `kcalRange`.

## `src/server/dal/workouts.ts` (new)
Copy the pattern of `src/server/dal/diary.ts` (`import "server-only"`, `"use cache"`, `cacheTag`).
```ts
export type Workout = typeof workouts.$inferSelect;
export type TreadmillSession = typeof treadmillSessions.$inferSelect;
export type WorkoutSet = typeof workoutSets.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
export type DailySteps = typeof dailySteps.$inferSelect;
export type WorkoutDetails = Workout & { treadmillSession: TreadmillSession | null; sets: WorkoutSet[] };

/** D2: the day's workouts by ascending id, sets by `order`. Tag `workouts:<date>`. Exercise names are joined in the UI. */
export async function getWorkoutDay(date: string): Promise<WorkoutDetails[]>;
/** Tag `workouts:<date>`. null when nothing has been saved for that day. */
export async function getDailySteps(date: string): Promise<DailySteps | null>;
/** All exercises, including archived ones, ordered by name. Tag `exercises`. */
export async function listExercises(): Promise<Exercise[]>;
```
`getWorkoutDay` uses the relational API (Drizzle 0.45, v1 syntax):
```ts
db.query.workouts.findMany({
  where: (w, { eq }) => eq(w.date, date),
  orderBy: (w, { asc }) => [asc(w.id)],
  with: { treadmillSession: true, sets: { orderBy: (s, { asc }) => [asc(s.order)] } },
});
```

## `src/server/services/workouts.ts` (new)
Follow `src/server/services/diary.ts` (`import "server-only"`, result unions, `db.transaction`, no throwing for expected failures).
```ts
export type WorkoutWriteResult =
  | { ok: true; workout: Workout; createdExercises: boolean }
  | { ok: false; reason: "notFound" | "exerciseUnavailable" };
export type WorkoutDeleteResult = { ok: true; date: string } | { ok: false; reason: "notFound" };

export async function createWorkout(input: WorkoutInput): Promise<WorkoutWriteResult>;
export async function updateWorkout(id: number, input: WorkoutInput): Promise<WorkoutWriteResult>;
export async function deleteWorkout(id: number): Promise<WorkoutDeleteResult>;
export async function saveDailySteps(input: StepsInput): Promise<DailySteps>;
export async function clearDailySteps(date: string): Promise<void>;
```
Rules:
- Each write runs in one `db.transaction(async (tx) => ...)`.
- **Resolve exercises first** (training only), with a private helper `resolveExerciseIds(tx, sets): Promise<{ ok: true; ids: number[]; created: boolean } | { ok: false }>`:
  1. Collect every `{ exerciseId }`, select them with `inArray(exercises.id, ids)`, and require every id to exist with `archivedAt === null`. Otherwise return `{ ok: false }` → `exerciseUnavailable`. Do this **before** inserting anything.
  2. For each `{ newName }`, look it up case-insensitively: `tx.select().from(exercises).where(sql\`lower(${exercises.name}) = lower(${name})\`).limit(1)`. If it exists, reuse its id (even if archived). Otherwise insert it and set `created = true`. Cache by `name.toLowerCase()` so two rows with the same new name create one exercise.
- create: insert `workouts` with `{ type, date, kcalBurned, notes, name: type === "training" ? input.name : null }`. For treadmill, insert `treadmillSessions` `{ workoutId, durationMin, speedKmh, inclinePct }`. For training, insert `workoutSets` rows `{ workoutId, exerciseId: ids[i], order: i + 1, reps, weightKg }`.
- update (D8): load the workout. If it is missing **or `existing.type !== input.type`** → `notFound` (the type is fixed). Keep the stored `date`. Update `name`, `notes`, `kcalBurned`, `updatedAt: new Date()`. For treadmill, update the session by `workoutId`, or insert it if missing. For training, delete all `workoutSets` of the workout, then insert the new rows.
- delete: `.delete(workouts).where(eq(workouts.id, id)).returning({ date: workouts.date })`. Sessions and sets cascade. No row → `notFound`.
- saveDailySteps: upsert `tx`/`db.insert(dailySteps).values(input).onConflictDoUpdate({ target: dailySteps.date, set: { steps, kcal, updatedAt: new Date() } }).returning()`.
- clearDailySteps: delete the row for that date. A missing row is not an error.

## `src/features/workouts/actions.ts` (new)
`"use server"`. Mirror `src/features/planner/actions.ts` exactly (hidden "id": empty → create, else `parseFoodId`. `try/catch` → `unexpected`. `updateTag` after the write).
```ts
export type WorkoutFormState =
  | ActionResult<{ savedAt: number; mode: "created" | "updated" }, WorkoutErrorCode> | null;
export type WorkoutRowActionResult = ActionResult<null, WorkoutErrorCode>;
export type StepsFormState = ActionResult<{ savedAt: number }, StepsErrorCode> | null;
export type StepsClearResult = ActionResult<null, StepsErrorCode>;

export async function saveWorkout(_prev: WorkoutFormState, formData: FormData): Promise<WorkoutFormState>;
export async function deleteWorkoutAction(id: number): Promise<WorkoutRowActionResult>;
export async function saveSteps(_prev: StepsFormState, formData: FormData): Promise<StepsFormState>;
export async function clearStepsAction(date: string): Promise<StepsClearResult>;
```
- Validation failure → `{ ok: false, code: "validation", fieldErrors }`.
- `exerciseUnavailable` → `{ ok: false, code: "validation", fieldErrors: { sets: "exerciseUnavailable" } }`. `notFound` → `unexpected`.
- After a successful write, call `updateTag(\`workouts:${workout.date}\`)` (for delete, use the returned date). Also call `updateTag("exercises")` when `createdExercises`.
- `clearStepsAction`: if `!isIsoDate(date)` → `{ ok: false, code: "validation", fieldErrors: { date: "dateInvalid" } }`. Otherwise clear, then `updateTag(\`workouts:${date}\`)`.

## Docs
In `src/server/CLAUDE.md`, add bullets for `dal/workouts.ts` (the three reads and their tags) and `services/workouts.ts` (results, type fixed on update, exercises resolved before writes, inline creation case-insensitive, steps upsert). Under **Cache tags**, add `workouts:<YYYY-MM-DD>` (the day's workouts and steps) and `exercises`.

**Files:**
- Create: `src/lib/validation/workouts.ts`, `src/lib/validation/workouts.test.ts`
- Create: `src/server/dal/workouts.ts`
- Create: `src/server/services/workouts.ts`
- Create: `src/features/workouts/actions.ts`
- Modify: `src/server/CLAUDE.md`

**Read:** `src/lib/validation/diary.ts`, `src/lib/validation/composite-foods.ts:40-100` (repeated-field parsing), `src/lib/validation/composite-foods.test.ts:1-40` (FormData test style), `src/db/schema/workouts.ts`, `src/server/dal/diary.ts`, `src/server/services/diary.ts`, `src/features/planner/actions.ts`, `src/server/CLAUDE.md`

**Verify:** `npx tsc --noEmit && npm test`
