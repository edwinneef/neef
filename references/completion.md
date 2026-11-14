# Match completion to the request

Use the existing workflow and normal state saves. Add no command, approval, planning document or separate verification round. The selected mode still controls what may change and where work stops.

When resuming, read the saved decisions, evidence, next step and blockers alongside the existing plan, if any. Reconcile them with current instructions, files and Git before continuing. Keep settled decisions and useful evidence; reuse checks only while the code and conditions they cover still match. If something changed, state what needs rechecking and perform only the affected checks. Resume the unfinished work rather than reopening answered questions or starting a replacement task.

For routine changes, aim to reach a concrete edit or the first useful check within a few minutes. Start with the responsible code and relevant tests. Read or search farther to answer a named unresolved question. Once the evidence supports a small safe change, implement it. If uncertainty prevents that, use the smallest diagnostic that can distinguish the plausible causes instead of continuing broad inspection. This target never overrides required checks or safety boundaries.

At normal checkpoints, save current decisions and their reasons, outcome evidence, the concrete next step and unresolved required blockers. Keep headroom within the 8 KiB and 40-line state limit by linking evidence artifacts and summarizing completed history rather than copying transcripts or repeated results. Preserve active acceptance criteria when shortening notes. If a save exceeds the budget, shorten historical detail before retrying; do not restart investigation to reconstruct evidence already collected.

Same-task saves retain omitted `decisions`, `verification`, `outcomes` and `blockers`; active saves also retain an omitted `next`. Supply an empty string to clear a resolved blocker or obsolete note. Omission does not establish that a blocker was resolved or that old evidence remains valid. For a different task, omitted task-note fields start empty and outcomes are not inherited; project context remains available. Save at actual milestones and before stopping, without extra saves merely to narrate progress.

Before implementing, identify the requested outcomes from the prompt, relevant source and agreed decisions; use existing plan acceptance criteria when present. Keep agreed constraints in `decisions`. Ask only when essential ambiguity remains, not to approve a checklist.

Records stay light. An ordinary task keeps what is needed to resume it: the task, a `verification` note saying what was done and how it was checked, and the next step. It completes on a nonempty `verification`; write no `outcomes` for it. Full `outcomes` records are for work with a saved plan and tasks at `important`, where the helper requires them.

For those, `outcomes` is a nonempty array of records, saved at the next normal state save:

```json
[{"id":"behavior","description":"The requested observable result","required":true,"status":"pending","evidence":""}]
```

Ids must be unique and at most 60 characters; descriptions must be nonempty and at most 400 characters. Every record has a boolean `required`, a `status` of `pending`, `passed`, `failed` or `blocked`, and an `evidence` string of at most 4000 characters. At least one outcome must be required. Passed outcomes require nonempty evidence. Update the records as work advances, retaining the whole requested scope; adjust scope only when the user changes it. Optional outcomes may remain unfinished without preventing completion. The helper stores the array compactly under its own 32 KiB budget, measured in bytes; it does not count against the 8 KiB and 40 lines of the task notes.

Resolve the task's importance level per `references/importance.md` and scale new tests and independent checking to it. Choose the observable result and stop condition before running a check. Verify the requested behavior with the smallest meaningful set of affected checks, grouped after a coherent edit. Repeat or broaden validation only for changed code, a failure, unresolved risk or an explicit requirement. Retain valid results through bookkeeping and deployment. Do not add tests for trivial prose. A successful build proves compilation, not a booking cancellation; a copied-file hash proves installation, not that a running host loaded it.

Before requesting a native test, inspect relevant recordings and accepted observations. Complete applicable offline checks and safe installation first. When a new native check is authorized and necessary, give one bounded sequence with exact actions, expected evidence and a stop condition. Reuse accepted controls when their relevant code and configuration are unchanged. When native testing is not authorized, use available passive evidence and keep missing native results explicit.

When that check's result lands in a file, such as a log, wait for the file instead of asking the user to type the result. Run helper `wait-file <pattern> --mark` first and show the steps only after it returns a watch id, so a fast check cannot finish unseen. Then run `wait-file --watch <id>` with a time limit, in the host's background run when it has one and in the foreground otherwise, and tell the user the limit. Prefer `--contains` with the line that ends the check; a file that only stopped growing may still be unfinished. While the wait runs, the check is not a blocker. When it returns a file, read status again, read the file and continue; state what the file cannot show as unchecked, or ask it once. A file that has not changed since the mark is never evidence. A wait that times out or is stopped is not a result: give the exact step still needed and the resume command. Stop every wait you started. A check that leaves no file keeps the report-back command.

When test pace is questioned or a test run is slow, separate test execution time from investigation, setup, installation and workflow overhead. State which part consumed the time; never present instruction changes or faster individual checks as a measured improvement to the whole task.

At the normal final state save, summarize what was done and checked in the `verification` string; where outcomes are kept, update each one's result and evidence. Include evaluated `recommendations` in that same save, including after verification-only task work; required missing acceptance remains REQUIRED and active. Identify remaining uncertainty and distinguish executed behavior checks from source inspection, simulation, installation or human acceptance. Evidence is agent-reported: the helper checks record consistency, not whether the behavior really works.

The helper rejects `progress:"complete"` unless `verification` is nonempty, blockers are empty and existing plan phases are complete; with a plan or at `important` it also requires valid outcomes with every required one passed with evidence. Supplied outcomes are always validated. Explicitly clear resolved blockers; completion does not clear them implicitly. Legacy states without outcomes remain readable. Active shaping and planning may omit outcomes until development; read-only and isolated prototype modes do not acquire task writes or execution permission from this contract.

If a required check cannot be performed, finish independent safe work, keep progress active, and record the exact missing check or result in `next` and its reason in `blockers`. Completed code or commits do not close that gap. An optional check outside the agreed scope does not keep a completed task open. Follow the existing host-denial boundary when applicable.

Report the result and relevant evidence briefly, including any required gap. Scale the detail to the request; no mandatory table, checklist, extra user question or full test suite.

Prototype completion follows `references/prototype.md`: demonstrate the bounded concept and state shortcuts and limits. Its handoff does not acquire production outcome records, commits or task-state writes. Production development retains the required outcomes and evidence above.

## Merge a linked worktree

When `begin` reports `worktree: "linked"`, the task's commits land on that worktree's branch. After the final state save marks the task complete, run helper `merge` from the worktree. It brings the branch into main in the main folder: fast-forward when possible, otherwise one merge commit. The merge still needs the main folder on main, although ordinary work there runs on any branch. If it refuses (conflict, main folder off main, staged or in-progress work, completion not recorded after the last commit), leave both sides intact, save the task active with that blocker and report it. After a merge commit, rerun the focused checks in the main folder; report failures as a blocker without reverting. Never delete the branch or worktree.

## Save task continuity

Use `state-write <revision>` with stdin JSON containing `task`, `progress` (`active` or `complete`), `baseline`, `decisions`, `verification`, `next`, `blockers` and development `outcomes` (contract above); the four note fields remain strings. Reuse the latest revision from `begin`, `commit`, bootstrap/setup or state mutation. Use `status` when no revision is available, a check fails, or progress needs reconciliation. A stale-revision error names the task, progress and revision saved now: when that task is not yours, another session wrote it, so reconcile before writing; never retry blind with the new revision. Save at useful milestones and before stopping. HEAD changes expire a baseline; begin again before the next increment's edits. Inspect a corrupt state's backup before `state-recover <revision>`.

Task writes preserve `context`; setup preserves task fields. Agreed `decisions` constrain implementation. Refresh stale facts without requiring setup.
