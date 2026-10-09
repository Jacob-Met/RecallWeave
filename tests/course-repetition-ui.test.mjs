import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { Script } from 'node:vm';
import { mountCourseRepetition } from '../src/course-repetition-ui.mjs';

const digest = value => createHash('sha256').update(value).digest('hex');
const q = (id, options, answer, extra = {}) => ({
  id, concept: 'base', prerequisites: [], prompt: 'Exact <b>prompt</b> ',
  options, answer, explanation: 'Keep this explanation.', transfer: 'Apply elsewhere.', ...extra
});
const fixture = {
  format: 'recallweave-deck/1',
  title: ' <script>teacher</script> 😀 ', attribution: ' Teacher "A"\n& class ', license: ' CC0 ',
  concepts: ['base', 'next'],
  items: [
    q('first', ['Alpha', 'Beta'], 0),
    q('unique', ['One', 'Two'], 1, { concept: 'next', prerequisites: ['base'], prompt: 'Unique prompt' }),
    q('__proto__', ['Beta', 'Alpha'], 1, { concept: 'next', prerequisites: ['base'], explanation: 'Different context.' }),
    q('disagrees', ['Beta', 'Alpha'], 0),
    q('singleton', ['Alpha', 'Gamma'], 1, { transfer: 'Keep singleton context.' })
  ]
};
const source = '\n ' + JSON.stringify(fixture, null, 1) + '\n';
const bytes = new TextEncoder().encode(source);
const expectedReport = {
  format: 'recallweave-course-repetition/1',
  course: { title: fixture.title, attribution: fixture.attribution, license: fixture.license },
  summary: { questionCount: 5, repeatedPromptGroups: 1, repeatedQuestionCount: 4, equivalentChoiceGroups: 1, answerDisagreementGroups: 1 },
  prompts: [{
    prompt: fixture.items[0].prompt,
    members: [0, 2, 3, 4].map(index => ({ index, item: fixture.items[index] })),
    choiceGroups: [{
      options: ['Alpha', 'Beta'], questionIds: ['first', '__proto__', 'disagrees'],
      authoredAnswers: [
        { text: 'Alpha', questionIds: ['first', '__proto__'] },
        { text: 'Beta', questionIds: ['disagrees'] }
      ],
      answerDisagreement: true
    }]
  }]
};
const ids = ['repetition-file', 'choose-repetition-file', 'review-repetition', 'download-repetition',
  'repetition-status', 'repetition-captured', 'repetition-result', 'repetition-empty', 'repetition-filename',
  'repetition-bytes', 'repetition-source-hash', 'repetition-title', 'repetition-metadata', 'repetition-total',
  'repetition-prompt-count', 'repetition-member-count', 'repetition-choice-count', 'repetition-answer-count',
  'repetition-outcome', 'repetition-report-json', 'repetition-groups', 'clear-repetition'];

