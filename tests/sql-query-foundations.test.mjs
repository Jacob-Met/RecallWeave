import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, mkdir, copyFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { parseDeck, serializeDeck } from '../src/deck.mjs';
import { initialMastery, selectNextItem, updateMastery } from '../src/knowledge.mjs';
import { orderOptions } from '../src/answer-order.mjs';
import { createReview, beginPractice, currentPracticeItem, answerPractice } from '../src/review.mjs';
import { createStudyNotes } from '../src/session-export.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const python = process.env.PYTHON || 'python3';
const read = path => readFile(join(root, path), 'utf8');
const courseText = await read('courses/sql-query-foundations.json');
const deck = parseDeck(courseText);
const source = JSON.parse(await read('courses/sql-query-foundations.source.json'));
const page = await read('courses/sql-query-explorer.html');
function embedded(html, id) {
  const match = html.match(new RegExp(`<script id="${id}" type="application/json">([\\s\\S]*?)</script>`));
  assert.ok(match, `Missing embedded ${id}`);
  return JSON.parse(match[1]);
}
const catalog = embedded(page, 'sql-catalog');
const build = (project, args = []) => spawnSync(python, ['-B', join(project, 'tools/make_sql_query_explorer.py'), ...args],
  {cwd: project, encoding: 'utf8', timeout: 15000});
const formatted = rows => rows.length ? rows.map(row => `(${row.map(value => value === null ? 'NULL'
  : typeof value === 'string' ? JSON.stringify(value) : String(value)).join(', ')})`).join('; ') : '(no rows)';

test('the original twelve-item SQL course uses the published import contract without changing its native meaning', () => {
  assert.equal(deck.format, 'recallweave-deck/1');
  assert.equal(deck.items.length, 12);
  assert.deepEqual(deck.concepts, ['rows', 'nulls', 'groups', 'joins']);
  assert.deepEqual(deck.concepts.map(concept => deck.items.filter(item => item.concept === concept).length), [3, 3, 3, 3]);
  assert.deepEqual([0, 1, 2, 3].map(answer => deck.items.filter(item => item.answer === answer).length), [3, 3, 3, 3]);
  assert.deepEqual(parseDeck(serializeDeck(deck)), deck);
  assert.equal(embedded(page, 'sql-course'), courseText, 'the downloaded file is the exact validated course');
  for (const [index, item] of deck.items.entries()) {
    const authored = source.questions[index];
    assert.equal(item.id, authored.id);
    assert.ok(item.prompt.includes(authored.sql));
    assert.ok(item.prompt.includes('NULL is unknown; 0 is a known value.'));
    assert.equal(item.options[item.answer], formatted(authored.options[authored.answer]));
    assert.equal(item.explanation, authored.explanation);
    assert.equal(item.transfer, authored.transfer);
    assert.ok(Object.isFrozen(item) && Object.isFrozen(item.options));
  }
});

test('actual SQLite regenerates all twenty-two saved queries and their exact course/default bindings', () => {
  const result = build(root, ['--check']);
  assert.equal(result.status, 0, result.stderr || String(result.error));
  assert.match(result.stdout, /^SQL_BUILD OK questions=12 prepared_queries=22 engine=SQLite-\S+ mode=check\n$/);
  assert.equal(catalog.lessons.reduce((count, lesson) => count + lesson.variants.length, 0), 22);
  for (const lesson of catalog.lessons) {
    const item = deck.items.find(item => item.id === lesson.id);
    const original = source.questions.find(question => question.id === lesson.id);
    const variant = lesson.variants.find(variant => variant.key === lesson.defaultVariant);
    assert.equal(variant.sql, original.sql);
    assert.deepEqual(variant.columns, original.columns);
    assert.equal(formatted(variant.rows), item.options[item.answer]);
  }
  assert.deepEqual(catalog.tables.map(table => [table.name, table.rows.length]), [['stations', 4], ['readings', 6]]);
  const practice = embedded(page, 'sql-practice');
  assert.ok(practice.includes(source.setup_sql.trim()));
  for (const lesson of catalog.lessons) for (const variant of lesson.variants) assert.ok(practice.includes(variant.sql));
});

