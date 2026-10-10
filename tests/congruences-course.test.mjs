import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseDeck, serializeDeck } from '../src/deck.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const courseText = read('courses/congruences.json');
const course = parseDeck(courseText);

test('the original fourteen-question course passes the unchanged native importer and round trip', () => {
  assert.equal(course.items.length, 14);
  assert.equal(course.concepts.length, 5);
  assert.equal(new Set(course.items.map(item => item.id)).size, 14);
  assert.deepEqual(parseDeck(serializeDeck(course)), course);
  assert.match(course.attribution, /MIT OpenCourseWare/);
  assert.match(course.license, /attribution to RecallWeave contributors/);
  assert.ok(course.items.every(item => item.options.length === 4));
  // Independently returned question-only control keys, frozen before answers were disclosed.
  assert.deepEqual(course.items.map(item => item.answer), [2,0,3,1,2,0,3,1,2,3,0,1,2,3]);
  assert.equal(Object.isFrozen(course), true);
});

test('standalone page exactly matches core, UI, template and downloadable source texts', () => {
  const result = spawnSync(process.execPath, ['tools/build-congruences.mjs', '--check'], {
    cwd: root, encoding: 'utf8', timeout: 20000,
  });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  assert.match(result.stdout, /CONGRUENCES_BUILD_PARITY_OK/);
  const page = read('courses/congruences-explorer.html');
  const match = page.match(/const CONGRUENCES_COURSE_TEXT = (.*);\n/);
  assert.ok(match);
  assert.equal(JSON.parse(match[1]), courseText);
  const guide = page.match(/const CONGRUENCES_GUIDE_TEXT = (.*);\n/);
  assert.equal(JSON.parse(guide[1]), read('courses/congruences.md'));
  assert.doesNotMatch(page, /<script[^>]+src=|<link[^>]+href=/);
  assert.match(page, /connect-src 'none'/);
  assert.doesNotMatch(page, /__CONGRUENCES_[A-Z_]+__/);
});

test('the guide keeps exact result scope and the bounded-window distinction explicit', () => {
  const guide = read('courses/congruences.md');
  for (const item of course.items) {
    assert.ok(guide.includes(item.id));
    assert.ok(guide.includes(item.options[item.answer]));
    assert.ok(guide.includes(item.explanation));
  }
  assert.match(guide, /72 digits/);
  assert.match(guide, /18 digits/);
  assert.match(guide, /no inverse/);
  assert.match(guide, /bounded display only|empty displayed window/);
});
