# Validation — 2026-10-27

## First-build lessons and personal motion reference

- Confirmed actual `frontend-design` use from `.test-artifacts/greenfield-1793067008284/codex.jsonl`, line 5: the completed shell read includes the installed frontend skill, exits zero, and returns its body. The generated app's existing palette/type/layout plan is consistent with using that guidance; this does not establish that every design principle was satisfied. Its shipped CSS was mostly static, with hover feedback rather than a designed motion sequence.
- Observed useful baseline: a Node-built-in app needed no dependency installation; creation, listing and saved data worked in the resumed API/restart checks and actual desktop-browser add/reload check. The initial native attempt was not an unattended pass. Concrete failures were launcher/fixture setup and a generated test's duplicate server-exit wait; the latter required a supervised guard fix. These observations do not provide a general build-speed benchmark.
- Recommended next improvement: bounded first-build smoke checks and cleanup safe to call more than once, applied to the existing verification step. Keep process handles, stop only owned servers, distinguish signal termination from a running child, and report timeout results without process-wide inspection or repeated checks. This is a proposed next task, not an implemented runtime change or another user workflow.
- Added motion/interaction guidance to `references/personal-design.md`: purposeful user-triggered feedback, responsive controls, honest progress, reduced motion and keyboard support, and proportionate implementation in the existing stack. Exact pace/style is not inferred as a universal personal preference. The existing approved live NEEF timeline is the hands-on reference; its availability and Replay/slider/host/scenario controls were confirmed in the browser, with local source/run pointers as fallback. Fresh-reader review made inspecting that example explicitly optional, preserving the fast path. Two focused installation/parity checks passed; managed backed-up installation and reference hash checks passed. No new demo, animation dependency or production-site change.

## Booking flow exercised in the browser

- Opened the preserved generated app in the ChatGPT in-app browser, using a new isolated `browser-bookings-1793068496582.json` data file. Through the actual form, entered `NEEF Browser Check 2026-10-27` and local appointment `2030-01-15T10:30`, then clicked Add booking. The success confirmation appeared and the list increased from two sample bookings to three.
- Reloaded the page through the browser. The same customer and 10:30 appointment remained visible under January 15, 2030, with three total bookings. The saved data contains exactly one matching test booking. This establishes the requested create-and-reload interaction in this desktop browser; it does not establish mobile or cross-browser coverage.
- Evidence under `.test-artifacts/greenfield-1793067008284/`: `codex.browser.result.json`, `browser-after-reload-1793068496582.png` and the isolated data file. Original failed/resumed records and earlier booking data remain intact. No app source change; fixture working tree remains clean. Test tab closed and the checker-owned server stopped after validation.

## Supervised resumption of the real greenfield check

- User explicitly authorized scoped cleanup and resumption. Approved inspection filtered Node test/server candidates, checked their process working directories against the exact preserved fixture, and found no matching processes remaining. No unrelated process was stopped. Final inspection after the checks also found zero matches.
- The preserved generated test reproduced its stall under a 20-second bound. Its cleanup waited for a second `exit` event from a child already terminated by signal: `exitCode` remains null after signal termination. The fixture test now checks `signalCode` too and has a 20-second timeout. Its booking/validation/concurrent-write/restart test then passed (1/1).
- The independent checker passed against the preserved model-generated app: served form, HTTP booking creation/listing, and persistence after restarting the server, using a new disposable data file. Both checker-owned servers stopped. Seven reviewed generated files were committed on main as `b69c4bb` using the original clean fixture baseline and scoped Git approval; fixture working tree is clean. Fixture state is complete with evidence and an optional browser-check recommendation.
- Evidence: `.test-artifacts/greenfield-1793067008284/codex.resumed.result.json` and `codex.resumed.behavior.json`. The original failed `codex.result.json` remains intact. This is a **supervised resumed pass**, including a generated-test fix and approved execution; it is not an untouched unattended native pass. Browser interaction, visual quality and a speed benchmark remain unverified.
- Source `.gitignore` and generated booking data are preserved. No global permissions or sandbox settings were changed.

## Scoped Git approval in the greenfield checker

