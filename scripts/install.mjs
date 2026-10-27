#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { commandNames, commandDescriptions, subskillNames } from './neef.mjs';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const user = path.resolve(process.env.NEEF_USER_HOME || os.homedir());
const shared = path.resolve(process.env.NEEF_HOME || path.join(user, '.neef'));
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

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

export function install(apply = false) {
  const definitions = [
    ['scripts/neef.mjs', path.join(shared, 'neef.mjs')],
    ['SKILL.md', path.join(shared, 'SKILL.md')],
    ['agents/openai.yaml', path.join(shared, 'openai.yaml')],
    ['SKILL.md', path.join(user, '.claude/skills/neef/SKILL.md')],
    ['SKILL.md', path.join(user, '.agents/skills/neef/SKILL.md')],
    ['agents/openai.yaml', path.join(user, '.agents/skills/neef/agents/openai.yaml')],
    ...['shape', 'plan', 'challenge', 'prototype', 'advisor', 'next', 'follow-up', 'start', 'personal-design', 'completion', 'explanation-styles'].flatMap(mode => [shared, path.join(user, '.claude/skills/neef'), path.join(user, '.agents/skills/neef')]
      .map(root => [`references/${mode}.md`, path.join(root, `references/${mode}.md`)])),
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
    .map(root => path.join(root, 'references/grill.md'));
  // Aliases and rare commands no longer get their own subskill folders.
  for (const command of commandNames.filter(name => !subskillNames.includes(name))) for (const agent of ['.claude', '.agents']) {
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
  // Never silently activate files left in an existing Neef skill folder.
  for (const agent of ['.claude', '.agents']) for (const name of ['neef', ...commandNames.map(command => `neef-${command}`)]) {
    const root = path.join(user, agent, 'skills', name);
    if (!fs.existsSync(root)) continue;
    const allowed = ['SKILL.md', ...(agent === '.agents' ? ['agents'] : []), ...(name === 'neef' ? ['references'] : [])];
    for (const name of fs.readdirSync(root)) if (!allowed.includes(name)) throw new Error(`Unmanaged skill content preserved: ${path.join(root, name)}`);
    if (agent === '.agents' && fs.existsSync(path.join(root, 'agents'))) {
      for (const name of fs.readdirSync(path.join(root, 'agents'))) if (name !== 'openai.yaml') throw new Error(`Unmanaged agent metadata: ${name}`);
    }
    if (fs.existsSync(path.join(root, 'references'))) {
      for (const name of fs.readdirSync(path.join(root, 'references'))) if (!['shape.md', 'plan.md', 'challenge.md', 'prototype.md', 'advisor.md', 'next.md', 'follow-up.md', 'start.md', 'personal-design.md', 'completion.md', 'explanation-styles.md'].includes(name) && !retired.includes(path.join(root, 'references', name))) throw new Error(`Unmanaged skill reference: ${name}`);
    }
  }
  noLinks(path.join(shared, 'state'));
  const result = { apply, source, shared, files: entries.map(({ target, hash, old }) => ({ target, hash, existed: !!old })) };
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
    replace(receiptPath, JSON.stringify({ version: 1, source, installed: new Date().toISOString(), backup,
      files: Object.fromEntries(entries.filter(entry => entry.bytes !== null).map(entry => [entry.target, entry.hash])) }, null, 2));
    return { ...result, backup, verified: true };
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

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.slice(2).some(arg => arg !== '--apply')) throw new Error('Usage: node scripts/install.mjs [--apply]; default is dry run');
    console.log(JSON.stringify(install(process.argv.includes('--apply')), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
