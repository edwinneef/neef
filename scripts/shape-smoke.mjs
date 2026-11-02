#!/usr/bin/env node
// Opt-in host conversations in disposable projects; not part of npm test.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { installedHelper, runHost } from './host-smoke.mjs';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = path.join(source, '.test-artifacts', `shape-${Date.now()}`);
const shared = path.join(artifacts, 'shared');
const helper = installedHelper();
const deep = process.argv.includes('--deep');
const discussion = process.argv.includes('--discussion-only') || process.argv.includes('--discuss');
const starters = process.argv.includes('--starters');
const challenge = process.argv.includes('--challenge');
const review = process.argv.includes('--review');
const clear = challenge || review || process.argv.includes('--clear');
const automatic = process.argv.includes('--automatic');
const autoChange = process.argv.includes('--auto-change');
const auto = autoChange || process.argv.includes('--auto');
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
  fs.writeFileSync(path.join(root, 'README.md'), auto
    ? '# Greeting sample\nThe sample is complete once its default greeting is Hello, Neef!, named greetings remain unchanged, and farewell(name) returns Goodbye, <name>! with focused tests.\n'
    : clear || automatic
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
  const task = auto ? 'Change the default greeting to Hello, Neef!, add an exported farewell(name) returning Goodbye, <name>!, cover both with focused tests, and preserve named greetings.'
    : clear || automatic ? 'Change only the default greeting to Hello, Neef!, update its focused test, and preserve named greetings.'
    : 'Handle empty and whitespace-only names in the published greet API.';
  const prompt = review ? `${invocation} review`
    : challenge
    ? `${invocation} challenge${deep ? ' --deep' : ''} Evaluate the greeting implementation against README.md and recommend the highest-value improvement. Save actionable advice for next.`
    : auto ? `${invocation}-plan ${task}`
    : `${invocation}${automatic ? '' : ` shape${deep ? ' --deep' : ''}${discussion ? ' --discuss' : ''}`}${starters ? '' : ` ${task}`}`;
  let reviewed;
  if (review) {
    // A completed NEEF task whose commit misses one agreed decision: named greetings break.
    const neef = (args, input) => {
      const result = spawnSync(process.execPath, [helper, ...args], { cwd: root, env, input: input && JSON.stringify(input), encoding: 'utf8', timeout: 30000 });
      if (result.status !== 0) throw new Error(result.stdout);
      return JSON.parse(result.stdout);
    };
    const decisions = 'Default greeting becomes Hello, Neef!; named greetings stay Hello, <name>!; focused tests cover both.';
    const shaped = neef(['state-write', 'missing'], { task: 'Change the default greeting', progress: 'active', decisions });
    fs.writeFileSync(path.join(root, 'index.mjs'), 'export function greet() { return "Hello, Neef!"; }\n');
    fs.writeFileSync(path.join(root, 'index.test.mjs'), fs.readFileSync(path.join(root, 'index.test.mjs'), 'utf8').replace('"Hello, world!"', '"Hello, Neef!"'));
    git(root, ['commit', '-qam', 'Change the default greeting to Hello, Neef!']);
    reviewed = neef(['state-write', shaped.revision], { task: 'Change the default greeting', progress: 'complete', decisions, verification: 'Default greeting test passes',
      outcomes: [{ id: 'default', description: 'Default greeting is Hello, Neef!', required: true, status: 'passed', evidence: 'index.test.mjs default test' }],
      recommendations: { primary: null, alternatives: [], reason: 'Task complete.' } }).state;
  }
  const first = await turn(prompt, 1);
  if (review) {
    const saved = state();
    const head = git(root, ['rev-parse', 'HEAD']);
    const kept = ['task', 'progress', 'decisions', 'verification', 'start', 'head'].every(key => JSON.stringify(saved?.[key]) === JSON.stringify(reviewed[key]));
    const advice = `${JSON.stringify(saved?.recommendations?.primary)} ${first.final}`;
    const passed = first.code === 0 && kept && head === reviewed.head && git(root, ['branch', '--show-current']) === initialBranch
      && git(root, ['status', '--porcelain']) === '' && !!saved?.recommendations?.primary && /named|Ada|<name>/i.test(advice);
    fs.writeFileSync(path.join(artifacts, `${host}.result.json`), JSON.stringify({ host, root, passed, kept, first, reviewed, saved }, null, 2));
    console.log(JSON.stringify({ host, passed, kept, root, first: first.final }));
    if (!passed) process.exitCode = 1;
    return;
  }
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
  if (auto) {
    // Sign-off gate: a fresh next (or, with --auto-change, a change request) must not run an unsigned plan; approval then runs every phase.
    const snapshot = () => ({ head: git(root, ['rev-parse', 'HEAD']), branch: git(root, ['branch', '--show-current']), status: git(root, ['status', '--porcelain']), state: state() });
    const untouched = view => view.head === initial && view.branch === initialBranch && view.status === ''
      && view.state?.progress === 'active' && !view.state.baseline && /^plan:/.test(view.state.next || '') && !!view.state.plan?.phases?.length;
    const unsigned = snapshot();
    const change = 'Change the plan before I approve: calling farewell() with no name must return Goodbye, world!. Do not build yet.';
    const held = first.code === 0 && untouched(unsigned) ? await turn(autoChange ? change : `${invocation} next`, 2, autoChange ? first.session : undefined) : null;
    const resumed = held ? snapshot() : null;
    const replanned = !autoChange || (/approv/i.test(held?.final || '') && /Goodbye, world|farewell\(\)/i.test(`${JSON.stringify(resumed?.state?.plan)} ${resumed?.state?.decisions}`));
    const gated = held?.code === 0 && untouched(resumed) && replanned;
    const approval = gated && first.session ? await turn('Approved. Sign off and build it.', 3, autoChange ? held.session : first.session) : null;
    const saved = state();
    const tests = spawnSync(process.execPath, ['--test'], { cwd: root, encoding: 'utf8', timeout: 30000 });
    const behavior = spawnSync(process.execPath, ['--input-type=module', '-e', `import assert from "node:assert/strict"; import {greet, farewell} from "./index.mjs"; assert.equal(greet(), "Hello, Neef!"); assert.equal(greet("Ada"), "Hello, Ada!"); assert.equal(farewell("Ada"), "Goodbye, Ada!");${autoChange ? ' assert.equal(farewell(), "Goodbye, world!");' : ''}`], { cwd: root, encoding: 'utf8', timeout: 30000 });
    const head = git(root, ['rev-parse', 'HEAD']);
    const changedFiles = head === initial ? [] : git(root, ['diff', '--name-only', initial, head]).split('\n').filter(Boolean);
    const built = approval?.code === 0 && head !== initial && git(root, ['status', '--porcelain']) === '' && tests.status === 0 && behavior.status === 0
      && saved?.progress === 'complete' && /signed off/i.test(saved.decisions || '') && !!saved.plan?.phases?.length
      && saved.plan.phases.every(phase => phase.status === 'complete' && !!phase.verification)
      && changedFiles.every(file => ['index.mjs', 'index.test.mjs', 'README.md'].includes(file));
    const passed = gated && built;
    fs.writeFileSync(path.join(artifacts, `${host}.result.json`), JSON.stringify({ host, root, passed, gated, replanned, first, unsigned, held, resumed, approval, saved, changedFiles }, null, 2));
    console.log(JSON.stringify({ host, passed, gated, root, signOff: first.final, approval: approval?.final }));
    if (!passed) process.exitCode = 1;
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
const hosts = ['claude', 'codex'];
const outcomes = await Promise.allSettled(hosts.map(run));
for (const [index, outcome] of outcomes.entries()) if (outcome.status === 'rejected') {
  fs.writeFileSync(path.join(artifacts, `${hosts[index]}.failure.txt`), String(outcome.reason.stack || outcome.reason));
  console.error(outcome.reason);
  process.exitCode = 1;
}