- Codex launch arguments now explicitly select `workspace-write`, on-request approvals and automatic approval review. The prompt requests scoped escalation for the exact Git-writing NEEF `begin`/`prepare`/`commit` operation before touching protected metadata, prohibits broad prefixes and stops on refusal. No bypass/full-access mode or global configuration change. `--skip-git-repo-check` permits an empty-folder start; it does not grant filesystem access.
- Six focused checker tests passed, covering sandbox/review arguments, the scoped-approval prompt, read-only planning, parent-repository isolation and existing app/persistence/error checks. Loopback checks initially failed under the outer network-restricted sandbox, then passed with user-approved loopback execution. Syntax/diff checks passed. The checker runs directly from source; no installed skill/runtime change is needed.
- First real launch ended at CLI validation before starting a model: `--sandbox` conflicts with the `--approve-for-me` shorthand. Explicit approval configuration replaces the shorthand. Evidence: `.test-artifacts/greenfield-1793066957741/`.
- User approved the corrected Codex-only run. Scoped Git initialization succeeded on main inside the fixture. The child noticed inherited parent-repository discovery and bounded that operation; the runner now supplies `GIT_CEILING_DIRECTORIES` for all fixture processes, with a regression. The final environment guard was unit-tested; no second native run was attempted after the later denial.
- Real app-generation run remains **not passed**: `.test-artifacts/greenfield-1793067008284/codex.result.json`. The app files were created, but `node --test test.mjs` stalled. The host denied `Get-CimInstance Win32_Process` inspection with `Access denied`; the session stopped, saved active state and preserved uncommitted fixture work. Shutdown of its child test/server processes is not confirmed. The checker correctly rejected incomplete acceptance rather than running its independent app checks or claiming success. No native commit, completed flow, persistence, browser or speed acceptance is established by this run.
- Required user step before resumption: stop any remaining test/server processes from `.test-artifacts/greenfield-1793067008284/codex` and report shutdown status. Do not inspect processes again, retry the denial, broaden access or start another benchmark while this gate remains unresolved. The unrelated source `.gitignore` is unchanged.

## First-use path to a usable local app

- The user selected effortless first use and consistent results together, anchored on rapid creation from scratch. README now puts installation and a concrete booking-app request before the command overview. Existing greenfield guidance defines one complete usable flow, real local persistence where needed, a meaningful check and runnable handoff. No wizard, mandatory setup, new NEEF command or hosting requirement.
- `scripts/greenfield-smoke.mjs` defaults to a read-only scenario plan. Opt-in host runs use genuinely empty disposable folders and the same booking request with an explicit regression-only Node/HTTP contract. They check a main-branch commit, saved evidence/follow-up, a served form, successful booking creation/listing, and persistence after an actual process restart. The runner records elapsed time, stops at the first failure, and makes no browser-interaction, visual-quality or general speed claim.
- Four checker tests passed: both-host read-only plan, persisted bookings with equivalent normalized times, rejection of lost bookings, and rejection of HTTP errors containing plausible data. Three focused existing greenfield/install checks also passed. Script syntax and diff checks passed. Fresh-reader review found no prose issues; its two checker findings (HTTP status and time normalization) were fixed and tested.
- Managed dry run and backed-up install passed; all installed start-guidance hashes matched source. The main skill and `.gitignore` are unchanged.
- Native model-generated app runs were not attempted: earlier child-host sessions denied `.git/objects` writes. This change does not retry that capability, move to another route around it, or claim host greenfield/commit acceptance. A user must enable Git metadata writes for the selected host before such a run. The new checker was exercised on disposable test apps, not on a newly model-generated app. No actual app-creation timing or first-use visual/browser acceptance has been established.

## Follow-up after verification-only work

- Root cause: the main follow-up instruction said “After development”, leaving verification-only task work implicit. Main, completion and follow-up guidance now explicitly cover it and keep recommendations in the existing final `state-write`. Status/help/advice stop boundaries remain read-only. No runtime/schema change or extra save.
- The focused `--continuity` smoke now requires an active task with a saved REQUIRED recommendation whose action names the missing owner/device acceptance, in addition to its existing evidence/blocker/no-project-change assertions. The earlier Claude fixture lacked this recommendation and would fail that assertion.
- Fresh Claude and Codex regressions both passed without regrading: `.test-artifacts/hosts-1793063825942/claude.result.json` and `codex.result.json`. Both verified current default/named behavior, retained the unavailable owner result, saved REQUIRED follow-up and left project files and Git unchanged. These are verification-only checks, not native commit acceptance.
- Three focused installation/recommendation-state tests passed. Smoke syntax, diff checks and the 7,995-byte main-skill budget passed; fresh-reader review found no meaning drift. Managed install passed dry run and backed-up apply; all installed completion/follow-up reference hashes matched source. `.gitignore` is untouched.

