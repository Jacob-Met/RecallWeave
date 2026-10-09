import test from 'node:test';
import assert from 'node:assert/strict';
import { admitMachine, epsilonClosure, trace, determinize, analyze, PRESETS, MACHINE_FORMAT } from '../src/nondeterministic-automata.mjs';

const make = (rows, accepting = [], start = 0) => ({
  format: MACHINE_FORMAT, states: rows.length, start, accepting,
  transitions: rows.map(([zero, one, epsilon]) => ({ zero, one, epsilon }))
});
const words = maximum => {
  const result = [''];
  for (let length = 1; length <= maximum; length += 1) {
    for (let value = 0; value < 2 ** length; value += 1) result.push(value.toString(2).padStart(length, '0'));
  }
  return result;
};
// A separate configuration-graph oracle. Epsilon edges retain the input offset;
// symbol edges advance it. This never invokes the production closure/trace code.
function configurations(machine, word) {
  const todo = [[machine.start, 0]];
  const seen = new Set();
  const ends = new Set();
  for (let cursor = 0; cursor < todo.length; cursor += 1) {
    const [state, offset] = todo[cursor];
    const key = state + ':' + offset;
    if (seen.has(key)) continue;
    seen.add(key);
    if (offset === word.length) ends.add(state);
    for (const next of machine.transitions[state].epsilon) todo.push([next, offset]);
    if (offset < word.length) {
      const field = word[offset] === '0' ? 'zero' : 'one';
      for (const next of machine.transitions[state][field]) todo.push([next, offset + 1]);
    }
  }
  return [...ends].sort((a, b) => a - b);
}

test('closure retains seeds, follows cycles and distinguishes the empty set', () => {
  const machine = make([[[], [], [1]], [[], [], [0, 2]], [[], [], []]], [2]);
  assert.deepEqual(epsilonClosure(machine, [0]), [0, 1, 2]);
  assert.deepEqual(epsilonClosure(machine, [2]), [2]);
  assert.deepEqual(epsilonClosure(machine, []), []);
  assert.equal(trace(machine, '').accepted, true);
  assert.equal(trace(machine, '0').accepted, false);
});

test('symbol destinations are closed after consumption without deleting origins', () => {
  const machine = make([[[1], [], []], [[], [], [2]], [[], [], []]], [2]);
  const result = analyze(machine, '0');
  assert.deepEqual(result.nfa.steps.map(row => row.active), [[0], [1, 2]]);
  assert.deepEqual(result.nfa.steps[1].moved, [1]);
  assert.equal(result.accepted, true);
  assert.equal(trace(machine, '').accepted, false);
  assert.equal(result.dfa.states.find(row => row.id === result.dfaPath[1]).accepting, true);
});

test('empty subset is a complete rejecting sink only when reachable', () => {
  const empty = determinize(make([[[], [], []]], [0]));
  assert.deepEqual(empty.states.map(row => row.members), [[0], []]);
  assert.deepEqual(empty.states[1], { id: 'D1', members: [], accepting: false, zero: 'D1', one: 'D1', witness: '0' });
  const closed = determinize(make([[[0], [0], []]], [0]));
  assert.equal(closed.states.length, 1);
  assert.equal(closed.states[0].zero, 'D0');
});

test('BFS0-before1 ordering and witnesses remain canonical across input ordering', () => {
  const input = make([[[2, 1], [2], []], [[], [], []], [[], [], []]], [2, 1]);
  const before = JSON.stringify(input);
  const result = determinize(input);
  assert.deepEqual(result.states.map(row => [row.id, row.members, row.witness]), [
    ['D0', [0], ''], ['D1', [1, 2], '0'], ['D2', [2], '1'], ['D3', [], '00']
  ]);
  for (const row of result.states) assert.deepEqual(configurations(input, row.witness), row.members);
  assert.equal(JSON.stringify(input), before);
  assert.deepEqual(admitMachine(input).accepting, [1, 2]);
});

test('named examples agree with independently specified whole-word languages', () => {
  const predicates = [word => word.endsWith('10'), word => word === '' || word === '01', word => word === '01'];
  PRESETS.forEach((preset, index) => {
    for (const word of words(6)) {
      const result = analyze(preset.machine, word);
      assert.equal(result.accepted, predicates[index](word), preset.id + ':' + word);
      for (const step of result.nfa.steps) {
        assert.deepEqual(step.active, configurations(preset.machine, step.prefix));
        const row = result.dfa.states.find(value => value.id === result.dfaPath[step.index]);
        assert.deepEqual(row.members, step.active);
      }
    }
  });
});

test('every two-state transition table agrees with configuration reachability', () => {
  const sets = [[], [0], [1], [0, 1]];
  let cases = 0;
  for (let code = 0; code < 4 ** 6; code += 1) {
    let value = code;
    const rows = Array.from({ length: 2 }, () => Array.from({ length: 3 }, () => {
      const choice = sets[value % 4]; value = Math.floor(value / 4); return [...choice];
    }));
    const machine = make(rows, [1]);
    const dfa = determinize(machine);
    assert.ok(dfa.states.length <= 4);
    for (const row of dfa.states) assert.deepEqual(row.members, configurations(machine, row.witness));
    for (const word of words(3)) {
      const expected = configurations(machine, word);
      const result = trace(machine, word);
      assert.deepEqual(result.steps.at(-1).active, expected, code + ':' + word);
      assert.equal(result.accepted, expected.includes(1));
      let state = dfa.states[0];
      for (const symbol of word) state = dfa.states.find(row => row.id === state[symbol === '0' ? 'zero' : 'one']);
      assert.deepEqual(state.members, expected);
      cases += 1;
    }
  }
  assert.equal(cases, 61440);
});

test('public admission refuses malformed or ambiguous inputs and preserves callers', () => {
  const base = make([[[0], [0], []]], [0]);
  for (const patch of [
    { states: 0 }, { states: 6 }, { states: 1.5 }, { start: 1 }, { start: '0' },
    { accepting: [0, 0] }, { accepting: [-1] }, { transitions: [] },
    { transitions: [{ zero: [1], one: [], epsilon: [] }] },
    { transitions: [{ zero: [], one: [], epsilon: [], extra: [] }] },
    { format: 'unknown' }, { extra: true }
  ]) assert.throws(() => admitMachine({ ...base, ...patch }));
  for (const input of [null, [], 'machine']) assert.throws(() => admitMachine(input));
  for (const word of ['ε', ' ', '10\n', '02', '0'.repeat(25), 1, null]) assert.throws(() => trace(base, word));
  assert.throws(() => epsilonClosure(base, [0, 0]));
  assert.throws(() => epsilonClosure(base, [1]));
  assert.equal(trace(base, '0'.repeat(24)).accepted, true);
  const before = JSON.stringify(base);
  const admitted = admitMachine(base);
  assert.throws(() => admitted.transitions[0].zero.push(0), TypeError);
  assert.equal(JSON.stringify(base), before);
});

test('reachable construction is not advertised as minimal', () => {
  const machine = make([[[1], [1], []], [[1], [1], []]], [0, 1]);
  const result = determinize(machine);
  assert.equal(result.states.length, 2);
  for (const word of words(5)) assert.equal(trace(machine, word).accepted, true);
});
