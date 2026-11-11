# Plan first, sign off once, then build

`plan <feature>` front-loads every decision, then finishes the feature without further prompts. Planning is done when the whole requested feature has a source-backed, self-challenged plan saved in shared state and shown for sign-off. It then stops until the user explicitly approves; approval runs every phase in the same invocation (`Continue until complete or blocked`). It adds no new state format, files or dependencies: use helper `status` and revision-checked `state-write`.

The plan, challenge and sign-off are mandatory, however clear or small the request. Before sign-off, project files and Git stay unchanged: no `begin`, edits, project commands, commits or project planning files. A clear request skips only the question rounds; a user who wants no sign-off asks for an ordinary task instead.

## Size the work

Inspect applicable instructions, relevant code, tests, current state and established preferences. Preserve unrelated unfinished work; if it cannot be reconciled with this feature, ask before replacing it. Resolve technical facts through inspection and decide routine matters autonomously. Collect every consequential decision whose alternatives materially change behavior, scope, design or cost.

Ask in rounds. Each round batches all independent open questions in one native question call (Claude `AskUserQuestion`, Codex `request_user_input_async` or `request_user_input` in a supported mode), each with concrete choices and a recommended first option tied to the code or goal. A question whose prerequisite is unanswered waits for the next round. After each round, save answers and repeat until nothing meaningful is open; ask at most two rounds, counted across resumed turns; `--deep` on the invocation lifts the cap, and then stop at diminishing value. Clear requests need zero rounds. A pending, cancelled or unanswered choice is not agreement; keep unresolved assumptions visible. Before asking, save active discussion state with `baseline:null`, agreed decisions and `next:"plan: awaiting answers; pending <questions>; do not execute"`. Without a native question tool, ask in chat and stop.

Choose the smallest useful plan from actual complexity, rather than feature wording or a fixed phase count. A bounded change with a clear implementation path gets one short phase. Work spanning architectural boundaries, migrations or dependent deliverables gets a roadmap of manageable phases. Explain the sizing briefly. Cover the full requested outcome, including necessary integration and verification; each phase needs a bounded task, explicit dependencies and observable acceptance criteria. Prefer independently verifiable results, and detail the first executable phase more than distant work. Add no mandatory ceremonies, separate specs, orchestration dependencies or GSD commands.

## Save the plan

Keep the feature title in `task`, agreed constraints in `decisions`, and `progress:"active"` until every phase is accepted. Save an optional `plan` object in the existing state file through `state-write`:

```json
{
  "goal": "The full feature outcome",
  "scale": "small",
  "rationale": "One bounded change in the existing module",
  "phases": [
    {
      "id": "p1",
      "title": "Upload retry",
      "task": "Implement the bounded change and verify its behavior",
      "dependsOn": [],
      "acceptance": ["An observable result with a focused verification method"],
      "userInput": "Optional: the decision, credential, approval or manual step only the user can supply",
      "status": "pending"
    }
  ]
}
```

Use `scale:"large"` for a roadmap. Give each phase a `title` of about three words for the scope board. Phase ids are unique; `dependsOn` contains other phase ids and forms an acyclic graph. Status is `pending`, `active` or `complete`, with at most one active phase. Active and complete phases require completed dependencies. Complete phases also require a `verification` string containing their acceptance evidence. Set `userInput` only on a phase that cannot finish without something only the user can give, such as a product decision, credential, account access, host approval or a manual step on their machine; name exactly what is needed. Omit it when inspection or a reasonable default settles the work. The helper stores the plan beside the task state in its own file, under 32 KiB, written under the same lock and revision; keep it concise. Same-task writes preserve an omitted plan; a different task starts without it. Setup and recommendation refreshes preserve the plan.

Planning needs no `begin` baseline. Use `baseline:null` and record inspection as verification.

## Challenge it

Challenge the saved plan at standard depth with read-only inspection: test its assumptions against source, look for simpler alternatives, missing edge cases, risky phases and unverifiable acceptance criteria. Fold supported fixes into the plan. Keep remaining concerns and unverified assumptions for the summary; do not invent criticism.

## One sign-off

Show one compact summary: goal, agreed decisions, assumptions NEEF made, phases with dependencies and acceptance criteria, each phase's `userInput` (or that none needs the user), challenge findings and what changed because of them. State the authority it grants: scoped edits, checks and local commits on main, or on a linked worktree's branch followed by its merge into main; no pushing, new branches or destructive actions. Then ask one native question: approve, request changes, or check with the other agent first (`references/peer-check.md`). Without a native question tool, ask in chat and stop; end with the host's approval command, `/neef-next approve the plan` in Claude or `$neef-next approve the plan` in Codex.

