import { describe, expect, it } from "vitest";
import { compositeNutrition, dependentsInOrder, totalQuantity, wouldCreateCycle } from "./composite";

const SAUCE = { kcal: 110, proteinG: 2, carbsG: 9.5, fatG: 7, quantityG: 150 };
const RICE = { kcal: 130, proteinG: 2.7, carbsG: 28.2, fatG: 0.3, quantityG: 200 };

describe("compositeNutrition", () => {
  it("computes per-100 g values from the summed ingredient grams", () => {
    expect(compositeNutrition([SAUCE, RICE], null)).toEqual({
      kcal: 121.43,
      proteinG: 2.4,
      carbsG: 20.19,
      fatG: 3.17,
    });
  });

  it("uses the final cooked weight when given", () => {
    expect(compositeNutrition([SAUCE, RICE], 300).kcal).toBe(141.67);
  });

  it("returns zeros for an empty list", () => {
    expect(compositeNutrition([], null)).toEqual({ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  });

  it("returns the ingredient's own values for a single ingredient", () => {
    expect(compositeNutrition([RICE], null)).toEqual({ kcal: 130, proteinG: 2.7, carbsG: 28.2, fatG: 0.3 });
  });
});

describe("totalQuantity", () => {
  it("sums the grams of all portions", () => {
    expect(totalQuantity([SAUCE, RICE])).toBe(350);
  });
});

describe("wouldCreateCycle", () => {
  it("detects a dish containing itself", () => {
    expect(wouldCreateCycle(1, [1], new Map())).toBe(true);
  });

  it("detects a direct cycle", () => {
    expect(wouldCreateCycle(1, [2], new Map([[2, [1]]]))).toBe(true);
  });

  it("detects an indirect cycle", () => {
    expect(
      wouldCreateCycle(
        1,
        [2],
        new Map([
          [2, [3]],
          [3, [1]],
        ]),
      ),
    ).toBe(true);
  });

  it("allows a dependency that does not lead back", () => {
    expect(wouldCreateCycle(1, [2], new Map([[2, [3]]]))).toBe(false);
  });

  it("allows an empty component list", () => {
    expect(wouldCreateCycle(1, [], new Map())).toBe(false);
  });
});

describe("dependentsInOrder", () => {
  it("orders a chain so each dish comes after the dishes it contains", () => {
    expect(
      dependentsInOrder(
        1,
        new Map([
          [1, [2]],
          [2, [3]],
        ]),
      ),
    ).toEqual([2, 3]);
  });

  it("places a shared dependency before the dishes that use it (diamond)", () => {
    expect(
      dependentsInOrder(
        1,
        new Map([
          [1, [2, 3]],
          [3, [2]],
        ]),
      ),
    ).toEqual([3, 2]);
  });

  it("returns an empty list when nothing uses the food", () => {
    expect(dependentsInOrder(1, new Map())).toEqual([]);
  });

  it("lists each dependent once", () => {
    const result = dependentsInOrder(
      1,
      new Map([
        [1, [2, 3]],
        [2, [4]],
        [3, [4]],
      ]),
    );
    expect(result).toHaveLength(new Set(result).size);
    expect(result.sort()).toEqual([2, 3, 4]);
  });
});
