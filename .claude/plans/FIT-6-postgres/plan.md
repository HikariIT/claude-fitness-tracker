# Add PostgreSQL Service to Docker Compose and Connect to Database
**Linear:** FIT-6

## Task Description
Add a PostgreSQL `db` service to both Docker Compose files and wire the app to it with default credentials. Add a server-only Drizzle client and an `npm run db:check` script that proves the connection with `SELECT 1`. Do not create any schemas, tables or migrations.

## Design Decisions
- **D1:** Prove the connection with `src/db/client.ts` (pg Pool + Drizzle singleton) and an `npm run db:check` script that runs `SELECT 1` and exits 0 or 1. No UI, route or test changes.
- **D2:** Add the `db` service (postgres:17, named volume, `pg_isready` healthcheck) to both compose files; publish port 5432 only in the dev file.
- **D3:** Use default credentials `postgres`/`postgres` with database `fitness_tracker`; commit a `.env.example`, while `.env.local` and `.env.production` stay git-ignored.
- **D4:** Run `db:check` with a new `tsx` dev dependency, using `--conditions=react-server` (so `server-only` resolves) and `--env-file-if-exists=.env.local`.
- **D5:** Do not add `drizzle.config.ts` or the `db:generate`/`db:migrate` scripts yet; they belong to the schema task.
- **D6:** Add and fill `AGENTS.md` in the `src/db` folder.

## Implementation Progress
| # | Subtask | File | Status |
|---|---|---|---|
| 1 | Postgres service in compose files and env files | [subtask-1.md](subtask-1.md) | Done |
| 2 | Drizzle client, db:check script and src/db/AGENTS.md | [subtask-2.md](subtask-2.md) | Done |

## Change Log
<!-- Filled by /plan-realize: one bullet per finished subtask, "- <n>. <change>". Used to build commit-message.txt after the last subtask. -->
- 1. Add postgres:17 db service to both compose files, committed .env.example, and README setup steps
- 2. Add server-only Drizzle client, db:check script (tsx, SELECT 1), and src/db/AGENTS.md
