import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

// Independent receiving oracle. Geometry is represented on one fixed 2^-31
// integer lattice, not with the production decoder or rational arithmetic.
// Source binary32 coordinates are independently derived explicit constants.
const sourcePath = process.argv[2] ?? '/workspace/scratch/b47cbcf18759/recallweave-floating-point-stage/src/floating-point.mjs';
const outputPath = process.argv[3] ?? '/workspace/scratch/b47cbcf18759/recallweave-root-review/numerical-receiving.json';
const hash = value => createHash('sha256').update(value).digest('hex');
const sourceBefore = readFileSync(sourcePath);
const sourceHash = hash(sourceBefore);
const model = await import(pathToFileURL(sourcePath).href + '?receiving=' + sourceHash);
const results = [];
function check(name, test) {
  try { test(); results.push({ name, passed: true }); }
  catch (error) { results.push({ name, passed: false, error: String(error.stack ?? error) }); }
}
function equalsRatio(actual, numerator, denominator = 1n) {
  assert.equal(BigInt(actual.numerator) * denominator, numerator * BigInt(actual.denominator));
  assert(BigInt(actual.denominator) > 0n);
}

const max32 = 2 ** 128 - 2 ** 104;
const overflowTie = 2 ** 128 - 2 ** 103;
const inspectorCases = [
  ['positive zero', 0, '00000000', 'zero', 0],
  ['negative zero', -0, '80000000', 'zero', -0],
  ['exact eighth', 0.125, '3e000000', 'normal', 0.125],
  ['decimal tenth via Number', 0.1, '3dcccccd', 'normal', 13421773 / 134217728],
  ['tie to lower even', 16777217, '4b800000', 'normal', 16777216],
  ['tie to upper even', 16777219, '4b800002', 'normal', 16777220],
  ['negative lower tie', -16777217, 'cb800000', 'normal', -16777216],
  ['negative upper tie', -16777219, 'cb800002', 'normal', -16777220],
  ['smallest subnormal', 2 ** -149, '00000001', 'subnormal', 2 ** -149],
  ['negative smallest subnormal', -(2 ** -149), '80000001', 'subnormal', -(2 ** -149)],
  ['half-smallest tie', 2 ** -150, '00000000', 'zero', 0],
  ['negative half-smallest tie', -(2 ** -150), '80000000', 'zero', -0],
  ['largest subnormal', 2 ** -126 - 2 ** -149, '007fffff', 'subnormal', 2 ** -126 - 2 ** -149],
  ['normal-subnormal midpoint', 2 ** -126 - 2 ** -150, '00800000', 'normal', 2 ** -126],
  ['smallest normal', 2 ** -126, '00800000', 'normal', 2 ** -126],
  ['largest finite', max32, '7f7fffff', 'normal', max32],
  ['one binary64 step below overflow tie', overflowTie - 2 ** 75, '7f7fffff', 'normal', max32],
  ['overflow midpoint tie', overflowTie, '7f800000', 'infinity', Infinity],
  ['negative overflow midpoint tie', -overflowTie, 'ff800000', 'infinity', -Infinity],
  ['finite input outside binary32 range', 2 ** 128, '7f800000', 'infinity', Infinity],
];
for (const [name, input, hex, classification, stored] of inspectorCases) {
  check('inspector: ' + name, () => {
    const actual = model.inspectFloat32(input);
    assert.equal(actual.hex, hex);
    assert.equal(actual.classification, classification);
    assert(Object.is(actual.stored, stored));
    assert.equal(actual.negativeZero, Object.is(stored, -0));
    assert.equal(actual.bits, BigInt('0x' + hex).toString(2).padStart(32, '0'));
  });
}

