import test from 'node:test';
import assert from 'node:assert/strict';
import {ALPHABET, MAX_STATES, MAX_WORD_LENGTH, PRESETS, getPreset, validateMachine, validateWord, traceWord, compareMachines} from '../src/finite-automata.mjs';

const copy = value => structuredClone(value);
const words = length => {
  const result = [''];
  for (let n = 1; n <= length; n++) {
    for (let bits = 0; bits < 2 ** n; bits++) result.push(bits.toString(2).padStart(n, '0'));
  }
  return result;
};
// Independent execution oracle: reduce the transition table, without the trace API.
const accepts = (machine, word) => machine.accepting[Array.from(word).reduce(
  (state, symbol) => machine.transitions[state][symbol === '1' ? 1 : 0], machine.initial)];
// Backward fixed-point distinguishability, independent of the product BFS queue.
// Distances propagate from every disagreeing pair until no shortest distance improves.
function distinguishabilityDistance(a, b) {
  const n = a.transitions.length, m = b.transitions.length;
  const distance = Array.from({length: n}, (_, x) => Array.from({length: m}, (_, y) =>
    a.accepting[x] !== b.accepting[y] ? 0 : Infinity));
  let changed = true;
  while (changed) {
    changed = false;
    for (let x = 0; x < n; x++) for (let y = 0; y < m; y++) {
      const next = Math.min(distance[x][y],
        1 + distance[a.transitions[x][0]][b.transitions[y][0]],
        1 + distance[a.transitions[x][1]][b.transitions[y][1]]);
      if (next < distance[x][y]) {distance[x][y] = next; changed = true;}
    }
  }
  return distance[a.initial][b.initial];
}

test('contract is a bounded, complete binary machine and a literal binary word', () => {
  assert.deepEqual(ALPHABET, ['0', '1']);
  assert.equal(MAX_STATES, 6);
  assert.equal(MAX_WORD_LENGTH, 64);
  const good = copy(PRESETS[0].machine);
  for (const invalid of [null, [], {}, {...good, name: ''}, {...good, name: ' '},
    {...good, name: 'a'.repeat(81)}, {...good, initial: -1}, {...good, initial: 2},
    {...good, initial: 0.5}, {...good, transitions: []},
    {...good, transitions: Array.from({length: 7}, () => [0, 0]), accepting: Array(7).fill(false)},
    {...good, accepting: [true]}, {...good, accepting: [true, 1]},
    {...good, accepting: new Array(2)}, {...good, transitions: new Array(2)},
    {...good, transitions: [[0], [1, 0]]}, {...good, transitions: [[0, 2], [1, 0]]},
    {...good, transitions: [[0, 1, 0], [1, 0]]}, {...good, transitions: [[0, NaN], [1, 0]]}
  ]) assert.throws(() => validateMachine(invalid));
  for (const invalid of [null, 0, 'ε', ' 01', '01 ', '0\n1', '2', '𝟙', '0'.repeat(65)]) {
    assert.throws(() => validateWord(invalid));
    assert.throws(() => traceWord(good, invalid));
  }
  assert.equal(validateWord(''), '');
  assert.equal(traceWord(good, '0'.repeat(64)).steps.length, 64);
  assert.throws(() => getPreset('missing'));
});

test('empty word takes no edge; acceptance belongs to the final state', () => {
  const even = getPreset('even-ones').machine;
  const empty = traceWord(even, '');
  assert.equal(empty.accepted, true);
  assert.deepEqual(empty.states, [0]);
  assert.deepEqual(empty.steps, []);
  assert.equal(traceWord(even, '1').accepted, false);
  assert.equal(traceWord(even, '11').accepted, true);
  const prefix = traceWord(getPreset('ends-01').machine, '010');
  assert.deepEqual(prefix.states, [0, 1, 2, 1]);
  assert.equal(prefix.steps[1].accepting, true);
  assert.equal(prefix.accepted, false);
});

test('every preset agrees with an independent language predicate for all 511 words through length eight', () => {
  const predicates = {
    'even-ones': word => Array.from(word).filter(x => x === '1').length % 2 === 0,
    'ends-01': word => word.endsWith('01'),
    'no-11': word => !word.includes('11'),
    'all-words': () => true
  };
  for (const preset of PRESETS) for (const word of words(8)) {
    const run = traceWord(preset.machine, word);
    assert.equal(run.accepted, predicates[preset.id](word), preset.id + ':' + word);
    assert.equal(run.states.length, word.length + 1);
    assert.equal(run.steps.length, word.length);
    assert.equal(run.finalState, run.states.at(-1));
  }
});

test('a comparison checks ε before edges and returns a shortest stable nonempty witness', () => {
  const even = getPreset('even-ones').machine;
  const suffix = getPreset('ends-01').machine;
  const all = getPreset('all-words').machine;
  const empty = compareMachines(even, suffix);
  assert.equal(empty.witness, '');
  assert.equal(empty.equivalent, false);
  assert.equal(empty.pairs.length, 1);
  assert.equal(empty.witnessTraces.left.accepted, true);
  assert.equal(empty.witnessTraces.right.accepted, false);
  assert.equal(compareMachines(even, all).witness, '1');
  const none = {name: 'Nothing', initial: 0, accepting: [false], transitions: [[0, 0]]};
  const lengthOne = {name: 'Nonempty words', initial: 0, accepting: [false, true], transitions: [[1, 1], [1, 1]]};
  assert.equal(compareMachines(none, lengthOne).witness, '0', '0 wins a same-length tie with 1');
});