Only an explicit approval signs off: an approval answer, or a message whose own words approve this plan, such as that command. A bare `next`, a saved recommendation or an earlier reply's suggestion is not approval. A change request updates decisions, asks any questions it creates, re-plans, re-challenges and shows a new summary. Silence, timeout or a cancelled prompt is not approval; stop and keep the plan unsigned.

While unsigned, keep `progress:"active"`, `baseline:null` and `next:"plan: awaiting sign-off; do not execute"` with any pending question, plus a REQUIRED recommendation to approve. A saved `auto:` marker from an earlier version means the same. `next` on an unsigned plan resumes the questions or sign-off; it never executes phases. On approval, add `Signed off <ISO date>; plan run` to `decisions` and set `next` to the first ready phase. Saving the plan does not complete the feature.

## Continue until complete or blocked

Runs only after sign-off, in the same invocation as the approval, or when `next` finds a signed-off plan. If the task `next` starts `plan:` or `auto:`, the plan is not signed off: follow `One sign-off` instead. Do not ask the user to confirm phases, commits or progress; ask only when a new decision would materially change the signed-off scope or behavior, and only after finishing all independent phases. A host permission, sandbox or policy denial is a blocker for the work that needs it: record it, continue independent work and report the exact user step at the end. Sign-off is never authority to bypass a host decision. Resolve new technical uncertainty through inspection and the signed-off decisions; take the safest conventional option for a minor uncovered choice and record it in `decisions`.

On `next` with this plan active, reconcile the entire saved roadmap with current files, instructions, branch and history. Preserve accepted phases and agreed decisions. Revalidate assumptions for the selected phase and adjust the remaining plan only as source evidence or new user requirements justify. Resume an active phase; otherwise select the earliest pending phase whose dependencies are complete. Before treating the roadmap as blocked, inspect every remaining phase for useful work that can proceed independently.

Obtain and save a safe `begin` baseline before implementation. Reuse an interrupted phase's baseline only when its project, branch and HEAD still match; preserve overlapping work and existing commit safeguards. Mark only the selected phase active and execute its task through NEEF's normal implementation, focused verification and owned-commit workflow on main. Commit completed increments often and obtain a fresh baseline before editing the next increment.

Mark the phase complete only when its acceptance criteria have supporting evidence. Persist that evidence in the phase's `verification` field and the task verification summary. Preserve earlier phases' evidence when saving later progress. After a safe commit, clear the expired baseline with `baseline:null`. Keep the feature active while phases remain and immediately select and execute the next ready phase in this invocation. Phase boundaries and successful commits are checkpoints, not reasons to ask the user to continue.

After each `state-write` that marks a phase complete, show its returned `board` verbatim in a plain code block as a one-line-headed progress update, then carry on without waiting. Keep the first board this run sees, from sign-off or the `next` that resumed it. The final plan report opens Evaluation with that board under `Before` and the latest board under `After`, so the run's movement is visible at a glance; when they are identical, show it once. The board is read-only: never offer to edit or move its cards.

If a phase is blocked, preserve its unfinished scope and record the phase id and exact missing input or authority in task `blockers`. Before activating another ready phase, return the blocked phase to `pending`, retaining its blocker. Continue phases whose dependencies are complete and which have no unresolved blocker, keeping at most one phase active. Resolve technical uncertainty through inspection and reasonable defaults. Stop only when all phases are accepted or no remaining phase can safely advance without user input. At a blocker, save REQUIRED scope in `next` and report the host's `neef next` command for resumption, naming the input it needs. A permission or policy denial is never resolved by another `neef next`: give the step only the user can take and what to report back. Only after all phases are accepted may the feature be complete and ordinary follow-up recommendations resume. Never start unrelated work while the roadmap is unfinished: in any route, a request outside the plan gets one question before any work: park it or switch. Park saves the idea with helper `park <revision>` and stdin `{"add":"<one line>"}`, then continues the plan; switch replaces the plan as the active task, so say that first. Requests that belong to the plan, and questions about it, need no such question. When the last phase is accepted, list `state.parked` in the report and offer the ideas as possible next work; start none of them, and remove an idea with `{"remove":"<its text>"}` once the user takes or drops it.

A blocker applies only to the work that needs it. Complete and commit useful independent parts of a later phase even when the whole phase cannot finish. If a phase mixes independent work with work that has unmet dependencies, split it into smaller phases with accurate dependencies before execution; preserve all original acceptance criteria and the unfinished scope. Record partial results and remaining work without marking the original outcome complete. For example, finish phases 1 and 2, then implement the independent part of phase 4 while phase 3 awaits user input. Ask for the missing input only after exhausting safe progress across the plan; never guess a required user decision or bypass a real dependency.

Report using the NEEF layout in `references/follow-up.md` (Report layout).
