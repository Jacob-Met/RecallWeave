import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseDeck, serializeDeck, validateDeck, MAX_DECK_BYTES } from '../src/deck.mjs';
import { initialMastery, selectNextItem, updateMastery } from '../src/knowledge.mjs';
import { createReview, beginPractice, currentPracticeItem, answerPractice } from '../src/review.mjs';
import { createStudyNotes } from '../src/session-export.mjs';
import { createTraceArchive, readTraceArchive } from '../src/trace-archive.mjs';

const text = readFileSync(new URL('../courses/dependency-graphs.json', import.meta.url), 'utf8');
const deck = parseDeck(text);
const byId = new Map(deck.items.map(item => [item.id, item]));
const members = value => value.replace(/[{}]/g, '').split(',').map(part => part.trim()).filter(Boolean);
const sameSet = (left, right) => JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());

// These examples carry their graph in the literal learner prompt. Derive the
// mathematical checks from those bytes, rather than from a second graph file.
function graphOf(item) {
  const match = item.prompt.match(/Vertices: \{([^}]+)\}\. Edges: \{([^}]+)\}\./);
  assert.ok(match, `${item.id}: complete graph declaration`);
  const vertices = members(match[1]);
  const edges = match[2].split(',').map(edge => edge.split('→').map(part => part.trim()));
  assert.equal(new Set(vertices).size, vertices.length);
  assert.ok(edges.every(edge => edge.length === 2 && edge.every(vertex => vertices.includes(vertex))));
  assert.equal(new Set(edges.map(edge => edge.join('→'))).size, edges.length);
  return { vertices, edges };
}

function reachable(graph, start) {
  const reached = new Set();
  const queue = [start];
  const expanded = new Set();
  for (let index = 0; index < queue.length; index++) {
    const vertex = queue[index];
    if (expanded.has(vertex)) continue;
    expanded.add(vertex);
    for (const [from, to] of graph.edges) {
      if (from !== vertex) continue;
      reached.add(to);
      if (!expanded.has(to)) queue.push(to);
    }
  }
  return reached;
}

function distance(graph, start, end) {
  const steps = new Map([[start, 0]]);
  const queue = [start];
  for (let index = 0; index < queue.length; index++) {
    const vertex = queue[index];
    for (const [from, to] of graph.edges) {
      if (from !== vertex || steps.has(to)) continue;
      steps.set(to, steps.get(vertex) + 1);
      queue.push(to);
    }
  }
  return steps.get(end) ?? Infinity;
}

function validOrder(graph, order) {
  return order.length === graph.vertices.length
    && new Set(order).size === order.length
    && sameSet(order, graph.vertices)
    && graph.edges.every(([from, to]) => order.indexOf(from) < order.indexOf(to));
}

function allOrders(graph) {
  const result = [];
  const enumerate = (prefix, remaining) => {
    if (!remaining.length) {
      if (validOrder(graph, prefix)) result.push(prefix);
      return;
    }
    for (const vertex of remaining) enumerate([...prefix, vertex], remaining.filter(other => other !== vertex));
  };
  enumerate([], graph.vertices);
  return result;
}

function residual(graph) {
  const remaining = new Set(graph.vertices);
  while (true) {
    const ready = [...remaining].filter(vertex => !graph.edges.some(([from, to]) =>
      to === vertex && remaining.has(from)));
    if (!ready.length) return remaining;
    for (const vertex of ready) remaining.delete(vertex);
  }
}

function truths(item) {
  if (item.id === 'dg-links-1') {
    const requirement = item.prompt.match(/(\w+) needs the completed output of (\w+)/);
    assert.ok(requirement);
    const expected = `${requirement[2]}→${requirement[1]}`;
    return item.options.map(option => option.replaceAll(' ', '') === expected);
  }
  const graph = graphOf(item);
  switch (item.id) {
    case 'dg-links-2':
      return item.options.map(option => Number(option) === graph.edges.filter(([, to]) => to === 'D').length);
    case 'dg-links-3':
      return item.options.map(option => sameSet(members(option), graph.edges.filter(([from]) => from === 'A').map(([, to]) => to)));
    case 'dg-reach-1':
      return item.options.map(option => sameSet(members(option), reachable(graph, 'A')));
    case 'dg-reach-2':
      return item.options.map(option => Number(option) === distance(graph, 'S', 'T'));
    case 'dg-reach-3': {
      const affected = reachable(graph, 'Raw');
      affected.delete('Raw');
      return item.options.map(option => sameSet(members(option), affected));
    }
    case 'dg-order-1':
      return item.options.map(option => validOrder(graph, members(option)));
    case 'dg-order-2': {
      const finished = new Set(members(item.prompt.match(/Exactly \{([^}]+)\} has finished/)[1]));
      const ready = graph.vertices.filter(vertex => !finished.has(vertex)
        && graph.edges.filter(([, to]) => to === vertex).every(([from]) => finished.has(from)));
      return item.options.map(option => sameSet(members(option), ready));
    }
    case 'dg-order-3':
      return item.options.map(option => Number(option) === allOrders(graph).length);
    case 'dg-update-1':
      return item.options.map(option => allOrders({ ...graph, edges: [...graph.edges, option.split('→').map(part => part.trim())] }).length === 0);
    case 'dg-update-2':
      return item.options.map(option => sameSet(members(option), residual(graph)));
    case 'dg-update-3': {
      const addition = item.prompt.match(/after adding (\w+) → (\w+)/);
      assert.ok(addition);
      const before = allOrders(graph);
      const after = allOrders({ ...graph, edges: [...graph.edges, addition.slice(1)] });
      assert.ok(before.length > 0);
      const statements = new Map([
        ['Only orders with B before D remain.', after.length > 0 && after.every(order => order.indexOf('B') < order.indexOf('D'))],
        ['The valid-order set stays exactly the same.', JSON.stringify(before) === JSON.stringify(after)],
        ['Every valid order must now start with C.', after.length > 0 && after.every(order => order[0] === 'C')],
        ['The additional edge makes ordering impossible.', after.length === 0]
      ]);
      assert.ok(item.options.every(option => statements.has(option)), 'All literal claims have a mathematical predicate');
      return item.options.map(option => statements.get(option));
    }
    default: throw new Error(`No semantic check for ${item.id}`);
  }
}

