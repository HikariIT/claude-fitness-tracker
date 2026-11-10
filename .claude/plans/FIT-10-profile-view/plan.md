# Personal Data View with Base Caloric Requirement
**Linear:** FIT-10

## Task Description
Build the first real view, `/profile`: a form for the user's personal data (sex, birth date, height, weight, activity level, calorie goal, optional protein goal) saved to the singleton `settings` row. The page shows the base caloric requirement (BMR and TDEE) live while the user types. Saving goes through a validated Server Action.

## Design Decisions
- **D1:** BMR uses the Mifflin-St Jeor formula: `10·kg + 6.25·cm − 5·age + (male +5 / female −161)`.
- **D2:** The page shows BMR and TDEE (BMR × activity multiplier); `kcalGoal` is a separate editable field, prefilled with TDEE until the user edits it, with a "use as goal" button that sets it to TDEE.
- **D3:** A client form shows BMR/TDEE live as the user types. A Save button calls a Zod-validated Server Action that upserts `settings` row `id = 1` and shows a sonner toast.
- **D4:** The fields are exactly the schema fields in metric units (no imperial toggle): sex, birth date, height cm, weight kg, activity level, kcal goal, optional protein goal g. Age is derived from the birth date.
- **D5:** Activity multipliers: sedentary 1.2, light 1.375, moderate 1.55, active 1.725, very_active 1.9.
- **D6:** Validation ranges: height 100–250 cm, weight 30–300 kg (both rounded to 1 decimal), kcal goal 800–10000, protein goal 0–500 g (empty = none), birth date a real ISO date, not in the future, not before 1900-01-01.
- **D7:** Validation errors are stable codes (e.g. `heightRange`), not strings. The UI translates them through the `profile.errors.*` message keys (PL/EN).
- **D8:** Reads go through `server/dal/settings.ts` with `"use cache"` + `cacheTag("settings")`; the action calls `updateTag("settings")`. The page gets "today" through `await connection()` in an async server component inside `<Suspense>`, because `cacheComponents` forbids `new Date()` in the static shell.
- **D9:** Pure logic (BMR, TDEE, age, Zod schema) lives in `src/lib/` with Vitest tests. There is no database test in this task.

## Implementation Progress
| # | Subtask | File | Status |
|---|---|---|---|
| 1 | Pure logic: nutrition formulas and profile validation (with tests) | [subtask-1.md](subtask-1.md) | Done |
| 2 | Server side: ActionResult type, settings DAL, service, Server Action | [subtask-2.md](subtask-2.md) | Done |
| 3 | Shared form components and PL/EN message keys | [subtask-3.md](subtask-3.md) | Done |
| 4 | ProfileForm feature UI and the `/profile` page | [subtask-4.md](subtask-4.md) | Done |
| 5 | Documentation (navigators, architecture doc) | [subtask-5.md](subtask-5.md) | Done |

## Change Log
<!-- Filled by /plan-realize: one bullet per finished subtask, "- <n>. <change>". Used to build commit-message.txt after the last subtask. -->
- 1. Add nutrition formulas (ageOn, calcBmr, calcTdee) and profile form parser with Vitest tests
- 2. Add ActionResult type, cached settings DAL, settings upsert service and saveProfile Server Action
- 3. Add FormField, NumberInput and SubmitButton form components and profile message keys in EN and PL
- 4. Add ProfileForm with live BMR/TDEE results and wire the /profile page to a Suspense-wrapped ProfileSection
- 5. Add navigators for lib, server and features, and update components, app and architecture docs for the profile view
