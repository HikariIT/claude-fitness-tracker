# Restructure Project to src/ Layout and Install Dependencies
**Linear:** FIT-5

## Task Description
Move the Next.js App Router folder from `app/` to `src/app/` and point the `@/*` alias at `src/`, as described in `CLAUDE_ARCHITECTURE.md`. Then install the runtime and dev dependencies from step 2 of the architecture setup, with a working Vitest config and `test` script.

## Design Decisions
- **D1:** Install only the setup step 2 packages: `drizzle-orm pg zod drizzle-zod server-only`, dev `drizzle-kit @types/pg vitest`. The Postgres service, shadcn and the schema belong to later tasks.
- **D2:** Only move `app/` into `src/`. Do not create empty skeleton folders or sub-CLAUDE.md files yet.
- **D3:** Add `vitest.config.ts` (with the `@/` alias) and a `test` script. The `db:*` scripts wait for the Drizzle task.
- **D4:** Pin new packages to exact versions (`--save-exact`), matching the existing `next`/`react` style.

## Implementation Progress
| # | Subtask | File | Status |
|---|---|---|---|
| 1 | Move app/ to src/app and update the alias | [subtask-1.md](subtask-1.md) | Done |
| 2 | Install dependencies and set up Vitest | [subtask-2.md](subtask-2.md) | Done |

## Change Log
- 1. Move app/ to src/app (git mv), point the @/* alias at ./src/* and update the README path
- 2. Install drizzle-orm 0.45.4, pg 8.23.1, zod 4.6.7, drizzle-zod 0.8.3, server-only 0.0.1 and dev drizzle-kit 0.31.11, @types/pg 8.23.1, vitest 4.1.12; add vitest.config.mts with the @/ alias and the test script
