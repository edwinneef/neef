#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const legacy = ['ed', 'ed-auto', 'ed-feature', 'ed-help', 'ed-next', 'ed-setup', 'ed-skills', 'ed-status'];
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const fail = message => { throw new Error(message); };
const home = () => path.resolve(process.env.NEEF_HOME || path.join(os.homedir(), '.neef'));
const exists = p => fs.existsSync(p);
const read = p => fs.readFileSync(p, 'utf8');
const json = p => JSON.parse(read(p));
const print = value => process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);

function git(root, args, options = {}) {
  const result = spawnSync('git', ['-C', root, ...args], {
    encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_LITERAL_PATHSPECS: '1' }, ...options,
  });
  if (result.error || result.status !== 0) fail(result.error?.message || result.stderr.trim() || `Git failed: ${args[0]}`);
  return result.stdout;
}

function canonical(p) {
  const resolved = fs.realpathSync.native(p);
  return process.platform === 'win32' ? resolved.replace(/^\\\\\?\\/, '').toLowerCase() : resolved;
}

export function project(cwd) {
  let root = canonical(cwd);
  let isGit = false;
  try { root = canonical(git(root, ['rev-parse', '--show-toplevel']).trim()); isGit = true; } catch { /* Non-Git projects still have continuity. */ }
  return { root, isGit, id: hash(root).slice(0, 32) };
}

function fileState(root, relative) {
  const absolute = path.resolve(root, relative);
  const relativeCheck = path.relative(root, absolute);
  if (!relative || relativeCheck.startsWith('..') || path.isAbsolute(relativeCheck) || relative.includes('\0')) fail('Path escapes project');
  // Refuse linked ancestors and linked files; Git submodules are handled separately.
  let cursor = absolute;
  while (cursor !== root) {
    try { if (fs.lstatSync(cursor).isSymbolicLink()) fail(`Linked path refused: ${relative}`); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    cursor = path.dirname(cursor);
  }
  try {
    const stat = fs.statSync(absolute);
    if (!stat.isFile()) fail(`Not a regular file: ${relative}`);
    return hash(fs.readFileSync(absolute));
  } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

function snapshot(p) {
  if (!p.isGit) return { branch: null, head: null, changes: [], files: {} };
  let head = null;
  try { head = git(p.root, ['rev-parse', '--verify', 'HEAD']).trim(); } catch { /* Unborn HEAD. */ }
  let branch = null;
  try { branch = git(p.root, ['symbolic-ref', '--quiet', '--short', 'HEAD']).trim(); } catch { /* Detached HEAD. */ }
  const entries = git(p.root, ['status', '--porcelain=v1', '-z', '--untracked-files=all']).split('\0');
  const changes = [];
  const files = {};
  for (let i = 0; i < entries.length; i++) {
    if (!entries[i]) continue;
    const code = entries[i].slice(0, 2);
    const name = entries[i].slice(3);
    const item = { code, path: name };
    if (/[RC]/.test(code)) item.from = entries[++i];
    changes.push(item);
    try { files[name] = fileState(p.root, name); } catch { files[name] = 'unsupported'; }
  }
  return { branch, head, changes, files };
}

function atomic(file, contents) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temp, contents, { flag: 'wx', mode: 0o600 });
    const fd = fs.openSync(temp, 'r+');
    try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    fs.renameSync(temp, file);
  } finally { if (exists(temp)) fs.unlinkSync(temp); }
}

function lock(file, action) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let fd;
  try { fd = fs.openSync(`${file}.lock`, 'wx', 0o600); }
  catch (error) { if (error.code === 'EEXIST') fail(`Operation locked: ${file}.lock; inspect the owner before removing a stale lock`); throw error; }
  try { fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, time: new Date().toISOString() })); return action(); }
  finally { fs.closeSync(fd); fs.unlinkSync(`${file}.lock`); }
}

const stateFile = p => path.join(home(), 'state', `${p.id}.json`);
function validState(value, p) {
  return value?.version === 1 && value.project === p.root && typeof value.task === 'string'
    && ['active', 'complete'].includes(value.progress) && typeof value.revision === 'string'
    && ['decisions', 'verification', 'next', 'blockers'].every(key => typeof value[key] === 'string');
}
function stateRead(p) {
  const file = stateFile(p);
  if (!exists(file)) return { revision: 'missing', state: null };
  const raw = read(file);
  try {
    const value = JSON.parse(raw);
    if (!validState(value, p)) fail('Invalid schema or project identity');
    return { revision: hash(raw), state: value };
  } catch (error) { return { revision: hash(raw), state: null, error: `Invalid state preserved: ${error.message}`, backup: exists(`${file}.bak`) }; }
}

