#!/usr/bin/env node
/** Optional browser acceptance: Node 22+ and an installed Chrome/Chromium executable. */
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
const profile = await mkdtemp(join(output, 'profile-'));
const report = {status: 'running', project, executable, checks: [], screenshots: [], sourceSha256: {}};
for (const path of ['src/app.mjs', 'src/knowledge.mjs', 'src/review.mjs', 'data/deck.json', 'demo.html', 'styles.css']) {
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
async function waitFor(check, label, steps = 160) {
  let lastError;
  for (let step = 0; step < steps; step++) {
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
    assert.equal(await evaluate(`document.activeElement.dataset.choice`), '0', 'First answer receives keyboard focus');
    const correct = mode === 'correct' || (mode === 'mixed' && index % 2 === 1);
    const choice = correct ? item.answer : (item.answer + 1 + index % (item.options.length - 1)) % item.options.length;
    for (let step = 0; step < choice; step++) await key('Tab');
    await key('Enter');
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
  }, 'browser startup', 450);
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
    } else if (message.method === 'Runtime.exceptionThrown') {
      pageErrors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
    } else if (message.method === 'Network.requestWillBeSent') {
      pageRequests.push(message.params.request.url);
    }
  });
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, {once: true}); socket.addEventListener('error', reject, {once: true}); });
  report.browser = await command('Browser.getVersion', {}, false);
  const {targetId} = await command('Target.createTarget', {url: 'about:blank'}, false);
  ({sessionId} = await command('Target.attachToTarget', {targetId, flatten: true}, false));
  await command('Page.enable');
  await command('Runtime.enable');
  await command('Network.enable');

  // Independent assertions; the outer CDP transport is reused unchanged from
  // the candidate's check_browser.mjs at SHA256 c86c6fe64d3650ab4602f26a0f4bb9346bd7b375f57f55bc139d90ef707e212f.
  report.reviewer = 'memory_capability';
  report.transportSha256 = 'c86c6fe64d3650ab4602f26a0f4bb9346bd7b375f57f55bc139d90ef707e212f';
  report.transportChange = 'Only startup allowance raised from 16s to 45s after retained pre-application startup timeout';
  report.rawSnapshots = [];

  const exactOriginal = () => evaluate(`({mastery, answers, asked: [...asked], review})`);
  const exactRound = () => evaluate(`({answers: practice?.answers ?? [], count: practice?.answers.length ?? 0,
    allFrozen: !!practice && Object.isFrozen(practice) && Object.isFrozen(practice.items)
      && Object.isFrozen(practice.answers) && practice.answers.every(Object.isFrozen)})`);
  async function assertOriginal(expected, label) {
    const actual = await exactOriginal();
    assert.deepEqual(actual, expected, label);
    report.rawSnapshots.push({label, stateSha256: createHash('sha256').update(JSON.stringify(actual)).digest('hex')});
  }
  async function space() {
    for (const type of ['keyDown', 'keyUp']) await command('Input.dispatchKeyEvent', {
      type, key: ' ', code: 'Space', windowsVirtualKeyCode: 32, nativeVirtualKeyCode: 32,
      ...(type === 'keyDown' ? {text: ' ', unmodifiedText: ' '} : {})
    });
  }
  async function physicalDoubleClick(selector) {
    const {x, y} = await evaluate(`(() => {
      const control = document.querySelector(${JSON.stringify(selector)});
      control.scrollIntoView({block: 'center'});
      const r = control.getBoundingClientRect();
      return {x: r.x + r.width / 2, y: r.y + r.height / 2};
    })()`);
    for (const clickCount of [1, 2]) {
      await command('Input.dispatchMouseEvent', {type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount});
      await command('Input.dispatchMouseEvent', {type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount});
      if (clickCount === 1) assert.equal(await evaluate('document.activeElement.id'), 'practice-next', 'Submitting one answer moves focus to the next action');
    }
  }
  async function resetByControl() {
    await activate('#reset-button');
    await waitFor(() => evaluate(`document.readyState === 'complete' && !!document.querySelector('#start-button')`), 'actual reset reload');
    assert.equal(await evaluate(`document.querySelectorAll('.review-item').length`), 0);
    assert.equal(await evaluate(`document.querySelector('[role="progressbar"]').getAttribute('aria-valuenow')`), '0');
  }

  // The direct-open build exposes its original lexical bindings. Read them
  // without assignments to compare the full precision state, beyond rounded UI.
  await command('Network.setBlockedURLs', {urls: ['http://*', 'https://*']});
  await navigate(pathToFileURL(join(project, 'demo.html')).href, 390, 844);
  const welcomeOriginal = await exactOriginal();
  await activate('#simulation-button');
  await assertOriginal(welcomeOriginal, 'welcome simulation leaves exact learner state intact');
  assert.equal(await evaluate('practice'), null);
  passed('the welcome-screen simulation does not alter learner or retry state');
  const direct = await lesson('missed');
  assert.equal(direct.state.reviewCount, deck.items.length, 'Every first answer must have an accessible review panel');
  assert.equal(direct.state.overflow, false);
  const original = await exactOriginal();
  assert.equal(original.answers.length, 6);
  assert.ok(original.answers.every(answer => answer.correct === false));
  const expectedMastery = initialMastery(deck.concepts);
  for (const answer of direct.firstAnswers) expectedMastery[answer.item.concept] = updateMastery(expectedMastery[answer.item.concept], answer.correct);
  assert.deepEqual(original.mastery, expectedMastery, 'First session retains exact native model values');
  assert.equal(await evaluate(`answers.every(Object.isFrozen) && Object.isFrozen(review)
    && review.every(row => Object.isFrozen(row) && Object.isFrozen(row.options))`), true);
  report.firstSession = {original, displayed: direct.state};
  passed('direct-open all-missed session retains exact native model and immutable review snapshots');

  await evaluate(`document.querySelector('.review-item summary').focus()`);
  await space();
  assert.equal(await evaluate(`document.querySelector('.review-item').open`), true, 'Space opens the native disclosure');
  const ax = await command('Accessibility.getFullAXTree');
  const disclosures = ax.nodes.filter(node => node.role?.value === 'DisclosureTriangle' && node.name?.value.includes('first try'));
  assert.equal(disclosures.length, 6, 'Every review disclosure appears in the accessibility tree');
  assert.equal(disclosures[0].properties.find(property => property.name === 'expanded').value.value, true);
  assert.ok(disclosures.every(node => node.name.value.includes('Needs review')));
  report.accessibility = disclosures.map(node => ({role: node.role.value, name: node.name.value,
    expanded: node.properties.find(property => property.name === 'expanded').value.value}));
  await space();
  assert.equal(await evaluate(`document.querySelector('.review-item').open`), false);
  passed('Space toggles review disclosures with expanded state and first-try labels in the accessibility tree');

  await activate('#practice-button');
  const missed = direct.firstAnswers;

  for (let index = 0; index < missed.length; index++) {
    assert.equal(await evaluate(`document.querySelector('.practice-card h2').textContent`), missed[index].item.prompt);
    const wrongChoice = (missed[index].item.answer + 2) % missed[index].item.options.length;
    await physicalDoubleClick(`[data-practice-choice="${wrongChoice}"]`);
    const round = await exactRound();
    assert.equal(round.count, index + 1, 'Rapid repeated physical clicks record one retry per question');
    assert.equal(round.allFrozen, true);
    assert.equal(round.answers[index].item, missed[index].item.id);
    assert.equal(round.answers[index].choice, wrongChoice);
    assert.equal(round.answers[index].correct, false);
    assert.equal(await evaluate(`document.querySelector('[role="progressbar"]').getAttribute('aria-valuenow')`), String(index + 1));
    await assertOriginal(original, `wrong retry ${index + 1} preserves exact original state`);
    if (index === missed.length - 1) await activate('#back-to-review');
    else await activate('#practice-next');
  }
  await assertOriginal(original, 'completion through Back preserves exact original state');
  const completed = await snapshot();
  assert.equal(completed.score, direct.state.score);
  assert.deepEqual(completed.estimates, direct.state.estimates);
  assert.equal(completed.focus, 'H2');
  assert.equal(await evaluate(`!!document.querySelector('#practice-button')`), false);
  assert.match(await evaluate(`document.querySelector('#practice-status').textContent`), /0 of 6 correctly on retry/);
  assert.equal(await evaluate(`document.querySelectorAll('.review-practice-answer').length`), 6);
  assert.equal(await evaluate(`document.querySelectorAll('.review-status.needs-review').length`), 6);
  assert.equal(await evaluate(`document.querySelectorAll('.review-practice-answer strong').length`), 6);
  report.completedRound = await exactRound();
  passed('six wrong retries remain separate, duplicate clicks are ignored, and Back from last feedback completes the bounded round');
  await activate('.review-item:first-child summary');
  assert.equal(await evaluate(`document.documentElement.scrollWidth > innerWidth`), false);
  await screenshot('independent-direct-review-mobile.png', '.review-item:first-child');

  await resetByControl();
  const fresh = await exactOriginal();
  assert.deepEqual(fresh.mastery, initialMastery(deck.concepts));
  assert.deepEqual(fresh.answers, []);
  assert.deepEqual(fresh.asked, []);
  assert.equal(fresh.review, null);
  assert.equal(await evaluate('practice'), null);
  assert.equal(await evaluate('inPractice'), false);
  const afterReset = await lesson('correct');
  assert.match(afterReset.state.score, /6 of 6 connections on the first try/);
  assert.equal(await evaluate(`document.querySelectorAll('.review-practice-answer').length`), 0);
  assert.equal(await evaluate(`!!document.querySelector('#practice-button')`), false);
  assert.equal(await evaluate('practice'), null);
  assert.ok(pageRequests.every(url => url.startsWith('file:')), 'The direct build never attempts a hosted request with HTTP(S) blocked');
  report.directRequests = [...pageRequests];
  report.directStorage = await evaluate('({local: localStorage.length, session: sessionStorage.length})');
  assert.deepEqual(report.directStorage, {local: 0, session: 0});
  passed('the actual direct-file reset clears both rounds and mastery; a new session has no stale retry data or hosted dependency');

  await command('Network.setBlockedURLs', {urls: []});
  await navigate(`${base}/index.html`);
  const modular = await lesson('mixed');
  const originalMarkup = await evaluate(`document.querySelector('#first-try-summary').textContent`);
  const originalAnswers = await evaluate(`[...document.querySelectorAll('.review-answers')].map(node => node.textContent)`);
  await activate('#practice-button');
  const firstMiss = modular.firstAnswers.find(answer => !answer.correct);
  await activate(`[data-practice-choice="${firstMiss.item.answer}"]`);
  await activate('#back-to-review');
  assert.equal(await evaluate(`document.querySelector('#first-try-summary').textContent`), originalMarkup);
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('.review-answers')].map(node => node.textContent)`), originalAnswers);
  assert.deepEqual((await snapshot()).estimates, modular.state.estimates);
  assert.match(await evaluate(`document.querySelector('#practice-status').textContent`), /1 of 3 answered/);
  await resetByControl();
  const modularFresh = await lesson('correct');
  assert.match(modularFresh.state.score, /6 of 6 connections on the first try/);
  assert.equal(await evaluate(`document.querySelectorAll('.review-practice-answer').length`), 0);
  assert.deepEqual(modularFresh.state.estimates, afterReset.state.estimates);
  assert.ok(pageRequests.every(url => url.startsWith(base)), 'Modular build requests only its loopback origin');
  report.modularRequests = [...pageRequests];
  passed('modular first-answer markup and mastery survive practice; the real reset discards a paused round and matches direct-file fresh results');
  assert.deepEqual(pageErrors, []);
  passed('all independently exercised browser paths complete without JavaScript exceptions');
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
