import "server-only";
import { and, eq, inArray, isNotNull, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { diaryEntries, foodComponents, foodPortions, foods } from "@/db/schema";
import { compositeNutrition, dependentsInOrder, wouldCreateCycle } from "@/lib/composite";
import {
  NO_PORTION_SNAPSHOT,
  portionGrams,
  QUANTITY_G_MAX,
  QUANTITY_G_MIN,
  type PortionSnapshot,
} from "@/lib/portions";
import type { CompositeComponentInput, CompositeFoodInput } from "@/lib/validation/composite-foods";
import type { FoodFormInput, FoodInput } from "@/lib/validation/foods";
import type { PortionInput } from "@/lib/validation/portions";
import type { Food } from "@/server/dal/foods";

export type FoodWriteResult =
  | { ok: true; food: Food }
  | { ok: false; reason: "nameTaken" | "notFound" };
export type FoodToggleResult =
  | { ok: true }
  | { ok: false; reason: "nameTaken" | "notFound" | "inUse" | "usedInComposite" };
export type CompositeWriteResult =
  | { ok: true; food: Food }
  | {
      ok: false;
      reason:
        | "nameTaken"
        | "notFound"
        | "componentUnavailable"
        | "componentCycle"
        | "finalWeightTooLow"
        | "componentPortionUnavailable"
        | "componentGramsRange";
    };

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

type ResolvedComponent = { foodId: number; quantityG: number } & PortionSnapshot;

/** D1: replaces all portions of a food, keeping the submitted order as sortOrder. */
async function replacePortions(tx: Tx, foodId: number, portions: PortionInput[]): Promise<void> {
  await tx.delete(foodPortions).where(eq(foodPortions.foodId, foodId));
  if (portions.length > 0) {
    await tx.insert(foodPortions).values(
      portions.map((portion, index) => ({
        foodId,
        name: portion.name,
        grams: portion.grams,
        sortOrder: index,
      })),
    );
  }
}

/**
 * Turns each ingredient into grams. A portion amount is count × the portion's grams, with a snapshot
 * of the unit (D5). The portion must exist and belong to the ingredient food.
 */
async function resolveComponents(
  tx: Tx,
  components: CompositeComponentInput[],
): Promise<
  | { ok: true; rows: ResolvedComponent[] }
  | { ok: false; reason: "componentPortionUnavailable" | "componentGramsRange" }
> {
  const portionIds = components.flatMap((component) =>
    component.amount.kind === "portion" ? [component.amount.portionId] : [],
  );
  const portionRows =
    portionIds.length === 0
      ? []
      : await tx.select().from(foodPortions).where(inArray(foodPortions.id, portionIds));
  const portionById = new Map(portionRows.map((portion) => [portion.id, portion]));

  const rows: ResolvedComponent[] = [];
  for (const component of components) {
    if (component.amount.kind === "grams") {
      rows.push({
        foodId: component.foodId,
        quantityG: component.amount.quantityG,
        ...NO_PORTION_SNAPSHOT,
      });
      continue;
    }
    const { portionId, count } = component.amount;
    const portion = portionById.get(portionId);
    if (!portion || portion.foodId !== component.foodId) {
      return { ok: false, reason: "componentPortionUnavailable" };
    }
    const quantityG = portionGrams(count, portion.grams);
    if (quantityG < QUANTITY_G_MIN || quantityG > QUANTITY_G_MAX) {
      return { ok: false, reason: "componentGramsRange" };
    }
    rows.push({
      foodId: component.foodId,
      quantityG,
      portionName: portion.name,
      portionG: portion.grams,
      portionCount: count,
    });
  }
  return { ok: true, rows };
}

/** True when a non-archived food already has this name (case-insensitive). */
async function isNameTaken(tx: Tx, name: string, excludeId?: number): Promise<boolean> {
  const conditions = [
    sql`lower(${foods.name}) = lower(${name})`,
    isNull(foods.archivedAt),
    excludeId === undefined ? undefined : ne(foods.id, excludeId),
  ];
  const [row] = await tx
    .select({ id: foods.id })
    .from(foods)
    .where(and(...conditions))
    .limit(1);
  return row !== undefined;
}

/** Foods with the given ids (archived ones included). */
async function loadComponentFoods(tx: Tx, ids: number[]) {
  return tx.select().from(foods).where(inArray(foods.id, ids));
}

/**
 * D4: recalculates the stored per-100 g values of every dish that (transitively) uses `changedId`,
 * in dependency order, inside the caller's transaction. Archived dishes are recalculated too.
 */
async function recomputeDependents(tx: Tx, changedId: number): Promise<void> {
  const foodRows = await tx
    .select({
      id: foods.id,
      kcal: foods.kcal,
      proteinG: foods.proteinG,
      carbsG: foods.carbsG,
      fatG: foods.fatG,
      finalWeightG: foods.finalWeightG,
    })
    .from(foods);
  const foodMap = new Map(foodRows.map((row) => [row.id, row]));

  const componentRows = await tx
    .select({
      foodId: foodComponents.foodId,
      componentFoodId: foodComponents.componentFoodId,
      quantityG: foodComponents.quantityG,
    })
    .from(foodComponents);

  const usedBy = new Map<number, number[]>();
  const byDish = new Map<number, typeof componentRows>();
  for (const row of componentRows) {
    usedBy.set(row.componentFoodId, [...(usedBy.get(row.componentFoodId) ?? []), row.foodId]);
    byDish.set(row.foodId, [...(byDish.get(row.foodId) ?? []), row]);
  }

  for (const id of dependentsInOrder(changedId, usedBy)) {
    const dish = foodMap.get(id);
    if (!dish) continue;
    const portions = (byDish.get(id) ?? []).flatMap((component) => {
      const food = foodMap.get(component.componentFoodId);
      if (!food) return [];
      return [
        {
          kcal: food.kcal,
          proteinG: food.proteinG,
          carbsG: food.carbsG,
          fatG: food.fatG,
          quantityG: component.quantityG,
        },
      ];
    });
    const values = compositeNutrition(portions, dish.finalWeightG);
    await tx
      .update(foods)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(foods.id, id));
    // Later dishes in the order read the fresh values from this map.
    foodMap.set(id, { ...dish, ...values });
  }
}

