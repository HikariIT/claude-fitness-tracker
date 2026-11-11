import { describe, expect, it } from "vitest";
import { parsePortionRows, parsePortionsForm } from "@/lib/validation/portions";

describe("parsePortionRows", () => {
  it("accepts valid rows with a comma decimal", () => {
    expect(parsePortionRows(["Łyżka", "Szklanka"], ["15", "2,5"])).toEqual({
      ok: true,
      data: [
        { name: "Łyżka", grams: 15 },
        { name: "Szklanka", grams: 2.5 },
      ],
    });
  });

  it("skips a fully empty row and keeps the submitted index for later errors", () => {
    const result = parsePortionRows(["Łyżka", "", "Kubek"], ["15", "", ""]);
    expect(result).toEqual({ ok: false, fieldErrors: { "portion.2": "portionGramsRange" } });
  });

  it("reports a name without grams as a grams error", () => {
    expect(parsePortionRows(["Łyżka"], [""])).toEqual({
      ok: false,
      fieldErrors: { "portion.0": "portionGramsRange" },
    });
  });

  it("reports grams without a name as a name error", () => {
    expect(parsePortionRows([""], ["15"])).toEqual({
      ok: false,
      fieldErrors: { "portion.0": "portionNameRequired" },
    });
  });

  it("rejects a 31-char name and accepts a 30-char name", () => {
    expect(parsePortionRows(["a".repeat(31)], ["1"])).toEqual({
      ok: false,
      fieldErrors: { "portion.0": "portionNameTooLong" },
    });
    expect(parsePortionRows(["a".repeat(30)], ["1"])).toEqual({
      ok: true,
      data: [{ name: "a".repeat(30), grams: 1 }],
    });
  });

  it("rejects grams 0 and 5000.1, accepts 0.1 and 5000", () => {
    expect(parsePortionRows(["A"], ["0"])).toEqual({
      ok: false,
      fieldErrors: { "portion.0": "portionGramsRange" },
    });
    expect(parsePortionRows(["A"], ["5000.1"])).toEqual({
      ok: false,
      fieldErrors: { "portion.0": "portionGramsRange" },
    });
    expect(parsePortionRows(["A", "B"], ["0.1", "5000"])).toEqual({
      ok: true,
      data: [
        { name: "A", grams: 0.1 },
        { name: "B", grams: 5000 },
      ],
    });
  });

  it("flags a case-insensitive duplicate on the second row only", () => {
    expect(parsePortionRows(["Łyżka", "łyżka"], ["15", "10"])).toEqual({
      ok: false,
      fieldErrors: { "portion.1": "portionDuplicate" },
    });
  });

  it("reports too many non-empty rows", () => {
    const names = Array.from({ length: 11 }, (_, i) => `P${i}`);
    const grams = Array.from({ length: 11 }, () => "1");
    expect(parsePortionRows(names, grams)).toEqual({
      ok: false,
      fieldErrors: { portions: "portionsTooMany" },
    });
  });

  it("reports mismatched list lengths", () => {
    expect(parsePortionRows(["A", "B"], ["1"])).toEqual({
      ok: false,
      fieldErrors: { portions: "portionsInvalid" },
    });
  });
});

describe("parsePortionsForm", () => {
  it("returns no portions when the fields are absent", () => {
    expect(parsePortionsForm(new FormData())).toEqual({ ok: true, data: [] });
  });

  it("reads repeated portionName and portionGrams fields", () => {
    const formData = new FormData();
    formData.append("portionName", "Łyżka");
    formData.append("portionGrams", "15");
    expect(parsePortionsForm(formData)).toEqual({
      ok: true,
      data: [{ name: "Łyżka", grams: 15 }],
    });
  });
});
