#!/usr/bin/env node
/** Focused real-browser receiving: Node 22+ and an existing Chrome/Chromium binary. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DEFAULT_BKT } from '../src/knowledge.mjs';
import { createWalkthrough, walkthroughText, MAX_WALKTHROUGH_RESPONSES } from '../src/model-walkthrough.mjs';

const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const project = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'));
const executable = option('--browser', 'chromium');
const entry = option('--entry', 'both');
const focus = option('--focus', 'all');
assert.ok(['all', 'formatting', 'hook'].includes(focus), '--focus must be all, formatting or hook');
assert.ok(['standalone', 'modular', 'both'].includes(entry), '--entry must be standalone, modular or both');
assert.ok(option('--output'), 'Supply a new --output directory to retain this run.');
const output = resolve(option('--output'));
await mkdir(output); // Refuse an existing evidence directory.
const profile = join(output, 'profile');
const downloads = join(output, 'downloads');
await mkdir(downloads);
const inputs = ['src/knowledge.mjs', 'src/model-walkthrough.mjs', 'src/model-walkthrough-ui.mjs',
  'model-walkthrough/index.html', 'model-walkthrough/model-walkthrough.css', 'model-walkthrough.html',
  'index.html', 'demo.html', 'tools/make_model_walkthrough.py', 'tools/check_model_walkthrough_browser.mjs'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceHashes = async () => Object.fromEntries(await Promise.all(inputs.map(async path => [path, hash(await readFile(join(project, path)))])));
const report = { status: 'running', startedAt: new Date().toISOString(), project, executable, entry, focus,
  sourceBefore: await sourceHashes(), checks: [], downloads: [], screenshots: [], requests: [], pageErrors: [] };
const server = createServer(async (request, response) => {
  try {
    (report.serverRequests ??= []).push({ url: request.url, at: new Date().toISOString() });
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (pathname === '/favicon.ico') { response.writeHead(204).end(); return; }
    const file = resolve(project, `.${pathname}`);
    if (!file.startsWith(`${project}/`)) { response.writeHead(403).end(); return; }
    const mime = { '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css' }[extname(file)];
    response.writeHead(200, { 'Content-Type': `${mime ?? 'application/octet-stream'}; charset=utf-8` });
    response.end(await readFile(file));
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const pending = new Map();
const downloadState = new Map();
let socket, sessionId, browser, serial = 0, browserLog = '';
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
async function waitFor(check, label) {
  let last;
  for (let index = 0; index < 100; index++) {
    try { if (await check()) return; } catch (error) { last = error; }
    await sleep(100);
  }
  throw new Error(`Timed out: ${label}${last ? ` (${last.message})` : ''}`);
}
function command(method, params = {}, scoped = true) {
  const id = ++serial;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 10000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params, ...(scoped && sessionId ? { sessionId } : {}) }));
  });
}
async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  return result.result.value;
}
async function key(name) {
  const codes = { Enter: 13, ArrowDown: 40, ArrowUp: 38, Tab: 9, ' ': 32, i: 73, c: 67 };
  for (const type of ['keyDown', 'keyUp']) {
    await command('Input.dispatchKeyEvent', { type, key: name, code: name === ' ' ? 'Space' : name === 'i' ? 'KeyI' : name === 'c' ? 'KeyC' : name,
      windowsVirtualKeyCode: codes[name],
      ...(type === 'keyDown' && ['Enter', ' ', 'i', 'c'].includes(name) ? { text: name === 'Enter' ? '\r' : name } : {}) });
  }
}
async function activate(selector) {
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
  await key('Enter');
}
async function changeResponse(index, direction) {
  await evaluate(`document.querySelector('[data-edit="${index}"]').focus()`);
  const actions = [];
  for (const name of [direction === 'ArrowDown' ? 'i' : 'c', 'Tab']) {
    await key(name);
    actions.push({ key: name, state: await evaluate(`({ value: document.querySelector('[data-edit="${index}"]').value, focus: document.activeElement.tagName })`) });
  }
  (report.nativeSelectActions ??= []).push({ index, actions });
}
async function enter(name, text) {
  await evaluate(`document.getElementById(${JSON.stringify(name)}).focus(); document.getElementById(${JSON.stringify(name)}).select()`);
  // Editing commands use the browser's native input path; no source function is replaced.
  await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
  await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
  if (text) await command('Input.insertText', { text });
  assert.equal(await evaluate(`document.getElementById(${JSON.stringify(name)}).value`), text);
}
async function navigate(url, width = 1280, height = 1000, selector = '#response-history') {
  await command('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  await command('Page.navigate', { url });
  await waitFor(() => evaluate(`document.URL === ${JSON.stringify(url)} && document.readyState === 'complete' && !!document.querySelector(${JSON.stringify(selector)})`), 'page ready');
}
const percent = value => `${(value * 100).toFixed(2)}%`;
async function assertTrace(responses, parameters = DEFAULT_BKT) {
  const expected = createWalkthrough(responses, parameters);
  const observed = await evaluate(`({
    responses: [...document.querySelectorAll('[data-edit]')].map(node => node.value === 'true'),
    final: document.getElementById('final-estimate').textContent,
    count: document.getElementById('response-count').textContent,
    empty: !document.getElementById('empty-history').hidden
  })`);
  assert.deepEqual(observed.responses, responses);
  assert.equal(observed.final, percent(expected.finalMastery));
  assert.equal(observed.count, `${responses.length} / ${MAX_WALKTHROUGH_RESPONSES}`);
  assert.equal(observed.empty, responses.length === 0);
  return expected;
}
async function screenshot(name, selector) {
  if (selector) await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({ block: 'start' })`);
  const { data } = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const bytes = Buffer.from(data, 'base64');
  await writeFile(join(output, name), bytes);
  report.screenshots.push({ path: name, sha256: hash(bytes) });
}
async function checkFormatting(mode) {
  await activate('#clear-responses');
  const parameters = { initial: .5, guess: 1e-8, slip: .99999999, learn: 0 };
  for (const [name, value] of Object.entries(parameters)) await enter(name, String(value));
  await activate('#apply-assumptions');
  await activate('#add-correct');
  const expected = await assertTrace([true], parameters);
  const equation = await evaluate('document.getElementById("posterior-calculation").textContent');
  const [fraction] = equation.split(' ≈ ');
  const [numerator, denominator] = fraction.split(' / ').map(Number);
  assert.ok(numerator > 0 && denominator > 0, equation);
  assert.ok(Math.abs(numerator / denominator - expected.steps[0].posterior) < 1e-6, equation);
  assert.match(equation, /e-9 \/ .*e-8/);
  (report.formattingObservations ??= []).push({ mode, parameters, equation, actualPosterior: expected.steps[0].posterior,
    weights: await evaluate('({known: document.getElementById("known-weight").textContent, unknown: document.getElementById("unknown-weight").textContent})') });
  await screenshot(`${mode}-tiny-probabilities.png`, '.calculation');
  passed(`${mode}: tiny nonzero evidence operands remain nonzero in the actual equation`);

  await activate('#clear-responses');
  const nearOne = { ...DEFAULT_BKT, initial: .99999999, learn: 0 };
  for (const [name, value] of Object.entries(nearOne)) await enter(name, String(value));
  await activate('#apply-assumptions'); await activate('#add-correct');
  const one = await assertTrace([true], nearOne);
  const learning = await evaluate('document.getElementById("learning-calculation").textContent');
  assert.ok(one.steps[0].posterior < 1);
  assert.ok(learning.includes(String(one.steps[0].posterior)), learning);
  report.formattingObservations.push({ mode, parameters: nearOne, learning, actualPosterior: one.steps[0].posterior });
  passed(`${mode}: near-one interior operands retain their difference from one`);
}
function passed(name) { report.checks.push(name); console.log(`PASS ${name}`); }

try {
  const probe = await fetch(`${base}/model-walkthrough/index.html`, { signal: AbortSignal.timeout(3000) });
  const probeBody = await probe.text();
  assert.equal(probe.status, 200);
  assert.equal(probeBody, await readFile(join(project, 'model-walkthrough/index.html'), 'utf8'));
  report.loopbackProbe = { status: probe.status, sha256: hash(Buffer.from(probeBody)) };
  browser = spawn(executable, ['--headless=new', '--disable-gpu', '--disable-background-networking',
    '--disable-component-update', '--disable-sync', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'],
    { stdio: ['ignore', 'ignore', 'pipe'] });
  let launchError;
  browser.on('error', error => { launchError = error; });
  browser.stderr.on('data', data => { browserLog += data.toString(); });
  let port, endpoint;
  await waitFor(async () => {
    if (launchError) throw launchError;
    if (browser.exitCode !== null) throw new Error(`Browser exit ${browser.exitCode}`);
    [port, endpoint] = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).trim().split('\n');
    return port && endpoint;
  }, 'isolated browser startup');
  socket = new WebSocket(`ws://127.0.0.1:${port}${endpoint}`);
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id); clearTimeout(request.timer);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result);
    } else if (message.method === 'Runtime.exceptionThrown') {
      report.pageErrors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
    } else if (message.method === 'Network.requestWillBeSent') {
      report.requests.push(message.params.request.url);
    } else if (message.method === 'Network.loadingFailed') {
      (report.networkFailures ??= []).push(message.params);
    } else if (message.method === 'Network.responseReceived') {
      (report.responses ??= []).push({ url: message.params.response.url, status: message.params.response.status });
    } else if (message.method === 'Browser.downloadWillBegin') {
      downloadState.set(message.params.guid, { ...message.params, state: 'inProgress' });
    } else if (message.method === 'Browser.downloadProgress') {
      const prior = downloadState.get(message.params.guid) ?? {};
      downloadState.set(message.params.guid, { ...prior, ...message.params });
    }
  });
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  report.browser = await command('Browser.getVersion', {}, false);
  const { targetId } = await command('Target.createTarget', { url: 'about:blank' }, false);
  ({ sessionId } = await command('Target.attachToTarget', { targetId, flatten: true }, false));
  await command('Page.enable'); await command('Runtime.enable'); await command('Network.enable');
  await command('Browser.setDownloadBehavior', { behavior: 'allowAndName', downloadPath: downloads, eventsEnabled: true }, false);

  for (const [mode, url] of [['standalone', pathToFileURL(join(project, 'model-walkthrough.html')).href], ['modular', `${base}/model-walkthrough/index.html`]].filter(([mode]) => focus !== 'hook' && (entry === 'both' || entry === mode))) {
    await navigate(url);
    await checkFormatting(mode);
    if (focus === 'formatting') continue;
    await navigate(url);
    await assertTrace([true, false]);
    assert.match(await evaluate('document.querySelector(".scope-note").textContent'), /hypothetical.*one concept/s);
    assert.match(await evaluate('document.querySelector(".scope-note").textContent'), /never reads or changes your lesson/);
    passed(`${mode}: actual opening example and explicit scope`);
    await activate('#add-correct');
    await assertTrace([true, false, true]);
    await activate('[data-inspect="0"]');
    assert.equal(await evaluate('document.activeElement.id'), 'calculation-title');
    assert.equal(await evaluate('document.getElementById("posterior-value").textContent'), percent(createWalkthrough([true]).steps[0].posterior));
    await screenshot(`${mode}-desktop.png`, '.calculation');
    passed(`${mode}: keyboard append and inspect show the real update`);
    await changeResponse(0, 'ArrowDown');
    await assertTrace([false, false, true]);
    passed(`${mode}: native select edit recomputes later estimates`);

    await enter('initial', '');
    assert.equal(await evaluate('document.getElementById("add-correct").disabled'), true);
    await activate('#apply-assumptions');
    assert.match(await evaluate('document.getElementById("action-status").textContent'), /blank does not mean zero/);
    await assertTrace([false, false, true]);
    await enter('initial', '.22');
    await enter('guess', '1.1');
    await activate('#apply-assumptions');
    assert.match(await evaluate('document.getElementById("action-status").textContent'), /finite number from 0 to 1/);
    await assertTrace([false, false, true]);
    passed(`${mode}: empty and out-of-range drafts preserve the complete applied trace`);

    await enter('guess', '.35');
    await assertTrace([false, false, true]);
    await activate('#apply-assumptions');
    await assertTrace([false, false, true], { ...DEFAULT_BKT, guess: .35 });
    await enter('guess', '0'); await enter('slip', '1');
    await activate('#apply-assumptions');
    assert.match(await evaluate('document.getElementById("action-status").textContent'), /Response 3:.*zero probability/);
    await assertTrace([false, false, true], { ...DEFAULT_BKT, guess: .35 });
    passed(`${mode}: applied edits recompute; impossible history is refused atomically`);

    await activate('#restore-defaults');
    await assertTrace([false, false, true]);
    await activate('#clear-responses');
    await assertTrace([]);
    assert.equal(await evaluate('document.getElementById("undo-response").disabled'), true);
    assert.equal(await evaluate('document.getElementById("posterior-value").textContent'), '—');
    for (const [name, value] of [['initial', '0'], ['guess', '0'], ['slip', '1'], ['learn', '0']]) await enter(name, value);
    await activate('#apply-assumptions');
    const boundary = { initial: 0, guess: 0, slip: 1, learn: 0 };
    await assertTrace([], boundary);
    await activate('#add-correct');
    assert.match(await evaluate('document.getElementById("action-status").textContent'), /zero probability/);
    await assertTrace([], boundary);
    await activate('#add-incorrect');
    await assertTrace([false], boundary);
    await changeResponse(0, 'ArrowUp');
    await assertTrace([false], boundary);
    assert.match(await evaluate('document.getElementById("action-status").textContent'), /zero probability/);
    passed(`${mode}: endpoint add and edit refusals retain state and selected outcome`);

    await activate('#restore-defaults'); await activate('#clear-responses');
    const sequence = [];
    for (let index = 0; index < MAX_WALKTHROUGH_RESPONSES; index++) {
      sequence.push(index % 3 !== 1);
      await activate(sequence.at(-1) ? '#add-correct' : '#add-incorrect');
    }
    await assertTrace(sequence);
    assert.equal(await evaluate('document.getElementById("add-correct").disabled && document.getElementById("add-incorrect").disabled'), true);
    await activate('#undo-response'); sequence.pop();
    await assertTrace(sequence);
    assert.equal(await evaluate('document.getElementById("add-correct").disabled'), false);
    passed(`${mode}: response cap and undo recovery`);
    const previousDownloads = new Set(downloadState.keys());
    await activate('#download-walkthrough');
    let downloaded;
    await waitFor(() => {
      downloaded = [...downloadState.values()].find(item => !previousDownloads.has(item.guid) && item.state === 'completed');
      return downloaded;
    }, 'actual browser download');
    const bytes = await readFile(join(downloads, downloaded.guid));
    assert.equal(bytes.toString('utf8'), walkthroughText(createWalkthrough(sequence)));
    await writeFile(join(output, `${mode}-download.txt`), bytes);
    report.downloads.push({ mode, ...downloaded, sha256: hash(bytes), bytes: bytes.length });
    passed(`${mode}: actual downloaded bytes match full-precision applied trace`);

    await navigate(url, 390, 844);
    await assertTrace([true, false]);
    assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'), false);
    await screenshot(`${mode}-mobile.png`, '.calculation');
    passed(`${mode}: 390-pixel layout has no horizontal page overflow`);
  }

  if (focus !== 'formatting') {
  await navigate(pathToFileURL(join(project, 'demo.html')).href, 1280, 1000, '#start-button');
  await activate('#start-button');
  await waitFor(() => evaluate('!!document.querySelector(".question-card")'), 'real lesson question');
  const lessonBefore = await evaluate('document.getElementById("session-content").innerHTML');
  await activate('details.model-note summary');
  const targetsBefore = new Set((await command('Target.getTargets', {}, false)).targetInfos.map(item => item.targetId));
  await activate('details.model-note a');
  let opened;
  await waitFor(async () => {
    opened = (await command('Target.getTargets', {}, false)).targetInfos.find(item => !targetsBefore.has(item.targetId) && item.url.endsWith('/model-walkthrough.html'));
    return opened;
  }, 'separate optional walkthrough target');
  const lessonSession = sessionId;
  ({ sessionId } = await command('Target.attachToTarget', { targetId: opened.targetId, flatten: true }, false));
  await command('Runtime.enable');
  await waitFor(() => evaluate('document.readyState === "complete" && !!document.getElementById("response-history") && document.querySelectorAll("[data-edit]").length === 2'), 'new walkthrough tab ready');
  report.lessonHook = { openedUrl: opened.url, openedTitle: await evaluate('document.getElementById("page-title").textContent'),
    beforeSha256: hash(Buffer.from(lessonBefore)) };
  sessionId = lessonSession;
  const lessonAfter = await evaluate('document.getElementById("session-content").innerHTML');
  assert.equal(lessonAfter, lessonBefore);
  report.lessonHook.afterSha256 = hash(Buffer.from(lessonAfter));
  await command('Target.closeTarget', { targetId: opened.targetId }, false);
  passed('real learner hook opens a separate walkthrough and preserves the current question');
  }

  assert.deepEqual(report.pageErrors, []);
  assert.ok(report.requests.every(url => url.startsWith(pathToFileURL(project + '/').href) || url.startsWith(base + '/') || url.startsWith('blob:')));
  passed('no page exceptions or external page requests');
  report.status = 'passed';
} catch (error) {
  report.status = 'failed';
  report.error = error.stack;
  process.exitCode = 1;
  if (sessionId) try { await screenshot('failure.png'); } catch {}
} finally {
  report.finishedAt = new Date().toISOString();
  report.sourceAfter = await sourceHashes();
  if (JSON.stringify(report.sourceBefore) !== JSON.stringify(report.sourceAfter)) {
    report.status = 'failed'; report.sourceChanged = true; process.exitCode = 1;
  }
  if (socket?.readyState === WebSocket.OPEN) {
    try { await command('Browser.close', {}, false); } catch {}
    socket.close();
  }
  if (browser && browser.exitCode === null) browser.kill('SIGTERM');
  await new Promise(resolve => server.close(resolve));
  await writeFile(join(output, 'browser-stderr.log'), browserLog);
  await writeFile(join(output, 'result.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ status: report.status, checks: report.checks.length, error: report.error, output }));
}
