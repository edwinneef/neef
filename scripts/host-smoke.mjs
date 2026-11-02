// Shared launch policy and owned-process lifetime for opt-in host checks.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const gitApproval = 'For Git metadata writes authorized by this task in this disposable project, request scoped approval before running the exact NEEF begin, prepare or commit command, using sandbox_permissions="require_escalated" and a justification naming this disposable project and operation. Do not request a broad command prefix or attempt a protected write first. Keep sandbox and approval review enabled. If approval is refused or unavailable, preserve work, record the exact blocker and stop; do not retry or bypass the denial.';

// Hosts run the installed helper; refuse a stale install so results describe this checkout.
export function installedHelper(installed = path.join(os.homedir(), '.neef/neef.mjs'), source = fileURLToPath(new URL('./neef.mjs', import.meta.url))) {
  assert.ok(fs.existsSync(installed) && fs.readFileSync(installed).equals(fs.readFileSync(source)), `Installed helper differs from ${source}; run node scripts/install.mjs --apply first`);
  return installed;
}

export function hostPrompt(host, prompt) {
  return host === 'codex' && !prompt.endsWith(gitApproval) ? `${prompt}\n${gitApproval}` : prompt;
}

export function hostArguments(host, shared, { session, ephemeral = true, chatQuestions = false, root, extraTools = [] } = {}) {
  assert.ok(['claude', 'codex'].includes(host), 'Host must be claude or codex');
  if (host === 'claude') return ['-p', '--output-format', 'stream-json', '--verbose', '--allowedTools', ['Read', 'Edit', 'Write', 'Bash', 'Skill', ...extraTools].join(','),
    ...(chatQuestions ? ['--disallowedTools', 'AskUserQuestion'] : []), ...(session ? ['--resume', session] : [])];
  assert.ok(!session || !ephemeral, 'A resumed host needs a persisted session');
  const config = ['-c', 'approval_policy="on-request"', '-c', 'approvals_reviewer="auto_review"'];
  // exec resume has no --sandbox/--add-dir options; use its config overrides.
  if (session) {
    assert.ok(root, 'A resumed host needs its fixture root');
    return ['exec', ...config, '-c', 'sandbox_mode="workspace-write"', '-c',
      `sandbox_workspace_write.writable_roots=${JSON.stringify([root, shared])}`, 'resume', session, '--json', '-'];
  }
  return ['exec', '--json', ...(ephemeral ? ['--ephemeral'] : []), '--sandbox', 'workspace-write', ...config,
    '--skip-git-repo-check', '--add-dir', shared, '-'];
}

export function hostExecutable(host, env = process.env, platform = process.platform, arch = process.arch) {
  if (platform !== 'win32') return host;
  const search = env.PATH || env.Path || '';
  for (const directory of search.split(';').filter(Boolean).map(value => value.replace(/^"|"$/g, ''))) {
    const native = path.join(directory, `${host}.exe`);
    if (fs.existsSync(native)) return native;
    if (host !== 'codex' || !fs.existsSync(path.join(directory, 'codex.cmd'))) continue;
    // Launch the npm package's native binary directly: killing cmd.exe or its
    // Node shim on Windows would leave the actual host running.
    const pkg = path.join(directory, 'node_modules/@openai/codex/package.json');
    if (!fs.existsSync(pkg)) continue;
    let vendor = path.join(path.dirname(pkg), 'vendor');
    try { vendor = path.join(path.dirname(createRequire(pkg).resolve(`@openai/codex-win32-${arch}/package.json`)), 'vendor'); }
    catch { /* Older packages bundle vendor directly. */ }
    const triple = arch === 'x64' ? 'x86_64-pc-windows-msvc' : arch === 'arm64' ? 'aarch64-pc-windows-msvc' : null;
    if (triple) for (const folder of ['bin', 'codex']) {
      const binary = path.join(vendor, triple, folder, 'codex.exe');
      if (fs.existsSync(binary)) return binary;
    }
  }
  throw new Error(`Cannot locate native ${host}.exe on PATH; inspect the installed host before running smoke checks`);
}

function within(promise, timeoutMs, error) {
  let timer;
  return Promise.race([promise, new Promise((resolve, reject) => { timer = setTimeout(() => reject(error), timeoutMs); })])
    .finally(() => clearTimeout(timer));
}

export async function waitForHost(child, timeoutMs, stopTimeoutMs = 2000) {
  const exit = new Promise((resolve, reject) => {
    if (child.exitCode !== null || child.signalCode !== null) { resolve({ code: child.exitCode, signal: child.signalCode }); return; }
    child.once('error', reject);
    child.once('exit', (code, signal) => resolve({ code, signal }));
  });
  const timeout = new Error(`Host timed out after ${timeoutMs} ms; inspect saved logs and any child tools before another run`);
  try {
    const result = await within(exit, timeoutMs, timeout);
    if (result.signal) throw new Error(`Host exited by signal ${result.signal}`);
    return result.code;
  } catch (error) {
    if (error === timeout) {
      try {
        if (child.exitCode === null && child.signalCode === null) child.kill();
        await within(exit, stopTimeoutMs, new Error('Owned host shutdown timed out; stop not confirmed'));
      } catch (stopError) {
        child.unref();
        child.stdin?.destroy();
        child.stdout?.destroy();
        child.stderr?.destroy();
        throw new Error(`${timeout.message}. ${stopError.message}`);
      }
    }
    throw error;
  }
}

export async function runHost({ host, root, shared, prompt, stem, env = process.env, session, ephemeral = true, chatQuestions = false, extraTools,
  timeoutMs = Number(env.NEEF_SMOKE_TIMEOUT_MS || 600000), stopTimeoutMs = 2000 }) {
  assert.ok(Number.isFinite(timeoutMs) && timeoutMs > 0, 'NEEF_SMOKE_TIMEOUT_MS must be a positive finite number');
  const program = hostExecutable(host, env);
  const args = hostArguments(host, shared, { session, ephemeral, chatQuestions, root, extraTools });
  const input = hostPrompt(host, prompt);
  return runLoggedProcess(program, args, { root, stem, env, input, timeoutMs, stopTimeoutMs });
}

export async function runLoggedProcess(program, args, { root, stem, env = process.env, input = '', timeoutMs = 600000, stopTimeoutMs = 2000 }) {
  fs.writeFileSync(`${stem}.prompt.txt`, input);
  const descriptors = [];
  try {
    descriptors.push(fs.openSync(`${stem}.jsonl`, 'w'));
    descriptors.push(fs.openSync(`${stem}.stderr.txt`, 'w'));
    const child = spawn(program, args, { cwd: root, env: { ...env, GIT_CEILING_DIRECTORIES: env.GIT_CEILING_DIRECTORIES || path.dirname(root) },
      stdio: ['pipe', ...descriptors], windowsHide: true });
    const done = waitForHost(child, timeoutMs, stopTimeoutMs);
    child.stdin.on('error', () => {});
    child.stdin.end(input);
    return await done;
  } catch (error) {
    fs.writeFileSync(`${stem}.failure.txt`, error.stack || String(error));
    throw error;
  } finally { for (const descriptor of descriptors) fs.closeSync(descriptor); }
}

export function neefCommands(reply) {
  return reply.match(/(?<![\w/.:-])[/$]neef(?:[ -][^\n`]*)?/g) || [];
}

export function hasResumeCommand(reply) {
  return neefCommands(reply).some(command => /^[/$]neef(?: (?:next|continue)|-next)\b/.test(command));
}
