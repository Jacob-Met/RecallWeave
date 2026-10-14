/**
 * Fixed ten-event logical-clock model for RecallWeave.
 * Graph and clock conventions: courses/logical-clocks.md.
 * A chosen event order is a legal presentation, not a physical-time observation.
 * Inputs are passive arrays of event IDs; this is not a hostile-object sandbox.
 */

function freezeTree(value) {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) freezeTree(child);
    Object.freeze(value);
  }
  return value;
}

export const CLOCK_GRAPH = freezeTree({
  processes: ['A', 'B', 'C'],
  events: [
    { id: 'A1', process: 'A', kind: 'local', message: null },
    { id: 'A2', process: 'A', kind: 'send', message: 'mAB' },
    { id: 'A3', process: 'A', kind: 'local', message: null },
    { id: 'A4', process: 'A', kind: 'receive', message: 'mCA' },
    { id: 'B1', process: 'B', kind: 'local', message: null },
    { id: 'B2', process: 'B', kind: 'receive', message: 'mAB' },
    { id: 'B3', process: 'B', kind: 'send', message: 'mBC' },
    { id: 'C1', process: 'C', kind: 'local', message: null },
    { id: 'C2', process: 'C', kind: 'receive', message: 'mBC' },
    { id: 'C3', process: 'C', kind: 'send', message: 'mCA' },
  ],
  messages: [
    { id: 'mAB', send: 'A2', receive: 'B2' },
    { id: 'mBC', send: 'B3', receive: 'C2' },
    { id: 'mCA', send: 'C3', receive: 'A4' },
  ],
  edges: [
    { from: 'A1', to: 'A2', kind: 'program', message: null },
    { from: 'A2', to: 'A3', kind: 'program', message: null },
    { from: 'A3', to: 'A4', kind: 'program', message: null },
    { from: 'B1', to: 'B2', kind: 'program', message: null },
    { from: 'B2', to: 'B3', kind: 'program', message: null },
    { from: 'C1', to: 'C2', kind: 'program', message: null },
    { from: 'C2', to: 'C3', kind: 'program', message: null },
    { from: 'A2', to: 'B2', kind: 'message', message: 'mAB' },
    { from: 'B3', to: 'C2', kind: 'message', message: 'mBC' },
    { from: 'C3', to: 'A4', kind: 'message', message: 'mCA' },
  ],
});

const eventById = new Map(CLOCK_GRAPH.events.map(event => [event.id, event]));
const sequences = CLOCK_GRAPH.processes.map(process =>
  CLOCK_GRAPH.events.filter(event => event.process === process).map(event => event.id));

function copyClock(clock) {
  return { lamport: clock.lamport, vector: [...clock.vector] };
}

function copyEvent(event) {
  return { id: event.id, process: event.process, kind: event.kind, message: event.message };
}

function copyMessage(message) {
  return {
    id: message.id,
    send: message.send,
    receive: message.receive,
    status: message.status,
    lamport: message.lamport,
    vector: message.vector === null ? null : [...message.vector],
  };
}

function enabledEvents(states, messages) {
  const enabled = [];
  for (let process = 0; process < states.length; process += 1) {
    const id = sequences[process][states[process].next];
    if (id === undefined) continue;
    const event = eventById.get(id);
    if (event.kind !== 'receive' ||
        messages.find(message => message.id === event.message).status === 'in-flight') {
      enabled.push(id);
    }
  }
  return enabled;
}

function saveSnapshot(states, messages, records, update) {
  return freezeTree({
    step: records.length,
    event: update === null ? null : update.event.id,
    processes: states.map((state, process) => ({
      id: CLOCK_GRAPH.processes[process],
      nextEvent: sequences[process][state.next] ?? null,
      ...copyClock(state),
    })),
    messages: messages.map(copyMessage),
    recorded: records.map(record => ({ ...copyEvent(record), ...copyClock(record) })),
    enabled: enabledEvents(states, messages),
    update,
  });
}

/**
 * Build an immutable trace from a dense prefix of the fixed graph's event IDs.
 * Admission is sequential: unknown, duplicate, program order, then send dependency.
 * No caller array or earlier snapshot is modified, including on refusal.
 */
