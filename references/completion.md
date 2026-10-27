# Match completion to the request

Use the existing workflow and state fields. Add no command, approval, planning document or separate verification round.

Before implementing, identify the requested outcomes from the prompt, relevant source and agreed decisions. Keep them briefly in `decisions` at the next normal state save; use existing plan acceptance criteria when present. One clear outcome is enough for a small change. Ask only when essential ambiguity remains, not to approve a checklist.

During the checks already appropriate to the change, verify the behavior those outcomes require. Reuse relevant evidence when the code and conditions it covers still match. A successful build proves compilation, not a booking cancellation; a copied-file hash proves installation, not that a running host loaded it. Use the smallest meaningful check for the actual request. Do not add tests for trivial prose or repeat successful checks without a reason.

At the normal final state save, map each outcome to the evidence actually obtained in the `verification` string. A short sentence can cover related outcomes. Identify any remaining uncertainty and distinguish executed behavior checks from source inspection, simulation, installation or human acceptance. Evidence is a record of what happened, not a claim that the helper independently proved the behavior.

Mark complete only when the required outcomes have supporting evidence. If a required check cannot be performed, finish independent safe work, keep progress active, and record the exact missing check or result in `next` and its reason in `blockers`. Completed code or commits do not close that gap. An optional check outside the agreed scope does not keep a completed task open. Follow the existing host-denial boundary when applicable.

Report the result and relevant evidence briefly, including any required gap. Scale the detail to the request; no mandatory table, checklist, extra user question or full test suite.
