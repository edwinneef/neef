# Execute the next useful action

Done means useful work was performed and its evidence saved, or a concrete reason that no safe action is possible was established. Refreshing advice alone is not progress.

## Discover and choose

Revalidate saved candidates against current code, tests, user goals and instructions. An empty candidate list or a saved no-action reason requires discovery; it does not establish that the project is finished. Inspect relevant project documents, including existing GSD files under `.planning/`, for actual goals, constraints, dependencies and unfinished requirements. Rank by user value and what unlocks essential work, rather than roadmap phase number. Distinguish essential unfinished work from optional enhancements; do not invent requirements to keep busy. The saved `boldIdea` returned by `next` is context, not a candidate: work on it only when the user asks.

Extract the intended outcome from advice referencing an external orchestrator. Use Neef's native investigation, implementation and verification workflow to achieve it. GSD roadmaps and plans supply context, not an implicit requirement to run GSD commands. Respect explicit user requirements and mandatory project instructions, including required tools or gates. If they prevent safe execution, identify the exact constraint instead of silently bypassing it.

## Act on uncertainty

A missing plan is a reason to perform research when the goal is established. Resolve technical dependencies through code inspection, research or focused verification. Explore the smallest question that determines the implementation, using existing code and documented requirements as evidence. Research, code exploration, dependency resolution, implementation and verification all count as actionable work. A fully planned feature is not a prerequisite.

Choose one bounded action with an observable result. Record the task active with `state-write`. Before editing project files, obtain a fresh `begin` baseline and save it, preserving all existing Git safety checks. Execute the action in this invocation. If investigation makes the scoped implementation clear and safe, carry it through verification rather than stopping at a proposal. If it reveals a dependency, investigate that dependency before treating the candidate as blocked. Re-evaluate other supported work when one candidate is unavailable.

Ask only when essential information cannot be obtained autonomously, or required authority is missing. Never invent findings to avoid asking. For a genuine blocker, save the exact missing fact or permission, evidence of what was checked, and the smallest user action that unlocks it. A host permission, sandbox or policy denial, including automatic approval review, is that kind of blocker: record the denied action and the exact refusal, and do not diagnose it, retry it or seek another route to the same capability. Chat authorization does not override a host decision. Keep unfinished scope active with that input in `next` and the constraint in `blockers`. Do independent safe work first. When all established goals are satisfied and no justified follow-up exists, record that conclusion with source evidence; manufacture no work.

## Save the result and what follows

Persist actual findings, changes and verification in task state. Research-only progress must name the question answered, supporting files or checks, and its implication; a task title or an untested guess is not evidence. Keep original REQUIRED scope active until finished. For a completed investigation, save one clear executable recommendation for the resulting development outcome. Its action names the work and intended result; its reason cites the established goal and current evidence. Use `recommendations-write` only when no task work occurred, such as documenting exhausted goals.

Never recommend invoking `neef next` again when this invocation performed no meaningful action. If the same recommendation returns without progress, investigate why it could not execute and resolve that cause or report the concrete blocker. When the cause is a denial or the same saved blocker, report it unchanged and stop rather than proposing another variant. Rewording it, forwarding a GSD command, or selecting the next numbered phase is not a completed action. Save `primary:null` with a source-backed reason when no safe action remains, rather than a procedural loop.
