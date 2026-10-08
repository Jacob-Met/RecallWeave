import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeHull, parseHullPoints, serializeHullRecord, MAX_HULL_POINTS, HULL_COORDINATE_LIMIT } from '../src/convex-hull.mjs';

const signed = (a, b, c) => a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]);
const key = p => p.join(',');
const lexical = (a, b) => a[0] - b[0] || a[1] - b[1];
function between(p, a, b) {
  return signed(a, b, p) === 0 && (p[0] - a[0]) * (p[0] - b[0]) + (p[1] - a[1]) * (p[1] - b[1]) <= 0;
}
function inTriangle(p, a, b, c) {
  if (signed(a, b, c) === 0) return false;
  const sides = [signed(a, b, p), signed(b, c, p), signed(c, a, p)];
  return sides.every(v => v >= 0) || sides.every(v => v <= 0);
}
// Independent containment criterion: in the plane, a non-extreme point lies
// in a segment or triangle of other points (Caratheodory, dimension two).
function extremeOracle(points) {
  return points.filter((p, index) => {
    const others = points.filter((_, j) => j !== index);
    for (let a = 0; a < others.length; a++) for (let b = a + 1; b < others.length; b++) {
      if (between(p, others[a], others[b])) return false;
      for (let c = b + 1; c < others.length; c++) if (inTriangle(p, others[a], others[b], others[c])) return false;
    }
    return true;
  });
}
const coordinates = result => {
  const points = new Map(result.inputs.map(p => [p.id, [p.x, p.y]]));
  return result.hull.map(id => points.get(id));
};

function checkGeometry(points) {
  const unique = [...new Map(points.map(p => [key(p), p])).values()];
  const result = analyzeHull(points), hull = coordinates(result);
  assert.deepEqual([...hull].sort(lexical), extremeOracle(unique).sort(lexical));
  assert.equal(new Set(result.hull).size, result.hull.length);
  if (hull.length) assert.deepEqual(hull[0], [...unique].sort(lexical)[0]);
  if (hull.length > 2) {
    assert.equal(result.kind, 'polygon');
    for (let i = 0; i < hull.length; i++) {
      assert.ok(signed(hull[i], hull[(i + 1) % hull.length], hull[(i + 2) % hull.length]) > 0);
      for (const p of points) assert.ok(signed(hull[i], hull[(i + 1) % hull.length], p) >= 0);
    }
  } else if (hull.length === 2) {
    assert.equal(result.kind, 'segment');
    assert.deepEqual(hull, [...hull].sort(lexical));
    for (const p of points) assert.ok(between(p, hull[0], hull[1]));
  } else assert.equal(result.kind, hull.length ? 'point' : 'empty');
  const fanArea = hull.length < 3 ? 0 : hull.slice(1, -1).reduce((sum, p, i) => sum + signed(hull[0], p, hull[i + 2]), 0);
  assert.equal(result.twiceArea, fanArea);
  assert.equal(result.area, fanArea / 2);
  return result;
}

function replay(result) {
  const points = new Map(result.inputs.map(p => [p.id, [p.x, p.y]]));
  const stack = { lower: [], upper: [] }, pushed = { lower: [], upper: [] };
  result.steps.forEach((step, index) => {
    assert.equal(step.index, index);
    if (step.action === 'complete') {
      assert.equal(index, result.steps.length - 1);
      assert.equal(step.phase, 'complete');
      assert.deepEqual(step.after, result.hull);
      return;
    }
    assert.deepEqual(step.before, stack[step.phase]);
    assert.ok(points.has(step.candidate));
    if (step.action === 'push') {
      assert.deepEqual(step.after, [...step.before, step.candidate]);
      assert.equal(step.determinant, null);
      pushed[step.phase].push(step.candidate);
    } else {
      assert.deepEqual(step.tested, [...step.before.slice(-2), step.candidate]);
      const value = signed(...step.tested.map(id => points.get(id)));
      assert.equal(step.determinant, value);
      assert.ok(Number.isSafeInteger(value) && Math.abs(value) <= 3200);
      if (step.action === 'pop') {
        assert.ok(value <= 0);
        assert.equal(step.removed, step.before.at(-1));
        assert.deepEqual(step.after, step.before.slice(0, -1));
      } else {
        assert.equal(step.action, 'retain');
        assert.ok(value > 0);
        assert.deepEqual(step.after, step.before);
      }
    }
    stack[step.phase] = step.after;
  });
  if (result.unique.length >= 2) {
    assert.deepEqual(pushed.lower, result.sortedIds);
    assert.deepEqual(pushed.upper, [...result.sortedIds].reverse());
    assert.deepEqual(stack.lower, result.lower);
    assert.deepEqual(stack.upper, result.upper);
  }
}

test('all 512 subsets of an integer grid agree with an independent containment oracle', () => {
  const grid = [-1, 0, 1].flatMap(x => [-1, 0, 1].map(y => [x, y]));
  for (let mask = 0; mask < 512; mask++) {
    const points = grid.filter((_, i) => mask & 1 << i);
    const result = checkGeometry(points);
    replay(result);
  }
});

