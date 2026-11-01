# Compact status reply

Report the current task so the user can see progress, trust limits and the next action at a glance. Run helper `status` and keep its full output as evidence; this format changes only the skill reply. Status is read-only, including external state. Do not run checks, resume work or install anything.

Use a short list with these labels, normally one line each:

- **Task:** task name and progress. Retain any discussion-only boundary.
- **Git:** actual branch, short commit and whether there are uncommitted changes. Surface discrepancies with saved state; do not silently treat saved progress as current.
- **Checks:** summarize saved verification and required outcome gaps. Label it as saved evidence, not checks executed by this status request. Do not equate compilation or installation with observed behavior.
- **Blockers:** unresolved blockers, or "None recorded". Include failed, blocked or pending required outcomes even when the saved blockers field is empty.
- **Next:** one concrete advisory NEEF command and its intended result. For active work use the unfinished step; for completed work use a relevant saved primary recommendation. Recommendations are saved advice, not fresh evaluation or execution authority. When nothing useful remains, invite `$neef-shape <next goal>` in Codex or `/neef-shape <next goal>` in Claude Code.

When a plan exists, add a **Plan** line identifying unfinished phases and their dependencies. For each unfinished phase with `userInput`, name what the user must provide; when none has it, say no phase needs user input. Keep required gaps and warnings visible even if they need extra lines. Omit raw JSON, context inventories, full hashes, long logs and completed phase histories unless requested. Apply the saved explanation style without dropping these facts. Put exactly one NEEF command on the Next line. Explain any separate authorization needed in prose, without adding an alternative command or example invocation.

If no task is saved, say so instead of inventing progress or verification. If saved state is unreadable, report the error and available live Git facts without repairing it. When the next action needs user input, name that exact input and give a resume command describing what to report back. A discussion-only task requires an explicit implementation request before building; `next` alone continues the discussion.