export function status(p) {
  const saved = stateRead(p);
  const actual = snapshot(p);
  const discrepancies = [];
  if (saved.state) {
    if (saved.state.branch !== actual.branch) discrepancies.push('Saved branch differs; inspect before continuing');
    if (saved.state.head !== actual.head) discrepancies.push('HEAD changed; reconcile saved progress with history and files');
  }
  return { project: p.root, ...saved, actual, discrepancies };
}

function stateWrite(p, expected, input) {
  const file = stateFile(p);
  return lock(file, () => {
    const current = stateRead(p);
    if (current.error) fail(current.error);
    if (current.revision !== expected) fail('Stale state revision; reread and reconcile');
    const actual = snapshot(p);
    const value = { version: 1, project: p.root, revision: crypto.randomUUID(), updated: new Date().toISOString(),
      task: input.task, progress: input.progress, branch: actual.branch, head: actual.head,
      baseline: input.baseline ?? (current.state?.task === input.task ? current.state.baseline : null) ?? null,
      decisions: input.decisions || '', verification: input.verification || '', next: input.next || '', blockers: input.blockers || '' };
    if (value.baseline !== null) {
      const baseline = json(baselineFile(value.baseline));
      if (baseline.project !== p.root) fail('Baseline belongs to another project');
    }
    if (!validState(value, p)) fail('Invalid state fields');
    const contents = `${JSON.stringify(value, null, 2)}\n`;
    if (contents.length > 8192 || contents.split('\n').length > 40) fail('State must stay under 8 KiB and 40 lines');
    if (current.state) atomic(`${file}.bak`, read(file));
    atomic(file, contents);
    return stateRead(p);
  });
}

function stateRecover(p, expected) {
  const file = stateFile(p);
  return lock(file, () => {
    const current = stateRead(p);
    if (!current.error || current.revision !== expected) fail('Recovery needs corrupt state and its current revision');
    const backup = json(`${file}.bak`);
    if (!validState(backup, p)) fail('Backup is invalid');
    const preserved = `${file}.corrupt-${crypto.randomUUID()}`;
    atomic(preserved, read(file));
    atomic(file, `${JSON.stringify(backup, null, 2)}\n`);
    return { ...stateRead(p), preserved };
  });
}

const baselineFile = id => {
  if (!/^[a-f0-9-]{36}$/.test(id || '')) fail('Invalid baseline/token');
  return path.join(home(), 'baselines', `${id}.json`);
};
function begin(p, slug) {
  if (!p.isGit) return { baseline: null, ...snapshot(p), note: 'Non-Git project; no branch or commit' };
  let before = snapshot(p);
  if (!before.branch) fail('Detached HEAD; select a task branch explicitly');
  if (!before.changes.length && !before.branch.startsWith('neef/')) {
    const safe = (slug || 'task').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'task';
    git(p.root, ['switch', '-c', `neef/${safe}-${crypto.randomUUID().slice(0, 8)}`]);
    before = snapshot(p);
  }
  const id = crypto.randomUUID();
  atomic(baselineFile(id), JSON.stringify({ project: p.root, ...before }));
  return { baseline: id, ...before };
}

