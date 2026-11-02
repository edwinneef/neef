# Plan the feature, execute all ready phases

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
      "userInput": "Optional: the decision, credential, approval or manual step only the user can supply",
      "status": "pending"
    }
  ]
}
```

Use `scale:"large"` for a roadmap. Phase ids are unique; `dependsOn` contains other phase ids and forms an acyclic graph. Status is `pending`, `active` or `complete`, with at most one active phase. Active and complete phases require completed dependencies. Complete phases also require a `verification` string containing their acceptance evidence. Set `userInput` only on a phase that cannot finish without something only the user can give, such as a product decision, credential, account access, host approval or a manual step on their machine; name exactly what is needed. Omit it when inspection or a reasonable default settles the work. The helper stores the plan beside the task state in its own file, under 32 KiB, written under the same lock and revision; keep it concise. Same-task writes preserve an omitted plan; a different task starts without it. Setup and recommendation refreshes preserve the plan.

Planning needs no `begin` baseline. Use `baseline:null`, record inspection as verification, and put the next executable phase and the planning-only stop boundary in `next`. Save a REQUIRED recommendation for that phase, or the exact blocker when none is executable. Show the sized plan, dependencies and acceptance criteria. Mark each phase that needs the user with what they must provide and when, and say plainly when no phase does. Then `Run: $neef-next` for Codex or `/neef-next` for Claude. Saving the plan does not complete the feature or authorize phase execution in this invocation.

## Continue until complete or blocked

If the task `next` starts `auto:`, the plan is not signed off: read `references/auto.md` and follow its sign-off rules instead of this section. A bare `next` or `continue` never signs it off.

On `next` (or `continue`) with this plan active, reconcile the entire saved roadmap with current files, instructions, branch and history. Preserve accepted phases and agreed decisions. Revalidate assumptions for the selected phase and adjust the remaining plan only as source evidence or new user requirements justify. Resume an active phase; otherwise select the earliest pending phase whose dependencies are complete. Before treating the roadmap as blocked, inspect every remaining phase for useful work that can proceed independently.

Obtain and save a safe `begin` baseline before implementation. Reuse an interrupted phase's baseline only when its project, branch and HEAD still match; preserve overlapping work and existing commit safeguards. Mark only the selected phase active and execute its task through NEEF's normal implementation, focused verification and owned-commit workflow on main. Commit completed increments often and obtain a fresh baseline before editing the next increment.

Mark the phase complete only when its acceptance criteria have supporting evidence. Persist that evidence in the phase's `verification` field and the task verification summary. Preserve earlier phases' evidence when saving later progress. After a safe commit, clear the expired baseline with `baseline:null`. Keep the feature active while phases remain and immediately select and execute the next ready phase in this invocation. Phase boundaries and successful commits are checkpoints, not reasons to ask the user to continue.

If a phase is blocked, preserve its unfinished scope and record the phase id and exact missing input or authority in task `blockers`. Before activating another ready phase, return the blocked phase to `pending`, retaining its blocker. Continue phases whose dependencies are complete and which have no unresolved blocker, keeping at most one phase active. Resolve technical uncertainty through inspection and reasonable defaults. Stop only when all phases are accepted or no remaining phase can safely advance without user input. At a blocker, save REQUIRED scope in `next` and report the host's `neef next` command for resumption, naming the input it needs. A permission or policy denial is never resolved by another `neef next`: give the step only the user can take and what to report back. Only after all phases are accepted may the feature be complete and ordinary follow-up recommendations resume. Never start unrelated work while the roadmap is unfinished.

A blocker applies only to the work that needs it. Complete and commit useful independent parts of a later phase even when the whole phase cannot finish. If a phase mixes independent work with work that has unmet dependencies, split it into smaller phases with accurate dependencies before execution; preserve all original acceptance criteria and the unfinished scope. Record partial results and remaining work without marking the original outcome complete. For example, finish phases 1 and 2, then implement the independent part of phase 4 while phase 3 awaits user input. Ask for the missing input only after exhausting safe progress across the plan; never guess a required user decision or bypass a real dependency.
