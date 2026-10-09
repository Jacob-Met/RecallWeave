/** Exact finite epsilon-NFA state-set semantics. No sampling, providers or persistence. */
export const MACHINE_FORMAT = 'recallweave-epsilon-nfa/1';
export const MAX_STATES = 5;
export const MAX_WORD = 24;
const SYMBOLS = Object.freeze(['0', '1']);
const freeze = value => Object.freeze(value);

function object(value, name, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    throw new Error(name + ' must be a plain object.');
  }
  const got = Object.keys(value).sort();
  if (got.length !== keys.length || got.some((key, i) => key !== [...keys].sort()[i])) {
    throw new Error(name + ' must contain exactly: ' + keys.join(', ') + '.');
  }
  return value;
}

function state(value, count, name) {
  if (!Number.isInteger(value) || value < 0 || value >= count) {
    throw new Error(name + ' must be an integer from 0 to ' + (count - 1) + '.');
  }
  return value;
}

function stateSet(values, count, name) {
  if (!Array.isArray(values) || values.length > count) {
    throw new Error(name + ' must be an array of at most ' + count + ' state indices.');
  }
  const result = values.map((value, i) => state(value, count, name + '[' + i + ']'));
  if (new Set(result).size !== result.length) throw new Error(name + ' contains a duplicate state.');
  return freeze(result.sort((a, b) => a - b));
}

export function admitMachine(input) {
  object(input, 'Machine', ['format', 'states', 'start', 'accepting', 'transitions']);
  if (input.format !== MACHINE_FORMAT) throw new Error('Use format ' + MACHINE_FORMAT + '.');
  if (!Number.isInteger(input.states) || input.states < 1 || input.states > MAX_STATES) {
    throw new Error('State count must be an integer from 1 to ' + MAX_STATES + '.');
  }
  const count = input.states;
  if (!Array.isArray(input.transitions) || input.transitions.length !== count) {
    throw new Error('Provide exactly one transition row per state.');
  }
  const transitions = input.transitions.map((row, i) => {
    object(row, 'Transition row ' + i, ['zero', 'one', 'epsilon']);
    return freeze({
      zero: stateSet(row.zero, count, 'q' + i + ' on 0'),
      one: stateSet(row.one, count, 'q' + i + ' on 1'),
      epsilon: stateSet(row.epsilon, count, 'q' + i + ' on epsilon')
    });
  });
  return freeze({
    format: MACHINE_FORMAT,
    states: count,
    start: state(input.start, count, 'Start state'),
    accepting: stateSet(input.accepting, count, 'Accepting states'),
    transitions: freeze(transitions)
  });
}

function close(machine, seeds) {
  const reached = new Set(seeds);
  const pending = [...seeds];
  for (let i = 0; i < pending.length; i += 1) {
    for (const next of machine.transitions[pending[i]].epsilon) {
      if (!reached.has(next)) {
        reached.add(next);
        pending.push(next);
      }
    }
  }
  return freeze([...reached].sort((a, b) => a - b));
}

export function epsilonClosure(input, seeds) {
  const machine = admitMachine(input);
  return close(machine, stateSet(seeds, machine.states, 'Closure seeds'));
}

function move(machine, active, symbol) {
  const field = symbol === '0' ? 'zero' : 'one';
  return freeze([...new Set(active.flatMap(index => machine.transitions[index][field]))]
    .sort((a, b) => a - b));
}

function accepts(machine, members) {
  return members.some(index => machine.accepting.includes(index));
}

function wordText(word) {
  if (typeof word !== 'string' || word.length > MAX_WORD || /[^01]/.test(word)) {
    throw new Error('Enter only 0 and 1, with at most ' + MAX_WORD
      + ' symbols. Leave the word blank for epsilon; do not type spaces or the epsilon glyph.');
  }
  return word;
}

