#!/usr/bin/env node
// Opt-in live host validation. Never included in the ordinary unit test suite.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = path.join(source, '.test-artifacts', `hosts-${Date.now()}`);
fs.mkdirSync(artifacts, { recursive: true });
const shared = path.join(artifacts, 'shared');
const setup = process.argv.includes('--setup');
const aliases = process.argv.includes('--alias');
const discovery = process.argv.includes('--next-discovery');
const blocked = process.argv.includes('--next-blocked');
const exhausted = process.argv.includes('--next-exhausted');
const next = process.argv.includes('--next') || discovery || blocked || exhausted;
const active = process.argv.includes('--next-active');
const helper = path.join(os.homedir(), '.neef/neef.mjs');

function git(root, args) {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stdout.trim();
}

async function run(host) {
  const root = path.join(artifacts, host);
  fs.mkdirSync(root);
  git(root, ['init', '-q']);
  git(root, ['config', 'user.name', 'Neef Smoke']);
  git(root, ['config', 'user.email', 'neef-smoke@example.invalid']);
  git(root, ['config', 'commit.gpgsign', 'false']);
  git(root, ['config', 'core.hooksPath', '.no-hooks']);
  fs.writeFileSync(path.join(root, 'index.mjs'), 'export function greet() { return "Hello, world!"; }\n');
  fs.writeFileSync(path.join(root, 'index.test.mjs'), 'import { test } from "node:test";\nimport assert from "node:assert/strict";\nimport { greet } from "./index.mjs";\ntest("greeting", () => assert.equal(greet(), "Hello, world!"));\n');
  const files = ['index.mjs', 'index.test.mjs'];
  if (next || active) {
    fs.writeFileSync(path.join(root, 'README.md'), '# Greeting sample\n\nThe user goal is a small greeting module. The base greeting returns Hello, world!; the remaining feature is optional name support with unchanged default output and a focused named-greeting test. The sample is complete once both behaviors work.\n');
    files.push('README.md');
  }
  if (discovery || blocked) {
    fs.mkdirSync(path.join(root, '.planning'));
    fs.writeFileSync(path.join(root, '.planning/ROADMAP.md'), blocked
      ? '# Required goal\nReplace the greeting with text fetched from the private greeting service. The owner must supply the URL; it is absent from this repository. No local substitute or other feature is wanted. No phase plan exists.\n'
      : '# Required goal\nPhase 2 has no plan: add optional name support without changing the default greeting. Determine whether the current function accepts names by inspecting index.mjs and verifying its behavior. That dependency must be resolved first.\n');
    fs.writeFileSync(path.join(root, 'README.md'), '# Greeting sample\n\n.planning/ROADMAP.md defines the remaining required goal. Do not add optional features beyond it.\n');
    files.push('.planning/ROADMAP.md');
  }
  if (exhausted) fs.writeFileSync(path.join(root, 'README.md'), '# Greeting sample\n\nThe sole goal is greet() returning Hello, world! with a passing test. It is already complete. No optional features are wanted.\n');
  if (setup) {
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ type: 'module', main: 'index.mjs',
      scripts: { build: 'node expensive.mjs', test: 'node expensive.mjs', lint: 'node expensive.mjs', deploy: 'node expensive.mjs' } }));
    fs.writeFileSync(path.join(root, 'AGENTS.md'), 'Keep greeting behavior in index.mjs and focused tests in index.test.mjs. Project commands are expensive; discover them without execution during setup.\n');
    fs.writeFileSync(path.join(root, 'expensive.mjs'), 'import fs from "node:fs"; fs.writeFileSync("COMMAND_WAS_RUN", "unexpected execution");\n');
    files.push('package.json', 'AGENTS.md', 'expensive.mjs');
  }
  git(root, ['add', '--', ...files]);
  git(root, ['commit', '-qm', 'Initial fixture']);
  const initial = git(root, ['rev-parse', 'HEAD']);
  const env = { ...process.env, NEEF_HOME: shared };
  delete env.CLAUDECODE;
  fs.mkdirSync(shared, { recursive: true });
  if (next || active) {
    const seeded = spawnSync(process.execPath, [helper, 'state-write', 'missing'], { cwd: root, env, encoding: 'utf8', input: JSON.stringify({
      task: 'Implement the base greeting', progress: active ? 'active' : 'complete',
      decisions: 'README.md defines the greeting sample goal.', verification: 'Base greeting fixture test passes.', next: active ? 'Finish the original base greeting task.' : '',
      recommendations: exhausted
        ? { primary: null, alternatives: [], reason: 'README.md defines only the already-completed base greeting; no supported work remains.' }
        : discovery || blocked
        ? { primary: { kind: 'RECOMMENDED', action: 'Run /gsd:verify-work and /gsd:plan-phase 2, then invoke /neef next again.', reason: '.planning/ROADMAP.md defines the remaining goal but has no phase plan.' }, alternatives: [] }
        : { primary: { kind: 'RECOMMENDED', action: 'Implement greet() returning Hello, world! and a focused test.', reason: 'README.md requires the base greeting in index.mjs.' },
          alternatives: [{ kind: 'RECOMMENDED', action: 'Add an optional name parameter to greet(name = "world"), preserve greet() output, and extend index.test.mjs with a named-greeting test.', reason: 'README.md identifies optional name support as the remaining user goal.' }] },
    }) });
    if (seeded.status) throw new Error(seeded.stdout + seeded.stderr);
  }
  const prefix = host === 'claude' ? '/neef' : '$neef';
  const invoke = mode => `${prefix}${aliases ? '-' : ' '}${mode}`;
  const task = aliases ? invoke('task') : prefix;
  const prompt = next || active ? invoke('next') : setup ? invoke('setup') : host === 'claude'
    ? `${task} Change greet() to return "Hello, Neef!", update its existing test, verify and commit. Work only in this disposable project.`
    : `${task} Add an optional name parameter to greet(name), defaulting to "world". Preserve greet() output, add a focused named-greeting test, verify and commit. Work only in this disposable project.`;
  const args = host === 'claude'
    ? ['-p', '--output-format', 'stream-json', '--verbose', '--allowedTools', 'Read,Edit,Write,Bash,Skill']
    : ['exec', '--ephemeral', '--json', '--approve-for-me', '--add-dir', shared, '-'];
  const command = process.platform === 'win32' ? 'cmd.exe' : host;
  const commandArgs = process.platform === 'win32' ? ['/d', '/s', '/c', [host, ...args].map(arg => /\s/.test(arg) ? `"${arg}"` : arg).join(' ')] : args;
  fs.writeFileSync(path.join(artifacts, `${host}.prompt.txt`), prompt);
  const out = fs.openSync(path.join(artifacts, `${host}.jsonl`), 'w');
  const err = fs.openSync(path.join(artifacts, `${host}.stderr.txt`), 'w');
  const child = spawn(command, commandArgs, { cwd: root, env, stdio: ['pipe', out, err], windowsHide: true });
  child.stdin.on('error', () => {});
  child.stdin.end(prompt);
  const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', resolve); });
  fs.closeSync(out); fs.closeSync(err);
  const checks = setup || active ? { status: null } : spawnSync(process.execPath, ['--test'], { cwd: root, encoding: 'utf8' });
  const result = { host, code, root, initial, head: git(root, ['rev-parse', 'HEAD']),
    status: git(root, ['status', '--porcelain']), checks: checks.status,
    state: fs.existsSync(path.join(shared, 'state')) ? fs.readdirSync(path.join(shared, 'state')) : [] };
  const status = spawnSync(process.execPath, [helper, 'status'], { cwd: root, env, encoding: 'utf8' });
  const saved = status.status === 0 ? JSON.parse(status.stdout).state : null;
  const messages = fs.readFileSync(path.join(artifacts, `${host}.jsonl`), 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
  const finalMessage = host === 'claude' ? messages.findLast(message => message.type === 'result')?.result || ''
    : messages.findLast(message => message.item?.type === 'agent_message')?.item.text || '';
  // Match the Run directive, not explanatory mentions of the command.
  result.continuationCommand = active ? /(?:\$neef|\/neef) continue/.test(finalMessage)
    : /(?:^|\n)\s*(?:[-*]\s*)?(?:\*\*)?(?:Run:?(?:\*\*)?\s*)?`?(?:\$neef|\/neef) next\b/i.test(finalMessage);
  result.contextDepth = saved?.context?.depth;
  if (exhausted) {
    result.passed = code === 0 && checks.status === 0 && result.head === initial && result.status === ''
      && !result.continuationCommand && saved?.progress === 'complete'
      && saved.recommendations?.primary === null && !!saved.recommendations.reason;
  } else if (blocked) {
    result.passed = code === 0 && result.head === initial && result.status === ''
      && !result.continuationCommand && /\bURL\b/i.test(finalMessage)
      && saved?.progress === 'active' && /\bURL\b/i.test(saved.blockers) && !!saved.next;
  } else if (active) {
    result.passed = code === 0 && result.head === initial && result.status === '' && saved?.progress === 'active' && saved?.task === 'Implement the base greeting' && result.continuationCommand;
  } else if (setup) {
    result.setup = { depth: saved?.context?.depth, architecture: saved?.context?.architecture,
      noCommands: !fs.existsSync(path.join(root, 'COMMAND_WAS_RUN')), task: saved?.task };
    result.passed = code === 0 && result.head === initial && result.status === '' && result.setup.noCommands
      && result.setup.depth === 'full' && !!result.setup.architecture && result.setup.task === '';
  } else {
    result.recommendations = saved?.recommendations;
    result.passed = code === 0 && checks.status === 0 && result.head !== initial && result.status === ''
      && saved?.context?.depth === 'minimal' && saved.progress === 'complete' && !!saved.task && !!saved.recommendations;
    result.passed = result.passed && (saved?.recommendations?.primary ? result.continuationCommand : !result.continuationCommand);
    if (next) {
      const behavior = spawnSync(process.execPath, ['--input-type=module', '-e', 'import assert from "node:assert/strict"; import {greet} from "./index.mjs"; assert.equal(greet(), "Hello, world!"); assert.equal(greet("Ada"), "Hello, Ada!");'], { cwd: root, encoding: 'utf8' });
      result.passed = result.passed && behavior.status === 0;
    }
  }
  if (!result.passed) process.exitCode = 1;
  fs.writeFileSync(path.join(artifacts, `${host}.result.json`), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
}

console.log(JSON.stringify({ artifacts }));
await Promise.all((process.argv.includes('--codex-only') ? ['codex'] : ['claude', 'codex']).map(run));
