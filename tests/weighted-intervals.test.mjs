import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {EXAMPLES, solveSchedule} from '../courses/weighted-intervals-core.mjs';
import {parseDeck, serializeDeck} from '../src/deck.mjs';
import {initialMastery, selectNextItem, updateMastery} from '../src/knowledge.mjs';
import {createReview, beginPractice, currentPracticeItem, answerPractice} from '../src/review.mjs';
import {createStudyNotes} from '../src/session-export.mjs';

const root = new URL('../', import.meta.url);
const deckText = await readFile(new URL('courses/weighted-interval-scheduling.json', root), 'utf8');
const deck = parseDeck(deckText);
const copy = value => JSON.parse(JSON.stringify(value));
const activity = (id, start, end, value) => ({id, start, end, value});

test('the authored greedy counterexample has the complete expected table and schedule', () => {
  const result = solveSchedule(EXAMPLES['greedy-trap']);
  assert.deepEqual(result.rows.map(row => row.best), [0, 4, 5, 8, 10, 12, 15]);
  assert.deepEqual(result.rows.map(row => row.p), [0, 0, 0, 1, 0, 3, 4]);
  assert.deepEqual(result.selectedIds, ['D', 'F']);
  assert.equal(result.bestValue, 15);
  assert.deepEqual(result.greedy, {selectedIds: ['A', 'C', 'E'], value: 12});
  assert.deepEqual(result.backtrack, [
    {j: 6, id: 'F', choice: 'take', next: 4},
    {j: 4, id: 'D', choice: 'take', next: 0}
  ]);
});

test('a changed value recomputes the selected prefix and does not mutate the example', () => {
  const changed = copy(EXAMPLES['greedy-trap']);
  changed.find(a => a.id === 'D').value = 0;
  const result = solveSchedule(changed);
  assert.equal(result.bestValue, 13);
  assert.deepEqual(result.selectedIds, ['A', 'C', 'F']);
  assert.deepEqual(result.backtrack.map(row => [row.id, row.choice, row.next]), [
    ['F', 'take', 4], ['D', 'skip', 3], ['C', 'take', 1], ['A', 'take', 0]
  ]);
  assert.equal(EXAMPLES['greedy-trap'].find(a => a.id === 'D').value, 10);
});

test('touching endpoints are compatible and a positive overlap changes that decision', () => {
  const input = copy(EXAMPLES.touching);
  const touching = solveSchedule(input);
  assert.equal(touching.bestValue, 7);
  assert.deepEqual(touching.selectedIds, ['A', 'B']);
  assert.equal(touching.rows.find(row => row.id === 'B').p, 1);
  input.find(a => a.id === 'B').start = 1;
  const overlapping = solveSchedule(input);
  assert.equal(overlapping.bestValue, 6);
  assert.deepEqual(overlapping.selectedIds, ['C']);
});

test('backtracking from a smaller prefix can differ from the complete optimum', () => {
  const ordered = solveSchedule(EXAMPLES['greedy-trap']).ordered;
  const prefix = solveSchedule(ordered.slice(0, 5));
  assert.equal(prefix.bestValue, 12);
  assert.deepEqual(prefix.selectedIds, ['A', 'C', 'E']);
  assert.deepEqual(prefix.backtrack.map(step => step.j), [5, 3, 1]);
});

test('equal alternatives keep the previous prefix under the declared stable order', () => {
  const input = [activity('B', 1, 3, 5), activity('A', 1, 3, 5)];
  const forward = solveSchedule(input);
  const reversed = solveSchedule([...input].reverse());
  assert.deepEqual(forward, reversed);
  assert.deepEqual(forward.selectedIds, ['A']);
  assert.deepEqual(forward.rows[2], {j: 2, id: 'B', p: 0, take: 5, skip: 5, best: 5, choice: 'skip'});
  assert.deepEqual(solveSchedule(EXAMPLES.tie).selectedIds, ['C']);
});

test('a predecessor row supplies its best prefix, not necessarily its own activity', () => {
  const result = solveSchedule([
    activity('B', 4, 6, 3), activity('A', 2, 4, 2), activity('Z', 0, 4, 4)
  ]);
  assert.deepEqual(result.ordered.map(a => a.id), ['Z', 'A', 'B']);
  assert.equal(result.rows[3].p, 2);
  assert.equal(result.rows[2].choice, 'skip');
  assert.equal(result.bestValue, 7);
  assert.deepEqual(result.selectedIds, ['Z', 'B']);
});

test('empty and zero-valued inputs return a real empty optimum', () => {
  assert.deepEqual(solveSchedule([]), {
    ordered: [], rows: [{j: 0, id: null, p: 0, take: 0, skip: 0, best: 0, choice: 'base'}],
    bestValue: 0, selectedIds: [], backtrack: [], greedy: {selectedIds: [], value: 0}
  });
  const result = solveSchedule(EXAMPLES['greedy-trap'].map(a => ({...a, value: 0})));
  assert.equal(result.bestValue, 0);
  assert.deepEqual(result.selectedIds, []);
  assert.ok(result.rows.slice(1).every(row => row.choice === 'skip'));
  assert.equal(result.backtrack.length, 6);
});

