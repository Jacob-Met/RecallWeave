import test from 'node:test';
import assert from 'node:assert/strict';
import {COMPONENT_EXAMPLES, parseDirectedGraph, traceStrongComponents, traceComponentsFromText} from '../src/strongly-connected-components.mjs';

const graph = (nodes, edges) => ({nodes, edges: edges.map(([from, to]) => ({from, to}))});
const groups = result => result.components.map(group => [...group].sort().join(',')).sort();

// Independent definition oracle: transitive closure, with a length-zero path at every node.
function reachability(input) {
  const nodes = input.nodes, index = new Map(nodes.map((name, i) => [name, i]));
  const reachable = nodes.map((_, i) => nodes.map((__, j) => i === j));
  for (const edge of input.edges) reachable[index.get(edge.from)][index.get(edge.to)] = true;
  for (let via = 0; via < nodes.length; via++) for (let from = 0; from < nodes.length; from++) {
    for (let to = 0; to < nodes.length; to++) reachable[from][to] ||= reachable[from][via] && reachable[via][to];
  }
  return reachable;
}

function checkDefinition(input, trace) {
  const reach = reachability(input), result = trace.result;
  assert.equal(result.components.flat().length, input.nodes.length);
  assert.equal(new Set(result.components.flat()).size, input.nodes.length);
  input.nodes.forEach((from, i) => input.nodes.forEach((to, j) => {
    assert.equal(result.componentByNode[from] === result.componentByNode[to], reach[i][j] && reach[j][i], from + '/' + to);
  }));
  const expected = new Map();
  input.edges.forEach((edge, index) => {
    const from = result.componentByNode[edge.from], to = result.componentByNode[edge.to];
    if (from === to) return;
    const key = from + ':' + to;
    if (!expected.has(key)) expected.set(key, []);
    expected.get(key).push(index);
  });
  assert.equal(result.condensationEdges.length, expected.size);
  for (const edge of result.condensationEdges) {
    assert.ok(edge.from < edge.to, 'Component discovery order is a topological order of the condensation.');
    assert.deepEqual(edge.originalEdges, expected.get(edge.from + ':' + edge.to));
  }
  assert.equal(trace.counts.forwardEdgeVisits, input.edges.length);
  assert.equal(trace.counts.transposeEdgeVisits, input.edges.length);
}

test('the worked bridge example has three maximal mutually reachable groups', () => {
  const sample = COMPONENT_EXAMPLES[0];
  const trace = traceComponentsFromText(sample.nodes, sample.edges);
  assert.deepEqual(groups(trace.result), ['A,B,C', 'D,E', 'F']);
  assert.deepEqual(trace.result.condensationEdges.map(e => [e.from, e.to]), [[0, 1], [1, 2]]);
  assert.deepEqual(trace.events.find(e => e.kind === 'reverse-order').finishOrder, ['F', 'E', 'D', 'C', 'B', 'A']);
  checkDefinition(trace.graph, trace);
});

test('one return edge merges the two cycles, bridge and terminal node', () => {
  const sample = COMPONENT_EXAMPLES[2];
  const trace = traceComponentsFromText(sample.nodes, sample.edges);
  assert.deepEqual(groups(trace.result), ['A,B,C,D,E,F']);
  assert.deepEqual(trace.result.condensationEdges, []);
});

test('reverse finish order prevents transpose traversal from joining separate nodes', () => {
  const trace = traceStrongComponents(graph(['A', 'B', 'C'], [['B', 'A'], ['A', 'C']]));
  assert.deepEqual(trace.result.rootOrder, ['B', 'A', 'C']);
  assert.deepEqual(trace.result.components, [['B'], ['A'], ['C']]);
  checkDefinition(trace.graph, trace);
});

test('a common destination does not imply mutual reachability', () => {
  const trace = traceStrongComponents(graph(['A', 'B', 'C'], [['A', 'B'], ['C', 'B']]));
  assert.deepEqual(groups(trace.result), ['A', 'B', 'C']);
});

test('isolated nodes and self-loops remain valid singleton components', () => {
  const sample = COMPONENT_EXAMPLES[3];
  const trace = traceComponentsFromText(sample.nodes, sample.edges);
  assert.deepEqual(groups(trace.result), ['A', 'B,C', 'D', 'E']);
  const single = traceStrongComponents(graph(['Solo'], []));
  assert.deepEqual(single.result.components, [['Solo']]);
  checkDefinition(single.graph, single);
});

