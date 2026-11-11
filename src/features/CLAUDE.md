# src/features: vertical slices

Each feature is a folder: `components/` (client and server UI for that feature) and `actions.ts` (Server Actions).

**Slices:**
- `profile/`: `ProfileSection` (async server component, reads settings through `server/dal`), `ProfileForm` (client, live BMR/TDEE, Save), `actions.ts` (`saveProfile`).
- `foods/`: `FoodsSection` (async server component, `await connection()`, reads `listFoods` and `listFoodComponents`), `FoodsView` (client: search, show-removed toggle, dialogs), `FoodsTable` (shows a "Dish" badge and expandable ingredient rows), `FoodFormDialog` (add/edit, `useActionState(saveFood)`, live kcal-from-macros hint), `CompositeFoodDialog` (add/edit dish, `useActionState(saveCompositeFood)`, ingredient search, live per-100 g preview), `ConfirmFoodDialog` (confirms archive, or permanent delete of an archived food), `actions.ts` (`saveFood`, `saveCompositeFood`, `archiveFoodAction`, `restoreFoodAction`, `deleteFoodAction`).
- `planner/`: `PlannerSection` (async server component, date or today, reads `getDiaryDay`, `listFoods`, `getSettings`), `PlannerView` (client: `DatePager`, "List of meals" heading with the Add button, one table, then day totals; dialog state), `EntriesTable` (all of the day's entries in one table, meal shown as a column, insertion order), `DayTotals` (stat cards, then kcal vs goal and protein vs optional protein goal), `EntryFormDialog` (add/edit, food search over non-archived foods, live preview), `ConfirmEntryDialog`, `actions.ts` (`saveDiaryEntry`, `deleteDiaryEntryAction`).
- `workouts/`: `WorkoutsSection` (async server component, reads `getWorkoutDay`, `getDailySteps`, `listExercises`, `getSettings`), `WorkoutsView` (client: `DatePager`, list of workouts with add buttons, steps card, burned totals, dialog state), `WorkoutCard`, `TreadmillFormDialog` (ACSM kcal estimate from profile weight), `TrainingFormDialog` + `ExercisePicker` (inline exercise creation), `StepsCard` + `StepsFormDialog`, `BurnedTotals`, `ConfirmWorkoutDialog`, `actions.ts` (`saveWorkout`, `deleteWorkoutAction`, `saveSteps`, `clearStepsAction`).
- `balance/`: `BalanceSection` (async server component, date or today, reads `getSettings` and, for the 7 days of the Mon–Sun week, `getDiaryDay`, `getWorkoutDay`, `getDailySteps`; computes with `lib/balance.ts`), `BalanceView` (client: `DatePager`, day summary, week table, or an EmptyState without a profile), `DaySummary`, `WeekTable`, `BalanceStatusLabel`. Read-only, no `actions.ts`.

**Adding a feature:**
1. Create `features/<name>/components/` and `features/<name>/actions.ts`.
2. Add the pure rules to `src/lib/` and the validator to `src/lib/validation/`, with tests.
3. Add the read to `server/dal/` and the write to `server/services/`.
4. Add the page under `app/[locale]/<name>/page.tsx`, composing `features/` components inside `<Suspense>`.
5. Add message keys to both `src/messages/pl.json` and `en.json`.

**Action template:**
```ts
"use server";
export async function doThing(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseX(formData, today);       // lib validator, codes not strings
  if (!parsed.ok) return { ok: false, code: "validation", fieldErrors: parsed.fieldErrors };
  try { await writeX(parsed.data); } catch (e) { console.error(e); return { ok: false, code: "unexpected" }; }
  updateTag("<tag>");                           // after the write
  return { ok: true, data: { ... } };
}
```
- Return `ActionResult<T, E>` from `src/types/action-result.ts`. Never throw for expected errors.
- Validation errors are codes. The UI translates them through `<feature>.errors.*` message keys (D7).
- Shared UI goes in `src/components/`, not here. Features may import from `components/`.
- Features never import `db/` directly.
