import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

export function scalarUnits(text) {
  assert.equal(typeof text, 'string');
  const units = [...text];
  assert(units.every(unit => { const c = unit.codePointAt(0); return c < 0xd800 || c > 0xdfff; }), 'isolated surrogate is not a Unicode scalar');
  return units;
}

// Independent finite path enumeration: no dynamic-programming recurrence or candidate imports.
export function enumeratedOptimum(source, target, costs = { insert: 1, delete: 1, substitute: 1 }) {
  const a = scalarUnits(source), b = scalarUnits(target);
  assert(a.length <= 5 && b.length <= 5, 'Keep the exhaustive oracle small.');
  for (const cost of Object.values(costs)) assert(Number.isInteger(cost) && cost > 0);
  let best = Infinity, count = 0, first = null;
  function walk(i, j, total, steps) {
    if (total > best) return;
    if (i === a.length && j === b.length) {
      if (total < best) { best = total; count = 0; first = steps; }
      count++;
      return;
    }
    if (i < a.length) walk(i + 1, j, total + costs.delete, [...steps, { op: 'delete', from: a[i], to: null }]);
    if (j < b.length) walk(i, j + 1, total + costs.insert, [...steps, { op: 'insert', from: null, to: b[j] }]);
    if (i < a.length && j < b.length) {
      const equal = a[i] === b[j];
      walk(i + 1, j + 1, total + (equal ? 0 : costs.substitute), [...steps, { op: equal ? 'match' : 'substitute', from: a[i], to: b[j] }]);
    }
  }
  walk(0, 0, 0, []);
  return { cost: best, optimalPathCount: count, example: first };
}

export function expectedPrefixTable(source, target, costs) {
  const a = scalarUnits(source), b = scalarUnits(target);
  return Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => enumeratedOptimum(a.slice(0, i).join(''), b.slice(0, j).join(''), costs).cost));
}

export function certificateCost(source, target, steps, costs) {
  const a = scalarUnits(source), b = scalarUnits(target);
  let i = 0, j = 0, cost = 0;
  const emitted = [];
  for (const step of steps) {
    if (step.op === 'delete') {
      assert.equal(step.from, a[i++]); assert.equal(step.to, null); cost += costs.delete;
    } else if (step.op === 'insert') {
      assert.equal(step.from, null); assert.equal(step.to, b[j++]); emitted.push(step.to); cost += costs.insert;
    } else if (step.op === 'match' || step.op === 'substitute') {
      assert.equal(step.from, a[i++]); assert.equal(step.to, b[j++]); emitted.push(step.to);
      if (step.op === 'match') assert.equal(step.from, step.to);
      else { assert.notEqual(step.from, step.to); cost += costs.substitute; }
    } else throw new Error('Unrecognized operation: ' + step.op);
    assert(i <= a.length && j <= b.length);
  }
  assert.equal(i, a.length); assert.equal(j, b.length); assert.equal(emitted.join(''), target);
  return cost;
}

const strings = [''];
for (let length = 1; length <= 3; length++) {
  for (let mask = 0; mask < 2 ** length; mask++) {
    strings.push(Array.from({ length }, (_, bit) => (mask >> bit) & 1 ? 'b' : 'a').join(''));
  }
}
export const fixedCorpus = Object.freeze({
  strings,
  costs: [{ insert: 1, delete: 1, substitute: 1 }, { insert: 2, delete: 3, substitute: 4 }, { insert: 1, delete: 1, substitute: 2 }],
  extraPairs: [['', '😀'], ['😀', ''], ['é', 'e\u0301'], ['👩‍💻', '👩💻'], ['a-b', 'ab-'], ['∅', ''], ['A', 'a'], [' a', 'a '], ['<b>', '<i>'], ['tack', 'stack'], ['cat', 'cut']],
  tiePairs: [['ab', 'ba'], ['aaa', 'aa'], ['a', 'b']],
  invalidScalars: ['\ud800', '\udfff', 'a\ud800b'],
  declaredProductPolicy: { maximumScalars: 16, costs: 'positive integers 1–9', refusedControls: 'C0 and DEL' }
});

export function selfCheck() {
  assert.equal(strings.length, 15);
  const unit = fixedCorpus.costs[0];
  for (const [a, b, expected, count] of [
    ['', '', 0, 1], ['ab', 'ba', 2, 3], ['aa', 'a', 1, 2],
    ['😀', '', 1, 1], ['é', 'e\u0301', 2, 2], ['👩‍💻', '👩💻', 1, 1], ['tack', 'stack', 1, 1]
  ]) {
    const got = enumeratedOptimum(a, b, unit);
    assert.equal(got.cost, expected); assert.equal(got.optimalPathCount, count);
    assert.equal(certificateCost(a, b, got.example, unit), expected);
  }
  assert.equal(enumeratedOptimum('', 'abc', { insert: 2, delete: 3, substitute: 4 }).cost, 6);
  assert.equal(enumeratedOptimum('abc', '', { insert: 2, delete: 3, substitute: 4 }).cost, 9);
  assert.deepEqual(expectedPrefixTable('ab', 'ac', unit), [[0,1,2],[1,0,1],[2,1,1]]);
  for (const input of fixedCorpus.invalidScalars) assert.throws(() => scalarUnits(input), /surrogate/);
  let pairs = 0, cells = 0;
  for (const costs of fixedCorpus.costs) for (const source of strings) for (const target of strings) {
    const result = enumeratedOptimum(source, target, costs);
    assert.equal(certificateCost(source, target, result.example, costs), result.cost);
    const table = expectedPrefixTable(source, target, costs);
    assert.equal(table.at(-1).at(-1), result.cost);
    pairs++; cells += table.reduce((n, row) => n + row.length, 0);
  }
  return { pairs, prefixCells: cells, knownCaseControls: 13, candidateImports: 0 };
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) console.log(JSON.stringify(selfCheck()));
