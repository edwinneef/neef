#!/usr/bin/env node
// Opt-in real-app scenario. Default prints the plan; never part of ordinary tasks.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const helper = path.join(os.homedir(), '.neef/neef.mjs');
const request = 'Build a usable local booking app for my salon. Let me add a customer booking, see the bookings, and keep them after restarting the app. Use a clear interface and sample data, without accounts or hosting.';
const contract = 'For this disposable regression only, use Node built-ins, start with node server.mjs, honor PORT and DATA_FILE environment variables, and provide GET /api/bookings returning a JSON array and POST /api/bookings accepting {customer, time} and returning the created booking with status 201. Serve the working interface at /. Use local file persistence. Verify the flow and persistence; stop any preview you start and provide the run command. Do not modify anything outside this disposable project except NEEF shared state. Follow normal NEEF Git safeguards; stop on a host denial.';

export function scenario(host) {
  assert.ok(['claude', 'codex'].includes(host), 'Host must be claude or codex');
  return { host, prompt: `${host === 'claude' ? '/neef' : '$neef'} ${request}\n${contract}`,
    checks: ['Starts from a genuinely empty folder', 'Serves an interface', 'Creates and lists a booking', 'Retains it after a server restart', 'Commits owned work on main', 'Records outcome evidence and follow-up'],
    limits: 'HTTP/source checks do not establish browser interaction, visual quality or a general speed guarantee.' };
}

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}

async function start(root, dataFile) {
  const port = await freePort();
  let logs = '';
  const child = spawn(process.execPath, ['server.mjs'], { cwd: root, env: { ...process.env, PORT: String(port), DATA_FILE: dataFile }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  const closed = new Promise(resolve => child.once('close', resolve));
  child.stdout.on('data', data => { logs = (logs + data).slice(-4000); });
  child.stderr.on('data', data => { logs = (logs + data).slice(-4000); });
  let launchError;
  child.once('error', error => { launchError = error; });
  async function stop() { if (child.exitCode === null && !launchError) child.kill(); await closed; }
  const url = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (launchError || child.exitCode !== null) { await stop(); throw new Error(`App exited before readiness: ${launchError?.message || logs}`); }
    try { const response = await fetch(url, { signal: AbortSignal.timeout(500) }); if (response.ok) return { url, stop }; } catch {}
    await delay(100);
  }
  await stop();
  throw new Error(`App did not respond: ${logs}`);
}

export async function checkApp(root, dataFile) {
  const booking = { customer: `Smoke ${Date.now()}`, time: '2030-01-15T10:00' };
  async function listedBooking(url) {
    const response = await fetch(`${url}/api/bookings`, { signal: AbortSignal.timeout(2000) });
    assert.ok(response.ok, 'Booking listing must return HTTP success');
    const listed = await response.json();
    return Array.isArray(listed) && listed.some(item => item.customer === booking.customer && Date.parse(item.time) === Date.parse(booking.time));
  }
  let app = await start(root, dataFile);
  try {
    const page = await fetch(app.url, { signal: AbortSignal.timeout(2000) }).then(response => response.text());
    assert.match(page, /<form\b/i, 'Interface must include an input flow');
    const created = await fetch(`${app.url}/api/bookings`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(booking), signal: AbortSignal.timeout(2000) });
    assert.equal(created.status, 201, 'Booking creation must succeed');
    assert.ok(await listedBooking(app.url), 'Created booking must appear in the list');
  } finally { await app.stop(); }
  app = await start(root, dataFile);
  try {
    assert.ok(await listedBooking(app.url), 'Booking must survive server restart');
  } finally { await app.stop(); }
  return { interfaceSource: true, createAndList: true, survivesRestart: true, browserInteraction: 'unverified' };
}

