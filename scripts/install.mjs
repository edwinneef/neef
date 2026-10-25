#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

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
    ['references/grill.md', path.join(shared, 'references/grill.md')],
    ['references/grill.md', path.join(user, '.claude/skills/neef/references/grill.md')],
    ['references/grill.md', path.join(user, '.agents/skills/neef/references/grill.md')],
  ];
  const receiptPath = path.join(shared, 'install.json');
  noLinks(receiptPath);
  const previous = fs.existsSync(receiptPath) ? JSON.parse(fs.readFileSync(receiptPath, 'utf8')) : null;
  const entries = definitions.map(([relative, target]) => {
    noLinks(target);
    const bytes = fs.readFileSync(path.join(source, relative));
    const old = fs.existsSync(target) ? fs.readFileSync(target) : null;
    if (old && previous?.files?.[target] !== digest(old)) throw new Error(`Unmanaged or edited file preserved: ${target}`);
    return { target, bytes, old, hash: digest(bytes) };
  });
  // Never silently activate files left in an existing Neef skill folder.
  for (const agent of ['.claude', '.agents']) {
    const root = path.join(user, agent, 'skills/neef');
    if (!fs.existsSync(root)) continue;
    const allowed = agent === '.claude' ? ['SKILL.md', 'references'] : ['SKILL.md', 'agents', 'references'];
    for (const name of fs.readdirSync(root)) if (!allowed.includes(name)) throw new Error(`Unmanaged skill content preserved: ${path.join(root, name)}`);
    if (agent === '.agents' && fs.existsSync(path.join(root, 'agents'))) {
      for (const name of fs.readdirSync(path.join(root, 'agents'))) if (name !== 'openai.yaml') throw new Error(`Unmanaged agent metadata: ${name}`);
    }
    if (fs.existsSync(path.join(root, 'references'))) {
      for (const name of fs.readdirSync(path.join(root, 'references'))) if (name !== 'grill.md') throw new Error(`Unmanaged skill reference: ${name}`);
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
      replace(entry.target, entry.bytes);
      changed.push(entry);
      if (digest(fs.readFileSync(entry.target)) !== entry.hash) throw new Error(`Copy verification failed: ${entry.target}`);
    }
    fs.mkdirSync(path.join(shared, 'state'), { recursive: true });
    replace(receiptPath, JSON.stringify({ version: 1, source, installed: new Date().toISOString(), backup,
      files: Object.fromEntries(entries.map(entry => [entry.target, entry.hash])) }, null, 2));
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
