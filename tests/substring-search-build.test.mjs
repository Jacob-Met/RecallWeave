// Native compilation/closure check of the actual generated artifact.
// This does not launch or emulate a browser engine.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const html = read('courses/substring-search-explorer.html');
const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];

test('the standalone builder reports exact parity without writing the generated file', () => {
  const before = read('courses/substring-search-explorer.html');
  const checked = spawnSync(process.env.PYTHON || 'python3', ['tools/make_substring_search.py', '--check'], { cwd: root, encoding: 'utf8', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } });
  assert.equal(checked.status, 0, checked.stderr + checked.stdout);
  assert.match(checked.stdout, /exact source closure/);
  assert.equal(read('courses/substring-search-explorer.html'), before);
});

test('generated source, style and course bytes match their complete authored closure', () => {
  const core = read('src/substring-search.mjs'), ui = read('src/substring-search-ui.mjs');
  const importLine = "import { buildSearchComparison, EXAMPLES } from './substring-search.mjs';\n";
  assert.ok(ui.startsWith(importLine));
  assert.equal(script, core + '\n' + ui.slice(importLine.length));
  assert.equal(html.match(/<style>([\s\S]*?)<\/style>/)[1], read('src/substring-search.css'));
  const embedded = html.match(/<script type="application\/json" id="substring-course-source">([\s\S]*?)<\/script>/)[1];
  assert.equal(JSON.parse(embedded), read('courses/substring-search.json'));
  assert.equal((html.match(/<script\b/g) || []).length, 2);
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+stylesheet|\bfetch\s*\(|\blocalStorage\b|\bsessionStorage\b|\bimport\s*\{/);
  for (const id of ['search-text', 'search-pattern', 'search-form', 'search-example', 'search-result', 'search-status', 'download-calculation', 'download-course', 'search-summary', 'search-identity', 'trace-naive', 'trace-prefix', 'trace-kmp']) {
    assert.equal((html.match(new RegExp('id="' + id + '"', 'g')) || []).length, 1);
  }
  assert.match(html, /id="search-status"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(html, /<label for="search-text">/); assert.match(html, /<label for="search-pattern">/);
});

test('the actual bundled module compiles natively and preserves an overlap and Unicode calculation', async () => {
  const compiled = await import('data:text/javascript;base64,' + Buffer.from(script).toString('base64'));
  assert.equal(typeof compiled.mountExplorer, 'function');
  assert.equal(typeof compiled.requestDownload, 'function');
  const result = compiled.buildSearchComparison('😀A😀A😀', '😀A');
  assert.deepEqual(result.kmp.matches, [0, 2]);
  assert.deepEqual(result.prefix.table, [0, 0]);
  assert.deepEqual(result.counts, { naive: 6, prefix: 1, kmpSearch: 5, kmpTotal: 6 });
  assert.ok(Object.isFrozen(result));
});
