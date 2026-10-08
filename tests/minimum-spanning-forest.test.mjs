import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { traceMinimumSpanningForest, parseForestInput } from '../src/minimum-spanning-forest.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const edge = (from, to, weight) => ({ from, to, weight });

test('the connected worked graph records all decisions, including later cycle rejections', () => {
  const graph = parseForestInput('4', 'A B 4\nA C 1\nB C 2\nB D 5\nC D 3');
  const trace = traceMinimumSpanningForest(graph.vertexCount, graph.edges);
  assert.deepEqual(trace.orderedEdgeIds, [1, 2, 4, 0, 3]);
  assert.deepEqual(trace.steps.map(step => step.accepted), [true, true, true, false, false]);
  assert.deepEqual(trace.steps.map(step => step.afterComponents.length), [3, 2, 1, 1, 1]);
  assert.deepEqual(trace.steps.map(step => step.totalWeight), [1, 3, 6, 6, 6]);
  assert.deepEqual(trace.forestEdgeIds, [1, 2, 4]);
  assert.equal(trace.decisions, 5);
  assert.equal(trace.totalWeight, 6);
  assert.equal(trace.connected, true);
});

test('ties retain input identity and endpoint orientation while negative weights remain eligible', () => {
  const tied = traceMinimumSpanningForest(3, [edge(2, 0, 1), edge(0, 1, 1), edge(1, 2, 1)]);
  assert.deepEqual(tied.orderedEdgeIds, [0, 1, 2]);
  assert.deepEqual(tied.forestEdgeIds, [0, 1]);
  assert.deepEqual(tied.edges[0], { id: 0, from: 2, to: 0, weight: 1 });
  assert.equal(tied.totalWeight, 2);
  const negative = parseForestInput('4', 'A B -4\nB C -2\nA C 1\nC D 3\nA D 9');
  assert.equal(traceMinimumSpanningForest(negative.vertexCount, negative.edges).totalWeight, -3);
});

test('disconnected and edge-free inputs keep every vertex in the final forest', () => {
  const graph = parseForestInput('6', 'A B 1\nB C 2\nA C 4\nD E -2');
  const trace = traceMinimumSpanningForest(graph.vertexCount, graph.edges);
  assert.deepEqual(trace.components, [[0, 1, 2], [3, 4], [5]]);
  assert.equal(trace.totalWeight, 1);
  assert.equal(trace.connected, false);
  assert.equal(trace.forestEdgeIds.length, trace.vertexCount - trace.components.length);
  const one = traceMinimumSpanningForest(1, []);
  assert.deepEqual(one.components, [[0]]);
  assert.equal(one.connected, true);
  assert.equal(one.decisions, 0);
  assert.equal(one.totalWeight, 0);
  assert.deepEqual(traceMinimumSpanningForest(3, []).components, [[0], [1], [2]]);
});

test('admission refuses ambiguous graphs and snapshots remain detached from later edits', () => {
  for (const text of ['A A 1', 'A B 1\nB A 2', 'A D 1', 'A B 1.5', 'A B 1e1', 'A,B,1', 'A B 100']) {
    assert.throws(() => parseForestInput('3', text), text);
  }
  assert.throws(() => traceMinimumSpanningForest(3, new Array(1)));
  const inputs = [edge(0, 1, -2), edge(1, 2, 0)];
  const before = structuredClone(inputs);
  const trace = traceMinimumSpanningForest(3, inputs);
  assert.deepEqual(inputs, before);
  inputs[0].weight = 99;
  inputs.push(edge(0, 2, 4));
  assert.equal(trace.edges[0].weight, -2);
  assert.equal(trace.edges.length, 2);
  assert.throws(() => trace.steps[0].afterComponents[0].push(2), TypeError);
  assert.throws(() => trace.forestEdgeIds.pop(), TypeError);
  assert.deepEqual(parseForestInput(' 3 ', '\na b +02\r\nB C -00\n').edges, [edge(0, 1, 2), edge(1, 2, -0)]);
});

test('the delivered standalone file rebuilds exactly and embeds the unmodified course and guide', async () => {
  const result = spawnSync(process.execPath, ['tools/build-minimum-spanning-forest.mjs', '--check'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const html = await readFile(resolve(root, 'courses/minimum-spanning-forest-explorer.html'), 'utf8');
  const course = await readFile(resolve(root, 'courses/minimum-spanning-forest.json'), 'utf8');
  const guide = await readFile(resolve(root, 'courses/minimum-spanning-forest.md'), 'utf8');
  assert.equal(JSON.parse(html.match(/^const SOURCE_DECK = (.*);$/m)[1]), course);
  assert.equal(JSON.parse(html.match(/^const SOURCE_GUIDE = (.*);$/m)[1]), guide);
  assert.equal((html.match(/<script\b/g) || []).length, 1);
  assert.equal((html.match(/<\/script>/g) || []).length, 1);
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+href=|@@[A-Z_]+@@/);
  const script = html.match(/<script type="module">([\s\S]*)<\/script>/)[1];
  assert.doesNotThrow(() => new Function(script));
});

test('the builder retains literal closing-tag text and refuses a duplicated template marker', async () => {
  const temporary = await mkdtemp(resolve(tmpdir(), 'recallweave-forest-builder-'));
  try {
    const files = ['src/deck.mjs', 'src/minimum-spanning-forest.mjs', 'src/minimum-spanning-forest-ui.mjs',
      'courses/minimum-spanning-forest.json', 'courses/minimum-spanning-forest.md',
      'courses/minimum-spanning-forest-explorer.template.html', 'tools/build-minimum-spanning-forest.mjs'];
    for (const file of files) {
      await mkdir(dirname(resolve(temporary, file)), { recursive: true });
      await writeFile(resolve(temporary, file), await readFile(resolve(root, file)));
    }
    const deckPath = resolve(temporary, 'courses/minimum-spanning-forest.json');
    const deck = JSON.parse(await readFile(deckPath, 'utf8'));
    deck.items[0].prompt += ' Literal note: </script><p>example</p>';
    const changed = JSON.stringify(deck, null, 2) + '\n';
    await writeFile(deckPath, changed);
    let result = spawnSync(process.execPath, ['tools/build-minimum-spanning-forest.mjs'], { cwd: temporary, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const html = await readFile(resolve(temporary, 'courses/minimum-spanning-forest-explorer.html'), 'utf8');
    assert.equal(JSON.parse(html.match(/^const SOURCE_DECK = (.*);$/m)[1]), changed);
    assert.equal((html.match(/<\/script>/g) || []).length, 1);
    const template = resolve(temporary, 'courses/minimum-spanning-forest-explorer.template.html');
    await writeFile(template, (await readFile(template, 'utf8')) + '\n@@SCRIPT@@');
    result = spawnSync(process.execPath, ['tools/build-minimum-spanning-forest.mjs'], { cwd: temporary, encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Template marker must occur exactly once/);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
