import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodeHamming74, inspectReceived74, runHamming74, formatHammingRecord } from '../courses/hamming-codes/model.mjs';
import { renderHammingPage } from '../courses/hamming-codes/page.mjs';
import { parseDeck, serializeDeck } from '../src/deck.mjs';
import { createReview, beginPractice, answerPractice } from '../src/review.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => readFileSync(resolve(root, relative), 'utf8');
const courseText = read('courses/hamming-codes.json');
const course = parseDeck(courseText);

test('known data words preserve all four bits in the declared positions', () => {
  assert.equal(encodeHamming74('0000'), '0000000');
  assert.equal(encodeHamming74('1111'), '1111111');
  assert.equal(encodeHamming74('1011'), '0110011');
  assert.equal(encodeHamming74('1010'), '1011010');
  const consistent = inspectReceived74('1011010');
  assert.equal(consistent.syndrome, 0);
  assert.equal(consistent.candidateData, '1010');
  assert.deepEqual(consistent.checks.map(check => check.ones), [2, 2, 2]);
});

test('the worked position-six error gives the observed parity sums and correct repair', () => {
  const run = runHamming74('1011', [6], 6);
  assert.equal(run.receivedWord, '0110001');
  assert.deepEqual(run.decoder.checks.map(check => check.ones), [2, 3, 1]);
  assert.equal(run.decoder.syndromeBits, '110');
  assert.equal(run.decoder.syndrome, 6);
  assert.equal(run.decoder.proposedPosition, 6);
  assert.equal(run.decoder.candidateWord, '0110011');
  assert.equal(run.decoder.candidateData, '1011');
  assert.deepEqual(run.truth, {
    flipCount: 1, withinSingleErrorAssumption: true, originalRecovered: true,
    remainingCodewordErrors: 0, remainingDataErrors: 0, outcome: 'corrected'
  });
  assert.equal(run.predictionCorrect, true);
});

test('all seven single-error positions include the parity-bit cases', () => {
  for (let position = 1; position <= 7; position++) {
    const run = runHamming74('0101', [position]);
    assert.equal(run.decoder.syndrome, position);
    assert.equal(run.decoder.candidateWord, run.codeword);
    assert.equal(run.decoder.candidateData, '0101');
    assert.equal(run.truth.outcome, 'corrected');
  }
});

test('the same received word can come from different histories, with the same decoder proposal', () => {
  const twoErrors = runHamming74('0000', [1, 2]);
  const oneError = runHamming74('1000', [3]);
  assert.equal(twoErrors.receivedWord, '1100000');
  assert.equal(oneError.receivedWord, '1100000');
  assert.deepEqual(twoErrors.decoder, oneError.decoder);
  assert.equal(twoErrors.decoder.candidateWord, '1110000');
  assert.equal(twoErrors.decoder.candidateData, '1000');
  assert.equal(twoErrors.truth.outcome, 'miscorrected');
  assert.equal(twoErrors.truth.originalRecovered, false);
  assert.equal(twoErrors.truth.remainingCodewordErrors, 3);
  assert.equal(twoErrors.truth.remainingDataErrors, 1);
  assert.equal(oneError.truth.outcome, 'corrected');
  assert.equal(oneError.truth.originalRecovered, true);
});

test('a three-error pattern and the all-seven pattern pass checks without recovering the sender', () => {
  const three = runHamming74('0000', [3, 1, 2]);
  assert.equal(three.receivedWord, '1110000');
  assert.equal(three.decoder.syndrome, 0);
  assert.equal(three.decoder.proposedPosition, null);
  assert.equal(three.decoder.candidateWord, '1110000');
  assert.equal(three.truth.outcome, 'undetected');
  assert.equal(three.truth.originalRecovered, false);
  const seven = runHamming74('1111', [7, 6, 5, 4, 3, 2, 1]);
  assert.equal(seven.decoder.candidateWord, '0000000');
  assert.equal(seven.truth.remainingCodewordErrors, 7);
  assert.equal(seven.truth.remainingDataErrors, 4);
  assert.equal(seven.truth.outcome, 'undetected');
});

test('no-error result and optional prediction do not invent a learner answer', () => {
  const clean = runHamming74('0010', []);
  assert.equal(clean.truth.outcome, 'clean');
  assert.equal(clean.truth.originalRecovered, true);
  assert.equal(clean.prediction, null);
  assert.equal(clean.predictionCorrect, null);
  assert.equal(runHamming74('0010', [], undefined).prediction, null);
  assert.equal(runHamming74('1011', [6], 0).predictionCorrect, false);
});

test('input positions and nested results remain immutable independent values', () => {
  const positions = [6, 2];
  const run = runHamming74('1011', positions);
  assert.deepEqual(positions, [6, 2]);
  assert.deepEqual(run.errorPositions, [2, 6]);
  positions[0] = 1;
  assert.deepEqual(run.errorPositions, [2, 6]);
  function frozen(value) {
    if (value && typeof value === 'object') {
      assert.ok(Object.isFrozen(value));
      for (const nested of Object.values(value)) frozen(nested);
    }
  }
  frozen(run);
  assert.throws(() => run.errorPositions.push(3), TypeError);
  assert.throws(() => { run.decoder.checks[0].positions[0] = 7; }, TypeError);
  assert.throws(() => { run.truth.originalRecovered = true; }, TypeError);
});

