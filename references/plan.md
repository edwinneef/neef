# Plan the feature, execute one phase

Planning is done when the whole requested feature has a source-backed plan saved in shared state and shown to the user. `plan` then stops. It never implements, runs project commands, changes Git or creates project planning files. Use the existing helper `status` and revision-checked `state-write` for external continuity; no additional tool or setup is required.

## Size the work

Inspect applicable instructions, relevant code, tests and current state. Preserve unrelated unfinished work; if it cannot be reconciled with this feature, ask before replacing it. Resolve technical facts through inspection. Ask at most two consequential unanswered questions across resumed turns, one at a time with a recommended choice. Before asking, save active discussion state with `baseline:null`, agreed decisions and `next:"plan: questions X/2; pending <question>; planning only"`. Wait for the actual answer before dependent work. A resumed discussion finishes and saves the plan, then stops; it never jumps into implementation. Clear requests need no interview. Keep unresolved assumptions visible rather than inventing agreement.

Choose the smallest useful plan from actual complexity, rather than feature wording or a fixed phase count. A bounded change with a clear implementation path gets one short phase. Work spanning architectural boundaries, migrations or dependent deliverables gets a roadmap of manageable phases. Explain the sizing briefly. Cover the full requested outcome, including necessary integration and verification; each phase needs a bounded task, explicit dependencies and observable acceptance criteria. Prefer independently verifiable results, and detail the first executable phase more than distant work. Add no mandatory ceremonies, separate specs, orchestration dependencies or GSD commands.

## Save and stop

Keep the feature title in `task`, agreed constraints in `decisions`, and `progress:"active"` until every phase is accepted. Save an optional `plan` object in the existing state file through `state-write`:

```json
{
  "goal": "The full feature outcome",
  "scale": "small",
  "rationale": "One bounded change in the existing module",
  "phases": [
    {
      "id": "p1",
      "task": "Implement the bounded change and verify its behavior",
      "dependsOn": [],
      "acceptance": ["An observable result with a focused verification method"],
      "status": "pending"
    }
  ]
}
```

Use `scale:"large"` for a roadmap. Phase ids are unique; `dependsOn` contains other phase ids and forms an acyclic graph. Status is `pending`, `active` or `complete`, with at most one active phase. Active and complete phases require completed dependencies. Complete phases also require a `verification` string containing their acceptance evidence. Keep the plan concise enough for the shared state's existing 8 KiB and 40-line limits; the helper serializes it compactly. Same-task writes preserve an omitted plan; a different task starts without it. Setup and recommendation refreshes preserve the plan.

Planning needs no `begin` baseline. Use `baseline:null`, record inspection as verification, and put the next executable phase and the planning-only stop boundary in `next`. Save a REQUIRED recommendation for that phase, or the exact blocker when none is executable. Show the sized plan, dependencies and acceptance criteria, then `Run: $neef continue` for Codex or `/neef continue` for Claude. Saving the plan does not complete the feature or authorize phase execution in this invocation.

## Continue one phase

On `continue`, reconcile the entire saved roadmap with current files, instructions, branch and history. Preserve accepted phases and agreed decisions. Revalidate assumptions for the selected phase and adjust the remaining plan only as source evidence or new user requirements justify. Resume an active phase; otherwise select the earliest pending phase whose dependencies are complete. If no phase is ready, save the concrete blocker and stop.

Obtain and save a safe `begin` baseline before implementation. Reuse an interrupted phase's baseline only when its project, branch and HEAD still match; preserve overlapping work and existing commit safeguards. Mark only the selected phase active and execute its task through NEEF's normal implementation, focused verification and owned-commit workflow. Never advance into another phase in the same invocation, including independent phases.

Mark the phase complete only when its acceptance criteria have supporting evidence. Persist that evidence in the phase's `verification` field and the task verification summary; if unfinished, keep that phase active and name the remaining work in `next` and blockers. Preserve earlier phases' evidence when saving later progress. After a safe commit, clear the expired baseline with `baseline:null`. Keep the feature active while phases remain, save the next ready phase as REQUIRED scope and report the host's `neef continue` command, then stop. Only after all phases are accepted may the feature be complete and ordinary follow-up recommendations resume. Do not use `next` to bypass an unfinished roadmap.
