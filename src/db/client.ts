import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local.");
}

// Reuse one pool across Next.js dev hot reloads.
const globalForDb = globalThis as unknown as { pgPool?: Pool };
export const pool = globalForDb.pgPool ?? new Pool({ connectionString });
if (process.env.NODE_ENV !== "production") globalForDb.pgPool = pool;

export const db = drizzle({ client: pool });
