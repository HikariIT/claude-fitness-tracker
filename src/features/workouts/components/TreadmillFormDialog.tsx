"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import type { WorkoutDetails } from "@/server/dal/workouts";
import { saveWorkout, type WorkoutFormState } from "@/features/workouts/actions";
import { estimateTreadmillKcal, treadmillDistanceKm } from "@/lib/workouts";
import { parseDecimal } from "@/lib/numbers";
import { WORKOUT_NOTES_MAX, type WorkoutErrorField } from "@/lib/validation/workouts";
import { Link } from "@/i18n/navigation";
import { FormField } from "@/components/forms/FormField";
import { NumberInput } from "@/components/forms/NumberInput";
import { SubmitButton } from "@/components/forms/SubmitButton";
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

type TreadmillFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string; // YYYY-MM-DD
  workout: WorkoutDetails | null; // null = add; else a treadmill workout
  weightKg: number | null; // profile weight, null = no profile (D4)
};

export function TreadmillFormDialog(props: TreadmillFormDialogProps) {
  const { open, onOpenChange, workout } = props;
  const t = useTranslations("workouts");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-hand text-2xl text-primary">
            {workout ? t("dialog.editTreadmillTitle") : t("dialog.addTreadmillTitle")}
          </DialogTitle>
          <DialogDescription>{t("dialog.treadmillDescription")}</DialogDescription>
        </DialogHeader>
        <TreadmillForm {...props} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

// Same ranges as the server validation (D11).
const DURATION_MIN = 1;
const DURATION_MAX = 600;
const SPEED_MIN = 0.5;
const SPEED_MAX = 25;
const INCLINE_MIN = 0;
const INCLINE_MAX = 15;
const KCAL_MAX = 5000;

type TreadmillFormProps = TreadmillFormDialogProps & { onDone: () => void };

/** Mounted inside the dialog content, so its state resets each time the dialog opens. */
function TreadmillForm({ date, workout, weightKg, onDone }: TreadmillFormProps) {
  const t = useTranslations("workouts");
  const format = useFormatter();
  const [state, formAction] = useActionState(saveWorkout, null);

  const session = workout?.treadmillSession ?? null;
  const [durationMin, setDurationMin] = useState(session ? String(session.durationMin) : "");
  const [speedKmh, setSpeedKmh] = useState(session ? String(session.speedKmh) : "");
  const [inclinePct, setInclinePct] = useState(session ? String(session.inclinePct) : "");
  // Kcal: in edit mode the stored value is the user's; in add mode it follows the estimate until edited (D4).
  const [kcal, setKcal] = useState(
    workout?.kcalBurned != null ? String(workout.kcalBurned) : "",
  );
  const [kcalTouched, setKcalTouched] = useState(workout !== null);

  const duration = parseDecimal(durationMin, 1);
  const speed = parseDecimal(speedKmh, 1);
  const incline = parseDecimal(inclinePct, 1);
  // Null unless all three inputs are present and in range (D11).
  const inRange =
    duration !== null &&
    duration >= DURATION_MIN &&
    duration <= DURATION_MAX &&
    speed !== null &&
    speed >= SPEED_MIN &&
    speed <= SPEED_MAX &&
    incline !== null &&
    incline >= INCLINE_MIN &&
    incline <= INCLINE_MAX
      ? { durationMin: duration, speedKmh: speed, inclinePct: incline }
      : null;

  const distanceKm = inRange ? treadmillDistanceKm(inRange.speedKmh, inRange.durationMin) : null;

  const estimate =
    inRange !== null && weightKg !== null
      ? Math.min(KCAL_MAX, estimateTreadmillKcal({ ...inRange, weightKg }))
      : null;

  const shownKcal = kcalTouched ? kcal : estimate !== null ? String(estimate) : kcal;

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
  const durationError = fieldError("durationMin");
  const speedError = fieldError("speedKmh");
  const inclineError = fieldError("inclinePct");
  const kcalError = fieldError("kcalBurned");
  const notesError = fieldError("notes");

  return (
    <form action={formAction} className="grid gap-y-4">
      <input type="hidden" name="id" value={workout?.id ?? ""} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="type" value="treadmill" />

      <FormField id="treadmill-durationMin" label={t("fields.durationMin")} error={durationError}>
        <NumberInput
          id="treadmill-durationMin"
          name="durationMin"
          unit={t("units.min")}
          value={durationMin}
          onChange={setDurationMin}
          aria-invalid={durationError ? true : undefined}
          aria-describedby={durationError ? "treadmill-durationMin-error" : undefined}
        />
      </FormField>

      <FormField id="treadmill-speedKmh" label={t("fields.speedKmh")} error={speedError}>
        <NumberInput
          id="treadmill-speedKmh"
          name="speedKmh"
          unit={t("units.kmh")}
          value={speedKmh}
          onChange={setSpeedKmh}
          aria-invalid={speedError ? true : undefined}
          aria-describedby={speedError ? "treadmill-speedKmh-error" : undefined}
        />
      </FormField>

      {distanceKm !== null ? (
        <p className="text-sm leading-9 text-muted-foreground">
          {t("distance", {
            km: format.number(distanceKm, { maximumFractionDigits: 2 }),
          })}
        </p>
      ) : null}

      <FormField id="treadmill-inclinePct" label={t("fields.inclinePct")} error={inclineError}>
        <NumberInput
          id="treadmill-inclinePct"
          name="inclinePct"
          unit={t("units.pct")}
          value={inclinePct}
          onChange={setInclinePct}
          aria-invalid={inclineError ? true : undefined}
          aria-describedby={inclineError ? "treadmill-inclinePct-error" : undefined}
        />
      </FormField>

      <FormField id="treadmill-kcalBurned" label={t("fields.kcalBurned")} error={kcalError}>
        <NumberInput
          id="treadmill-kcalBurned"
          name="kcalBurned"
          inputMode="numeric"
          unit={t("units.kcal")}
          value={shownKcal}
          onChange={(value) => {
            setKcal(value);
            setKcalTouched(true);
          }}
          aria-invalid={kcalError ? true : undefined}
          aria-describedby={kcalError ? "treadmill-kcalBurned-error" : undefined}
        />
      </FormField>

      {weightKg === null ? (
        <p className="text-sm leading-9 text-muted-foreground">
          {t("estimate.noProfile")}{" "}
          <Link href="/profile" className="text-primary underline underline-offset-4">
            {t("estimate.profileLink")}
          </Link>
        </p>
      ) : estimate !== null ? (
        <div className="flex h-9 items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>{t("estimate.value", { kcal: estimate })}</span>
          {kcalTouched && kcal !== String(estimate) ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setKcal(String(estimate));
                setKcalTouched(true);
              }}
            >
              {t("actions.useEstimate")}
            </Button>
          ) : null}
        </div>
      ) : null}

      <FormField id="treadmill-notes" label={t("fields.notes")} error={notesError}>
        <textarea
          id="treadmill-notes"
          name="notes"
          maxLength={WORKOUT_NOTES_MAX}
          defaultValue={workout?.notes ?? ""}
          aria-invalid={notesError ? true : undefined}
          aria-describedby={notesError ? "treadmill-notes-error" : undefined}
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
