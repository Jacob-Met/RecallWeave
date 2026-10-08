import test from 'node:test';
import assert from 'node:assert/strict';
import { solveCongruences, inspectCongruences, serializeObservation } from '../src/congruences.mjs';

const normalize = (a, m) => ((a % m) + m) % m;
const solve = (a, m, b, n) => solveCongruences(String(a), String(m), String(b), String(n));
function divisorsGcd(m, n) {
  let last = 1;
  for (let d = 1; d <= Math.min(m, n); d++) if (m % d === 0 && n % d === 0) last = d;
  return last;
}

test('all 6084 canonical pairs with moduli 1–12 agree with independent complete enumeration', () => {
  let cases = 0;
  for (let m = 1; m <= 12; m++) for (let n = 1; n <= 12; n++) {
    const gcd = divisorsGcd(m, n), period = m * n / gcd;
    for (let a = 0; a < m; a++) for (let b = 0; b < n; b++) {
      cases++;
      const expected = [];
      for (let x = 0; x < m * n; x++) if (x % m === a && x % n === b) expected.push(x);
      const result = solve(a, m, b, n);
      assert.equal(result.compatibility.gcd, String(gcd));
      assert.equal(result.compatibility.compatible, expected.length > 0);
      if (!expected.length) { assert.equal(result.solution, null); continue; }
      assert.equal(result.solution.first, String(expected[0]));
      assert.equal(result.solution.period, String(period));
      assert.deepEqual(expected, Array.from({length: gcd}, (_, k) => expected[0] + period * k));
    }
  }
  assert.equal(cases, 6084);
});

test('signed and translated residues preserve the exact common class and condition order', () => {
  for (let m = 1; m <= 9; m++) for (let n = 1; n <= 9; n++) {
    for (const a of [-17, -1, 0, 7, 23]) for (const b of [-19, -2, 0, 8, 21]) {
      const original = solve(a, m, b, n);
      const translated = solve(a + 4 * m, m, b - 5 * n, n);
      const reversed = solve(b, n, a, m);
      assert.equal(original.compatibility.compatible, translated.compatibility.compatible);
      assert.equal(original.compatibility.compatible, reversed.compatibility.compatible);
      assert.deepEqual(original.normalized, translated.normalized);
      for (const field of ['first', 'period']) {
        assert.equal(original.solution?.[field], translated.solution?.[field]);
        assert.equal(original.solution?.[field], reversed.solution?.[field]);
      }
    }
  }
});

test('every retained Bezout identity and reduced inverse holds independently', () => {
  for (let m = 1; m < 70; m++) for (let n = 1; n < 70; n++) {
    const result = solve(-5, m, 13, n), c = result.compatibility;
    assert.equal(BigInt(c.bezout.s) * BigInt(m) + BigInt(c.bezout.t) * BigInt(n), BigInt(c.gcd));
    if (!result.solution) continue;
    const s = result.solution;
    if (BigInt(c.reducedN) === 1n) assert.equal(s.reducedInverse, null);
    else assert.equal((BigInt(c.reducedM) * BigInt(s.reducedInverse)) % BigInt(c.reducedN), 1n);
    const first = BigInt(s.first);
    assert.equal(normalize(first, BigInt(m)), BigInt(result.normalized.a));
    assert.equal(normalize(first, BigInt(n)), BigInt(result.normalized.b));
    assert.ok(first >= 0n && first < BigInt(s.period));
  }
});

test('maximum input moduli produce a 36-digit exact period and first solution', () => {
  const m = 999999999999999999n, n = m - 1n, period = m * n;
  const result = solve(-2, m, -2, n);
  assert.equal(result.solution.period, String(period));
  assert.equal(result.solution.first, String(period - 2n));
  assert.equal(result.compatibility.gcd, '1');
  assert.equal(result.solution.first.length, 36);
});

test('modulus one, repeated and dividing moduli retain complete classes', () => {
  for (const [args, first, period] of [
    [[4, 1, 3, 8], '3', '8'], [[8, 1, -900, 1], '0', '1'],
    [[6, 7, -1, 7], '6', '7'], [[5, 12, 1, 4], '5', '12'],
    [[1, 4, 5, 12], '5', '12'],
  ]) {
    const result = solve(...args);
    assert.equal(result.solution.first, first);
    assert.equal(result.solution.period, period);
  }
  assert.equal(solve(6, 7, 5, 7).solution, null);
  assert.equal(solve(1, 4, 2, 6).solution, null);
  assert.equal(solve(5, 12, 1, 4).solution.reducedInverse, null);
});

