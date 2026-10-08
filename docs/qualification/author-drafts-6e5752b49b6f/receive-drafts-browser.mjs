import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
assert.equal(args.length % 2, 0, 'Use named --option value pairs.');
const options = Object.fromEntries(args.reduce((pairs, value, i) => i % 2 ? pairs : [...pairs, [value.replace(/^--/, ''), args[i + 1]]], []));
const root = resolve(options.root);
const output = resolve(options.output);
await mkdir(output, { recursive: true });
const { chromium } = createRequire(import.meta.url)(options.playwright);
const { parseDeck, MAX_DECK_BYTES } = await import(pathToFileURL(resolve(root, 'src/deck.mjs')));
const { DRAFT_FORMAT, MAX_DRAFT_BYTES, parseAuthorDraft, serializeAuthorDraft } = await import(pathToFileURL(resolve(root, 'src/deck-author-draft.mjs')));
const inputPath = resolve(options['deck-fixture'] || resolve(root, 'docs/qualification/deck-author-6e5752b49b6f/author-browser/authored-final.json'));
const input = await readFile(inputPath);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(sha(input), '6b6aafa39048d22be31a8d3221bce5e6ba320e3754de447a88e02b5953a7b0a9');
const sourceFiles = ['author/index.html', 'author/author.css', 'author.html', 'src/deck.mjs', 'src/deck-author.mjs',
  'src/deck-author-draft.mjs', 'src/deck-author-loader.mjs', 'src/deck-author-ui.mjs', 'tools/make_author.py'];
