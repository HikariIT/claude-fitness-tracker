import "server-only";
import { cacheTag } from "next/cache";
import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { foodComponents, foodPortions, foods } from "@/db/schema";

export type Food = typeof foods.$inferSelect;
export type FoodComponent = typeof foodComponents.$inferSelect;
export type FoodPortion = typeof foodPortions.$inferSelect;

/** All foods, including archived ones (the UI filters, D3), ordered by name. */
export async function listFoods(): Promise<Food[]> {
  "use cache";
  cacheTag("foods");
  return db.select().from(foods).orderBy(asc(foods.name));
}

/** Every dish ingredient row (tag "foods"), ordered by foodId, then id. The UI groups them by foodId. */
export async function listFoodComponents(): Promise<FoodComponent[]> {
  "use cache";
  cacheTag("foods");
  return db.select().from(foodComponents).orderBy(asc(foodComponents.foodId), asc(foodComponents.id));
}

/** Every portion row (tag "foods"), ordered by foodId, then sortOrder. The UI groups them by foodId. */
export async function listFoodPortions(): Promise<FoodPortion[]> {
  "use cache";
  cacheTag("foods");
  return db.select().from(foodPortions).orderBy(asc(foodPortions.foodId), asc(foodPortions.sortOrder));
}
