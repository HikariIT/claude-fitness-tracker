# 5. Documentation
**Decisions:** D1, D2, D5, D8, D9

Goal: keep the navigator docs accurate after the profile view. Documentation only, no code changes. Each navigator is at most ~40 lines and lists files with one-line purposes plus rules.

## Edits
1. Create `src/lib/CLAUDE.md`: purity rule (no I/O, no React, no `@/db`, no `server-only`); files: `dates.ts` (ISO date helpers), `nutrition.ts` (`SEXES`, `ACTIVITY_LEVELS`, `ACTIVITY_MULTIPLIERS`, `ageOn`, `calcBmr` Mifflin-St Jeor, `calcTdee`), `validation/profile.ts` (`parseProfileForm`, error codes), `utils.ts` (`cn`); tests sit next to the code (`*.test.ts`); enum values in `nutrition.ts` must match `src/db/schema/enums.ts`.
2. Create `src/server/CLAUDE.md`: DAL (`dal/settings.ts`: `getSettings`, `"use cache"` + `cacheTag("settings")`) vs services (`services/settings.ts`: `saveSettings` upsert of row `id = 1`); everything is `server-only`; cache tag naming (`settings`, later `planner:<date>`); actions call `updateTag`.
3. Create `src/features/CLAUDE.md`: slice anatomy (`components/` + `actions.ts`); the profile slice (`ProfileForm`, `ProfileSection`, `saveProfile`); action template: `"use server"`, parse with the lib validator, call a service, `updateTag`, return `ActionResult<T>` (`src/types/action-result.ts`), never throw for expected errors; validation errors are codes translated in the UI via `profile.errors.*` (D7).
4. Modify `src/components/CLAUDE.md`: add a `forms/` section: `FormField({id,label,hint?,error?,children})`, `NumberInput({value,onChange,unit?,...})` (text input with decimal `inputMode`, accepts comma decimals), `SubmitButton({children,pendingLabel})` (uses `useFormStatus`).
5. Modify `src/app/CLAUDE.md`: change the `[locale]/profile/page.tsx` line from "placeholder" to "personal data form; async `ProfileSection` in `<Suspense>` reads settings after `await connection()` (D8)".
6. Modify `CLAUDE_ARCHITECTURE.md`: in the data-model `settings` bullet add the formula (Mifflin-St Jeor, multipliers from D5) and that `kcalGoal` is user-editable and prefilled from TDEE; in the directory tree mark `features/profile`, `server/dal/settings.ts`, `server/services/settings.ts`, `lib/nutrition.ts`, `lib/validation/profile.ts`, `components/forms/*` as existing; in "Setup steps" step 6 note "(done: foods pending, profile FIT-10)".

**Files:**
- Create: `src/lib/CLAUDE.md`, `src/server/CLAUDE.md`, `src/features/CLAUDE.md`
- Modify: `src/components/CLAUDE.md`, `src/app/CLAUDE.md`, `CLAUDE_ARCHITECTURE.md`

**Read:** `.claude/plans/FIT-10-profile-view/plan.md`, `CLAUDE_ARCHITECTURE.md`, `src/components/CLAUDE.md`, `src/app/CLAUDE.md`, `src/db/schema/CLAUDE.md` (style reference), plus the files created in subtasks 1–4 (`src/lib/nutrition.ts`, `src/lib/validation/profile.ts`, `src/server/dal/settings.ts`, `src/server/services/settings.ts`, `src/features/profile/actions.ts`): only to confirm names

**Verify:** `npx tsc --noEmit && npm run lint && npm test`