const sources = Object.fromEntries(await Promise.all(sourceFiles.map(async path => [path, sha(await readFile(resolve(root, path)))])));
const report = { source_root: root, source_commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  source_sha256: sources, input_deck_sha256: sha(input), cases: [], downloads: [], screenshots: [], external_requests: [], page_errors: [] };
const server = createServer(async (request, response) => {
  const path = decodeURIComponent(new URL(request.url, 'http://local').pathname);
  if (path === '/favicon.ico') { response.writeHead(204); response.end(); return; }
  const file = resolve(root, '.' + (path.endsWith('/') ? path + 'index.html' : path));
  if (!file.startsWith(root + sep)) { response.writeHead(403); response.end(); return; }
  try {
    const bytes = await readFile(file);
    response.writeHead(200, { 'Content-Type': ({ '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json' }[extname(file)] || 'application/octet-stream') + '; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(bytes);
  } catch { response.writeHead(404); response.end('Missing local receiving source'); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser, context, page;

// Compare user content and relationships independently of canonical private keys.
function semantic(draft) {
  const concepts = draft.concepts.map(concept => concept.name);
  const index = key => key === null ? null : draft.concepts.findIndex(concept => concept.key === key);
  return { title: draft.title, attribution: draft.attribution, license: draft.license, concepts,
    questions: draft.questions.map(item => ({ id: item.id, concept: index(item.conceptKey),
      prerequisites: item.prerequisiteKeys.map(index), prompt: item.prompt,
      options: item.options.map(option => option.text), answer: item.answerKey === null ? null : item.options.findIndex(option => option.key === item.answerKey),
      explanation: item.explanation, transfer: item.transfer })) };
}
function manualDraft({ cyclic = false, self = false, undo = false } = {}) {
  const concepts = [
    { key: 'concept-10', name: undo ? 'Deleted topic' : 'Observation' },
    { key: 'concept-11', name: undo ? 'Deleted prerequisite' : 'Decision' }
  ];
  if (undo) concepts.push({ key: 'concept-12', name: 'Retained idea' });
  const questions = [0, 1].map(i => ({ key: `question-${20 + i * 10}`, id: `original-item-${i + 1}`,
    conceptKey: concepts[undo && i === 1 ? 2 : i].key,
    prerequisiteKeys: undo && i === 0 ? ['concept-11', 'concept-12'] : cyclic ? [concepts[1 - i].key] : self && i === 0 ? ['concept-10'] : [],
    prompt: i ? 'Which reason supports the next step?' : 'Which observation matters?\nKeep <this> literal text.',
    options: [{ key: `option-${21 + i * 10}`, text: 'An unrelated detail' }, { key: `option-${22 + i * 10}`, text: i ? 'The stated reason' : 'The recorded observation' }],
    answerKey: `option-${22 + i * 10}`, explanation: 'Keep the written explanation “exactly”.', transfer: 'Apply the idea somewhere else.' }));
  return { nextKey: 100, title: 'Work to finish later', attribution: 'Original receiving author\nNo imported course claims.', license: 'Local original fixture', concepts, questions };
}
function payload(draft, name = 'editable.draft.json') { return { name, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ format: DRAFT_FORMAT, draft })) }; }
async function openPage(standalone = false, width = 1280) {
  await context?.close();
  context = await browser.newContext({ acceptDownloads: true, viewport: { width, height: width === 390 ? 844 : 920 } });
  await context.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith(origin + '/') || url.startsWith(pathToFileURL(root + '/').href) || url.startsWith('blob:')) return route.continue();
    report.external_requests.push(url); return route.abort();
  });
  if (standalone) await context.setOffline(true);
  page = await context.newPage();
  page.on('pageerror', error => report.page_errors.push(String(error)));
  await page.goto(standalone ? pathToFileURL(resolve(root, 'author.html')).href : origin + '/author/index.html');
  await page.locator('#save-draft').waitFor({ state: 'visible' });
}
async function button(id) { const control = page.locator(id); await control.focus(); await control.press('Enter'); }
async function fill(id, text) { const control = page.locator(id); await control.focus(); await control.fill(text); }
async function choose(file) {
  const event = page.waitForEvent('filechooser'); await button('#open-deck-button'); await (await event).setFiles(file);
}
async function openFile(file, kind) {
  await choose(file); await page.locator('#open-preview').waitFor({ state: 'visible' });
  assert.match(await page.locator('#open-preview-kind').textContent(), kind === 'draft' ? /EDITABLE DRAFT/ : /LESSON DECK/);
  await button('#replace-draft');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'deck-title');
}
async function state() {
  const originalQuestion = await page.locator('#question-picker').inputValue();
  const result = { title: await page.locator('#deck-title').inputValue(), attribution: await page.locator('#deck-attribution').inputValue(),
    license: await page.locator('#deck-license').inputValue(), concepts: await page.locator('#concept-list textarea').evaluateAll(inputs => inputs.map(input => input.value)), questions: [] };
  const count = await page.locator('#question-picker option').count();
  for (let i = 0; i < count; i++) {
    await page.locator('#question-picker').selectOption({ index: i });
    result.questions.push(await page.evaluate(() => {
      const byId = id => document.getElementById(id);
      const select = byId('question-concept'); const keys = [...select.options].slice(1).map(option => option.value);
      const options = [...document.querySelectorAll('#option-list textarea')].map(input => input.value);
      const answer = [...document.querySelectorAll('#option-list input[type=radio]')].findIndex(input => input.checked);
      return { concept: select.value === '' ? null : keys.indexOf(select.value),
        prerequisites: [...document.querySelectorAll('#question-prerequisites-list input:checked')].map(input => keys.indexOf(input.id.slice('prerequisite-'.length))),
        prompt: byId('question-prompt').value, options, answer: answer < 0 ? null : answer,
        explanation: byId('question-explanation').value, transfer: byId('question-transfer').value };
    }));
  }
  if (originalQuestion) await page.locator('#question-picker').selectOption(originalQuestion);
  return result;
}
function visibleSemantic(draft) { const result = semantic(draft); result.questions.forEach(item => delete item.id); return result; }
async function checkedState() { return { preview: await page.locator('#author-preview').isVisible(), downloadDisabled: await page.locator('#download-deck').isDisabled(),
  content: await page.locator('#preview-content').innerText(), error: await page.locator('#author-error').isVisible(), errorText: await page.locator('#author-error-message').textContent() }; }
