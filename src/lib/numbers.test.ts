import { describe, expect, it } from "vitest";
import { parseDecimal } from "./numbers";

describe("parseDecimal", () => {
  it("accepts a comma or dot separator", () => {
    expect(parseDecimal("12,5")).toBe(12.5);
    expect(parseDecimal("12.5")).toBe(12.5);
  });

  it("rounds to 1 decimal", () => {
    expect(parseDecimal("12.55")).toBe(12.6);
  });

  it("trims surrounding whitespace", () => {
    expect(parseDecimal(" 7 ")).toBe(7);
  });

  it("accepts zero and negative numbers", () => {
    expect(parseDecimal("0")).toBe(0);
    expect(parseDecimal("-3")).toBe(-3);
  });

  it("returns null for non-numeric input", () => {
    expect(parseDecimal("")).toBeNull();
    expect(parseDecimal("abc")).toBeNull();
    expect(parseDecimal("1e3")).toBeNull();
  });
});
