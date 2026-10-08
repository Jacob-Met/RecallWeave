import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateGraph, startRun, nextVertex, advanceRun, routeTo, traceDocument, PRESETS} from '../courses/shortest-paths-core.mjs';
import {parseDeck, serializeDeck} from '../src/deck.mjs';
import {initialMastery, selectNextItem, updateMastery} from '../src/knowledge.mjs';
import {createReview, beginPractice, currentPracticeItem, answerPractice} from '../src/review.mjs';
import {createStudyNotes} from '../src/session-export.mjs';

const courseText = await readFile(new URL('../courses/shortest-paths.json', import.meta.url), 'utf8');
const deck = parseDeck(courseText);

/** Exhaust all simple paths. Nonnegative cycles can be removed without increasing cost.
 * This oracle does not select a minimum frontier or use Dijkstra relaxation.
 */
function exhaustiveDistances(graph, source) {
  const best = Object.fromEntries(graph.nodes.map(id => [id, null]));
  function visit(vertex, cost, visited) {
    if (best[vertex] === null || cost < best[vertex]) best[vertex] = cost;
    for (const edge of graph.edges) {
      if (edge.from === vertex && !visited.has(edge.to)) {
        visit(edge.to, cost + edge.weight, new Set([...visited, edge.to]));
      }
    }
  }
  visit(source, 0, new Set([source]));
  return best;
}

function assertPath(graph, source, route) {
  if (route.distance === null) { assert.deepEqual(route.path, []); return; }
  assert.equal(route.path[0], source);
  assert.equal(route.path.at(-1), route.target);
  assert.equal(new Set(route.path).size, route.path.length);
  let cost = 0;
  for (let i = 1; i < route.path.length; i++) {
    const edge = graph.edges.find(edge => edge.from === route.path[i - 1] && edge.to === route.path[i]);
    assert.ok(edge, 'Every route segment is a real directed edge');
    cost += edge.weight;
  }
  assert.equal(cost, route.distance);
}
function receiveGraph(graph, source) {
  const truth = exhaustiveDistances(graph, source);
  let state = startRun(graph, source), steps = 0;
  while (!state.done) {
    const before = JSON.stringify(state);
    const previous = state;
    const selected = nextVertex(state);
    state = advanceRun(state);
    assert.equal(JSON.stringify(previous), before, 'A later step cannot change its predecessor state');
    assert.equal(state.history.length, ++steps);
    assert.ok(steps <= graph.nodes.length);
    assert.equal(state.settled.at(-1), selected);
    for (const id of graph.nodes) {
      if (previous.distances[id] !== null) assert.ok(state.distances[id] <= previous.distances[id]);
      if (state.settled.includes(id)) assert.equal(state.distances[id], truth[id], 'Every settled estimate is final');
      if (state.distances[id] !== null) assert.ok(state.distances[id] >= truth[id], 'A found path is an upper bound');
      assertPath(graph, source, routeTo(state, id));
    }
  }
  assert.deepEqual(state.distances, truth);
  assert.equal(nextVertex(state), null);
  assert.equal(advanceRun(state), state, 'Finish is idempotent');
  for (const id of graph.nodes) {
    assert.equal(routeTo(state, id).status, truth[id] === null ? 'unreachable' : 'final');
  }
  return state;
}

