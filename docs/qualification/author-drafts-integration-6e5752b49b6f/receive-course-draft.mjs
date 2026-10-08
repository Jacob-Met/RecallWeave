import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [rootArg, output] = process.argv.slice(2);
assert.ok(rootArg && output, 'Usage: node receive-course-draft.mjs SOURCE_ROOT RECEIPT');
const root = resolve(rootArg);
const load = path => import(pathToFileURL(resolve(root, path)));
const hash = data => createHash('sha256').update(data).digest('hex');
const course = readFileSync(resolve(root, 'courses/dependency-graphs.json'));
assert.equal(hash(course), 'e6538a1a28c6a1ce31be2b20095abf8c0d4461c4ba3aa07388181f9efd57810d');
const paths = ['src/deck.mjs', 'src/deck-author.mjs', 'src/deck-author-draft.mjs'];
const beforeHashes = Object.fromEntries(paths.map(path => [path, hash(readFileSync(resolve(root, path)))]));
assert.deepEqual(beforeHashes, {
  'src/deck.mjs': '621438c166ec4bfafd9d87c698a1d46cb1722f4fb92dcbb8d9f52fce682c338b',
  'src/deck-author.mjs': 'd443977f51db94d9bbdacd123e3316d6aa2a7b21a39ef97ed0b3fa1ada854719',
  'src/deck-author-draft.mjs': '32ad1cf04b6aacf26de9b1e5a73646586fcd79c666a160e60c6c085faac1a0ac',
});
const { parseDeck } = await load('src/deck.mjs');
const { draftFromDeck, checkDraft } = await load('src/deck-author.mjs');
const { parseAuthorDraft, serializeAuthorDraft } = await load('src/deck-author-draft.mjs');
const deck = parseDeck(course.toString('utf8'));
const writing = draftFromDeck(deck);
const untouched = structuredClone(writing);
const checkedBefore = checkDraft(writing);
assert.equal(checkedBefore.ok, true);
const saved = serializeAuthorDraft(writing);
assert.deepEqual(writing, untouched, 'saving does not modify the edited course');
const reopened = parseAuthorDraft(saved);
assert.ok(Object.isFrozen(reopened) && Object.isFrozen(reopened.questions[0].options));
assert.equal(serializeAuthorDraft(reopened), saved);
const checkedAfter = checkDraft(structuredClone(reopened));
assert.equal(checkedAfter.ok, true);
assert.equal(checkedAfter.json, checkedBefore.json);
assert.deepEqual(parseDeck(checkedAfter.json), deck);
assert.deepEqual(deck.items.map(item => item.id), reopened.questions.map(item => item.id));
for (let index = 0; index < deck.items.length; index++) {
  const item = deck.items[index];
  const restored = reopened.questions[index];
  assert.equal(restored.options.find(option => option.key === restored.answerKey).text, item.options[item.answer]);
  assert.equal(restored.explanation, item.explanation);
  assert.equal(restored.transfer, item.transfer);
}
assert.deepEqual(Object.fromEntries(paths.map(path => [path, hash(readFileSync(resolve(root, path)))])), beforeHashes);
assert.equal(hash(readFileSync(resolve(root, 'courses/dependency-graphs.json'))), hash(course));
const receipt = {
  accepted: true, runtime: process.version, course_sha256: hash(course), course_bytes: course.length,
  questions: deck.items.length, concepts: deck.concepts.length, draft_bytes: Buffer.byteLength(saved),
  draft_sha256: hash(saved), checked_bytes: Buffer.byteLength(checkedAfter.json),
  checked_sha256: hash(checkedAfter.json),
  exact_course_semantics_and_checked_bytes_preserved: true,
  all_public_ids_correct_choices_feedback_and_graph_relationships_preserved: true,
  canonical_draft_bytes_stable: true, source_unchanged: true, source_sha256: beforeHashes,
  execution_boundary: 'Native actual-course format/editor integration; no new browser execution claimed',
};
writeFileSync(output, JSON.stringify(receipt, null, 2) + '\n');
process.stdout.write(JSON.stringify(receipt) + '\n');
