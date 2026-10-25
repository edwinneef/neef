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
  const prompt = setup ? (host === 'claude' ? '/neef setup' : '$neef setup') : host === 'claude'
    ? '/neef Change greet() to return "Hello, Neef!", update its existing test, verify and commit. Work only in this disposable project.'
    : '$neef Add an optional name parameter to greet(name), defaulting to "world". Preserve greet() output, add a focused named-greeting test, verify and commit. Work only in this disposable project.';
  const args = host === 'claude'
    ? ['-p', '--output-format', 'stream-json', '--verbose', '--allowedTools', 'Read,Edit,Write,Bash,Skill']
    : ['exec', '--ephemeral', '--json', '--approve-for-me', '--add-dir', shared, '-'];
  const command = process.platform === 'win32' ? 'cmd.exe' : host;
  const commandArgs = process.platform === 'win32' ? ['/d', '/s', '/c', [host, ...args].map(arg => /\s/.test(arg) ? `"${arg}"` : arg).join(' ')] : args;
  fs.mkdirSync(shared, { recursive: true });
  fs.writeFileSync(path.join(artifacts, `${host}.prompt.txt`), prompt);
  const out = fs.openSync(path.join(artifacts, `${host}.jsonl`), 'w');
  const err = fs.openSync(path.join(artifacts, `${host}.stderr.txt`), 'w');
  const child = spawn(command, commandArgs, { cwd: root, env, stdio: ['pipe', out, err], windowsHide: true });
  child.stdin.on('error', () => {});
  child.stdin.end(prompt);
  const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', resolve); });
  fs.closeSync(out); fs.closeSync(err);
  const checks = setup ? { status: null } : spawnSync(process.execPath, ['--test'], { cwd: root, encoding: 'utf8' });
  const result = { host, code, root, initial, head: git(root, ['rev-parse', 'HEAD']),
    status: git(root, ['status', '--porcelain']), checks: checks.status,
    state: fs.existsSync(path.join(shared, 'state')) ? fs.readdirSync(path.join(shared, 'state')) : [] };
  const status = spawnSync(process.execPath, [path.join(os.homedir(), '.neef/neef.mjs'), 'status'], { cwd: root, env, encoding: 'utf8' });
  const saved = status.status === 0 ? JSON.parse(status.stdout).state : null;
  result.contextDepth = saved?.context?.depth;
  if (setup) {
    result.setup = { depth: saved?.context?.depth, architecture: saved?.context?.architecture,
      noCommands: !fs.existsSync(path.join(root, 'COMMAND_WAS_RUN')), task: saved?.task };
    result.passed = code === 0 && result.head === initial && result.status === '' && result.setup.noCommands
      && result.setup.depth === 'full' && !!result.setup.architecture && result.setup.task === '';
  } else result.passed = code === 0 && checks.status === 0 && result.head !== initial && result.status === '' && saved?.context?.depth === 'minimal';
  if (!result.passed) process.exitCode = 1;
  fs.writeFileSync(path.join(artifacts, `${host}.result.json`), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
}

console.log(JSON.stringify({ artifacts }));
await Promise.all((process.argv.includes('--codex-only') ? ['codex'] : ['claude', 'codex']).map(run));
