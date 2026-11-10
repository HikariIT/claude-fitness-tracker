import "server-only";
import { and, eq, isNotNull, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { diaryEntries, foods } from "@/db/schema";
import type { FoodInput } from "@/lib/validation/foods";
import type { Food } from "@/server/dal/foods";

export type FoodWriteResult =
  | { ok: true; food: Food }
  | { ok: false; reason: "nameTaken" | "notFound" };
export type FoodToggleResult =
  | { ok: true }
  | { ok: false; reason: "nameTaken" | "notFound" | "inUse" };

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

export async function createFood(input: FoodInput): Promise<FoodWriteResult> {
  return db.transaction(async (tx) => {
    if (await isNameTaken(tx, input.name)) {
      return { ok: false, reason: "nameTaken" };
    }
    const [food] = await tx.insert(foods).values(input).returning();
    return { ok: true, food };
  });
}

/** Updates only a non-archived food; an archived or missing id → notFound (D7: diary snapshots are not touched). */
export async function updateFood(id: number, input: FoodInput): Promise<FoodWriteResult> {
  return db.transaction(async (tx) => {
    if (await isNameTaken(tx, input.name, id)) {
      return { ok: false, reason: "nameTaken" };
    }
    const [food] = await tx
      .update(foods)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(foods.id, id), isNull(foods.archivedAt)))
      .returning();
    if (!food) return { ok: false, reason: "notFound" };
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
    await tx.delete(foods).where(eq(foods.id, id));
    return { ok: true };
  });
}
