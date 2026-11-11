#!/usr/bin/env node
// Opt-in fresh-host checks against installed skills in disposable projects.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { hasResumeCommand, installedHelper, runHost } from './host-smoke.mjs';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = path.join(source, '.test-artifacts', `advisors-${Date.now()}`);
const helper = installedHelper();
const selection = process.argv.includes('--selection');
const exhaustedOnly = process.argv.includes('--exhausted');
const prototypeOnly = process.argv.includes('--prototype');
fs.mkdirSync(artifacts, { recursive: true });

async function run(host) {
  const root = path.join(artifacts, host);
  const shared = path.join(artifacts, `${host}-state`);
  fs.mkdirSync(root);
  fs.mkdirSync(shared);
  const env = { ...process.env, NEEF_HOME: shared };
  delete env.CLAUDECODE;
  const command = (program, args, input) => {
    const result = spawnSync(program, args, { cwd: root, env, input, encoding: 'utf8', timeout: 30000, windowsHide: true });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    return result.stdout.trim();
  };
  const git = (...args) => command('git', args);
  const status = () => command(process.execPath, [helper, 'status']);
  git('init', '-q', '-b', 'main');
  git('config', 'user.name', 'Neef Advisor Smoke');
  git('config', 'user.email', 'neef-advisor@example.invalid');
  git('config', 'commit.gpgsign', 'false');
  git('config', 'core.hooksPath', '.no-hooks');
  fs.writeFileSync(path.join(root, 'index.mjs'), 'export const greet = () => "Hello, world!";\n');
  fs.writeFileSync(path.join(root, 'README.md'), selection
    ? '# Greeting\nThe only remaining goal is adding an optional name to greet while preserving the default greeting. Add a focused named-greeting test. Use Node built-ins only.\n'
    : '# Greeting\nGoals: add optional names while preserving the default greeting; then a CLI that consumes that API; then a JSON output mode for the CLI. Use Node built-ins. These are the only requested features.\n');
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ type: 'module', scripts: { test: selection ? 'node --test index.test.mjs' : 'node sentinel.mjs' } }));
  if (selection) fs.writeFileSync(path.join(root, 'index.test.mjs'), 'import { test } from "node:test"; import assert from "node:assert/strict"; import { greet } from "./index.mjs"; test("default greeting", () => assert.equal(greet(), "Hello, world!"));\n');
  fs.writeFileSync(path.join(root, 'sentinel.mjs'), 'import fs from "node:fs"; fs.writeFileSync("COMMAND_WAS_RUN", "unexpected");\n');
  git('add', '.');
  git('commit', '-qm', 'Initial advisor fixture');
  // Advice must preserve dirty work as well as the clean fixture and external state.
  fs.writeFileSync(path.join(root, 'personal.txt'), 'Preserve my unfinished notes\n');
  const prefix = host === 'claude' ? '/neef' : '$neef';
  const results = [];
  let session;

  async function turn(label, prompt, execute = false) {
    const before = status();
    const files = () => Object.fromEntries(fs.readdirSync(root).filter(name => name !== '.git')
      .map(name => [name, fs.readFileSync(path.join(root, name), 'utf8')]));
    const original = files();
    const stem = path.join(artifacts, `${host}-${label}`);
    const code = await runHost({ host, root, shared, prompt, stem, env, session: execute ? session : undefined, ephemeral: !selection, chatQuestions: true });
    const events = fs.readFileSync(`${stem}.jsonl`, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
    const final = host === 'claude' ? events.findLast(event => event.type === 'result')?.result || ''
      : events.findLast(event => event.item?.type === 'agent_message')?.item.text || '';
    session = (host === 'claude' ? events.find(event => event.session_id)?.session_id
      : events.find(event => event.type === 'thread.started')?.thread_id) || session;
    assert.equal(code, 0, final || fs.readFileSync(`${stem}.stderr.txt`, 'utf8'));
    assert.ok(final, 'Missing advisor response');
    if (!execute) {
      assert.deepEqual(files(), original, 'Advice changed project files');
      assert.equal(status(), before, 'Advice changed Git or external state');
    }
    results.push({ label, final, unchanged: !execute });
    return final;
  }

  if (selection) {
    await turn('options', `${prefix}-ask`);
    assert.ok(session, 'Missing resumable advisor session');
    await turn('selected', '1', true);
    const saved = JSON.parse(status()).state;
    assert.equal(saved?.progress, 'complete');
    assert.ok(saved.verification);
    assert.ok(saved.recommendations);
    assert.equal(fs.readFileSync(path.join(root, 'personal.txt'), 'utf8'), 'Preserve my unfinished notes\n');
    command(process.execPath, ['--input-type=module', '-e', 'import assert from "node:assert/strict"; import {greet} from "./index.mjs"; assert.equal(greet(), "Hello, world!"); assert.equal(greet("Ada"), "Hello, Ada!");']);
    command(process.execPath, ['--test', 'index.test.mjs']);
    assert.match(fs.readFileSync(path.join(artifacts, `${host}-selected.jsonl`), 'utf8'), /references[\\/]+follow-up\.md/);
  } else {
    if (!exhaustedOnly) {
      if (!prototypeOnly) {
        const options = await turn('options', `${prefix}-ask`);
        assert.match(options, /(?:1[.)]|\|\s*1\s*\|)/);
        assert.match(options, /(?:3[.)]|\|\s*3\s*\|)/);
        assert.match(options, /neef(?:-task|\s)/);
        assert.match(options, /name|greet/i);
        assert.match(options, /tradeoff|trade-off|effort|small|low|medium/i);
      }

      command(process.execPath, [helper, 'state-write', 'missing'], JSON.stringify({
        task: 'Add named greetings', progress: 'active', baseline: null,
        decisions: 'Preserve the default greeting.', verification: '', next: 'Implement optional names.', blockers: '',
      }));
      if (!prototypeOnly) {
        const ask = await turn('ask-active', `${prefix} ask Implement the unfinished named-greeting feature`);
        assert.ok(hasResumeCommand(ask), 'Advice should point to next or its continue alias');
      }

      const prototype = await turn('ask-prototype', `${prefix} ask Explore an isolated interactive prototype of three different greeting APIs before deciding what to build`);
      assert.match(prototype, new RegExp(`${host === 'claude' ? '/' : '\\$'}neef(?:-prototype| prototype| proto)\\b`));
      assert.doesNotMatch(prototype, /no installed.*proto|proto.*(?:unavailable|future capability)/i);
    }

    if (!prototypeOnly) {
      fs.writeFileSync(path.join(root, 'README.md'), '# Greeting\nThe sole goal is greet() returning Hello, world!, already implemented in index.mjs. No optional features are wanted.\n');
      const current = JSON.parse(status());
      command(process.execPath, [helper, 'state-write', current.revision], JSON.stringify({
        task: 'Base greeting', progress: 'complete', baseline: null,
        outcomes: [{ id: 'base', description: 'Preserve the base greeting', required: true, status: 'passed', evidence: 'Seeded fixture contains the base greeting.' }], decisions: 'Only the base greeting is required.',
        verification: 'Source confirms the sole required output.', next: '', blockers: '',
        recommendations: { primary: null, alternatives: [], reason: 'README.md defines only the existing base greeting.' },
      }));
      const exhausted = await turn('options-exhausted', `${prefix} ask`);
      assert.doesNotMatch(exhausted, /(?:^|\n)\s*(?:1[.)]|\|\s*1\s*\|)/);
    }
  }
  fs.writeFileSync(path.join(artifacts, `${host}.result.json`), JSON.stringify({ host, passed: true, results }, null, 2));
  console.log(JSON.stringify({ host, passed: true, cases: results.length, artifacts }));
}

console.log(JSON.stringify({ artifacts }));
const hosts = process.argv.includes('--claude') ? ['claude'] : process.argv.includes('--codex') ? ['codex'] : ['claude', 'codex'];
const outcomes = await Promise.allSettled(hosts.map(run));
for (const [index, outcome] of outcomes.entries()) if (outcome.status === 'rejected') {
  fs.writeFileSync(path.join(artifacts, `${hosts[index]}.failure.txt`), String(outcome.reason.stack || outcome.reason));
  console.error(outcome.reason);
  process.exitCode = 1;
}
