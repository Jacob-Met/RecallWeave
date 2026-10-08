// Original bounded undirected edge-coverage model for RecallWeave.
const LABELS = 'ABCDEFGH';
const freeze = value => {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};

export function parseEdgeText(text) {
  if (typeof text !== 'string' || text.length > 4096) {
    throw new Error('Use at most 4,096 characters for the edge list.');
  }
  const edges = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    const match = /^\s*([A-H])\s+([A-H])\s*$/.exec(line);
    if (!match) throw new Error(`Line ${index + 1}: enter two uppercase vertices, for example A B.`);
    edges.push([match[1], match[2]]);
    if (edges.length > 16) throw new Error('Use at most 16 edge rows.');
  }
  return edges;
}

export function analyzeEuler(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Provide a graph with vertexCount, edges, and an optional start.');
  }
  const { vertexCount, edges: pairs, start: requestedStart = 'auto' } = input;
  if (!Number.isInteger(vertexCount) || vertexCount < 1 || vertexCount > 8) {
    throw new Error('Choose a whole number of vertices from 1 to 8.');
  }
  const vertices = [...LABELS.slice(0, vertexCount)];
  if (!Array.isArray(pairs) || pairs.length > 16) {
    throw new Error('Provide an array of 0 to 16 edges.');
  }
  if (requestedStart !== 'auto' && !vertices.includes(requestedStart)) {
    throw new Error(`Start must be Automatic or one of ${vertices.join(', ')}.`);
  }
  const edges = Array.from(pairs, (pair, index) => {
    if (!Array.isArray(pair) || pair.length !== 2 ||
        !vertices.includes(pair[0]) || !vertices.includes(pair[1])) {
      throw new Error(`Edge e${index + 1} must join two declared vertices (${vertices.join(', ')}).`);
    }
    return { id: `e${index + 1}`, from: pair[0], to: pair[1] };
  });
  const degree = Object.fromEntries(vertices.map(vertex => [vertex, 0]));
  const neighbors = Object.fromEntries(vertices.map(vertex => [vertex, new Set()]));
  for (const edge of edges) {
    degree[edge.from] += 1;
    degree[edge.to] += 1;
    neighbors[edge.from].add(edge.to);
    neighbors[edge.to].add(edge.from);
  }
  const degrees = vertices.map(vertex => ({ vertex, degree: degree[vertex] }));
  const oddVertices = vertices.filter(vertex => degree[vertex] % 2 === 1);
  const isolatedVertices = vertices.filter(vertex => degree[vertex] === 0);
  const seen = new Set();
  const components = [];
  for (const vertex of vertices) {
    if (!degree[vertex] || seen.has(vertex)) continue;
    const queue = [vertex];
    seen.add(vertex);
    for (let index = 0; index < queue.length; index += 1) {
      for (const neighbor of neighbors[queue[index]]) {
        if (!seen.has(neighbor)) { seen.add(neighbor); queue.push(neighbor); }
      }
    }
    components.push(queue.sort());
  }
  const start = requestedStart === 'auto'
    ? (oddVertices[0] ?? vertices.find(vertex => degree[vertex] > 0) ?? 'A')
    : requestedStart;
  let graphKind;
  let routeStatus = 'ready';
  let reason;
  if (!edges.length) {
    graphKind = 'empty';
    reason = `There are no edges to cover. The zero-edge walk stays at ${start}; this is reported separately from a positive-edge Euler circuit.`;
  } else if (components.length !== 1) {
    graphKind = 'none'; routeStatus = 'no-route';
    reason = `The edges occupy ${components.length} separate components. A single walk cannot cover them all, even if their degrees are even.`;
  } else if (oddVertices.length !== 0 && oddVertices.length !== 2) {
    graphKind = 'none'; routeStatus = 'no-route';
    reason = `There are ${oddVertices.length} odd-degree vertices (${oddVertices.join(', ')}). Edge coverage needs zero or two.`;
  } else {
    graphKind = oddVertices.length === 2 ? 'trail' : 'circuit';
    if (graphKind === 'trail' && !oddVertices.includes(start)) {
      routeStatus = 'start-ineligible';
      reason = `An open Euler trail exists, but it must start at ${oddVertices.join(' or ')}. The requested start ${start} is ineligible.`;
    } else if (graphKind === 'circuit' && degree[start] === 0) {
      routeStatus = 'start-ineligible';
      reason = `An Euler circuit exists among the edge-bearing vertices, but ${start} is isolated. Choose a vertex with positive degree.`;
    } else if (graphKind === 'trail') {
      reason = `All edges are connected and only ${oddVertices.join(' and ')} have odd degree. Start at ${start} and finish at the other odd vertex.`;
    } else {
      reason = `All edges are connected and every degree is even. A circuit can start and finish at ${start}.`;
    }
  }
  let route = null;
  if (routeStatus === 'ready') {
    // Complete the route before presenting a prefix to the learner.
    const used = new Set();
    const stack = [{ vertex: start, incoming: null }];
    const reverseVertices = [];
    const reverseEdges = [];
    while (stack.length) {
      const current = stack.at(-1).vertex;
      const edge = edges.find(item => !used.has(item.id) &&
        (item.from === current || item.to === current));
      if (edge) {
        used.add(edge.id);
        stack.push({ vertex: edge.from === current ? edge.to : edge.from, incoming: edge.id });
      } else {
        const finished = stack.pop();
        reverseVertices.push(finished.vertex);
        if (finished.incoming !== null) reverseEdges.push(finished.incoming);
      }
    }
    route = { vertices: reverseVertices.reverse(), edgeIds: reverseEdges.reverse() };
    if (route.edgeIds.length !== edges.length || new Set(route.edgeIds).size !== edges.length ||
        route.vertices.length !== edges.length + 1 ||
        route.edgeIds.some((id, index) => {
          const edge = edges.find(item => item.id === id);
          const a = route.vertices[index], b = route.vertices[index + 1];
          return !edge || !((edge.from === a && edge.to === b) || (edge.from === b && edge.to === a));
        })) throw new Error('The constructed route did not pass its edge-identity check.');
  }
  return freeze({
    vertexCount, vertices, edges, degrees, oddVertices, components, isolatedVertices,
    graphKind, requestedStart, start, routeStatus, reason, route
  });
}
