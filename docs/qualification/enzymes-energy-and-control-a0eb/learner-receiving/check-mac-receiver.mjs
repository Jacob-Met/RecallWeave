import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const root = '/Users/me/Developer/recallweave-enzymes-learner-receiving-20261008-a0eb';
const delivery = '/Users/me/Downloads/RecallWeave-Enzymes-Learner-20261008-r2-a0eb/RecallWeave-Enzymes-Learner-20261008-r2';
const output = path.join(root, 'evidence', 'mac-browser');
const app = path.join(delivery, 'RecallWeave.html');
const courseFile = path.join(delivery, 'enzymes-energy-and-control.json');
const traceFile = path.join(root, 'fixtures', 'from-thinkpad-completed-trace.json');
const sha = data => createHash('sha256').update(data).digest('hex');
const packageRecord = JSON.parse(await fs.readFile(path.join(root, 'evidence', 'package.json'), 'utf8'));
const course = JSON.parse(await fs.readFile(courseFile, 'utf8'));
const traceBytes = await fs.readFile(traceFile);
assert.equal(sha(traceBytes), 'a1cf10d93a7bd00fc21799160d1f53dc7884d2e04d433d18a7a5070d1289d13c');
const original = JSON.parse(traceBytes.toString('utf8'));
const semantic = value => Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'savedAt'));
async function guardPackage() {
  for (const item of packageRecord.files) {
    const bytes = await fs.readFile(path.join(delivery, item.path));
    assert.equal(sha(bytes), item.sha256, item.path + ' changed');
  }
}
await guardPackage();
await fs.mkdir(output, { recursive: false });
const downloads = path.join(output, 'downloads');
await fs.mkdir(downloads);
const profile = await fs.mkdtemp('/tmp/rwe-a0eb-');
const started = Date.now();
const result = {
  schema: 'recallweave.enzyme-native-mac-learner-receiving.v1',
  worker_id: 'chatgpt-a0eb505c4971/estate_products',
  started_at: new Date().toISOString(),
  application_sha256: 'd0819e8630ff119be2c078408907ab53e3725999c8fdf71d35deb7f230d3bcd9',
  course_sha256: 'f8539cc5ba82cdae6f128986cdec2d09b62d846c2cf3bc9bc221d406264ff64a',
  original_fixture_sha256: sha(traceBytes),
  source_edits: 0, dependencies_installed: 0, synthetic_answers_only: true,
  personal_browser_profile_used: false, checks: []
};
let child, socket, browserSocket, browserClosed = false, nextId = 0;
let stderr = '';
const pending = new Map();
const runtimeErrors = [], externalRequests = [], events = [];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const deadline = async (fn, label, ms = 15000) => {
  const end = Date.now() + ms;
  let last;
  do {
    try { last = await fn(); if (last) return last; } catch (error) { last = error.message; }
    await delay(40);
  } while (Date.now() < end);
  throw new Error(label + ': ' + JSON.stringify(last));
};
function openSocket(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.addEventListener('open', () => resolve(ws), { once: true });
    ws.addEventListener('error', () => reject(new Error('Own browser CDP socket failed')), { once: true });
  });
}
function wire(ws) {
  ws.addEventListener('message', event => {
    const message = JSON.parse(String(event.data));
    if (message.id && pending.has(message.id)) {
      const entry = pending.get(message.id);
      pending.delete(message.id);
      clearTimeout(entry.timer);
      if (message.error) entry.reject(new Error(JSON.stringify(message.error)));
      else entry.resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') runtimeErrors.push(message.params.exceptionDetails.text);
    if (message.method === 'Network.requestWillBeSent' && /^https?:/i.test(message.params.request.url))
      externalRequests.push(message.params.request.url);
    if (message.method === 'Browser.downloadWillBegin' || message.method === 'Browser.downloadProgress')
      events.push({ method: message.method, ...message.params });
  });
}
function send(method, params = {}, ws = socket) {
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 10000);
    pending.set(id, { resolve, reject, timer });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function run(fn, ...args) {
  const expression = '(' + fn.toString() + ')(' + args.map(arg => JSON.stringify(arg)).join(',') + ')';
  const evaluated = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  assert(!evaluated.exceptionDetails, JSON.stringify(evaluated.exceptionDetails));
  return evaluated.result.value;
}
async function keyboard(selector) {
  assert(await run(s => {
    const el = document.querySelector(s);
    if (!el || el.disabled) return false;
    el.focus();
    return document.activeElement === el;
  }, selector), selector + ' focuses');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter',
    windowsVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r' });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
}
async function choose(selector, file) {
  const { root: documentRoot } = await send('DOM.getDocument', { depth: 0 });
  const { nodeId } = await send('DOM.querySelector', { nodeId: documentRoot.nodeId, selector });
  assert(nodeId, selector + ' native file input exists');
  await send('DOM.setFileInputFiles', { nodeId, files: [file] });
}
async function freshCourse() {
  await send('Page.navigate', { url: pathToFileURL(app).href });
  await deadline(() => run(() => !!document.querySelector('#start-button')), 'fresh delivered app');
  await choose('#deck-file', courseFile);
  await deadline(() => run(() => !document.querySelector('#deck-preview').hidden), 'actual course preview');
  assert.deepEqual(await run(() => ({
    title: document.querySelector('#deck-preview-title').textContent,
    questions: document.querySelectorAll('#deck-preview li').length
  })), { title: course.title, questions: 12 });
  await keyboard('#start-deck');
  await deadline(() => run(() => document.querySelectorAll('[data-choice]').length === 4), 'fresh enzyme question');
  assert.equal(await run(() => document.querySelector('#step-count').textContent), '0 / 12');
  assert.equal(await run(() => document.querySelector('#lesson-description').textContent), course.title);
}
async function restore(file) {
  await keyboard('#trace-archive-panel > summary');
  await choose('#trace-file', file);
  await deadline(() => run(() => !document.querySelector('#trace-preview').hidden), 'actual trace preview');
  assert.equal(await run(() => document.querySelector('#step-count').textContent), '0 / 12');
  await keyboard('#restore-trace-confirm');
  await deadline(() => run(() => !!document.querySelector('#first-try-summary')), 'restored review');
  assert.match(await run(() => document.querySelector('#first-try-summary').textContent), /8 of 12/);
  assert.match(await run(() => document.querySelector('#practice-status').textContent), /4 of 4/);
}
try {
  child = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new', '--no-first-run', '--no-default-browser-check',
    '--disable-background-networking', '--disable-component-update', '--disable-sync',
    '--disable-default-apps', '--disable-extensions', '--metrics-recording-only',
    '--mute-audio', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  child.stderr.on('data', chunk => { stderr = (stderr + chunk.toString()).slice(-5000); });
  child.once('exit', () => { browserClosed = true; });
  child.once('error', error => { stderr += error.message; });
  result.own_browser_pid = child.pid;
  const port = await deadline(async () => Number((await fs.readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]), 'own browser port', 20000);
  const base = 'http://127.0.0.1:' + port;
  const version = await (await fetch(base + '/json/version')).json();
  const targets = await (await fetch(base + '/json/list')).json();
  result.browser = version.Browser;
  socket = await openSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  wire(socket);
  browserSocket = await openSocket(version.webSocketDebuggerUrl);
  wire(browserSocket);
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Network.enable');
  await send('Network.setBlockedURLs', { urls: ['http://*', 'https://*'] });
  await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads, eventsEnabled: true }, browserSocket);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
  await freshCourse();
  await restore(traceFile);
  result.checks.push('Delivered standalone imports the unchanged 12-question course and explicitly restores the completed Linux-browser trace.');
  await keyboard('#save-trace-button');
  const begun = await deadline(() => events.find(event => event.method === 'Browser.downloadWillBegin'), 'native download began');
  await deadline(() => events.find(event => event.method === 'Browser.downloadProgress' && event.guid === begun.guid && event.state === 'completed'), 'native download completed');
  const downloaded = path.join(downloads, begun.suggestedFilename);
  const downloadedBytes = await fs.readFile(downloaded);
  const saved = JSON.parse(downloadedBytes.toString('utf8'));
  assert.deepEqual(semantic(saved), semantic(original), 'every downloaded semantic trace field');
  assert.equal(saved.firstAnswers.length, 12);
  assert.equal(saved.practice.answers.length, 4);
  assert.deepEqual(saved.mastery, original.mastery);
  result.download = { path: downloaded, bytes: downloadedBytes.length, sha256: sha(downloadedBytes),
    actual_browser_download: true, completion_event_observed: true, exact_semantic_equality_except_saved_at: true };
  result.checks.push('Mac Chrome creates an actual downloaded trace with all canonical first answers, original model estimates, deck data and four practice answers unchanged.');
  await freshCourse();
  await restore(downloaded);
  const dimensions = await run(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  assert(dimensions.scroll <= dimensions.client, 'no horizontal overflow at 390 px');
  await run(() => document.querySelector('#session-content').scrollIntoView({ block: 'start' }));
  const capture = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const screenshot = Buffer.from(capture.data, 'base64');
  await fs.writeFile(path.join(output, 'mac-restored-review-390.png'), screenshot);
  result.screenshot = { file: 'mac-restored-review-390.png', bytes: screenshot.length, sha256: sha(screenshot) };
  result.checks.push('A fresh delivered app reopens that actual Mac download after loading the same course; original 8-of-12 result and completed 4-of-4 practice are retained.');
  assert.deepEqual(runtimeErrors, []);
  assert.deepEqual(externalRequests, []);
  await guardPackage();
  result.status = 'passed';
  result.delivered_files_unchanged = true;
} catch (error) {
  result.status = 'failed';
  result.error_type = error.constructor.name;
  result.error = error.message;
  result.stack = error.stack;
  process.exitCode = 1;
} finally {
  if (browserSocket && browserSocket.readyState === 1) {
    try { await send('Browser.close', {}, browserSocket); } catch {}
  }
  for (let i = 0; i < 50 && child && !browserClosed; i++) await delay(40);
  if (child && !browserClosed) child.kill('SIGTERM');
  for (let i = 0; i < 50 && child && !browserClosed; i++) await delay(40);
  socket?.close();
  browserSocket?.close();
  if (browserClosed) await fs.rm(profile, { recursive: true, force: true });
  result.own_browser_closed = browserClosed;
  result.own_temporary_profile_removed = browserClosed;
  result.runtime_errors = runtimeErrors;
  result.external_page_requests = externalRequests;
  result.finished_at = new Date().toISOString();
  result.elapsed_seconds = (Date.now() - started) / 1000;
  await fs.writeFile(path.join(output, 'mac-browser-receiving.json'), JSON.stringify(result, null, 2) + '\n');
  if (result.status !== 'passed') await fs.writeFile(path.join(output, 'own-browser-setup-error.log'), stderr);
  console.log(JSON.stringify({ status: result.status, browser: result.browser, checks: result.checks.length,
    actual_download_sha256: result.download?.sha256, own_browser_closed: browserClosed, elapsed_seconds: result.elapsed_seconds }));
}
