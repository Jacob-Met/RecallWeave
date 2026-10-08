import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseDeck, serializeDeck, validateDeck, MAX_DECK_BYTES } from '../src/deck.mjs';
import { buildCode } from '../src/prefix-coding.mjs';
import { initialMastery, selectNextItem, updateMastery } from '../src/knowledge.mjs';
import { orderOptions } from '../src/answer-order.mjs';
import { createReview, beginPractice, currentPracticeItem, answerPractice } from '../src/review.mjs';
import { createReflections, updateReflection, updateApplicationReflection } from '../src/reflections.mjs';
import { createStudyNotes } from '../src/session-export.mjs';
import { createTraceArchive, readTraceArchive } from '../src/trace-archive.mjs';
import { draftFromDeck, checkDraft } from '../src/deck-author.mjs';

const source = readFileSync(new URL('../courses/prefix-coding.json', import.meta.url), 'utf8');
const guide = readFileSync(new URL('../courses/prefix-coding.md', import.meta.url), 'utf8');
const deck = parseDeck(source);

function question(course, id) {
  const found = course.items.find(item => item.id === id);
  assert.ok(found, 'Course must contain ' + id);
  return found;
}
function chosen(item) { return item.options[item.answer]; }

function countsFrom(prompt) {
  const section = prompt.match(/Counts: ([^.]+)\./);
  assert.ok(section, 'Worked question must state its own counts');
  const rows = [...section[1].matchAll(/([A-D])=(\d+)/g)]
    .map(([, symbol, count]) => ({ symbol, count: Number(count) }));
  assert.equal(rows.length, 4);
  assert.equal(new Set(rows.map(row => row.symbol)).size, 4);
  return rows;
}
function bookFrom(prompt) {
  const section = prompt.match(/Codebook: ([^.]+)\./);
  assert.ok(section, 'Worked question must state its own codebook');
  const rows = [...section[1].matchAll(/([A-D])=([01]+)/g)];
  assert.equal(rows.length, 4);
  return new Map(rows.map(([, symbol, code]) => [symbol, code]));
}
function bitsFrom(prompt) {
  const match = prompt.match(/stream ([01]+)/);
  assert.ok(match, 'Worked question must state its own stream');
  return match[1];
}
function prefixFree(words) {
  return words.every((word, i) => words.every((other, j) => i === j || !other.startsWith(word)));
}
// Enumerate complete parses of the small stated message, without the product decoder.
function parses(bits, book) {
  const paths = Array.from({ length: bits.length + 1 }, () => []);
  paths[0].push([]);
  for (let offset = 0; offset < bits.length; offset++) {
    for (const path of paths[offset]) {
      for (const [symbol, word] of book) {
        if (bits.startsWith(word, offset)) paths[offset + word.length].push([...path, symbol]);
      }
    }
  }
  return paths[bits.length];
}
function weightedCost(rows, book) {
  return rows.reduce((sum, row) => {
    assert.ok(book.has(row.symbol));
    return sum + row.count * book.get(row.symbol).length;
  }, 0);
}
// Independent length-vector search for these four-label examples. A full optimal
// binary tree with n positive-weight leaves has depth at most n-1. Integer Kraft
// capacity admits exactly the feasible bounded code lengths; no greedy merges.
function exhaustivePrefixMinimum(counts) {
  const depth = counts.length - 1;
  const capacity = 2 ** depth;
  let minimum = Infinity;
  function visit(index, used, cost) {
    if (index === counts.length) {
      if (used <= capacity) minimum = Math.min(minimum, cost);
      return;
    }
    for (let length = 1; length <= depth; length++) {
      const next = used + 2 ** (depth - length);
      if (next <= capacity) visit(index + 1, next, cost + counts[index] * length);
    }
  }
  visit(0, 0, 0);
  assert.ok(Number.isFinite(minimum));
  return minimum;
}

