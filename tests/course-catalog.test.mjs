import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile, writeFile, mkdir, mkdtemp, rm, cp, readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {parseDeck} from '../src/deck.mjs';
import {CATALOG_FORMAT, validateCatalogManifest, createCatalog, filterCourses,
  catalogSubjects, catalogJsonForHtml} from '../src/course-catalog.mjs';
import {buildCatalog, loadCatalogInputs, renderCatalogPage} from '../tools/build-course-catalog.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const originalText = await readFile(join(root, 'data/deck.json'), 'utf8');
const fixtureManifest = () => ({format: CATALOG_FORMAT, courses: [{
  id: 'test-course', deck: 'data/deck.json', download: 'test-course.json',
  subject: 'Biology', summary: 'An original lesson with exact source text.', links: []
}]});
const hash = value => createHash('sha256').update(value).digest('hex');

test('catalog metadata comes from the shared parser while UTF-8 source bytes stay exact', () => {
  const deck = JSON.parse(originalText);
  deck.title = '<em>Literal energy</em>';
  deck.attribution = "Original $& $$ $` $' @@CATALOG_SCRIPT@@ @@CATALOG_DATA@@ </script><img src=x onerror=alert(1)>\u2028\u2029";
  const text = ' \r\n' + JSON.stringify(deck, null, '\t').replace(/\n/g, '\r\n') + '\r\n';
  const course = createCatalog(fixtureManifest(), new Map([['data/deck.json', text]])).courses[0];
  assert.equal(course.text, text);
  assert.equal(hash(Buffer.from(course.text)), hash(Buffer.from(text)));
  assert.equal(course.bytes, Buffer.byteLength(text));
  assert.equal(course.title, deck.title);
  assert.equal(course.attribution, deck.attribution);
  assert.equal(course.license, deck.license);
  assert.equal(course.questionCount, deck.items.length);
  assert.equal(course.conceptCount, deck.concepts.length);
  assert.deepEqual(course.concepts, deck.concepts);
  assert.ok(Object.isFrozen(course));
  assert.ok(Object.isFrozen(course.concepts));
  assert.throws(() => course.concepts.push('changed'), TypeError);
});

test('manifest refuses ambiguous identities and unsafe file or companion paths', () => {
  for (const key of ['id', 'deck', 'download']) {
    const manifest = fixtureManifest();
    const next = {...manifest.courses[0], id: 'second-course', deck: 'courses/second.json', download: 'second.json'};
    next[key] = manifest.courses[0][key];
    manifest.courses.push(next);
    assert.throws(() => validateCatalogManifest(manifest), /unique/);
  }
  for (const path of ['../deck.json', '/data/deck.json', 'https://example.org/deck.json', 'courses/a/../b.json', 'courses/deck.json?x=1', 'courses/sql-query-foundations.source.json']) {
    const manifest = fixtureManifest(); manifest.courses[0].deck = path;
    assert.throws(() => validateCatalogManifest(manifest), /lesson file path/);
  }
  for (const path of ['javascript:alert(1)', '//example.org/a.html', 'courses/../a.html', 'courses/a.html#x', '/courses/a.html']) {
    const manifest = fixtureManifest(); manifest.courses[0].links = [{label: 'Guide', path}];
    assert.throws(() => validateCatalogManifest(manifest), /companion file path/);
  }
  for (const name of ['../course.json', 'course.json.exe', 'folder/course.json']) {
    const manifest = fixtureManifest(); manifest.courses[0].download = name;
    assert.throws(() => validateCatalogManifest(manifest), /download filename/);
  }
  assert.throws(() => validateCatalogManifest({format: 'other', courses: []}), /format/);
  assert.throws(() => validateCatalogManifest({format: CATALOG_FORMAT, courses: []}), /1–100/);
});

test('missing and malformed lessons never become catalog entries', () => {
  assert.throws(() => createCatalog(fixtureManifest(), new Map()), /Missing lesson text/);
  assert.throws(() => createCatalog(fixtureManifest(), new Map([['data/deck.json', '{bad']])), /data\/deck.json.*not valid JSON/);
  const invalid = JSON.parse(originalText); invalid.items[0].answer = 999;
  assert.throws(() => createCatalog(fixtureManifest(), new Map([['data/deck.json', JSON.stringify(invalid)]])), /answer/);
  assert.throws(() => createCatalog(fixtureManifest(), new Map([['data/deck.json', ' '.repeat(262145)]])), /256 KiB/);
});

test('search combines literal words with subjects without changing catalog order', () => {
  const courses = [
    {id: 'cells', subject: 'Biology', title: 'Energy in cells', summary: 'Cellular energy', concepts: ['ATP']},
    {id: 'binary', subject: 'Algorithms', title: 'Binary search', summary: 'Sorted intervals', concepts: ['Boundaries']},
    {id: 'graphs', subject: 'Algorithms', title: 'Dependency plans', summary: 'Directed graphs', concepts: ['Cycles']},
    {id: 'literal', subject: 'Data', title: 'Literal .* text', summary: 'Search characters', concepts: ['Text']}
  ];
  assert.deepEqual(filterCourses(courses).map(c => c.id), ['cells', 'binary', 'graphs', 'literal']);
  assert.deepEqual(filterCourses(courses, {query: '  ATP  '}).map(c => c.id), ['cells']);
  assert.deepEqual(filterCourses(courses, {query: 'DEPENDENCY cycles'}).map(c => c.id), ['graphs']);
  assert.deepEqual(filterCourses(courses, {subject: 'Algorithms'}).map(c => c.id), ['binary', 'graphs']);
  assert.deepEqual(filterCourses(courses, {query: 'sorted', subject: 'Biology'}), []);
  assert.deepEqual(filterCourses(courses, {query: '.*'}).map(c => c.id), ['literal']);
  assert.deepEqual(catalogSubjects(courses), ['Algorithms', 'Biology', 'Data']);
});

