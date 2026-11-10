import "server-only";
import { db } from "@/db/client";
import { settings } from "@/db/schema";
import type { ProfileInput } from "@/lib/validation/profile";
import type { Settings } from "@/server/dal/settings";

export async function saveSettings(input: ProfileInput): Promise<Settings> {
  const [row] = await db
    .insert(settings)
    .values({ id: 1, ...input })
    .onConflictDoUpdate({
      target: settings.id,
      set: { ...input, updatedAt: new Date() },
    })
    .returning();
  return row;
}
