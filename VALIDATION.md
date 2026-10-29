# Validation

Current evidence for NEEF and how to reproduce it. The dated history of earlier runs (2026-10-25 to 2026-10-28) is in Git: `git show 8332959:VALIDATION.md`.

## Deterministic checks

`npm run check` syntax-checks the helper and installer, then runs `node --test tests/*.test.mjs` with isolated `NEEF_HOME`, `NEEF_USER_HOME` and Git configuration. It covers:

- State: revisions, locks, corruption recovery, the 8 KiB / 40-line budget, outcome records, plans, recommendations and continuity across tasks.
- Git safety: main-only `begin`, baselines, `prepare` refusals, reviewed-token expiry, a failing pre-commit hook after the index lock, reviewed-diff drift, linked paths and submodules.
- Storage boundaries: state, baselines, preferences, prototypes and backups stay outside the project; baseline pruning keeps recent and referenced files.
- Setup: discovery limits, managed AGENTS.md/CLAUDE.md blocks, backups, upgrades and rollback (rollback test runs on Windows only).
- Installation: dry run, receipt hashes, backups, retirement of owned files, refusal of edited or unmanaged files, every reference installed for both hosts, and `doctor`.
- Host launchers: Codex sandbox and approval arguments, Windows native executables, bounded timeouts and owned-process cleanup.

These tests prove helper and installer behaviour. They do not prove that a fresh agent session loads or follows the instructions.

## Live host smoke runs (opt-in)

Each runner uses the installed helper and refuses to start when `~/.neef/neef.mjs` differs from `scripts/neef.mjs`; run `node scripts/install.mjs --apply` first. Runs create disposable fixtures under `.test-artifacts/` (gitignored) and launch real Claude Code and Codex sessions.

| Runner | Scenarios (flags) |
| --- | --- |
| `scripts/smoke.mjs` | ordinary task (default), `--setup`, `--directions`, `--help`, `--alias`, `--next`, `--next-active`, `--next-discovery`, `--next-blocked`, `--next-exhausted`, `--next-denied`, `--completion`, `--completion-open`, `--continuity`; `--claude-only` / `--codex-only` |
| `scripts/shape-smoke.mjs` | `--starters`, `--deep`, `--discuss`, `--discussion-only`, `--automatic`, `--auto`, `--auto-change`, `--clear`, `--challenge` |
| `scripts/plan-smoke.mjs` | `--small`, `--large`; `--claude` / `--codex` |
| `scripts/advisor-smoke.mjs` | options (default), `--selection`, `--exhausted`, `--prototype`; `--claude` / `--codex` |
| `scripts/prototype-smoke.mjs` | UI demo, refinement, handoff and algorithm demo (default), `--ui-only`; `--claude` / `--codex` |
| `scripts/greenfield-smoke.mjs` | `--plan` (read-only, default), `--run` empty-folder booking app; `--claude-only` / `--codex-only` |

Codex keeps its workspace sandbox and on-request approval review; Git-writing helper calls request scoped approval. Host turns time out after ten minutes (`NEEF_SMOKE_TIMEOUT_MS`).

## Known gaps

- Codex end-to-end commits are unverified: earlier Codex runs were denied `.git/objects` writes in disposable projects. These runs were not retried.
- The greenfield booking app passed only as a supervised, resumed run (a generated test needed a fix). There is no unattended native pass and no speed benchmark.
- Browser interaction was checked once, in one desktop browser. Mobile and cross-browser behaviour are unverified.
- Evidence in task state is reported by the agent. The helper checks that the records are consistent, not that the behaviour works.
