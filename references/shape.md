# Adaptive decision clarification

Collaboratively turn a rough idea into an actionable implementation. Resolve consequential product, UX, behavior and architectural uncertainty, save agreed constraints in shared state, then implement the task through NEEF's normal verification, Git and recommendation workflow. This is part of NEEF; use native questions rather than another interview skill or dependency. Create no specification documents or project-local interview files.

## Inspect before asking

Read applicable instructions, relevant code and tests, current NEEF state, and established user preferences. Discover facts yourself. Ask only about decisions whose alternatives materially affect behavior, scope, design or cost and cannot be resolved from that evidence. An established decision or requirement to preserve behavior settles that question, including in deep mode. Ask no reconfirmation or adjacent policy questions about settled behavior. Deep mode increases inspection depth, not task scope. Leave all inputs and behavior outside the requested change unchanged without asking about them. Make routine decisions autonomously. Clear requests need zero questions, even with an explicit shape invocation.

## Start without an idea

When `shape` has no idea, including with flags or the direct shape alias, offer three small project-specific starter ideas, one line each, based on the inspection above. Give each a concrete change and intended benefit; recommend the strongest. If evidence is sparse, label assumptions rather than inventing defects. Invite a numbered choice or the user's own idea, then wait. This is read-only, including external state: preserve any unfinished task and its decisions. A choice selects only that idea for normal shaping; it does not authorize the other suggestions. Carry supplied flags into the selected idea. Starter selection does not count toward the shaping-question limit.

## Discussion only

`--discuss` makes shaping discussion-only, as does an explicit natural-language request. It combines with `--deep` in either order. Inspect and clarify normally, and save decisions in external task state, but leave project files and Git unchanged. Skip development commands, hooks, installation and `begin`. Once the idea is clear, report the saved decisions and stop without implementing or marking the feature complete. Retain this boundary on resumption, including `next` or `continue`, until the user explicitly requests implementation. Those commands alone continue discussion; they do not request a build. A build handoff must suggest an explicit implementation command.

Every discussion-only task save, including the closing summary, must retain `Discussion-only (--discuss); awaiting explicit implementation request` in `decisions` and `next`, alongside the agreed constraints and any pending question. Resolving the last question does not clear this marker. Clear it only when the user explicitly requests implementation.

## Adapt the depth

- `shape <task>`: ask at most two rounds of questions (see `One round, then wait`). Stop sooner when sufficiently clear.
- `shape --deep <task>`: follow dependencies between decisions, challenge unsupported assumptions and examine meaningful architectural tradeoffs and edge cases. The two-round cap is lifted; stop when further questioning provides diminishing value or the user stops the interview.
- Ordinary development: the same two-round cap applies when consequential ambiguity cannot safely be resolved. Do not turn a clear or simple request into an interview or silently upgrade to deep shaping.

Round counts span resumed turns, not just the current response. Never ask merely to reach a limit. At a cap, proceed with settled constraints and safe conventional choices; record a concrete blocker if unresolved uncertainty prevents safe implementation. Do not exceed the cap, fabricate agreement or seek another planning approval.

## One round, then wait

A round is one native question call that batches every independent open decision. Choose the consequential decisions whose prerequisites are settled; a decision that depends on an unanswered one waits for the next round. Give each question concrete choices and a recommended answer with brief reasoning tied to the code or goal; put the recommendation first. Distinguish assumptions about user impact from observed facts.

Use a native question tool when available: Codex `request_user_input_async` (or `request_user_input` only in a supported mode), or Claude `AskUserQuestion`. Otherwise ask the round's questions in chat and await the answers. Do not invent tool availability. A pending, preselected, cancelled or unanswered choice is not agreement; never treat timeout as an answer. Continue only independent inspection while waiting. Do not implement behavior that depends on an unanswered question.

After each round's answers, update the constraints and reconsider whether any meaningful uncertainty remains. Do not repeat answered questions. New questions must follow unresolved dependencies rather than revisit settled choices without new conflicting evidence.

## Persist and proceed

Use `state-write` with the current revision, consistent task title and `progress:"active"`. A baseline is not required to save discussion state: use baseline:null until implementation needs begin. Persist the pending questions before asking them. Keep concise agreed constraints in `decisions`. While waiting, record the mode, rounds asked/limit, the pending questions and any discussion-only boundary in the existing task `next` field; either agent can then resume without resetting the count or repeating questions. Save answers before asking another question or implementing. Retain earlier decisions when updating them; do not store a transcript or overwrite another unfinished task silently.

Read saved decisions on resumption and treat them as implementation constraints. If a task title changes, explicitly carry the same task's decisions forward; a genuinely new task must not inherit unrelated constraints.

Once sufficiently clear, summarize the agreed decisions concisely, persist them in decisions, then begin implementation automatically with a safe baseline; do not ask for approval of the interview summary or require another prompt. Clear the pending-question marker when moving into implementation. An explicit discussion-only request ends with saved decisions and no implementation; do not mark the unimplemented feature complete. Retain that boundary on resumption until the user requests implementation. If the user stops questions, implement what is safely specified and record any remaining blocker. An instruction to stop work or pause must be honored rather than treated as permission to implement.

After implementation, evaluate and persist grounded next recommendations and use NEEF's normal completion report. Interview decisions never authorize destructive operations, pushing, merging or expansion beyond the requested task.
