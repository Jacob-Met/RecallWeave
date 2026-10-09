import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { Script } from 'node:vm';
import { mountCourseCsvExport } from '../src/course-csv-export-ui.mjs';
import { convertCourseCsv } from '../src/course-csv.mjs';
import { parseDeck, serializeDeck, MAX_DECK_BYTES } from '../src/deck.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const fixture = {
  format: 'recallweave-deck/1',
  title: ' <script>alert("teacher")</script> 😀 ',
  attribution: ' Teacher "A"\n& class ',
  license: ' CC BY 4.0 — literal ',
  concepts: ['idea'],
  items: [{
    id: 'q1', concept: 'idea', prerequisites: [],
    prompt: 'What does <b>literal</b> mean?', options: ['=2+2', 'B "quoted"\nline'],
    answer: 1, explanation: 'Keep the original.', transfer: 'Use it elsewhere.'
  }]
};
const source = '\n ' + JSON.stringify(fixture, null, 1) + '\n';
const rawBytes = new TextEncoder().encode(source);
const expectedCsv = '"id","concept","prompt","option_1","option_2","option_3","option_4","option_5","option_6","correct_option","explanation","transfer","prerequisites"\r\n'
  + '"q1","idea","What does <b>literal</b> mean?","=2+2","B ""quoted""\nline","","","","","2","Keep the original.","Use it elsewhere.","[]"\r\n';
const ids = ['csv-export-file', 'csv-export-status', 'csv-export-preview', 'csv-export-empty',
  'download-course-csv', 'download-csv-metadata', 'csv-source-name', 'csv-lesson-title',
  'csv-lesson-counts', 'csv-attribution', 'csv-license', 'csv-source-hash', 'csv-output-hash',
  'csv-text-preview', 'choose-csv-export-file', 'clear-csv-export'];

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
class Element {
  constructor() { this.handlers = new Map(); this.textContent = ''; this.files = []; this.value = ''; }
  set innerHTML(_) { throw new Error('Input data must not be rendered as HTML'); }
  addEventListener(type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, []);
    this.handlers.get(type).push(fn);
  }
  removeEventListener(type, fn) { this.handlers.set(type, (this.handlers.get(type) ?? []).filter(x => x !== fn)); }
  fire(type) { return Promise.all((this.handlers.get(type) ?? []).map(fn => fn({ target: this }))); }
  click() { this.clickCount = (this.clickCount ?? 0) + 1; return this.fire('click'); }
  remove() { this.removed = true; }
}
function surface(options = {}) {
  const nodes = new Map(ids.map(id => [id, new Element()]));
  const blobs = new Map(), downloads = [], revoked = [], timers = [];
  let sequence = 0;
  const document = {
    getElementById: id => { assert.ok(nodes.has(id), 'known element ' + id); return nodes.get(id); },
    body: { append() {} },
    createElement: tag => {
      assert.equal(tag, 'a');
      const link = new Element();
      link.click = () => downloads.push({ filename: link.download, blob: blobs.get(link.href), url: link.href });
      return link;
    }
  };
  const dispose = mountCourseCsvExport(document, {
    hash: async bytes => digest(bytes),
    createObjectURL: blob => { const url = 'blob:test/' + ++sequence; blobs.set(url, blob); return url; },
    revokeObjectURL: url => { revoked.push(url); blobs.delete(url); },
    setTimeout: fn => { timers.push(fn); },
    ...options
  });
  const el = id => nodes.get(id);
  const choose = async file => {
    el('csv-export-file').files = file ? [file] : [];
    return el('csv-export-file').fire('change');
  };
  return { el, choose, downloads, revoked, timers, dispose };
}
function file(bytes = rawBytes, name = 'teacher lesson.json', overrides = {}) {
  return { name, size: bytes.byteLength, arrayBuffer: async () => bytes.slice().buffer, ...overrides };
}
function retired(ui) {
  assert.equal(ui.el('csv-export-preview').hidden, true);
  assert.equal(ui.el('csv-export-empty').hidden, false);
  assert.equal(ui.el('download-course-csv').disabled, true);
  assert.equal(ui.el('download-csv-metadata').disabled, true);
  assert.equal(ui.el('csv-lesson-title').textContent, '');
  assert.equal(ui.el('csv-text-preview').textContent, '');
}
function ready(ui, title = fixture.title) {
  assert.equal(ui.el('csv-export-preview').hidden, false);
  assert.equal(ui.el('csv-export-empty').hidden, true);
  assert.equal(ui.el('download-course-csv').disabled, false);
  assert.equal(ui.el('download-csv-metadata').disabled, false);
  assert.equal(ui.el('csv-lesson-title').textContent, title);
}
const tick = () => new Promise(resolve => setImmediate(resolve));

