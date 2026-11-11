# 3. PL/EN message keys, treadmill dialog, steps dialog, confirm-delete dialog
**Decisions:** D3, D4, D7, D8, D9, D11

**Notes:** Treadmill and steps kcal estimates are clamped to the 0–5000 kcal range (`Math.min(5000, …)`) so the prefill never exceeds the server limit; the formula is unchanged.

Add every UI string for the workouts feature (subtasks 4 and 5 use these keys too), then build three client dialogs. There are no raw UI strings: all text goes through `useTranslations("workouts")`.

## Already in place (subtask 2)
```ts
// @/features/workouts/actions
export type WorkoutFormState = ActionResult<{ savedAt: number; mode: "created" | "updated" }, WorkoutErrorCode> | null;
export async function saveWorkout(_prev: WorkoutFormState, formData: FormData): Promise<WorkoutFormState>;
export async function deleteWorkoutAction(id: number): Promise<ActionResult<null, WorkoutErrorCode>>;
export type StepsFormState = ActionResult<{ savedAt: number }, StepsErrorCode> | null;
export async function saveSteps(_prev: StepsFormState, formData: FormData): Promise<StepsFormState>;
export async function clearStepsAction(date: string): Promise<ActionResult<null, StepsErrorCode>>;
// @/server/dal/workouts (types only; import with `import type`)
export type WorkoutDetails = Workout & { treadmillSession: TreadmillSession | null; sets: WorkoutSet[] };
// Workout: { id, type: "treadmill"|"training", date, name, notes, kcalBurned: number|null, ... }
// TreadmillSession: { durationMin, speedKmh, inclinePct, ... }
export type DailySteps = { id; date; steps: number; kcal: number; ... };
// @/lib/validation/workouts
export type WorkoutErrorField = "date"|"type"|"kcalBurned"|"notes"|"durationMin"|"speedKmh"|"inclinePct"|"name"|"sets"|`set.${number}`;
export type StepsErrorField = "date" | "steps" | "kcal";
export const WORKOUT_NOTES_MAX = 500;
// @/lib/workouts
export function treadmillDistanceKm(speedKmh: number, durationMin: number): number;
export function estimateTreadmillKcal(i: { speedKmh; inclinePct; durationMin; weightKg }): number;
export function estimateStepsKcal(steps: number, weightKg: number): number;
// @/lib/numbers
export function parseDecimal(raw: string, places = 1): number | null;
export function parseInteger(raw: string): number | null;
```

## Messages: `src/messages/en.json` and `src/messages/pl.json`
Add a new top-level `"workouts"` object after `"planner"` in both files. The keys must be identical (`src/messages/messages.test.ts` checks parity and that no value is empty). Use ICU syntax as below.

