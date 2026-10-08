import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseDeck, serializeDeck } from '../src/deck.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const raw = await readFile(resolve(root, 'courses/euler-trails.json'), 'utf8');
const deck = parseDeck(raw);
assert.equal(serializeDeck(deck), raw, 'canonical deck bytes');
assert.equal(deck.items.length, 14);
assert.equal(deck.concepts.length, 4);
assert.equal(deck.license, 'CC0-1.0');
const guide = await readFile(resolve(root, 'courses/euler-trails.md'), 'utf8');
for (const item of deck.items) assert.ok(guide.includes('| ' + item.id + ' |'), 'missing transfer working: ' + item.id);
const run = spawnSync(process.execPath, [resolve(root, 'tools/build-euler-trails.mjs'), '--check'], { encoding: 'utf8' });
if (run.status !== 0) throw new Error(run.stderr || run.stdout || 'Standalone check failed.');
console.log('Checked fourteen-item deck, transfer coverage, and exact standalone parity.');
