# Validation — 2026-10-25

## Adaptive grilling

- 33 isolated tests pass, including same-task decision/pending-step preservation,
  clearing unrelated constraints for new tasks, stale revision rejection, and
  synchronized self-contained grilling references with unmanaged-file protection.
- Fresh Claude and Codex standard interviews inspected the published API, asked
  one concrete policy question with a recommendation, and waited without changing
  code. A real scripted answer resumed each conversation; both saved constraints,
  implemented the policy, passed focused tests, committed, and saved the next-step
  evaluation without asking for a new plan or implementation approval.
- Both hosts honored deep discussion-only across the answer and left project
  files/HEAD unchanged. One initial deep Claude run asked about out-of-scope input
  behavior; the guidance now explicitly preserves behavior outside the requested
  change. Both corrected runs ended after the relevant policy was settled.
- Explicit deep grilling of a fully specified change asked zero questions and
  implemented directly on both hosts. Ordinary clear requests did the same.
- Reproduce with `node scripts/grill-smoke.mjs`, `--deep --discussion-only`,
  `--deep --clear`, or `--automatic`. These are opt-in headless host conversations
  using the chat-question fallback, not live native question-widget UI tests.
  Numeric question limits are checked in guidance; exhaustive five-/two-question
  conversations were not run. A fresh reader found the fresh-session interview
  resume gap; `continue` now requires the integrated reference for saved interviews.
- Agreed constraints use the existing `decisions` field; mode/count/pending
  question and discussion-only boundaries use task `next`. No interview engine,
  dependency, separate skill or formal specification document was introduced.

## Proactive next-step orchestration

- 31 disposable-repository tests pass. New coverage checks mandatory atomic
  completion evaluations, REQUIRED work staying active, advisory ordering,
  changed Git state, stale/locked updates, shape limits, no-action evaluations,
  legacy state, recovery, and preservation of context and user edits.
- Fresh Claude and Codex `neef next` invocations both identified an already
  implemented primary recommendation, selected the relevant alternative from
  the README goal, implemented named greetings, passed both tests, committed
  safely, and saved a grounded no-further-action evaluation. They stopped after
  one task and printed the host's executable `neef next` command even when no
  further action was supported. `node scripts/smoke.mjs --next` reproduces this
  opt-in smoke.
- Active-task native checks exposed ambiguous redirect wording on Claude. The
  skill now explicitly stops without edits or task-state changes and prints
  `neef continue`. Both agents passed the corrected guard with their original
  commits and project files intact. Run `node scripts/smoke.mjs --next-active`.
- The skill remains under 8,000 bytes. A fresh reader checked the changed
  routing and completion contract; no safety mandate was removed. Completed
  task writes now require recommendations or an explicit grounded no-action
  reason; legacy saved state remains readable. Recommendations are never
  executed by the helper or treated as permission to expand the current task.

## Optional project setup

- 26 disposable-repository tests pass, including setup discovery, idempotent
  reruns, task/context separation, stale revisions, corrupt or locked state,
  external-only storage, linked paths, and automatic minimal bootstrap. Focused
  setup tests also pass after adding permission and working-tree diagnostics.
- Fresh Claude `/neef setup` and Codex `$neef setup` runs both saved full
  discovery and source-backed architecture to shared external state. Each left
  its fixture's branch, commit, working tree and project files unchanged. Build,
  test, lint and deployment sentinel commands were discovered and never run.
- Fresh ordinary development tasks on both agents automatically saved minimal
  context without setup, passed their focused tests, and committed safely with
  clean working trees. Run `node scripts/smoke.mjs --setup` for the opt-in setup
  smoke, or omit `--setup` for ordinary development/bootstrap smoke tests.
- The existing skill remains explicit-only. Setup adds no project files or
  dependencies. The existing state format remains readable; task writes preserve
  `context`, and setup preserves every existing task field. A fresh skill reader
  caught a stale initial-revision instruction, now corrected to reread status
  after bootstrap/setup. Repository-specific CE skill guards are unavailable in
  this Node-only project; executable utility tests and native host smokes cover
  this change instead.

Implemented and installed from this source on Windows. Local tools: Node 24,
Python 3.12, Git 2.54, Claude Code 2.1.310, Codex CLI 0.164.0. Neef uses Node and
Git only. No dependencies were added.

- Focused disposable-repository tests cover safe branches and commits, new files,
  deletion/rename, unrelated tracked/untracked work, overlapping edits, staged
  changes, stale review tokens, unusual literal paths, links, Git failures,
  persisted baselines, state reconciliation/revisions/locks/corruption/recovery,
  and isolated installation preservation. Run `npm run check`.
- Actual `/neef` Claude invocation changed a trivial greeting, passed its test,
  and committed on a task branch with a clean tree and no delegation.
- Actual `$neef` Codex invocation added an optional greeting parameter, passed
  both tests, committed on a task branch, and wrote completed shared state.
- A fresh Claude `/neef status` read that Codex task through the same isolated
  state directory and correctly reported its actual branch/HEAD and completion.
- Installed copies and shared runtime match receipt hashes. Doctor passes.
  Explicit-only metadata follows [Claude's official conventions](https://code.claude.com/docs/en/skills)
  and [OpenAI's official conventions](https://learn.chatgpt.com/docs/build-skills).
  Native task invocations were tested; implicit nonactivation is a configuration
  check. Dedicated native complex-feature delegation was not smoke-tested;
  independent inventory and utility-test work used a native subagent in this build.

## Migration

All eight named ED skills were already absent globally at live inventory; the
global Skills CLI metadata also had no entries. Removed seven actual project
skills and seven Claude junctions from `D:/projects/skill-harnass` through the
Skills CLI; `ed-feature` was absent. Its lock now has no ED entries.

Updated only `AGENTS.md`, `CLAUDE.md`, and `docs/agents/development-workflow.md`
in `D:/projects/minimal-aio`, preserving ticket authority, existing GSD artifacts
and gates, tests, model routing, managed deployment and native acceptance rules.
These migration edits remain uncommitted for review.

Independent final scan of 86,756 directories / 528,275 files under `D:/projects`
followed no directory links and found no remaining exact-eight skill installations
or active ED workflow requirements. All unrelated global skill names remained;
only Neef was added. All 42 tracked legacy-source file hashes and its clean Git
status were unchanged. `D:/projects/ed-skill` remains intact.

Ambiguous `dev-flow` skills in `D:/projects/eddiesp/.agents/skills` and
`.claude/skills` were preserved. GSD and planning artifacts were preserved.

Rollback material: `~/.neef/backups/ed-migration-20261025/` contains the original
instruction files, local installed skill copies, link targets, lock and inventory.
Installation receipts separately point to their own backups. Detailed host logs
and scan evidence are in this source's ignored `.test-artifacts/` directory.
