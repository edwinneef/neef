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
    && (value.context === undefined || (value.context?.version === 1
      && ['minimal', 'full'].includes(value.context.depth) && typeof value.context.fingerprint === 'string'))
    && (value.recommendations === undefined || validRecommendations(value.recommendations))
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
  if (saved.state?.task) {
    if (saved.state.branch !== actual.branch) discrepancies.push('Saved branch differs; inspect before continuing');
    if (saved.state.head !== actual.head) discrepancies.push('HEAD changed; reconcile saved progress with history and files');
  }
  return { project: p.root, ...saved, actual, discrepancies };
}

function saveState(p, current, value) {
  const file = stateFile(p);
  // Keep project context readable as one field without expanding a small state
  // file into a permanent discovery report.
  const { context, recommendations, ...task } = value;
  let contents = JSON.stringify(task, null, 2);
  for (const [key, field] of Object.entries({ context, recommendations })) {
    if (field) contents = `${contents.slice(0, -2)},\n  "${key}": ${JSON.stringify(field)}\n}`;
  }
  contents += '\n';
  if (Buffer.byteLength(contents) > 8192 || contents.split('\n').length > 40) fail('State must stay under 8 KiB and 40 lines');
  if (current.state) atomic(`${file}.bak`, read(file));
  atomic(file, contents);
  return stateRead(p);
}

function stateWrite(p, expected, input) {
  const file = stateFile(p);
  return lock(file, () => {
    const current = stateRead(p);
    if (current.error) fail(current.error);
    if (current.revision !== expected) fail('Stale state revision; reread and reconcile');
    if (input.progress === 'complete' && !Object.hasOwn(input, 'recommendations')) fail('Completed tasks require evaluated recommendations; provide primary:null with a reason when none is supported');
    const actual = snapshot(p);
    const value = { version: 1, project: p.root, revision: crypto.randomUUID(), updated: new Date().toISOString(),
      task: input.task, progress: input.progress, branch: actual.branch, head: actual.head,
      baseline: input.baseline ?? (current.state?.task === input.task ? current.state.baseline : null) ?? null,
      ...(current.state?.context ? { context: current.state.context } : {}),
      ...(current.state?.recommendations ? { recommendations: current.state.recommendations } : {}),
      decisions: input.decisions ?? (current.state?.task === input.task ? current.state.decisions : '') ?? '',
      verification: input.verification || '',
      next: input.next ?? (input.progress === 'active' && current.state?.task === input.task ? current.state.next : '') ?? '',
      blockers: input.blockers || '' };
    if (Object.hasOwn(input, 'recommendations')) value.recommendations = recommendations(input.recommendations, value.progress, { task: value.task, branch: actual.branch, head: actual.head });
    if (value.baseline !== null) {
      const baseline = json(baselineFile(value.baseline));
      if (baseline.project !== p.root) fail('Baseline belongs to another project');
    }
    if (!validState(value, p)) fail('Invalid state fields');
    return saveState(p, current, value);
  });
}

const actionKinds = ['REQUIRED', 'RECOMMENDED', 'OPTIONAL'];
const shortText = (value, limit) => typeof value === 'string' && !!value.trim() && value.length <= limit;
function validAction(value) {
  return value && actionKinds.includes(value.kind) && shortText(value.action, 600) && shortText(value.reason, 400);
}
function validRecommendations(value) {
  return value && (value.primary === null || validAction(value.primary))
    && Array.isArray(value.alternatives) && value.alternatives.length <= 2 && value.alternatives.every(validAction)
    && (value.primary !== null || (value.alternatives.length === 0 && shortText(value.reason, 400)));
}
function recommendations(input, progress, basis) {
  if (!validRecommendations(input)) fail('Provide primary:{kind,action,reason} and up to two alternatives, or primary:null with reason and alternatives:[]');
  const candidates = [input.primary, ...input.alternatives].filter(Boolean)
    .map(({ kind, action, reason }) => ({ kind, action: action.trim(), reason: reason.trim() }))
    .sort((a, b) => actionKinds.indexOf(a.kind) - actionKinds.indexOf(b.kind));
  if (progress === 'complete' && candidates.some(item => item.kind === 'REQUIRED')) fail('Required work belongs to the unfinished original task; keep progress active and use continue');
  if (new Set(candidates.map(item => item.action.toLowerCase())).size !== candidates.length) fail('Duplicate recommendations');
  return { primary: candidates[0] || null, reason: candidates.length ? '' : input.reason.trim(), alternatives: candidates.slice(1), basis };
}

