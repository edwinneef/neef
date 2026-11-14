import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../scripts/gate.mjs', import.meta.url));
const run = (input, env = {}) => spawnSync(process.execPath, [script], {
  input, encoding: 'utf8', env: { ...process.env, NEEF_GATE: '', ...env },
});
const prompt = JSON.stringify({ session_id: 's', hook_event_name: 'UserPromptSubmit', prompt: 'make it better' });

test('gate adds the rule as UserPromptSubmit context and nothing that could block the prompt', () => {
  const result = run(prompt);
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.deepEqual(Object.keys(output), ['hookSpecificOutput']);
  assert.deepEqual(Object.keys(output.hookSpecificOutput), ['hookEventName', 'additionalContext']);
  assert.equal(output.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
});

test('gate rule carries every agreed clause and the boundary examples', () => {
  const rule = JSON.parse(run(prompt).stdout).hookSpecificOutput.additionalContext;
  const clauses = {
    'informational questions pass': /informational question/,
    'answer-only replies pass': /reply that only answers your own question/,
    'commands pass': /a command \(such as \/neef status\)/,
    'tiny exact changes pass': /tiny change that names the exact edit/,
    'work question example': /"can you rebuild the dashboard\?"\) is a work request/,
    'reply adding work example': /"yes, and add billing"\) is a new work request/,
    'test 1: no clear result': /1\. No clear result/,
    'test 2: no way to tell it is done': /2\. No way to tell it is done/,
    'test 3: too big': /3\. Too big for one task/,
    'test 4: several tasks': /4\. Several tasks in one/,
    'one outcome with its check is one task': /"fix the bug and add its test"\) is one task/,
    'draft the answers yourself': /draft the missing answers yourself/,
    'ask only owner decisions': /ask only what is the owner's to decide/,
    'no build on open questions': /Build nothing that depends on an unanswered question/,
    'too big gets a plan offer': /For 3: offer to plan it first/,
    'several tasks get a split offer': /For 4: offer to split it/,
    'go continues with the same scope': /replies "go", continue the pending proposal on your best guess with the same scope, say what you assumed/,
    'go grants no approvals': /"go" never grants approvals/,
    'unattended runs proceed': /If nobody can answer, as in an unattended run, proceed on your best guess and list the assumptions/,
  };
  for (const [name, pattern] of Object.entries(clauses)) assert.match(rule, pattern, name);
});

test('gate stays silent when turned off or given input it cannot read', () => {
  for (const [input, env] of [[prompt, { NEEF_GATE: 'off' }], ['not json', {}], ['null', {}], ['[]', {}], ['', {}]]) {
    const result = run(input, env);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, '', input);
  }
});