export async function createFood(input: FoodFormInput): Promise<FoodWriteResult> {
  const { portions, ...values } = input;
  return db.transaction(async (tx) => {
    if (await isNameTaken(tx, values.name)) {
      return { ok: false, reason: "nameTaken" };
    }
    const [food] = await tx.insert(foods).values(values).returning();
    await replacePortions(tx, food.id, portions);
    return { ok: true, food };
  });
}

export type FoodImportWriteResult =
  | { ok: true; count: number }
  | { ok: false; reason: "nameTaken"; takenIndexes: number[] };

/**
 * JSON import: inserts every plain food in one transaction, or none of them.
 * A name already used by a non-archived food (ignoring case) refuses the whole import.
 * Input comes from parseFoodImport, so names are already unique within the batch.
 */
export async function importFoods(inputs: FoodInput[]): Promise<FoodImportWriteResult> {
  return db.transaction(async (tx) => {
    const lowered = inputs.map((input) => input.name.toLowerCase());
    const taken = await tx
      .select({ name: sql<string>`lower(${foods.name})` })
      .from(foods)
      .where(and(isNull(foods.archivedAt), inArray(sql`lower(${foods.name})`, lowered)));
    if (taken.length > 0) {
      const takenNames = new Set(taken.map((row) => row.name));
      const takenIndexes = lowered.flatMap((name, index) => (takenNames.has(name) ? [index] : []));
      return { ok: false, reason: "nameTaken", takenIndexes };
    }
    await tx.insert(foods).values(inputs);
    return { ok: true, count: inputs.length };
  });
}

/**
 * Updates only a non-archived plain food; an archived, missing or dish id → notFound
 * (D7: diary snapshots are not touched; D8: a dish is never edited as a plain food).
 * Recalculates every dish that uses the food (D4).
 */