function recommendationsWrite(p, expected, input) {
  return lock(stateFile(p), () => {
    const current = stateRead(p);
    if (current.error) fail(current.error);
    if (current.revision !== expected) fail('Stale state revision; reread and reconcile');
    if (!current.state) fail('No task state; record the development task first');
    const actual = snapshot(p);
    const value = recommendations(input, current.state.progress, { task: current.state.task, branch: actual.branch, head: actual.head });
    if (JSON.stringify(value) === JSON.stringify(current.state.recommendations)) return current;
    return saveState(p, current, { ...current.state, recommendations: value });
  });
}

function next(p) {
  const current = status(p);
  if (current.error) return { ...current, candidates: [], reason: current.error, requiresRevalidation: true };
  if (current.state?.progress === 'active') return { ...current, candidates: [], reason: 'Original task is unfinished; use neef continue', resume: 'continue', requiresRevalidation: true };
  const saved = current.state?.recommendations;
  const candidates = saved ? [saved.primary, ...saved.alternatives].filter(Boolean) : [];
  const basis = saved?.basis;
  if (basis && (basis.branch !== current.actual.branch || basis.head !== current.actual.head || basis.task !== current.state.task)) current.discrepancies.push('Project changed since recommendations were saved; inspect relevance before selecting');
  return { ...current, candidates, requiresRevalidation: true,
    reason: candidates.length ? 'Advisory candidates only; the agent must inspect current code and goals before implementing one' : saved?.reason || 'No supported next action is saved' };
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
    saveState(p, { state: null }, backup);
    return { ...stateRead(p), preserved };
  });
}

