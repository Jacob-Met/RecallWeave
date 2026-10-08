import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const args = Object.fromEntries(process.argv.slice(2).reduce((out, value, index, all) => {
  if (!(index % 2)) out.push([value.replace(/^--/, ''), all[index + 1]]); return out;
}, []));
const root = resolve(args.root); const output = resolve(args.output); const file = resolve(args.deck);
await mkdir(output, { recursive: true });
const { chromium } = createRequire(import.meta.url)(args.playwright || 'playwright');
const { parseDeck } = await import(pathToFileURL(resolve(root, 'src/deck.mjs')));
const bytes = await readFile(file); const deck = parseDeck(bytes.toString('utf8'));
const sha = data => createHash('sha256').update(data).digest('hex');
const paths = ['index.html', 'styles.css', 'src/app.mjs', 'src/knowledge.mjs', 'src/review.mjs', 'src/deck.mjs', 'src/deck-picker.mjs', 'data/deck.json', 'demo.html'];
const hashes = Object.fromEntries(await Promise.all(paths.map(async path => [path, sha(await readFile(resolve(root, path)))])));
const report = { scope: 'Exact in-progress owner7 importer/review contract; current-main study-notes composition remains owner-pending.',
  author_download: file, author_download_sha256: sha(bytes), source_sha256: hashes, cases: [], external_requests: [], page_errors: [] };