## Continuity across longer work

- Same-task state saves now retain omitted `verification`, as they already retained decisions. Active same-task saves also retain omitted `blockers`, matching next-step preservation. Explicit empty strings clear notes; explicitly supplied values replace them. Omitted notes start empty for a different task. No schema, command, history store, size-limit or save-cadence change.
- Resume guidance in `references/completion.md` keeps settled decisions and their reasons, reconciles saved progress with current instructions/files/Git, and reuses only evidence still applicable to the current code. Cumulative notes stay concise; obsolete evidence is updated rather than blindly reused. Fresh-reader review corrected wording about omitted fields on new tasks.
- Five focused save/resume/install checks passed. `npm run check`: 73/73 passed, covering retained notes, explicit clearing/replacement, read-only resume, changed-HEAD discrepancies, task isolation and existing plan continuity. Final smoke-harness grading edits passed syntax and diff checks. Main skill remains unchanged at 7,996 bytes.
- Managed installation passed dry run, backed-up apply and verification; installed runtime and completion guidance hashes matched source. `.gitignore` is unchanged.
- Fresh Claude and Codex verification-only sessions reconciled an externally changed implementation, kept the owner's greeting wording, reran the two relevant tests, updated evidence, and retained the absent owner-device output as active. Neither session edited project files or committed. This avoids the previously denied Git-write capability; it does not establish native commit acceptance.
- Evidence: `.test-artifacts/hosts-1793063488743/`. Original `.result.json` and host transcripts are preserved. Continuity-specific regrading is recorded in `claude.regraded.json` and `codex.regraded.json`: both passed. The original grader required the literal phrase “owner ... wording”; it now also accepts “owner choice” or “owner chose”. Its unrelated recommendation assertion was removed from the continuity test and recommendation kind remains recorded separately.
- Separate observed discrepancy: Claude omitted the existing recommendation output after verification-only work, while correctly preserving progress, next step and blocker. Codex supplied a REQUIRED recommendation. This follow-up behavior is not fixed by the scoped continuity change and is not reported as a full-workflow pass.

## Lightweight completion evidence

- Development keeps requested outcomes in existing `decisions` and maps them to actual evidence in `verification`. Required gaps remain active with the missing result in `next` and its reason in `blockers`; optional checks create no gate. No new state fields, commands, approval steps or separate verification round.
- `references/completion.md` is installed for both hosts and the shared runtime. Main instructions also state the outcome/evidence rule at development and state saving. This placement matters: early Claude trials saved only test totals, so the state-save instruction was clarified. A fresh reader checked the changed paragraphs for meaning drift.
- `npm run check`: 71/71 passed, including installed-reference parity. Final prose-only clarifications preserved syntax and the skill budget (7,996 bytes); diff checks passed. Managed install passed dry run, backup and verification; copied completion references matched source hashes.
- Live Claude ordinary completion passed: default and named greeting outcomes, two passing tests, scoped commit, clean fixture and complete state. Evidence: `.test-artifacts/hosts-1793062312962/claude.result.json`.
- Live Claude missing-acceptance check passed: local code and tests were committed, while required owner-device output remained active with a REQUIRED recommendation. Evidence: `.test-artifacts/hosts-1793062245258/claude.result.json`.
- Initial Codex trials recorded outcomes and local default/named evidence, and retained missing owner acceptance correctly, but the host denied `.git/objects` writes in both disposable projects. Neither end-to-end scenario passed its commit criterion. No retry of that denied capability was made. Final clarified prose was not rerun on Codex; cross-host end-to-end acceptance remains unverified. Evidence: `.test-artifacts/hosts-1793062132844/codex.result.json` and `.test-artifacts/hosts-1793062145631/codex.result.json`.
- These live examples show observed behavior, not a guarantee that the helper independently validates evidence. Existing state schema and runtime validation are unchanged. The user's `.gitignore` is untouched.

# Earlier validation — 2026-10-25

## Smaller command surface with picker descriptions

- `continue` is now an alias of `next`: with an active task the helper still
  returns `resume`, and the route resumes it instead of redirecting. `ask` is
  an alias of `options [goal]`. `proto`, `ask`, `continue` and `doctor` keep
  working through `/neef`/`$neef` but no longer get their own subskills.
