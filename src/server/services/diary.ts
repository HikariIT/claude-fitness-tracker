import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { diaryEntries, foodPortions, foods } from "@/db/schema";
import { portionNutrition } from "@/lib/diary";
import {
  NO_PORTION_SNAPSHOT,
  portionGrams,
  QUANTITY_G_MAX,
  QUANTITY_G_MIN,
  type PortionAmount,
  type PortionSnapshot,
} from "@/lib/portions";
import type { DiaryEntryErrorCode, DiaryEntryInput } from "@/lib/validation/diary";
import type { DiaryEntry } from "@/server/dal/diary";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type DiaryWriteResult =
  | { ok: true; entry: DiaryEntry }
  | { ok: false; reason: "notFound" | "foodUnavailable" | "portionUnavailable" | "quantityRange" };
export type DiaryDeleteResult = { ok: true; date: string } | { ok: false; reason: "notFound" };

/**
 * D4, D15: grams and snapshot for the input. The portion must exist and belong to foodId.
 * Count × portion grams must stay within the grams range.
 */
async function resolveAmount(
  tx: Tx,
  foodId: number,
  amount: PortionAmount,
): Promise<
  | { ok: true; quantityG: number; snapshot: PortionSnapshot }
  | { ok: false; reason: Extract<DiaryEntryErrorCode, "portionUnavailable" | "quantityRange"> }
> {
  if (amount.kind === "grams") {
    return { ok: true, quantityG: amount.quantityG, snapshot: NO_PORTION_SNAPSHOT };
  }
  const [portion] = await tx
    .select()
    .from(foodPortions)
    .where(eq(foodPortions.id, amount.portionId))
    .limit(1);
  if (!portion || portion.foodId !== foodId) {
    return { ok: false, reason: "portionUnavailable" };
  }
  const quantityG = portionGrams(amount.count, portion.grams);
  if (quantityG < QUANTITY_G_MIN || quantityG > QUANTITY_G_MAX) {
    return { ok: false, reason: "quantityRange" };
  }
  return {
    ok: true,
    quantityG,
    snapshot: { portionName: portion.name, portionG: portion.grams, portionCount: amount.count },
  };
}

/** D3, D7: the food must exist and not be archived. The snapshot is computed from its per-100 g values. */
export async function createDiaryEntry(input: DiaryEntryInput): Promise<DiaryWriteResult> {
  return db.transaction(async (tx) => {
    const [food] = await tx.select().from(foods).where(eq(foods.id, input.foodId)).limit(1);
    if (!food || food.archivedAt !== null) {
      return { ok: false, reason: "foodUnavailable" };
    }
    const resolved = await resolveAmount(tx, input.foodId, input.amount);
    if (!resolved.ok) return resolved;

    const [entry] = await tx
      .insert(diaryEntries)
      .values({
        date: input.date,
        meal: input.meal,
        foodId: input.foodId,
        quantityG: resolved.quantityG,
        ...resolved.snapshot,
        ...portionNutrition(food, resolved.quantityG),
      })
      .returning();
    return { ok: true, entry };
  });
}

/**
 * D4, D7: recomputes the snapshot from the food's current values. The stored date is kept.
 * An archived food is accepted only when it is the entry's current food.
 */
export async function updateDiaryEntry(id: number, input: DiaryEntryInput): Promise<DiaryWriteResult> {
  return db.transaction(async (tx) => {
    const [entry] = await tx.select().from(diaryEntries).where(eq(diaryEntries.id, id)).limit(1);
    if (!entry) return { ok: false, reason: "notFound" };

    const [food] = await tx.select().from(foods).where(eq(foods.id, input.foodId)).limit(1);
    if (!food) return { ok: false, reason: "foodUnavailable" };
    if (food.archivedAt !== null && input.foodId !== entry.foodId) {
      return { ok: false, reason: "foodUnavailable" };
    }
    const resolved = await resolveAmount(tx, input.foodId, input.amount);
    if (!resolved.ok) return resolved;

    const [updated] = await tx
      .update(diaryEntries)
      .set({
        meal: input.meal,
        foodId: input.foodId,
        quantityG: resolved.quantityG,
        ...resolved.snapshot,
        ...portionNutrition(food, resolved.quantityG),
        updatedAt: new Date(),
      })
      .where(eq(diaryEntries.id, id))
      .returning();
    return { ok: true, entry: updated };
  });
}

/** Deletes one entry and returns its date so the caller can invalidate that day. */
export async function deleteDiaryEntry(id: number): Promise<DiaryDeleteResult> {
  const [row] = await db
    .delete(diaryEntries)
    .where(eq(diaryEntries.id, id))
    .returning({ date: diaryEntries.date });
  if (!row) return { ok: false, reason: "notFound" };
  return { ok: true, date: row.date };
}
