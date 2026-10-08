import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { parseDeck } from '../src/deck.mjs';
const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const courseText = read('courses/amortized-arrays.json');
const guide = read('courses/amortized-arrays.md');
const deck = parseDeck(courseText);

test('the actual current deck parser receives all original course fields', () => {
  assert.equal(deck.items.length, 16);
  assert.equal(deck.concepts.length, 4);
  assert.equal(Buffer.byteLength(courseText) < 262144, true);
  assert.deepEqual(deck.items.map(item => item.answer), [1,2,0,3,1,2,0,3,1,2,0,3,1,2,0,3]);
  assert.deepEqual([...new Set(deck.items.map(item => item.concept))], deck.concepts);
  for (const item of deck.items) {
    assert.equal(item.options.length, 4);
    assert.ok(guide.includes(item.id));
    assert.ok(guide.includes(item.prompt));
    assert.ok(guide.includes(item.options[item.answer]));
    assert.ok(guide.includes(item.explanation));
    assert.ok(guide.includes(item.transfer));
  }
  assert.equal((guide.match(/Worked response:/g) || []).length, 16);
});

test('original numerical answers are grounded in separately specified cases', () => {
  const answer = id => { const row = deck.items.find(item => item.id === `aa-${id}`); return row.options[row.answer]; };
  assert.equal(answer('prefix-total'), '13');
  assert.equal(answer('unit-growth'), '21');
  assert.equal(answer('potential-value'), '2');
  assert.equal(answer('potential-resize'), '3');
  assert.equal(answer('telescoping'), '12');
  assert.ok(answer('fixed-three').endsWith('= 28.'));
  assert.ok(answer('boundary-spike').includes('24'));
  assert.ok(answer('geometric-sum').includes('28'));
});

test('standalone embeds exact original course and guide bytes, with no runtime imports', () => {
  const html = read('courses/amortized-arrays-lab.html');
  const courseMatch = html.match(/<script id="course-data" type="application\/json">([\s\S]*?)<\/script>/);
  const guideMatch = html.match(/<script id="guide-data" type="application\/json">([\s\S]*?)<\/script>/);
  assert.equal(JSON.parse(courseMatch[1]), courseText);
  assert.equal(JSON.parse(guideMatch[1]), guide);
  assert.ok(!html.includes('/*__MODEL__*/'));
  assert.ok(!html.includes('/*__UI__*/'));
  assert.ok(!/^import /m.test(html));
  assert.ok(!/<script[^>]+src=/.test(html));
  assert.ok(!/<(?:link|img|iframe)[^>]+(?:href|src)=["']https?:/.test(html));
  const module = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
  assert.ok(!/\b(?:fetch|XMLHttpRequest|localStorage|sessionStorage)\b/.test(module));
});

test('deterministic current builder checks the authored source closure', () => {
  const result = spawnSync(process.execPath, ['tools/build-amortized-arrays.mjs', '--check'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /parity passed/);
  const unknown = spawnSync(process.execPath, ['tools/build-amortized-arrays.mjs', '--force'], { cwd: root, encoding: 'utf8' });
  assert.equal(unknown.status, 2);
});

test('changed HTML and malformed last course item fail in isolated copies without overwriting output', () => {
  const temp = mkdtempSync(join(tmpdir(), 'amortized-arrays-negative-'));
  const paths = ['src/deck.mjs', 'src/amortized-arrays.mjs', 'src/amortized-arrays-ui.mjs', 'courses/amortized-arrays.json', 'courses/amortized-arrays.md', 'courses/amortized-arrays-lab.html', 'templates/amortized-arrays-lab.html', 'tools/build-amortized-arrays.mjs'];
  for (const path of paths) {
    const dest = join(temp, path);
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(new URL(path, root), dest);
  }
  const output = join(temp, 'courses/amortized-arrays-lab.html');
  writeFileSync(output, readFileSync(output, 'utf8') + '\n');
  const stale = spawnSync(process.execPath, ['tools/build-amortized-arrays.mjs', '--check'], { cwd: temp, encoding: 'utf8' });
  assert.notEqual(stale.status, 0);
  assert.match(stale.stderr, /stale/);
  const sentinel = readFileSync(output);
  const invalid = JSON.parse(courseText);
  invalid.items.at(-1).answer = 99;
  writeFileSync(join(temp, 'courses/amortized-arrays.json'), JSON.stringify(invalid));
  const refused = spawnSync(process.execPath, ['tools/build-amortized-arrays.mjs'], { cwd: temp, encoding: 'utf8' });
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /answer/);
  assert.deepEqual(readFileSync(output), sentinel);
});

test('frozen preimplementation evidence remains exact', () => {
  const bytes = readFileSync(new URL('docs/receiving/amortized-arrays-0a55dfe9/preimplementation.json', root));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'baaa99265bd40dbb3aa19add78dd140169608d5439adc86eef5ff91cd6a03340');
});