- Claude subskill frontmatter now carries each command's description instead
  of "Run Neef's X command"; descriptions live in the shared catalog.
- Reinstall retires receipt-owned old subskill files with backup and removes
  emptied folders; edited ones are refused and preserved. The direction rule's
  mode list changed, so the previous block is upgraded in place by setup.
- `npm run check`: 69/69 passed, including a new retirement test. Install dry
  run, backed-up apply and doctor passed; the picker now lists 10 described
  subskills. Setup upgraded this repository's AGENTS.md and CLAUDE.md. Host
  smoke tests (`scripts/smoke.mjs`, help and directions checks updated) were
  not run.

## Next prompt is always a NEEF command

- The managed direction rule now requires the closing suggestion to be a
  copyable NEEF command in host syntax (`/neef ...` or `$neef ...`) carrying the
  concrete request, never a bare prose prompt. Waiting replies put the needed
  answer in the command; exhausted goals suggest `neef shape <next goal>`.
- Setup upgrades an unedited earlier block in place, preserving surrounding
  bytes and line endings, backing up the original and staying idempotent on
  repeat. Hand-edited or malformed blocks are still refused.
- `npm run check`: 68/68 passed, including the new legacy-upgrade test.
  Managed install passed dry run, backed-up apply and doctor; rerunning setup
  upgraded this repository's AGENTS.md and CLAUDE.md. Fresh host smoke tests
  of the new wording were not run.

## Fast start for new projects

- `begin` initializes Git on `main` only in a completely empty folder without
  Git, overriding `init.defaultBranch`, and reports `gitInitialized`. An empty
  repository reports `greenfield`. Non-empty non-Git folders are left alone
  with a note to ask before `git init`; existing repositories are never
  reinitialized and report neither flag.
- `greenfield` loads the new `references/start.md`: choose a mainstream stack
  without asking, commit the first working version, hand it over running.
  SKILL.md adds the existing-project rule (keep stack, patterns and tooling)
  and ends runnable work verified to start with its run command or URL. Two
  redundant sentences were trimmed to stay under the 8000-byte budget (7966).
- Focused tests cover empty-folder init through the first commit, user-created
  empty repositories, existing repositories and non-empty non-Git folders.
  Installed guidance and the installer allowlist include `start.md`.
  `npm run check`: 67/67 passed. Fresh host smoke tests were not run for this
  change.

## Persistent next-prompt directions

- Explicit setup now adds a managed direction block to root AGENTS.md and
  CLAUDE.md. Existing bytes remain intact, originals have external backups and
  restore metadata, and writes are verified. Matching blocks are idempotent;
  malformed or edited blocks and linked files are refused before either write.
  Minimal bootstrap still creates no project instruction files.
- The rule covers ordinary project replies as well as NEEF workflows: one
  concrete suggested prompt or host command, the needed input when waiting,
  or an honest invitation for the next goal when work is exhausted. Suggestions
  remain advisory and NEEF execution remains explicit-only.
- Focused setup checks passed, including task-state and index preservation,
  original CRLF/BOM bytes, backups, repeat setup and unsafe targets. The first
  full check caught the 8000-byte skill budget; touched routing prose was
  shortened while preserving its command coverage.
- Fresh Claude and Codex ordinary-prompt checks both supplied concrete next
  prompts without changing files, Git or shared state. Evidence:
  `.test-artifacts/hosts-1792947487324/`; reproduce with
  `node scripts/smoke.mjs --directions`. Managed install passed dry run,
  backup/copy verification and doctor; setup enabled the rule in this project.
- This repository has no Bun skill-guard command or portable authoring-guide
  file; its Node checks and native host fixtures cover the changed contracts.
- Final `npm run check`: 64/64 passed. After adding backup-link protection,
  all 11 focused setup/installation checks passed, including the new case.
  Evidence: `.test-artifacts/next-prompt-check-final.log` and
  `.test-artifacts/next-prompt-focused-final.log`. Fresh setup aliases passed
  on both hosts without project-command execution or Git commits:
  `.test-artifacts/hosts-1792947528064/`.

## Codex post-commit task-alias check

- Fresh installed `$neef-task` smoke passed: default and named greetings,
  two focused tests, owned fixture commit, clean working tree and completed
  external state with no remaining recommendation.
- The closing `state-write` succeeded on its first attempt using the revision
  returned by `commit`; no state-field schema repair, post-commit `status`
  re-read or follow-up reference read occurred.