test('parallel component edges retain every original edge occurrence', () => {
  const trace = traceStrongComponents(graph(['A', 'B', 'C', 'D'], [['A', 'B'], ['B', 'A'], ['C', 'D'], ['D', 'C'], ['A', 'C'], ['B', 'D']]));
  assert.deepEqual(trace.result.condensationEdges, [{from: 0, to: 1, originalEdges: [4, 5]}]);
});

test('input admission rejects ambiguous, missing and oversized graph records', () => {
  const cases = [
    ['', '', /1–12/], ['A A', '', /once/], ['A B', 'A C', /declared/],
    ['A B', 'A B\nA B', /repeated/], ['A B', 'A -> B', /line 1/],
    ['<A>', '', /start with a letter/], ['A', 'A', /two names/],
    [Array.from({length: 13}, (_, i) => 'N' + i).join(' '), '', /1–12/],
    ['A'.repeat(513), '', /512/], ['A', ' '.repeat(4097), /4,096/]
  ];
  for (const [nodes, edges, expected] of cases) assert.throws(() => parseDirectedGraph(nodes, edges), expected);
  for (const bad of [null, [], {}, {nodes: ['A'], edges: null}, {nodes: ['A'], edges: [{from: 'A'}]}]) {
    assert.throws(() => traceStrongComponents(bad));
  }
  assert.throws(() => traceStrongComponents({nodes: ['A'], edges: Array.from({length: 37}, () => ({from: 'A', to: 'A'}))}), /36/);
});

test('case-sensitive labels and ordinary Object property names keep their identities', () => {
  const trace = traceComponentsFromText('A a constructor toString', 'A a\na A\nconstructor toString');
  assert.deepEqual(groups(trace.result), ['A,a', 'constructor', 'toString']);
  checkDefinition(trace.graph, trace);
});

test('the exact entered text and immutable snapshots survive JSON export', () => {
  const nodes = '  A  B\n', edges = '\nA B\r\nB A\n';
  const trace = traceComponentsFromText(nodes, edges);
  assert.deepEqual(JSON.parse(JSON.stringify(trace)).enteredText, {nodes, edges});
  assert.equal(trace.events[0].components.length, 0);
  assert.equal(trace.events.at(-1).components.length, 1);
  assert.throws(() => trace.events[0].stack.push('B'), TypeError);
  assert.throws(() => { trace.result.components[0][0] = 'Changed'; }, TypeError);
  assert.equal(trace.events.at(-1).stack.length, 0);
});

test('the trace copies its input and is deterministic for an unchanged declaration order', () => {
  const input = graph(['A', 'B'], [['A', 'B']]);
  const first = traceStrongComponents(input), serialized = JSON.stringify(first);
  assert.equal(JSON.stringify(traceStrongComponents(input)), serialized);
  input.nodes[0] = 'Changed'; input.edges[0].to = 'Changed';
  assert.equal(JSON.stringify(first), serialized);
  for (const event of first.events) assert.ok(event.stack.every(node => first.graph.nodes.includes(node)));
});

test('all 4,096 directed simple graphs on four nodes match independent mutual reachability', () => {
  const nodes = ['A', 'B', 'C', 'D'];
  const possible = nodes.flatMap(from => nodes.filter(to => from !== to).map(to => [from, to]));
  for (let bits = 0; bits < 2 ** possible.length; bits++) {
    const input = graph(nodes, possible.filter((_, bit) => bits & (1 << bit)));
    checkDefinition(input, traceStrongComponents(input));
  }
});

test('the admitted twelve-node and thirty-six-edge boundary produces a complete trace', () => {
  const nodes = Array.from({length: 12}, (_, i) => 'N' + i);
  const edges = nodes.flatMap((from, i) => [1, 2, 3].map(offset => [from, nodes[(i + offset) % nodes.length]]));
  const input = graph(nodes, edges), trace = traceStrongComponents(input);
  assert.equal(trace.graph.edges.length, 36);
  assert.equal(trace.result.components.length, 1);
  assert.equal(trace.events.at(-1).kind, 'complete');
  checkDefinition(input, trace);
});
