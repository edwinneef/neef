#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const legacy = ['ed', 'ed-auto', 'ed-feature', 'ed-help', 'ed-next', 'ed-setup', 'ed-skills', 'ed-status'];
const commandCatalog = [
  { name: 'task', guide: 'references/completion.md', usage: '<task>', front: true, intent: 'build', changes: 'Project files and task state; safe local commits; Git for an empty folder', stops: 'Scoped work verified and runnable, or a concrete blocker recorded' },
  { name: 'shape', guide: 'references/shape.md', usage: 'shape [--deep] [--discuss] [idea]', intent: 'explore', changes: 'Without an idea: read-only starters; --discuss: external decisions only; otherwise task decisions then project files', stops: 'Three starter ideas and a choice, or clarified and implemented, unless discussion-only (--discuss)' },
  { name: 'plan', guide: 'references/plan.md', usage: 'plan <feature>', intent: 'build', changes: 'Task decisions and plan first (project/Git unchanged); project files and safe local commits only after one explicit sign-off', stops: 'Questions asked, challenged plan saved and shown for sign-off; approval runs every phase until complete or blocked' },
  { name: 'challenge', guide: 'references/challenge.md', usage: 'challenge [--deep] <topic>', intent: 'choose', changes: 'May save external recommendations and run known tests; project/Git unchanged', stops: 'Evidence-based critique and improvements, also for the last task\'s commits or the project\'s .md files; no implementation' },
  { name: 'prototype', guide: 'references/prototype.md', usage: 'prototype <description>', intent: 'explore', changes: 'External scratch demo and README; source/Git/task state unchanged', stops: 'Working demo and handoff; no automatic production promotion' },
  { name: 'ask', guide: 'references/advisor.md', usage: 'ask [goal]', front: true, intent: 'choose', changes: 'Nothing during advice (read-only)', stops: 'Ranked choices, or the best-fit command for a goal with the full request written inside it; never invokes it. A later explicit selection can execute its action' },
  { name: 'setup', usage: 'setup', intent: 'inspect', changes: 'External context and managed AGENTS.md/CLAUDE.md directions', stops: 'Context and next-prompt rule saved; no project commands run' },
  { name: 'next', guide: 'references/next.md', usage: 'next', front: true, intent: 'build', changes: 'Project files and task state; frequent safe local commits', stops: 'Unfinished task resumed until complete or blocked; otherwise one useful follow-up done' },
  { name: 'status', guide: 'references/status.md', usage: 'status', intent: 'inspect', changes: 'Nothing (read-only)', stops: 'Progress, Git, verification and blockers reported' },
  { name: 'help', usage: 'help', intent: 'inspect', changes: 'Nothing (read-only)', stops: 'Grouped command guide and aliases displayed' },
  { name: 'style', guide: 'references/explanation-styles.md', usage: 'style [simple|guided|technical|kid] [--here]', subskill: false, intent: 'inspect', changes: 'With a name: global explanation preference, or this project only with --here; without: read-only', stops: 'Current style shown or default saved; no project task started' },
  { name: 'importance', guide: 'references/importance.md', usage: 'importance [explore|normal|important] [--here]', subskill: false, intent: 'inspect', changes: 'With a level: global default for how much testing and cross-checking tasks get, or this project only with --here; without: read-only', stops: 'Current level shown or default saved; no project task started' },
  { name: 'doctor', usage: 'doctor', subskill: false, intent: 'inspect', changes: 'Nothing; no implicit repairs', stops: 'Installation health checks and concrete fixes reported' },
];
// The README mode table is generated from the catalog; a test keeps the two identical.
const tableCell = text => text.replaceAll('|', '\\|');
export function modeTable() {
  const rows = commandCatalog.map(({ usage, aliases = [], changes, stops, guide }) => {
    const mode = `\`${tableCell(usage)}\`${aliases.map(alias => ` (alias \`${alias}\`)`).join('')}`;
    const link = guide ? `[${path.basename(guide, '.md')}](${guide})` : '—';
    return `| ${mode} | ${tableCell(changes)} | ${tableCell(stops)} | ${link} |`;
  });
  return ['| Mode | Changes | Stops at | Guide |', '| --- | --- | --- | --- |', ...rows].join('\n');
}
// Former modes and aliases: no longer routed or shown; the installer removes their unedited subskills.
export const retiredCommands = ['review', 'docs', 'merge', 'options', 'auto', 'proto', 'prompt', 'continue'];
export const commandNames = commandCatalog.flatMap(({ name, aliases = [] }) => [name, ...aliases]);
// Direct subskills: canonical commands only; aliases and rare commands stay inside /neef.
export const subskillNames = commandCatalog.filter(command => command.subskill !== false).map(({ name }) => name);
export const commandDescriptions = {
  task: 'Implement and verify a development task',
  shape: 'Choose or clarify an idea; --discuss explores without building',
  plan: 'Ask everything up front, sign off once, then build hands-off',
  challenge: 'Critique an approach and suggest improvements',
  prototype: 'Build an isolated demo to test an idea',
  ask: 'Find the best command for a goal, or rank next actions',
  setup: 'Discover the project and save its context',
  next: 'Resume unfinished work, or do the next useful thing',
  status: 'Show progress, verification and blockers',
  help: 'Explain NEEF commands and when to use them',
};
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

// Like git(), but reports the exit status for commands whose nonzero exit is an answer.
function gitStatus(root, args) {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } });
  if (result.error || result.status > 1) fail(result.error?.message || result.stderr.trim() || `Git failed: ${args[0]}`);
  return result.status;
}

function canonical(p) {
  const resolved = fs.realpathSync.native(p);
  return process.platform === 'win32' ? resolved.replace(/^\\\\\?\\/, '').toLowerCase() : resolved;
}

function storagePath(target) {
  const missing = [];
  let cursor = target;
  while (true) {
    try { return path.resolve(canonical(cursor), ...missing); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      // A dangling link has no canonical target; refuse it rather than guess.
      try { if (fs.lstatSync(cursor).isSymbolicLink()) fail(`Unresolved storage link: ${cursor}`); }
      catch (linkError) { if (linkError.code !== 'ENOENT') throw linkError; }
      const parent = path.dirname(cursor);
      if (parent === cursor) throw error;
      missing.unshift(path.basename(cursor));
      cursor = parent;
    }
  }
}

function requireExternalStorage(p, additional = []) {
  for (const target of [home(), path.join(home(), 'state'), path.join(home(), 'baselines'), ...additional]) {
    const relative = path.relative(p.root, storagePath(target));
    if (!relative || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`))) {
      fail('NEEF state storage must be outside the project');
    }
  }
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
// The plan lives beside the small state file; the state's planHash ties both to one revision.
const planFile = p => stateFile(p).replace(/.json$/, '.plan.json');
const planLimit = 32768;
// A crash between the plan and state writes leaves the previous plan in .bak, still matching the state.
function loadPlan(p, planHash) {
  if (typeof planHash !== 'string') fail('Invalid plan reference');
  const file = planFile(p);
  for (const candidate of [file, `${file}.bak`]) {
    if (!exists(candidate)) continue;
    const raw = read(candidate);
    if (hash(raw) === planHash) return JSON.parse(raw);
  }
  fail(`Plan file missing or does not match state: inspect ${file} and its .bak`);
}
const explanationStyles = ['simple', 'guided', 'technical', 'kid'];
const importanceLevels = ['explore', 'normal', 'important'];
const preferenceKinds = {
  style: { key: 'style', projects: 'projects', choices: explanationStyles, fallback: 'simple', label: 'style simple, guided, technical or kid' },
  importance: { key: 'importance', projects: 'importanceProjects', choices: importanceLevels, fallback: 'normal', label: 'importance explore, normal or important' },
};
// One preferences file holds a global default plus per-project overrides for each kind.
function preference(p, kind, selected, here = false) {
  const { key, projects: projectsKey, choices, fallback, label } = kind;
  const file = path.join(home(), 'preferences.json');
  // A shared preference must never follow a linked file or directory.
  for (let cursor = file; cursor !== path.dirname(cursor); cursor = path.dirname(cursor)) {
    try { if (fs.lstatSync(cursor).isSymbolicLink()) fail(`Linked preference storage refused: ${cursor}`); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const load = () => {
    if (!exists(file)) return { version: 1, style: 'simple' };
    const value = json(file);
    const projects = value?.[projectsKey] ?? {};
    if (value?.version !== 1 || !explanationStyles.includes(value.style) || (value[key] !== undefined && !choices.includes(value[key]))
      || typeof projects !== 'object' || Array.isArray(projects) || !Object.values(projects).every(item => choices.includes(item))) fail(`Invalid preferences preserved; expected version 1 and ${label}`);
    return value;
  };
  // A project override wins over the global default for that project only.
  const result = value => {
    const own = value[projectsKey]?.[p.id], global = value[key] ?? fallback;
    return { [key]: own ?? global, available: choices, scope: own ? 'project' : 'global', global, saved: own !== undefined || value[key] !== undefined, file };
  };
  const update = value => {
    if (!here) return { ...value, [key]: selected };
    const { [p.id]: _, ...others } = value[projectsKey] ?? {};
    const projects = selected === 'clear' ? others : { ...others, [p.id]: selected };
    const { [projectsKey]: __, ...rest } = value;
    return Object.keys(projects).length ? { ...rest, [projectsKey]: projects } : rest;
  };
  if (selected === undefined) return result(load());
  if (!choices.includes(selected) && !(here && selected === 'clear')) fail(`Choose ${label}`);
  requireExternalStorage(p, [file, `${file}.bak`, `${file}.lock`]);
  return lock(file, () => {
    const value = load(), next = update(value);
    if (!exists(file) || JSON.stringify(next) !== JSON.stringify(value)) {
      if (exists(file)) atomic(`${file}.bak`, read(file));
      atomic(file, `${JSON.stringify(next, null, 2)}
`);
    }
    return result(next);
  });
}
const explanationStyle = (p, selected, here) => preference(p, preferenceKinds.style, selected, here);
// Task level beats the project override, which beats the global default.
function effectiveImportance(p, task) {
  if (task) return { level: task, scope: 'task' };
  try { const { importance, scope } = preference(p, preferenceKinds.importance); return { level: importance, scope }; }
  catch { return { level: 'normal', scope: 'default' }; }
}
// A new project starts at explore unless the user chose a level themselves.
function importanceSaved(p) {
  try { return preference(p, preferenceKinds.importance).saved; } catch { return true; }
}
function validState(value, p) {
  return value?.version === 1 && value.project === p.root && typeof value.task === 'string'
    && ['active', 'complete'].includes(value.progress) && typeof value.revision === 'string'
    && (value.context === undefined || (value.context?.version === 1
      && ['minimal', 'full'].includes(value.context.depth) && typeof value.context.fingerprint === 'string'))
    && (value.importance === undefined || importanceLevels.includes(value.importance))
    && (value.recommendations === undefined || validRecommendations(value.recommendations))
    && (value.parked === undefined || validParked(value.parked))
    && (value.outcomes === undefined || (validOutcomes(value.outcomes)
      && (value.progress !== 'complete' || !completionError(value))))
    && (value.plan === undefined || (validPlan(value.plan) && (value.progress !== 'complete' || value.plan.phases.every(phase => phase.status === 'complete'))))
    && ['decisions', 'verification', 'next', 'blockers'].every(key => typeof value[key] === 'string');
}
function stateRead(p) {
  const file = stateFile(p);
  if (!exists(file)) return { revision: 'missing', state: null };
  const raw = read(file);
  try {
    const value = JSON.parse(raw);
    if (Object.hasOwn(value, 'planHash')) { value.plan = loadPlan(p, value.planHash); delete value.planHash; }
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
  return { project: p.root, ...saved, importance: effectiveImportance(p, saved.state?.importance), actual, discrepancies, board: board(saved.state), ribbon: ribbon(saved.state) };
}

// Shared by the scope board and the progress ribbon; both are read-only views of saved state.
const clipWords = (text, max) => {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${space > max / 2 ? cut.slice(0, space) : cut}…`;
};
// The part of a sentence before its first clause break.
const firstClause = text => text.split(/[:;,.]\s| [—–-] /)[0];
const phaseName = phase => phase.title || clipWords(firstClause(phase.task), 32);
// Blocked phases are named by id in the task blockers (plan.md), e.g. "p5: owner verdict".
const phaseFlag = (phase, blockers) => {
  if (phase.status === 'pending' && new Set((blockers || '').split(/[^\w-]+/)).has(phase.id)) return '⚑ blocked';
  return phase.userInput && phase.status !== 'complete' ? '⚑ needs you' : '';
};
// One colored square per phase in plan order, since replies cannot color text: 🟩 done, 🟨 now,
// 🟥 blocked, ⬜ to do. Very long plans show the count alone.
const phaseTrack = (phases, blockers) => phases.length > 20 ? '' : phases.map(phase =>
  phase.status === 'pending' && phaseFlag(phase, blockers) === '⚑ blocked' ? '🟥' : { complete: '🟩', active: '🟨', pending: '⬜' }[phase.status]).join('');
const progress = (phases, blockers) => [phaseTrack(phases, blockers), `${phases.filter(phase => phase.status === 'complete').length} of ${phases.length} done`].filter(Boolean).join('   ');

// A framed plan panel for the foot of every reply while a plan is open. It has no side borders
// because emoji widths differ between terminals and would misalign them.
export function ribbon(state) {
  const phases = state?.task && state.plan?.phases;
  if (!phases) return null;
  const width = 48;
  const title = '╭─ NEEF plan ';
  const lines = [`  ${progress(phases, state.blockers)}`];
  const tag = phase => {
    const flag = phaseFlag(phase, state.blockers);
    return `${phase.id.padEnd(4)}${phaseName(phase)}${flag ? `   ${flag}` : ''}`;
  };
  const active = phases.find(phase => phase.status === 'active');
  const next = phases.find(phase => phase.status === 'pending');
  if (!active && !next) lines.push('  ✓ plan complete');
  if (active) lines.push(`  ▸ NOW    ${tag(active)}`);
  if (next) lines.push(`${active ? '    ' : '  ▸ '}NEXT   ${tag(next)}`);
  return [`${title}${'─'.repeat(width - title.length - 1)}╮`, ...lines, `╰${'─'.repeat(width - 2)}╯`].join('\n');
}

// A read-only text board of the saved scope: a progress line, Now / Next / Done lanes, then parked ideas.
export function board(state) {
  if (!state?.task && !state?.parked?.length) return null;
  const width = 64;
  const label = 8;
  // Packs items into lines of at most max characters, never splitting an item.
  const pack = (items, max, join = ' ') => items.reduce((lines, item) => {
    const last = lines.at(-1);
    if (last && `${last}${join}${item}`.length <= max) lines[lines.length - 1] = `${last}${join}${item}`;
    else lines.push(item);
    return lines;
  }, []);
  const wrap = (text, max) => pack(text.split(/\s+/), max);
  // Puts the label on the first line and indents the rest under it.
  const lane = (name, lines) => lines.map((line, index) => `${(index ? '' : name).padEnd(label)}${line}`);
  const sections = [];
  if (state.task && state.plan) {
    const phases = state.plan.phases;
    const done = phases.filter(phase => phase.status === 'complete');
    sections.push([`${clipWords(firstClause(state.task), 36)}  ${progress(phases, state.blockers)}`]);
    const card = phase => {
      const flag = phaseFlag(phase, state.blockers);
      return `${phase.id.padEnd(4)}${phaseName(phase)}${flag ? `   ${flag}` : ''}`;
    };
    const lanes = [];
    const active = phases.filter(phase => phase.status === 'active');
    const pending = phases.filter(phase => phase.status === 'pending');
    if (done.length < phases.length) lanes.push(...lane('Now', active.length ? active.map(card) : ['–']));
    if (pending.length) lanes.push(...lane('Next', pending.map(card)));
    if (done.length) lanes.push(...lane('Done', pack(done.map(phase => `${phase.id} ${phaseName(phase)}`), width - label, ' · ')));
    sections.push(lanes);
  } else if (state.task) {
    const where = state.progress === 'complete' ? '✓ done' : state.blockers?.trim() ? '⚑ blocked' : 'in progress';
    sections.push([`${clipWords(state.task, width - where.length - 2)}  ${where}`]);
  }
  if (state.parked?.length) {
    sections.push(lane('Parked', state.parked.flatMap((idea, index) =>
      wrap(idea, width - label - 3).map((line, row) => `${(row ? '' : String(index + 1)).padEnd(3)}${line}`))));
  }
  return sections.map(lines => lines.join('\n')).join('\n\n');
}

function prototypeWorkspace(p, slug) {
  const parent = path.join(home(), 'prototypes');
  const root = path.join(parent, p.id);
  requireExternalStorage(p, [root]);
  for (const directory of [parent, root]) {
    try { if (fs.lstatSync(directory).isSymbolicLink()) fail(`Linked prototype storage refused: ${directory}`); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  if (slug !== undefined) {
    if (!/^[a-z0-9][a-z0-9-]{0,47}$/.test(slug)) fail('Provide a prototype slug of 1-48 lowercase letters, digits or hyphens');
    fs.mkdirSync(root, { recursive: true });
    const workspace = fs.mkdtempSync(path.join(root, `${slug}-`));
    return { project: p.root, workspace, readme: path.join(workspace, 'README.md') };
  }
  const workspaces = exists(root) ? fs.readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && !entry.isSymbolicLink())
    .map(entry => ({ workspace: path.join(root, entry.name), created: fs.statSync(path.join(root, entry.name)).birthtimeMs }))
    .sort((a, b) => b.created - a.created || a.workspace.localeCompare(b.workspace))
    .slice(0, 20).map(({ workspace }) => ({ workspace, readme: path.join(workspace, 'README.md') })) : [];
  return { project: p.root, root, workspaces };
}

function saveState(p, current, value) {
  const file = stateFile(p);
  // Keep project context readable as one field without expanding a small state
  // file into a permanent discovery report.
  const { context, recommendations, plan, outcomes, parked, planHash: _, ...task } = value;
  const planContents = plan ? `${JSON.stringify(plan)}
` : null;
  if (planContents && Buffer.byteLength(planContents) > planLimit) fail(`Plan must stay under 32 KiB (this write: ${Buffer.byteLength(planContents)} bytes); shorten phases or acceptance criteria`);
  if (planContents) task.planHash = hash(planContents);
  let contents = JSON.stringify(task, null, 2);
  for (const [key, field] of Object.entries({ context, recommendations, outcomes, parked: parked?.length ? parked : undefined })) {
    if (field) contents = `${contents.slice(0, -2)},\n  "${key}": ${JSON.stringify(field)}\n}`;
  }
  contents += '\n';
  const bytes = Buffer.byteLength(contents);
  const lines = contents.split('\n').length;
  if (bytes > 8192 || lines > 40) fail(`State must stay under 8 KiB and 40 lines (this write: ${bytes} bytes, ${lines} lines); shorten outcomes or notes`);
  // A plan-free state leaves any old plan file in place so its .bak can still recover it.
  const plans = planFile(p);
  if (planContents && (!exists(plans) || read(plans) !== planContents)) {
    if (exists(plans)) atomic(`${plans}.bak`, read(plans));
    atomic(plans, planContents);
  }
  if (current.state) atomic(`${file}.bak`, read(file));
  atomic(file, contents);
  return stateRead(p);
}

// Name each malformed field so callers repair input without reading this source.
function stateInputErrors(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return ['provide one JSON object'];
  const kind = value => Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
  const errors = ['task', 'decisions', 'verification', 'next', 'blockers']
    .filter(key => (key === 'task' ? true : input[key] != null) && typeof input[key] !== 'string')
    .map(key => `${key} must be a string (got ${kind(input[key])})`);
  if (!['active', 'complete'].includes(input.progress)) errors.push('progress must be "active" or "complete"');
  if (input.importance !== undefined && !importanceLevels.includes(input.importance)) errors.push('importance must be explore, normal or important');
  return errors;
}

// A task may commit before its first save. Start from the earliest `begin` baseline taken since
// the previous save when it lies in HEAD's history; otherwise from HEAD at this first save.
function taskStart(p, previous, head) {
  const directory = path.join(home(), 'baselines');
  if (!p.isGit || !head || !exists(directory)) return head;
  const since = previous?.updated ? Date.parse(previous.updated) : 0;
  const candidates = [];
  for (const name of fs.readdirSync(directory).filter(name => /^[a-f0-9-]{36}\.json$/.test(name))) {
    try {
      const file = path.join(directory, name);
      const mtime = fs.statSync(file).mtimeMs;
      if (mtime < since) continue;
      const baseline = json(file);
      if (!baseline.kind && baseline.project === p.root && baseline.head) candidates.push({ mtime, head: baseline.head });
    } catch { /* Unreadable baselines never block a save. */ }
  }
  candidates.sort((a, b) => a.mtime - b.mtime);
  const ancestor = start => { try { return gitStatus(p.root, ['merge-base', '--is-ancestor', start, head]) === 0; } catch { return false; } };
  return candidates.find(candidate => ancestor(candidate.head))?.head ?? head;
}

function stateWrite(p, expected, input) {
  const file = stateFile(p);
  const errors = stateInputErrors(input);
  if (errors.length) fail(`Invalid state fields: ${errors.join('; ')}`);
  return lock(file, () => {
    const current = stateRead(p);
    if (current.error) fail(current.error);
    if (current.revision !== expected) fail('Stale state revision; reread and reconcile');
    if (input.progress === 'complete' && !Object.hasOwn(input, 'recommendations')) fail('Completed tasks require evaluated recommendations; provide primary:null with a reason when none is supported');
    const actual = snapshot(p);
    const value = { version: 1, project: p.root, revision: crypto.randomUUID(), updated: new Date().toISOString(),
      task: input.task, progress: input.progress, branch: actual.branch, head: actual.head,
      // Where this task's history begins: review grades the commits made since.
      start: current.state?.task === input.task ? current.state.start ?? null : taskStart(p, current.state, actual.head),
      baseline: Object.hasOwn(input, 'baseline') ? input.baseline : (current.state?.task === input.task ? current.state.baseline : null) ?? null,
      // A new task without a level records the effective default, so a later default change cannot shift it.
      importance: input.importance ?? (current.state?.task === input.task ? current.state.importance : undefined) ?? effectiveImportance(p).level,
      ...(current.state?.context ? { context: current.state.context } : {}),
      ...(current.state?.recommendations ? { recommendations: current.state.recommendations } : {}),
      ...(current.state?.parked?.length ? { parked: current.state.parked } : {}),
      decisions: input.decisions ?? (current.state?.task === input.task ? current.state.decisions : '') ?? '',
      verification: input.verification ?? (current.state?.task === input.task ? current.state.verification : '') ?? '',
      next: input.next ?? (input.progress === 'active' && current.state?.task === input.task ? current.state.next : '') ?? '',
      blockers: input.blockers ?? (current.state?.task === input.task ? current.state.blockers : '') ?? '' };
    if (Object.hasOwn(input, 'recommendations')) value.recommendations = recommendations(input.recommendations, value.progress, { task: value.task, branch: actual.branch, head: actual.head });
    const plan = Object.hasOwn(input, 'plan') ? input.plan : current.state?.task === input.task ? current.state.plan : undefined;
    if (plan !== undefined) {
      if (!validPlan(plan)) fail('Invalid plan: provide goal, scale, rationale and phases with unique ids, tasks, dependencies, acceptance criteria and valid statuses');
      if (value.progress === 'complete' && plan.phases.some(phase => phase.status !== 'complete')) fail('Unfinished plan phases require active task progress');
      value.plan = plan;
    }
    const outcomes = Object.hasOwn(input, 'outcomes') ? input.outcomes : current.state?.task === input.task ? current.state.outcomes : undefined;
    if (outcomes !== undefined) {
      if (!validOutcomes(outcomes)) fail('Invalid outcomes: provide unique ids, descriptions, required booleans, status pending/passed/failed/blocked and evidence strings; passed outcomes require evidence and at least one outcome must be required');
      value.outcomes = outcomes;
    }
    if (value.progress === 'complete') {
      const error = completionError(value);
      if (error) fail(error);
    }
    if (value.baseline !== null) {
      const baseline = json(baselineFile(value.baseline));
      if (baseline.project !== p.root) fail('Baseline belongs to another project');
    }
    if (!validState(value, p)) fail('Invalid state fields');
    const saved = saveState(p, current, value);
    return { ...saved, board: board(saved.state), ribbon: ribbon(saved.state) };
  });
}

const actionKinds = ['REQUIRED', 'RECOMMENDED', 'OPTIONAL'];
const shortText = (value, limit) => typeof value === 'string' && !!value.trim() && value.length <= limit;
function validOutcomes(value) {
  return Array.isArray(value) && value.length > 0
    && value.every(outcome => outcome && shortText(outcome.id, 60) && shortText(outcome.description, 400)
      && typeof outcome.required === 'boolean' && ['pending', 'passed', 'failed', 'blocked'].includes(outcome.status)
      && typeof outcome.evidence === 'string' && outcome.evidence.length <= 800
      && (outcome.status !== 'passed' || !!outcome.evidence.trim()))
    && value.some(outcome => outcome.required)
    && new Set(value.map(outcome => outcome.id)).size === value.length;
}
// Light records by default: an ordinary task completes on its verification note. Plans and important work keep full outcome records.
function completionError(value) {
  const full = value.plan !== undefined || value.importance === 'important';
  if (value.outcomes === undefined && !full) {
    if (!value.verification.trim()) return 'Completed tasks require a verification note saying what was done and checked';
  } else {
    if (!validOutcomes(value.outcomes)) return 'Completed tasks require outcomes with a result and evidence for each required outcome when a plan exists or importance is important';
    if (value.outcomes.some(outcome => outcome.required && outcome.status !== 'passed')) return 'Unfinished required outcomes require active task progress';
  }
  if (value.blockers.trim()) return 'Unresolved blockers require active task progress; explicitly clear resolved blockers';
  return null;
}
function validPlan(value) {
  if (!value || !shortText(value.goal, 600) || !['small', 'large'].includes(value.scale) || !shortText(value.rationale, 400)
    || !Array.isArray(value.phases) || !value.phases.length
    || (value.scale === 'small' ? value.phases.length !== 1 : value.phases.length < 2)) return false;
  const phases = value.phases;
  if (!phases.every(phase => phase && shortText(phase.id, 60) && shortText(phase.task, 600)
    && ['pending', 'active', 'complete'].includes(phase.status) && Array.isArray(phase.dependsOn)
    && phase.dependsOn.every(id => shortText(id, 60)) && new Set(phase.dependsOn).size === phase.dependsOn.length
    && Array.isArray(phase.acceptance) && phase.acceptance.length && phase.acceptance.every(item => shortText(item, 400))
    && (phase.verification === undefined || shortText(phase.verification, 800))
    && (phase.userInput === undefined || shortText(phase.userInput, 300))
    && (phase.title === undefined || shortText(phase.title, 40))
    && (phase.status !== 'complete' || shortText(phase.verification, 800)))) return false;
  const byId = new Map(phases.map(phase => [phase.id, phase]));
  if (byId.size !== phases.length || phases.filter(phase => phase.status === 'active').length > 1) return false;
  const visited = new Set();
  const visiting = new Set();
  function visit(phase) {
    if (visiting.has(phase.id)) return false;
    if (visited.has(phase.id)) return true;
    visiting.add(phase.id);
    for (const id of phase.dependsOn) {
      const dependency = byId.get(id);
      if (!dependency || (phase.status !== 'pending' && dependency.status !== 'complete') || !visit(dependency)) return false;
    }
    visiting.delete(phase.id);
    visited.add(phase.id);
    return true;
  }
  return phases.every(visit);
}
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
  if (progress === 'complete' && candidates.some(item => item.kind === 'REQUIRED')) fail('Required work belongs to the unfinished original task; keep progress active and use next');
  if (new Set(candidates.map(item => item.action.toLowerCase())).size !== candidates.length) fail('Duplicate recommendations');
  return { primary: candidates[0] || null, reason: candidates.length ? '' : input.reason.trim(), alternatives: candidates.slice(1), basis };
}

function recommendationsWrite(p, expected, input) {
  return lock(stateFile(p), () => {
    const current = stateRead(p);
    if (current.error) fail(current.error);
    if (current.revision !== expected) fail('Stale state revision; reread and reconcile');
    const actual = snapshot(p);
    const state = current.state || { version: 1, project: p.root, revision: crypto.randomUUID(), updated: new Date().toISOString(),
      task: '', progress: 'complete', branch: actual.branch, head: actual.head, baseline: null, decisions: '', verification: '', next: '', blockers: '' };
    const value = recommendations(input, state.progress, { task: state.task, branch: actual.branch, head: actual.head });
    if (JSON.stringify(value) === JSON.stringify(state.recommendations)) return current;
    return saveState(p, current, { ...state, recommendations: value });
  });
}

// Ideas set aside while other work is open. The list belongs to the project, not to one task, so every task write keeps it.
function validParked(value) {
  return Array.isArray(value) && value.length <= 20 && value.every(item => shortText(item, 200)) && new Set(value).size === value.length;
}
function park(p, expected, input) {
  return lock(stateFile(p), () => {
    const current = stateRead(p);
    if (current.error) fail(current.error);
    if (current.revision !== expected) fail('Stale state revision; reread and reconcile');
    const hasAdd = Object.hasOwn(input ?? {}, 'add'), hasRemove = Object.hasOwn(input ?? {}, 'remove');
    if (hasAdd === hasRemove) fail('Provide exactly one of add (the idea in one line) or remove (its text or 1-based position)');
    const actual = snapshot(p);
    const state = current.state || { version: 1, project: p.root, revision: crypto.randomUUID(), updated: new Date().toISOString(),
      task: '', progress: 'complete', branch: actual.branch, head: actual.head, baseline: null, decisions: '', verification: '', next: '', blockers: '' };
    const list = state.parked ?? [];
    let parked;
    if (hasAdd) {
      if (!shortText(input.add, 200)) fail('A parked idea is one nonempty line of at most 200 characters');
      const idea = input.add.trim();
      if (list.includes(idea)) return current;
      if (list.length >= 20) fail('The parking list holds at most 20 ideas; remove one first');
      parked = [...list, idea];
    } else {
      const index = Number.isInteger(input.remove) ? input.remove - 1 : list.indexOf(String(input.remove).trim());
      if (index < 0 || index >= list.length) fail('No such parked idea');
      parked = list.filter((_, i) => i !== index);
    }
    const { parked: _, ...rest } = state;
    return saveState(p, current, parked.length ? { ...rest, parked } : rest);
  });
}

function next(p) {
  const current = status(p);
  if (current.error) return { ...current, candidates: [], reason: current.error, requiresRevalidation: true };
  if (current.state?.progress === 'active') return { ...current, candidates: [], reason: 'Original task is unfinished; resume it before choosing new work', resume: 'continue', requiresRevalidation: true };
  const saved = current.state?.recommendations;
  const candidates = saved ? [saved.primary, ...saved.alternatives].filter(Boolean) : [];
  const basis = saved?.basis;
  if (basis && (basis.branch !== current.actual.branch || basis.head !== current.actual.head || basis.task !== current.state.task)) current.discrepancies.push('Project changed since recommendations were saved; inspect relevance before selecting');
  return { ...current, candidates, requiresRevalidation: true, discoveryRequired: true,
    savedReason: saved?.reason || null,
    reason: 'Inspect current code, goals and project instructions; revalidate advice, investigate uncertainties and execute the highest-value safe action. Saved advice or its absence does not establish that no work remains.' };
}

function stateRecover(p, expected) {
  const file = stateFile(p);
  return lock(file, () => {
    const current = stateRead(p);
    if (!current.error || current.revision !== expected) fail('Recovery needs corrupt state and its current revision');
    const backup = json(`${file}.bak`);
    if (Object.hasOwn(backup, 'planHash')) { backup.plan = loadPlan(p, backup.planHash); delete backup.planHash; }
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

const unblockDirection = ' When only the user can unblock the work, such as approving a host prompt, changing permissions or running a step themselves, name that exact step, then give a NEEF resume command whose placeholders list what NEEF needs reported back, for example `/neef check 1 result: <pass/fail>, <log path>`; never suggest diagnosing or retrying a permission or policy denial.';
const modeSpacedDirectionRule = 'End each final reply about this project with one next-prompt direction, including replies to ordinary prompts without a NEEF invocation. The direction is always a copyable NEEF skill command in the current host\'s syntax (`/neef ...` in Claude Code, `$neef ...` in Codex), never a bare prose prompt. Put the concrete request inside the command, for example `/neef add retry with backoff to the upload client and cover it with a test`, followed by a short note on its intended result. Choose the fitting mode (task, shape, plan, challenge, prototype, ask, next) from current work and established goals; prefer a specific request over a bare `neef next`. When waiting for input, put the needed answer in the command, for example `/neef <your answer>`.' + unblockDirection + ' When no useful work remains, say so and suggest `/neef shape <next goal>` rather than inventing work. Use one closing direction, without repeating it elsewhere.';
const directionRule = 'End each final reply about this project with one next-prompt direction, including replies to ordinary prompts without a NEEF invocation. The direction is always a copyable NEEF skill command in the current host\'s syntax, never a bare prose prompt: a mode uses its own hyphenated skill (`/neef-next ...` in Claude Code, `$neef-next ...` in Codex; likewise `neef-shape`, `neef-plan`, `neef-challenge`, `neef-prototype`, `neef-ask`), and a plain task uses `/neef ...` or `$neef ...`. Put the concrete request inside the command, for example `/neef add retry with backoff to the upload client and cover it with a test`, followed by a short note on its intended result. Choose the fitting mode (task, shape, plan, challenge, prototype, ask, next) from current work and established goals; prefer a specific request over a bare `neef-next`. When waiting for input, put the needed answer in the command, for example `/neef <your answer>`.' + unblockDirection + ' When no useful work remains, say so and suggest `/neef-shape <next goal>` rather than inventing work. Use one closing direction, without repeating it elsewhere.';
// Unedited blocks from earlier releases are upgraded in place by setup.
const commandDirectionRule = modeSpacedDirectionRule.replace(unblockDirection, '');
const legacyDirectionRules = [modeSpacedDirectionRule, commandDirectionRule, commandDirectionRule.replace('prototype, options, next)', 'prototype, ask, continue, next)'), 'End each final reply about this project with one useful next-prompt direction, including replies to ordinary prompts without a NEEF invocation. Give a concrete, copyable prompt or the appropriate NEEF command in the current host\'s syntax, with enough detail to explain its intended result. Base it on current work and established goals; prefer the actual action over a bare "neef next". When waiting for input, make the needed answer the direction. When no useful work remains, say so and invite the next goal rather than inventing work. Use one closing direction, without repeating it elsewhere.'];
const directionBlockFor = rule => `<!-- neef:next-prompt:start -->
## Next prompt

${rule}

Suggestions are advisory. Invoke NEEF only when the user explicitly requests it; setup does not authorize automatic workflows or executing suggested prompts.
<!-- neef:next-prompt:end -->`;
const directionBlock = directionBlockFor(directionRule);

function projectDirections(p) {
  const entries = ['AGENTS.md', 'CLAUDE.md'].map(name => {
    const file = path.join(p.root, name);
    const digest = fileState(p.root, name);
    const old = digest === null ? null : fs.readFileSync(file);
    const text = old?.toString('utf8') || '';
    const eol = text.includes('\r\n') ? '\r\n' : '\n';
    const block = directionBlock.replaceAll('\n', eol);
    if (text.includes('<!-- neef:next-prompt:')) {
      const legacy = legacyDirectionRules.map(rule => directionBlockFor(rule).replaceAll('\n', eol)).find(value => text.includes(value));
      if (!(text.includes(block) || legacy) || text.split('<!-- neef:next-prompt:').length !== 3) fail(`Edited or malformed NEEF direction block: ${name}; preserve it and reconcile manually`);
      return { name, file, old, bytes: legacy ? Buffer.from(text.replace(legacy, () => block)) : old };
    }
    const newline = text.includes('\r\n') ? '\r\n' : '\n';
    return { name, file, old, bytes: Buffer.concat([old || Buffer.alloc(0), Buffer.from(`${text ? (text.endsWith('\n') ? newline : newline + newline) : ''}${block}${newline}`)]) };
  }).filter(entry => !entry.old?.equals(entry.bytes));
  if (!entries.length) return { files: [], backup: null };
  const backup = path.join(home(), 'backups', `directions-${p.id}-${crypto.randomUUID()}`);
  requireExternalStorage(p, [backup]);
  fs.mkdirSync(backup, { recursive: true });
  fs.writeFileSync(path.join(backup, 'restore.json'), JSON.stringify(entries.map(({ file, old }, i) => ({ target: file, backup: old === null ? null : `${i}.bak` })), null, 2));
  for (const [i, entry] of entries.entries()) if (entry.old !== null) fs.writeFileSync(path.join(backup, `${i}.bak`), entry.old);
  const changed = [];
  try {
    for (const entry of entries) {
      const digest = fileState(p.root, entry.name);
      if (digest !== (entry.old === null ? null : hash(entry.old))) fail(`Instruction file changed: ${entry.name}`);
      atomic(entry.file, entry.bytes);
      changed.push(entry);
      if (!fs.readFileSync(entry.file).equals(entry.bytes)) fail(`Instruction verification failed: ${entry.name}`);
    }
  } catch (error) {
    for (const entry of changed.reverse()) {
      if (entry.old === null) fs.unlinkSync(entry.file);
      else atomic(entry.file, entry.old);
    }
    throw error;
  }
  return { files: entries.map(entry => entry.name), backup };
}

function setup(p, minimal = false) {
  const before = stateRead(p);
  if (before.error) fail(before.error);
  if (minimal && before.state?.context) return { initialized: false, revision: before.revision };
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
    const directions = minimal ? null : projectDirections(p);
    if (directions?.files.length) Object.assign(context, discover(p, minimal).context);
    if (current.state?.context?.fingerprint === context.fingerprint) context.architecture = current.state.context.architecture || '';
    if (JSON.stringify(current.state?.context) === JSON.stringify(context)) return { initialized: false, revision: current.revision, context, directions, safety: { ...safety, externalStateWritable: true }, warnings };
    const value = current.state || { version: 1, project: p.root, revision: crypto.randomUUID(), updated: new Date().toISOString(),
      task: '', progress: 'complete', branch: null, head: null, baseline: null, decisions: '', verification: '', next: '', blockers: '' };
    const saved = saveState(p, current, { ...value, context });
    return { initialized: true, revision: saved.revision, context, directions, safety: { ...safety, externalStateWritable: true }, warnings };
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
// Reviewed commit tokens hold hashes only and are named apart so baseline scans skip them unparsed.
const tokenFile = id => baselineFile(id).replace(/\.json$/, '.token.json');
const baselineRetention = 14 * 24 * 60 * 60 * 1000;
// Baselines and reviewed tokens otherwise accumulate forever.
// Keep anything recent or still referenced by a saved task in any project.
function pruneBaselines() {
  const directory = path.join(home(), 'baselines');
  if (!exists(directory)) return;
  const referenced = new Set();
  const stateDir = path.join(home(), 'state');
  if (exists(stateDir)) for (const name of fs.readdirSync(stateDir).filter(name => name.endsWith('.json') && !name.endsWith('.plan.json'))) {
    try { const baseline = json(path.join(stateDir, name)).baseline; if (baseline) referenced.add(`${baseline}.json`); } catch { /* Doctor reports invalid state. */ }
  }
  const cutoff = Date.now() - baselineRetention;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isFile() || !/^[a-f0-9-]{36}\.(json|token\.json|index)$/.test(entry.name) || referenced.has(entry.name)) continue;
    const file = path.join(directory, entry.name);
    try { if (fs.statSync(file).mtimeMs < cutoff) fs.unlinkSync(file); } catch { /* Pruning never blocks development. */ }
  }
}
// A linked worktree has its own git dir inside the shared common dir; the main folder's are the same.
function linkedWorktree(p) {
  if (!p.isGit) return false;
  const [gitDir, commonDir] = git(p.root, ['rev-parse', '--path-format=absolute', '--git-dir', '--git-common-dir']).trim().split(/\r?\n/);
  return canonical(gitDir) !== canonical(commonDir);
}

function begin(p, slug) {
  // A completely empty folder is a new project: give it Git on main so work can be committed at once.
  const gitInitialized = !p.isGit && fs.readdirSync(p.root).length === 0;
  if (gitInitialized) {
    git(p.root, ['init', '--quiet']);
    git(p.root, ['symbolic-ref', 'HEAD', 'refs/heads/main']);
    p = project(p.root);
  }
  const initialized = bootstrap(p);
  const context = { initialized: initialized.initialized, ...(initialized.warning ? { warning: initialized.warning } : {}) };
  if (!p.isGit) return { baseline: null, ...snapshot(p), revision: initialized.revision, context, note: 'Non-Git project; no branch or commit. Ask before running git init to enable commits' };
  const before = snapshot(p);
  if (!before.branch) fail('Detached HEAD; select main explicitly');
  const linked = linkedWorktree(p);
  if (!linked && before.branch !== 'main') fail('Development requires main outside a linked worktree; preserve the current branch and report the mismatch');
  pruneBaselines();
  const id = crypto.randomUUID();
  atomic(baselineFile(id), JSON.stringify({ project: p.root, slug: slug || null, ...before }));
  const greenfield = !before.head && before.changes.length === 0;
  return { baseline: id, ...before, ...(linked ? { worktree: 'linked' } : {}), ...(gitInitialized ? { gitInitialized } : {}), ...(greenfield ? { greenfield, ...(importanceSaved(p) ? {} : { importance: 'explore' }) } : {}), revision: initialized.revision, context };
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
  // The token records what was reviewed as hashes; the diff itself is returned once, never stored.
  atomic(tokenFile(token), JSON.stringify({ project: p.root, snapshotHash: hash(JSON.stringify(actual)), files, selected, message: input.message, diffHash: hash(diff), kind: 'commit' }));
  return { token, files, message: input.message, diff, revision: stateRead(p).revision };
}

function commit(p, token) {
  const file = tokenFile(token);
  return lock(file, () => {
    const prepared = json(file);
    if (prepared.kind !== 'commit' || prepared.project !== p.root || prepared.used) fail('Invalid or consumed commit token');
    if (hash(JSON.stringify(snapshot(p))) !== prepared.snapshotHash
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
      if (hash(JSON.stringify(snapshot(p))) !== prepared.snapshotHash) fail('Working tree changed while acquiring index lock');
      if (exists(index)) fs.copyFileSync(index, privateIndex);
      else git(p.root, ['read-tree', '--empty'], { env });
      git(p.root, ['add', '--', ...prepared.files], { env });
      const diff = git(p.root, ['diff', '--cached', '--no-ext-diff', '--no-textconv', '--binary'], { env });
      if (hash(diff) !== prepared.diffHash) fail('Staged diff changed after review; prepare again');
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
    pruneBaselines();
    return { ...snapshot(p), revision: stateRead(p).revision, output };
  });
}

// Read-only review scope: the last task's commits since its recorded start, or ref..HEAD,
// with the saved agreement to grade them against and every known command with its kind.
function review(p, ref) {
  if (!p.isGit) fail('Review needs a Git project');
  const saved = stateRead(p);
  if (saved.error) fail(saved.error);
  const state = saved.state?.task ? saved.state : null;
  const actual = snapshot(p);
  let base;
  let head = actual.head;
  if (ref !== undefined) {
    if (!ref || ref.startsWith('-')) fail('Invalid ref');
    try { base = git(p.root, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]).trim(); } catch { fail(`Unknown ref: ${ref}`); }
  } else {
    if (!state) fail('No saved NEEF task; pass a ref to review');
    if (!state.start) fail('Saved task has no recorded start; pass a ref to review');
    base = state.start;
    if (state.progress === 'complete' && state.head) head = state.head;
  }
  if (!head) fail('No commits to review');
  const commits = git(p.root, ['log', '--format=%H%x09%s', `${base}..${head}`]).split('\n').filter(Boolean)
    .map(line => ({ sha: line.slice(0, line.indexOf('\t')), subject: line.slice(line.indexOf('\t') + 1) }));
  const agreed = state ? Object.fromEntries(['task', 'progress', 'decisions', 'verification', 'plan', 'outcomes']
    .filter(key => state[key] !== undefined).map(key => [key, state[key]])) : null;
  return { project: p.root, revision: saved.revision, range: `${base}..${head}`, commits,
    diffstat: commits.length ? git(p.root, ['diff', '--stat', base, head]).trim() : '', agreed,
    commands: state?.context?.commands || saved.state?.context?.commands || [], actual };
}

// Markdown an agent may read, agent instructions first. Tracked and untracked-but-not-ignored files only.
const agentDoc = file => /(^|\/)(AGENTS|CLAUDE|SKILL)\.md$/i.test(file) || /(^|\/)\.(claude|agents|codex)\//.test(file) || /(^|\/)skills\//.test(file);
const skippedDoc = file => /(^|\/)(CHANGELOG|CHANGES|HISTORY|LICENSE|LICENCE|COPYING)[^/]*\.md$/i.test(file);
function docs(p) {
  if (!p.isGit) fail('Docs needs a Git project');
  const unique = [...new Set(git(p.root, ['ls-files', '-z', '--cached', '--others', '--exclude-standard']).split('\0')
    .filter(file => /\.md$/i.test(file)))].sort();
  const saved = stateRead(p);
  return { project: p.root, revision: saved.revision,
    agent: unique.filter(file => !skippedDoc(file) && agentDoc(file)),
    docs: unique.filter(file => !skippedDoc(file) && !agentDoc(file)),
    skipped: unique.filter(skippedDoc),
    commands: saved.state?.context?.commands || [] };
}

// Merge branches into main in the main folder: fast-forward when possible, otherwise one merge
// commit. Conflicts are detected with merge-tree before the main folder is touched.
function worktreeList(root) {
  return git(root, ['worktree', 'list', '--porcelain']).split(/\r?\n\r?\n/).map(block => {
    const lines = block.split(/\r?\n/);
    const value = key => lines.find(line => line.startsWith(`${key} `))?.slice(key.length + 1) || null;
    return { path: value('worktree'), branch: value('branch')?.replace(/^refs\/heads\//, '') || null };
  }).filter(tree => tree.path);
}

const mergeHeadPath = target => path.resolve(target.root, git(target.root, ['rev-parse', '--git-path', 'MERGE_HEAD']).trim());

function mainFolder(p) {
  const trees = worktreeList(p.root);
  const target = project(trees[0]?.path || fail('Main folder not found'));
  const before = snapshot(target);
  if (before.branch !== 'main') fail('Main folder is not on main; preserve it and report the mismatch');
  if (before.changes.some(item => item.code[0] !== ' ' && item.code !== '??')) fail('Main folder has staged changes or conflicts; leave them untouched');
  if (exists(mergeHeadPath(target))) fail('Main folder has a merge in progress; leave it untouched');
  return { target, trees };
}

function mergeInto(target, branch, head) {
  const before = snapshot(target).head;
  if (gitStatus(target.root, ['merge-base', '--is-ancestor', head, before]) === 0) return { merged: false, reason: 'Already in main', head: before };
  const fastForward = gitStatus(target.root, ['merge-base', '--is-ancestor', before, head]) === 0;
  if (!fastForward && gitStatus(target.root, ['merge-tree', '--write-tree', '--quiet', before, head]) !== 0) fail('Branch conflicts with main; nothing merged and both sides left as they were');
  let output;
  try { output = git(target.root, ['merge', fastForward ? '--ff-only' : '--no-ff', '--no-edit', branch]); }
  catch (error) {
    if (exists(mergeHeadPath(target))) git(target.root, ['merge', '--abort']);
    fail(`Merge refused: ${error.message}; main folder left as it was`);
  }
  return { merged: true, fastForward, head: snapshot(target).head, output, ...(fastForward ? {} : { recheck: 'Main has a new merge commit; rerun focused checks in the main folder' }) };
}

// Agent path: a completed linked worktree's own branch. Never deletes the branch or worktree.
function merge(p) {
  if (!linkedWorktree(p)) fail('Merge runs from a linked worktree');
  const source = snapshot(p);
  if (!source.branch) fail('Detached HEAD');
  if (source.branch === 'main') fail('Worktree is on main; nothing to merge');
  if (source.changes.length) fail('Worktree has uncommitted changes; preserve them and finish the task before merging');
  const saved = stateRead(p);
  if (saved.error) fail(saved.error);
  // Completion must be recorded after the branch's last commit, so later commits are never merged unverified.
  if (!saved.state?.task || saved.state.progress !== 'complete' || saved.state.head !== source.head) fail('Worktree task is not complete; finish and verify it before merging');
  const { target } = mainFolder(p);
  return { branch: source.branch, mainFolder: target.root, ...mergeInto(target, source.branch, source.head) };
}

function branchWorktree(trees, branch) {
  const tree = trees.find(item => item.branch === branch);
  if (!tree) return null;
  try { return project(tree.path); } catch { return { root: tree.path, missing: true }; }
}

// User path: branches ahead of main, each with its worktree, uncommitted changes and NEEF completion.
function mergeCandidates(p) {
  if (!p.isGit) fail('Not a Git project');
  const trees = worktreeList(p.root);
  const candidates = [];
  for (const line of git(p.root, ['for-each-ref', '--format=%(refname:short)%00%(objectname)%00%(subject)', 'refs/heads']).split('\n').filter(Boolean)) {
    const [branch, head, subject] = line.split('\0');
    if (branch === 'main') continue;
    const [behind, ahead] = git(p.root, ['rev-list', '--left-right', '--count', `main...${head}`]).trim().split(/\s+/).map(Number);
    if (!ahead) continue;
    const tree = branchWorktree(trees, branch);
    const saved = tree && !tree.missing ? stateRead(tree).state : null;
    candidates.push({ branch, ahead, behind, fastForward: behind === 0, subject, worktree: tree?.root || null,
      dirty: !!tree && !tree.missing && snapshot(tree).changes.length > 0,
      taskComplete: saved?.task ? saved.progress === 'complete' && saved.head === head : null });
  }
  return { mainFolder: trees[0]?.path || null, candidates };
}

// Merges the user's chosen branches in order, stopping at the first refusal. Unless keep, each
// merged branch and its worktree are deleted; Git refuses dirty worktrees and unmerged branches.
function mergeBranches(p, branches, keep) {
  if (!branches.length) fail('Usage: merge [branch...] [--keep]');
  const { target, trees } = mainFolder(p);
  const sources = branches.map(branch => {
    if (branch === 'main' || branch.startsWith('-')) fail(`Invalid branch: ${branch}`);
    let head;
    try { head = git(p.root, ['rev-parse', '--verify', '--quiet', `refs/heads/${branch}`]).trim(); } catch { fail(`No such branch: ${branch}`); }
    const tree = branchWorktree(trees, branch);
    if (tree && !tree.missing && snapshot(tree).changes.length) fail(`${branch} has uncommitted changes in ${tree.root}; commit or preserve them first`);
    return { branch, head, tree };
  });
  const here = [canonical(process.cwd()), p.root];
  const merged = [];
  for (const [index, { branch, head, tree }] of sources.entries()) {
    let result;
    try { result = { branch, ...mergeInto(target, branch, head), deleted: false }; }
    catch (error) { return { mainFolder: target.root, head: snapshot(target).head, merged, failed: { branch, error: error.message }, notAttempted: branches.slice(index + 1) }; }
    merged.push(result);
    if (keep) continue;
    if (tree && here.some(dir => dir === tree.root || dir.startsWith(`${tree.root}${path.sep}`))) { result.kept = 'Current worktree; remove it after leaving'; continue; }
    try {
      if (tree) git(target.root, ['worktree', 'remove', tree.root]);
      git(target.root, ['branch', '-d', branch]);
      result.deleted = true;
    } catch (error) { result.kept = error.message; }
  }
  return { mainFolder: target.root, head: snapshot(target).head, merged };
}

function commandVersion(command) {
  // Windows npm shims need cmd; command names here are fixed, never user input.
  const result = spawnSync(process.platform === 'win32' ? 'cmd.exe' : command,
    process.platform === 'win32' ? ['/d', '/s', '/c', `${command} --version`] : ['--version'],
    { encoding: 'utf8', timeout: 15000, windowsHide: true });
  return result.status === 0 ? result.stdout.trim() : null;
}

// merge relies on `git merge-tree --write-tree`, added in Git 2.38.
export function gitMergeReady(versionText) {
  const match = /(\d+)\.(\d+)/.exec(versionText || '');
  return !!match && (Number(match[1]) > 2 || (Number(match[1]) === 2 && Number(match[2]) >= 38));
}

export function doctor() {
  const user = process.env.NEEF_USER_HOME || os.homedir();
  const roots = ['.agents/skills', '.claude/skills', '.codex/skills', '.copilot/skills', '.config/opencode/skills', '.config/zed/skills', '.claude/commands'];
  const checks = [];
  const add = (name, ok, fix, severity) => checks.push({ name, ok, ...(!ok ? { fix } : {}), ...(severity ? { severity } : {}) });
  add('Node 20+', Number(process.versions.node.split('.')[0]) >= 20, 'Install Node.js 20 or later');
  const gitVersion = commandVersion('git');
  add('git', !!gitVersion, 'Install git and ensure it is on PATH');
  if (gitVersion) add('Git 2.38+ for merge', gitMergeReady(gitVersion), `Found ${gitVersion}; upgrade Git to 2.38 or later before using merge`, 'warning');
  for (const command of ['claude', 'codex']) add(command, !!commandVersion(command), `Install ${command} and ensure it is on PATH`);
  const shared = path.join(home(), 'neef.mjs');
  add('shared utility', exists(shared), 'Run node scripts/install.mjs --apply from the source project');
  const receipt = path.join(home(), 'install.json');
  try {
    const installed = json(receipt);
    add('installed file hashes', Object.entries(installed.files).every(([file, digest]) => exists(file) && hash(fs.readFileSync(file)) === digest), 'Inspect local edits; reinstall only after preserving them');
  } catch { add('install receipt', false, 'Reinstall from the source project'); }
  for (const agent of ['.claude', '.agents']) {
    const skill = path.join(user, agent, 'skills/neef/SKILL.md');
    add(`${agent} skill`, exists(skill) && /name: neef/.test(read(skill)), 'Reinstall NEEF');
    add(`${agent} synchronized instructions`, exists(skill) && exists(path.join(home(), 'SKILL.md')) && read(skill) === read(path.join(home(), 'SKILL.md')), 'Reinstall NEEF from its source');
  }
  const claude = path.join(user, '.claude/skills/neef/SKILL.md');
  const codex = path.join(user, '.agents/skills/neef/agents/openai.yaml');
  add('Claude explicit-only', exists(claude) && /disable-model-invocation: true/.test(read(claude)), 'Reinstall NEEF');
  add('Codex explicit-only', exists(codex) && /allow_implicit_invocation: false/.test(read(codex)), 'Reinstall NEEF');
  const stateDir = path.join(home(), 'state');
  try { fs.accessSync(stateDir, fs.constants.R_OK | fs.constants.W_OK); add('state directory permissions', true); }
  catch { add('state directory permissions', false, 'Reinstall or correct state directory permissions'); }
  if (exists(stateDir)) for (const name of fs.readdirSync(stateDir)) {
    if (name.endsWith('.lock')) add(`state lock ${name}`, false, 'Inspect recorded owner; remove only if confirmed stale');
    if (!name.endsWith('.json') || name.endsWith('.plan.json')) continue;
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
  return { ok: checks.every(check => check.ok || check.severity === 'warning'), checks, obsolete, discovery: 'Paths and configuration checked; native invocation requires a fresh agent session.' };
}

export async function main(args = process.argv.slice(2)) {
  const option = args.indexOf('--project');
  let cwd = process.cwd();
  if (option >= 0) { cwd = args[option + 1] || fail('Missing project path'); args.splice(option, 2); }
  const [command = 'help', argument] = args;
  if (command === 'help') return {
    name: 'NEEF', fullName: 'No-nonsense Engineering & Execution Framework', motto: 'Navigate → Execute → Evaluate → Follow-up',
    start: commandCatalog.filter(command => command.front).map(({ usage }) => usage),
    commands: commandCatalog.flatMap(({ name, usage, aliases = [] }) => [usage, ...aliases.map(alias => `${usage.replace(name, alias)} (alias of ${name})`)]),
    groups: [['choose', 'Choose what to do'], ['explore', 'Explore before building'], ['build', 'Build or keep moving'], ['inspect', 'Understand the project and installation']]
      .map(([id, intent]) => ({ intent, commands: commandCatalog.filter(command => command.intent === id)
        .map(({ usage, changes, stops, aliases = [] }) => ({ command: usage, changes, stops, aliases })) })),
    invocation: { codex: '$neef <command>', claude: '/neef <command>' },
    aliases: { codex: subskillNames.map(command => `$neef-${command}`), claude: subskillNames.map(command => `/neef-${command}`) },
    helperCommands: ['style [simple|guided|technical|kid] [--here] (read the effective style or save the global default; --here saves a project override, style clear --here removes it)', 'importance [explore|normal|important] [--here] (read the effective default or save the global one; --here saves a project override, importance clear --here removes it; a task may carry its own importance in state-write)', 'prototype-workspace [slug] (omit slug: read-only listing; provide slug: allocate isolated scratch directory without task/Git changes)', 'setup', 'bootstrap', 'context-write <expected-revision> (stdin: {architecture})', 'status', 'next (read-only candidates; agent revalidates and implements)', 'begin <slug> (initializes Git on main in an empty folder; greenfield marks an empty repository)', 'prepare <baseline-id> (stdin: {files,message})', 'commit <reviewed-token>', 'docs (read-only: Git-tracked and untracked-but-not-ignored .md files split into agent instructions, other docs and skipped changelogs/licenses, with known commands)', 'review [ref] (read-only: the last task\'s commits since its first begin or first save, whichever is earlier, or ref..HEAD, with saved decisions, plan, outcomes and all known commands, each with a kind; run only kind test)', 'merge-candidates (read-only: local branches ahead of main with worktree, dirty and taskComplete flags)', 'merge <branch...> [--keep] (user-chosen branches into main in order; stops at the first conflict; deletes merged branches and their worktrees unless --keep)', 'merge (from a linked worktree whose task is complete: merges its branch into main in the main folder; fast-forward else one merge commit; refuses conflicts, staged or in-progress work and never deletes branches)', 'state-write <expected-revision> (stdin: {task,progress,decisions,verification,next,blockers,recommendations,plan?,outcomes?,importance?}; task, decisions, verification, next and blockers are strings)', 'recommendations-write <expected-revision> (stdin: {primary,alternatives,reason})', 'park <expected-revision> (stdin: {add:"one-line idea"} or {remove:"its text"|position}; the parked list shows in status and survives task changes)', 'state-recover <corrupt-revision>', 'doctor'], recommendations: 'primary:{kind:REQUIRED|RECOMMENDED|OPTIONAL,action,reason}; alternatives: at most two such actions. For no supported action: primary:null, alternatives:[], reason. Completion requires an explicit recommendation evaluation; REQUIRED work must stay active.', outcomes: 'Ordinary tasks complete on a nonempty verification note. With a plan or importance important, completion requires [{id,description,required,status,evidence}], with unique ids and at least one required outcome; supplied outcomes are always validated. Status is pending/passed/failed/blocked; passed outcomes need nonempty evidence. Required outcomes must pass, blockers must be explicitly cleared, and plan phases must finish before completion. Same-task writes preserve omitted outcomes; new tasks do not inherit them. Legacy saved states remain readable. Evidence is agent-reported, not independently proven.', plan: 'Optional state field: {goal,scale:small|large,rationale,phases:[{id,title?,task,dependsOn:[id],acceptance:[criterion],status:pending|active|complete,verification?,userInput?}]}. title is a short board name (at most 40 characters). userInput names the decision, credential, approval or manual step only the user can supply for that phase. Completed phases require verification evidence. Omitted plans persist only for the same task; incomplete phases keep progress active. The plan is stored beside the state as <id>.plan.json under 32 KiB, under the same lock and revision; the rest of the state stays under 8 KiB and 40 lines.', options: '--project <path>; NEEF_HOME overrides shared data for isolated tests' };
  if (command === 'doctor') return doctor();
  const p = project(cwd);
  if (command === 'style') {
    const here = args.includes('--here'), rest = args.filter(arg => arg !== '--here');
    if (rest.length > 2 || (here && rest.length < 2)) fail('Usage: style [simple|guided|technical|kid] [--here], or style clear --here');
    return explanationStyle(p, rest[1], here);
  }
  if (command === 'importance') {
    const here = args.includes('--here'), rest = args.filter(arg => arg !== '--here');
    if (rest.length > 2 || (here && rest.length < 2)) fail('Usage: importance [explore|normal|important] [--here], or importance clear --here');
    return preference(p, preferenceKinds.importance, rest[1], here);
  }
  if (['setup', 'bootstrap', 'context-write', 'begin', 'prepare', 'commit', 'state-write', 'recommendations-write', 'park', 'state-recover'].includes(command)) requireExternalStorage(p);
  const input = () => JSON.parse(fs.readFileSync(0, 'utf8'));
  if (command === 'setup') return setup(p);
  if (command === 'bootstrap') return bootstrap(p);
  if (command === 'context-write') return contextWrite(p, argument, input());
  if (command === 'status') return status(p);
  if (command === 'prototype-workspace') return prototypeWorkspace(p, argument);
  if (command === 'next') return next(p);
  if (command === 'begin') return begin(p, argument);
  if (command === 'state-write') return stateWrite(p, argument, input());
  if (command === 'recommendations-write') return recommendationsWrite(p, argument, input());
  if (command === 'park') return park(p, argument, input());
  if (command === 'state-recover') return stateRecover(p, argument);
  if (command === 'prepare') return prepare(p, argument, input());
  if (command === 'commit') return commit(p, argument);
  if (command === 'merge-candidates') return mergeCandidates(p);
  if (command === 'merge') return args.length > 1 ? mergeBranches(p, args.slice(1).filter(arg => arg !== '--keep'), args.includes('--keep')) : merge(p);
  if (command === 'review') return review(p, argument);
  if (command === 'docs') return docs(p);
  fail(`Unknown helper command: ${command}; run help`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { print(await main()); } catch (error) { print({ error: error.message }); process.exitCode = 1; }
}
