import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
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
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const inputPath = resolve(root, 'docs/qualification/deck-author-6e5752b49b6f/author-browser/authored-final.json');
const input = await readFile(inputPath);
assert.equal(digest(input), '6b6aafa39048d22be31a8d3221bce5e6ba320e3754de447a88e02b5953a7b0a9');
const sourceFiles = ['src/deck-author-ui.mjs', 'author.html', 'author/index.html', 'src/deck-author.mjs',
  'src/deck-author-loader.mjs', 'src/deck.mjs', 'author/author.css', 'tools/make_author.py'];
const source = Object.fromEntries(await Promise.all(sourceFiles.map(async path => [path, digest(await readFile(resolve(root, path)))])));
const report = { source_commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  source_sha256: source, browser: options.browser, external_requests: [], page_errors: [] };
const require = createRequire(import.meta.url);
const { chromium } = require(options.playwright);
let browser;
try {
  browser = await chromium.launch({ executablePath: options.browser, headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-background-networking'] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  await context.setOffline(true);
  const page = await context.newPage();
  page.on('pageerror', error => report.page_errors.push(error.message));
  page.on('request', request => { if (!request.url().startsWith('file:')) report.external_requests.push(request.url()); });
  await page.goto(pathToFileURL(resolve(root, 'author.html')).href);
  const chooserPromise = page.waitForEvent('filechooser');
  await page.locator('#open-deck-button').click();
  await (await chooserPromise).setFiles(inputPath);
  await page.locator('#open-preview').waitFor({ state: 'visible' });
  await page.locator('#replace-draft').click();
  await page.locator('#check-draft').click();
  await page.locator('#author-preview').waitFor({ state: 'visible' });
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#download-deck').click();
  const download = await downloadPromise;
  assert.equal(await download.failure(), null);
  const target = resolve(output, 'actual-download.json');
  await download.saveAs(target);
  assert.deepEqual(await readFile(target), input);
  report.status_text = await page.locator('#author-status').textContent();
  assert.equal(report.status_text, 'Deck download started. Keep the JSON file to share or reopen it here.');
  report.dimensions = await page.evaluate(() => ({ viewport: innerWidth, page: document.documentElement.scrollWidth }));
  assert.equal(report.dimensions.viewport, 390);
  assert.ok(report.dimensions.page <= report.dimensions.viewport);
  assert.deepEqual(report.page_errors, []);
  assert.deepEqual(report.external_requests, []);
  await page.locator('#author-status').scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(output, 'download-status-phone.png') });
  report.browser_version = browser.version();
  report.download = { suggested_filename: download.suggestedFilename(), bytes: input.length, sha256: digest(input), exactly_matches_actual_input: true };
  for (const [name, expected] of Object.entries(source)) assert.equal(digest(await readFile(resolve(root, name))), expected, name);
  report.passed = true;
  console.log(JSON.stringify({ passed: true, status: report.status_text, bytes: input.length, sha256: digest(input) }));
} catch (error) {
  report.passed = false;
  report.failure = error.stack;
  throw error;
} finally {
  if (browser) await browser.close();
  await writeFile(resolve(output, 'receiving.json'), JSON.stringify(report, null, 2) + '\n');
}
