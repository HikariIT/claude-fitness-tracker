import { describe, expect, it } from "vitest";
import {
  FOOD_IMPORT_MAX_CHARS,
  FOOD_IMPORT_MAX_ITEMS,
  foodImportErrorKey,
  parseFoodImport,
  parseFoodImportErrorKey,
} from "./food-imports";

const rice = { name: "Ryż gotowany", kcal: 130, proteinG: 2.7, carbsG: 28.2, fatG: 0.3 };

function errorsOf(text: string) {
  const result = parseFoodImport(text);
  if (result.ok) throw new Error("expected import to fail");
  return result.errors;
}

describe("parseFoodImport", () => {
  it("accepts { foods: [...] }, a bare array and a single object", () => {
    expect(parseFoodImport(JSON.stringify({ foods: [rice] }))).toEqual({ ok: true, data: [rice] });
    expect(parseFoodImport(JSON.stringify([rice]))).toEqual({ ok: true, data: [rice] });
    expect(parseFoodImport(JSON.stringify(rice))).toEqual({ ok: true, data: [rice] });
  });

  it("accepts numeric strings with a comma, rounds to 1 decimal, normalizes the name and ignores extra keys", () => {
    const item = { name: "  Curry   z ryżem ", kcal: "145,46", proteinG: 6.04, carbsG: "18", fatG: 4, notes: "x" };
    expect(parseFoodImport(JSON.stringify([item]))).toEqual({
      ok: true,
      data: [{ name: "Curry z ryżem", kcal: 145.5, proteinG: 6, carbsG: 18, fatG: 4 }],
    });
  });

  it("reports file-level errors", () => {
    expect(errorsOf("")).toEqual([{ index: null, name: null, field: null, code: "empty" }]);
    expect(errorsOf("{ nope")[0].code).toBe("invalidJson");
    expect(errorsOf('"text"')[0].code).toBe("invalidShape");
    expect(errorsOf('{"items": []}')[0].code).toBe("invalidShape");
    expect(errorsOf("[]")[0].code).toBe("empty");
    expect(errorsOf(JSON.stringify(Array(FOOD_IMPORT_MAX_ITEMS + 1).fill(rice)))[0].code).toBe("tooMany");
    expect(errorsOf(" ".repeat(FOOD_IMPORT_MAX_CHARS + 1))[0].code).toBe("tooLarge");
  });

  it("accepts exactly the item limit", () => {
    const items = Array.from({ length: FOOD_IMPORT_MAX_ITEMS }, (_, i) => ({ ...rice, name: `Food ${i}` }));
    expect(parseFoodImport(JSON.stringify(items)).ok).toBe(true);
  });

  it("applies the food form rules per item, with index and name", () => {
    const errors = errorsOf(
      JSON.stringify([
        rice,
        { name: "Too much", kcal: 901, proteinG: 50, carbsG: 40, fatG: 20 },
        { name: "", kcal: "abc", proteinG: -1, carbsG: 0, fatG: 0 },
        "not an object",
      ]),
    );
    expect(errors).toEqual([
      { index: 1, name: "Too much", field: "kcal", code: "kcalRange" },
      { index: 1, name: "Too much", field: "macros", code: "macrosSum" },
      { index: 2, name: null, field: "name", code: "nameRequired" },
      { index: 2, name: null, field: "kcal", code: "kcalRange" },
      { index: 2, name: null, field: "proteinG", code: "proteinRange" },
      { index: 3, name: null, field: null, code: "itemNotObject" },
    ]);
  });

  it("treats missing or non-numeric fields as range errors and long names as nameTooLong", () => {
    const errors = errorsOf(JSON.stringify([{ name: "x".repeat(101), kcal: null, proteinG: true, carbsG: 1, fatG: 1 }]));
    expect(errors.map((e) => e.code)).toEqual(["nameTooLong", "kcalRange", "proteinRange"]);
  });

  it("accepts the boundaries: kcal 900 and macros summing to exactly 100 g", () => {
    const item = { name: "Edge", kcal: 900, proteinG: 0, carbsG: 0, fatG: 100 };
    expect(parseFoodImport(JSON.stringify([item])).ok).toBe(true);
  });

  it("refuses duplicate names in the file, ignoring case", () => {
    const errors = errorsOf(JSON.stringify([rice, { ...rice, name: "RYŻ  gotowany" }]));
    expect(errors).toEqual([{ index: 1, name: "RYŻ gotowany", field: "name", code: "nameDuplicate" }]);
  });
});

describe("foodImportErrorKey", () => {
  it("round-trips file, item and field keys", () => {
    for (const error of [
      { index: null, field: null },
      { index: 3, field: null },
      { index: 0, field: "kcal" as const },
    ]) {
      expect(parseFoodImportErrorKey(foodImportErrorKey(error))).toEqual(error);
    }
    expect(foodImportErrorKey({ index: 2, field: "name" })).toBe("2.name");
  });
});
