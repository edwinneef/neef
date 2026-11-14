#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { commandNames, commandDescriptions, subskillNames, retiredCommands, projects } from './neef.mjs';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const user = path.resolve(process.env.NEEF_USER_HOME || os.homedir());
const shared = path.resolve(process.env.NEEF_HOME || path.join(user, '.neef'));
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
// Every installed reference; command-alias.md is a template rendered into subskills, not installed.
const references = fs.readdirSync(path.join(source, 'references')).filter(name => name.endsWith('.md') && name !== 'command-alias.md').sort();

// The source commit, when the source is a Git checkout; changelogs compare it with the last install's.
function sourceCommit() {
  const result = spawnSync('git', ['-C', source, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : null;
}
// Commit summaries since the last installed commit, newest first; this repository writes them as plain sentences.
function changelog(since, commit) {
  if (!since || !commit || since === commit) return {};
  const result = spawnSync('git', ['-C', source, 'log', '--no-merges', '--format=%s', `${since}..${commit}`], { encoding: 'utf8' });
  if (result.status !== 0) return {};
  const all = result.stdout.split('\n').filter(Boolean);
  if (!all.length) return {};
  const shown = 15;
  return { changes: { count: all.length, items: all.slice(0, shown), ...(all.length > shown ? { more: all.length - shown } : {}),
    note: 'Show these to the user as a short plain-language list of what this install changed' } };
}

function noLinks(target) {
  for (let cursor = target; cursor !== path.dirname(cursor); cursor = path.dirname(cursor)) {
    try { if (fs.lstatSync(cursor).isSymbolicLink()) throw new Error(`Linked installation path refused: ${cursor}`); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}

function replace(target, bytes) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temp = `${target}.${crypto.randomUUID()}.tmp`;
  try { fs.writeFileSync(temp, bytes, { flag: 'wx' }); fs.renameSync(temp, target); }
  finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
}

// The installed command carries this marker so later installs find NEEF's entry wherever NEEF_HOME was.
const gateMarker = '--neef-gate';
const gateCommand = () => `node "${path.join(shared, 'gate.mjs').replaceAll('\\', '/')}" ${gateMarker}`;
const isGate = hook => typeof hook?.command === 'string' && hook.command.trimEnd().endsWith(gateMarker);

// Returns the merged file bytes, or null when the file needs no change. Existing groups never move,
// because Codex keys its hook trust by position.
function mergeGate(target, old, enabled) {
  let settings = {};
  if (old) {
    try { settings = JSON.parse(old.toString('utf8')); } catch { throw new Error(`Unreadable JSON preserved: ${target}`); }
  }
  const shape = `Unexpected hook settings shape preserved: ${target}`;
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) throw new Error(shape);
  if (settings.hooks !== undefined && (!settings.hooks || typeof settings.hooks !== 'object' || Array.isArray(settings.hooks))) throw new Error(shape);
  const groups = settings.hooks?.UserPromptSubmit;
  if (groups !== undefined && (!Array.isArray(groups) || groups.some(group => !group || typeof group !== 'object' || !Array.isArray(group.hooks)))) throw new Error(shape);
  const command = gateCommand();
  const current = groups ?? [];
  const kept = current.map(group => ({ ...group, hooks: group.hooks.filter(hook => !isGate(hook) || (enabled && hook.command === command)) }))
    .filter((group, i) => group.hooks.length || !current[i].hooks.some(isGate));
  if (enabled && !kept.some(group => group.hooks.some(isGate))) kept.push({ hooks: [{ type: 'command', command, timeout: 10 }] });
  if (JSON.stringify(kept) === JSON.stringify(current)) return null;
  const hooks = { ...settings.hooks, UserPromptSubmit: kept };
  if (!kept.length) delete hooks.UserPromptSubmit;
  const merged = { ...settings, hooks };
  if (!Object.keys(hooks).length) delete merged.hooks;
  return Buffer.from(`${JSON.stringify(merged, null, 2)}\n`);
}

// Codex runs hooks only when [features] hooks = true; report it, never edit config.toml.
function codexHooksFeature() {
  const config = path.join(codexHome(), 'config.toml');
  if (!fs.existsSync(config)) return 'not set';
  const features = fs.readFileSync(config, 'utf8').split(/^\s*\[/m).find(section => /^features\]/.test(section));
  const value = features?.match(/^\s*hooks\s*=\s*(true|false)\b/m)?.[1];
  return value === 'true' ? 'on' : value === 'false' ? 'off' : 'not set';
}

function codexHome() {
  return process.env.CODEX_HOME ? path.resolve(process.env.CODEX_HOME) : path.join(user, '.codex');
}

// gate: 'on' or 'off' changes the prompt gate; omitted keeps the last install's choice, on by default.
export function install(apply = false, gate) {
  const definitions = [
    ['scripts/neef.mjs', path.join(shared, 'neef.mjs')],
    ['scripts/gate.mjs', path.join(shared, 'gate.mjs')],
    ['SKILL.md', path.join(shared, 'SKILL.md')],
    ['agents/openai.yaml', path.join(shared, 'openai.yaml')],
    ['SKILL.md', path.join(user, '.claude/skills/neef/SKILL.md')],
    ['SKILL.md', path.join(user, '.agents/skills/neef/SKILL.md')],
    ['agents/openai.yaml', path.join(user, '.agents/skills/neef/agents/openai.yaml')],
    ...references.flatMap(mode => [shared, path.join(user, '.claude/skills/neef'), path.join(user, '.agents/skills/neef')]
      .map(root => [`references/${mode}`, path.join(root, `references/${mode}`)])),
  ];
  for (const command of subskillNames) {
    for (const agent of ['.claude', '.agents']) {
      const root = path.join(user, agent, 'skills', `neef-${command}`);
      definitions.push(['references/command-alias.md', path.join(root, 'SKILL.md'), command]);
      if (agent === '.agents') definitions.push(['agents/command-alias.yaml', path.join(root, 'agents/openai.yaml'), command]);
    }
  }
  const receiptPath = path.join(shared, 'install.json');
  noLinks(receiptPath);
  const previous = fs.existsSync(receiptPath) ? JSON.parse(fs.readFileSync(receiptPath, 'utf8')) : null;
  const entries = definitions.map(([relative, target, command]) => {
    noLinks(target);
    let bytes = fs.readFileSync(path.join(source, relative));
    if (command) bytes = Buffer.from(bytes.toString('utf8').replaceAll('{{command}}', command)
      .replaceAll('{{description}}', commandDescriptions[command])
      .replaceAll('{{route}}', command === 'task' ? '`<task>` route (use the supplied development request as the task)' : `\`${command}\` route`));
    const old = fs.existsSync(target) ? fs.readFileSync(target) : null;
    if (old && previous?.files?.[target] !== digest(old)) throw new Error(`Unmanaged or edited file preserved: ${target}`);
    return { target, bytes, old, hash: digest(bytes) };
  });
  // Retire only receipt-owned references from the previous mode, with backup/rollback.
  const retired = [shared, path.join(user, '.claude/skills/neef'), path.join(user, '.agents/skills/neef')]
    .flatMap(root => ['grill.md', 'auto.md', 'prompt.md', 'merge.md'].map(name => path.join(root, 'references', name)));
  // Aliases and rare commands no longer get their own subskill folders.
  for (const command of [...commandNames.filter(name => !subskillNames.includes(name)), ...retiredCommands]) for (const agent of ['.claude', '.agents']) {
    const root = path.join(user, agent, 'skills', `neef-${command}`);
    retired.push(path.join(root, 'SKILL.md'), ...(agent === '.agents' ? [path.join(root, 'agents/openai.yaml')] : []));
  }
  for (const target of retired) {
    noLinks(target);
    if (!fs.existsSync(target)) continue;
    const old = fs.readFileSync(target);
    if (previous?.files?.[target] !== digest(old)) throw new Error(`Unmanaged or edited file preserved: ${target}`);
    entries.push({ target, old, bytes: null, hash: null });
  }
  // The prompt gate joins each host's own hook file beside the owner's hooks; those files are merged, never receipt-owned.
  const enabled = gate ? gate === 'on' : previous?.gate !== false;
  const hostFiles = [path.join(user, '.claude', 'settings.json'), ...(fs.existsSync(codexHome()) ? [path.join(codexHome(), 'hooks.json')] : [])];
  for (const target of hostFiles) {
    noLinks(target);
    const old = fs.existsSync(target) ? fs.readFileSync(target) : null;
    const bytes = mergeGate(target, old, enabled);
    if (bytes) entries.push({ target, bytes, old, hash: digest(bytes), merged: true });
  }
  // Never silently activate files left in an existing Neef skill folder.
  for (const agent of ['.claude', '.agents']) for (const name of ['neef', ...[...commandNames, ...retiredCommands].map(command => `neef-${command}`)]) {
    const root = path.join(user, agent, 'skills', name);
    if (!fs.existsSync(root)) continue;
    const allowed = ['SKILL.md', ...(agent === '.agents' ? ['agents'] : []), ...(name === 'neef' ? ['references'] : [])];
    for (const name of fs.readdirSync(root)) if (!allowed.includes(name)) throw new Error(`Unmanaged skill content preserved: ${path.join(root, name)}`);
    if (agent === '.agents' && fs.existsSync(path.join(root, 'agents'))) {
      for (const name of fs.readdirSync(path.join(root, 'agents'))) if (name !== 'openai.yaml') throw new Error(`Unmanaged agent metadata: ${name}`);
    }
    if (fs.existsSync(path.join(root, 'references'))) {
      for (const name of fs.readdirSync(path.join(root, 'references'))) if (!references.includes(name) && !retired.includes(path.join(root, 'references', name))) throw new Error(`Unmanaged skill reference: ${name}`);
    }
  }
  noLinks(path.join(shared, 'state'));
  noLinks(path.join(shared, 'backups'));
  const action = ({ bytes, old, hash }) => bytes === null ? 'remove' : !old ? 'create' : digest(old) === hash ? 'unchanged' : 'update';
  const codexFeature = enabled && fs.existsSync(codexHome()) ? codexHooksFeature() : 'on';
  const result = { apply, source, shared, gate: enabled ? 'on' : 'off',
    ...(codexFeature !== 'on' ? { codexHooks: `Codex hooks feature is ${codexFeature}: Codex runs the prompt gate only with hooks = true under [features] in ${path.join(codexHome(), 'config.toml')}` } : {}),
    files: entries.map(entry => ({ target: entry.target, hash: entry.hash, existed: !!entry.old, action: action(entry) })) };
  if (!apply) return result;
  fs.mkdirSync(shared, { recursive: true });
  const lock = path.join(shared, 'install.lock');
  const fd = fs.openSync(lock, 'wx');
  const changed = [];
  const oldReceipt = fs.existsSync(receiptPath) ? fs.readFileSync(receiptPath) : null;
  const backup = path.join(shared, 'backups', `install-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`);
  try {
    // Recheck after acquiring the lock, before changing any files.
    for (const entry of entries) {
      noLinks(entry.target);
      const current = fs.existsSync(entry.target) ? fs.readFileSync(entry.target) : null;
      if ((current && digest(current)) !== (entry.old && digest(entry.old))) throw new Error(`Install target changed: ${entry.target}`);
    }
    noLinks(backup);
    fs.mkdirSync(backup, { recursive: true });
    fs.writeFileSync(path.join(backup, 'restore.json'), JSON.stringify(entries.map((entry, i) => ({ target: entry.target, backup: entry.old ? `${i}.bak` : null })), null, 2));
    for (const [i, entry] of entries.entries()) if (entry.old) fs.writeFileSync(path.join(backup, `${i}.bak`), entry.old);
    if (oldReceipt) fs.writeFileSync(path.join(backup, 'install.json.bak'), oldReceipt);
    for (const entry of entries) {
      if (entry.bytes === null) fs.unlinkSync(entry.target);
      else replace(entry.target, entry.bytes);
      changed.push(entry);
      if (entry.bytes === null ? fs.existsSync(entry.target) : digest(fs.readFileSync(entry.target)) !== entry.hash) throw new Error(`Copy verification failed: ${entry.target}`);
    }
    // Drop subskill folders emptied by retirement; anything else left inside keeps them.
    for (const entry of entries.filter(entry => entry.bytes === null)) {
      for (let dir = path.dirname(entry.target); /[\\/]neef-[\w-]+([\\/]agents)?$/.test(dir) && fs.existsSync(dir) && !fs.readdirSync(dir).length; dir = path.dirname(dir)) fs.rmdirSync(dir);
    }
    fs.mkdirSync(path.join(shared, 'state'), { recursive: true });
    const commit = sourceCommit();
    replace(receiptPath, JSON.stringify({ version: 1, source, installed: new Date().toISOString(), backup, ...(commit ? { commit } : {}), gate: enabled,
      files: Object.fromEntries(entries.filter(entry => entry.bytes !== null && !entry.merged).map(entry => [entry.target, entry.hash])) }, null, 2));
    return { ...result, backup, verified: true, ...changelog(previous?.commit, commit), ...outdatedProjects() };
  } catch (error) {
    for (const entry of changed.reverse()) {
      if (entry.old) replace(entry.target, entry.old);
      else fs.unlinkSync(entry.target);
    }
    if (oldReceipt) replace(receiptPath, oldReceipt);
    else if (fs.existsSync(receiptPath)) fs.unlinkSync(receiptPath);
    throw error;
  } finally { fs.closeSync(fd); fs.unlinkSync(lock); }
}

// After an install, name the projects whose instructions are now behind so the agent can offer one update.
// A failed listing never fails the install itself.
function outdatedProjects() {
  try {
    const outdated = projects(false).projects.filter(item => item.status === 'outdated').map(item => item.root);
    return outdated.length ? { outdatedProjects: { count: outdated.length, roots: outdated,
      offer: 'Offer to update them in one go with /neef projects --update in Claude Code or $neef projects --update in Codex; each project is backed up first' } } : {};
  } catch { return {}; }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    const usage = 'Usage: node scripts/install.mjs [--apply | --dry-run] [--gate on|off]; default is a JSON dry run, --dry-run lists targets, --gate turns the prompt gate on or off and is remembered';
    const gateAt = args.indexOf('--gate');
    const gate = gateAt === -1 ? undefined : args[gateAt + 1];
    const modes = gateAt === -1 ? args : args.filter((_, i) => i !== gateAt && i !== gateAt + 1);
    if (gateAt !== -1 && !['on', 'off'].includes(gate)) throw new Error(usage);
    if (modes.length > 1 || modes.some(arg => arg !== '--apply' && arg !== '--dry-run')) throw new Error(usage);
    if (modes[0] === '--dry-run') console.log(install(false, gate).files.map(file => `${file.action} ${file.target}`).join('\n'));
    else console.log(JSON.stringify(install(modes[0] === '--apply', gate), null, 2));
    // The closing line goes to stderr so stdout stays parseable and a dry run cannot be mistaken for an install.
    console.error(modes[0] === '--apply' ? 'INSTALLED: the files above were written.' : 'DRY RUN: nothing was installed. Run `node scripts/install.mjs --apply` to install.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
