import { describe, expect, it } from "vitest";
import { parseDecimal, parseInteger } from "./numbers";

describe("parseDecimal", () => {
  it("accepts a comma or dot separator", () => {
    expect(parseDecimal("12,5")).toBe(12.5);
    expect(parseDecimal("12.5")).toBe(12.5);
  });

  it("rounds to 1 decimal by default", () => {
    expect(parseDecimal("12.55")).toBe(12.6);
  });

  it("rounds to the requested number of decimals", () => {
    expect(parseDecimal("42,125", 2)).toBe(42.13);
    expect(parseDecimal("1.25", 2)).toBe(1.25);
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

describe("parseInteger", () => {
  it("accepts whole numbers, trimming whitespace", () => {
    expect(parseInteger("12")).toBe(12);
    expect(parseInteger(" 7 ")).toBe(7);
  });

  it("returns null for decimals, signs, empty and text", () => {
    expect(parseInteger("1.5")).toBeNull();
    expect(parseInteger("-3")).toBeNull();
    expect(parseInteger("")).toBeNull();
    expect(parseInteger("abc")).toBeNull();
  });
});
