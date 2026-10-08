import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, copyFileSync, realpathSync, symlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { Script } from 'node:vm';
import { buildGroupedExplorer } from '../tools/build-grouped-data.mjs';
import { parseDeck, serializeDeck } from '../src/deck.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function isolated(t) {
  const dir = mkdtempSync(join(tmpdir(), 'recallweave-grouped-build-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  for (const path of [
    'tools/build-grouped-data.mjs', 'src/deck.mjs', 'src/grouped-data.mjs',
    'src/grouped-data-ui.mjs', 'courses/grouped-data.json',
    'courses/grouped-data-explorer.template.html', 'courses/grouped-data-explorer.html'
  ]) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    copyFileSync(join(root, path), join(dir, path));
  }
  return dir;
}
function inlineScript(html) {
  assert.equal((html.match(/<script>/g) || []).length, 1);
  assert.equal((html.match(/<\/script>/g) || []).length, 1);
  return html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
}

test('standalone artifact exactly matches sources and contains a valid offline script', () => {
  const html = buildGroupedExplorer();
  assert.equal(readFileSync(join(root, 'courses/grouped-data-explorer.html'), 'utf8'), html);
  new Script(inlineScript(html));
  assert.doesNotMatch(html, /<script\s+[^>]*src=/i);
  assert.doesNotMatch(html, /<link\s+[^>]*rel=["']?stylesheet/i);
});

test('course survives the existing validator and editable-format round trip', () => {
  const original = parseDeck(readFileSync(join(root, 'courses/grouped-data.json'), 'utf8'));
  const roundTrip = parseDeck(serializeDeck(original));
  assert.deepEqual(roundTrip, original);
  assert.equal(original.items.length, 12);
  assert.deepEqual(original.concepts, ['Denominators', 'Group composition', 'Reference mix', 'Causal questions']);
});

test('literal markup and Unicode in admitted course content cannot close the generated script', async t => {
  const dir = isolated(t);
  const coursePath = join(dir, 'courses/grouped-data.json');
  const course = JSON.parse(readFileSync(coursePath, 'utf8'));
  course.title = 'Literal </script><script>globalThis.escaped = true</script> & “text”';
  course.items[0].explanation += '\u2028Literal </script> and \u2029 paragraphs.';
  const courseText = JSON.stringify(course, null, 2) + '\n';
  writeFileSync(coursePath, courseText);
  const module = await import(pathToFileURL(join(dir, 'tools/build-grouped-data.mjs')).href);
  const html = module.buildGroupedExplorer();
  new Script(inlineScript(html));
  const match = html.match(/mountGroupedDataExplorer\(document, \{ courseText: ("(?:[^"\\]|\\.)*") \}\);/);
  assert.ok(match, 'generated entry point contains the complete JSON string');
  assert.equal(JSON.parse(match[1]), courseText);
  assert.doesNotMatch(html, /<script>globalThis\.escaped/);
});

test('check mode reports stale output without replacing a retained artifact', t => {
  const dir = isolated(t);
  const target = join(dir, 'courses/grouped-data-explorer.html');
  writeFileSync(target, 'retained older artifact');
  const child = spawnSync(process.execPath, [join(dir, 'tools/build-grouped-data.mjs'), '--check'], { encoding: 'utf8' });
  assert.equal(child.status, 1);
  assert.match(child.stderr, /differs from its sources/);
  assert.equal(readFileSync(target, 'utf8'), 'retained older artifact');
});

test('unexpected UI dependency refuses the build before overwriting its artifact', t => {
  const dir = isolated(t);
  const ui = join(dir, 'src/grouped-data-ui.mjs');
  writeFileSync(ui, "import { something } from './unexpected.mjs';\n" + readFileSync(ui, 'utf8'));
  const target = join(dir, 'courses/grouped-data-explorer.html');
  const before = readFileSync(target);
  const child = spawnSync(process.execPath, [join(dir, 'tools/build-grouped-data.mjs')], { encoding: 'utf8' });
  assert.equal(child.status, 1);
  assert.match(child.stderr, /Unexpected explorer module dependency/);
  assert.deepEqual(readFileSync(target), before);
});

test('direct entry paths run the same check, refusal and rebuild commands', async t => {
  for (const kind of ['canonical', 'directory alias', 'file alias']) {
    await t.test(kind, t => {
      const dir = isolated(t);
      const entry = realpathSync(join(dir, 'tools/build-grouped-data.mjs'));
      let invoked = entry;
      if (kind !== 'canonical') {
        const link = join(dir, kind === 'directory alias' ? 'linked source' : 'entry alias.mjs');
        try {
          symlinkSync(kind === 'directory alias' ? realpathSync(dir) : entry, link,
            kind === 'directory alias' ? (process.platform === 'win32' ? 'junction' : 'dir') : 'file');
        } catch (error) {
          if (process.platform === 'win32' && ['EPERM', 'EACCES'].includes(error.code)) {
            t.skip('This Windows environment cannot create the required symbolic link.');
            return;
          }
          throw error;
        }
        invoked = kind === 'directory alias' ? join(link, 'tools/build-grouped-data.mjs') : link;
      }
      const run = args => spawnSync(process.execPath, [invoked, ...args],
        { encoding: 'utf8', timeout: 10000 });
      const target = join(dir, 'courses/grouped-data-explorer.html');
      const expected = readFileSync(target);
      const metadata = {
        target: 'courses/grouped-data-explorer.html',
        bytes: expected.length,
        sha256: createHash('sha256').update(expected).digest('hex')
      };
      const check = run(['--check']);
      assert.equal(check.status, 0, check.stderr);
      assert.deepEqual(JSON.parse(check.stdout), { ...metadata, state: 'current' });
      const invalid = run(['--not-an-option']);
      assert.equal(invalid.status, 1);
      assert.match(invalid.stderr, /Usage: node tools\/build-grouped-data\.mjs/);
      assert.equal(invalid.stdout, '');
      assert.deepEqual(readFileSync(target), expected);

      writeFileSync(target, 'retained stale artifact');
      const stale = run(['--check']);
      assert.equal(stale.status, 1);
      assert.match(stale.stderr, /differs from its sources/);
      assert.equal(readFileSync(target, 'utf8'), 'retained stale artifact');
      const rebuilt = run([]);
      assert.equal(rebuilt.status, 0, rebuilt.stderr);
      assert.deepEqual(JSON.parse(rebuilt.stdout), { ...metadata, state: 'built' });
      assert.deepEqual(readFileSync(target), expected);
    });
  }
});

test('ordinary imports and missing caller entries do not execute the CLI', t => {
  const dir = isolated(t);
  const entry = realpathSync(join(dir, 'tools/build-grouped-data.mjs'));
  const target = join(dir, 'courses/grouped-data-explorer.html');
  writeFileSync(target, 'retained during imports');
  const imported = 'const result = await import(' + JSON.stringify(pathToFileURL(entry).href) + ');\n' +
    'if (typeof result.buildGroupedExplorer !== "function") throw new Error("missing export");\n' +
    'console.log("imported");\n';
  const wrapper = join(dir, 'ordinary importer.mjs');
  writeFileSync(wrapper, imported);
  const commands = [
    ['--input-type=module', '-e', imported],
    ['--input-type=module', '-e',
      'process.argv[1] = ' + JSON.stringify(join(dir, 'missing caller.mjs')) + ';\n' + imported],
    [wrapper]
  ];
  for (const args of commands) {
    const child = spawnSync(process.execPath, args, { encoding: 'utf8', timeout: 10000 });
    assert.equal(child.status, 0, child.stderr);
    assert.equal(child.stdout, 'imported\n');
    assert.equal(child.stderr, '');
    assert.equal(readFileSync(target, 'utf8'), 'retained during imports');
  }
});
