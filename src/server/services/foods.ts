import "server-only";
import { and, eq, inArray, isNotNull, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { diaryEntries, foodComponents, foods } from "@/db/schema";
import { compositeNutrition, dependentsInOrder, wouldCreateCycle } from "@/lib/composite";
import type { CompositeFoodInput } from "@/lib/validation/composite-foods";
import type { FoodInput } from "@/lib/validation/foods";
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
      reason: "nameTaken" | "notFound" | "componentUnavailable" | "componentCycle" | "finalWeightTooLow";
    };

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

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

export async function createFood(input: FoodInput): Promise<FoodWriteResult> {
  return db.transaction(async (tx) => {
    if (await isNameTaken(tx, input.name)) {
      return { ok: false, reason: "nameTaken" };
    }
    const [food] = await tx.insert(foods).values(input).returning();
    return { ok: true, food };
  });
}

/**
 * Updates only a non-archived plain food; an archived, missing or dish id → notFound
 * (D7: diary snapshots are not touched; D8: a dish is never edited as a plain food).
 * Recalculates every dish that uses the food (D4).
 */
export async function updateFood(id: number, input: FoodInput): Promise<FoodWriteResult> {
  return db.transaction(async (tx) => {
    if (await isNameTaken(tx, input.name, id)) {
      return { ok: false, reason: "nameTaken" };
    }
    const [food] = await tx
      .update(foods)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(foods.id, id), isNull(foods.archivedAt), eq(foods.isComposite, false)))
      .returning();
    if (!food) return { ok: false, reason: "notFound" };
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

    const byId = new Map(rows.map((row) => [row.id, row]));
    const values = compositeNutrition(
      input.components.map((component) => ({
        ...(byId.get(component.foodId) as (typeof rows)[number]),
        quantityG: component.quantityG,
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
      input.components.map((component) => ({
        foodId: food.id,
        componentFoodId: component.foodId,
        quantityG: component.quantityG,
      })),
    );
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

    const byId = new Map(rows.map((row) => [row.id, row]));
    const values = compositeNutrition(
      input.components.map((component) => ({
        ...(byId.get(component.foodId) as (typeof rows)[number]),
        quantityG: component.quantityG,
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
      input.components.map((component) => ({
        foodId: id,
        componentFoodId: component.foodId,
        quantityG: component.quantityG,
      })),
    );
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
