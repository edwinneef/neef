#!/usr/bin/env node
// Opt-in Claude Code conversations in disposable projects; not part of npm test.
// Checks that importance scales testing (explore: none) and independent checking (important: delegate).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { installedHelper, runHost } from './host-smoke.mjs';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = path.join(source, '.test-artifacts', `importance-${Date.now()}`);
const shared = path.join(artifacts, 'shared');
const helper = installedHelper();
fs.mkdirSync(shared, { recursive: true });

function git(root, args) {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', timeout: 30000 });
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stdout.trim();
}

const task = 'Add an exported farewell(name = "world") to index.mjs returning `Goodbye, ${name}!`; leave greet unchanged.';
const original = 'import { test } from "node:test";\nimport assert from "node:assert/strict";\nimport { greet } from "./index.mjs";\ntest("default", () => assert.equal(greet(), "Hello, world!"));\n';

async function scenario(level) {
  const root = path.join(artifacts, level);
  fs.mkdirSync(root);
  const env = { ...process.env, NEEF_HOME: shared };
  delete env.CLAUDECODE;
  git(root, ['init', '-q', '-b', 'main']);
  git(root, ['config', 'user.name', 'Neef Importance Smoke']);
  git(root, ['config', 'user.email', 'neef-importance@example.invalid']);
  git(root, ['config', 'commit.gpgsign', 'false']);
  git(root, ['config', 'core.hooksPath', '.no-hooks']);
  fs.writeFileSync(path.join(root, 'index.mjs'), 'export function greet(name = "world") { return `Hello, ${name}!`; }\n');
  fs.writeFileSync(path.join(root, 'index.test.mjs'), original);
  fs.writeFileSync(path.join(root, 'README.md'), '# Greeting sample\nThe sample is complete once farewell(name) is exported and returns Goodbye, <name>!.\n');
  git(root, ['add', '--', 'index.mjs', 'index.test.mjs', 'README.md']);
  git(root, ['commit', '-qm', 'Initial fixture']);
  const initial = git(root, ['rev-parse', 'HEAD']);
  const stem = path.join(artifacts, level);
  const code = await runHost({ host: 'claude', root, shared, prompt: `/neef --importance ${level} ${task}`, stem, env, ephemeral: false, chatQuestions: true, extraTools: ['Agent'] });
  const events = fs.readFileSync(`${stem}.jsonl`, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
  const final = events.findLast(event => event.type === 'result')?.result || '';
  const delegated = events.filter(event => event.type === 'assistant').flatMap(event => event.message?.content || [])
    .filter(part => part.type === 'tool_use' && ['Agent', 'Task'].includes(part.name)).length;
  const status = spawnSync(process.execPath, [helper, 'status'], { cwd: root, env, encoding: 'utf8', timeout: 30000 });
  const saved = JSON.parse(status.stdout).state;
  const head = git(root, ['rev-parse', 'HEAD']);
  const changed = head === initial ? [] : git(root, ['diff', '--name-only', initial, head]).split('\n').filter(Boolean);
  const testsChanged = fs.readFileSync(path.join(root, 'index.test.mjs'), 'utf8') !== original || changed.some(file => /test/i.test(file) && file !== 'index.test.mjs');
  const behavior = spawnSync(process.execPath, ['--input-type=module', '-e', 'import assert from "node:assert/strict"; import {greet, farewell} from "./index.mjs"; assert.equal(greet(), "Hello, world!"); assert.equal(farewell("Ada"), "Goodbye, Ada!"); assert.equal(farewell(), "Goodbye, world!");'], { cwd: root, encoding: 'utf8', timeout: 30000 });
  const common = code === 0 && head !== initial && git(root, ['status', '--porcelain']) === '' && behavior.status === 0
    && saved?.progress === 'complete' && saved.importance === level;
  const passed = common && (level === 'explore' ? !testsChanged && delegated === 0 : testsChanged && delegated > 0);
  const result = { level, root, passed, delegated, testsChanged, changed, importance: saved?.importance, verification: saved?.verification, outcomes: saved?.outcomes, final };
  fs.writeFileSync(path.join(artifacts, `${level}.result.json`), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ level, passed, delegated, testsChanged, root }));
  if (!passed) process.exitCode = 1;
}

console.log(JSON.stringify({ artifacts }));
for (const level of ['explore', 'important']) {
  try { await scenario(level); } catch (error) {
    fs.writeFileSync(path.join(artifacts, `${level}.failure.txt`), String(error.stack || error));
    console.error(error);
    process.exitCode = 1;
  }
}
