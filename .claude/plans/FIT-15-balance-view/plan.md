# Implement Daily Caloric Balance View with Deficit Indicator
**Linear:** FIT-15

## Task Description
Build the balance view: for any day it shows the calories eaten, the calories spent (sedentary baseline plus logged activity), the balance with a deficit/surplus indicator and the estimated weight change. Below it, a Monday–Sunday table shows the same numbers for each day of that week and a week total. The view only reads existing diary, workout and steps data.

## Design Decisions
- **D1:** Expenditure = BMR × 1.2 (sedentary baseline) + logged workout kcal + steps kcal. The profile activity level is not used here, so activity is not counted twice.
- **D2:** Every day uses the current profile (sex, height, weight), with age computed on that day's date via `ageOn(birthDate, date)`.
- **D3:** Weight change = balance / 7700 kcal per kg (named constant in `lib`), shown with 2 decimals and a sign.
- **D4:** Balance = eaten − expenditure. Below zero is a deficit (blue/steel), above is a surplus (destructive red), and a text label always states it. `kcalGoal` is not used.
- **D5:** Routes are `/[locale]/balance` (today) and `/[locale]/balance/[date]` (any ISO day, invalid → `notFound()`). The page has a `DatePager` (one day per step), a day summary (stat cards + status label), then a table of that date's Mon–Sun week (7 rows plus a total row), where each row links to `/balance/<date>`.
- **D6:** A day with no diary entries is "not logged": it shows dashes and is left out of the week totals, and the total row says how many of 7 days are logged. This includes future days.
- **D7:** Without a saved profile the page shows an EmptyState with a link to `/profile`, and no numbers.
- **D8:** The week is loaded by calling the existing `getDiaryDay`, `getWorkoutDay` and `getDailySteps` for each of the 7 days in parallel. There is no new DAL function and no new cache tag.
- **D9:** Only the kg change per day and per week is shown, not a projected body weight.

## Implementation Progress
| # | Subtask | File | Status |
|---|---|---|---|
| 1 | Week date helpers and pure balance helpers (with tests) | [subtask-1.md](subtask-1.md) | Done |
| 2 | PL/EN message keys for the balance view | [subtask-2.md](subtask-2.md) | Done |
| 3 | StatCard sign option, DaySummary and WeekTable components | [subtask-3.md](subtask-3.md) | Done |
| 4 | BalanceSection, BalanceView, routes and docs | [subtask-4.md](subtask-4.md) | Done |

## Change Log
<!-- Filled by /plan-realize: one bullet per finished subtask, "- <n>. <change>". Used to build commit-message.txt after the last subtask. -->
- 1. Add weekStart and weekDays to dates.ts, and balance.ts with baselineKcal, dayBalance, weekBalance and balanceStatus, with Vitest coverage
- 2. Add the balance namespace (units, noProfile, day, status, week) to en.json and pl.json
- 3. Add signDisplay to StatCard, and BalanceStatusLabel, DaySummary and WeekTable components under features/balance/components
- 4. Add BalanceSection and BalanceView, replace the balance placeholder with BalanceSection, add balance/[date] route, remove the common message namespace and update the docs
