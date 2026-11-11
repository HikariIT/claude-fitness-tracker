import { describe, expect, it } from "vitest";
import {
  defaultMeal,
  groupByMeal,
  isMeal,
  portionNutrition,
  sumNutrition,
  type Nutrition,
} from "./diary";

const PER_100: Nutrition = { kcal: 250, proteinG: 10.5, carbsG: 33.3, fatG: 7.7 };

describe("isMeal", () => {
  it("accepts the five meals", () => {
    for (const meal of ["breakfast", "lunch", "dinner", "snack", "other"]) {
      expect(isMeal(meal)).toBe(true);
    }
  });

  it("rejects unknown values", () => {
    expect(isMeal("brunch")).toBe(false);
    expect(isMeal("")).toBe(false);
  });
});

describe("portionNutrition", () => {
  it("returns the per-100 g values for 100 g", () => {
    expect(portionNutrition(PER_100, 100)).toEqual(PER_100);
  });

  it("scales by grams", () => {
    expect(portionNutrition(PER_100, 150)).toEqual({
      kcal: 375,
      proteinG: 15.75,
      carbsG: 49.95,
      fatG: 11.55,
    });
  });

  it("rounds to 2 decimals at 0.1 g", () => {
    expect(portionNutrition({ kcal: 1, proteinG: 1, carbsG: 1, fatG: 1 }, 0.1)).toEqual({
      kcal: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
    });
    expect(portionNutrition({ kcal: 333, proteinG: 0, carbsG: 0, fatG: 0 }, 0.1).kcal).toBe(0.33);
  });
});

describe("sumNutrition", () => {
  it("returns zeros for no rows", () => {
    expect(sumNutrition([])).toEqual({ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  });

  it("sums rows and rounds to 2 decimals", () => {
    const rows: Nutrition[] = [
      { kcal: 0.1, proteinG: 0.1, carbsG: 0.1, fatG: 0.1 },
      { kcal: 0.2, proteinG: 0.2, carbsG: 0.2, fatG: 0.2 },
      { kcal: 100.005, proteinG: 1.234, carbsG: 2.345, fatG: 3.456 },
    ];
    expect(sumNutrition(rows)).toEqual({
      kcal: 100.31,
      proteinG: 1.53,
      carbsG: 2.65,
      fatG: 3.76,
    });
  });
});

describe("groupByMeal", () => {
  it("returns MEALS order regardless of input order", () => {
    const entries = [
      { id: 1, meal: "other" as const },
      { id: 2, meal: "dinner" as const },
      { id: 3, meal: "breakfast" as const },
      { id: 4, meal: "snack" as const },
      { id: 5, meal: "lunch" as const },
    ];
    expect(groupByMeal(entries).map((g) => g.meal)).toEqual([
      "breakfast",
      "lunch",
      "dinner",
      "snack",
      "other",
    ]);
  });

  it("skips empty meals", () => {
    const groups = groupByMeal([{ id: 1, meal: "lunch" as const }]);
    expect(groups).toEqual([{ meal: "lunch", entries: [{ id: 1, meal: "lunch" }] }]);
  });

  it("keeps ascending id order within a group", () => {
    const groups = groupByMeal([
      { id: 9, meal: "dinner" as const },
      { id: 2, meal: "dinner" as const },
      { id: 5, meal: "dinner" as const },
    ]);
    expect(groups[0].entries.map((e) => e.id)).toEqual([2, 5, 9]);
  });

  it("returns an empty list for no entries", () => {
    expect(groupByMeal([])).toEqual([]);
  });
});

describe("defaultMeal", () => {
  it("returns breakfast when there are no entries", () => {
    expect(defaultMeal([])).toBe("breakfast");
  });

  it("uses the highest id, not the last array position", () => {
    expect(
      defaultMeal([
        { id: 7, meal: "dinner" },
        { id: 3, meal: "snack" },
        { id: 5, meal: "lunch" },
      ]),
    ).toBe("dinner");
  });
});
