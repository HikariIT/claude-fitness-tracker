import { describe, expect, it } from "vitest";
import { balanceStatus, baselineKcal, dayBalance, weekBalance, type BalanceProfile } from "./balance";

const profile: BalanceProfile = { sex: "male", birthDate: "1990-06-15", heightCm: 180, weightKg: 80 };

describe("baselineKcal", () => {
  it("uses the sedentary multiplier on Mifflin-St Jeor BMR", () => {
    // age 36: 800 + 1125 - 180 + 5 = 1750, × 1.2
    expect(baselineKcal(profile, "2026-11-11")).toBeCloseTo(2100, 6);
  });

  it("changes age on the birthday", () => {
    const before = baselineKcal(profile, "2026-06-14"); // age 35
    const on = baselineKcal(profile, "2026-06-15"); // age 36
    expect(before - on).toBeCloseTo(5 * 1.2, 6);
  });

  it("uses the female BMR offset", () => {
    const female = { ...profile, sex: "female" as const };
    expect(baselineKcal(female, "2026-11-11")).toBeCloseTo((1750 - 166) * 1.2, 6);
  });
});

describe("dayBalance", () => {
  it("sums eaten, burned and expenditure, and derives balance and weight change", () => {
    const day = dayBalance({
      date: "2026-11-11",
      profile,
      diary: [{ kcal: 600 }, { kcal: 1100.5 }],
      workouts: [{ kcalBurned: 300 }, { kcalBurned: null }],
      steps: { kcal: 200 },
    });
    expect(day.logged).toBe(true);
    expect(day.eatenKcal).toBeCloseTo(1700.5, 6);
    expect(day.burnedKcal).toBe(500);
    expect(day.expenditureKcal).toBeCloseTo(2600, 6);
    expect(day.balanceKcal).toBeCloseTo(-899.5, 6);
    expect(day.weightChangeKg).toBeCloseTo(-899.5 / 7700, 9);
  });

  it("marks an empty diary as not logged with zero eaten", () => {
    const day = dayBalance({ date: "2026-11-11", profile, diary: [], workouts: [], steps: null });
    expect(day.logged).toBe(false);
    expect(day.eatenKcal).toBe(0);
    expect(day.burnedKcal).toBe(0);
  });
});

describe("weekBalance", () => {
  const base = { profile, workouts: [], steps: null };
  const logged = (date: string, kcal: number) => dayBalance({ ...base, date, diary: [{ kcal }] });
  const unlogged = (date: string) => dayBalance({ ...base, date, diary: [] });

  it("sums only the logged days", () => {
    const week = weekBalance([
      logged("2026-11-09", 2000),
      unlogged("2026-11-10"),
      logged("2026-11-11", 1000),
    ]);
    expect(week.loggedDays).toBe(2);
    expect(week.eatenKcal).toBeCloseTo(3000, 6);
    expect(week.expenditureKcal).toBeCloseTo(2 * 2100, 6);
    expect(week.balanceKcal).toBeCloseTo(3000 - 4200, 6);
    expect(week.weightChangeKg).toBeCloseTo(-1200 / 7700, 9);
  });

  it("gives zeros for an empty week or one with no logged days", () => {
    for (const week of [weekBalance([]), weekBalance([unlogged("2026-11-09")])]) {
      expect(week).toEqual({ loggedDays: 0, eatenKcal: 0, expenditureKcal: 0, balanceKcal: 0, weightChangeKg: 0 });
    }
  });
});

describe("balanceStatus", () => {
  it("classifies by the balance rounded to a whole kcal", () => {
    expect(balanceStatus(-1)).toBe("deficit");
    expect(balanceStatus(1)).toBe("surplus");
    expect(balanceStatus(0)).toBe("even");
    expect(balanceStatus(-0.4)).toBe("even");
    expect(balanceStatus(0.4)).toBe("even");
  });
});
