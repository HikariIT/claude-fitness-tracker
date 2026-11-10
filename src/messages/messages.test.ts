import { describe, expect, it } from "vitest";
import en from "./en.json";
import pl from "./pl.json";

function flatten(obj: Record<string, unknown>, prefix = ""): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object") {
      Object.assign(out, flatten(value as Record<string, unknown>, path));
    } else {
      out[path] = value;
    }
  }
  return out;
}

describe("message files", () => {
  const plFlat = flatten(pl);
  const enFlat = flatten(en);

  it("have the same keys in pl and en", () => {
    const plKeys = Object.keys(plFlat).sort();
    const enKeys = Object.keys(enFlat).sort();
    expect(enKeys).toEqual(plKeys);
  });

  it("have no empty string values", () => {
    for (const flat of [plFlat, enFlat]) {
      for (const [key, value] of Object.entries(flat)) {
        expect(typeof value, key).toBe("string");
        expect((value as string).trim().length, key).toBeGreaterThan(0);
      }
    }
  });
});
