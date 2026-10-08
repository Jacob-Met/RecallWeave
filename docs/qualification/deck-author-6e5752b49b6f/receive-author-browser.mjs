import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const options = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, all) => {
  if (index % 2 === 0) pairs.push([value.replace(/^--/, ''), all[index + 1]]);
  return pairs;
}, []));
const root = resolve(options.root);
const output = resolve(options.output);
await mkdir(output, { recursive: true });
const require = createRequire(import.meta.url);
const { chromium } = require(options.playwright || 'playwright');
const { parseDeck } = await import(pathToFileURL(resolve(root, 'src/deck.mjs')));
const digest = value => createHash('sha256').update(value).digest('hex');
const runtimeFiles = ['author/index.html', 'author/author.css', 'author.html', 'src/deck.mjs',
  'src/deck-author.mjs', 'src/deck-author-loader.mjs', 'src/deck-author-ui.mjs', 'tools/make_author.py'];
const sourceHashes = Object.fromEntries(await Promise.all(runtimeFiles.map(async path => [path, digest(await readFile(resolve(root, path)))])));
const report = { source_root: root, checkpoint: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  source_sha256: sourceHashes, browser: options.browser, cases: [], external_requests: [], page_errors: [], screenshots: [] };
let browser;
let context;
const server = createServer(async (request, response) => {
  const path = decodeURIComponent(new URL(request.url, 'http://local').pathname);
  if (path === '/favicon.ico') { response.writeHead(204); response.end(); return; }
  const file = resolve(root, '.' + (path.endsWith('/') ? path + 'index.html' : path));
  if (!file.startsWith(root + sep)) { response.writeHead(403); response.end(); return; }
  try {
    const bytes = await readFile(file);
    const mime = { '.html': 'text/html', '.css': 'text/css', '.mjs': 'text/javascript', '.json': 'application/json' }[extname(file)] || 'application/octet-stream';
    response.writeHead(200, { 'Content-Type': mime + '; charset=utf-8', 'Cache-Control': 'no-store' }); response.end(bytes);
  } catch { response.writeHead(404); response.end('Missing local fixture'); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
const originalTitle = 'Author café <b data-receiving="literal">map</b>';
const renamedConcept = 'Symbols <map> 名称';

async function runCase(label, operation) {
  try { const detail = await operation(); report.cases.push({ label, passed: true, detail }); console.log(`PASS ${label}`); }
  catch (error) { report.cases.push({ label, passed: false, error: String(error), stack: error.stack }); throw error; }
}
async function openPage(url, viewport) {
  context = await browser.newContext({ acceptDownloads: true, viewport });
  await context.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith(origin + '/') || url.startsWith(pathToFileURL(root + '/').href) || url.startsWith('blob:')) return route.continue();
    report.external_requests.push(url); return route.abort();
  });
  const page = await context.newPage();
  page.on('pageerror', error => report.page_errors.push(String(error)));
  await page.goto(url);
  await page.locator('#deck-title').waitFor({ state: 'visible' });
  return page;
}
async function button(page, id) { const item = page.locator(id); await item.focus(); await item.press('Enter'); }
async function fill(page, id, value) { const item = page.locator(id); await item.focus(); await item.fill(value); }
async function selectQuestion(page, index) { await page.locator('#question-picker').selectOption({ index }); }
async function fillQuestion(page, { prompt, options, answer, concept, prerequisite, explanation, transfer }) {
  await fill(page, '#question-prompt', prompt);
  await page.locator('#question-concept').selectOption({ label: concept });
  if (prerequisite) await page.locator('#question-prerequisites-list').getByLabel(prerequisite, { exact: true }).check();
  for (let i = 0; i < options.length; i++) {
    if (i >= 2) await button(page, '#add-option');
    await page.locator('#option-list textarea').nth(i).fill(options[i]);
  }
  const radio = page.locator('#option-list input[type=radio]').nth(answer);
  await radio.focus(); await radio.press('Space');
  await fill(page, '#question-explanation', explanation);
  await fill(page, '#question-transfer', transfer);
}
async function authorLesson(page) {
  await fill(page, '#deck-title', originalTitle);
  await fill(page, '#deck-attribution', 'Synthetic receiving author\nOriginal illustrative map text.');
  await fill(page, '#deck-license', 'Original test content; local receiving only.');
  await page.locator('#concept-list textarea').first().fill('Symbols');
  await button(page, '#add-concept'); await page.locator('#concept-list textarea').nth(1).fill('Connections');
  await fillQuestion(page, { prompt: 'Which authored label marks the start?\nUse this local example.',
    options: ['End', 'Begin', 'Middle', 'North', 'South', 'West'], answer: 1, concept: 'Symbols',
    explanation: 'The author explicitly chose “Begin”. <b data-receiving="literal">Literal text</b>', transfer: 'Name the start of another map.' });
  await button(page, '#add-question');
  await fillQuestion(page, { prompt: 'Which route was written in this example?', options: ['A → B', 'B → A'], answer: 0,
    concept: 'Connections', prerequisite: 'Symbols', explanation: 'The authored route runs from A to B.', transfer: 'Describe its reverse without changing this example.' });
  await button(page, '#add-question');
  await fillQuestion(page, { prompt: 'What should a reader check?', options: ['Only the shape', 'Only the color', 'The written label'], answer: 2,
    concept: 'Connections', prerequisite: 'Symbols', explanation: 'This example uses a written label.', transfer: 'Explain a different labeling choice.' });
}
async function download(page, name) {
  const event = page.waitForEvent('download');
  await button(page, '#download-deck');
  const downloaded = await event;
  assert.equal(await downloaded.failure(), null);
  const path = resolve(output, name);
  await downloaded.saveAs(path);
  const bytes = await readFile(path);
  return { path, bytes, deck: parseDeck(bytes.toString('utf8')), filename: downloaded.suggestedFilename(), sha256: digest(bytes) };
}
async function assertNoOverflow(page) {
  const dimensions = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  assert.ok(dimensions.scroll <= dimensions.width, JSON.stringify(dimensions));
  return dimensions;
}
async function screenshot(page, name) { await page.screenshot({ path: resolve(output, name) }); report.screenshots.push(name); }

