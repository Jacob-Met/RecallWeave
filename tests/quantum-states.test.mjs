import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {BASIS_ORDER, MAX_GATES, simulateCircuit} from '../courses/quantum-states-core.mjs';
import {parseDeck} from '../src/deck.mjs';

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) <= 1e-12, actual + ' != ' + expected);
const vector = (actual, expected) => actual.forEach((pair, i) => pair.forEach((x, j) => near(x, expected[i][j])));
const final = input => simulateCircuit(input).steps.at(-1);
const gate = (name, target) => ({gate: name, target});
const read = name => readFile(new URL('../' + name, import.meta.url), 'utf8');

test('basis convention, all initial states and the zero-gate trace are explicit', () => {
  assert.deepEqual(BASIS_ORDER, ['00', '01', '10', '11']);
  assert.equal(MAX_GATES, 24);
  for (const [position, initial] of BASIS_ORDER.entries()) {
    const result = simulateCircuit({initial, gates: []});
    assert.equal(result.steps.length, 1); assert.equal(result.steps[0].index, 0);
    assert.equal(result.steps[0].gate, null);
    assert.deepEqual(result.basis_order, BASIS_ORDER);
    vector(result.steps[0].amplitudes, BASIS_ORDER.map((_, i) => [i === position ? 1 : 0, 0]));
  }
});

test('both CNOT directions satisfy their complete basis truth tables', () => {
  for (const [control, target, outputs] of [[0, 1, ['00', '01', '11', '10']], [1, 0, ['00', '11', '10', '01']]]) {
    for (const [i, initial] of BASIS_ORDER.entries()) {
      const result = final({initial, gates: [{gate: 'CNOT', control, target}]});
      vector(result.amplitudes, BASIS_ORDER.map(label => [label === outputs[i] ? 1 : 0, 0]));
    }
  }
});

test('the Bell and product examples have equal marginals and different joint probabilities', () => {
  const bell = final({initial: '00', gates: [gate('H', 0), {gate: 'CNOT', control: 0, target: 1}]});
  const product = final({initial: '00', gates: [gate('H', 0), gate('H', 1)]});
  bell.probabilities.forEach((p, i) => near(p, [0.5, 0, 0, 0.5][i]));
  product.probabilities.forEach(p => near(p, 0.25));
  for (const q of ['q0', 'q1']) for (let i = 0; i < 2; i++) {
    near(bell.marginals[q][i], 0.5); near(product.marginals[q][i], 0.5);
  }
});

test('S carries complex phase through a later H without renormalization', () => {
  const result = final({initial: '00', gates: [gate('H', 1), gate('S', 1), gate('H', 1)]});
  vector(result.amplitudes, [[0.5, 0.5], [0.5, -0.5], [0, 0], [0, 0]]);
  near(result.norm_squared, 1);
});

test('H, X, Z involutions and S fourth powers preserve all four basis inputs', () => {
  for (const initial of BASIS_ORDER) for (const target of [0, 1]) for (const [name, repeats] of [['H', 2], ['X', 2], ['Z', 2], ['S', 4]]) {
    const result = final({initial, gates: Array.from({length: repeats}, () => gate(name, target))});
    vector(result.amplitudes, BASIS_ORDER.map(label => [label === initial ? 1 : 0, 0]));
  }
});

test('relative phase changes later probabilities while a global sign does not', () => {
  const positive = final({initial: '00', gates: [gate('H', 0), gate('H', 0)]});
  const relative = final({initial: '00', gates: [gate('H', 0), gate('Z', 0), gate('H', 0)]});
  near(positive.probabilities[0], 1); near(relative.probabilities[2], 1);
  const negative = final({initial: '00', gates: [gate('X', 0), gate('Z', 0), gate('X', 0)]});
  near(negative.amplitudes[0][0], -1);
  near(negative.probabilities[0], 1);
});