async function download(id, name, kind) {
  const event = page.waitForEvent('download'); await button(id); const file = await event;
  assert.equal(await file.failure(), null);
  const path = resolve(output, name); await file.saveAs(path); const bytes = await readFile(path); const text = bytes.toString('utf8');
  const value = kind === 'draft' ? JSON.parse(text).draft : parseDeck(text);
  if (kind === 'draft') {
    assert.equal(JSON.parse(text).format, DRAFT_FORMAT);
    assert.match(file.suggestedFilename(), /\.draft\.json$/);
    assert.equal(serializeAuthorDraft(parseAuthorDraft(text)), text, 'actual draft download is canonical and byte stable');
  } else assert.doesNotMatch(file.suggestedFilename(), /\.draft\.json$/);
  report.downloads.push({ path: name, kind, filename: file.suggestedFilename(), bytes: bytes.length, sha256: sha(bytes) });
  return { path, bytes, value };
}
async function noOverflow() {
  const size = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  assert.ok(size.document <= size.viewport, JSON.stringify(size)); return size;
}
async function capture(name, target = '#save-draft') { await page.locator(target).scrollIntoViewIfNeeded(); await page.screenshot({ path: resolve(output, name) }); report.screenshots.push(name); }
async function run(name, operation) {
  try { const detail = await operation(); report.cases.push({ name, passed: true, detail }); console.log('PASS ' + name); }
  catch (error) { report.cases.push({ name, passed: false, error: error.stack }); throw error; }
}

