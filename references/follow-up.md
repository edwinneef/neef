# Evaluate what follows development

After task work, including verification-only runs, evaluate actual project state and established goals without being asked. Rank unfinished requirements, functional gaps and adjacent improvements by user value, relevance, effort and dependencies. Prefer functional progress over housekeeping. Choose one primary action and at most two useful alternatives; never invent filler. Separately, look for one bold idea: a more ambitious step the user may not have thought of, grounded in what the project is for. It is a suggestion only, never built unasked and never a substitute for the next step; leave it out when nothing real comes to mind. Preserve the read-only stop boundaries of status, help and advice modes.

Label original unfinished scope REQUIRED, keep progress active and finish it when possible; use `next` if blocked. Do not recast it as a completed task's follow-up. Use RECOMMENDED for the most valuable logical improvement and OPTIONAL for nonessential enhancements. Recommendations are advisory: generating them does not authorize implementing them in this invocation.

Persist `recommendations` with `primary:{kind,action,reason}` and `alternatives:[...]`. Each action must specify the change and intended result; its reason must cite current code or an established goal. When none is supported, save `primary:null`, `alternatives:[]` and a brief `reason`. Finish each task with `state-write`, saving progress and this evaluation atomically. For revalidation without changing task progress, use `recommendations-write <current-revision>` with that JSON. The existing task `next` field remains only an unfinished task's next step. `next` must revalidate saved recommendations even when Git has not changed.

Mark complete only when done. Report actual work, verification, relevant Git and the grounded next action. End with one copyable host-syntax NEEF command carrying the recommended action, followed by its intended result; never a bare prose prompt. A bare next command must not hide the actual recommendation. When blocked or pausing, give the reason in one line, keep preconditions in prose and name the input needed. When only the user can unblock, such as approving a host prompt, changing permissions or running a step themselves, name that exact step and end with a resume command whose placeholders list what NEEF needs back, for example `/neef check 1 result: <pass/fail>, <log path>`. Never suggest diagnosing or retrying a permission or policy denial; never bypass it or repeat an unchanged blocker. When goals are exhausted, say so and invite the next goal. Unfinished work reports REQUIRED scope and the host's `neef next` command. Static checks do not prove native invocation.

## Report layout

The final reply is one self-contained summary card. The user reads only this reply, so never point back to earlier messages: restate every answer, finding, decision, user step and blocker that still matters. Keep progress updates during the turn to one line each, at milestones only.

Task and mode reports (development, plan, challenge, ask, next) use this layout, with a blank line between sections:

- `### <status emoji> <result headline>`: one line saying what happened, using ✅ done, 🟡 partly done, 🛑 blocked or ⏸️ waiting.
- **What changed:** short bullets of the practical result, then changed files as one bullet of code-formatted paths, or "No files changed".
- **Checks:** one line per check with ✅ passed, ❌ failed or ⏭️ skipped and why; REQUIRED gaps first. Add `Decided for you:` here when shaping requires it.
- **Next:** the primary next command alone in a fenced code block, then `→ <intended result>` on the line below. Blocked reports put the exact user step above the block and the resume command inside it.
- **Also possible:** up to two saved alternatives, one bullet each as `` `<command>` — <intended result> ``. Omit the section when there are none.
- `Bold idea: <idea>` on its own last line, only when there is one.

Size is a guideline: about five lines per section, summarizing the rest. Omit nothing required. `help`, `status` and `style` keep their own formats, and one-line answers stay short. While a plan is unfinished, the latest helper `ribbon` closes the reply verbatim in a plain code block after the card: a headline saying what is happening (🚀 working, 🛑 stuck, ⏸️ waiting, ✅ complete) over a percent bar. Explanation styles change tone, never these sections.
