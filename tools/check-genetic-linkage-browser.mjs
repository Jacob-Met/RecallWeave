#!/usr/bin/env node
/** Bounded author acceptance using an installed browser, never an installer. */
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== '--output') throw new Error('Usage: node tools/check-genetic-linkage-browser.mjs --output DIRECTORY');
if (!process.env.PLAYWRIGHT_MODULE || !process.env.CHROMIUM_EXECUTABLE) {
  throw new Error('Set PLAYWRIGHT_MODULE and CHROMIUM_EXECUTABLE to existing installations; this check installs nothing.');
}
const output = resolve(args[1]);
mkdirSync(output, { recursive: true });
const profileTemp = mkdtempSync(join(output, 'browser-temp-'));
const files = [
  'courses/genetic-linkage.json', 'courses/genetic-linkage.md', 'courses/genetic-linkage-lab.html',
  'templates/genetic-linkage-lab.html', 'src/genetic-linkage.mjs', 'src/genetic-linkage-ui.mjs',
  'tools/build-genetic-linkage.mjs', 'tools/check-genetic-linkage-browser.mjs',
  'tests/genetic-linkage.test.mjs', 'tests/genetic-linkage-course.test.mjs', 'src/deck.mjs'
];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const sources = () => Object.fromEntries(files.map(path => { const body = readFileSync(join(root, path)); return [path, { bytes: body.length, sha256: sha(body) }]; }));
const receipt = { format: 'recallweave-linkage-author-browser/1', node: process.version,
  started: new Date().toISOString(), sourceBefore: sources(), checks: [], requests: [], pageErrors: [], consoleErrors: [], downloads: [], passed: false };
let browser;
try {
  const { chromium } = await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href);
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'], env: { ...process.env, TMPDIR: profileTemp } });
  receipt.browser = browser.version();
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1180, height: 900 } });
  const page = await context.newPage();
  page.on('pageerror', error => receipt.pageErrors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') receipt.consoleErrors.push(message.text()); });
  page.on('request', request => receipt.requests.push(request.url()));
  await page.goto(pathToFileURL(join(root, 'courses/genetic-linkage-lab.html')).href);
  assert.equal(await page.locator('#linkage-result').isVisible(), false);
  assert.equal(await page.locator('#linkage-download').isDisabled(), true);
  assert.equal(await page.locator('#linkage-recombination').inputValue(), '20');
  await page.locator('#linkage-apply').click();
  assert.equal(await page.locator('#linkage-result').isVisible(), true);
  const rows = await page.locator('#linkage-rows tr').evaluateAll(rows => rows.map(row => ({
    gamete: row.dataset.gamete,
    kind: row.querySelector('[data-field="kind"]').textContent,
    probability: row.querySelector('[data-field="probability"]').textContent,
    offspring: row.querySelector('[data-field="offspring"]').textContent
  })));
  assert.deepEqual(rows, [
    { gamete: 'AB', kind: 'Parental', probability: '2/5', offspring: 'AaBb' },
    { gamete: 'Ab', kind: 'Recombinant', probability: '1/10', offspring: 'Aabb' },
    { gamete: 'aB', kind: 'Recombinant', probability: '1/10', offspring: 'aaBb' },
    { gamete: 'ab', kind: 'Parental', probability: '2/5', offspring: 'aabb' }
  ]);
  receipt.checks.push('Initial unapplied state and explicit coupling20 result');
  async function capture(selector, name) {
    const promised = page.waitForEvent('download');
    await page.locator(selector).click();
    const download = await promised;
    assert.equal(download.suggestedFilename(), name);
    const path = join(output, name);
    await download.saveAs(path);
    assert.equal(await download.failure(), null);
    const body = readFileSync(path);
    receipt.downloads.push({ name, bytes: body.length, sha256: sha(body) });
    return body;
  }
  const observed = await capture('#linkage-download', 'genetic-linkage-observation.json');
  const { analyzeLinkage } = await import(pathToFileURL(join(root, 'src/genetic-linkage.mjs')).href);
  const expected = { format: 'recallweave-genetic-linkage-observation/1',
    entered: { phase: 'coupling', recombinationPercent: '20' },
    analysis: analyzeLinkage({ phase: 'coupling', recombinationPercent: 20 }) };
  assert.equal(observed.toString('utf8'), JSON.stringify(expected, null, 2) + '\n');
  const course = await capture('#linkage-course', 'genetic-linkage.json');
  assert.deepEqual(course, readFileSync(join(root, 'courses/genetic-linkage.json')));
  receipt.checks.push('Actual observation and exact original course downloads');
  await page.screenshot({ path: join(output, 'applied-cross.png'), fullPage: true });
  await page.locator('#linkage-recombination').fill('30');
  assert.equal(await page.locator('#linkage-result').isVisible(), false);
  assert.equal(await page.locator('#linkage-download').isDisabled(), true);
  receipt.checks.push('Draft edit immediately retires result and observation availability');
  assert.deepEqual(receipt.pageErrors, []);
  assert.deepEqual(receipt.consoleErrors, []);
  assert.ok(receipt.requests.every(url => url === pathToFileURL(join(root, 'courses/genetic-linkage-lab.html')).href));
  receipt.sourceAfter = sources();
  assert.deepEqual(receipt.sourceAfter, receipt.sourceBefore);
  receipt.passed = true;
} catch (error) {
  receipt.error = { name: error.name, message: error.message, stack: error.stack };
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  rmSync(profileTemp, { recursive: true, force: true });
  receipt.finished = new Date().toISOString();
  writeFileSync(join(output, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify(receipt, null, 2));
}
