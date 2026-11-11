import { parseDecimal } from "@/lib/numbers";
import {
  PORTION_GRAMS_MAX,
  PORTION_GRAMS_MIN,
  PORTION_MAX,
  PORTION_NAME_MAX,
} from "@/lib/portions";

export const PORTION_ERROR_CODES = [
  "portionsTooMany", // field "portions": more than PORTION_MAX non-empty rows
  "portionsInvalid", // field "portions": names and grams lists differ in length
  "portionNameRequired", // row: grams typed, name empty (D12)
  "portionNameTooLong", // row: > PORTION_NAME_MAX chars
  "portionGramsRange", // row: grams empty, unparsable or outside 0.1–5000 (D12)
  "portionDuplicate", // row: same name as an earlier row, ignoring case
] as const;
export type PortionErrorCode = (typeof PORTION_ERROR_CODES)[number];
export type PortionErrorField = "portions" | `portion.${number}`;
export type PortionInput = { name: string; grams: number };
export type PortionsParseResult =
  | { ok: true; data: PortionInput[] }
  | { ok: false; fieldErrors: Partial<Record<PortionErrorField, PortionErrorCode>> };

function readString(value: FormDataEntryValue | null | undefined): string {
  return typeof value === "string" ? value : "";
}

/** Validates parallel lists of raw names and grams. Row errors use the submitted index. */
export function parsePortionRows(names: string[], grams: string[]): PortionsParseResult {
  if (names.length !== grams.length) {
    return { ok: false, fieldErrors: { portions: "portionsInvalid" } };
  }

  const fieldErrors: Partial<Record<PortionErrorField, PortionErrorCode>> = {};
  const data: PortionInput[] = [];
  const seen = new Set<string>();
  let nonEmptyRows = 0;

  for (let i = 0; i < names.length; i++) {
    const name = names[i].trim().replace(/\s+/g, " ");
    const gramsRaw = grams[i].trim();
    if (name === "" && gramsRaw === "") continue;
    nonEmptyRows++;

    const key = `portion.${i}` as const;
    if (name === "") {
      fieldErrors[key] = "portionNameRequired";
      continue;
    }
    if (name.length > PORTION_NAME_MAX) {
      fieldErrors[key] = "portionNameTooLong";
      continue;
    }
    const parsed = gramsRaw === "" ? null : parseDecimal(gramsRaw);
    if (parsed === null || parsed < PORTION_GRAMS_MIN || parsed > PORTION_GRAMS_MAX) {
      fieldErrors[key] = "portionGramsRange";
      continue;
    }
    const normalized = name.toLocaleLowerCase("pl");
    if (seen.has(normalized)) {
      fieldErrors[key] = "portionDuplicate";
      continue;
    }

    seen.add(normalized);
    data.push({ name, grams: parsed });
  }

  if (nonEmptyRows > PORTION_MAX) {
    fieldErrors.portions = "portionsTooMany";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }
  return { ok: true, data };
}

/** Reads repeated form fields "portionName" and "portionGrams" (both may be absent → no portions). */
export function parsePortionsForm(formData: FormData): PortionsParseResult {
  const names = formData.getAll("portionName").map((value) => readString(value));
  const grams = formData.getAll("portionGrams").map((value) => readString(value));
  return parsePortionRows(names, grams);
}
