/** Bounded, synchronous Bellman–Ford teaching traces; no I/O or learner state. */
export const MAX_GRAPH_BYTES = 32768;
const FORMAT = 'recallweave-negative-weight-paths-trace/1';
const ALGORITHM = 'Synchronous Bellman–Ford with at-most-k-edge rounds';

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function record(value, fields, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    throw new Error(label + ' must be a plain object.');
  }
  const keys = Reflect.ownKeys(value);
  if (keys.length !== fields.length || keys.some(key => !fields.includes(key)) ||
      fields.some(key => !Object.hasOwn(value, key) ||
        !Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value'))) {
    throw new Error(label + ' must contain exactly ' + fields.join(', ') + ' as data fields.');
  }
}

/** Copy the admitted numeric graph; preserve declared vertex and edge order. */
export function validateNegativeGraph(input) {
  record(input, ['nodes', 'edges', 'source'], 'Graph');
  if (!Array.isArray(input.nodes) || input.nodes.length < 1 || input.nodes.length > 7) {
    throw new Error('Use 1–7 vertices.');
  }
  const nodes = [...input.nodes];
  if (nodes.some(node => typeof node !== 'string' || !/^[A-Z][A-Z0-9]{0,7}$/.test(node)) ||
      new Set(nodes).size !== nodes.length) {
    throw new Error('Vertex names must be unique uppercase identifiers of at most 8 characters.');
  }
  if (typeof input.source !== 'string' || !nodes.includes(input.source)) {
    throw new Error('Choose a source in the graph.');
  }
  if (!Array.isArray(input.edges) || input.edges.length > 49) {
    throw new Error('Use at most 49 directed edges.');
  }
  const pairs = new Set();
  const edges = Array.from(input.edges, (edge, index) => {
    record(edge, ['from', 'to', 'weight'], 'Edge ' + index);
    if (!nodes.includes(edge.from) || !nodes.includes(edge.to)) {
      throw new Error('Edge ' + index + ' needs known endpoints.');
    }
    if (!Number.isInteger(edge.weight) || edge.weight < -50 || edge.weight > 50) {
      throw new Error('Edge ' + index + ' weight must be an integer from -50 through 50.');
    }
    const pair = edge.from + ':' + edge.to;
    if (pairs.has(pair)) throw new Error('Duplicate directed edge ' + edge.from + ' → ' + edge.to + '.');
    pairs.add(pair);
    return { from: edge.from, to: edge.to, weight: edge.weight === 0 ? 0 : edge.weight };
  });
  return freeze({ nodes, edges, source: input.source });
}

export function parseNegativeGraph(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).byteLength > MAX_GRAPH_BYTES) {
    throw new Error('Use UTF-8 JSON no larger than 32768 bytes.');
  }
  let input;
  try { input = JSON.parse(text); }
  catch { throw new Error('Input must be one valid JSON graph object.'); }
  return validateNegativeGraph(input);
}

/** Round k uses only round k−1: every displayed walk has at most k edges. */
export function analyzeNegativePaths(input) {
  const graph = validateNegativeGraph(input);
  const { nodes, edges, source } = graph;
  const initial = {
    edgesAllowed: 0,
    distances: Object.fromEntries(nodes.map(node => [node, node === source ? 0 : null])),
    paths: Object.fromEntries(nodes.map(node => [node, node === source ? [source] : null])),
    relaxations: []
  };
  const rounds = [freeze(initial)];
  for (let k = 1; k <= nodes.length; k++) {
    const previous = rounds[k - 1];
    const distances = { ...previous.distances };
    const paths = { ...previous.paths };
    const relaxations = [];
    edges.forEach((edge, edgeIndex) => {
      const sourceDistance = previous.distances[edge.from];
      const before = distances[edge.to];
      const candidate = sourceDistance === null ? null : sourceDistance + edge.weight;
      let reason = 'unreached-source';
      if (candidate !== null) {
        if (before === null || candidate < before) {
          distances[edge.to] = candidate;
          paths[edge.to] = [...previous.paths[edge.from], edge.to];
          reason = 'improved';
        } else reason = candidate === before ? 'equal-kept' : 'not-better';
      }
      relaxations.push({
        edgeIndex, from: edge.from, to: edge.to, weight: edge.weight,
        sourceDistance, candidate, before, after: distances[edge.to], reason
      });
    });
    rounds.push(freeze({ edgesAllowed: k, distances, paths, relaxations }));
  }
  const lastFiniteRound = rounds[nodes.length - 1];
  const finalRound = rounds[nodes.length];
  const witnesses = nodes.filter(node => finalRound.distances[node] !== null &&
    (lastFiniteRound.distances[node] === null ||
      finalRound.distances[node] < lastFiniteRound.distances[node]));
  const reached = new Set(witnesses);
  const queue = [...witnesses];
  for (let i = 0; i < queue.length; i++) {
    for (const edge of edges) {
      if (edge.from === queue[i] && !reached.has(edge.to)) {
        reached.add(edge.to);
        queue.push(edge.to);
      }
    }
  }
  const affected = nodes.filter(node => reached.has(node));
  const results = Object.fromEntries(nodes.map(node => {
    if (reached.has(node)) return [node, { status: 'unbounded-below', distance: null, path: null }];
    if (lastFiniteRound.distances[node] === null) return [node, { status: 'unreachable', distance: null, path: null }];
    return [node, {
      status: 'finite', distance: lastFiniteRound.distances[node], path: lastFiniteRound.paths[node]
    }];
  }));
  return freeze({
    format: FORMAT, algorithm: ALGORITHM,
    graph: { nodes, edges }, source, rounds, witnesses, affected, results
  });
}

/** Render a report produced by analyzeNegativePaths; no output-file side effects. */
export function formatNegativePaths(report) {
  if (!report || report.format !== FORMAT) throw new Error('Expected a negative-weight paths trace.');
  const nodes = report.graph.nodes;
  const width = Math.max(7, ...nodes.map(node => node.length));
  const cell = value => String(value).padStart(width);
  const lines = [
    'Negative-weight paths from ' + report.source,
    'Synchronous Bellman–Ford: row k allows at most k edges.',
    'An unreached round entry is not a final unbounded/unreachable classification.',
    '',
    'k'.padStart(3) + nodes.map(cell).join(''),
    ...report.rounds.map(round => String(round.edgesAllowed).padStart(3) +
      nodes.map(node => cell(round.distances[node] === null ? '—' : round.distances[node])).join('')),
    '',
    'Improvement witnesses: ' + (report.witnesses.join(', ') || 'none'),
    'Unbounded-below descendants (including witnesses): ' + (report.affected.join(', ') || 'none'),
    '', 'Final results:'
  ];
  for (const node of nodes) {
    const result = report.results[node];
    lines.push(result.status === 'finite'
      ? node + ': finite ' + result.distance + ' via ' + result.path.join(' → ')
      : node + ': ' + result.status + '; no finite shortest route');
  }
  lines.push('', 'This is a teaching trace, not a saved learner session.');
  return lines.join('\n') + '\n';
}
