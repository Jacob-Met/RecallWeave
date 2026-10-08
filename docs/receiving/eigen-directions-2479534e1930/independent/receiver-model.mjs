import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const frozen = JSON.parse(fs.readFileSync(path.join(here, 'blind-contract-freeze.json'), 'utf8'));
if (!process.argv[2]) throw new Error('Pass the candidate model module path.');
const candidatePath = path.resolve(process.argv[2]);
const { analyzeEigen } = await import(pathToFileURL(candidatePath).href);
assert.equal(typeof analyzeEigen, 'function');
const results = [];
const outputs = [];
const run = (name, fn) => {
  try { fn(); results.push({ name, status: 'pass' }); }
  catch (error) { results.push({ name, status: 'fail', message: error.message, stack: error.stack }); }
};
const near = (actual, expected, label) =>
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= 1e-11 * Math.max(1, Math.abs(expected)), label + ': ' + actual + ' vs ' + expected);
const numericPair = (actual, expected, label) => {
  assert.ok(Array.isArray(actual) && actual.length === 2, label + ' pair shape');
  for (let i = 0; i < 2; ++i) assert.ok(typeof actual[i] === 'number' && actual[i] === expected[i], label + '[' + i + '] expected ' + expected[i] + ', got ' + actual[i]);
};
const deepFrozen = (value, label = 'result', seen = new Set()) => {
  if (value === null || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  assert.ok(Object.isFrozen(value), label + ' is mutable');
  for (const key of Object.keys(value)) deepFrozen(value[key], label + '.' + key, seen);
};
const gcd = (a, b) => b === 0 ? Math.abs(a) : gcd(b, a % b);
const rationalEquals = (r, expected, label) => {
  assert.ok(r && typeof r === 'object', label + ' rational missing');
  assert.ok(Number.isInteger(r.numerator) && Number.isInteger(r.denominator) && r.denominator > 0, label + ' rational invalid');
  assert.ok(gcd(r.numerator, r.denominator) === 1, label + ' rational not reduced');
  assert.ok(r.numerator / r.denominator === expected, label + ' rational value wrong');
  assert.equal(r.text, String(expected), label + ' rational text');
};
function inspectControl(c) {
  const m = c.matrix.map(row => [...row]), p = [...c.probe];
  if (c.name === 'zero scalar whole plane with negative zero') {
    m[0][1] = -0; m[1][0] = -0; p[0] = -0;
  }
  const matrixBefore = JSON.stringify(m), probeBefore = JSON.stringify(p);
  const o = analyzeEigen(m, p);
  outputs.push({ name: c.name, actual: o });
  assert.equal(JSON.stringify(m), matrixBefore, 'matrix argument changed');
  assert.equal(JSON.stringify(p), probeBefore, 'probe argument changed');
  assert.equal(JSON.stringify(o.matrix), matrixBefore, 'matrix snapshot');
  numericPair(o.probe, p, 'probe snapshot');
  numericPair(o.image, c.image, 'image');
  assert.ok(o.crossProduct === c.cross, 'exact cross product wrong');
  assert.equal(o.isEigenvector, c.scale !== null, 'exact eigenvector status');
  const action = c.scale === null ? 'changes-line' : c.scale === 0 ? 'vanishes' : c.scale < 0 ? 'reverses-direction' : 'keeps-direction';
  assert.equal(o.action, action, 'signed scale action');
  if (c.scale === null) assert.equal(o.scale, null, 'noneigenvector must have no scale');
  else rationalEquals(o.scale, c.scale, 'probe scale');
  const [[a, b], [cc, d]] = m;
  assert.ok(o.trace === a + d, 'trace');
  assert.ok(o.determinant === a * d - b * cc, 'determinant');
  assert.ok(o.discriminant === (a + d) ** 2 - 4 * (a * d - b * cc), 'discriminant');
  assert.equal(o.classification, c.classification, 'classification');
  assert.ok(Array.isArray(o.eigenspaces), 'eigenspaces array');
  assert.equal(o.eigenspaces.length, c.roots.length, 'number of eigenspaces');
  const spaces = [...o.eigenspaces].sort((x, y) => x.eigenvalue.approximate - y.eigenvalue.approximate);
  spaces.forEach((s, i) => {
    const lambda = c.roots[i], scalar = c.classification === 'every-direction';
    near(s.eigenvalue.approximate, lambda, 'eigenvalue');
    assert.equal(typeof s.eigenvalue.exact, 'string', 'exact eigenvalue text');
    if (c.irrational) {
      assert.equal(s.eigenvalue.rational, null, 'irrational root must not claim rationality');
      assert.match(s.eigenvalue.exact, /√|sqrt/, 'irrational exact root requires radical');
    } else rationalEquals(s.eigenvalue.rational, lambda, 'root');
    assert.equal(s.algebraicMultiplicity, c.roots.length === 2 ? 1 : 2, 'algebraic multiplicity');
    assert.equal(s.dimension, scalar ? 2 : 1, 'geometric dimension');
    assert.ok(Array.isArray(s.basisApproximate), 'basis array');
    assert.equal(s.basisApproximate.length, s.dimension, 'basis vector count');
    s.basisApproximate.forEach(v => {
      assert.ok(Array.isArray(v) && v.length === 2 && v.every(Number.isFinite), 'finite basis pair');
      const size = Math.hypot(v[0], v[1]);
      assert.ok(size > 0, 'basis vector must be nonzero');
      const residual = Math.hypot(a*v[0]+b*v[1]-lambda*v[0], cc*v[0]+d*v[1]-lambda*v[1]);
      assert.ok(residual <= 1e-10 * Math.max(1, Math.abs(lambda), Math.abs(a), Math.abs(b), Math.abs(cc), Math.abs(d)) * size, 'basis eigen-equation residual ' + residual);
    });
    if (scalar) {
      const [u, v] = s.basisApproximate;
      assert.ok(Math.abs(u[0]*v[1]-u[1]*v[0]) > 1e-10 * Math.hypot(...u) * Math.hypot(...v), 'whole-plane basis must be independent');
    }
  });
  if (c.classification === 'no-real-eigenline') assert.ok(o.complexPair !== null && typeof o.complexPair === 'object', 'complex conjugate data missing');
  else assert.equal(o.complexPair, null, 'real spectrum must not have complex pair');
  deepFrozen(o);
}
for (const c of frozen.controls) run(c.name, () => inspectControl(c));
const I = [[1,0],[0,1]], v = [1,1];
const invalid = [
  ['matrix beyond positive bound', [[10,0],[0,1]], v],
  ['matrix beyond negative bound', [[-10,0],[0,1]], v],
  ['fractional matrix', [[1,0.5],[0,1]], v],
  ['string matrix entry', [['1',0],[0,1]], v],
  ['boolean matrix entry', [[true,0],[0,1]], v],
  ['NaN matrix', [[NaN,0],[0,1]], v],
  ['infinite matrix', [[Infinity,0],[0,1]], v],
  ['null matrix entry', [[null,0],[0,1]], v],
  ['bigint matrix entry', [[1n,0],[0,1]], v],
  ['missing matrix row', [[1,0]], v],
  ['ragged matrix', [[1,0],[1]], v],
  ['extra matrix column', [[1,0,0],[0,1]], v],
  ['sparse matrix row', [[1,,],[0,1]], v],
  ['probe beyond positive bound', I, [21,0]],
  ['probe beyond negative bound', I, [-21,0]],
  ['fractional probe', I, [1,0.5]],
  ['string probe entry', I, ['1',0]],
  ['boolean probe entry', I, [true,0]],
  ['NaN probe', I, [NaN,1]],
  ['infinite probe', I, [Infinity,1]],
  ['short probe', I, [1]],
  ['long probe', I, [1,0,0]],
  ['sparse probe', I, [1,,]],
  ['zero probe', I, [0,0]],
  ['negative-zero probe', I, [-0,-0]],
];
for (const [name, m, p] of invalid) run('reject ' + name, () => assert.throws(() => analyzeEigen(m,p), 'invalid input was accepted'));
run('immutable output is independent of caller arrays', () => {
  const m = [[2,1],[0,3]], p = [2,1], o = analyzeEigen(m,p);
  deepFrozen(o);
  assert.notEqual(o.matrix, m);
  assert.notEqual(o.matrix[0], m[0]);
  assert.notEqual(o.matrix[1], m[1]);
  assert.notEqual(o.probe, p);
  const saved = JSON.stringify(o);
  m[0][0] = 9; m[1][1] = -9; p[0] = 20;
  assert.equal(JSON.stringify(o), saved, 'caller mutation changed output');
});
const report = {
  receiver: 'independent eigen receiving, estate 2479534e1930',
  checkedAtUTC: new Date().toISOString(),
  node: process.version,
  candidatePath,
  tests: results.length,
  passed: results.filter(x => x.status === 'pass').length,
  failed: results.filter(x => x.status === 'fail').length,
  results,
  outputs,
};
fs.writeFileSync(path.join(here,'model-results.json'), JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report, outputs: undefined},null,2));
process.exitCode = report.failed ? 1 : 0;
