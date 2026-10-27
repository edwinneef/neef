import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { checkApp } from '../scripts/greenfield-smoke.mjs';

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
