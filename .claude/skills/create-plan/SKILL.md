---
name: create-plan
description: Write a markdown plan (up to 5 subtasks for separate agents) for a described task. Use whenever the user asks to plan or create a task, however simple.
model: opus
---

- Follow the structure in [template.md](template.md).
- Create a plan split into up to 5 subtasks. Each subtask should be run by a different agent with a new context window.
- Plans should have an initial header "Task Description" containing a task description (up to three sentences)
- Before creating a plan, ask user using /grill-me skill about details of implementation
- Decisions made by user should be kept as a short sentence in a bullet point in "Design Decision" section (D1, D2, ...).
- In next section with header "Implementation Progress", there should be all steps numbered from 1 up to 5 with their status.
Legal status is "Planned" / "In Progress" / "Done", so new agents can know which point to realize next.
- Each subtask goes in its own file `subtask-<n>.md` next to `plan.md`, not in `plan.md`. Each subtask file should
contain detailed description for implementing agent. It should have references to decisions (D1, D2, etc.) made by user.
It should also have a list of files to create / remove / modify, so it doesn't need additional context to find them.
- Subtasks are realized by Claude Haiku (`/plan-realize`), which reads only the subtask, its decisions and the files listed in it. So each subtask must:
  - List under **Read** every existing file or doc it needs, with line ranges or symbols for large files.
  - Inline the key signatures, types and names it must follow, instead of making Haiku discover them.
  - Give one **Verify** command.
  - Fit in a small context: about 10 files at most. Otherwise split it.
- If the task comes from Linear (e.g. `FIT-5`), read it with `mcp__linear-server__get_issue` and use its title and description as input. Record the identifier in the `**Linear:**` line of `plan.md`. Otherwise, leave that line out.
- After writing the plan files, if there is a Linear issue, set it to `In Progress` with `mcp__linear-server__save_issue` (`id: <identifier>`, `state: "In Progress"`). Load the Linear tools with ToolSearch first if they are deferred. If the update fails, mention it in one line, but keep the plan.
- After making a plan, model should leave the plan in the .claude/plans/<task_name>/ folder (`plan.md` + `subtask-<n>.md`) and leave for the user to read. Task name should be provided by user. Do not output additional description in chat window.