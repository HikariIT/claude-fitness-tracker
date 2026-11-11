import "server-only";
import { cacheTag } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { diaryEntries } from "@/db/schema";

export type DiaryEntry = typeof diaryEntries.$inferSelect;

/** Entries of one day, ordered by id (D13). Tag `planner:<date>`. Food names are joined in the UI. */
export async function getDiaryDay(date: string): Promise<DiaryEntry[]> {
  "use cache";
  cacheTag(`planner:${date}`);
  return db
    .select()
    .from(diaryEntries)
    .where(eq(diaryEntries.date, date))
    .orderBy(asc(diaryEntries.id));
}
