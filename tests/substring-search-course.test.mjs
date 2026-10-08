import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { parseDeck } from '../src/deck.mjs';
import { initialMastery, selectNextItem, updateMastery } from '../src/knowledge.mjs';
import { createReview, beginPractice, currentPracticeItem, answerPractice } from '../src/review.mjs';
import { createStudyNotes } from '../src/session-export.mjs';
import { occurrenceOracle, borderOracle, naiveCountOracle, cases } from '../docs/substring-search-evidence/61749b-20261008/preimplementation/oracles.mjs';

const raw = readFileSync(new URL('../courses/substring-search.json', import.meta.url), 'utf8');
const deck = parseDeck(raw);

test('the exact original deck is accepted as 12 questions in four concepts with balanced canonical answers', () => {
  assert.equal(deck.items.length, 12); assert.equal(deck.concepts.length, 4);
  assert.deepEqual(deck.concepts.map(concept => deck.items.filter(item => item.concept === concept).length), [3, 3, 3, 3]);
  assert.deepEqual([0, 1, 2, 3].map(answer => deck.items.filter(item => item.answer === answer).length), [3, 3, 3, 3]);
  assert.match(deck.license, /CC0-1\.0.*original course/);
  assert.match(deck.attribution, /NIST.*1977.*metadata and abstract.*Moore/s);
  assert.ok(Buffer.byteLength(raw) < 262144);
});

test('worked answer identities agree with independent occurrences, proper borders and prepared count witnesses', () => {
  const answer = id => { const item = deck.items.find(item => item.id === id); return item.options[item.answer]; };
  const list = values => '[' + values.join(', ') + ']';
  assert.equal(answer('ss-matches-overlap'), list(occurrenceOracle('AAAA', 'AA')));
  assert.equal(answer('ss-matches-units'), list(occurrenceOracle('😀A😀A😀', '😀A')));
  assert.equal(answer('ss-prefix-table'), list(borderOracle('ABABA')));
  assert.ok(answer('ss-prefix-proper').startsWith(borderOracle('ABABA').at(-1) + ','));
  assert.deepEqual(occurrenceOracle('e\u0301é', 'é'), [2]);
  assert.equal(answer('ss-matches-literal'), '[2] only.');
  assert.equal(naiveCountOracle('ABABABABA', 'ABABA'), 17);
  assert.match(answer('ss-cost-counts'), /Naive 17; KMP total 13/);
  const empty = cases.find(row => row.name === 'empty text');
  assert.deepEqual([empty.preparation, empty.search, empty.matches.length], [1, 0, 0]);
  assert.match(answer('ss-fallback-empty'), /No matches; 1 prefix-preparation comparison and 0 text-search/);
  const small = cases.find(row => row.name === 'no shared first token');
  assert.deepEqual([small.naive, small.preparation + small.search], [5, 7]);
  assert.match(answer('ss-cost-small'), /Naive makes 5.*1 \+ 6 = 7/);
  assert.deepEqual(occurrenceOracle('AAAAA', 'AAA'), [0, 1, 2]);
  assert.deepEqual(occurrenceOracle('😀😀😀', '😀😀'), [0, 1]);
  assert.deepEqual(occurrenceOracle('aAaA', 'Aa'), [1]);
  assert.equal(borderOracle('AAAA').at(-1), 3); assert.equal(borderOracle('ABC').at(-1), 0);
});

test('unchanged native learner selects all 12, keeps six first misses and six practice corrections separate, and exports every authored item', () => {
  const asked = new Set(), answers = [], mastery = initialMastery(deck.concepts);
  while (asked.size < deck.items.length) {
    const item = selectNextItem(deck.items, asked, mastery);
    assert.ok(item && !asked.has(item.id));
    const correct = asked.size % 2 === 0;
    answers.push({ item: item.id, choice: correct ? item.answer : (item.answer + 1) % item.options.length });
    asked.add(item.id); mastery[item.concept] = updateMastery(mastery[item.concept], correct);
  }
  assert.equal(selectNextItem(deck.items, asked, mastery), null);
  const review = createReview(deck.items, answers), originalReview = JSON.stringify(review), originalMastery = JSON.stringify(mastery);
  let practice = beginPractice(review);
  while (currentPracticeItem(practice)) {
    const item = currentPracticeItem(practice);
    practice = answerPractice(practice, item.id, item.answer);
  }
  assert.equal(practice.answers.length, 6);
  assert.equal(JSON.stringify(review), originalReview); assert.equal(JSON.stringify(mastery), originalMastery);
  const notes = createStudyNotes({ deck, review, mastery, practice, exportedAt: '2026-10-08T16:00:00Z' });
  for (const item of deck.items) for (const field of ['prompt', 'explanation', 'transfer']) assert.ok(notes.text.includes(item[field]), item.id + ' ' + field);
  assert.ok(notes.text.includes(deck.attribution)); assert.ok(notes.text.includes(deck.license));
});
