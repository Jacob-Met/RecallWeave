#!/usr/bin/env node
/** Optional direct-file receiving using Node 22+ and an installed Chromium, with no downloaded dependency. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir, mkdtemp, readdir, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseDeck } from '../src/deck.mjs';

// Uses the existing tools/check_browser.mjs dependency-free CDP pattern.
const args = process.argv.slice(2);
const option = (flag, fallback) => args.includes(flag) ? args[args.indexOf(flag) + 1] : fallback;
const project = resolve(option('--root', join(dirname(fileURLToPath(import.meta.url)), '..')));
const executable = option('--browser', 'chromium');
const output = resolve(option('--output', join(project, 'stoichiometry-browser-check')));
const profileRoot = resolve(option('--profile-root', tmpdir()));
const downloads = join(output, 'downloads');
await mkdir(downloads, {recursive: true});
assert.deepEqual(await readdir(downloads), [], 'Use a fresh output directory so earlier downloads cannot satisfy this run.');
const profile = await mkdtemp(join(profileRoot, 'recallweave-stoichiometry-'));
const report = {status: 'running', startedAt: new Date().toISOString(), project, executable, profile, checks: [], screenshots: [], downloads: [], sourceSha256: {}};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
for (const path of ['courses/stoichiometry-explorer.html', 'courses/stoichiometry-foundations.json', 'src/stoichiometry.mjs', 'src/stoichiometry-ui.mjs', 'src/stoichiometry-page.mjs', 'tools/build_stoichiometry_explorer.mjs', 'tools/check_stoichiometry_browser.mjs']) {
  report.sourceSha256[path] = hash(await readFile(join(project, path)));
}
const deckBytes = await readFile(join(project, 'courses/stoichiometry-foundations.json'));
const deck = parseDeck(deckBytes.toString('utf8'));
const pending = new Map();
const pageErrors = [];
const pageRequests = [];
const downloadEvents = [];
let browser, socket, sessionId, sequence = 0, browserLog = '';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(check, label) {
  let lastError;
  for (let step = 0; step < 120; step++) {
    try { if (await check()) return; } catch (error) { lastError = error; }
    await delay(100);
  }
  throw new Error('Timed out: ' + label + (lastError ? ' (' + lastError.message + ')' : ''));
}
function command(method, params = {}, scoped = true) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 10000);
    pending.set(id, {resolve, reject, timer});
    socket.send(JSON.stringify({id, method, params, ...(scoped && sessionId ? {sessionId} : {})}));
  });
}
async function page(fn, ...args) {
  const response = await command('Runtime.evaluate', {expression: '(' + fn.toString() + ')(...' + JSON.stringify(args) + ')', returnByValue: true, awaitPromise: true});
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text);
  return response.result.value;
}
async function key(name, modifiers = 0) {
  const codes = {Tab: 9, Enter: 13, Home: 36, ArrowDown: 40, a: 65};
  for (const type of ['keyDown', 'keyUp']) await command('Input.dispatchKeyEvent', {
    type, key: name, code: name === 'a' ? 'KeyA' : name, windowsVirtualKeyCode: codes[name], nativeVirtualKeyCode: codes[name], modifiers,
    ...(name === 'Enter' && type === 'keyDown' ? {text: '\r', unmodifiedText: '\r'} : {})
  });
}
async function activate(selector) {
  assert.equal(await page(selector => Boolean(document.querySelector(selector)), selector), true, selector);
  await page(selector => document.querySelector(selector).focus(), selector);
  await key('Enter');
}
async function setAmount(selector, text) {
  await page(selector => document.querySelector(selector).focus(), selector);
  await key('a', 2);
  await command('Input.insertText', {text});
  assert.equal(await page(selector => document.querySelector(selector).value, selector), text);
}
async function selectAt(selector, index, expected) {
  await page(selector => document.querySelector(selector).focus(), selector);
  await key('Home');
  for (let step = 0; step < index; step++) await key('ArrowDown');
  assert.equal(await page(selector => document.querySelector(selector).value, selector), expected);
}
async function state() {
  return page(() => ({
    resultHidden: document.querySelector('#result').hidden,
    pendingHidden: document.querySelector('#pending').hidden,
    downloadDisabled: document.querySelector('#download-record').disabled,
    error: document.querySelector('#calculation-error').textContent,
    outcome: document.querySelector('#outcome').textContent,
    product: document.querySelector('#product-amount').textContent,
    rows: [...document.querySelectorAll('#balance tr')].map(row => [...row.children].map(cell => cell.textContent)),
    prediction: document.querySelector('#prediction-feedback').textContent,
    recordStatus: document.querySelector('#record-status').textContent,
    focus: document.activeElement.id,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
  }));
}
async function compare() {
  await activate('#reaction-form button[type="submit"]');
  return state();
}
async function retired() {
  const value = await state();
  assert.equal(value.resultHidden, true);
  assert.equal(value.pendingHidden, false);
  assert.equal(value.downloadDisabled, true);
}
async function screenshot(name, selector) {
  await page(selector => selector ? document.querySelector(selector).scrollIntoView({block: 'start'}) : window.scrollTo(0, 0), selector ?? null);
  const {data} = await command('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false});
  const bytes = Buffer.from(data, 'base64');
  await writeFile(join(output, name), bytes);
  report.screenshots.push({name, bytes: bytes.length, sha256: hash(bytes)});
}
let downloadSequence = 0;
async function newDownload(action, extension) {
  const folder = String(++downloadSequence).padStart(2, '0');
  const target = join(downloads, folder);
  await mkdir(target);
  await command('Browser.setDownloadBehavior', {behavior: 'allow', downloadPath: target, eventsEnabled: true}, false);
  const eventStart = downloadEvents.length;
  await action();
  let begun, completed;
  await waitFor(() => {
    const current = downloadEvents.slice(eventStart);
    begun = current.find(event => event.method === 'Browser.downloadWillBegin');
    if (!begun) return false;
    completed = current.find(event => event.method === 'Browser.downloadProgress' && event.params.guid === begun.params.guid && event.params.state === 'completed');
    return Boolean(completed);
  }, 'actual ' + extension + ' download');
  const filename = begun.params.suggestedFilename;
  assert.equal(filename.endsWith(extension), true);
  assert.equal(completed.params.filePath, join(target, filename));
  const bytes = await readFile(join(target, filename));
  assert.equal(bytes.length, completed.params.totalBytes);
  assert.equal(bytes.length, completed.params.receivedBytes);
  report.downloads.push({filename: folder + '/' + filename, guid: begun.params.guid, bytes: bytes.length, sha256: hash(bytes)});
  return bytes;
}
const passed = name => { report.checks.push(name); console.log('PASS ' + name); };

try {
  browser = spawn(executable, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-background-networking',
    '--disable-component-update', '--disable-sync', '--no-first-run', '--no-default-browser-check',
    '--disk-cache-size=1048576', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0',
    '--user-data-dir=' + profile, 'about:blank'
  ], {stdio: ['ignore', 'ignore', 'pipe']});
  browser.stderr.on('data', bytes => { browserLog = (browserLog + bytes.toString()).slice(-8000); });
  let launchError;
  browser.on('error', error => { launchError = error; });
  let port, endpoint;
  await waitFor(async () => {
    if (launchError) throw launchError;
    if (browser.exitCode !== null) throw new Error('Browser exited ' + browser.exitCode + ': ' + browserLog);
    [port, endpoint] = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).trim().split('\n');
    return Boolean(port && endpoint);
  }, 'installed browser startup');
  socket = new WebSocket('ws://127.0.0.1:' + port + endpoint);
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      clearTimeout(request.timer);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result);
    } else if (message.method === 'Runtime.exceptionThrown') pageErrors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
    else if (message.method === 'Network.requestWillBeSent') pageRequests.push(message.params.request.url);
    else if (message.method?.startsWith('Browser.download')) downloadEvents.push(message);
  });
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, {once: true});
    socket.addEventListener('error', reject, {once: true});
  });
  report.browser = await command('Browser.getVersion', {}, false);
  await command('Browser.setDownloadBehavior', {behavior: 'allow', downloadPath: downloads, eventsEnabled: true}, false);
  const {targetId} = await command('Target.createTarget', {url: 'about:blank'}, false);
  ({sessionId} = await command('Target.attachToTarget', {targetId, flatten: true}, false));
  await command('Page.enable');
  await command('Runtime.enable');
  await command('Network.enable');
  await command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 1050, deviceScaleFactor: 1, mobile: false});
  const url = pathToFileURL(join(project, 'courses/stoichiometry-explorer.html')).href;
  await command('Page.navigate', {url});
  await waitFor(() => page(url => document.URL === url && document.readyState === 'complete' && document.querySelector('#reaction')?.options.length === 3, url), 'direct-file initialization');
  await retired();
  assert.equal(await page(() => document.querySelector('#prediction').value), '');
  passed('one direct-open file initializes with three reactions and no fabricated result');

  await page(() => document.querySelector('#reaction').focus());
  for (const expected of ['amount-first', 'amount-second', 'prediction']) {
    await key('Tab');
    assert.equal(await page(() => document.activeElement.id), expected);
  }
  await key('Tab');
  assert.equal(await page(() => document.activeElement.type), 'submit');
  await key('Enter');
  let value = await state();
  assert.equal(value.product, '4 mol');
  assert.deepEqual(value.rows, [['H₂', '6', '4', '2'], ['O₂', '2', '2', '0']]);
  assert.equal(value.focus, 'outcome');
  assert.match(value.outcome, /Oxygen limits/);
  assert.equal(value.overflow, false);
  passed('keyboard Tab and Enter calculate theoretical product, preserve excess and focus the result');

  await selectAt('#prediction', 2, 'second');
  await retired();
  value = await compare();
  assert.match(value.prediction, /agrees/);
  await screenshot('stoichiometry-desktop.png');
  const initialRecord = await newDownload(() => activate('#download-record'), '.txt');
  for (const text of ['2 H₂ + O₂ → 2 H₂O', 'Prediction: Oxygen alone limits with product formed', 'Theoretical H₂O: 2 × 2 = 4 mol', 'H₂: 6 mol initially; 4 mol consumed; 2 mol remaining', 'not a prediction of experimental yield']) assert.ok(initialRecord.toString('utf8').includes(text), text);
  passed('an actual UTF-8 worked-record download contains the displayed numbers and prediction');

  for (const invalid of ['1e2', '', '1000.001']) {
    await setAmount('#amount-first', invalid);
    await retired();
    value = await compare();
    assert.ok(value.error.length > 0);
    assert.equal(value.resultHidden, true);
    assert.equal(value.downloadDisabled, true);
  }
  await setAmount('#amount-first', '2');
  await setAmount('#amount-second', '2');
  value = await compare();
  assert.equal(value.error, '');
  assert.equal(value.product, '2 mol');
  assert.match(value.prediction, /differs/);
  assert.deepEqual(value.rows, [['H₂', '2', '2', '0'], ['O₂', '2', '1', '1']]);
  passed('invalid edits retire prior output and a corrected retry uses the current quantities');

  await selectAt('#prediction', 1, 'first');
  await retired();
  value = await compare();
  assert.match(value.prediction, /agrees/);
  for (const [selector, product, rows, outcome] of [
    ['#example-equal', '2 mol', [['H₂', '2', '2', '0'], ['O₂', '2', '1', '1']], /Hydrogen limits/],
    ['#example-ratio', '4 mol', [['H₂', '4', '4', '0'], ['O₂', '2', '2', '0']], /neither reactant remains/],
    ['#example-zero', '0 mol', [['H₂', '0', '0', '0'], ['O₂', '5', '0', '5']], /No product can form/]
  ]) {
    await activate(selector);
    await retired();
    value = await compare();
    assert.equal(value.product, product);
    assert.deepEqual(value.rows, rows);
    assert.match(value.outcome, outcome);
  }
  await setAmount('#amount-second', '0');
  value = await compare();
  assert.equal(value.product, '0 mol');
  assert.match(value.outcome, /No product can form/);
  passed('prediction changes and all three presets require recomparison, including the both-zero boundary');

  await selectAt('#reaction', 1, 'ammonia');
  await retired();
  value = await compare();
  assert.equal(value.product, '2 mol');
  assert.deepEqual(value.rows, [['N₂', '2', '1', '1'], ['H₂', '3', '3', '0']]);
  await setAmount('#amount-first', '.001');
  await setAmount('#amount-second', '.001');
  value = await compare();
  assert.equal(value.product, '0.00066666667 mol');
  assert.equal(value.rows[0][3], '0.00066666667');
  await command('Emulation.setDeviceMetricsOverride', {width: 390, height: 844, deviceScaleFactor: 1, mobile: false});
  await waitFor(() => page(() => innerWidth === 390), '390px viewport');
  await page(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  report.mobileLayout = await page(() => ({viewport: innerWidth, client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth, productRight: document.querySelector('#product-amount').getBoundingClientRect().right, cardRight: document.querySelector('#product-amount').closest('.card').getBoundingClientRect().right}));
  assert.equal((await state()).overflow, false, JSON.stringify(report.mobileLayout));
  assert.ok(report.mobileLayout.productRight <= report.mobileLayout.cardRight, 'The full product amount must remain inside its card.');
  await screenshot('stoichiometry-mobile.png', '#result-section-title');
  passed('reaction change uses the new coefficients and 390px fractional-result layout has no horizontal overflow');

  await selectAt('#reaction', 2, 'magnesium');
  value = await compare();
  assert.equal(value.product, '1.5 mol');
  assert.deepEqual(value.rows, [['Mg', '1.5', '1.5', '0'], ['O₂', '1', '0.75', '0.25']]);
  const beforeFailure = await readdir(downloads);
  await page(() => {
    globalThis.receivingCreateObjectURL = URL.createObjectURL;
    URL.createObjectURL = () => { throw new Error('receiving allocation failure'); };
  });
  await activate('#download-record');
  assert.match((await state()).recordStatus, /could not start/);
  assert.equal((await state()).resultHidden, false);
  assert.deepEqual(await readdir(downloads), beforeFailure);
  await page(() => { URL.createObjectURL = globalThis.receivingCreateObjectURL; delete globalThis.receivingCreateObjectURL; });
  const retryRecord = await newDownload(() => activate('#download-record'), '.txt');
  assert.match(retryRecord.toString('utf8'), /Theoretical MgO: 2 × 0.75 = 1.5 mol/);
  assert.match(retryRecord.toString('utf8'), /O₂: 1 mol initially; 0.75 mol consumed; 0.25 mol remaining/);
  passed('a download-allocation failure retains the displayed result and a real retry exports current magnesium quantities');

  const downloadedCourse = await newDownload(() => activate('#download-course'), '.json');
  assert.deepEqual(parseDeck(downloadedCourse.toString('utf8')), deck);
  assert.equal(downloadedCourse.equals(deckBytes), true);
  assert.match(await page(() => document.querySelector('#course-status').textContent), /Download requested/);
  passed('actual JSON download matches every byte of the validated 12-question companion course');

  assert.ok(pageRequests.every(url => url.startsWith('file:') || url.startsWith('blob:')), JSON.stringify(pageRequests));
  assert.deepEqual(pageErrors, []);
  report.requests = pageRequests;
  report.downloadEvents = downloadEvents;
  passed('tested direct-file paths perform no hosted request and raise no page exception');
  report.status = 'passed';
} catch (error) {
  report.status = 'failed';
  report.error = error.stack ?? String(error);
  report.browserLog = browserLog;
  report.pageErrors = pageErrors;
  report.requests = pageRequests;
  report.downloadEvents = downloadEvents;
  if (sessionId) {
    try { report.lastState = await state(); await screenshot('failed-state.png'); } catch { /* Keep the original failure. */ }
  }
  console.error(report.error);
  process.exitCode = 1;
} finally {
  if (socket?.readyState === WebSocket.OPEN) {
    try { await command('Browser.close', {}, false); } catch { /* Browser may have exited. */ }
  }
  socket?.close();
  for (const request of pending.values()) clearTimeout(request.timer);
  if (browser && browser.exitCode === null) browser.kill('SIGTERM');
  await delay(500);
  try { await rm(profile, {recursive: true}); report.profileRemoved = true; }
  catch (error) { report.profileRemoved = false; report.cleanupError = error.message; }
  report.finishedAt = new Date().toISOString();
  await writeFile(join(output, 'browser-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(report.status.toUpperCase() + ': ' + report.checks.length + ' browser checkpoints; ' + join(output, 'browser-report.json'));
}
