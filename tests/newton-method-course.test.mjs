import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import { validateDeck } from '../src/deck.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFile(resolve(root, path), 'utf8');
const deckText = await read('courses/newton-method.json');
const guideText = await read('courses/newton-method.md');
const deck = JSON.parse(deckText);
const html = await read('courses/newton-method-explorer.html');

test('Newton lesson is admitted by the actual learner with twelve complete original questions', () => {
  assert.doesNotThrow(() => validateDeck(deck));
  assert.equal(deck.items.length, 12);
  assert.equal(new Set(deck.items.map(item => item.id)).size, 12);
  assert.deepEqual(deck.concepts, ['Tangent steps', 'Exact residuals', 'Failure and repetition', 'Interpreting a run']);
  assert.deepEqual(deck.concepts.map(concept => deck.items.filter(item => item.concept === concept).length), [3, 3, 3, 3]);
  assert.deepEqual([0, 1, 2, 3].map(answer => deck.items.filter(item => item.answer === answer).length), [3, 3, 3, 3]);
  for (const item of deck.items) {
    assert.ok(item.explanation.length > 100, item.id + ' needs a worked explanation');
    assert.ok(item.transfer.length > 50, item.id + ' needs a transfer question');
  }
});

test('lesson numerical answers agree with independently written exact arithmetic', () => {
  const answer = id => { const item = deck.items.find(item => item.id === id); return item.options[item.answer]; };
  assert.equal(answer('nm-01'), '3/2'); // 4 - (2*4-3)/2
  assert.equal(answer('nm-03'), '3/2'); // 1 - (1-2)/2
  assert.equal(answer('nm-04'), '1/4'); // (3/2)^2 - 2
  assert.equal(577n * 577n - 2n * 408n * 408n, 1n);
  assert.equal(408n * 408n, 166464n);
  assert.match(deck.items.find(item => item.id === 'nm-06').prompt, /1\/166464/);
  assert.match(answer('nm-06'), /small but nonzero/);
  assert.match(answer('nm-08'), /cycle of length two/);
  assert.match(answer('nm-09'), /halved/);
  assert.match(answer('nm-10'), /stay the same/);
  assert.match(answer('nm-12'), /no convergence or divergence/);
});

test('worked guide retains exact examples and separates residual, root and bounded computation', () => {
  for (const value of ['577/408', '1/166464', '2000001/2000', '4096', 'OpenStax']) {
    assert.ok(guideText.includes(value), 'guide omitted ' + value);
  }
  assert.ok(guideText.includes('newton-method-explorer.html'));
  assert.ok(guideText.includes('newton-method.json'));
  assert.match(guideText, /rational/i);
  assert.match(guideText, /irrational/i);
  assert.match(guideText, /derivative/i);
});

test('standalone page embeds byte-exact course and guide strings in one parseable script', () => {
  const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/gi)];
  assert.equal(blocks.length, 1);
  const script = blocks[0][1];
  assert.doesNotThrow(() => new vm.Script(script));
  const prefix = script.match(/^\s*const courseText=(.+);\nconst guideText=(.+);\n/);
  assert.ok(prefix, 'embedded text boundary is missing');
  assert.equal(JSON.parse(prefix[1]), deckText);
  assert.equal(JSON.parse(prefix[2]), guideText);
  assert.ok(!html.includes('@@'));
  assert.ok(!/<script\b[^>]*\bsrc\s*=/i.test(html));
  assert.ok(!/<link\b[^>]*\brel\s*=\s*["']stylesheet/i.test(html));
  assert.ok(!/\b(?:fetch|XMLHttpRequest|WebSocket|eval)\s*\(/.test(script));
  assert.ok(!/^\s*(?:import|export)\b/m.test(script));
});

test('committed explorer is fresh according to the actual project builder', () => {
  const run = spawnSync(process.execPath, ['tools/build-newton-method.mjs', '--check'], { cwd: root, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.match(run.stdout, /matches its exact source inputs/);
});

test('builder rejects unsupported arguments without changing its artifact', async () => {
  const before = await read('courses/newton-method-explorer.html');
  const run = spawnSync(process.execPath, ['tools/build-newton-method.mjs', '--check', '--check'], { cwd: root, encoding: 'utf8' });
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /Use no arguments, or --check/);
  assert.equal(await read('courses/newton-method-explorer.html'), before);
});
