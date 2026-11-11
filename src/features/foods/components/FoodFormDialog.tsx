"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { Food, FoodPortion } from "@/server/dal/foods";
import { saveFood, type FoodFormState } from "@/features/foods/actions";
import { kcalFromMacros } from "@/lib/nutrition";
import { parseDecimal } from "@/lib/numbers";
import type { FoodFormErrorField } from "@/lib/validation/foods";
import { FormField } from "@/components/forms/FormField";
import { PortionsEditor, type PortionRow } from "./PortionsEditor";
import { NumberInput } from "@/components/forms/NumberInput";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { fieldControlClass } from "@/components/forms/field-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type FoodFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  food: Food | null; // null = add, otherwise edit this food
  portions: FoodPortion[]; // this food's portions only, in sortOrder
};

export function FoodFormDialog({ open, onOpenChange, food, portions }: FoodFormDialogProps) {
  const t = useTranslations("foods");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-hand text-2xl text-primary">
            {food ? t("dialog.editTitle") : t("dialog.addTitle")}
          </DialogTitle>
          <DialogDescription>{t("dialog.description")}</DialogDescription>
        </DialogHeader>
        <FoodForm food={food} portions={portions} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

type FoodFormProps = { food: Food | null; portions: FoodPortion[]; onDone: () => void };

/** Mounted inside the dialog content, so its state resets each time the dialog opens. */
function FoodForm({ food, portions, onDone }: FoodFormProps) {
  const t = useTranslations("foods");
  const [state, formAction] = useActionState(saveFood, null);

  const [name, setName] = useState<string>(food?.name ?? "");
  const [kcal, setKcal] = useState<string>(food ? String(food.kcal) : "");
  const [proteinG, setProteinG] = useState<string>(food ? String(food.proteinG) : "");
  const [carbsG, setCarbsG] = useState<string>(food ? String(food.carbsG) : "");
  const [fatG, setFatG] = useState<string>(food ? String(food.fatG) : "");
  const [portionRows, setPortionRows] = useState<PortionRow[]>(() =>
    portions.map((p, i) => ({ key: i, name: p.name, grams: String(p.grams) })),
  );

  // Live "≈ kcal from macros" hint (D8). Shown only when all three macros parse.
  const protein = parseDecimal(proteinG);
  const carbs = parseDecimal(carbsG);
  const fat = parseDecimal(fatG);
  const macrosKcal =
    protein !== null && carbs !== null && fat !== null
      ? Math.round(kcalFromMacros({ proteinG: protein, carbsG: carbs, fatG: fat }))
      : null;

  // Handle each result once: the effect can re-run when onDone changes identity before the dialog unmounts.
  const handledRef = useRef<FoodFormState>(null);
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

  const fieldError = (field: FoodFormErrorField): string | undefined => {
    const code = state && !state.ok ? state.fieldErrors?.[field] : undefined;
    return code ? t(`errors.${code}`) : undefined;
  };

  const nameError = fieldError("name");
  const kcalError = fieldError("kcal");
  const proteinError = fieldError("proteinG");
  const carbsError = fieldError("carbsG");
  const fatError = fieldError("fatG");
  const macrosError = fieldError("macros");

  return (
    <form action={formAction} className="grid gap-y-4">
      <input type="hidden" name="id" value={food?.id ?? ""} />

      <FormField id="food-name" label={t("fields.name")} error={nameError}>
        <Input
          id="food-name"
          name="name"
          maxLength={100}
          autoFocus
          className={fieldControlClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? "food-name-error" : undefined}
        />
      </FormField>

      <FormField id="food-kcal" label={t("fields.kcal")} error={kcalError}>
        <NumberInput
          id="food-kcal"
          name="kcal"
          unit={t("units.kcal")}
          value={kcal}
          onChange={setKcal}
          aria-invalid={kcalError ? true : undefined}
          aria-describedby={kcalError ? "food-kcal-error" : undefined}
        />
        {macrosKcal !== null ? (
          <div className="flex h-9 items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {t("macros.hint", { kcal: macrosKcal })}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setKcal(String(macrosKcal))}
            >
              {t("macros.use")}
            </Button>
          </div>
        ) : null}
      </FormField>

      <div className="grid gap-x-4 sm:grid-cols-3">
        <FormField id="food-proteinG" label={t("fields.proteinG")} error={proteinError}>
          <NumberInput
            id="food-proteinG"
            name="proteinG"
            unit={t("units.g")}
            value={proteinG}
            onChange={setProteinG}
            aria-invalid={proteinError ? true : undefined}
            aria-describedby={proteinError ? "food-proteinG-error" : undefined}
          />
        </FormField>

        <FormField id="food-carbsG" label={t("fields.carbsG")} error={carbsError}>
          <NumberInput
            id="food-carbsG"
            name="carbsG"
            unit={t("units.g")}
            value={carbsG}
            onChange={setCarbsG}
            aria-invalid={carbsError ? true : undefined}
            aria-describedby={carbsError ? "food-carbsG-error" : undefined}
          />
        </FormField>

        <FormField id="food-fatG" label={t("fields.fatG")} error={fatError}>
          <NumberInput
            id="food-fatG"
            name="fatG"
            unit={t("units.g")}
            value={fatG}
            onChange={setFatG}
            aria-invalid={fatError ? true : undefined}
            aria-describedby={fatError ? "food-fatG-error" : undefined}
          />
        </FormField>
      </div>
      {macrosError ? (
        <p role="alert" className="text-sm text-destructive">
          {macrosError}
        </p>
      ) : null}

      <PortionsEditor
        idPrefix="food"
        rows={portionRows}
        onChange={setPortionRows}
        rowError={(i) => fieldError(`portion.${i}`)}
        listError={fieldError("portions")}
      />

      {food ?<p className="text-sm text-muted-foreground">{t("dialog.editHint")}</p> : null}

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