function verifyWorkedAnswers(course) {
  const prefix = question(course, 'pc-prefix-1');
  const qualifying = prefix.options
    .map((option, index) => ({ index, words: option.match(/[01]+/g) }))
    .filter(({ words }) => prefixFree(words))
    .map(({ index }) => index);
  assert.deepEqual(qualifying, [prefix.answer], 'Exactly the chosen prefix codebook qualifies');

  const decode = question(course, 'pc-prefix-2');
  const results = parses(bitsFrom(decode.prompt), bookFrom(decode.prompt));
  assert.equal(results.length, 1, 'The stated complete stream has exactly one parse');
  assert.equal(results[0].join(', '), chosen(decode), 'Worked decoding answer');

  const cost = question(course, 'pc-cost-1');
  assert.equal(chosen(cost), weightedCost(countsFrom(cost.prompt), bookFrom(cost.prompt)) + ' bits',
    'Worked weighted payload answer');

  const fixed = question(course, 'pc-cost-2');
  const rows = countsFrom(fixed.prompt);
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const width = Math.ceil(Math.log2(rows.length));
  assert.equal(chosen(fixed), total * width + ' bits', 'Worked fixed-width answer');

  const average = question(course, 'pc-cost-3');
  const totals = average.prompt.match(/contains (\d+) bits for (\d+) symbol occurrences/);
  assert.ok(totals);
  assert.equal(chosen(average), totals[1] + '/' + totals[2] + ' bits per symbol',
    'Worked per-occurrence average');

  const first = question(course, 'pc-merge-1');
  const lightest = countsFrom(first.prompt).sort((a, b) => a.count - b.count).slice(0, 2);
  assert.equal(chosen(first), lightest[0].symbol + '=' + lightest[0].count + ' with '
    + lightest[1].symbol + '=' + lightest[1].count + ' → weight '
    + (lightest[0].count + lightest[1].count), 'Worked two-smallest choice');

  const incomplete = question(course, 'pc-limits-2');
  const bits = bitsFrom(incomplete.prompt);
  const book = bookFrom(incomplete.prompt);
  assert.equal(parses(bits, book).length, 0, 'Stated incomplete stream must not have a complete parse');
  let lastComplete = bits.length - 1;
  while (lastComplete > 0 && parses(bits.slice(0, lastComplete), book).length === 0) lastComplete--;
  assert.deepEqual(parses(bits.slice(0, lastComplete), book), [['A', 'B']]);
  assert.equal(bits.slice(lastComplete), '11');
  assert.equal([...book.values()].filter(word => word.startsWith('11')).length, 2);
  assert.equal(chosen(incomplete),
    'A and B finish, but the final 11 is incomplete and needs another bit before a third symbol can finish.');

  const overhead = question(course, 'pc-limits-3');
  const variablePayload = overhead.prompt.match(/variable-code payload of (\d+) bits/);
  const fixedPayload = overhead.prompt.match(/fixed-code payload of (\d+) bits/);
  const variableOverhead = overhead.prompt.match(/variable-code container adds (\d+) bits/);
  const fixedOverhead = overhead.prompt.match(/fixed-code container adds (\d+) bits/);
  for (const value of [variablePayload, fixedPayload, variableOverhead, fixedOverhead]) assert.ok(value);
  assert.equal(chosen(overhead),
    'Variable: ' + (Number(variablePayload[1]) + Number(variableOverhead[1]))
    + ' bits; fixed: ' + (Number(fixedPayload[1]) + Number(fixedOverhead[1])) + ' bits.',
    'Worked complete toy-container totals');
}

test('the actual importer admits twelve original questions across four balanced concepts', () => {
  assert.ok(Buffer.byteLength(source, 'utf8') < MAX_DECK_BYTES);
  assert.equal(deck.items.length, 12);
  assert.equal(deck.concepts.length, 4);
  assert.equal(serializeDeck(deck), source);
  assert.deepEqual(parseDeck(serializeDeck(deck)), deck);
  assert.ok(Object.isFrozen(deck));
  const positions = [0, 0, 0, 0];
  for (const concept of deck.concepts) {
    assert.equal(deck.items.filter(item => item.concept === concept).length, 3);
  }
  for (const item of deck.items) {
    assert.equal(item.options.length, 4);
    positions[item.answer]++;
    assert.ok(item.options.some((option, index) =>
      index !== item.answer && [...option].length >= [...chosen(item)].length),
    item.id + ': the answer must not be cued by being the sole longest option');
    assert.ok(Object.isFrozen(item));
  }
  assert.deepEqual(positions, [3, 3, 3, 3]);
  assert.match(deck.attribution, /Original questions/);
  assert.match(deck.attribution, /ocw\.mit\.edu/);
  assert.match(deck.license, /No additional reuse license/);
});

test('worked answers are recalculated from the actual question counts, codebooks and streams', () => {
  verifyWorkedAnswers(deck);
});