test('initial state has no preview or actionable downloads', async () => {
  const ui = surface();
  retired(ui);
  await ui.el('download-course-csv').click();
  await ui.el('download-csv-metadata').click();
  assert.equal(ui.downloads.length, 0);
  ui.dispose();
});

test('literal preview and separate download bytes preserve an independently written CSV and metadata', async () => {
  const ui = surface();
  await ui.choose(file());
  ready(ui);
  assert.equal(ui.el('csv-attribution').textContent, fixture.attribution);
  assert.equal(ui.el('csv-license').textContent, fixture.license);
  assert.equal(ui.el('csv-text-preview').textContent, expectedCsv);
  assert.equal(ui.el('csv-source-hash').textContent, digest(rawBytes));
  assert.equal(ui.el('csv-output-hash').textContent, digest(expectedCsv));
  await ui.el('download-course-csv').click();
  await ui.el('download-csv-metadata').click();
  assert.deepEqual(ui.downloads.map(x => x.filename), ['question-bank.csv', 'question-bank.metadata.json']);
  assert.equal(await ui.downloads[0].blob.text(), expectedCsv);
  assert.equal(ui.downloads[0].blob.type, 'text/csv;charset=utf-8');
  assert.equal(ui.downloads[1].blob.type, 'application/json;charset=utf-8');
  const receipt = JSON.parse(await ui.downloads[1].blob.text());
  assert.deepEqual(receipt, {
    format: 'recallweave-course-csv-export/1', input: 'teacher lesson.json',
    input_sha256: digest(rawBytes), output: 'question-bank.csv', csv_sha256: digest(expectedCsv),
    question_count: 1, concept_count: 1,
    metadata: { title: fixture.title, attribution: fixture.attribution, license: fixture.license }
  });
  assert.equal(convertCourseCsv(await ui.downloads[0].blob.text(), receipt.metadata).json, serializeDeck(parseDeck(source)));
  ui.dispose();
  assert.equal(ui.revoked.length, 2);
});

test('chooser opening immediately retires result and issued URLs; cancel and clear remain empty', async () => {
  const ui = surface();
  await ui.choose(file());
  await ui.el('download-course-csv').click();
  ui.el('csv-export-file').value = 'old selection';
  await ui.el('choose-csv-export-file').click();
  retired(ui);
  assert.equal(ui.el('csv-export-file').value, '');
  assert.equal(ui.el('csv-export-file').clickCount, 1);
  assert.deepEqual(ui.revoked, ['blob:test/1']);
  await ui.el('csv-export-file').fire('cancel');
  retired(ui);
  await ui.choose(file());
  ready(ui);
  await ui.el('clear-csv-export').click();
  retired(ui);
  await ui.choose(file());
  ready(ui);
  await ui.choose(null);
  retired(ui);
});

