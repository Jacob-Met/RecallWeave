import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, readdir, lstat, rm, symlink, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const producer = await readFile(new URL('../tools/build-offline-pack.py', import.meta.url));
const original = JSON.parse(await readFile(new URL('../courses/binary-search.json', import.meta.url), 'utf8'));
const zipPath = 'offline/recallweave-offline.zip';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const instructionName = 'RecallWeave/START-HERE.txt';
const manifestName = 'RecallWeave/SHA256SUMS.json';

async function put(root, path, value) {
  const destination = join(root, path);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, value);
}

async function updateCatalog(fixture) {
  const rows = [];
  for (const path of fixture.paths) {
    rows.push({ path, text: await readFile(join(fixture.root, path), 'utf8') });
  }
  const data = JSON.stringify(rows).replace(/</g, '\\u003c');
  await put(fixture.root, 'catalog.html',
    '<!doctype html><html><body>\n<script id="course-data" type="application/json">' +
    data + '</script>\n</body></html>\n');
}

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'recallweave offline producer é-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await put(root, 'tools/build-offline-pack.py', producer);
  const paths = ['courses/z-course.json', 'courses/a-course.json'];
  const raw = JSON.stringify({ ...original, title: 'Bytes café <ready>' }, null, 2)
    .replace(/\n/g, '\r\n') + '\r\n';
  for (const path of paths) await put(root, path, raw + (path.includes('/a-') ? ' \r\n' : ''));
  await put(root, 'courses/not-registered.json', '{"ignored":"even when present"}\n');
  await put(root, 'catalog/courses.json', JSON.stringify(paths) + '\n');
  await put(root, 'demo.html', '<!doctype html><html><body>Local café learner</body></html>\r\n');
  await mkdir(join(root, 'offline'));
  const result = { root, paths };
  await updateCatalog(result);
  return result;
}

function invoke(root, args = []) {
  return spawnSync('python3', [join(root, 'tools/build-offline-pack.py'), ...args], {
    cwd: tmpdir(), encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024
  });
}

function succeeded(result) {
  assert.equal(result.error, undefined);
  assert.equal(result.signal, null);
  assert.equal(result.status, 0, result.stderr);
}

async function snapshot(root) {
  const files = [];
  async function walk(relative) {
    const current = join(root, relative);
    for (const name of (await readdir(current)).sort()) {
      const child = relative ? relative + '/' + name : name;
      const path = join(root, child);
      const stat = await lstat(path, { bigint: true });
      if (stat.isDirectory()) await walk(child);
      else files.push({
        path: child, mode: String(stat.mode), mtime: String(stat.mtimeNs),
        bytes: String(stat.size),
        sha256: stat.isFile() ? sha256(await readFile(path)) : null
      });
    }
  }
  await walk('');
  return files;
}

async function seedPreviousPack(root) {
  await put(root, zipPath, 'previous complete archive bytes\n');
}

async function refusedWithoutChanges(root, args = [], status = 1) {
  const before = await snapshot(root);
  const result = invoke(root, args);
  assert.equal(result.error, undefined);
  assert.equal(result.signal, null);
  assert.equal(result.status, status, result.stdout + result.stderr);
  assert.notEqual(result.stderr.trim(), '');
  assert.equal(result.stdout, '');
  assert.deepEqual(await snapshot(root), before);
  return result;
}

function inspect(root) {
  const script = [
    'import base64,json,sys,zipfile',
    'with zipfile.ZipFile(sys.argv[1]) as archive:',
    ' print(json.dumps({"comment":archive.comment.hex(),"entries":[{"name":e.filename,"method":e.compress_type,"flags":e.flag_bits,"system":e.create_system,"create":e.create_version,"extract":e.extract_version,"mode":e.external_attr>>16,"date":list(e.date_time),"extra":e.extra.hex(),"comment":e.comment.hex(),"bytes":e.file_size,"compressed":e.compress_size,"data":base64.b64encode(archive.read(e)).decode("ascii")} for e in archive.infolist()]}))'
  ].join('\n');
  const result = spawnSync('python3', ['-c', script, join(root, zipPath)], {
    encoding: 'utf8', timeout: 10000, maxBuffer: 4 * 1024 * 1024
  });
  succeeded(result);
  return JSON.parse(result.stdout);
}

