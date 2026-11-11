# 4. Exercise picker, training dialog, workout card
**Decisions:** D2, D3, D5, D6, D8, D9, D11

**Notes:** The picker offers an archived exercise only as an exact name match (D6), with no archived badge, because the workouts namespace has no archived key. The picker also shows `errors.setExerciseNameTooLong` for an over-long new name.

Build the training add/edit dialog with its inline exercise picker, and the card that shows one workout (either type) in the day list. All strings come from the `workouts` message namespace that subtask 3 added. Use only those keys and do not add new ones, unless one is truly missing: then add it to **both** `en.json` and `pl.json`.

## Already in place
```ts
// @/server/dal/workouts (import type)
export type Exercise = { id: number; name: string; archivedAt: Date | null; ... };
export type WorkoutSet = { id; workoutId; exerciseId: number; order: number; reps: number; weightKg: number | null; ... };
export type WorkoutDetails = Workout & { treadmillSession: TreadmillSession | null; sets: WorkoutSet[] };
// Workout: { id, type: "treadmill"|"training", date, name: string|null, notes: string|null, kcalBurned: number|null }
// TreadmillSession: { durationMin: number, speedKmh: number, inclinePct: number }
// @/features/workouts/actions
export async function saveWorkout(_prev: WorkoutFormState, formData: FormData): Promise<WorkoutFormState>;
// @/lib/validation/workouts
export type WorkoutErrorField = "date"|"type"|"kcalBurned"|"notes"|"durationMin"|"speedKmh"|"inclinePct"|"name"|"sets"|`set.${number}`;
export const WORKOUT_NAME_MAX = 100, WORKOUT_NOTES_MAX = 500, EXERCISE_NAME_MAX = 100, WORKOUT_MAX_SETS = 100;
// @/lib/workouts
export function treadmillDistanceKm(speedKmh: number, durationMin: number): number;
export function groupConsecutiveSets<T extends { exerciseId: number; order: number }>(sets: readonly T[]): { exerciseId: number; sets: T[] }[];
// @/lib/search
export function normalizeForSearch(text: string): string;
export function matchesQuery(name: string, query: string): boolean;
```
Message keys used here: `dialog.addTrainingTitle`, `dialog.editTrainingTitle`, `dialog.trainingDescription`, `fields.name|sets|exercise|reps|weightKg|kcalBurned|notes`, `units.kg|kcal|min|kmh|pct|km`, `set.label {n}`, `actions.addSet|removeSet {n}|moveUp {n}|moveDown {n}|save|saving|cancel|edit {name}|delete {name}`, `exercise.searchPlaceholder|searchLabel|create {name}|change|newBadge`, `types.treadmill|training`, `card.treadmillSummary {duration speed incline distance}`, `card.setLine {exercise sets}`, `card.setWithWeight {reps weight}`, `card.setNoWeight {reps}`, `card.kcal {kcal}`, `toast.created|updated|failed`, `errors.*`.

## `src/features/workouts/components/ExercisePicker.tsx` (new, client)
```ts
export type ExerciseChoice = { exerciseId: number | null; newName: string | null }; // both null = not chosen
type ExercisePickerProps = {
  id: string;                    // input id, used by FormField's label
  exercises: Exercise[];         // all, incl. archived
  value: ExerciseChoice;
  onChange: (value: ExerciseChoice) => void;
  invalid?: boolean;             // sets aria-invalid
};
export function ExercisePicker(props: ExercisePickerProps): JSX.Element;
```
Behaviour (D6), modelled on the food search in `EntryFormDialog.tsx` (lines ~89-97 and ~170-227):
- If an exercise is chosen, show one `h-9` row with the name (for `exerciseId`, look it up in `exercises`; for `newName`, show it with a `Badge variant="outline"` `exercise.newBadge`) and an outline `size="sm"` `exercise.change` button that resets to `{ exerciseId: null, newName: null }`.
- Otherwise show a search `Input` (`type="search"`, `placeholder` `exercise.searchPlaceholder`, `aria-label` `exercise.searchLabel`, `fieldControlClass`, Enter → `preventDefault`). Candidates are non-archived exercises with `matchesQuery(name, query)`, sorted with `Intl.Collator("pl", { sensitivity: "base" })`, at most 6. Each is a ghost button that picks `{ exerciseId, newName: null }`. Below them, when the trimmed query is non-empty, at most `EXERCISE_NAME_MAX` long, and **no** exercise (archived included) has `normalizeForSearch(name) === normalizeForSearch(query)`, add a ghost button `exercise.create` that picks `{ exerciseId: null, newName: trimmedQuery.replace(/\s+/g, " ") }`. When an exact match exists but is archived, still show it as a candidate (the server reuses archived names), so the user can pick it.
- The picker renders **no** form inputs. The dialog writes the hidden fields.

