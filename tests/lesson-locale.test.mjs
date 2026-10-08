import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  DEFAULT_BKT, expectedInformationGain, initialMastery, selectNextItem, updateMastery
} from '../src/knowledge.mjs';
import { validateDeck } from '../src/deck.mjs';
import { readLessonArchive } from '../src/lesson-archive.mjs';

const processHelper = fileURLToPath(new URL('./helpers/lesson-locale-process.mjs', import.meta.url));
const locales = {de: 'de_DE.UTF-8', sv: 'sv_SE.UTF-8'};
const originalHashes = {
  'unicode-de': '887f8c9267bdaf2afda3c8d52b0e473d8dac9915b980c39473267d5abb426f22',
  'unicode-sv': '19ab029f21e942b7b2d1ad7a1433c26e7f91c3c04bb9f04068aecfa8f8d266ca',
  'ascii-de': '95e2e56bdff3821cafaf1f8c385a1bdb2f0826147c940a766f4ec65143345549',
  'ascii-sv': '95e2e56bdff3821cafaf1f8c385a1bdb2f0826147c940a766f4ec65143345549'
};
const fixtures = Object.fromEntries(Object.keys(originalHashes).map(name =>
  [name, readFileSync(new URL('./fixtures/lesson-locale-v1/' + name + '.json', import.meta.url), 'utf8')]));
const unicodeDeck = JSON.parse(fixtures['unicode-de']).deck;
const threeItemDeck = {
  ...unicodeDeck,
  items: ['A', 'ä', 'z'].map(id => ({...unicodeDeck.items[0], id}))
};

function native(locale, input) {
  const result = spawnSync(process.execPath, [processHelper], {
    input: JSON.stringify(input), encoding: 'utf8',
    env: {...process.env, LANG: locales[locale], LC_ALL: locales[locale], LANGUAGE: locales[locale]},
    maxBuffer: 2 * 1024 * 1024
  });
  assert.equal(result.error, undefined, 'locale process must start');
  assert.equal(result.signal, null, 'locale process must finish');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  const output = JSON.parse(result.stdout);
  assert.match(output.runtime.locale, new RegExp('^' + locale + '(?:-|$)'), 'actual native ICU locale');
  return output;
}

function assertRestored(output, document) {
  assert.equal(output.ok, true, JSON.stringify(output.error));
  assert.deepEqual(output.state.answers.map(({item, choice}) => ({item, choice})), document.firstAnswers);
  assert.deepEqual(output.state.mastery, document.mastery);
  assert.deepEqual(output.state.presentation, document.presentation);
  if (document.presentation.phase === 'question') {
    assert.equal(output.state.nextItemId, document.presentation.itemId);
  }
}

test('original v1 fixture bytes are unchanged from the pre-repair native witness', () => {
  for (const [name, text] of Object.entries(fixtures)) {
    assert.equal(createHash('sha256').update(text).digest('hex'), originalHashes[name], name);
    assert.equal(JSON.parse(text).version, 1);
  }
});

for (const locale of Object.keys(locales)) {
  test('fresh default selection keeps its native ' + locale + ' locale order', () => {
    const output = native(locale, {action: 'produce', deck: unicodeDeck, count: 0});
    assert.equal(output.ok, true, JSON.stringify(output.error));
    assert.equal(output.freshItemId, locale === 'de' ? 'ä' : 'z');
    assert.equal(output.state.presentation.itemId, output.freshItemId);
  });
}

for (const [name, text] of Object.entries(fixtures)) {
  for (const locale of Object.keys(locales)) {
    test('unchanged original ' + name + ' v1 archive restores in ' + locale, () => {
      const output = native(locale, {action: 'restore', text});
      assertRestored(output, JSON.parse(text));
      assert.equal(output.text, text, 'same savedAt re-exports the exact original v1 bytes');
    });
  }
}

for (const from of Object.keys(locales)) {
  const to = from === 'de' ? 'sv' : 'de';
  test('zero-answer question keeps its recorded tie from ' + from + ' to ' + to, () => {
    const produced = native(from, {action: 'produce', deck: unicodeDeck, count: 0});
    assert.equal(produced.ok, true, JSON.stringify(produced.error));
    const restored = native(to, {action: 'restore', text: produced.text});
    assertRestored(restored, JSON.parse(produced.text));
    assert.equal(restored.text, produced.text);
  });
  test('feedback preserves the original answer from ' + from + ' to ' + to, () => {
    const produced = native(from, {action: 'produce', deck: unicodeDeck, count: 1, phase: 'feedback', correct: false});
    assert.equal(produced.ok, true, JSON.stringify(produced.error));
    const restored = native(to, {action: 'restore', text: produced.text});
    assertRestored(restored, JSON.parse(produced.text));
    assert.equal(restored.text, produced.text);
  });
  test('a pending tie after a shared first answer survives ' + from + ' to ' + to, () => {
    const produced = native(from, {action: 'produce', deck: threeItemDeck, count: 1});
    assert.equal(produced.ok, true, JSON.stringify(produced.error));
    assert.equal(produced.state.answers[0].item, 'A');
    const restored = native(to, {action: 'restore', text: produced.text});
    assertRestored(restored, JSON.parse(produced.text));
    assert.equal(restored.text, produced.text);
  });
}

