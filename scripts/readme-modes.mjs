#!/usr/bin/env node
// Rewrites the README mode table from the command catalog in scripts/neef.mjs.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { modeTable } from './neef.mjs';

const readme = fileURLToPath(new URL('../README.md', import.meta.url));
const start = '<!-- modes:start -->', end = '<!-- modes:end -->';
const text = fs.readFileSync(readme, 'utf8');
const from = text.indexOf(start), to = text.indexOf(end);
if (from < 0 || to < from) throw new Error(`README needs ${start} and ${end} markers`);
fs.writeFileSync(readme, `${text.slice(0, from + start.length)}\n${modeTable()}\n${text.slice(to)}`);