function discover(p, minimal) {
  const skip = new Set(['.git', 'node_modules', 'vendor', 'dist', 'build', 'target', '.next', '.cache', '.venv', 'venv', '__pycache__', 'coverage', '.test-artifacts']);
  const files = [];
  const structure = [];
  const warnings = [];
  const sources = {};
  let visited = 0;
  let reads = 0;
  const maxEntries = minimal ? 100 : 800;
  const maxReads = minimal ? 12 : 50;
  const walk = (directory, depth) => {
    let entries;
    try { entries = fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)); }
    catch { warnings.push(`Unreadable directory: ${path.relative(p.root, directory) || '.'}`); return; }
    const children = [];
    for (const entry of entries) {
      if (++visited > maxEntries) return;
      if (entry.isSymbolicLink() || skip.has(entry.name) || (entry.name.startsWith('.') && entry.name !== '.github')) continue;
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(p.root, absolute).split(path.sep).join('/');
      if (directory === p.root && structure.length < 16) structure.push(`${entry.name}${entry.isDirectory() ? '/' : ''}`);
      if (entry.isFile()) files.push(relative);
      if (entry.isDirectory() && depth > 0) children.push(absolute);
    }
    for (const child of children) { if (visited >= maxEntries) break; walk(child, depth - 1); }
  };
  walk(p.root, minimal ? 1 : 3);
  if (visited > maxEntries) warnings.push('Entry budget reached; discovery is partial');
  const load = relative => {
    const absolute = path.resolve(p.root, relative);
    try {
      // Walk only real ancestors, including for inherited instruction files.
      for (let cursor = absolute; cursor !== path.dirname(cursor); cursor = path.dirname(cursor)) {
        if (fs.lstatSync(cursor).isSymbolicLink()) return null;
      }
      const stat = fs.statSync(absolute);
      if (!stat.isFile()) return null;
      if (++reads > maxReads) { warnings.push('Read budget reached; inspect remaining instructions manually'); return null; }
      if (stat.size > 32768) { warnings.push(`Large file left for focused inspection: ${relative}`); sources[relative] = `${stat.size}:${stat.mtimeMs}`; return null; }
      const text = read(absolute);
      sources[relative] = hash(text).slice(0, 16);
      return text;
    } catch (error) { if (error.code !== 'ENOENT') warnings.push(`Unreadable file: ${relative}`); return null; }
  };
  const instructions = [];
  for (let directory = p.root; ; directory = path.dirname(directory)) {
    for (const name of ['AGENTS.md', 'CLAUDE.md']) {
      const relative = path.relative(p.root, path.join(directory, name)).split(path.sep).join('/');
      const text = load(relative);
      if (text !== null || sources[relative]) instructions.push(relative);
    }
    if (directory === path.dirname(directory)) break;
  }
  if (!minimal) for (const file of files.filter(name => /\/(AGENTS|CLAUDE)\.md$/.test(name)).slice(0, 8)) {
    const text = load(file);
    if (text !== null || sources[file]) instructions.push(file);
  }
  const languages = new Set();
  const frameworks = new Set();
  const entryPoints = new Set();
  const conventions = [];
  const commands = [];
  const extensions = { '.ts': 'TypeScript', '.tsx': 'TypeScript', '.js': 'JavaScript', '.jsx': 'JavaScript', '.mjs': 'JavaScript', '.py': 'Python', '.rs': 'Rust', '.go': 'Go', '.cs': 'C#', '.lua': 'Lua' };
  for (const file of files) {
    const language = extensions[path.extname(file)];
    if (language) languages.add(language);
    if (/(^|\/)(index|main|app|server)\.(m?[jt]sx?|py|rs|go)$/.test(file) && entryPoints.size < 8) entryPoints.add(file);
  }
  const category = name => /deploy|publish|release/i.test(name) ? 'deployment' : /test|check/i.test(name) ? 'test' : /lint|format/i.test(name) ? 'lint' : /build|compile|typecheck/i.test(name) ? 'build' : null;
  const manifests = ['package.json', ...(!minimal ? files.filter(file => file !== 'package.json' && file.endsWith('/package.json')).slice(0, 8) : [])];
  for (const manifest of manifests) {
    const text = load(manifest);
    if (text === null) continue;
    let pkg;
    try { pkg = JSON.parse(text); } catch { warnings.push(`Invalid manifest: ${manifest}`); continue; }
    const directory = path.posix.dirname(manifest);
    const manager = /^pnpm@/.test(pkg.packageManager || '') || files.includes('pnpm-lock.yaml') ? 'pnpm'
      : /^yarn@/.test(pkg.packageManager || '') || files.includes('yarn.lock') ? 'yarn'
        : /^bun@/.test(pkg.packageManager || '') || files.some(file => /^bun\.lockb?$/.test(file)) ? 'bun' : 'npm';
    const dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const [name, label] of Object.entries({ react: 'React', next: 'Next.js', vite: 'Vite', express: 'Express', vue: 'Vue', svelte: 'Svelte', typescript: 'TypeScript' })) {
      if (Object.hasOwn(dependencies, name)) (label === 'TypeScript' ? languages : frameworks).add(label);
    }
    if (pkg.type === 'module') conventions.push(`${manifest}: ES modules`);
    if (pkg.workspaces) conventions.push(`${manifest}: workspace packages`);
    for (const target of [pkg.main, pkg.module, ...Object.values(typeof pkg.bin === 'object' ? pkg.bin : { bin: pkg.bin })]) {
      if (typeof target === 'string' && target.length < 160) entryPoints.add(path.posix.join(directory, target));
    }
    for (const name of Object.keys(pkg.scripts || {}).slice(0, 40)) {
      const kind = category(name);
      if (kind && /^[\w:.-]+$/.test(name) && commands.length < 20) commands.push({ kind, directory, run: `${manager} run ${name}` });
    }
  }
  for (const [manifest, language] of [['pyproject.toml', 'Python'], ['Cargo.toml', 'Rust'], ['go.mod', 'Go']]) {
    if (!files.includes(manifest)) continue;
    languages.add(language);
    const text = load(manifest) || '';
    if (manifest === 'pyproject.toml') for (const name of ['django', 'fastapi', 'flask', 'pytest', 'ruff']) if (new RegExp(`\\b${name}\\b`, 'i').test(text)) frameworks.add(name);
    const declared = manifest === 'Cargo.toml' ? [['build', 'cargo build'], ['test', 'cargo test']]
      : manifest === 'go.mod' ? [['build', 'go build ./...'], ['test', 'go test ./...']]
        : frameworks.has('pytest') ? [['test', 'python -m pytest']] : [];
    for (const [kind, run] of declared) if (commands.length < 20) commands.push({ kind, directory: '.', run });
  }
  for (const file of files.filter(name => /(^|\/)(tsconfig[^/]*\.json|\.editorconfig)$/.test(name)).slice(0, minimal ? 1 : 4)) {
    const text = load(file) || '';
    if (/"strict"\s*:\s*true/.test(text)) conventions.push(`${file}: strict TypeScript`);
    if (/"paths"\s*:/.test(text)) conventions.push(`${file}: import aliases; inspect before adding imports`);
  }
  const makefile = files.find(file => /^(Makefile|makefile)$/.test(file));
  if (makefile && !minimal) for (const match of (load(makefile) || '').matchAll(/^([\w.-]+):[^=]/gm)) {
    const kind = category(match[1]);
    if (kind && commands.length < 20) commands.push({ kind, directory: '.', run: `make ${match[1]}` });
  }
  const deployment = files.filter(file => /(^|\/)(Dockerfile|vercel\.json|netlify\.toml|fly\.toml|wrangler\.(toml|jsonc?)|.*deploy.*\.(ps1|py|sh))$|^\.github\/workflows\//i.test(file)).slice(0, 6);
  if (!minimal) for (const file of files.filter(name => /(^|\/)(build|test|run_tests|lint|deploy)[\w.-]*\.(mjs|js|py|ps1)$/.test(name)).slice(0, 6)) {
    if (!/^[\w./ -]+$/.test(file) || commands.length >= 20) continue;
    const runner = /\.py$/.test(file) ? 'python' : /\.ps1$/.test(file) ? 'powershell -NoProfile -File' : 'node';
    commands.push({ kind: category(path.posix.basename(file)), directory: '.', run: `${runner} "${file}"` });
  }
  const tests = files.filter(file => /(^|\/)(tests?|__tests__)\/|\.(test|spec)\.[^.]+$/.test(file));
  if (tests.length) conventions.push(`Tests: ${tests.slice(0, 3).join(', ')}`);
  const context = { version: 1, depth: minimal ? 'minimal' : 'full', structure, languages: [...languages].sort(), frameworks: [...frameworks].sort(),
    entryPoints: [...entryPoints].slice(0, 8), instructions: instructions.slice(0, 12), commands, deployment, conventions: conventions.slice(0, 10),
    fingerprint: hash(JSON.stringify({ sources, files })), architecture: '' };
  return { context, warnings: [...new Set(warnings)].slice(0, 8) };
}

