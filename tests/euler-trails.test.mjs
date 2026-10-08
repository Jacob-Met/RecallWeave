import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { analyzeEuler, parseEdgeText } from '../src/euler-trails.mjs';
import { parseDeck, serializeDeck } from '../src/deck.mjs';

const graph = (vertexCount, text, start = 'auto') =>
  analyzeEuler({ vertexCount, edges: parseEdgeText(text), start });
function verifyRoute(result) {
  assert.ok(result.route);
  const { vertices, edgeIds } = result.route;
  assert.equal(vertices.length, result.edges.length + 1);
  assert.equal(vertices[0], result.start);
  assert.deepEqual([...edgeIds].sort(), result.edges.map(edge => edge.id).sort());
  const edges = new Map(result.edges.map(edge => [edge.id, edge]));
  edgeIds.forEach((id, index) => {
    const edge = edges.get(id);
    assert.deepEqual([vertices[index], vertices[index + 1]].sort(), [edge.from, edge.to].sort());
  });
  assert.equal(result.degrees.reduce((sum, item) => sum + item.degree, 0), 2 * result.edges.length);
}
test('triangle with a tail: odd endpoints, eligible reversal, and distinct wrong-start result', () => {
  const result = graph(4, 'A B\nB C\nC A\nA D');
  assert.equal(result.graphKind, 'trail');
  assert.deepEqual(result.oddVertices, ['A', 'D']);
  assert.deepEqual(result.degrees.map(item => item.degree), [3, 2, 2, 1]);
  assert.equal(result.route.vertices.at(-1), 'D'); verifyRoute(result);
  const reverse = graph(4, 'A B\nB C\nC A\nA D', 'D');
  assert.equal(reverse.route.vertices.at(-1), 'A'); verifyRoute(reverse);
  const refused = graph(4, 'A B\nB C\nC A\nA D', 'B');
  assert.equal(refused.graphKind, 'trail');
  assert.equal(refused.routeStatus, 'start-ineligible');
  assert.equal(refused.route, null);
});
test('parallel identities and loop incidence survive construction', () => {
  const result = graph(3, 'A B\nA B\nA A', 'B');
  assert.equal(result.graphKind, 'circuit');
  assert.deepEqual(result.degrees.map(item => item.degree), [4, 2, 0]);
  assert.deepEqual(result.components, [['A', 'B']]);
  assert.deepEqual(result.isolatedVertices, ['C']);
  assert.deepEqual(result.route.vertices, ['B', 'A', 'A', 'B']);
  verifyRoute(result);
});
test('isolated vertices do not block edges, but cannot start their circuit', () => {
  const accepted = graph(4, 'A B\nB C\nC A');
  assert.equal(accepted.graphKind, 'circuit'); verifyRoute(accepted);
  const refused = graph(4, 'A B\nB C\nC A', 'D');
  assert.equal(refused.graphKind, 'circuit'); assert.equal(refused.routeStatus, 'start-ineligible');
});
test('separate even components fail; four odd vertices fail independently', () => {
  const separate = graph(6, 'A B\nB C\nC A\nD E\nE F\nF D');
  assert.equal(separate.graphKind, 'none'); assert.equal(separate.route, null);
  assert.deepEqual(separate.oddVertices, []);
  assert.deepEqual(separate.components, [['A', 'B', 'C'], ['D', 'E', 'F']]);
  const star = graph(4, 'A B\nA C\nA D');
  assert.equal(star.routeStatus, 'no-route');
  assert.equal(star.components.length, 1);
  assert.deepEqual(star.oddVertices, ['A', 'B', 'C', 'D']);
});
test('zero edges remain an explicitly separate zero-edge walk', () => {
  for (const count of [1, 3, 8]) {
    const start = 'ABCDEFGH'[count - 1];
    const result = graph(count, '', start);
    assert.equal(result.graphKind, 'empty'); assert.equal(result.routeStatus, 'ready');
    assert.deepEqual(result.route, { vertices: [start], edgeIds: [] });
    assert.deepEqual(result.components, []); verifyRoute(result);
  }
});
test('a dead-end first input edge does not strand the final constructed route', () => {
  const result = graph(4, 'A D\nA B\nB C\nC A', 'A');
  assert.equal(result.route.edgeIds.at(-1), 'e1');
  assert.equal(result.route.vertices.at(-1), 'D'); verifyRoute(result);
});
test('adding one versus two joining edges repairs two triangles differently', () => {
  const base = 'A B\nB C\nC A\nD E\nE F\nF D';
  const one = graph(6, base + '\nC D');
  assert.equal(one.graphKind, 'trail'); assert.deepEqual(one.oddVertices, ['C', 'D']); verifyRoute(one);
  const two = graph(6, base + '\nC D\nC D');
  assert.equal(two.graphKind, 'circuit'); verifyRoute(two);
});
test('upper bounds include loops and sixteen parallel identities', () => {
  const loops = graph(8, Array(16).fill('H H').join('\n'));
  assert.equal(loops.start, 'H'); assert.equal(loops.degrees[7].degree, 32); verifyRoute(loops);
  const parallel = graph(2, Array(16).fill('A B').join('\n'));
  assert.equal(parallel.graphKind, 'circuit'); verifyRoute(parallel);
});
test('results detach and deeply freeze input-derived values', () => {
  const input = { vertexCount: 2, edges: [['A', 'B'], ['A', 'B']] };
  const before = JSON.stringify(input); const result = analyzeEuler(input);
  assert.equal(JSON.stringify(input), before);
  input.edges[0][0] = 'B'; input.edges.push(['A', 'A']);
  assert.equal(result.edges[0].from, 'A'); assert.equal(result.edges.length, 2);
  const visit = value => {
    if (value && typeof value === 'object') {
      assert.ok(Object.isFrozen(value)); Object.values(value).forEach(visit);
    }
  };
  visit(result);
  assert.throws(() => result.route.vertices.push('B'), TypeError);
  assert.deepEqual(result, analyzeEuler({ vertexCount: 2, edges: [['A', 'B'], ['A', 'B']] }));
});
test('structural input refusal is strict and bounded', () => {
  for (const vertexCount of [0, 9, 2.5, '3', NaN, Infinity, null]) {
    assert.throws(() => analyzeEuler({ vertexCount, edges: [] }));
  }
  for (const edges of [null, {}, [['A']], [['A', 'B', 'C']], [['A', 'C']], [['a', 'B']], [null], new Array(1), Array(17).fill(['A', 'B'])]) {
    assert.throws(() => analyzeEuler({ vertexCount: 2, edges }));
  }
  for (const start of ['C', 'AUTO', '', 0, null]) {
    assert.throws(() => analyzeEuler({ vertexCount: 2, edges: [], start }));
  }
  for (const input of [null, [], 1]) assert.throws(() => analyzeEuler(input));
});
test('edge-text grammar preserves nonblank row identities and rejects ambiguity', () => {
  assert.deepEqual(parseEdgeText(' \n A\tB\r\n\nA A \n'), [['A', 'B'], ['A', 'A']]);
  for (const text of ['A,B', 'A B C', 'a b', 'A I', '# comment', 'A\nB', ' '.repeat(4097), Array(17).fill('A B').join('\n'), null]) {
    assert.throws(() => parseEdgeText(text));
  }
});
test('original course is admitted by the unchanged checked-deck parser', async () => {
  const raw = await readFile(new URL('../courses/euler-trails.json', import.meta.url), 'utf8');
  const deck = parseDeck(raw);
  assert.equal(serializeDeck(deck), raw);
  assert.equal(deck.items.length, 14); assert.equal(deck.concepts.length, 4);
  assert.equal(deck.license, 'CC0-1.0');
  const guide = await readFile(new URL('../courses/euler-trails.md', import.meta.url), 'utf8');
  for (const item of deck.items) assert.ok(guide.includes('| ' + item.id + ' |'));
});
