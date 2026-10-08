#!/usr/bin/env node
/** Native receiving with Node 22+ and an installed Chrome/Chromium; no browser package. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, mkdtemp, rm, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const standaloneOnly = args.includes('--standalone-only');
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const project = resolve(option('--root', join(dirname(fileURLToPath(import.meta.url)), '..')));
const executable = option('--browser', 'chromium');
const output = resolve(option('--output', join(project, 'finite-convolution-browser')));
await mkdir(output);
const profile = await mkdtemp(join(output, 'owned-profile-'));
let downloadDirectory = join(output, 'downloads-lab');
await mkdir(downloadDirectory);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const sources = [
  'src/finite-convolution.mjs', 'src/finite-convolution-ui.mjs', 'courses/finite-convolution.json',
  'courses/finite-convolution-lab.html', 'templates/finite-convolution-lab.html', 'tools/build-finite-convolution.mjs',
  'src/deck.mjs', 'src/deck-picker.mjs', 'src/app.mjs', 'src/knowledge.mjs', 'src/review.mjs',
  'src/session-export.mjs', 'src/answer-order.mjs', 'src/trace-archive.mjs', 'src/trace-archive-ui.mjs',
  'data/deck.json', 'index.html', 'styles.css', 'demo.html', 'tools/check_finite_convolution_browser.mjs'
];
const report = { status: 'running', project, executable, startedAt: new Date().toISOString(), checks: [], sourceSha256: {}, downloads: [], screenshots: [], forbiddenRequests: [], pageErrors: [], protocolErrors: [] };
for (const path of sources) report.sourceSha256[path] = sha(await readFile(join(project, path)));
report.receivingScope = standaloneOnly ? 'Direct-file lab and published standalone importer; modular browser UI not exercised' : 'Direct-file lab, modular importer, and standalone importer';
report.courseRuns = [];
const courseBytes = await readFile(join(project, 'courses/finite-convolution.json'));
const course = JSON.parse(courseBytes.toString('utf8'));
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const path = resolve(project, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!path.startsWith(project + '/')) { response.writeHead(403).end(); return; }
    const bytes = await readFile(path);
    const mime = { '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json' }[extname(path)] ?? 'application/octet-stream';
    response.writeHead(200, { 'Content-Type': mime + '; charset=utf-8' }).end(bytes);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = 'http://127.0.0.1:' + server.address().port;
let serverClosed = false, browser, socket, sessionId, browserLog = '', sequence = 0, pageRequests = [];
const pending = new Map(), downloadEvents = new Map();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const quote = JSON.stringify;

async function waitFor(check, label, attempts = 160) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try { if (await check()) return; } catch (error) { lastError = error; }
    await sleep(100);
  }
  throw new Error('Timed out: ' + label + (lastError ? ' (' + lastError.message + ')' : ''));
}
function command(method, params = {}, scoped = true) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 10000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params, ...(scoped && sessionId ? { sessionId } : {}) }));
  });
}
async function evaluate(expression) {
  const r = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
}
const text = selector => evaluate('document.querySelector(' + quote(selector) + ').textContent');
async function key(name, shift = false) {
  const code = { Tab: 9, Enter: 13, ArrowLeft: 37, ArrowRight: 39, Home: 36, End: 35 }[name];
  for (const type of ['keyDown', 'keyUp']) {
    await command('Input.dispatchKeyEvent', { type, key: name, code: name, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code, modifiers: shift ? 8 : 0, ...(name === 'Enter' && type === 'keyDown' ? { text: '\r', unmodifiedText: '\r' } : {}) });
  }
}
async function activate(selector) {
  assert.ok(await evaluate('!!document.querySelector(' + quote(selector) + ')'), 'Missing control: ' + selector);
  await evaluate('document.querySelector(' + quote(selector) + ').focus()');
  await key('Enter');
}
async function fill(selector, value) {
  await evaluate('document.querySelector(' + quote(selector) + ').focus(); document.querySelector(' + quote(selector) + ').select()');
  await command('Input.insertText', { text: value });
}
async function navigate(url, ready, width = 1280, height = 1000) {
  await command('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  pageRequests = [];
  await command('Page.navigate', { url });
  await waitFor(() => evaluate('document.URL === ' + quote(url) + ' && document.readyState === "complete" && !!document.querySelector(' + quote(ready) + ')'), 'page ' + ready);
}
async function capture(name, selector) {
  if (selector) await evaluate('document.querySelector(' + quote(selector) + ').scrollIntoView({block:"start"})');
  const { data } = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const bytes = Buffer.from(data, 'base64');
  await writeFile(join(output, name), bytes);
  report.screenshots.push({ path: name, bytes: bytes.length, sha256: sha(bytes) });
}
const passed = label => { report.checks.push(label); console.log('PASS ' + label); };
const actualOutput = async () => JSON.parse(await text('#output-values'));
const actualTerms = () => evaluate('[...document.querySelectorAll("#contribution-rows tr")].map(row => [...row.children].map(cell => Number(cell.childNodes[0].textContent)))');
async function setDownloadDirectory(name) {
  downloadDirectory = join(output, name);
  await mkdir(downloadDirectory);
  await command('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadDirectory, eventsEnabled: true }, false);
}
async function receiveDownload(selector, filename) {
  const previous = new Set(downloadEvents.keys());
  await activate(selector);
  let selected;
  await waitFor(() => {
    selected = [...downloadEvents.values()].find(row => !previous.has(row.guid) && row.suggestedFilename === filename && row.state === 'completed');
    return Boolean(selected);
  }, 'completed download ' + filename);
  const path = join(downloadDirectory, filename);
  await waitFor(async () => (await stat(path)).isFile(), 'download file ' + filename);
  const bytes = await readFile(path);
  report.downloads.push({ path, suggestedFilename: selected.suggestedFilename, guid: selected.guid, state: selected.state, bytes: bytes.length, sha256: sha(bytes) });
  return { path, bytes };
}
async function chooseFile(selector, path) {
  const { root } = await command('DOM.getDocument', { depth: 1 });
  const { nodeId } = await command('DOM.querySelector', { nodeId: root.nodeId, selector });
  assert.ok(nodeId);
  await command('DOM.setFileInputFiles', { nodeId, files: [path] });
}
async function chooseCanonical(answer, practice = false) {
  const attribute = practice ? 'data-practice-choice' : 'data-choice';
  const selector = '[' + attribute + '="' + answer + '"]';
  const button = await evaluate('document.querySelector(' + quote(selector) + ')?.textContent');
  assert.ok(button);
  await activate(selector);
}
async function receiveCourse(url, downloadedCourse, mode, width) {
  const surface = url.startsWith('file:') ? 'standalone' : 'modular';
  const run = surface + '-' + mode;
  await navigate(url, '#deck-file', width);
  await chooseFile('#deck-file', downloadedCourse);
  await waitFor(() => evaluate('!document.querySelector("#deck-preview").hidden && !!document.querySelector("#start-deck")'), 'course preview');
  assert.equal(await text('#deck-preview-title'), course.title);
  const previews = await evaluate('[...document.querySelectorAll(".deck-questions strong")].map(node => node.textContent)');
  assert.deepEqual(previews, course.items.map(item => item.prompt));
  await activate('#start-deck');
  await waitFor(() => evaluate('!!document.querySelector(".question-card h2")'), 'explicit imported lesson start');
  const seen = [], first = [], missed = new Set(mode === 'mixed' ? ['fc04', 'fc11'] : []);
  for (let i = 0; i < course.items.length; i++) {
    const prompt = await text('.question-card h2');
    const item = course.items.find(row => row.prompt === prompt);
    assert.ok(item && !seen.includes(item.id), 'Every rendered prompt belongs to this exact course once');
    const order = await evaluate('[...document.querySelectorAll("[data-choice]")].map(node => Number(node.dataset.choice))');
    assert.deepEqual([...order].sort((a, b) => a - b), [0, 1, 2, 3]);
    const visible = await evaluate('[...document.querySelectorAll("[data-choice]")].map(node => node.textContent.slice(node.querySelector(".choice-key").textContent.length))');
    assert.deepEqual(visible, order.map(choice => item.options[choice]));
    const choice = missed.has(item.id) ? (item.answer + 1) % 4 : item.answer;
    await chooseCanonical(choice);
    const feedback = await text('#feedback-slot');
    assert.ok(feedback.includes(item.explanation) && feedback.includes(item.transfer));
    seen.push(item.id); first.push({ id: item.id, choice, correct: choice === item.answer, order });
    await activate('#next-button');
  }
  assert.equal(await evaluate('document.querySelectorAll(".review-item").length'), 12);
  assert.match(await text('#first-try-summary'), new RegExp('made ' + (12 - missed.size) + ' of 12'));
  const reviewPrompts = await evaluate('[...document.querySelectorAll(".review-prompt")].map(node => node.textContent)');
  assert.deepEqual(reviewPrompts, seen.map(id => course.items.find(item => item.id === id).prompt));
  const mastery = await evaluate('[...document.querySelectorAll(".mastery-box output")].map(node => node.textContent)');
  if (missed.size) {
    await activate('#practice-button');
    for (const firstAnswer of first.filter(row => !row.correct)) {
      const item = course.items.find(row => row.id === firstAnswer.id);
      assert.equal(await text('.practice-card h2'), item.prompt);
      const order = await evaluate('[...document.querySelectorAll("[data-practice-choice]")].map(node => Number(node.dataset.practiceChoice))');
      assert.deepEqual(order, firstAnswer.order);
      await chooseCanonical(item.answer, true);
      await activate('#practice-next');
    }
    assert.match(await text('#practice-status'), /2 of 2 correctly on retry/);
    assert.match(await text('#first-try-summary'), /made 10 of 12/);
    assert.deepEqual(await evaluate('[...document.querySelectorAll(".mastery-box output")].map(node => node.textContent)'), mastery);
    assert.equal(await evaluate('document.querySelectorAll(".review-practice-answer").length'), 2);
  }
  await activate('.review-item summary');
  const overflow = await evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth');
  assert.equal(overflow, false);
  const folder = 'downloads-' + run;
  await setDownloadDirectory(folder);
  const filename = 'recallweave-study-notes-' + new Date().toISOString().slice(0, 10) + '.txt';
  const notes = await receiveDownload('#save-notes-button', filename);
  const notesText = notes.bytes.toString('utf8');
  for (const item of course.items) {
    for (const field of [item.prompt, item.explanation, item.transfer, item.options[item.answer]]) assert.ok(notesText.includes(field), item.id);
  }
  assert.ok(notesText.includes(course.title) && notesText.includes(course.attribution));
  assert.match(notesText, mode === 'mixed' ? /10 of 12 connections correct/ : /12 of 12 connections correct/);
  if (missed.size) assert.match(notesText, /2 of 2 practice answers recorded; 2 correct on retry/);
  if (url.startsWith('file:')) assert.ok(pageRequests.every(url => /^(file:|blob:|data:)/.test(url)), 'Standalone learner makes no HTTP request');
  await capture('learner-' + run + '-' + width + 'px.png', '.result-card');
  report.courseRuns.push({ surface, mode, source: url, first, mastery, notesSha256: sha(notes.bytes), requests: [...pageRequests] });
  passed(surface + ' ' + (mode === 'mixed' ? 'mixed/retry' : 'all-correct') + ': actual downloaded course → preview/start → all 12 questions/review → physical study notes');
}

try {
  browser = spawn(executable, [
    '--headless=new', '--disable-gpu', '--disable-background-networking', '--disable-component-update',
    '--disable-sync', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  browser.stderr.on('data', bytes => { browserLog = (browserLog + bytes.toString()).slice(-6000); });
  let launchError, port, endpoint;
  browser.on('error', error => { launchError = error; });
  await waitFor(async () => {
    if (launchError) throw launchError;
    if (browser.exitCode !== null) throw new Error('Browser exited ' + browser.exitCode + ': ' + browserLog);
    [port, endpoint] = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).trim().split('\n');
    return Boolean(port && endpoint);
  }, 'native browser startup');
  socket = new WebSocket('ws://127.0.0.1:' + port + endpoint);
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id); clearTimeout(request.timer);
      if (message.error) request.reject(new Error(message.error.message)); else request.resolve(message.result);
    } else if (message.method === 'Runtime.exceptionThrown') {
      report.pageErrors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
    } else if (message.method === 'Network.requestWillBeSent') {
      const url = message.params.request.url;
      pageRequests.push(url);
      if (/^https?:/.test(url) && !url.startsWith(base + '/')) report.forbiddenRequests.push(url);
    } else if (message.method === 'Browser.downloadWillBegin' || message.method === 'Browser.downloadProgress') {
      const value = message.params;
      downloadEvents.set(value.guid, { ...downloadEvents.get(value.guid), ...value });
    }
  });
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  report.browser = await command('Browser.getVersion', {}, false);
  const { targetId } = await command('Target.createTarget', { url: 'about:blank' }, false);
  ({ sessionId } = await command('Target.attachToTarget', { targetId, flatten: true }, false));
  for (const method of ['Page.enable', 'Runtime.enable', 'Network.enable', 'DOM.enable']) await command(method);
  await command('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadDirectory, eventsEnabled: true }, false);

  await navigate(pathToFileURL(join(project, 'courses/finite-convolution-lab.html')).href, '#output-values');
  await waitFor(async () => (await text('#output-values')) === '[2, 3, 1, 6]', 'default calculation');
  assert.deepEqual(await actualOutput(), [2, 3, 1, 6]);
  assert.deepEqual(await actualTerms(), [[0, 2, 0, 1, 2], [1, -1, -1, 0, 0], [2, 3, -2, 0, 0]]);
  assert.equal(await evaluate('document.querySelector("#previous-index").disabled'), true);
  await capture('lab-desktop.png', '#lab');
  passed('direct-file lab displays the full signed result and zero-extended first-index terms');

  await evaluate('document.querySelector("#output-index").focus()');
  await key('ArrowRight');
  assert.equal(await text('#selected-output'), 'y[1] = 3');
  assert.deepEqual(await actualTerms(), [[0, 2, 1, 2, 4], [1, -1, 0, 1, -1], [2, 3, -1, 0, 0]]);
  await evaluate('document.querySelector("#previous-index").focus()');
  await key('Tab');
  assert.equal(await evaluate('document.activeElement.id'), 'output-index');
  await key('ArrowRight');
  assert.equal(await text('#selected-output'), 'y[2] = 1');
  assert.deepEqual(await actualTerms(), [[0, 2, 2, 0, 0], [1, -1, 1, 2, -2], [2, 3, 0, 1, 3]]);
  await key('Tab'); assert.equal(await evaluate('document.activeElement.id'), 'next-index');
  await key('Enter');
  assert.equal(await text('#selected-output'), 'y[3] = 6');
  assert.equal(await evaluate('document.querySelector("#next-index").disabled'), true);
  assert.deepEqual(await actualTerms(), [[0, 2, 3, 0, 0], [1, -1, 2, 0, 0], [2, 3, 1, 2, 6]]);
  passed('actual Arrow/Tab/Enter controls expose every selected product and both navigation boundaries');

  await fill('#sequence-x', '1, 2');
  await fill('#sequence-h', '3, -1, 2');
  assert.deepEqual(await actualOutput(), [3, 5, 0, 4]);
  await evaluate('document.querySelector("#output-index").focus()');
  await key('Home'); await key('ArrowRight'); await key('ArrowRight');
  assert.equal(await text('#selected-output'), 'y[2] = 0');
  assert.deepEqual(await actualTerms(), [[0, 1, 2, 2, 2], [1, 2, 1, -1, -2]]);
  const calculation = await receiveDownload('#download-calculation', 'recallweave-finite-convolution-calculation.json');
  const record = JSON.parse(calculation.bytes.toString('utf8'));
  assert.deepEqual(record.x, [1, 2]); assert.deepEqual(record.h, [3, -1, 2]); assert.deepEqual(record.y, [3, 5, 0, 4]);
  assert.deepEqual(record.steps.map(step => step.value), record.y);
  assert.deepEqual(record.steps[2].terms.map(term => term.product), [2, -2]);
  passed('edited asymmetric inputs, cancellation, and completed calculation JSON preserve actual displayed values');

  await fill('#sequence-x', '0.0001, -0.0001');
  await fill('#sequence-h', '0.0001, 0.0001');
  assert.equal(await text('#output-values'), '[0.00000001, 0, -0.00000001]');
  await fill('#sequence-x', Array(24).fill('100').join(','));
  await fill('#sequence-h', Array(24).fill('100').join(','));
  const maximum = await actualOutput();
  assert.equal(maximum.length, 47); assert.equal(maximum[23], 240000);
  assert.equal(await evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth'), false);
  passed('minimum decimal products and maximum 47-entry output stay readable without page overflow');

  await fill('#sequence-x', '1,,2');
  assert.equal(await evaluate('document.querySelector("#calculation").hidden'), true);
  assert.equal(await evaluate('document.querySelector("#download-calculation").disabled && document.querySelector("#output-index").disabled'), true);
  assert.equal(await evaluate('document.querySelector("#output-plot").children.length + document.querySelector("#contribution-rows").children.length'), 0);
  assert.equal(await text('#output-values'), '');
  assert.match(await text('#calculation-status'), /empty comma-separated/);
  assert.equal(await evaluate('document.querySelector("#sequence-x").value'), '1,,2');
  await activate('[data-preset="average"]');
  assert.deepEqual(await actualOutput(), [0, 2, 2, 0]);
  await activate('[data-preset="difference"]');
  assert.deepEqual(await actualOutput(), [2, 0, 0, -2]);
  await activate('[data-preset="delay"]');
  assert.deepEqual(await actualOutput(), [0, 2, -1, 3]);
  passed('invalid edits retire the old result; keyboard presets restore finite average, difference, and delay behavior');

  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
  await activate('[data-preset="signed"]');
  await activate('#next-index');
  assert.equal(await evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth'), false);
  const tables = await evaluate('[...document.querySelectorAll(".table-wrap")].map(node => ({width:node.clientWidth, content:node.scrollWidth}))');
  report.mobileTable = tables;
  await evaluate('document.querySelector(".table-wrap").focus()');
  assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'), 'Per-index contributions');
  await key('ArrowRight');
  await waitFor(() => evaluate('document.querySelector(".table-wrap").scrollLeft > 0'), 'keyboard horizontal table scroll');
  assert.equal(await evaluate('getComputedStyle(document.querySelector("#contribution-scroll-help")).display'), 'block');
  await key('End');
  await capture('lab-mobile-contributions.png', '#step-title');
  assert.ok(pageRequests.every(url => /^(file:|blob:|data:)/.test(url)), 'Lab makes no HTTP request');
  const lesson = await receiveDownload('#download-course', 'recallweave-finite-convolution.json');
  assert.deepEqual(lesson.bytes, courseBytes);
  passed('390px layout preserves the real contribution table and completes an exact-byte offline lesson download');

  if (!standaloneOnly) await receiveCourse(base + '/index.html', lesson.path, 'mixed', 1280);
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve)); serverClosed = true;
  const standalone = pathToFileURL(join(project, 'demo.html')).href;
  if (standaloneOnly) await receiveCourse(standalone, lesson.path, 'mixed', 1280);
  await receiveCourse(standalone, lesson.path, 'correct', 390);
  assert.deepEqual(report.pageErrors, []);
  assert.deepEqual(report.forbiddenRequests, []);
  assert.deepEqual(report.protocolErrors, []);
  passed('all receiving pages finish without page exceptions or external HTTP attempts');
  for (const path of sources) assert.equal(sha(await readFile(join(project, path))), report.sourceSha256[path], path + ' changed during receiving');
  report.status = 'passed';
} catch (error) {
  report.status = 'failed'; report.error = error.stack ?? String(error); report.browserLog = browserLog; report.lastPageRequests = [...pageRequests];
  if (sessionId) {
    try {
      report.lastPage = await evaluate('({url:location.href,ready:document.readyState,focus:document.activeElement?.outerHTML,text:document.body.innerText.slice(0,6000)})');
      await capture('failed-state.png');
    } catch {}
  }
  console.error(report.error); process.exitCode = 1;
} finally {
  if (socket?.readyState === WebSocket.OPEN) {
    try { await command('Browser.close', {}, false); } catch {}
  }
  socket?.close();
  for (const item of pending.values()) clearTimeout(item.timer);
  if (browser && browser.exitCode === null) browser.kill('SIGTERM');
  if (!serverClosed) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  for (let i = 0; browser && browser.exitCode === null && i < 30; i++) await sleep(100);
  try { await rm(profile, { recursive: true, force: true }); report.ownedProfileRemoved = true; }
  catch (error) { report.cleanupError = error.message; report.status = 'failed'; process.exitCode = 1; }
  report.finishedAt = new Date().toISOString();
  await writeFile(join(output, 'browser-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(report.status.toUpperCase() + ': ' + report.checks.length + ' browser groups; ' + join(output, 'browser-report.json'));
}
