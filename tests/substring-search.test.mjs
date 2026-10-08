import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSearchComparison, INPUT_LIMITS } from '../src/substring-search.mjs';
import { occurrenceOracle, borderOracle, naiveCountOracle, cases } from '../docs/substring-search-evidence/61749b-20261008/preimplementation/oracles.mjs';

function checkTrace(result, name) {
  const trace = result[name], steps = trace.steps;
  assert.equal(steps[0].kind, 'initial');
  assert.equal(steps.at(-1).kind, 'complete');
  let count = 0;
  for (let position = 0; position < steps.length; position++) {
    const step = steps[position], previous = steps[position - 1];
    if (step.kind === 'compare') {
      count++;
      const { left, right, equal } = step.comparison;
      const leftTokens = left.sequence === 'pattern' ? result.patternTokens : result.textTokens;
      assert.ok(left.index >= 0 && left.index < leftTokens.length);
      assert.ok(right.index >= 0 && right.index < result.patternTokens.length);
      assert.equal(leftTokens[left.index], left.token);
      assert.equal(result.patternTokens[right.index], right.token);
      assert.equal(equal, left.token === right.token);
    } else assert.equal(step.comparison, null);
    assert.equal(step.comparisons, count);
    if (step.fallback) {
      assert.equal(step.i, previous.i, 'fallback preserves the unresolved input index');
      assert.ok(step.fallback.to < step.fallback.from);
      assert.equal(step.q, result.prefix.table[step.fallback.from - 1]);
      assert.equal(step.fallback.to, step.q);
      assert.equal(step.comparisons, previous.comparisons);
    }
    if (step.kind === 'match') {
      assert.equal(result.textTokens.slice(step.match, step.match + result.patternTokens.length).join(''), result.pattern);
      assert.equal(step.matches.at(-1), step.match);
    }
    if (name === 'prefix') {
      for (let i = 0; i < step.table.length; i++) {
        if (step.table[i] !== null) assert.equal(step.table[i], borderOracle(result.pattern)[i]);
      }
    } else if (previous) assert.deepEqual(step.matches.slice(0, previous.matches.length), previous.matches);
    if (name === 'kmp' && previous) assert.ok(step.i >= previous.i, 'text cursor never retreats');
  }
  assert.equal(trace.comparisons, count);
  if (name === 'prefix') assert.deepEqual(steps.at(-1).table, result.prefix.table);
  else assert.deepEqual(steps.at(-1).matches, trace.matches);
}

test('12 preimplementation examples retain exact matches, borders and hand-derived counts', () => {
  for (const row of cases) {
    const result = buildSearchComparison(row.text, row.pattern);
    assert.deepEqual(result.naive.matches, row.matches, row.name);
    assert.deepEqual(result.kmp.matches, row.matches, row.name);
    assert.deepEqual(result.prefix.table, row.prefix, row.name);
    assert.deepEqual(result.counts, { naive: row.naive, prefix: row.preparation, kmpSearch: row.search, kmpTotal: row.preparation + row.search }, row.name);
    for (const phase of ['naive', 'prefix', 'kmp']) checkTrace(result, phase);
  }
});

function words(maxLength, includeEmpty) {
  const result = includeEmpty ? [''] : [];
  for (let length = 1; length <= maxLength; length++) {
    for (let bits = 0; bits < 2 ** length; bits++) result.push(bits.toString(2).padStart(length, '0').replaceAll('0', 'A').replaceAll('1', 'B'));
  }
  return result;
}

test('every naive displayed state, including completion after a full or partial last alignment, names an actual matching prefix', () => {
  for (const row of [...cases, { text: 'ZZAB', pattern: 'AC' }]) {
    const result = buildSearchComparison(row.text, row.pattern);
    for (const step of result.naive.steps) {
      assert.deepEqual(result.textTokens.slice(step.start, step.start + step.offset), result.patternTokens.slice(0, step.offset));
    }
    assert.equal(result.naive.steps.at(-1).offset, 0);
    assert.deepEqual(result.naive.matches, occurrenceOracle(row.text, row.pattern));
    assert.equal(result.naive.comparisons, naiveCountOracle(row.text, row.pattern));
  }
});

