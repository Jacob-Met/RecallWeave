// SPDX-License-Identifier: MIT
// Content-format review and blinded-question preparation; no app or author source edits.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDeck, serializeDeck } from './owner-deck-validator.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const input = process.argv[2];
assert(input, 'Usage: node review_course_format.mjs <frozen-course.json>');
const bytes = await fs.readFile(input);
const text = bytes.toString('utf8');
assert.deepEqual(Buffer.from(text, 'utf8'), bytes, 'Course file must be valid UTF-8');
const contract = JSON.parse(await fs.readFile(path.join(root, 'author-contract.json'), 'utf8'));
const deck = parseDeck(text);
assert.equal(deck.format, contract.format.version);
assert.equal(deck.items.length, contract.question_count);
assert.deepEqual([...deck.concepts].sort(), [...contract.concepts].sort());
const counts = Object.fromEntries(deck.concepts.map(concept => [concept, 0]));
const positions = Array(contract.options_per_question).fill(0);
for (const item of deck.items) {
  counts[item.concept] += 1;
  positions[item.answer] += 1;
  assert.equal(item.options.length, contract.options_per_question);
  assert.deepEqual([...item.prerequisites].sort(), [...contract.prerequisites[item.concept]].sort());
}
assert.deepEqual(positions, contract.answer_position_counts);
for (const [index, concept] of contract.concepts.entries()) {
  assert.equal(counts[concept], contract.concept_question_counts[index]);
}
const canonical = serializeDeck(deck);
assert.deepEqual(parseDeck(canonical), deck, 'Content changed through the actual validator round trip');
const negativeControls = [];
const invalidAnswer = JSON.parse(text);
invalidAnswer.items[0].answer = contract.options_per_question;
assert.throws(() => parseDeck(JSON.stringify(invalidAnswer)), /zero-based index/);
negativeControls.push('An out-of-range canonical answer is refused');
const invalidGraph = JSON.parse(text);
const rootItem = invalidGraph.items.find(item => item.concept === contract.concepts[0]);
rootItem.prerequisites = [contract.concepts[1]];
assert.throws(() => parseDeck(JSON.stringify(invalidGraph)), /cycle/);
negativeControls.push('A newly cyclic prerequisite dependency is refused');
assert.deepEqual(await fs.readFile(input), bytes, 'Review modified the source course');

const measurements = deck.items.map(item => {
  const lengths = item.options.map(option => [...option].length);
  const longest = Math.max(...lengths);
  const shortest = Math.min(...lengths);
  return {
    id: item.id,
    codepoint_lengths: lengths,
    word_counts: item.options.map(option => option.trim().split(/\s+/u).length),
    unique_longest_correct: lengths.filter(length => length === longest).length === 1 && lengths[item.answer] === longest,
    unique_shortest_correct: lengths.filter(length => length === shortest).length === 1 && lengths[item.answer] === shortest,
  };
});
const report = {
  course_path: path.resolve(input),
  course_sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  bytes: bytes.length,
  validator_sha256: crypto.createHash('sha256').update(await fs.readFile(path.join(root, 'owner-deck-validator.mjs'))).digest('hex'),
  program_sha256: crypto.createHash('sha256').update(await fs.readFile(fileURLToPath(import.meta.url))).digest('hex'),
  passed: true,
  format_only_not_scientific_or_browser_acceptance: true,
  item_count: deck.items.length,
  concept_counts: counts,
  answer_position_counts: positions,
  semantic_round_trip_equal: true,
  negative_controls: negativeControls,
  answer_cue_measurements: measurements,
  unique_longest_correct_count: measurements.filter(item => item.unique_longest_correct).length,
  unique_shortest_correct_count: measurements.filter(item => item.unique_shortest_correct).length,
};
const blind = deck.items.map(item => ({
  id: item.id, concept: item.concept, prompt: item.prompt, options: item.options, transfer: item.transfer,
}));
await fs.writeFile(path.join(root, 'format-review.json'), `${JSON.stringify(report, null, 2)}\n`);
await fs.writeFile(path.join(root, 'blinded-items.json'), `${JSON.stringify(blind, null, 2)}\n`);
await fs.writeFile(path.join(root, 'validator-round-trip.json'), canonical);
console.log(JSON.stringify({
  format_passed: true,
  course_sha256: report.course_sha256,
  blinded_questions: path.join(root, 'blinded-items.json'),
  full_format_receipt: path.join(root, 'format-review.json'),
  reminder: 'Solve blinded questions before reading answer-cue metrics or source key/explanations.',
}, null, 2));
