# src/db: database layer

**Purpose:** the database layer (PostgreSQL 17 + Drizzle ORM). Only `src/db/` and `src/server/` may touch the database. Never import `src/db/` from `src/app/`, `src/components/` or client code.

**Files:**
- `client.ts`: server-only pg `Pool` + Drizzle `db` singleton, with `schema` and `casing: "snake_case"`. Reads `DATABASE_URL`; the pool is cached on `globalThis` in dev.
- `check.ts`: CLI `SELECT 1` connection check. Not imported by the app.
- `migrate.ts`: CLI that applies `src/db/migrations/`. Not imported by the app.
- `seed.ts`: CLI that wipes all tables and inserts Polish sample data, then checks the relations. Not imported by the app.
- `schema/`: table definitions, enums, relations. See `schema/CLAUDE.md`.
- `migrations/`: drizzle-kit output, committed. Never hand-edit.

**Connection:** credentials `postgres`/`postgres`, database `fitness_tracker` (see `.env.example`). Host scripts use `localhost:5432` from `.env.local`. Inside compose the host is `db`, and the dev `web` service overrides `DATABASE_URL`. Port 5432 is published only in `docker-compose.dev.yml`.

**Commands:**
- `docker compose -f docker-compose.dev.yml up -d --wait db` starts Postgres.
- `npm run db:check` runs the `SELECT 1` check and exits 0 or 1.
- `npm run db:generate` writes a new migration after a schema change (drizzle-kit).
- `npm run db:migrate` applies pending migrations. The dev compose runs it before `next dev`.
- `npm run db:seed` wipes all tables, inserts sample data and checks the relations. It exits 1 on any mismatch. Safe to run again.
- The scripts use `tsx --conditions=react-server` so `import "server-only"` does not throw outside Next.js.

**Conventions:**
- snake_case in the DB, camelCase in TS (`casing: "snake_case"`).
- Types come from `$inferSelect` / `$inferInsert`, never hand-written.
- Foods and exercises are archived (`archivedAt`). An archived food may be hard-deleted only when no diary entry references it (FK `restrict`).
- Diary entries store nutrition snapshots, so later food edits do not change past days.
- Schema change flow: edit `schema/` → `npm run db:generate` → review the SQL → `npm run db:migrate` → update `seed.ts` if needed.
- See `CLAUDE_ARCHITECTURE.md` ("Data model") for the model.