test('exhaustive binary texts through length 7 and nonempty patterns through length 4 agree with independent slice/border oracles', () => {
  let checked = 0;
  for (const text of words(7, true)) for (const pattern of words(4, false)) {
    const result = buildSearchComparison(text, pattern);
    const expected = occurrenceOracle(text, pattern);
    assert.deepEqual(result.naive.matches, expected);
    assert.deepEqual(result.kmp.matches, expected);
    assert.deepEqual(result.prefix.table, borderOracle(pattern));
    assert.equal(result.naive.comparisons, naiveCountOracle(text, pattern));
    // A progress bound for this variant, independent of particular example counts.
    assert.ok(result.kmp.comparisons <= 2 * Array.from(text).length);
    assert.ok(result.prefix.comparisons <= 2 * (Array.from(pattern).length - 1));
    checked++;
  }
  assert.equal(checked, 7650);
});

test('a concrete mismatch retains the same unresolved text token and a full-match fallback preserves overlap', () => {
  const result = buildSearchComparison('ABABACABABABAC', 'ABABAC');
  const at = result.kmp.steps.findIndex(step => step.kind === 'fallback' && step.i === 11);
  assert.ok(at > 0);
  assert.deepEqual(result.kmp.steps[at].fallback, { from: 5, to: 3 });
  const next = result.kmp.steps[at + 1];
  assert.equal(next.kind, 'compare');
  assert.equal(next.comparison.left.index, 11);
  assert.equal(next.comparison.right.index, 3);
  assert.equal(next.comparison.equal, true);
  const overlap = buildSearchComparison('AAAA', 'AA');
  assert.deepEqual(overlap.kmp.matches, [0, 1, 2]);
  assert.deepEqual(overlap.kmp.steps.filter(step => step.kind === 'match-fallback').map(step => step.q), [1, 1, 1]);
});

test('exact code-point limits, lone-surrogate refusal and literal controls preserve original strings', () => {
  const edge = buildSearchComparison('😀'.repeat(INPUT_LIMITS.text), '😀'.repeat(INPUT_LIMITS.pattern));
  assert.equal(edge.textTokens.length, 64); assert.equal(edge.patternTokens.length, 16);
  assert.equal(edge.kmp.matches.length, 49);
  for (const [text, pattern] of [['x'.repeat(65), 'x'], ['x', 'x'.repeat(17)], ['x', ''], ['\uD800', 'x'], ['x', '\uDC00'], [null, 'x'], ['x', 4]]) {
    assert.throws(() => buildSearchComparison(text, pattern), /must|at most|surrogate/);
  }
  const original = '\0\t\r\n<>&"\\';
  const result = buildSearchComparison(original, '\r\n');
  const restored = JSON.parse(JSON.stringify(result));
  assert.equal(restored.text, original);
  assert.equal(restored.pattern, '\r\n');
  assert.deepEqual(restored.kmp.matches, [2]);
});

test('all result objects are frozen snapshots and earlier results survive later builds', () => {
  const result = buildSearchComparison('AAAA', 'AA'), before = JSON.stringify(result);
  const visit = value => {
    if (value && typeof value === 'object') {
      assert.ok(Object.isFrozen(value));
      for (const child of Object.values(value)) visit(child);
    }
  };
  visit(result);
  assert.throws(() => result.kmp.matches.push(9), TypeError);
  assert.throws(() => { result.prefix.steps[0].table[1] = 99; }, TypeError);
  buildSearchComparison('XYZ', 'Y');
  assert.equal(JSON.stringify(result), before);
  assert.notEqual(result.prefix.table, result.prefix.steps.at(-1).table);
  assert.notEqual(result.kmp.matches, result.kmp.steps.at(-1).matches);
});
