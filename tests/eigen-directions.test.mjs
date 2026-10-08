import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { Script } from 'node:vm';
import { EIGEN_PRESETS, analyzeEigen, parseBoundedInteger, serializeEigen } from '../src/eigen-directions.mjs';
import { parseDeck } from '../src/deck.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const near = (actual, expected, tolerance = 2e-12) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, actual + ' differs from ' + expected);
const axes = (a, d) => [[a, 0], [0, d]];

test('matrix action uses both columns and certifies the complete vector', () => {
  const result = analyzeEigen([[2, 1], [-1, 3]], [2, 1]);
  assert.deepEqual(result.image, [5, 1]);
  assert.equal(result.crossProduct, -3);
  assert.equal(result.isEigenvector, false);
  assert.equal(result.scale, null);
  assert.deepEqual(analyzeEigen([[3, -2], [1, 4]], [0, 1]).image, [-2, 4]);
  assert.deepEqual(analyzeEigen([[3, -2], [1, 4]], [1, 0]).image, [3, 1]);
});

test('negative and zero eigenvalues retain the nonzero input distinction', () => {
  const negative = analyzeEigen(axes(-3, 2), [2, 0]);
  assert.equal(negative.scale.text, '-3');
  assert.equal(negative.action, 'reverses-direction');
  const zero = analyzeEigen(axes(1, 0), [0, 2]);
  assert.deepEqual(zero.image, [0, 0]);
  assert.equal(zero.scale.text, '0');
  assert.equal(zero.action, 'vanishes');
  assert.equal(zero.isEigenvector, true);
  assert.throws(() => analyzeEigen(axes(0, 0), [0, 0]), /nonzero/);
});

test('scaling the probe does not change an eigenvalue or invent collinearity', () => {
  for (const factor of [-4, -1, 1, 3]) {
    assert.equal(analyzeEigen([[2, 1], [1, 2]], [factor, -factor]).scale.text, '1');
    assert.equal(analyzeEigen(axes(2, 1), [factor, factor]).isEigenvector, false);
  }
  const close = analyzeEigen([[1, 1], [1, 0]], [2, 1]);
  assert.equal(close.crossProduct, 1);
  assert.equal(close.isEigenvector, false);
  assert.equal(analyzeEigen([[1, 1], [1, 0]], [3, 2]).crossProduct, -1);
});

test('characteristic roots, trace and determinant match worked matrices', () => {
  const result = analyzeEigen([[4, 1], [2, 3]], [1, 1]);
  assert.deepEqual([result.trace, result.determinant, result.discriminant], [7, 10, 9]);
  assert.deepEqual(result.eigenspaces.map(space => space.eigenvalue.exact), ['5', '2']);
  assert.equal(result.scale.text, '5');
  assert.equal(result.classification, 'two-real-eigenlines');
  assert.equal(analyzeEigen([[4, 1], [2, 3]], [1, -2]).scale.text, '2');
});

test('repeated roots distinguish scalar planes, shears and nilpotent maps', () => {
  for (const value of [-9, -2, 0, 1, 9]) {
    const result = analyzeEigen(axes(value, value), [1, -2]);
    assert.equal(result.classification, 'every-direction');
    assert.equal(result.eigenspaces.length, 1);
    assert.equal(result.eigenspaces[0].algebraicMultiplicity, 2);
    assert.equal(result.eigenspaces[0].dimension, 2);
    assert.equal(result.scale.text, String(value));
  }
  const shear = analyzeEigen([[1, 2], [0, 1]], [1, 1]);
  assert.equal(shear.classification, 'one-real-eigenline');
  assert.deepEqual(shear.eigenspaces[0].basisApproximate, [[1, 0]]);
  assert.equal(shear.eigenspaces[0].dimension, 1);
  const oblique = analyzeEigen([[1, 1], [-1, 3]], [1, 1]);
  assert.equal(oblique.classification, 'one-real-eigenline');
  assert.equal(oblique.scale.text, '2');
  const nilpotent = analyzeEigen([[0, 1], [0, 0]], [1, 0]);
  assert.equal(nilpotent.classification, 'one-real-eigenline');
  assert.equal(nilpotent.scale.text, '0');
});

test('rotation families have no real eigenlines and retain complex expressions', () => {
  for (const a of [-9, 0, 2, 9]) for (const b of [1, 3, 9]) {
    const result = analyzeEigen([[a, -b], [b, a]], [1, 0]);
    assert.equal(result.discriminant, -4 * b * b);
    assert.equal(result.classification, 'no-real-eigenline');
    assert.equal(result.eigenspaces.length, 0);
    assert.equal(result.isEigenvector, false);
    assert.equal(result.complexPair.realPart, String(a));
  }
});

test('irrational roots remain symbolic while finite unit directions satisfy the equation', () => {
  const result = analyzeEigen([[1, 1], [1, 0]], [2, 1]);
  assert.deepEqual(result.eigenspaces.map(space => space.eigenvalue.exact), ['(1 + √5)/2', '(1 − √5)/2']);
  for (const space of result.eigenspaces) {
    assert.equal(space.eigenvalue.rational, null);
    const [x, y] = space.basisApproximate[0], lambda = space.eigenvalue.approximate;
    near(Math.hypot(x, y), 1);
    near(x + y, lambda * x);
    near(x, lambda * y);
  }
});

