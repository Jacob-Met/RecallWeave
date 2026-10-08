import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { parseDeck, serializeDeck } from '../src/deck.mjs';
import { buildMeasurementLab, measurementLabPath } from '../tools/build-measurement-lab.mjs';

const deckText = readFileSync(new URL('../courses/measurement-uncertainty.json', import.meta.url), 'utf8');
const deck = parseDeck(deckText);

test('the original course is admitted by the existing deck contract with all four concepts covered', () => {
  assert.equal(deck.items.length, 12);
  assert.equal(deck.concepts.length, 4);
  assert.equal(new Set(deck.items.map(item => item.id)).size, 12);
  for (const concept of deck.concepts) assert.equal(deck.items.filter(item => item.concept === concept).length, 3);
  assert.deepEqual(parseDeck(serializeDeck(deck)), deck);
});

test('answer positions are balanced and no correct option is uniquely the longest', () => {
  assert.deepEqual([0, 1, 2, 3].map(answer => deck.items.filter(item => item.answer === answer).length), [3, 3, 3, 3]);
  for (const item of deck.items) {
    const correctLength = item.options[item.answer].length;
    assert.ok(item.options.some((option, index) => index !== item.answer && option.length >= correctLength), item.id);
  }
});

test('each numerical answer uses the stated correction sign, denominator or independence assumption', () => {
  const keyed = Object.fromEntries(deck.items.map(item => [item.id, item]));
  const answer = id => keyed[id].options[keyed[id].answer];
  assert.equal(answer('measurement-mean-correction'), `${(9 + 11 + 10 + 10) / 4 - 0.4} mm`);
  assert.equal(answer('measurement-sample-spread'), `About ${(Math.sqrt(8 / (4 - 1)) / Math.sqrt(4)).toFixed(3)} mm`);
  assert.equal(answer('measurement-rectangular-halfwidth'), `About ${(0.3 / Math.sqrt(3)).toFixed(3)} mm`);
  assert.equal(answer('measurement-independent-combination'), `${Math.hypot(0.3, 0.4).toFixed(2)} mm`);
  assert.equal(answer('measurement-calibration-floor'), `About ${Math.hypot(0.3 / 2, 0.4).toFixed(3)} mm`);
  for (const id of ['measurement-independent-combination', 'measurement-calibration-floor']) assert.match(keyed[id].prompt, /components are independent/);
});

test('standalone artifact is deterministic, preserves the exact deck bytes and contains executable classic scripts', () => {
  const rebuilt = buildMeasurementLab();
  assert.equal(readFileSync(measurementLabPath, 'utf8'), rebuilt);
  const embedded = rebuilt.match(/<script id="measurement-deck" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(embedded);
  assert.equal(JSON.parse(embedded[1]), deckText);
  assert.deepEqual(parseDeck(JSON.parse(embedded[1])), deck);
  const classic = [...rebuilt.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(classic.length, 1);
  new vm.Script(classic[0][1]);
  assert.doesNotMatch(rebuilt, /<script\b[^>]*\bsrc\s*=/i);
  assert.doesNotMatch(rebuilt, /<link\b[^>]*\bhref\s*=/i);
  assert.doesNotMatch(rebuilt, /\/\* MEASUREMENT_[A-Z_]+ \*\//);
});