const tiedItems = ['first', 'second'].map(id => ({
  id, concept: 'shared', prerequisites: [], options: ['yes', 'no'], answer: 0,
  prompt: id, explanation: 'Synthetic selector control.', transfer: 'Apply the same control.'
}));

test('an optional recorded ID may choose either exact maximum tie', () => {
  const mastery = initialMastery(['shared']);
  const asked = new Set();
  const ordinary = selectNextItem(tiedItems, asked, mastery);
  const alternative = tiedItems.find(item => item !== ordinary);
  assert.equal(selectNextItem(tiedItems, asked, mastery, DEFAULT_BKT, alternative.id), alternative);
  assert.equal(selectNextItem(tiedItems, asked, mastery, DEFAULT_BKT, ordinary.id), ordinary);
  assert.deepEqual([...asked], []);
  assert.deepEqual(mastery, {shared: DEFAULT_BKT.initial});
});

test('absent, unknown, already-asked and exhausted preferences keep native behavior', () => {
  const mastery = initialMastery(['shared']);
  const ordinary = selectNextItem(tiedItems, new Set(), mastery);
  assert.equal(selectNextItem(tiedItems, new Set(), mastery, DEFAULT_BKT, undefined), ordinary);
  assert.equal(selectNextItem(tiedItems, new Set(), mastery, DEFAULT_BKT, 'missing'), ordinary);
  assert.equal(selectNextItem(tiedItems, new Set([ordinary.id]), mastery, DEFAULT_BKT, ordinary.id),
    tiedItems.find(item => item !== ordinary));
  assert.equal(selectNextItem(tiedItems, new Set(tiedItems.map(item => item.id)), mastery, DEFAULT_BKT, ordinary.id), null);
});

test('a recorded preference cannot override a strictly better prerequisite-repair score', () => {
  const items = [
    {...tiedItems[0], id: 'foundation', concept: 'foundation'},
    {...tiedItems[1], id: 'leaf', concept: 'leaf', prerequisites: ['foundation']}
  ];
  const mastery = initialMastery(['foundation', 'leaf']);
  assert.equal(selectNextItem(items, new Set(), mastery).id, 'foundation');
  assert.equal(selectNextItem(items, new Set(), mastery, DEFAULT_BKT, 'leaf').id, 'foundation');
});

test('a recorded preference cannot turn a near but unequal information gain into a tie', () => {
  const items = [
    {...tiedItems[0], id: 'left', concept: 'left'},
    {...tiedItems[1], id: 'right', concept: 'right'}
  ];
  const mastery = {left: 0.22, right: 0.2200000001};
  const gains = items.map(item => expectedInformationGain(mastery[item.concept]));
  assert.ok(Math.abs(gains[0] - gains[1]) > 0);
  assert.ok(Math.abs(gains[0] - gains[1]) < 1e-8);
  const lower = gains[0] < gains[1] ? items[0] : items[1];
  const higher = lower === items[0] ? items[1] : items[0];
  assert.equal(selectNextItem(items, new Set(), mastery, DEFAULT_BKT, lower.id), higher);
});

function priorityArchive(firstAnswers, itemId) {
  const deck = validateDeck({
    ...unicodeDeck, concepts: ['foundation', 'leaf'],
    items: [
      {...unicodeDeck.items[0], id: 'foundation', concept: 'foundation'},
      {...unicodeDeck.items[1], id: 'leaf', concept: 'leaf', prerequisites: ['foundation']}
    ]
  });
  const mastery = initialMastery(deck.concepts);
  for (const answer of firstAnswers) {
    const item = deck.items.find(candidate => candidate.id === answer.item);
    mastery[item.concept] = updateMastery(mastery[item.concept], answer.choice === item.answer);
  }
  return {deck, document: {
    ...JSON.parse(fixtures['unicode-de']), deck, firstAnswers, mastery,
    presentation: {phase: 'question', itemId, optionOrders: {foundation: [1, 0], leaf: [1, 0]}}
  }};
}

test('archive replay refuses a lower-scoring first answer with otherwise exact recomputed mastery', () => {
  const {deck, document} = priorityArchive([{item: 'leaf', choice: 0}], 'foundation');
  assert.throws(() => readLessonArchive(JSON.stringify(document), deck),
    {name: 'RangeError', message: 'This lesson has invalid first answers or question order.'});
});

test('archive replay refuses a lower-scoring zero-answer pending question', () => {
  const {deck, document} = priorityArchive([], 'leaf');
  assert.throws(() => readLessonArchive(JSON.stringify(document), deck),
    {name: 'RangeError', message: 'This lesson has invalid question or feedback presentation.'});
});