function requireSemanticAnswer(item) {
  const options = truths(item);
  assert.equal(options.filter(Boolean).length, 1, `${item.id}: exactly one correct option`);
  assert.equal(options[item.answer], true, `${item.id}: selected answer follows the declared graph`);
}

test('the exact original course is bounded, admitted, balanced and round-trippable', () => {
  assert.ok(Buffer.byteLength(text) <= MAX_DECK_BYTES);
  assert.equal(deck.items.length, 12);
  assert.equal(deck.concepts.length, 4);
  assert.equal(byId.size, 12);
  assert.deepEqual(deck.concepts.map(concept => deck.items.filter(item => item.concept === concept).length), [3, 3, 3, 3]);
  assert.deepEqual([0, 1, 2, 3].map(answer => deck.items.filter(item => item.answer === answer).length), [3, 3, 3, 3]);
  assert.ok(deck.items.every(item => item.options.length === 4));
  assert.ok(deck.items.some(item => item.options[item.answer].length < Math.max(...item.options.map(option => option.length))));
  assert.ok(deck.items.some(item => item.options[item.answer].length > Math.min(...item.options.map(option => option.length))));
  assert.deepEqual(parseDeck(serializeDeck(deck)), deck);
});

test('every stated answer follows the literal graph, with one correct option', async t => {
  for (const item of deck.items) await t.test(item.id, () => requireSemanticAnswer(item));
});

test('structurally valid changed content exposes graph reversal and blocked-descendant mistakes', () => {
  const reversed = structuredClone(deck);
  const order = reversed.items.find(item => item.id === 'dg-order-1');
  order.prompt = order.prompt.replace('B → C', 'C → B');
  assert.doesNotThrow(() => validateDeck(reversed));
  assert.throws(() => requireSemanticAnswer(order), /selected answer follows the declared graph/);

  const omitted = structuredClone(deck);
  const blocked = omitted.items.find(item => item.id === 'dg-update-2');
  blocked.answer = blocked.options.indexOf('{A, B}');
  assert.doesNotThrow(() => validateDeck(omitted));
  assert.throws(() => requireSemanticAnswer(blocked), /selected answer follows the declared graph/);
});

test('the real selector, review, practice, notes and trace consumer preserve this course', () => {
  const missedIds = new Set(['dg-links-2', 'dg-reach-2', 'dg-order-2', 'dg-update-2']);
  const mastery = initialMastery(deck.concepts);
  const asked = new Set();
  const answers = [];
  while (asked.size < deck.items.length) {
    const item = selectNextItem(deck.items, asked, mastery);
    assert.ok(item && !asked.has(item.id));
    const choice = missedIds.has(item.id) ? (item.answer + 1) % item.options.length : item.answer;
    answers.push({ item: item.id, choice });
    asked.add(item.id);
    mastery[item.concept] = updateMastery(mastery[item.concept], choice === item.answer);
  }
  assert.equal(selectNextItem(deck.items, asked, mastery), null);
  const review = createReview(deck.items, answers);
  assert.equal(review.filter(item => item.correct).length, 8);
  const firstState = JSON.stringify({ answers, mastery, review });
  let practice = beginPractice(review);
  assert.equal(practice.items.length, 4);
  for (let index = 0; currentPracticeItem(practice); index++) {
    const item = currentPracticeItem(practice);
    practice = answerPractice(practice, item.id, index === 0 ? (item.answer + 1) % 4 : item.answer);
  }
  assert.equal(practice.answers.filter(answer => answer.correct).length, 3);
  assert.equal(JSON.stringify({ answers, mastery, review }), firstState);
  const savedAt = new Date('2026-10-08T00:00:00.000Z');
  const notes = createStudyNotes({ deck, review, mastery, practice, exportedAt: savedAt });
  assert.match(notes.text, /8 of 12 connections correct on the first try/);
  assert.match(notes.text, /Complete: 4 of 4 practice answers recorded; 3 correct on retry/);
  for (const item of deck.items) {
    for (const field of [item.prompt, item.options[item.answer], item.explanation, item.transfer]) assert.ok(notes.text.includes(field));
  }
  const archive = createTraceArchive({ deck, answers, mastery, practice, savedAt });
  const restored = readTraceArchive(archive.text, deck);
  assert.deepEqual(restored.mastery, mastery);
  assert.deepEqual(restored.review, review);
  assert.deepEqual(restored.practice, practice);
  assert.deepEqual(restored.summary, { firstAnswers: 12, correctFirst: 8, practiceStarted: true, practiceAnswers: 4, practiceTotal: 4 });
  const changedCourse = structuredClone(deck);
  changedCourse.items[0].explanation += ' Changed course version.';
  assert.throws(() => readTraceArchive(archive.text, validateDeck(changedCourse)), /different course or course version/);
});
