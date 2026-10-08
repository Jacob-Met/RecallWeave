#!/usr/bin/env node
/** Saved-file acceptance: the actual app, keyboard flow and browser download bytes. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const project = resolve(option('--root', join(dirname(fileURLToPath(import.meta.url)), '..')));
const executable = option('--browser', 'chromium');
const output = resolve(option('--output', join(project, 'browser-check')));
await mkdir(output, {recursive: true});
const downloadPath = join(output, 'downloads');
await mkdir(downloadPath, {recursive: true});
const downloads = new Map();
const profile = await mkdtemp(join(output, 'profile-'));
const report = {status: 'running', project, executable, checks: [], screenshots: [], downloads: [], sourceSha256: {}};
for (const path of ['src/app.mjs', 'src/knowledge.mjs', 'src/review.mjs', 'src/answer-order.mjs', 'src/session-export.mjs', 'data/deck.json', 'demo.html', 'styles.css', 'tools/make_demo.py']) {
  try { report.sourceSha256[path] = createHash('sha256').update(await readFile(join(project, path))).digest('hex'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
const deck = JSON.parse(await readFile(join(project, 'data/deck.json'), 'utf8'));
const {initialMastery, updateMastery} = await import(pathToFileURL(join(project, 'src/knowledge.mjs')));
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = resolve(project, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!file.startsWith(`${project}/`)) { response.writeHead(403).end(); return; }
    const body = await readFile(file);
    const mime = {'.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json'}[extname(file)];
    response.writeHead(200, {'Content-Type': `${mime ?? 'application/octet-stream'}; charset=utf-8`});
    response.end(body);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
let browser;
let socket;
let sessionId;
let browserLog = '';
const pageErrors = [];
let pageRequests = [];
const pending = new Map();
let sequence = 0;

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
async function waitFor(check, label) {
  let lastError;
  for (let step = 0; step < 160; step++) {
    try { if (await check()) return; } catch (error) { lastError = error; }
    await sleep(100);
  }
  throw new Error(`Timed out: ${label}${lastError ? ` (${lastError.message})` : ''}`);
}
function command(method, params = {}, scoped = true) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 10000);
    pending.set(id, {resolve, reject, timer});
    socket.send(JSON.stringify({id, method, params, ...(scoped && sessionId ? {sessionId} : {})}));
  });
}
async function evaluate(expression) {
  const result = await command('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true});
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  return result.result.value;
}
async function key(name, shift = false) {
  const code = name === 'Tab' ? 9 : 13;
  for (const type of ['keyDown', 'keyUp']) {
    await command('Input.dispatchKeyEvent', {
      type, key: name, code: name, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code,
      modifiers: shift ? 8 : 0,
      ...(name === 'Enter' && type === 'keyDown' ? {text: '\r', unmodifiedText: '\r'} : {})
    });
  }
}
async function activate(selector) {
  assert.ok(await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`), `Missing control ${selector}`);
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
  await key('Enter');
}
async function displayedOrder(practice = false) {
  const attribute = practice ? 'data-practice-choice' : 'data-choice';
  return evaluate(`[...document.querySelectorAll('[${attribute}]')].map(button => Number(button.getAttribute('${attribute}')))`);
}
async function chooseCanonical(choice, practice = false) {
  const order = await displayedOrder(practice);
  const attribute = practice ? 'data-practice-choice' : 'data-choice';
  assert.equal(await evaluate(`document.activeElement.getAttribute('${attribute}')`), String(order[0]), 'First displayed choice receives keyboard focus');
  const position = order.indexOf(choice);
  assert.ok(position >= 0, 'Requested canonical choice is displayed');
  for (let step = 0; step < position; step++) await key('Tab');
  await key('Enter');
}
let orderScript;
async function setOrderSeed(seed) {
  if (orderScript) await command('Page.removeScriptToEvaluateOnNewDocument', {identifier: orderScript});
  ({identifier: orderScript} = await command('Page.addScriptToEvaluateOnNewDocument', {source: `(() => { let state = ${seed} >>> 0; Math.random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; }; })();`}));
}
async function navigate(url, width = 1280, height = 1000) {
  await command('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: false});
  pageRequests = [];
  await command('Page.navigate', {url});
  await waitFor(() => evaluate(`document.URL === ${JSON.stringify(url)} && document.readyState === 'complete' && !!document.querySelector('#start-button')`), 'lesson welcome');
}
async function snapshot() {
  return evaluate(`({
    score: document.querySelector('.result-card > p')?.textContent,
    estimates: [...document.querySelectorAll('.mastery-box output')].map(node => node.textContent),
    reviewCount: document.querySelectorAll('.review-item').length,
    progress: document.querySelector('[role="progressbar"]').getAttribute('aria-valuenow'),
    focus: document.activeElement.tagName,
    overflow: document.documentElement.scrollWidth > innerWidth
  })`);
}
async function lesson(mode) {
  await activate('#start-button');
  await waitFor(() => evaluate(`!!document.querySelector('.question-card h2')`), 'first question after keyboard start');
  if (mode === 'mixed') await screenshot('answer-order-question.png', '.question-card');
  const firstAnswers = [];
  const estimates = initialMastery(deck.concepts);
  for (let index = 0; index < deck.items.length; index++) {
    const prompt = await evaluate(`document.querySelector('.question-card h2').textContent`);
    const item = deck.items.find(item => item.prompt === prompt);
    assert.ok(item, 'Question must come from the existing deck');
    const order = await displayedOrder();
    assert.deepEqual([...order].sort((a, b) => a - b), item.options.map((_, index) => index));
    const labels = await evaluate(`[...document.querySelectorAll('[data-choice]')].map(button => ({key: button.querySelector('.choice-key').textContent, text: button.textContent.slice(button.querySelector('.choice-key').textContent.length)}))`);
    assert.deepEqual(labels, order.map((choice, position) => ({key: String.fromCharCode(65 + position), text: item.options[choice]})));
    const correct = mode === 'correct' || (mode === 'mixed' && index % 2 === 1);
    const choice = correct ? item.answer : (item.answer + 1 + index % (item.options.length - 1)) % item.options.length;
    await chooseCanonical(choice);
    assert.equal(await evaluate('document.activeElement.id'), 'next-button');
    estimates[item.concept] = updateMastery(estimates[item.concept], correct);
    firstAnswers.push({item, choice, correct, order});
    await key('Enter');
  }
  const state = await snapshot();
  assert.deepEqual(state.estimates, deck.concepts.map(concept => `${Math.round(estimates[concept] * 100)}%`));
  assert.equal(state.progress, String(deck.items.length));
  return {firstAnswers, state};
}
async function screenshot(name, selector) {
  if (selector) await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'start'})`);
  const {data} = await command('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false});
  await writeFile(join(output, name), Buffer.from(data, 'base64'));
  report.screenshots.push(name);
}
async function savedNotes(name, firstAnswers, expectedPractice) {
  const stateBefore = await snapshot();
  const requestedBefore = [...pageRequests];
  const previous = new Set(downloads.keys());
  await activate('#save-notes-button');
  let download;
  await waitFor(() => {
    download = [...downloads.values()].find(value => !previous.has(value.guid) && value.state === 'completed');
    return !!download;
  }, `saved study notes: ${name}`);
  assert.match(download.suggestedFilename, /^recallweave-study-notes-\d{4}-\d{2}-\d{2}\.txt$/);
  const bytes = await readFile(join(downloadPath, download.guid));
  const content = new TextDecoder('utf-8', {fatal: true}).decode(bytes);
  assert.match(content, /MODEL STATE, NOT A GRADE/);
  assert.match(content, expectedPractice);
  assert.ok(content.includes(deck.attribution));
  assert.ok(content.includes(deck.license));
  let previousQuestion = -1;
  for (const {item, choice} of firstAnswers) {
    const start = content.indexOf(item.prompt);
    assert.ok(start > previousQuestion);
    previousQuestion = start;
    const end = content.indexOf('\n\n', start);
    const block = content.slice(start, end < 0 ? undefined : end);
    assert.ok(block.includes(`Your first answer: ${item.options[choice]}`));
    assert.ok(block.includes(`Correct answer: ${item.options[item.answer]}`));
    assert.ok(block.includes(`Explanation: ${item.explanation}`));
    assert.ok(block.includes(`Apply the idea: ${item.transfer}`));
  }
  const after = await snapshot();
  assert.equal(after.score, stateBefore.score);
  assert.deepEqual(after.estimates, stateBefore.estimates);
  assert.equal(await evaluate('document.activeElement.id'), 'save-notes-button');
  assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'), false);
  assert.match(await evaluate(`document.querySelector('#save-notes-status').textContent`), /Download requested/);
  assert.deepEqual(pageRequests, requestedBefore, 'Saving notes must not create a network request');
  await writeFile(join(output, name), bytes);
  report.downloads.push({name, suggestedFilename: download.suggestedFilename, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex')});
  passed(`actual keyboard download preserves original trace: ${name}`);
}
const passed = name => { report.checks.push(name); console.log(`PASS ${name}`); };

try {
  browser = spawn(executable, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-background-networking',
    '--disable-component-update', '--disable-sync', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'
  ], {stdio: ['ignore', 'ignore', 'pipe']});
  browser.stderr.on('data', data => { browserLog = (browserLog + data.toString()).slice(-6000); });
  let launchError;
  browser.on('error', error => { launchError = error; });
  let port;
  let endpoint;
  await waitFor(async () => {
    if (launchError) throw launchError;
    if (browser.exitCode !== null) throw new Error(`Browser exited ${browser.exitCode}: ${browserLog}`);
    [port, endpoint] = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).trim().split('\n');
    return Boolean(port && endpoint);
  }, 'browser startup');
  socket = new WebSocket(`ws://127.0.0.1:${port}${endpoint}`);
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      clearTimeout(request.timer);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result);
    } else if (message.method === 'Browser.downloadWillBegin' || message.method === 'Browser.downloadProgress') {
      const value = message.params;
      downloads.set(value.guid, {...downloads.get(value.guid), ...value});
    } else if (message.method === 'Runtime.exceptionThrown') {
      pageErrors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
    } else if (message.method === 'Network.requestWillBeSent') {
      pageRequests.push(message.params.request.url);
    }
  });
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, {once: true}); socket.addEventListener('error', reject, {once: true}); });
  report.browser = await command('Browser.getVersion', {}, false);
  await command('Browser.setDownloadBehavior', {behavior: 'allowAndName', downloadPath, eventsEnabled: true}, false);
  const {targetId} = await command('Target.createTarget', {url: 'about:blank'}, false);
  ({sessionId} = await command('Target.attachToTarget', {targetId, flatten: true}, false));
  await command('Page.enable');
  await command('Runtime.enable');
  await command('Network.enable');

  await setOrderSeed(41);
  await navigate(`${base}/index.html`);
  const {firstAnswers, state: original} = await lesson('mixed');
  report.firstTry = original;
  assert.equal(original.reviewCount, deck.items.length, 'Every original question remains available for review');
  assert.equal(original.focus, 'H2', 'Result heading receives focus');
  assert.equal(original.overflow, false);
  passed('modular lesson preserves native mastery and exposes all first answers');

  await savedNotes('modular-first-session.txt', firstAnswers, /Not started\. 3 missed connections/);
  await screenshot('study-notes-desktop.png', '#save-notes-title');
  await evaluate(`document.querySelector('.result-card h2').focus()`);

  await key('Tab');
  assert.equal(await evaluate('document.activeElement.id'), 'practice-button');
  await key('Tab');
  assert.equal(await evaluate('document.activeElement.tagName'), 'SUMMARY');
  await key('Enter');
  assert.equal(await evaluate(`document.querySelector('.review-item').open`), true);
  const values = await evaluate(`[...document.querySelectorAll('.review-item .review-answers dd')].slice(0, 2).map(node => node.textContent)`);
  assert.deepEqual(values, [firstAnswers[0].item.options[firstAnswers[0].choice], firstAnswers[0].item.options[firstAnswers[0].item.answer]]);
  await screenshot('review-desktop.png', '.result-card');
  passed('Enter and Tab open review with the original selected answer and correction');

  await key('Tab', true);
  assert.equal(await evaluate('document.activeElement.id'), 'practice-button');
  await key('Enter');
  const missed = firstAnswers.filter(answer => !answer.correct);
  assert.equal(await evaluate(`document.querySelector('.practice-card h2').textContent`), missed[0].item.prompt);
  assert.equal(await evaluate(`document.querySelector('[role="progressbar"]').getAttribute('aria-valuemax')`), String(missed.length));
  assert.deepEqual(await displayedOrder(true), missed[0].order, 'Practice reuses the first-session order');
  await chooseCanonical(missed[0].item.answer, true);
  assert.equal(await evaluate('document.activeElement.id'), 'practice-next');
  await key('Tab');
  assert.equal(await evaluate('document.activeElement.id'), 'back-to-review');
  await key('Enter');
  assert.match(await evaluate(`document.querySelector('#practice-status').textContent`), /1 of 3 answered/);
  assert.deepEqual((await snapshot()).estimates, original.estimates);
  assert.equal((await snapshot()).score, original.score);
  passed('leaving after a retry retains separate practice state and original estimates');
  await savedNotes('modular-paused-practice.txt', firstAnswers, /Paused: 1 of 3 practice answers recorded; 1 correct on retry/);

  await activate('#practice-button');
  assert.equal(await evaluate(`document.querySelector('.practice-card h2').textContent`), missed[1].item.prompt);
  for (let step = 0; step < missed[1].item.options.length; step++) await key('Tab');
  assert.equal(await evaluate('document.activeElement.id'), 'back-to-review');
  await key('Enter');
  assert.match(await evaluate(`document.querySelector('#practice-status').textContent`), /1 of 3 answered/);
  await activate('#practice-button');
  assert.equal(await evaluate(`document.querySelector('.practice-card h2').textContent`), missed[1].item.prompt);
  passed('leaving before answering resumes the same unanswered practice question');

  assert.deepEqual(await displayedOrder(true), missed[1].order);
  await chooseCanonical((missed[1].item.answer + 1) % missed[1].item.options.length, true);
  await key('Enter');
  assert.equal(await evaluate(`document.querySelector('.practice-card h2').textContent`), missed[2].item.prompt);
  assert.deepEqual(await displayedOrder(true), missed[2].order);
  await chooseCanonical(missed[2].item.answer, true);
  await key('Enter');
  const completed = await snapshot();
  assert.equal(completed.score, original.score);
  assert.deepEqual(completed.estimates, original.estimates);
  assert.equal(completed.focus, 'H2');
  assert.match(await evaluate(`document.querySelector('#practice-status').textContent`), /2 of 3 correctly on retry/);
  assert.equal(await evaluate(`document.querySelectorAll('.review-practice-answer').length`), 3);
  assert.equal(await evaluate(`document.querySelectorAll('.review-status.needs-review').length`), 3);
  assert.equal(await evaluate(`!!document.querySelector('#practice-button')`), false);
  passed('one bounded retry round records success and failure without rewriting the first try');
  await savedNotes('modular-completed-practice.txt', firstAnswers, /Complete: 3 of 3 practice answers recorded; 2 correct on retry/);

  await evaluate('window.originalCreateObjectURL = URL.createObjectURL; URL.createObjectURL = () => { throw new Error("Synthetic unavailable download"); }');
  const downloadsBeforeFailure = downloads.size;
  await activate('#save-notes-button');
  assert.match(await evaluate(`document.querySelector('#save-notes-status').textContent`), /could not be prepared/);
  assert.equal(downloads.size, downloadsBeforeFailure);
  assert.deepEqual((await snapshot()).estimates, original.estimates);
  await evaluate('URL.createObjectURL = window.originalCreateObjectURL; delete window.originalCreateObjectURL');
  await savedNotes('modular-download-retry.txt', firstAnswers, /Complete: 3 of 3 practice answers recorded/);
  passed('download preparation failure preserves the session and a later retry works');

  await navigate(`${base}/index.html`, 390, 844);
  const allCorrect = await lesson('correct');
  assert.equal(allCorrect.state.reviewCount, 6);
  assert.equal(allCorrect.state.overflow, false);
  assert.equal(await evaluate(`!!document.querySelector('#practice-button')`), false);
  assert.equal(await evaluate(`document.querySelectorAll('.review-status.needs-review').length`), 0);
  await activate('.review-item:last-child summary');
  assert.equal(await evaluate(`document.documentElement.scrollWidth > innerWidth`), false);
  await screenshot('review-mobile.png', '.review-item:last-child');
  passed('390px layout has no horizontal overflow and all-correct sessions remain reviewable');
  await savedNotes('mobile-all-correct.txt', allCorrect.firstAnswers, /No missed connections/);
  await screenshot('study-notes-mobile.png', '#save-notes-title');

  await setOrderSeed(83);
  await navigate(pathToFileURL(join(project, 'demo.html')).href);
  const direct = await lesson('missed');
  assert.ok(direct.firstAnswers.some(({item, order}) => JSON.stringify(order) !== JSON.stringify(firstAnswers.find(row => row.item.id === item.id).order)), 'Changed session input changes the deck presentation in this deterministic fixture');
  report.answerPresentation = {testOnlySeeds: [41, 83], initialOrders: firstAnswers.map(({item, order}) => ({id: item.id, order})), changedOrders: direct.firstAnswers.map(({item, order}) => ({id: item.id, order}))};
  assert.equal(direct.state.reviewCount, 6);
  assert.match(await evaluate(`document.querySelector('#practice-button').textContent`), /Practice 6 missed connections/);
  await activate('#practice-button');
  for (let index = 0; index < 6; index++) {
    const originalItem = direct.firstAnswers[index];
    assert.deepEqual(await displayedOrder(true), originalItem.order);
    await chooseCanonical(originalItem.item.answer, true);
    await key('Enter');
  }
  assert.equal((await snapshot()).score, direct.state.score);
  assert.deepEqual((await snapshot()).estimates, direct.state.estimates);
  assert.match(await evaluate(`document.querySelector('#practice-status').textContent`), /6 of 6 correctly on retry/);
  assert.ok(pageRequests.every(url => url.startsWith('file:')), 'Direct-open demo must not request a hosted resource');
  passed('standalone file completes review and practice with no hosted requests');
  await savedNotes('standalone-completed-practice.txt', direct.firstAnswers, /Complete: 6 of 6 practice answers recorded; 6 correct on retry/);
  assert.deepEqual(pageErrors, []);
  passed('all tested rendered paths have no JavaScript exceptions');
  report.status = 'passed';
} catch (error) {
  report.status = 'failed';
  report.error = error.stack ?? String(error);
  report.browserLog = browserLog;
  report.pageErrors = pageErrors;
  if (sessionId) {
    try {
      report.lastPage = await evaluate(`({url: location.href, ready: document.readyState, focus: document.activeElement.outerHTML, text: document.body.innerText.slice(0, 6000)})`);
      await screenshot('failed-state.png');
    } catch { /* Preserve the original failure when the browser is unavailable. */ }
  }
  console.error(report.error);
  process.exitCode = 1;
} finally {
  if (socket?.readyState === WebSocket.OPEN) {
    try { await command('Browser.close', {}, false); } catch { /* Browser may already have exited. */ }
  }
  socket?.close();
  for (const request of pending.values()) clearTimeout(request.timer);
  if (browser && browser.exitCode === null) browser.kill('SIGTERM');
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  await sleep(300);
  await rm(profile, {recursive: true, force: true});
  await writeFile(join(output, 'browser-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`${report.status.toUpperCase()}: ${report.checks.length} browser checkpoints; ${join(output, 'browser-report.json')}`);
}
