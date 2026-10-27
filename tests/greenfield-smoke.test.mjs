import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { checkApp, fixtureEnvironment, hostArguments, scenario } from '../scripts/greenfield-smoke.mjs';

function app(t, persistent, listStatus = 200, normalize = false) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'neef-app-check-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, 'server.mjs'), `
import http from 'node:http';
import fs from 'node:fs';
const file = process.env.DATA_FILE;
let bookings = ${persistent ? "fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : []" : '[]'};
http.createServer(async (req, res) => {
  if (req.url === '/') { res.end('<form><input name="customer"><button>Add booking</button></form>'); return; }
  res.setHeader('content-type', 'application/json');
  if (req.method === 'POST') {
    let body = ''; for await (const chunk of req) body += chunk;
    const booking = JSON.parse(body);
    ${normalize ? 'booking.time += ":00";' : ''}
    bookings.push(booking);
    ${persistent ? 'fs.writeFileSync(file, JSON.stringify(bookings));' : ''}
    res.writeHead(201); res.end(JSON.stringify(booking)); return;
  }
  res.writeHead(${listStatus}); res.end(JSON.stringify(bookings));
}).listen(Number(process.env.PORT), '127.0.0.1');
`);
  return { root, data: path.join(root, 'bookings.json') };
}

test('greenfield plan is read-only and contains both host scenarios', () => {
  const result = spawnSync(process.execPath, ['scripts/greenfield-smoke.mjs', '--plan'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(result.stdout);
  assert.equal(plan.run, false);
  assert.deepEqual(plan.scenarios.map(item => item.host), ['claude', 'codex']);
  assert.match(plan.scenarios[0].prompt, /^\/neef /);
  assert.match(plan.scenarios[1].prompt, /^\$neef /);
});

test('Codex requests scoped Git approval without disabling its workspace sandbox', () => {
  const args = hostArguments('codex', 'fixture-shared');
  assert.equal(args[args.indexOf('--sandbox') + 1], 'workspace-write');
  assert.ok(args.includes('approval_policy="on-request"'));
  assert.ok(args.includes('approvals_reviewer="auto_review"'));
  assert.ok(!args.includes('--approve-for-me'));
  assert.ok(args.includes('--skip-git-repo-check'));
  assert.equal(args[args.indexOf('--add-dir') + 1], 'fixture-shared');
  assert.ok(!args.some(arg => /danger|bypass/.test(arg)));
  const { prompt } = scenario('codex');
  assert.match(prompt, /before running.*begin, prepare or commit/i);
  assert.match(prompt, /sandbox_permissions="require_escalated"/);
  assert.match(prompt, /this disposable project and operation/);
  assert.match(prompt, /do not request a broad command prefix/i);
  assert.match(prompt, /approval is refused or unavailable.*stop/i);
  assert.ok(!scenario('claude').prompt.includes('sandbox_permissions'));
});

test('empty greenfield fixture cannot discover the parent NEEF repository', t => {
  const source = fileURLToPath(new URL('..', import.meta.url));
  const parent = path.join(source, '.test-artifacts');
  fs.mkdirSync(parent, { recursive: true });
  const artifacts = fs.mkdtempSync(path.join(parent, 'git-ceiling-'));
  t.after(() => fs.rmSync(artifacts, { recursive: true, force: true }));
  const root = path.join(artifacts, 'codex');
  fs.mkdirSync(root);
  const env = fixtureEnvironment(artifacts);
  assert.equal(env.GIT_CEILING_DIRECTORIES, artifacts);
  assert.equal(env.NEEF_HOME, path.join(artifacts, 'shared'));
  const result = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: root, env, encoding: 'utf8' });
  assert.notEqual(result.status, 0, 'An empty fixture must not resolve to the source repository');
});

test('greenfield behavior check verifies persistence and accepts equivalent saved time formats', async t => {
  const fixture = app(t, true, 200, true);
  const result = await checkApp(fixture.root, fixture.data);
  assert.equal(result.createAndList, true);
  assert.equal(result.survivesRestart, true);
  assert.equal(result.browserInteraction, 'unverified');
});

test('greenfield behavior check rejects a working form and API that lose saved bookings', async t => {
  const fixture = app(t, false);
  await assert.rejects(checkApp(fixture.root, fixture.data), /Booking must survive server restart/);
});

test('greenfield behavior check rejects error responses containing plausible booking data', async t => {
  const fixture = app(t, true, 500);
  await assert.rejects(checkApp(fixture.root, fixture.data), /Booking listing must return HTTP success/);
});
