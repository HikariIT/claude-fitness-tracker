# src/lib: pure, unit-tested logic

Isomorphic helpers with no side effects. Tests sit next to the code (`*.test.ts`, Vitest).

**Files:**
- `dates.ts`: ISO date helpers (`isIsoDate`, `isoToUtcDate`, `addDays`). Local day strings, no timezone drift.
- `nutrition.ts`: `SEXES`, `ACTIVITY_LEVELS`, `ACTIVITY_MULTIPLIERS` (D5), `ageOn`, `calcBmr` (Mifflin-St Jeor, D1), `calcTdee`.
- `validation/profile.ts`: `parseProfileForm(formData, today)` returns `{ ok, data }` or `{ ok: false, fieldErrors }`. Errors are stable codes (`PROFILE_ERROR_CODES`, e.g. `heightRange`), never strings (D7).
- `utils.ts`: `cn()` (class merging).

**Rules:**
- Pure only: no I/O, no React, no `@/db`, no `server-only`.
- Enum values in `nutrition.ts` (`SEXES`, `ACTIVITY_LEVELS`) must match `src/db/schema/enums.ts`.
- Validation lives here as Zod schemas or parsers, one file per feature under `validation/`.
- Every formula and parser gets a Vitest case, including boundary values.
- Code takes `today` as a parameter. It never calls `new Date()` itself.
- Relative imports or `@/lib/...` only. No imports from `features/`, `components/` or `server/`.
