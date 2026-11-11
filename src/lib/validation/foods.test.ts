import { describe, expect, it } from "vitest";
import { parseFoodForm, parseFoodId } from "./foods";

const DEFAULTS: Record<string, string> = {
  name: "Ryż",
  kcal: "130",
  proteinG: "2.7",
  carbsG: "28.2",
  fatG: "0.3",
};

function form(overrides: Record<string, string> = {}): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries({ ...DEFAULTS, ...overrides })) {
    data.set(key, value);
  }
  return data;
}

function errorsFor(overrides: Record<string, string>) {
  const result = parseFoodForm(form(overrides));
  if (result.ok) throw new Error("expected validation to fail");
  return result.fieldErrors;
}

describe("parseFoodForm", () => {
  it("parses valid input, trimming and collapsing the name and accepting a comma", () => {
    expect(
      parseFoodForm(
        form({ name: "  Ryż   gotowany ", kcal: "130", proteinG: "2,7", carbsG: "28.2", fatG: "0.3" }),
      ),
    ).toEqual({
      ok: true,
      data: { name: "Ryż gotowany", kcal: 130, proteinG: 2.7, carbsG: 28.2, fatG: 0.3, portions: [] },
    });
  });

  it("parses two portion rows next to the food fields", () => {
    const data = form();
    data.append("portionName", "Łyżka");
    data.append("portionGrams", "15");
    data.append("portionName", "Łyżeczka");
    data.append("portionGrams", "5,5");
    expect(parseFoodForm(data)).toEqual({
      ok: true,
      data: {
        name: "Ryż",
        kcal: 130,
        proteinG: 2.7,
        carbsG: 28.2,
        fatG: 0.3,
        portions: [
          { name: "Łyżka", grams: 15 },
          { name: "Łyżeczka", grams: 5.5 },
        ],
      },
    });
  });

  it("reports a food field error and a portion row error together", () => {
    const data = form({ kcal: "abc" });
    data.append("portionName", "");
    data.append("portionGrams", "15");
    const result = parseFoodForm(data);
    expect(result).toEqual({
      ok: false,
      fieldErrors: { kcal: "kcalRange", "portion.0": "portionNameRequired" },
    });
  });

  it("requires a name", () => {
    expect(errorsFor({ name: "   " })).toEqual({ name: "nameRequired" });
  });

  it("accepts a 100-character name and rejects 101", () => {
    expect(parseFoodForm(form({ name: "a".repeat(100) })).ok).toBe(true);
    expect(errorsFor({ name: "a".repeat(101) })).toEqual({ name: "nameTooLong" });
  });

  it("checks the kcal range", () => {
    expect(parseFoodForm(form({ kcal: "-1" })).ok).toBe(false);
    expect(parseFoodForm(form({ kcal: "900" })).ok).toBe(true);
    expect(errorsFor({ kcal: "900.1" })).toEqual({ kcal: "kcalRange" });
    expect(errorsFor({ kcal: "abc" })).toEqual({ kcal: "kcalRange" });
  });

  it("checks the protein range", () => {
    const onlyProtein = { carbsG: "0", fatG: "0" };
    expect(parseFoodForm(form({ ...onlyProtein, proteinG: "100" })).ok).toBe(true);
    expect(errorsFor({ ...onlyProtein, proteinG: "100.1" })).toEqual({ proteinG: "proteinRange" });
  });

  it("checks the macro sum", () => {
    expect(parseFoodForm(form({ proteinG: "50", carbsG: "30", fatG: "20" })).ok).toBe(true);
    expect(errorsFor({ proteinG: "50", carbsG: "30", fatG: "20.1" })).toEqual({ macros: "macrosSum" });
  });

  it("skips the macro sum when a macro is individually invalid", () => {
    expect(errorsFor({ proteinG: "90", carbsG: "90", fatG: "101" })).toEqual({ fatG: "fatRange" });
  });

  it("treats a missing field as empty", () => {
    const data = new FormData();
    data.set("name", "Ryż");
    expect(parseFoodForm(data).ok).toBe(false);
    expect(parseFoodForm(data)).toMatchObject({ ok: false, fieldErrors: { kcal: "kcalRange" } });
  });
});

describe("parseFoodId", () => {
  it("accepts positive integers as strings or numbers", () => {
    expect(parseFoodId("12")).toBe(12);
    expect(parseFoodId(12)).toBe(12);
  });

  it("rejects zero, negatives, decimals, empty and non-numeric values", () => {
    expect(parseFoodId("0")).toBeNull();
    expect(parseFoodId("-1")).toBeNull();
    expect(parseFoodId("1.5")).toBeNull();
    expect(parseFoodId("")).toBeNull();
    expect(parseFoodId(null)).toBeNull();
    expect(parseFoodId("abc")).toBeNull();
  });
});
