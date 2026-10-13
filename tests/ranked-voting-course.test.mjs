import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseDeck, serializeDeck, MAX_DECK_BYTES } from '../src/deck.mjs';
import { initialMastery, selectNextItem, updateMastery } from '../src/knowledge.mjs';
import { createReview, beginPractice, currentPracticeItem, answerPractice } from '../src/review.mjs';
import { createReflections, updateReflection, updateApplicationReflection } from '../src/reflections.mjs';
import { createStudyNotes } from '../src/session-export.mjs';

const raw = await readFile(new URL('../courses/ranked-voting.json', import.meta.url), 'utf8');
const guide = await readFile(new URL('../courses/ranked-voting.md', import.meta.url), 'utf8');
const deck = parseDeck(raw);
const names = ['A', 'B', 'C'];
const P = [[11, 'ABC'], [9, 'CBA'], [5, 'BCA'], [2, 'BAC']];
const Q = [[4, 'ABC'], [3, 'BCA'], [2, 'CAB']];
const item = id => { const q = deck.items.find(q => q.id === id); assert.ok(q, id); return q; };
const answer = id => { const q = item(id); return q.options[q.answer]; };
const total = profile => profile.reduce((sum, [count]) => sum + count, 0);
const pair = (profile, a, b) => profile.reduce((sum, [count, ranking]) => sum + (ranking.indexOf(a) < ranking.indexOf(b) ? count : 0), 0);
const score = (profile, a, shift = 0) => profile.reduce((sum, [count, ranking]) => sum + count * (2 - ranking.indexOf(a) + shift), 0);
const first = (profile, a) => profile.reduce((sum, [count, ranking]) => sum + (ranking[0] === a ? count : 0), 0);
const winners = values => names.filter((_, i) => values[i] === Math.max(...values));
const condorcet = profile => names.filter(a => names.filter(b => a !== b).every(b => pair(profile, a, b) > pair(profile, b, a)));
const duel = (profile, a, b) => pair(profile, a, b) > pair(profile, b, a) ? a : pair(profile, b, a) > pair(profile, a, b) ? b : null;
const tuple = values => '(' + values.join(', ') + ')';

test('ranked voting is a round-trippable original 16-question course with an answer guide', () => {
  assert.ok(Buffer.byteLength(raw) < MAX_DECK_BYTES);
  assert.deepEqual(parseDeck(serializeDeck(deck)), deck);
  assert.deepEqual(JSON.parse(serializeDeck(deck)), JSON.parse(raw));
  assert.deepEqual(deck.concepts, ['reading-rankings', 'plurality-and-runoff', 'borda-scores', 'pairwise-majorities']);
  assert.equal(deck.items.length, 16);
  for (const c of deck.concepts) assert.equal(deck.items.filter(q => q.concept === c).length, 4);
  assert.deepEqual([0, 1, 2, 3].map(n => deck.items.filter(q => q.answer === n).length), [4, 4, 4, 4]);
  for (const q of deck.items) {
    assert.equal(new Set(q.options).size, 4, q.id);
    assert.ok(guide.includes(q.id), q.id);
    assert.ok(q.explanation.length > 80 && q.transfer.length > 30, q.id);
  }
  assert.match(deck.attribution, /Original questions/);
  assert.match(deck.attribution, /math\.cmu\.edu/);
  assert.match(deck.attribution, /ocw\.mit\.edu/);
  assert.match(deck.license, /CC BY 4\.0/);
});