test('bounded matrix grid has finite eigenline geometry and correct characteristic identities', () => {
  let count = 0;
  const values = [-9, -3, -1, 0, 1, 3, 9];
  for (const a of values) for (const b of values) for (const c of values) for (const d of values) {
    const result = analyzeEigen([[a, b], [c, d]], [2, -3]);
    for (const space of result.eigenspaces) {
      const lambda = space.eigenvalue.approximate;
      near(lambda * lambda - (a + d) * lambda + a * d - b * c, 0, 3e-12);
      for (const [x, y] of space.basisApproximate) {
        assert.ok(Number.isFinite(x) && Number.isFinite(y));
        near(Math.hypot(x, y), 1);
        near(a * x + b * y, lambda * x);
        near(c * x + d * y, lambda * y);
      }
    }
    assert.equal(result.isEigenvector, 2 * (2 * c - 3 * d) + 3 * (2 * a - 3 * b) === 0);
    count++;
  }
  assert.equal(count, 2401);
});

test('strict input admission refuses malformed values, shapes, sparse arrays and bounds', () => {
  for (const bad of ['', ' ', '1.0', '1/2', '1e0', 'NaN', 'Infinity', '0x1', '--1', '1234', null, true, NaN, Infinity, 1.5, {}, []]) {
    assert.throws(() => analyzeEigen([[bad, 0], [0, 1]], [1, 0]), undefined, String(bad));
    assert.throws(() => analyzeEigen(axes(1, 1), [bad, 1]), undefined, String(bad));
  }
  for (const bad of [[], [1], [1, 2, 3], new Array(2), [1, ,], null, '12']) {
    assert.throws(() => analyzeEigen(axes(1, 1), bad));
    assert.throws(() => analyzeEigen([bad, [0, 1]], [1, 0]));
  }
  assert.throws(() => analyzeEigen([[10, 0], [0, 1]], [1, 0]));
  assert.throws(() => analyzeEigen(axes(1, 1), [21, 0]));
  const boundary = analyzeEigen([[9, -9], [-9, 9]], [20, -20]);
  assert.deepEqual(boundary.image, [360, -360]);
  assert.equal(boundary.scale.text, '18');
  assert.equal(parseBoundedInteger(' +09 ', 'entry', 9), 9);
  assert.equal(Object.is(parseBoundedInteger('-0', 'entry', 9), -0), false);
});

test('source inputs, output snapshots and exported arithmetic remain isolated', () => {
  const matrix = [[2, 1], [1, 2]], probe = [1, -1];
  const result = analyzeEigen(matrix, probe);
  matrix[0][0] = 9;
  probe[0] = 20;
  assert.deepEqual(result.matrix, [[2, 1], [1, 2]]);
  assert.deepEqual(result.probe, [1, -1]);
  assert.throws(() => { result.image[0] = 99; }, TypeError);
  assert.throws(() => { result.eigenspaces[0].basisApproximate[0][0] = 0; }, TypeError);
  assert.throws(() => { EIGEN_PRESETS[0].matrix[0][0] = 0; }, TypeError);
  const exported = serializeEigen({ ...result, image: [999, 999], scale: null });
  assert.deepEqual(JSON.parse(exported), result);
  assert.ok(exported.endsWith('\n'));
  assert.equal(serializeEigen(result), exported);
});

test('all worked examples are distinct, accepted and immutable', () => {
  assert.equal(EIGEN_PRESETS.length, 9);
  assert.equal(new Set(EIGEN_PRESETS.map(preset => preset.id)).size, 9);
  assert.deepEqual(EIGEN_PRESETS.map(preset => analyzeEigen(preset.matrix, preset.probe).classification),
    ['two-real-eigenlines', 'two-real-eigenlines', 'two-real-eigenlines', 'one-real-eigenline',
      'every-direction', 'no-real-eigenline', 'two-real-eigenlines', 'two-real-eigenlines', 'every-direction']);
});

test('original course passes the unchanged deck contract with fourteen connected items', async () => {
  const source = await readFile(resolve(root, 'courses/eigen-directions.json'), 'utf8');
  const deck = parseDeck(source);
  assert.equal(deck.items.length, 14);
  assert.deepEqual(deck.concepts, ['Matrix action', 'Eigenvector condition', 'Eigenvalue meaning', 'Counting real eigenlines']);
  assert.equal(new Set(deck.items.map(item => item.id)).size, 14);
  assert.equal(deck.items.find(item => item.id === 'ed-12').options[deck.items.find(item => item.id === 'ed-12').answer],
    'It has no nonzero real eigenvectors; its eigenvalues over the complex numbers are i and −i.');
  assert.ok(Buffer.byteLength(source) < 262144);
});

test('standalone builder preserves exact lesson bytes and complete executable syntax', async () => {
  execFileSync(process.execPath, [resolve(root, 'tools/build-eigen-directions.mjs'), '--check'], { cwd: root, encoding: 'utf8' });
  const html = await readFile(resolve(root, 'courses/eigen-directions-explorer.html'), 'utf8');
  assert.equal(html.includes('@@'), false);
  assert.equal(html.includes('<script src='), false);
  assert.equal(html.includes('<link '), false);
  const script = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));
  new Script(script);
  const deckLine = script.split('\n').find(line => line.startsWith('const EIGEN_DECK_SOURCE = '));
  const guideLine = script.split('\n').find(line => line.startsWith('const EIGEN_GUIDE_SOURCE = '));
  assert.equal(JSON.parse(deckLine.slice('const EIGEN_DECK_SOURCE = '.length, -1)),
    await readFile(resolve(root, 'courses/eigen-directions.json'), 'utf8'));
  assert.equal(JSON.parse(guideLine.slice('const EIGEN_GUIDE_SOURCE = '.length, -1)),
    await readFile(resolve(root, 'courses/eigen-directions.md'), 'utf8'));
});