test('renaming, unreachable states, and redundant memory do not imply different languages', () => {
  const even = getPreset('even-ones').machine;
  const renamed = {name: 'Swapped parity names', initial: 1, accepting: [false, true], transitions: [[0, 1], [1, 0]]};
  const extra = {name: 'Parity with unreachable state', initial: 0, accepting: [true, false, true], transitions: [[0, 1], [1, 0], [2, 2]]};
  for (const other of [renamed, extra]) {
    const result = compareMachines(even, other);
    assert.equal(result.equivalent, true);
    assert.equal(result.witness, null);
    assert.equal(result.witnessTraces, null);
  }
  const a = {name: 'Reject all', initial: 0, accepting: [false], transitions: [[0, 0]]};
  const b = {name: 'Extra rejecting memory', initial: 1, accepting: [false, false], transitions: [[1, 0], [0, 1]]};
  assert.equal(compareMachines(a, b).equivalent, true);
  assert.notEqual(traceWord(a, '').accepted, true, 'empty language is not {ε}');
});

test('all 36 product pairs can be reachable and are exhausted exactly once', () => {
  const left = {name: 'Counts 0 modulo 6', initial: 0, accepting: Array(6).fill(true),
    transitions: Array.from({length: 6}, (_, i) => [(i + 1) % 6, i])};
  const right = {name: 'Counts 1 modulo 6', initial: 0, accepting: Array(6).fill(true),
    transitions: Array.from({length: 6}, (_, i) => [i, (i + 1) % 6])};
  const result = compareMachines(left, right);
  assert.equal(result.equivalent, true);
  assert.equal(result.maxPairs, 36);
  assert.equal(result.pairs.length, 36);
  assert.equal(result.discoveredPairs, 36);
  assert.equal(new Set(result.pairs.map(p => p.left + ',' + p.right)).size, 36);
});

test('every pair of the 128 complete two-state machines agrees with backward distinguishability and the shortest-word oracle', () => {
  const machines = [];
  for (let table = 0; table < 16; table++) for (let flags = 0; flags < 4; flags++) for (let initial = 0; initial < 2; initial++) {
    machines.push({name: 'Exhaustive machine', initial, accepting: [Boolean(flags & 1), Boolean(flags & 2)],
      transitions: [[table & 1, (table >> 1) & 1], [(table >> 2) & 1, (table >> 3) & 1]]});
  }
  const candidates = words(3);
  let comparisons = 0;
  for (const left of machines) for (const right of machines) {
    const distance = distinguishabilityDistance(left, right);
    const result = compareMachines(left, right);
    assert.equal(result.equivalent, distance === Infinity);
    assert.ok(result.discoveredPairs <= 4);
    if (distance !== Infinity) {
      const expected = candidates.find(word => accepts(left, word) !== accepts(right, word));
      assert.equal(result.witness, expected);
      assert.equal(result.witness.length, distance);
      assert.notEqual(accepts(left, result.witness), accepts(right, result.witness));
    }
    comparisons++;
  }
  assert.equal(comparisons, 16384);
});

test('larger deterministic machines agree with an independent fixed-point oracle', () => {
  let seed = 0x52e56e;
  const next = limit => {seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % limit;};
  const make = () => {
    const count = next(6) + 1;
    return {name: 'Seeded fixture', initial: next(count), accepting: Array.from({length: count}, () => next(2) === 1),
      transitions: Array.from({length: count}, () => [next(count), next(count)])};
  };
  for (let i = 0; i < 256; i++) {
    const left = make(), right = make();
    const result = compareMachines(left, right);
    const expected = distinguishabilityDistance(left, right);
    assert.equal(result.equivalent, expected === Infinity);
    assert.ok(result.discoveredPairs <= result.maxPairs);
    if (!result.equivalent) {
      assert.equal(result.witness.length, expected);
      assert.ok(result.witness.length < result.maxPairs);
      assert.notEqual(accepts(left, result.witness), accepts(right, result.witness));
    }
  }
});

test('admission and results preserve input values and return frozen independent snapshots', () => {
  const input = copy(getPreset('even-ones').machine);
  const before = copy(input);
  const admitted = validateMachine(input);
  const run = traceWord(input, '1011');
  const result = compareMachines(input, getPreset('all-words').machine);
  assert.deepEqual(input, before);
  input.transitions[0][0] = 1;
  input.accepting[0] = false;
  assert.equal(admitted.transitions[0][0], 0);
  assert.equal(run.machine.accepting[0], true);
  assert.equal(result.left.accepting[0], true);
  for (const value of [admitted, admitted.accepting, admitted.transitions, admitted.transitions[0],
    run, run.steps, run.steps[0], run.states, result, result.pairs, result.pairs[0], result.witnessTraces]) {
    assert.equal(Object.isFrozen(value), true);
  }
  assert.throws(() => {run.steps.push({});});
  const malformed = {...before, transitions: [[0], [1, 0]]};
  const badBefore = copy(malformed);
  assert.throws(() => compareMachines(malformed, before));
  assert.deepEqual(malformed, badBefore);
});
