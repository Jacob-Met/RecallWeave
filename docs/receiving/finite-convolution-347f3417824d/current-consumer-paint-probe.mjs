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
const sources = ["src/deck.mjs", "src/deck-picker.mjs", "src/app.mjs", "src/knowledge.mjs", "src/review.mjs", "src/reflections.mjs", "src/session-export.mjs", "src/answer-order.mjs", "src/trace-archive.mjs", "src/trace-archive-ui.mjs", "data/deck.json", "index.html", "styles.css", "demo.html", "tools/make_demo.py"];
const report = { status: 'running', project, executable, startedAt: new Date().toISOString(), checks: [], sourceSha256: {}, downloads: [], screenshots: [], forbiddenRequests: [], pageErrors: [], protocolErrors: [] };
for (const path of sources) report.sourceSha256[path] = sha(await readFile(join(project, path)));
report.receivingFunctionSha256 = "224efed11792b1c517ef7621ce50c148508184bcbd00ca6078b18f1f217e7431";
report.receivingScope = 'Current-main 3cdebd86 published standalone learner; current consumer delta only; model/lab suites not repeated';
report.courseRuns = [];
assert.ok(args.includes('--course-file'), 'Receiving requires the actual downloaded course path.');
const coursePath = resolve(option('--course-file', ''));
const courseBytes = await readFile(coursePath);
assert.equal(sha(courseBytes), '452154af5c1975c3d03752173582aa6bf7bee01958b9fc9be0b1ebf1be58ec12');
report.importedCourse = { path: coursePath, bytes: courseBytes.length, sha256: sha(courseBytes) };
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
  await command('Page.bringToFront');
  await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  await sleep(150);
  report.captureDOM = await evaluate('({resultCards: document.querySelectorAll(".result-card").length, resultHeadings: [...document.querySelectorAll("h2")].filter(el => el.textContent.trim() === "Notice the links you built.").length, firstTrySummaries: document.querySelectorAll("#first-try-summary").length, reviewItems: document.querySelectorAll(".review-item").length, bodyTextHeadingCount: document.body.innerText.split("Notice the links you built.").length - 1, viewport: {width: innerWidth, height: innerHeight}, scrollY, scrollHeight: document.documentElement.scrollHeight})');
  assert.deepEqual([report.captureDOM.resultCards, report.captureDOM.resultHeadings, report.captureDOM.firstTrySummaries, report.captureDOM.bodyTextHeadingCount], [1,1,1,1]);
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

  const lesson = { path: coursePath };
  if (!standaloneOnly) await receiveCourse(base + '/index.html', lesson.path, 'mixed', 1280);
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve)); serverClosed = true;
  const standalone = pathToFileURL(join(project, 'demo.html')).href;
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
