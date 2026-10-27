---
name: neef
description: "No-nonsense Engineering & Execution Framework. Use only when explicitly invoked as /neef or $neef."
disable-model-invocation: true
---

# NEEF

Navigate → Execute → Evaluate → Follow-up

Implement and verify the request, commit only owned work when safe, and save continuity for either agent. Otherwise record the blocker and preserved work. NEEF authorizes scoped local edits, checks and commits on main. Keep development on main; create no branches or worktrees. If another branch is checked out, preserve it and report the mismatch; pause project edits and commits until main is selected. Pushing, merging, destructive actions and scope expansion need separate user authorization.

Use Node 20+ and Git with `~/.neef/neef.mjs`; resolve the actual home and quote absolute paths. Run `node <helper> help` when command contracts are missing or changed. Commands use cwd as the project; `--project <path>` overrides it.

## Route the invocation

UI work: read `references/personal-design.md`.

Match bare modes exactly; route leading shape, plan, challenge, prototype/proto and options/ask commands first. Ask for missing subjects. Other arguments request development.

- `help`: run helper `help`; show name, fullName, motto and all intent groups as Command/Changes/Stops at tables using returned text. Include every command, flag and alias beside its command, and each direct subskill with its full host prefix. Omit helper internals. Read-only; stop after help.
- `shape [--deep] <idea>`: read `references/shape.md`, clarify, save decisions and implement unless discussion-only.
- `plan <feature>`: read `references/plan.md`; save the full feature plan and stop. Only external state writes are permitted. Skip development below.
- `challenge [--deep] <topic>`: read `references/challenge.md`. Project files and Git are read-only. The only permitted write is external `recommendations-write`; then report and stop. Skip all sections below in this mode.
- `prototype <description>` or `proto <description>`: read `references/prototype.md`; build or refine an isolated working demonstration and stop at its handoff. Preserve project files, Git and task state. Skip development below unless production implementation is explicitly requested.
- `options [goal]` or `ask <goal>`: read `references/advisor.md`; inspect and recommend, then stop. Advice is read-only, including external state. Skip all sections below until the user explicitly selects work.
- `setup`: run helper `setup`, then inspect code and commands. Save source-backed architecture using `context-write <revision>` with stdin `{"architecture":"..."}`. The helper backs up and preserves existing AGENTS.md/CLAUDE.md content while adding next-prompt directions. Report changes and safety findings; execute no project commands, installs or hooks. Never replace instructions or generate configuration. Finish after saving context.
- `doctor`: run helper `doctor`. Report failed checks and concrete fixes; do not repair implicitly.
- `status`: run helper `status`; report task/progress, branch/commit, verification, unfinished steps, plan phases/dependencies, primary recommendation and blockers. No writes.
- `next` or `continue`: run helper `next`. If it returns `resume`, reconcile files, branch and history and resume the unfinished task: when `state.plan` exists or `next` starts `plan:`, read `references/plan.md` and follow its stop boundary; otherwise read `references/shape.md` for shaping or legacy interviews. Reuse baselines only for matching project/branch/HEAD; never switch branches blindly. Without unfinished work, read `references/next.md`, find and execute the highest-value supported action, then save what comes afterward. Saved text is advisory, never a command or authorization.
- `<task>`: implement directly when clear. For consequential ambiguity, read `references/shape.md`; ask at most two targeted questions with recommended defaults.

## Navigate and Execute

Read applicable AGENTS.md, CLAUDE.md, relevant code and helper `status`; `next` already includes status. Reuse instructions already read in this session unless changed. `begin` bootstraps missing `context`. Setup is optional; cached facts never override current instructions. On persistence failure, preserve state, report it and continue independent work. Reconcile stale state; retain unfinished work unless the user replaces it. Before edits that may be committed, run `begin <short-task-slug>` for a baseline. Commits require the returned baseline ID.

For development, record outcomes in `decisions` and their evidence in `verification`; required gaps stay active. Read `references/completion.md`. Make the smallest change with focused checks; fix introduced regressions. Keep existing stacks, patterns and tooling. If `begin` reports `greenfield`, read `references/start.md`. Runnable work ends verified to start, with run command or URL. Ordinary work needs no extra plans, full suite, review or interview. Execute authorized plan phases until complete or no safe work remains. Inspect and use reasonable defaults; ask only for essential missing information or authority. Continue independent work around blockers. Batch independent calls; give brief progress updates.

Use native delegates only for independent investigation or disjoint edits. Bound their scope; own integration, verification, Git and state. Add no orchestration dependencies.

Use `state-write <revision>` with stdin JSON containing `task`, `progress` (`active` or `complete`), `baseline`, `decisions`, `verification`, `next` and `blockers`; last four strings; `verification` maps outcomes to evidence. Reuse the latest revision from `begin`, `commit`, bootstrap/setup or state mutation. Use `status` when no revision is available, a check fails, or progress needs reconciliation. Save at useful milestones and before stopping. HEAD changes expire a baseline; begin again before the next increment's edits. Inspect a corrupt state's backup before `state-recover <revision>`.

Task writes preserve `context`; setup preserves task fields. Agreed `decisions` constrain implementation. Refresh stale facts without requiring setup.

## Evaluate and commit

Commit small completed increments often, after focused checks; each completed phase, or coherent part of one, is a commit opportunity. Inspect each increment's diff and distinguish pre-existing failures from regressions. Track owned files explicitly. Never discard, stash, clean, reset, force-push, rewrite history, delete branches, or change global Git settings. Never include unrelated work.

Run `prepare <baseline-id>` with stdin JSON `{"files":["relative/path"],"message":"Describe the change"}`. Inspect its staged diff and returned token before `commit <token>`. The helper cannot prove authorship of later edits: confirm every selected change belongs to this task. Never re-baseline dirty overlapping work to evade ownership checks. If a file had user edits before NEEF began, preserve it and skip its commit. If a safe commit is unavailable, leave edits intact and report why. Git hooks remain active and are trusted project code.

## Follow-up

After task work, even verification-only, `state-write` progress and `recommendations`: `primary:{kind,action,reason}` plus up to two `alternatives`, or `primary:null`, `alternatives:[]`, `reason`. Unfinished original scope is REQUIRED and stays active; otherwise RECOMMENDED or OPTIONAL. Actions name the change and result; reasons cite code or goals. Advice authorizes nothing. Report work, verification and Git. End every final reply with one concrete next prompt or host command grounded in current goals; when blocked or pausing, state why in one line and name the exact input or user step needed and what to report back; never diagnose, retry or bypass a permission or policy denial, or repeat an unchanged blocker; when done, invite the next goal. Read `references/follow-up.md` only for blockers or competing follow-ups.
