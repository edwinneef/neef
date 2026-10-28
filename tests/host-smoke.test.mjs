import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { spawn } from 'node:child_process';
import test from 'node:test';
import { hostArguments, hostExecutable, hostPrompt, hasResumeCommand, neefCommands, runLoggedProcess, waitForHost } from '../scripts/host-smoke.mjs';

function workspace(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'neef-host-check-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

test('fresh and resumed hosts keep sandbox and approval review, with explicit scratch access', () => {
  const shared = 'C:\\Scratch folder & notes\\shared';
  const root = 'D:\\Project folder\\fixture';
  const fresh = hostArguments('codex', shared);
  assert.equal(fresh[fresh.indexOf('--sandbox') + 1], 'workspace-write');
  assert.equal(fresh[fresh.indexOf('--add-dir') + 1], shared);
  assert.ok(fresh.includes('--ephemeral'));
  const persistent = hostArguments('codex', shared, { ephemeral: false });
  const resumed = hostArguments('codex', shared, { root, session: 'saved-session', ephemeral: false });
  for (const args of [fresh, persistent, resumed]) {
    assert.ok(args.includes('approval_policy="on-request"'));
    assert.ok(args.includes('approvals_reviewer="auto_review"'));
    assert.ok(!args.some(arg => /bypass|danger|approve-for-me/.test(arg)));
  }
  assert.ok(!persistent.includes('--ephemeral'));
  assert.ok(!resumed.includes('--ephemeral'));
  assert.ok(!resumed.includes('--add-dir'));
  assert.ok(resumed.includes('sandbox_mode="workspace-write"'));
  assert.ok(resumed.includes(`sandbox_workspace_write.writable_roots=${JSON.stringify([root, shared])}`));
  assert.deepEqual(resumed.slice(-4), ['resume', 'saved-session', '--json', '-']);
  assert.throws(() => hostArguments('codex', shared, { session: 'lost' }), /persisted session/);
  const claude = hostArguments('claude', shared, { session: 'saved-session', chatQuestions: true });
  assert.deepEqual(claude.slice(-4), ['--disallowedTools', 'AskUserQuestion', '--resume', 'saved-session']);
  assert.throws(() => hostArguments('other', shared), /Host must/);
  const prompt = hostPrompt('codex', '$neef help');
  assert.match(prompt, /writes authorized by this task/);
  assert.match(prompt, /approval is refused or unavailable.*stop/);
  assert.equal(hostPrompt('codex', prompt), prompt);
  assert.equal(hostPrompt('claude', '/neef help'), '/neef help');
});

test('Windows launches native hosts rather than shells or npm shims', t => {
  const root = workspace(t);
  const tools = path.join(root, 'Tools & commands');
  fs.mkdirSync(tools);
  const native = path.join(tools, 'claude.exe');
  fs.writeFileSync(native, 'native fixture');
  fs.writeFileSync(path.join(tools, 'codex.cmd'), 'must not execute');
  const packageRoot = path.join(tools, 'node_modules/@openai/codex');
  const vendor = path.join(packageRoot, 'node_modules/@openai/codex-win32-x64');
  fs.mkdirSync(vendor, { recursive: true });
  fs.writeFileSync(path.join(packageRoot, 'package.json'), '{"name":"@openai/codex"}');
  fs.writeFileSync(path.join(vendor, 'package.json'), '{"name":"@openai/codex-win32-x64"}');
  const binary = path.join(vendor, 'vendor/x86_64-pc-windows-msvc/bin/codex.exe');
  fs.mkdirSync(path.dirname(binary), { recursive: true });
  fs.writeFileSync(binary, 'native fixture');
  const env = { PATH: `"${tools}"` };
  assert.equal(hostExecutable('claude', env, 'win32'), native);
  assert.equal(hostExecutable('codex', env, 'win32', 'x64'), binary);
  fs.unlinkSync(binary);
  assert.throws(() => hostExecutable('codex', env, 'win32', 'x64'), /Cannot locate native/);
  assert.equal(hostExecutable('codex', env, 'linux'), 'codex');
});

// Record descriptors the runner opens so a test can prove it closed them.
function openedDescriptors(t) {
  const opened = [];
  const open = fs.openSync;
  fs.openSync = (...args) => { const fd = open(...args); opened.push(fd); return fd; };
  t.after(() => { fs.openSync = open; });
  return opened;
}

function assertClosed(descriptors) {
  assert.ok(descriptors.length > 0);
  for (const fd of descriptors.splice(0)) assert.throws(() => fs.fstatSync(fd), { code: 'EBADF' });
}

test('logged processes preserve arguments and input, close logs, and record launch failure', async t => {
  const root = workspace(t);
  const opened = openedDescriptors(t);
  const stem = path.join(root, 'success');
  const input = '$neef inspect this & preserve "quotes"';
  const argument = 'space & | %PATH% "quote"';
  const expression = 'let input=""; process.stdin.setEncoding("utf8"); process.stdin.on("data",x=>input+=x); process.stdin.on("end",()=>{console.log(JSON.stringify({input,arg:process.argv[1],ceiling:process.env.GIT_CEILING_DIRECTORIES})); console.error("saved stderr");});';
  assert.equal(await runLoggedProcess(process.execPath, ['-e', expression, argument], { root, stem, input, timeoutMs: 3000 }), 0);
  assert.deepEqual(JSON.parse(fs.readFileSync(`${stem}.jsonl`, 'utf8')), { input, arg: argument, ceiling: path.dirname(root) });
  assert.equal(fs.readFileSync(`${stem}.prompt.txt`, 'utf8'), input);
  assert.match(fs.readFileSync(`${stem}.stderr.txt`, 'utf8'), /saved stderr/);
  assertClosed(opened);
  const failed = path.join(root, 'failed');
  await assert.rejects(runLoggedProcess(path.join(root, 'missing-program'), [], { root, stem: failed, timeoutMs: 3000 }), /ENOENT/);
  assert.match(fs.readFileSync(`${failed}.failure.txt`, 'utf8'), /ENOENT/);
  assertClosed(opened);
});

test('a host timeout stops only its retained process and preserves timeout logs', { timeout: 5000 }, async t => {
  const root = workspace(t);
  const opened = openedDescriptors(t);
  const other = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { stdio: 'ignore', windowsHide: true });
  const otherExit = new Promise(resolve => other.once('exit', resolve));
  try {
    const stem = path.join(root, 'timeout');
    await assert.rejects(runLoggedProcess(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { root, stem, timeoutMs: 100, stopTimeoutMs: 1000 }), /Host timed out/);
    assert.equal(other.exitCode, null);
    assert.equal(other.signalCode, null);
    assert.match(fs.readFileSync(`${stem}.failure.txt`, 'utf8'), /Host timed out/);
    assertClosed(opened);
  } finally { other.kill(); await otherExit; }
});

