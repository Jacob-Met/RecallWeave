import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseDeck, serializeDeck, MAX_DECK_BYTES } from '../src/deck.mjs';
import { initialMastery, selectNextItem, updateMastery } from '../src/knowledge.mjs';

const raw = await readFile(new URL('../courses/sampling-aliasing.json', import.meta.url), 'utf8');
const deck = parseDeck(raw);
const byId = new Map(deck.items.map(item => [item.id, item]));
const correct = id => { const item = byId.get(id); return item.options[item.answer]; };

test('the original course survives native validation and serialization with complete connected content', () => {
  assert.ok(Buffer.byteLength(raw) < MAX_DECK_BYTES);
  assert.deepEqual(parseDeck(serializeDeck(deck)), deck);
  assert.deepEqual(JSON.parse(raw), deck);
  assert.equal(deck.items.length, 12);
  assert.equal(deck.concepts.length, 4);
  assert.ok(Object.isFrozen(deck) && Object.isFrozen(deck.items[0].options));
  for (const concept of deck.concepts) assert.equal(deck.items.filter(item => item.concept === concept).length, 3);
  assert.deepEqual([0, 1, 2, 3].map(index => deck.items.filter(item => item.answer === index).length), [3, 3, 3, 3]);
  for (const item of deck.items) {
    assert.match(item.id, /^sampling-/);
    assert.ok(item.explanation.length > 80 && item.transfer.length > 40);
  }
  assert.match(deck.attribution, /Original questions/);
  assert.match(deck.license, /CC0-1\.0/);
});

test('native item selection reaches all twelve questions and can prioritize the weak sample clock', () => {
  const mastery = initialMastery(deck.concepts);
  for (const concept of deck.concepts) mastery[concept] = concept === 'sample-clock' ? 0.01 : 0.95;
  assert.equal(selectNextItem(deck.items, new Set(), mastery).concept, 'sample-clock');
  const asked = new Set();
  for (let step = 0; step < 12; step++) {
    const item = selectNextItem(deck.items, asked, mastery);
    assert.ok(item && !asked.has(item.id));
    asked.add(item.id);
    mastery[item.concept] = updateMastery(mastery[item.concept], step % 3 !== 0);
    assert.ok(Number.isFinite(mastery[item.concept]) && mastery[item.concept] >= 0 && mastery[item.concept] <= 1);
  }
  assert.equal(asked.size, 12);
  assert.equal(selectNextItem(deck.items, asked, mastery), null);
  assert.deepEqual(parseDeck(raw), deck);
});

test('answer text matches independently stated calculations and explicit sampling assumptions', () => {
  assert.equal(Number.parseFloat(correct('sampling-clock-interval')), 1 / 8);
  assert.equal(Number.parseInt(correct('sampling-clock-count')), Array.from({ length: 7 }, (_, n) => n / 6).filter(t => t >= 0 && t <= 1).length);
  assert.equal(correct('sampling-clock-phase'), 'π/2 radians');
  assert.ok(Math.abs(2 * Math.PI * 3 / 12 - Math.PI / 2) < 1e-14);
  assert.equal(correct('sampling-alias-nine'), '1 Hz');
  assert.equal(correct('sampling-alias-fold'), '3 Hz');
  assert.equal(correct('sampling-alias-family'), 'A 12 Hz cosine');
  assert.equal((12 - 2) / 10, 1);
  assert.equal(Number.parseInt(correct('sampling-assumption-rate')), [8, 10, 12, 5].find(rate => rate > 2 * 5));
  assert.match(correct('sampling-assumption-boundary'), /Every sample is zero while the sine varies/);
  assert.match(correct('sampling-assumption-evidence'), /Both curves remain compatible/);
  assert.match(correct('sampling-acquisition-filter'), /before sampling/);
  assert.match(correct('sampling-acquisition-after'), /identical input sequences/);
  assert.equal(Number.parseInt(correct('sampling-acquisition-rate')), [8, 12, 18, 24].find(rate => 9 < rate / 2));
  assert.match(byId.get('sampling-assumption-rate').explanation, /complete ideal sample sequence/);
  assert.match(byId.get('sampling-assumption-boundary').explanation, /arbitrary-phase recovery/);
});
