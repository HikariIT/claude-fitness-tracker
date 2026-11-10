---
name: plan-realize
description: Implement the next unfinished subtask of a plan folder in .claude/plans/. Use when the user asks to realize, continue or execute a plan step.
argument-hint: <plan file or task name>
model: haiku
context: fork
---

Implement exactly ONE subtask, then stop. Keep context small (well under 100K tokens).

1. Read `plan.md` in the plan folder given by the user (`.claude/plans/<name>/`). Pick the first subtask in "Implementation Progress" not marked `Done`, and set it to `In Progress`.
2. Read only that subtask's file (`subtask-<n>.md`) and the files under its **Files** and **Read**. Never open other subtask files. Do not explore the repo, open other subtasks' files or read docs that aren't listed.
3. If a file is large, read only the relevant lines (use Grep or an offset/limit) instead of the whole file.
4. Implement the subtask as described. Do not change scope or redesign; the decisions (D1, D2…) are final.
5. Run the subtask's **Verify** step. Fix failures that are inside the subtask's scope.
6. If the plan is wrong, or a file it needs is missing, stop. Leave the status `In Progress`, add a `**Blocked:**` line under the subtask and tell the user why.
7. On success, set the status to `Done` and add a one-line `**Notes:**` under the subtask for the next agent (only if something deviated from the plan).
8. If this subtask was the last one, so every row in "Implementation Progress" is now `Done`, and `plan.md` has a `**Linear:**` line, set that issue to `Done` with `mcp__linear-server__save_issue` (`id: <identifier>`, `state: "Done"`). Load the tool first with ToolSearch (`select:mcp__linear-server__save_issue`). Never do this when a subtask is blocked. If the update fails, say so in the reply.
9. Reply with 1–3 lines: the subtask, the result and the verify output summary (and the Linear status change, if any).