try {
  browser = await chromium.launch({ executablePath: options.browser, headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-background-networking'] });
  report.browser_version = browser.version();
  await openPage();
  let unfinished;
  await run('save incomplete writing and completely empty lists, then reopen and continue editing', async () => {
    await fill('#deck-title', 'Unfinished café “notes”'); await fill('#question-prompt', 'Literal <img data-draft-receiving="x">\nNo answer chosen yet.');
    await button('#check-draft'); const before = await state(); const refusal = await checkedState();
    assert.equal(refusal.error, true); assert.equal(refusal.downloadDisabled, true);
    unfinished = await download('#save-draft', 'unfinished.draft.json', 'draft');
    assert.deepEqual(visibleSemantic(unfinished.value), before);
    assert.deepEqual(await checkedState(), refusal, 'saving leaves the original lesson error and check state intact');
    const repeat = await download('#save-draft', 'unfinished-repeat.draft.json', 'draft'); assert.deepEqual(repeat.bytes, unfinished.bytes);
    await button('#remove-question'); await page.getByRole('button', { name: 'Remove concept 1', exact: true }).click();
    const empty = await download('#save-draft', 'empty.draft.json', 'draft');
    assert.deepEqual(empty.value.questions, []); assert.deepEqual(empty.value.concepts, []);
    await page.reload(); await openFile(empty.path, 'draft');
    assert.equal(await page.locator('#question-picker').isDisabled(), true);
    await button('#add-concept'); await page.locator('#concept-list textarea').fill('A new idea'); await button('#add-question');
    await fill('#question-prompt', 'Continue after reopening empty work.');
    const continued = await download('#save-draft', 'continued-empty.draft.json', 'draft');
    assert.equal(continued.value.questions.length, 1); assert.equal(continued.value.questions[0].prompt, 'Continue after reopening empty work.');
    return { unfinishedSha256: sha(unfinished.bytes), emptySha256: sha(empty.bytes), errorPreserved: true };
  });

  await run('saving and download failure preserve a checked lesson and its pending incoming draft', async () => {
    await openFile(inputPath, 'deck'); await button('#check-draft');
    const checked = await checkedState(); const before = await state();
    const lesson = await download('#download-deck', 'existing-checked-deck.json', 'deck'); assert.deepEqual(lesson.bytes, input);
    await choose(unfinished.path); await page.locator('#open-preview').waitFor({ state: 'visible' });
    const pending = await page.locator('#open-preview').innerText();
    const saved = await download('#save-draft', 'checked-state.draft.json', 'draft');
    assert.deepEqual(visibleSemantic(saved.value), before);
    assert.deepEqual(await checkedState(), checked); assert.equal(await page.locator('#open-preview').innerText(), pending);
    await button('#cancel-open'); assert.equal(await page.evaluate(() => document.activeElement.id), 'open-deck-button');
    assert.deepEqual(await checkedState(), checked);
    await page.evaluate(() => { window.originalDraftURL = URL.createObjectURL; URL.createObjectURL = () => { throw new Error('Simulated unavailable download'); }; });
    await button('#save-draft'); assert.match(await page.locator('#draft-save-status').textContent(), /could not be prepared/);
    assert.deepEqual(await checkedState(), checked); assert.deepEqual(await state(), before);
    await page.evaluate(() => { URL.createObjectURL = window.originalDraftURL; });
    const retried = await download('#save-draft', 'checked-state-retry.draft.json', 'draft'); assert.deepEqual(retried.bytes, saved.bytes);
    const unchangedLesson = await download('#download-deck', 'checked-deck-after-retry.json', 'deck'); assert.deepEqual(unchangedLesson.bytes, input);
    return { checkedDeckUnchanged: true, stagedFileUnchangedBySave: true, actualRetrySha256: sha(retried.bytes) };
  });

  await run('malformed, unsupported and oversized draft files preserve checked work; newest format wins', async () => {
    const checked = await checkedState(); const before = await state();
    const bad = JSON.parse(unfinished.bytes); bad.draft.questions[0].answerKey = 'option-9999';
    const future = JSON.parse(unfinished.bytes); future.format = 'recallweave-author-draft/2';
    await page.evaluate(() => { window.realDraftFileText = File.prototype.text; window.draftFileReads = [];
      File.prototype.text = function () { window.draftFileReads.push(this.name); return window.realDraftFileText.call(this); }; });
    for (const selected of [
      { name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{') },
      { name: 'bad-reference.draft.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(bad)) },
      { name: 'future.draft.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(future)) },
      { name: 'too-large.draft.json', mimeType: 'application/json', buffer: Buffer.alloc(MAX_DRAFT_BYTES + 1, 120) }
    ]) {
      await choose(selected); await page.waitForFunction(() => document.getElementById('author-status').textContent.includes('unchanged') && !document.getElementById('author-status').textContent.startsWith('Reading'));
      assert.equal(await page.locator('#open-preview').isHidden(), true); assert.equal(await page.locator('#replace-draft').isDisabled(), true);
      assert.deepEqual(await checkedState(), checked); assert.deepEqual(await state(), before);
    }
    assert.equal(await page.evaluate(() => window.draftFileReads.includes('too-large.draft.json')), false, 'size refusal precedes File.text');
    await page.evaluate(() => { File.prototype.text = window.realDraftFileText; });
    for (const [first, latest, kind] of [[unfinished.bytes, input, 'deck'], [input, unfinished.bytes, 'draft']]) {
      await page.evaluate(() => { window.realDraftFileText = File.prototype.text; File.prototype.text = function () {
        if (this.name === 'slow-file.json') { const file = this; return new Promise(resolve => { window.finishOldDraftRead = async () => resolve(await window.realDraftFileText.call(file)); }); }
        return window.realDraftFileText.call(this);
      }; });
      await choose({ name: 'slow-file.json', mimeType: 'application/json', buffer: first });
      await page.waitForFunction(() => typeof window.finishOldDraftRead === 'function');
      await choose({ name: 'newer-file.json', mimeType: 'application/json', buffer: latest }); await page.locator('#open-preview').waitFor({ state: 'visible' });
      const pending = await page.locator('#open-preview').innerText();
      await page.evaluate(() => window.finishOldDraftRead());
      assert.equal(await page.locator('#open-preview').innerText(), pending);
      assert.match(await page.locator('#open-preview-kind').textContent(), kind === 'draft' ? /EDITABLE DRAFT/ : /LESSON DECK/);
      assert.deepEqual(await checkedState(), checked); await button('#cancel-open');
      await page.evaluate(() => { File.prototype.text = window.realDraftFileText; delete window.finishOldDraftRead; });
    }
    await choose(unfinished.path); await page.locator('#open-preview').waitFor({ state: 'visible' });
    await page.locator('#open-deck').dispatchEvent('cancel'); assert.equal(await page.locator('#open-preview').isHidden(), true);
    assert.deepEqual(await checkedState(), checked);
    return { oversizedBytes: MAX_DRAFT_BYTES + 1, oversizedReads: 0, staleDraftAndDeckReadsIgnored: true };
  });

  await run('cyclic and self-linked unfinished lessons reopen intact and can be repaired through controls', async () => {
    const cyclic = manualDraft({ cyclic: true }); await openFile(payload(cyclic), 'draft');
    assert.deepEqual(await state(), visibleSemantic(cyclic)); await button('#check-draft');
    assert.match(await page.locator('#author-error-message').textContent(), /loop/);
    const saved = await download('#save-draft', 'cyclic.draft.json', 'draft'); assert.deepEqual(semantic(saved.value), semantic(cyclic));
    await page.reload(); await openFile(saved.path, 'draft'); assert.deepEqual(await state(), visibleSemantic(cyclic));
    await page.locator('#question-picker').selectOption({ index: 1 }); await page.locator('#question-prerequisites-list input').uncheck();
    await button('#check-draft'); assert.equal(await page.locator('#download-deck').isEnabled(), true);
    const repaired = await download('#download-deck', 'repaired-cycle-deck.json', 'deck');
    assert.deepEqual(repaired.value.items.map(item => item.id), ['original-item-1', 'original-item-2']);
    assert.deepEqual(repaired.value.items.map(item => item.options[item.answer]), ['The recorded observation', 'The stated reason']);
    const self = manualDraft({ self: true }); await openFile(payload(self, 'self-linked.draft.json'), 'draft');
    await button('#check-draft'); assert.equal(await page.locator('#author-error').isVisible(), true); await button('#go-to-error');
    const selfInput = page.getByLabel('Observation (same concept; remove this prerequisite)', { exact: true });
    assert.equal(await selfInput.isChecked(), true); await selfInput.focus(); await selfInput.press('Space');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'question-concept');
    assert.match(await page.locator('#author-status').textContent(), /Self prerequisite removed/);
    await button('#check-draft'); assert.equal(await page.locator('#download-deck').isEnabled(), true);
    return { cyclicDraftSha256: sha(saved.bytes), canonicalAnswersPreserved: true, selfLinkVisibleAndRepairable: true };
  });

  await run('a UTF-8 lesson over 256 KiB can be saved as a draft and shortened after reopening', async () => {
    const large = { nextKey: 10000, title: 'A longer lesson to shorten', attribution: 'Original size-boundary fixture', license: 'Local receiving',
      concepts: [{ key: 'concept-1', name: 'Repeated idea' }], questions: [] };
    for (let i = 0; i < 33; i++) {
      const start = 100 + i * 10;
      large.questions.push({ key: `question-${start}`, id: `detail-${i}`, conceptKey: 'concept-1', prerequisiteKeys: [],
        prompt: `Question ${i}: ` + 'p'.repeat(970), options: [{ key: `option-${start + 1}`, text: 'Left ' + 'é'.repeat(490) }, { key: `option-${start + 2}`, text: 'Right ' + 'é'.repeat(490) }],
        answerKey: `option-${start + 2}`, explanation: 'Because ' + 'é'.repeat(1980), transfer: 'Apply ' + 't'.repeat(970) });
    }
    const raw = payload(large, 'long-editable.draft.json'); assert.ok(raw.buffer.length > MAX_DECK_BYTES && raw.buffer.length < MAX_DRAFT_BYTES);
    await openFile(raw, 'draft'); await button('#check-draft');
    assert.match(await page.locator('#author-error-message').textContent(), /256 KiB/);
    const saved = await download('#save-draft', 'large-editable.draft.json', 'draft'); assert.deepEqual(semantic(saved.value), semantic(large));
    assert.ok(saved.bytes.length > MAX_DECK_BYTES && saved.bytes.length <= MAX_DRAFT_BYTES);
    await page.reload(); await openFile(saved.path, 'draft'); assert.equal(await page.locator('#question-picker option').count(), 33);
    for (let count = 33; count > 1; count--) { await page.locator('#question-picker').selectOption({ index: count - 1 }); await button('#remove-question'); }
    await button('#check-draft'); assert.equal(await page.locator('#download-deck').isEnabled(), true);
    const repaired = await download('#download-deck', 'shortened-checked-deck.json', 'deck');
    assert.equal(repaired.value.items.length, 1); assert.equal(repaired.value.items[0].id, 'detail-0');
    return { editableBytes: saved.bytes.length, checkedFileRefusedAt256KiB: true, repairedBytes: repaired.bytes.length };
  });

  await run('undo after deliberate concept deletion retains writing and creates an admissible repairable draft', async () => {
    const original = manualDraft({ undo: true }); await openFile(payload(original, 'undo.draft.json'), 'draft');
    await button('#remove-question');
    await page.getByRole('button', { name: 'Remove concept 1', exact: true }).click();
    await page.getByRole('button', { name: 'Remove concept 1', exact: true }).click();
    await button('#undo-question');
    assert.match(await page.locator('#author-status').textContent(), /deleted concept was cleared/);
    assert.match(await page.locator('#author-status').textContent(), /Deleted prerequisite links were removed/);
    assert.equal(await page.locator('#question-concept').inputValue(), '');
    assert.equal(await page.locator('#concept-list textarea').count(), 1);
    const saved = await download('#save-draft', 'undo-repaired-references.draft.json', 'draft');
    const actual = semantic(saved.value); const before = semantic(original);
    assert.deepEqual(actual.questions.map(item => ({ ...item, concept: null, prerequisites: [] })), before.questions.map(item => ({ ...item, concept: null, prerequisites: [] })));
    assert.equal(actual.questions[0].concept, null); assert.deepEqual(actual.questions[0].prerequisites, [0]);
    await page.reload(); await openFile(saved.path, 'draft');
    await page.locator('#question-concept').selectOption({ label: 'Retained idea' });
    await button('#check-draft'); assert.equal(await page.locator('#download-deck').isEnabled(), true);
    const lesson = await download('#download-deck', 'undo-then-repaired-deck.json', 'deck');
    assert.deepEqual(lesson.value.concepts, ['Retained idea']); assert.equal(lesson.value.items[0].prompt, original.questions[0].prompt);
    return { savedDraftSha256: sha(saved.bytes), deletedConceptsRemainAbsent: true, allQuestionContentPreserved: true };
  });

  await run('offline standalone at 390 px saves, reopens and finishes a draft with keyboard actions', async () => {
    await openPage(true, 390);
    await fill('#deck-title', 'X'.repeat(160)); await fill('#question-prompt', 'Local <b data-draft-receiving="x">literal</b>\n“Remember this”.');
    await button('#add-option'); await page.getByRole('button', { name: 'Remove option 3', exact: true }).focus(); await page.keyboard.press('Enter');
    assert.match(await page.evaluate(() => document.activeElement.id), /^option-/);
    await button('#check-draft'); const saved = await download('#save-draft', 'phone-unfinished.draft.json', 'draft');
    await page.reload();
    await choose({ name: 'F'.repeat(230) + '.draft.json', mimeType: 'application/json', buffer: saved.bytes });
    await page.locator('#open-preview').waitFor({ state: 'visible' }); await noOverflow(); await capture('phone-incoming-draft.png', '#open-preview-title');
    await button('#replace-draft'); assert.deepEqual(await state(), visibleSemantic(saved.value));
    await fill('#deck-attribution', 'Original phone writing\nCafé <text>'); await fill('#deck-license', 'Local author permission');
    await page.locator('#concept-list textarea').fill('An idea'); await page.locator('#option-list textarea').nth(0).fill('One choice'); await page.locator('#option-list textarea').nth(1).fill('The intended choice');
    const answer = page.locator('#option-list input[type=radio]').nth(1); await answer.focus(); await answer.press('Space');
    await fill('#question-explanation', 'This is the stated explanation.'); await fill('#question-transfer', 'Apply the idea here.');
    await button('#check-draft'); assert.equal(await page.locator('#download-deck').isEnabled(), true);
    const lesson = await download('#download-deck', 'phone-completed-deck.json', 'deck');
    assert.equal(lesson.value.items[0].answer, 1); assert.equal(lesson.value.items[0].prompt, saved.value.questions[0].prompt);
    assert.equal(await page.locator('[data-draft-receiving]').count(), 0);
    const size = await noOverflow(); await capture('phone-completed-draft.png', '#save-draft');
    return { offline: true, viewport: size, unfinishedSha256: sha(saved.bytes), lessonSha256: sha(lesson.bytes), literalTextPreserved: true };
  });
  assert.deepEqual(report.page_errors, []); assert.deepEqual(report.external_requests, []);
  for (const [name, expected] of Object.entries(sources)) assert.equal(sha(await readFile(resolve(root, name))), expected, name);
  report.passed = true;
} catch (error) {
  report.passed = false; report.failure = error.stack;
  if (page) { try { report.last_page = await page.locator('body').innerText(); await page.screenshot({ path: resolve(output, 'failure.png') }); } catch {} }
  process.exitCode = 1; console.error(error.stack);
} finally {
  await browser?.close(); await new Promise(done => server.close(done));
  await writeFile(resolve(output, 'receiving.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ passed: report.passed, cases: report.cases.length, downloads: report.downloads.length, output }));
}