test('pack preserves exact raw bytes in one deterministic, directly openable folder', async t => {
  const f = await fixture(t);
  const inputBefore = await snapshot(f.root);
  succeeded(invoke(f.root));
  const first = await readFile(join(f.root, zipPath));
  const afterBuild = await snapshot(f.root);
  assert.deepEqual(afterBuild.filter(x => x.path !== zipPath), inputBefore);
  const pack = inspect(f.root);
  const names = [
    'RecallWeave/catalog.html', 'RecallWeave/demo.html',
    ...f.paths.map(path => 'RecallWeave/' + path), instructionName, manifestName
  ].sort();
  assert.deepEqual(pack.entries.map(entry => entry.name), names);
  assert.equal(pack.comment, '');
  const contents = new Map();
  for (const entry of pack.entries) {
    assert.equal(entry.method, 0);
    assert.equal(entry.flags, 0);
    assert.equal(entry.system, 3);
    assert.equal(entry.create, 20);
    assert.equal(entry.extract, 20);
    assert.equal(entry.mode, 0o100644);
    assert.deepEqual(entry.date, [1980, 1, 1, 0, 0, 0]);
    assert.equal(entry.extra, '');
    assert.equal(entry.comment, '');
    assert.equal(entry.bytes, entry.compressed);
    const bytes = Buffer.from(entry.data, 'base64');
    assert.equal(bytes.length, entry.bytes);
    contents.set(entry.name, bytes);
  }
  for (const path of ['catalog.html', 'demo.html', ...f.paths]) {
    assert.deepEqual(contents.get('RecallWeave/' + path), await readFile(join(f.root, path)));
  }
  assert.match(contents.get(instructionName).toString('utf8'), /Extract the entire ZIP/);
  const manifestBytes = contents.get(manifestName);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const expectedFiles = names.filter(name => name !== manifestName).map(name => ({
    path: name.slice('RecallWeave/'.length),
    bytes: contents.get(name).length, sha256: sha256(contents.get(name))
  }));
  assert.deepEqual(manifest, { format: 'recallweave-offline-pack-v1', files: expectedFiles });
  assert.equal(manifestBytes.at(-1), 10);
  assert.equal(contents.has('RecallWeave/courses/not-registered.json'), false);
  succeeded(invoke(f.root, ['--check']));
  assert.deepEqual(await snapshot(f.root), afterBuild);
  for (const path of f.paths) await utimes(join(f.root, path), new Date(0), new Date(0));
  const beforeRepeat = await snapshot(f.root);
  succeeded(invoke(f.root));
  assert.deepEqual(await readFile(join(f.root, zipPath)), first);
  assert.deepEqual(await snapshot(f.root), beforeRepeat);
});

test('--check refuses missing and stale artifacts without creating or changing files', async t => {
  const f = await fixture(t);
  await refusedWithoutChanges(f.root, ['--check']);
  succeeded(invoke(f.root));
  await put(f.root, zipPath, 'stale archive\n');
  await refusedWithoutChanges(f.root, ['--check']);
});

test('invalid arguments are refused before publication or input access', async t => {
  for (const args of [['--help'], ['extra'], ['--check', 'extra'], ['--check', '--check'], ['']]) {
    await t.test(JSON.stringify(args), async sub => {
      const f = await fixture(sub);
      await seedPreviousPack(f.root);
      await rm(join(f.root, 'catalog'), { recursive: true });
      const result = await refusedWithoutChanges(f.root, args, 2);
      assert.match(result.stderr, /^Usage:/);
    });
  }
});

test('invalid registration never replaces a previous archive', async t => {
  const cases = [
    [], ['courses/z-course.json', 'courses/z-course.json'],
    ['../outside.json'], ['/outside.json'], ['courses/sub/file.json'],
    ['courses\\file.json'], [null], { courses: ['courses/a-course.json'] },
    Array.from({ length: 33 }, (_, index) => 'courses/course-' + index + '.json')
  ];
  for (const paths of cases) {
    await t.test(JSON.stringify(paths).slice(0, 100), async sub => {
      const f = await fixture(sub);
      await seedPreviousPack(f.root);
      await put(f.root, 'catalog/courses.json', JSON.stringify(paths));
      await refusedWithoutChanges(f.root);
    });
  }
});

