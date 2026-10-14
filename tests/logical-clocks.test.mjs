/**
 * Native maintained controls for the fixed logical-clock explorer.
 *
 * Expected clocks, causal relations and legal frontiers were derived from the
 * original logical-clocks lesson before the model's first source publication.
 * The model is called normally when these tests are separately run. This file
 * contains no browser, VM, child-process, camera or network test route.
 *
 * History checks below inspect saved model snapshots and prefix comparisons.
 * They do not claim to click the explorer's Previous/Next/Reset controls.
 * Builder checks read the current sources and standalone page; they do not
 * write artifacts or execute the generated inline script.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CLOCK_GRAPH, createClockTrace, compareClockEvents, clockTotalOrder,
} from '../src/logical-clocks.mjs';
import {
  renderLogicalClocksExplorer, buildLogicalClocksExplorer, logicalClocksExplorerPath,
} from '../tools/build-logical-clocks.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Fixed original data, not values obtained from any model call.
const EXPECTED_GRAPH = {
  "processes": [
    "A",
    "B",
    "C"
  ],
  "events": [
    {
      "id": "A1",
      "process": "A",
      "kind": "local",
      "message": null
    },
    {
      "id": "A2",
      "process": "A",
      "kind": "send",
      "message": "mAB"
    },
    {
      "id": "A3",
      "process": "A",
      "kind": "local",
      "message": null
    },
    {
      "id": "A4",
      "process": "A",
      "kind": "receive",
      "message": "mCA"
    },
    {
      "id": "B1",
      "process": "B",
      "kind": "local",
      "message": null
    },
    {
      "id": "B2",
      "process": "B",
      "kind": "receive",
      "message": "mAB"
    },
    {
      "id": "B3",
      "process": "B",
      "kind": "send",
      "message": "mBC"
    },
    {
      "id": "C1",
      "process": "C",
      "kind": "local",
      "message": null
    },
    {
      "id": "C2",
      "process": "C",
      "kind": "receive",
      "message": "mBC"
    },
    {
      "id": "C3",
      "process": "C",
      "kind": "send",
      "message": "mCA"
    }
  ],
  "messages": [
    {
      "id": "mAB",
      "send": "A2",
      "receive": "B2"
    },
    {
      "id": "mBC",
      "send": "B3",
      "receive": "C2"
    },
    {
      "id": "mCA",
      "send": "C3",
      "receive": "A4"
    }
  ],
  "edges": [
    {
      "from": "A1",
      "to": "A2",
      "kind": "program",
      "message": null
    },
    {
      "from": "A2",
      "to": "A3",
      "kind": "program",
      "message": null
    },
    {
      "from": "A3",
      "to": "A4",
      "kind": "program",
      "message": null
    },
    {
      "from": "B1",
      "to": "B2",
      "kind": "program",
      "message": null
    },
    {
      "from": "B2",
      "to": "B3",
      "kind": "program",
      "message": null
    },
    {
      "from": "C1",
      "to": "C2",
      "kind": "program",
      "message": null
    },
    {
      "from": "C2",
      "to": "C3",
      "kind": "program",
      "message": null
    },
    {
      "from": "A2",
      "to": "B2",
      "kind": "message",
      "message": "mAB"
    },
    {
      "from": "B3",
      "to": "C2",
      "kind": "message",
      "message": "mBC"
    },
    {
      "from": "C3",
      "to": "A4",
      "kind": "message",
      "message": "mCA"
    }
  ]
};

const PROCESS_EVENTS = {"A":["A1","A2","A3","A4"],"B":["B1","B2","B3"],"C":["C1","C2","C3"]};

const STAMPS = {
  "A1": {
    "lamport": 1,
    "vector": [
      1,
      0,
      0
    ]
  },
  "A2": {
    "lamport": 2,
    "vector": [
      2,
      0,
      0
    ]
  },
  "A3": {
    "lamport": 3,
    "vector": [
      3,
      0,
      0
    ]
  },
  "A4": {
    "lamport": 7,
    "vector": [
      4,
      3,
      3
    ]
  },
  "B1": {
    "lamport": 1,
    "vector": [
      0,
      1,
      0
    ]
  },
  "B2": {
    "lamport": 3,
    "vector": [
      2,
      2,
      0
    ]
  },
  "B3": {
    "lamport": 4,
    "vector": [
      2,
      3,
      0
    ]
  },
  "C1": {
    "lamport": 1,
    "vector": [
      0,
      0,
      1
    ]
  },
  "C2": {
    "lamport": 5,
    "vector": [
      2,
      3,
      2
    ]
  },
  "C3": {
    "lamport": 6,
    "vector": [
      2,
      3,
      3
    ]
  }
};

const UPDATES = {
  "A1": {
    "event": {
      "id": "A1",
      "process": "A",
      "kind": "local",
      "message": null
    },
    "before": {
      "lamport": 0,
      "vector": [
        0,
        0,
        0
      ]
    },
    "incoming": null,
    "merged": {
      "lamport": 0,
      "vector": [
        0,
        0,
        0
      ]
    },
    "after": {
      "lamport": 1,
      "vector": [
        1,
        0,
        0
      ]
    }
  },
  "A2": {
    "event": {
      "id": "A2",
      "process": "A",
      "kind": "send",
      "message": "mAB"
    },
    "before": {
      "lamport": 1,
      "vector": [
        1,
        0,
        0
      ]
    },
    "incoming": null,
    "merged": {
      "lamport": 1,
      "vector": [
        1,
        0,
        0
      ]
    },
    "after": {
      "lamport": 2,
      "vector": [
        2,
        0,
        0
      ]
    }
  },
  "A3": {
    "event": {
      "id": "A3",
      "process": "A",
      "kind": "local",
      "message": null
    },
    "before": {
      "lamport": 2,
      "vector": [
        2,
        0,
        0
      ]
    },
    "incoming": null,
    "merged": {
      "lamport": 2,
      "vector": [
        2,
        0,
        0
      ]
    },
    "after": {
      "lamport": 3,
      "vector": [
        3,
        0,
        0
      ]
    }
  },
  "A4": {
    "event": {
      "id": "A4",
      "process": "A",
      "kind": "receive",
      "message": "mCA"
    },
    "before": {
      "lamport": 3,
      "vector": [
        3,
        0,
        0
      ]
    },
    "incoming": {
      "id": "mCA",
      "send": "C3",
      "receive": "A4",
      "lamport": 6,
      "vector": [
        2,
        3,
        3
      ]
    },
    "merged": {
      "lamport": 6,
      "vector": [
        3,
        3,
        3
      ]
    },
    "after": {
      "lamport": 7,
      "vector": [
        4,
        3,
        3
      ]
    }
  },
  "B1": {
    "event": {
      "id": "B1",
      "process": "B",
      "kind": "local",
      "message": null
    },
    "before": {
      "lamport": 0,
      "vector": [
        0,
        0,
        0
      ]
    },
    "incoming": null,
    "merged": {
      "lamport": 0,
      "vector": [
        0,
        0,
        0
      ]
    },
    "after": {
      "lamport": 1,
      "vector": [
        0,
        1,
        0
      ]
    }
  },
  "B2": {
    "event": {
      "id": "B2",
      "process": "B",
      "kind": "receive",
      "message": "mAB"
    },
    "before": {
      "lamport": 1,
      "vector": [
        0,
        1,
        0
      ]
    },
    "incoming": {
      "id": "mAB",
      "send": "A2",
      "receive": "B2",
      "lamport": 2,
      "vector": [
        2,
        0,
        0
      ]
    },
    "merged": {
      "lamport": 2,
      "vector": [
        2,
        1,
        0
      ]
    },
    "after": {
      "lamport": 3,
      "vector": [
        2,
        2,
        0
      ]
    }
  },
  "B3": {
    "event": {
      "id": "B3",
      "process": "B",
      "kind": "send",
      "message": "mBC"
    },
    "before": {
      "lamport": 3,
      "vector": [
        2,
        2,
        0
      ]
    },
    "incoming": null,
    "merged": {
      "lamport": 3,
      "vector": [
        2,
        2,
        0
      ]
    },
    "after": {
      "lamport": 4,
      "vector": [
        2,
        3,
        0
      ]
    }
  },
  "C1": {
    "event": {
      "id": "C1",
      "process": "C",
      "kind": "local",
      "message": null
    },
    "before": {
      "lamport": 0,
      "vector": [
        0,
        0,
        0
      ]
    },
    "incoming": null,
    "merged": {
      "lamport": 0,
      "vector": [
        0,
        0,
        0
      ]
    },
    "after": {
      "lamport": 1,
      "vector": [
        0,
        0,
        1
      ]
    }
  },
  "C2": {
    "event": {
      "id": "C2",
      "process": "C",
      "kind": "receive",
      "message": "mBC"
    },
    "before": {
      "lamport": 1,
      "vector": [
        0,
        0,
        1
      ]
    },
    "incoming": {
      "id": "mBC",
      "send": "B3",
      "receive": "C2",
      "lamport": 4,
      "vector": [
        2,
        3,
        0
      ]
    },
    "merged": {
      "lamport": 4,
      "vector": [
        2,
        3,
        1
      ]
    },
    "after": {
      "lamport": 5,
      "vector": [
        2,
        3,
        2
      ]
    }
  },
  "C3": {
    "event": {
      "id": "C3",
      "process": "C",
      "kind": "send",
      "message": "mCA"
    },
    "before": {
      "lamport": 5,
      "vector": [
        2,
        3,
        2
      ]
    },
    "incoming": null,
    "merged": {
      "lamport": 5,
      "vector": [
        2,
        3,
        2
      ]
    },
    "after": {
      "lamport": 6,
      "vector": [
        2,
        3,
        3
      ]
    }
  }
};

const PREFIX_FRONTIERS = [
  {"counts":[0,0,0],"enabled":["A1","B1","C1"]},
  {"counts":[0,0,1],"enabled":["A1","B1"]},
  {"counts":[0,1,0],"enabled":["A1","C1"]},
  {"counts":[0,1,1],"enabled":["A1"]},
  {"counts":[1,0,0],"enabled":["A2","B1","C1"]},
  {"counts":[1,0,1],"enabled":["A2","B1"]},
  {"counts":[1,1,0],"enabled":["A2","C1"]},
  {"counts":[1,1,1],"enabled":["A2"]},
  {"counts":[2,0,0],"enabled":["A3","B1","C1"]},
  {"counts":[2,0,1],"enabled":["A3","B1"]},
  {"counts":[2,1,0],"enabled":["A3","B2","C1"]},
  {"counts":[2,1,1],"enabled":["A3","B2"]},
  {"counts":[2,2,0],"enabled":["A3","B3","C1"]},
  {"counts":[2,2,1],"enabled":["A3","B3"]},
  {"counts":[2,3,0],"enabled":["A3","C1"]},
  {"counts":[2,3,1],"enabled":["A3","C2"]},
  {"counts":[2,3,2],"enabled":["A3","C3"]},
  {"counts":[2,3,3],"enabled":["A3"]},
  {"counts":[3,0,0],"enabled":["B1","C1"]},
  {"counts":[3,0,1],"enabled":["B1"]},
  {"counts":[3,1,0],"enabled":["B2","C1"]},
  {"counts":[3,1,1],"enabled":["B2"]},
  {"counts":[3,2,0],"enabled":["B3","C1"]},
  {"counts":[3,2,1],"enabled":["B3"]},
  {"counts":[3,3,0],"enabled":["C1"]},
  {"counts":[3,3,1],"enabled":["C2"]},
  {"counts":[3,3,2],"enabled":["C3"]},
  {"counts":[3,3,3],"enabled":["A4"]},
  {"counts":[4,3,3],"enabled":[]}
];

const SUCCESSORS = {
  "A1": [
    "A2",
    "A3",
    "A4",
    "B2",
    "B3",
    "C2",
    "C3"
  ],
  "A2": [
    "A3",
    "A4",
    "B2",
    "B3",
    "C2",
    "C3"
  ],
  "A3": [
    "A4"
  ],
  "A4": [],
  "B1": [
    "A4",
    "B2",
    "B3",
    "C2",
    "C3"
  ],
  "B2": [
    "A4",
    "B3",
    "C2",
    "C3"
  ],
  "B3": [
    "A4",
    "C2",
    "C3"
  ],
  "C1": [
    "A4",
    "C2",
    "C3"
  ],
  "C2": [
    "A4",
    "C3"
  ],
  "C3": [
    "A4"
  ]
};

const TOTAL_ORDERS = {
  "ABC": [
    "A1",
    "B1",
    "C1",
    "A2",
    "A3",
    "B2",
    "B3",
    "C2",
    "C3",
    "A4"
  ],
  "CBA": [
    "C1",
    "B1",
    "A1",
    "A2",
    "B2",
    "A3",
    "B3",
    "C2",
    "C3",
    "A4"
  ]
};

const PROCESS_IDS = ['A', 'B', 'C'];
const EVENT_IDS = EXPECTED_GRAPH.events.map(event => event.id);
const FULL_ORDER = TOTAL_ORDERS.ABC;
const clone = value => JSON.parse(JSON.stringify(value));
const compareNumber = (left, right) => left < right ? '<' : left > right ? '>' : '=';

function countsFor(order) {
  return PROCESS_IDS.map(process => order.filter(id => id[0] === process).length);
}

function frontierFor(counts) {
  const row = PREFIX_FRONTIERS.find(candidate =>
    candidate.counts.every((count, index) => count === counts[index]));
  assert.ok(row, 'The independent prefix table must contain ' + counts.join(','));
  return row;
}

function prefixOrder(counts) {
  const included = new Set(PROCESS_IDS.flatMap((process, index) =>
    PROCESS_EVENTS[process].slice(0, counts[index])));
  return FULL_ORDER.filter(id => included.has(id));
}

// Clocks are looked up in the independently frozen table. No clock recurrence
// or graph-search algorithm from the implementation is used as an oracle.
function expectedSnapshot(order) {
  const counts = countsFor(order);
  const present = new Set(order);
  const event = order.length === 0 ? null : order[order.length - 1];
  return {
    step: order.length,
    event,
    processes: PROCESS_IDS.map((id, index) => {
      const sequence = PROCESS_EVENTS[id];
      const clock = counts[index] === 0
        ? { lamport: 0, vector: [0, 0, 0] }
        : clone(STAMPS[sequence[counts[index] - 1]]);
      return { id, nextEvent: sequence[counts[index]] ?? null, ...clock };
    }),
    messages: EXPECTED_GRAPH.messages.map(message => ({
      ...message,
      status: present.has(message.receive) ? 'delivered'
        : present.has(message.send) ? 'in-flight' : 'unsent',
      lamport: present.has(message.send) ? STAMPS[message.send].lamport : null,
      vector: present.has(message.send) ? [...STAMPS[message.send].vector] : null,
    })),
    recorded: order.map(id => ({
      ...EXPECTED_GRAPH.events.find(item => item.id === id),
      ...clone(STAMPS[id]),
    })),
    enabled: [...frontierFor(counts).enabled],
    update: event === null ? null : clone(UPDATES[event]),
  };
}

function assertDeepFrozen(value, seen = new Set()) {
  if (value === null || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const child of Object.values(value)) assertDeepFrozen(child, seen);
}

function assertTrace(order, trace) {
  assert.deepEqual(trace.order, order);
  assert.equal(trace.snapshots.length, order.length + 1);
  for (let step = 0; step <= order.length; step += 1) {
    assert.deepEqual(trace.snapshots[step], expectedSnapshot(order.slice(0, step)),
      'Complete snapshot at step ' + step + ' for ' + order.join(','));
  }
  assertDeepFrozen(trace);
}

function expectedRelation(left, right) {
  if (left === right) return 'same';
  if (SUCCESSORS[left].includes(right)) return 'before';
  if (SUCCESSORS[right].includes(left)) return 'after';
  return 'concurrent';
}

function expectedPairWithoutPath(left, right) {
  const relation = expectedRelation(left, right);
  const a = STAMPS[left];
  const b = STAMPS[right];
  return {
    left, right, relation,
    scalar: {
      left: a.lamport, right: b.lamport,
      comparison: compareNumber(a.lamport, b.lamport),
    },
    vector: {
      left: [...a.vector], right: [...b.vector],
      components: PROCESS_IDS.map((process, index) => ({
        process, left: a.vector[index], right: b.vector[index],
        comparison: compareNumber(a.vector[index], b.vector[index]),
      })),
      leftLeqRight: relation === 'same' || relation === 'before',
      rightLeqLeft: relation === 'same' || relation === 'after',
      leftStrictlyBefore: relation === 'before',
      rightStrictlyBefore: relation === 'after',
    },
  };
}

function assertPair(order, left, right) {
  const actual = compareClockEvents(order, left, right);
  const { path, ...withoutPath } = actual;
  const expected = expectedPairWithoutPath(left, right);
  assert.deepEqual(withoutPath, expected);
  if (expected.relation === 'same' || expected.relation === 'concurrent') {
    assert.deepEqual(path, []);
  } else {
    const start = expected.relation === 'before' ? left : right;
    const end = expected.relation === 'before' ? right : left;
    assert.equal(path[0], start);
    assert.equal(path[path.length - 1], end);
    assert.ok(path.length >= 2 && path.length <= EVENT_IDS.length);
    assert.equal(new Set(path).size, path.length);
    for (const id of path) assert.ok(order.includes(id), 'Witness event is recorded');
    for (let index = 1; index < path.length; index += 1) {
      assert.ok(EXPECTED_GRAPH.edges.some(edge =>
        edge.from === path[index - 1] && edge.to === path[index]),
      'Each witness segment is an original directed edge');
    }
  }
  assertDeepFrozen(actual);
  return actual;
}

function completePresentations() {
  const result = [];
  const visit = (order, counts) => {
    const frontier = frontierFor(counts);
    if (order.length === EVENT_IDS.length) {
      assert.deepEqual(frontier.enabled, []);
      result.push(order);
      return;
    }
    for (const id of frontier.enabled) {
      const nextCounts = [...counts];
      nextCounts[PROCESS_IDS.indexOf(id[0])] += 1;
      visit([...order, id], nextCounts);
    }
  };
  visit([], [0, 0, 0]);
  return result;
}

function throwsExactly(action, ErrorType, message) {
  assert.throws(action, error => {
    assert.equal(error.constructor, ErrorType);
    assert.equal(error.message, message);
    return true;
  });
}

test('the fixed graph preserves all ten original events and directed edges', () => {
  assert.deepEqual(CLOCK_GRAPH, EXPECTED_GRAPH);
  assert.equal(CLOCK_GRAPH.events.length, 10);
  assert.equal(CLOCK_GRAPH.edges.length, 10);
  assertDeepFrozen(CLOCK_GRAPH);
});

test('all ten updates expose exact before, incoming, merged and after clocks', () => {
  const trace = createClockTrace(FULL_ORDER);
  assertTrace(FULL_ORDER, trace);
  assert.deepEqual(trace.snapshots.at(-1).processes.map(row => row.vector),
    [[4, 3, 3], [2, 3, 0], [2, 3, 3]]);
  const a4 = trace.snapshots.find(snapshot => snapshot.event === 'A4').update;
  assert.deepEqual(a4.incoming.vector, [2, 3, 3]);
  assert.deepEqual(a4.merged.vector, [3, 3, 3]);
  assert.deepEqual(a4.after.vector, [4, 3, 3]);
});

test('all 29 legal prefixes expose exact frontiers, process clocks and message states', () => {
  assert.equal(PREFIX_FRONTIERS.length, 29);
  const encountered = new Set();
  for (const row of PREFIX_FRONTIERS) {
    const order = prefixOrder(row.counts);
    const before = [...order];
    const trace = createClockTrace(order);
    assertTrace(order, trace);
    assert.deepEqual(trace.snapshots.at(-1).enabled, row.enabled);
    assert.deepEqual(order, before);
    encountered.add(countsFor(order).join(','));
  }
  assert.equal(encountered.size, 29);
});

test('all 106 legal complete presentations preserve fixed clocks and immutable send payloads', () => {
  const orders = completePresentations();
  assert.equal(orders.length, 106);
  assert.equal(new Set(orders.map(order => order.join(','))).size, 106);
  for (const order of orders) {
    const original = [...order];
    const trace = createClockTrace(order);
    assertTrace(order, trace);
    assert.deepEqual(order, original);
    const a3Position = order.indexOf('A3');
    const b2Position = order.indexOf('B2');
    if (a3Position < b2Position) {
      const a3 = trace.snapshots[a3Position + 1];
      assert.deepEqual(a3.processes[0].vector, [3, 0, 0]);
      assert.deepEqual(a3.messages[0].vector, [2, 0, 0]);
      assert.deepEqual(trace.snapshots[b2Position + 1].update.incoming.vector, [2, 0, 0]);
    }
  }
});

test('every ordered pair and self comparison has complete vector evidence and a valid directed witness', () => {
  let before = 0;
  let after = 0;
  let concurrent = 0;
  let same = 0;
  for (const left of EVENT_IDS) {
    for (const right of EVENT_IDS) {
      const result = assertPair(FULL_ORDER, left, right);
      if (result.relation === 'before') before += 1;
      else if (result.relation === 'after') after += 1;
      else if (result.relation === 'concurrent') concurrent += 1;
      else same += 1;
    }
  }
  assert.deepEqual({ before, after, concurrent, same },
    { before: 32, after: 32, concurrent: 26, same: 10 });
});

test('all recorded pairs in every legal prefix retain complete-graph causality', () => {
  for (const row of PREFIX_FRONTIERS) {
    const order = prefixOrder(row.counts);
    for (const left of order) {
      for (const right of order) assertPair(order, left, right);
    }
  }
});

test('scalar tie conventions change only derived ordering, including causal false positives', () => {
  const originalGraph = clone(CLOCK_GRAPH);
  const trace = createClockTrace(FULL_ORDER);
  const originalTrace = clone(trace);
  for (const row of PREFIX_FRONTIERS) {
    const order = prefixOrder(row.counts);
    const original = [...order];
    for (const tie of ['ABC', 'CBA']) {
      const result = clockTotalOrder(order, tie);
      assert.deepEqual(result, TOTAL_ORDERS[tie].filter(id => order.includes(id)));
      assertDeepFrozen(result);
    }
    assert.deepEqual(order, original);
  }
  assert.deepEqual(clockTotalOrder(FULL_ORDER), TOTAL_ORDERS.ABC);
  const unequal = assertPair(FULL_ORDER, 'A3', 'C3');
  assert.equal(unequal.scalar.comparison, '<');
  assert.equal(unequal.relation, 'concurrent');
  const tied = assertPair(FULL_ORDER, 'A3', 'B2');
  assert.equal(tied.scalar.comparison, '=');
  assert.equal(tied.relation, 'concurrent');
  assert.deepEqual(CLOCK_GRAPH, originalGraph);
  assert.deepEqual(trace, originalTrace);
});

test('passive order refusals preserve precise admission order and caller data', () => {
  const cases = [
    [null, TypeError, 'Order must be an array of event IDs.'],
    [{}, TypeError, 'Order must be an array of event IDs.'],
    ['A1', TypeError, 'Order must be an array of event IDs.'],
    [Array(11).fill('unknown'), RangeError, 'Order must contain at most 10 events.'],
    [Array(1), RangeError, 'Order contains an unknown event ID.'],
    [[null], RangeError, 'Order contains an unknown event ID.'],
    [[1], RangeError, 'Order contains an unknown event ID.'],
    [['a1'], RangeError, 'Order contains an unknown event ID.'],
    [['A1', 'unknown'], RangeError, 'Order contains an unknown event ID.'],
    [['A1', 'A1'], RangeError, 'Order contains a duplicate event ID.'],
    [['A2'], RangeError, 'Event is not next in its process.'],
    [['A1', 'B2'], RangeError, 'Event is not next in its process.'],
    [['B1', 'B2'], RangeError, 'Receive requires its matching send.'],
    [['C1', 'C2'], RangeError, 'Receive requires its matching send.'],
    [['A1', 'A2', 'A3', 'A4'], RangeError, 'Receive requires its matching send.'],
    [['A1', 'A1', 'unknown'], RangeError, 'Order contains a duplicate event ID.'],
    [['unknown', 'A1', 'A1'], RangeError, 'Order contains an unknown event ID.'],
  ];
  for (const [order, ErrorType, message] of cases) {
    const before = Array.isArray(order) ? order.slice() : order;
    throwsExactly(() => createClockTrace(order), ErrorType, message);
    assert.deepEqual(order, before);
  }
  assertTrace([], createClockTrace());
  assertTrace([], createClockTrace(undefined));
});

test('comparison and tie arguments are admitted after the selected prefix', () => {
  for (const [order, left, right] of [
    [[], 'A1', 'A1'],
    [['A1'], 'A1', 'A2'],
    [['A1'], 'A2', 'A1'],
    [['A1'], 'unknown', 'A1'],
    [['A1'], null, 'A1'],
  ]) {
    throwsExactly(() => compareClockEvents(order, left, right), RangeError,
      'Both events must be recorded in the selected prefix.');
  }
  for (const tie of ['ACB', '', 'abc', null, 1]) {
    throwsExactly(() => clockTotalOrder(['A1'], tie), RangeError,
      'Tie order must be ABC or CBA.');
  }
  throwsExactly(() => compareClockEvents(null, 'unknown', 'unknown'), TypeError,
    'Order must be an array of event IDs.');
  throwsExactly(() => compareClockEvents(['A2'], 'unknown', 'unknown'), RangeError,
    'Event is not next in its process.');
  throwsExactly(() => clockTotalOrder(null, 'bad'), TypeError,
    'Order must be an array of event IDs.');
  throwsExactly(() => clockTotalOrder(['A2'], 'bad'), RangeError,
    'Event is not next in its process.');
});

test('caller arrays, separate traces and saved nested values are detached and deeply frozen', () => {
  const supplied = [...FULL_ORDER];
  const trace = createClockTrace(supplied);
  const saved = clone(trace);
  supplied.splice(0, supplied.length, 'C1');
  assert.deepEqual(trace, saved);
  const frozenInput = Object.freeze([...FULL_ORDER]);
  const second = createClockTrace(frozenInput);
  assert.deepEqual(second, saved);
  assert.notEqual(second, trace);
  assert.notEqual(second.order, trace.order);
  assert.notEqual(second.snapshots, trace.snapshots);
  assert.notEqual(second.snapshots[0].processes[0].vector,
    trace.snapshots[0].processes[0].vector);
  const sent = trace.snapshots.find(snapshot => snapshot.event === 'A2');
  const later = trace.snapshots.find(snapshot => snapshot.event === 'A3');
  assert.notEqual(sent.messages[0].vector, later.messages[0].vector);
  assert.notEqual(sent.update.after.vector, sent.messages[0].vector);
  assert.notEqual(sent.processes[0].vector, sent.recorded.at(-1).vector);
  for (const mutation of [
    () => { trace.order.push('A1'); },
    () => { trace.snapshots[0].processes[0].vector[0] = 99; },
    () => { sent.messages[0].vector[0] = 99; },
    () => { sent.update.after.vector[0] = 99; },
    () => { sent.recorded.at(-1).lamport = 99; },
    () => { CLOCK_GRAPH.edges[0].to = 'C3'; },
  ]) assert.throws(mutation, TypeError);
  const invalid = ['A1', 'A1'];
  throwsExactly(() => createClockTrace(invalid), RangeError,
    'Order contains a duplicate event ID.');
  assert.deepEqual(invalid, ['A1', 'A1']);
  assert.deepEqual(trace, saved);
  assert.deepEqual(frozenInput, FULL_ORDER);
  assertDeepFrozen(second);
});

test('saved-snapshot inspection and reset projections never inherit later clocks or messages', () => {
  const trace = createClockTrace(FULL_ORDER);
  const original = clone(trace);
  for (const cursor of [10, 6, 0, 3, 10]) {
    const selected = trace.order.slice(0, cursor);
    const rebuiltPrefix = createClockTrace(selected);
    assert.deepEqual(trace.snapshots[cursor], rebuiltPrefix.snapshots.at(-1));
    assert.deepEqual(trace.snapshots[cursor], expectedSnapshot(selected));
    for (const left of selected) {
      for (const right of selected) assertPair(selected, left, right);
    }
    if (!selected.includes('A4')) {
      throwsExactly(() => compareClockEvents(selected, 'A4', 'A4'), RangeError,
        'Both events must be recorded in the selected prefix.');
    }
  }
  const reset = createClockTrace();
  assert.deepEqual(reset, { order: [], snapshots: [expectedSnapshot([])] });
  assert.notEqual(reset.snapshots[0], trace.snapshots[0]);
  assert.notEqual(reset.snapshots[0].messages, trace.snapshots[0].messages);
  assert.deepEqual(trace, original);
  assertTrace(['C1'], createClockTrace(['C1']));
});

// The pure renderer is tested with text only. This fixture is never imported,
// parsed as JavaScript, executed in a VM, or written to a temporary project.
const EXPECTED_IMPORT = "import { CLOCK_GRAPH, createClockTrace, compareClockEvents, clockTotalOrder } from './logical-clocks.mjs';\n";
const MINI_MODEL = [
  'export const CLOCK_GRAPH = {};',
  'export function createClockTrace() { return null; }',
  'export function compareClockEvents() { return null; }',
  'export function clockTotalOrder() { return []; }',
].join('\n');
const MINI_MODEL_INLINE = [
  'const CLOCK_GRAPH = {};',
  'function createClockTrace() { return null; }',
  'function compareClockEvents() { return null; }',
  'function clockTotalOrder() { return []; }',
].join('\n');
const MINI_UI_BODY = 'void [CLOCK_GRAPH, createClockTrace, compareClockEvents, clockTotalOrder, embeddedCourse, embeddedGuide];';
const MINI_TEMPLATE = [
  '<!doctype html>',
  '<script>',
  'const embeddedCourse = @@LOGICAL_CLOCKS_COURSE@@;',
  'const embeddedGuide = @@LOGICAL_CLOCKS_GUIDE@@;',
  '@@LOGICAL_CLOCKS_SCRIPT@@',
  '</script>',
  '',
].join('\n');
const MARKERS = [
  '@@LOGICAL_CLOCKS_COURSE@@',
  '@@LOGICAL_CLOCKS_GUIDE@@',
  '@@LOGICAL_CLOCKS_SCRIPT@@',
];

function rendererFixture() {
  const lesson = {
    format: 'recallweave-deck/1',
    title: 'Logical-clock text fixture',
    attribution: 'Original test text',
    license: 'CC0-1.0',
    concepts: ['clocks'],
    items: [{
      id: 'clock-1', concept: 'clocks', prerequisites: [],
      prompt: 'Choose the local event.', options: ['Local', 'Receive'], answer: 0,
      explanation: 'This fixture tests text preservation.', transfer: 'Read the complete original lesson.',
    }],
  };
  return {
    template: MINI_TEMPLATE,
    modelSource: MINI_MODEL,
    uiSource: EXPECTED_IMPORT + MINI_UI_BODY,
    courseText: JSON.stringify(lesson, null, 2) + '\n',
    guideText: '# Logical-clock text fixture\n\nComplete guide text.\n',
  };
}

function embeddedText(html, name) {
  const expression = new RegExp(
    '^\\s*const\\s+' + name + '\\s*=\\s*("(?:[^"\\\\]|\\\\.)*")\\s*;', 'gm');
  const matches = [...html.matchAll(expression)];
  assert.equal(matches.length, 1, 'Exactly one literal initializer for ' + name);
  return { literal: matches[0][1], text: JSON.parse(matches[0][1]) };
}

function readActualInputs() {
  const read = path => readFileSync(join(root, path), 'utf8');
  return {
    template: read('courses/logical-clocks-explorer.template.html'),
    modelSource: read('src/logical-clocks.mjs'),
    uiSource: read('src/logical-clocks-ui.mjs'),
    courseText: read('courses/logical-clocks.json'),
    guideText: read('courses/logical-clocks.md'),
  };
}

test('the published standalone page equals both builder paths and retains exact original downloads', () => {
  const inputs = readActualInputs();
  const before = { ...inputs };
  assert.equal(logicalClocksExplorerPath, join(root, 'courses/logical-clocks-explorer.html'));
  const published = readFileSync(logicalClocksExplorerPath, 'utf8');
  assert.equal(renderLogicalClocksExplorer(inputs), published);
  assert.equal(buildLogicalClocksExplorer(), published);
  assert.deepEqual(inputs, before);
  const course = embeddedText(published, 'embeddedCourse');
  const guide = embeddedText(published, 'embeddedGuide');
  assert.equal(course.text, inputs.courseText);
  assert.equal(guide.text, inputs.guideText);
  assert.deepEqual(Buffer.from(course.text, 'utf8'), Buffer.from(inputs.courseText, 'utf8'));
  assert.deepEqual(Buffer.from(guide.text, 'utf8'), Buffer.from(inputs.guideText, 'utf8'));
  assert.equal(Buffer.byteLength(inputs.courseText), 19014);
  assert.equal(Buffer.byteLength(inputs.guideText), 16072);
  assert.equal(createHash('sha256').update(inputs.courseText).digest('hex'),
    '6f731689af8fbfb9aef01d03e56fd6c91a14d0e3ef6e30fbc925d6db789b121e');
  assert.equal(createHash('sha256').update(inputs.guideText).digest('hex'),
    '4283002d8c1619b986e4be985dcb74f1d0f54fdea2e10ba352725600789cf491');
});

test('renderer encoding preserves whole text, replacement metacharacters and marker-looking data', () => {
  const inputs = rendererFixture();
  const lesson = JSON.parse(inputs.courseText);
  const special = '</ScRiPt><tag> $& $' + String.fromCharCode(96) + " $' "
    + String.fromCharCode(0x2028, 0x2029) + ' @@LOGICAL_CLOCKS_GUIDE@@ '
    + '@@LOGICAL_CLOCKS_SCRIPT@@';
  lesson.items[0].explanation = special;
  inputs.courseText = JSON.stringify(lesson, null, 2) + '\n';
  inputs.guideText = '# Guide\n' + special + '\n';
  const before = { ...inputs };
  const html = renderLogicalClocksExplorer(inputs);
  const course = embeddedText(html, 'embeddedCourse');
  const guide = embeddedText(html, 'embeddedGuide');
  for (const [captured, original] of [[course, inputs.courseText], [guide, inputs.guideText]]) {
    assert.equal(captured.text, original);
    assert.equal(captured.literal.includes('<'), false);
    assert.equal(captured.literal.includes(String.fromCharCode(0x2028)), false);
    assert.equal(captured.literal.includes(String.fromCharCode(0x2029)), false);
    assert.ok(captured.literal.includes('\\u003c'));
    assert.ok(captured.literal.includes('\\u2028'));
    assert.ok(captured.literal.includes('\\u2029'));
  }
  const expectedInline = "(() => {\n'use strict';\n" + MINI_MODEL_INLINE + '\n'
    + MINI_UI_BODY + '\n})();';
  const expected = [
    '<!doctype html>',
    '<script>',
    'const embeddedCourse = ' + course.literal + ';',
    'const embeddedGuide = ' + guide.literal + ';',
    expectedInline,
    '</script>',
    '',
  ].join('\n');
  assert.equal(html, expected);
  assert.deepEqual(inputs, before);
});

test('each standalone marker must occur exactly once in the original template', () => {
  for (const marker of MARKERS) {
    for (const template of [
      MINI_TEMPLATE.replace(marker, ''),
      MINI_TEMPLATE + marker,
    ]) {
      const inputs = { ...rendererFixture(), template };
      throwsExactly(() => renderLogicalClocksExplorer(inputs), Error,
        'Expected exactly one build marker: ' + marker);
    }
  }
});

test('renderer rejects unexpected module declarations and inline script-closing text', () => {
  const cases = [
    [{ uiSource: ' ' + EXPECTED_IMPORT + MINI_UI_BODY },
      'The companion requires its explicit native logical-clock model import.'],
    [{ uiSource: EXPECTED_IMPORT.replace('\n', '\r\n') + MINI_UI_BODY },
      'The companion requires its explicit native logical-clock model import.'],
    [{ modelSource: MINI_MODEL + "\nimport './other.mjs';" },
      'The standalone companion contains an unsupported module declaration.'],
    [{ modelSource: MINI_MODEL + '\nexport default CLOCK_GRAPH;' },
      'The standalone companion contains an unsupported module declaration.'],
    [{ uiSource: EXPECTED_IMPORT + "import './other.mjs';" },
      'The standalone companion contains an unsupported module declaration.'],
    [{ modelSource: MINI_MODEL + '\n// </ScRiPt >' },
      'Inline source must not contain an HTML script closing tag.'],
    [{ uiSource: EXPECTED_IMPORT + MINI_UI_BODY + '\n// </script>' },
      'Inline source must not contain an HTML script closing tag.'],
  ];
  for (const [replacement, message] of cases) {
    throwsExactly(() => renderLogicalClocksExplorer({ ...rendererFixture(), ...replacement }),
      Error, message);
  }
});

test('renderer admits all five complete strings before lesson parsing and module checks', () => {
  const message = 'The logical-clock companion requires complete template, model, UI, course and guide strings.';
  for (const key of ['template', 'modelSource', 'uiSource', 'courseText', 'guideText']) {
    throwsExactly(() => renderLogicalClocksExplorer({
      ...rendererFixture(), courseText: '{', [key]: null,
    }), TypeError, message);
  }
  throwsExactly(() => renderLogicalClocksExplorer({
    ...rendererFixture(), courseText: '{', uiSource: 'not the selected import',
  }), Error, 'The file is not valid JSON. Check its commas, quotes and brackets.');
});
