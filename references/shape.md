# Adaptive decision clarification

Collaboratively turn a rough idea into an actionable implementation. Resolve consequential product, UX, behavior and architectural uncertainty, save agreed constraints in shared state, then implement the task through NEEF's normal verification, Git and recommendation workflow. This is part of NEEF; use native questions rather than another interview skill or dependency. Create no specification documents or project-local interview files.

## Inspect before asking

Read applicable instructions, relevant code and tests, current NEEF state, and established user preferences. Discover facts yourself. Ask only about decisions whose alternatives materially affect behavior, scope, design or cost and cannot be resolved from that evidence. An established decision or requirement to preserve behavior settles that question, including in deep mode. Ask no reconfirmation or adjacent policy questions about settled behavior. Deep mode increases inspection depth, not task scope. Leave all inputs and behavior outside the requested change unchanged without asking about them. Make routine decisions autonomously. Clear requests need zero questions, even with an explicit shape invocation. If `shape` has no task, request the missing task rather than inventing one.

## Adapt the depth

- `shape <task>`: ask at most five questions total for this task, usually one to three. Stop sooner when sufficiently clear.
- `shape --deep <task>`: follow dependencies between decisions, challenge unsupported assumptions and examine meaningful architectural tradeoffs and edge cases. There is no numeric question target or cap; stop when further questioning provides diminishing value or the user stops the interview.
- Ordinary development: ask at most two targeted questions when consequential ambiguity cannot safely be resolved. Do not turn a clear or simple request into an interview or silently upgrade to deep shaping.

Counts span resumed turns, not just the current response. Never ask merely to reach a limit. At a cap, proceed with settled constraints and safe conventional choices; record a concrete blocker if unresolved uncertainty prevents safe implementation. Do not exceed the cap, fabricate agreement or seek another planning approval.

## One question, then wait

Choose the most consequential unresolved decision whose prerequisites are settled. Ask one question at a time, with concrete choices and a recommended answer plus brief reasoning tied to the code or goal. Distinguish assumptions about user impact from observed facts. Include the recommendation in the question or first choice. Do not bundle independent decisions into one question.

Use a native question tool when available: Codex `request_user_input_async` (or `request_user_input` only in a supported mode), or Claude `AskUserQuestion`. Otherwise ask one question in chat and await the answer. Do not invent tool availability. A pending, preselected, cancelled or unanswered choice is not agreement; never treat timeout as an answer. Continue only independent inspection while waiting. Do not implement behavior that depends on an unanswered question.

After each actual answer, update the constraints and reconsider whether any meaningful uncertainty remains. Do not repeat answered questions. New questions must follow unresolved dependencies rather than revisit settled choices without new conflicting evidence.

## Persist and proceed

Use `state-write` with the current revision, consistent task title and `progress:"active"`. A baseline is not required to save discussion state: use baseline:null until implementation needs begin. Persist the pending question before asking it. Keep concise agreed constraints in `decisions`. While waiting, record the mode, questions asked/limit, one pending question and any discussion-only boundary in the existing task `next` field; either agent can then resume without resetting the count or repeating questions. Save answers before asking another question or implementing. Retain earlier decisions when updating them; do not store a transcript or overwrite another unfinished task silently.

Read saved decisions on resumption and treat them as implementation constraints. If a task title changes, explicitly carry the same task's decisions forward; a genuinely new task must not inherit unrelated constraints.

Once sufficiently clear, summarize the agreed decisions concisely, persist them in decisions, then begin implementation automatically with a safe baseline; do not ask for approval of the interview summary or require another prompt. Clear the pending-question marker when moving into implementation. An explicit discussion-only request ends with saved decisions and no implementation; do not mark the unimplemented feature complete. Retain that boundary on resumption until the user requests implementation. If the user stops questions, implement what is safely specified and record any remaining blocker. An instruction to stop work or pause must be honored rather than treated as permission to implement.

After implementation, evaluate and persist grounded next recommendations and use NEEF's normal completion report. Interview decisions never authorize destructive operations, pushing, merging or expansion beyond the requested task.