class Element {
  constructor(tag = 'div') {
    this.tagName = tag; this.handlers = new Map(); this.children = []; this.ownText = '';
    this.files = []; this.value = ''; this.disabled = false; this.hidden = false;
  }
  set textContent(value) { this.ownText = String(value); this.children = []; }
  get textContent() { return this.ownText + this.children.map(node => node.textContent).join(''); }
  set innerHTML(_) { throw new Error('Untrusted HTML rendering is forbidden'); }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.ownText = ''; this.children = [...nodes]; }
  addEventListener(kind, action) {
    if (!this.handlers.has(kind)) this.handlers.set(kind, []);
    this.handlers.get(kind).push(action);
  }
  removeEventListener(kind, action) { this.handlers.set(kind, (this.handlers.get(kind) ?? []).filter(fn => fn !== action)); }
  fire(kind) { return Promise.all((this.handlers.get(kind) ?? []).map(fn => fn({ target: this }))); }
  click() { if (this.disabled) return Promise.resolve([]); this.clickCount = (this.clickCount ?? 0) + 1; return this.fire('click'); }
  focus() { this.focused = true; }
  remove() { this.removed = true; }
}
function descendants(node) { return node.children.flatMap(child => [child, ...descendants(child)]); }
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function surface(overrides = {}) {
  const nodes = new Map(ids.map(id => [id, new Element()]));
  const blobs = new Map(), downloads = [], revoked = [], timers = [];
  let next = 0;
  const document = {
    getElementById(id) { assert.ok(nodes.has(id), 'known DOM ID ' + id); return nodes.get(id); },
    body: new Element('body'),
    createElement(tag) {
      const node = new Element(tag);
      if (tag === 'a') node.click = () => downloads.push({ filename: node.download, blob: blobs.get(node.href), url: node.href });
      return node;
    }
  };
  const dispose = mountCourseRepetition(document, {
    hash: async input => digest(input),
    createObjectURL(blob) { const url = 'blob:test/' + ++next; blobs.set(url, blob); return url; },
    revokeObjectURL(url) { revoked.push(url); blobs.delete(url); },
    setTimeout(fn) { timers.push(fn); },
    ...overrides
  });
  const el = id => nodes.get(id);
  const choose = async file => { el('repetition-file').files = file ? [file] : []; return el('repetition-file').fire('change'); };
  return { el, choose, downloads, revoked, timers, dispose };
}
function file(data = bytes, name = 'literal course.json', extra = {}) {
  return { name, size: data.byteLength, arrayBuffer: async () => data.slice().buffer, ...extra };
}
function retired(ui) {
  assert.equal(ui.el('review-repetition').disabled, true);
  assert.equal(ui.el('download-repetition').disabled, true);
  assert.equal(ui.el('repetition-result').hidden, true);
  assert.equal(ui.el('repetition-captured').hidden, true);
  assert.equal(ui.el('repetition-empty').hidden, false);
  assert.equal(ui.el('repetition-title').textContent, '');
  assert.equal(ui.el('repetition-report-json').textContent, '');
  assert.equal(ui.el('repetition-groups').children.length, 0);
}
function loaded(ui) {
  assert.equal(ui.el('review-repetition').disabled, false);
  assert.equal(ui.el('download-repetition').disabled, true);
  assert.equal(ui.el('repetition-captured').hidden, false);
  assert.equal(ui.el('repetition-result').hidden, true);
}
function ready(ui) {
  assert.equal(ui.el('review-repetition').disabled, true);
  assert.equal(ui.el('download-repetition').disabled, false);
  assert.equal(ui.el('repetition-result').hidden, false);
  assert.equal(ui.el('repetition-empty').hidden, true);
}
const tick = () => new Promise(resolve => setImmediate(resolve));
async function reviewFixture(ui, data = bytes) { await ui.choose(file(data)); loaded(ui); await ui.el('review-repetition').click(); ready(ui); }

test('UI: file capture requires explicit Review and keeps exact raw provenance', async () => {
  const ui = surface();
  retired(ui);
  await ui.el('review-repetition').click();
  await ui.el('download-repetition').click();
  assert.equal(ui.downloads.length, 0);
  await ui.choose(file(bytes, ' <img>.json '));
  loaded(ui);
  assert.match(ui.el('repetition-status').textContent, /File captured/);
  assert.equal(ui.el('repetition-filename').textContent, JSON.stringify(' <img>.json '));
  assert.equal(ui.el('repetition-bytes').textContent, String(bytes.length));
  assert.equal(ui.el('repetition-source-hash').textContent, digest(bytes));
  assert.equal(ui.el('repetition-report-json').textContent, '');
  ui.dispose();
});