function command(root, program, args, env) {
  const result = spawnSync(program, args, { cwd: root, env, encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return result.stdout.trim();
}

async function run(host, artifacts) {
  const root = path.join(artifacts, host);
  fs.mkdirSync(root);
  assert.deepEqual(fs.readdirSync(root), []);
  const env = { ...process.env, NEEF_HOME: path.join(artifacts, 'shared') };
  delete env.CLAUDECODE;
  const plan = scenario(host);
  fs.writeFileSync(path.join(artifacts, `${host}.prompt.txt`), plan.prompt);
  const args = host === 'claude' ? ['-p', '--output-format', 'stream-json', '--verbose', '--allowedTools', 'Read,Edit,Write,Bash,Skill']
    : ['exec', '--ephemeral', '--json', '--approve-for-me', '--add-dir', env.NEEF_HOME, '-'];
  const program = process.platform === 'win32' ? 'cmd.exe' : host;
  const hostArgs = process.platform === 'win32' ? ['/d', '/s', '/c', [host, ...args].map(arg => /\s/.test(arg) ? `"${arg}"` : arg).join(' ')] : args;
  const stdout = fs.openSync(path.join(artifacts, `${host}.jsonl`), 'w');
  const stderr = fs.openSync(path.join(artifacts, `${host}.stderr.txt`), 'w');
  const started = Date.now();
  try {
    const child = spawn(program, hostArgs, { cwd: root, env, windowsHide: true, stdio: ['pipe', stdout, stderr] });
    child.stdin.on('error', () => {});
    child.stdin.end(plan.prompt);
    const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); });
    assert.equal(code, 0, 'Host must finish successfully; inspect its saved logs before any retry');
    const state = JSON.parse(command(root, process.execPath, [helper, 'status'], env)).state;
    assert.equal(state?.progress, 'complete', `Unfinished acceptance must not count as a pass: ${state?.blockers || state?.next || 'inspect host logs'}`);
    assert.ok(state.verification && state.recommendations, 'Evidence and follow-up must be saved');
    assert.equal(command(root, 'git', ['branch', '--show-current'], env), 'main');
    command(root, 'git', ['rev-parse', 'HEAD'], env);
    assert.equal(command(root, 'git', ['status', '--porcelain'], env), '', 'Generated work must be committed');
    assert.ok(fs.existsSync(path.join(root, 'README.md')), 'Include a run command');
    // Test data stays outside the generated project and is never committed.
    const behavior = await checkApp(root, path.join(artifacts, `${host}-bookings.json`));
    assert.equal(command(root, 'git', ['status', '--porcelain'], env), '', 'App checks must not leave generated files uncommitted');
    return { host, root, passed: true, elapsedMs: Date.now() - started, behavior, limits: plan.limits };
  } finally { fs.closeSync(stdout); fs.closeSync(stderr); }
}

export async function main(args = process.argv.slice(2)) {
  assert.ok(args.every(arg => ['--plan', '--run', '--claude-only', '--codex-only'].includes(arg)), 'Use --plan (default), or --run [--claude-only|--codex-only]');
  assert.ok(!(args.includes('--claude-only') && args.includes('--codex-only')), 'Choose at most one host filter');
  assert.ok(!(args.includes('--plan') && args.includes('--run')), 'Choose plan or run');
  const hosts = args.includes('--claude-only') ? ['claude'] : args.includes('--codex-only') ? ['codex'] : ['claude', 'codex'];
  if (!args.includes('--run')) { console.log(JSON.stringify({ run: false, scenarios: hosts.map(scenario) }, null, 2)); return; }
  const artifacts = path.join(source, '.test-artifacts', `greenfield-${Date.now()}`);
  fs.mkdirSync(path.join(artifacts, 'shared'), { recursive: true });
  console.log(JSON.stringify({ artifacts }));
  for (const host of hosts) {
    let result;
    try { result = await run(host, artifacts); }
    catch (error) { result = { host, passed: false, error: error.message }; process.exitCode = 1; }
    fs.writeFileSync(path.join(artifacts, `${host}.result.json`), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));
    if (!result.passed) break;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
