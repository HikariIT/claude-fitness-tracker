import { isIsoDate } from "@/lib/dates";
import { isMeal, type Meal } from "@/lib/diary";
import { parseDecimal } from "@/lib/numbers";
import { parseFoodId } from "@/lib/validation/foods";

export const DIARY_ENTRY_ERROR_CODES = [
  "dateInvalid",
  "mealInvalid",
  "foodRequired",
  "foodUnavailable", // service only: missing or archived food (D7)
  "quantityRange",
] as const;
export type DiaryEntryErrorCode = (typeof DIARY_ENTRY_ERROR_CODES)[number];
export type DiaryEntryErrorField = "date" | "meal" | "foodId" | "quantityG";
export type DiaryEntryInput = { date: string; meal: Meal; foodId: number; quantityG: number };
export type DiaryEntryParseResult =
  | { ok: true; data: DiaryEntryInput }
  | { ok: false; fieldErrors: Partial<Record<DiaryEntryErrorField, DiaryEntryErrorCode>> };

function readString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

function inRange(value: number | null, min: number, max: number): value is number {
  return value !== null && value >= min && value <= max;
}

/** Reads form fields "date", "meal", "foodId", "quantityG". Any valid ISO date is allowed (D10). */
export function parseDiaryEntryForm(formData: FormData): DiaryEntryParseResult {
  const fieldErrors: Partial<Record<DiaryEntryErrorField, DiaryEntryErrorCode>> = {};

  const date = readString(formData.get("date")).trim();
  if (!isIsoDate(date)) {
    fieldErrors.date = "dateInvalid";
  }

  const meal = readString(formData.get("meal")).trim();
  if (!isMeal(meal)) {
    fieldErrors.meal = "mealInvalid";
  }

  const foodIdRaw = readString(formData.get("foodId")).trim();
  let foodId: number | null = null;
  if (foodIdRaw === "") {
    fieldErrors.foodId = "foodRequired";
  } else {
    foodId = parseFoodId(foodIdRaw);
    if (foodId === null) fieldErrors.foodId = "foodUnavailable";
  }

  const quantityG = parseDecimal(readString(formData.get("quantityG")));
  if (!inRange(quantityG, 0.1, 5000)) {
    fieldErrors.quantityG = "quantityRange";
  }

  if (Object.keys(fieldErrors).length > 0 || !isMeal(meal) || foodId === null || !inRange(quantityG, 0.1, 5000)) {
    return { ok: false, fieldErrors };
  }

  return { ok: true, data: { date, meal, foodId, quantityG } };
}
