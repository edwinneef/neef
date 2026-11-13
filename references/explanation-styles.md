# Explanation styles

The initial default is Simple. Change it with `$neef style simple`, `$neef style guided`, `$neef style technical` or `$neef style kid` in Codex; use `/neef` in Claude Code. `$neef style` shows the current choice. Add `--here` to set a style for the current project only, such as `$neef style kid --here`; it overrides the global default there, and `$neef style clear --here` removes it. An explicit request such as "use Technical for this task" overrides only that task. Apply the style to questions, progress updates and final replies, within the host's and user's instructions. Styles change explanations, never permissions, workflow or required evidence.

## Read or change the preference

Run helper `style` to read the effective style on every invocation: the project override when `scope` is `project`, otherwise the global default. An explicit task override takes precedence and never writes the preference. If reading fails, report that briefly, preserve the file and use Simple unless the task explicitly requests another style.

For `style [simple|guided|technical|kid] [--here]`, run helper `style` with the supplied name and flag, or without them to show the current style, its scope and the choices. A name saves the default across projects; with `--here` it saves an override for this project only. `style clear --here` removes the override. Report the result and stop; do not begin a task, commit or replace task state.

## Simple

Use short sentences and everyday words. Assume no programming knowledge; explain an unavoidable technical term where it appears. Lead with the practical result. Mention changed files briefly when required, and summarize checks and limitations in plain language. Be respectful, without baby talk. Omit implementation detail unless it is needed to act or the user asks for it.

## Guided

Lead with the result, then give numbered steps when action is needed. Explain the purpose of each step briefly. Include enough context to connect the user's action to the expected outcome, without a full account of the implementation.

## Technical

Explain what changed, the relevant files or functions, why that approach was chosen, and how it was verified. State material tradeoffs and remaining uncertainty. Use precise technical language, but keep the explanation focused on the task rather than narrating every tool call.

## Kid

Explain as you would to a curious 12-year-old. Use short sentences and everyday words. Give a familiar example or analogy for each new idea, such as comparing a commit to a save point in a game. Lead with what happened and why it matters. Replace jargon with plain words; when a term is needed, explain it in one sentence. Stay accurate and respectful, without baby talk. Keep every required instruction, warning and next step, written so a 12-year-old could follow them.

## When the user needs to act

First complete work the agent is already authorized and able to do. Make the remaining request self-contained in every style: say why the user's action or answer is needed, exactly where to act (app, page, control or working directory), the action or copyable command, the expected result, and what to report back. Supply only the fields relevant to that request; a preference question needs understandable choices, not a testing checklist. Never invent a control or path: inspect it or identify what is unknown.

Distinguish a required action from optional advice. For a test, state setup, whether anything must be running, and when to stop. For a decision, explain the meaningful difference between choices and recommend one. Shortening must not remove information needed to finish the step. Keep required instructions in the final reply as well as any earlier update, and end with the suggestions and backlog line required by the workflow, plus a bold idea when there is a new one.

Styles never change the report sections defined in `references/follow-up.md` (Report layout).