test('UI: complete manual report, source-numbered records and real Blob download are exact', async () => {
  const ui = surface();
  await reviewFixture(ui);
  assert.deepEqual(JSON.parse(ui.el('repetition-report-json').textContent), expectedReport);
  assert.equal(ui.el('repetition-title').textContent, fixture.title);
  assert.deepEqual(JSON.parse(ui.el('repetition-metadata').textContent), expectedReport.course);
  assert.deepEqual(['repetition-total', 'repetition-prompt-count', 'repetition-member-count', 'repetition-choice-count', 'repetition-answer-count'].map(id => ui.el(id).textContent), ['5', '1', '4', '1', '1']);
  const all = descendants(ui.el('repetition-groups'));
  const records = all.filter(node => node.className === 'question-record');
  assert.equal(records.length, 4);
  assert.deepEqual(records.map(node => node.children[0].textContent), [
    'Source question 1 · ID "first"', 'Source question 3 · ID "__proto__"',
    'Source question 4 · ID "disagrees"', 'Source question 5 · ID "singleton"'
  ]);
  assert.deepEqual(records.map(node => JSON.parse(node.children[2].textContent)),
    [0, 2, 3, 4].map(index => ({ sourceQuestion: index + 1, index, item: fixture.items[index] })));
  assert.deepEqual(records.map(node => node.children[1].textContent), [
    'Authored choice 1 of 2 · selected text "Alpha"', 'Authored choice 2 of 2 · selected text "Alpha"',
    'Authored choice 1 of 2 · selected text "Beta"', 'Authored choice 2 of 2 · selected text "Gamma"'
  ]);
  assert.ok(all.filter(node => node.className === 'literal record-answer').length === 4);
  assert.match(ui.el('repetition-outcome').textContent, /not automatic corrections/);
  await ui.el('download-repetition').click();
  assert.equal(ui.downloads.length, 1);
  const download = ui.downloads[0];
  assert.equal(download.filename, 'course-repetition-review.json');
  assert.equal(download.blob.type, 'application/json;charset=utf-8');
  const expected = { format: 'recallweave-course-repetition-browser/1',
    source: { filename: 'literal course.json', bytes: bytes.length, sha256: digest(bytes) }, report: expectedReport };
  assert.equal(await download.blob.text(), JSON.stringify(expected, null, 2) + '\n');
  assert.match(ui.el('repetition-status').textContent, /download requested/);
  assert.doesNotMatch(ui.el('repetition-status').textContent, /saved successfully/i);
  ui.dispose();
  assert.deepEqual(ui.revoked, [download.url]);
  ui.timers.forEach(fn => fn());
  assert.equal(ui.revoked.length, 1);
});

test('UI: zero findings are a successful review with explicit quality limitations', async () => {
  const data = new TextEncoder().encode(JSON.stringify({ ...fixture, concepts: ['base'], items: [fixture.items[0]] }));
  const ui = surface();
  await reviewFixture(ui, data);
  assert.equal(ui.el('repetition-prompt-count').textContent, '0');
  assert.equal(ui.el('repetition-groups').children.length, 0);
  assert.match(ui.el('repetition-outcome').textContent, /does not establish semantic uniqueness, factual accuracy or teaching quality/);
  await ui.el('download-repetition').click();
  const result = JSON.parse(await ui.downloads[0].blob.text());
  assert.deepEqual(result.report.prompts, []);
  assert.deepEqual(result.report.summary, { questionCount: 1, repeatedPromptGroups: 0, repeatedQuestionCount: 0, equivalentChoiceGroups: 0, answerDisagreementGroups: 0 });
  ui.dispose();
});

