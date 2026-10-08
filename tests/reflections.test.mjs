import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createReflections, itemReflection, updateReflection, updateApplicationReflection, reflectionSnapshot, APPLICATION_PROMPT} from '../src/reflections.mjs';
import {createReview, beginPractice, answerPractice} from '../src/review.mjs';
import {initialMastery, updateMastery} from '../src/knowledge.mjs';
import {createStudyNotes} from '../src/session-export.mjs';

const deck = JSON.parse(readFileSync(new URL('../data/deck.json', import.meta.url)));
const exportedAt = '2026-10-08T12:00:00Z';

function completedSession() {
  const answers = [...deck.items].reverse().map((item, index) => ({
    item: item.id, choice: index % 2 ? item.answer : (item.answer + 1) % item.options.length
  }));
  const review = createReview(deck.items, answers);
  const mastery = initialMastery(deck.concepts);
  for (const item of review) mastery[item.concept] = updateMastery(mastery[item.concept], item.correct);
  return {review, mastery};
}

test('question identity survives reordered review, edits and clearing without changing earlier notes', () => {
  const original = createReflections(deck.items);
  const last = deck.items.at(-1).id;
  const first = deck.items[0].id;
  const draft = updateReflection(original, last, 'Glucose → ATP\nMy own explanation 🪴');
  const revised = updateReflection(updateReflection(draft, first, 'Another idea'), last, 'Revised');
  assert.equal(itemReflection(original, last), '');
  assert.equal(itemReflection(draft, last), 'Glucose → ATP\nMy own explanation 🪴');
  assert.equal(itemReflection(revised, last), 'Revised');
  assert.equal(itemReflection(revised, first), 'Another idea');
  const reordered = reflectionSnapshot(revised, [...deck.items].reverse());
  assert.equal(reordered.notes[0].item, last);
  assert.equal(reordered.notes[0].text, 'Revised');
  assert.equal(itemReflection(updateReflection(revised, last, ''), first), 'Another idea');
  assert.equal(itemReflection(updateReflection(revised, last, ''), last), '');
  assert.throws(() => { draft.notes[0].text = 'Aliased'; }, TypeError);
});

test('application writing is separate and a fresh session starts with every field empty', () => {
  const initial = createReflections(deck.items);
  const written = updateApplicationReflection(updateReflection(initial, deck.items[0].id, 'Question note'), 'My whole pathway');
  assert.equal(written.application, 'My whole pathway');
  assert.equal(itemReflection(written, deck.items[0].id), 'Question note');
  const cleared = updateApplicationReflection(written, '');
  assert.equal(cleared.application, '');
  assert.equal(itemReflection(cleared, deck.items[0].id), 'Question note');
  assert.deepEqual(createReflections(deck.items), initial);
  assert.equal(initial.application, '');
  assert.ok(initial.notes.every(note => note.text === ''));
});

test('unknown or duplicate question identities and non-text edits are refused', () => {
  assert.throws(() => createReflections([deck.items[0], deck.items[0]]), RangeError);
  assert.throws(() => createReflections([{id: ' '}]), RangeError);
  const notes = createReflections(deck.items);
  assert.throws(() => updateReflection(notes, 'another-session-question', 'Lost'), RangeError);
  assert.throws(() => updateReflection(notes, deck.items[0].id, {text: 'Not text'}), TypeError);
  assert.throws(() => updateApplicationReflection(notes, null), TypeError);
  assert.ok(notes.notes.every(note => note.text === ''));
});

test('actual study notes bind writing to questions while retaining native review, estimates and a paused retry', () => {
  const session = completedSession();
  let practice = beginPractice(session.review);
  practice = answerPractice(practice, practice.items[0].id, practice.items[0].answer);
  const original = structuredClone({session, practice, deck});
  let reflections = createReflections(deck.items);
  for (const item of deck.items) reflections = updateReflection(reflections, item.id, `MY NOTE ${item.id}\n<em>literal writing 🪴</em>`);
  reflections = updateApplicationReflection(reflections, 'Sunlight → sugars → ATP\nDECK ATTRIBUTION is my literal text.');
  const common = {deck, ...session, practice, exportedAt};
  const without = createStudyNotes(common).text;
  const withNotes = createStudyNotes({...common, reflections}).text;
  assert.equal(withNotes.slice(0, withNotes.indexOf('REVIEW THE CONNECTIONS')), without.slice(0, without.indexOf('REVIEW THE CONNECTIONS')));
  assert.match(withNotes, /Paused: 1 of 3 practice answers recorded; 1 correct on retry/);
  for (let index = 0; index < session.review.length; index++) {
    const item = session.review[index];
    const start = withNotes.indexOf(`${index + 1}. ${item.prompt}`);
    const end = index + 1 < session.review.length ? withNotes.indexOf(`${index + 2}. ${session.review[index + 1].prompt}`) : withNotes.indexOf('YOUR APPLICATION REFLECTION');
    const block = withNotes.slice(start, end);
    assert.ok(block.includes(`Your first answer: ${item.options[item.choice]}`));
    assert.ok(block.includes(`Correct answer: ${item.options[item.answer]}`));
    assert.ok(block.includes(`  > MY NOTE ${item.id}\n  > <em>literal writing 🪴</em>`));
    assert.equal((block.match(/MY NOTE /g) ?? []).length, 1);
  }
  assert.ok(withNotes.includes(`Prompt: ${APPLICATION_PROMPT}`));
  assert.ok(withNotes.includes('  > Sunlight → sugars → ATP\n  > DECK ATTRIBUTION is my literal text.'));
  assert.deepEqual({session, practice, deck}, original);
});

test('actual export uses the most recent edit and represents cleared fields as unwritten', () => {
  const session = completedSession();
  const id = deck.items[0].id;
  const draft = updateReflection(createReflections(deck.items), id, 'Earlier draft');
  const revised = updateReflection(draft, id, 'Current draft');
  const text = createStudyNotes({deck, ...session, reflections: revised, exportedAt}).text;
  assert.ok(text.includes('  > Current draft'));
  assert.ok(!text.includes('Earlier draft'));
  const cleared = createStudyNotes({deck, ...session, reflections: updateReflection(revised, id, ''), exportedAt}).text;
  assert.ok(!cleared.includes('Current draft'));
  assert.equal((cleared.match(/Your explanation — reflection, not scored:\n  Not written\./g) ?? []).length, deck.items.length);
  assert.ok(cleared.includes('YOUR APPLICATION REFLECTION — NOT SCORED'));
});

test('export refuses missing, duplicate or foreign notebook identities instead of attaching notes by position', () => {
  const session = completedSession();
  const original = createReflections(deck.items);
  const cases = [
    {...original, notes: original.notes.slice(1)},
    {...original, notes: [original.notes[0], ...original.notes.slice(0, -1)]},
    {...original, notes: [{item: 'foreign', text: 'Wrong question'}, ...original.notes.slice(1)]},
    {...original, notes: [{...original.notes[0], text: false}, ...original.notes.slice(1)]},
    {...original, application: 0}
  ];
  for (const reflections of cases) assert.throws(() => createStudyNotes({deck, ...session, reflections, exportedAt}), RangeError);
});
