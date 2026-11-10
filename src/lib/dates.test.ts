import { describe, expect, it } from "vitest";
import { addDays, isIsoDate, isoToUtcDate } from "./dates";

describe("isIsoDate", () => {
  it("accepts real calendar dates", () => {
    expect(isIsoDate("2026-11-10")).toBe(true);
    expect(isIsoDate("2028-02-29")).toBe(true);
  });

  it("rejects impossible dates and garbage", () => {
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2027-02-29")).toBe(false);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("10-11-2026")).toBe(false);
    expect(isIsoDate("not a date")).toBe(false);
  });
});

describe("addDays", () => {
  it("crosses a month end", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
  });

  it("crosses a year end", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("handles a leap day", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2028-02-29", 1)).toBe("2028-03-01");
  });

  it("subtracts days", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-01-01", -365)).toBe("2025-01-01");
  });
});

describe("isoToUtcDate", () => {
  it("returns midnight UTC for the given date", () => {
    expect(isoToUtcDate("2026-11-10").toISOString()).toBe("2026-11-10T00:00:00.000Z");
  });
});
