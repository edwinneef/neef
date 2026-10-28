# Match completion to the request

Use the existing workflow and normal state saves. Add no command, approval, planning document or separate verification round. The selected mode still controls what may change and where work stops.

When resuming, read the saved decisions, evidence, next step and blockers alongside the existing plan, if any. Reconcile them with current instructions, files and Git before continuing. Keep settled decisions and useful evidence; reuse checks only while the code and conditions they cover still match. If something changed, state what needs rechecking and perform only the affected checks. Resume the unfinished work rather than reopening answered questions or starting a replacement task.

At normal checkpoints, keep concise cumulative notes rather than a transcript: decisions and their reasons, evidence for completed outcomes, the concrete next step, and unresolved required blockers. Same-task saves retain omitted `decisions`, `verification`, `outcomes` and `blockers`; active saves also retain an omitted `next`. Supply an empty string to clear a resolved blocker or obsolete note. Omission does not establish that a blocker was resolved or that old evidence remains valid. For a different task, omitted task-note fields start empty and outcomes are not inherited; project context remains available. No additional save is required.

Before implementing, identify the requested outcomes from the prompt, relevant source and agreed decisions; use existing plan acceptance criteria when present. Record them in `outcomes` at the next normal state save. One clear outcome is enough for a small change. Keep agreed constraints in `decisions`. Ask only when essential ambiguity remains, not to approve a checklist.

`outcomes` is a nonempty array of records:

```json
[{"id":"behavior","description":"The requested observable result","required":true,"status":"pending","evidence":""}]
```

Ids must be unique and at most 60 characters; descriptions must be nonempty and at most 400 characters. Every record has a boolean `required`, a `status` of `pending`, `passed`, `failed` or `blocked`, and an `evidence` string of at most 800 characters. At least one outcome must be required. Passed outcomes require nonempty evidence. Update the records as work advances, retaining the whole requested scope; adjust scope only when the user changes it. Optional outcomes may remain unfinished without preventing completion. The helper stores the array compactly within the existing 8 KiB and 40-line budget.

During the checks already appropriate to the change, verify the behavior those outcomes require. Reuse relevant evidence when the code and conditions it covers still match. A successful build proves compilation, not a booking cancellation; a copied-file hash proves installation, not that a running host loaded it. Use the smallest meaningful check for the actual request. Do not add tests for trivial prose or repeat successful checks without a reason.

At the normal final state save, update each outcome's result and evidence and summarize the checks in the `verification` string. Include evaluated `recommendations` in that same save, including after verification-only task work; required missing acceptance remains REQUIRED and active. Identify remaining uncertainty and distinguish executed behavior checks from source inspection, simulation, installation or human acceptance. Evidence is agent-reported: the helper checks record consistency, not whether the behavior really works.

The helper rejects `progress:"complete"` unless outcomes are valid, all required outcomes are passed with evidence, blockers are empty and existing plan phases are complete. Explicitly clear resolved blockers; completion does not clear them implicitly. Legacy states without outcomes remain readable, but their next completion write needs outcome records. Active shaping and planning may omit outcomes until development; read-only and isolated prototype modes do not acquire task writes or execution permission from this contract.

If a required check cannot be performed, finish independent safe work, keep progress active, and record the exact missing check or result in `next` and its reason in `blockers`. Completed code or commits do not close that gap. An optional check outside the agreed scope does not keep a completed task open. Follow the existing host-denial boundary when applicable.

Report the result and relevant evidence briefly, including any required gap. Scale the detail to the request; no mandatory table, checklist, extra user question or full test suite.

## Save task continuity

Use `state-write <revision>` with stdin JSON containing `task`, `progress` (`active` or `complete`), `baseline`, `decisions`, `verification`, `next`, `blockers` and development `outcomes`; the four note fields remain strings. See `references/completion.md` for the outcome contract. Reuse the latest revision from `begin`, `commit`, bootstrap/setup or state mutation. Use `status` when no revision is available, a check fails, or progress needs reconciliation. Save at useful milestones and before stopping. HEAD changes expire a baseline; begin again before the next increment's edits. Inspect a corrupt state's backup before `state-recover <revision>`.

Task writes preserve `context`; setup preserves task fields. Agreed `decisions` constrain implementation. Refresh stale facts without requiring setup.
