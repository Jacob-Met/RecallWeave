import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { gzipSync, gunzipSync } from 'node:zlib';

const args = process.argv.slice(2);
assert.equal(args.length % 2, 0);
const options = Object.fromEntries(args.reduce((pairs, value, index) => index % 2 ? pairs : [...pairs, [value.replace(/^--/, ''), args[index + 1]]], []));
const root = resolve(options.root), output = resolve(options.output);
await mkdir(output, { recursive: true });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const { chromium } = createRequire(import.meta.url)(options.playwright);
const core = await import(pathToFileURL(resolve(root, 'src/deck-author.mjs')));
const format = await import(pathToFileURL(resolve(root, 'src/deck-author-draft.mjs')));
const { parseDeck } = await import(pathToFileURL(resolve(root, 'src/deck.mjs')));
const generator = resolve(options.generator);
assert.equal(hash(await readFile(generator)), '4773e6fddd07d3867746939248dfc34905153e12b50763157c4851e5dff19d62');
const { makeBoundaryDraft } = await import(pathToFileURL(generator));
const inputPath = resolve(options['deck-fixture']);
const input = await readFile(inputPath);
assert.equal(hash(input), '6b6aafa39048d22be31a8d3221bce5e6ba320e3754de447a88e02b5953a7b0a9');
const sourceFiles = ['author/index.html', 'author/author.css', 'author.html', 'src/deck.mjs', 'src/deck-author.mjs',
  'src/deck-author-draft.mjs', 'src/deck-author-loader.mjs', 'src/deck-author-ui.mjs', 'tools/make_author.py'];
const sources = Object.fromEntries(await Promise.all(sourceFiles.map(async path => [path, hash(await readFile(resolve(root, path)))])));
const report = { source_commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), source_sha256: sources,
  receiver_sha256: hash(await readFile(new URL(import.meta.url))), generator_sha256: hash(await readFile(generator)),
  cases: [], downloads: [], external_requests: [], page_errors: [] };
