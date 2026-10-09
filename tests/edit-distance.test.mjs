import test from 'node:test';
import assert from 'node:assert/strict';
import { computeDistanceTrace, serializeTrace, MAX_SEQUENCE_LENGTH } from '../src/edit-distance.mjs';

// Independent shortest-path search through complete words, not prefix DP cells.
function editGraphDistance(source, target) {
  if (source === target) return 0;
  const maxLength = Math.max(source.length, target.length);
  const seen = new Set([source]), queue = [[source, 0]];
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const [word, distance] = queue[cursor];
    const neighbors = [];
    for (let i = 0; i < word.length; i++) {
      neighbors.push(word.slice(0, i) + word.slice(i + 1));
      for (const letter of 'ab') neighbors.push(word.slice(0, i) + letter + word.slice(i + 1));
    }
    if (word.length < maxLength) {
      for (let i = 0; i <= word.length; i++) for (const letter of 'ab') neighbors.push(word.slice(0, i) + letter + word.slice(i));
    }
    for (const next of neighbors) {
      if (next === target) return distance + 1;
      if (!seen.has(next)) { seen.add(next); queue.push([next, distance + 1]); }
    }
  }
  throw new Error('Oracle did not reach target');
}

function assertAlignment(trace) {
  assert.equal(trace.alignment.map(row => row.sourceToken ?? '').join(''), trace.source);
  assert.equal(trace.alignment.map(row => row.targetToken ?? '').join(''), trace.target);
  assert.equal(trace.alignment.reduce((sum, row) => sum + row.cost, 0), trace.distance);
  let at = [0, 0];
  for (const row of trace.alignment) {
    assert.deepEqual(row.from, at);
    const di = row.to[0] - row.from[0], dj = row.to[1] - row.from[1];
    assert.deepEqual([di, dj], row.operation === 'delete' ? [1, 0] : row.operation === 'insert' ? [0, 1] : [1, 1]);
    if (row.operation === 'match') { assert.equal(row.sourceToken, row.targetToken); assert.equal(row.cost, 0); }
    else { assert.equal(row.cost, 1); if (row.operation === 'substitute') assert.notEqual(row.sourceToken, row.targetToken); }
    at = row.to;
  }
  assert.deepEqual(at, [trace.sourceTokens.length, trace.targetTokens.length]);
}

test('Known distances distinguish insertion, deletion, substitution and forbidden transposition', () => {
  for (const [source, target, expected] of [
    ['', '', 0], ['', 'cat', 3], ['cat', '', 3], ['same', 'same', 0],
    ['cat', 'cut', 1], ['cat', 'cart', 1], ['cart', 'cat', 1],
    ['kitten', 'sitting', 3], ['ab', 'ba', 2], ['abc', 'bca', 2], ['A', 'a', 1], ['a b', 'ab', 1],
    ['ink', '', 3], ['aaaaaaa', 'aaa', 4], ['abcdefg', 'xyz', 7], ['car', 'ca', 1], ['ab', 'cb', 1], ['pan', 'plan', 1], ['Cat', 'cat', 1]
  ]) {
    const trace = computeDistanceTrace(source, target);
    assert.equal(trace.distance, expected, JSON.stringify([source, target]));
    assertAlignment(trace);
  }
});

test('All 225 short binary-string pairs agree with independent edit-graph BFS', () => {
  const words = [''];
  for (let length = 1; length <= 3; length++) {
    for (let bits = 0; bits < 2 ** length; bits++) words.push(bits.toString(2).padStart(length, '0').replaceAll('0', 'a').replaceAll('1', 'b'));
  }
  assert.equal(words.length, 15);
  for (const source of words) for (const target of words) {
    const trace = computeDistanceTrace(source, target);
    assert.equal(trace.distance, editGraphDistance(source, target), JSON.stringify([source, target]));
    assertAlignment(trace);
  }
});

test('Row-major events reference already available cells and record their costs', () => {
  const trace = computeDistanceTrace('kitten', 'sitting');
  const known = new Set();
  for (let i = 0; i <= 6; i++) { assert.equal(trace.matrix[i][0], i); known.add(i + ',0'); }
  for (let j = 0; j <= 7; j++) { assert.equal(trace.matrix[0][j], j); known.add('0,' + j); }
  assert.equal(trace.steps.length, 42);
  for (const [index, step] of trace.steps.entries()) {
    assert.deepEqual([step.i, step.j], [Math.floor(index / 7) + 1, index % 7 + 1]);
    for (const candidate of step.candidates) {
      assert.ok(known.has(candidate.from.join(',')));
      assert.equal(candidate.previous, trace.matrix[candidate.from[0]][candidate.from[1]]);
      assert.equal(candidate.total, candidate.previous + candidate.cost);
    }
    assert.equal(step.value, Math.min(...step.candidates.map(row => row.total)));
    assert.equal(step.value, trace.matrix[step.i][step.j]);
    known.add(step.i + ',' + step.j);
  }
});

test('Unicode is counted by code point without case folding or normalization', () => {
  for (const [source, target, expected] of [['A😀', 'A', 1], ['é', 'e\u0301', 2], ['🐈a', '🐈b', 1], ['\u0301', '', 1]]) {
    const trace = computeDistanceTrace(source, target);
    assert.equal(trace.distance, expected); assertAlignment(trace);
  }
  assert.equal(computeDistanceTrace('😀'.repeat(24), '').distance, 24);
  assert.equal(computeDistanceTrace('😀', '').sourceTokens.length, 1);
});

test('Tie policy returns a reproducible optimal alignment without asserting uniqueness', () => {
  const trace = computeDistanceTrace('ab', 'ba');
  assert.deepEqual(trace.alignment.map(row => row.operation), ['substitute', 'substitute']);
  assert.deepEqual(computeDistanceTrace('ab', 'ba'), trace);
});

test('Display bounds and malformed input fail explicitly without truncation', () => {
  assert.equal(MAX_SEQUENCE_LENGTH, 24);
  assert.throws(() => computeDistanceTrace('😀'.repeat(25), ''), /25 code points/);
  assert.throws(() => computeDistanceTrace('', 'a'.repeat(25)), /Target/);
  assert.throws(() => computeDistanceTrace(null, ''), TypeError);
  assert.throws(() => computeDistanceTrace('', 7), TypeError);
  assert.throws(() => computeDistanceTrace('\ud800', ''), /unpaired/);
  assert.throws(() => computeDistanceTrace('', '\udfff'), /unpaired/);
});

test('Complete export preserves original values and separately records inspection state', () => {
  const trace = computeDistanceTrace('a b', 'ab');
  const saved = structuredClone(trace);
  const result = JSON.parse(serializeTrace(trace, 1));
  assert.equal(result.inspectedStep, 1);
  assert.equal(result.steps.length, 6);
  assert.equal(result.source, 'a b');
  assert.deepEqual(result.alignment, trace.alignment);
  assert.equal(result.distance, 1);
  assert.deepEqual(trace, saved);
  for (const invalid of [-1, 7, 0.5, '1', NaN]) assert.throws(() => serializeTrace(trace, invalid), RangeError);
});
