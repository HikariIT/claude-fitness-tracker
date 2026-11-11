# Implement Workout Planner with Treadmill and Training Activities
**Linear:** FIT-14

## Task Description
Build the workouts view: for any day, the user records any number of treadmill sessions (duration, average speed, slope, kcal) and trainings (ordered sets of exercise, reps and weight, plus kcal). The page also has a daily steps counter with its kcal, and a summary of kcal burned that day. Kcal for treadmill and steps is prefilled from an estimate based on the profile weight and stays editable.

## Design Decisions
- **D1:** Routes are `/[locale]/workouts` (today) and `/[locale]/workouts/[date]` (any ISO day, past or future), with `DatePager` on top. An invalid date gives `notFound()`.
- **D2:** A day holds any number of workouts, each Treadmill or Training, listed in insertion order (`id`).
- **D3:** Treadmill requires duration (min), average speed (km/h), slope (%) and kcal burned. Distance is not entered: it is shown computed (speed × duration), and the `distance_km` column is dropped.
- **D4:** Treadmill kcal is prefilled with an ACSM walking/running estimate from speed, slope, duration and profile weight, and it stays editable. Without a saved profile there is no prefill, only a hint.
- **D5:** Training has an optional name, a manually entered kcal value and a flat ordered list of sets (exercise, reps > 0, optional weight kg). Sets can be added, removed and moved up/down in the dialog.
- **D6:** Exercises are created inline: the set's exercise field searches existing exercises and offers "Create '<name>'". There is no exercise rename, archive or delete UI.
- **D7:** Daily steps live in a new `daily_steps` table (one row per date: `steps`, `kcal`). Kcal is prefilled from `steps × weightKg × 0.0005`, stays editable and is stored.
- **D8:** Workouts can be edited and deleted (confirm dialog first, then a success toast). The type is fixed once a workout is created. Steps can be edited and cleared.
- **D9:** The optional `notes` field (max 500 chars) is editable for both types and shown in the list.
- **D10:** Below the list there are 3 stat cards: kcal from workouts, kcal from steps and the total. There is no comparison with food (that is the Balance view).
- **D11:** Ranges: duration 1–600 min (1 dec.), speed 0.5–25 km/h (1 dec.), slope 0–15 % (1 dec.), kcal 0–5000 (int), reps 1–1000 (int), weight 0–1000 kg (2 dec.), steps 0–100000 (int).

## Implementation Progress
| # | Subtask | File | Status |
|---|---|---|---|
| 1 | Schema (drop distance, add `daily_steps`), migration, seed, pure workout helpers (with tests) | [subtask-1.md](subtask-1.md) | Done |
| 2 | Validation (with tests), workouts DAL, services and Server Actions | [subtask-2.md](subtask-2.md) | Done |
| 3 | PL/EN message keys, treadmill dialog, steps dialog, confirm-delete dialog | [subtask-3.md](subtask-3.md) | Done |
| 4 | Exercise picker, training dialog, workout card | [subtask-4.md](subtask-4.md) | Done |
| 5 | Workouts view, steps card, burned totals, routes and docs | [subtask-5.md](subtask-5.md) | Done |

## Change Log
<!-- Filled by /plan-realize: one bullet per finished subtask, "- <n>. <change>". Used to build commit-message.txt after the last subtask. -->
- 1. Drop treadmill distance column, add daily_steps table (migration 0002), seed steps and a check, add pure workout helpers in lib/workouts.ts, and parseInteger plus a places argument on parseDecimal
- 2. Add workout and steps form parsers with tests, workouts DAL, services (exercises resolved before writes, steps upsert) and Server Actions, and document them in server/CLAUDE.md
- 3. Add workouts message keys to en and pl, and the treadmill, steps and confirm-delete dialogs in features/workouts/components
- 4. Add the exercise picker with inline create, the training dialog with reorderable sets, and the workout card for treadmill and training
- 5. Add the workouts section and view with the steps card and burned totals, the today and any-date routes (any ISO day, invalid gives 404), and update the feature, app and architecture docs
