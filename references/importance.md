# Importance scales checking

Importance sets how much testing and independent checking a task gets: `explore`, `normal` (default) or `important`. It changes depth only, never permissions, mode boundaries or required evidence.

## Set and resolve it

`importance [explore|normal|important] [--here]`: run helper `importance` with the supplied arguments and report the result. A level saves the global default; `--here` saves an override for this project only; `importance clear --here` removes it; no level shows the effective one. Stop without starting a task.

A task level comes from, in order: `--importance <level>` on the invocation (any task route), the level saved in task state, then helper `status` `importance` (project override, else global default). Pass the chosen level as `importance` in `state-write` when starting a task so `next` resumes at it. Same-task saves keep it; a new task starts from the default unless a level is supplied.

Raise, never lower, on your own: when work touches authentication, permissions, secrets, data deletion or migration, a shared or public API, money or irreversible operations, say so in one line and ask whether to run at `important`. Do not change the level until the user agrees. Lowering is the user's call.

## What each level does

| Level | New tests | Second-agent check | Evidence |
| --- | --- | --- | --- |
| `explore` | None; at most one start-up smoke check | None | Run it and observe; record what you saw |
| `normal` | Focused tests only for behaviour already settled in `decisions` | None | Smallest meaningful affected check |
| `important` | Tests for each required outcome, covering its failure case | Fresh native delegate re-verifies the required outcomes before completion | Check results plus the delegate's findings |

A level never skips the workflow: run `begin` before the first edit, save state with `importance`, and commit as usual at every level, including `explore`. Only new tests and the second-agent check scale. A level never skips a required outcome's evidence; `explore` meets it by running the thing. Under `explore`, keep behaviour you are still discovering untested and say which outcomes rest on observation only.

## Second-agent check (`important`)

Use a fresh native delegate when the host offers one; otherwise state that the check was done in the same session. Give it the diff, the saved `decisions` and required `outcomes`, and the project instructions, not your own conclusions. It re-runs or re-reads the evidence for each required outcome and returns findings only: it writes no files, state or commits, and may report that nothing was found. Confirm each finding against source before acting. Record its result in the matching outcome's evidence. If no delegate is available and the user wants one, name that as a blocker rather than marking the outcome checked.
