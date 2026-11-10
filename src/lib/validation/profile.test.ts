import { describe, expect, it } from "vitest";
import { parseProfileForm } from "./profile";

const TODAY = "2026-11-10";

const DEFAULTS: Record<string, string> = {
  sex: "female",
  birthDate: "1995-04-12",
  heightCm: "168",
  weightKg: "62.5",
  activityLevel: "moderate",
  kcalGoal: "1800",
  proteinGoalG: "110",
};

function form(overrides: Record<string, string> = {}): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries({ ...DEFAULTS, ...overrides })) {
    data.set(key, value);
  }
  return data;
}

function errorsFor(overrides: Record<string, string>) {
  const result = parseProfileForm(form(overrides), TODAY);
  if (result.ok) throw new Error("expected validation to fail");
  return result.fieldErrors;
}

function dataFor(overrides: Record<string, string>) {
  const result = parseProfileForm(form(overrides), TODAY);
  if (!result.ok) throw new Error(`expected validation to pass: ${JSON.stringify(result.fieldErrors)}`);
  return result.data;
}

describe("parseProfileForm", () => {
  it("parses valid input with the correct types", () => {
    expect(parseProfileForm(form(), TODAY)).toEqual({
      ok: true,
      data: {
        sex: "female",
        birthDate: "1995-04-12",
        heightCm: 168,
        weightKg: 62.5,
        activityLevel: "moderate",
        kcalGoal: 1800,
        proteinGoalG: 110,
      },
    });
  });

  it("accepts a comma decimal separator", () => {
    expect(dataFor({ weightKg: "62,5" }).weightKg).toBe(62.5);
  });

  it("rounds weight to 1 decimal", () => {
    expect(dataFor({ weightKg: "70.04" }).weightKg).toBe(70);
  });

  it("maps an empty protein goal to null", () => {
    expect(dataFor({ proteinGoalG: "" }).proteinGoalG).toBeNull();
  });

  it("accepts range boundaries", () => {
    expect(dataFor({ heightCm: "100" }).heightCm).toBe(100);
    expect(dataFor({ heightCm: "250" }).heightCm).toBe(250);
    expect(dataFor({ weightKg: "30" }).weightKg).toBe(30);
    expect(dataFor({ weightKg: "300" }).weightKg).toBe(300);
    expect(dataFor({ kcalGoal: "800" }).kcalGoal).toBe(800);
    expect(dataFor({ kcalGoal: "10000" }).kcalGoal).toBe(10000);
    expect(dataFor({ proteinGoalG: "0" }).proteinGoalG).toBe(0);
    expect(dataFor({ proteinGoalG: "500" }).proteinGoalG).toBe(500);
  });

  it("rejects values just outside the range", () => {
    expect(errorsFor({ heightCm: "99" })).toEqual({ heightCm: "heightRange" });
    expect(errorsFor({ heightCm: "250.1" })).toEqual({ heightCm: "heightRange" });
    expect(errorsFor({ weightKg: "29.9" })).toEqual({ weightKg: "weightRange" });
    expect(errorsFor({ weightKg: "300.1" })).toEqual({ weightKg: "weightRange" });
    expect(errorsFor({ kcalGoal: "799" })).toEqual({ kcalGoal: "kcalGoalRange" });
    expect(errorsFor({ kcalGoal: "10001" })).toEqual({ kcalGoal: "kcalGoalRange" });
    expect(errorsFor({ proteinGoalG: "-1" })).toEqual({ proteinGoalG: "proteinGoalRange" });
    expect(errorsFor({ proteinGoalG: "501" })).toEqual({ proteinGoalG: "proteinGoalRange" });
  });

  it("rejects an impossible calendar date", () => {
    expect(errorsFor({ birthDate: "2026-02-30" })).toEqual({ birthDate: "birthDateInvalid" });
  });

  it("rejects a future birth date", () => {
    expect(errorsFor({ birthDate: "2026-11-11" })).toEqual({ birthDate: "birthDateFuture" });
  });

  it("rejects a birth date before 1900", () => {
    expect(errorsFor({ birthDate: "1899-12-31" })).toEqual({ birthDate: "birthDateInvalid" });
  });

  it("rejects an unknown sex or activity level", () => {
    expect(errorsFor({ sex: "other" })).toEqual({ sex: "sexInvalid" });
    expect(errorsFor({ activityLevel: "extreme" })).toEqual({ activityLevel: "activityInvalid" });
  });

  it("collects several field errors at once", () => {
    expect(errorsFor({ heightCm: "50", weightKg: "abc", kcalGoal: "" })).toEqual({
      heightCm: "heightRange",
      weightKg: "weightRange",
      kcalGoal: "kcalGoalRange",
    });
  });

  it("rejects a non-integer kcal goal instead of rounding it", () => {
    expect(errorsFor({ kcalGoal: "1800.5" })).toEqual({ kcalGoal: "kcalGoalRange" });
  });
});
