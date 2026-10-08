import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parseDeck, serializeDeck } from '../src/deck.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const bytes = await readFile(new URL('../courses/feedback-control.json', import.meta.url));
const deck = parseDeck(bytes.toString('utf8'));
const correctText = id => {
  const item = deck.items.find(item => item.id === id);
  assert.ok(item, id);
  return item.options[item.answer];
};

test('the original course imports through the unchanged learner contract and round trips', () => {
  assert.equal(deck.items.length, 18);
  assert.equal(deck.concepts.length, 6);
  assert.equal(new Set(deck.items.map(item => item.id)).size, 18);
  assert.ok(Object.isFrozen(deck) && Object.isFrozen(deck.items));
  assert.deepEqual(parseDeck(serializeDeck(deck)), deck);
  for (const concept of deck.concepts) assert.ok(deck.items.some(item => item.concept === concept));
});

test('the course explicitly teaches the hand-calculated update, multiplier and strict boundary', () => {
  assert.match(correctText('fc-read-number'), /0\.625/);
  assert.match(correctText('fc-loop-three-steps'), /0\.125/);
  assert.match(correctText('fc-fixed-reference'), /2\/3/);
  assert.match(correctText('fc-stability-gain'), /1\.75/);
});

test('the generated explorer contains the exact course bytes and current model source', async () => {
  const result = spawnSync(process.execPath, ['tools/build-feedback-control.mjs', '--check'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const html = await readFile(new URL('../courses/feedback-control-lab.html', import.meta.url), 'utf8');
  const encoded = html.match(/<script id="course-bytes" type="application\/octet-stream">([A-Za-z0-9+/=]+)<\/script>/);
  assert.ok(encoded);
  assert.deepEqual(Buffer.from(encoded[1], 'base64'), bytes);
  const sha = createHash('sha256').update(bytes).digest('hex');
  assert.ok(html.includes('name="feedback-course-sha256" content="' + sha + '"'));
});
