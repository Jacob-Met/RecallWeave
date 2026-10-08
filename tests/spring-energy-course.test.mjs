import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, cpSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import { parseDeck, serializeDeck } from '../src/deck.mjs';
import { initialMastery, selectNextItem, updateMastery } from '../src/knowledge.mjs';
import { createReview, beginPractice, answerPractice, currentPracticeItem } from '../src/review.mjs';
import { createStudyNotes } from '../src/session-export.mjs';
import { buildSpringLab, springLabPath } from '../tools/build-spring-energy.mjs';

const text = readFileSync(new URL('../courses/spring-energy.json', import.meta.url), 'utf8');
const deck = parseDeck(text);

test('existing deck codec admits twelve original, balanced questions with connected prerequisites', () => {
  assert.equal(deck.items.length, 12);
  assert.equal(deck.concepts.length, 4);
  for (const concept of deck.concepts) assert.equal(deck.items.filter(item => item.concept === concept).length, 3);
  assert.deepEqual([0, 1, 2, 3].map(index => deck.items.filter(item => item.answer === index).length), [3, 3, 3, 3]);
  assert.deepEqual(parseDeck(serializeDeck(deck)), deck);
  assert.match(deck.attribution, /Original RecallWeave lesson/);
  assert.match(deck.license, /CC BY 4.0/);
  assert.deepEqual(deck.items.map(item => item.answer), [2, 0, 3, 1, 2, 0, 3, 1, 2, 0, 3, 1]);
  const keyed = Object.fromEntries(deck.items.map(item => [item.id, item.options[item.answer]]));
  assert.equal(keyed['spring-force-1'], '−12 N');
  assert.equal(keyed['spring-force-2'], '+2 m/s²');
  assert.equal(keyed['spring-phase-1'], 'π/2 s');
  assert.equal(keyed['spring-phase-2'], '−1.0 m/s');
  assert.equal(keyed['spring-phase-3'], '270°');
  assert.equal(keyed['spring-energy-1'], '2 J');
  assert.equal(keyed['spring-energy-2'], 'K = 15 J; U = 5 J');
  assert.equal(keyed['spring-energy-3'], '×4');
});

test('every independently shown energy-reference question states its zero reference', () => {
  for (const id of ['spring-energy-1', 'spring-energy-2', 'spring-energy-3', 'spring-change-2', 'spring-change-3']) {
    const item = deck.items.find(candidate => candidate.id === id);
    assert.match(item.prompt, /potential energy as zero at equilibrium/, id);
  }
  assert.match(deck.items.find(item => item.id === 'spring-change-2').prompt, /same mass and the same nonzero release amplitude/);
});

test('actual selector, review, correct retry and study notes preserve all twelve first choices', () => {
  const mastery = initialMastery(deck.concepts), asked = new Set(), answers = [];
  while (asked.size < deck.items.length) {
    const item = selectNextItem(deck.items, asked, mastery);
    assert.ok(item && !asked.has(item.id));
    const correct = asked.size !== 2;
    answers.push({ item: item.id, choice: correct ? item.answer : (item.answer + 1) % item.options.length });
    mastery[item.concept] = updateMastery(mastery[item.concept], correct);
    asked.add(item.id);
  }
  assert.equal(selectNextItem(deck.items, asked, mastery), null);
  const review = createReview(deck.items, answers);
  const frozenReview = JSON.stringify(review), frozenMastery = JSON.stringify(mastery);
  let practice = beginPractice(review);
  let retries = 0;
  for (let item = currentPracticeItem(practice); item; item = currentPracticeItem(practice)) {
    practice = answerPractice(practice, item.id, item.answer);
    retries++;
  }
  assert.equal(retries, 1);
  const notes = createStudyNotes({ deck, review, mastery, practice, exportedAt: '2026-10-08T00:00:00Z' });
  assert.match(notes.text, /11 of 12 connections correct on the first try/);
  assert.match(notes.text, /1 of 1 practice answers recorded; 1 correct on retry/);
  for (const item of deck.items) for (const value of [item.prompt, item.explanation, item.transfer]) assert.ok(notes.text.includes(value));
  assert.equal(JSON.stringify(review), frozenReview);
  assert.equal(JSON.stringify(mastery), frozenMastery);
});

test('standalone build is exact, executable and embeds the original course bytes without external scripts', () => {
  const html = buildSpringLab();
  assert.equal(readFileSync(springLabPath, 'utf8'), html);
  const embedded = html.match(/<script id="spring-course-data" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(embedded);
  assert.equal(JSON.parse(embedded[1]), text);
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 1);
  new vm.Script(scripts[0][1]);
  assert.doesNotMatch(html, /<script\b[^>]*\bsrc\s*=/i);
  assert.doesNotMatch(html, /<link\b[^>]*\bhref\s*=/i);
  assert.doesNotMatch(html, /\/\*__SPRING_[A-Z]+__\*\//);
});

function fixture(fn) {
  const root = mkdtempSync(join(tmpdir(), 'recallweave-spring-build-'));
  try {
    for (const directory of ['src', 'tools', 'templates', 'courses']) mkdirSync(join(root, directory));
    for (const path of ['src/deck.mjs', 'src/spring-energy.mjs', 'src/spring-energy-ui.mjs',
      'tools/build-spring-energy.mjs', 'templates/spring-energy-lab.html', 'courses/spring-energy.json']) {
      cpSync(new URL('../' + path, import.meta.url), join(root, path));
    }
    const run = (...args) => spawnSync(process.execPath, ['tools/build-spring-energy.mjs', ...args],
      { cwd: root, encoding: 'utf8', timeout: 10000 });
    fn(root, run);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('builder check refuses a stale artifact and never overwrites it on refusal or invalid source', () => {
  fixture((root, run) => {
    const path = join(root, 'courses/spring-energy-lab.html');
    assert.equal(run().status, 0);
    assert.equal(run('--check').status, 0);
    writeFileSync(path, 'stale witness\n');
    const stale = run('--check');
    assert.notEqual(stale.status, 0);
    assert.match(stale.stderr, /differs from its source/);
    assert.equal(readFileSync(path, 'utf8'), 'stale witness\n');
    writeFileSync(join(root, 'courses/spring-energy.json'), '{"format":"wrong"}');
    const badArgument = run('--unknown');
    assert.notEqual(badArgument.status, 0);
    assert.match(badArgument.stderr, /Usage:/);
    const badSource = run();
    assert.notEqual(badSource.status, 0);
    assert.match(badSource.stderr, /Unsupported deck format/);
    assert.equal(readFileSync(path, 'utf8'), 'stale witness\n');
  });
});

test('direct builder invocation through a real filesystem alias performs the build', {
  skip: process.platform === 'win32' ? 'Fixture uses a POSIX filesystem symlink.' : false,
}, () => {
  fixture(root => {
    symlinkSync(join(root, 'tools/build-spring-energy.mjs'), join(root, 'build-alias.mjs'));
    const result = spawnSync(process.execPath, ['build-alias.mjs'], { cwd: root, encoding: 'utf8', timeout: 10000 });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Built courses\/spring-energy-lab.html/);
    assert.equal(readFileSync(join(root, 'courses/spring-energy-lab.html'), 'utf8'), buildSpringLab());
  });
});
