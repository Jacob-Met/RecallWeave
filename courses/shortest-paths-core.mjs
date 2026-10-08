/** Original bounded teaching model: Dijkstra on directed nonnegative graphs.
 * A linear frontier scan is intentional for small visible graphs (not a heap benchmark).
 * Run objects are immutable and produced by this module; downloaded traces are records,
 * not an accepted restore format.
 */
const runs = new WeakSet();
const frozen = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) frozen(child);
    Object.freeze(value);
  }
  return value;
};

export function validateGraph(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Choose a graph object.');
  if (!Array.isArray(value.nodes) || value.nodes.length < 1 || value.nodes.length > 7) {
    throw new Error('A teaching graph needs 1–7 vertices.');
  }
  const nodes = [...value.nodes];
  if (nodes.some(id => typeof id !== 'string' || !/^[A-Z][A-Z0-9]{0,7}$/.test(id)) ||
      new Set(nodes).size !== nodes.length) {
    throw new Error('Vertex names must be unique uppercase identifiers.');
  }
  if (!Array.isArray(value.edges) || value.edges.length > 49) throw new Error('Use at most 49 directed edges.');
  const known = new Set(nodes), seen = new Set();
  const edges = value.edges.map((edge, index) => {
    if (!edge || typeof edge !== 'object' || !known.has(edge.from) || !known.has(edge.to)) {
      throw new Error('Edge ' + (index + 1) + ' needs two known vertices.');
    }
    const key = edge.from + ':' + edge.to;
    if (seen.has(key)) throw new Error('Use only one edge for ' + edge.from + ' → ' + edge.to + '.');
    seen.add(key);
    if (!Number.isInteger(edge.weight) || edge.weight < 0 || edge.weight > 50) {
      throw new Error('Weight ' + edge.from + ' → ' + edge.to + ' must be a whole number from 0 to 50.');
    }
    return {from: edge.from, to: edge.to, weight: edge.weight};
  });
  return frozen({nodes, edges});
}

function run(value) {
  const result = frozen(value);
  runs.add(result);
  return result;
}
function requireRun(state) {
  if (!state || !runs.has(state)) throw new Error('Start a new run before stepping through the graph.');
}
function requireVertex(graph, vertex) {
  if (!graph.nodes.includes(vertex)) throw new Error('Choose a vertex in this graph.');
}

export function startRun(graph, source) {
  const checked = validateGraph(graph);
  requireVertex(checked, source);
  return run({
    graph: checked, source,
    distances: Object.fromEntries(checked.nodes.map(id => [id, id === source ? 0 : null])),
    previous: Object.fromEntries(checked.nodes.map(id => [id, null])),
    settled: [], history: [], done: false
  });
}

/** null means that no unsettled vertex has a discovered route. */
export function nextVertex(state) {
  requireRun(state);
  let best = null;
  for (const id of state.graph.nodes) {
    if (state.settled.includes(id) || state.distances[id] === null) continue;
    if (best === null || state.distances[id] < state.distances[best] ||
        (state.distances[id] === state.distances[best] && id < best)) best = id;
  }
  return best;
}

export function advanceRun(state) {
  requireRun(state);
  if (state.done) return state;
  const vertex = nextVertex(state);
  if (vertex === null) return run({...state, done: true});
  const settled = [...state.settled, vertex];
  const distances = {...state.distances}, previous = {...state.previous}, updates = [];
  for (const edge of state.graph.edges.filter(edge => edge.from === vertex)) {
    const oldDistance = distances[edge.to];
    const candidate = distances[vertex] + edge.weight;
    let reason = 'no-improvement', changed = false;
    if (settled.includes(edge.to)) reason = 'already-settled';
    else if (oldDistance === null || candidate < oldDistance) {
      distances[edge.to] = candidate;
      previous[edge.to] = vertex;
      reason = oldDistance === null ? 'first-route' : 'shorter-route';
      changed = true;
    } else if (candidate === oldDistance) reason = 'equal-keeps-first';
    updates.push({
      from: edge.from, to: edge.to, weight: edge.weight,
      oldDistance, candidate, newDistance: distances[edge.to], changed, reason
    });
  }
  const step = {
    number: state.history.length + 1, vertex, finalDistance: distances[vertex],
    updates, distances: {...distances}, previous: {...previous}, settled: [...settled]
  };
  const done = !state.graph.nodes.some(id => !settled.includes(id) && distances[id] !== null);
  return run({...state, distances, previous, settled, history: [...state.history, step], done});
}

