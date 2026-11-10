import "server-only";
import { cacheTag } from "next/cache";
import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { foods } from "@/db/schema";

export type Food = typeof foods.$inferSelect;

/** All foods, including archived ones (the UI filters, D3), ordered by name. */
export async function listFoods(): Promise<Food[]> {
  "use cache";
  cacheTag("foods");
  return db.select().from(foods).orderBy(asc(foods.name));
}