test('input admission keeps exact raw text and rejects lossy or out-of-scope representations', () => {
  const result = solveCongruences(' +0003 ', '\n+04', '-03 ', '0005');
  assert.deepEqual(result.entered, {a: ' +0003 ', m: '\n+04', b: '-03 ', n: '0005'});
  assert.deepEqual(result.normalized, {a: '3', m: '4', b: '2', n: '5'});
  for (const bad of ['', ' ', '1.0', '1e3', '0x10', '12_3', '1 2', '١', 'NaN', 'Infinity',
    '1'.repeat(19), '0'.repeat(19), ' '.repeat(40) + '1' + ' '.repeat(40), 3, null, {}, undefined]) {
    assert.throws(() => solveCongruences(bad, '4', '2', '5'));
    assert.throws(() => solveCongruences('3', bad, '2', '5'));
  }
  for (const bad of ['0', '-0', '-1']) assert.throws(() => solveCongruences('3', bad, '2', '5'));
  assert.equal(solveCongruences('-0', '1', '+0', '1').solution.first, '0');
});

test('inspection shows each consecutive integer and remainder including negatives and zero', () => {
  const result = solve(2, 6, 5, 9), view = inspectCongruences(result, '-13');
  assert.equal(view.rows.length, 24);
  assert.deepEqual(view.rows.map(row => row.x), Array.from({length: 24}, (_, i) => String(i - 13)));
  for (const row of view.rows) {
    const x = Number(row.x);
    assert.equal(row.remainderA, String(normalize(x, 6)));
    assert.equal(row.remainderB, String(normalize(x, 9)));
    assert.equal(row.matchesA, normalize(x, 6) === 2);
    assert.equal(row.matchesB, normalize(x, 9) === 5);
    assert.equal(row.matchesBoth, normalize(x, 18) === 14);
  }
  assert.deepEqual(view.rows.filter(row => row.matchesBoth).map(row => row.x), ['-4']);
});

test('a compatible empty window does not become an incompatible result', () => {
  const result = solve(40, 101, 0, 1);
  assert.equal(result.compatibility.compatible, true);
  assert.equal(result.solution.first, '40');
  assert.ok(inspectCongruences(result, '0').rows.every(row => !row.matchesBoth));
  assert.equal(inspectCongruences(result, '40').rows[0].matchesBoth, true);
  assert.ok(inspectCongruences(solve(1, 4, 2, 6), '0').rows.every(row => !row.matchesBoth));
});

test('72-digit signed probes and successor carry retain literal exact values', () => {
  const result = solve(0, 1, 0, 1), start = '9'.repeat(72);
  const view = inspectCongruences(result, start);
  assert.equal(view.rows[0].x, start);
  assert.equal(view.rows[1].x, '1' + '0'.repeat(72));
  assert.equal(view.rows[23].x, String(BigInt(start) + 23n));
  assert.ok(view.rows.every(row => row.matchesBoth));
  const negative = inspectCongruences(solve(2, 6, 5, 9), '-' + start);
  assert.equal(negative.rows[23].x, String(-BigInt(start) + 23n));
  for (const bad of ['1'.repeat(73), '2.5', '2e4', '', 3, null]) {
    assert.throws(() => inspectCongruences(result, bad));
  }
});

test('results and observations preserve applied identity with immutable model snapshots', () => {
  const result = solve(2, 6, 5, 9), view = inspectCongruences(result, ' -4 ');
  assert.ok(Object.isFrozen(result.normalized) && Object.isFrozen(result.compatibility.bezout));
  assert.ok(Object.isFrozen(view.rows) && view.rows.every(Object.isFrozen));
  assert.throws(() => { result.solution.first = '0'; });
  assert.throws(() => { view.rows[0].x = '0'; });
  const serialized = serializeObservation(result, view), parsed = JSON.parse(serialized);
  assert.equal(parsed.result.solution.first, '14');
  assert.equal(parsed.inspection.entered, ' -4 ');
  assert.deepEqual(parsed.inspection.rows, view.rows);
  assert.ok(serialized.endsWith('\n'));
  assert.equal(serializeObservation(result, {...view, rows: []}), serialized);
});
