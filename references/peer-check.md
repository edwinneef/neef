# Check with the other agent

Whenever NEEF asks the user to approve something, such as a plan sign-off or a prototype concept, add one extra choice beside approve and request changes: **Check with the other agent first**. Offer it only once per approval round, as a non-default option; approval stays the recommended first option when NEEF's own challenge found nothing open.

Choosing it is not approval. It only sends the item under approval for a read-only second opinion, then asks again.

## Pick the reviewer

Choosing the check opens two native questions in turn, because the question tool holds at most four choices. Without a native question tool, show both steps as numbered lists in chat and stop.

**Step 1 · agent:** Codex or Claude. Recommend the host's opposite first (Codex from Claude Code, Claude from Codex).

**Step 2 · setting:** the chosen agent's three settings, in this order, first recommended:

| Agent | Setting | Flags |
| --- | --- | --- |
| Claude | Fable 5.2 high | `--model claude-fable-5-2 --effort high` |
| Claude | Opus 5.5 high | `--model claude-opus-5-5 --effort high` |
| Claude | Sonnet 5.5 medium | `--model claude-sonnet-5-5 --effort medium` |
| Codex | gpt-6-astra high | `-m gpt-6-astra -c model_reasoning_effort=high` |
| Codex | gpt-6.1-terra xhigh | `-m gpt-6.1-terra -c model_reasoning_effort=xhigh` |
| Codex | gpt-6.1-sol medium | `-m gpt-6.1-sol -c model_reasoning_effort=medium` |

## Run the check

1. Write the item exactly as shown for approval, plus the goal, agreed decisions and relevant file paths, into one prompt. Ask for concrete problems only: wrong assumptions against source, missing edge cases, simpler alternatives, unverifiable acceptance criteria. Tell it not to edit files and to answer in at most 15 bullets.
2. Run the chosen agent's CLI read-only from the project folder with the picked setting's flags, with a finite timeout (about 10 minutes). A CLI run is a fresh session, even when it is the host's own agent:
   - Codex: `codex exec --sandbox read-only --ephemeral <flags> -C "<project>" -o "<tmp>/peer.md" -` with the prompt on stdin.
   - Claude: `claude -p --permission-mode plan <flags>` with the prompt on stdin, run in the project folder.
3. If the CLI is missing, rejects the model or setting, fails or times out, say so in one line, then run the same prompt through a fresh native subagent of the current host instead and label the result as same-model.

The check makes no project edits, commits, task-state writes or extra installs. A host permission prompt for running the other CLI is the user's to answer; a denial ends the check without retrying, and the approval question returns without it.

## Use the result

Verify each finding against source before acting on it; the other agent can be wrong. Fold supported fixes into the item (for a plan: update and re-save it per `references/plan.md`).

Then show the updated summary with a "Second opinion" section, rendered as Markdown with room to breathe. Start with a `### Second opinion · <agent> · <setting>` heading (or `same-model` for the fallback), then one count line, such as `6 points — 3 applied · 1 partly · 2 rejected`. Below it, list every finding once, grouped by outcome, keeping the reviewer's order within each group. Number findings continuously across groups. Put a blank line after each group heading and between findings; indent the outcome under its finding:

```markdown
### Second opinion · Codex · gpt-6-astra high
6 points — 3 applied · 1 partly · 2 rejected

**✅ Applied**

1. **<finding in a few words>**
   → <what changed, and where: phase, decision or criterion>

**🟡 Partly applied**

2. **<finding>**
   → <what was taken>; <what was left out and why>

**❌ Rejected**

3. **<finding>**
   → <one-line reason, citing the source fact when one settles it>
```

Merge duplicate findings into one line. Omit an empty group. Use plain words from the active explanation style, not the reviewer's jargon. Then ask the same approval question again. That second question offers only approve or request changes.
