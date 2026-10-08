#!/usr/bin/env node
/** Trace-file acceptance: actual downloads, fresh documents, explicit restore and bounded retries. */
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
const report = {status: 'running', project, executable, checks: [], screenshots: [], downloads: [], sourceSha256: {}, node: process.version, platform: process.platform, architecture: process.arch};
for (const path of ['src/app.mjs', 'src/knowledge.mjs', 'src/review.mjs', 'src/session-export.mjs', 'src/answer-order.mjs', 'src/trace-archive.mjs', 'src/trace-archive-ui.mjs', 'tools/check_trace_browser.mjs', 'data/deck.json', 'demo.html', 'styles.css', 'tools/make_demo.py']) {
  try { report.sourceSha256[path] = createHash('sha256').update(await readFile(join(project, path))).digest('hex'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
const deck = JSON.parse(await readFile(join(project, 'data/deck.json'), 'utf8'));
const {initialMastery, updateMastery} = await import(pathToFileURL(join(project, 'src/knowledge.mjs')));
const {readTraceArchive} = await import(pathToFileURL(join(project, 'src/trace-archive.mjs')));
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
  const firstAnswers = [];
  const estimates = initialMastery(deck.concepts);
  for (let index = 0; index < deck.items.length; index++) {
    const prompt = await evaluate(`document.querySelector('.question-card h2').textContent`);
    const item = deck.items.find(item => item.prompt === prompt);
    assert.ok(item, 'Question must come from the existing deck');
    const correct = mode === 'correct' || (mode === 'mixed' && index % 2 === 1);
    const choice = correct ? item.answer : (item.answer + 1 + index % (item.options.length - 1)) % item.options.length;
    await activate('[data-choice="' + choice + '"]');
    assert.equal(await evaluate('document.activeElement.id'), 'next-button');
    estimates[item.concept] = updateMastery(estimates[item.concept], correct);
    firstAnswers.push({item, choice, correct});
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
async function learningState() {
  return evaluate("({first:document.querySelector('#first-try-summary')?.textContent ?? null,"
    + "mastery:[...document.querySelectorAll('.mastery-box output')].map(node=>node.textContent),"
    + "answers:[...document.querySelectorAll('.review-answers')].map(node=>node.textContent),"
    + "practice:document.querySelector('#practice-status')?.textContent ?? null,"
    + "retries:[...document.querySelectorAll('.review-practice-answer')].map(node=>node.textContent),"
    + "progress:document.querySelector('[role=progressbar]').getAttribute('aria-valuenow')})");
}
async function openArchive() {
  if (!await evaluate("document.querySelector('#trace-archive-panel').open")) await activate('#trace-archive-panel > summary');
}
async function chooseFile(path) {
  const {root} = await command('DOM.getDocument');
  const {nodeId} = await command('DOM.querySelector', {nodeId: root.nodeId, selector: '#trace-file'});
  await command('DOM.setFileInputFiles', {nodeId, files: [path]});
}
async function previewFile(path) {
  await chooseFile(path);
  await waitFor(() => evaluate("!document.querySelector('#trace-preview').hidden"), 'trace preview');
}
async function savedTrace(name) {
  await openArchive();
  const before = await learningState();
  const previous = new Set(downloads.keys());
  await activate('#save-trace-button');
  let download;
  await waitFor(() => {
    download = [...downloads.values()].find(value => !previous.has(value.guid) && value.state === 'completed');
    return !!download;
  }, 'learning trace download: ' + name);
  assert.match(download.suggestedFilename, /^recallweave-learning-trace-\d{4}-\d{2}-\d{2}\.json$/);
  const path = join(downloadPath, download.guid);
  const bytes = await readFile(path);
  const text = new TextDecoder('utf-8', {fatal: true}).decode(bytes);
  const restored = readTraceArchive(text, deck);
  assert.deepEqual(await learningState(), before, 'Saving must leave the rendered lesson unchanged');
  await writeFile(join(output, name), bytes);
  report.downloads.push({name, suggestedFilename: download.suggestedFilename, bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex')});
  return {path, bytes, document: JSON.parse(text), restored};
}
async function newDocument(url, width = 1280, height = 1000) {
  if (activeTargetId) await command('Target.closeTarget', {targetId: activeTargetId}, false);
  ({targetId: activeTargetId} = await command('Target.createTarget', {url: 'about:blank'}, false));
  ({sessionId} = await command('Target.attachToTarget', {targetId: activeTargetId, flatten: true}, false));
  await command('Page.enable');
  await command('Runtime.enable');
  await command('Network.enable');
  await navigate(url, width, height);
  await openArchive();
  assert.equal(await evaluate("document.querySelector('#save-trace-button').disabled"), true);
  assert.equal((await learningState()).progress, '0');
}
async function holdNextFileRead() {
  await evaluate("window.traceOriginalFileText = File.prototype.text;"
    + "File.prototype.text = function(){const file=this; return new Promise(resolve=>{"
    + "window.releaseTraceRead=async()=>resolve(await window.traceOriginalFileText.call(file));});};");
}
async function resumeFileReads() {
  await evaluate("File.prototype.text = window.traceOriginalFileText;");
}
async function answerOneFirstQuestion() {
  await activate('#start-button');
  await waitFor(() => evaluate("!!document.querySelector('[data-choice]')"), 'active question');
  await activate('[data-choice="1"]');
  assert.equal((await learningState()).progress, '1');
}
const passed = name => { report.checks.push(name); console.log('PASS ' + name); };
let activeTargetId;

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

  await newDocument(base + '/index.html');
  const first = await lesson('mixed');
  const missed = first.firstAnswers.filter(answer => !answer.correct);
  const unstarted = await savedTrace('modular-unstarted-trace.json');
  assert.equal(unstarted.restored.practice, null);
  assert.deepEqual(unstarted.restored.answers.map(answer => ({item: answer.item, choice: answer.choice})),
    first.firstAnswers.map(answer => ({item: answer.item.id, choice: answer.choice})));
  passed('actual downloaded JSON preserves canonical first choices and unrounded estimates');

  await activate('#practice-button');
  await activate('[data-practice-choice="' + missed[0].item.answer + '"]');
  await activate('#back-to-review');
  const pausedState = await learningState();
  const paused = await savedTrace('modular-paused-trace.json');
  assert.equal(paused.restored.practice.answers.length, 1);
  assert.equal(paused.restored.practice.answers[0].item, missed[0].item.id);
  assert.deepEqual(paused.document.firstAnswers, unstarted.document.firstAnswers);
  assert.deepEqual(paused.document.mastery, unstarted.document.mastery);
  passed('paused practice download retains first answers and the exact original model');

  await newDocument(base + '/index.html');
  const empty = await learningState();
  const requestsBeforePreview = [...pageRequests];
  await previewFile(paused.path);
  assert.deepEqual(await learningState(), empty, 'Preview must not restore state');
  assert.match(await evaluate("document.querySelector('#trace-preview-summary').textContent"), /Practice: 1 of 3/);
  assert.equal(await evaluate('document.activeElement.id'), 'trace-preview-title');
  await screenshot('trace-preview-desktop.png', '#trace-archive-panel');
  await activate('#restore-trace-cancel');
  assert.deepEqual(await learningState(), empty, 'Cancel must not restore state');
  assert.equal(await evaluate("document.querySelector('#trace-preview').hidden"), true);
  assert.deepEqual(pageRequests, requestsBeforePreview, 'Choosing/previewing/canceling a local file sends no request');
  passed('fresh document previews and cancels a real downloaded file without replacing the lesson');

  const corruptPath = join(output, 'corrupt-trace-fixture.json');
  const mismatchPath = join(output, 'mismatched-trace-fixture.json');
  await writeFile(corruptPath, '{"format":');
  const mismatch = structuredClone(paused.document);
  mismatch.deck.items[0].explanation += ' <img src=x onerror=window.archiveInjected=true>';
  await writeFile(mismatchPath, JSON.stringify(mismatch));
  for (const [path, pattern] of [[corruptPath, /not valid learning trace JSON/], [mismatchPath, /different course/]]) {
    await chooseFile(path);
    await waitFor(() => evaluate("document.querySelector('#trace-restore-status').textContent.includes('unchanged')"), 'refused file');
    assert.match(await evaluate("document.querySelector('#trace-restore-status').textContent"), pattern);
    assert.deepEqual(await learningState(), empty);
    assert.equal(await evaluate("document.querySelector('#trace-preview').hidden"), true);
    assert.equal(await evaluate('window.archiveInjected === true'), false);
  }
  passed('corrupt and changed-course files are refused without applying answers or archived markup');

  await previewFile(paused.path);
  await answerOneFirstQuestion();
  const oneAnswer = await learningState();
  assert.equal(await evaluate("document.querySelector('#trace-preview').hidden"), true);
  assert.match(await evaluate("document.querySelector('#trace-restore-status').textContent"), /lesson changed/);
  await evaluate("document.querySelector('#restore-trace-confirm').click()");
  assert.deepEqual(await learningState(), oneAnswer);
  passed('answering after preview invalidates confirmation and preserves the newer answer');

  await newDocument(base + '/index.html');
  await holdNextFileRead();
  await chooseFile(paused.path);
  await waitFor(() => evaluate("typeof window.releaseTraceRead === 'function'"), 'held file read');
  await answerOneFirstQuestion();
  const duringRead = await learningState();
  await resumeFileReads();
  await evaluate('window.releaseTraceRead()');
  assert.equal(await evaluate("document.querySelector('#trace-preview').hidden"), true);
  assert.deepEqual(await learningState(), duringRead);
  assert.match(await evaluate("document.querySelector('#trace-restore-status').textContent"), /lesson changed/);
  passed('an answer arriving during a file read survives the stale read completion');

  await newDocument(base + '/index.html');
  await holdNextFileRead();
  await chooseFile(unstarted.path);
  await waitFor(() => evaluate("typeof window.releaseTraceRead === 'function'"), 'older held file read');
  await resumeFileReads();
  await previewFile(paused.path);
  const newerPreview = await evaluate("document.querySelector('#trace-preview-summary').textContent");
  await evaluate('window.releaseTraceRead()');
  assert.equal(await evaluate("document.querySelector('#trace-preview-summary').textContent"), newerPreview);
  assert.match(newerPreview, /Practice: 1 of 3/);
  await activate('#restore-trace-confirm');
  assert.deepEqual(await learningState(), pausedState);
  assert.equal(await evaluate('document.activeElement.tagName'), 'H2');
  assert.match(await evaluate("document.querySelector('#trace-restore-status').textContent"), /Trace restored/);
  passed('a slower older file cannot replace the newer preview or the confirmed restored trace');

  const restoredDownload = await savedTrace('modular-restored-trace.json');
  for (const field of ['deck', 'model', 'firstAnswers', 'mastery', 'practice']) {
    assert.deepEqual(restoredDownload.document[field], paused.document[field], 'Actual restored state: ' + field);
  }
  passed('saving after restore proves exact first choices, full precision mastery and practice round trip');

  await activate('#practice-button');
  assert.equal(await evaluate("document.querySelector('.practice-card h2').textContent"), missed[1].item.prompt);
  for (let index = 1; index < missed.length; index++) {
    const choice = index === 1 ? (missed[index].item.answer + 1) % missed[index].item.options.length : missed[index].item.answer;
    await activate('[data-practice-choice="' + choice + '"]');
    await activate('#practice-next');
  }
  const completed = await learningState();
  assert.equal(completed.first, pausedState.first);
  assert.deepEqual(completed.mastery, pausedState.mastery);
  assert.deepEqual(completed.answers, pausedState.answers);
  assert.equal(completed.retries.length, 3);
  assert.equal(await evaluate("!!document.querySelector('#practice-button')"), false);
  passed('restored practice starts at the next unanswered item and finishes once without rewriting first results');

  await openArchive();
  await evaluate("window.traceOriginalObjectURL=URL.createObjectURL; URL.createObjectURL=()=>{throw new Error('test download unavailable');};");
  const beforeFailure = await learningState();
  await activate('#save-trace-button');
  assert.match(await evaluate("document.querySelector('#save-trace-status').textContent"), /could not be prepared/);
  assert.deepEqual(await learningState(), beforeFailure);
  await evaluate("URL.createObjectURL=window.traceOriginalObjectURL;");
  const completedDownload = await savedTrace('modular-completed-trace.json');
  assert.equal(completedDownload.restored.practice.answers.length, 3);
  assert.deepEqual(completedDownload.document.mastery, paused.document.mastery);
  passed('download preparation failure preserves the lesson and a later download succeeds');

  await newDocument(pathToFileURL(join(project, 'demo.html')).href, 390, 844);
  const standaloneEmpty = await learningState();
  await previewFile(paused.path);
  assert.deepEqual(await learningState(), standaloneEmpty);
  assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'), false);
  await screenshot('trace-preview-mobile.png', '#trace-archive-panel');
  await activate('#restore-trace-confirm');
  assert.deepEqual(await learningState(), pausedState);
  const offlineDownload = await savedTrace('standalone-restored-trace.json');
  for (const field of ['deck', 'model', 'firstAnswers', 'mastery', 'practice']) {
    assert.deepEqual(offlineDownload.document[field], paused.document[field], 'Standalone restored state: ' + field);
  }
  assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'), false);
  assert.ok(pageRequests.every(url => url.startsWith('file:')), 'Standalone trace restore must not request hosted resources');
  await screenshot('trace-restored-mobile.png', '#trace-archive-panel');
  passed('double-clickable standalone demo restores the same downloaded file at 390px without hosted requests');
  assert.deepEqual(pageErrors, []);
  passed('all received browser paths finish without JavaScript exceptions');
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
