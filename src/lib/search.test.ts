import { describe, expect, it } from "vitest";
import { matchesQuery, normalizeForSearch } from "./search";

describe("normalizeForSearch", () => {
  it("lowercases, strips diacritics and collapses whitespace", () => {
    expect(normalizeForSearch("  Jabłko  Zielone ")).toBe("jablko zielone");
  });

  it("maps Polish letters to ASCII", () => {
    expect(normalizeForSearch("Żółć")).toBe("zolc");
    expect(normalizeForSearch("ĄĘŚĆŃ")).toBe("aescn");
  });
});

describe("matchesQuery", () => {
  it("matches ignoring case and diacritics", () => {
    expect(matchesQuery("Jabłko", "jablko")).toBe(true);
    expect(matchesQuery("Pierś z kurczaka", "KURCZ")).toBe(true);
  });

  it("treats an empty or blank query as a match", () => {
    expect(matchesQuery("Ryż", "")).toBe(true);
    expect(matchesQuery("Ryż", "   ")).toBe(true);
  });

  it("rejects names that do not contain the query", () => {
    expect(matchesQuery("Ryż", "owies")).toBe(false);
  });
});
