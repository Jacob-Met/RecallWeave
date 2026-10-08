#!/usr/bin/env node
/** Optional real-browser receiving using an existing Playwright install and installed Chromium.
 * No package installation or product dependency change is performed by this script.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {readFile, writeFile, mkdir, readdir} from 'node:fs/promises';
import {dirname, join, resolve, extname, sep} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {parseDeck} from '../src/deck.mjs';

const args = process.argv.slice(2);
const option = (flag, fallback) => args.includes(flag) ? args[args.indexOf(flag) + 1] : fallback;
const project = resolve(option('--root', join(dirname(fileURLToPath(import.meta.url)), '..')));
const executable = option('--browser', undefined);
const playwrightEntry = option('--playwright', undefined);
const output = resolve(option('--output', join(project, 'inheritance-browser-check')));
const {chromium} = await import(playwrightEntry ? pathToFileURL(resolve(playwrightEntry)).href : 'playwright');
const downloads = join(output, 'downloads');
await mkdir(downloads, {recursive: true});
assert.deepEqual(await readdir(downloads), [], 'Use a fresh output directory; earlier files cannot satisfy this run.');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const report = {status: 'running', startedAt: new Date().toISOString(), project, executable: executable ?? 'Playwright installed Chromium', playwrightEntry: playwrightEntry ?? 'playwright', node: process.version, checks: [], screenshots: [], downloads: [], sourceSha256: {}};
for (const path of [
  'courses/mendelian-inheritance-lab.html', 'courses/mendelian-inheritance.json',
  'src/mendelian-inheritance.mjs', 'src/mendelian-inheritance-ui.mjs',
  'templates/mendelian-inheritance-lab.html', 'tools/build-mendelian-inheritance.mjs',
  'tools/check-mendelian-inheritance-browser.mjs', 'index.html', 'demo.html', 'styles.css',
  'src/app.mjs', 'src/deck.mjs', 'src/deck-picker.mjs', 'src/knowledge.mjs', 'src/review.mjs',
  'src/session-export.mjs', 'src/reflections.mjs', 'src/answer-order.mjs',
  'src/trace-archive-ui.mjs', 'src/trace-archive.mjs', 'data/deck.json'
]) report.sourceSha256[path] = hash(await readFile(join(project, path)));
if (playwrightEntry) report.playwrightEntrySha256 = hash(await readFile(resolve(playwrightEntry)));
const deckBytes = await readFile(join(project, 'courses/mendelian-inheritance.json'));
const deck = parseDeck(deckBytes.toString('utf8'));
const pageErrors = [], pageRequests = [], downloadEvents = [], consoleErrors = [], dialogs = [];
let browser, browserPage, server, origin, downloadSequence = 0;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(check, label) {
  for (let step = 0; step < 120; step++) {
    if (await check()) return;
    await delay(100);
  }
  throw new Error('Timed out: ' + label);
}
async function page(fn, ...args) {
  return browserPage.evaluate('(' + fn.toString() + ')(...' + JSON.stringify(args) + ')');
}
async function key(name) { await browserPage.keyboard.press(name); }
async function activate(selector) {
  await browserPage.locator(selector).first().focus();
  await browserPage.keyboard.press('Enter');
}
async function selectAt(selector, index, expected) {
  await browserPage.locator(selector).selectOption({index});
  assert.equal(await browserPage.locator(selector).inputValue(), expected);
}
async function navigate(url, selector) {
  const response = await browserPage.goto(url, {waitUntil: 'load'});
  if (url.startsWith('http:')) assert.equal(response.status(), 200);
  await browserPage.locator(selector).waitFor();
}
async function state() {
  return page(() => ({
    url: document.URL,
    hidden: document.querySelector('#results')?.hidden,
    downloadDisabled: document.querySelector('#download-cross')?.disabled,
    pendingHidden: document.querySelector('#pending')?.hidden,
    error: document.querySelector('#cross-error')?.textContent,
    heading: document.querySelector('#cross-heading')?.textContent,
    route: document.querySelector('#route-detail')?.textContent,
    genotypes: [...document.querySelectorAll('#genotype-summary tr')].map(row => [...row.children].map(cell => cell.textContent)),
    phenotypes: [...document.querySelectorAll('#phenotype-summary tr')].map(row => [...row.children].map(cell => cell.textContent)),
    focus: document.activeElement.id,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
  }));
}
async function retired() {
  const value = await state();
  assert.equal(value.hidden, true); assert.equal(value.pendingHidden, false); assert.equal(value.downloadDisabled, true);
}
async function chooseFile(path) {
  await browserPage.locator('#deck-file').setInputFiles(path);
  await browserPage.locator('#start-deck').waitFor();
}
async function writeText(selector, text) {
  await browserPage.locator(selector).first().focus();
  await browserPage.keyboard.insertText(text);
  assert.equal(await browserPage.locator(selector).first().inputValue(), text);
}
async function screenshot(name, selector) {
  await page(selector => selector ? document.querySelector(selector).scrollIntoView({block: 'start'}) : window.scrollTo(0, 0), selector ?? null);
  const bytes = await browserPage.screenshot({path: join(output, name), fullPage: false});
  report.screenshots.push({name, bytes: bytes.length, sha256: hash(bytes), viewport: browserPage.viewportSize()});
}
async function newDownload(action, extension) {
  const folder = String(++downloadSequence).padStart(2, '0');
  const target = join(downloads, folder); await mkdir(target);
  const [download] = await Promise.all([browserPage.waitForEvent('download'), action()]);
  assert.equal(await download.failure(), null);
  const filename = download.suggestedFilename();
  assert.equal(filename.endsWith(extension), true);
  const path = join(target, filename);
  await download.saveAs(path);
  const bytes = await readFile(path);
  downloadEvents.push({url: download.url(), filename, savedPath: path, failure: null, bytes: bytes.length});
  report.downloads.push({filename: folder + '/' + filename, bytes: bytes.length, sha256: hash(bytes)});
  return bytes;
}
const passed = name => {report.checks.push(name); console.log('PASS ' + name);};
async function learner(url, label, coursePath) {
  await browserPage.setViewportSize({width: 1280, height: 1050});
  await navigate(url, '#start-button');
  await activate('#start-button');
  await waitFor(() => page(() => Boolean(document.querySelector('.question-card h2'))), 'bundled first question');
  const before = await page(() => document.querySelector('#session-content').innerHTML);
  await chooseFile(coursePath);
  assert.equal(await page(() => document.querySelector('#deck-preview-title').textContent), deck.title);
  assert.deepEqual(await page(() => [...document.querySelectorAll('#deck-preview ol strong')].map(node => node.textContent)), deck.items.map(item => item.prompt));
  assert.equal(await page(() => document.querySelector('#session-content').innerHTML), before);
  await activate('#cancel-deck');
  assert.equal(await page(() => document.querySelector('#session-content').innerHTML), before);
  await chooseFile(coursePath);
  await activate('#start-deck');
  assert.equal(await page(() => document.querySelector('#lesson-description').textContent), deck.title);
  await browserPage.locator('.question-card h2').waitFor(); // Start this deck already opens its first question.

  const expected = [];
  for (let index = 0; index < deck.items.length; index++) {
    const prompt = await page(() => document.querySelector('.question-card h2')?.textContent);
    const item = deck.items.find(item => item.prompt === prompt);
    assert.ok(item, 'actual current question belongs to downloaded deck');
    assert.equal(expected.some(answer => answer.item === item.id), false);
    const choice = index % 4 === 0 ? (item.answer + 1) % item.options.length : item.answer;
    expected.push({item: item.id, choice});
    await activate('[data-choice="' + choice + '"]');
    assert.ok((await page(() => document.querySelector('#feedback-slot').textContent)).includes(item.explanation));
    await activate('#next-button');
  }
  await waitFor(() => page(() => document.querySelectorAll('.review-item').length === 12), 'complete imported trace');
  assert.match(await page(() => document.querySelector('#first-try-summary').textContent), /9 of 12/);
  const firstSummary = await page(() => document.querySelector('#first-try-summary').textContent);
  const mastery = await page(() => document.querySelector('.mastery-box').outerHTML);
  const firstRows = await page(() => [...document.querySelectorAll('.review-answers')].map(node => node.textContent));
  assert.equal(firstRows.length, 12);
  for (let index = 0; index < expected.length; index++) {
    const answer = expected[index], item = deck.items.find(item => item.id === answer.item);
    assert.ok(firstRows[index].includes(item.options[answer.choice]));
  }
  passed(label + ': actual saved course file previews/cancels safely, explicitly starts and completes all twelve first answers');

  await activate('.review-item summary');
  const reflection = 'Aa has two distinct parental routes.\n<img src=x onerror=alert(1)> is literal writing.';
  const application = 'A genotype groups gamete routes.\nA phenotype can group several genotypes.';
  await writeText('[data-reflection-item]', reflection);
  await writeText('#application-reflection', application);
  await activate('#practice-button');
  for (let index = 0; index < 3; index++) {
    const prompt = await page(() => document.querySelector('.practice-card h2')?.textContent);
    const item = deck.items.find(item => item.prompt === prompt);
    assert.ok(item);
    assert.equal(expected.find(answer => answer.item === item.id)?.choice === item.answer, false);
    await activate('[data-practice-choice="' + item.answer + '"]');
    await activate('#practice-next');
  }
  assert.equal(await page(() => document.querySelector('#first-try-summary').textContent), firstSummary);
  assert.equal(await page(() => document.querySelector('.mastery-box').outerHTML), mastery);
  assert.deepEqual(await page(() => [...document.querySelectorAll('.review-answers')].map(node => node.textContent)), firstRows);
  assert.match(await page(() => document.querySelector('#practice-status').textContent), /3 of 3 correctly/);
  assert.equal(await page(() => document.querySelector('[data-reflection-item]').value), reflection);
  assert.equal(await page(() => document.querySelector('#application-reflection').value), application);
  assert.equal(await page(() => document.querySelectorAll('#session-content img').length), 0);
  const notes = await newDownload(() => activate('#save-notes-button'), '.txt');
  const saved = notes.toString('utf8');
  for (const item of deck.items) for (const text of [item.prompt, item.explanation, item.transfer]) assert.ok(saved.includes(text));
  for (const line of [...reflection.split('\n'), ...application.split('\n')]) assert.ok(saved.includes('  > ' + line));
  assert.ok(saved.includes('9 of 12 connections correct on the first try.'));
  assert.ok(saved.includes('Complete: 3 of 3 practice answers recorded; 3 correct on retry.'));
  assert.ok(saved.includes(deck.attribution));
  passed(label + ': three real retries preserve original answers/model and downloaded notes keep literal multiline reflections');

  await browserPage.setViewportSize({width: 390, height: 844});
  await page(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.equal((await state()).overflow, false, label + ' phone layout');
  await screenshot(label + '-learner-phone.png', '#first-try-summary');
  await browserPage.setViewportSize({width: 1280, height: 1050});
  await page(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await screenshot(label + '-learner-desktop.png', '#first-try-summary');
  report.learnerRuns ??= [];
  report.learnerRuns.push({label, url, firstAnswers: expected, firstSummary, mastery, practiceCount: 3, notesSha256: hash(notes)});
  const complete = await page(() => document.querySelector('#session-content').innerHTML);
  await chooseFile(coursePath);
  assert.equal(await page(() => document.querySelector('#session-content').innerHTML), complete);
  await activate('#cancel-deck');
  assert.equal(await page(() => document.querySelector('#session-content').innerHTML), complete);
  passed(label + ': 390px completed trace fits, and another preview/cancel retains the completed session');
}

try {
  browser = await chromium.launch({headless: true, ...(executable ? {executablePath: executable} : {})});
  report.browser = browser.version();
  const context = await browser.newContext({acceptDownloads: true, viewport: {width: 1280, height: 1050}});
  browserPage = await context.newPage();
  browserPage.setDefaultTimeout(15000);
  browserPage.on('pageerror', error => pageErrors.push(error.message));
  browserPage.on('request', request => pageRequests.push(request.url()));
  browserPage.on('console', message => {if (message.type() === 'error') consoleErrors.push(message.text());});
  browserPage.on('dialog', async dialog => {dialogs.push({type: dialog.type(), message: dialog.message()}); await dialog.dismiss();});
  server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      if (pathname === '/favicon.ico') { response.writeHead(204); response.end(); return; }
      const target = resolve(project, '.' + (pathname === '/' ? '/index.html' : pathname));
      if (!target.startsWith(project + sep)) { response.writeHead(403); response.end(); return; }
      const bytes = await readFile(target);
      const types = {'.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml'};
      response.writeHead(200, {'Content-Type': types[extname(target)] ?? 'application/octet-stream', 'Content-Length': bytes.length});
      response.end(bytes);
    } catch { response.writeHead(404); response.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = 'http://127.0.0.1:' + server.address().port;
  report.localOrigin = origin;
  const labUrl = pathToFileURL(join(project, 'courses/mendelian-inheritance-lab.html')).href;
  await navigate(labUrl, '#preset-two-heterozygous');
  await retired();
  await page(() => document.querySelector('#loci').focus());
  for (const expected of ['parent-1', 'parent-2', 'explore-cross']) {
    await key('Tab');
    assert.equal(await page(() => document.activeElement.id), expected);
  }
  await key('Enter');
  let value = await state();
  assert.equal(value.heading, 'Aa × Aa');
  assert.equal(value.focus, 'cross-heading');
  assert.deepEqual(value.genotypes, [['AA', '1', '1/4 · 25%'], ['Aa', '2', '1/2 · 50%'], ['aa', '1', '1/4 · 25%']]);
  assert.deepEqual(value.phenotypes, [['A_', '3', '3/4 · 75%'], ['aa', '1', '1/4 · 25%']]);
  await activate('#punnett button[data-row="0"][data-column="1"]');
  assert.match((await state()).route, /A \+ a; a \+ A/);
  assert.equal(await page(() => document.querySelectorAll('#punnett [aria-pressed="true"]').length), 1);
  passed('direct-file keyboard controls produce the two Aa routes and distinct genotype/phenotype fractions');
  await screenshot('lab-desktop.png', '#possibilities-title');
  const one = await newDownload(() => activate('#download-cross'), '.json');
  const oneRecord = JSON.parse(one);
  assert.equal(oneRecord.parent1, 'Aa'); assert.equal(oneRecord.parent2, 'Aa');
  assert.equal(oneRecord.cells.length, 4);
  assert.deepEqual(oneRecord.genotypes.find(row => row.label === 'Aa'), {label: 'Aa', routes: 2, numerator: 1, denominator: 2});
  assert.ok(oneRecord.assumptions.some(text => /not guaranteed counts/.test(text)));
  passed('a real cross JSON download retains distinct parental routes, exact fractions and assumptions');

  await selectAt('#parent-1', 0, 'AA');
  await retired();
  await activate('#explore-cross');
  assert.deepEqual((await state()).genotypes, [['AA', '1', '1/2 · 50%'], ['Aa', '1', '1/2 · 50%']]);
  for (const [preset, heading, phenotypes] of [
    ['one-test', 'Aa × aa', [['A_', '1', '1/2 · 50%'], ['aa', '1', '1/2 · 50%']]],
    ['two-asymmetric', 'AABb × Aabb', [['A_B_', '2', '1/2 · 50%'], ['A_bb', '2', '1/2 · 50%']]],
    ['two-heterozygous', 'AaBb × AaBb', [['A_B_', '9', '9/16 · 56.25%'], ['A_bb', '3', '3/16 · 18.75%'], ['aaB_', '3', '3/16 · 18.75%'], ['aabb', '1', '1/16 · 6.25%']]],
    ['two-complementary', 'AAbb × aaBB', [['A_B_', '1', '1 · 100%']]]
  ]) {
    await activate('#preset-' + preset); await retired(); await activate('#explore-cross');
    assert.equal((await state()).heading, heading);
    assert.deepEqual((await state()).phenotypes, phenotypes);
  }
  passed('real parent edits and all five presets require a new computation and use their own cross probabilities');

  await page(() => {
    const select = document.querySelector('#parent-1');
    const option = new Option('receiving invalid genotype', 'AaBbCc'); select.add(option); select.value = option.value;
    select.dispatchEvent(new Event('change', {bubbles: true}));
  });
  await retired(); await activate('#explore-cross');
  value = await state();
  assert.ok(value.error.length > 0); assert.equal(value.hidden, true); assert.equal(value.downloadDisabled, true);
  await activate('#preset-two-heterozygous'); await activate('#explore-cross');
  assert.equal((await state()).error, '');
  await page(() => { globalThis.receivingURL = URL.createObjectURL; URL.createObjectURL = () => { throw new Error('receiving allocation failure'); }; });
  await activate('#download-cross');
  assert.match(await page(() => document.querySelector('#cross-status').textContent), /could not start/);
  assert.equal((await state()).hidden, false);
  await page(() => { URL.createObjectURL = globalThis.receivingURL; delete globalThis.receivingURL; });
  const two = await newDownload(() => activate('#download-cross'), '.json');
  assert.equal(JSON.parse(two).cells.length, 16);
  assert.equal(JSON.parse(two).parent1, 'AaBb');
  passed('fault-injected invalid select state is refused, and a failed download allocation preserves a retryable current result');

  await browserPage.setViewportSize({width: 390, height: 844});
  await page(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  value = await state(); assert.equal(value.overflow, false);
  report.phoneLab = await page(() => ({viewport: innerWidth, scroll: document.documentElement.scrollWidth, table: document.querySelector('#punnett').getBoundingClientRect().toJSON()}));
  await screenshot('lab-phone-routes.png', '#cross-heading');
  await screenshot('lab-phone-probabilities.png', '#genotype-title');
  passed('the sixteen-route and probability tables remain usable at 390px without page overflow');

  const downloaded = await newDownload(() => activate('#download-course'), '.json');
  assert.equal(downloaded.equals(deckBytes), true);
  assert.deepEqual(parseDeck(downloaded.toString('utf8')), deck);
  const coursePath = join(downloads, report.downloads.at(-1).filename);
  report.courseFile = coursePath;
  passed('the lab downloads the exact checked original twelve-question course bytes');

  await navigate(origin + '/courses/mendelian-inheritance-lab.html', '#preset-one-test');
  await activate('#preset-two-asymmetric'); await activate('#explore-cross');
  assert.equal((await state()).heading, 'AABb × Aabb');
  assert.deepEqual((await state()).phenotypes, [['A_B_', '2', '1/2 · 50%'], ['A_bb', '2', '1/2 · 50%']]);
  passed('the same self-contained lab also executes from a local HTTP server');
  await learner(origin + '/index.html', 'modular', coursePath);
  await learner(pathToFileURL(join(project, 'demo.html')).href, 'standalone', coursePath);

  assert.ok(pageRequests.every(url => url.startsWith('file:') || url.startsWith('blob:') || url.startsWith('data:') || url.startsWith(origin + '/')), JSON.stringify(pageRequests));
  assert.deepEqual(pageErrors, []);
  report.requests = pageRequests;
  report.downloadEvents = downloadEvents;
  passed('all tested pages stay local and raise no uncaught browser exception');
  report.status = 'passed';

} catch (error) {
  report.status = 'failed'; report.error = error.stack ?? String(error);
  console.error(report.error); process.exitCode = 1;
  if (browserPage) {
    try {report.lastState = await state(); await screenshot('failed-state.png');} catch { /* Retain the original failure. */ }
  }
} finally {
  report.pageErrors = pageErrors; report.consoleErrors = consoleErrors; report.dialogs = dialogs;
  report.requests = pageRequests; report.downloadEvents = downloadEvents;
  if (pageErrors.length || consoleErrors.length || dialogs.length) {report.status = 'failed'; process.exitCode = 1;}
  await browser?.close();
  if (server) {server.closeAllConnections(); await new Promise(resolve => server.close(resolve));}
  report.sourcePinsStable = true;
  for (const [path, expected] of Object.entries(report.sourceSha256)) {
    if (hash(await readFile(join(project, path))) !== expected) {report.sourcePinsStable = false; report.status = 'failed'; process.exitCode = 1;}
  }
  report.finishedAt = new Date().toISOString();
  await writeFile(join(output, 'browser-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(report.status.toUpperCase() + ': ' + report.checks.length + ' browser checkpoints; ' + join(output, 'browser-report.json'));
}