test('catalog and course mismatches are rejected, then exact updated bytes can be published', async t => {
  const f = await fixture(t);
  succeeded(invoke(f.root));
  const first = await readFile(join(f.root, zipPath));
  await put(f.root, f.paths[0], (await readFile(join(f.root, f.paths[0]), 'utf8')) + ' \r\n');
  const rejection = await refusedWithoutChanges(f.root);
  assert.match(rejection.stderr, /catalog.html is stale/);
  await updateCatalog(f);
  succeeded(invoke(f.root));
  assert.notDeepEqual(await readFile(join(f.root, zipPath)), first);
  const entry = inspect(f.root).entries.find(x => x.name === 'RecallWeave/' + f.paths[0]);
  assert.deepEqual(Buffer.from(entry.data, 'base64'), await readFile(join(f.root, f.paths[0])));
  succeeded(invoke(f.root, ['--check']));
});

test('missing, malformed, oversized and linked inputs are refused before publishing', async t => {
  const cases = [
    ['missing learner', async f => rm(join(f.root, 'demo.html'))],
    ['invalid UTF-8 learner', async f => put(f.root, 'demo.html', Buffer.from([0xff, 0xfe]))],
    ['invalid UTF-8 course', async f => put(f.root, f.paths[0], Buffer.from([0xff]))],
    ['non-JSON course', async f => put(f.root, f.paths[0], '{"invalid":NaN}')],
    ['oversized learner', async f => put(f.root, 'demo.html', Buffer.alloc(1024 * 1024 + 1, 65))],
    ['missing catalog data', async f => put(f.root, 'catalog.html', '<!doctype html><p>No embedded courses</p>')],
    ['duplicate catalog data', async f => {
      const html = await readFile(join(f.root, 'catalog.html'), 'utf8');
      await put(f.root, 'catalog.html', html + html);
    }],
    ['wrong catalog data element', async f => {
      const html = await readFile(join(f.root, 'catalog.html'), 'utf8');
      await put(f.root, 'catalog.html', html.replace('application/json', 'text/javascript'));
    }],
    ['course symlink', async f => {
      await rm(join(f.root, f.paths[0]));
      await symlink(join(f.root, f.paths[1]), join(f.root, f.paths[0]));
    }],
    ['output symlink', async f => {
      await rm(join(f.root, zipPath));
      await symlink(join(f.root, 'demo.html'), join(f.root, zipPath));
    }],
    ['output directory', async f => {
      await rm(join(f.root, zipPath));
      await mkdir(join(f.root, zipPath));
    }]
  ];
  for (const [name, change] of cases) {
    await t.test(name, async sub => {
      const f = await fixture(sub);
      await seedPreviousPack(f.root);
      await change(f);
      await refusedWithoutChanges(f.root);
    });
  }
});

test('write synchronization and atomic replacement failures keep the previous archive and clean temporary files', async t => {
  for (const operation of ['fsync', 'replace']) {
    await t.test(operation, async sub => {
      const f = await fixture(sub);
      await seedPreviousPack(f.root);
      const before = await snapshot(f.root);
      const wrapper = [
        'import os,runpy,sys',
        'target,operation=sys.argv[1:]',
        'def fail(*args,**kwargs):',
        ' raise OSError("forced " + operation + " failure before publication")',
        'setattr(os,operation,fail)',
        'sys.argv=[target]',
        'runpy.run_path(target,run_name="__main__")'
      ].join('\n');
      const result = spawnSync('python3', ['-c', wrapper, join(f.root, 'tools/build-offline-pack.py'), operation], {
        cwd: tmpdir(), encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024
      });
      assert.equal(result.error, undefined);
      assert.equal(result.status, 1);
      assert.equal(result.stdout, '');
      assert.match(result.stderr, /failure before publication/);
      assert.deepEqual(await snapshot(f.root), before);
      assert.deepEqual(await readdir(join(f.root, 'offline')), ['recallweave-offline.zip']);
    });
  }
});


test('committed offline pack matches the current compiled pages and registered courses', () => {
  succeeded(invoke(fileURLToPath(new URL('../', import.meta.url)), ['--check']));
});
