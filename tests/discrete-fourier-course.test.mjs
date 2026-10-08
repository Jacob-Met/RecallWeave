import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, cpSync, rmSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { Script } from 'node:vm';
import { parseDeck, serializeDeck } from '../src/deck.mjs';
import { analyzeFourier } from '../src/discrete-fourier.mjs';
import { buildDiscreteFourierLab, discreteFourierLabPath } from '../tools/build-discrete-fourier.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const deckText = readFileSync(join(root, 'courses/discrete-fourier.json'), 'utf8');
const deck = parseDeck(deckText);
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10);

test('original lesson imports and round-trips through the unchanged deck contract', () => {
  assert.equal(deck.items.length, 12);
  assert.equal(deck.concepts.length, 4);
  assert.deepEqual(parseDeck(serializeDeck(deck)), deck);
  assert.equal(new Set(deck.items.map(item => item.id)).size, 12);
  assert.ok(deck.items.every(item => item.transfer.length > 40));
  assert.ok(deck.items.some(item => item.prerequisites.length === 0));
  assert.ok(deck.items.some(item => item.prerequisites.length === 3));
});

test('worked course examples obey the declared sign, normalization and omissions', () => {
  const constant = analyzeFourier([3, 3, 3, 3]);
  close(constant.bins[0].real, 12);
  close(analyzeFourier(constant.samples, { selectedPairs: [1, 2] }).rmsResidual, 3);
  const cosine = analyzeFourier([1, 0, -1, 0]);
  cosine.bins.forEach((bin, k) => close(bin.real, [0, 2, 0, 2][k]));
  const sine = analyzeFourier([0, 1, 0, -1]);
  close(sine.bins[1].imaginary, -2);
  close(sine.bins[3].imaginary, 2);
  const impulse = analyzeFourier([1, 0, 0, 0]);
  close(impulse.inputEnergy, 1);
  close(impulse.coefficientEnergy, 1);
  const alternating = analyzeFourier([1, -1, 1, -1, 1, -1, 1, -1], { selectedPairs: [4] });
  close(alternating.bins[4].real, 8);
  close(alternating.rmsResidual, 0);
});

test('generated offline page is current, compiles and embeds the exact admitted deck', () => {
  const generated = buildDiscreteFourierLab();
  assert.equal(readFileSync(discreteFourierLabPath, 'utf8'), generated);
  const inline = generated.match(/<script>\n([\s\S]*)\n<\/script>/);
  assert.ok(inline, 'one inline classic script');
  assert.doesNotThrow(() => new Script(inline[1], { filename: 'discrete-fourier-lab.html' }));
  const encodedDeck = inline[1].match(/^const fourierDeckText = (.+);$/m);
  assert.equal(JSON.parse(encodedDeck[1]), deckText);
  assert.deepEqual(parseDeck(JSON.parse(encodedDeck[1])), deck);
  assert.doesNotMatch(generated, /<script[^>]+src=|<link[^>]+href=|(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage)\s*[.(]/i);
  assert.doesNotMatch(generated, /\/\* FOURIER_(?:MODEL|UI|DECK_TEXT) \*\//);
});

test('build check detects stale artifacts and invalid course input in a private fixture', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'recallweave-fourier-build-'));
  try {
    for (const path of ['src/deck.mjs', 'src/discrete-fourier.mjs', 'src/discrete-fourier-ui.mjs',
      'tools/build-discrete-fourier.mjs', 'templates/discrete-fourier-lab.html', 'courses/discrete-fourier.json']) {
      mkdirSync(dirname(join(fixture, path)), { recursive: true });
      cpSync(join(root, path), join(fixture, path));
    }
    const output = join(fixture, 'courses/discrete-fourier-lab.html');
    const run = (...args) => spawnSync(process.execPath, ['tools/build-discrete-fourier.mjs', ...args],
      { cwd: fixture, encoding: 'utf8' });
    assert.equal(run().status, 0);
    assert.equal(run('--check').status, 0);
    writeFileSync(output, 'stale artifact\n');
    const stale = run('--check');
    assert.equal(stale.status, 1);
    assert.match(stale.stderr, /differs from its source inputs/);
    assert.equal(readFileSync(output, 'utf8'), 'stale artifact\n', '--check does not rewrite');
    assert.equal(run('--unknown').status, 2);
    rmSync(output);
    writeFileSync(join(fixture, 'courses/discrete-fourier.json'), '{"title":"incomplete"}');
    assert.notEqual(run().status, 0);
    assert.equal(existsSync(output), false, 'invalid deck never produces a lab');
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