test('invalid replacements clear a valid result and preserve strict byte and losslessness refusals', async t => {
  const invalid = [
    ['invalid UTF-8', file(Uint8Array.from([0x7b, 0xff, 0x7d])), /valid UTF-8/],
    ['UTF-8 BOM', file(Uint8Array.from([0xef, 0xbb, 0xbf, ...rawBytes])), /valid JSON/],
    ['malformed JSON', file(new TextEncoder().encode('{')), /valid JSON/],
    ['advertised oversized', file(rawBytes, 'too-large.json', { size: MAX_DECK_BYTES + 1, arrayBuffer: () => { throw Error('must not read'); } }), /256 KiB/],
    ['actual oversized', file(new Uint8Array(MAX_DECK_BYTES + 1), 'grew.json', { size: 1 }), /256 KiB/],
    ['unsupported field', file(new TextEncoder().encode(JSON.stringify({ ...fixture, notes: 'retain me' }))), /unsupported field/],
    ['unpaired surrogate', file(new TextEncoder().encode(JSON.stringify({ ...fixture, title: '\ud800' }))), /unpaired Unicode/],
    ['invalid answer', file(new TextEncoder().encode(JSON.stringify({ ...fixture, items: [{ ...fixture.items[0], answer: 9 }] }))), /zero-based index/]
  ];
  for (const [name, input, message] of invalid) {
    await t.test(name, async () => {
      const ui = surface();
      await ui.choose(file());
      ready(ui);
      await ui.choose(input);
      retired(ui);
      assert.match(ui.el('csv-export-status').textContent, message);
      await ui.el('download-course-csv').click();
      assert.equal(ui.downloads.length, 0);
    });
  }
});

for (const outcome of ['resolve', 'reject']) {
  test('a stale file read cannot replace a newer result after late ' + outcome, async () => {
    const pending = deferred();
    const ui = surface();
    const old = ui.choose(file(rawBytes, 'old.json', { arrayBuffer: () => pending.promise }));
    const next = { ...fixture, title: 'New lesson B' };
    await ui.choose(file(new TextEncoder().encode(JSON.stringify(next)), 'new.json'));
    ready(ui, next.title);
    const status = ui.el('csv-export-status').textContent;
    if (outcome === 'resolve') pending.resolve(rawBytes.slice().buffer);
    else pending.reject(new Error('old read failure'));
    await old;
    ready(ui, next.title);
    assert.equal(ui.el('csv-source-name').textContent, 'new.json');
    assert.equal(ui.el('csv-export-status').textContent, status);
  });

  test('a stale hash cannot replace a newer result after late ' + outcome, async () => {
    const pending = deferred();
    let calls = 0;
    const ui = surface({ hash: bytes => ++calls === 1 ? pending.promise : Promise.resolve(digest(bytes)) });
    const old = ui.choose(file());
    await tick();
    retired(ui);
    const next = { ...fixture, title: 'Hash winner B' };
    await ui.choose(file(new TextEncoder().encode(JSON.stringify(next)), 'hash-winner.json'));
    ready(ui, next.title);
    if (outcome === 'resolve') pending.resolve(digest(rawBytes));
    else pending.reject(new Error('old hash failure'));
    await old;
    ready(ui, next.title);
  });
}

for (const action of ['clear-csv-export', 'choose-csv-export-file', 'cancel']) {
  test(action + ' invalidates a pending read', async () => {
    const pending = deferred(), ui = surface();
    const loading = ui.choose(file(rawBytes, 'slow.json', { arrayBuffer: () => pending.promise }));
    if (action === 'cancel') await ui.el('csv-export-file').fire('cancel');
    else await ui.el(action).click();
    pending.resolve(rawBytes.slice().buffer);
    await loading;
    retired(ui);
  });
}

test('clearing while a digest is pending prevents publication', async () => {
  const pending = deferred();
  const ui = surface({ hash: () => pending.promise });
  const loading = ui.choose(file());
  await tick();
  await ui.el('clear-csv-export').click();
  pending.resolve(digest(rawBytes));
  await loading;
  retired(ui);
});

test('current hash failures or malformed hashes never enable either download', async () => {
  for (const hash of [async () => { throw new Error('digest unavailable'); }, async () => 'not a digest']) {
    const ui = surface({ hash });
    await ui.choose(file());
    retired(ui);
    assert.match(ui.el('csv-export-status').textContent, /digest unavailable|SHA-256/);
  }
});

test('download preparation failure retires the checked result', async () => {
  const ui = surface({ createObjectURL: () => { throw new Error('download unavailable'); } });
  await ui.choose(file());
  ready(ui);
  await ui.el('download-course-csv').click();
  retired(ui);
  assert.match(ui.el('csv-export-status').textContent, /download could not be prepared/);
});