const server = createServer(async (request, response) => {
  const path = decodeURIComponent(new URL(request.url, 'http://local').pathname);
  if (path === '/favicon.ico') { response.writeHead(204); response.end(); return; }
  const file = resolve(root, '.' + (path.endsWith('/') ? path + 'index.html' : path));
  if (!file.startsWith(root + sep)) { response.writeHead(403); response.end(); return; }
  try { const bytes = await readFile(file); response.writeHead(200, { 'Content-Type': ({ '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css' }[extname(file)] || 'application/octet-stream') + '; charset=utf-8' }); response.end(bytes); }
  catch { response.writeHead(404); response.end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = 'http://127.0.0.1:' + server.address().port;
let browser, context, page;
const retained = new Map();

function keyExpansionSource() {
  const draft = { nextKey: 601, title: '', attribution: '', license: '', concepts: [{ key: 'concept-1', name: '' }], questions: [] };
  const fields = [];
  for (let index = 0; index < 100; index++) {
    const options = Array.from({ length: 6 }, (_, option) => ({ key: 'option-' + (index * 6 + option + 1), text: '' }));
    const question = { key: 'question-' + (index + 1), id: 'item-' + (index + 1), conceptKey: 'concept-1', prerequisiteKeys: [],
      prompt: '', options, answerKey: options[0].key, explanation: '', transfer: '' };
    draft.questions.push(question);
    fields.push([question, 'prompt', 2000], [question, 'explanation', 4000], [question, 'transfer', 2000], ...options.map(option => [option, 'text', 1000]));
  }
  const compact = () => JSON.stringify({ format: format.DRAFT_FORMAT, draft });
  let remaining = format.MAX_DRAFT_BYTES - Buffer.byteLength(compact());
  for (const [object, name, limit] of fields) {
    const count = Math.min(limit, Math.floor(remaining / 2));
    object[name] = 'é'.repeat(count); remaining -= 2 * count;
    if (remaining === 1 && count < limit) { object[name] += 'a'; remaining--; }
  }
  assert.equal(remaining, 0);
  const source = Buffer.from(compact());
  assert.equal(hash(source), '40ef9de652337ceae17435b77971c744ae7ffdc122881440d747cc1330ce7f4d');
  return source;
}
function payload(source, name = 'near-limit.draft.json') { return { name, mimeType: 'application/json', buffer: Buffer.isBuffer(source) ? source : Buffer.from(source) }; }
async function button(id) { const control = page.locator(id); await control.focus(); await control.press('Enter'); }
async function choose(file) { const event = page.waitForEvent('filechooser'); await button('#open-deck-button'); await (await event).setFiles(file); }
async function replace(file, kind = 'draft') {
  await choose(file); await page.locator('#open-preview').waitFor({ state: 'visible' });
  assert.match(await page.locator('#open-preview-kind').textContent(), kind === 'draft' ? /EDITABLE DRAFT/ : /LESSON DECK/);
  await button('#replace-draft'); assert.equal(await page.evaluate(() => document.activeElement.id), 'deck-title');
}
async function open(standalone = false) {
  await context?.close();
  context = await browser.newContext({ acceptDownloads: true, viewport: { width: standalone ? 390 : 1280, height: standalone ? 844 : 920 } });
  await context.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith(origin + '/') || url.startsWith(pathToFileURL(root + '/').href) || url.startsWith('blob:')) return route.continue();
    report.external_requests.push(url); return route.abort();
  });
  if (standalone) await context.setOffline(true);
  page = await context.newPage(); page.on('pageerror', error => report.page_errors.push(String(error)));
  await page.goto(standalone ? pathToFileURL(resolve(root, 'author.html')).href : origin + '/author/');
  await page.locator('#save-draft').waitFor({ state: 'visible' });
}
async function download(id, name, expected = null, keep = true) {
  const event = page.waitForEvent('download'); await button(id); const actual = await event;
  assert.equal(await actual.failure(), null);
  const chunks = []; const stream = await actual.createReadStream(); for await (const part of stream) chunks.push(part);
  const bytes = Buffer.concat(chunks); if (expected) assert.deepEqual(bytes, Buffer.isBuffer(expected) ? expected : Buffer.from(expected));
  const record = { name, filename: actual.suggestedFilename(), bytes: bytes.length, sha256: hash(bytes) };
  if (keep) { await actual.saveAs(resolve(output, name)); retained.set(name, record); record.retained_file = name; }
  report.downloads.push(record); return { bytes, path: resolve(output, name), record };
}
async function checked() { return { enabled: await page.locator('#download-deck').isEnabled(), preview: await page.locator('#preview-content').innerText(), title: await page.locator('#deck-title').inputValue() }; }
async function run(name, work) {
  try { report.cases.push({ name, passed: true, detail: await work() }); console.log('PASS ' + name); }
  catch (error) { report.cases.push({ name, passed: false, error: error.stack }); throw error; }
}
const expanded = keyExpansionSource();
const boundary = makeBoundaryDraft(core, format, 0);
const near = makeBoundaryDraft(core, format, 128);

