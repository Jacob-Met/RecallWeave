/** Original bounded augmenting-path trace for RecallWeave.
 * Background: Michel X. Goemans, MIT 18.433 (2015), matching-notes.pdf.
 * No reference implementation or exercise is copied.
 */
export const MATCHING_LIMITS = Object.freeze({side: 6, edges: 36, labelLength: 12});
const matchingLabel = /^[A-Za-z][A-Za-z0-9_]{0,11}$/;
const pairKey = (left, right) => left + '\0' + right;

function requireText(value, name, limit) {
  if (typeof value !== 'string' || value.length > limit) {
    throw new Error(name + ' must be text of at most ' + limit + ' characters.');
  }
  return value;
}
function labels(text, name) {
  const result = requireText(text, name, 256).trim().split(/[\s,]+/).filter(Boolean);
  if (result.length < 1 || result.length > MATCHING_LIMITS.side) {
    throw new Error(name + ' needs 1–6 labels.');
  }
  if (result.some(label => !matchingLabel.test(label))) {
    throw new Error('Labels must start with an ASCII letter and contain at most 12 ASCII letters, digits or underscores.');
  }
  if (new Set(result).size !== result.length) throw new Error(name + ' contains a repeated label.');
  return result;
}
function edgeLines(text, name, limit) {
  const lines = requireText(text, name, 4096).split(/\r?\n/);
  const result = [];
  for (let index = 0; index < lines.length; index++) {
    if (!lines[index].trim()) continue;
    const fields = lines[index].trim().split(/\s+/);
    if (fields.length !== 2) throw new Error(name + ', line ' + (index + 1) + ': enter one left label and one right label.');
    result.push(fields);
  }
  if (result.length > limit) throw new Error(name + ' permits at most ' + limit + ' lines.');
  return result;
}

/** Labels are globally unique; edge IDs preserve entered edge order. */
export function parseBipartiteInput(leftText, rightText, edgesText, matchingText = '') {
  const left = labels(leftText, 'Left side');
  const right = labels(rightText, 'Right side');
  if (new Set([...left, ...right]).size !== left.length + right.length) {
    throw new Error('A label cannot appear on both sides. Use a distinct name for every vertex.');
  }
  const edges = edgeLines(edgesText, 'Edges', MATCHING_LIMITS.edges).map(([l, r], index) => ({
    id: 'e' + (index + 1), left: l, right: r
  }));
  const byPair = new Map(edges.map(edge => [pairKey(edge.left, edge.right), edge.id]));
  const initialMatching = edgeLines(matchingText, 'Starting matching', MATCHING_LIMITS.side).map(([l, r]) => {
    const id = byPair.get(pairKey(l, r));
    if (!id) throw new Error('Starting pair ' + l + '–' + r + ' is not an entered edge.');
    return id;
  });
  return validateBipartiteGraph({left, right, edges, initialMatching});
}

/** Validate public API inputs as well as UI-parsed inputs; never mutate the caller. */
export function validateBipartiteGraph(graph) {
  if (!graph || typeof graph !== 'object' || Array.isArray(graph)) throw new Error('A bipartite graph object is required.');
  for (const side of ['left', 'right']) {
    if (!Array.isArray(graph[side]) || graph[side].length < 1 || graph[side].length > 6 ||
        [...graph[side]].some(label => typeof label !== 'string' || !matchingLabel.test(label))) {
      throw new Error('Each side needs 1–6 valid ASCII labels.');
    }
  }
  const left = [...graph.left], right = [...graph.right];
  if (new Set([...left, ...right]).size !== left.length + right.length) throw new Error('Every vertex label must be globally distinct.');
  if (!Array.isArray(graph.edges) || graph.edges.length > 36) throw new Error('Enter at most 36 edges.');
  const leftSet = new Set(left), rightSet = new Set(right), pairs = new Set();
  const edges = [...graph.edges].map((edge, index) => {
    if (!edge || edge.id !== 'e' + (index + 1) || !leftSet.has(edge.left) || !rightSet.has(edge.right)) {
      throw new Error('Edge ' + (index + 1) + ' must join an entered left label to an entered right label and retain its sequential ID.');
    }
    const key = pairKey(edge.left, edge.right);
    if (pairs.has(key)) throw new Error('Repeated edge ' + edge.left + '–' + edge.right + '.');
    pairs.add(key);
    return {id: edge.id, left: edge.left, right: edge.right};
  });
  if (!Array.isArray(graph.initialMatching) || graph.initialMatching.length > 6) throw new Error('A starting matching must be an array of at most six edge IDs.');
  const initial = new Set(graph.initialMatching);
  if (initial.size !== graph.initialMatching.length) throw new Error('The starting matching repeats an edge.');
  const edgeById = new Map(edges.map(edge => [edge.id, edge]));
  const endpoints = new Set();
  for (const id of graph.initialMatching) {
    const edge = edgeById.get(id);
    if (!edge) throw new Error('The starting matching contains an unknown edge.');
    if (endpoints.has(edge.left) || endpoints.has(edge.right)) throw new Error('Starting matching pairs cannot share a vertex.');
    endpoints.add(edge.left); endpoints.add(edge.right);
  }
  return {left, right, edges, initialMatching: edges.filter(edge => initial.has(edge.id)).map(edge => edge.id)};
}

/** Multi-source BFS in the alternating orientation; each flip is one atomic event.
 * Eligible outgoing arcs alone are counted, once each time that arc is examined.
 * These counters describe this run; they are not a sorting or asymptotic work count.
 */
