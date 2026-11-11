"use client";

import { NumberInput } from "@/components/forms/NumberInput";
import { fieldControlClass } from "@/components/forms/field-styles";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type PortionOption = { id: number; label: string }; // label is pre-formatted by the parent, e.g. "Łyżka (15 g)"

type PortionAmountInputProps = {
  id: string; // id of the amount <input>, for <label htmlFor>
  amountName: string; // form field name of the amount, e.g. "amount" or "componentAmount"
  portionIdName: string; // form field name of the hidden portion id, e.g. "portionId" or "componentPortionId"
  portions: readonly PortionOption[]; // the picked food's portions in sortOrder; may be empty
  portionId: number | null; // null = grams
  onPortionIdChange: (id: number | null) => void;
  amount: string;
  onAmountChange: (value: string) => void;
  gramsLabel: string; // translated "g"
  unitLabel: string; // aria-label of the unit select
  amountLabel?: string; // aria-label of the amount input, for rows without a visible label
  computedGramsText?: string; // D13: e.g. "= 30 g", shown muted after the select when a portion is chosen
  invalid?: boolean; // sets aria-invalid on the amount input
  describedBy?: string; // aria-describedby of the amount input
};

/** Amount input with a unit select (grams plus the food's portions). Keeps the portion id in a hidden field. */
export function PortionAmountInput({
  id,
  amountName,
  portionIdName,
  portions,
  portionId,
  onPortionIdChange,
  amount,
  onAmountChange,
  gramsLabel,
  unitLabel,
  amountLabel,
  computedGramsText,
  invalid,
  describedBy,
}: PortionAmountInputProps) {
  const hidden = <input type="hidden" name={portionIdName} value={portionId ?? ""} />;
  const ariaProps = {
    id,
    name: amountName,
    "aria-label": amountLabel,
    "aria-invalid": invalid ? true : undefined,
    "aria-describedby": describedBy,
  };

  if (portions.length === 0) {
    return (
      <>
        {hidden}
        <NumberInput {...ariaProps} value={amount} onChange={onAmountChange} unit={gramsLabel} />
      </>
    );
  }

  return (
    <>
      {hidden}
      <div className="flex items-start gap-2">
        <NumberInput {...ariaProps} className="w-24" value={amount} onChange={onAmountChange} />
        <Select
          value={portionId === null ? "g" : String(portionId)}
          onValueChange={(value) => onPortionIdChange(value === "g" ? null : Number(value))}
        >
          <SelectTrigger aria-label={unitLabel} className={fieldControlClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="g">{gramsLabel}</SelectItem>
            {portions.map((portion) => (
              <SelectItem key={portion.id} value={String(portion.id)}>
                {portion.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {computedGramsText && portionId !== null ? (
          <span className="text-sm leading-9 text-muted-foreground whitespace-nowrap">
            {computedGramsText}
          </span>
        ) : null}
      </div>
    </>
  );
}
