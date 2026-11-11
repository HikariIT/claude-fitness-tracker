"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Exercise, WorkoutDetails } from "@/server/dal/workouts";
import { saveWorkout, type WorkoutFormState } from "@/features/workouts/actions";
import {
  WORKOUT_MAX_SETS,
  WORKOUT_NAME_MAX,
  WORKOUT_NOTES_MAX,
  type WorkoutErrorField,
} from "@/lib/validation/workouts";
import { FormField } from "@/components/forms/FormField";
import { NumberInput } from "@/components/forms/NumberInput";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { fieldControlClass } from "@/components/forms/field-styles";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ExercisePicker, type ExerciseChoice } from "@/features/workouts/components/ExercisePicker";

type TrainingFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string; // YYYY-MM-DD
  workout: WorkoutDetails | null; // null = add; else a training workout
  exercises: Exercise[]; // all, incl. archived
};

export function TrainingFormDialog(props: TrainingFormDialogProps) {
  const { open, onOpenChange, workout } = props;
  const t = useTranslations("workouts");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-hand text-2xl text-primary">
            {workout ? t("dialog.editTrainingTitle") : t("dialog.addTrainingTitle")}
          </DialogTitle>
          <DialogDescription>{t("dialog.trainingDescription")}</DialogDescription>
        </DialogHeader>
        <TrainingForm {...props} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

type SetRow = {
  key: number; // stable React key, never reused
  exercise: ExerciseChoice;
  reps: string;
  weightKg: string;
};

const EMPTY_CHOICE: ExerciseChoice = { exerciseId: null, newName: null };
const rowActionClass = "size-7 text-steel-blue-300 hover:bg-icy-blue-800 hover:text-primary";

type TrainingFormProps = TrainingFormDialogProps & { onDone: () => void };

/** Mounted inside the dialog content, so its state resets each time the dialog opens. */
function TrainingForm({ date, workout, exercises, onDone }: TrainingFormProps) {
  const t = useTranslations("workouts");
  const [state, formAction] = useActionState(saveWorkout, null);

  // Edit mode: rows follow the stored sets (already ordered). Add mode: one empty row.
  const [initialRows] = useState<SetRow[]>(() =>
    workout
      ? workout.sets.map((set, index) => ({
          key: index + 1,
          exercise: { exerciseId: set.exerciseId, newName: null },
          reps: String(set.reps),
          weightKg: set.weightKg === null ? "" : String(set.weightKg),
        }))
      : [{ key: 1, exercise: EMPTY_CHOICE, reps: "", weightKg: "" }],
  );
  const [rows, setRows] = useState<SetRow[]>(initialRows);
  const nextKeyRef = useRef(initialRows.length + 1);
  const [kcal, setKcal] = useState(workout?.kcalBurned != null ? String(workout.kcalBurned) : "");

  const updateRow = (index: number, patch: Partial<Omit<SetRow, "key">>) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  // New sets copy the last row, so repeated sets are quick to add (D5).
  const addRow = () => {
    const key = nextKeyRef.current;
    nextKeyRef.current += 1;
    setRows((prev) => {
      const last = prev[prev.length - 1];
      return [
        ...prev,
        {
          key,
          exercise: last?.exercise ?? EMPTY_CHOICE,
          reps: last?.reps ?? "",
          weightKg: last?.weightKg ?? "",
        },
      ];
    });
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const moveRow = (index: number, delta: -1 | 1) => {
    setRows((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  // Handle each result once: the effect can re-run when onDone changes identity before the dialog unmounts.
  const handledRef = useRef<WorkoutFormState>(null);
  useEffect(() => {
    if (!state || state === handledRef.current) return;
    handledRef.current = state;
    if (state.ok) {
      toast.success(t(state.data.mode === "created" ? "toast.created" : "toast.updated"));
      onDone();
    } else if (state.code === "unexpected") {
      toast.error(t("toast.failed"));
    }
  }, [state, t, onDone]);

  const fieldError = (field: WorkoutErrorField): string | undefined => {
    const code = state && !state.ok ? state.fieldErrors?.[field] : undefined;
    return code ? t(`errors.${code}`) : undefined;
  };

  const dateError = fieldError("date");
  const typeError = fieldError("type");
  const nameError = fieldError("name");
  const setsError = fieldError("sets");
  const kcalError = fieldError("kcalBurned");
  const notesError = fieldError("notes");

  return (
    <form action={formAction} className="grid gap-y-4">
      <input type="hidden" name="id" value={workout?.id ?? ""} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="type" value="training" />

      <FormField id="training-name" label={t("fields.name")} error={nameError}>
        <Input
          id="training-name"
          name="name"
          maxLength={WORKOUT_NAME_MAX}
          defaultValue={workout?.name ?? ""}
          className={fieldControlClass}
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? "training-name-error" : undefined}
        />
      </FormField>

      <section className="grid gap-y-2">
        <h3 className="text-sm font-medium leading-9">{t("fields.sets")}</h3>
        <ul className="grid gap-y-3">
          {rows.map((row, index) => {
            const rowError = fieldError(`set.${index}`);
            const n = index + 1;
            const setId = `training-set-${row.key}`;
            return (
              <li key={row.key} className="grid">
                <div className="flex h-9 items-center justify-between gap-1">
                  <span className="font-hand text-lg leading-9 text-steel-blue-300">
                    {t("set.label", { n })}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={rowActionClass}
                      aria-label={t("actions.moveUp", { n })}
                      disabled={index === 0}
                      onClick={() => moveRow(index, -1)}
                    >
                      <ChevronUp aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={rowActionClass}
                      aria-label={t("actions.moveDown", { n })}
                      disabled={index === rows.length - 1}
                      onClick={() => moveRow(index, 1)}
                    >
                      <ChevronDown aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={`${rowActionClass} hover:bg-destructive/10 hover:text-destructive`}
                      aria-label={t("actions.removeSet", { n })}
                      disabled={rows.length === 1}
                      onClick={() => removeRow(index)}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </span>
                </div>

                <input type="hidden" name="setExerciseId" value={row.exercise.exerciseId ?? ""} />
                <input type="hidden" name="setExerciseName" value={row.exercise.newName ?? ""} />

                <FormField id={`${setId}-exercise`} label={t("fields.exercise")}>
                  <ExercisePicker
                    id={`${setId}-exercise`}
                    exercises={exercises}
                    value={row.exercise}
                    onChange={(exercise) => updateRow(index, { exercise })}
                    invalid={rowError !== undefined}
                  />
                </FormField>

                <div className="grid grid-cols-2 gap-x-3">
                  <FormField id={`${setId}-reps`} label={t("fields.reps")}>
                    <NumberInput
                      id={`${setId}-reps`}
                      name="setReps"
                      inputMode="numeric"
                      value={row.reps}
                      onChange={(reps) => updateRow(index, { reps })}
                      aria-invalid={rowError ? true : undefined}
                      aria-describedby={rowError ? `${setId}-error` : undefined}
                    />
                  </FormField>
                  <FormField id={`${setId}-weight`} label={t("fields.weightKg")}>
                    <NumberInput
                      id={`${setId}-weight`}
                      name="setWeightKg"
                      inputMode="decimal"
                      unit={t("units.kg")}
                      value={row.weightKg}
                      onChange={(weightKg) => updateRow(index, { weightKg })}
                      aria-invalid={rowError ? true : undefined}
                      aria-describedby={rowError ? `${setId}-error` : undefined}
                    />
                  </FormField>
                </div>

                {rowError ? (
                  <p id={`${setId}-error`} role="alert" className="text-sm leading-9 text-destructive">
                    {rowError}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>

        <Button
          type="button"
          variant="outline"
          className="justify-self-start"
          disabled={rows.length >= WORKOUT_MAX_SETS}
          onClick={addRow}
        >
          <Plus aria-hidden="true" />
          {t("actions.addSet")}
        </Button>

        {setsError ? (
          <p role="alert" className="text-sm leading-9 text-destructive">
            {setsError}
          </p>
        ) : null}
      </section>

      <FormField id="training-kcalBurned" label={t("fields.kcalBurned")} error={kcalError}>
        <NumberInput
          id="training-kcalBurned"
          name="kcalBurned"
          inputMode="numeric"
          unit={t("units.kcal")}
          value={kcal}
          onChange={setKcal}
          aria-invalid={kcalError ? true : undefined}
          aria-describedby={kcalError ? "training-kcalBurned-error" : undefined}
        />
      </FormField>

      <FormField id="training-notes" label={t("fields.notes")} error={notesError}>
        <textarea
          id="training-notes"
          name="notes"
          maxLength={WORKOUT_NOTES_MAX}
          defaultValue={workout?.notes ?? ""}
          aria-invalid={notesError ? true : undefined}
          aria-describedby={notesError ? "training-notes-error" : undefined}
          className="min-h-18 rounded-md border bg-white px-3 py-1.5 leading-6"
        />
      </FormField>

      {dateError || typeError ? (
        <p role="alert" className="text-sm text-destructive">
          {dateError ?? typeError}
        </p>
      ) : null}

      <DialogFooter className="pt-2">
        <DialogClose asChild>
          <Button type="button" variant="outline">
            {t("actions.cancel")}
          </Button>
        </DialogClose>
        <SubmitButton pendingLabel={t("actions.saving")}>{t("actions.save")}</SubmitButton>
      </DialogFooter>
    </form>
  );
}