## `src/features/workouts/components/TrainingFormDialog.tsx` (new, client)
Same skeleton as `TreadmillFormDialog.tsx` (subtask 3): outer `Dialog`, inner form mounted per open, `useActionState(saveWorkout, null)`, the `handledRef` toast effect, and `fieldError`.
```ts
type TrainingFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  workout: WorkoutDetails | null;   // null = add; else a training workout
  exercises: Exercise[];
};
```
- Hidden inputs: `id`, `date`, `type="training"`.
- `name`: a text `Input` with `name="name"` and `maxLength={WORKOUT_NAME_MAX}`, prefilled from `workout.name`.
- Sets (D5). State is `rows: { key: number; exercise: ExerciseChoice; reps: string; weightKg: string }[]`, with keys from a `useRef` counter.
  - Initial state: in edit mode, the rows come from `workout.sets` (already sorted by `order`), mapped to `{ exerciseId, newName: null }`, `String(reps)` and `weightKg === null ? "" : String(weightKg)`. In add mode, there is one empty row.
  - Each row is a block with a `font-hand text-lg leading-9 text-steel-blue-300` label `set.label` (`n = index + 1`), with the icon buttons on the same line: up (`ChevronUp`, disabled on the first row), down (`ChevronDown`, disabled on the last), remove (`Trash2`, disabled when there is only 1 row). Each has an `aria-label` from `actions.moveUp|moveDown|removeSet` with `{ n }`. Under the label: `ExercisePicker` (in a `FormField` labelled `fields.exercise`), then on one line a 2-column grid with `reps` (`NumberInput`, `inputMode="numeric"`) and `weightKg` (`NumberInput`, unit `units.kg`).
  - Hidden inputs per row, in row order: `<input type="hidden" name="setExerciseId" value={exercise.exerciseId ?? ""}>` and `<input type="hidden" name="setExerciseName" value={exercise.newName ?? ""}>`. The reps/weight `NumberInput`s carry `name="setReps"` and `name="setWeightKg"`.
  - A row error is `fieldError(\`set.${index}\`)`, shown under the row as `<p role="alert" className="text-sm leading-9 text-destructive">`.
  - `actions.addSet` (outline button with a `Plus` icon, disabled at `WORKOUT_MAX_SETS` rows) appends a row that copies the last row's exercise, reps and weight. This makes repeated sets fast.
  - A list-level error `fieldError("sets")` is shown under the add button.
- `kcalBurned`: a `NumberInput` (unit `units.kcal`), typed by hand (no estimate for training). Prefill it in edit mode.
- `notes`: the same textarea as in `TreadmillFormDialog`, with `id="training-notes"`.
- The dialog content can be tall: add `className="max-h-[90vh] overflow-y-auto"` to `DialogContent`.

## `src/features/workouts/components/WorkoutCard.tsx` (new, client)
```ts
type WorkoutCardProps = {
  workout: WorkoutDetails;
  exercisesById: Map<number, Exercise>;
  onEdit: (workout: WorkoutDetails) => void;
  onDelete: (workout: WorkoutDetails, name: string) => void;
};
/** Display name: training → workout.name ?? t("types.training"); treadmill → t("types.treadmill"). */
export function workoutDisplayName(workout: WorkoutDetails, t: (key: "types.treadmill" | "types.training") => string): string;
export function WorkoutCard(props: WorkoutCardProps): JSX.Element;
```
Layout: notebook ruling. Every line is `h-9 leading-9` and there is **no** vertical padding or border, so the card is a whole number of 36px lines. Use `rounded-xl bg-platinum-900 px-4 shadow-sm ring-1 ring-border` (a ring, not a border, so it doesn't add height). Use `<article>`.
1. Header line: `flex items-center justify-between`. On the left, a `Badge variant="outline"` with `types.<type>` and, for a training with a name, the name in `font-semibold text-primary`. On the right, `card.kcal` (when `kcalBurned !== null`, `font-hand text-xl`), then the edit (`Pencil`) and delete (`Trash2`) ghost icon buttons. Use the same `actionClass` and `aria-label`s (`actions.edit|delete` with `{ name }`) as `src/features/planner/components/EntriesTable.tsx`.
2. Treadmill: one line `card.treadmillSummary` with numbers from `useFormatter().number(…, { maximumFractionDigits: 1 })`. The distance comes from `treadmillDistanceKm` (2 decimals).
3. Training: one line per group from `groupConsecutiveSets(workout.sets)`: `card.setLine` with `exercise` = `exercisesById.get(id)?.name ?? "—"` and `sets` = the group's sets mapped to `card.setWithWeight` / `card.setNoWeight` and joined with `", "`. Lines may truncate (`truncate`).
4. Notes (D9): when present, one `text-muted-foreground italic truncate` line.

**Files:**
- Create: `src/features/workouts/components/ExercisePicker.tsx`
- Create: `src/features/workouts/components/TrainingFormDialog.tsx`
- Create: `src/features/workouts/components/WorkoutCard.tsx`

**Read:** `src/features/workouts/components/TreadmillFormDialog.tsx` (skeleton, notes textarea), `src/features/planner/components/EntryFormDialog.tsx:85-227` (search/candidates pattern), `src/features/planner/components/EntriesTable.tsx:20-30,84-110` (action button classes), `src/features/foods/components/CompositeFoodDialog.tsx:200-300` (repeated rows with hidden inputs), `src/messages/en.json` (the `workouts` namespace only), `src/server/dal/workouts.ts` (types), `src/lib/workouts.ts`, `src/lib/validation/workouts.ts:1-40` (constants and types)

**Verify:** `npx tsc --noEmit && npm run lint`
