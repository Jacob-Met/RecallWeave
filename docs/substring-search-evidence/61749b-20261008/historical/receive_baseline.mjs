import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseDeck } from './baseline/src/deck.mjs';
import { initialMastery, selectNextItem, updateMastery } from './baseline/src/knowledge.mjs';
import { createReview, beginPractice, currentPracticeItem, answerPractice } from './baseline/src/review.mjs';
import { createStudyNotes } from './baseline/src/session-export.mjs';

const home = new URL('./', import.meta.url);
const pin = JSON.parse(readFileSync(new URL('source-pins.json', home), 'utf8'));
const digest = data => createHash('sha256').update(data).digest('hex');
function sourceState() {
  return pin.files.map(file => {
    const bytes = readFileSync(new URL(`baseline/${file.path}`, home));
    assert.equal(digest(bytes), file.sha256, file.path);
    return { path: file.path, sha256: digest(bytes), bytes: bytes.length };
  });
}
const before = sourceState();
const raw = readFileSync(new URL('baseline/courses/binary-search.json', home), 'utf8');
const deck = parseDeck(raw);
assert.equal(deck.items.length, 12);
const asked = new Set(), answers = [], mastery = initialMastery(deck.concepts);
while (asked.size < deck.items.length) {
  const item = selectNextItem(deck.items, asked, mastery);
  assert.ok(item && !asked.has(item.id));
  const correct = asked.size % 2 === 0;
  const choice = correct ? item.answer : (item.answer + 1) % item.options.length;
  asked.add(item.id); answers.push({ item: item.id, choice });
  mastery[item.concept] = updateMastery(mastery[item.concept], correct);
}
assert.equal(selectNextItem(deck.items, asked, mastery), null);
const review = createReview(deck.items, answers);
const initialReview = JSON.stringify(review), initialMasteryState = JSON.stringify(mastery);
let practice = beginPractice(review);
while (currentPracticeItem(practice)) {
  const item = currentPracticeItem(practice);
  practice = answerPractice(practice, item.id, item.answer);
}
assert.equal(practice.answers.length, 6);
assert.equal(JSON.stringify(review), initialReview);
assert.equal(JSON.stringify(mastery), initialMasteryState);
const notes = createStudyNotes({ deck, review, mastery, practice, exportedAt: '2026-10-08T15:00:00Z' });
for (const item of deck.items) {
  assert.ok(notes.text.includes(item.prompt));
  assert.ok(notes.text.includes(item.explanation));
  assert.ok(notes.text.includes(item.transfer));
}
assert.ok(notes.text.includes(deck.attribution));
assert.ok(notes.text.includes(deck.license));
assert.deepEqual(sourceState(), before);
const receipt = {
  kind: 'One native existing-course public-API workflow; no browser or new-course implementation',
  source_head: pin.source_head, source_tree: pin.source_tree,
  runtime: process.version, platform: process.platform,
  course: deck.title, questions: deck.items.length, first_answers: answers.length,
  deliberately_missed: 6, completed_practice_answers: practice.answers.length,
  all_authored_feedback_retained_in_notes: true,
  first_review_and_mastery_unchanged_by_practice: true,
  notes_bytes: Buffer.byteLength(notes.text), notes_sha256: digest(Buffer.from(notes.text)),
  source_files_unchanged: before,
  proposed_topic: 'Substring search and prefix fallback',
  topic_absence_evidence: 'Complete remote tree and all72 issue/PR records inspected separately; this baseline tests the existing binary-search course only',
  limits: ['Native model/import/review/notes execution only', 'No browser, DOM, file-picker, download or deployment acceptance', 'No learning efficacy or assessment validity claim']
};
const out = process.argv[2];
if (!out) throw new Error('choose a new receipt path');
writeFileSync(resolve(out), `${JSON.stringify(receipt, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
process.stdout.write(`${JSON.stringify({ questions: 12, first_answers: 12, practice_answers: 6, source_files_unchanged: before.length, receipt: resolve(out) })}\n`);
