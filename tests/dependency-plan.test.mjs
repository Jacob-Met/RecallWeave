import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseGraph, validateGraph, analyzeGraph, reachableFrom, completeJob, undoCompletion, resetCompletion, enumerateCompletions } from '../src/dependency-plan.mjs';
import { buildDependencyExplorer, renderDependencyExplorer } from '../tools/build-dependency-graphs.mjs';
import { parseDeck } from '../src/deck.mjs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const shared = () => parseGraph('A\nB\nC\nD', 'A -> C\nB -> C\nC -> D');
const inputs = () => ({
  template: read('courses/dependency-graphs-explorer.template.html'),
  modelSource: read('src/dependency-plan.mjs'),
  uiSource: read('src/dependency-plan-ui.mjs'),
  courseText: read('courses/dependency-graphs.json'),
});
const embeddedCourse = html => JSON.parse(html.match(/<script id="dependency-course" type="application\/json">([\s\S]*?)<\/script>/u)[1]);

test('literal input preserves case, Unicode and prototype-like names', () => {
  const graph = parseGraph('  __proto__\r\nconstructor\n A \n a\n <b>生徒</b>\n', '__proto__ → constructor\nA -> a\nconstructor -> <b>生徒</b>');
  assert.deepEqual(graph.jobs, ['__proto__', 'constructor', 'A', 'a', '<b>生徒</b>']);
  assert.deepEqual(graph.edges, [['__proto__', 'constructor'], ['A', 'a'], ['constructor', '<b>生徒</b>']]);
  assert.deepEqual(analyzeGraph(graph).ready, ['__proto__', 'A']);
  assert.deepEqual(reachableFrom(graph, '__proto__'), ['constructor', '<b>生徒</b>']);
});

test('bounded input rejects ambiguity, duplicate arrows and unknown names', () => {
  for (const [jobs, edges] of [
    ['', ''], ['A\nA', ''], [Array.from({ length: 9 }, (_, i) => String(i)).join('\n'), ''],
    ['A -> B', ''], ['A\nB', 'A -> B -> A'], ['A\nB', 'A ->'], ['A\nB', 'A B'],
    ['A\nB', 'A -> Z'], ['A\nB', 'A -> B\nA → B'], ['A\tB', ''], ['A\u0000', ''], ['A\u2028B', ''],
    ['😀'.repeat(33), ''], ['\ud800', ''],
  ]) assert.throws(() => parseGraph(jobs, edges));
  assert.equal(parseGraph('😀'.repeat(32), '').jobs[0], '😀'.repeat(32));
  for (let point = 0x80; point <= 0x9f; point += 1) {
    assert.throws(() => parseGraph(`A${String.fromCodePoint(point)}B`, ''), /control characters/);
    assert.throws(() => validateGraph({ jobs: [`A${String.fromCodePoint(point)}B`], edges: [] }), /control characters/);
  }
  assert.equal(parseGraph('A', ' '.repeat(8190)).jobs[0], 'A');
  assert.throws(() => parseGraph('A', ' '.repeat(8191)), /8 KiB/);
  assert.throws(() => parseGraph(null, ''), /as text/);
});

test('the graph model copies and freezes input instead of sharing mutable arrays', () => {
  const source = { jobs: ['A', 'B'], edges: [['A', 'B']] };
  const graph = validateGraph(source);
  source.jobs[0] = 'changed';
  source.edges[0][1] = 'changed';
  assert.deepEqual(graph, { jobs: ['A', 'B'], edges: [['A', 'B']] });
  assert(Object.isFrozen(graph));
  assert(Object.isFrozen(graph.jobs));
  assert(Object.isFrozen(graph.edges[0]));
  assert.throws(() => graph.edges[0].push('C'), TypeError);
  assert.throws(() => validateGraph({ jobs: ['A'], edges: Array.from({ length: 65 }, () => ['A', 'A']) }), /64/);
});

