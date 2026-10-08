/** Deterministic small directed-capacity networks for the optional teaching explorer. */
export const LIMITS = Object.freeze({ vertices: 8, capacity: 99, text: 8192 });

function freeze(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

export const PRESETS = freeze([
  {
    id: "reroute", title: "A route that must be revised",
    note: "The first path uses A → C. A later residual path cancels that assignment so both source branches can reach T.",
    vertices: ["S", "A", "B", "C", "D", "T"], source: "S", sink: "T",
    edges: [
      { from: "S", to: "A", capacity: 1 }, { from: "S", to: "B", capacity: 1 },
      { from: "A", to: "C", capacity: 1 }, { from: "A", to: "D", capacity: 1 },
      { from: "B", to: "C", capacity: 1 }, { from: "C", to: "T", capacity: 1 },
      { from: "D", to: "T", capacity: 1 }
    ]
  },
  {
    id: "bottleneck", title: "Find the shared bottleneck",
    note: "Several outgoing source edges do not guarantee the same total can reach the sink. Inspect the final cut.",
    vertices: ["S", "A", "B", "C", "T"], source: "S", sink: "T",
    edges: [
      { from: "S", to: "A", capacity: 7 }, { from: "S", to: "B", capacity: 6 },
      { from: "A", to: "C", capacity: 4 }, { from: "B", to: "C", capacity: 3 },
      { from: "C", to: "T", capacity: 5 }, { from: "B", to: "T", capacity: 1 }
    ]
  },
  {
    id: "opposite", title: "Opposite edges keep their identities",
    note: "A → B and B → A are two original edges. A cancellation arc for A → B is a separate residual option from using B → A.",
    vertices: ["S", "A", "B", "T"], source: "S", sink: "T",
    edges: [
      { from: "S", to: "A", capacity: 4 }, { from: "A", to: "S", capacity: 2 },
      { from: "A", to: "B", capacity: 3 }, { from: "B", to: "A", capacity: 5 },
      { from: "B", to: "T", capacity: 4 }, { from: "S", to: "B", capacity: 1 },
      { from: "A", to: "T", capacity: 1 }
    ]
  },
  {
    id: "disconnected", title: "No route is still a complete result",
    note: "A zero-capacity edge offers no residual route. A completed maximum flow can be zero.",
    vertices: ["S", "A", "T"], source: "S", sink: "T",
    edges: [{ from: "S", to: "A", capacity: 8 }, { from: "A", to: "T", capacity: 0 }]
  }
]);

export function validateNetwork(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Network must be an object.");
  if (!Array.isArray(value.vertices) || value.vertices.length < 2 || value.vertices.length > LIMITS.vertices) {
    throw new Error("Use 2–8 vertices.");
  }
  const vertices = value.vertices.map(vertex => {
    if (typeof vertex !== "string" || !/^[A-Za-z][A-Za-z0-9_]{0,11}$/.test(vertex)) {
      throw new Error("Vertex names need 1–12 letters, digits or underscores, starting with a letter.");
    }
    return vertex;
  });
  if (new Set(vertices).size !== vertices.length) throw new Error("Vertex names must be distinct and are case-sensitive.");
  if (!vertices.includes(value.source) || !vertices.includes(value.sink) || value.source === value.sink) {
    throw new Error("Choose different source and sink vertices from the list.");
  }
  if (!Array.isArray(value.edges) || value.edges.length > vertices.length * (vertices.length - 1)) {
    throw new Error("Use at most one edge for each ordered pair of different vertices.");
  }
  const seen = new Set();
  const edges = value.edges.map((edge, index) => {
    if (!edge || typeof edge !== "object" || Array.isArray(edge) ||
        !vertices.includes(edge.from) || !vertices.includes(edge.to) || edge.from === edge.to) {
      throw new Error("Every edge needs two different listed vertices.");
    }
    const key = edge.from + "\0" + edge.to;
    if (seen.has(key)) throw new Error("Duplicate directed edge: " + edge.from + " → " + edge.to + ".");
    seen.add(key);
    if (!Number.isInteger(edge.capacity) || edge.capacity < 0 || edge.capacity > LIMITS.capacity) {
      throw new Error("Capacities must be whole numbers from 0 to 99.");
    }
    return { id: "e" + (index + 1), from: edge.from, to: edge.to, capacity: edge.capacity };
  });
  return freeze({ vertices, source: value.source, sink: value.sink, edges });
}

export function parseNetwork(verticesText, edgesText, source, sink) {
  if (typeof verticesText !== "string" || typeof edgesText !== "string" ||
      verticesText.length > LIMITS.text || edgesText.length > LIMITS.text) throw new Error("Network text is too long.");
  const vertices = verticesText.trim() ? verticesText.trim().split(/[\s,]+/) : [];
  const edges = [];
  for (const [index, line] of edgesText.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    const fields = line.trim().split(/\s+/);
    if (fields.length !== 3 || !/^(0|[1-9][0-9]*)$/.test(fields[2])) {
      throw new Error("Edge line " + (index + 1) + " must be: FROM TO CAPACITY, using an integer from 0 to 99.");
    }
    edges.push({ from: fields[0], to: fields[1], capacity: Number(fields[2]) });
  }
  return validateNetwork({ vertices, edges, source, sink });
}

export function networkText(network) {
  const checked = validateNetwork(network);
  return {
    vertices: checked.vertices.join(", "),
    edges: checked.edges.map(edge => edge.from + " " + edge.to + " " + edge.capacity).join("\n"),
    source: checked.source, sink: checked.sink
  };
}

function residualArcs(network, flows) {
  const arcs = [];
  network.edges.forEach((edge, index) => {
    if (edge.capacity > flows[index]) arcs.push({
      from: edge.from, to: edge.to, edgeId: edge.id, edgeIndex: index,
      direction: 1, available: edge.capacity - flows[index]
    });
    if (flows[index] > 0) arcs.push({
      from: edge.to, to: edge.from, edgeId: edge.id, edgeIndex: index,
      direction: -1, available: flows[index]
    });
  });
  const order = new Map(network.vertices.map((vertex, index) => [vertex, index]));
  return arcs.sort((a, b) =>
    order.get(a.from) - order.get(b.from) || order.get(a.to) - order.get(b.to) ||
    b.direction - a.direction || a.edgeIndex - b.edgeIndex);
}

function search(network, arcs) {
  const reached = new Set([network.source]);
  const queue = [network.source], parent = new Map();
  for (let next = 0; next < queue.length; next++) {
    const from = queue[next];
    for (const arc of arcs) {
      if (arc.from !== from || reached.has(arc.to)) continue;
      reached.add(arc.to);
      queue.push(arc.to);
      parent.set(arc.to, arc);
      if (arc.to === network.sink) {
        const path = [];
        for (let at = network.sink; at !== network.source; at = parent.get(at).from) path.push(parent.get(at));
        return { path: path.reverse(), reached: queue };
      }
    }
  }
  return { path: null, reached: queue };
}

function snapshot(network, flows, kind, sequence, path = [], bottleneck = 0, changes = [], reachable = null) {
  const edges = network.edges.map((edge, index) => ({ ...edge, flow: flows[index] }));
  const balances = network.vertices.map(vertex => ({
    vertex,
    incoming: edges.filter(edge => edge.to === vertex).reduce((sum, edge) => sum + edge.flow, 0),
    outgoing: edges.filter(edge => edge.from === vertex).reduce((sum, edge) => sum + edge.flow, 0)
  }));
  balances.forEach(balance => { balance.netOut = balance.outgoing - balance.incoming; });
  const value = balances.find(balance => balance.vertex === network.source).netOut;
  const sinkValue = -balances.find(balance => balance.vertex === network.sink).netOut;
  if (value !== sinkValue || edges.some(edge => edge.flow < 0 || edge.flow > edge.capacity) ||
      balances.some(balance => balance.vertex !== network.source && balance.vertex !== network.sink && balance.netOut !== 0)) {
    throw new Error("Internal flow invariant failed.");
  }
  let cut = null;
  if (reachable) {
    const side = new Set(reachable);
    const outward = edges.filter(edge => side.has(edge.from) && !side.has(edge.to));
    const inward = edges.filter(edge => !side.has(edge.from) && side.has(edge.to));
    cut = {
      sourceSide: network.vertices.filter(vertex => side.has(vertex)),
      sinkSide: network.vertices.filter(vertex => !side.has(vertex)),
      edgeIds: outward.map(edge => edge.id),
      capacity: outward.reduce((sum, edge) => sum + edge.capacity, 0),
      netFlow: outward.reduce((sum, edge) => sum + edge.flow, 0) - inward.reduce((sum, edge) => sum + edge.flow, 0)
    };
    if (side.has(network.sink) || cut.capacity !== value || cut.netFlow !== value) throw new Error("Internal cut certificate failed.");
  }
  return freeze({
    kind, sequence, value, edges, balances,
    path: path.map(arc => ({ ...arc })), bottleneck,
    changes: changes.map(change => ({ ...change })), residual: residualArcs(network, flows), cut
  });
}

export function solveNetwork(value) {
  const network = validateNetwork(value);
  const flows = network.edges.map(() => 0);
  const steps = [snapshot(network, flows, "initial", 0)];
  const sourceBound = network.edges.filter(edge => edge.from === network.source).reduce((sum, edge) => sum + edge.capacity, 0);
  let total = 0;
  for (;;) {
    const found = search(network, residualArcs(network, flows));
    if (!found.path) {
      steps.push(snapshot(network, flows, "complete", steps.length, [], 0, [], found.reached));
      break;
    }
    const bottleneck = Math.min(...found.path.map(arc => arc.available));
    if (!Number.isInteger(bottleneck) || bottleneck <= 0 || total + bottleneck > sourceBound) {
      throw new Error("Internal augmentation progress failed.");
    }
    const changes = found.path.map(arc => {
      const before = flows[arc.edgeIndex];
      flows[arc.edgeIndex] += arc.direction * bottleneck;
      return { edgeId: arc.edgeId, before, after: flows[arc.edgeIndex], delta: arc.direction * bottleneck };
    });
    total += bottleneck;
    steps.push(snapshot(network, flows, "augment", steps.length, found.path, bottleneck, changes));
  }
  return freeze({
    format: "recallweave-network-flow-trace/1",
    algorithm: "Edmonds–Karp: breadth-first residual augmenting paths",
    tieOrder: "Vertex-list order; forward use before cancellation to the same next vertex; then original edge order.",
    network, steps, maximumFlow: total, augmentationCount: steps.length - 2
  });
}

export function observationJSON(result, selectedStep) {
  if (!result || !result.network || !Number.isInteger(selectedStep)) throw new Error("Choose an existing trace step.");
  const fresh = solveNetwork(result.network);
  if (selectedStep < 0 || selectedStep >= fresh.steps.length) throw new Error("Choose an existing trace step.");
  return JSON.stringify({
    format: "recallweave-network-flow-observation/1",
    interpretation: "An exact small directed integer-capacity teaching network, not a measured physical system.",
    selectedStep, trace: fresh
  }, null, 2) + "\n";
}
