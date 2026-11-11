import { parseDecimal } from "@/lib/numbers";

export const FOOD_FIELDS = ["name", "kcal", "proteinG", "carbsG", "fatG"] as const;
export type FoodField = (typeof FOOD_FIELDS)[number];
/** Fields an error can attach to; "macros" is the combined protein + carbs + fat row. */
export type FoodErrorField = FoodField | "macros";

export const FOOD_ERROR_CODES = [
  "nameRequired",
  "nameTooLong",
  "nameTaken",
  "kcalRange",
  "proteinRange",
  "carbsRange",
  "fatRange",
  "macrosSum",
  "foodInUse",
  "foodInComposite",
] as const;
export type FoodErrorCode = (typeof FOOD_ERROR_CODES)[number];

export const FOOD_NAME_MAX = 100;
const INTEGER = /^\d+$/;

export type FoodInput = { name: string; kcal: number; proteinG: number; carbsG: number; fatG: number };

export type FoodParseResult =
  | { ok: true; data: FoodInput }
  | { ok: false; fieldErrors: Partial<Record<FoodErrorField, FoodErrorCode>> };

function readField(formData: FormData, name: FoodField): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function inRange(value: number | null, min: number, max: number): value is number {
  return value !== null && value >= min && value <= max;
}

/** Reads the 5 fields from FormData and validates them per D6. Never produces "nameTaken" (the service does). */
export function parseFoodForm(formData: FormData): FoodParseResult {
  return validateFoodFields({
    name: readField(formData, "name"),
    kcal: readField(formData, "kcal"),
    proteinG: readField(formData, "proteinG"),
    carbsG: readField(formData, "carbsG"),
    fatG: readField(formData, "fatG"),
  });
}

/** Same name normalization as the form: trimmed, inner whitespace collapsed to one space. */
export function normalizeFoodName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/**
 * The food rules shared by the form and the JSON import: name 1–100 chars, kcal 0–900,
 * each macro 0–100 g, protein + carbs + fat ≤ 100 g. Numbers are strings (comma or dot),
 * rounded to 1 decimal. Never produces "nameTaken" (the service does).
 */
export function validateFoodFields(raw: Record<FoodField, string>): FoodParseResult {
  const fieldErrors: Partial<Record<FoodErrorField, FoodErrorCode>> = {};

  const name = normalizeFoodName(raw.name);
  if (name === "") {
    fieldErrors.name = "nameRequired";
  } else if (name.length > FOOD_NAME_MAX) {
    fieldErrors.name = "nameTooLong";
  }

  const kcal = parseDecimal(raw.kcal.trim());
  if (!inRange(kcal, 0, 900)) fieldErrors.kcal = "kcalRange";

  const proteinG = parseDecimal(raw.proteinG.trim());
  if (!inRange(proteinG, 0, 100)) fieldErrors.proteinG = "proteinRange";

  const carbsG = parseDecimal(raw.carbsG.trim());
  if (!inRange(carbsG, 0, 100)) fieldErrors.carbsG = "carbsRange";

  const fatG = parseDecimal(raw.fatG.trim());
  if (!inRange(fatG, 0, 100)) fieldErrors.fatG = "fatRange";

  if (
    !fieldErrors.proteinG &&
    !fieldErrors.carbsG &&
    !fieldErrors.fatG &&
    proteinG !== null &&
    carbsG !== null &&
    fatG !== null &&
    Math.round((proteinG + carbsG + fatG) * 10) / 10 > 100
  ) {
    fieldErrors.macros = "macrosSum";
  }

  if (
    Object.keys(fieldErrors).length > 0 ||
    kcal === null ||
    proteinG === null ||
    carbsG === null ||
    fatG === null
  ) {
    return { ok: false, fieldErrors };
  }

  return { ok: true, data: { name, kcal, proteinG, carbsG, fatG } };
}

/** A positive safe integer id from a string ("12") or a number, else null. Empty string → null. */
export function parseFoodId(raw: unknown): number | null {
  if (typeof raw === "number") {
    return Number.isSafeInteger(raw) && raw > 0 ? raw : null;
  }
  if (typeof raw === "string" && INTEGER.test(raw)) {
    const id = Number(raw);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  }
  return null;
}