try {
  browser = await chromium.launch({ executablePath: options.browser, headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-background-networking'] });
  report.browser_version = browser.version();
  let page = await openPage(origin + '/author/index.html', { width: 1280, height: 900 });
  let initial;
  await runCase('create a three-question deck with nonzero correct choices using actual controls', async () => {
    await authorLesson(page); await button(page, '#check-draft');
    assert.equal(await page.locator('#download-deck').isEnabled(), true);
    assert.equal(await page.locator('#preview-content details').count(), 3);
    assert.equal(await page.locator('[data-receiving]').count(), 0);
    initial = await download(page, 'authored-initial.json');
    assert.deepEqual(initial.deck.items.map(item => item.options[item.answer]), ['Begin', 'A → B', 'The written label']);
    assert.equal(initial.deck.title, originalTitle);
    assert.equal(initial.deck.items[0].options.length, 6);
    const repeated = await download(page, 'authored-repeated.json'); assert.deepEqual(repeated.bytes, initial.bytes);
    return { sha256: initial.sha256, repeated_bytes_equal: true, answers: initial.deck.items.map(item => item.answer) };
  });
  await runCase('edits invalidate preview and export until an identified field is repaired', async () => {
    await fill(page, '#question-prompt', '');
    assert.equal(await page.locator('#download-deck').isDisabled(), true);
    assert.equal(await page.locator('#author-preview').isHidden(), true);
    let unexpected = 0; const observed = () => unexpected++;
    page.on('download', observed); await page.locator('#download-deck').evaluate(element => element.click());
    await button(page, '#check-draft');
    assert.match(await page.locator('#author-error-message').textContent(), /Question 3/);
    await button(page, '#go-to-error'); assert.equal(await page.evaluate(() => document.activeElement.id), 'question-prompt');
    assert.equal(await page.locator('#question-explanation').inputValue(), 'This example uses a written label.');
    await fill(page, '#question-prompt', 'What should a reader check? “Final”\n日本語');
    await button(page, '#check-draft'); assert.equal(unexpected, 0); page.off('download', observed);
    const repaired = await download(page, 'authored-repaired.json');
    assert.equal(repaired.deck.items[2].prompt, 'What should a reader check? “Final”\n日本語');
    return { stale_downloads: unexpected, repaired_sha256: repaired.sha256 };
  });
  await runCase('option movement and deletion preserve identity and require a new removed answer', async () => {
    await selectQuestion(page, 0);
    await page.getByRole('button', { name: 'Move down option 2', exact: true }).click();
    assert.equal(await page.locator('#option-list input[type=radio]').nth(2).isChecked(), true);
    await page.getByRole('button', { name: 'Remove option 1', exact: true }).click();
    assert.equal(await page.locator('#option-list input[type=radio]').nth(1).isChecked(), true);
    await page.getByRole('button', { name: 'Remove option 2', exact: true }).click();
    assert.equal(await page.locator('#option-list input:checked').count(), 0);
    assert.match(await page.locator('#author-status').textContent(), /Choose a new correct answer/);
    assert.deepEqual(await page.locator('#option-list textarea').evaluateAll(elements => elements.map(element => element.value)), ['Middle', 'North', 'South', 'West']);
    await button(page, '#check-draft'); assert.match(await page.locator('#author-error-message').textContent(), /Choose the correct answer/);
    await button(page, '#go-to-error'); assert.equal(await page.evaluate(() => document.activeElement.type), 'radio');
    const radio = page.locator('#option-list input[type=radio]').nth(2); await radio.focus(); await radio.press('Space');
    await button(page, '#check-draft'); const accepted = await download(page, 'authored-options.json');
    assert.equal(accepted.deck.items[0].options[accepted.deck.items[0].answer], 'South');
    assert.equal(accepted.deck.items[1].prompt, initial.deck.items[1].prompt);
    return { canonical_correct: 'South', options: accepted.deck.items[0].options };
  });
  await runCase('renamed references survive while cycles and uncovered concepts are repairable', async () => {
    await page.locator('#concept-list textarea').first().fill(renamedConcept);
    await page.locator('#question-prerequisites-list').getByLabel('Connections', { exact: true }).check();
    await button(page, '#check-draft'); assert.match(await page.locator('#author-error-message').textContent(), /loop/);
    await page.locator('#question-prerequisites-list').getByLabel('Connections', { exact: true }).uncheck();
    await button(page, '#add-concept'); await page.locator('#concept-list textarea').nth(2).fill('Uncovered idea');
    await button(page, '#check-draft'); assert.match(await page.locator('#author-error-message').textContent(), /Uncovered idea/);
    await button(page, '#go-to-error'); assert.equal(await page.evaluate(() => document.activeElement.value), 'Uncovered idea');
    await page.getByRole('button', { name: 'Remove concept 3', exact: true }).click();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'add-concept');
    await button(page, '#check-draft'); const accepted = await download(page, 'authored-graph.json');
    assert.equal(accepted.deck.items[0].concept, renamedConcept);
    assert.deepEqual(accepted.deck.items[1].prerequisites, [renamedConcept]);
    assert.deepEqual(accepted.deck.items[2].prerequisites, [renamedConcept]);
    return { concepts: accepted.deck.concepts, references_updated: true };
  });
  await runCase('question removal undo and reordering retain later edits and original answers', async () => {
    await selectQuestion(page, 1); await button(page, '#remove-question');
    assert.equal(await page.locator('#question-picker option').count(), 2);
    await fill(page, '#deck-title', 'A later title “kept after undo”');
    await button(page, '#undo-question'); assert.equal(await page.locator('#question-picker option').count(), 3);
    assert.equal(await page.locator('#question-prompt').inputValue(), initial.deck.items[1].prompt);
    await selectQuestion(page, 2); await button(page, '#move-question-up');
    await button(page, '#check-draft'); const accepted = await download(page, 'authored-final.json');
    assert.equal(accepted.deck.title, 'A later title “kept after undo”');
    assert.equal(accepted.deck.items[2].prompt, initial.deck.items[1].prompt);
    assert.equal(accepted.deck.items[2].options[accepted.deck.items[2].answer], 'A → B');
    await page.evaluate(() => scrollTo(0, 0)); await screenshot(page, 'author-desktop.png');
    return { final_sha256: accepted.sha256, order: accepted.deck.items.map(item => item.id), dimensions: await assertNoOverflow(page) };
  });
  await context.close();
  page = await openPage(pathToFileURL(resolve(root, 'author.html')).href, { width: 390, height: 844 });
  await runCase('direct-file phone authoring, keyboard error recovery and actual download work offline', async () => {
    await button(page, '#check-draft'); await button(page, '#go-to-error');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'deck-title');
    await authorLesson(page); await button(page, '#check-draft');
    assert.equal(await page.locator('[data-receiving]').count(), 0);
    const accepted = await download(page, 'authored-standalone-phone.json');
    assert.deepEqual(accepted.deck.items.map(item => item.options[item.answer]), ['Begin', 'A → B', 'The written label']);
    const dimensions = await assertNoOverflow(page);
    await byPreviewScreenshot(page);
    await selectQuestion(page, 0); await page.locator('#question-options').scrollIntoViewIfNeeded();
    await screenshot(page, 'author-phone-options.png');
    return { sha256: accepted.sha256, dimensions, canonical_answers_preserved: true };
  });
  assert.deepEqual(report.external_requests, []); assert.deepEqual(report.page_errors, []);
  for (const [path, expected] of Object.entries(sourceHashes)) assert.equal(digest(await readFile(resolve(root, path))), expected);
  report.passed = true;
} catch (error) {
  report.passed = false; report.failure = String(error); process.exitCode = 1;
  console.error(error.stack);
} finally {
  await context?.close(); await browser?.close(); await new Promise(done => server.close(done));
  await writeFile(resolve(output, 'browser-receiving.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ passed: report.passed, cases: report.cases.length, report: resolve(output, 'browser-receiving.json') }));
}

async function byPreviewScreenshot(page) { await page.locator('#preview-heading').scrollIntoViewIfNeeded(); await screenshot(page, 'author-phone-preview.png'); }
