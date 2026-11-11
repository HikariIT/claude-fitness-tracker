import { describe, expect, it } from "vitest";
import { parseCompositeFoodForm } from "./composite-foods";

type Row = { foodId: string; amount: string; portionId?: string };

function form(options: { name?: string; finalWeightG?: string; rows?: Row[] } = {}): FormData {
  const data = new FormData();
  data.set("name", options.name ?? "Curry z ryżem");
  data.set("finalWeightG", options.finalWeightG ?? "");
  for (const row of options.rows ?? [
    { foodId: "3", amount: "150" },
    { foodId: "4", amount: "200" },
  ]) {
    data.append("componentFoodId", row.foodId);
    data.append("componentAmount", row.amount);
    if (row.portionId !== undefined) data.append("componentPortionId", row.portionId);
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
            { foodId: "3", amount: "150,5" },
            { foodId: "4", amount: "200" },
          ],
        }),
      ),
    ).toEqual({
      ok: true,
      data: {
        name: "Curry z ryżem",
        finalWeightG: null,
        components: [
          { foodId: 3, amount: { kind: "grams", quantityG: 150.5 } },
          { foodId: 4, amount: { kind: "grams", quantityG: 200 } },
        ],
        portions: [],
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
      Array.from({ length: count }, (_, index) => ({ foodId: String(index + 1), amount: "10" }));
    expect(parseCompositeFoodForm(form({ rows: rows(30) })).ok).toBe(true);
    expect(errorsFor(form({ rows: rows(31) }))).toEqual({ components: "componentsTooMany" });
  });

  it("rejects the same food twice", () => {
    expect(
      errorsFor(
        form({
          rows: [
            { foodId: "3", amount: "10" },
            { foodId: "3", amount: "20" },
          ],
        }),
      ),
    ).toEqual({ components: "componentDuplicate" });
  });

  it("rejects a food id that is not a positive integer", () => {
    expect(errorsFor(form({ rows: [{ foodId: "abc", amount: "10" }] }))).toEqual({
      components: "componentUnavailable",
    });
  });

  it("checks each gram amount against 0.1–5000 g and reports the row index", () => {
    expect(errorsFor(form({ rows: [{ foodId: "3", amount: "0" }] }))).toEqual({
      "component.0": "componentQuantityRange",
    });
    expect(errorsFor(form({ rows: [{ foodId: "3", amount: "0.04" }] }))).toEqual({
      "component.0": "componentQuantityRange",
    });
    expect(
      errorsFor(
        form({
          rows: [
            { foodId: "3", amount: "10" },
            { foodId: "4", amount: "5000.1" },
          ],
        }),
      ),
    ).toEqual({ "component.1": "componentQuantityRange" });
    expect(parseCompositeFoodForm(form({ rows: [{ foodId: "3", amount: "5000" }] })).ok).toBe(true);
  });

  it("rejects mismatched component id and amount counts", () => {
    const data = new FormData();
    data.set("name", "Curry");
    data.set("finalWeightG", "");
    data.append("componentFoodId", "3");
    data.append("componentFoodId", "4");
    data.append("componentAmount", "10");
    expect(errorsFor(data)).toEqual({ components: "componentUnavailable" });
  });

  it("parses a portion row as a portion amount", () => {
    expect(
      parseCompositeFoodForm(
        form({
          rows: [
            { foodId: "3", amount: "0.5", portionId: "7" },
            { foodId: "4", amount: "200", portionId: "" },
          ],
        }),
      ),
    ).toMatchObject({
      ok: true,
      data: {
        components: [
          { foodId: 3, amount: { kind: "portion", portionId: 7, count: 0.5 } },
          { foodId: 4, amount: { kind: "grams", quantityG: 200 } },
        ],
      },
    });
  });

  it("checks portion counts against 0.1–100", () => {
    expect(errorsFor(form({ rows: [{ foodId: "3", amount: "0", portionId: "7" }] }))).toEqual({
      "component.0": "componentPortionCountRange",
    });
    expect(errorsFor(form({ rows: [{ foodId: "3", amount: "100.1", portionId: "7" }] }))).toEqual({
      "component.0": "componentPortionCountRange",
    });
    expect(parseCompositeFoodForm(form({ rows: [{ foodId: "3", amount: "100", portionId: "7" }] })).ok).toBe(
      true,
    );
  });

  it("rejects a portion id that is not a positive integer", () => {
    expect(errorsFor(form({ rows: [{ foodId: "3", amount: "1", portionId: "x" }] }))).toEqual({
      "component.0": "componentPortionUnavailable",
    });
  });

  it("treats every row as grams when no componentPortionId is sent", () => {
    const result = parseCompositeFoodForm(form({ rows: [{ foodId: "3", amount: "150" }] }));
    expect(result.ok && result.data.components).toEqual([
      { foodId: 3, amount: { kind: "grams", quantityG: 150 } },
    ]);
  });

  it("rejects a componentPortionId list whose length differs from the food ids", () => {
    const data = new FormData();
    data.set("name", "Curry");
    data.set("finalWeightG", "");
    data.append("componentFoodId", "3");
    data.append("componentFoodId", "4");
    data.append("componentAmount", "10");
    data.append("componentAmount", "20");
    data.append("componentPortionId", "");
    expect(errorsFor(data)).toEqual({ components: "componentUnavailable" });
  });

  it("reports a dish's own portion row errors", () => {
    const data = form();
    data.append("portionName", "");
    data.append("portionGrams", "15");
    expect(errorsFor(data)).toEqual({ "portion.0": "portionNameRequired" });
  });

  it("parses the dish's own portions", () => {
    const data = form();
    data.append("portionName", "Porcja");
    data.append("portionGrams", "350");
    const result = parseCompositeFoodForm(data);
    expect(result.ok && result.data.portions).toEqual([{ name: "Porcja", grams: 350 }]);
  });
});