export async function updateFood(id: number, input: FoodFormInput): Promise<FoodWriteResult> {
  const { portions, ...values } = input;
  return db.transaction(async (tx) => {
    if (await isNameTaken(tx, values.name, id)) {
      return { ok: false, reason: "nameTaken" };
    }
    const [food] = await tx
      .update(foods)
      .set({ ...values, updatedAt: new Date() })
      .where(and(eq(foods.id, id), isNull(foods.archivedAt), eq(foods.isComposite, false)))
      .returning();
    if (!food) return { ok: false, reason: "notFound" };
    await replacePortions(tx, id, portions);
    await recomputeDependents(tx, id);
    return { ok: true, food };
  });
}

/**
 * D1, D9: creates a dish and its ingredient rows in one transaction.
 * Archived or missing ingredients → componentUnavailable (D5).
 */
export async function createCompositeFood(input: CompositeFoodInput): Promise<CompositeWriteResult> {
  return db.transaction(async (tx) => {
    if (await isNameTaken(tx, input.name)) {
      return { ok: false, reason: "nameTaken" };
    }

    const ids = input.components.map((component) => component.foodId);
    const rows = await loadComponentFoods(tx, ids);
    if (rows.length !== new Set(ids).size || rows.some((row) => row.archivedAt !== null)) {
      return { ok: false, reason: "componentUnavailable" };
    }

    const resolved = await resolveComponents(tx, input.components);
    if (!resolved.ok) return resolved;

    const byId = new Map(rows.map((row) => [row.id, row]));
    const values = compositeNutrition(
      resolved.rows.map((row) => ({
        ...(byId.get(row.foodId) as (typeof rows)[number]),
        quantityG: row.quantityG,
      })),
      input.finalWeightG,
    );
    if (values.proteinG + values.carbsG + values.fatG > 100) {
      return { ok: false, reason: "finalWeightTooLow" };
    }

    const [food] = await tx
      .insert(foods)
      .values({
        name: input.name,
        ...values,
        isComposite: true,
        finalWeightG: input.finalWeightG,
      })
      .returning();
    await tx.insert(foodComponents).values(
      resolved.rows.map((row) => ({
        foodId: food.id,
        componentFoodId: row.foodId,
        quantityG: row.quantityG,
        portionName: row.portionName,
        portionG: row.portionG,
        portionCount: row.portionCount,
      })),
    );
    await replacePortions(tx, food.id, input.portions);
    return { ok: true, food };
  });
}

/**
 * D3, D4, D5, D8: replaces name, final weight and ingredients of an active dish, then recalculates
 * every dish that uses it. Missing or archived ingredients → componentUnavailable, except an archived
 * ingredient the dish already contains (D5). A cycle → componentCycle (D3).
 */
