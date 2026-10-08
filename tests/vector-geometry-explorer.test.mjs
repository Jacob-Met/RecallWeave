import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createContext, runInContext } from 'node:vm';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

const explorer = new URL('../courses/vector-geometry-explorer.html', import.meta.url);
const course = new URL('../courses/vector-geometry.json', import.meta.url);
const html = readFileSync(explorer, 'utf8');
const core = html.match(/<script id="geometry-core">([\s\S]*?)<\/script>/)?.[1];
assert.ok(core, 'Tests exercise the pure calculation embedded in the shipped explorer.');
const context = createContext({});
runInContext(core, context);
const calculate = (...values) => JSON.parse(JSON.stringify(context.calculateProjection(...values)));
const close = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-10,
  `${message}: ${actual} versus ${expected}`);

test('the downloadable course is the exact admitted course, without external dependencies', () => {
  const embedded = html.match(/<script id="course-data" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
  assert.equal(embedded.trim() + '\n', readFileSync(course, 'utf8'));
  assert.equal(JSON.parse(embedded).items.length, 12);
  assert.doesNotMatch(html, /<(?:script|iframe)[^>]+src\s*=|<link[^>]+rel=["']stylesheet|<img[^>]+src=/i);
  assert.doesNotMatch(html, /\b(?:fetch|XMLHttpRequest|localStorage|sessionStorage|document\.cookie)\b/);
});

test('rebuilding the embedded course preserves already current standalone bytes', () => {
  execFileSync(process.execPath, [fileURLToPath(new URL('../tools/build-vector-explorer.mjs', import.meta.url))]);
  assert.equal(readFileSync(explorer, 'utf8'), html);
});

test('the course example retains a component and reconstructs the exact original', () => {
  const r = calculate([3, 4], [2, 1]);
  assert.deepEqual(r.projection, [4, 2]);
  assert.deepEqual(r.residual, [-1, 2]);
  assert.equal(r.dot, 10);
  assert.equal(r.squaredLength, 5);
  assert.equal(r.coefficient, 2);
  assert.equal(r.residualDotDirection, 0);
});

test('the geometric line is unchanged by a positive or negative direction rescaling', () => {
  const original = calculate([3, 4], [2, 1]);
  for (const direction of [[4, 2], [-2, -1], [0.5, 0.25], [-6, -3]]) {
    const r = calculate([3, 4], direction);
    assert.deepEqual(r.projection, original.projection);
    assert.deepEqual(r.residual, original.residual);
  }
});

test('perpendicular, parallel, axis-aligned and zero-original cases remain defined', () => {
  assert.deepEqual(calculate([-1, 2], [2, 1]).projection, [0, 0]);
  assert.deepEqual(calculate([4, 2], [2, 1]).residual, [0, 0]);
  assert.deepEqual(calculate([4, -3], [0, 0.25]).projection, [0, -3]);
  assert.deepEqual(calculate([4, -3], [-6, 0]).projection, [4, 0]);
  const zero = calculate([0, 0], [0.25, 0]);
  assert.deepEqual(zero.projection, [0, 0]);
  assert.deepEqual(zero.residual, [0, 0]);
});

test('malformed, missing, out-of-domain and zero direction values are refused', () => {
  for (const vector of [null, {}, [1], [1, 2, 3], [NaN, 1], [Infinity, 0], ['1', 2],
    [6.25, 0], [-6.25, 0], [0.1, 0], [undefined, 0]]) {
    assert.throws(() => calculate(vector, [1, 0]), /coordinates/);
    assert.throws(() => calculate([1, 0], vector), /coordinates/);
  }
  assert.throws(() => calculate([1, 1], [0, 0]), /direction cannot be/);
});

test('calculation does not mutate or alias its input coordinates', () => {
  const b = Object.freeze([3, 4]), a = Object.freeze([2, 1]);
  const raw = context.calculateProjection(b, a);
  assert.notEqual(raw.b, b);
  assert.notEqual(raw.a, a);
  raw.b[0] = -6;
  raw.a[0] = -6;
  assert.deepEqual(b, [3, 4]);
  assert.deepEqual(a, [2, 1]);
});

test('2,000 independently checked geometries satisfy the projection characterization and plot bounds', () => {
  // Membership in the line and orthogonality uniquely characterize the
  // orthogonal projection. These checks do not repeat its coefficient formula.
  const bs = [-6, -3, 0, 3, 6];
  const as = [-6, -4, -2, -0.25, 0, 0.25, 2, 4, 6];
  let count = 0;
  for (const bx of bs) for (const by of bs) for (const ax of as) for (const ay of as) {
    if (ax === 0 && ay === 0) continue;
    const r = calculate([bx, by], [ax, ay]);
    const [px, py] = r.projection, [rx, ry] = r.residual;
    close(px * ay - py * ax, 0, 'projection is on the line');
    close(rx * ax + ry * ay, 0, 'residual is perpendicular');
    close(px + rx, bx, 'x reconstruction');
    close(py + ry, by, 'y reconstruction');
    close(px * px + py * py + rx * rx + ry * ry, bx * bx + by * by, 'Pythagorean decomposition');
    assert.ok([px, py, rx, ry].every(value => Number.isFinite(value) && Math.abs(value) < 9));
    count++;
  }
  assert.equal(count, 2000);
});