test('UI: escaped surrogate and literal replacement character remain distinct admitted prompts', async () => {
  const items = [q('s1', ['A', 'B'], 0, { prompt: '\ud800' }), q('s2', ['B', 'A'], 1, { prompt: '\ud800' }),
    q('r1', ['A', 'B'], 0, { prompt: '\ufffd' }), q('r2', ['B', 'A'], 1, { prompt: '\ufffd' })];
  const data = new TextEncoder().encode(JSON.stringify({ ...fixture, concepts: ['base'], items }));
  const ui = surface();
  await reviewFixture(ui, data);
  const report = JSON.parse(ui.el('repetition-report-json').textContent);
  assert.deepEqual(report.prompts.map(group => group.prompt), ['\ud800', '\ufffd']);
  assert.equal(report.summary.answerDisagreementGroups, 0);
  const records = descendants(ui.el('repetition-groups')).filter(node => node.className === 'question-record');
  assert.match(records[0].children[2].textContent, /\\ud800/);
  assert.ok(records[2].children[2].textContent.includes('\ufffd'));
  await ui.el('download-repetition').click();
  assert.deepEqual(JSON.parse(await ui.downloads[0].blob.text()).report, report);
  ui.dispose();
});

test('UI: chooser, cancellation, clear and same-file reuse retire old state and URLs', async () => {
  const ui = surface();
  await reviewFixture(ui);
  await ui.el('download-repetition').click();
  const url = ui.downloads[0].url;
  ui.el('repetition-file').value = 'previous';
  await ui.el('choose-repetition-file').click();
  retired(ui);
  assert.equal(ui.el('repetition-file').value, '');
  assert.deepEqual(ui.revoked, [url]);
  assert.equal(ui.el('repetition-file').clickCount, 1);
  await ui.el('repetition-file').fire('cancel');
  retired(ui);
  await reviewFixture(ui);
  await ui.el('clear-repetition').click();
  retired(ui);
  assert.equal(ui.el('choose-repetition-file').focused, true);
  await reviewFixture(ui);
  ui.dispose();
});

test('UI: invalid replacement retires a ready result; JSON/schema/BOM refusal occurs at Review', async t => {
  const invalid = [
    ['malformed JSON', new TextEncoder().encode('{')],
    ['unknown format', new TextEncoder().encode(JSON.stringify({ ...fixture, format: 'different' }))],
    ['duplicate ID', new TextEncoder().encode(JSON.stringify({ ...fixture, items: [fixture.items[0], fixture.items[0]] }))],
    ['leading BOM', new Uint8Array([0xef, 0xbb, 0xbf, ...bytes])]
  ];
  for (const [name, data] of invalid) await t.test(name, async () => {
    const ui = surface();
    await reviewFixture(ui);
    await ui.choose(file(data));
    loaded(ui);
    assert.equal(ui.el('repetition-report-json').textContent, '');
    await ui.el('review-repetition').click();
    retired(ui);
    assert.notEqual(ui.el('repetition-status').textContent, '');
    assert.equal(ui.el('repetition-file').value, '');
    await ui.el('download-repetition').click();
    assert.equal(ui.downloads.length, 0);
    ui.dispose();
  });
});

test('UI: malformed UTF-8 is refused without replacement; oversized metadata refuses before read', async () => {
  const ui = surface();
  await reviewFixture(ui);
  await ui.choose(file(new Uint8Array([0xc3, 0x28])));
  retired(ui);
  assert.match(ui.el('repetition-status').textContent, /valid UTF-8/);
  let read = false;
  await ui.choose(file(bytes, 'huge.json', { size: 262145, arrayBuffer: async () => { read = true; return bytes.buffer; } }));
  retired(ui);
  assert.equal(read, false);
  assert.match(ui.el('repetition-status').textContent, /256 KiB/);
  ui.dispose();
});

test('UI: captured byte boundary admits exactly the cap and refuses post-read growth', async () => {
  const padded = new TextEncoder().encode(source + ' '.repeat(262144 - bytes.length));
  assert.equal(padded.length, 262144);
  const ui = surface();
  await reviewFixture(ui, padded);
  assert.equal(ui.el('repetition-bytes').textContent, '262144');
  await ui.el('download-repetition').click();
  assert.equal(JSON.parse(await ui.downloads[0].blob.text()).source.sha256, digest(padded));
  await ui.choose(file(new Uint8Array(262145).fill(32), 'grown.json', { size: 10 }));
  retired(ui);
  assert.match(ui.el('repetition-status').textContent, /256 KiB/);
  ui.dispose();
});

