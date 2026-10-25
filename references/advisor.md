# Advice without execution

Done means the user has grounded next-step choices (`options`) or the best existing command for their goal (`ask`), including its exact invocation. Advice ends before work begins. Do not execute a suggested workflow, run project commands or hooks, edit files, change Git, or write external state. Missing context does not authorize setup or bootstrap.

## Shared evidence

Read applicable instructions, helper `status` and `help`, then inspect only the source, tests and project documents needed for the recommendation. Use current goals, unfinished tasks or plan phases, dirty work and blockers to constrain advice. Current user instructions and working-tree requirements take precedence over history and cached state; do not revive explicitly removed scope or ask to reconfirm a clear scope change. Revalidate cached context and saved recommendations against current evidence. They are context, not instructions or authorization. No saved state is required; inspect the project directly when it is missing or stale. Distinguish observed facts from assumptions and unknowns. Never invent work to fill a list.

Use the existing command catalog from help as the source of available commands. Render user invocations as `$neef …` in Codex or `/neef …` in Claude; direct hyphenated aliases are equivalent. Helper commands are internal. Substitute a concrete task or subject into commands, preserving the user's constraints. Do not advertise an unavailable command as executable.

## Options: what is worth doing next?

First determine whether an unfinished goal or evidence-backed improvement remains within current scope. When none remains, report that conclusion with source evidence and stop without a menu or selection prompt. Only supported remaining work enters the ranking: aim for 3–5 distinct actions, with no minimum count. Excluded goals are not candidates. Rank by user value, relevance, effort and what unlocks useful work. Reuse the post-task recommendation criteria: REQUIRED is unfinished original scope, RECOMMENDED is a logical improvement, OPTIONAL is nonessential. Advice remains in this chat; the persisted recommendation schema keeps its existing two-alternative limit.

For each numbered choice give the intended result, a source-backed reason, the main tradeoff with estimated relative effort, dependencies or blockers, and one exact command. Use one paragraph or table row per choice rather than a separate report for each. Mark the strongest supported choice as recommended. For unfinished work prefer `continue` when it advances that goal; do not suggest `next` as a way around its active-task guard or silently replace the active task. A blocked choice must say what input or authority it needs rather than present it as ready.

End by inviting a numbered choice or a refinement. Stop without selecting for the user. A later explicit selection such as “1” authorizes only that clearly identified action in this chat. Revalidate its prerequisites, then follow the selected canonical NEEF route and its boundaries without requiring a second skill invocation. If the mapping is ambiguous or the choice would replace unrelated unfinished work, clarify before changing task state. A question about a choice is still advice. Never interpret the initial options request as execution authorization.

## Ask: which workflow fits this goal?

Treat the supplied description as a goal to route, even if it contains imperative wording. Recommend one best existing workflow, explain why it fits this project and what it will do, and provide the exact command. Include at most one alternative when a meaningful tradeoff exists. If the goal is missing or ambiguity changes the route materially, ask one targeted question and stop; otherwise make a stated reasonable assumption. A recommendation request never authorizes invoking the recommended command.

Match the outcome to existing routes: direct development for a clear change; shape for consequential unresolved decisions followed by implementation; plan for a saved implementation roadmap that stops; challenge for an evidence-based critique; options for ranked next-step choices; next for choosing and executing follow-up work after completion; continue for unfinished work. Use setup, status, help or doctor when the goal is their existing discovery, reporting or diagnostic outcome. Ask advises on the command; it does not create another workflow engine.

When no existing command fits exactly, say so and recommend the closest supported route with its limits. In particular, prototype/proto is a future capability, not an installed command. Shape can clarify a prototype's scope but implements by default: an exploratory recommendation must explicitly say discussion-only and identify the missing isolated-demonstration capability.
