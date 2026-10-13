import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeMinHash, parseSetText } from '../src/minhash.mjs';

test('partial overlap exposes both collision and unequal minima', () => {
  const r = analyzeMinHash(['a', 'b'], ['b', 'c']);
  assert.deepEqual(r.union, ['a', 'b', 'c']);
  assert.equal(r.permutations, 6);
  assert.equal(r.collisions, 2);
  assert.deepEqual(r.fraction, { numerator: 1, denominator: 3 });
  assert.deepEqual(r.rows[0], { index: 1, order: ['a', 'b', 'c'], minA: 'a', minB: 'b', rankA: 1, rankB: 2, first: 'a', collision: false });
  assert.deepEqual(r.rows[2], { index: 3, order: ['b', 'a', 'c'], minA: 'b', minB: 'b', rankA: 1, rankB: 1, first: 'b', collision: true });
});
test('identical, disjoint, singleton and subset boundaries', () => {
  for (const [a, b, total, collisions, fraction] of [
    [['a', 'b'], ['a', 'b'], 2, 2, [1, 1]],
    [['a'], ['b', 'c'], 6, 0, [0, 1]],
    [['x'], ['x'], 1, 1, [1, 1]],
    [['b'], ['a', 'b', 'c'], 6, 2, [1, 3]]
  ]) {
    const r = analyzeMinHash(a, b);
    assert.equal(r.permutations, total);
    assert.equal(r.collisions, collisions);
    assert.deepEqual(r.fraction, { numerator: fraction[0], denominator: fraction[1] });
  }
});
test('the complete five-label universe has 120 unique orders and exact first-label buckets', () => {
  const r = analyzeMinHash(['a', 'b', 'c'], ['b', 'd', 'e']);
  assert.equal(r.rows.length, 120);
  assert.equal(new Set(r.rows.map(x => JSON.stringify(x.order))).size, 120);
  assert.equal(r.collisions, 24);
  assert.deepEqual(r.byFirst.map(x => [x.label, x.permutations, x.collisions]),
    [['a', 24, 0], ['b', 24, 24], ['c', 24, 0], ['d', 24, 0], ['e', 24, 0]]);
});
test('every nonempty subset pair of five labels obeys the finite counting identity', () => {
  const labels = ['a', 'b', 'c', 'd', 'e'];
  for (let am = 1; am < 32; am++) for (let bm = 1; bm < 32; bm++) {
    const a = labels.filter((_, i) => am & (1 << i));
    const b = labels.filter((_, i) => bm & (1 << i));
    const r = analyzeMinHash(a, b);
    assert.equal(r.collisions * r.union.length, r.intersection.length * r.permutations);
    for (const row of r.rows) {
      assert.equal(row.collision, r.intersection.includes(row.first));
      assert.equal(row.minA, row.order.filter(x => a.includes(x))[0]);
      assert.equal(row.minB, row.order.filter(x => b.includes(x))[0]);
    }
  }
});
test('duplicates, spaces, accents and case retain exact literal identities', () => {
  const input = ['a', 'a', ' A', 'é'], other = ['a', 'e\u0301'];
  const r = analyzeMinHash(input, other);
  assert.deepEqual(r.inputA, input);
  assert.deepEqual(r.setA, ['a', ' A', 'é']);
  assert.deepEqual(r.union, ['a', ' A', 'é', 'e\u0301']);
  assert.equal(r.collisions, 6);
  assert.deepEqual(input, ['a', 'a', ' A', 'é']);
  assert.deepEqual(parseSetText('[" a ","🙂","<literal>"]'), [' a ', '🙂', '<literal>']);
  assert.equal(analyzeMinHash(['a', 'A'], ['A']).fraction.denominator, 2);
});
test('reordering changes only enumeration order and saved input order', () => {
  const a = analyzeMinHash(['a', 'b'], ['b', 'c']);
  const b = analyzeMinHash(['b', 'a'], ['c', 'b']);
  const normalize = r => r.rows.map(({ index, ...row }) => JSON.stringify(row)).sort();
  assert.deepEqual(normalize(a), normalize(b));
  assert.deepEqual(a.fraction, b.fraction);
  assert.notDeepEqual(a.rows[0].order, b.rows[0].order);
});
test('invalid or unbounded inputs are refused before enumeration', () => {
  for (const value of [null, {}, [], new Array(1), [1], [''], ['  '], ['\n'], ['a\u007f'], ['\ud800'], ['\udc00'], ['x'.repeat(41)], Array(21).fill('a')])
    assert.throws(() => analyzeMinHash(value, ['a']));
  for (const text of ['{', 'null', '[]', '[1]', '["a",]', ' '.repeat(4097)])
    assert.throws(() => parseSetText(text));
  assert.throws(() => analyzeMinHash(['a', 'b', 'c'], ['d', 'e', 'f']), /five distinct/);
  assert.equal(analyzeMinHash(['🙂'.repeat(40)], ['🙂'.repeat(40)]).permutations, 1);
});
test('returned analysis is deeply immutable and copies original inputs', () => {
  const a = ['a', 'b'], b = ['b'];
  const r = analyzeMinHash(a, b);
  a.push('c'); b[0] = 'd';
  assert.deepEqual(r.inputA, ['a', 'b']);
  assert.deepEqual(r.inputB, ['b']);
  assert.throws(() => r.rows[0].order.push('x'), TypeError);
  assert.throws(() => { r.byFirst[0].collisions = 999; }, TypeError);
  assert.throws(() => { r.fraction.numerator = 999; }, TypeError);
});
