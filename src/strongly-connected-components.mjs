/** Bounded, deterministic Kosaraju traces for the optional offline lesson. */
export const COMPONENT_LIMITS = Object.freeze({nodes: 12, edges: 36});

const labelPattern = /^[A-Za-z][A-Za-z0-9_]{0,11}$/;
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};

export function validateDirectedGraph(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Supply a directed graph with nodes and edges.');
  }
  if (!Array.isArray(input.nodes) || input.nodes.length < 1 || input.nodes.length > COMPONENT_LIMITS.nodes) {
    throw new Error('Enter 1–12 node names.');
  }
  const nodes = input.nodes.map(name => {
    if (typeof name !== 'string' || !labelPattern.test(name)) {
      throw new Error('Node names must start with a letter and use at most 12 letters, digits or underscores.');
    }
    return name;
  });
  const known = new Set(nodes);
  if (known.size !== nodes.length) throw new Error('Each node name must appear once. Names are case-sensitive.');
  if (!Array.isArray(input.edges) || input.edges.length > COMPONENT_LIMITS.edges) {
    throw new Error('Enter at most 36 directed edges.');
  }
  const seen = new Set();
  const edges = input.edges.map((edge, index) => {
    if (!edge || typeof edge !== 'object' || Array.isArray(edge) || !known.has(edge.from) || !known.has(edge.to)) {
      throw new Error('Edge ' + (index + 1) + ' must use two declared node names.');
    }
    const key = edge.from + '\0' + edge.to;
    if (seen.has(key)) throw new Error('The directed edge ' + edge.from + ' → ' + edge.to + ' is repeated.');
    seen.add(key);
    return {from: edge.from, to: edge.to};
  });
  return freeze({nodes, edges});
}

export function parseDirectedGraph(nodeText, edgeText) {
  if (typeof nodeText !== 'string' || typeof edgeText !== 'string' || nodeText.length > 512 || edgeText.length > 4096) {
    throw new Error('Keep node text within 512 characters and edge text within 4,096 characters.');
  }
  const nodes = nodeText.trim() ? nodeText.trim().split(/\s+/) : [];
  const edges = [];
  for (const [lineIndex, line] of edgeText.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    const words = line.trim().split(/\s+/);
    if (words.length !== 2) throw new Error('Edge line ' + (lineIndex + 1) + ' needs exactly two names, for example: A B');
    edges.push({from: words[0], to: words[1]});
  }
  return validateDirectedGraph({nodes, edges});
}

