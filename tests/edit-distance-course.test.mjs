import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseDeck } from '../src/deck.mjs';
import { buildExplorer } from '../tools/build-edit-distance.mjs';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
test('Optional lesson is admitted by the exact frozen native RecallWeave validator', async () => {
  const source = await read('courses/edit-distance.json');
  const deck = parseDeck(source);
  assert.equal(deck.items.length, 12);
  assert.equal(deck.concepts.length, 6);
  assert.match(deck.title, /edit distance/i);
});

test('Built offline page embeds exact downloadable lesson and guide bytes', async () => {
  const output = await read('courses/edit-distance-explorer.html');
  assert.equal(output, await buildExplorer());
  const block = output.match(/<script id="course-resources" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(block);
  const resources = JSON.parse(block[1]);
  assert.equal(resources.course, await read('courses/edit-distance.json'));
  assert.equal(resources.guide, await read('courses/edit-distance.md'));
  assert.doesNotMatch(output, /<script[^>]+src=|<link[^>]+href=/i);
});
