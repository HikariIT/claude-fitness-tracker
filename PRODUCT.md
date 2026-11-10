# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
A single person, the owner, who tracks their own food and workouts. They are bilingual (Polish and English) and switch between the two. There are no other users, no accounts and no auth.

## Product Purpose
A personal food and workout diary that answers one question each day: am I on a caloric deficit? It estimates the base caloric requirement from personal data (BMR × activity), adds up the food eaten and the activity done, and shows the resulting daily balance.

Success means:
- the numbers are trustworthy and explainable (kcal, macros, base requirement, calories burned);
- the deficit is visible at a glance, both for today and as a trend across days;
- daily logging is fast;
- composed foods (e.g. Curry with Rice = Curry Sauce + Boiled Rice) are built once and reused.

## Positioning
A private, self-hosted tool shaped around one person's routine rather than a generic calorie-counting service: the user's own food database (no brand catalogue), free-form meal categories, and exactly two activity types that fit how they train (treadmill with slope/speed parameters, and training).

## Operating Context
- Mostly used on a **desktop in the evening**: planning or reviewing the day's meals, entering foods into the database and checking the balance. Phone use is secondary.
- Runs locally in Docker (Next.js app + PostgreSQL).
- The interface is fully bilingual (PL/EN) through a language map. The locale is in the URL (`/pl/...`, `/en/...`), and PL is the default.

## Capabilities and Constraints
- There are exactly five views and no more: **Personal data** (`/profile`), **Food database** (`/foods`), **Food planner** (`/planner`), **Workout planner** (`/workouts`) and **Total balance** (`/balance`).
- Food database: foods have kcal, protein, carbs and fat per 100 g. Foods can be composed from other foods (planned for a later task). Foods are archived, not deleted, so history stays intact.
- Food planner: meals per day in freely chosen categories (Breakfast, Lunch, Dinner…). Diary entries snapshot the nutrition values, so editing a food never rewrites past days.
- Workout planner: only two activity types, Treadmill (duration, speed, slope/incline, distance, calories) and Training (exercises, sets, reps, weight).
- Balance: the daily intake vs the estimated requirement plus activity, with a deficit/surplus indication.
- No raw UI strings. Every label comes from the PL/EN message files.
- Single-user data model: settings are a singleton row.
- Undecided: whether goals beyond kcal/protein will be tracked, and how far the balance view goes in showing multi-day trends.

## Brand Commitments
- Binding style rule from the project brief: a **notepad look with a mostly blueish palette**, using the repo's `palette` file (platinum, dusk blue, steel blue, icy blue, grey olive).
- Working app name in the message files: "Notatnik Fit" / "Fit Notebook". This is not a confirmed brand.

## Evidence on Hand
- Seed data with Polish sample foods, diary entries, exercises and workouts (`src/db/seed.ts`). It is mock data for development, not real user history.
- There are no testimonials, metrics or external users, and none should be invented.

## Product Principles
1. **Numbers first, and honest.** Every figure shown should be traceable to its inputs. Estimates are labelled as estimates.
2. **Today's verdict at a glance.** Deficit or not should never take more than one look.
3. **Log in seconds.** Repeated actions (adding a known food or a usual workout) should take minimal steps.
4. **Build once, reuse forever.** Foods and composed dishes are durable assets, and history is never rewritten.
5. **Both languages are first-class.** Polish (with diacritics) and English get equal care in copy and layout.
