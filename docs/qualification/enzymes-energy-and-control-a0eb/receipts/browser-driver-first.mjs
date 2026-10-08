import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(here, '../../..');
const receiving = process.env.RECALLWEAVE_RECEIVING_ROOT;
const output = process.env.RECALLWEAVE_EVIDENCE_DIR;
assert(receiving && output, 'Set isolated receiving root and a new evidence directory.');
await fs.mkdir(output, { recursive: false });
const downloads = path.join(output, 'downloads');
await fs.mkdir(downloads);
const profile = await fs.mkdtemp(path.join(output, 'chrome-profile-'));
const coursePath = path.join(project, 'courses/enzymes-energy-and-control.json');
const authorPath = path.join(receiving, 'author.html');
const bytes = await fs.readFile(coursePath);
const course = JSON.parse(bytes.toString('utf8'));
const sha = b => createHash('sha256').update(b).digest('hex');
const before = { course: sha(bytes), author: sha(await fs.readFile(authorPath)) };
const result = { status: 'running', worker: 'chatgpt-a0eb505c4971/estate_products',
  started_at: new Date().toISOString(), receiving_source: '4775af91ba6a5d4df787669f39b44364dd1e37ba',
  source_sha256: before, viewport: { width: 390, height: 844 }, checks: [], learner_importer_received: false };