function prepare(p, id, input) {
  const baseline = json(baselineFile(id));
  const actual = snapshot(p);
  if (baseline.project !== p.root || baseline.head !== actual.head || baseline.branch !== actual.branch) fail('Baseline project, branch, or HEAD changed');
  if (!actual.branch) fail('Detached HEAD');
  if (baseline.changes.some(item => item.code[0] !== ' ' && item.code !== '??')
    || actual.changes.some(item => item.code[0] !== ' ' && item.code !== '??')) fail('Existing staged changes or conflicts; leave index untouched');
  if (!Array.isArray(input.files) || !input.files.length || typeof input.message !== 'string' || !input.message.trim()) fail('Provide files and message');
  const files = [...new Set(input.files.map(name => {
    if (typeof name !== 'string' || path.isAbsolute(name) || /(^|[\\/])\.git([\\/]|$)/i.test(name)) fail('Invalid file path');
    fileState(p.root, name);
    return path.relative(p.root, path.resolve(p.root, name)).split(path.sep).join('/');
  }))];
  for (const name of files) {
    if (baseline.changes.some(item => item.path === name || item.from === name)) fail(`Pre-existing edits: ${name}; preserve and skip commit`);
    if (!actual.changes.some(item => item.path === name)) fail(`No change to commit: ${name}`);
    const mode = git(p.root, ['ls-files', '--stage', '--', name]);
    if (/^160000 /.test(mode)) fail('Submodule commit refused');
  }
  fs.mkdirSync(path.join(home(), 'baselines'), { recursive: true });
  const index = path.join(home(), 'baselines', `${crypto.randomUUID()}.index`);
  const env = { ...process.env, GIT_INDEX_FILE: index, GIT_LITERAL_PATHSPECS: '1' };
  let diff;
  try {
    git(p.root, actual.head ? ['read-tree', actual.head] : ['read-tree', '--empty'], { env });
    git(p.root, ['add', '--', ...files], { env });
    diff = git(p.root, ['diff', '--cached', '--no-ext-diff', '--no-textconv', '--binary'], { env });
    if (!diff) fail('Empty staged diff');
  } finally { if (exists(index)) fs.unlinkSync(index); }
  const token = crypto.randomUUID();
  const selected = Object.fromEntries(files.map(name => [name, fileState(p.root, name)]));
  atomic(baselineFile(token), JSON.stringify({ project: p.root, actual, files, selected, message: input.message, diff, kind: 'commit' }));
  return { token, files, message: input.message, diff };
}

function commit(p, token) {
  const file = baselineFile(token);
  return lock(file, () => {
    const prepared = json(file);
    if (prepared.kind !== 'commit' || prepared.project !== p.root || prepared.used) fail('Invalid or consumed commit token');
    if (JSON.stringify(snapshot(p)) !== JSON.stringify(prepared.actual)
      || prepared.files.some(name => fileState(p.root, name) !== prepared.selected[name])) fail('Working tree changed after review; prepare again');
    // Hold the real index lock throughout; Git and its hooks operate on a private
    // index. Failed commits never change the user's index, including new files.
    const index = path.resolve(p.root, git(p.root, ['rev-parse', '--git-path', 'index']).trim());
    const indexLock = `${index}.lock`;
    let fd = fs.openSync(indexLock, 'wx');
    const privateIndex = path.join(home(), 'baselines', `${crypto.randomUUID()}.index`);
    const env = { ...process.env, GIT_INDEX_FILE: privateIndex, GIT_LITERAL_PATHSPECS: '1' };
    let published = false;
    let output;
    try {
      if (JSON.stringify(snapshot(p)) !== JSON.stringify(prepared.actual)) fail('Working tree changed while acquiring index lock');
      if (exists(index)) fs.copyFileSync(index, privateIndex);
      else git(p.root, ['read-tree', '--empty'], { env });
      git(p.root, ['add', '--', ...prepared.files], { env });
      const diff = git(p.root, ['diff', '--cached', '--no-ext-diff', '--no-textconv', '--binary'], { env });
      if (diff !== prepared.diff) fail('Staged diff changed after review; prepare again');
      output = git(p.root, ['commit', '-m', prepared.message], { env });
      fs.writeFileSync(fd, fs.readFileSync(privateIndex));
      fs.fsyncSync(fd);
      fs.closeSync(fd); fd = undefined;
      fs.renameSync(indexLock, index);
      published = true;
      prepared.used = true;
      atomic(file, JSON.stringify(prepared));
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
      if (!published && exists(indexLock)) fs.unlinkSync(indexLock);
      if (exists(privateIndex)) fs.unlinkSync(privateIndex);
    }
    return { ...snapshot(p), output };
  });
}

function commandVersion(command) {
  // Windows npm shims need cmd; command names here are fixed, never user input.
  const result = spawnSync(process.platform === 'win32' ? 'cmd.exe' : command,
    process.platform === 'win32' ? ['/d', '/s', '/c', `${command} --version`] : ['--version'],
    { encoding: 'utf8', timeout: 15000, windowsHide: true });
  return result.status === 0 ? result.stdout.trim() : null;
}

