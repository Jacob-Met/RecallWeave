#!/usr/bin/env node
/** Optional actual-browser receiving: Node 22+ and an installed Chrome/Chromium. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, mkdtemp, rm, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve, join, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PRESETS, DEFAULT_SETTINGS, simulateFeedback, feedbackCsv } from '../src/feedback-control.mjs';

const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const root = resolve(option('--root', join(dirname(fileURLToPath(import.meta.url)), '..')));
const output = resolve(option('--output', join(root, 'feedback-browser-check')));
const executable = option('--browser', 'chromium');
await mkdir(output, { recursive: true });
const downloads = join(output, 'downloads');
await mkdir(downloads, { recursive: true });
const profile = await mkdtemp(join(output, 'profile-'));
const report = { format: 'recallweave-feedback-browser/1', status: 'running', root, executable, checks: [], downloads: [], screenshots: [], errors: [], requests: [], sourceSha256: {} };
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
for (const path of ['courses/feedback-control.json', 'courses/feedback-control-lab.html', 'src/feedback-control.mjs', 'src/feedback-control-ui.mjs', 'demo.html', 'index.html', 'src/app.mjs']) {
  report.sourceSha256[path] = hash(await readFile(join(root, path)));
}
const courseBytes = await readFile(join(root, 'courses/feedback-control.json'));
const course = JSON.parse(courseBytes);
const server = createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = resolve(root, '.' + (path === '/' ? '/index.html' : path));
    if (!file.startsWith(root + '/')) return response.writeHead(403).end();
    const bytes = await readFile(file);
    const type = { '.mjs': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json' }[extname(file)] || 'application/octet-stream';
    response.writeHead(200, { 'Content-Type': type + '; charset=utf-8' }).end(bytes);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = 'http://127.0.0.1:' + server.address().port;
let browser, socket, sessionId;
let browserLog = '';
let sequence = 0;
const pending = new Map();
const downloadEvents = new Map();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check, label) {
  const end = Date.now() + 18000;
  let last;
  while (Date.now() < end) {
    try { const value = await check(); if (value) return value; } catch (error) { last = error; }
    await sleep(80);
  }
  throw new Error('Timed out: ' + label + (last ? ' (' + last.message + ')' : ''));
}
function command(method, params = {}, scoped = true) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 12000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params, ...(scoped && sessionId ? { sessionId } : {}) }));
  });
}
async function evaluate(expression) {
  const response = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  return response.result.value;
}
async function key(name) {
  const code = { Enter: 13, Tab: 9, End: 35, Home: 36, ArrowRight: 39 }[name];
  for (const type of ['keyDown', 'keyUp']) await command('Input.dispatchKeyEvent', {
    type, key: name, code: name, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code,
    ...(name === 'Enter' && type === 'keyDown' ? { text: '\r', unmodifiedText: '\r' } : {})
  });
}
async function activate(selector) {
  assert.ok(await evaluate('!!document.querySelector(' + JSON.stringify(selector) + ')'), selector);
  await evaluate('document.querySelector(' + JSON.stringify(selector) + ').focus()');
  await key('Enter');
}
async function textOf(selector) {
  return evaluate('document.querySelector(' + JSON.stringify(selector) + ')?.textContent');
}
async function fill(selector, value) {
  await evaluate('(() => { const input = document.querySelector(' + JSON.stringify(selector) + '); input.value = ' + JSON.stringify(String(value)) + '; input.dispatchEvent(new Event("input", {bubbles:true})); })()');
}
async function setFile(selector, path) {
  const { root: documentNode } = await command('DOM.getDocument');
  const { nodeId } = await command('DOM.querySelector', { nodeId: documentNode.nodeId, selector });
  assert.ok(nodeId, selector);
  await command('DOM.setFileInputFiles', { nodeId, files: [path] });
}
async function screenshot(name, selector) {
  if (selector) await evaluate('document.querySelector(' + JSON.stringify(selector) + ').scrollIntoView({block:"start"})');
  const { data } = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(join(output, name), Buffer.from(data, 'base64'));
  report.screenshots.push(name);
}
async function navigate(url, width = 1280, height = 1000, ready = '#multiplier') {
  await command('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  await command('Page.navigate', { url });
  await until(() => evaluate('document.URL === ' + JSON.stringify(url) + ' && document.readyState === "complete" && !!document.querySelector(' + JSON.stringify(ready) + ')'), 'page ' + url);
}
async function download(selector, label) {
  const before = new Set(downloadEvents.keys());
  await activate(selector);
  const entry = await until(() => [...downloadEvents.values()].find(item => !before.has(item.guid) && item.state === 'completed'), 'actual download ' + label);
  const path = join(downloads, entry.suggestedFilename);
  const bytes = await until(async () => { const value = await readFile(path); return value.length ? value : false; }, 'download bytes ' + label);
  const saved = label + '-' + entry.suggestedFilename;
  await writeFile(join(output, saved), bytes);
  await rm(path);
  report.downloads.push({ label, filename: entry.suggestedFilename, bytes: bytes.length, sha256: hash(bytes), saved });
  return { bytes, path: join(output, saved) };
}
const passed = name => { report.checks.push(name); console.log('PASS ' + name); };
async function assertViewport(width) {
  const metrics = await evaluate('({inner:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,visual:visualViewport.width,scale:visualViewport.scale})');
  assert.equal(metrics.inner, width);
  assert.equal(metrics.client, width);
  assert.ok(metrics.scroll <= width, JSON.stringify(metrics));
  assert.equal(metrics.visual, width);
  assert.equal(metrics.scale, 1);
  return metrics;
}
async function importCourse(path) {
  await setFile('#deck-file', path);
  await until(async () => (await textOf('#deck-preview-title')) === course.title, 'course preview');
  assert.match(await textOf('.deck-preview-count'), /18 questions.*6 concepts/);
  await activate('#start-deck');
  await until(() => evaluate('!!document.querySelector(".question-card h2")'), 'first imported question');
}
async function answerCurrent(practice, correct) {
  const prompt = await textOf('.question-card h2');
  const item = course.items.find(item => item.prompt === prompt);
  assert.ok(item, 'Actual rendered prompt belongs to the downloaded course');
  const attribute = practice ? 'data-practice-choice' : 'data-choice';
  const displayed = await evaluate('[...document.querySelectorAll("[' + attribute + ']")].map(button => Number(button.getAttribute("' + attribute + '")))');
  assert.deepEqual([...displayed].sort((a, b) => a - b), item.options.map((_, index) => index));
  const chosen = correct ? item.answer : (item.answer + 1) % item.options.length;
  await activate('[' + attribute + '="' + chosen + '"]');
  const feedback = await textOf(practice ? '#practice-feedback' : '#feedback-slot');
  assert.ok(feedback.includes(item.explanation), item.id + ' explanation rendered');
  assert.ok(feedback.includes(item.transfer), item.id + ' transfer rendered');
  await activate(practice ? '#practice-next' : '#next-button');
  return { id: item.id, choice: chosen, correct };
}

try {
  browser = spawn(executable, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-background-networking', '--disable-component-update', '--disable-sync', '--no-first-run', '--no-default-browser-check', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  browser.stderr.on('data', data => { browserLog = (browserLog + data.toString()).slice(-20000); });
  let launchError;
  browser.on('error', error => { launchError = error; });
  const endpoint = await until(async () => {
    if (launchError) throw launchError;
    if (browser.exitCode !== null) throw new Error('Browser exited ' + browser.exitCode);
    const [port, path] = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).trim().split('\n');
    return port && path ? 'ws://127.0.0.1:' + port + path : false;
  }, 'browser start');
  socket = new WebSocket(endpoint);
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const entry = pending.get(message.id);
      if (!entry) return;
      pending.delete(message.id); clearTimeout(entry.timer);
      if (message.error) entry.reject(new Error(message.error.message)); else entry.resolve(message.result);
    } else if (message.method === 'Runtime.exceptionThrown') {
      report.errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    } else if (message.method === 'Network.requestWillBeSent') report.requests.push(message.params.request.url);
    else if (message.method === 'Browser.downloadWillBegin') downloadEvents.set(message.params.guid, { ...message.params, state: 'started' });
    else if (message.method === 'Browser.downloadProgress') {
      const item = downloadEvents.get(message.params.guid);
      if (item) Object.assign(item, message.params);
    }
  });
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  report.browser = await command('Browser.getVersion', {}, false);
  await command('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads, eventsEnabled: true }, false);
  const { targetId } = await command('Target.createTarget', { url: 'about:blank' }, false);
  ({ sessionId } = await command('Target.attachToTarget', { targetId, flatten: true }, false));
  await command('Page.enable'); await command('Runtime.enable'); await command('DOM.enable'); await command('Network.enable');
  await command('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  const lab = pathToFileURL(join(root, 'courses/feedback-control-lab.html')).href;
  await navigate(lab);
  await until(async () => (await textOf('#multiplier')) === '0.25', 'default computed');
  assert.equal(await textOf('#fixed-point'), '0.666667');
  assert.equal(await textOf('#step-next'), '0.5');
  assert.equal(await evaluate('document.querySelectorAll("#trace-rows tr").length'), 31);
  report.desktopViewport = await assertViewport(1280);
  await screenshot('explorer-desktop.png');
  passed('offline default, readable numeric state and exact viewport');
  const downloadedCourse = await download('#download-course', 'course');
  assert.deepEqual(downloadedCourse.bytes, courseBytes);
  passed('actual course download preserves every original UTF-8 byte');

  const beforeDraft = await evaluate('({table:document.querySelector("#trace-rows").innerHTML,paths:[...document.querySelectorAll("#trace-plot path")].map(p=>p.getAttribute("d")),settings:document.querySelector("#applied-settings").textContent})');
  await fill('#gain', '0.1');
  assert.equal(await evaluate('document.querySelector("#download-trace").disabled'), true);
  assert.match(await textOf('#run-status'), /last applied/);
  await activate('#apply-experiment');
  assert.match(await textOf('#run-status'), /steps of 0.25/);
  assert.deepEqual(await evaluate('({table:document.querySelector("#trace-rows").innerHTML,paths:[...document.querySelectorAll("#trace-plot path")].map(p=>p.getAttribute("d")),settings:document.querySelector("#applied-settings").textContent})'), beforeDraft);
  assert.equal(await evaluate('document.querySelector("#download-trace").disabled'), true);
  await fill('#gain', '');
  await activate('#apply-experiment');
  assert.match(await textOf('#run-status'), /must be/);
  await fill('#gain', '0.75'); await fill('#steps', '4'); await activate('#apply-experiment');
  assert.equal(await textOf('#multiplier'), '0');
  assert.equal(await evaluate('document.querySelectorAll("#trace-rows tr").length'), 5);
  await evaluate('document.querySelector("#selected-step").focus()'); await key('End');
  assert.match(await textOf('#step-label'), /n = 4 of 4/);
  assert.equal(await textOf('#step-control'), '—'); assert.equal(await textOf('#step-next'), '—');
  assert.match(await textOf('#step-note'), /final recorded state/);
  passed('invalid and empty drafts preserve the applied run; keyboard recovery and final-row semantics');

  for (const preset of PRESETS) {
    await activate('[data-preset="' + preset.id + '"]');
    const expected = simulateFeedback(preset.settings);
    assert.equal(Number(await textOf('#multiplier')), expected.q);
    assert.equal(await textOf('#behavior'), expected.label);
    const actual = await download('#download-trace', preset.id);
    assert.equal(actual.bytes.toString('utf8'), feedbackCsv(expected));
    if (preset.id === 'flat-unstable') {
      const states = await evaluate('[...document.querySelectorAll("#trace-rows tr")].map(row=>row.children[1].textContent)');
      assert.ok(states.every(value => value === '0'));
      assert.match(await textOf('#behavior'), /grow/);
      await screenshot('explorer-flat-unstable.png', '#plot-heading');
    }
  }
  passed('all six actual preset downloads match their applied settings and full computed rows');
  await activate('#restore-defaults');
  await navigate(lab, 320, 900);
  await until(async () => (await textOf('#multiplier')) === '0.25', 'mobile default');
  report.mobileViewport = await assertViewport(320);
  await screenshot('explorer-mobile-controls.png', '#controls-heading');
  await screenshot('explorer-mobile-plot.png', '#plot-heading');
  await activate('[data-preset="alternating"]');
  await evaluate('document.querySelector("#selected-step").focus()'); await key('ArrowRight');
  assert.match(await textOf('#step-label'), /n = 1 of 30/);
  assert.equal(await textOf('#step-state'), '1.25');
  passed('320 CSS pixel viewport, responsive plot and keyboard step inspection');

  await navigate(pathToFileURL(join(root, 'demo.html')).href, 1280, 1000, '#deck-file');
  await importCourse(downloadedCourse.path);
  const missed = new Set(['fc-read-number', 'fc-stability-boundary', 'fc-limit-transfer']);
  const firstAnswers = [];
  for (let index = 0; index < course.items.length; index += 1) {
    const prompt = await textOf('.question-card h2');
    const item = course.items.find(item => item.prompt === prompt);
    firstAnswers.push(await answerCurrent(false, !missed.has(item.id)));
  }
  assert.equal(new Set(firstAnswers.map(item => item.id)).size, 18);
  assert.match(await textOf('#first-try-summary'), /15 of 18/);
  assert.equal(await evaluate('document.querySelectorAll(".review-item").length'), 18);
  const estimates = await evaluate('[...document.querySelectorAll(".mastery-box output")].map(n=>n.textContent)');
  await screenshot('learner-course-review.png', '.result-card');
  await activate('#practice-button');
  const retries = [];
  for (let index = 0; index < 3; index += 1) retries.push(await answerCurrent(true, true));
  assert.deepEqual(new Set(retries.map(item => item.id)), missed);
  assert.match(await textOf('#practice-status'), /3 of 3 correctly/);
  assert.match(await textOf('#first-try-summary'), /15 of 18/);
  assert.deepEqual(await evaluate('[...document.querySelectorAll(".mastery-box output")].map(n=>n.textContent)'), estimates);
  const notes = await download('#save-notes-button', 'study-notes');
  for (const item of course.items) assert.ok(notes.bytes.toString('utf8').includes(item.prompt));
  await evaluate('document.querySelector("#trace-archive-panel").open=true');
  const trace = await download('#save-trace-button', 'learning-trace');
  JSON.parse(trace.bytes);
  await activate('#reset-button');
  await setFile('#trace-file', trace.path);
  await until(() => evaluate('!document.querySelector("#trace-preview").hidden'), 'saved trace preview');
  await activate('#restore-trace-confirm');
  assert.match(await textOf('#first-try-summary'), /15 of 18/);
  assert.match(await textOf('#practice-status'), /3 of 3 correctly/);
  report.learner = { firstAnswers, retries };
  passed('offline learner consumes downloaded course: 18 answers, 3 separate retries, real notes and trace restore');

  // Receive the modular learner in its own page, retaining the completed file-based session.
  const modularTarget = await command('Target.createTarget', { url: 'about:blank' }, false);
  ({ sessionId } = await command('Target.attachToTarget', { targetId: modularTarget.targetId, flatten: true }, false));
  await command('Page.enable'); await command('Runtime.enable'); await command('DOM.enable'); await command('Network.enable');
  await command('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await navigate(base + '/index.html', 1280, 1000, '#deck-file');
  await importCourse(downloadedCourse.path);
  await answerCurrent(false, true);
  await evaluate('document.querySelector("#trace-archive-panel").open=true');
  await setFile('#trace-file', trace.path);
  await until(() => evaluate('!document.querySelector("#trace-preview").hidden'), 'modular learner trace preview');
  await activate('#restore-trace-confirm');
  assert.match(await textOf('#first-try-summary'), /15 of 18/);
  assert.match(await textOf('#practice-status'), /3 of 3 correctly/);
  passed('unchanged modular learner imports the same course and restores its actual saved trace');
  assert.deepEqual(report.errors, []);
  const external = report.requests.filter(url => /^https?:/.test(url) && !url.startsWith(base + '/'));
  assert.deepEqual(external, []);
  for (const [path, expected] of Object.entries(report.sourceSha256)) assert.equal(hash(await readFile(join(root, path))), expected);
  passed('zero page exceptions or external requests; all source bytes unchanged');
  report.status = 'passed';
} catch (error) {
  report.status = 'failed'; report.failure = error.stack || String(error); console.error(report.failure); process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString();
  await writeFile(join(output, 'receipt.json'), JSON.stringify(report, null, 2) + '\n');
  await writeFile(join(output, 'browser.log'), browserLog);
  if (socket?.readyState === WebSocket.OPEN) {
    try { await command('Browser.close', {}, false); } catch {}
    socket.close();
  }
  if (browser && browser.exitCode === null) browser.kill('SIGTERM');
  server.close();
  if (report.status === 'passed') await rm(profile, { recursive: true, force: true });
}
