#!/usr/bin/env node
// UserPromptSubmit hook for Claude Code and Codex: adds the weak-prompt rule to every prompt.
// It only adds context; it never blocks a prompt, and it stays silent on bad input or NEEF_GATE=off.
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const rule = `NEEF prompt check. Before acting on the user's message, check it, unless it is an informational question, a reply that only answers your own question, a command (such as /neef status), or a tiny change that names the exact edit. Those pass unchecked. A question that asks for work ("can you rebuild the dashboard?") is a work request, and a reply that adds work ("yes, and add billing") is a new work request for the added part.

A work request is weak when any of these hold:
1. No clear result: it does not say what should be different afterwards.
2. No way to tell it is done: nothing to check the result against.
3. Too big for one task: it needs several dependent steps.
4. Several tasks in one: unrelated requests joined together. One outcome with its own check ("fix the bug and add its test") is one task.

For 1 and 2: read the code, draft the missing answers yourself, show them in one line ("Understood as: ...; done when ..."), and ask only what is the owner's to decide. Build nothing that depends on an unanswered question.
For 3: offer to plan it first. For 4: offer to split it and name the parts.
If the user replies "go", continue the pending proposal on your best guess with the same scope, say what you assumed, and do not check again. "go" never grants approvals that were needed anyway, such as pushing, deleting or widening the scope.
If nobody can answer, as in an unattended run, proceed on your best guess and list the assumptions.
A prompt that passes gets no comment: just do the work.`;

export function gate(input, env = process.env) {
  if (env.NEEF_GATE === 'off') return '';
  let event;
  try { event = JSON.parse(input); } catch { return ''; }
  if (!event || typeof event !== 'object' || Array.isArray(event)) return '';
  return JSON.stringify({ hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: rule } });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => { input += chunk; });
  process.stdin.on('end', () => { process.stdout.write(gate(input)); });
}