export function doctor() {
  const user = process.env.NEEF_USER_HOME || os.homedir();
  const roots = ['.agents/skills', '.claude/skills', '.codex/skills', '.copilot/skills', '.config/opencode/skills', '.config/zed/skills', '.claude/commands'];
  const checks = [];
  const add = (name, ok, fix) => checks.push({ name, ok, ...(!ok ? { fix } : {}) });
  add('Node 20+', Number(process.versions.node.split('.')[0]) >= 20, 'Install Node.js 20 or later');
  for (const command of ['git', 'claude', 'codex']) add(command, !!commandVersion(command), `Install ${command} and ensure it is on PATH`);
  const shared = path.join(home(), 'neef.mjs');
  add('shared utility', exists(shared), 'Run node scripts/install.mjs --apply from the source project');
  const receipt = path.join(home(), 'install.json');
  try {
    const installed = json(receipt);
    add('installed file hashes', Object.entries(installed.files).every(([file, digest]) => exists(file) && hash(fs.readFileSync(file)) === digest), 'Inspect local edits; reinstall only after preserving them');
  } catch { add('install receipt', false, 'Reinstall from the source project'); }
  for (const agent of ['.claude', '.agents']) {
    const skill = path.join(user, agent, 'skills/neef/SKILL.md');
    add(`${agent} skill`, exists(skill) && /name: neef/.test(read(skill)), 'Reinstall Neef');
    add(`${agent} synchronized instructions`, exists(skill) && exists(path.join(home(), 'SKILL.md')) && read(skill) === read(path.join(home(), 'SKILL.md')), 'Reinstall Neef from its source');
  }
  const claude = path.join(user, '.claude/skills/neef/SKILL.md');
  const codex = path.join(user, '.agents/skills/neef/agents/openai.yaml');
  add('Claude explicit-only', exists(claude) && /disable-model-invocation: true/.test(read(claude)), 'Reinstall Neef');
  add('Codex explicit-only', exists(codex) && /allow_implicit_invocation: false/.test(read(codex)), 'Reinstall Neef');
  const stateDir = path.join(home(), 'state');
  try { fs.accessSync(stateDir, fs.constants.R_OK | fs.constants.W_OK); add('state directory permissions', true); }
  catch { add('state directory permissions', false, 'Reinstall or correct state directory permissions'); }
  if (exists(stateDir)) for (const name of fs.readdirSync(stateDir)) {
    if (name.endsWith('.lock')) add(`state lock ${name}`, false, 'Inspect recorded owner; remove only if confirmed stale');
    if (!name.endsWith('.json')) continue;
    try { const value = json(path.join(stateDir, name)); add(`state ${name}`, validState(value, { root: value.project }), 'Inspect preserved file and .bak; use state-recover'); }
    catch { add(`state ${name}`, false, 'Inspect preserved file and .bak; use state-recover'); }
  }
  const obsolete = [];
  for (const root of roots) for (const name of legacy) for (const suffix of ['', '.md']) {
    const target = path.join(user, root, `${name}${suffix}`);
    try { fs.lstatSync(target); obsolete.push(target); } catch { /* Absent. */ }
  }
  const metadata = path.join(user, '.agents/.skill-lock.json');
  if (exists(metadata)) {
    try { for (const name of legacy) if (Object.hasOwn(json(metadata).skills || {}, name)) obsolete.push(`${metadata}#${name}`); }
    catch { add('Skills CLI metadata', false, 'Inspect invalid lock file; do not overwrite unrelated entries'); }
  }
  add('legacy ED absent', obsolete.length === 0, 'Inventory and remove only the eight exact ED installations with backups');
  return { ok: checks.every(check => check.ok), checks, obsolete, discovery: 'Paths and configuration checked; native invocation requires a fresh agent session.' };
}

export async function main(args = process.argv.slice(2)) {
  const option = args.indexOf('--project');
  let cwd = process.cwd();
  if (option >= 0) { cwd = args[option + 1] || fail('Missing project path'); args.splice(option, 2); }
  const [command = 'help', argument] = args;
  if (command === 'help') return { commands: ['status', 'begin <slug>', 'prepare <baseline-id> (stdin: {files,message})', 'commit <reviewed-token>', 'state-write <expected-revision> (stdin: {task,progress,decisions,verification,next,blockers})', 'state-recover <corrupt-revision>', 'doctor'], options: '--project <path>; NEEF_HOME overrides shared data for isolated tests', modes: '<task>, continue, status, help, doctor are agent skill modes; continue is implemented by the agent using status' };
  if (command === 'doctor') return doctor();
  const p = project(cwd);
  const input = () => JSON.parse(fs.readFileSync(0, 'utf8'));
  if (command === 'status') return status(p);
  if (command === 'begin') return begin(p, argument);
  if (command === 'state-write') return stateWrite(p, argument, input());
  if (command === 'state-recover') return stateRecover(p, argument);
  if (command === 'prepare') return prepare(p, argument, input());
  if (command === 'commit') return commit(p, argument);
  fail(`Unknown helper command: ${command}; run help`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { print(await main()); } catch (error) { print({ error: error.message }); process.exitCode = 1; }
}
