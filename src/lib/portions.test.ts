import { describe, expect, it } from "vitest";
import { defaultPortion, findPortionByName, portionGrams } from "@/lib/portions";

describe("portionGrams", () => {
  it("multiplies count by grams", () => {
    expect(portionGrams(2, 15)).toBe(30);
  });

  it("rounds to 0.1 g", () => {
    expect(portionGrams(0.5, 33.3)).toBe(16.7);
  });

  it("keeps the 0.1 g minimum for tiny products", () => {
    expect(portionGrams(3, 0.1)).toBe(0.3);
  });
});

describe("defaultPortion", () => {
  it("picks the lowest sortOrder regardless of array order", () => {
    const portions = [
      { name: "B", sortOrder: 2 },
      { name: "A", sortOrder: 0 },
      { name: "C", sortOrder: 1 },
    ];
    expect(defaultPortion(portions)?.name).toBe("A");
  });

  it("returns null for an empty list", () => {
    expect(defaultPortion([])).toBeNull();
  });
});

describe("findPortionByName", () => {
  const portions = [{ name: "Łyżka" }, { name: "Szklanka" }];

  it("matches case-insensitively", () => {
    expect(findPortionByName(portions, "łyżka")?.name).toBe("Łyżka");
  });

  it("ignores surrounding whitespace", () => {
    expect(findPortionByName(portions, " Łyżka ")?.name).toBe("Łyżka");
  });

  it("returns null for a null name", () => {
    expect(findPortionByName(portions, null)).toBeNull();
  });

  it("returns null when nothing matches", () => {
    expect(findPortionByName(portions, "Kubek")).toBeNull();
  });
});