let stderr = '';
let socket;
let browserSocket;
let nextId = 0;
let child;
let closed = false;
const pending = new Map();
const runtimeErrors = [];
const externalRequests = [];
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
    ws.addEventListener('error', () => reject(new Error('CDP socket failed')), { once: true });
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
    if (message.method === 'Network.requestWillBeSent') {
      const url = message.params.request.url;
      if (/^https?:/i.test(url)) externalRequests.push(url);
    }
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
  assert(await run(s => { const el = document.querySelector(s); if (!el || el.disabled) return false; el.focus(); return document.activeElement === el; }, selector), selector + ' must focus');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
}
async function choose(file) {
  const { root } = await send('DOM.getDocument', { depth: 0 });
  const { nodeId } = await send('DOM.querySelector', { nodeId: root.nodeId, selector: '#open-deck' });
  assert(nodeId, 'native file input exists');
  await send('DOM.setFileInputFiles', { nodeId, files: [file] });
  await deadline(() => run(() => !document.querySelector('#open-preview').hidden), 'file preview');
}
async function navigateAuthor() {
  await send('Page.navigate', { url: pathToFileURL(authorPath).href });
  await deadline(() => run(() => !!document.querySelector('#open-deck') && !!document.querySelector('#question-prompt')), 'Deck Studio initialization');
}
try {
  const executable = process.env.RECALLWEAVE_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  child = spawn(executable, [
    '--headless=new', '--no-first-run', '--no-default-browser-check',
    '--disable-background-networking', '--disable-component-update', '--disable-sync',
    '--disable-default-apps', '--disable-extensions', '--metrics-recording-only',
    '--mute-audio', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  child.stderr.on('data', chunk => { stderr += chunk.toString(); });
  child.once('exit', () => { closed = true; });
  child.once('error', error => { stderr += error.message; });
  const port = await deadline(async () => {
    const content = await fs.readFile(path.join(profile, 'DevToolsActivePort'), 'utf8');
    return Number(content.split('\n')[0]);
  }, 'own Chrome debug port', 20000);
  const base = 'http://127.0.0.1:' + port;
  const version = await (await fetch(base + '/json/version')).json();
  result.browser = version.Browser;
  const targets = await (await fetch(base + '/json/list')).json();
  socket = await openSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  wire(socket);
  browserSocket = await openSocket(version.webSocketDebuggerUrl);
  wire(browserSocket);
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Network.enable');
  await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads }, browserSocket);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
  await navigateAuthor();
  await run(() => {
    const input = document.querySelector('#deck-title');
    input.value = 'Retain this separate draft';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await choose(coursePath);
  const preview = await run(() => ({
    title: document.querySelector('#deck-title').value,
    summary: document.querySelector('#open-preview-summary').textContent
  }));
  assert.equal(preview.title, 'Retain this separate draft');
  assert.match(preview.summary, /12 questions/);
  assert.match(preview.summary, /4 concepts/);
  await keyboard('#cancel-open');
  assert.deepEqual(await run(() => ({
    title: document.querySelector('#deck-title').value,
    hidden: document.querySelector('#open-preview').hidden,
    focused: document.activeElement.id
  })), { title: 'Retain this separate draft', hidden: true, focused: 'open-deck-button' });
  result.checks.push('Native file preview and keyboard cancellation preserve the existing draft.');
  await choose(coursePath);
  await keyboard('#replace-draft');
  assert.equal(await run(() => document.querySelector('#deck-title').value), course.title);
  assert.equal(await run(() => document.querySelector('#question-picker').options.length), 12);
  await keyboard('#check-draft');
  await deadline(() => run(() => !document.querySelector('#author-preview').hidden && !document.querySelector('#download-deck').disabled), 'checked course preview');
  for (let i = 1; i < course.items.length; i++) {
    const selector = '#preview-content details:nth-of-type(' + (i + 1) + ') summary';
    await keyboard(selector);
  }
  const rendered = await run(() => document.querySelector('#preview-content').innerText);
  for (const item of course.items) {
    for (const text of [item.prompt, item.options[item.answer], item.explanation, item.transfer]) assert(rendered.includes(text), 'Missing rendered text for ' + item.id);
  }
  result.checks.push('All twelve prompts, correct answers, explanations and transfer prompts render in the actual checked preview.');
  await keyboard('#download-deck');
  const downloadedName = await deadline(async () => {
    const names = await fs.readdir(downloads);
    return names.find(name => name.endsWith('.json') && !name.endsWith('.crdownload'));
  }, 'physical browser download');
  const downloadedPath = path.join(downloads, downloadedName);
  const downloadedBytes = await fs.readFile(downloadedPath);
  assert.deepEqual(JSON.parse(downloadedBytes.toString('utf8')), course);
  result.download = { name: downloadedName, bytes: downloadedBytes.length, sha256: sha(downloadedBytes), semantic_equal_to_source: true };
  const dimensions = await run(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  assert(dimensions.scroll <= dimensions.client, 'No horizontal overflow at 390 px: ' + JSON.stringify(dimensions));
  await run(() => document.querySelector('#author-preview').scrollIntoView({ block: 'start' }));
  const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await fs.writeFile(path.join(output, 'author-course-390.png'), Buffer.from(screenshot.data, 'base64'));
  result.checks.push('Keyboard download creates a semantically exact JSON file; the page fits a 390-pixel viewport.');
  await send('Page.navigate', { url: 'about:blank' });
  await navigateAuthor();
  assert.notEqual(await run(() => document.querySelector('#deck-title').value), course.title);
  await choose(downloadedPath);
  await keyboard('#replace-draft');
  await keyboard('#check-draft');
  await deadline(() => run(() => !document.querySelector('#download-deck').disabled), 'reopened exported course check');
  assert.equal(await run(() => document.querySelector('#deck-title').value), course.title);
  assert.equal(await run(() => document.querySelector('#question-picker').options.length), 12);
  result.checks.push('A new page reopens the actual downloaded course and checks all twelve questions again.');
  assert.deepEqual(runtimeErrors, []);
  assert.deepEqual(externalRequests, []);
  assert.equal(sha(await fs.readFile(coursePath)), before.course);
  assert.equal(sha(await fs.readFile(authorPath)), before.author);
  result.runtime_errors = runtimeErrors;
  result.external_requests = externalRequests;
  result.status = 'qualified_current_deck_studio_only';
} catch (error) {
  result.status = 'failed';
  result.error = { message: error.message, stack: error.stack };
  process.exitCode = 1;
} finally {
  if (browserSocket?.readyState === WebSocket.OPEN) await send('Browser.close', {}, browserSocket).catch(() => {});
  socket?.close();
  browserSocket?.close();
  if (child && !closed) {
    for (let i = 0; i < 30 && !closed; i++) await delay(50);
    if (!closed) child.kill('SIGTERM');
    for (let i = 0; i < 40 && !closed; i++) await delay(50);
  }
  for (const entry of pending.values()) { clearTimeout(entry.timer); entry.reject(new Error('own browser closed')); }
  pending.clear();
  result.own_browser_closed = closed;
  if (closed) await fs.rm(profile, { recursive: true, force: false });
  result.finished_at = new Date().toISOString();
  await fs.writeFile(path.join(output, 'chrome-stderr.log'), stderr);
  await fs.writeFile(path.join(output, 'receiving.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
}