test('native adaptive selection, shuffled choices, review, practice and notes preserve all twelve SQL questions', () => {
  const mastery = initialMastery(deck.concepts);
  const asked = new Set();
  const answers = [];
  while (asked.size < deck.items.length) {
    const item = selectNextItem(deck.items, asked, mastery);
    assert.ok(item && !asked.has(item.id));
    const order = orderOptions(item.options.length, () => 0.27);
    const canonical = asked.size % 2 ? item.answer : (item.answer + 1) % item.options.length;
    const displayed = order.indexOf(canonical);
    assert.equal(item.options[order[displayed]], item.options[canonical]);
    asked.add(item.id);
    answers.push({item: item.id, choice: order[displayed]});
    mastery[item.concept] = updateMastery(mastery[item.concept], canonical === item.answer);
  }
  assert.equal(selectNextItem(deck.items, asked, mastery), null);
  const review = createReview(deck.items, answers);
  const before = JSON.stringify({review, mastery});
  let practice = beginPractice(review);
  assert.equal(practice.items.length, 6);
  for (let item; (item = currentPracticeItem(practice));) practice = answerPractice(practice, item.id, item.answer);
  assert.equal(practice.answers.filter(answer => answer.correct).length, 6);
  assert.equal(JSON.stringify({review, mastery}), before, 'practice preserves original answers and estimates');
  const notes = createStudyNotes({deck, review, mastery, practice, exportedAt: '2026-10-08T00:00:00Z'});
  assert.match(notes.text, /MODEL STATE, NOT A GRADE/);
  assert.ok(notes.text.includes(deck.attribution));
  for (const item of deck.items) {
    assert.ok(notes.text.includes(item.prompt));
    assert.ok(notes.text.includes(`Correct answer: ${item.options[item.answer]}`));
    assert.ok(notes.text.includes(item.explanation));
  }
});

test('a changed answer or invalid query refuses the build and preserves both saved artifacts', async t => {
  const project = await mkdtemp(join(tmpdir(), 'recallweave-sql-refusal-'));
  t.after(() => rm(project, {recursive: true, force: true}));
  await mkdir(join(project, 'courses')); await mkdir(join(project, 'tools'));
  for (const path of ['tools/make_sql_query_explorer.py', 'courses/sql-query-explorer.template.html',
    'courses/sql-query-foundations.json', 'courses/sql-query-explorer.html']) await copyFile(join(root, path), join(project, path));
  for (const change of [value => { value.questions[0].answer = 1; },
    value => { value.questions[0].sql = 'SELECT value FROM missing_table;'; },
    value => { value.questions[0].sql += '\nDELETE FROM readings;'; }]) {
    const changed = structuredClone(source); change(changed);
    await writeFile(join(project, 'courses/sql-query-foundations.source.json'), JSON.stringify(changed));
    const result = build(project);
    assert.notEqual(result.status, 0);
    assert.doesNotMatch(result.stdout, /SQL_BUILD OK/);
    assert.equal(await readFile(join(project, 'courses/sql-query-foundations.json'), 'utf8'), courseText);
    assert.equal(await readFile(join(project, 'courses/sql-query-explorer.html'), 'utf8'), page);
  }
});

test('a stale generated explorer fails --check without silently replacing the changed file', async t => {
  const project = await mkdtemp(join(tmpdir(), 'recallweave-sql-stale-'));
  t.after(() => rm(project, {recursive: true, force: true}));
  await mkdir(join(project, 'courses')); await mkdir(join(project, 'tools'));
  for (const path of ['tools/make_sql_query_explorer.py', 'courses/sql-query-explorer.template.html',
    'courses/sql-query-foundations.source.json', 'courses/sql-query-foundations.json']) await copyFile(join(root, path), join(project, path));
  await writeFile(join(project, 'courses/sql-query-explorer.html'), 'A deliberately changed local file.\n');
  const result = build(project, ['--check']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Out of date: sql-query-explorer.html/);
  assert.equal(await readFile(join(project, 'courses/sql-query-explorer.html'), 'utf8'), 'A deliberately changed local file.\n');
});
