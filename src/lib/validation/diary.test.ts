import { describe, expect, it } from "vitest";
import { parseDiaryEntryForm } from "./diary";

function form(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  const values: Record<string, string> = {
    date: "2026-11-11",
    meal: "lunch",
    foodId: "12",
    portionId: "",
    amount: "150",
    ...overrides,
  };
  for (const [key, value] of Object.entries(values)) fd.set(key, value);
  return fd;
}

describe("parseDiaryEntryForm", () => {
  it("accepts a valid grams entry", () => {
    expect(parseDiaryEntryForm(form())).toEqual({
      ok: true,
      data: {
        date: "2026-11-11",
        meal: "lunch",
        foodId: 12,
        amount: { kind: "grams", quantityG: 150 },
      },
    });
  });

  it("accepts a comma decimal separator", () => {
    const result = parseDiaryEntryForm(form({ amount: "12,5" }));
    expect(result).toMatchObject({ ok: true, data: { amount: { kind: "grams", quantityG: 12.5 } } });
  });

  it("accepts the grams boundaries 0.1 and 5000", () => {
    expect(parseDiaryEntryForm(form({ amount: "0.1" }))).toMatchObject({ ok: true });
    expect(parseDiaryEntryForm(form({ amount: "5000" }))).toMatchObject({ ok: true });
  });

  it("rounds to 0.1 before the range check, so 0.05 is accepted as 0.1", () => {
    expect(parseDiaryEntryForm(form({ amount: "0.05" }))).toMatchObject({
      ok: true,
      data: { amount: { kind: "grams", quantityG: 0.1 } },
    });
  });

  it("rejects grams outside 0.1 to 5000", () => {
    for (const amount of ["0.04", "5000.1", "0", "-1", "abc", ""]) {
      expect(parseDiaryEntryForm(form({ amount }))).toEqual({
        ok: false,
        fieldErrors: { amount: "quantityRange" },
      });
    }
  });

  it("accepts a portion entry with a decimal count", () => {
    expect(parseDiaryEntryForm(form({ portionId: "7", amount: "2,5" }))).toEqual({
      ok: true,
      data: {
        date: "2026-11-11",
        meal: "lunch",
        foodId: 12,
        amount: { kind: "portion", portionId: 7, count: 2.5 },
      },
    });
  });

  it("accepts the portion count boundaries 0.1 and 100", () => {
    expect(parseDiaryEntryForm(form({ portionId: "7", amount: "0.1" }))).toMatchObject({ ok: true });
    expect(parseDiaryEntryForm(form({ portionId: "7", amount: "100" }))).toMatchObject({ ok: true });
  });

  it("rejects portion counts outside 0.1 to 100", () => {
    for (const amount of ["0", "100.1", "abc", ""]) {
      expect(parseDiaryEntryForm(form({ portionId: "7", amount }))).toEqual({
        ok: false,
        fieldErrors: { amount: "portionCountRange" },
      });
    }
  });

  it("rejects a non-numeric portion id as unavailable", () => {
    expect(parseDiaryEntryForm(form({ portionId: "abc", amount: "1" }))).toEqual({
      ok: false,
      fieldErrors: { portionId: "portionUnavailable" },
    });
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