| Key | en | pl |
|---|---|---|
| types.treadmill | Treadmill | Bieżnia |
| types.training | Training | Trening |
| list.title | Workouts of the day | Treningi dnia |
| empty.title | No workouts yet | Brak treningów |
| empty.description | Add a treadmill session or a training. | Dodaj sesję na bieżni lub trening. |
| actions.addTreadmill | Treadmill | Bieżnia |
| actions.addTraining | Training | Trening |
| actions.edit | Edit {name} | Edytuj {name} |
| actions.delete | Delete {name} | Usuń {name} |
| actions.save | Save | Zapisz |
| actions.saving | Saving… | Zapisywanie… |
| actions.cancel | Cancel | Anuluj |
| actions.confirmDelete | Delete | Usuń |
| actions.deleting | Deleting… | Usuwanie… |
| actions.addSet | Add set | Dodaj serię |
| actions.removeSet | Remove set {n} | Usuń serię {n} |
| actions.moveUp | Move set {n} up | Przesuń serię {n} w górę |
| actions.moveDown | Move set {n} down | Przesuń serię {n} w dół |
| actions.useEstimate | Use estimate | Użyj szacunku |
| actions.editSteps | Edit steps | Edytuj kroki |
| actions.clearSteps | Clear | Wyczyść |
| actions.clearing | Clearing… | Czyszczenie… |
| dialog.addTreadmillTitle | New treadmill session | Nowa sesja na bieżni |
| dialog.editTreadmillTitle | Edit treadmill session | Edytuj sesję na bieżni |
| dialog.treadmillDescription | Duration, average speed and slope. Calories are estimated from your weight. | Czas, średnia prędkość i nachylenie. Kalorie są szacowane na podstawie Twojej wagi. |
| dialog.addTrainingTitle | New training | Nowy trening |
| dialog.editTrainingTitle | Edit training | Edytuj trening |
| dialog.trainingDescription | Sets with exercise, reps and optional weight. | Serie z ćwiczeniem, powtórzeniami i opcjonalnym ciężarem. |
| dialog.stepsTitle | Daily steps | Kroki dzienne |
| dialog.stepsDescription | Steps walked this day and the calories they burned. | Kroki zrobione tego dnia i spalone przy tym kalorie. |
| fields.durationMin | Duration | Czas trwania |
| fields.speedKmh | Average speed | Średnia prędkość |
| fields.inclinePct | Slope | Nachylenie |
| fields.kcalBurned | Calories burned | Spalone kalorie |
| fields.notes | Notes (optional) | Notatki (opcjonalnie) |
| fields.name | Name (optional) | Nazwa (opcjonalnie) |
| fields.sets | Sets | Serie |
| fields.exercise | Exercise | Ćwiczenie |
| fields.reps | Reps | Powtórzenia |
| fields.weightKg | Weight (optional) | Ciężar (opcjonalnie) |
| fields.steps | Steps | Kroki |
| units.min | min | min |
| units.kmh | km/h | km/h |
| units.pct | % | % |
| units.kcal | kcal | kcal |
| units.kg | kg | kg |
| units.km | km | km |
| distance | Distance: {km} km | Dystans: {km} km |
| estimate.value | Estimate: {kcal} kcal | Szacunek: {kcal} kcal |
| estimate.noProfile | Save your weight in personal data to get an estimate. | Zapisz wagę w danych osobowych, aby otrzymać szacunek. |
| estimate.profileLink | Personal data | Dane osobowe |
| exercise.searchPlaceholder | Search or type a new exercise | Szukaj lub wpisz nowe ćwiczenie |
| exercise.searchLabel | Search exercises | Szukaj ćwiczeń |
| exercise.create | Create "{name}" | Utwórz „{name}” |
| exercise.change | Change | Zmień |
| exercise.newBadge | new | nowe |
| set.label | Set {n} | Seria {n} |
| card.treadmillSummary | {duration} min · {speed} km/h · {incline} % · {distance} km | {duration} min · {speed} km/h · {incline} % · {distance} km |
| card.setLine | {exercise}: {sets} | {exercise}: {sets} |
| card.setWithWeight | {reps} × {weight} kg | {reps} × {weight} kg |
| card.setNoWeight | {reps} reps | {reps} powt. |
| card.kcal | {kcal} kcal | {kcal} kcal |
| steps.title | Steps | Kroki |
| steps.empty | No steps recorded for this day. | Brak zapisanych kroków tego dnia. |
| steps.summary | {steps} steps · {kcal} kcal | {steps} kroków · {kcal} kcal |
| totals.title | Calories burned | Spalone kalorie |
| totals.workouts | Workouts | Treningi |
| totals.steps | Steps | Kroki |
| totals.total | Total | Razem |
| confirmDelete.title | Delete workout? | Usunąć trening? |
| confirmDelete.description | "{name}" will be removed from this day. | „{name}” zostanie usunięty z tego dnia. |
| toast.created | Workout added | Dodano trening |
| toast.updated | Workout updated | Zaktualizowano trening |
| toast.deleted | Workout deleted | Usunięto trening |
| toast.stepsSaved | Steps saved | Zapisano kroki |
| toast.stepsCleared | Steps cleared | Wyczyszczono kroki |
| toast.failed | Something went wrong. Try again. | Coś poszło nie tak. Spróbuj ponownie. |
| errors.dateInvalid | Invalid date. | Nieprawidłowa data. |
| errors.typeInvalid | Unknown workout type. | Nieznany typ treningu. |
| errors.kcalRange | Enter a whole number from 0 to 5000. | Podaj liczbę całkowitą od 0 do 5000. |
| errors.notesTooLong | Notes can have at most 500 characters. | Notatki mogą mieć najwyżej 500 znaków. |
| errors.durationRange | Enter 1–600 minutes. | Podaj od 1 do 600 minut. |
| errors.speedRange | Enter 0.5–25 km/h. | Podaj od 0,5 do 25 km/h. |
| errors.inclineRange | Enter 0–15 %. | Podaj od 0 do 15 %. |
| errors.nameTooLong | The name can have at most 100 characters. | Nazwa może mieć najwyżej 100 znaków. |
| errors.setsRequired | Add at least one set. | Dodaj co najmniej jedną serię. |
| errors.setsTooMany | At most 100 sets. | Najwyżej 100 serii. |
| errors.setExerciseRequired | Pick or create an exercise. | Wybierz lub utwórz ćwiczenie. |
| errors.setExerciseNameTooLong | The exercise name can have at most 100 characters. | Nazwa ćwiczenia może mieć najwyżej 100 znaków. |
| errors.setRepsRange | Reps must be a whole number from 1 to 1000. | Powtórzenia: liczba całkowita od 1 do 1000. |
| errors.setWeightRange | Enter 0–1000 kg. | Podaj od 0 do 1000 kg. |
| errors.exerciseUnavailable | This exercise is no longer available. | To ćwiczenie nie jest już dostępne. |
| errors.stepsRange | Enter a whole number from 0 to 100000. | Podaj liczbę całkowitą od 0 do 100000. |

In JSON, escape the English double quotes in `exercise.create` and `confirmDelete.description` (`"Create \"{name}\""`). The Polish „ ” quotes need no escaping.

