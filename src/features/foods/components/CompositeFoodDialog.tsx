"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import type { Food, FoodComponent } from "@/server/dal/foods";
import { saveCompositeFood, type CompositeFoodFormState } from "@/features/foods/actions";
import { compositeNutrition, totalQuantity, type ComponentPortion } from "@/lib/composite";
import { parseDecimal } from "@/lib/numbers";
import { matchesQuery } from "@/lib/search";
import type { CompositeFoodErrorField } from "@/lib/validation/composite-foods";
import { FormField } from "@/components/forms/FormField";
import { NumberInput } from "@/components/forms/NumberInput";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { fieldControlClass } from "@/components/forms/field-styles";
import { Badge } from "@/components/ui/badge";
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

type CompositeFoodDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  food: Food | null; // null = add, else edit this dish (food.isComposite === true)
  foods: Food[]; // all foods, archived included (for names and the picker)
  components: FoodComponent[]; // all ingredient rows; filter by foodId === food.id
};

export function CompositeFoodDialog({
  open,
  onOpenChange,
  food,
  foods,
  components,
}: CompositeFoodDialogProps) {
  const t = useTranslations("foods");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-hand text-2xl text-primary">
            {food ? t("composite.editTitle") : t("composite.addTitle")}
          </DialogTitle>
          <DialogDescription>{t("composite.description")}</DialogDescription>
        </DialogHeader>
        <CompositeFoodForm
          food={food}
          foods={foods}
          components={components}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

type CompositeRow = { foodId: number; quantity: string };

type CompositeFoodFormProps = {
  food: Food | null;
  foods: Food[];
  components: FoodComponent[];
  onDone: () => void;
};

const nameCollator = new Intl.Collator("pl", { sensitivity: "base" });
const MAX_CANDIDATES = 8;

/** Mounted inside the dialog content, so its state resets each time the dialog opens. */
function CompositeFoodForm({ food, foods, components, onDone }: CompositeFoodFormProps) {
  const t = useTranslations("foods");
  const format = useFormatter();
  const [state, formAction] = useActionState(saveCompositeFood, null);

  const [name, setName] = useState<string>(food?.name ?? "");
  const [finalWeightG, setFinalWeightG] = useState<string>(
    food?.finalWeightG != null ? String(food.finalWeightG) : "",
  );
  const [rows, setRows] = useState<CompositeRow[]>(() =>
    food
      ? components
          .filter((c) => c.foodId === food.id)
          .map((c) => ({ foodId: c.componentFoodId, quantity: String(c.quantityG) }))
      : [],
  );
  const [query, setQuery] = useState<string>("");

  const foodsById = new Map(foods.map((f) => [f.id, f]));

  // Ingredients that parse and point at a known food: used for the total and the preview (D2, D6).
  const portions: ComponentPortion[] = rows.flatMap((row) => {
    const quantityG = parseDecimal(row.quantity);
    const source = foodsById.get(row.foodId);
    if (quantityG === null || quantityG <= 0 || !source) return [];
    return [
      {
        kcal: source.kcal,
        proteinG: source.proteinG,
        carbsG: source.carbsG,
        fatG: source.fatG,
        quantityG,
      },
    ];
  });
  const totalG = totalQuantity(portions);
  const parsedFinalWeight = parseDecimal(finalWeightG);
  const previewFinalWeight =
    parsedFinalWeight !== null && parsedFinalWeight > 0 ? parsedFinalWeight : null;
  const preview =
    portions.length > 0 ? compositeNutrition(portions, previewFinalWeight) : null;

  const formatOneDecimal = (value: number) =>
    format.number(value, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  // Ingredient picker (D6): archived foods and the dish itself are never offered; cycles are left to the server.
  const trimmedQuery = query.trim();
  const rowIds = new Set(rows.map((row) => row.foodId));
  const candidates =
    trimmedQuery === ""
      ? []
      : foods
          .filter(
            (f) =>
              f.archivedAt === null &&
              f.id !== food?.id &&
              !rowIds.has(f.id) &&
              matchesQuery(f.name, trimmedQuery),
          )
          .sort((a, b) => nameCollator.compare(a.name, b.name))
          .slice(0, MAX_CANDIDATES);

  const addRow = (foodId: number) => {
    setRows((prev) => [...prev, { foodId, quantity: "100" }]);
    setQuery("");
  };
  const updateRowQuantity = (index: number, quantity: string) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, quantity } : row)));
  };
  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle each result once: the effect can re-run when onDone changes identity before the dialog unmounts.
  const handledRef = useRef<CompositeFoodFormState>(null);
  useEffect(() => {
    if (!state || state === handledRef.current) return;
    handledRef.current = state;
    if (state.ok) {
      toast.success(t(state.data.mode === "created" ? "toast.dishCreated" : "toast.dishUpdated"));
      onDone();
    } else if (state.code === "unexpected") {
      toast.error(t("toast.failed"));
    }
  }, [state, t, onDone]);

  const fieldError = (field: CompositeFoodErrorField): string | undefined => {
    const code = state && !state.ok ? state.fieldErrors?.[field] : undefined;
    return code ? t(`errors.${code}`) : undefined;
  };

  const nameError = fieldError("name");
  const componentsError = fieldError("components");
  const finalWeightError = fieldError("finalWeightG");

  return (
    <form action={formAction} className="grid gap-y-4">
      <input type="hidden" name="id" value={food?.id ?? ""} />

      <FormField id="dish-name" label={t("fields.name")} error={nameError}>
        <Input
          id="dish-name"
          name="name"
          maxLength={100}
          autoFocus
          className={fieldControlClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? "dish-name-error" : undefined}
        />
      </FormField>

      <FormField id="dish-search" label={t("composite.searchLabel")}>
        <Input
          id="dish-search"
          type="search"
          placeholder={t("composite.searchPlaceholder")}
          className={fieldControlClass}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            // Enter picks nothing here; it must not submit the dish form.
            if (e.key === "Enter") e.preventDefault();
          }}
        />
      </FormField>

      {trimmedQuery !== "" ? (
        candidates.length > 0 ? (
          <ul className="grid">
            {candidates.map((f) => (
              <li key={f.id}>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => addRow(f.id)}
                >
                  <Plus aria-hidden="true" />
                  {f.name}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm leading-9 text-muted-foreground">{t("composite.noMatches")}</p>
        )
      ) : null}

      <section className="grid">
        <h3 className="text-sm font-medium leading-9">{t("composite.components")}</h3>

        {rows.length === 0 ? (
          <p className="text-sm leading-9 text-muted-foreground">
            {t("composite.emptyComponents")}
          </p>
        ) : (
          <ul className="grid">
            {rows.map((row, index) => {
              const source = foodsById.get(row.foodId);
              const rowName = source?.name ?? "";
              const rowError = fieldError(`component.${index}`);
              return (
                <li key={row.foodId} className="flex flex-col">
                  <input type="hidden" name="componentFoodId" value={row.foodId} />
                  <div className="flex items-start gap-2">
                    <div className="flex h-9 min-w-0 flex-1 items-center gap-2">
                      <span className="truncate leading-9">{rowName}</span>
                      {source?.archivedAt ? (
                        <Badge variant="outline">{t("archivedBadge")}</Badge>
                      ) : null}
                    </div>
                    <div className="w-32 shrink-0">
                      <NumberInput
                        id={`dish-quantity-${index}`}
                        name="componentQuantityG"
                        unit={t("units.g")}
                        aria-label={t("composite.quantity", { name: rowName })}
                        value={row.quantity}
                        onChange={(value) => updateRowQuantity(index, value)}
                        aria-invalid={rowError ? true : undefined}
                        aria-describedby={rowError ? `dish-quantity-${index}-error` : undefined}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t("actions.removeComponent")}
                      onClick={() => removeRow(index)}
                    >
                      <X aria-hidden="true" />
                    </Button>
                  </div>
                  {rowError ? (
                    <p
                      id={`dish-quantity-${index}-error`}
                      role="alert"
                      className="text-sm leading-9 text-destructive"
                    >
                      {rowError}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        {componentsError ? (
          <p role="alert" className="text-sm leading-9 text-destructive">
            {componentsError}
          </p>
        ) : null}

        {rows.length > 0 ? (
          <p className="text-sm leading-9 text-muted-foreground">
            {t("composite.totalWeight", { grams: formatOneDecimal(totalG) })}
          </p>
        ) : null}
      </section>

      <FormField
        id="dish-finalWeightG"
        label={t("composite.finalWeightG")}
        hint={t("composite.finalWeightHint")}
        error={finalWeightError}
      >
        <NumberInput
          id="dish-finalWeightG"
          name="finalWeightG"
          unit={t("units.g")}
          value={finalWeightG}
          onChange={setFinalWeightG}
          aria-invalid={finalWeightError ? true : undefined}
          aria-describedby={
            finalWeightError ? "dish-finalWeightG-error" : "dish-finalWeightG-hint"
          }
        />
      </FormField>

      {preview ? (
        <p className="text-sm leading-9">
          {t("composite.preview", {
            kcal: formatOneDecimal(preview.kcal),
            proteinG: formatOneDecimal(preview.proteinG),
            carbsG: formatOneDecimal(preview.carbsG),
            fatG: formatOneDecimal(preview.fatG),
          })}
        </p>
      ) : null}

      {food ? <p className="text-sm text-muted-foreground">{t("composite.editHint")}</p> : null}

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
