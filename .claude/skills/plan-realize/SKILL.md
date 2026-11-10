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
8. Append one bullet to the `## Change Log` section at the end of `plan.md` (create the section if it is missing): `- <n>. <what changed, in the imperative, one line>` (e.g. `- 2. Add Drizzle schema for foods and diary entries`). This log is the only record later agents have of your work, so describe the actual change, not the plan.
9. If this subtask was the last one, so every row in "Implementation Progress" is now `Done`:
   - Write the commit message for the whole plan to `commit-message.txt` in the plan folder. Build it only from the plan title and the `## Change Log` bullets (all subtasks, in order); do not read the subtask files or the diff for this:
     ```
     [<Linear identifier>]: <Task Name>

     - <change log bullet 1, without the number>
     - <change log bullet 2, without the number>
     ```
     If there is no `**Linear:**` line, the subject is just `<Task Name>`. Never add `Co-Authored-By` or any other attribution line. Do not run `git commit`; the user commits.
   - If `plan.md` has a `**Linear:**` line, load both tools in one ToolSearch call (`select:mcp__linear-server__save_issue,mcp__linear-server__save_comment`), then:
     - Post the commit message as a comment on the issue with `mcp__linear-server__save_comment` (`issueId: <identifier>`). Body: the line `Commit message:` followed by the message in a fenced code block, exactly as in `commit-message.txt`.
     - Set the issue to `Done` with `mcp__linear-server__save_issue` (`id: <identifier>`, `state: "Done"`).
     If either call fails, say which one in the reply; the commit message file stays either way.
   Never do any of this when a subtask is blocked.
10. Reply with 1–3 lines: the subtask, the result and the verify output summary (and the Linear status change and comment, if any). After the last subtask, also print the commit message in a code block.
