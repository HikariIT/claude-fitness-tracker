import { describe, expect, it } from "vitest";
import { parseDiaryEntryForm } from "./diary";

function form(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  const values: Record<string, string> = {
    date: "2026-11-11",
    meal: "lunch",
    foodId: "12",
    quantityG: "150",
    ...overrides,
  };
  for (const [key, value] of Object.entries(values)) fd.set(key, value);
  return fd;
}

describe("parseDiaryEntryForm", () => {
  it("accepts a valid entry", () => {
    expect(parseDiaryEntryForm(form())).toEqual({
      ok: true,
      data: { date: "2026-11-11", meal: "lunch", foodId: 12, quantityG: 150 },
    });
  });

  it("accepts a comma decimal separator", () => {
    const result = parseDiaryEntryForm(form({ quantityG: "12,5" }));
    expect(result).toMatchObject({ ok: true, data: { quantityG: 12.5 } });
  });

  it("accepts the quantity boundaries 0.1 and 5000", () => {
    expect(parseDiaryEntryForm(form({ quantityG: "0.1" }))).toMatchObject({ ok: true });
    expect(parseDiaryEntryForm(form({ quantityG: "5000" }))).toMatchObject({ ok: true });
  });

  it("rounds to 0.1 before the range check, so 0.05 is accepted as 0.1", () => {
    expect(parseDiaryEntryForm(form({ quantityG: "0.05" }))).toMatchObject({
      ok: true,
      data: { quantityG: 0.1 },
    });
  });

  it("rejects quantities outside 0.1 to 5000", () => {
    for (const quantityG of ["0.04", "5000.1", "0", "-1", "abc", ""]) {
      expect(parseDiaryEntryForm(form({ quantityG }))).toEqual({
        ok: false,
        fieldErrors: { quantityG: "quantityRange" },
      });
    }
  });

  it("requires a food id", () => {
    expect(parseDiaryEntryForm(form({ foodId: "" }))).toEqual({
      ok: false,
      fieldErrors: { foodId: "foodRequired" },
    });
  });

  it("rejects a non-numeric food id as unavailable", () => {
    expect(parseDiaryEntryForm(form({ foodId: "abc" }))).toEqual({
      ok: false,
      fieldErrors: { foodId: "foodUnavailable" },
    });
  });

  it("rejects an unknown meal", () => {
    expect(parseDiaryEntryForm(form({ meal: "brunch" }))).toEqual({
      ok: false,
      fieldErrors: { meal: "mealInvalid" },
    });
  });

  it("rejects an impossible date", () => {
    expect(parseDiaryEntryForm(form({ date: "2026-02-30" }))).toEqual({
      ok: false,
      fieldErrors: { date: "dateInvalid" },
    });
  });

  it("accepts past and future dates", () => {
    expect(parseDiaryEntryForm(form({ date: "2020-01-01" }))).toMatchObject({ ok: true });
    expect(parseDiaryEntryForm(form({ date: "2031-07-04" }))).toMatchObject({ ok: true });
  });
});
