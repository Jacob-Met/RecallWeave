import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { Script } from 'node:vm';
import { parseDeck, serializeDeck } from '../src/deck.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(resolve(root, 'courses/floating-point.json'), 'utf8');
const original = JSON.parse(source);

test('the original floating-point course enters the existing deck importer unchanged', () => {
  const imported = parseDeck(source);
  assert.equal(imported.title, original.title);
  assert.equal(imported.attribution, original.attribution);
  assert.equal(imported.license, original.license);
  assert.deepEqual(imported.concepts, original.concepts);
  assert.equal(imported.items.length, 14);
  assert.equal(imported.concepts.length, 7);
  for (const item of imported.items) {
    const authored = original.items.find(candidate => candidate.id === item.id);
    assert.ok(authored, `Unexpected imported question ${item.id}`);
    assert.equal(item.prompt, authored.prompt);
    assert.equal(item.options[item.answer], authored.options[authored.answer]);
    assert.deepEqual(item.options, authored.options);
    assert.deepEqual(item.prerequisites, authored.prerequisites);
    assert.equal(item.explanation, authored.explanation);
    assert.equal(item.transfer, authored.transfer);
  }
  const reimported = parseDeck(serializeDeck(imported));
  assert.deepEqual(reimported, imported);
});

test('reordered answer positions retain the independent numerical answer contract', () => {
  const expected = new Map([
    ['fp-binary-eighth', '1/8'],
    ['fp-two-halfway-cases', '16,777,216 and 16,777,220'],
    ['fp-association-cancellation', '1 and 0'],
    ['fp-triangle-counterexample', '-3, so the stored winding is reversed'],
    ['fp-sign-not-fidelity', 'The winding is preserved, but the stored shape and area have changed.'],
    ['fp-local-origin-boundary', 'Keep the local vertices and the origin separate through the operations that need those edges.'],
    ['fp-unit-invariant', 'Changing numerical units alone does not diagnose or cure this rounding failure.'],
  ]);
  for (const item of parseDeck(source).items) {
    if (expected.has(item.id)) {
      assert.equal(item.options[item.answer], expected.get(item.id), item.id);
      expected.delete(item.id);
    }
  }
  assert.equal(expected.size, 0);
});

test('the actual standalone build embeds the same admitted lesson and complete runnable script', () => {
  execFileSync(process.execPath, ['tools/build-floating-point.mjs', '--check'], { cwd:root, encoding:'utf8' });
  const html = readFileSync(resolve(root, 'courses/floating-point-lab.html'), 'utf8');
  const deckMatch = html.match(/<script id="lesson-data" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(deckMatch, 'The standalone lesson download must have an embedded source.');
  assert.deepEqual(parseDeck(deckMatch[1]), parseDeck(source));
  const scriptMatch = html.match(/<script>\s*([\s\S]*?)<\/script>/);
  assert.ok(scriptMatch);
  assert.doesNotThrow(() => new Script(scriptMatch[1], { filename:'floating-point-standalone.js' }));
  assert.doesNotMatch(html, /__FLOATING_POINT_(?:CORE|UI|DECK)__/);
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+rel=["']stylesheet["']/i);
});