- The first `prepare` failed because the sandbox could not write Git objects
  (and could not access the global ignore file). Codex reconciled with `status`
  and retried successfully with the required access. This sample establishes
  behavior, not an end-to-end speedup.
- Evidence: `.test-artifacts/hosts-1792946797189/`. Reproduce with
  `node scripts/smoke.mjs --alias --codex-only`.

## Shorter post-commit tail

- `prepare` and `commit` return the current state revision, so the closing
  `state-write` needs no `status` re-read. SKILL.md now carries the essential
  follow-up rule inline; `references/follow-up.md` stays installed for
  blockers or competing follow-ups. Descriptive helper internals were trimmed
  to keep SKILL.md at 7968 of its 8000-byte budget.
- `npm run check`: all 62 tests passed, including revision assertions on
  `prepare` and `commit`. Evidence: `.test-artifacts/post-commit-tail-check.log`.
- Fresh installed Claude task-alias smoke (same greeting task as the earlier
  48.7s / 16-turn run): 23.9s / 7 turns, one first-try `state-write`, no
  `status` re-read and no follow-up reference read. One sample; Codex not rerun.
  Evidence: `.test-artifacts/hosts-1792946649095/`.

## Self-describing state-write errors

- `state-write` now names each malformed field and its expected type, for
  example `blockers must be a string (got array)`, before taking the lock.
  Null optional fields remain treated as omitted. SKILL.md and the help
  contract state that decisions, verification, next and blockers are strings.
- Motivation: smoke artifacts held 34 bare `Invalid state fields` failures;
  28 of 69 state-writing runs hit at least one and repaired by reading source.
- `npm run check`: all 62 tests passed, with new array-field coverage. A first
  run caught SKILL.md exceeding its 8000-byte budget; the wording was shortened.
- Evidence: `.test-artifacts/state-field-errors-check.log`.

## Reuse helper revisions and session instructions

- `begin` now returns the bootstrap state revision for Git and non-Git projects,
  including when context already exists. Failed bootstrap still permits work
  with a warning and omits the unavailable revision.
- Guidance reuses returned revisions and unchanged session instructions, avoids
  a second status read after `next`, and loads help when contracts need discovery.
  Revision conflicts still require reconciliation; Git mutation checks remain.
- `npm run check`: all 62 tests passed. New coverage writes state directly from
  `begin`, reuses existing context and rejects intervening updates for Git and
  non-Git projects. The first sandboxed attempt could not write disposable Git
  fixture configuration; the run with required filesystem access passed.
- Managed installation passed its dry run, backups and copied-file hash checks;
  installed doctor passed. Fresh Claude and Codex task-alias smoke tests both
  passed, including focused verification, owned commits and completed state.
  Codex initially supplied arrays for string state fields, then inspected the
  schema and recovered. This run does not establish an end-to-end speedup.
- Evidence: `.test-artifacts/round-trips-check.log` and
  `.test-artifacts/hosts-1792934329122/`. A fresh reader checked the three changed
  instruction paragraphs; one revision-conflict sentence was clarified.

## Help grouped by intent

- Existing help now groups commands into choosing work, exploring before
  building, building/continuing, and understanding the project/installation.
  Each command carries Changes and Stops at text. No UI or dependency added.
- One built-in command catalog supplies the existing flat command list, direct
  alias discovery and grouped behavior metadata. Existing ordering, arguments,
  `--deep`, prototype/proto equivalence and installer contracts remain intact.
  The canonical help route renders compact tables using the current host syntax
  and stops without task or project writes; helper commands stay internal.
- `npm run check`: all 59 tests passed. Four focused help/alias/prompt-budget
  checks passed as well. New coverage checks complete nonduplicated catalog and
  alias membership, material write/stop boundaries, missing-state read-only
  behavior, and preservation of active progress, advice and dirty files.
- Native installed help passed on Claude and Codex. Both displayed all four
  intent groups, Changes/Stops columns, flags, prototype/proto and full direct
  aliases. Source files, Git and seeded active task state stayed unchanged.
  The initial Claude run shortened repeated alias prefixes; the help instruction
  now explicitly requires the full host prefix on every alias, and its retry
  passed. Codex passed the initial run.
- Managed installation passed its dry run, receipt checks, rollback backup and
  copied-file hash verification. Installed doctor reports no failed checks.