function traceAdmitted(machine, word) {
  let active = close(machine, [machine.start]);
  const steps = [freeze({
    index: 0, prefix: '', symbol: null, moved: freeze([machine.start]),
    active, accepting: accepts(machine, active)
  })];
  for (let i = 0; i < word.length; i += 1) {
    const moved = move(machine, active, word[i]);
    active = close(machine, moved);
    steps.push(freeze({
      index: i + 1, prefix: word.slice(0, i + 1), symbol: word[i],
      moved, active, accepting: accepts(machine, active)
    }));
  }
  return freeze({ word, steps: freeze(steps), accepted: accepts(machine, active) });
}

export function trace(input, word) {
  return traceAdmitted(admitMachine(input), wordText(word));
}

function subsetKey(members) {
  return members.reduce((mask, index) => mask | (1 << index), 0);
}

function construct(machine) {
  const initial = close(machine, [machine.start]);
  const queue = [{ id: 'D0', members: initial, witness: '' }];
  const ids = new Map([[subsetKey(initial), 'D0']]);
  const states = [];
  for (let i = 0; i < queue.length; i += 1) {
    const item = queue[i];
    const nextIds = {};
    for (const symbol of SYMBOLS) {
      const members = close(machine, move(machine, item.members, symbol));
      const key = subsetKey(members);
      if (!ids.has(key)) {
        const id = 'D' + queue.length;
        ids.set(key, id);
        queue.push({ id, members, witness: item.witness + symbol });
      }
      nextIds[symbol === '0' ? 'zero' : 'one'] = ids.get(key);
    }
    states.push(freeze({
      id: item.id, members: item.members, accepting: accepts(machine, item.members),
      zero: nextIds.zero, one: nextIds.one, witness: item.witness
    }));
  }
  if (states.length > 2 ** machine.states) throw new Error('Internal subset bound violated.');
  return freeze({
    format: 'recallweave-subset-dfa/1', alphabet: SYMBOLS, sourceStateCount: machine.states,
    start: 'D0', states: freeze(states)
  });
}

export function determinize(input) {
  return construct(admitMachine(input));
}

export function analyze(input, word) {
  const machine = admitMachine(input);
  wordText(word);
  const nfa = traceAdmitted(machine, word);
  const dfa = construct(machine);
  const byId = new Map(dfa.states.map(row => [row.id, row]));
  const path = [dfa.start];
  for (const symbol of word) {
    path.push(byId.get(path.at(-1))[symbol === '0' ? 'zero' : 'one']);
  }
  if (byId.get(path.at(-1)).accepting !== nfa.accepted) {
    throw new Error('Internal NFA/DFA acceptance mismatch.');
  }
  return freeze({
    format: 'recallweave-nfa-analysis/1', machine, word, nfa, dfa,
    dfaPath: freeze(path), accepted: nfa.accepted
  });
}

export const PRESETS = freeze([
  freeze({
    id: 'ending-10', title: 'Guess the final 10', word: '1010',
    machine: admitMachine({
      format: MACHINE_FORMAT, states: 3, start: 0, accepting: [2],
      transitions: [
        { zero: [0], one: [0, 1], epsilon: [] },
        { zero: [2], one: [], epsilon: [] },
        { zero: [], one: [], epsilon: [] }
      ]
    })
  }),
  freeze({
    id: 'empty-or-01', title: 'Empty word or exactly 01', word: '',
    machine: admitMachine({
      format: MACHINE_FORMAT, states: 4, start: 0, accepting: [3],
      transitions: [
        { zero: [], one: [], epsilon: [1, 3] },
        { zero: [2], one: [], epsilon: [] },
        { zero: [], one: [3], epsilon: [] },
        { zero: [], one: [], epsilon: [] }
      ]
    })
  }),
  freeze({
    id: 'epsilon-cycle', title: 'An epsilon cycle before 01', word: '01',
    machine: admitMachine({
      format: MACHINE_FORMAT, states: 5, start: 0, accepting: [4],
      transitions: [
        { zero: [], one: [], epsilon: [1] },
        { zero: [2], one: [], epsilon: [0] },
        { zero: [], one: [], epsilon: [3] },
        { zero: [], one: [4], epsilon: [] },
        { zero: [], one: [], epsilon: [] }
      ]
    })
  })
]);
