/** Execute the authored course through RecallWeave's unchanged local learning core. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [repository, validatorPath, outputPath] = process.argv.slice(2);
if (!repository || !validatorPath || !outputPath) {
  throw new Error('Usage: node verify_course.mjs REPOSITORY VALIDATOR_MJS OUTPUT_DIRECTORY');
}
const root = resolve(repository);
const output = resolve(outputPath);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const importSource = path => import(pathToFileURL(resolve(root, path)).href);
const { parseDeck, serializeDeck } = await import(pathToFileURL(resolve(validatorPath)).href);
const { initialMastery, selectNextItem, updateMastery } = await importSource('src/knowledge.mjs');
const { createReview, beginPractice, currentPracticeItem, answerPractice } = await importSource('src/review.mjs');
const { createStudyNotes } = await importSource('src/session-export.mjs');
const { orderOptions } = await importSource('src/answer-order.mjs');
const sourcePaths = [
  'courses/membrane-transport.json', 'courses/membrane-transport.md',
  'src/knowledge.mjs', 'src/review.mjs', 'src/session-export.mjs', 'src/answer-order.mjs'
];
const pins = {};
for (const path of sourcePaths) {
  const bytes = await readFile(resolve(root, path));
  pins[path] = { sha256: hash(bytes), bytes: bytes.length };
}
const validator = await readFile(resolve(validatorPath));
const text = await readFile(resolve(root, sourcePaths[0]), 'utf8');
const guide = await readFile(resolve(root, sourcePaths[1]), 'utf8');
const deck = parseDeck(text);
assert.equal(serializeDeck(deck), text);
assert.deepEqual(parseDeck(serializeDeck(deck)), deck);
assert.equal(deck.items.length, 12);
assert.equal(deck.concepts.length, 4);
assert.ok(Object.isFrozen(deck) && Object.isFrozen(deck.items));
assert.ok(deck.items.every(item => item.options.length === 4 && Object.isFrozen(item.options)));
const answerPositions = [0, 1, 2, 3].map(answer => deck.items.filter(item => item.answer === answer).length);
assert.deepEqual(answerPositions, [3, 3, 3, 3]);
const conceptCounts = Object.fromEntries(deck.concepts.map(concept => [concept, deck.items.filter(item => item.concept === concept).length]));
assert.ok(Object.values(conceptCounts).every(count => count === 3));
for (const item of deck.items) {
  assert.ok(guide.includes(`\`${item.id}\``));
  assert.ok(guide.includes(item.options[item.answer]));
}

await mkdir(output, { recursive: true });
const exportedAt = '2026-10-08T12:00:00.000Z';
const notesArtifacts = [];
async function notesFor(label, input, expectedCorrect) {
  const notes = createStudyNotes({ deck, exportedAt, ...input });
  assert.equal(notes.mediaType, 'text/plain;charset=utf-8');
  assert.ok(notes.text.includes(`${expectedCorrect} of 12 connections correct on the first try.`));
  assert.ok(notes.text.includes('not a validated assessment'));
  assert.ok(notes.text.includes(deck.title) && notes.text.includes(deck.attribution) && notes.text.includes(deck.license));
  let previous = -1;
  for (const item of input.review) {
    const position = notes.text.indexOf(item.prompt);
    assert.ok(position > previous);
    previous = position;
    for (const expected of [
      `Your first answer: ${item.options[item.choice]}`,
      `Correct answer: ${item.options[item.answer]}`,
      `Explanation: ${item.explanation}`,
      `Apply the idea: ${item.transfer}`
    ]) assert.ok(notes.text.includes(expected));
  }
  for (const retry of input.practice?.answers ?? []) {
    const item = deck.items.find(candidate => candidate.id === retry.item);
    assert.ok(notes.text.includes(`Practice answer: ${item.options[retry.choice]}`));
  }
  assert.equal(Buffer.from(notes.text, 'utf8').toString('utf8'), notes.text);
  const artifact = `${label}.txt`;
  await writeFile(resolve(output, artifact), notes.text);
  notesArtifacts.push({ path: artifact, sha256: hash(notes.text), bytes: Buffer.byteLength(notes.text) });
  return notes.text;
}

const scenarios = [];
for (const mode of ['all-correct', 'all-wrong', 'mixed']) {
  const mastery = initialMastery(deck.concepts);
  const asked = new Set();
  const answers = [];
  const presentations = [];
  while (asked.size < deck.items.length) {
    const item = selectNextItem(deck.items, asked, mastery);
    assert.ok(item && !asked.has(item.id));
    const expectedCorrect = mode === 'all-correct' || (mode === 'mixed' && answers.length % 2 === 0);
    const choice = expectedCorrect ? item.answer : (item.answer + 1) % item.options.length;
    const display = orderOptions(item.options.length, () => mode === 'all-correct' ? 0.1 : 0.8);
    const displayedChoice = display.indexOf(choice);
    assert.equal(item.options[display[displayedChoice]], item.options[choice]);
    const savedChoice = display[displayedChoice];
    asked.add(item.id);
    answers.push({ item: item.id, choice: savedChoice });
    presentations.push({ item: item.id, display: [...display], displayed_choice: displayedChoice, canonical_choice: savedChoice });
    mastery[item.concept] = updateMastery(mastery[item.concept], savedChoice === item.answer);
  }
  assert.equal(selectNextItem(deck.items, asked, mastery), null);
  assert.equal(asked.size, 12);
  const review = createReview(deck.items, answers);
  assert.deepEqual(review.map(item => item.id), answers.map(answer => answer.item));
  const correctCount = review.filter(item => item.correct).length;
  assert.equal(correctCount, mode === 'all-correct' ? 12 : mode === 'all-wrong' ? 0 : 6);
  const snapshot = JSON.stringify({ answers, review, mastery });
  const initialNotes = await notesFor(`${mode}-first-session`, { review, mastery }, correctCount);
  let practice = beginPractice(review);
  assert.equal(practice.items.length, 12 - correctCount);
  if (practice.items.length) {
    assert.ok(initialNotes.includes(`Not started. ${practice.items.length} missed connections`));
    while (currentPracticeItem(practice)) {
      const item = currentPracticeItem(practice);
      const retryCorrect = mode === 'all-wrong' || practice.answers.length % 2 === 0;
      practice = answerPractice(practice, item.id, retryCorrect ? item.answer : (item.answer + 2) % item.options.length);
    }
    const retryCorrectCount = practice.answers.filter(answer => answer.correct).length;
    assert.equal(retryCorrectCount, mode === 'all-wrong' ? 12 : 3);
    const completedNotes = await notesFor(`${mode}-completed-practice`, { review, mastery, practice }, correctCount);
    assert.ok(completedNotes.includes(`Complete: ${practice.items.length} of ${practice.items.length} practice answers recorded; ${retryCorrectCount} correct on retry.`));
  } else {
    assert.equal(currentPracticeItem(practice), null);
    assert.ok(initialNotes.includes('No missed connections in the first session.'));
  }
  assert.equal(JSON.stringify({ answers, review, mastery }), snapshot);
  scenarios.push({ mode, first_correct: correctCount, questions: answers.length, answers, presentations, mastery, practice_answers: practice.answers });
}
for (const concept of deck.concepts) {
  assert.ok(scenarios[0].mastery[concept] > scenarios[1].mastery[concept]);
}

const baseline = 'd14edbb014b3b4ad92c2d016f7bc1e573bb93324';
const baselineAbsent = sourcePaths.slice(0, 2).map(path => {
  const result = spawnSync('git', ['cat-file', '-e', `${baseline}:${path}`], { cwd: root, encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  const listed = execFileSync('git', ['ls-tree', '--name-only', baseline, '--', path], { cwd: root, encoding: 'utf8' });
  assert.equal(listed, '');
  return { path, status: result.status, stderr: result.stderr.trim() };
});
for (const path of sourcePaths.slice(2)) {
  const bytes = execFileSync('git', ['show', `${baseline}:${path}`], { cwd: root });
  assert.equal(hash(bytes), pins[path].sha256);
}
const report = {
  status: 'pass',
  boundary: 'Native format and unchanged learning-core execution. This is not browser file-picker, download, standalone, or finalized importer integration acceptance.',
  node: process.version,
  source_commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  baseline, baseline_course_absence: baselineAbsent,
  source_pins: pins,
  validator: { path: resolve(validatorPath), sha256: hash(validator), bytes: validator.length },
  contract: { question_count: 12, concept_counts: conceptCounts, answer_position_counts: answerPositions, canonical_round_trip: true },
  scenarios, notes: notesArtifacts,
  checks: ['exact validator parse and serialization', 'guide answer identity', 'all 12 adaptive questions exhausted without repetition', 'display order to canonical answer mapping', '12/12 versus 0/12 versus 6/12 changed-input outcomes', 'correct and incorrect practice kept separate', 'first answers and model state unchanged by practice', 'every explanation, transfer and attribution in UTF-8 notes', 'production learning modules unchanged from actual source parent']
};
await writeFile(resolve(output, 'native-course-report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, source_commit: report.source_commit, scenarios: scenarios.map(({ mode, first_correct, questions, practice_answers }) => ({ mode, first_correct, questions, practice_answers: practice_answers.length })), report: resolve(output, 'native-course-report.json') }));
