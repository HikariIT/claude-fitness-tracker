import { parseDecimal } from "@/lib/numbers";
import { FOOD_NAME_MAX, parseFoodId } from "@/lib/validation/foods";

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
] as const;
export type CompositeFoodErrorCode = (typeof COMPOSITE_FOOD_ERROR_CODES)[number];
/** "name" | "components" | "finalWeightG" | `component.${index}` (row index in submitted order). */
export type CompositeFoodErrorField = "name" | "components" | "finalWeightG" | `component.${number}`;

export type CompositeComponentInput = { foodId: number; quantityG: number };
export type CompositeFoodInput = {
  name: string;
  finalWeightG: number | null;
  components: CompositeComponentInput[];
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

/** Reads a dish form (name, finalWeightG, repeated componentFoodId/componentQuantityG) per D9. */
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
  const quantities = formData.getAll("componentQuantityG").map(readString);
  const components: CompositeComponentInput[] = [];

  if (ids.length !== quantities.length) {
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

    quantities.forEach((raw, index) => {
      const quantityG = parseDecimal(raw);
      if (!inRange(quantityG, 0.1, 5000)) {
        fieldErrors[`component.${index}`] = "componentQuantityRange";
        return;
      }
      const foodId = foodIds[index];
      if (foodId !== null) components.push({ foodId, quantityG });
    });
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return { ok: true, data: { name, finalWeightG, components } };
}
