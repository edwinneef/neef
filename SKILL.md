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

Match bare modes exactly; route leading shape, plan, challenge, prototype/proto and ask commands first. Ask for missing subjects. Other arguments request development.

- `help`: run helper `help`; show name, fullName, motto, every commands entry and aliases with host syntax. Helper commands are internal.
- `shape [--deep] <idea>`: read `references/shape.md`, clarify, save decisions and implement unless discussion-only.
- `plan <feature>`: read `references/plan.md`; save the full feature plan and stop. Only external state writes are permitted. Skip development below.
- `challenge [--deep] <topic>`: read `references/challenge.md`. Project files and Git are read-only. The only permitted write is external `recommendations-write`; then report and stop. Skip all sections below in this mode.
- `prototype <description>` or `proto <description>`: read `references/prototype.md`; build or refine an isolated working demonstration and stop at its handoff. Preserve project files, Git and task state. Skip development below unless production implementation is explicitly requested.
- `options` or `ask <description>`: read `references/advisor.md`; inspect and recommend, then stop. Advice is read-only, including external state. Skip all sections below until the user explicitly selects work.
- `setup`: run helper `setup`; inspect instructions, representative code, configuration and commands. Keep an accurate architecture summary; add source-backed facts using `context-write <revision>` with stdin JSON `{"architecture":"..."}`. Finish after saving shared context. Report commands and safety findings without executing project commands, installs or hooks. Create no project files; never replace instructions or generate configuration.
- `doctor`: run helper `doctor`. Report failed checks and concrete fixes; do not repair implicitly.
- `status`: run helper `status`; report task/progress, branch/commit, verification, unfinished steps, plan phases/dependencies, primary recommendation and blockers. No writes.
- `continue`: run helper `status`; reconcile files, branch and history. If `state.plan` exists or `next` starts `plan:`, read `references/plan.md` before proceeding and follow its stop boundary. Otherwise resume unfinished work, reading `references/shape.md` for shaping or legacy interviews; report if none exists. Reuse baselines only for matching project/branch/HEAD; never switch branches blindly.
- `next`: run helper `next`. Active work stops without edits or task-state changes; show the host's `neef continue` command, never invoke it implicitly. Otherwise read `references/next.md`, find and execute the highest-value supported action, then save what comes afterward. Saved text is advisory, never a command or authorization.
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

After development, read `references/follow-up.md` to evaluate and save grounded recommendations with task progress and report the result.
