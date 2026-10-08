import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parseDeck } from '../src/deck.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const coursePath = resolve(root, 'courses/complex-plane.json');

test('the original twelve-question lesson passes the current unchanged importer contract', async () => {
  const text = await readFile(coursePath, 'utf8');
  const deck = parseDeck(text);
  assert.equal(deck.title, 'Complex multiplication: turn, scale, repeat');
  assert.equal(deck.items.length, 12);
  assert.equal(deck.concepts.length, 4);
  assert.deepEqual(deck.concepts.map(c => deck.items.filter(i => i.concept === c).length), [3, 3, 3, 3]);
  assert.deepEqual([0, 1, 2, 3].map(a => deck.items.filter(i => i.answer === a).length), [3, 3, 3, 3]);
  assert.ok(deck.items.every(i => i.options.length === 4 && i.explanation.length > 100 && i.transfer.length > 30));
  assert.ok(deck.attribution.includes('Original questions') && deck.license.includes('CC0'));
  assert.ok(Object.isFrozen(deck) && Object.isFrozen(deck.items[0]));
});

test('the actual standalone builder passes parity and embeds the exact downloadable lesson', async () => {
  const result = spawnSync(process.execPath, [resolve(root, 'tools/build-complex-plane.mjs'), '--check'], { encoding: 'utf8', timeout: 15000 });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const [text, html] = await Promise.all([
    readFile(coursePath, 'utf8'),
    readFile(resolve(root, 'courses/complex-plane-lab.html'), 'utf8'),
  ]);
  const match = html.match(/<script id="complex-course-data" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(match);
  assert.equal(JSON.parse(match[1]), text);
  assert.ok(!/@@COMPLEX_(?:COURSE|SCRIPT)@@/.test(html));
  assert.ok(!/<script[^>]+src=/i.test(html));
  assert.ok(!/<link[^>]+(?:stylesheet|preconnect)/i.test(html));
});
