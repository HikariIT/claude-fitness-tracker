import { describe, expect, it } from "vitest";
import { parseCompositeFoodForm } from "./composite-foods";

type Row = { foodId: string; quantityG: string };

function form(options: { name?: string; finalWeightG?: string; rows?: Row[] } = {}): FormData {
  const data = new FormData();
  data.set("name", options.name ?? "Curry z ryżem");
  data.set("finalWeightG", options.finalWeightG ?? "");
  for (const row of options.rows ?? [
    { foodId: "3", quantityG: "150" },
    { foodId: "4", quantityG: "200" },
  ]) {
    data.append("componentFoodId", row.foodId);
    data.append("componentQuantityG", row.quantityG);
  }
  return data;
}

function errorsFor(data: FormData) {
  const result = parseCompositeFoodForm(data);
  if (result.ok) throw new Error("expected validation to fail");
  return result.fieldErrors;
}

describe("parseCompositeFoodForm", () => {
  it("parses a valid dish, accepting a comma decimal and treating an empty final weight as null", () => {
    expect(
      parseCompositeFoodForm(
        form({
          name: "  Curry   z ryżem ",
          rows: [
            { foodId: "3", quantityG: "150,5" },
            { foodId: "4", quantityG: "200" },
          ],
        }),
      ),
    ).toEqual({
      ok: true,
      data: {
        name: "Curry z ryżem",
        finalWeightG: null,
        components: [
          { foodId: 3, quantityG: 150.5 },
          { foodId: 4, quantityG: 200 },
        ],
      },
    });
  });

  it("parses a final weight", () => {
    const result = parseCompositeFoodForm(form({ finalWeightG: "300" }));
    expect(result.ok && result.data.finalWeightG).toBe(300);
  });

  it("rejects final weights of 0 and 20001", () => {
    expect(errorsFor(form({ finalWeightG: "0" }))).toEqual({ finalWeightG: "finalWeightRange" });
    expect(errorsFor(form({ finalWeightG: "20001" }))).toEqual({ finalWeightG: "finalWeightRange" });
  });

  it("requires a name", () => {
    expect(errorsFor(form({ name: "   " }))).toEqual({ name: "nameRequired" });
  });

  it("accepts a 100-character name and rejects 101", () => {
    expect(parseCompositeFoodForm(form({ name: "a".repeat(100) })).ok).toBe(true);
    expect(errorsFor(form({ name: "a".repeat(101) }))).toEqual({ name: "nameTooLong" });
  });

  it("requires at least one ingredient", () => {
    expect(errorsFor(form({ rows: [] }))).toEqual({ components: "componentsRequired" });
  });

  it("allows 30 ingredients and rejects 31", () => {
    const rows = (count: number): Row[] =>
      Array.from({ length: count }, (_, index) => ({ foodId: String(index + 1), quantityG: "10" }));
    expect(parseCompositeFoodForm(form({ rows: rows(30) })).ok).toBe(true);
    expect(errorsFor(form({ rows: rows(31) }))).toEqual({ components: "componentsTooMany" });
  });

  it("rejects the same food twice", () => {
    expect(
      errorsFor(
        form({
          rows: [
            { foodId: "3", quantityG: "10" },
            { foodId: "3", quantityG: "20" },
          ],
        }),
      ),
    ).toEqual({ components: "componentDuplicate" });
  });

  it("rejects a food id that is not a positive integer", () => {
    expect(errorsFor(form({ rows: [{ foodId: "abc", quantityG: "10" }] }))).toEqual({
      components: "componentUnavailable",
    });
  });

  it("checks each quantity against 0.1–5000 g and reports the row index", () => {
    expect(errorsFor(form({ rows: [{ foodId: "3", quantityG: "0" }] }))).toEqual({
      "component.0": "componentQuantityRange",
    });
    expect(errorsFor(form({ rows: [{ foodId: "3", quantityG: "0.04" }] }))).toEqual({
      "component.0": "componentQuantityRange",
    });
    expect(
      errorsFor(
        form({
          rows: [
            { foodId: "3", quantityG: "10" },
            { foodId: "4", quantityG: "5000.1" },
          ],
        }),
      ),
    ).toEqual({ "component.1": "componentQuantityRange" });
    expect(parseCompositeFoodForm(form({ rows: [{ foodId: "3", quantityG: "5000" }] })).ok).toBe(true);
  });

  it("rejects mismatched component id and quantity counts", () => {
    const data = new FormData();
    data.set("name", "Curry");
    data.set("finalWeightG", "");
    data.append("componentFoodId", "3");
    data.append("componentFoodId", "4");
    data.append("componentQuantityG", "10");
    expect(errorsFor(data)).toEqual({ components: "componentUnavailable" });
  });
});
