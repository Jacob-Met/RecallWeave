import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { mountAuthorDeckLoader } from '../src/deck-author-loader.mjs';
import { MAX_DECK_BYTES, parseDeck } from '../src/deck.mjs';

const original = () => ({
  format: 'recallweave-deck/1', title: 'Workshop “next steps”',
  attribution: 'Original local fixture\nA second line', license: 'Permission supplied by the author',
  concepts: ['Observation', 'Decision'],
  items: [
    { id: 'record', concept: 'Observation', prerequisites: [], prompt: 'Which source was checked?',
      options: ['A guess', 'The written record', '<b>Literal text</b>'], answer: 1,
      explanation: 'The record preserves what was observed.', transfer: 'Describe an observation.' },
    { id: 'act', concept: 'Decision', prerequisites: ['Observation'], prompt: 'What follows from the record?',
      options: ['A choice with no reason', 'An action linked to the observation'], answer: 1,
      explanation: 'Keep the reason beside the decision.', transfer: 'Explain one action.' }
  ]
});
const file = (deck = original(), name = 'workshop.json') => new File([JSON.stringify(deck)], name, { type: 'application/json' });
const settle = async () => { await setImmediate(); await setImmediate(); };
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

// EventTarget supplies native event delivery; real DOM/focus/file behavior has a
// separate Chromium receiving suite. This fixture observes the editor boundary.
function editorFixture() {
  const root = { activeElement: null, calls: [], draft: { title: 'Unsaved draft', text: 'Keep this writing' } };
  class Control extends EventTarget {
    constructor(id) { super(); this.id = id; this.textContent = ''; this.hidden = false; this.disabled = false; this.value = ''; this.files = []; this.clicks = 0; }
    focus() { root.activeElement = this; }
    click() { this.clicks++; if (!this.disabled) this.dispatchEvent(new Event('click')); }
  }
  const controls = new Map(['open-deck-button', 'open-deck', 'author-status', 'open-preview',
    'open-preview-title', 'open-preview-summary', 'replace-draft', 'cancel-open'].map(id => [id, new Control(id)]));
  root.querySelector = selector => controls.get(selector.slice(1));
  root.control = id => controls.get(id);
  root.select = selected => {
    root.control('open-deck').files = selected ? [selected] : [];
    root.control('open-deck').dispatchEvent(new Event('change'));
  };
  mountAuthorDeckLoader(root, deck => { root.calls.push(deck); root.draft = deck; });
  return root;
}

test('a valid deck stages without touching authored text and commits once with full immutable content', async () => {
  const root = editorFixture();
  const before = root.draft;
  root.select(file());
  await settle();
  assert.equal(root.draft, before);
  assert.equal(root.calls.length, 0);
  assert.equal(root.control('open-preview').hidden, false);
  assert.equal(root.activeElement.id, 'open-preview-title');
  assert.equal(root.control('open-preview-title').textContent, 'Open “Workshop “next steps””?');
  assert.equal(root.control('open-preview-summary').textContent, 'workshop.json · 2 questions · 2 concepts');
  root.control('replace-draft').click();
  root.control('replace-draft').click();
  assert.equal(root.calls.length, 1);
  assert.deepEqual(root.draft, parseDeck(JSON.stringify(original())));
  for (const value of [root.draft, root.draft.items, root.draft.items[1], root.draft.items[1].options, root.draft.items[1].prerequisites]) assert.ok(Object.isFrozen(value));
  assert.equal(root.control('open-preview').hidden, true);
  assert.equal(root.control('replace-draft').disabled, true);
  assert.equal(root.control('open-deck').value, '');
});

test('invalid JSON, invalid answer, oversized file and unreadable file preserve the draft and allow retry', async () => {
  const badAnswer = original(); badAnswer.items[0].answer = 3;
  const oversized = new File(['x'.repeat(MAX_DECK_BYTES + 1)], 'large.json');
  let oversizedRead = false;
  oversized.text = () => { oversizedRead = true; throw new Error('Should not read oversized file'); };
  const unreadable = file(); unreadable.text = () => Promise.reject(new Error('Private implementation detail'));
  for (const [selected, error] of [[new File(['{'], 'broken.json'), /not valid JSON/], [file(badAnswer), /zero-based index/],
    [oversized, /256 KiB/], [unreadable, /could not be read/]]) {
    const root = editorFixture();
    const before = root.draft;
    root.select(selected);
    await settle();
    assert.equal(root.draft, before);
    assert.equal(root.calls.length, 0);
    assert.equal(root.control('open-preview').hidden, true);
    assert.match(root.control('author-status').textContent, error);
    assert.match(root.control('author-status').textContent, /current draft is unchanged/);
    assert.equal(root.activeElement.id, 'open-deck-button');
    assert.equal(root.control('open-deck').value, '');
    root.select(file()); await settle(); root.control('replace-draft').click();
    assert.equal(root.calls.length, 1);
  }
  assert.equal(oversizedRead, false);
});