function setup(p, minimal = false) {
  const before = stateRead(p);
  if (before.error) fail(before.error);
  if (minimal && before.state?.context) return { initialized: false, revision: before.revision };
  const relativeHome = path.relative(p.root, home());
  if (!relativeHome || (relativeHome !== '..' && !relativeHome.startsWith(`..${path.sep}`) && !path.isAbsolute(relativeHome))) fail('Neef state storage must be outside the project');
  const { context, warnings } = discover(p, minimal);
  const safety = { projectReadable: !warnings.some(warning => warning === 'Unreadable directory: .'), runtime: Number(process.versions.node.split('.')[0]) >= 20,
    projectWritable: true, git: p.isGit, dirty: false, selectiveCommitAvailable: false, commandsExecuted: false };
  try { fs.accessSync(p.root, fs.constants.W_OK); }
  catch { safety.projectWritable = false; warnings.push('Project directory is not writable; inspect permissions before editing'); }
  if (p.isGit) {
    const raw = git(p.root, ['status', '--porcelain=v1', '-z', '--untracked-files=normal']);
    safety.dirty = raw.length > 0;
    let branch = null;
    try { branch = git(p.root, ['symbolic-ref', '--quiet', '--short', 'HEAD']).trim(); } catch { warnings.push('Detached HEAD; explicit branch selection required for commits'); }
    safety.branch = branch;
    safety.stagedOrConflicted = raw.split('\0').some(entry => entry && entry[0] !== ' ' && !entry.startsWith('??'));
    safety.selectiveCommitAvailable = !!branch && !safety.stagedOrConflicted && safety.projectWritable;
    if (safety.stagedOrConflicted) warnings.push('Staged changes or conflicts must be preserved; automatic commits are unavailable');
    const index = path.resolve(p.root, git(p.root, ['rev-parse', '--git-path', 'index']).trim());
    try { fs.accessSync(exists(index) ? index : path.dirname(index), fs.constants.W_OK); }
    catch { safety.selectiveCommitAvailable = false; warnings.push('Git index is not writable; inspect permissions before committing'); }
    if (exists(`${index}.lock`)) { safety.selectiveCommitAvailable = false; warnings.push('Git index is locked; inspect its owner before committing'); }
    if (minimal) context.git = { repository: true };
    else {
      let subjects = [];
      let hooks = '.git/hooks';
      try { subjects = git(p.root, ['log', '-3', '--format=%s']).trim().split('\n').filter(Boolean).map(subject => subject.slice(0, 100)); } catch { /* No commits yet. */ }
      try { hooks = git(p.root, ['config', '--get', 'core.hooksPath']).trim(); } catch { /* Git default. */ }
      context.git = { recentSubjects: subjects, hooks };
    }
  } else warnings.push('No Git repository; development and shared context work without automatic commits');
  const file = stateFile(p);
  return lock(file, () => {
    const current = stateRead(p);
    if (current.error) fail(current.error);
    if (current.revision !== before.revision) fail('Stale state revision; reread and reconcile');
    if (current.state?.context?.fingerprint === context.fingerprint) context.architecture = current.state.context.architecture || '';
    if (JSON.stringify(current.state?.context) === JSON.stringify(context)) return { initialized: false, revision: current.revision, context, safety: { ...safety, externalStateWritable: true }, warnings };
    const value = current.state || { version: 1, project: p.root, revision: crypto.randomUUID(), updated: new Date().toISOString(),
      task: '', progress: 'complete', branch: null, head: null, baseline: null, decisions: '', verification: '', next: '', blockers: '' };
    const saved = saveState(p, current, { ...value, context });
    return { initialized: true, revision: saved.revision, context, safety: { ...safety, externalStateWritable: true }, warnings };
  });
}