check('binary64 Number input and ideal decimal are distinct exact references', () => {
  equalsRatio(model.exactNumber(0.1), 3602879701896397n, 1n << 55n);
  const actual = model.inspectFloat32(0.1);
  equalsRatio(actual.storedExact, 13421773n, 1n << 27n);
  equalsRatio(actual.signedError, 53687091n, 1n << 55n);
  // This second denominator belongs to error from ideal 1/10, not the Number.
  assert.notEqual(BigInt(actual.signedError.numerator) * 671088640n,
    BigInt(actual.signedError.denominator));
});
check('unequal spacing on either side of an exact binade boundary', () => {
  const actual = model.inspectFloat32(16777216);
  assert.equal(actual.previous, 16777215);
  assert.equal(actual.next, 16777218);
});
check('neighbors at signed zero and infinities', () => {
  const zero = model.inspectFloat32(-0);
  assert.equal(zero.previous, -(2 ** -149));
  assert.equal(zero.next, 2 ** -149);
  const positive = model.inspectFloat32(2 ** 128);
  assert.equal(positive.previous, max32);
  assert.equal(positive.next, null);
  const negative = model.inspectFloat32(-(2 ** 128));
  assert.equal(negative.previous, null);
  assert.equal(negative.next, -max32);
});
check('nonfinite or non-Number source inputs refuse explicitly', () => {
  for (const value of [NaN, Infinity, -Infinity, '0.1', null, undefined, {}, 1n]) {
    assert.throws(() => model.exactNumber(value), TypeError);
    assert.throws(() => model.inspectFloat32(value), TypeError);
  }
});

const expectedAssociation = [
  ['cancellation', 0, -100000000, 1, 0],
  ['integer-gap', 16777216, -16777215, 0, 1],
  ['exact-control', 0, -7, 1, 1],
];
for (const [id, li, ri, left, right] of expectedAssociation) {
  check('round after each operation: ' + id, () => {
    const actual = model.associationExperiment(id);
    assert.deepEqual([actual.leftIntermediate, actual.rightIntermediate, actual.left, actual.right],
      [li, ri, left, right]);
    equalsRatio(actual.exactStoredSum, 1n);
  });
}

const Q = 1n << 31n;
const AREA_Q = Q * Q;
// Local vertices are [0,0], [11744051,13421773]/2^23,
// [21810380,28521268]/2^23. These are the stored 1.4/1.6/2.6/3.4
// constants, not the ideal decimal inputs or the production ratio helper.
const LOCAL = [[0n, 0n], [11744051n, 13421773n], [21810380n, 28521268n]];
function roundLatticeTo24Bits(value) {
  assert(value >= 0n);
  if (value === 0n) return 0n;
  const shift = Math.max(0, value.toString(2).length - 24);
  if (shift === 0) return value;
  const quantum = 1n << BigInt(shift);
  let quotient = value / quantum;
  const twiceRemainder = 2n * (value % quantum);
  if (twiceRemainder > quantum || (twiceRemainder === quantum && quotient % 2n === 1n)) quotient++;
  return quotient * quantum;
}
function determinant(points) {
  const [[ax, ay], [bx, by], [cx, cy]] = points;
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}
const coordinateUnits = number => {
  assert(Number.isFinite(number));
  return BigInt(number * Number(Q));
};
function referenceTriangle(translation, unitExponent) {
  const scaled = LOCAL.map(p => p.map(v => v << BigInt(unitExponent + 8)));
  const origin = BigInt(translation) << BigInt(unitExponent + 31);
  const translated = scaled.map(p => p.map(v => v + origin));
  const stored = translated.map(p => p.map(roundLatticeTo24Bits));
  return { scaled, translated, stored, sourceArea: determinant(scaled), storedArea: determinant(stored) };
}
const origins = new Set([0, 1, 10000, 1000000, 10000000, 16777216, 67108864]);
for (let exponent = 0; exponent <= 26; exponent++) {
  for (const delta of [-1, 0, 1]) {
    const origin = 2 ** exponent + delta;
    if (origin >= 0 && origin <= 67108864) origins.add(origin);
  }
}
const observed = { preserved: 0, collapsed: 0, reversed: 0 };
let geometryCases = 0;
const geometryFailures = [];
for (const translation of [...origins].sort((a, b) => a - b)) {
  let invariantOrientation;
  for (let unitExponent = -8; unitExponent <= 8; unitExponent++) {
    geometryCases++;
    try {
      const expected = referenceTriangle(translation, unitExponent);
      const actual = model.triangleExperiment({ translation, unitExponent });
      assert.deepEqual(actual.source.map(p => p.map(coordinateUnits)), expected.scaled);
      assert.deepEqual(actual.translated.map(p => p.map(coordinateUnits)), expected.translated);
      assert.deepEqual(actual.stored.map(p => p.map(coordinateUnits)), expected.stored);
      equalsRatio(actual.sourceDoubleArea, expected.sourceArea, AREA_Q);
      equalsRatio(actual.storedDoubleArea, expected.storedArea, AREA_Q);
      equalsRatio(actual.localStorageDoubleArea, expected.sourceArea, AREA_Q);
      const expectedOrientation = expected.storedArea === 0n ? 'collapsed'
        : expected.storedArea > 0n ? 'preserved' : 'reversed';
      assert.equal(actual.orientation, expectedOrientation);
      invariantOrientation ??= actual.orientation;
      assert.equal(actual.orientation, invariantOrientation);
      observed[actual.orientation]++;
    } catch (error) { geometryFailures.push({ translation, unitExponent, error: String(error.stack ?? error) }); }
  }
}
results.push({ name: 'exact integer-lattice geometry oracle over binade boundaries and all admitted unit exponents',
  passed: geometryFailures.length === 0, origins: origins.size, cases: geometryCases, observed, failures: geometryFailures });

