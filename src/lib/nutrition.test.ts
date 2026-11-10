import { describe, expect, it } from "vitest";
import {
  ACTIVITY_LEVELS,
  ACTIVITY_MULTIPLIERS,
  ageOn,
  calcBmr,
  calcTdee,
} from "./nutrition";

describe("ageOn", () => {
  it("counts full years", () => {
    expect(ageOn("1995-04-12", "2026-11-10")).toBe(31);
    expect(ageOn("1995-12-01", "2026-11-10")).toBe(30);
  });

  it("counts a birthday that is today", () => {
    expect(ageOn("2000-11-10", "2026-11-10")).toBe(26);
  });

  it("treats a Feb 29 birthday as passed on Mar 1", () => {
    expect(ageOn("2000-02-29", "2001-02-28")).toBe(0);
    expect(ageOn("2000-02-29", "2001-03-01")).toBe(1);
  });
});

describe("calcBmr", () => {
  it("uses the female offset", () => {
    expect(calcBmr({ sex: "female", weightKg: 62.5, heightCm: 168, age: 31 })).toBeCloseTo(1359, 5);
  });

  it("uses the male offset", () => {
    expect(calcBmr({ sex: "male", weightKg: 80, heightCm: 180, age: 30 })).toBeCloseTo(1780, 5);
  });
});

describe("calcTdee", () => {
  it("multiplies BMR by the activity multiplier", () => {
    expect(calcTdee(1359, "moderate")).toBeCloseTo(2106.45, 2);
  });

  it("handles the sedentary level", () => {
    expect(calcTdee(1000, "sedentary")).toBeCloseTo(1200, 5);
  });

  it("has a multiplier for every level, strictly increasing", () => {
    const values = ACTIVITY_LEVELS.map((level) => ACTIVITY_MULTIPLIERS[level]);
    for (const level of ACTIVITY_LEVELS) {
      expect(ACTIVITY_MULTIPLIERS[level]).toBeDefined();
    }
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });
});