test('UI: cancelled change, multiple files, invalid size and read rejection leave no report', async () => {
  const ui = surface();
  await reviewFixture(ui);
  await ui.choose(null);
  retired(ui);
  ui.el('repetition-file').files = [file(), file()];
  await ui.el('repetition-file').fire('change');
  retired(ui);
  assert.match(ui.el('repetition-status').textContent, /one course/);
  await ui.choose(file(bytes, 'bad.json', { size: NaN }));
  retired(ui);
  await ui.choose(file(bytes, 'bad.json', { arrayBuffer: async () => { throw new Error('Read unavailable'); } }));
  retired(ui);
  assert.equal(ui.el('repetition-status').textContent, 'Read unavailable');
  ui.dispose();
});

for (const outcome of ['resolve', 'reject']) test('UI: stale read ' + outcome + ' cannot replace a newer review', async () => {
  const pending = deferred();
  const ui = surface();
  const old = ui.choose(file(bytes, 'old.json', { arrayBuffer: () => pending.promise }));
  retired(ui);
  const next = new TextEncoder().encode(JSON.stringify({ ...fixture, title: 'Current title' }));
  await reviewFixture(ui, next);
  const accepted = ui.el('repetition-report-json').textContent;
  if (outcome === 'resolve') pending.resolve(bytes.buffer); else pending.reject(new Error('Old read failed'));
  await old;
  ready(ui);
  assert.equal(ui.el('repetition-title').textContent, 'Current title');
  assert.equal(ui.el('repetition-report-json').textContent, accepted);
  ui.dispose();
});

for (const outcome of ['resolve', 'reject']) test('UI: stale digest ' + outcome + ' cannot replace a newer review', async () => {
  const pending = deferred();
  let calls = 0;
  const ui = surface({ hash: input => ++calls === 1 ? pending.promise : Promise.resolve(digest(input)) });
  const old = ui.choose(file());
  await tick();
  retired(ui);
  const next = new TextEncoder().encode(JSON.stringify({ ...fixture, title: 'New digest' }));
  await reviewFixture(ui, next);
  if (outcome === 'resolve') pending.resolve(digest(bytes)); else pending.reject(new Error('Old digest failed'));
  await old;
  ready(ui);
  assert.equal(ui.el('repetition-title').textContent, 'New digest');
  assert.equal(ui.el('repetition-source-hash').textContent, digest(next));
  ui.dispose();
});

for (const phase of ['read', 'digest']) test('UI: clear during pending ' + phase + ' prevents later restoration', async () => {
  const pending = deferred();
  const ui = surface(phase === 'digest' ? { hash: () => pending.promise } : {});
  const run = ui.choose(file(bytes, 'pending.json', phase === 'read' ? { arrayBuffer: () => pending.promise } : {}));
  await tick();
  await ui.el('clear-repetition').click();
  const status = ui.el('repetition-status').textContent;
  if (phase === 'read') pending.resolve(bytes.buffer); else pending.resolve(digest(bytes));
  await run;
  retired(ui);
  assert.equal(ui.el('repetition-status').textContent, status);
  ui.dispose();
});

test('UI: current digest rejection and malformed digest never enable Review', async () => {
  for (const hash of [async () => { throw new Error('Hash unavailable'); }, async () => 'invalid']) {
    const ui = surface({ hash });
    await ui.choose(file());
    retired(ui);
    assert.match(ui.el('repetition-status').textContent, /Hash unavailable|SHA-256/);
    ui.dispose();
  }
});

test('UI: download preparation and picker failure retire every actionable result', async () => {
  const ui = surface({ createObjectURL() { throw new Error('No URL'); } });
  await reviewFixture(ui);
  await ui.el('download-repetition').click();
  retired(ui);
  assert.match(ui.el('repetition-status').textContent, /download could not be prepared/);
  ui.el('repetition-file').click = () => { throw new Error('No picker'); };
  await ui.el('choose-repetition-file').click();
  retired(ui);
  assert.match(ui.el('repetition-status').textContent, /chooser could not be opened/);
  ui.dispose();
});

