import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "@/db/client";

async function main() {
  try {
    await migrate(db, { migrationsFolder: "src/db/migrations" });
    console.log("Migrations applied");
    process.exitCode = 0;
  } catch (error) {
    console.error("Migration FAILED:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void main();
