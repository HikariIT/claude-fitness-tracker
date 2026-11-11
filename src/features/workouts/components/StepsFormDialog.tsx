"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { DailySteps } from "@/server/dal/workouts";
import { clearStepsAction, saveSteps, type StepsFormState } from "@/features/workouts/actions";
import { estimateStepsKcal } from "@/lib/workouts";
import { parseInteger } from "@/lib/numbers";
import type { StepsErrorField } from "@/lib/validation/workouts";
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

type StepsFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string; // YYYY-MM-DD
  steps: DailySteps | null;
  weightKg: number | null; // profile weight, null = no profile (D4)
};

export function StepsFormDialog(props: StepsFormDialogProps) {
  const { open, onOpenChange } = props;
  const t = useTranslations("workouts");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-hand text-2xl text-primary">
            {t("dialog.stepsTitle")}
          </DialogTitle>
          <DialogDescription>{t("dialog.stepsDescription")}</DialogDescription>
        </DialogHeader>
        <StepsForm {...props} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

// Same ranges as the server validation (D11).
const STEPS_MAX = 100000;
const KCAL_MAX = 5000;

type StepsFormProps = StepsFormDialogProps & { onDone: () => void };

/** Mounted inside the dialog content, so its state resets each time the dialog opens. */
function StepsForm({ date, steps, weightKg, onDone }: StepsFormProps) {
  const t = useTranslations("workouts");
  const [state, formAction] = useActionState(saveSteps, null);
  const [clearing, startClearing] = useTransition();

  const [stepsValue, setStepsValue] = useState(steps ? String(steps.steps) : "");
  // Kcal: in edit mode the stored value is the user's; in add mode it follows the estimate until edited (D7).
  const [kcal, setKcal] = useState(steps ? String(steps.kcal) : "");
  const [kcalTouched, setKcalTouched] = useState(steps !== null);

  const parsedSteps = parseInteger(stepsValue);

  const estimate =
    parsedSteps !== null && parsedSteps <= STEPS_MAX && weightKg !== null
      ? Math.min(KCAL_MAX, estimateStepsKcal(parsedSteps, weightKg))
      : null;

  const shownKcal = kcalTouched ? kcal : estimate !== null ? String(estimate) : kcal;

  // Handle each result once: the effect can re-run when onDone changes identity before the dialog unmounts.
  const handledRef = useRef<StepsFormState>(null);
  useEffect(() => {
    if (!state || state === handledRef.current) return;
    handledRef.current = state;
    if (state.ok) {
      toast.success(t("toast.stepsSaved"));
      onDone();
    } else if (state.code === "unexpected") {
      toast.error(t("toast.failed"));
    }
  }, [state, t, onDone]);

  const fieldError = (field: StepsErrorField): string | undefined => {
    const code = state && !state.ok ? state.fieldErrors?.[field] : undefined;
    return code ? t(`errors.${code}`) : undefined;
  };

  const dateError = fieldError("date");
  const stepsError = fieldError("steps");
  const kcalError = fieldError("kcal");

  const clearSteps = () => {
    startClearing(async () => {
      const result = await clearStepsAction(date);
      if (result.ok) {
        toast.success(t("toast.stepsCleared"));
        onDone();
      } else {
        toast.error(t("toast.failed"));
      }
    });
  };

  return (
    <form action={formAction} className="grid gap-y-4">
      <input type="hidden" name="date" value={date} />

      <FormField id="steps-steps" label={t("fields.steps")} error={stepsError}>
        <NumberInput
          id="steps-steps"
          name="steps"
          inputMode="numeric"
          value={stepsValue}
          onChange={setStepsValue}
          aria-invalid={stepsError ? true : undefined}
          aria-describedby={stepsError ? "steps-steps-error" : undefined}
        />
      </FormField>

      <FormField id="steps-kcal" label={t("fields.kcalBurned")} error={kcalError}>
        <NumberInput
          id="steps-kcal"
          name="kcal"
          inputMode="numeric"
          unit={t("units.kcal")}
          value={shownKcal}
          onChange={(value) => {
            setKcal(value);
            setKcalTouched(true);
          }}
          aria-invalid={kcalError ? true : undefined}
          aria-describedby={kcalError ? "steps-kcal-error" : undefined}
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

      {dateError ? (
        <p role="alert" className="text-sm text-destructive">
          {dateError}
        </p>
      ) : null}

      <DialogFooter className="pt-2">
        {steps !== null ? (
          <Button
            type="button"
            variant="outline"
            className="sm:mr-auto"
            onClick={clearSteps}
            disabled={clearing}
          >
            {clearing ? t("actions.clearing") : t("actions.clearSteps")}
          </Button>
        ) : null}
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={clearing}>
            {t("actions.cancel")}
          </Button>
        </DialogClose>
        <SubmitButton pendingLabel={t("actions.saving")}>{t("actions.save")}</SubmitButton>
      </DialogFooter>
    </form>
  );
}
