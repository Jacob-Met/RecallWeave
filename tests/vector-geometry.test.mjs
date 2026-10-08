import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const deck = JSON.parse(readFileSync(new URL('../courses/vector-geometry.json', import.meta.url)));
const item = id => {
  const found = deck.items.find(question => question.id === id);
  assert.ok(found, `Missing course question ${id}`);
  return found;
};
const close = (a, b) => Math.abs(a - b) <= 1e-12;
const equalVector = (a, b) => a.length === b.length && a.every((n, i) => close(n, b[i]));
const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);
const add = (a, b) => a.map((value, index) => value + b[index]);
const subtract = (a, b) => a.map((value, index) => value - b[index]);
const scale = (k, v) => v.map(value => k * value);
const multiply = (rows, vector) => rows.map(row => dot(row, vector));
function number(text) {
  assert.match(text, /^[+-]?\d+(?:\/\d+)?$/);
  const [numerator, denominator = '1'] = text.split('/');
  assert.notEqual(Number(denominator), 0);
  return Number(numerator) / Number(denominator);
}
function vector(text) {
  const match = /^\(([^,]+), ([^)]+)\)$/.exec(text);
  assert.ok(match, `Expected a two-component option: ${text}`);
  return [number(match[1]), number(match[2])];
}
function check(id, anchors, predicate) {
  const question = item(id);
  for (const anchor of anchors) assert.ok(question.prompt.includes(anchor), `${id}: changed mathematical premise ${anchor}`);
  const correct = question.options.flatMap((option, index) => predicate(option) ? [index] : []);
  assert.deepEqual(correct, [question.answer], `${id}: exactly one displayed option must satisfy the stated mathematics`);
}

test('course has twelve original items, two per concept, with a balanced canonical answer key', () => {
  assert.equal(deck.format, 'recallweave-deck/1');
  assert.equal(deck.items.length, 12);
  assert.equal(deck.concepts.length, 6);
  assert.equal(new Set(deck.items.map(question => question.id)).size, 12);
  for (const concept of deck.concepts) assert.equal(deck.items.filter(question => question.concept === concept).length, 2);
  const counts = [0, 0, 0, 0];
  for (const question of deck.items) {
    assert.equal(question.options.length, 4);
    assert.equal(new Set(question.options).size, 4);
    assert.ok(question.explanation.length > 200);
    assert.ok(question.transfer.length > 80);
    counts[question.answer]++;
  }
  assert.deepEqual(counts, [3, 3, 3, 3]);
  const alwaysLongest = deck.items.every(question => question.options[question.answer].length === Math.max(...question.options.map(option => option.length)));
  assert.equal(alwaysLongest, false);
});

test('displacement subtracts the starting point, including its negative component', () => {
  const expected = subtract([5, 1], [1, -2]);
  check('vg-move', ['P = (1, -2)', 'Q = (5, 1)', 'displacement Q - P'], option => equalVector(vector(option), expected));
  assert.deepEqual(subtract(add([5, 1], [10, 7]), add([1, -2], [10, 7])), expected);
});

test('sequential displacements combine componentwise and retain the same final point', () => {
  const expected = add([3, -1], [-2, 4]);
  check('vg-combine', ['u = (3, -1)', 'v = (-2, 4)', 'single displacement'], option => equalVector(vector(option), expected));
  assert.deepEqual(add(add([4, 2], [3, -1]), [-2, 4]), add([4, 2], expected));
});

test('Euclidean length is the square root of the sum of squared components', () => {
  const v = [-3, 4];
  check('vg-length', ['perpendicular x and y axes measured in the same units', 'v = (-3, 4)', 'Euclidean length'], option => close(number(option), Math.sqrt(dot(v, v))));
});

test('the unit direction has length one and preserves the original orientation', () => {
  const v = [-3, 4];
  check('vg-unit', ['v = (-3, 4)', 'length 5', 'length 1', 'same direction'], option => {
    const u = vector(option);
    return close(dot(u, u), 1) && close(v[0] * u[1] - v[1] * u[0], 0) && dot(v, u) > 0;
  });
});

test('the two nonzero perpendicular vectors have zero dot product', () => {
  check('vg-dot', ['u = (2, 1)', 'v = (-1, 2)', 'u_x v_x + u_y v_y'], option => close(number(option), dot([2, 1], [-1, 2])));
});

test('a unit-axis component retains the sign of the projected displacement', () => {
  check('vg-component', ['v = (4, -3)', 'd = (0, 1)', 'signed component'], option => close(number(option), dot([4, -3], [0, 1])));
  assert.equal(dot([4, -3], [0, -1]), 3);
});

test('the projection lies on the nonunit direction line and leaves an orthogonal residual', () => {
  const a = [2, 1], b = [3, 4];
  check('vg-project', ['line through the origin', 'a = (2, 1)', 'b = (3, 4)', 'orthogonal projection'], option => {
    const p = vector(option);
    return close(a[0] * p[1] - a[1] * p[0], 0) && close(dot(subtract(b, p), a), 0);
  });
  const project = direction => scale(dot(b, direction) / dot(direction, direction), direction);
  assert.deepEqual(project(a), project(scale(2, a)));
});

test('the requested residual reconstructs b as well as being perpendicular', () => {
  const b = [5, -1], p = [2, 2], direction = [1, 1];
  check('vg-residual', ['b = (5, -1)', 'line y = x', 'p = (2, 2)', 'residual b - p'], option => {
    const r = vector(option);
    return equalVector(add(p, r), b) && close(dot(r, direction), 0);
  });
});

test('row dot products implement the stated column-vector matrix convention', () => {
  const matrix = [[2, 1], [0, 3]], v = [1, -2];
  check('vg-matrix', ['first row (2, 1)', 'second row (0, 3)', 'column vector v = (1, -2)'], option => equalVector(vector(option), multiply(matrix, v)));
  assert.deepEqual(add(multiply(matrix, [1, 0]), scale(-2, multiply(matrix, [0, 1]))), multiply(matrix, v));
});

test('basis images retain the coefficients of the input linear combination', () => {
  const e1Image = [2, 1], e2Image = [-1, 3];
  check('vg-basis', ['e1 = (1, 0) to (2, 1)', 'e2 = (0, 1) to (-1, 3)', '(3, 2) = 3e1 + 2e2'], option => equalVector(vector(option), add(scale(3, e1Image), scale(2, e2Image))));
});

test('rotation before horizontal stretch differs from the reverse order', () => {
  const rotation = [[0, -1], [1, 0]], horizontal = [[2, 0], [0, 1]], v = [1, 2];
  const expected = multiply(horizontal, multiply(rotation, v));
  check('vg-order', ['(x, y) to (-y, x)', '(x, y) to (2x, y)', 'Starting at (1, 2)', 'first apply the quarter-turn, then the stretch'], option => equalVector(vector(option), expected));
  assert.notDeepEqual(expected, multiply(rotation, multiply(horizontal, v)));
  const uniform = [[2, 0], [0, 2]];
  assert.deepEqual(multiply(rotation, multiply(uniform, [2, 1])), multiply(uniform, multiply(rotation, [2, 1])));
});

test('the stated distinct inputs collide under the flattening map', () => {
  const flatten = v => [v[0], 0];
  check('vg-loss', ['(x, y) to (x, 0)', 'pair of distinct inputs', 'same output'], option => {
    const pair = option.split(' and ').map(vector);
    assert.equal(pair.length, 2);
    return !equalVector(pair[0], pair[1]) && equalVector(flatten(pair[0]), flatten(pair[1]));
  });
});