const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://local').pathname;
  if (path === '/favicon.ico') { response.writeHead(204); response.end(); return; }
  const filename = resolve(root, '.' + (path.endsWith('/') ? path + 'index.html' : path));
  if (!filename.startsWith(root + sep)) { response.writeHead(403); response.end(); return; }
  try { const data = await readFile(filename); const mime = { '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json' }[extname(filename)];
    response.writeHead(200, { 'Content-Type': (mime || 'application/octet-stream') + '; charset=utf-8', 'Cache-Control': 'no-store' }); response.end(data);
  } catch { response.writeHead(404); response.end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
let context;
const enter = async (page, selector) => { const button = page.locator(selector); await button.focus(); await button.press('Enter'); };
const snapshot = page => page.evaluate(() => ({ html: document.querySelector('#session-content').innerHTML,
  count: document.querySelector('#step-count').textContent,
  progress: document.querySelector('[role=progressbar]').getAttribute('aria-valuenow'),
  title: document.title, context: document.querySelector('#lesson-description').textContent }));

try {
  browser = await chromium.launch({ executablePath: args.browser, headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-background-networking'] });
  report.browser_version = browser.version();
  for (const [label, url, viewport] of [['modular', origin + '/index.html', { width: 1280, height: 900 }],
    ['standalone-phone', pathToFileURL(resolve(root, 'demo.html')).href, { width: 390, height: 844 }]]) {
    context = await browser.newContext({ viewport });
    await context.route('**/*', route => {
      const value = route.request().url();
      if (value.startsWith(origin + '/') || value.startsWith(pathToFileURL(root + '/').href)) return route.continue();
      report.external_requests.push(value); return route.abort();
    });
    const page = await context.newPage(); page.on('pageerror', error => report.page_errors.push(String(error)));
    await page.goto(url); await enter(page, '#start-button');
    await enter(page, '[data-choice="0"]');
    const before = await snapshot(page); assert.equal(before.progress, '1');
    await page.locator('#deck-file').setInputFiles(file);
    await page.locator('#start-deck').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#deck-preview-title').textContent(), deck.title);
    assert.equal(await page.locator('#deck-preview li').count(), deck.items.length);
    assert.deepEqual(await snapshot(page), before);
    await enter(page, '#cancel-deck'); assert.deepEqual(await snapshot(page), before);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'deck-file');
    await page.locator('#deck-file').setInputFiles(file);
    await page.locator('#start-deck').waitFor({ state: 'visible' }); await enter(page, '#start-deck');
    assert.equal(await page.locator('[role=progressbar]').getAttribute('aria-valuenow'), '0');
    assert.equal(await page.locator('[role=progressbar]').getAttribute('aria-valuemax'), String(deck.items.length));
    assert.equal(await page.locator('#lesson-description').textContent(), deck.title);
    const answers = [];
    for (let index = 0; index < deck.items.length; index++) {
      const prompt = await page.locator('#session-content .question-card h2').textContent();
      const matches = deck.items.filter(item => item.prompt === prompt); assert.equal(matches.length, 1);
      const item = matches[0]; assert.equal(answers.some(answer => answer.id === item.id), false);
      const choice = index === 0 ? (item.answer + 1) % item.options.length : item.answer;
      await enter(page, `[data-choice="${choice}"]`);
      const feedback = await page.locator('#feedback-slot').textContent();
      assert.ok(feedback.includes(item.explanation)); assert.ok(feedback.includes(item.transfer));
      assert.equal(await page.locator(`[data-choice="${item.answer}"]`).getAttribute('class').then(value => value.includes('correct')), true);
      answers.push({ id: item.id, choice, correct: choice === item.answer, prompt });
      await enter(page, '#next-button');
    }
    assert.equal(await page.locator('.review-item').count(), deck.items.length);
    const review = page.locator('.review-item');
    for (let index = 0; index < answers.length; index++) {
      const answer = answers[index]; const item = deck.items.find(item => item.id === answer.id);
      const row = review.nth(index);
      assert.equal(await row.locator('.review-prompt').textContent(), item.prompt);
      assert.deepEqual(await row.locator('.review-answers dd').allTextContents(), [item.options[answer.choice], item.options[item.answer]]);
      assert.equal(await row.locator('.review-body > p').first().textContent(), item.explanation);
      assert.ok((await row.locator('.review-transfer').textContent()).includes(item.transfer));
    }
    const sourceText = await page.locator('.source-note').textContent(); assert.ok(sourceText.includes(deck.attribution)); assert.ok(sourceText.includes(deck.license));
    assert.equal(await page.locator('[data-receiving]').count(), 0);
    const firstSummary = await page.locator('#first-try-summary').textContent();
    const firstMastery = await page.locator('.mastery-box').textContent();
    assert.match(firstSummary, /2 of 3/);
    await enter(page, '#practice-button');
    const missed = deck.items.find(item => item.id === answers[0].id);
    assert.equal(await page.locator('.practice-card h2').textContent(), missed.prompt);
    await enter(page, `[data-practice-choice="${missed.answer}"]`); await enter(page, '#practice-next');
    assert.equal(await page.locator('#first-try-summary').textContent(), firstSummary);
    assert.equal(await page.locator('.mastery-box').textContent(), firstMastery);
    assert.equal(await page.locator('.review-practice-answer p').textContent(), missed.options[missed.answer]);
    assert.match(await page.locator('#practice-status').textContent(), /1 of 1/);
    const dimensions = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
    assert.ok(dimensions.content <= dimensions.viewport);
    await page.locator('.result-card').scrollIntoViewIfNeeded(); await page.screenshot({ path: resolve(output, label + '.png') });
    report.cases.push({ label, passed: true, preview_cancel_preserved_progress: true, explicit_start_reset: true,
      answers, practice_corrected_item: missed.id, first_summary: firstSummary, first_model_unchanged_by_practice: true, dimensions });
    console.log(`PASS ${label}: actual downloaded file, preview/cancel, explicit start, three first answers, separate retry`);
    await context.close(); context = null;
  }
  assert.deepEqual(report.external_requests, []); assert.deepEqual(report.page_errors, []);
  for (const [path, digest] of Object.entries(hashes)) assert.equal(sha(await readFile(resolve(root, path))), digest);
  assert.equal(sha(await readFile(file)), report.author_download_sha256);
  report.passed = true;
} catch (error) { report.passed = false; report.failure = String(error); report.stack = error.stack; console.error(error.stack); process.exitCode = 1; }
finally {
  await context?.close(); await browser?.close(); await new Promise(done => server.close(done));
  await writeFile(resolve(output, 'receiving.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ passed: report.passed, cases: report.cases.length, scope: report.scope }));
}