test('completion requires every prerequisite and never permits a repeated job', () => {
  const graph = shared();
  assert.deepEqual(analyzeGraph(graph).ready, ['A', 'B']);
  const first = completeJob(graph, [], 'B');
  assert.deepEqual(analyzeGraph(graph, first).ready, ['A']);
  assert.throws(() => completeJob(graph, first, 'C'), /ready job/);
  assert.throws(() => completeJob(graph, first, 'B'), /ready job/);
  const second = completeJob(graph, first, 'A');
  assert.deepEqual(analyzeGraph(graph, second).ready, ['C']);
  const third = completeJob(graph, second, 'C');
  const last = completeJob(graph, third, 'D');
  assert.deepEqual(last, ['B', 'A', 'C', 'D']);
  assert.equal(analyzeGraph(graph, last).finished, true);
  assert.deepEqual(analyzeGraph(graph, last).remaining, []);
  assert.deepEqual(first, ['B']);
});

test('undo and reset retain the graph and earlier completion order', () => {
  const graph = shared();
  const history = ['B', 'A', 'C'];
  assert.deepEqual(undoCompletion(graph, history), ['B', 'A']);
  assert.deepEqual(analyzeGraph(graph, undoCompletion(graph, history)).ready, ['C']);
  assert.deepEqual(resetCompletion(graph, history), []);
  assert.deepEqual(undoCompletion(graph, []), []);
  assert.deepEqual(history, ['B', 'A', 'C']);
  assert.deepEqual(graph, shared());
  for (const invalid of [['C'], ['A', 'A'], ['missing'], [null], 'A']) {
    assert.throws(() => analyzeGraph(graph, invalid));
    assert.throws(() => enumerateCompletions(graph, invalid));
    assert.throws(() => undoCompletion(graph, invalid));
    assert.throws(() => resetCompletion(graph, invalid));
  }
});

test('a downstream blocked job is not mislabeled as part of a cycle', () => {
  const graph = parseGraph('A\nB\nC\nD\nE', 'A -> B\nB -> A\nB -> C\nD -> E');
  const first = analyzeGraph(graph);
  assert.deepEqual(first.cycleComponents, [['A', 'B']]);
  assert.deepEqual(first.cycleMembers, ['A', 'B']);
  assert.deepEqual(first.blockedByCycle, ['C']);
  assert.deepEqual(first.ready, ['D']);
  const history = completeJob(graph, completeJob(graph, [], 'D'), 'E');
  assert.deepEqual(analyzeGraph(graph, history).remaining, ['A', 'B', 'C']);
  assert.deepEqual(analyzeGraph(graph, history).ready, []);
  assert.deepEqual(enumerateCompletions(graph, history), { orders: [], truncated: false, limit: 12 });
  assert.throws(() => completeJob(graph, history, 'C'));
});

test('separate strongly connected groups, a self-loop and their descendants stay distinct', () => {
  const graph = parseGraph('A\nB\nC\nD\nE\nF\nG\nH', 'A -> B\nB -> A\nB -> C\nC -> D\nD -> C\nD -> E\nF -> F\nF -> G');
  const analysis = analyzeGraph(graph);
  assert.deepEqual(analysis.cycleComponents, [['A', 'B'], ['C', 'D'], ['F']]);
  assert.deepEqual(analysis.cycleMembers, ['A', 'B', 'C', 'D', 'F']);
  assert.deepEqual(analysis.blockedByCycle, ['E', 'G']);
  assert.deepEqual(analysis.ready, ['H']);
  assert.deepEqual(reachableFrom(graph, 'A'), ['A', 'B', 'C', 'D', 'E']);
  assert.deepEqual(reachableFrom(graph, 'F'), ['F', 'G']);
  assert.deepEqual(reachableFrom(graph, 'H'), []);
});

test('reachability follows direction and counts positive-length paths', () => {
  const graph = parseGraph('Raw\nClean\nChart\nSummary\nGlossary', 'Raw -> Clean\nClean -> Chart\nClean -> Summary');
  assert.deepEqual(reachableFrom(graph, 'Raw'), ['Clean', 'Chart', 'Summary']);
  assert.deepEqual(reachableFrom(graph, 'Chart'), []);
  assert.deepEqual(reachableFrom(graph, 'Glossary'), []);
  assert.deepEqual(analyzeGraph(graph).rows.find(row => row.job === 'Chart').prerequisites, ['Clean']);
  assert.throws(() => reachableFrom(graph, 'Absent'));
  const loop = parseGraph('One', 'One -> One');
  assert.deepEqual(analyzeGraph(loop).cycleMembers, ['One']);
  assert.deepEqual(reachableFrom(loop, 'One'), ['One']);
  assert.throws(() => completeJob(loop, [], 'One'));
});