function bootstrap(p) {
  try { return setup(p, true); }
  catch (error) { return { initialized: false, warning: `Context bootstrap skipped: ${error.message}` }; }
}

function contextWrite(p, expected, input) {
  if (typeof input.architecture !== 'string' || input.architecture.length > 1200) fail('Architecture must be a concise string under 1200 characters');
  return lock(stateFile(p), () => {
    const current = stateRead(p);
    if (current.error) fail(current.error);
    if (current.revision !== expected) fail('Stale state revision; reread and reconcile');
    if (!current.state?.context) fail('Discover project context first with setup or bootstrap');
    if (current.state.context.architecture === input.architecture) return current;
    return saveState(p, current, { ...current.state, context: { ...current.state.context, architecture: input.architecture } });
  });
}

const baselineFile = id => {
  if (!/^[a-f0-9-]{36}$/.test(id || '')) fail('Invalid baseline/token');
  return path.join(home(), 'baselines', `${id}.json`);
};
function begin(p, slug) {
  const initialized = bootstrap(p);
  const context = { initialized: initialized.initialized, ...(initialized.warning ? { warning: initialized.warning } : {}) };
  if (!p.isGit) return { baseline: null, ...snapshot(p), context, note: 'Non-Git project; no branch or commit' };
  let before = snapshot(p);
  if (!before.branch) fail('Detached HEAD; select a task branch explicitly');
  if (!before.changes.length && !before.branch.startsWith('neef/')) {
    const safe = (slug || 'task').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'task';
    git(p.root, ['switch', '-c', `neef/${safe}-${crypto.randomUUID().slice(0, 8)}`]);
    before = snapshot(p);
  }
  const id = crypto.randomUUID();
  atomic(baselineFile(id), JSON.stringify({ project: p.root, ...before }));
  return { baseline: id, ...before, context };
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
  if (command === 'help') return { commands: ['setup', 'bootstrap', 'context-write <expected-revision> (stdin: {architecture})', 'status', 'next (read-only candidates; agent revalidates and implements)', 'begin <slug>', 'prepare <baseline-id> (stdin: {files,message})', 'commit <reviewed-token>', 'state-write <expected-revision> (stdin: {task,progress,decisions,verification,next,blockers,recommendations})', 'recommendations-write <expected-revision> (stdin: {primary,alternatives,reason})', 'state-recover <corrupt-revision>', 'doctor'], recommendations: 'primary:{kind:REQUIRED|RECOMMENDED|OPTIONAL,action,reason}; alternatives: at most two such actions. For no supported action: primary:null, alternatives:[], reason. Completion requires an explicit recommendation evaluation; REQUIRED work must stay active.', options: '--project <path>; NEEF_HOME overrides shared data for isolated tests', modes: '<task>, grill [--deep] <task>, setup, next, continue, status, help, doctor are agent skill modes; grilling uses native questions and state-write, continue resumes unfinished work, next starts one revalidated follow-up after completion' };
  if (command === 'doctor') return doctor();
  const p = project(cwd);
  const input = () => JSON.parse(fs.readFileSync(0, 'utf8'));
  if (command === 'setup') return setup(p);
  if (command === 'bootstrap') return bootstrap(p);
  if (command === 'context-write') return contextWrite(p, argument, input());
  if (command === 'status') return status(p);
  if (command === 'next') return next(p);
  if (command === 'begin') return begin(p, argument);
  if (command === 'state-write') return stateWrite(p, argument, input());
  if (command === 'recommendations-write') return recommendationsWrite(p, argument, input());
  if (command === 'state-recover') return stateRecover(p, argument);
  if (command === 'prepare') return prepare(p, argument, input());
  if (command === 'commit') return commit(p, argument);
  fail(`Unknown helper command: ${command}; run help`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { print(await main()); } catch (error) { print({ error: error.message }); process.exitCode = 1; }
}
