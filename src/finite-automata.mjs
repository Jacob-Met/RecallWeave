/** Complete deterministic finite automata over the fixed alphabet {0, 1}.
 * A machine uses integer state indices; every transition must name an existing state.
 * No mutation, random sampling, epsilon transitions, or partial-machine completion.
 */
export const ALPHABET = Object.freeze(['0', '1']);
export const MAX_STATES = 6;
export const MAX_WORD_LENGTH = 64;

export function validateMachine(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Provide a machine object.');
  }
  if (typeof value.name !== 'string' || !value.name.trim() || value.name.length > 80) {
    throw new TypeError('Give the machine a name of 1–80 characters.');
  }
  if (!Array.isArray(value.transitions) || value.transitions.length < 1 || value.transitions.length > MAX_STATES) {
    throw new RangeError('A machine needs 1–6 states.');
  }
  const count = value.transitions.length;
  const state = index => Number.isInteger(index) && index >= 0 && index < count;
  if (!state(value.initial)) throw new RangeError('Choose an existing initial state.');
  if (!Array.isArray(value.accepting) || value.accepting.length !== count ||
      Array.from(value.accepting).some(flag => typeof flag !== 'boolean')) {
    throw new TypeError('Mark every state explicitly as accepting or nonaccepting.');
  }
  const transitions = Array.from(value.transitions, (row, index) => {
    if (!Array.isArray(row) || row.length !== 2 || !state(row[0]) || !state(row[1])) {
      throw new RangeError('State q' + index + ' needs one existing destination for 0 and one for 1.');
    }
    return Object.freeze([row[0], row[1]]);
  });
  return Object.freeze({
    name: value.name,
    initial: value.initial,
    accepting: Object.freeze(Array.from(value.accepting)),
    transitions: Object.freeze(transitions)
  });
}

export function validateWord(word) {
  if (typeof word !== 'string') throw new TypeError('The word must be text.');
  if (word.length > MAX_WORD_LENGTH) throw new RangeError('Trace at most 64 binary symbols.');
  if (!/^[01]*$/.test(word)) {
    throw new TypeError('Use only 0 and 1. Leave the field blank for the empty word; spaces and ε are not input symbols.');
  }
  return word;
}

export function traceWord(machine, word) {
  const admitted = validateMachine(machine);
  validateWord(word);
  let current = admitted.initial;
  const states = [current];
  const steps = [];
  for (let index = 0; index < word.length; index++) {
    const symbol = word[index];
    const next = admitted.transitions[current][Number(symbol)];
    steps.push(Object.freeze({
      position: index + 1, symbol, from: current, to: next,
      accepting: admitted.accepting[next]
    }));
    current = next;
    states.push(current);
  }
  return Object.freeze({
    machine: admitted, word, accepted: admitted.accepting[current],
    finalState: current, states: Object.freeze(states), steps: Object.freeze(steps)
  });
}

/** Breadth-first search in the product graph. Every edge consumes one symbol.
 * The first disagreeing pair yields a shortest word; 0-before-1 makes ties stable.
 * At most |left| * |right| pairs enter the queue. Exhaustion proves equivalence.
 */
export function compareMachines(left, right) {
  const a = validateMachine(left);
  const b = validateMachine(right);
  const queue = [{left: a.initial, right: b.initial, word: ''}];
  const seen = new Set([a.initial + ',' + b.initial]);
  const pairs = [];
  for (let head = 0; head < queue.length; head++) {
    const pair = queue[head];
    const leftAccepting = a.accepting[pair.left];
    const rightAccepting = b.accepting[pair.right];
    pairs.push(Object.freeze({...pair, leftAccepting, rightAccepting}));
    if (leftAccepting !== rightAccepting) {
      return Object.freeze({
        left: a, right: b, equivalent: false, witness: pair.word,
        witnessTraces: Object.freeze({left: traceWord(a, pair.word), right: traceWord(b, pair.word)}),
        pairs: Object.freeze(pairs), discoveredPairs: queue.length,
        maxPairs: a.transitions.length * b.transitions.length
      });
    }
    for (const symbol of ALPHABET) {
      const nextLeft = a.transitions[pair.left][Number(symbol)];
      const nextRight = b.transitions[pair.right][Number(symbol)];
      const key = nextLeft + ',' + nextRight;
      if (!seen.has(key)) {
        seen.add(key);
        queue.push({left: nextLeft, right: nextRight, word: pair.word + symbol});
      }
    }
  }
  return Object.freeze({
    left: a, right: b, equivalent: true, witness: null, witnessTraces: null,
    pairs: Object.freeze(pairs), discoveredPairs: queue.length,
    maxPairs: a.transitions.length * b.transitions.length
  });
}

export const PRESETS = Object.freeze([
  Object.freeze({
    id: 'even-ones', title: 'Even number of 1s',
    description: 'q0 remembers an even count of 1s; q1 remembers an odd count. A 0 leaves that memory unchanged.',
    machine: validateMachine({name: 'Even number of 1s', initial: 0, accepting: [true, false], transitions: [[0, 1], [1, 0]]})
  }),
  Object.freeze({
    id: 'ends-01', title: 'Ends with 01',
    description: 'q0 has no useful suffix; q1 ends in 0; q2 ends in 01. Only the suffix at the end of the whole word matters.',
    machine: validateMachine({name: 'Ends with 01', initial: 0, accepting: [false, false, true], transitions: [[1, 0], [1, 2], [1, 0]]})
  }),
  Object.freeze({
    id: 'no-11', title: 'Never contains 11',
    description: 'q0 has no trailing 1; q1 has one trailing 1; q2 records a violation that later symbols cannot undo.',
    machine: validateMachine({name: 'Never contains 11', initial: 0, accepting: [true, true, false], transitions: [[0, 1], [0, 2], [2, 2]]})
  }),
  Object.freeze({
    id: 'all-words', title: 'Every binary word',
    description: 'The single accepting state loops on both symbols. It also accepts the empty word.',
    machine: validateMachine({name: 'Every binary word', initial: 0, accepting: [true], transitions: [[0, 0]]})
  })
]);

export function getPreset(id) {
  const preset = PRESETS.find(entry => entry.id === id);
  if (!preset) throw new RangeError('Choose a listed machine preset.');
  return preset;
}
