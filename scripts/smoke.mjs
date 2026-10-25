#!/usr/bin/env node
// Opt-in live host validation. Never included in the ordinary unit test suite.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = path.join(source, '.test-artifacts', `hosts-${Date.now()}`);
fs.mkdirSync(artifacts, { recursive: true });
const shared = path.join(artifacts, 'shared');

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
  git(root, ['add', '--', 'index.mjs', 'index.test.mjs']);
  git(root, ['commit', '-qm', 'Initial fixture']);
  const initial = git(root, ['rev-parse', 'HEAD']);
  const env = { ...process.env, NEEF_HOME: shared };
  delete env.CLAUDECODE;
  const prompt = host === 'claude'
    ? '/neef Change greet() to return "Hello, Neef!", update its existing test, verify and commit. Work only in this disposable project.'
    : '$neef Add an optional name parameter to greet(name), defaulting to "world". Preserve greet() output, add a focused named-greeting test, verify and commit. Work only in this disposable project.';
  const args = host === 'claude'
    ? ['-p', '--output-format', 'stream-json', '--verbose', '--allowedTools', 'Read,Edit,Write,Bash,Skill']
    : ['exec', '--ephemeral', '--json', '--approve-for-me', '--add-dir', shared, '-'];
  const command = process.platform === 'win32' ? 'cmd.exe' : host;
  const commandArgs = process.platform === 'win32' ? ['/d', '/s', '/c', [host, ...args].join(' ')] : args;
  fs.mkdirSync(shared, { recursive: true });
  fs.writeFileSync(path.join(artifacts, `${host}.prompt.txt`), prompt);
  const out = fs.openSync(path.join(artifacts, `${host}.jsonl`), 'w');
  const err = fs.openSync(path.join(artifacts, `${host}.stderr.txt`), 'w');
  const child = spawn(command, commandArgs, { cwd: root, env, stdio: ['pipe', out, err], windowsHide: true });
  child.stdin.on('error', () => {});
  child.stdin.end(prompt);
  const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', resolve); });
  fs.closeSync(out); fs.closeSync(err);
  const checks = spawnSync(process.execPath, ['--test'], { cwd: root, encoding: 'utf8' });
  const result = { host, code, root, initial, head: git(root, ['rev-parse', 'HEAD']),
    status: git(root, ['status', '--porcelain']), checks: checks.status,
    state: fs.existsSync(path.join(shared, 'state')) ? fs.readdirSync(path.join(shared, 'state')) : [] };
  fs.writeFileSync(path.join(artifacts, `${host}.result.json`), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
}

console.log(JSON.stringify({ artifacts }));
await Promise.all((process.argv.includes('--codex-only') ? ['codex'] : ['claude', 'codex']).map(run));
