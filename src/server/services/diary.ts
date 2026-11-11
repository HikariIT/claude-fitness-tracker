import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { diaryEntries, foods } from "@/db/schema";
import { portionNutrition } from "@/lib/diary";
import type { DiaryEntryInput } from "@/lib/validation/diary";
import type { DiaryEntry } from "@/server/dal/diary";

export type DiaryWriteResult =
  | { ok: true; entry: DiaryEntry }
  | { ok: false; reason: "notFound" | "foodUnavailable" };
export type DiaryDeleteResult = { ok: true; date: string } | { ok: false; reason: "notFound" };

/** D3, D7: the food must exist and not be archived. The snapshot is computed from its per-100 g values. */
export async function createDiaryEntry(input: DiaryEntryInput): Promise<DiaryWriteResult> {
  const [food] = await db.select().from(foods).where(eq(foods.id, input.foodId)).limit(1);
  if (!food || food.archivedAt !== null) {
    return { ok: false, reason: "foodUnavailable" };
  }
  const [entry] = await db
    .insert(diaryEntries)
    .values({
      date: input.date,
      meal: input.meal,
      foodId: input.foodId,
      quantityG: input.quantityG,
      ...portionNutrition(food, input.quantityG),
    })
    .returning();
  return { ok: true, entry };
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

    const [updated] = await tx
      .update(diaryEntries)
      .set({
        meal: input.meal,
        foodId: input.foodId,
        quantityG: input.quantityG,
        ...portionNutrition(food, input.quantityG),
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
