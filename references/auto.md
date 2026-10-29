# Sign off once, then build hands-off

`auto` front-loads every decision, then finishes the feature without further prompts. It is done when the user has signed off a challenged plan and every phase is accepted, or when no remaining phase can advance without input only the user can give. It combines existing routes: shaping questions from `references/shape.md`, a self-review from `references/challenge.md` and the phase loop from `references/plan.md`. It adds no new state format, files or dependencies.

The plan, challenge and sign-off are mandatory, however clear or small the request. Before sign-off, project files and Git stay unchanged: no `begin`, edits, project commands or commits. A clear request skips only the question rounds; if it should skip the sign-off, the user would have asked for an ordinary task instead.

## Ask everything first

Inspect applicable instructions, relevant code, tests, current state and established preferences, as in shape. Discover facts yourself and decide routine matters autonomously. Collect every consequential decision whose alternatives materially change behavior, scope, design or cost.

Ask in rounds. Each round batches all independent open questions in one native question call (Claude `AskUserQuestion`, Codex `request_user_input_async` or `request_user_input` in a supported mode), each with concrete choices and a recommended first option tied to the code or goal. A question whose prerequisite is unanswered waits for the next round. After each round, save answers and repeat until nothing meaningful is open; there is no fixed cap, stop at diminishing value. Clear requests need zero rounds but still go through plan, challenge and sign-off. A pending, cancelled or unanswered choice is not agreement.

## Plan and challenge it

Save a complexity-sized plan exactly as `references/plan.md` describes, covering the full feature, its integration and verification. Then challenge that plan at standard depth with read-only inspection: test its assumptions against source, look for simpler alternatives, missing edge cases, risky phases and unverifiable acceptance criteria. Fold supported fixes into the plan. Keep remaining concerns and unverified assumptions for the summary; do not invent criticism.

## One sign-off

Show one compact summary: goal, agreed decisions, assumptions NEEF made, phases with dependencies and acceptance criteria, challenge findings and what was changed because of them. State the authority it grants: scoped edits, checks and local commits on main, or on a linked worktree's branch followed by its merge into main; no pushing, new branches or destructive actions. Then ask one native question: approve, or request changes. Without a native question tool, ask in chat and stop; end with the host's approval command, `/neef next approve the auto plan` in Claude or `$neef next approve the auto plan` in Codex.

Only an explicit approval signs off: an approval answer, or a message whose own words approve this plan, such as that command. A bare `next` or `continue`, a saved recommendation or an earlier reply's suggestion is not approval. A change request updates decisions, asks any questions it creates, re-plans, re-challenges and shows a new summary. Silence, timeout or a cancelled prompt is not approval; stop and keep the plan unsigned.

While unsigned, keep `progress:"active"`, `baseline:null` and `next:"auto: awaiting sign-off; do not execute"` with any pending question. `next` or `continue` on an unsigned auto plan resumes the questions or sign-off; it never executes phases. On approval, add `Signed off <ISO date>; auto run` to `decisions` and set `next` to the first ready phase.

## Run to completion

After sign-off, follow `Continue until complete or blocked` in `references/plan.md` in the same invocation: baseline, implement, verify and commit each ready phase, then immediately start the next. Do not ask the user to confirm phases, commits or progress. Resolve new technical uncertainty through inspection and the signed-off decisions; when a minor choice is not covered, take the safest conventional option and record it in `decisions`.

Ask only when a new decision would materially change the signed-off scope or behavior. Before asking, finish all independent phases. A host permission prompt, sandbox or policy denial is a blocker for the work that needs it: record it, continue independent work and report the exact user step at the end. Never treat sign-off as authority to bypass a host decision.

A signed-off auto plan resumed through `next` keeps running all ready phases without new questions. Finish with NEEF's normal outcome records and follow-up report.
