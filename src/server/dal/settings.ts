import "server-only";
import { cacheTag } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { settings } from "@/db/schema";

export type Settings = typeof settings.$inferSelect;

export async function getSettings(): Promise<Settings | null> {
  "use cache";
  cacheTag("settings");
  const row = await db.query.settings.findFirst({ where: eq(settings.id, 1) });
  return row ?? null;
}
