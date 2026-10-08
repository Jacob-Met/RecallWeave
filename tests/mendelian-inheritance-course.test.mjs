import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, copyFileSync, rmSync, symlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { parseDeck, serializeDeck, MAX_DECK_BYTES } from '../src/deck.mjs';
import { initialMastery, selectNextItem, updateMastery } from '../src/knowledge.mjs';
import { createReview, beginPractice, currentPracticeItem, answerPractice } from '../src/review.mjs';
import { createReflections, updateReflection, updateApplicationReflection } from '../src/reflections.mjs';
import { createStudyNotes } from '../src/session-export.mjs';
import { buildInheritanceLab, inheritanceLabPath } from '../tools/build-mendelian-inheritance.mjs';

const text = readFileSync(new URL('../courses/mendelian-inheritance.json', import.meta.url), 'utf8');
const deck = parseDeck(text);

test('the original twelve-item course has native schema, prerequisite closure and exact export/reopen', () => {
  assert.equal(deck.title, 'Inheritance: from gametes to probabilities');
  assert.equal(deck.items.length, 12);
  assert.equal(deck.concepts.length, 4);
  for (const concept of deck.concepts) assert.equal(deck.items.filter(item => item.concept === concept).length, 3);
  assert.ok(Buffer.byteLength(text) < MAX_DECK_BYTES);
  assert.deepEqual(parseDeck(serializeDeck(deck)), deck);
  assert.match(deck.attribution, /Hypothetical diploid plant crosses/);
  assert.match(deck.attribution, /not guaranteed finite offspring counts/);
  assert.match(deck.license, /Original course text and questions: CC0-1.0/);
});

for (const mode of ['correct', 'mixed', 'missed']) {
  test(mode + ' course answers complete the actual selector, separate practice and literal study notes', () => {
    const asked = new Set(), mastery = initialMastery(deck.concepts), answers = [];
    while (asked.size < deck.items.length) {
      const item = selectNextItem(deck.items, asked, mastery);
      assert.ok(item && !asked.has(item.id));
      const correct = mode === 'correct' || (mode === 'mixed' && answers.length % 2 === 0);
      const choice = correct ? item.answer : (item.answer + 1) % item.options.length;
      answers.push({item: item.id, choice});
      asked.add(item.id);
      mastery[item.concept] = updateMastery(mastery[item.concept], correct);
    }
    assert.equal(selectNextItem(deck.items, asked, mastery), null);
    const review = createReview(deck.items, answers), before = JSON.stringify({review, mastery});
    assert.equal(review.filter(item => item.correct).length, mode === 'correct' ? 12 : mode === 'mixed' ? 6 : 0);
    let practice = beginPractice(review);
    for (let item = currentPracticeItem(practice); item; item = currentPracticeItem(practice)) practice = answerPractice(practice, item.id, item.answer);
    let reflections = createReflections(deck.items);
    const literal = 'Two routes to Aa.\n<img src=x onerror=alert(1)> stays literal.';
    reflections = updateReflection(reflections, review[0].id, literal);
    reflections = updateApplicationReflection(reflections, 'A genotype label can collect several routes.\nA phenotype can collect several genotypes.');
    const notes = createStudyNotes({deck, review, mastery, practice, reflections, applicationPrompt: 'Explain one inheritance connection.', exportedAt: '2026-10-08T12:00:00Z'});
    for (const item of review) {
      assert.ok(notes.text.includes(item.prompt));
      assert.ok(notes.text.includes('Your first answer: ' + item.options[item.choice]));
      assert.ok(notes.text.includes(item.explanation));
      assert.ok(notes.text.includes(item.transfer));
    }
    for (const line of literal.split('\n')) assert.ok(notes.text.includes('  > ' + line));
    assert.ok(notes.text.includes('MODEL STATE, NOT A GRADE'));
    assert.equal(JSON.stringify({review, mastery}), before);
  });
}

test('the direct-open artifact is deterministic and embeds the exact validated course text', () => {
  const html = readFileSync(inheritanceLabPath, 'utf8');
  assert.equal(html, buildInheritanceLab());
  const embedded = html.match(/const INHERITANCE_DECK_TEXT = (.*);\n/);
  assert.ok(embedded);
  assert.equal(JSON.parse(embedded[1]), text);
  assert.deepEqual(parseDeck(JSON.parse(embedded[1])), deck);
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+rel=["']stylesheet/i);
  assert.match(html, /connect-src 'none'/);
  assert.equal((html.match(/<\/script>/g) ?? []).length, 1);
});

test('CLI check through a symlink refuses stale output and accepts the exact current artifact', t => {
  const scratch = mkdtempSync(join(tmpdir(), 'recallweave-inheritance-check-'));
  t.after(() => rmSync(scratch, {recursive: true, force: true}));
  const actual = join(scratch, 'actual'), linked = join(scratch, 'linked');
  for (const path of ['tools/build-mendelian-inheritance.mjs', 'src/deck.mjs', 'src/mendelian-inheritance.mjs', 'src/mendelian-inheritance-ui.mjs', 'courses/mendelian-inheritance.json', 'templates/mendelian-inheritance-lab.html']) {
    const destination = join(actual, path);
    mkdirSync(dirname(destination), {recursive: true});
    copyFileSync(new URL('../' + path, import.meta.url), destination);
  }
  symlinkSync(actual, linked, 'junction');
  const target = join(actual, 'courses/mendelian-inheritance-lab.html');
  writeFileSync(target, 'retained stale generated output');
  const command = [join(linked, 'tools/build-mendelian-inheritance.mjs'), '--check'];
  const refused = spawnSync(process.execPath, command, {encoding: 'utf8'});
  assert.equal(refused.status, 1, refused.stdout + refused.stderr);
  assert.match(refused.stderr, /generated file is stale/);
  assert.equal(readFileSync(target, 'utf8'), 'retained stale generated output');
  copyFileSync(inheritanceLabPath, target);
  const accepted = spawnSync(process.execPath, command, {encoding: 'utf8'});
  assert.equal(accepted.status, 0, accepted.stdout + accepted.stderr);
  assert.match(accepted.stdout, /matches its current source/);
  assert.equal(readFileSync(target, 'utf8'), readFileSync(inheritanceLabPath, 'utf8'));
});