test('complete rectangle fixture retains input identity, exact area and every decision', () => {
  const points = [[-4, -3], [4, -3], [4, 3], [-4, 3], [0, 0], [0, -3], [4, -3]];
  const result = checkGeometry(points);
  assert.deepEqual(result.hull, ['P1', 'P2', 'P3', 'P4']);
  assert.equal(result.twiceArea, 96);
  assert.equal(result.steps.length, 23);
  assert.deepEqual(result.steps[2], { index: 2, phase: 'lower', action: 'pop', candidate: 'P6',
    before: ['P1', 'P4'], after: ['P1'], tested: ['P1', 'P4', 'P6'], determinant: -24, removed: 'P4' });
  assert.deepEqual(result.classifications.map(p => p.role), ['vertex', 'vertex', 'vertex', 'vertex', 'interior', 'edge', 'vertex']);
  assert.deepEqual(result.classifications[6], { id: 'P7', representativeId: 'P2', duplicate: true, role: 'vertex' });
  assert.deepEqual(result.unique.find(p => p.id === 'P2').inputIds, ['P2', 'P7']);
  replay(result);
});

test('empty, identical, two-point, vertical and collinear results have explicit conventions', () => {
  const fixtures = [
    [], [[2, 1]], [[2, 1], [2, 1]], [[3, 2], [-3, -2]],
    [[2, 3], [2, -1], [2, 1]], [[-4, -2], [-2, -1], [0, 0], [4, 2], [-2, -1]],
  ];
  for (const points of fixtures) replay(checkGeometry(points));
  assert.equal(analyzeHull([]).steps.length, 1);
  assert.equal(analyzeHull([[2, 1], [2, 1]]).steps.length, 1);
  assert.deepEqual(analyzeHull([[2, 1], [2, 1]]).hull, ['P1']);
  assert.deepEqual(analyzeHull([[2, 3], [2, -1], [2, 1]]).classifications.map(p => p.role), ['vertex', 'vertex', 'edge']);
  assert.deepEqual(analyzeHull([[-4, -2], [-2, -1], [0, 0], [4, 2], [-2, -1]]).classifications.map(p => p.role), ['vertex', 'edge', 'edge', 'vertex', 'edge']);
});

test('coordinate and count boundaries retain exact determinants and half-unit area', () => {
  assert.equal(MAX_HULL_POINTS, 16);
  assert.equal(HULL_COORDINATE_LIMIT, 20);
  const corners = [[-20, -20], [20, -20], [20, 20], [-20, 20]];
  const points = [...corners, ...Array.from({ length: 12 }, (_, i) => [i - 6, i % 3])];
  const result = checkGeometry(points);
  assert.equal(result.area, 1600);
  assert.equal(result.twiceArea, 3200);
  replay(result);
  assert.equal(checkGeometry([[0, 0], [3, 0], [0, 1]]).area, 1.5);
});

test('input permutations, translations and duplicate insertion preserve geometric hulls', () => {
  const base = [[-3, -2], [2, -2], [4, 1], [1, 4], [-4, 2], [0, 0], [0, -2]];
  const expected = coordinates(checkGeometry(base));
  for (let offset = 0; offset < base.length; offset++) {
    const rotated = [...base.slice(offset), ...base.slice(0, offset)].reverse();
    assert.deepEqual(coordinates(checkGeometry(rotated)), expected);
    assert.deepEqual(coordinates(checkGeometry([...rotated, rotated[2], rotated[0]])), expected);
    const translated = rotated.map(([x, y]) => [x + 10, y - 10]);
    assert.deepEqual(coordinates(checkGeometry(translated)), expected.map(([x, y]) => [x + 10, y - 10]));
  }
});

test('bounded admission refuses malformed, fractional, nonfinite and sparse coordinates', () => {
  for (const value of [null, {}, '', Array(17).fill([0, 0]), [[21, 0]], [[0, -21]], [[0.5, 0]],
    [[Infinity, 0]], [[NaN, 0]], [['1', 0]], [[true, 0]], [[0]], [[0, 0, 0]], [null], Array(1), [Array(2)]]) {
    assert.throws(() => analyzeHull(value));
  }
  for (const value of ['', '{}', 'null', '[[1e309,0]]', '[[0,0],]', '[[1.2,0]]']) assert.throws(() => parseHullPoints(value));
  assert.deepEqual(parseHullPoints('[]'), []);
  assert.deepEqual(parseHullPoints('[[-0,0]]'), [[0, 0]]);
  assert.deepEqual(parseHullPoints('[]' + ' '.repeat(4094)), []);
  assert.throws(() => parseHullPoints('[]' + ' '.repeat(4095)));
  assert.throws(() => parseHullPoints('日'.repeat(1400)));
});

test('inputs and every trace snapshot remain independent', () => {
  const points = Object.freeze([Object.freeze([0, 0]), Object.freeze([3, 0]), Object.freeze([0, 2]), Object.freeze([1, 0])]);
  const before = JSON.stringify(points);
  const result = analyzeHull(points);
  const fresh = analyzeHull(points);
  result.inputs[0].x = 19;
  result.unique[0].inputIds.push('invented');
  result.steps[0].after.push('invented');
  result.hull.push('invented');
  assert.equal(JSON.stringify(points), before);
  assert.deepEqual(analyzeHull(points), fresh);
  assert.deepEqual(result.steps[1].before, fresh.steps[1].before);
  assert.deepEqual(result.steps.at(-1).after, fresh.hull);
});

test('complete record export retains all steps and keeps the inspection cursor separate', () => {
  const points = [[0, 0], [4, 0], [1, 3], [1, 1], [4, 0]];
  const result = analyzeHull(points);
  const record = JSON.parse(serializeHullRecord(points, 2));
  const { selectedStep, ...complete } = record;
  assert.equal(selectedStep, 2);
  assert.deepEqual(complete, result);
  assert.equal(record.steps.length, result.steps.length);
  assert.equal(record.inputs.length, 5);
  for (const step of [-1, result.steps.length, 0.5, '0', null]) assert.throws(() => serializeHullRecord(points, step));
});