export function traceBipartiteMatching(input) {
  const graph = validateBipartiteGraph(input);
  const {left, right, edges} = graph;
  const leftSet = new Set(left), rightSet = new Set(right);
  let matching = new Set(graph.initialMatching);
  let round = 0, inspections = 0, augmentations = 0;
  let roots = [], reached = new Set(), queue = [], cursor = 0;
  const events = [];
  const orderedMatching = () => edges.filter(edge => matching.has(edge.id)).map(edge => edge.id);
  const matchedVertices = () => {
    const result = new Set();
    for (const edge of edges) if (matching.has(edge.id)) { result.add(edge.left); result.add(edge.right); }
    return result;
  };
  function emit(kind, message, details = {}) {
    const used = matchedVertices();
    const event = {
      index: events.length, kind, round, message,
      matching: orderedMatching(), size: matching.size,
      augmentations, arcInspections: inspections,
      roots: [...roots], queue: queue.slice(cursor),
      reachedLeft: left.filter(vertex => reached.has(vertex)),
      reachedRight: right.filter(vertex => reached.has(vertex)),
      freeLeft: left.filter(vertex => !used.has(vertex)),
      freeRight: right.filter(vertex => !used.has(vertex)),
      current: null, edge: null, from: null, to: null, path: [], added: [], removed: [],
      ...details
    };
    events.push(event);
    if (events.length > 1000) throw new Error('The bounded trace exceeded its event limit.');
  }
  emit('initial', 'The starting matching contains ' + matching.size + ' pair(s). No two selected pairs share a vertex.');
  while (true) {
    round++;
    const used = matchedVertices();
    roots = left.filter(vertex => !used.has(vertex));
    reached = new Set(roots); queue = [...roots]; cursor = 0;
    const parents = new Map();
    emit('search-start', roots.length
      ? 'Start a fresh breadth-first search from every free left vertex: ' + roots.join(', ') + '. Unmatched edges point left to right; matched edges point right to left.'
      : 'Every left vertex is already matched. There is no free left endpoint from which an augmenting path could start.');
    let found = null;
    while (cursor < queue.length && found === null) {
      const vertex = queue[cursor++];
      emit('dequeue', 'Explore ' + vertex + '. Follow only outgoing arcs in the current alternating orientation.', {current: vertex});
      const outgoing = edges.filter(edge => leftSet.has(vertex)
        ? edge.left === vertex && !matching.has(edge.id)
        : edge.right === vertex && matching.has(edge.id));
      for (const edge of outgoing) {
        const destination = leftSet.has(vertex) ? edge.right : edge.left;
        inspections++;
        const arc = {edgeId: edge.id, from: vertex, to: destination, inMatchingBefore: matching.has(edge.id)};
        emit('inspect', 'Inspect ' + vertex + ' → ' + destination + ' along ' + (matching.has(edge.id) ? 'a matched edge, right to left.' : 'an unmatched edge, left to right.'),
          {current: vertex, edge: edge.id, from: vertex, to: destination});
        if (reached.has(destination)) {
          emit('already-reached', destination + ' is already reached in this search. Keep its first parent and do not enqueue it again.',
            {current: vertex, edge: edge.id, from: vertex, to: destination});
          continue;
        }
        reached.add(destination);
        parents.set(destination, arc);
        if (rightSet.has(destination) && !used.has(destination)) {
          const path = [];
          let end = destination;
          while (parents.has(end)) {
            const step = parents.get(end);
            path.unshift({...step}); end = step.from;
          }
          found = path;
          const added = path.filter(step => !step.inMatchingBefore).map(step => step.edgeId);
          const removed = path.filter(step => step.inMatchingBefore).map(step => step.edgeId);
          emit('path-found', 'A free right endpoint is reached. This alternating path starts and ends free. It adds ' + added.length + ' edge(s) and removes ' + removed.length + ', so a whole-path flip will increase the matching size by one.',
            {current: destination, edge: edge.id, from: vertex, to: destination, path, added, removed});
          break;
        }
        queue.push(destination);
        emit('discover', 'Reach ' + destination + ' for the first time and append it to the queue.',
          {current: destination, edge: edge.id, from: vertex, to: destination});
      }
    }
    if (found === null) {
      emit('maximum', roots.length
        ? 'The search from every free left vertex is exhausted without reaching a free right vertex. No augmenting path exists, so the matching of size ' + matching.size + ' is maximum.'
        : 'The matching covers every left vertex, so no matching can contain more pairs. Its size ' + matching.size + ' is maximum.');
      break;
    }
    const added = found.filter(step => !step.inMatchingBefore).map(step => step.edgeId);
    const removed = found.filter(step => step.inMatchingBefore).map(step => step.edgeId);
    const before = matching.size;
    const next = new Set(matching);
    for (const id of removed) next.delete(id);
    for (const id of added) next.add(id);
    const checked = validateBipartiteGraph({...graph, initialMatching: [...next]});
    if (checked.initialMatching.length !== before + 1) throw new Error('An augmenting path must increase matching size by exactly one.');
    matching = new Set(checked.initialMatching); augmentations++;
    emit('augment', 'Flip the whole path at once: remove ' + (removed.join(', ') || 'no edges') + '; add ' + added.join(', ') + '. The new matching has ' + matching.size + ' pair(s), and remains valid. The next search starts with fresh reachability.',
      {path: found.map(step => ({...step})), added, removed});
  }
  return {
    format: 'recallweave-bipartite-matching-trace/1',
    graph, events, initialSize: graph.initialMatching.length,
    finalMatching: orderedMatching(), maxSize: matching.size,
    augmentations, arcInspections: inspections
  };
}