test('browser bytes and receipt agree with an actual unchanged terminal exporter process', async () => {
  const temporary = mkdtempSync(join(tmpdir(), 'recallweave-csv-ui-cli-'));
  try {
    const input = join(temporary, 'lesson.json'), output = join(temporary, 'question-bank.csv');
    writeFileSync(input, rawBytes);
    const cli = spawnSync(process.execPath, [join(root, 'tools/export_course_csv.mjs'), '--input', input, '--output', output], { encoding: 'utf8' });
    assert.equal(cli.status, 0, cli.stderr);
    const ui = surface();
    await ui.choose(file());
    await ui.el('download-csv-metadata').click();
    const browserReceipt = JSON.parse(await ui.downloads[0].blob.text());
    const cliReceipt = JSON.parse(cli.stdout);
    assert.deepEqual({ ...cliReceipt, input: browserReceipt.input, output: browserReceipt.output }, browserReceipt);
    assert.equal(readFileSync(output, 'utf8'), expectedCsv);
    assert.deepEqual(readFileSync(input), Buffer.from(rawBytes));
  } finally { rmSync(temporary, { recursive: true, force: true }); }
});

test('standalone builder reproduces the artifact with no external module or stylesheet dependency', () => {
  const built = spawnSync('python3', ['-B', 'tools/make_csv_export.py', '--check'], { cwd: root, encoding: 'utf8' });
  assert.equal(built.status, 0, built.stdout + built.stderr);
  const page = readFileSync(join(root, 'csv-export.html'), 'utf8');
  assert.equal(page.match(/<\/script>/g)?.length, 1);
  assert.doesNotMatch(page, /<script[^>]+src=|<link[^>]+stylesheet|type="module"/);
  assert.match(page, /href="author\.html"/);
  assert.match(page, /href="demo\.html"/);
  assert.doesNotThrow(() => new Script(page.match(/<script>([\s\S]*?)<\/script>/)[1]));
  const extra = spawnSync('python3', ['-B', 'tools/make_csv_export.py', '--unexpected'], { cwd: root, encoding: 'utf8' });
  assert.equal(extra.status, 2);
});

test('builder detects stale source and refuses a broken template or unresolved import before output writes', () => {
  const temporary = mkdtempSync(join(tmpdir(), 'recallweave-csv-ui-builder-'));
  const paths = ['tools/make_csv_export.py', 'csv-export/index.html', 'csv-export.html',
    'src/deck.mjs', 'src/course-csv.mjs', 'src/course-csv-export.mjs', 'src/course-csv-export-ui.mjs'];
  try {
    for (const path of paths) {
      mkdirSync(dirname(join(temporary, path)), { recursive: true });
      copyFileSync(join(root, path), join(temporary, path));
    }
    const run = args => spawnSync('python3', ['-B', 'tools/make_csv_export.py', ...args], { cwd: temporary, encoding: 'utf8' });
    const original = readFileSync(join(temporary, 'csv-export.html'));
    const uiPath = join(temporary, 'src/course-csv-export-ui.mjs');
    writeFileSync(uiPath, readFileSync(uiPath, 'utf8') + '\n// Source parity challenge.\n');
    assert.notEqual(run(['--check']).status, 0);
    assert.deepEqual(readFileSync(join(temporary, 'csv-export.html')), original);
    assert.equal(run([]).status, 0);
    assert.equal(run(['--check']).status, 0);
    const rebuilt = readFileSync(join(temporary, 'csv-export.html'));
    const templatePath = join(temporary, 'csv-export/index.html');
    const template = readFileSync(templatePath, 'utf8');
    writeFileSync(templatePath, template.replace('<script type="module"', '<script data-broken="module"'));
    assert.notEqual(run([]).status, 0);
    assert.deepEqual(readFileSync(join(temporary, 'csv-export.html')), rebuilt);
    writeFileSync(templatePath, template);
    writeFileSync(uiPath, "import { missing } from './absent.mjs';\n" + readFileSync(uiPath, 'utf8'));
    assert.notEqual(run([]).status, 0);
    assert.deepEqual(readFileSync(join(temporary, 'csv-export.html')), rebuilt);
  } finally { rmSync(temporary, { recursive: true, force: true }); }
});