- Evidence: `.test-artifacts/hosts-1792920005218/` (Codex pass and initial Claude
  output), `.test-artifacts/hosts-1792920120639/` (Claude retry). Reproduce with
  `node scripts/smoke.mjs --help --alias`; use `--codex-only` or `--claude-only`
  to limit the host. Native checks are opt-in and skip project test execution.

## Isolated prototype workflow

- Added `prototype <description>` and equivalent `proto` routes and explicit
  aliases on Claude and Codex, using one shared prototype reference. The workflow
  builds runnable visual or nonvisual demonstrations, explores alternatives when
  useful, refines the same demo through ordinary follow-ups, and records a
  selected concept and production acceptance criteria before a NEEF handoff.
- The internal `prototype-workspace [slug]` helper lists recent per-project demos
  without writing, or allocates a unique external scratch directory. No new
  dependencies or task-state schema. It rejects traversal, invalid slugs,
  project-local storage and linked prototype directories; discovery ignores
  linked demo entries. Prototypes preserve active production tasks and Git.
- `npm run check`: all 57 tests passed. Eight focused scratch/alias/installation/
  prompt-budget/storage tests also passed. Coverage includes missing-state
  read-only listing, distinct workspaces for repeated slugs, separate projects,
  active/dirty work preservation, unsafe storage, alias parity, receipt backups,
  managed-edit refusal and preservation of demos across reinstallations.
- Fresh installed sessions on both hosts passed four workflow turns: two
  interactive HTML concepts; a plain-language compactness refinement in the same
  workspace; approval of concept 2 with a concrete production handoff and no
  promotion; and a new nonvisual Node search comparison invoked through `proto`.
  Both algorithms returned index 2 for target 6 in the synthetic sorted array.
  Every turn preserved source files, Git and the complete production task state.
- Both hosts' `ask` prototype advice now recommends the installed route and
  stops without allocating a workspace or changing project/state files.
- Initial Claude visual work skipped checks when a browser was unavailable.
  Guidance now requires a lightweight script syntax check even without preview,
  with check files in scratch or inline scripts checked in memory via vm.Script.
  The final headless Claude check passed syntax and exercised selection/filter/
  concept-switch logic with a small DOM stub, keeping its check file in scratch.
  Codex independently exercised its generated demo with a DOM simulation.
- Visual rendering and actual browser input remain unverified. The local-file
  preview was blocked by browser URL policy; native host browser access was also
  unavailable or denied. Syntax/DOM simulations are not visual proof.
- Installed globally through the managed installer after a safe dry run, with
  rollback backups and copied-file hash verification. Prototype artifacts and
  existing task state remain outside the install receipt and are preserved.
- Evidence: `.test-artifacts/prototypes-1792917659468/` (both full workflows),
  `prototypes-1792918138421/` (final headless syntax/scratch check), and
  `.test-artifacts/advisors-1792917720606/` (both advice-only routes). Reproduce
  with `node scripts/prototype-smoke.mjs` (`--claude`/`--codex`, `--ui-only`) and
  `node scripts/advisor-smoke.mjs --prototype`. Ordinary tests do not launch hosts.

## Options and ask advisors

- Added `options` and `ask <description>` plus generated explicit aliases for
  Claude and Codex. Both share `references/advisor.md`, existing status/help and
  project evidence. Advice changes neither project/Git nor external state.
  Explicit numbered selection follows the selected canonical route in the chat.
- `npm run check`: all 53 tests passed. An initial sandboxed run could not create
  disposable Git/config and installer files; the same suite passed with the
  required filesystem access. Three focused advisor/installation/prompt-budget
  checks passed again after the guidance fix. The entrypoint remains below its
  existing 8,000-byte cap; follow-up instructions moved verbatim into a required
  reference. A fresh prose reader found no meaning drift or readability issues.
  This repository uses Node tests; the external authoring guide's Bun guard
  command and guide file are not present here.
- Fresh installed-host runs on both hosts returned ranked, source-backed options
  without executing project commands or creating state. Imperative `ask` goals
  for matching active work recommended `continue` without executing it. Missing
  prototype support was stated explicitly, with a discussion-only Shape fallback.
- Resumed sessions on both hosts accepted the bare reply `1`, implemented the
  chosen optional-name feature, passed default/named behavior checks and focused
  tests, saved completed state and recommendations, and read the relocated
  follow-up reference. Unrelated untracked `personal.txt` was preserved.