test('invalid words are refused without normalizing whitespace or losing leading zeros', () => {
  for (const bad of ['', '000', '00000', '0000\n', ' 0000', '10x1', '０１０１', 1011, null, undefined, ['1','0','1','1']]) {
    assert.throws(() => encodeHamming74(bad), TypeError);
    assert.throws(() => runHamming74(bad, []), TypeError);
  }
  for (const bad of ['', '000000', '00000000', '0000000\n', '10x1000', 1011010, null]) {
    assert.throws(() => inspectReceived74(bad), TypeError);
  }
  assert.equal(runHamming74('0000', []).dataBits, '0000');
});

test('invalid error masks and predictions are refused', () => {
  const sparse = new Array(2);
  sparse[1] = 3;
  for (const bad of [null, {}, '1', [0], [8], [-1], [1, 1], ['1'], [true], [1.5], [NaN], sparse, Array(1)]) {
    assert.throws(() => runHamming74('0000', bad), TypeError);
  }
  for (const bad of [-1, 8, 0.5, NaN, Infinity, '0', false, {}]) {
    assert.throws(() => runHamming74('0000', [], bad), TypeError);
  }
  assert.throws(() => formatHammingRecord(null), TypeError);
});

test('worked records preserve exact inputs and keep decoder knowledge separate from simulation truth', () => {
  const run = runHamming74('0000', [2, 1], 3);
  const record = formatHammingRecord(run);
  assert.equal(formatHammingRecord(run), record);
  assert.match(record, /Original data: 0000\nEncoded word: 0000000\nFlipped positions: 1, 2\nReceived word: 1100000/);
  assert.match(record, /RECEIVER \(RECEIVED BITS ONLY\)/);
  assert.match(record, /Syndrome value: 3\nOne-error decoder proposal: Flip position 3\./);
  assert.match(record, /Candidate word: 1110000\nCandidate data: 1000/);
  assert.match(record, /SIMULATION COMPARISON \(NOT INFORMATION AVAILABLE TO THE DECODER\)/);
  assert.match(record, /Original codeword recovered: no\./);
  assert.match(record, /Prediction: syndrome 3; matched/);
  assert.match(record, /No channel probability or real reliability is inferred\.\n$/);
  const forged = {...run, decoder: {...run.decoder, candidateWord: '0000000'}, truth: {...run.truth, originalRecovered: true}};
  assert.equal(formatHammingRecord(forged), record, 'derived fields cannot rewrite the replayed record');
});

test('the actual deck parser, review and practice consume all twelve questions without changing first answers', () => {
  assert.equal(course.items.length, 12);
  assert.equal(course.concepts.length, 4);
  for (const concept of course.concepts) assert.equal(course.items.filter(item => item.concept === concept).length, 3);
  assert.deepEqual(course.items.map(item => item.answer), [0, 1, 1, 2, 1, 0, 2, 0, 2, 1, 2, 1]);
  const answers = course.items.map(item => ({item: item.id, choice: (item.answer + 1) % item.options.length}));
  const review = createReview(course.items, answers);
  const before = JSON.stringify(review);
  let practice = beginPractice(review);
  for (const item of course.items) practice = answerPractice(practice, item.id, item.answer);
  assert.equal(practice.answers.length, 12);
  assert.ok(practice.answers.every(answer => answer.correct));
  assert.equal(JSON.stringify(review), before);
  assert.ok(review.every(item => !item.correct));
  assert.equal(parseDeck(serializeDeck(course)).title, course.title);
});

test('the standalone artifact exactly matches source generation and preserves the original course bytes', () => {
  const modelSource = read('courses/hamming-codes/model.mjs').replace(/^export \{[^\n]+\};\n?$/gm, '');
  const uiSource = read('courses/hamming-codes/explorer.mjs').replace(/^import [^\n]+;\n/gm, '');
  const html = renderHammingPage({modelSource, uiSource, deckText: courseText});
  assert.equal(read('courses/hamming-codes-explorer.html'), html);
  const embedded = html.match(/<script id="course-text" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(embedded);
  assert.equal(JSON.parse(embedded[1]), courseText);
  assert.match(html, /<html lang="en">/);
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+href=/i);
  const hazardous = JSON.stringify({...course, title: '</script><b>literal & text</b>'}, null, 2) + '\n';
  const guarded = renderHammingPage({modelSource, uiSource, deckText: hazardous});
  assert.ok(guarded.includes('&lt;/script&gt;&lt;b&gt;literal &amp; text&lt;/b&gt;'));
  assert.ok(!guarded.includes('<b>literal & text</b>'));
});
