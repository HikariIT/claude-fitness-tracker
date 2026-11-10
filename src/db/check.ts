import { sql } from "drizzle-orm";
import { db, pool } from "@/db/client";

async function main() {
  try {
    const result = await db.execute<{ ok: number }>(sql`select 1 as ok`);
    console.log(`Database connection OK (select 1 -> ${result.rows[0]?.ok})`);
    process.exitCode = 0;
  } catch (error) {
    console.error("Database connection FAILED:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void main();