test('UI: disposal invalidates a pending read and removes event handlers', async () => {
  const pending = deferred();
  const ui = surface();
  const run = ui.choose(file(bytes, 'old.json', { arrayBuffer: () => pending.promise }));
  ui.dispose();
  pending.resolve(bytes.buffer);
  await run;
  retired(ui);
  await ui.choose(file());
  retired(ui);
  assert.equal(ui.el('repetition-status').textContent, 'Question review closed.');
});

function sourceRoot() { return fileURLToPath(new URL('../', import.meta.url)); }
function builder(args = [], cwd = sourceRoot()) {
  return spawnSync(process.env.PYTHON || 'python3', [join(cwd, 'tools/make_course_repetition.py'), ...args],
    { cwd, encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024 });
}
function builderCopy() {
  const root = sourceRoot(), copy = mkdtempSync(join(tmpdir(), 'repetition-builder-'));
  for (const path of ['src/deck.mjs', 'src/course-repetition.mjs', 'src/course-repetition-ui.mjs',
    'course-repetition/index.html', 'tools/make_course_repetition.py', 'course-repetition.html']) {
    mkdirSync(dirname(join(copy, path)), { recursive: true });
    copyFileSync(join(root, path), join(copy, path));
  }
  return copy;
}

test('Builder: checked-in standalone exactly matches sources and has one inline script', () => {
  const result = builder(['--check']);
  assert.equal(result.status, 0, result.stderr);
  const html = readFileSync(join(sourceRoot(), 'course-repetition.html'), 'utf8');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 1);
  assert.doesNotThrow(() => new Script(scripts[0][1]));
  assert.doesNotMatch(html, /<script[^>]+\bsrc=|<link[^>]+\bhref=/i);
  assert.doesNotMatch(scripts[0][1], /\b(?:fetch|XMLHttpRequest|localStorage|sessionStorage|indexedDB)\b/);
  for (const id of ids) assert.ok(html.includes('id="' + id + '"'), id);
});

test('Builder: stale artifact is refused and exact regeneration succeeds in an isolated copy', () => {
  const copy = builderCopy();
  writeFileSync(join(copy, 'course-repetition.html'), '<!doctype html>stale\n');
  const refused = builder(['--check'], copy);
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /out of date/);
  assert.equal(readFileSync(join(copy, 'course-repetition.html'), 'utf8'), '<!doctype html>stale\n');
  const generated = builder([], copy);
  assert.equal(generated.status, 0, generated.stderr);
  assert.equal(builder(['--check'], copy).status, 0);
  assert.deepEqual(readFileSync(join(copy, 'course-repetition.html')), readFileSync(join(sourceRoot(), 'course-repetition.html')));
});

test('Builder: missing template entry and unresolved import fail without replacing an artifact', () => {
  for (const fault of ['template', 'import']) {
    const copy = builderCopy(), target = join(copy, 'course-repetition.html');
    const old = readFileSync(target);
    if (fault === 'template') {
      const path = join(copy, 'course-repetition/index.html');
      writeFileSync(path, readFileSync(path, 'utf8').replace('<script type="module" src="../src/course-repetition-ui.mjs"></script>', ''));
    } else {
      const path = join(copy, 'src/course-repetition-ui.mjs');
      writeFileSync(path, readFileSync(path, 'utf8').replace("from './course-repetition.mjs'", "from './missing.mjs'"));
    }
    const refused = builder([], copy);
    assert.notEqual(refused.status, 0);
    assert.match(refused.stderr, fault === 'template' ? /exactly one module entry/ : /unresolved local module/);
    assert.deepEqual(readFileSync(target), old);
  }
});
