import { parseDecimal } from "@/lib/numbers";
import {
  PORTION_COUNT_MAX,
  PORTION_COUNT_MIN,
  QUANTITY_G_MAX,
  QUANTITY_G_MIN,
  type PortionAmount,
} from "@/lib/portions";
import { FOOD_NAME_MAX, parseFoodId } from "@/lib/validation/foods";
import {
  PORTION_ERROR_CODES,
  parsePortionsForm,
  type PortionErrorField,
  type PortionInput,
} from "@/lib/validation/portions";

export const COMPOSITE_MAX_COMPONENTS = 30;
export const COMPOSITE_FOOD_ERROR_CODES = [
  "nameRequired",
  "nameTooLong",
  "nameTaken", // service only
  "componentsRequired",
  "componentsTooMany",
  "componentDuplicate",
  "componentQuantityRange",
  "componentUnavailable", // bad id here; archived/missing food in the service
  "componentCycle", // service only
  "finalWeightRange",
  "finalWeightTooLow", // service only
  "componentPortionCountRange", // row: portion count outside 0.1–100
  "componentPortionUnavailable", // row: bad portion id here; missing or another food's portion in the service
  "componentGramsRange", // service only: count × portion grams outside 0.1–5000
  ...PORTION_ERROR_CODES,
] as const;
export type CompositeFoodErrorCode = (typeof COMPOSITE_FOOD_ERROR_CODES)[number];
/** "name" | "components" | "finalWeightG" | `component.${index}` (row index in submitted order) | portion fields. */
export type CompositeFoodErrorField =
  | "name"
  | "components"
  | "finalWeightG"
  | `component.${number}`
  | PortionErrorField;

export type CompositeComponentInput = { foodId: number; amount: PortionAmount };
export type CompositeFoodInput = {
  name: string;
  finalWeightG: number | null;
  components: CompositeComponentInput[];
  /** The dish's own portions (D2). */
  portions: PortionInput[];
};
export type CompositeFoodParseResult =
  | { ok: true; data: CompositeFoodInput }
  | { ok: false; fieldErrors: Partial<Record<CompositeFoodErrorField, CompositeFoodErrorCode>> };

function readString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

function inRange(value: number | null, min: number, max: number): value is number {
  return value !== null && value >= min && value <= max;
}

/**
 * Reads a dish form: name, finalWeightG, and per ingredient row the repeated fields
 * componentFoodId, componentPortionId ("" = grams) and componentAmount (grams or portion count).
 * If no componentPortionId is sent at all, every row is grams. Portion rows are read from the
 * repeated portionName / portionGrams fields (D2).
 */
export function parseCompositeFoodForm(formData: FormData): CompositeFoodParseResult {
  const fieldErrors: Partial<Record<CompositeFoodErrorField, CompositeFoodErrorCode>> = {};

  const name = readString(formData.get("name")).trim().replace(/\s+/g, " ");
  if (name === "") {
    fieldErrors.name = "nameRequired";
  } else if (name.length > FOOD_NAME_MAX) {
    fieldErrors.name = "nameTooLong";
  }

  const finalWeightRaw = readString(formData.get("finalWeightG")).trim();
  let finalWeightG: number | null = null;
  if (finalWeightRaw !== "") {
    const parsed = parseDecimal(finalWeightRaw);
    if (inRange(parsed, 1, 20000)) {
      finalWeightG = parsed;
    } else {
      fieldErrors.finalWeightG = "finalWeightRange";
    }
  }

  const ids = formData.getAll("componentFoodId").map(readString);
  const portionIdRaws = formData.getAll("componentPortionId").map(readString);
  const amounts = formData.getAll("componentAmount").map(readString);
  const portionIds = portionIdRaws.length === 0 ? ids.map(() => "") : portionIdRaws;
  const components: CompositeComponentInput[] = [];

  if (ids.length !== amounts.length || ids.length !== portionIds.length) {
    fieldErrors.components = "componentUnavailable";
  } else if (ids.length === 0) {
    fieldErrors.components = "componentsRequired";
  } else {
    if (ids.length > COMPOSITE_MAX_COMPONENTS) {
      fieldErrors.components = "componentsTooMany";
    }

    const foodIds = ids.map(parseFoodId);
    if (fieldErrors.components === undefined && foodIds.some((id) => id === null)) {
      fieldErrors.components = "componentUnavailable";
    }

    const validIds = foodIds.filter((id): id is number => id !== null);
    if (fieldErrors.components === undefined && new Set(validIds).size !== validIds.length) {
      fieldErrors.components = "componentDuplicate";
    }

    amounts.forEach((raw, index) => {
      const key = `component.${index}` as const;
      const foodId = foodIds[index];
      const portionIdRaw = portionIds[index];

      if (portionIdRaw === "") {
        const quantityG = parseDecimal(raw);
        if (!inRange(quantityG, QUANTITY_G_MIN, QUANTITY_G_MAX)) {
          fieldErrors[key] = "componentQuantityRange";
          return;
        }
        if (foodId !== null) components.push({ foodId, amount: { kind: "grams", quantityG } });
        return;
      }

      const portionId = parseFoodId(portionIdRaw);
      if (portionId === null) {
        fieldErrors[key] = "componentPortionUnavailable";
        return;
      }
      const count = parseDecimal(raw);
      if (!inRange(count, PORTION_COUNT_MIN, PORTION_COUNT_MAX)) {
        fieldErrors[key] = "componentPortionCountRange";
        return;
      }
      if (foodId !== null) components.push({ foodId, amount: { kind: "portion", portionId, count } });
    });
  }

  const portions = parsePortionsForm(formData);
  if (!portions.ok) Object.assign(fieldErrors, portions.fieldErrors);

  if (Object.keys(fieldErrors).length > 0 || !portions.ok) {
    return { ok: false, fieldErrors };
  }

  return { ok: true, data: { name, finalWeightG, components, portions: portions.data } };
}
