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

Match bare modes exactly; route leading shape, plan, challenge, prototype/proto and ask commands first. Ask for missing subjects. Other arguments request development.

- `help`: run helper `help`; show name, fullName and motto, then its intent groups as compact tables: Command, Changes, Stops at. Cover every command, flags and aliases using this host's syntax, including proto beside prototype and the direct subskills. Write the full host prefix on every alias. Use the returned changes/stops text. Helper commands stay internal. Read-only; stop after showing help.
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

Read applicable AGENTS.md, CLAUDE.md, relevant code and helper `status`; `next` already includes status. Reuse instructions already read in this session unless changed. Bootstrap missing `context`; `begin` does this automatically. Setup is optional; cached facts never override current instructions. On persistence failure, preserve state, report the issue and continue independent development. Reconcile stale state; retain unfinished work unless the user replaces it. Before edits that may be committed, run `begin <short-task-slug>` for a baseline. It preserves the current branch and working tree. Commits require the returned baseline ID. Trivial work needs no formal plan or delegation.

Optimize for fast development with the smallest working change and focused checks. Make routine decisions without approval checkpoints. Follow project patterns, reuse abstractions and fix introduced regressions. Ordinary work needs no extra planning documents, full suite or independent review. Never interview simple requests. For authorized plans, execute every ready phase until the requested outcome is complete or no further safe progress is possible. Resolve technical questions through inspection and reasonable defaults; ask only for essential missing user information or authority. Continue independent work when one part is blocked. Batch independent calls and give brief updates during long work.

Use native delegates only for useful independent investigation or disjoint edits. Bound their scope; own integration, verification, Git and state. Otherwise work sequentially. Add no orchestration dependencies.

Use `state-write <revision>` with stdin JSON containing `task`, `progress` (`active` or `complete`), `baseline`, `decisions`, `verification`, `next` and `blockers`; the last four are strings, not arrays. Reuse the latest revision returned by `begin`, bootstrap/setup or a state mutation. Use `status` when no revision is available, a revision check fails, or current progress needs reconciliation. The helper checks revisions and reads actual Git state at mutation boundaries. Save at useful milestones and before stopping. HEAD changes expire a baseline; begin again before the next increment's edits. Inspect a corrupt state's backup before `state-recover <revision>`.

Stable discovery lives in `context`; task writes preserve it, and setup preserves task progress and recommendations. Agreed `decisions` constrain implementation. Refresh stale facts without requiring setup.

## Evaluate and commit

Commit small completed increments often, after focused checks, rather than waiting for the whole task or roadmap. Each completed phase is a commit opportunity; larger phases can have several coherent commits. Inspect each increment's diff and distinguish pre-existing failures from regressions. Track owned files explicitly. Never discard, stash, clean, reset, force-push, rewrite history, delete branches, or change global Git settings. Never include unrelated work.

Run `prepare <baseline-id>` with stdin JSON `{"files":["relative/path"],"message":"Describe the change"}`. Inspect its staged diff and returned token before `commit <token>`. The helper refuses pre-existing edits to selected files, staged changes, changed branches/HEAD, conflicts, and stale working trees. It does not prove authorship of later edits: confirm every selected change belongs to this task. Never re-baseline dirty overlapping work to evade ownership checks. If a file had user edits before NEEF began, preserve it and skip its commit. If a safe commit is unavailable, leave edits intact and report why. Git hooks remain active and are trusted project code.

## Follow-up

After development, read `references/follow-up.md` to evaluate and save grounded recommendations with task progress and report the result.
