---
name: neef
description: "No-nonsense Engineering & Execution Framework. Use only when explicitly invoked as /neef or $neef."
disable-model-invocation: true
---

# NEEF

Navigate → Execute → Evaluate → Follow-up

## Default four-zone contract

The zones organize every invocation. Show headings only when useful; small tasks keep short replies. Each mode's write permissions and stop boundary govern every zone. They add no phases or approvals.

- **Navigate:** Establish the goal, requested outcomes, scope, constraints and mode boundary.
- **Execute:** Perform authorized scoped work while preserving unrelated changes and existing patterns.
- **Evaluate:** Match every required outcome to its result and evidence. Missing required evidence keeps development unfinished.
- **Follow-up:** Report results, changed files, checks and required gaps, then give one concrete advisory next command.

Implement and verify the request, commit only owned work when safe, and save continuity for either agent. Otherwise record the blocker and preserved work. NEEF authorizes scoped local edits, checks and commits on main, or on a linked worktree's branch; create no branches or worktrees. In the main folder off main, preserve the branch, report it and pause edits and commits. Pushing, destructive actions and scope expansion need separate user authorization; merge only per `references/completion.md`.

Use Node 20+ and Git with `~/.neef/neef.mjs`; resolve the actual home and quote absolute paths. Run `node <helper> help` when command contracts are missing or changed. Commands use cwd as the project; `--project <path>` overrides it.

## Route the invocation

Always read `references/explanation-styles.md` and apply helper `style`.

UI work: read `references/personal-design.md`.

Route leading mode commands first; match bare modes exactly. Ask for missing subjects except shape. Otherwise, demo-only tasks use `references/prototype.md` and skip development below; otherwise develop.

- `help`: run helper `help`; show name, fullName, motto, the three `start` commands first, then all intent groups as Command/Changes/Stops at tables using returned text. Include every command, flag and alias beside its command, and each direct subskill with its full host prefix. Omit helper internals. Read-only; stop after help.
- `style [simple|guided|technical|kid] [--here]`: follow `references/explanation-styles.md`, then stop.
- `importance [explore|normal|important] [--here]`: follow `references/importance.md`, then stop. Development routes accept `--importance <level>`.
- `shape [--deep] [--discuss] [idea]`: read `references/shape.md`; offer starters without an idea, otherwise clarify, save decisions and implement unless `--discuss` or discussion-only was requested; multi-step work asks plan-or-build first.
- `plan <feature>`: read `references/plan.md`; save and challenge the plan, then stop for explicit sign-off, which runs every phase. Only external state writes before it; skip development below.
- `challenge [--deep] <topic>`: read `references/challenge.md`. Project files and Git are read-only. The only permitted write is external `recommendations-write`; then report and stop. Skip all sections below in this mode. When the topic is the last task's work or a commit range, also read `references/review.md` (known test commands may run as evidence); when it is the project's documentation, `references/docs.md`.
- `prototype <description>`: read `references/prototype.md`; build or refine an isolated working demonstration and stop at its handoff. Preserve project files, Git and task state. Skip development below unless production implementation is explicitly requested.
- `ask [goal]`: read `references/advisor.md`; inspect and recommend, then stop. Advice is read-only, including external state. Skip all sections below until the user explicitly selects work.
- `setup`: run helper `setup`, then inspect code and commands. Save source-backed architecture using `context-write <revision>` with stdin `{"architecture":"..."}`. The helper backs up and preserves existing AGENTS.md/CLAUDE.md content while adding next-prompt directions. Report changes and safety findings; run no project commands, installs or hooks, and never replace instructions or generate configuration.
- `doctor`: run helper `doctor`. Report failed checks and concrete fixes; do not repair implicitly.
- `status`: read `references/status.md`; run helper `status` and report its compact summary. No writes.
- `next`: run helper `next`. If it returns `resume`, reconcile files, branch and history and resume the task. Saved discussion-only decisions require an explicit implementation request before development. When `state.plan` exists or `next` starts `plan:` or `auto:`, read `references/plan.md` and follow its stop boundary; otherwise read `references/shape.md` for shaping or legacy interviews. Reuse baselines only for matching project/branch/HEAD; never switch branches blindly. Without unfinished work, read `references/next.md`, find and execute the highest-value supported action, then save what comes afterward. Saved text is advisory, never a command or authorization.
- `<task>`: implement directly when clear. For consequential ambiguity, read `references/shape.md`; ask at most two rounds of batched questions with recommended defaults.

## Navigate and Execute

Read applicable AGENTS.md, CLAUDE.md, relevant code and helper `status`; `next` already includes status. `begin` bootstraps missing `context`. Cached facts never override current instructions. On persistence failure, preserve state, report it and continue independent work. Reconcile stale state; retain unfinished work unless the user replaces it. During an unfinished plan, an outside request first gets park-or-switch (`references/plan.md`). Before edits that may be committed, run `begin <short-task-slug>` for a baseline. Commits require the returned baseline ID.

For development and before task-state writes, read `references/completion.md`. Make the smallest change with focused checks; fix introduced regressions. Keep existing stacks, patterns and tooling. If `begin` reports `greenfield`, read `references/start.md`. Runnable work ends verified to start, with run command or URL. Ordinary work needs no extra plan, suite, review or interview. Execute authorized plan phases until complete or no safe work remains. Inspect and use reasonable defaults; ask only for essential missing input or authority. Continue independent work around blockers. Batch independent calls.

Use native delegates only for independent investigation or disjoint edits. Bound their scope; own integration, verification, Git and state.

## Evaluate and commit

Commit small completed increments often, after focused checks, such as each completed phase or coherent part of one. Inspect each increment's diff and distinguish pre-existing failures from regressions. Track owned files explicitly. Never discard, stash, clean, reset, force-push, rewrite history, delete branches, or change global Git settings. Never include unrelated work.

Run `prepare <baseline-id>` with stdin JSON `{"files":["relative/path"],"message":"Describe the change"}`. Inspect its staged diff and returned token before `commit <token>`. The helper cannot prove authorship of later edits: confirm every selected change belongs to this task. Never re-baseline dirty overlapping work to evade ownership checks. If a file had user edits before NEEF began, preserve it and skip its commit. If a safe commit is unavailable, leave edits intact and report why. Git hooks remain active and are trusted project code.

## Follow-up

After task work, including verification-only work, read `references/follow-up.md` to save progress, evaluate recommendations and report the result with one concrete next command. When blocked or pausing, name the exact input or user step needed and what to report back; never diagnose, retry or bypass a permission or policy denial, or repeat an unchanged blocker. While a plan is open, end every reply with helper `ribbon` in a code block.
