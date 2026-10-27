# Match completion to the request

Use the existing workflow and state fields. Add no command, approval, planning document or separate verification round.

When resuming, read the saved decisions, evidence, next step and blockers alongside the existing plan, if any. Reconcile them with current instructions, files and Git before continuing. Keep settled decisions and useful evidence; reuse checks only while the code and conditions they cover still match. If something changed, state what needs rechecking and perform only the affected checks. Resume the unfinished work rather than reopening answered questions or starting a replacement task.

At normal checkpoints, keep concise cumulative notes rather than a transcript: decisions and their reasons, evidence for completed outcomes, the concrete next step, and unresolved blockers. Same-task saves retain omitted `decisions` and `verification`; active same-task saves also retain omitted `next` and `blockers`. Supply an empty string to clear a resolved blocker or obsolete note, and replace a field explicitly to update it. Omission does not establish that a blocker was resolved or that old evidence remains valid. For a different task, omitted task-note fields start empty; project context remains available. No additional save is required.

Before implementing, identify the requested outcomes from the prompt, relevant source and agreed decisions. Keep them briefly in `decisions` at the next normal state save; use existing plan acceptance criteria when present. One clear outcome is enough for a small change. Ask only when essential ambiguity remains, not to approve a checklist.

During the checks already appropriate to the change, verify the behavior those outcomes require. Reuse relevant evidence when the code and conditions it covers still match. A successful build proves compilation, not a booking cancellation; a copied-file hash proves installation, not that a running host loaded it. Use the smallest meaningful check for the actual request. Do not add tests for trivial prose or repeat successful checks without a reason.

At the normal final state save, map each outcome to the evidence actually obtained in the `verification` string. Include evaluated `recommendations` in that same save, including after verification-only task work; required missing acceptance remains REQUIRED and active. A short sentence can cover related outcomes. Identify any remaining uncertainty and distinguish executed behavior checks from source inspection, simulation, installation or human acceptance. Evidence is a record of what happened, not a claim that the helper independently proved the behavior.

Mark complete only when the required outcomes have supporting evidence. If a required check cannot be performed, finish independent safe work, keep progress active, and record the exact missing check or result in `next` and its reason in `blockers`. Completed code or commits do not close that gap. An optional check outside the agreed scope does not keep a completed task open. Follow the existing host-denial boundary when applicable.

Report the result and relevant evidence briefly, including any required gap. Scale the detail to the request; no mandatory table, checklist, extra user question or full test suite.
