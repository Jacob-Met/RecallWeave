import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { parseDeck, serializeDeck, MAX_DECK_BYTES } from '../src/deck.mjs';
import { initialMastery, selectNextItem, updateMastery } from '../src/knowledge.mjs';
import { createReview, beginPractice, currentPracticeItem, answerPractice } from '../src/review.mjs';
import { createStudyNotes } from '../src/session-export.mjs';
import { renderStoichiometryPage } from '../src/stoichiometry-page.mjs';

const source = await readFile(new URL('../courses/stoichiometry-foundations.json', import.meta.url), 'utf8');
const deck = parseDeck(source);

test('original course fits the existing deck contract with all four concepts represented', () => {
  assert.equal(deck.title, 'Reaction amounts: ratios, limits and leftovers');
  assert.equal(deck.items.length, 12);
  assert.deepEqual(deck.concepts, ['reaction-ratios', 'limiting-reactants', 'excess-and-scaling', 'theoretical-amounts']);
  for (const concept of deck.concepts) assert.equal(deck.items.filter(item => item.concept === concept).length, 3);
  assert.ok(Buffer.byteLength(source, 'utf8') < MAX_DECK_BYTES);
  assert.deepEqual(parseDeck(serializeDeck(deck)), deck);
  assert.match(deck.attribution, /theoretical amounts do not predict experimental yield, rate or equilibrium/);
  assert.match(deck.license, /No textbook passages, figures or exercises are reproduced/);
  assert.ok(Object.isFrozen(deck.items[0].options));
});

test('authored answer keys retain the independently worked quantities and conceptual distinctions', () => {
  const keys = {
    'stoich-ratio-water': '2 mol H₂O',
    'stoich-coefficient-meaning': 'The amounts of the three substances in moles',
    'stoich-ratio-ammonia': '4 mol NH₃',
    'stoich-equal-moles': 'H₂ limits because 2/2 is smaller than 2/1',
    'stoich-ammonia-limits': '2 mol NH₃ form; 1 mol N₂ remains',
    'stoich-fractional-excess': '0.25 mol O₂',
    'stoich-exact-ratio': '4 mol H₂O form; neither reactant remains',
    'stoich-zero-reactant': 'No H₂O forms; all 5 mol O₂ remain',
    'stoich-more-excess': 'It stays at 2 mol in both cases',
    'stoich-scale-both': '3.2 mol NH₃ form; H₂ remains limiting',
    'stoich-mass-to-moles': 'Convert each mass to moles using its own molar mass',
    'stoich-theory-boundary': 'The 2 mol value depends on ideal completion of the stated reaction'
  };
  assert.deepEqual(Object.keys(keys).sort(), deck.items.map(item => item.id).sort());
  for (const item of deck.items) assert.equal(item.options[item.answer], keys[item.id], item.id);
  assert.deepEqual([...new Set(deck.items.map(item => item.answer))].sort(), [0, 1, 2, 3]);
});

for (const mode of ['correct', 'mixed', 'missed']) {
  test(`course completes native selection, ${mode} first answers, review, retry and study notes`, () => {
    const before = JSON.stringify(deck);
    const asked = new Set();
    const mastery = initialMastery(deck.concepts);
    const answers = [];
    while (asked.size < deck.items.length) {
      const item = selectNextItem(deck.items, asked, mastery);
      assert.ok(item && !asked.has(item.id));
      const correct = mode === 'correct' || (mode === 'mixed' && answers.length % 2 === 0);
      const choice = correct ? item.answer : (item.answer + 1) % item.options.length;
      answers.push({item: item.id, choice});
      mastery[item.concept] = updateMastery(mastery[item.concept], correct);
      asked.add(item.id);
    }
    assert.equal(selectNextItem(deck.items, asked, mastery), null);
    const review = createReview(deck.items, answers);
    assert.equal(review.length, 12);
    assert.deepEqual(review.map(item => item.id), answers.map(answer => answer.item));
    assert.equal(review.filter(item => item.correct).length, mode === 'correct' ? 12 : mode === 'mixed' ? 6 : 0);
    const reviewBefore = JSON.stringify(review);
    let practice = beginPractice(review);
    for (let item = currentPracticeItem(practice); item; item = currentPracticeItem(practice)) {
      practice = answerPractice(practice, item.id, item.answer);
    }
    const notes = createStudyNotes({deck, review, mastery, practice, exportedAt: '2026-10-08T12:00:00Z'});
    assert.equal(notes.filename, 'recallweave-study-notes-2026-10-08.txt');
    for (const item of review) {
      assert.ok(notes.text.includes(item.prompt));
      assert.ok(notes.text.includes(`Your first answer: ${item.options[item.choice]}`));
      assert.ok(notes.text.includes(item.explanation));
      assert.ok(notes.text.includes(item.transfer));
    }
    assert.ok(notes.text.includes(deck.attribution));
    assert.match(notes.text, /MODEL STATE, NOT A GRADE/);
    assert.equal(JSON.stringify(deck), before);
    assert.equal(JSON.stringify(review), reviewBefore);
  });
}

test('generated direct-open artifact has exact build parity and embeds the qualified course', async () => {
  const check = spawnSync(process.execPath, [fileURLToPath(new URL('../tools/build_stoichiometry_explorer.mjs', import.meta.url)), '--check'], {cwd: tmpdir(), encoding: 'utf8'});
  assert.equal(check.status, 0, check.stderr || check.stdout);
  const html = await readFile(new URL('../courses/stoichiometry-explorer.html', import.meta.url), 'utf8');
  const embedded = html.match(/<script type="application\/json" id="course-data">([\s\S]*?)<\/script>/);
  assert.ok(embedded);
  assert.deepEqual(parseDeck(embedded[1]), deck);
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+rel=["']stylesheet/i);
  assert.match(html, /connect-src 'none'/);
  assert.doesNotMatch(html, /^import\s.+from\s/m);
});

test('standalone rendering keeps embedded source and course text inside their script elements', () => {
  const literal = '</script><p>literal course text</p>';
  const html = renderStoichiometryPage({modelSource: 'const text = "</script>";', uiSource: '', deckText: JSON.stringify({title: literal})});
  assert.equal((html.match(/<\/script>/g) ?? []).length, 2);
  const embedded = html.match(/id="course-data">([\s\S]*?)<\/script>/)[1];
  assert.equal(JSON.parse(embedded).title, literal);
});
