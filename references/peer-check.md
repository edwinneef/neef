# Check with the other agent

Whenever NEEF asks the user to approve something, such as a plan sign-off or a prototype concept, add one extra choice beside approve and request changes: **Check with the other agent first**. Claude Code checks with Codex; Codex checks with Claude. Offer it only once per approval round, as a non-default option; approval stays the recommended first option when NEEF's own challenge found nothing open.

Choosing it is not approval. It only sends the item under approval for a read-only second opinion, then asks again.

## Run the check

1. Write the item exactly as shown for approval, plus the goal, agreed decisions and relevant file paths, into one prompt. Ask for concrete problems only: wrong assumptions against source, missing edge cases, simpler alternatives, unverifiable acceptance criteria. Tell it not to edit files and to answer in at most 15 bullets.
2. Run the other agent read-only from the project folder, with a finite timeout (about 10 minutes):
   - From Claude Code: `codex exec --sandbox read-only --ephemeral -C "<project>" -o "<tmp>/peer.md" -` with the prompt on stdin.
   - From Codex: `claude -p --permission-mode plan` with the prompt on stdin, run in the project folder.
3. If the other agent's CLI is missing, fails or times out, say so in one line, then run the same prompt through a fresh native subagent of the current host instead and label the result as same-model.

The check makes no project edits, commits, task-state writes or extra installs. A host permission prompt for running the other CLI is the user's to answer; a denial ends the check without retrying, and the approval question returns without it.

## Use the result

Verify each finding against source before acting on it; the other agent can be wrong. Fold supported fixes into the item (for a plan: update and re-save it per `references/plan.md`).

Then show the updated summary with a "Second opinion" section. Its first line names the agent (or same-model fallback) and the count, such as `Codex · 6 points: 3 applied, 1 partly, 2 rejected`. Below it, list every finding once, grouped by outcome, keeping the reviewer's order within each group:

```
Applied
  ✓ <finding in a few words> → <what changed, and where: phase, decision or criterion>
Partly applied
  ◐ <finding> → <what was taken> · <what was left out and why>
Rejected
  ✗ <finding> → <one-line reason, citing the source fact when one settles it>
```

Merge duplicate findings into one line. Omit an empty group. Use plain words from the active explanation style, not the reviewer's jargon. Then ask the same approval question again. That second question offers only approve or request changes.