export function routeTo(state, target) {
  requireRun(state);
  requireVertex(state.graph, target);
  const distance = state.distances[target];
  if (distance === null) return frozen({
    target, distance: null, path: [], status: state.done ? 'unreachable' : 'unreached'
  });
  const path = [];
  let vertex = target;
  for (let count = 0; count <= state.graph.nodes.length; count++) {
    path.push(vertex);
    if (vertex === state.source) break;
    vertex = state.previous[vertex];
    if (vertex === null) throw new Error('The current run has an incomplete route.');
  }
  if (path[path.length - 1] !== state.source) throw new Error('The current run has a cyclic route.');
  return frozen({
    target, distance, path: path.reverse(),
    status: state.settled.includes(target) ? 'final' : 'tentative'
  });
}

export function traceDocument(state, target) {
  requireRun(state);
  return frozen({
    format: 'recallweave-shortest-paths-trace/1',
    algorithm: 'Dijkstra with a linear frontier scan and alphabetical equal-distance ties',
    graph: state.graph, source: state.source, target,
    settled: state.settled, distances: state.distances,
    previous: state.previous, steps: state.history, complete: state.done,
    route: routeTo(state, target),
    note: 'An explicit local record of this teaching run. It does not save or restore a RecallWeave learner session.'
  });
}

export const PRESETS = frozen([
  {
    id: 'improvement', title: 'A route improves later',
    description: 'The first route to A costs 4. Going through B finds a cheaper route before A is settled.',
    source: 'S', target: 'T',
    graph: {
      nodes: ['S', 'A', 'B', 'C', 'T'],
      edges: [
        {from: 'S', to: 'A', weight: 4}, {from: 'S', to: 'B', weight: 1},
        {from: 'B', to: 'A', weight: 2}, {from: 'A', to: 'C', weight: 1},
        {from: 'B', to: 'C', weight: 5}, {from: 'C', to: 'T', weight: 3},
        {from: 'A', to: 'T', weight: 7}
      ]
    },
    positions: {S: [65, 185], A: [235, 65], B: [235, 305], C: [415, 185], T: [600, 185]}
  },
  {
    id: 'first-discovery', title: 'Finding the target is not finishing',
    description: 'A direct edge discovers T at cost 9. Another unsettled route can still lower that estimate.',
    source: 'S', target: 'T',
    graph: {
      nodes: ['S', 'A', 'B', 'T'],
      edges: [
        {from: 'S', to: 'T', weight: 9}, {from: 'S', to: 'A', weight: 2},
        {from: 'A', to: 'B', weight: 1}, {from: 'B', to: 'T', weight: 2}
      ]
    },
    positions: {S: [65, 250], A: [235, 80], B: [425, 80], T: [600, 250]}
  },
  {
    id: 'ties', title: 'Two routes can be equally short',
    description: 'A and B tie at distance 2. Alphabetical order makes this trace reproducible; both routes still cost 5.',
    source: 'S', target: 'T',
    graph: {
      nodes: ['S', 'A', 'B', 'T'],
      edges: [
        {from: 'S', to: 'A', weight: 2}, {from: 'S', to: 'B', weight: 2},
        {from: 'A', to: 'T', weight: 3}, {from: 'B', to: 'T', weight: 3}
      ]
    },
    positions: {S: [65, 185], A: [330, 65], B: [330, 305], T: [600, 185]}
  },
  {
    id: 'zero-unreachable', title: 'Zero is allowed; unreachable is different',
    description: 'S → A costs zero. X has no incoming route from S and is unreachable when the frontier empties.',
    source: 'S', target: 'X',
    graph: {
      nodes: ['S', 'A', 'B', 'T', 'X'],
      edges: [
        {from: 'S', to: 'A', weight: 0}, {from: 'A', to: 'B', weight: 2},
        {from: 'S', to: 'B', weight: 5}, {from: 'B', to: 'T', weight: 1}
      ]
    },
    positions: {S: [65, 165], A: [235, 65], B: [415, 165], T: [600, 165], X: [330, 305]}
  }
]);