test('the default codebook and the guide agree with an independent feasible-length oracle', () => {
  const item = question(deck, 'pc-cost-1');
  const rows = countsFrom(item.prompt);
  const book = bookFrom(item.prompt);
  const optimum = exhaustivePrefixMinimum(rows.map(row => row.count));
  assert.equal(optimum, 23);
  assert.equal(weightedCost(rows, book), optimum);
  assert.ok(prefixFree([...book.values()]));
  const model = buildCode(rows);
  assert.deepEqual(new Map(model.codebook.map(entry => [entry.symbol, entry.code])), book);
  assert.equal(model.totals.payloadBits, optimum);
  assert.equal(model.totals.totalCount, 14);
  assert.equal(model.totals.fixedPayloadBits, 28);
  assert.equal(model.totals.averageBits, 23 / 14);
  assert.equal(model.totals.savedPayloadBits, 5);
  assert.deepEqual(model.steps.map(step => step.addedCost), [3, 6, 14]);
  assert.equal(model.steps.reduce((sum, step) => sum + step.addedCost, 0), optimum);
  assert.equal(chosen(question(deck, 'pc-merge-2')),
    'Each merge adds one bit to every symbol occurrence represented inside the newly combined subtree.');
  assert.equal(chosen(question(deck, 'pc-merge-3')),
    'Some optimal tree puts the two lightest labels at deepest sibling leaves; contracting that pair gives a smaller optimal problem.');
  for (const entry of model.codebook) {
    const row = '| ' + entry.symbol + ' | ' + entry.count + ' | ' + String.fromCharCode(96)
      + entry.code + String.fromCharCode(96) + ' | ' + entry.length + ' | ' + entry.cost + ' |';
    assert.ok(guide.includes(row), 'Guide must retain the actual default row for ' + entry.symbol);
  }
});

test('the non-prefix example is suffix-free and the tie example has exact optimal cost', () => {
  const unique = question(deck, 'pc-prefix-3');
  const pairs = [...unique.prompt.matchAll(/([AB])=([01]+)/g)];
  assert.equal(pairs.length, 2);
  const words = pairs.map(pair => pair[2]);
  assert.equal(prefixFree(words), false);
  assert.equal(prefixFree(words.map(word => [...word].reverse().join(''))), true);
  assert.equal(chosen(unique), 'It is not prefix-free but is uniquely decodable.');
  // The suffix property supplies a general backward-decoding argument. This
  // bounded message enumeration is an additional example check, not its proof.
  const book = new Map(pairs.map(([, symbol, code]) => [symbol, code]));
  const seen = new Set();
  function visit(sequence, bits) {
    assert.equal(seen.has(bits), false, 'Distinct bounded messages retain distinct encoded streams');
    seen.add(bits);
    assert.deepEqual(parses(bits, book), [sequence]);
    if (sequence.length === 6) return;
    for (const [symbol, word] of book) visit([...sequence, symbol], bits + word);
  }
  visit([], '');

  const equalRows = ['A', 'B', 'C', 'D'].map(symbol => ({ symbol, count: 1 }));
  const equal = buildCode(equalRows);
  assert.equal(exhaustivePrefixMinimum(equalRows.map(row => row.count)), 8);
  assert.deepEqual(equal.codebook.map(entry => entry.length), [2, 2, 2, 2]);
  assert.equal(equal.totals.payloadBits, 8);
  assert.equal(equal.totals.fixedPayloadBits, 8);
  assert.equal(equal.totals.savedPayloadBits, 0);
  assert.equal(chosen(question(deck, 'pc-limits-1')),
    'All four codewords have length two, so either construction uses eight bits for the payload.');
});

test('structurally valid but numerically stale course variants fail the same authored checks', () => {
  const changedCount = structuredClone(deck);
  question(changedCount, 'pc-cost-1').prompt =
    question(changedCount, 'pc-cost-1').prompt.replace('A=8', 'A=9');
  validateDeck(changedCount);
  assert.throws(() => verifyWorkedAnswers(changedCount), /Worked weighted payload answer/);

  const changedBits = structuredClone(deck);
  question(changedBits, 'pc-prefix-2').prompt =
    question(changedBits, 'pc-prefix-2').prompt.replace('0101110', '0101100');
  validateDeck(changedBits);
  assert.throws(() => verifyWorkedAnswers(changedBits), /Worked decoding answer/);

  const nowComplete = structuredClone(deck);
  question(nowComplete, 'pc-limits-2').prompt =
    question(nowComplete, 'pc-limits-2').prompt.replace('01011', '010110');
  validateDeck(nowComplete);
  assert.throws(() => verifyWorkedAnswers(nowComplete), /Stated incomplete stream/);
});

