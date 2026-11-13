# NEEF

**No-nonsense Engineering & Execution Framework**

Navigate → Execute → Evaluate → Follow-up

**Build as fast as you can think of it. NEEF keeps every step safe to undo.** Open an empty folder and describe what you want: `/neef build a booking page for my salon`. NEEF creates Git on `main`, picks a sensible stack without asking, builds and verifies the first working version, commits it, and hands it over running with its local URL or run command. In existing projects it moves just as fast while keeping their stack, patterns and tooling: smallest working change, focused checks, frequent safe commits and one concrete next step. No per-project setup is required. The goal NEEF is measured against is in [the vision](docs/vision.md).

## Three commands to start

- `neef <what you want>` builds or changes something.
- `neef next` continues, or does the most useful next thing.
- `neef ask <goal>` writes the right command when you are not sure how to ask.

Type `/neef …` in Claude Code or `$neef …` in Codex. Four more are there when you need them: `shape` for a rough idea, `plan` for bigger work, `prototype` to try something in a scratch folder, and `challenge` for an honest review that changes nothing, including of the last finished work or the documentation. The rest are settings and diagnostics; [every mode](#how-neef-works) is listed below.

## Get your first app running

You need Claude Code or Codex, Node.js 20+ and Git. Install once from a local copy of the NEEF source:

```powershell
node scripts/install.mjs
node scripts/install.mjs --apply
```

The first command is a dry run and ends with `DRY RUN: nothing was installed`; only `--apply` writes files and ends with `INSTALLED`.

The first command previews the installation (add `--dry-run` for a readable list of `create`, `update`, `unchanged` or `remove` per path). The second installs for both hosts, backs up managed files and preserves unrelated configuration. Updates from a Git checkout list what changed since your last install under `changes`. When an update leaves projects with older NEEF instructions, the result lists them under `outdatedProjects`; run `/neef projects --update` (or `$neef projects --update` in Codex) to upgrade them all at once, with backups. Restart your agent session to discover NEEF. You do not need to learn the command menu or run project setup.

Open a new empty folder in your agent and describe a useful first version:

| Host | First request |
| --- | --- |
| Codex | `$neef build a local booking app for my salon. Let me add a customer booking, see the bookings, and keep them after restarting the app.` |
| Claude Code | `/neef build a local booking app for my salon. Let me add a customer booking, see the bookings, and keep them after restarting the app.` |

Expect a clear interface with that complete flow, saved local data, checks of the requested behavior, a scoped commit and a local URL or exact run command. Stack selection and project dependencies are NEEF's job. A first version uses sample data and local storage; payments, accounts and public hosting are separate requests.

Once it works, describe the next change normally, such as “let me cancel a booking.” To resume unfinished work in another session, use `$neef next` or `/neef next`. NEEF reads its saved decisions and checks them against the current project before continuing. Real build time depends on the request, model and environment; the landing-page timeline is illustrative.

## In a project you already have

NEEF works on the branch you are on and names it in its report when it is not main. It creates no branches, never switches branches and never pushes. Files you had already changed stay yours: NEEF preserves them and keeps them out of its commits. Its notes live outside the project under `~/.neef`; the project gets only the commits for the work you asked for, plus a short managed block in `AGENTS.md` and `CLAUDE.md` if you run `neef setup`. A detached HEAD is refused until you select a branch.

## How NEEF compares

Hosted app builders such as Lovable, Bolt.new and Replit Agent also turn a prompt into an app, but your code lives on their platform. NEEF runs on your machine, in the Claude Code or Codex you already use, and also works in existing projects with their current stack. Workflow frameworks such as Spec Kit, BMAD Method and Superpowers add structure to those same agents, but most of them want a spec, a plan or role documents before any code is written. NEEF goes from a request straight to verified, committed work, and planning is optional. For details and sources, see the [comparison](docs/competitors.md).

## Explanation style

Simple is the initial default: short, everyday language with exact actions when you need to do something. Guided adds numbered steps and brief reasons. Technical explains what changed, where, why and how it was checked. Kid explains like you are 12, with everyday words and an example for each new idea.

Use `$neef style guided` in Codex or `/neef style guided` in Claude Code to save a default across all projects. Replace `guided` with `simple`, `technical` or `kid`; omit the name to see the current setting. Add `--here` (for example `/neef style kid --here`) to set a style for the current project only; `/neef style clear --here` returns it to the global default. Add "use Technical for this task" to a request for a temporary override. Styles affect explanations only, including questions and progress updates. Every style retains the instructions and evidence you need.

The preference lives in `~/.neef/preferences.json` (or `NEEF_HOME`), separate from project task state. Changing it preserves the previous file as `.bak`; reinstalling NEEF preserves the preference. Start a fresh agent session after installing updated skill instructions.

## Importance

Importance sets how much testing and independent checking a task gets, so exploring stays light and risky work gets scrutiny. `explore` writes no new tests and checks by running the thing. `normal` (the default) adds focused tests only for behavior you have settled. `important` adds tests per required outcome and has a fresh second agent re-verify them before completion. It never changes permissions or required evidence.

Set a default with `/neef importance important` (`$neef importance …` in Codex), add `--here` for this project only, or `/neef importance clear --here` to remove the override. Give one task its own level with `--importance explore`. A task's level is saved in its state, so `next` resumes at it. NEEF may suggest a higher level for risky work (auth, deletion, migrations, shared APIs) and asks first; it never lowers the level itself. See [importance](references/importance.md).

## How NEEF works

- **Navigate:** Understand the task, codebase, context and relevant decisions.
- **Execute:** Implement autonomously with minimal overhead.
- **Evaluate:** Verify proportionately and identify meaningful improvements.
- **Follow-up:** Recommend the next valuable action and maintain momentum.

The four zones form the default prompt contract. Their rules apply throughout the work; headings appear only when useful, and small tasks keep short replies. User prompts can stay in natural language. They are not mandatory phases or extra approval steps, and every mode keeps its existing write permissions and stop boundary. The command name remains `neef`.

One explicit skill for autonomous development in Claude Code (`/neef`) and Codex (`$neef`). The modes are listed below. Node 20+ and Git are required. No dependencies, daemon, or mandatory project setup.

Invoke a mode as `/neef <mode>` in Claude Code or `$neef <mode>` in Codex. `help` shows the three starting commands first, then the same list grouped by intent. Each guide holds the full rules for its mode.

<!-- modes:start -->
| Mode | Changes | Stops at | Guide |
| --- | --- | --- | --- |
| `<task>` | Project files and task state; safe local commits; Git for an empty folder | Scoped work verified and runnable, or a concrete blocker recorded | [completion](references/completion.md) |
| `shape [--deep] [--discuss] [idea]` | Without an idea: read-only starters; --discuss: external decisions only; otherwise task decisions then project files | Three starter ideas and a choice, or clarified and implemented, unless discussion-only (--discuss) | [shape](references/shape.md) |
| `plan <feature>` | Task decisions and plan first (project/Git unchanged); project files and safe local commits only after one explicit sign-off | Questions asked, challenged plan saved and shown for sign-off; approval runs every phase until complete or blocked | [plan](references/plan.md) |
| `challenge [--deep] <topic>` | May save external recommendations and run known tests; project/Git unchanged | Evidence-based critique and improvements, also for the last task's commits or the project's .md files; no implementation | [challenge](references/challenge.md) |
| `prototype <description>` | External scratch demo and README; source/Git/task state unchanged | Working demo and handoff; no automatic production promotion | [prototype](references/prototype.md) |
| `ask [goal]` | Nothing during advice (read-only) | Ranked choices, or the best-fit command for a goal with the full request written inside it; never invokes it. A later explicit selection can execute its action | [advisor](references/advisor.md) |
| `setup` | External context and managed AGENTS.md/CLAUDE.md directions | Context and next-prompt rule saved; no project commands run | — |
| `next` | Project files and task state; frequent safe local commits | Unfinished task resumed until complete or blocked; otherwise one useful follow-up done | [next](references/next.md) |
| `status` | Nothing (read-only) | Progress, Git, verification and blockers reported | [status](references/status.md) |
| `help` | Nothing (read-only) | Grouped command guide and aliases displayed | — |
| `style [simple\|guided\|technical\|kid] [--here]` | With a name: global explanation preference, or this project only with --here; without: read-only | Current style shown or default saved; no project task started | [explanation-styles](references/explanation-styles.md) |
| `importance [explore\|normal\|important] [--here]` | With a level: global default for how much testing and cross-checking tasks get, or this project only with --here; without: read-only | Current level shown or default saved; no project task started | [importance](references/importance.md) |
| `projects [--update \| --forget <path>]` | Nothing; --update upgrades outdated, unedited AGENTS.md/CLAUDE.md directions in every listed project, with backups, and commits them in Git projects on a branch where those files had no uncommitted changes; --forget moves the saved state of a project whose folder is gone into a backup | Every project NEEF has used, its last use and instruction version reported | — |
| `doctor` | Nothing; no implicit repairs | Installation health checks and concrete fixes reported | — |
<!-- modes:end -->

Each main mode also has a directly invokable subskill with its description shown in the skill picker: `$neef-task`, `$neef-shape`, `$neef-plan`, `$neef-challenge`, `$neef-prototype`, `$neef-ask`, `$neef-setup`, `$neef-next`, `$neef-status` and `$neef-help`. Claude uses the matching `/neef-…` commands. The rare `style`, `importance` and `doctor` work only through `$neef`/`/neef`. The former modes and aliases `review`, `docs`, `merge`, `options`, `auto`, `proto`, `prompt` and `continue` are no longer user-facing; `review`, `docs` and `merge` remain as internal runtime helpers that `challenge` and the worktree merge call; reinstalling retires their old subskill folders when unedited. Arguments and flags work as before, for example `$neef-shape --deep <idea>`. These explicit-only aliases read the same canonical Neef instructions and share its state and safety checks. Hyphenated names work on both hosts; no colon-named skill directories are required on Windows.

## Internals

How the installer, runtime, state files, Git safeguards, records and smoke tests work is described in [docs/internals.md](docs/internals.md). Run `npm run check` for the tests.
