"use client";

import { useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";
import { PORTION_MAX, PORTION_NAME_MAX } from "@/lib/portions";
import { NumberInput } from "@/components/forms/NumberInput";
import { fieldControlClass } from "@/components/forms/field-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// placeholder: the dish's default "Portion" row (D2, D3). It is not submitted until grams are typed.
export type PortionRow = { key: number; name: string; grams: string; placeholder?: boolean };

type PortionsEditorProps = {
  idPrefix: string; // "food" | "dish"
  rows: PortionRow[];
  onChange: (rows: PortionRow[]) => void;
  rowError: (index: number) => string | undefined; // translated error of `portion.${index}`
  listError?: string; // translated error of "portions"
};

/** Named portion rows (D8). Inputs are named portionName / portionGrams so they go out with the form. */
export function PortionsEditor({ idPrefix, rows, onChange, rowError, listError }: PortionsEditorProps) {
  const t = useTranslations("foods");
  const nextKey = rows.reduce((max, row) => Math.max(max, row.key), -1) + 1;

  const updateRow = (index: number, patch: Partial<PortionRow>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const removeRow = (index: number) => onChange(rows.filter((_, i) => i !== index));
  const addRow = () => onChange([...rows, { key: nextKey, name: "", grams: "" }]);

  return (
    <section className="grid">
      <h3 className="text-sm font-medium leading-9">{t("portions.title")}</h3>
      <p className="text-sm leading-9 text-muted-foreground">{t("portions.hint")}</p>

      {rows.map((row, index) => {
        const submitted = !(row.placeholder && row.grams.trim() === "");
        const error = rowError(index);
        const errorId = `${idPrefix}-portion-${index}-error`;
        return (
          <div key={row.key} className="flex flex-col">
            <div className="flex items-start gap-2">
              <Input
                id={`${idPrefix}-portion-name-${index}`}
                name={submitted ? "portionName" : undefined}
                maxLength={PORTION_NAME_MAX}
                aria-label={t("portions.name")}
                className={`${fieldControlClass} min-w-0 flex-1`}
                value={row.name}
                onChange={(e) => updateRow(index, { name: e.target.value, placeholder: false })}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
              />
              <div className="w-32 shrink-0">
                <NumberInput
                  id={`${idPrefix}-portion-grams-${index}`}
                  name={submitted ? "portionGrams" : undefined}
                  unit={t("units.g")}
                  aria-label={t("portions.grams")}
                  value={row.grams}
                  onChange={(value) => updateRow(index, { grams: value })}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? errorId : undefined}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("portions.remove")}
                onClick={() => removeRow(index)}
              >
                <X aria-hidden="true" />
              </Button>
            </div>
            {error ? (
              <p id={errorId} role="alert" className="text-sm leading-9 text-destructive">
                {error}
              </p>
            ) : null}
          </div>
        );
      })}

      {listError ? (
        <p role="alert" className="text-sm leading-9 text-destructive">
          {listError}
        </p>
      ) : null}

      <Button
        type="button"
        variant="outline"
        className="mt-3 justify-self-start"
        disabled={rows.length >= PORTION_MAX}
        onClick={addRow}
      >
        <Plus aria-hidden="true" />
        {t("portions.add")}
      </Button>
    </section>
  );
}
