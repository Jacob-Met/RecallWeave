// Independently authored by hamon-2983fe20e77b-thinkpad.
// Enumerate choices for each left vertex, including unmatched. No augmenting paths.
export function allMatchings(left, edges) {
  const result = [];
  function visit(index, usedRight, chosen) {
    if (index === left.length) { result.push([...chosen]); return; }
    visit(index + 1, usedRight, chosen);
    for (const edge of edges) {
      if (edge.left !== left[index] || usedRight.has(edge.right)) continue;
      usedRight.add(edge.right); chosen.push(edge.id);
      visit(index + 1, usedRight, chosen);
      chosen.pop(); usedRight.delete(edge.right);
    }
  }
  visit(0, new Set(), []);
  return result;
}
export function maximumSize(left, edges) {
  return Math.max(...allMatchings(left, edges).map(ids => ids.length));
}
export function shortestAugmentingLength(graph, matching) {
  // Repeated relaxation gives path lengths without reproducing the author's queue.
  const selected = new Set(matching);
  const occupiedLeft = new Set(graph.edges.filter(e => selected.has(e.id)).map(e => e.left));
  const occupiedRight = new Set(graph.edges.filter(e => selected.has(e.id)).map(e => e.right));
  let distances = new Map(graph.left.filter(v => !occupiedLeft.has(v)).map(v => [v, 0]));
  const arcs = graph.edges.map(e => selected.has(e.id) ? [e.right, e.left] : [e.left, e.right]);
  for (let i = 0; i < graph.left.length + graph.right.length; i++) {
    const next = new Map(distances);
    for (const [from, to] of arcs) {
      if (distances.has(from)) next.set(to, Math.min(next.get(to) ?? Infinity, distances.get(from) + 1));
    }
    distances = next;
  }
  return Math.min(Infinity, ...graph.right.filter(v => !occupiedRight.has(v)).map(v => distances.get(v) ?? Infinity));
}
