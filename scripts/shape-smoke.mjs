#!/usr/bin/env node
// Opt-in host conversations in disposable projects; not part of npm test.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runHost } from './host-smoke.mjs';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = path.join(source, '.test-artifacts', `shape-${Date.now()}`);
const shared = path.join(artifacts, 'shared');
const helper = path.join(os.homedir(), '.neef/neef.mjs');
const deep = process.argv.includes('--deep');
const discussion = process.argv.includes('--discussion-only') || process.argv.includes('--discuss');
const starters = process.argv.includes('--starters');
const challenge = process.argv.includes('--challenge');
const clear = challenge || process.argv.includes('--clear');
const automatic = process.argv.includes('--automatic');
fs.mkdirSync(shared, { recursive: true });

function git(root, args) {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', timeout: 30000 });
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stdout.trim();
}

async function run(host) {
  const root = path.join(artifacts, host);
  fs.mkdirSync(root);
  const env = { ...process.env, NEEF_HOME: shared };
  delete env.CLAUDECODE;
  git(root, ['init', '-q', '-b', 'main']);
  git(root, ['config', 'user.name', 'Neef Shape Smoke']);
  git(root, ['config', 'user.email', 'neef-shape@example.invalid']);
  git(root, ['config', 'commit.gpgsign', 'false']);
  git(root, ['config', 'core.hooksPath', '.no-hooks']);
  fs.writeFileSync(path.join(root, 'index.mjs'), 'export function greet(name = "world") { return `Hello, ${name}!`; }\n');
  fs.writeFileSync(path.join(root, 'index.test.mjs'), 'import { test } from "node:test";\nimport assert from "node:assert/strict";\nimport { greet } from "./index.mjs";\ntest("default", () => assert.equal(greet(), "Hello, world!"));\ntest("named", () => assert.equal(greet("Ada"), "Hello, Ada!"));\n');
  fs.writeFileSync(path.join(root, 'README.md'), clear || automatic
    ? '# Greeting sample\nThe sample is complete once its default greeting is Hello, Neef! and named greetings remain unchanged.\n'
    : '# Published greeting API\nClients use greet(name). Blank strings currently produce literal empty or whitespace names. Whether the new blank-name policy must preserve that behavior has not been decided. Nonblank names and the omitted argument must remain unchanged. The sample is complete once a blank-name policy is agreed, implemented and tested.\n');
  git(root, ['add', '--', 'index.mjs', 'index.test.mjs', 'README.md']);
  git(root, ['commit', '-qm', 'Initial fixture']);
  const initial = git(root, ['rev-parse', 'HEAD']);
  const initialBranch = git(root, ['branch', '--show-current']);
  const state = () => {
    const result = spawnSync(process.execPath, [helper, 'status'], { cwd: root, env, encoding: 'utf8', timeout: 30000 });
    if (result.status !== 0) throw new Error(result.stdout);
    return JSON.parse(result.stdout).state;
  };
  async function turn(prompt, number, session) {
    // Headless conversations exercise the documented chat-question fallback.
    const stem = path.join(artifacts, `${host}-${number}`);
    const code = await runHost({ host, root, shared, prompt, stem, env, session, ephemeral: false, chatQuestions: true });
    const events = fs.readFileSync(`${stem}.jsonl`, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
    const final = host === 'claude' ? events.findLast(event => event.type === 'result')?.result || ''
      : events.findLast(event => event.item?.type === 'agent_message')?.item.text || '';
    const id = host === 'claude' ? events.find(event => event.session_id)?.session_id : events.find(event => event.type === 'thread.started')?.thread_id;
    return { code, final, session: id || session };
  }

  const invocation = host === 'claude' ? '/neef' : '$neef';
  const task = clear || automatic ? 'Change only the default greeting to Hello, Neef!, update its focused test, and preserve named greetings.'
    : 'Handle empty and whitespace-only names in the published greet API.';
  const prompt = challenge
    ? `${invocation} challenge${deep ? ' --deep' : ''} Evaluate the greeting implementation against README.md and recommend the highest-value improvement. Save actionable advice for next.`
    : `${invocation}${automatic ? '' : ` shape${deep ? ' --deep' : ''}${discussion ? ' --discuss' : ''}`}${starters ? '' : ` ${task}`}`;
  const first = await turn(prompt, 1);
  if (starters) {
    const saved = state();
    const result = { host, root, first, head: git(root, ['rev-parse', 'HEAD']), status: git(root, ['status', '--porcelain']), state: saved };
    result.passed = first.code === 0 && result.head === initial && result.status === '' && !saved
      && (first.final.match(/^\s*[1-3][.)]\s+/gm) || []).length === 3 && /greet|name/i.test(first.final);
    fs.writeFileSync(path.join(artifacts, `${host}.result.json`), JSON.stringify(result, null, 2));
    console.log(JSON.stringify({ host, passed: result.passed, first: first.final, root }));
    if (!result.passed) process.exitCode = 1;
    return;
  }
  let waiting;
  let second;
  if (!clear && !automatic) {
    waiting = { head: git(root, ['rev-parse', 'HEAD']), status: git(root, ['status', '--porcelain']), state: state(), question: first.final };
    if (first.code === 0 && first.session) second = await turn('Use the default world for empty or whitespace-only strings. Changing the old blank-name behavior is intentional.', 2, first.session);
  }
  if (challenge) {
    const advice = state();
    const inspection = { head: git(root, ['rev-parse', 'HEAD']), branch: git(root, ['branch', '--show-current']), status: git(root, ['status', '--porcelain']), state: advice };
    const readOnly = first.code === 0 && inspection.head === initial && inspection.branch === initialBranch
      && inspection.status === '' && !!advice?.recommendations?.primary && !advice?.task && !advice?.baseline;
    const followup = readOnly ? await turn(`${invocation} next`, 2) : null;
    const saved = state();
    const behavior = spawnSync(process.execPath, ['--input-type=module', '-e', 'import assert from "node:assert/strict"; import {greet} from "./index.mjs"; assert.equal(greet(), "Hello, Neef!"); assert.equal(greet("Ada"), "Hello, Ada!");'], { cwd: root, encoding: 'utf8', timeout: 30000 });
    const passed = readOnly && followup?.code === 0 && behavior.status === 0 && saved?.progress === 'complete'
      && git(root, ['rev-parse', 'HEAD']) !== initial && git(root, ['status', '--porcelain']) === '';
    fs.writeFileSync(path.join(artifacts, `${host}.result.json`), JSON.stringify({ host, root, passed, first, inspection, followup, saved }, null, 2));
    console.log(JSON.stringify({ host, passed, readOnly, root, first: first.final }));
    if (!passed) process.exitCode = 1;
    return;
  }
  const saved = state();
  const result = { host, root, first, waiting, second, head: git(root, ['rev-parse', 'HEAD']), status: git(root, ['status', '--porcelain']), state: saved };
  result.changedFiles = git(root, ['diff', '--name-only', initial, result.head]).split('\n').filter(Boolean);
  if (discussion) {
    const resume = second?.code === 0 && second.session ? await turn(`${invocation} next`, 3, second.session) : null;
    result.resume = resume;
    result.state = state();
    result.head = git(root, ['rev-parse', 'HEAD']);
    result.status = git(root, ['status', '--porcelain']);
    result.passed = first.code === 0 && second?.code === 0 && waiting?.head === initial && waiting.status === ''
      && result.head === initial && result.status === '' && saved?.progress === 'active' && !!saved.decisions && !/\?/.test(second.final)
      && resume?.code === 0 && result.state?.progress === 'active' && /discuss|do not implement/i.test(result.state.next);
  } else {
    const tests = spawnSync(process.execPath, ['--test'], { cwd: root, encoding: 'utf8', timeout: 30000 });
    const expression = clear || automatic ? 'assert.equal(greet(), "Hello, Neef!"); assert.equal(greet("Ada"), "Hello, Ada!");'
      : 'assert.equal(greet(""), "Hello, world!"); assert.equal(greet("  "), "Hello, world!"); assert.equal(greet("Ada"), "Hello, Ada!");';
    const behavior = spawnSync(process.execPath, ['--input-type=module', '-e', `import assert from "node:assert/strict"; import {greet} from "./index.mjs"; ${expression}`], { cwd: root, encoding: 'utf8', timeout: 30000 });
    result.passed = first.code === 0 && result.head !== initial && result.status === '' && tests.status === 0 && behavior.status === 0
      && saved?.progress === 'complete' && !!saved.recommendations;
    if (!clear && !automatic) result.passed = result.passed && second?.code === 0 && waiting?.head === initial && waiting.status === '' && !!saved.decisions;
  }
  result.passed = result.passed && result.changedFiles.every(file => ['index.mjs', 'index.test.mjs', 'README.md'].includes(file));
  if (!clear && !automatic) result.passed = result.passed && waiting?.state?.progress === 'active' && !!waiting.state.next;
  if (!result.passed) process.exitCode = 1;
  fs.writeFileSync(path.join(artifacts, `${host}.result.json`), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ host, passed: result.passed, first: first.final, second: second?.final, decisions: saved?.decisions, root }));
}

console.log(JSON.stringify({ artifacts }));
await Promise.all(['claude', 'codex'].map(run));