/** Visit roots in declared order and neighbors in original edge-line order. */
export function traceStrongComponents(input) {
  const graph = validateDirectedGraph(input);
  const outgoing = new Map(graph.nodes.map(node => [node, []]));
  const incoming = new Map(graph.nodes.map(node => [node, []]));
  graph.edges.forEach((edge, index) => {
    outgoing.get(edge.from).push({node: edge.to, edge: index});
    incoming.get(edge.to).push({node: edge.from, edge: index});
  });

  const first = new Map(graph.nodes.map(node => [node, 'unseen']));
  const second = new Map(graph.nodes.map(node => [node, 'unseen']));
  const assigned = new Map(graph.nodes.map(node => [node, null]));
  const discoveryOrder = [], finishOrder = [], components = [], stack = [], events = [];
  let phase = 'forward', firstEdges = 0, secondEdges = 0;
  const emit = (kind, message, focus = {}) => {
    events.push({
      index: events.length, phase, kind, message, ...focus,
      stack: [...stack], discoveryOrder: [...discoveryOrder], finishOrder: [...finishOrder],
      firstState: Object.fromEntries(first), secondState: Object.fromEntries(second),
      componentByNode: Object.fromEntries(assigned), components: components.map(group => [...group]),
      edgeVisits: {forward: firstEdges, transpose: secondEdges}
    });
  };

  emit('start', 'Pass 1 follows the original arrows. Record each node only when its DFS call finishes.');
  const forward = node => {
    first.set(node, 'active');
    stack.push(node);
    discoveryOrder.push(node);
    emit('discover', 'Enter ' + node + ' in the original graph.', {node});
    for (const next of outgoing.get(node)) {
      firstEdges++;
      const unseen = first.get(next.node) === 'unseen';
      emit('edge', 'Inspect ' + node + ' → ' + next.node + (unseen ? '; enter the unseen destination next.' : '; the destination was already discovered.'), {node, edge: next.edge});
      if (unseen) forward(next.node);
    }
    first.set(node, 'finished');
    finishOrder.push(node);
    stack.pop();
    emit('finish', 'Finish ' + node + '; append it at position ' + finishOrder.length + '.', {node});
  };
  for (const node of graph.nodes) {
    if (first.get(node) !== 'unseen') continue;
    emit('root', 'Start a fresh original-graph DFS at ' + node + '.', {node});
    forward(node);
  }

  const rootOrder = [...finishOrder].reverse();
  phase = 'order';
  emit('reverse-order', 'Pass 1 is complete. Reverse its finish list: ' + rootOrder.join(', ') + '. This is the root order for pass 2.');
  phase = 'transpose';
  emit('transpose', 'Reverse every arrow, reset visited marks, and use that root order. Each fresh DFS finds one component.');
  const backward = (node, component) => {
    second.set(node, 'active');
    assigned.set(node, component);
    components[component].push(node);
    stack.push(node);
    emit('discover', 'Assign ' + node + ' to component C' + (component + 1) + '.', {node, component});
    for (const next of incoming.get(node)) {
      secondEdges++;
      const unseen = second.get(next.node) === 'unseen';
      emit('edge', 'Inspect ' + node + ' → ' + next.node + ' in the transpose' + (unseen ? '; it joins the current DFS.' : '; its destination is already assigned.'), {node, edge: next.edge, component});
      if (unseen) backward(next.node, component);
    }
    second.set(node, 'finished');
    stack.pop();
    emit('finish', 'Return from ' + node + ' in the transpose.', {node, component});
  };
  for (const node of rootOrder) {
    if (second.get(node) !== 'unseen') continue;
    const component = components.length;
    components.push([]);
    emit('component-start', 'Start component C' + (component + 1) + ' at the next unassigned root, ' + node + '.', {node, component});
    backward(node, component);
    emit('component-complete', 'Complete C' + (component + 1) + ': ' + components[component].join(', ') + '.', {component});
  }

  const condensed = new Map();
  graph.edges.forEach((edge, index) => {
    const from = assigned.get(edge.from), to = assigned.get(edge.to);
    if (from === to) return;
    const key = from + ':' + to;
    if (!condensed.has(key)) condensed.set(key, {from, to, originalEdges: []});
    condensed.get(key).originalEdges.push(index);
  });
  const result = {
    components: components.map(group => [...group]),
    componentByNode: Object.fromEntries(assigned),
    rootOrder,
    condensationEdges: [...condensed.values()].sort((a, b) => a.from - b.from || a.to - b.to),
    topologicalComponentOrder: components.map((_, index) => index)
  };
  phase = 'done';
  emit('complete', 'Found ' + components.length + ' strongly connected component' + (components.length === 1 ? '' : 's') + '. Collapse each group to obtain a directed acyclic graph.');
  return freeze({
    format: 'recallweave-strong-components-trace/1',
    algorithm: 'Kosaraju: original DFS, then transpose DFS in reverse finish order',
    conventions: {rootOrder: 'declared node order in pass 1', neighborOrder: 'original edge-line order in both passes', componentIds: 'discovery order in pass 2; not persistent identities'},
    graph, events, result,
    counts: {nodes: graph.nodes.length, edges: graph.edges.length, forwardEdgeVisits: firstEdges, transposeEdgeVisits: secondEdges}
  });
}

export function traceComponentsFromText(nodeText, edgeText) {
  const trace = traceStrongComponents(parseDirectedGraph(nodeText, edgeText));
  return freeze({...trace, enteredText: {nodes: nodeText, edges: edgeText}});
}

export const COMPONENT_EXAMPLES = freeze([
  {id: 'bridges', title: 'Two cycles and a one-way bridge', nodes: 'A B C D E F', edges: 'A B\nB C\nC A\nC D\nD E\nE D\nE F'},
  {id: 'order', title: 'Why the root order matters', nodes: 'A B C', edges: 'B A\nA C'},
  {id: 'return', title: 'One return edge joins the groups', nodes: 'A B C D E F', edges: 'A B\nB C\nC A\nC D\nD E\nE D\nE F\nF A'},
  {id: 'separate', title: 'Isolated node, self-loop and cycle', nodes: 'A B C D E', edges: 'A A\nB C\nC B\nD C'}
]);