test('HTML-like content, replacement tokens and line separators survive safe embedding', async () => {
  const {sources} = await loadCatalogInputs(root);
  const deck = JSON.parse(originalText);
  deck.title = '<em>Literal lesson</em>';
  deck.attribution = "</script><img src=x onerror=alert(1)> $& $` $' @@CATALOG_DATA@@ @@CATALOG_SCRIPT@@ \u2028\u2029";
  const text = JSON.stringify(deck, null, 2) + '\r\n';
  const catalog = createCatalog(fixtureManifest(), new Map([['data/deck.json', text]]));
  const encoded = catalogJsonForHtml(catalog);
  assert.ok(!encoded.includes('<'));
  assert.ok(!encoded.includes('\u2028'));
  assert.ok(!encoded.includes('\u2029'));
  assert.deepEqual(JSON.parse(encoded), JSON.parse(JSON.stringify(catalog)));
  const html = renderCatalogPage(catalog, sources);
  const data = html.match(/<script id="course-catalog-data" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(data);
  assert.equal(JSON.parse(data[1]).courses[0].text, text);
  assert.equal((html.match(/<script[ >]/g) || []).length, 2);
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  assert.doesNotThrow(() => new vm.Script(script));
  assert.ok(html.includes('@@CATALOG_SCRIPT@@'), 'Authored placeholder text is retained inside data');
  assert.ok(script.includes('mountCourseCatalog(document,'));
});

async function temporarySource(t) {
  const temp = await mkdtemp(join(tmpdir(), 'recallweave-catalog-test-'));
  t.after(() => rm(temp, {recursive: true, force: true}));
  for (const directory of ['courses', 'data', 'src']) await mkdir(join(temp, directory));
  for (const path of ['courses/catalog.template.html', 'src/deck.mjs', 'src/course-catalog.mjs', 'src/course-catalog-ui.mjs']) {
    await cp(join(root, path), join(temp, path));
  }
  await writeFile(join(temp, 'courses/catalog-manifest.json'), JSON.stringify(fixtureManifest()));
  await writeFile(join(temp, 'data/deck.json'), originalText);
  return temp;
}

test('builder rejects malformed, missing and non-UTF-8 inputs before replacing previous output', async t => {
  const temp = await temporarySource(t);
  await buildCatalog({root: temp});
  const output = join(temp, 'courses/catalog.html');
  const original = await readFile(output);
  for (const bytes of [Buffer.from('{malformed'), Buffer.from([0xff, 0xfe, 0x7b, 0x7d])]) {
    await writeFile(join(temp, 'data/deck.json'), bytes);
    await assert.rejects(buildCatalog({root: temp}));
    assert.deepEqual(await readFile(output), original);
  }
  await rm(join(temp, 'data/deck.json'));
  await assert.rejects(buildCatalog({root: temp}), /ENOENT/);
  assert.deepEqual(await readFile(output), original);
  assert.ok((await readdir(join(temp, 'courses'))).every(name => !name.includes('.tmp-')));
});

test('check mode observes stale output without writing and companion admission is explicit', async t => {
  const temp = await temporarySource(t);
  await buildCatalog({root: temp});
  const output = join(temp, 'courses/catalog.html');
  const before = await readFile(output);
  const revised = JSON.parse(originalText); revised.title = 'A revised original lesson';
  await writeFile(join(temp, 'data/deck.json'), JSON.stringify(revised));
  await assert.rejects(buildCatalog({root: temp, check: true}), /stale/);
  assert.deepEqual(await readFile(output), before);
  const manifest = fixtureManifest(); manifest.courses[0].links = [{label: 'Guide', path: 'courses/missing.md'}];
  await writeFile(join(temp, 'courses/catalog-manifest.json'), JSON.stringify(manifest));
  await assert.rejects(buildCatalog({root: temp}), /ENOENT/);
  assert.deepEqual(await readFile(output), before);
});

test('checked-in catalog contains every exact manifest deck and matches current sources', async () => {
  const manifest = JSON.parse(await readFile(join(root, 'courses/catalog-manifest.json'), 'utf8'));
  const result = await buildCatalog({root, check: true});
  assert.equal(result.courses, manifest.courses.length);
  const html = await readFile(join(root, 'courses/catalog.html'), 'utf8');
  const data = JSON.parse(html.match(/<script id="course-catalog-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  assert.deepEqual(data.courses.map(course => course.id), manifest.courses.map(course => course.id));
  let questions = 0;
  for (const course of data.courses) {
    assert.deepEqual(Buffer.from(course.text), await readFile(join(root, course.deck)));
    const deck = parseDeck(course.text);
    assert.equal(course.questionCount, deck.items.length);
    assert.equal(course.conceptCount, deck.concepts.length);
    questions += deck.items.length;
  }
  assert.equal(result.questions, questions);
});