- The exhausted-project case exposed Claude reviving committed goals that the
  current working-tree README explicitly removed. Current requirements now take
  precedence over history/cache, and ranking has an explicit no-work stop.
  The fixture retains that uncommitted scope change as a regression case.
- Managed global installation passed its dry run, preserved receipts and task
  state, created rollback backups, and verified every installed hash. `doctor`
  passed. Prototype/proto remains design-only in README, absent from command
  discovery and the installed alias list.
- Evidence: `.test-artifacts/advisors-1792916561979/` (initial advice and captured
  failure), `advisors-1792916733002/` (both resumed selections),
  `advisors-1792916897322/` (Codex prototype fallback),
  `advisors-1792916944292/` (Claude no-work fix), and
  `advisors-1792917025162/` (final cross-host no-menu checks). Reproduce with
  `node scripts/advisor-smoke.mjs`, `--selection`, `--exhausted`, or `--prototype`;
  `--claude` and `--codex` limit the host. Ordinary `npm test` never runs these
  native checks. Advice checks compare project contents and full helper status
  before/after; no-work checks reject even a one-item numbered menu.

## Adaptive plan mode

- Added `plan <feature>` and the explicit `neef-plan` alias on both hosts. Planning
  saves the whole feature in existing external state and stops; each `continue`
  executes at most one ready phase. No project planning files or dependencies.
- The full 51-test run passed 50 cases; its sole failure was the entrypoint's
  8,000-byte guard. Shortened the touched routing text and passed that focused
  check. All four new roadmap tests also pass after the final schema update.
  Coverage includes separate phase commits, acceptance evidence, dependency
  cycles and missing ids, one active phase, premature completion, state limits,
  setup/recovery/advice preservation, stale revisions and managed installation.
- Installed with managed backups and receipt hash verification. Explicit
  `baseline:null` now clears a same-task baseline after a phase commit, while
  omission retains it for interrupted work.
- Native installed alias checks pass for small and large features on both hosts.
  Planning preserves branch, HEAD and files. Claude sizes the architectural
  fixture as four phases, Codex as three; each implements storage only on the
  first continuation, preserves acceptance evidence and leaves all later phases
  pending. `next` preserves the active roadmap and directs the caller to
  `continue`. Fresh sessions resume from external state.
- Evidence is under `.test-artifacts/plan-1792915222046/`; reproduce with
  `node scripts/plan-smoke.mjs` (optional `--claude`/`--codex`, `--small`/`--large`).
  The initial Claude smoke exposed a skipped plan reference and retained expired
  baseline; the continuation pointer was tightened and the rerun passes.
- The bundled skill creator's `quick_validate.py` rejects the pre-existing
  `disable-model-invocation` frontmatter field. Preserved explicit-only metadata;
  installer tests and actual host invocations validate the installed aliases.
  Pending-question and interrupted-phase resumption have state coverage but were
  not exercised as separate native conversations.

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

## Permission and policy denials

- Source: a live thread where automatic approval review refused an input-capable
  session ("blocked by policy"). NEEF suggested diagnosing the rejection, repeated
  it twice without progress, and an earlier pause gave no reason. Causes: `next.md`
  asked for investigation of any repeated no-progress recommendation, the
  next-prompt rule forced user-only steps into NEEF commands, and no guidance
  separated host denials from missing information.
- `npm run check`: 71 tests pass. New contract checks cover the denial guidance in
  SKILL.md, follow-up, next and plan references, plus the setup upgrade from the
  previous NEEF-command direction block to the rule with user-unblock guidance.
- `node scripts/smoke.mjs --next-denied` seeds an active task whose saved blocker is
  a policy denial of `node launch.mjs --input` and whose saved advice is "diagnose
  the rejection"; running `launch.mjs` leaves a marker that counts as a retry.
  First run: Claude passed; Codex did not retry or diagnose but omitted the exact
  step, because the trimmed SKILL.md rule no longer named it, and the checker
  misread a skill file path as a command. After restoring "name the exact input or
  user step needed and what to report back" in SKILL.md and matching only
  commands, both hosts passed: no retry, no diagnose or retry suggestion, the
  denial and `node launch.mjs --input` named, a resume command with result
  placeholders, task still active with the blocker saved.
  Evidence: `.test-artifacts/hosts-1793002591442/` (first run: `hosts-1793002402743/`).
- Managed installation passed its dry run, backed up the previous files and
  installed copies identical to source.

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
