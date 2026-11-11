import { describe, expect, it } from "vitest";
import {
  estimateStepsKcal,
  estimateTreadmillKcal,
  groupConsecutiveSets,
  isWorkoutType,
  sumBurned,
  treadmillDistanceKm,
} from "./workouts";

describe("isWorkoutType", () => {
  it("accepts treadmill and training", () => {
    expect(isWorkoutType("treadmill")).toBe(true);
    expect(isWorkoutType("training")).toBe(true);
  });

  it("rejects unknown values", () => {
    expect(isWorkoutType("run")).toBe(false);
  });
});

describe("treadmillDistanceKm", () => {
  it("computes speed × duration / 60, rounded to 2 decimals", () => {
    expect(treadmillDistanceKm(6.5, 40)).toBe(4.33);
  });
});

describe("estimateTreadmillKcal", () => {
  it("uses the walking equation below the threshold", () => {
    expect(
      estimateTreadmillKcal({ speedKmh: 6.5, inclinePct: 8, durationMin: 40, weightKg: 80 }),
    ).toBe(479);
  });

  it("uses the running equation above the threshold", () => {
    expect(
      estimateTreadmillKcal({ speedKmh: 10, inclinePct: 0, durationMin: 30, weightKg: 70 }),
    ).toBe(387);
  });

  it("switches to the running equation at exactly 8 km/h", () => {
    // Running at 8 km/h, 0 %, 30 min, 80 kg: VO2 = 30.17 → 362 kcal.
    // The walking equation would give 202 kcal, so this checks the threshold.
    expect(
      estimateTreadmillKcal({ speedKmh: 8, inclinePct: 0, durationMin: 30, weightKg: 80 }),
    ).toBe(362);
  });
});

describe("estimateStepsKcal", () => {
  it("is steps × weight × 0.0005", () => {
    expect(estimateStepsKcal(10000, 80)).toBe(400);
  });

  it("is zero for zero steps", () => {
    expect(estimateStepsKcal(0, 80)).toBe(0);
  });
});

describe("sumBurned", () => {
  it("sums workout kcal (nulls count as 0) and steps kcal", () => {
    expect(
      sumBurned([{ kcalBurned: 300 }, { kcalBurned: null }, { kcalBurned: 120 }], { kcal: 250 }),
    ).toEqual({ workouts: 420, steps: 250, total: 670 });
  });

  it("returns zeros for an empty day", () => {
    expect(sumBurned([], null)).toEqual({ workouts: 0, steps: 0, total: 0 });
  });
});

describe("groupConsecutiveSets", () => {
  it("sorts by order and groups consecutive runs of the same exercise", () => {
    const sets = [
      { exerciseId: 1, order: 4, reps: 5 },
      { exerciseId: 2, order: 3, reps: 8 },
      { exerciseId: 1, order: 1, reps: 10 },
      { exerciseId: 1, order: 2, reps: 9 },
    ];
    const groups = groupConsecutiveSets(sets);
    expect(groups.map((g) => g.exerciseId)).toEqual([1, 2, 1]);
    expect(groups[0]?.sets.map((s) => s.order)).toEqual([1, 2]);
    expect(groups[1]?.sets.map((s) => s.order)).toEqual([3]);
    expect(groups[2]?.sets.map((s) => s.order)).toEqual([4]);
  });

  it("returns an empty array for no sets", () => {
    expect(groupConsecutiveSets([])).toEqual([]);
  });
});