## Shared kcal-estimate behaviour (D4, D7)
Both the treadmill and steps dialogs use it. Implement it inline in each dialog:
- State: `kcal: string`, `kcalTouched: boolean`. In add mode, start with `""` / `false`. In edit mode, start with the stored value / `true`.
- `estimate: number | null`: computed from the parsed inputs when they are all in range and `weightKg !== null`, otherwise null.
- The value shown in the kcal field is `kcalTouched ? kcal : estimate !== null ? String(estimate) : kcal`. `onChange` sets `kcal` and `kcalTouched = true`. Submit the shown value (the `NumberInput` has `name="kcalBurned"` / `name="kcal"`).
- Below the field, one line (`text-sm leading-9 text-muted-foreground`):
  - If `weightKg === null`, show `estimate.noProfile` plus a `Link` (from `@/i18n/navigation`) to `/profile` with `estimate.profileLink`.
  - Else if `estimate !== null`, show `estimate.value`. When `kcalTouched` and the shown value differs from the estimate, also show a small outline button `actions.useEstimate` that sets `kcal = String(estimate)`.

## `src/features/workouts/components/TreadmillFormDialog.tsx` (new, client)
Copy the structure of `src/features/planner/components/EntryFormDialog.tsx`: an outer `Dialog` with an inner form component mounted in `DialogContent` (so state resets per open), `useActionState(saveWorkout, null)`, the `handledRef` effect for toasts (`toast.created` / `toast.updated` / `toast.failed`), `fieldError(field)` → `t(\`errors.${code}\`)`, `FormField` + `NumberInput`, and `SubmitButton`.
```ts
type TreadmillFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;                       // YYYY-MM-DD
  workout: WorkoutDetails | null;     // null = add; else a treadmill workout
  weightKg: number | null;            // profile weight, null = no profile (D4)
};
export function TreadmillFormDialog(props: TreadmillFormDialogProps): JSX.Element;
```
- Hidden inputs: `id` (`workout?.id ?? ""`), `date`, `type="treadmill"`.
- Fields: `durationMin` (unit `units.min`), `speedKmh` (`units.kmh`), `inclinePct` (`units.pct`). In edit mode, prefill them from `workout.treadmillSession`. Then the `kcalBurned` field (`units.kcal`) with the estimate behaviour above, using `estimateTreadmillKcal`.
- Below speed/duration, a live `distance` line (`t("distance", { km })` with `format.number(km, { maximumFractionDigits: 2 })`) when both parse in range (D3).
- Then `notes`: a `<textarea name="notes" maxLength={WORKOUT_NOTES_MAX}>` with `fieldControlClass`-like styling (`bg-white rounded-md border px-3 py-1.5 leading-6 min-h-18`) and `id="treadmill-notes"`, wrapped in `FormField`. Prefill it from `workout.notes`.
- In-range checks for the estimate use the D11 ranges: duration 1–600, speed 0.5–25, slope 0–15.
- Title: `dialog.addTreadmillTitle` / `dialog.editTreadmillTitle`. Description: `dialog.treadmillDescription`.

## `src/features/workouts/components/StepsFormDialog.tsx` (new, client)
Same structure, with `useActionState(saveSteps, null)`.
```ts
type StepsFormDialogProps = {
  open: boolean; onOpenChange: (open: boolean) => void;
  date: string; steps: DailySteps | null; weightKg: number | null;
};
```
- Hidden `date`. Field `steps` (`NumberInput`, `inputMode="numeric"`, no unit), prefilled from `steps?.steps`. Field `kcal` with the estimate behaviour, using `estimateStepsKcal(parseInteger(steps), weightKg)` when steps are 0–100000.
- On success: `toast.stepsSaved`, then close.
- When `steps !== null`, the footer also has an outline `actions.clearSteps` button (left side, `type="button"`). It calls `clearStepsAction(date)` in `useTransition`, with the label `actions.clearing` while pending. On ok: `toast.stepsCleared` and close. Otherwise: `toast.failed`.
- Title `dialog.stepsTitle`, description `dialog.stepsDescription`.

## `src/features/workouts/components/ConfirmWorkoutDialog.tsx` (new, client)
Copy `src/features/planner/components/ConfirmEntryDialog.tsx`:
```ts
type ConfirmWorkoutDialogProps = {
  target: { workout: WorkoutDetails; name: string } | null; // null = closed; name is the display name
  onOpenChange: (open: boolean) => void;
};
```
Call `deleteWorkoutAction(workout.id)`. Show `toast.deleted` / `toast.failed`. Use `confirmDelete.title` and `confirmDelete.description` with `{ name }`.

**Files:**
- Modify: `src/messages/en.json`, `src/messages/pl.json`: add the `workouts` namespace
- Create: `src/features/workouts/components/TreadmillFormDialog.tsx`
- Create: `src/features/workouts/components/StepsFormDialog.tsx`
- Create: `src/features/workouts/components/ConfirmWorkoutDialog.tsx`

**Read:** `src/features/planner/components/EntryFormDialog.tsx`, `src/features/planner/components/ConfirmEntryDialog.tsx`, `src/components/forms/FormField.tsx`, `src/components/forms/NumberInput.tsx`, `src/components/forms/field-styles.ts`, `src/messages/en.json:233-330` (the planner namespace, for placement and style), `src/features/workouts/actions.ts`, `src/lib/workouts.ts`

**Verify:** `npx tsc --noEmit && npm test -- src/messages && npm run lint`
