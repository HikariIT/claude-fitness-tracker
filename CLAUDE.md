<!-- BEGIN:nextjs-agent-rules -->
## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.
This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Repository overview

Fitness food and workout tracker. Monitors daily food, calculates total caloric intake and registers daily workouts.
The app runs in Docker.
No raw UI strings: use a language map (user is bilingual, Polish and English).
Views should include:
 - Personal data (height, weight, age, etc.) to determine base caloric requirement
 - Food database, where user can input their food and its nutritional values
   It should also allow creation of foods from other foods (e.g. Curry with Rice will be created from Curry Sauce and Boiled Rice)
 - Food planner, where user can set their meals for the day and choose a category freely (Breakfast, Lunch, Dinner, etc.).
 - Workout planner, where user can report their daily activity. Currently only two types of activity is supported: Treadmill and Training
   Treadmill should allow user to set parameters such as slope, speed, calories, etc.
 - Total balance, where user can see their caloric balance each day and see if they are on estimated deficit or not
There should be no more views than this.
Style: notepad look with a mostly blueish palette (see palette file).

Architecture, stack and where to find things: see CLAUDE_ARCHITECTURE.md.