test('the full 24-gate boundary retains all indices, operations and repeated endpoint states', () => {
  const input = {initial: '01', gates: Array.from({length: 24}, () => gate('H', 1))};
  const result = simulateCircuit(input);
  assert.equal(result.steps.length, 25); assert.deepEqual(result.gates, input.gates);
  for (const [i, row] of result.steps.entries()) {
    assert.equal(row.index, i); assert.deepEqual(row.gate, i === 0 ? null : input.gates[i - 1]);
    near(row.norm_squared, 1);
    near(row.probabilities.reduce((a, b) => a + b, 0), 1);
    near(row.marginals.q0[0], row.probabilities[0] + row.probabilities[1]);
    near(row.marginals.q1[0], row.probabilities[0] + row.probabilities[2]);
  }
  vector(result.steps[24].amplitudes, result.steps[0].amplitudes);
});

test('valid input and nested gates remain unchanged, and result rows do not alias', () => {
  const input = {initial: '11', gates: [gate('S', 0), gate('H', 1)]};
  const saved = JSON.stringify(input);
  const result = simulateCircuit(input);
  assert.equal(JSON.stringify(input), saved);
  result.gates[0].target = 1; result.steps[0].amplitudes[0][0] = 42;
  result.steps[1].gate.target = 1;
  assert.equal(JSON.stringify(input), saved);
  assert.notEqual(result.steps[1].amplitudes[0][0], 42);
  assert.equal(result.steps[2].gate.target, 1);
});

test('root and initial-state shape refusals are explicit', () => {
  for (const input of [null, 2, [], {}, {initial: '00'}, {gates: []}, {initial: '00', gates: [], extra: 1}, {initial: 0, gates: []}, {initial: '000', gates: []}, {initial: ' 00', gates: []}]) {
    assert.throws(() => simulateCircuit(input));
  }
});

test('gate arrays are bounded and sparse or malformed entries cannot disappear', () => {
  for (const gates of [null, {}, 'H', new Array(1), [null], [1], [[]], Array.from({length: 25}, () => gate('X', 0))]) {
    assert.throws(() => simulateCircuit({initial: '00', gates}));
  }
});

test('all forbidden operation shapes and qubit types refuse', () => {
  const bad = [{}, {gate: 'H'}, {gate: 'h', target: 0}, {gate: 'T', target: 0},
    {gate: 'H', target: 0, control: 1}, {gate: 'CNOT', target: 0},
    {gate: 'CNOT', control: 0, target: 0}, {gate: 'X', target: 0, extra: true}];
  for (const value of [true, false, '0', -1, 2, 0.5, null, NaN, Infinity]) {
    bad.push({gate: 'H', target: value}, {gate: 'CNOT', control: value, target: 1});
  }
  for (const operation of bad) assert.throws(() => simulateCircuit({initial: '00', gates: [operation]}));
});

test('the original unchanged decoder admits all twelve course items and their prerequisite graph', async () => {
  const raw = await read('courses/quantum-states.json');
  const decoded = parseDeck(raw);
  assert.equal(decoded.items.length, 12); assert.equal(decoded.concepts.length, 4);
  assert.equal(new Set(decoded.items.map(item => item.id)).size, 12);
  for (const concept of decoded.concepts) assert.equal(decoded.items.filter(item => item.concept === concept).length, 3);
  assert.ok(Buffer.byteLength(raw) < 262144);
});

test('bundled downloads retain exact original UTF-8 course and guide bytes', async () => {
  const html = await read('courses/quantum-states-lab.html');
  const match = html.match(/<script id="original-files" type="application\/json">([^<]+)<\/script>/);
  assert.ok(match);
  const data = JSON.parse(match[1]);
  assert.equal(Buffer.from(data.course, 'base64').toString('utf8'), await read('courses/quantum-states.json'));
  assert.equal(Buffer.from(data.guide, 'base64').toString('utf8'), await read('courses/quantum-states.md'));
  assert.ok(html.includes("connect-src 'none'"));
  assert.ok(!/<script[^>]+src=|<link[^>]+href=/i.test(html));
});

test('standalone builder check is deterministic and performs no source rewrite', async () => {
  const before = await read('courses/quantum-states-lab.html');
  const builder = fileURLToPath(new URL('../tools/build_quantum_states_lab.py', import.meta.url));
  const output = execFileSync('python3', [builder, '--check'], {encoding: 'utf8', timeout: 10000});
  assert.match(output, /matches all five owned inputs/);
  assert.equal(await read('courses/quantum-states-lab.html'), before);
});