export function createClockTrace(order = []) {
  if (!Array.isArray(order)) throw new TypeError('Order must be an array of event IDs.');
  if (order.length > CLOCK_GRAPH.events.length) {
    throw new RangeError('Order must contain at most 10 events.');
  }
  const states = CLOCK_GRAPH.processes.map(() => ({
    next: 0, lamport: 0, vector: [0, 0, 0],
  }));
  const messages = CLOCK_GRAPH.messages.map(message => ({
    ...message, status: 'unsent', lamport: null, vector: null,
  }));
  const records = [];
  const accepted = [];
  const seen = new Set();
  const snapshots = [saveSnapshot(states, messages, records, null)];

  for (let index = 0; index < order.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(order, index) ||
        typeof order[index] !== 'string' || !eventById.has(order[index])) {
      throw new RangeError('Order contains an unknown event ID.');
    }
    const id = order[index];
    if (seen.has(id)) throw new RangeError('Order contains a duplicate event ID.');
    const event = eventById.get(id);
    const process = CLOCK_GRAPH.processes.indexOf(event.process);
    const state = states[process];
    if (sequences[process][state.next] !== id) {
      throw new RangeError('Event is not next in its process.');
    }
    const message = event.message === null ? null :
      messages.find(item => item.id === event.message);
    if (event.kind === 'receive' && message.status !== 'in-flight') {
      throw new RangeError('Receive requires its matching send.');
    }

    const before = copyClock(state);
    const incoming = event.kind === 'receive' ? {
      id: message.id,
      send: message.send,
      receive: message.receive,
      lamport: message.lamport,
      vector: [...message.vector],
    } : null;
    const merged = incoming === null ? copyClock(state) : {
      lamport: Math.max(state.lamport, incoming.lamport),
      vector: state.vector.map((value, component) => Math.max(value, incoming.vector[component])),
    };
    const after = { lamport: merged.lamport + 1, vector: [...merged.vector] };
    after.vector[process] += 1;
    state.lamport = after.lamport;
    state.vector = [...after.vector];
    state.next += 1;

    if (event.kind === 'send') {
      message.status = 'in-flight';
      message.lamport = after.lamport;
      message.vector = [...after.vector];
    } else if (event.kind === 'receive') {
      message.status = 'delivered';
    }

    records.push({ ...copyEvent(event), ...copyClock(after) });
    accepted.push(id);
    seen.add(id);
    snapshots.push(saveSnapshot(states, messages, records, {
      event: copyEvent(event), before, incoming, merged, after,
    }));
  }

  return freezeTree({ order: accepted, snapshots });
}

function forwardPath(start, end) {
  const queue = [[start]];
  const visited = new Set([start]);
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const path = queue[cursor];
    const last = path[path.length - 1];
    for (const edge of CLOCK_GRAPH.edges) {
      if (edge.from !== last || visited.has(edge.to)) continue;
      const next = [...path, edge.to];
      if (edge.to === end) return next;
      visited.add(edge.to);
      queue.push(next);
    }
  }
  return [];
}

function compareNumber(left, right) {
  return left < right ? '<' : left > right ? '>' : '=';
}

/**
 * Compare two recorded events from an admitted prefix.
 * Witnesses run from the causal predecessor to the successor. They are not a
 * claim that this is the only path. Scalar or presentation order never creates
 * a causal edge. A same-event comparison is not concurrency.
 */
export function compareClockEvents(order, leftId, rightId) {
  const trace = createClockTrace(order);
  const recorded = trace.snapshots[trace.snapshots.length - 1].recorded;
  const left = recorded.find(event => event.id === leftId);
  const right = recorded.find(event => event.id === rightId);
  if (left === undefined || right === undefined) {
    throw new RangeError('Both events must be recorded in the selected prefix.');
  }
  const leftLeqRight = left.vector.every((value, index) => value <= right.vector[index]);
  const rightLeqLeft = right.vector.every((value, index) => value <= left.vector[index]);
  const leftStrictlyBefore = leftLeqRight &&
    left.vector.some((value, index) => value < right.vector[index]);
  const rightStrictlyBefore = rightLeqLeft &&
    right.vector.some((value, index) => value < left.vector[index]);
  let relation = 'same';
  let path = [];
  if (leftId !== rightId) {
    path = forwardPath(leftId, rightId);
    if (path.length > 0) {
      relation = 'before';
    } else {
      path = forwardPath(rightId, leftId);
      relation = path.length > 0 ? 'after' : 'concurrent';
    }
  }
  return freezeTree({
    left: leftId,
    right: rightId,
    relation,
    path,
    scalar: {
      left: left.lamport,
      right: right.lamport,
      comparison: compareNumber(left.lamport, right.lamport),
    },
    vector: {
      left: [...left.vector],
      right: [...right.vector],
      components: CLOCK_GRAPH.processes.map((process, index) => ({
        process, left: left.vector[index], right: right.vector[index],
        comparison: compareNumber(left.vector[index], right.vector[index]),
      })),
      leftLeqRight,
      rightLeqLeft,
      leftStrictlyBefore,
      rightStrictlyBefore,
    },
  });
}

/** A chosen total order is a convention, not a causal or physical-time claim. */
export function clockTotalOrder(order, tieOrder = 'ABC') {
  const trace = createClockTrace(order);
  if (tieOrder !== 'ABC' && tieOrder !== 'CBA') {
    throw new RangeError('Tie order must be ABC or CBA.');
  }
  const recorded = trace.snapshots[trace.snapshots.length - 1].recorded;
  return freezeTree([...recorded].sort((left, right) =>
    left.lamport - right.lamport ||
    tieOrder.indexOf(left.process) - tieOrder.indexOf(right.process)).map(event => event.id));
}
