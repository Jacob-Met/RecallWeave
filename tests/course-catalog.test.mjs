import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';
import { spawnSync } from 'node:child_process';
import { createCourseCatalog, filterCourseCatalog, validateCatalogPaths, MAX_CATALOG_COURSES } from '../src/course-catalog.mjs';
import { buildCourseCatalog, renderCourseCatalog } from '../tools/build-course-catalog.mjs';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');

function fixture(overrides = {}) {
  return {
    title: 'Precise boundaries',
    attribution: 'Original course by a teacher.',
    license: 'Permission supplied by the author.',
    concepts: ['Intervals'],
    items: [{
      id: 'first', concept: 'Intervals', prerequisites: [],
      prompt: 'Which interval?', options: ['Closed', 'Open'], answer: 1,
      explanation: 'The upper boundary is excluded.', transfer: 'Try a new boundary.'
    }],
    ...overrides
  };
}

function source(value = fixture(), path = 'courses/example.json') {
  return { path, text: ' \r\n' + JSON.stringify(value, null, '\t') + '\r\n' };
}

test('catalog keeps exact raw text and an immutable copy of checked metadata', () => {
  const raw = fixture({
    title: '<img src=x onerror=alert(1)> Literal title',
    attribution: 'Source: </script><script>globalThis.injected = true</script>',
    license: 'Quoted “permission” & original author terms.',
    extraAuthorField: { retainedInDownload: true }
  });
  const input = source(raw);
  const originalText = input.text;
  const catalog = createCourseCatalog([input]);
  assert.equal(catalog[0].text, originalText);
  assert.equal(catalog[0].title, raw.title);
  assert.equal(catalog[0].attribution, raw.attribution);
  assert.equal(catalog[0].license, raw.license);
  assert.equal(catalog[0].questionCount, 1);
  assert.deepEqual(catalog[0].concepts, ['Intervals']);
  assert.deepEqual(catalog[0].preview, ['Which interval?']);
  assert.equal(JSON.parse(catalog[0].text).extraAuthorField.retainedInDownload, true);
  input.path = 'courses/changed.json';
  input.text = '{}';
  raw.concepts[0] = 'Changed';
  assert.equal(catalog[0].filename, 'example.json');
  assert.equal(catalog[0].text, originalText);
  assert.equal(catalog[0].concepts[0], 'Intervals');
  for (const value of [catalog, catalog[0], catalog[0].concepts, catalog[0].preview]) {
    assert.equal(Object.isFrozen(value), true);
  }
});

test('curated paths reject traversal, external URLs, authoring sources and duplicates', () => {
  for (const paths of [
    [], ['../course.json'], ['/courses/one.json'],
    ['https://example.test/one.json'], ['courses/one.source.json'],
    ['courses/nested/one.json'], ['courses/one.json', 'courses/one.json'],
    Array.from({ length: MAX_CATALOG_COURSES + 1 }, (_, i) => 'courses/course-' + i + '.json')
  ]) assert.throws(() => validateCatalogPaths(paths));
  assert.throws(() => createCourseCatalog(null));
  assert.throws(() => createCourseCatalog([null]));
  assert.throws(() => createCourseCatalog([{ path: 'courses/bad.json', text: '{' }]));
  assert.throws(() => createCourseCatalog([source(fixture({ concepts: [] }))]));
  assert.throws(() => createCourseCatalog([{
    path: 'courses/large.json', text: ' '.repeat(262145)
  }]), /256 KiB/);
});

test('every published course is registered, including courses beyond the original 32-course bound', async () => {
  const files = (await readdir(new URL('courses/', root)))
    .filter(name => /^[a-z0-9-]+\.json$/.test(name))
    .sort().map(name => 'courses/' + name);
  const paths = JSON.parse(await read('catalog/courses.json'));
  assert.deepEqual(paths, files, 'New course files must be discoverable in the catalog');
  assert.ok(paths.length > 32);
  assert.equal(validateCatalogPaths(paths).length, paths.length);
  assert.equal(validateCatalogPaths(Array.from({length: MAX_CATALOG_COURSES}, (_, i) =>
    'courses/course-' + i + '.json')).length, MAX_CATALOG_COURSES);
});

test('search uses title and concept substrings with stable order and trimmed case', () => {
  const catalog = createCourseCatalog([
    source(fixture({ title: 'Binary search' }), 'courses/binary.json'),
    source(fixture({ title: 'Directed graphs' }), 'courses/graphs.json')
  ]);
  assert.deepEqual(filterCourseCatalog(catalog, ' BINARY '), [catalog[0]]);
  assert.deepEqual(filterCourseCatalog(catalog, 'phs'), [catalog[1]]);
  assert.deepEqual(filterCourseCatalog(catalog, 'INTERVAL'), [...catalog]);
  assert.deepEqual(filterCourseCatalog(catalog, 'not-a-course'), []);
  const all = filterCourseCatalog(catalog, '  ');
  assert.deepEqual(all, [...catalog]);
  all.pop();
  assert.equal(catalog.length, 2);
});

test('standalone build matches checked-in HTML and embeds every original file unchanged', async () => {
  const built = await buildCourseCatalog();
  assert.equal(built, await read('catalog.html'));
  const match = built.match(/<script type="application\/json" id="course-data">([\s\S]*?)<\/script>/);
  assert.ok(match, 'One embedded source packet is present');
  const embedded = JSON.parse(match[1]);
  const paths = JSON.parse(await read('catalog/courses.json'));
  assert.deepEqual(embedded.map(entry => entry.path), paths);
  for (const entry of embedded) {
    const original = await readFile(new URL(entry.path, root));
    assert.deepEqual(Buffer.from(entry.text, 'utf8'), original, entry.path);
  }
  const inline = [...built.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(inline.length, 1);
  assert.doesNotThrow(() => new Script(inline[0][1]));
  assert.equal(/<script[^>]+src=|<link[^>]+rel=["']stylesheet/i.test(built), false);
});

test('embedded course text cannot terminate the data script or become executable markup', async () => {
  const [template, css, validator, model, ui] = await Promise.all([
    'catalog/template.html', 'catalog/catalog.css', 'src/deck.mjs',
    'src/course-catalog.mjs', 'src/course-catalog-ui.mjs'
  ].map(read));
  const malicious = source(fixture({
    title: '</script><img src=x onerror=alert(1)>',
    attribution: '<script>throw new Error("injected")</script>\u2028\u2029',
    license: 'Literal & <text> must survive.'
  }));
  const input = { template, css, validator, model, ui, sources: [malicious] };
  const html = renderCourseCatalog(input);
  const data = html.match(/<script type="application\/json" id="course-data">([\s\S]*?)<\/script>/)[1];
  assert.equal(data.includes('<'), false);
  assert.deepEqual(JSON.parse(data), [malicious]);
  assert.equal((html.match(/<script(?:\s|>)/g) || []).length, 2);
  assert.equal(html.includes('<img src=x'), false);
  assert.throws(() => renderCourseCatalog({
    ...input, template: template + '{{CATALOG_DATA}}'
  }), /exactly one/);
});

test('builder refuses extra arguments before writing the generated page', async () => {
  const before = await read('catalog.html');
  const result = spawnSync(process.execPath, [
    fileURLToPath(new URL('tools/build-course-catalog.mjs', root)), '--check', 'extra'
  ], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Usage:/);
  assert.equal(await read('catalog.html'), before);
});