export async function updateCompositeFood(
  id: number,
  input: CompositeFoodInput,
): Promise<CompositeWriteResult> {
  return db.transaction(async (tx) => {
    const [dish] = await tx
      .select({ id: foods.id })
      .from(foods)
      .where(and(eq(foods.id, id), isNull(foods.archivedAt), eq(foods.isComposite, true)))
      .limit(1);
    if (!dish) return { ok: false, reason: "notFound" };

    if (await isNameTaken(tx, input.name, id)) {
      return { ok: false, reason: "nameTaken" };
    }

    const currentRows = await tx
      .select({ componentFoodId: foodComponents.componentFoodId })
      .from(foodComponents)
      .where(eq(foodComponents.foodId, id));
    const currentIds = new Set(currentRows.map((row) => row.componentFoodId));

    const ids = input.components.map((component) => component.foodId);
    const rows = await loadComponentFoods(tx, ids);
    if (
      rows.length !== new Set(ids).size ||
      rows.some((row) => row.archivedAt !== null && !currentIds.has(row.id))
    ) {
      return { ok: false, reason: "componentUnavailable" };
    }

    // Graph of every other dish; this dish's old edges are left out so they don't count as a cycle.
    const otherRows = await tx
      .select({ foodId: foodComponents.foodId, componentFoodId: foodComponents.componentFoodId })
      .from(foodComponents)
      .where(ne(foodComponents.foodId, id));
    const graph = new Map<number, number[]>();
    for (const row of otherRows) {
      graph.set(row.foodId, [...(graph.get(row.foodId) ?? []), row.componentFoodId]);
    }
    if (wouldCreateCycle(id, ids, graph)) {
      return { ok: false, reason: "componentCycle" };
    }

    const resolved = await resolveComponents(tx, input.components);
    if (!resolved.ok) return resolved;

    const byId = new Map(rows.map((row) => [row.id, row]));
    const values = compositeNutrition(
      resolved.rows.map((row) => ({
        ...(byId.get(row.foodId) as (typeof rows)[number]),
        quantityG: row.quantityG,
      })),
      input.finalWeightG,
    );
    if (values.proteinG + values.carbsG + values.fatG > 100) {
      return { ok: false, reason: "finalWeightTooLow" };
    }

    const [food] = await tx
      .update(foods)
      .set({
        name: input.name,
        ...values,
        finalWeightG: input.finalWeightG,
        updatedAt: new Date(),
      })
      .where(eq(foods.id, id))
      .returning();
    await tx.delete(foodComponents).where(eq(foodComponents.foodId, id));
    await tx.insert(foodComponents).values(
      resolved.rows.map((row) => ({
        foodId: id,
        componentFoodId: row.foodId,
        quantityG: row.quantityG,
        portionName: row.portionName,
        portionG: row.portionG,
        portionCount: row.portionCount,
      })),
    );
    await replacePortions(tx, id, input.portions);
    await recomputeDependents(tx, id);
    return { ok: true, food };
  });
}

/** Sets archivedAt = now on a non-archived food (D2); else notFound. */
export async function archiveFood(id: number): Promise<FoodToggleResult> {
  const rows = await db
    .update(foods)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(foods.id, id), isNull(foods.archivedAt)))
    .returning({ id: foods.id });
  return rows.length > 0 ? { ok: true } : { ok: false, reason: "notFound" };
}

/** Clears archivedAt on an archived food; nameTaken if an active food has the same name (D9); else notFound. */
export async function restoreFood(id: number): Promise<FoodToggleResult> {
  return db.transaction(async (tx) => {
    const [archived] = await tx
      .select({ name: foods.name })
      .from(foods)
      .where(and(eq(foods.id, id), isNotNull(foods.archivedAt)))
      .limit(1);
    if (!archived) return { ok: false, reason: "notFound" };
    if (await isNameTaken(tx, archived.name, id)) {
      return { ok: false, reason: "nameTaken" };
    }
    await tx
      .update(foods)
      .set({ archivedAt: null, updatedAt: new Date() })
      .where(eq(foods.id, id));
    return { ok: true };
  });
}

/**
 * Permanently deletes an archived food. Active or missing ids → notFound.
 * A food referenced by any diary entry → inUse (the FK is `restrict`, and history is never rewritten).
 * A food that is an ingredient of a dish → usedInComposite (D5). Deleting a dish removes its ingredient rows by cascade.
 */
export async function deleteFood(id: number): Promise<FoodToggleResult> {
  return db.transaction(async (tx) => {
    const [archived] = await tx
      .select({ id: foods.id })
      .from(foods)
      .where(and(eq(foods.id, id), isNotNull(foods.archivedAt)))
      .limit(1);
    if (!archived) return { ok: false, reason: "notFound" };
    const [used] = await tx
      .select({ id: diaryEntries.id })
      .from(diaryEntries)
      .where(eq(diaryEntries.foodId, id))
      .limit(1);
    if (used) return { ok: false, reason: "inUse" };
    const [inComposite] = await tx
      .select({ id: foodComponents.id })
      .from(foodComponents)
      .where(eq(foodComponents.componentFoodId, id))
      .limit(1);
    if (inComposite) return { ok: false, reason: "usedInComposite" };
    await tx.delete(foods).where(eq(foods.id, id));
    return { ok: true };
  });
}