try {
  browser = await chromium.launch({ executablePath: options.browser, headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-background-networking'] });
  report.browser_version = browser.version();
  await open();
  await run('canonical expansion is refused before replacing an existing checked lesson', async () => {
    await replace(inputPath, 'deck'); await button('#check-draft'); const before = await checked();
    assert.equal(before.enabled, true);
    await choose(payload(expanded, 'canonical-expansion.draft.json'));
    await page.waitForFunction(() => document.getElementById('author-status').textContent.includes('unchanged') && !document.getElementById('author-status').textContent.startsWith('Reading'));
    assert.equal(await page.locator('#open-preview').isHidden(), true); assert.equal(await page.locator('#replace-draft').isDisabled(), true);
    assert.match(await page.locator('#author-status').textContent(), /2 MiB/);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'open-deck-button');
    assert.deepEqual(await checked(), before);
    await download('#download-deck', 'checked-after-boundary-refusal.json', input);
    return { refused_input_bytes: expanded.length, source_sha256: hash(expanded), checked_deck_byte_identical: true };
  });
  let exactDownload;
  await run('exact-cap compact draft really downloads, reopens, resaves and repairs to a checked lesson', async () => {
    await replace(payload(boundary.source));
    assert.equal(await page.locator('#question-picker option').count(), 100);
    await button('#check-draft'); assert.equal(await page.locator('#author-error').isVisible(), true);
    exactDownload = await download('#save-draft', 'exact-cap.draft.json', boundary.source);
    assert.equal(exactDownload.bytes.length, format.MAX_DRAFT_BYTES);
    assert.match(await page.locator('#draft-save-status').textContent(), /Draft download started/);
    await page.reload(); await replace(exactDownload.path);
    await download('#save-draft', 'exact-cap-repeat.draft.json', exactDownload.bytes, false);
    for (let count = 100; count > 1; count--) { await page.locator('#question-picker').selectOption({ index: count - 1 }); await button('#remove-question'); }
    while (await page.locator('#option-list textarea').count() > 2) {
      const count = await page.locator('#option-list textarea').count(); await page.getByRole('button', { name: 'Remove option ' + count, exact: true }).click();
    }
    await page.locator('#question-prompt').fill('Which step follows the local observation?');
    await page.locator('#option-list textarea').nth(0).fill('An unrelated step');
    await page.locator('#option-list textarea').nth(1).fill('The observed next step');
    await page.locator('#option-list input[type=radio]').nth(1).check();
    await page.locator('#question-explanation').fill('The observation supports this next step.');
    await page.locator('#question-transfer').fill('Apply the same connection to another example.');
    await button('#check-draft'); assert.equal(await page.locator('#download-deck').isEnabled(), true);
    const repaired = await download('#download-deck', 'repaired-cap-lesson.json'); const lesson = parseDeck(repaired.bytes.toString('utf8'));
    assert.equal(lesson.items.length, 1); assert.equal(lesson.items[0].id, boundary.draft.questions[0].id); assert.equal(lesson.items[0].answer, 1);
    return { exact_draft_bytes: exactDownload.bytes.length, repeated_bytes_identical: true, repaired_lesson_bytes: repaired.bytes.length, public_id: lesson.items[0].id };
  });
  await run('offline 390 px standalone uses the corrected compact and refusal paths', async () => {
    await open(true); await replace(payload(near.source, 'near-cap.draft.json'));
    const saved = await download('#save-draft', 'phone-near-cap.draft.json', near.source);
    await page.reload(); await replace(saved.path);
    const title = await page.locator('#deck-title').inputValue();
    await choose(payload(expanded, 'refused-expansion.draft.json'));
    await page.waitForFunction(() => document.getElementById('author-status').textContent.includes('unchanged') && !document.getElementById('author-status').textContent.startsWith('Reading'));
    assert.equal(await page.locator('#open-preview').isHidden(), true); assert.equal(await page.locator('#deck-title').inputValue(), title);
    assert.equal(await page.locator('#question-picker option').count(), 100);
    await download('#save-draft', 'phone-near-cap-repeat.draft.json', saved.bytes, false);
    const size = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    assert.ok(size.document <= size.viewport);
    await page.locator('#save-draft').scrollIntoViewIfNeeded(); await page.screenshot({ path: resolve(output, 'phone-compact-draft.png') });
    return { offline: true, draft_bytes: saved.bytes.length, refusal_preserved_all_file_bytes: true, viewport: size };
  });
  assert.deepEqual(report.external_requests, []); assert.deepEqual(report.page_errors, []);
  for (const [file, expected] of Object.entries(sources)) assert.equal(hash(await readFile(resolve(root, file))), expected);
  report.passed = true;
} catch (error) {
  report.passed = false; report.failure = error.stack; process.exitCode = 1; console.error(error.stack);
  if (page) { try { report.last_page = await page.locator('body').innerText(); await page.screenshot({ path: resolve(output, 'failure.png') }); } catch {} }
} finally {
  await browser?.close(); await new Promise(done => server.close(done));
  // Retain the exact browser-produced bytes losslessly without redundant multi-MiB copies.
  for (const [name, record] of retained) if (record.bytes > 1024 * 1024) {
    const file = resolve(output, name), bytes = await readFile(file), packed = gzipSync(bytes, { level: 9 });
    assert.equal(hash(bytes), record.sha256); assert.deepEqual(gunzipSync(packed), bytes);
    const gzipName = name + '.gz'; await writeFile(resolve(output, gzipName), packed);
    record.retained_gzip = gzipName; record.gzip_bytes = packed.length; record.gzip_sha256 = hash(packed); delete record.retained_file;
    await unlink(file);
  }
  await writeFile(resolve(output, 'receiving.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ passed: report.passed, groups: report.cases.length, downloads: report.downloads.length }));
}