test('order enumeration extends the exact prefix and reports a cap only when exceeded', () => {
  const graph = parseGraph('A\nB\nC', 'A -> C\nB -> C');
  assert.deepEqual(enumerateCompletions(graph, [], 1), { orders: [['A', 'B', 'C']], truncated: true, limit: 1 });
  assert.deepEqual(enumerateCompletions(graph, [], 2), { orders: [['A', 'B', 'C'], ['B', 'A', 'C']], truncated: false, limit: 2 });
  assert.deepEqual(enumerateCompletions(graph, ['B'], 1), { orders: [['B', 'A', 'C']], truncated: false, limit: 1 });
  assert.deepEqual(enumerateCompletions(graph, ['B', 'A', 'C'], 1).orders, [['B', 'A', 'C']]);
  for (const limit of [0, 25, 1.5, NaN, Infinity, '2', false, null]) assert.throws(() => enumerateCompletions(graph, [], limit));
});

test('eight independent jobs produce bounded, stable complete orders', () => {
  const graph = parseGraph('A\nB\nC\nD\nE\nF\nG\nH', '');
  const found = enumerateCompletions(graph);
  assert.equal(found.orders.length, 12);
  assert.equal(found.truncated, true);
  assert.deepEqual(found.orders[0], graph.jobs);
  assert.equal(new Set(found.orders.map(order => JSON.stringify(order))).size, 12);
  for (const order of found.orders) assert.deepEqual([...order].sort(), [...graph.jobs]);
  assert.deepEqual(enumerateCompletions(graph), found);
  assert.equal(enumerateCompletions(graph, ['H', 'G', 'F', 'E', 'D'], 24).orders.length, 6);
});

test('the standalone build and original course download retain exact source text', () => {
  const html = buildDependencyExplorer();
  assert.equal(html, read('courses/dependency-graphs-explorer.html'));
  assert.equal(embeddedCourse(html), read('courses/dependency-graphs.json'));
  assert.deepEqual(parseDeck(embeddedCourse(html)), parseDeck(read('courses/dependency-graphs.json')));
  assert.equal(parseDeck(embeddedCourse(html)).items.length, 12);
  assert(!html.includes('@@GRAPH_'));
  assert(!/<script\b[^>]*\bsrc=/iu.test(html));
});

test('the builder escapes source text for HTML while recovering the original UTF-8 string', () => {
  const source = inputs();
  const value = JSON.parse(source.courseText);
  value.attribution = 'Literal </script><script>globalThis.unexpected=true</script> and <>& \u2028 \u2029';
  const exact = JSON.stringify(value, null, 2) + '\n';
  const html = renderDependencyExplorer({ ...source, courseText: exact });
  assert.equal(embeddedCourse(html), exact);
  assert(!html.includes(value.attribution));
  assert.deepEqual(parseDeck(embeddedCourse(html)), parseDeck(exact));
});

test('unsupported module changes and missing or duplicated build markers fail explicitly', () => {
  const source = inputs();
  assert.throws(() => renderDependencyExplorer({ ...source, uiSource: source.uiSource.replace('parseGraph, ', '') }), /explicit native/);
  assert.throws(() => renderDependencyExplorer({ ...source, modelSource: source.modelSource + '\nexport default 1;\n' }), /unsupported module/);
  assert.throws(() => renderDependencyExplorer({ ...source, modelSource: source.modelSource + '\nconst unsafe = "</script>";\n' }), /closing tag/);
  assert.throws(() => renderDependencyExplorer({ ...source, template: source.template.replace('@@GRAPH_SCRIPT@@', '') }), /exactly one/);
  assert.throws(() => renderDependencyExplorer({ ...source, template: source.template + '@@GRAPH_COURSE@@' }), /exactly one/);
  assert.throws(() => renderDependencyExplorer({ ...source, courseText: '{}' }));
  const command = spawnSync(process.execPath, [fileURLToPath(new URL('../tools/build-dependency-graphs.mjs', import.meta.url)), '--unknown'], { encoding: 'utf8' });
  assert.notEqual(command.status, 0);
  assert.match(command.stderr, /Usage:/);
});