test('the complete course survives adaptive answering, separate practice, reflections, notes and trace restore', () => {
  const mastery = initialMastery(deck.concepts);
  const asked = new Set();
  const answers = [];
  const chosenWrong = new Set(['pc-prefix-2', 'pc-cost-1', 'pc-limits-2']);
  while (asked.size < deck.items.length) {
    const item = selectNextItem(deck.items, asked, mastery);
    assert.ok(item);
    assert.equal(asked.has(item.id), false);
    const canonicalChoice = chosenWrong.has(item.id) ? (item.answer + 1) % item.options.length : item.answer;
    const displayed = orderOptions(item.options.length, () => 0.37);
    const position = displayed.indexOf(canonicalChoice);
    assert.ok(position >= 0);
    const actualChoice = displayed[position];
    answers.push({ item: item.id, choice: actualChoice });
    mastery[item.concept] = updateMastery(mastery[item.concept], actualChoice === item.answer);
    asked.add(item.id);
  }
  assert.equal(selectNextItem(deck.items, asked, mastery), null);
  assert.equal(new Set(answers.map(answer => answer.item)).size, 12);
  const review = createReview(deck.items, answers);
  assert.equal(review.filter(item => !item.correct).length, 3);
  const beforePractice = JSON.stringify({ answers, review, mastery });
  let practice = beginPractice(review);
  while (currentPracticeItem(practice)) {
    const item = currentPracticeItem(practice);
    practice = answerPractice(practice, item.id, item.answer);
  }
  assert.equal(practice.answers.length, 3);
  assert.ok(practice.answers.every(answer => answer.correct));
  assert.equal(JSON.stringify({ answers, review, mastery }), beforePractice);

  let reflections = createReflections(deck.items);
  for (const item of deck.items) {
    reflections = updateReflection(reflections, item.id,
      'My note for ' + item.id + ': <keep literal> & Ω\nI will check the stated codebook.');
  }
  reflections = updateApplicationReflection(reflections, 'Payload ≠ whole file.\nCount 23 + 12, then verify recovery.');
  const applicationPrompt = 'Connect prefix coding to a complete data format. What must the receiver know?';
  const notes = createStudyNotes({
    deck, review, mastery, practice, reflections, applicationPrompt,
    exportedAt: '2026-10-08T00:00:00.000Z'
  });
  assert.equal(notes.mediaType, 'text/plain;charset=utf-8');
  assert.match(notes.text, /9 of 12 connections correct on the first try/);
  assert.match(notes.text, /Complete: 3 of 3 practice answers recorded; 3 correct on retry/);
  assert.ok(notes.text.includes(applicationPrompt));
  assert.ok(notes.text.includes('  > Payload ≠ whole file.\n  > Count 23 + 12, then verify recovery.'));
  assert.ok(notes.text.includes(deck.attribution));
  assert.ok(notes.text.includes(deck.license));
  for (const item of deck.items) {
    for (const field of ['prompt', 'explanation', 'transfer']) assert.ok(notes.text.includes(item[field]));
    assert.ok(notes.text.includes('Correct answer: ' + item.options[item.answer]));
    assert.ok(notes.text.includes('  > My note for ' + item.id + ': <keep literal> & Ω'));
    const first = review.find(entry => entry.id === item.id);
    assert.ok(notes.text.includes('Your first answer: ' + item.options[first.choice]));
  }
  const archive = createTraceArchive({
    deck, answers, mastery, practice, savedAt: '2026-10-08T00:00:00.000Z'
  });
  const restored = readTraceArchive(archive.text, deck);
  assert.deepEqual(restored.review, review);
  assert.deepEqual(restored.mastery, mastery);
  assert.deepEqual(restored.practice, practice);
  assert.deepEqual(restored.answers.map(({ item, choice }) => ({ item, choice })), answers);
  assert.deepEqual(restored.summary, {
    firstAnswers: 12, correctFirst: 9, practiceStarted: true, practiceAnswers: 3, practiceTotal: 3
  });
  assert.equal(JSON.stringify({ answers, review, mastery }), beforePractice);
});

test('the course also round-trips through the existing authoring data model', () => {
  const checked = checkDraft(draftFromDeck(deck));
  assert.equal(checked.ok, true);
  assert.deepEqual(checked.deck, deck);
  assert.deepEqual(parseDeck(checked.json), deck);
});

test('the guide exposes the actual lesson routes and identifies all twelve worked connections', () => {
  for (const route of ['./prefix-coding-explorer.html', './prefix-coding.json', '../demo.html']) {
    assert.ok(guide.includes('](' + route + ')'));
  }
  for (const item of deck.items) assert.ok(guide.includes(String.fromCharCode(96) + item.id + String.fromCharCode(96)));
  assert.ok(guide.includes('approximately 1.642857'));
  assert.ok(guide.includes('| Variable code | 23 bits | 12 bits | **35 bits** |'));
  assert.ok(guide.includes('| Fixed code | 28 bits | 3 bits | **31 bits** |'));
  assert.match(guide, /sufficient for unique decoding, but it is not necessary/);
  assert.match(guide, /Prefix coding alone cannot detect every truncation/);
  assert.match(guide, /No additional reuse license/);
  assert.ok(guide.includes('https://ocw.mit.edu/courses/6-046j-design-and-analysis-of-algorithms-spring-2012/'));
});
