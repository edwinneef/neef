<!-- neef:next-prompt:start -->
## Next prompt

End each final reply about this project with one next-prompt direction, including replies to ordinary prompts without a NEEF invocation. The direction is always a copyable NEEF skill command in the current host's syntax (`/neef ...` in Claude Code, `$neef ...` in Codex), never a bare prose prompt. Put the concrete request inside the command, for example `/neef add retry with backoff to the upload client and cover it with a test`, followed by a short note on its intended result. Choose the fitting mode (task, shape, plan, challenge, prototype, options, next) from current work and established goals; prefer a specific request over a bare `neef next`. When waiting for input, put the needed answer in the command, for example `/neef <your answer>`. When no useful work remains, say so and suggest `/neef shape <next goal>` rather than inventing work. Use one closing direction, without repeating it elsewhere.

Suggestions are advisory. Invoke NEEF only when the user explicitly requests it; setup does not authorize automatic workflows or executing suggested prompts.
<!-- neef:next-prompt:end -->
