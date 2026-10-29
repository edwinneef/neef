# Write a ready-to-paste prompt

Done means the user has one copyable NEEF command that a fresh session can act on without this conversation. Writing the prompt ends the mode. Do not run it, start a task, edit files, change Git or write external state, including recommendations. Unlike `options <goal>`, which names the best command, this mode writes the full request inside it.

## Ground the request

Read applicable instructions and helper `status`, then inspect only the code, tests and documents needed to make the request concrete: the files or areas involved, existing patterns to follow and the checks that prove it works. Use current goals and unfinished work as context. When the idea matches an unfinished task, say so and prefer the host's `neef next`. Never invent files, commands or behavior; mark an unconfirmed fact as an assumption inside the prompt.

Ask for the idea when it is missing. Ask one targeted question only when the answer changes the mode or the core outcome; otherwise state a reasonable assumption in the prompt and continue.

## Choose the mode

Use the same routing as `references/advisor.md`: a direct task for a clear change, shape for consequential open decisions, auto for answering everything up front and building hands-off, prototype for an isolated demo, plan for a saved roadmap that stops, challenge for a critique, review for checking committed work. Add flags such as `--deep` or `--discuss` only when the idea calls for them.

## Write the prompt

Render the command in the current host's syntax (`/neef …` in Claude Code, `$neef …` in Codex) inside one fenced block so it copies cleanly. Keep the user's intent and wording where it is already clear. In plain sentences, without headings, cover:

- **Goal:** the observable result, in one sentence.
- **Scope:** the files, areas or behavior involved, and what stays out.
- **Done when:** concrete checks or results that prove it works.
- **Constraints:** patterns, compatibility, tools or limits that must hold.

Keep it as short as the work allows; a small change needs one or two sentences. After the block, say in one line why that mode fits. Add at most one alternative command, only when a meaningful tradeoff exists, with when to prefer it.
