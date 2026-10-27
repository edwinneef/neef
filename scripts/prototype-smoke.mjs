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
const artifacts = path.join(source, '.test-artifacts', `prototypes-${Date.now()}`);
const helper = path.join(os.homedir(), '.neef/neef.mjs');
const uiOnly = process.argv.includes('--ui-only');
fs.mkdirSync(artifacts, { recursive: true });

async function run(host) {
  const root = path.join(artifacts, host);
  const shared = path.join(artifacts, `${host}-shared`);
  fs.mkdirSync(root);
  fs.mkdirSync(shared);
  const env = { ...process.env, NEEF_HOME: shared };
  delete env.CLAUDECODE;
  const command = (cwd, program, args, input) => {
    const result = spawnSync(program, args, { cwd, env, input, encoding: 'utf8', timeout: 30000, windowsHide: true });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    return result.stdout.trim();
  };
  const git = (...args) => command(root, 'git', args);
  const status = () => command(root, process.execPath, [helper, 'status']);
  const workspaces = () => JSON.parse(command(root, process.execPath, [helper, 'prototype-workspace'])).workspaces;
  git('init', '-q', '-b', 'main');
  git('config', 'user.name', 'Neef Prototype Smoke');
  git('config', 'user.email', 'neef-prototype@example.invalid');
  git('config', 'commit.gpgsign', 'false');
  git('config', 'core.hooksPath', '.no-hooks');
  fs.writeFileSync(path.join(root, 'index.mjs'), 'export const production = "preserve";\n');
  fs.writeFileSync(path.join(root, 'README.md'), '# Production sample\nThe active production task must remain intact while unrelated prototypes are explored. Use Node built-ins; all demonstration data is synthetic.\n');
  git('add', '.');
  git('commit', '-qm', 'Initial prototype fixture');
  fs.writeFileSync(path.join(root, 'personal.txt'), 'Preserve my tuning\n');
  command(root, process.execPath, [helper, 'state-write', 'missing'], JSON.stringify({
    task: 'Production task', progress: 'active', baseline: null,
    decisions: 'Keep production behavior unchanged.', verification: '', next: 'Finish the production task later.', blockers: '',
  }));
  const before = status();
  const contents = () => Object.fromEntries(fs.readdirSync(root).filter(name => name !== '.git')
    .map(name => [name, fs.readFileSync(path.join(root, name), 'utf8')]));
  const original = contents();
  const prefix = host === 'claude' ? '/neef' : '$neef';
  const results = [];

  async function turn(label, prompt, session) {
    const stem = path.join(artifacts, `${host}-${label}`);
    const code = await runHost({ host, root, shared, prompt, stem, env, session, ephemeral: false, chatQuestions: true });
    const events = fs.readFileSync(`${stem}.jsonl`, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
    const final = host === 'claude' ? events.findLast(event => event.type === 'result')?.result || ''
      : events.findLast(event => event.item?.type === 'agent_message')?.item.text || '';
    const id = host === 'claude' ? events.find(event => event.session_id)?.session_id
      : events.find(event => event.type === 'thread.started')?.thread_id;
    assert.equal(code, 0, final || fs.readFileSync(`${stem}.stderr.txt`, 'utf8'));
    assert.ok(final, 'Missing prototype response');
    assert.equal(status(), before, 'Prototype changed production Git or task state');
    assert.deepEqual(contents(), original, 'Prototype changed source project files');
    results.push({ label, final, session: id || session });
    return { final, session: id || session };
  }

  const ui = await turn('ui', `${prefix}-prototype Compare two distinct compact task-picker concepts in an interactive single-file HTML demo. Let me switch concepts and toggle task selection. Use built-ins and synthetic data.${uiOnly ? ' A browser preview is unavailable in this headless session; use the checks you can run and state the visual limits.' : ''}`);
  const first = workspaces();
  assert.equal(first.length, 1, ui.final);
  const demo = first[0];
  const htmlFiles = fs.readdirSync(demo.workspace).filter(name => name.endsWith('.html'));
  assert.equal(htmlFiles.length, 1, 'Expected a self-contained HTML demo');
  const htmlPath = path.join(demo.workspace, htmlFiles[0]);
  assert.match(fs.readFileSync(htmlPath, 'utf8'), /<button|<input|<select/i);
  assert.ok(fs.existsSync(demo.readme), 'Missing prototype continuity record');
  let algorithmDemo;
  if (!uiOnly) {
    const refined = await turn('refine', 'Make both concepts more compact and add the visible label "Compact mode".', ui.session);
    assert.equal(workspaces().length, 1, 'Refinement allocated a different workspace');
    assert.match(fs.readFileSync(htmlPath, 'utf8'), /Compact mode/);
    const approved = await turn('approve', 'I approve concept 2. Prepare the production handoff; do not implement production yet.', refined.session);
    assert.match(approved.final, new RegExp(`${host === 'claude' ? '/' : '\\$'}neef(?:-task|\\s)`));
    assert.match(fs.readFileSync(demo.readme, 'utf8'), /acceptance|handoff/i);

    const algorithm = await turn('algorithm', `${prefix} proto Compare linear search and binary search in a runnable Node demo.mjs using built-ins. Search the sorted synthetic array [2,4,6,8,10] for 6; print JSON with numeric linear and binary fields containing each resulting zero-based index. This is a new question, separate from the task-picker.`);
    const second = workspaces();
    assert.equal(second.length, 2, algorithm.final);
    algorithmDemo = second.find(item => item.workspace !== demo.workspace);
    assert.ok(fs.existsSync(algorithmDemo.readme));
    assert.ok(!fs.readdirSync(algorithmDemo.workspace).some(name => name.endsWith('.html')), 'Algorithm comparison unnecessarily created a UI');
    const result = JSON.parse(command(algorithmDemo.workspace, process.execPath, ['demo.mjs']));
    assert.equal(result.linear, 2);
    assert.equal(result.binary, 2);
  } else {
    assert.match(fs.readFileSync(demo.readme, 'utf8'), /syntax|compil|pars|vm|node --check/i);
  }

  fs.writeFileSync(path.join(artifacts, `${host}.result.json`), JSON.stringify({ host, passed: true, demo, htmlPath, algorithmDemo, results }, null, 2));
  console.log(JSON.stringify({ host, passed: true, cases: results.length, htmlPath, artifacts }));
}

console.log(JSON.stringify({ artifacts }));
const hosts = process.argv.includes('--claude') ? ['claude'] : process.argv.includes('--codex') ? ['codex'] : ['claude', 'codex'];
const outcomes = await Promise.allSettled(hosts.map(run));
for (const [index, outcome] of outcomes.entries()) if (outcome.status === 'rejected') {
  fs.writeFileSync(path.join(artifacts, `${hosts[index]}.failure.txt`), String(outcome.reason.stack || outcome.reason));
  console.error(outcome.reason);
  process.exitCode = 1;
}
