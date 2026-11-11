import {
  FOOD_FIELDS,
  normalizeFoodName,
  validateFoodFields,
  type FoodErrorCode,
  type FoodErrorField,
  type FoodInput,
} from "./foods";

/**
 * JSON import of plain foods (values per 100 g). Accepted shapes:
 *   { "foods": [ { "name", "kcal", "proteinG", "carbsG", "fatG" }, ... ] }
 *   [ { ... }, ... ]
 *   { "name", ... }   (a single food)
 * Numbers may be JSON numbers or numeric strings ("2,7" works too). Other keys (e.g. "notes")
 * are ignored. Every item follows the food form rules (validateFoodFields). The import is
 * all or nothing: one error and nothing is saved.
 */
export const FOOD_IMPORT_MAX_ITEMS = 100;
export const FOOD_IMPORT_MAX_CHARS = 100_000;

export const FOOD_IMPORT_FILE_ERROR_CODES = [
  "invalidJson",
  "invalidShape",
  "empty",
  "tooMany",
  "tooLarge",
] as const;
export type FoodImportFileErrorCode = (typeof FOOD_IMPORT_FILE_ERROR_CODES)[number];
export type FoodImportErrorCode =
  | FoodImportFileErrorCode
  | FoodErrorCode
  | "itemNotObject"
  | "nameDuplicate";

/** index null = the whole file; field null = the whole item. */
export type FoodImportError = {
  index: number | null;
  name: string | null;
  field: FoodErrorField | null;
  code: FoodImportErrorCode;
};

export type FoodImportResult =
  | { ok: true; data: FoodInput[] }
  | { ok: false; errors: FoodImportError[] };

function fileError(code: FoodImportFileErrorCode): FoodImportResult {
  return { ok: false, errors: [{ index: null, name: null, field: null, code }] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Numbers become strings for validateFoodFields; anything that is not a number or string becomes "" (a range error). */
function asText(value: unknown): string {
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  return typeof value === "string" ? value : "";
}

function itemsOf(parsed: unknown): unknown[] | null {
  if (Array.isArray(parsed)) return parsed;
  if (isRecord(parsed)) {
    if (Array.isArray(parsed.foods)) return parsed.foods;
    if ("name" in parsed) return [parsed];
  }
  return null;
}

export function parseFoodImport(text: string): FoodImportResult {
  if (text.length > FOOD_IMPORT_MAX_CHARS) return fileError("tooLarge");
  if (text.trim() === "") return fileError("empty");

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return fileError("invalidJson");
  }

  const items = itemsOf(parsed);
  if (items === null) return fileError("invalidShape");
  if (items.length === 0) return fileError("empty");
  if (items.length > FOOD_IMPORT_MAX_ITEMS) return fileError("tooMany");

  const errors: FoodImportError[] = [];
  const data: FoodInput[] = [];
  const seen = new Set<string>();

  items.forEach((item, index) => {
    if (!isRecord(item)) {
      errors.push({ index, name: null, field: null, code: "itemNotObject" });
      return;
    }
    const raw = Object.fromEntries(FOOD_FIELDS.map((f) => [f, asText(item[f])])) as Record<
      (typeof FOOD_FIELDS)[number],
      string
    >;
    const name = normalizeFoodName(raw.name) || null;
    const result = validateFoodFields(raw);
    if (!result.ok) {
      for (const [field, code] of Object.entries(result.fieldErrors)) {
        errors.push({ index, name, field: field as FoodErrorField, code: code as FoodErrorCode });
      }
      return;
    }
    const key = result.data.name.toLocaleLowerCase();
    if (seen.has(key)) {
      errors.push({ index, name, field: "name", code: "nameDuplicate" });
      return;
    }
    seen.add(key);
    data.push(result.data);
  });

  return errors.length > 0 ? { ok: false, errors } : { ok: true, data };
}

/** Flattens errors into ActionResult fieldErrors keys: "file", "<index>" or "<index>.<field>". */
export function foodImportErrorKey(error: Pick<FoodImportError, "index" | "field">): string {
  if (error.index === null) return "file";
  return error.field === null ? String(error.index) : `${error.index}.${error.field}`;
}

/** Inverse of foodImportErrorKey. Unknown keys give index null. */
export function parseFoodImportErrorKey(key: string): Pick<FoodImportError, "index" | "field"> {
  const [rawIndex, field] = key.split(".");
  const index = /^\d+$/.test(rawIndex) ? Number(rawIndex) : null;
  return { index, field: index === null ? null : ((field as FoodErrorField | undefined) ?? null) };
}
