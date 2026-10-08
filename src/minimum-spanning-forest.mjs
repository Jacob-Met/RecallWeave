/** Original bounded Kruskal trace for the standalone course explorer. */
function integer(value, low, high, label) {
  if (!Number.isInteger(value) || value < low || value > high) {
    throw new Error(label + ' must be a whole number from ' + low + ' to ' + high + '.');
  }
  return value;
}

function checkedGraph(vertexCount, edges) {
  integer(vertexCount, 1, 8, 'Vertex count');
  if (!Array.isArray(edges) || edges.length > vertexCount * (vertexCount - 1) / 2) {
    throw new Error('Use a simple undirected graph with at most one edge per vertex pair.');
  }
  const pairs = new Set();
  const copied = [];
  for (let id = 0; id < edges.length; id++) {
    if (!Object.hasOwn(edges, id)) throw new Error('The edge list must not contain missing entries.');
    const edge = edges[id];
    if (!edge || typeof edge !== 'object' || Array.isArray(edge)) {
      throw new Error('Edge ' + (id + 1) + ' must have from, to and weight values.');
    }
    const from = integer(edge.from, 0, vertexCount - 1, 'Edge ' + (id + 1) + ' start');
    const to = integer(edge.to, 0, vertexCount - 1, 'Edge ' + (id + 1) + ' end');
    const weight = integer(edge.weight, -99, 99, 'Edge ' + (id + 1) + ' weight');
    if (from === to) throw new Error('Edge ' + (id + 1) + ' joins a vertex to itself.');
    const pair = Math.min(from, to) + ':' + Math.max(from, to);
    if (pairs.has(pair)) throw new Error('Edge ' + (id + 1) + ' repeats an unordered vertex pair.');
    pairs.add(pair);
    copied.push(Object.freeze({ id, from, to, weight }));
  }
  return copied;
}

/** Return a detached, immutable decision trace; never change caller data. */
export function traceMinimumSpanningForest(vertexCount, edges) {
  const copied = checkedGraph(vertexCount, edges);
  const ordered = [...copied].sort((a, b) => a.weight - b.weight || a.id - b.id);
  const parent = Array.from({ length: vertexCount }, (_, vertex) => vertex);
  const find = vertex => {
    while (parent[vertex] !== vertex) {
      parent[vertex] = parent[parent[vertex]];
      vertex = parent[vertex];
    }
    return vertex;
  };
  const components = () => {
    const groups = new Map();
    for (let vertex = 0; vertex < vertexCount; vertex++) {
      const root = find(vertex);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root).push(vertex);
    }
    return Object.freeze([...groups.values()]
      .sort((a, b) => a[0] - b[0]).map(group => Object.freeze(group)));
  };
  const selected = [];
  const steps = [];
  let totalWeight = 0;
  for (const edge of ordered) {
    const beforeComponents = components();
    const left = find(edge.from), right = find(edge.to);
    const accepted = left !== right;
    if (accepted) {
      parent[right] = left;
      selected.push(edge.id);
      totalWeight += edge.weight;
    }
    steps.push(Object.freeze({
      number: steps.length + 1,
      edgeId: edge.id,
      from: edge.from,
      to: edge.to,
      weight: edge.weight,
      accepted,
      beforeComponents,
      afterComponents: components(),
      acceptedEdgeIds: Object.freeze([...selected]),
      totalWeight
    }));
  }
  const finalComponents = components();
  return Object.freeze({
    format: 'recallweave.minimum-spanning-forest-trace/1',
    vertexCount,
    edges: Object.freeze(copied),
    orderedEdgeIds: Object.freeze(ordered.map(edge => edge.id)),
    steps: Object.freeze(steps),
    forestEdgeIds: Object.freeze([...selected]),
    totalWeight,
    components: finalComponents,
    connected: finalComponents.length === 1,
    decisions: steps.length
  });
}

/** Parse the explorer's explicit vertex count and one-edge-per-line notation. */
export function parseForestInput(vertexCountText, edgeText) {
  if (typeof vertexCountText !== 'string' || !/^[1-8]$/.test(vertexCountText.trim())) {
    throw new Error('Choose a vertex count from 1 to 8.');
  }
  if (typeof edgeText !== 'string') throw new Error('Enter one edge per line, for example A B -3.');
  const vertexCount = Number(vertexCountText.trim());
  const edges = [];
  const lines = edgeText.split(/\r\n|\n|\r/);
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].trim();
    if (!line) continue;
    const match = /^([A-Ha-h])[ \t]+([A-Ha-h])[ \t]+([+-]?\d+)$/.exec(line);
    if (!match) throw new Error('Line ' + (index + 1) + ': use two vertex letters and an integer weight, such as A B -3.');
    edges.push({
      from: match[1].toUpperCase().charCodeAt(0) - 65,
      to: match[2].toUpperCase().charCodeAt(0) - 65,
      weight: Number(match[3])
    });
  }
  checkedGraph(vertexCount, edges);
  return { vertexCount, edges };
}
