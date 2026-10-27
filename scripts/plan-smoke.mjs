#!/usr/bin/env node
// Opt-in installed-host validation in disposable projects; not part of npm test.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runHost } from './host-smoke.mjs';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = path.join(source, '.test-artifacts', `plan-${Date.now()}`);
const helper = path.join(os.homedir(), '.neef/neef.mjs');
const shared = path.join(artifacts, 'shared');
fs.mkdirSync(shared, { recursive: true });

function command(root, program, args, env) {
  const result = spawnSync(program, args, { cwd: root, env, encoding: 'utf8', timeout: 30000, windowsHide: true });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return result.stdout.trim();
}

async function run(host, scale) {
  const root = path.join(artifacts, `${host}-${scale}`);
  fs.mkdirSync(root);
  const env = { ...process.env, NEEF_HOME: shared };
  delete env.CLAUDECODE;
  const git = (...args) => command(root, 'git', args, env);
  const state = () => JSON.parse(command(root, process.execPath, [helper, 'status'], env)).state;
  git('init', '-q', '-b', 'main');
  git('config', 'user.name', 'Neef Plan Smoke');
  git('config', 'user.email', 'neef-plan@example.invalid');
  git('config', 'commit.gpgsign', 'false');
  git('config', 'core.hooksPath', '.no-hooks');
  fs.writeFileSync(path.join(root, 'index.mjs'), 'export function greet(name = "world") { return `Hello, ${name}!`; }\n');
  fs.writeFileSync(path.join(root, 'index.test.mjs'), 'import { test } from "node:test";\nimport assert from "node:assert/strict";\nimport { greet } from "./index.mjs";\ntest("default", () => assert.equal(greet(), "Hello, world!"));\ntest("named", () => assert.equal(greet("Ada"), "Hello, Ada!"));\n');
  fs.writeFileSync(path.join(root, 'README.md'), scale === 'small'
    ? '# Greeting\nChange only the default greeting to Hello, Neef! while preserving named greetings.\n'
    : '# Profile greeting application\nReplace this single greeting script with versioned profile storage, a reusable greeting service and a command-line entry point. Existing version-1 profile files must migrate without losing names. The service consumes the storage API; the CLI consumes the service. Deliver each layer independently with passing tests before integrating its consumer. Default and named greet() behavior remains compatible. Use Node built-ins only, store profiles in user-selected paths and test with temporary files. Acceptance: v1 profiles migrate to v2 without data loss; service greets a selected profile and handles missing profiles clearly; CLI selects a profile and prints the greeting; old greeting exports still pass.\n');
  git('add', '--', 'index.mjs', 'index.test.mjs', 'README.md');
  git('commit', '-qm', 'Initial fixture');
  const initial = { head: git('rev-parse', 'HEAD'), branch: git('branch', '--show-current') };
  const prefix = host === 'claude' ? '/neef' : '$neef';

  async function turn(prompt, label) {
    const stem = path.join(artifacts, `${host}-${scale}-${label}`);
    const code = await runHost({ host, root, shared, prompt, stem, env, chatQuestions: true });
    const events = fs.readFileSync(`${stem}.jsonl`, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
    const final = host === 'claude' ? events.findLast(event => event.type === 'result')?.result || ''
      : events.findLast(event => event.item?.type === 'agent_message')?.item.text || '';
    return { code, final };
  }

  const feature = scale === 'small' ? 'Change the default greeting to Hello, Neef! and preserve named greetings.'
    : 'Build the profile greeting application described in README.md, including versioned storage and migration, service, CLI and compatibility.';
  const planned = await turn(`${prefix}-plan ${feature}`, 'planning');
  const saved = state();
  assert.equal(planned.code, 0, planned.final);
  assert.equal(git('rev-parse', 'HEAD'), initial.head);
  assert.equal(git('branch', '--show-current'), initial.branch);
  assert.equal(git('status', '--porcelain'), '');
  assert.equal(saved?.progress, 'active');
  assert.equal(saved?.plan?.scale, scale);
  assert.equal(saved?.baseline, null);
  assert.ok(saved.plan.phases.every(phase => phase.status === 'pending' && phase.acceptance.length));
  assert.ok(scale === 'small' ? saved.plan.phases.length === 1 : saved.plan.phases.length > 1);

  // Fresh sessions must recover the entire roadmap from external state.
  const continued = await turn(`${prefix} continue`, 'continue');
  const finished = state();
  const completed = finished?.plan?.phases.filter(phase => phase.status === 'complete') || [];
  assert.equal(continued.code, 0, continued.final);
  assert.equal(completed.length, saved.plan.phases.length);
  assert.ok(completed.every(phase => phase.verification));
  assert.equal(finished.plan.phases.length, saved.plan.phases.length);
  assert.equal(finished.progress, 'complete');
  assert.equal(finished.baseline, null);
  assert.notEqual(git('rev-parse', 'HEAD'), initial.head);
  assert.equal(git('branch', '--show-current'), 'main');
  assert.equal(git('branch', '--format=%(refname:short)'), 'main');
  assert.ok(Number(git('rev-list', '--count', `${initial.head}..HEAD`)) >= saved.plan.phases.length);
  assert.equal(git('status', '--porcelain'), '');
  command(root, process.execPath, ['--test'], env);
  if (scale === 'small') command(root, process.execPath, ['--input-type=module', '-e', 'import assert from "node:assert/strict"; import {greet} from "./index.mjs"; assert.equal(greet(), "Hello, Neef!"); assert.equal(greet("Ada"), "Hello, Ada!");'], env);
  fs.writeFileSync(path.join(artifacts, `${host}-${scale}.result.json`), JSON.stringify({ host, scale, passed: true, root, planned, saved, continued, finished }, null, 2));
  console.log(JSON.stringify({ host, scale, passed: true, phases: finished.plan.phases.length, completed: completed.length, root }));
}

console.log(JSON.stringify({ artifacts }));
const hosts = process.argv.includes('--claude') ? ['claude'] : process.argv.includes('--codex') ? ['codex'] : ['claude', 'codex'];
const scales = process.argv.includes('--small') ? ['small'] : process.argv.includes('--large') ? ['large'] : ['small', 'large'];
for (const host of hosts) for (const scale of scales) await run(host, scale);