check('observed translated triangle reverses; separate origin retains source geometry', () => {
  const actual = model.triangleExperiment({ translation: 10000000 });
  assert.equal(actual.orientation, 'reversed');
  assert.deepEqual(actual.relativeStored, [[0, 0], [1, 2], [3, 3]]);
  equalsRatio(actual.storedDoubleArea, -3n);
  assert(BigInt(actual.sourceDoubleArea.numerator) > 0n);
  assert.equal(actual.sourceDoubleArea.text, actual.localStorageDoubleArea.text);
  assert.equal(actual.nextOriginGap, 1);
});
check('explicit domain refusal and reproducible serialized report', () => {
  for (const parameters of [{ translation: -1 }, { translation: 1.5 }, { translation: 67108865 },
    { translation: NaN }, { unitExponent: -9 }, { unitExponent: 9 }, { unitExponent: 0.5 }]) {
    assert.throws(() => model.triangleExperiment(parameters), RangeError);
    assert.throws(() => model.serializeTriangleReport(parameters), RangeError);
  }
  const serialized = model.serializeTriangleReport({ translation: 10000000, unitExponent: -8 });
  assert.equal(serialized, model.serializeTriangleReport({ translation: 10000000, unitExponent: -8 }));
  const parsed = JSON.parse(serialized);
  assert.equal(parsed.format, 'recallweave-floating-point-experiment/1');
  assert.equal(parsed.experiment.orientation, 'reversed');
  assert.match(parsed.interpretation.localAlternative, /origin stays separate/);
});

assert.equal(hash(readFileSync(sourcePath)), sourceHash, 'Source changed during independent receiving');
const report = {
  schema: 'hamon.independent-product-receiving.v1',
  actor: 'chatgpt-b47cbcf18759/root',
  captured_at: new Date().toISOString(),
  source_path: sourcePath,
  source_sha256: sourceHash,
  driver_sha256: hash(readFileSync(new URL(import.meta.url))),
  runtime: process.version,
  state: results.every(r => r.passed) ? 'passed_local_numerical_receiving' : 'failed_local_numerical_receiving',
  method: 'Hardcoded IEEE binary32 boundary expectations and a separate fixed 2^-31 BigInt lattice with integer nearest-even quantization. No production rational/decoder helper is used as the expected result.',
  limits: 'Local Node execution only. No native host, browser, importer, delivery, universal input proof or learning benefit is claimed. Geometry covers 84 specific origins and all17 admitted power-of-two unit exponents; failures, if any, remain in this receipt.',
  sources: [
    'https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-math.fround',
    'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/fround',
    'https://docs.oracle.com/cd/E19957-01/806-3568/ncg_goldberg.html',
  ],
  results,
};
// Counts are generated from the executed set, not copied from an intended range.
report.limits = report.limits.replace('84 specific origins', `${origins.size} specific origins`);
writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ state: report.state, source_sha256: sourceHash,
  checks: results.length, passed: results.filter(r => r.passed).length,
  geometry_origins: origins.size, geometry_cases: geometryCases, observed,
  failures: results.filter(r => !r.passed), output_path: outputPath,
  output_sha256: hash(readFileSync(outputPath)) }));
if (!results.every(r => r.passed)) process.exitCode = 1;
