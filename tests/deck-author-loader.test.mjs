import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { mountAuthorDeckLoader } from '../src/deck-author-loader.mjs';
import { MAX_DECK_BYTES, parseDeck } from '../src/deck.mjs';
import { createDraft, addConcept, addQuestion } from '../src/deck-author.mjs';
import { DRAFT_FORMAT, MAX_DRAFT_BYTES, parseAuthorDraft, serializeAuthorDraft } from '../src/deck-author-draft.mjs';

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
const bytes = text => new TextEncoder().encode(text).buffer;
const settle = async () => { await setImmediate(); await setImmediate(); };
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

// EventTarget supplies native event delivery; real DOM/focus/file behavior has a
// separate Chromium receiving suite. This fixture observes the editor boundary.
function editorFixture() {
  const root = { activeElement: null, calls: [], kinds: [], draft: { title: 'Unsaved draft', text: 'Keep this writing' } };
  class Control extends EventTarget {
    constructor(id) { super(); this.id = id; this.textContent = ''; this.hidden = false; this.disabled = false; this.value = ''; this.files = []; this.clicks = 0; }
    focus() { root.activeElement = this; }
    click() { this.clicks++; if (!this.disabled) this.dispatchEvent(new Event('click')); }
  }
  const controls = new Map(['open-deck-button', 'open-deck', 'author-status', 'open-preview',
    'open-preview-title', 'open-preview-summary', 'replace-draft', 'cancel-open', 'open-preview-kind'].map(id => [id, new Control(id)]));
  root.querySelector = selector => controls.get(selector.slice(1));
  root.control = id => controls.get(id);
  root.select = selected => {
    root.control('open-deck').files = selected ? [selected] : [];
    root.control('open-deck').dispatchEvent(new Event('change'));
  };
  mountAuthorDeckLoader(root, (content, kind) => { root.calls.push(content); root.kinds.push(kind); root.draft = content; });
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
  const oversized = new File(['x'.repeat(MAX_DRAFT_BYTES + 1)], 'large.json');
  let oversizedRead = false;
  oversized.arrayBuffer = () => { oversizedRead = true; throw new Error('Should not read oversized file'); };
  const unreadable = file(); unreadable.arrayBuffer = () => Promise.reject(new Error('Private implementation detail'));
  for (const [selected, error] of [[new File(['{'], 'broken.json'), /not valid JSON/], [file(badAnswer), /zero-based index/],
    [oversized, /2 MiB/], [unreadable, /could not be read/]]) {
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

test('unfinished and cyclic draft files stage visibly and replace once with an immutable editable state', async () => {
  const draft = createDraft();
  const second = addConcept(draft); second.name = draft.concepts[0].name;
  const question = addQuestion(draft); question.conceptKey = second.key;
  draft.questions[0].prerequisiteKeys = [second.key];
  question.prerequisiteKeys = [draft.concepts[0].key];
  draft.questions[0].prompt = 'Unfinished <literal> writing\nwith no answer yet';
  const beforeInput = structuredClone(draft);
  const text = serializeAuthorDraft(draft);
  const root = editorFixture(); const before = root.draft;
  root.select(new File([text], 'unfinished.draft.json'));
  await settle();
  assert.equal(root.draft, before);
  assert.deepEqual(draft, beforeInput);
  assert.equal(root.control('open-preview-kind').textContent, 'EDITABLE DRAFT · MAY BE UNFINISHED');
  assert.equal(root.control('open-preview-title').textContent, 'Open draft “Untitled draft”?');
  assert.match(root.control('open-preview-summary').textContent, /2 questions · 2 concepts/);
  root.control('replace-draft').click(); root.control('replace-draft').click();
  assert.deepEqual(root.kinds, ['draft']);
  assert.deepEqual(root.draft, parseAuthorDraft(text));
  assert.equal(root.draft.questions[0].answerKey, null);
  assert.ok(Object.isFrozen(root.draft.questions[0].options));
  assert.equal(serializeAuthorDraft(root.draft), text);
});

test('a draft suffix cannot admit an oversized lesson deck through the larger draft-file limit', async () => {
  const content = original(); content.license = 'x'.repeat(MAX_DECK_BYTES);
  const selected = new File([JSON.stringify(content)], 'oversized.draft.json');
  assert.ok(selected.size > MAX_DECK_BYTES && selected.size < MAX_DRAFT_BYTES);
  const root = editorFixture(); const before = root.draft;
  root.select(selected); await settle();
  assert.equal(root.draft, before);
  assert.equal(root.calls.length, 0);
  assert.match(root.control('author-status').textContent, /256 KiB/);
  assert.equal(root.control('open-preview').hidden, true);
});

test('malformed and unsupported editable drafts preserve the old draft and retire pending previews', async () => {
  const good = JSON.parse(serializeAuthorDraft(createDraft()));
  const future = structuredClone(good); future.format = 'recallweave-author-draft/2';
  const dangling = structuredClone(good); dangling.draft.questions[0].answerKey = 'option-999';
  const counter = structuredClone(good); counter.draft.nextKey = 0;
  for (const document of [future, dangling, counter, { format: DRAFT_FORMAT, draft: null }]) {
    const root = editorFixture(); const before = root.draft;
    root.select(file()); await settle();
    root.select(new File([JSON.stringify(document)], 'rejected.json')); await settle();
    root.control('replace-draft').click();
    assert.equal(root.draft, before);
    assert.equal(root.calls.length, 0);
    assert.equal(root.control('open-preview').hidden, true);
    assert.equal(root.control('open-preview-kind').textContent, '');
    assert.match(root.control('author-status').textContent, /current draft is unchanged/);
    assert.equal(root.activeElement.id, 'open-deck-button');
  }
});

test('newest selected format wins across slow draft-to-deck and deck-to-draft reads', async () => {
  const draft = createDraft(); draft.title = 'Latest editable work';
  const draftText = serializeAuthorDraft(draft);
  const deckText = JSON.stringify(original());
  for (const [first, latest, kind] of [[draftText, deckText, 'deck'], [deckText, draftText, 'draft']]) {
    const root = editorFixture(); const slow = deferred();
    const selected = new File([first], 'earlier.json'); selected.arrayBuffer = () => slow.promise;
    root.select(selected);
    root.select(new File([latest], 'latest.json')); await settle();
    const label = root.control('open-preview-kind').textContent;
    const summary = root.control('open-preview-summary').textContent;
    slow.resolve(bytes(first)); await settle();
    assert.equal(root.control('open-preview-kind').textContent, label);
    assert.equal(root.control('open-preview-summary').textContent, summary);
    root.control('replace-draft').click();
    assert.deepEqual(root.kinds, [kind]);
    assert.deepEqual(root.draft, kind === 'draft' ? parseAuthorDraft(latest) : parseDeck(latest));
  }
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
    const slow = deferred(); const first = file(); first.arrayBuffer = () => slow.promise;
    root.select(first);
    const latest = original(); latest.title = 'Latest deck'; latest.items[0].answer = 2;
    root.select(file(latest, 'latest.json')); await settle();
    const before = root.control('author-status').textContent;
    if (completion === 'resolve') slow.resolve(bytes(JSON.stringify(original())));
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
    const slow = deferred(); const selected = file(); selected.arrayBuffer = () => slow.promise;
    root.select(selected);
    if (cancelledBy === 'native cancel') root.control('open-deck').dispatchEvent(new Event('cancel'));
    else root.select(null);
    const status = root.control('author-status').textContent;
    slow.resolve(bytes(JSON.stringify(original()))); await settle();
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
    if (slowFirst) selected.arrayBuffer = () => slow.promise;
    root.select(selected); if (!slowFirst) await settle();
    root.select(new File(['not JSON'], 'invalid.json')); await settle();
    if (slowFirst) { slow.resolve(bytes(JSON.stringify(original()))); await settle(); }
    root.control('replace-draft').click();
    assert.equal(root.draft, before);
    assert.equal(root.calls.length, 0);
    assert.equal(root.control('open-preview').hidden, true);
    assert.match(root.control('author-status').textContent, /not valid JSON/);
  }
});


// Exercise actual File bytes, not replacement characters in already-decoded text.
const rawTitleFile = (document, raw, name = 'raw-title.json') => {
  const text = JSON.stringify(document);
  const marker = '"BYTE_MARKER"';
  const at = text.indexOf(marker);
  assert.notEqual(at, -1);
  return new File([text.slice(0, at + 1), new Uint8Array(raw), text.slice(at + marker.length - 1)], name);
};
const admissionDocuments = () => {
  const draft = createDraft(); draft.title = 'BYTE_MARKER';
  const deck = original(); deck.title = 'BYTE_MARKER';
  return [JSON.parse(serializeAuthorDraft(draft)), deck];
};

test('malformed UTF-8 in either format refuses atomically, retires an earlier preview and allows retry', async () => {
  const malformed = [[0x80], [0xff], [0xc0, 0xaf], [0xc2], [0xe2, 0x82], [0xf0, 0x9f, 0x92],
    [0xe2, 0x28, 0xa1], [0xed, 0xa0, 0x80], [0xf4, 0x90, 0x80, 0x80], [0xf5, 0x80, 0x80, 0x80]];
  for (const document of admissionDocuments()) {
    for (const raw of malformed) {
      const root = editorFixture(); const before = root.draft;
      root.select(file()); await settle();
      assert.equal(root.control('open-preview').hidden, false);
      root.select(rawTitleFile(document, raw)); await settle();
      root.control('replace-draft').click();
      assert.equal(root.draft, before);
      assert.equal(root.calls.length, 0);
      assert.equal(root.control('open-preview').hidden, true);
      assert.equal(root.control('replace-draft').disabled, true);
      assert.match(root.control('author-status').textContent, /not valid UTF-8/);
      assert.match(root.control('author-status').textContent, /current draft is unchanged/);
      assert.equal(root.activeElement.id, 'open-deck-button');
      root.select(file()); await settle(); root.control('replace-draft').click();
      assert.equal(root.calls.length, 1);
    }
  }
});

test('literal replacement, accented, decomposed, astral and embedded BOM characters remain exact', async () => {
  const title = 'Literal \uFFFD \u00E9 e\u0301 \uD83D\uDE80 \uFEFF text';
  for (const document of admissionDocuments()) {
    for (const leadingBOM of [false, true]) {
      const selected = rawTitleFile(document, new TextEncoder().encode(title), 'literal-\u00E9.json');
      const withBOM = leadingBOM ? new File([new Uint8Array([0xef,0xbb,0xbf]), await selected.arrayBuffer()], selected.name) : selected;
      const root = editorFixture(); const before = root.draft;
      root.select(withBOM); await settle();
      assert.equal(root.draft, before);
      assert.equal(root.calls.length, 0);
      assert.equal(root.control('open-preview').hidden, false);
      assert.match(root.control('open-preview-summary').textContent, /literal-\u00E9\.json/);
      root.control('replace-draft').click();
      assert.equal(root.draft.title, title);
      assert.equal(root.calls.length, 1);
    }
  }
});

test('a second leading BOM remains JSON content and is refused as before', async () => {
  const root = editorFixture(); const before = root.draft;
  root.select(new File(['\uFEFF\uFEFF', JSON.stringify(original())], 'double-bom.json')); await settle();
  assert.equal(root.draft, before);
  assert.equal(root.calls.length, 0);
  assert.match(root.control('author-status').textContent, /not valid JSON/);
});

test('raw bytes retain exact two-MiB admission and pre-read and post-read overflow refusal', async () => {
  const text = serializeAuthorDraft(createDraft());
  const exact = new File([text, ' '.repeat(MAX_DRAFT_BYTES - new TextEncoder().encode(text).byteLength)], 'exact.json');
  assert.equal(exact.size, MAX_DRAFT_BYTES);
  const root = editorFixture(); root.select(exact); await settle();
  assert.equal(root.control('open-preview').hidden, false);
  root.control('replace-draft').click();
  assert.equal(root.calls.length, 1);
  let reads = 0;
  const oversized = new File([new Uint8Array(MAX_DRAFT_BYTES + 1)], 'over.json');
  oversized.arrayBuffer = () => { reads++; throw new Error('must not read'); };
  const dishonestSize = file(); dishonestSize.arrayBuffer = async () => new ArrayBuffer(MAX_DRAFT_BYTES + 1);
  for (const selected of [oversized, dishonestSize]) {
    const before = root.draft;
    root.select(selected); await settle(); root.control('replace-draft').click();
    assert.equal(root.draft, before);
    assert.equal(root.calls.length, 1);
    assert.equal(root.control('open-preview').hidden, true);
    assert.match(root.control('author-status').textContent, /2 MiB/);
  }
  assert.equal(reads, 0);
});

test('late malformed bytes cannot replace a newer valid preview or overwrite a cancellation status', async () => {
  for (const cancelLatest of [false, true]) {
    const root = editorFixture(); const before = root.draft;
    const slow = deferred(); const selected = file(); selected.arrayBuffer = () => slow.promise;
    root.select(selected);
    if (cancelLatest) root.control('open-deck').dispatchEvent(new Event('cancel'));
    else { root.select(file()); await settle(); }
    const status = root.control('author-status').textContent;
    slow.resolve(new Uint8Array([0xff]).buffer); await settle();
    assert.equal(root.control('author-status').textContent, status);
    if (cancelLatest) {
      root.control('replace-draft').click();
      assert.equal(root.draft, before); assert.equal(root.calls.length, 0);
    } else {
      assert.equal(root.control('open-preview').hidden, false);
      root.control('replace-draft').click(); assert.equal(root.calls.length, 1);
    }
  }
});
