# Where NEEF differs from its vision

Compared on 2026-11-11 against [the vision](vision.md). No rule was changed for this list. Effort: S is a wording change, M touches the helper and its tests, L touches several files plus the installer.

## Already matches

| Vision point | Where |
| --- | --- |
| Get it running first, decide the stack without asking | `references/start.md` (Decide the shape, Build the first working version) |
| Run it and try the main flow before "done" | `references/start.md` line 17; `SKILL.md` line 53 ("ends verified to start") |
| Save each step so it can be undone; leave the owner's edits alone | `SKILL.md` lines 61–63; `prepare`/`commit` in `scripts/neef.mjs` |
| Never publish or push without the owner | `SKILL.md` line 20 |
| Ask only for real decisions, no approval of routine steps | `SKILL.md` line 53; `references/shape.md` lines 21–23 |
| One next command at the end of every report | `references/follow-up.md` (Report layout) |
| Never lower the checking level on its own | `references/importance.md` ("Raise, never lower") |
| Out of scope stays out (hosting, accounts, specs) | `references/start.md` line 15; README comparison |

## Gaps

| # | Vision point | Today | Where | Change | Effort |
| --- | --- | --- | --- | --- | --- |
| 1 | No new test files until a first version works | New projects start at `normal`: focused tests from the first task. `start.md` says "build or test what exists" but sets no level | `scripts/neef.mjs` line 197 (`fallback: 'normal'`); `references/importance.md` table; `references/start.md` line 17 | A `greenfield` project runs at `explore` until its first working version is committed; state that in `start.md` and `importance.md` | M |
| 2 | Offer more checking at natural moments | NEEF only offers to raise for risky areas (sign-in, money, deletion). Nothing happens when a first version works or before going public | `references/importance.md` ("Raise, never lower") | Add two offers: after the first working version, and when the owner asks to publish. One line each, owner decides | S |
| 3 | Records stay light | Every task must carry outcome records with evidence; the helper refuses completion without them | `scripts/neef.mjs` lines 255, 396–399 and the completion check; `references/completion.md` (outcomes contract, about a third of the file); README "Development records requested outcomes" | Require outcome records only when a plan exists or the level is `important`. Ordinary tasks complete with task, verification and next. Shorten `completion.md` accordingly | M |
| 4 | One bold idea in every report | Follow-up says "never invent filler" and ranks only grounded next steps. No slot for a more ambitious idea | `references/follow-up.md` lines 3–5 and Report layout | Add one clearly separate "bold idea" line to Follow-up: optional to act on, never built unasked, omitted when nothing real comes to mind | S |
| 5 | Park or switch when a request is off the plan | An open plan is protected only inside `next` ("never start unrelated work"). A fresh `/neef <task>` during a plan is not checked, and there is no parking list | `references/plan.md` (Continue until complete or blocked); `SKILL.md` line 51 ("retain unfinished work unless the user replaces it") | Add a `parked` list to the state file and a rule in `SKILL.md`: with an open plan, an unrelated request gets one question, park or switch. Offer parked ideas when the plan completes | M |
| 6 | Seven great commands, three up front | Sixteen commands in `help`, fourteen installed skills, all shown at the same level | `scripts/neef.mjs` catalog (lines 10–30); `SKILL.md` routing list; README mode table; installer | See the confirmed set below | L |
| 7 | Written for builders, not coders | README and rules explain Git internals, tokens and hashes at length. The promise in README is the old one | `README.md` (maintenance paragraphs near the end); line 7 | Lead README with the new promise and the three commands; move maintainer detail to a separate file | S |
| 8 | Rules a fast tool can carry | About 12,700 words in 19 files; `plan.md` and `completion.md` are the longest | `references/` | Falls out of gaps 3 and 6. No separate work unless the total stays above roughly 9,000 words afterwards | – |

## Confirmed commands

Confirmed by the owner on 2026-11-11: seven workflow commands. The first three are the whole story for a newcomer.

| Command | For | Shown |
| --- | --- | --- |
| `neef <what you want>` | Build or change something. Asks only when it must | Up front |
| `neef next` | Continue, or do the most useful next thing | Up front |
| `neef ask <goal>` | Not sure how to ask: it writes the command for you | Up front |
| `neef shape <idea>` | A rough idea: a few sharp questions, then it builds | When needed |
| `neef plan <feature>` | Bigger work: questions first, one sign-off, then it runs | When needed |
| `neef prototype <idea>` | Try an idea in a scratch folder | When needed |
| `neef challenge <topic>` | An honest review that changes nothing | When needed |

What happens to the others:

- `shape` stays: the owner uses it often, and folding it into `plan` would add a sign-off to a quick flow.
- `review` and `docs` fold into `challenge` (challenge the last work, challenge the documentation).
- `options` keeps one name, `ask`. The `prompt`, `auto`, `proto` and `continue` aliases go.
- `merge` goes as a command. Finishing a linked worktree still merges through the helper.
- Settings and diagnostics stay in the background: `help`, `status`, `doctor`, `style`, `setup`, `importance`.

Constraint from the plan: `plan`, `next` and `prototype` must keep working until phase 5 is finished.

## Not measured

How much time the records in gap 3 cost on a real task. The claim rests on reading the rules, not on timing a run.
