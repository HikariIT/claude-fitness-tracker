import { isIsoDate } from "@/lib/dates";
import { isMeal, type Meal } from "@/lib/diary";
import { parseDecimal } from "@/lib/numbers";
import {
  PORTION_COUNT_MAX,
  PORTION_COUNT_MIN,
  QUANTITY_G_MAX,
  QUANTITY_G_MIN,
  type PortionAmount,
} from "@/lib/portions";
import { parseFoodId } from "@/lib/validation/foods";

export const DIARY_ENTRY_ERROR_CODES = [
  "dateInvalid",
  "mealInvalid",
  "foodRequired",
  "foodUnavailable", // service only: missing or archived food (D7)
  "portionUnavailable", // bad portion id here; not this food's portion in the service (D4)
  "quantityRange", // grams out of range, also count × portion grams out of range (D6)
  "portionCountRange",
] as const;
export type DiaryEntryErrorCode = (typeof DIARY_ENTRY_ERROR_CODES)[number];
export type DiaryEntryErrorField = "date" | "meal" | "foodId" | "portionId" | "amount";
export type DiaryEntryInput = { date: string; meal: Meal; foodId: number; amount: PortionAmount };
export type DiaryEntryParseResult =
  | { ok: true; data: DiaryEntryInput }
  | { ok: false; fieldErrors: Partial<Record<DiaryEntryErrorField, DiaryEntryErrorCode>> };

function readString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

function inRange(value: number | null, min: number, max: number): value is number {
  return value !== null && value >= min && value <= max;
}

/**
 * Reads form fields "date", "meal", "foodId", "portionId", "amount". Any valid ISO date is allowed (D10).
 * An empty "portionId" means grams; otherwise "amount" is a count of that portion (D13).
 */
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

  const amountRaw = readString(formData.get("amount"));
  const portionIdRaw = readString(formData.get("portionId")).trim();
  let amount: PortionAmount | null = null;
  if (portionIdRaw === "") {
    const quantityG = parseDecimal(amountRaw);
    if (inRange(quantityG, QUANTITY_G_MIN, QUANTITY_G_MAX)) {
      amount = { kind: "grams", quantityG };
    } else {
      fieldErrors.amount = "quantityRange";
    }
  } else {
    const portionId = parseFoodId(portionIdRaw);
    if (portionId === null) {
      fieldErrors.portionId = "portionUnavailable";
    } else {
      const count = parseDecimal(amountRaw);
      if (inRange(count, PORTION_COUNT_MIN, PORTION_COUNT_MAX)) {
        amount = { kind: "portion", portionId, count };
      } else {
        fieldErrors.amount = "portionCountRange";
      }
    }
  }

  if (Object.keys(fieldErrors).length > 0 || !isMeal(meal) || foodId === null || amount === null) {
    return { ok: false, fieldErrors };
  }

  return { ok: true, data: { date, meal, foodId, amount } };
}
