# Implement Food Planner with Custom Meal Categories
**Linear:** FIT-13

## Task Description
Build the food planner view: for any day, the user adds diary entries (a food or dish plus grams) and puts each one in a meal category they choose freely (breakfast, lunch, dinner, snack, other). Entries store a kcal/macro snapshot, so later food edits leave past days unchanged. The day shows all entries in one table with their meal category, then day totals with kcal and protein eaten vs the profile goals.

## Design Decisions
- **D1:** Categories are the 5 fixed `meal` enum values (breakfast, lunch, dinner, snack, other), chosen freely per entry, with no ordering or one-per-day rule.
- **D2:** Routes are `/[locale]/planner` (today) and `/[locale]/planner/[date]` (any day), with `DatePager` on top. An invalid date gives `notFound()`, and "today" is the server's local calendar date.
- **D3:** An entry is one food (plain or dish) plus grams in a meal, with kcal/P/C/F snapshot columns computed from the food's per-100 g values on save.
- **D4:** Entries can be edited (food, grams, meal) and deleted. Every edit recomputes the snapshot from the food's current values. Untouched entries stay frozen.
- **D5:** All of the day's entries sit in one table with a Meal column, in insertion order (not grouped). A "List of meals" heading carries the "Add entry" button on the same line, and the dialog's meal select defaults to the meal of the day's last-added entry, or breakfast. (Revised after review.)
- **D6:** Below the table: day total stat cards (kcal, protein, carbs, fat), then kcal eaten vs `kcalGoal` and protein eaten vs `proteinGoalG`. The protein line is always shown, with a profile link when that goal is unset. Without a saved profile there is a hint linking to the profile. (Revised after review.)
- **D7:** The food picker is a search (`matchesQuery`) over non-archived foods only. Existing entries whose food was archived later still show, and their grams and meal stay editable with the same food kept.
- **D8:** Grams are 0.1–5000 with 1 decimal.
- **D9:** Out of scope: copying from a previous day, and favourite or recent foods.
- **D10:** Any valid ISO date is allowed, past or future.
- **D11:** The add/edit dialog shows a live kcal/P/C/F preview for the chosen food and grams.
- **D12:** Deleting an entry asks in a confirm dialog first, then shows a success toast.
- **D13:** Entries within a meal are listed in insertion order (`id`), with no manual reordering.

## Implementation Progress
| # | Subtask | File | Status |
|---|---|---|---|
| 1 | Pure logic: meals, portion nutrition, totals, local date, entry form validation (with tests) | [subtask-1.md](subtask-1.md) | Done |
| 2 | Server side: diary DAL, entry services, planner Server Actions | [subtask-2.md](subtask-2.md) | Done |
| 3 | PL/EN message keys, entry dialog and confirm-delete dialog | [subtask-3.md](subtask-3.md) | Done |
| 4 | Planner view: section, meal groups, day totals | [subtask-4.md](subtask-4.md) | Done |
| 5 | Planner routes (today and `[date]`) and docs | [subtask-5.md](subtask-5.md) | Done |

## Change Log
<!-- Filled by /plan-realize: one bullet per finished subtask, "- <n>. <change>". Used to build commit-message.txt after the last subtask. -->
- 1. Add pure diary helpers (meals, portion/total nutrition, grouping, default meal), localIsoDate, and parseDiaryEntryForm with tests
- 2. Add diary DAL (getDiaryDay), diary write services (create, update snapshot, delete) and planner Server Actions (saveDiaryEntry, deleteDiaryEntryAction)
- 3. Add planner message keys (PL/EN), EntryFormDialog (meal select, food search, grams, live preview) and ConfirmEntryDialog
- 4. Add planner view: PlannerSection (server, date validation), PlannerView (dialog state, DatePager), MealSection (meal table with subtotal), DayTotals (4 stat cards, kcal vs goal)
- 5. Wire `PlannerSection` into `/planner` (today) and the new `/planner/[date]` route (params awaited inside `<Suspense>`, invalid date → 404), put the `usePathname` parts of `AppNav` and `LanguageToggle` behind their own `<Suspense>` fallbacks so routes with unknown params prerender, and document the planner in `src/app/CLAUDE.md`, `src/features/CLAUDE.md`, `src/components/CLAUDE.md` and `CLAUDE_ARCHITECTURE.md`
- Review. Replace the per-meal tables with one `EntriesTable` (Meal column), put "List of meals" and "Add entry" on one line, move day totals below the table and add protein vs protein goal, box `DatePager` as a 2-line card, align every planner block to the 36px ruling, and widen `NotebookSheet` side padding