test('the original five-vertex example has the hand-calculated settling order and cost-7 route', () => {
  const preset = PRESETS[0], state = receiveGraph(preset.graph, preset.source);
  assert.deepEqual(state.settled, ['S', 'B', 'A', 'C', 'T']);
  assert.deepEqual(state.distances, {S: 0, A: 3, B: 1, C: 4, T: 7});
  assert.deepEqual(routeTo(state, 'T').path, ['S', 'B', 'A', 'C', 'T']);
  assert.equal(state.history[2].distances.T, 10);
  assert.equal(state.history[3].distances.T, 7);
  assert.deepEqual(state.history[1].updates.find(edge => edge.to === 'A'), {
    from: 'B', to: 'A', weight: 2, oldDistance: 4, candidate: 3,
    newDistance: 3, changed: true, reason: 'shorter-route'
  });
});
test('target discovery remains tentative; the cheaper route is final only on target settlement', () => {
  const preset = PRESETS.find(value => value.id === 'first-discovery');
  let state = advanceRun(startRun(preset.graph, 'S'));
  assert.deepEqual(routeTo(state, 'T'), {target: 'T', distance: 9, path: ['S', 'T'], status: 'tentative'});
  state = advanceRun(advanceRun(state));
  assert.deepEqual(routeTo(state, 'T'), {target: 'T', distance: 5, path: ['S', 'A', 'B', 'T'], status: 'tentative'});
  state = advanceRun(state);
  assert.equal(routeTo(state, 'T').status, 'final');
  assert.equal(state.done, true);
});
test('zero weights and equal routes preserve the stated alphabetical and first-predecessor policies', () => {
  const ties = PRESETS.find(value => value.id === 'ties');
  const result = receiveGraph(ties.graph, 'S');
  assert.deepEqual(result.settled, ['S', 'A', 'B', 'T']);
  assert.equal(result.previous.T, 'A');
  assert.equal(result.history[2].updates[0].reason, 'equal-keeps-first');
  const zero = PRESETS.find(value => value.id === 'zero-unreachable');
  const state = receiveGraph(zero.graph, 'S');
  assert.equal(state.distances.A, 0);
  assert.equal(state.distances.T, 3);
  assert.deepEqual(routeTo(state, 'X'), {target: 'X', distance: null, path: [], status: 'unreachable'});
});
test('all preset source/target pairs agree with exhaustive simple paths, including reverse direction', () => {
  for (const preset of PRESETS) for (const source of preset.graph.nodes) receiveGraph(preset.graph, source);
});
test('80 deterministic bounded graphs agree with a simple-path oracle for every source', () => {
  let seed = 0x52656361;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let index = 0; index < 80; index++) {
    const nodes = ['A', 'B', 'C', 'D', 'E', 'F'].slice(0, 1 + Math.floor(random() * 6));
    const edges = [];
    for (const from of nodes) for (const to of nodes) {
      if (random() < 0.3) edges.push({from, to, weight: Math.floor(random() * 7)});
    }
    const graph = {nodes, edges};
    for (const source of nodes) receiveGraph(graph, source);
  }
});
test('invalid graphs are refused before a runnable state exists', () => {
  const graph = {nodes: ['S', 'T'], edges: [{from: 'S', to: 'T', weight: 1}]};
  for (const weight of [-1, 0.5, NaN, Infinity, 51, '2', null]) {
    assert.throws(() => startRun({...graph, edges: [{from: 'S', to: 'T', weight}]}, 'S'), /whole number/);
  }
  for (const nodes of [[], ['S', 'S'], ['s'], ['__proto__'], ['A','B','C','D','E','F','G','H']]) {
    assert.throws(() => validateGraph({...graph, nodes}));
  }
  assert.throws(() => validateGraph({...graph, edges: [...graph.edges, ...graph.edges]}), /only one/);
  assert.throws(() => validateGraph({...graph, edges: [{from: 'S', to: 'X', weight: 2}]}), /known/);
  assert.throws(() => startRun(graph, 'X'), /Choose a vertex/);
  assert.throws(() => routeTo(startRun(graph, 'S'), 'X'), /Choose a vertex/);
  assert.throws(() => advanceRun(JSON.parse(JSON.stringify(startRun(graph, 'S')))), /Start a new run/);
});
test('run, graph, presets and trace snapshots cannot be changed by later edits', () => {
  const graph = {nodes: ['S', 'T'], edges: [{from: 'S', to: 'T', weight: 5}]};
  const initial = startRun(graph, 'S');
  graph.edges[0].weight = 1;
  assert.equal(initial.graph.edges[0].weight, 5);
  assert.throws(() => { initial.distances.T = 1; }, TypeError);
  assert.throws(() => { PRESETS[0].graph.edges[0].weight = 1; }, TypeError);
  const trace = traceDocument(advanceRun(initial), 'T');
  assert.equal(trace.format, 'recallweave-shortest-paths-trace/1');
  assert.equal(trace.route.status, 'tentative');
  assert.equal(trace.complete, false);
  assert.equal(trace.steps.length, 1);
  assert.throws(() => { trace.steps[0].distances.T = 0; }, TypeError);
  assert.match(trace.note, /does not save or restore/);
  assert.equal(JSON.parse(JSON.stringify(trace)).distances.T, 5);
  assert.equal(initial.distances.T, null);
});
test('the original twelve-question course is valid, canonical and has balanced answer positions', () => {
  assert.equal(serializeDeck(deck), courseText);
  assert.equal(deck.items.length, 12);
  assert.equal(deck.concepts.length, 4);
  assert.deepEqual(deck.concepts.map(concept => deck.items.filter(item => item.concept === concept).length), [3,3,3,3]);
  assert.deepEqual([0,1,2,3].map(answer => deck.items.filter(item => item.answer === answer).length), [3,3,3,3]);
  const uniqueLongestCorrect = deck.items.filter(item => {
    const lengths = item.options.map(option => option.length), maximum = Math.max(...lengths);
    return lengths[item.answer] === maximum && lengths.filter(length => length === maximum).length === 1;
  });
  assert.ok(uniqueLongestCorrect.length <= 2, 'The answer key must not be recoverable by always choosing the uniquely longest option');
  assert.match(deck.items.find(item => item.id === 'sp-negative').explanation, /no cycle/);
  assert.match(deck.attribution, /MIT OpenCourseWare/);
});
test('existing knowledge, review, practice and notes contracts accept the new deck without changing the app', () => {
  const asked = new Set(), mastery = initialMastery(deck.concepts), answers = [];
  while (asked.size < deck.items.length) {
    const item = selectNextItem(deck.items, asked, mastery);
    const choice = answers.length % 3 === 0 ? (item.answer + 1) % item.options.length : item.answer;
    asked.add(item.id);
    answers.push({item: item.id, choice});
    mastery[item.concept] = updateMastery(mastery[item.concept], choice === item.answer);
  }
  assert.equal(selectNextItem(deck.items, asked, mastery), null);
  const first = JSON.stringify({answers, mastery});
  const review = createReview(deck.items, answers);
  assert.equal(review.length, 12);
  assert.equal(review.filter(item => !item.correct).length, 4);
  let practice = beginPractice(review);
  while (currentPracticeItem(practice)) {
    const item = currentPracticeItem(practice);
    practice = answerPractice(practice, item.id, item.answer);
  }
  assert.equal(practice.answers.length, 4);
  const notes = createStudyNotes({deck, review, mastery, practice, exportedAt: '2026-10-08T12:00:00.000Z'});
  for (const item of deck.items) {
    assert.ok(notes.text.includes(item.prompt));
    assert.ok(notes.text.includes(item.explanation));
    assert.ok(notes.text.includes(item.transfer));
  }
  assert.match(notes.text, /12 connections correct|8 of 12 connections correct/);
  assert.match(notes.text, /4 of 4 practice answers/);
  assert.match(notes.text, /MODEL STATE, NOT A GRADE/);
  assert.equal(JSON.stringify({answers, mastery}), first);
});
