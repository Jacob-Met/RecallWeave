import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseDeck, serializeDeck } from '../src/deck.mjs';

test('original epsilon-NFA course enters the unchanged learner content contract', async () => {
  const text = await readFile(new URL('../courses/nondeterministic-automata.json', import.meta.url), 'utf8');
  const deck = parseDeck(text);
  assert.equal(deck.items.length, 12);
  assert.equal(deck.concepts.length, 4);
  assert.deepEqual(parseDeck(serializeDeck(deck)), deck);
  assert.ok(new TextEncoder().encode(text).length <= 262144);
  assert.deepEqual(deck.concepts.map(name => deck.items.filter(item => item.concept === name).length), [3, 3, 3, 3]);
  const bad = JSON.parse(text);
  bad.items[0].prerequisites = [bad.items.at(-1).concept];
  assert.throws(() => parseDeck(JSON.stringify(bad)), /cycle/);
});
