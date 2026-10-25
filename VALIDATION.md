# Validation — 2026-10-25

## Direct command subskills

- `npm run check`: 47 tests pass, including alias generation for all nine commands
  on both hosts, explicit-only metadata, help discovery, dry-run behavior and
  preservation of edited aliases, unmanaged folder content and shared task state.
- The installer generates `neef-task`, `neef-shape`, `neef-challenge`, `neef-setup`,
  `neef-next`, `neef-continue`, `neef-status`, `neef-help` and `neef-doctor` from one
  instruction template. Each reads canonical Neef instructions and forwards its
  mode, arguments and flags. No separate runtime or state is introduced.
- Fresh installed `/neef-setup` and `$neef-setup` runs read canonical instructions,
  saved full context, preserved project files and HEAD, and executed no project
  commands. Evidence: `.test-artifacts/hosts-1792905193936/`.
- Fresh `/neef-next` and `$neef-next` runs resolved the unplanned roadmap dependency,
  implemented and verified named greetings, committed owned files and saved
  completion with exhausted goals. Evidence: `.test-artifacts/hosts-1792905206570/`.
  The initial checker misclassified Claude's explanatory command mention; raw
  transcripts and behavior were rechecked with the corrected Run-directive detector.
  Both `*.postcheck.json` files pass; original results remain for traceability.
- Reproduce with `node scripts/smoke.mjs --alias --setup` or
  `node scripts/smoke.mjs --alias --next-discovery`. Other alias routes have deterministic
  generation/routing coverage; they were not each invoked in a live host session.
- A fresh reader found no routing or safety conflicts. The managed install passed
  its dry run, backed up existing files and verified all 42 installed file hashes.

## Action-oriented next

- `npm run check`: 45 tests pass. Five focused regressions cover unplanned-phase
  research, external orchestrator advice, inspectable dependencies, genuine user
  blockers and repeated no-progress invocations. Installed reference parity is
  checked for both hosts. These deterministic tests guard the helper handoff,
  state persistence and shipped instructions; model behavior is checked separately.
- Installed Claude and Codex each read the new guidance, inspected an unplanned
  GSD roadmap and the greeting implementation, resolved the name-support dependency,
  implemented and tested the required outcome, committed safely and saved completion.
  Neither forwarded the seeded GSD commands or invented a follow-up after exhausting
  the explicit goal. Evidence: `.test-artifacts/hosts-1792904642892/`.
- Both hosts preserved project files and HEAD when a private service URL was missing,
  saved an active blocker with the required user input and avoided a next-command loop.
  Evidence: `.test-artifacts/hosts-1792904777304/`.
- Both hosts rechecked a completed goal with a saved empty recommendation and stopped
  without manufacturing work or recommending another invocation.
  Evidence: `.test-artifacts/hosts-1792904765221/`.
- Reproduce those opt-in host checks with `node scripts/smoke.mjs` and respectively
  `--next-discovery`, `--next-blocked`, or `--next-exhausted`. An initial blocker
  checker mistook a negated command warning for advice; the corrected checker and
  rerun passed. Logs remain available in `.test-artifacts/hosts-1792904666905/`.
- A fresh reader found no instruction conflicts. A subsequent clarification records
  investigation state before task work and requires the Git baseline before project
  edits, avoiding unnecessary branch creation for read-only research. The focused
  contract checks were rerun after that clarification; live evidence above predates it.
- Managed installation passed its dry run, preserved state, backed up previous files
  and verified copied hashes. No Git safety implementation or state schema changed.

## External storage boundary

- `npm run check`: all 40 tests pass, including three new storage-boundary
  regressions.

- All nine mutating helper commands validate storage before input handling,
  locks, directories or branch changes. Read-only help, status and next remain
  available with project-local storage configured.
- Regression coverage checks the project root, nonexistent nested storage,
  an external junction resolving into the project, redirected state/baselines
  directories, and a valid external linked home. Rejected commands preserve
  project files, branch and HEAD.
- The existing setup-only check now lives in shared command dispatch. No new
  dependencies, skill instructions or state schema were introduced.

## Shape and challenge

- `npm run check`: 37 disposable-repository tests pass. Coverage includes agreed
  decision/pending-step preservation, first-use external recommendations without
  a development task, active-task protection, next candidates, revision conflicts,
  installation parity, and receipt-owned retirement with backup and edit protection.
- Both global host installations contain identical shape/challenge guidance and
  runtime hashes. Managed previous-mode references are backed up and removed;
  only migration code and its regression fixture retain the old filename.
- Fresh installed Claude and Codex challenge and challenge --deep runs preserved
  project files, branch and HEAD, saved grounded advice from a project with no
  task state, and stopped. A separate explicit next invocation revalidated and
  implemented the recommendation, verified behavior, committed and saved completion.
  Evidence: `.test-artifacts/shape-1792899188465/` and
  `.test-artifacts/shape-1792899269088/`.
- Clear shape invocations asked zero questions, implemented only the requested
  default greeting change, verified, committed and saved decisions on both hosts.
  Evidence: `.test-artifacts/shape-1792899230893/`.
- Final standard shape runs saved pending questions, resumed actual answers, persisted
  decisions and implemented with focused tests and safe commits. Deep discussion-only
  runs saved answers and stopped questioning without project edits on both hosts.
  Evidence: `.test-artifacts/shape-1792899446896/` and
  `.test-artifacts/shape-1792899432610/`.
- Standard shape and deep discussion-only runs are reproduced with
  `node scripts/shape-smoke.mjs` and `--deep --discussion-only`. Challenge runs use
  `--challenge` or `--deep --challenge`; clear requests use `--clear`.
- Native testing found and fixed missing first-use recommendation persistence.
  Deep Claude testing also reopened explicitly preserved behavior; the shaping
  rule now states that preservation settles that decision and deep adds depth,
  not scope. Explicit baseline:null guidance also closes an observed failure to save
  pending discussion state before beginning implementation. Initial nested Codex sandbox runs prevented disposable Git commits;
  this opt-in smoke now runs Codex without that nested sandbox, in isolated fixtures.
- The skill stays below 8,000 bytes. A fresh reader checked the mode boundary and
  decision-summary requirement. No dependency, state schema, formal specification
  or separate skill was introduced. Repository-specific Bun skill guards are not
  available in this Node-only project; its own regression suite is used instead.
- Read-only challenge is a skill instruction boundary, not an OS-enforced sandbox.
  The helper only persists recommendations; it never executes them. Host smokes
  provide observed restraint, not a universal guarantee against model violations.
  Question UI widgets and exhaustive five-question conversations were not tested;
  headless runs exercise chat fallback and real answer resumption.

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
Python 3.12, Git 2.54, Claude Code 2.1.310, Codex CLI 0.164.0. NEEF uses Node and
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
only NEEF was added. All 42 tracked legacy-source file hashes and its clean Git
status were unchanged. `D:/projects/ed-skill` remains intact.

Ambiguous `dev-flow` skills in `D:/projects/eddiesp/.agents/skills` and
`.claude/skills` were preserved. GSD and planning artifacts were preserved.

Rollback material: `~/.neef/backups/ed-migration-20261025/` contains the original
instruction files, local installed skill copies, link targets, lock and inventory.
Installation receipts separately point to their own backups. Detailed host logs
and scan evidence are in this source's ignored `.test-artifacts/` directory.
