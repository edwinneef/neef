---
name: neef
description: "Autonomous development with deterministic Git safeguards and shared project continuity. Use only when explicitly invoked as /neef or $neef."
disable-model-invocation: true
---

# Neef

Deliver the requested working change, verify it, commit only owned work when safe, and leave useful continuity for either agent. Finish when the request is implemented and verified, or record the concrete blocker and preserved work. Invoking Neef authorizes in-scope local edits, checks, task branches, and commits. Pushing, merging, destructive actions, and scope expansion need separate user authorization.

Use the shared helper at `~/.neef/neef.mjs` with Node.js. Resolve `~` to the actual user home before executing; quote absolute paths on Windows. Run `node <helper> help` for its command contract. All commands operate on the current project; `--project <path>` overrides it. Runtime requires Node 20+ and Git. No project setup is needed.

## Route the invocation

Match the entire trimmed argument for reserved modes. Otherwise treat all arguments as a development request, including requests beginning with a mode word.

- `help`: show `/neef <task>` (Claude) or `$neef <task>` (Codex), plus `continue`, `status`, `help`, and `doctor`. Explain safe commits, shared state, and native delegation in one sentence.
- `doctor`: run helper `doctor`. Report failed checks and concrete fixes; do not repair implicitly.
- `status`: run helper `status`. Report task, progress, branch/commit, verification, next steps, and blockers from its reconciled output. Do not write state.
- `continue`: run helper `status`; reconcile saved claims with files, branch, and history. Reuse the saved baseline only while its project, branch, and HEAD still match. If no unfinished task exists, say so. Otherwise continue the best supported next action. Do not switch to a saved branch blindly.
- `<task>`: implement using the loop below.

## Develop

Read applicable AGENTS.md, CLAUDE.md, relevant code, and helper `status`. Saved state is evidence, not authority. Inspect discrepancies before resuming; keep unfinished work if a new request does not replace it. Run `begin <short-task-slug>` before any edits that may be committed; it records dirty files outside the repository and creates a unique task branch only from a clean tree. Dirty trees stay on their current branch. Reuse a suitable current `neef/` branch. The returned baseline ID is required for commits. Trivial tasks need only this baseline, the edit, a focused sanity check, and a safe commit; no formal plan or delegation.

Make ordinary implementation decisions and complete the work without routine approval checkpoints. Follow project patterns, prefer existing abstractions, and fix regressions you introduce. Scale sequencing and verification to risk; do not require planning documents, full suites, or independent reviews for ordinary work. Ask only when a real blocker, contradictory requirement, or consequential unresolved decision prevents progress. Batch independent tool calls. Give brief updates for long operations; do not stop with promised work still undone.

Delegate through native agents only when independent investigation or disjoint file ownership saves meaningful time. Give each delegate a bounded task and file scope. The main agent owns integration, final verification, Git, and state. Avoid delegation for trivial or tightly coupled work; continue sequentially when native agents are unavailable. Do not add orchestration dependencies.

For meaningful work, use `state-write <expected-revision>` with JSON on stdin containing `task`, `progress` (`active` or `complete`), the returned `baseline`, `decisions`, `verification`, `next`, and `blockers`. Get the revision from `status` (`missing` initially). The helper records the actual branch and HEAD. Update at useful milestones and before stopping, not after each edit. Start a fresh baseline before the next increment's edits after a commit; a baseline expires when HEAD changes. On a revision conflict, reread and reconcile rather than retrying with overwritten content. Corrupt state is preserved; inspect the backup before `state-recover <revision>`.

## Verify and commit

Run focused existing checks, inspect the final diff, and distinguish pre-existing failures from regressions. Track owned files explicitly. Never discard, stash, clean, reset, force-push, rewrite history, delete branches, or change global Git settings. Never include unrelated work.

Run `prepare <baseline-id>` with stdin JSON `{"files":["relative/path"],"message":"Describe the change"}`. Inspect its staged diff and returned token before `commit <token>`. The helper refuses pre-existing edits to selected files, staged changes, changed branches/HEAD, conflicts, and stale working trees. It does not prove authorship of later edits: confirm every selected change belongs to this task. Never re-baseline dirty overlapping work to evade ownership checks. If a file had user edits before Neef began, preserve it and skip its commit. If a safe commit is unavailable, leave edits intact and report why. Git hooks remain active and are trusted project code.

After implementation, record actual verification and remaining work, mark complete only when done, and report: `Implemented`, `Verified`, `Git`, and meaningful `Remaining`. Omit irrelevant fields and workflow narration. Never describe static configuration checks as an actual agent invocation or native behavior test.