test('profile P exactly separates plurality, top-two runoff and Borda outcomes', () => {
  assert.equal(total(P), 27);
  assert.deepEqual(names.map(a => first(P, a)), [11, 7, 9]);
  assert.equal(answer('rv-profile-count'), String(pair(P, 'B', 'A')));
  assert.equal(answer('rv-majority-threshold'), String(Math.floor(total(P) / 2) + 1));
  const finalists = [...names].sort((a, b) => first(P, b) - first(P, a)).slice(0, 2);
  assert.equal(answer('rv-plurality-finalists'), finalists.join(' and '));
  assert.deepEqual(winners(names.map(a => first(P, a))), ['A']);
  const bFirst = P.filter(([, ranking]) => ranking[0] === 'B');
  assert.equal(answer('rv-runoff-transfer'), pair(bFirst, 'C', 'A') + ' support C and ' + pair(bFirst, 'A', 'C') + ' support A.');
  assert.equal(answer('rv-runoff-winner'), 'C wins by ' + pair(P, 'C', 'A') + ' to ' + pair(P, 'A', 'C') + '.');
  assert.equal(answer('rv-reduced-ballot'), 'B wins by ' + pair(P, 'B', 'A') + ' to ' + pair(P, 'A', 'B') + '.');
  assert.equal(answer('rv-borda-group'), tuple(names.map(a => score([P[0]], a))));
  assert.equal(answer('rv-borda-totals'), tuple(names.map(a => score(P, a))));
  assert.deepEqual(names.map(a => score(P, a)), [24, 34, 23]);
  assert.deepEqual(winners(names.map(a => score(P, a))), ['B']);
  assert.equal(names.reduce((sum, a) => sum + score(P, a), 0), 3 * total(P));
  assert.equal(answer('rv-borda-shift'), 'The totals become ' + tuple(names.map(a => score(P, a, 1))) + '; B remains the unique winner.');
  assert.equal(answer('rv-condorcet-winner'), 'B is the Condorcet winner: it beats A by ' + pair(P, 'B', 'A') + '–' + pair(P, 'A', 'B') + ' and C by ' + pair(P, 'B', 'C') + '–' + pair(P, 'C', 'B') + '.');
  assert.deepEqual(condorcet(P), ['B']);
});

test('the information-loss example preserves first places but reverses the runoff', () => {
  const alternative = [[11, 'ACB'], [9, 'CAB'], [7, 'BAC']];
  assert.deepEqual(names.map(a => first(alternative, a)), names.map(a => first(P, a)));
  assert.equal(duel(P, 'A', 'C'), 'C');
  assert.equal(duel(alternative, 'A', 'C'), 'A');
  assert.equal(pair(alternative, 'A', 'C'), 18);
  assert.notDeepEqual(names.map(a => score(P, a)), names.map(a => score(alternative, a)));
  assert.equal(answer('rv-first-counts-insufficient'), 'A is the unique plurality leader; the Borda and pairwise outcomes are not determined.');
  assert.equal(answer('rv-complete-strict'), 'C > A > B');
  assert.equal(answer('rv-borda-pair-sum'), 'On each complete ballot, B’s Borda points equal the number of other alternatives below B.');
});

test('profile Q has a strict cycle, agenda-dependent sequential outcomes and an explicit Borda tie', () => {
  assert.equal(total(Q), 9);
  const ab = pair(Q, 'A', 'B'), bc = pair(Q, 'B', 'C'), ca = pair(Q, 'C', 'A');
  assert.deepEqual([ab, bc, ca], [6, 7, 5]);
  assert.equal(answer('rv-cycle-tallies'), 'A beats B ' + ab + '–' + (9 - ab) + '; B beats C ' + bc + '–' + (9 - bc) + '; C beats A ' + ca + '–' + (9 - ca) + '.');
  assert.deepEqual(condorcet(Q), []);
  assert.equal(answer('rv-cycle-meaning'), 'No alternative defeats both opponents, although every individual ballot is a consistent strict ranking.');
  assert.deepEqual(names.map(a => score(Q, a)), [10, 10, 7]);
  assert.deepEqual(winners(names.map(a => score(Q, a))), ['A', 'B']);
  assert.equal(duel(Q, duel(Q, 'A', 'B'), 'C'), 'C');
  assert.equal(duel(Q, duel(Q, 'A', 'C'), 'B'), 'B');
  assert.equal(duel(Q, duel(Q, 'B', 'C'), 'A'), 'A');
  assert.equal(answer('rv-cycle-agenda'), 'A versus B first leads to C; A versus C first leads to B.');
  assert.match(guide, /10.*10.*7/);
});

