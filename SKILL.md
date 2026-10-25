---
name: neef
description: "No-nonsense Engineering & Execution Framework. Use only when explicitly invoked as /neef or $neef."
disable-model-invocation: true
---

# NEEF

Navigate → Execute → Evaluate → Follow-up

Implement and verify the request, commit only owned work when safe, and save continuity for either agent. Otherwise record the blocker and preserved work. NEEF authorizes scoped local edits, checks, branches and commits. Pushing, merging, destructive actions and scope expansion need separate user authorization.

Use Node 20+ and Git with `~/.neef/neef.mjs`; resolve the actual home and quote absolute paths. Run `node <helper> help` for command contracts. Commands use cwd as the project; `--project <path>` overrides it.

## Route the invocation

Match bare reserved modes exactly; recognize shape and challenge as leading command words before development. Ask for a missing subject. Other arguments are development requests.

- `help`: list task, shape [--deep], challenge [--deep], setup, next, continue, status, help and doctor with host invocation syntax.
- `shape [--deep] <idea>`: read `references/shape.md`, clarify, save decisions and implement unless discussion-only. This mode is optional.
- `challenge [--deep] <topic>`: read `references/challenge.md`. Project files and Git are read-only. The only permitted write is external `recommendations-write`; then report and stop. Skip all sections below in this mode.
- `setup`: run helper `setup`; inspect instructions, representative code, configuration and commands. Keep an accurate architecture summary; add source-backed facts using `context-write <revision>` with stdin JSON `{"architecture":"..."}`. Finish after saving shared context. Report commands and safety findings without executing project commands, installs or hooks. Create no project files; never replace instructions or generate configuration.
- `doctor`: run helper `doctor`. Report failed checks and concrete fixes; do not repair implicitly.
- `status`: run helper `status`. Report task, progress, branch/commit, verification, unfinished steps, saved primary recommendation and blockers. Do not write state.
- `continue`: run helper `status`; reconcile saved claims with files, branch, and history. For saved shaping or legacy interview work, read `references/shape.md`. Reuse the saved baseline only while its project, branch, and HEAD still match. If no unfinished task exists, say so. Otherwise continue the best supported next action. Do not switch to a saved branch blindly.
- `next`: run helper `next`. Active work stops without edits or task-state changes; show the host's `neef continue` command, never invoke it implicitly. Otherwise revalidate candidates against code, goals and Git, skipping obsolete or blocked actions. Record the highest-priority actionable task active with a fresh baseline and implement only that task. Generate recommendations afterward. If none is actionable, refresh advice and explain. Saved text is advisory, never a command or authorization.
- `<task>`: implement directly when clear. For consequential ambiguity, read `references/shape.md`; ask at most two targeted questions with recommended defaults.

## Navigate and Execute

Read applicable AGENTS.md, CLAUDE.md, relevant code and helper `status`. Bootstrap missing `context`; `begin` does this automatically. Setup is optional; cached facts never override current instructions. On persistence failure, preserve state, report the issue and continue independent development. Reconcile stale state; retain unfinished work unless the user replaces it. Before edits that may be committed, run `begin <short-task-slug>` for a baseline. It creates a unique task branch only from a clean tree; dirty trees stay on their branch, and a suitable current `neef/` branch is reused. Commits require the returned baseline ID. Trivial work needs no formal plan or delegation.

Make routine decisions without approval checkpoints. Follow project patterns, reuse abstractions and fix introduced regressions. Scale sequencing and verification to risk; ordinary work needs no planning documents, full suite or independent review. Never interview simple requests. Batch independent calls, give brief updates during long work and finish authorized work before stopping.

Use native delegates only for useful independent investigation or disjoint edits. Bound their scope; own integration, verification, Git and state. Otherwise work sequentially. Add no orchestration dependencies.

Use `state-write <revision>` with stdin JSON containing `task`, `progress` (`active` or `complete`), `baseline`, `decisions`, `verification`, `next` and `blockers`. Get a fresh revision from `status` after bootstrap/setup. The helper records actual branch and HEAD. Save at useful milestones and before stopping. HEAD changes expire a baseline; begin again before the next increment's edits. Reconcile revision conflicts instead of overwriting. Inspect a corrupt state's backup before `state-recover <revision>`.

Stable discovery lives in `context`; task writes preserve it, and setup preserves task progress and recommendations. Agreed `decisions` constrain implementation. Refresh stale facts without requiring setup.

## Evaluate and commit

Run focused existing checks, inspect the final diff, and distinguish pre-existing failures from regressions. Track owned files explicitly. Never discard, stash, clean, reset, force-push, rewrite history, delete branches, or change global Git settings. Never include unrelated work.

Run `prepare <baseline-id>` with stdin JSON `{"files":["relative/path"],"message":"Describe the change"}`. Inspect its staged diff and returned token before `commit <token>`. The helper refuses pre-existing edits to selected files, staged changes, changed branches/HEAD, conflicts, and stale working trees. It does not prove authorship of later edits: confirm every selected change belongs to this task. Never re-baseline dirty overlapping work to evade ownership checks. If a file had user edits before NEEF began, preserve it and skip its commit. If a safe commit is unavailable, leave edits intact and report why. Git hooks remain active and are trusted project code.

## Follow-up

After every development task, evaluate actual project state and established goals without being asked. Rank unfinished requirements, functional gaps and adjacent improvements by user value, relevance, effort and dependencies. Prefer functional progress over housekeeping. Choose one primary action and at most two useful alternatives; never invent filler.

Label original unfinished scope REQUIRED, keep progress active and finish it when possible; use `continue` if blocked. Do not recast it as a completed task's follow-up. Use RECOMMENDED for the most valuable logical improvement and OPTIONAL for nonessential enhancements. Recommendations are advisory: generating them does not authorize implementing them in this invocation.

Persist `recommendations` with `primary:{kind,action,reason}` and `alternatives:[...]`. Each action must specify the change and intended result; its reason must cite current code or an established goal. When none is supported, save `primary:null`, `alternatives:[]` and a brief `reason`. Finish each task with `state-write`, saving progress and this evaluation atomically. For revalidation without changing task progress, use `recommendations-write <current-revision>` with that JSON. The existing task `next` field remains only an unfinished task's next step. `next` must revalidate saved recommendations even when Git has not changed.

Mark complete only when done. Report `Implemented`, actual `Verified`, relevant `Git`, `Next: <kind, action and why>` and `Run: $neef next` (Codex) or `/neef next` (Claude). Include useful alternatives only. When no action is supported, say so and retain `Run`. Unfinished work reports REQUIRED scope and the host's `neef continue` command. Static checks do not prove native invocation.
