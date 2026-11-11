"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { Food } from "@/server/dal/foods";
import type { DiaryEntry } from "@/server/dal/diary";
import { saveDiaryEntry, type DiaryEntryFormState } from "@/features/planner/actions";
import { isMeal, MEALS, portionNutrition, type Meal } from "@/lib/diary";
import { parseDecimal } from "@/lib/numbers";
import { matchesQuery } from "@/lib/search";
import type { DiaryEntryErrorField } from "@/lib/validation/diary";
import { cn } from "@/lib/utils";
import { FormField } from "@/components/forms/FormField";
import { NumberInput } from "@/components/forms/NumberInput";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { fieldControlClass } from "@/components/forms/field-styles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type EntryFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string; // YYYY-MM-DD
  foods: Food[]; // all foods incl. archived
  entry: DiaryEntry | null; // null = add
  defaultMeal: Meal; // used when entry is null (D5)
};

export function EntryFormDialog(props: EntryFormDialogProps) {
  const { open, onOpenChange, entry } = props;
  const t = useTranslations("planner");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-hand text-2xl text-primary">
            {entry ? t("dialog.editTitle") : t("dialog.addTitle")}
          </DialogTitle>
          <DialogDescription>{t("dialog.description")}</DialogDescription>
        </DialogHeader>
        <EntryForm {...props} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

const nameCollator = new Intl.Collator("pl", { sensitivity: "base" });
const MAX_CANDIDATES = 8;
const MIN_GRAMS = 0.1;
const MAX_GRAMS = 5000;

type EntryFormProps = EntryFormDialogProps & { onDone: () => void };

/** Mounted inside the dialog content, so its state resets each time the dialog opens. */
function EntryForm({ date, foods, entry, defaultMeal, onDone }: EntryFormProps) {
  const t = useTranslations("planner");
  const format = useFormatter();
  const [state, formAction] = useActionState(saveDiaryEntry, null);

  const [meal, setMeal] = useState<Meal>(entry?.meal ?? defaultMeal);
  const [foodId, setFoodId] = useState<number | null>(entry?.foodId ?? null);
  const [query, setQuery] = useState("");
  const [grams, setGrams] = useState<string>(entry ? String(entry.quantityG) : "");

  const foodsById = new Map(foods.map((f) => [f.id, f]));
  // In edit mode the current food stays selected even if archived (D7).
  const selectedFood = foodId !== null ? (foodsById.get(foodId) ?? null) : null;

  // Food search (D7): non-archived foods only, up to MAX_CANDIDATES matches.
  const trimmedQuery = query.trim();
  const candidates =
    trimmedQuery === ""
      ? []
      : foods
          .filter((f) => f.archivedAt === null && matchesQuery(f.name, trimmedQuery))
          .sort((a, b) => nameCollator.compare(a.name, b.name))
          .slice(0, MAX_CANDIDATES);

  // Live preview (D11): only when a food is picked and the amount is in range.
  const parsedGrams = parseDecimal(grams);
  const previewGrams =
    selectedFood !== null &&
    parsedGrams !== null &&
    parsedGrams >= MIN_GRAMS &&
    parsedGrams <= MAX_GRAMS
      ? parsedGrams
      : null;
  const preview =
    selectedFood !== null && previewGrams !== null
      ? portionNutrition(selectedFood, previewGrams)
      : null;
  const formatOneDecimal = (value: number) =>
    format.number(value, { maximumFractionDigits: 1 });

  // Handle each result once: the effect can re-run when onDone changes identity before the dialog unmounts.
  const handledRef = useRef<DiaryEntryFormState>(null);
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

  const fieldError = (field: DiaryEntryErrorField): string | undefined => {
    const code = state && !state.ok ? state.fieldErrors?.[field] : undefined;
    return code ? t(`errors.${code}`) : undefined;
  };

  const dateError = fieldError("date");
  const mealError = fieldError("meal");
  const foodError = fieldError("foodId");
  const quantityError = fieldError("quantityG");

  return (
    <form action={formAction} className="grid gap-y-4">
      <input type="hidden" name="id" value={entry?.id ?? ""} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="meal" value={meal} />
      <input type="hidden" name="foodId" value={foodId ?? ""} />

      <FormField id="entry-meal" label={t("fields.meal")} error={mealError}>
        <Select
          value={meal}
          onValueChange={(value) => {
            if (isMeal(value)) setMeal(value);
          }}
        >
          <SelectTrigger
            id="entry-meal"
            className={cn("w-full", fieldControlClass)}
            aria-invalid={mealError ? true : undefined}
            aria-describedby={mealError ? "entry-meal-error" : undefined}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MEALS.map((m) => (
              <SelectItem key={m} value={m}>
                {t(`meals.${m}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      {selectedFood ? (
        <div className="grid">
          <div className="flex h-9 items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate">{t("search.selected", { name: selectedFood.name })}</span>
              {selectedFood.archivedAt !== null ? (
                <Badge variant="outline">{t("archivedBadge")}</Badge>
              ) : null}
            </span>
            <Button type="button" variant="outline" size="sm" onClick={() => setFoodId(null)}>
              {t("search.change")}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <FormField id="entry-food-search" label={t("fields.food")} error={foodError}>
            <Input
              id="entry-food-search"
              type="search"
              placeholder={t("search.placeholder")}
              aria-label={t("search.label")}
              className={fieldControlClass}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                // Enter picks nothing here; it must not submit the entry form.
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
                      onClick={() => {
                        setFoodId(f.id);
                        setQuery("");
                      }}
                    >
                      <Plus aria-hidden="true" />
                      {f.name}
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm leading-9 text-muted-foreground">{t("search.noMatches")}</p>
            )
          ) : null}
        </>
      )}

      <FormField id="entry-quantityG" label={t("fields.quantityG")} error={quantityError}>
        <NumberInput
          id="entry-quantityG"
          name="quantityG"
          unit={t("units.g")}
          value={grams}
          onChange={setGrams}
          aria-invalid={quantityError ? true : undefined}
          aria-describedby={quantityError ? "entry-quantityG-error" : undefined}
        />
      </FormField>

      {preview ? (
        <p className="text-sm leading-9 text-muted-foreground">
          {t("preview", {
            kcal: formatOneDecimal(preview.kcal),
            proteinG: formatOneDecimal(preview.proteinG),
            carbsG: formatOneDecimal(preview.carbsG),
            fatG: formatOneDecimal(preview.fatG),
          })}
        </p>
      ) : null}

      {dateError ? (
        <p role="alert" className="text-sm text-destructive">
          {dateError}
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