test('729 small profiles preserve pair complements, Borda identity, point shifts and majority implications', () => {
  const rankings = ['ABC', 'ACB', 'BAC', 'BCA', 'CAB', 'CBA'];
  for (let code = 0; code < 3 ** 6; code++) {
    let digits = code;
    const profile = rankings.map(r => { const count = digits % 3; digits = Math.floor(digits / 3); return [count, r]; });
    const n = total(profile), points = names.map(a => score(profile, a));
    assert.equal(points.reduce((a, b) => a + b, 0), 3 * n);
    for (const a of names) {
      assert.equal(score(profile, a), names.filter(b => b !== a).reduce((sum, b) => sum + pair(profile, a, b), 0));
      assert.equal(score(profile, a, 1), score(profile, a) + n);
      for (const b of names.filter(b => b !== a)) {
        assert.equal(pair(profile, a, b) + pair(profile, b, a), n);
        if (n % 2) assert.notEqual(pair(profile, a, b), pair(profile, b, a));
      }
      if (first(profile, a) > n / 2) assert.deepEqual(condorcet(profile), [a]);
    }
    assert.deepEqual(winners(points), winners(names.map(a => score(profile, a, 1))));
    assert.ok(condorcet(profile).length <= 1);
  }
  assert.equal(duel([[1, 'ABC'], [1, 'CBA']], 'A', 'C'), null);
});

test('all questions traverse unchanged adaptive selection, missed-answer practice and complete study notes', () => {
  const mastery = initialMastery(deck.concepts), asked = new Set(), answers = [];
  const missedId = 'rv-condorcet-winner', wrong = (item(missedId).answer + 1) % 4;
  while (asked.size < deck.items.length) {
    const q = selectNextItem(deck.items, asked, mastery);
    assert.ok(q); assert.equal(asked.has(q.id), false); asked.add(q.id);
    const choice = q.id === missedId ? wrong : q.answer, correct = choice === q.answer;
    answers.push({ item: q.id, choice, correct });
    mastery[q.concept] = updateMastery(mastery[q.concept], correct);
  }
  assert.equal(selectNextItem(deck.items, asked, mastery), null);
  assert.equal(asked.size, 16);
  const review = createReview(deck.items, answers), original = JSON.stringify({review, mastery});
  assert.equal(review.filter(q => q.correct).length, 15);
  let reflections = createReflections(deck.items);
  const reflection = 'B defeats each opponent even though only 7 rank B first.\nPairwise counts use lower preferences.';
  const application = 'A first-place summary loses the information needed for the A versus C runoff.';
  reflections = updateReflection(reflections, missedId, reflection);
  reflections = updateApplicationReflection(reflections, application);
  let practice = beginPractice(review);
  assert.deepEqual(practice.items.map(q => q.id), [missedId]);
  assert.equal(currentPracticeItem(practice).id, missedId);
  practice = answerPractice(practice, missedId, item(missedId).answer);
  assert.equal(currentPracticeItem(practice), null);
  assert.equal(practice.answers[0].correct, true);
  const applicationPrompt = 'Choose one connection from this deck and explain how it relates to another idea in your own words.';
  const notes = createStudyNotes({deck, review, mastery, practice, reflections, applicationPrompt, exportedAt:'2026-10-13T00:00:00Z'});
  assert.ok(notes.text.includes('15 of 16 connections correct on the first try.'));
  assert.ok(notes.text.includes('Complete: 1 of 1 practice answers recorded; 1 correct on retry.'));
  assert.ok(notes.text.includes('Your first answer: ' + item(missedId).options[wrong]));
  assert.ok(notes.text.includes('Practice answer: ' + answer(missedId)));
  for (const line of reflection.split('\n')) assert.ok(notes.text.includes('  > ' + line));
  assert.ok(notes.text.includes('  > ' + application));
  for (const q of deck.items) for (const value of [q.prompt, q.options[q.answer], q.explanation, q.transfer]) assert.ok(notes.text.includes(value), q.id);
  assert.ok(notes.text.includes(deck.attribution)); assert.ok(notes.text.includes(deck.license));
  assert.equal(JSON.stringify({review, mastery}), original);
});