test('an unconfirmed host stop is bounded and never retried', { timeout: 1000 }, async () => {
  const child = new EventEmitter();
  Object.assign(child, { pid: 123, exitCode: null, signalCode: null });
  let kills = 0, releases = 0, closed = 0;
  child.kill = () => { kills++; return false; };
  child.unref = () => { releases++; };
  for (const stream of ['stdin', 'stdout', 'stderr']) child[stream] = { destroy() { closed++; } };
  await assert.rejects(waitForHost(child, 20, 20), /Host timed out.*stop not confirmed/);
  assert.equal(kills, 1);
  assert.equal(releases, 1);
  assert.equal(closed, 3);
});

test('signal termination and failed exit codes cannot masquerade as host success', async () => {
  const child = new EventEmitter();
  Object.assign(child, { exitCode: null, signalCode: null });
  const signalled = waitForHost(child, 500);
  child.emit('exit', null, 'SIGTERM');
  await assert.rejects(signalled, /exited by signal SIGTERM/);
  const exited = new EventEmitter();
  Object.assign(exited, { exitCode: 7, signalCode: null });
  assert.equal(await waitForHost(exited, 500), 7);
});

test('follow-up recognition accepts concrete tasks and both current resume forms', () => {
  const concrete = 'Saved.\n`$neef add named greetings` — preserve default output.';
  assert.equal(neefCommands(concrete).at(-1), '$neef add named greetings');
  assert.equal(hasResumeCommand(concrete), false);
  for (const command of ['$neef next', '/neef continue', '$neef-next', '/neef-next']) assert.ok(hasResumeCommand(`Run: \`${command}\``));
  assert.equal(hasResumeCommand('`$neef-continue`'), false);
  assert.deepEqual(neefCommands('Read skills/neef/SKILL.md and ~/.neef/neef.mjs.'), []);
});

test('all six live runners use safe bounded launch and current command/fixture contracts', () => {
  for (const name of ['smoke', 'shape-smoke', 'plan-smoke', 'advisor-smoke', 'prototype-smoke', 'greenfield-smoke']) {
    const source = fs.readFileSync(new URL(`../scripts/${name}.mjs`, import.meta.url), 'utf8');
    assert.match(source, /await runHost\(/, name);
    assert.doesNotMatch(source, /dangerously-bypass|--approve-for-me|cmd\.exe/, name);
    assert.doesNotMatch(source, /\$\{prefix\}-(ask|proto)\b/, name);
    assert.doesNotMatch(source, /['"]init['"], ['"]-q['"]\]/, name);
    assert.doesNotMatch(source, /new Promise.*child\.(?:on|once)\('exit'/, name);
  }
  const general = fs.readFileSync(new URL('../scripts/smoke.mjs', import.meta.url), 'utf8');
  assert.match(general, /if \(next \|\| active\)/);
  assert.match(general, /saved\.task === 'Add named greetings'/);
  assert.match(general, /!!result\.followupCommand/);
  assert.doesNotMatch(general, /else if \(active\)/);
});