test('the admitted bounds and code-unit ID tie order are exact', () => {
  const eight = Array.from({length: 8}, (_, i) => activity(String.fromCharCode(65 + i), i * 3, i * 3 + 3, 99));
  assert.equal(solveSchedule(eight).bestValue, 792);
  const tie = solveSchedule([activity('A_1', 0, 1, 2), activity('A-1', 0, 1, 2)]);
  assert.deepEqual(tie.ordered.map(a => a.id), ['A-1', 'A_1']);
  assert.deepEqual(tie.selectedIds, ['A-1']);
});

test('invalid representable activity inputs are refused without changing supplied data', () => {
  const valid = activity('A', 0, 2, 3);
  const invalid = [
    null, {}, true, [null], [false], [1], [['A', 0, 2, 3]],
    [activity('', 0, 2, 3)], [activity('a', 0, 2, 3)], [activity('ABCDEFGHI', 0, 2, 3)],
    [activity('A A', 0, 2, 3)], [valid, {...valid}],
    [activity('A', -1, 2, 3)], [activity('A', 2, 2, 3)], [activity('A', 3, 2, 3)],
    [activity('A', 0, 25, 3)], [activity('A', 0.5, 2, 3)],
    [activity('A', '0', 2, 3)], [activity('A', false, 2, 3)],
    [activity('A', 0, 2, -1)], [activity('A', 0, 2, 100)],
    [activity('A', 0, 2, 1.5)], [activity('A', 0, 2, '3')],
    Array.from({length: 9}, (_, i) => activity(String.fromCharCode(65 + i), 0, 1, 1))
  ];
  for (const value of invalid) {
    const before = JSON.stringify(value);
    assert.throws(() => solveSchedule(value), {name: /TypeError|RangeError/});
    assert.equal(JSON.stringify(value), before);
  }
  for (const value of [NaN, Infinity, -Infinity]) {
    assert.throws(() => solveSchedule([activity('A', 0, 2, value)]), RangeError);
  }
});

test('results are detached from both admitted inputs and future solver calls', () => {
  const input = copy(EXAMPLES['greedy-trap']);
  const before = JSON.stringify(input);
  const result = solveSchedule(input);
  result.ordered[0].value = 99;
  result.rows[1].best = 99;
  result.selectedIds.push('A');
  assert.equal(JSON.stringify(input), before);
  assert.equal(solveSchedule(input).bestValue, 15);
});

test('the original twelve-question course is canonical and covers every concept', () => {
  assert.equal(serializeDeck(deck), deckText);
  assert.equal(deck.items.length, 12);
  assert.equal(deck.concepts.length, 4);
  assert.deepEqual([0, 1, 2, 3].map(answer => deck.items.filter(item => item.answer === answer).length), [3, 3, 3, 3]);
  assert.ok(deck.items.every(item => item.explanation.length > 180 && item.transfer.length > 80));
  assert.match(deck.attribution, /Original questions/);
  assert.match(deck.license, /CC BY 4\.0/);
});

test('the deck goes through the existing adaptive learner, review, practice and notes consumers', () => {
  const asked = new Set();
  const mastery = initialMastery(deck.concepts);
  const answers = [];
  for (let index = 0; index < 12; index++) {
    const item = selectNextItem(deck.items, asked, mastery);
    assert.ok(item);
    const choice = [0, 4].includes(index) ? (item.answer + 1) % item.options.length : item.answer;
    answers.push({item: item.id, choice});
    asked.add(item.id);
    mastery[item.concept] = updateMastery(mastery[item.concept], choice === item.answer);
  }
  assert.equal(selectNextItem(deck.items, asked, mastery), null);
  const review = createReview(deck.items, answers);
  const original = JSON.stringify({answers, review, mastery});
  let practice = beginPractice(review);
  assert.equal(practice.items.length, 2);
  const next = currentPracticeItem(practice);
  practice = answerPractice(practice, next.id, next.answer);
  const notes = createStudyNotes({deck, review, mastery, practice, exportedAt: new Date('2026-10-08T00:00:00Z')}).text;
  assert.match(notes, /10 of 12 connections correct on the first try/);
  assert.match(notes, /Paused: 1 of 2 practice answers recorded; 1 correct on retry/);
  assert.ok(notes.includes(deck.title) && notes.includes(deck.attribution));
  assert.ok(deck.items.every(item => notes.includes(item.prompt) && notes.includes(item.explanation)));
  assert.equal(JSON.stringify({answers, review, mastery}), original);
});

test('the direct-file page matches the maintained builder and original deck download', async () => {
  const result = execFileSync(process.execPath, [fileURLToPath(new URL('tools/build_weighted_intervals_explorer.mjs', root)), '--check'], {encoding: 'utf8'});
  assert.match(result, /PASS: explorer matches/);
  const html = await readFile(new URL('courses/weighted-intervals-explorer.html', root), 'utf8');
  const embedded = html.match(/<script id="course-data" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(embedded);
  assert.equal(JSON.stringify(JSON.parse(embedded[1]), null, 2) + '\n', deckText);
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+href=["']https?:|import\s.+from\s+['"]/);
});
