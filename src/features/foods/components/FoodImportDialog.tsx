"use client";

import { useActionState, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import { importFoodsAction, type FoodImportFormState } from "@/features/foods/actions";
import {
  FOOD_IMPORT_FILE_ERROR_CODES,
  FOOD_IMPORT_MAX_ITEMS,
  parseFoodImport,
  parseFoodImportErrorKey,
  type FoodImportError,
  type FoodImportErrorCode,
  type FoodImportFileErrorCode,
} from "@/lib/validation/food-imports";
import { normalizeFoodName } from "@/lib/validation/foods";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type FoodImportDialogProps = { open: boolean; onOpenChange: (open: boolean) => void };

/** Example of the accepted format. Field names are part of the data contract, not UI text. */
const EXAMPLE = `{
  "foods": [
    { "name": "Curry z ryżem", "kcal": 145, "proteinG": 6, "carbsG": 18, "fatG": 5.2 }
  ]
}`;

export function FoodImportDialog({ open, onOpenChange }: FoodImportDialogProps) {
  const t = useTranslations("foods");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-hand text-2xl text-primary">{t("import.title")}</DialogTitle>
          <DialogDescription>{t("import.description", { max: FOOD_IMPORT_MAX_ITEMS })}</DialogDescription>
        </DialogHeader>
        <FoodImportForm onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

const isFileCode = (code: FoodImportErrorCode): code is FoodImportFileErrorCode =>
  (FOOD_IMPORT_FILE_ERROR_CODES as readonly string[]).includes(code);

/** Mounted inside the dialog content, so its state resets each time the dialog opens. */
function FoodImportForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations("foods");
  const format = useFormatter();
  const [state, formAction] = useActionState(importFoodsAction, null);
  const [text, setText] = useState("");
  // Server errors belong to the text that was submitted; editing the text hides them.
  const [submittedText, setSubmittedText] = useState<string | null>(null);

  // Live client-side check with the same parser the server uses.
  const preview = useMemo(() => (text.trim() === "" ? null : parseFoodImport(text)), [text]);

  const handledRef = useRef<FoodImportFormState>(null);
  useEffect(() => {
    if (!state || state === handledRef.current) return;
    handledRef.current = state;
    if (state.ok) {
      toast.success(t("import.toast", { count: state.data.count }));
      onDone();
    } else if (state.code === "unexpected") {
      toast.error(t("toast.failed"));
    }
  }, [state, t, onDone]);

  const serverErrors: FoodImportError[] =
    state && !state.ok && state.fieldErrors && submittedText === text && preview?.ok
      ? Object.entries(state.fieldErrors).flatMap(([key, code]) => {
          if (!code) return [];
          const { index, field } = parseFoodImportErrorKey(key);
          const name = index === null ? null : (preview.data[index]?.name ?? null);
          return [{ index, field, name, code }];
        })
      : [];
  const errors = preview && !preview.ok ? preview.errors : serverErrors;

  const loadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setText(await file.text());
    event.target.value = ""; // allow loading the same file again
  };

  const describe = (error: FoodImportError): string => {
    const message = isFileCode(error.code)
      ? t(`import.errors.${error.code}`, { max: FOOD_IMPORT_MAX_ITEMS })
      : error.code === "itemNotObject" || error.code === "nameDuplicate"
        ? t(`import.errors.${error.code}`)
        : t(`errors.${error.code}`);
    if (error.index === null) return message;
    const item = error.index + 1;
    return error.name
      ? t("import.itemNamed", { item, name: normalizeFoodName(error.name), message })
      : t("import.item", { item, message });
  };

  const num = (n: number) => format.number(n, { maximumFractionDigits: 1 });

  return (
    <form
      action={formAction}
      onSubmit={() => setSubmittedText(text)}
      className="grid gap-y-4"
    >
      <div className="grid gap-y-2">
        <Label htmlFor="food-import-file">{t("import.fileLabel")}</Label>
        <input
          id="food-import-file"
          type="file"
          accept=".json,application/json"
          onChange={loadFile}
          className="text-sm file:mr-3 file:rounded-md file:border file:bg-white file:px-3 file:py-1 file:text-primary"
        />
      </div>

      <div className="grid gap-y-2">
        <Label htmlFor="food-import-json">{t("import.textLabel")}</Label>
        <textarea
          id="food-import-json"
          name="json"
          rows={8}
          spellCheck={false}
          placeholder={EXAMPLE}
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-invalid={errors.length > 0 ? true : undefined}
          aria-describedby="food-import-status"
          className="w-full rounded-md border bg-white px-3 py-2 font-mono text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </div>

      <div id="food-import-status" aria-live="polite">
        {errors.length > 0 ? (
          <ul role="alert" className="max-h-40 list-disc space-y-1 overflow-y-auto pl-5 text-sm text-destructive">
            {errors.map((error, i) => (
              <li key={i}>{describe(error)}</li>
            ))}
          </ul>
        ) : preview?.ok ? (
          <div className="space-y-1 text-sm">
            <p className="text-primary">{t("import.ready", { count: preview.data.length })}</p>
            <ul className="max-h-40 overflow-y-auto text-muted-foreground">
              {preview.data.map((food) => (
                <li key={food.name}>
                  {t("import.previewRow", {
                    name: food.name,
                    kcal: num(food.kcal),
                    proteinG: num(food.proteinG),
                    carbsG: num(food.carbsG),
                    fatG: num(food.fatG),
                  })}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("import.hint")}</p>
        )}
      </div>

      <DialogFooter className="pt-2">
        <DialogClose asChild>
          <Button type="button" variant="outline">
            {t("actions.cancel")}
          </Button>
        </DialogClose>
        {preview?.ok && serverErrors.length === 0 ? (
          <SubmitButton pendingLabel={t("import.importing")}>{t("import.submit")}</SubmitButton>
        ) : (
          <Button type="button" disabled>
            {t("import.submit")}
          </Button>
        )}
      </DialogFooter>
    </form>
  );
}