test('explicit Keep current draft clears staged replacement and restores the open control focus', async () => {
  const root = editorFixture();
  const before = root.draft;
  root.select(file()); await settle();
  root.control('cancel-open').click();
  root.control('replace-draft').click();
  assert.equal(root.draft, before);
  assert.equal(root.calls.length, 0);
  assert.equal(root.control('open-preview').hidden, true);
  assert.equal(root.activeElement.id, 'open-deck-button');
  assert.match(root.control('author-status').textContent, /preview was cancelled/);
});

test('opening another chooser invalidates its old preview even when the chooser is cancelled', async () => {
  const root = editorFixture();
  const before = root.draft;
  root.select(file()); await settle();
  root.control('open-deck').value = 'C:\\fakepath\\workshop.json';
  root.control('open-deck-button').click();
  assert.equal(root.control('open-deck').clicks, 1);
  assert.equal(root.control('open-deck').value, '');
  assert.equal(root.control('open-preview').hidden, true);
  root.control('open-deck').dispatchEvent(new Event('cancel'));
  root.control('replace-draft').click();
  assert.equal(root.draft, before);
  assert.equal(root.calls.length, 0);
  assert.equal(root.activeElement.id, 'open-deck-button');
});

test('a newer valid choice wins over an earlier slow success or failure', async () => {
  for (const completion of ['resolve', 'reject']) {
    const root = editorFixture();
    const slow = deferred(); const first = file(); first.text = () => slow.promise;
    root.select(first);
    const latest = original(); latest.title = 'Latest deck'; latest.items[0].answer = 2;
    root.select(file(latest, 'latest.json')); await settle();
    const before = root.control('author-status').textContent;
    if (completion === 'resolve') slow.resolve(JSON.stringify(original()));
    else slow.reject(new Error('Late failure'));
    await settle();
    assert.equal(root.control('author-status').textContent, before);
    assert.equal(root.control('open-preview-title').textContent, 'Open “Latest deck”?');
    root.control('replace-draft').click();
    assert.deepEqual(root.draft, parseDeck(JSON.stringify(latest)));
    assert.equal(root.calls.length, 1);
  }
});

test('cancelled or empty file selection prevents a late read from reopening a preview', async () => {
  for (const cancelledBy of ['native cancel', 'empty change']) {
    const root = editorFixture(); const before = root.draft;
    const slow = deferred(); const selected = file(); selected.text = () => slow.promise;
    root.select(selected);
    if (cancelledBy === 'native cancel') root.control('open-deck').dispatchEvent(new Event('cancel'));
    else root.select(null);
    const status = root.control('author-status').textContent;
    slow.resolve(JSON.stringify(original())); await settle();
    assert.equal(root.draft, before);
    assert.equal(root.calls.length, 0);
    assert.equal(root.control('open-preview').hidden, true);
    assert.equal(root.control('author-status').textContent, status);
  }
});

test('invalid newer files invalidate an earlier pending or staged valid deck', async () => {
  for (const slowFirst of [false, true]) {
    const root = editorFixture(); const before = root.draft;
    const slow = deferred(); const selected = file();
    if (slowFirst) selected.text = () => slow.promise;
    root.select(selected); if (!slowFirst) await settle();
    root.select(new File(['not JSON'], 'invalid.json')); await settle();
    if (slowFirst) { slow.resolve(JSON.stringify(original())); await settle(); }
    root.control('replace-draft').click();
    assert.equal(root.draft, before);
    assert.equal(root.calls.length, 0);
    assert.equal(root.control('open-preview').hidden, true);
    assert.match(root.control('author-status').textContent, /not valid JSON/);
  }
});
