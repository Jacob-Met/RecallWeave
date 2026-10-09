import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseDeck, serializeDeck} from '../src/deck.mjs';
const text = await readFile(new URL('../courses/reservoir-sampling.json', import.meta.url), 'utf8');
test('the original importer admits and preserves the complete lesson', () => {
  const deck = parseDeck(text);
  assert.equal(deck.items.length, 12);
  assert.equal(deck.concepts.length, 4);
  assert.equal(new Set(deck.items.map(item => item.id)).size, 12);
  assert.deepEqual(parseDeck(serializeDeck(deck)), deck);
  for (const item of deck.items) {
    assert.ok(item.explanation.length > 40);
    assert.ok(item.transfer.length > 30);
    assert.equal(item.options.length, 4);
  }
});
