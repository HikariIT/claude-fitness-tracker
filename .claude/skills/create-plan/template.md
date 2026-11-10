# Plan template

A plan is a folder `.claude/plans/<task_name>/`:
- `plan.md`: the overview, read by every agent. Keep it short.
- `subtask-<n>.md`: one file per subtask, read only by the agent realizing it.

## `plan.md`
~~~markdown
# <Task Name>
**Linear:** <Issue identifier, e.g. FIT-5. Omit this line if the task is not from Linear.>

## Task Description
<What to build and why, in up to 3 sentences.>

## Design Decisions
- **D1:** <One-sentence decision from the user.>
- **D2:** <...>

## Implementation Progress
| # | Subtask | File | Status |
|---|---|---|---|
| 1 | <Short title> | [subtask-1.md](subtask-1.md) | Planned |
| 2 | <Short title> | [subtask-2.md](subtask-2.md) | Planned |
<!-- Up to 5 rows. Status: Planned / In Progress / Done. Run subtasks in order; take the first row not marked Done. -->

## Change Log
<!-- Filled by /plan-realize: one bullet per finished subtask, "- <n>. <change>". Used to build commit-message.txt after the last subtask. -->
~~~

## `subtask-<n>.md`
~~~markdown
# <n>. <Short title>
**Decisions:** D1, D2

<Everything the implementing agent needs, assuming no other context: goal, approach, key types/functions, edge cases.>

**Files:**
- Create: `<path>`: <purpose>
- Modify: `<path>`: <change>
- Remove: `<path>`

**Read:** `<path>`, `<path>:<lines or symbol>`, `<doc path>`: read-only context, nothing else needed

**Verify:** `<command>`, e.g. `npm run lint`, `npx tsc --noEmit`, `npm test -- <path>`
~~~
