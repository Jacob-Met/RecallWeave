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
for (const path of ['src/app.mjs', 'src/knowledge.mjs', 'src/review.mjs', 'src/session-export.mjs', 'data/deck.json', 'demo.html', 'styles.css']) {
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


async function visibleOptions(attribute) {
  return evaluate(`[...document.querySelectorAll('[' + ${JSON.stringify(attribute)} + ']')].map((button, slot) => {
    const copy = button.cloneNode(true);
    const key = copy.querySelector('.choice-key');
    const label = key.textContent;
    key.remove();
    return {slot, choice: Number(button.getAttribute(${JSON.stringify(attribute)})), label, text: copy.textContent, disabled: button.disabled};
  })`);
}
async function assertOptions(item, attribute) {
  const options = await visibleOptions(attribute);
  assert.equal(options.length, item.options.length);
  assert.deepEqual(options.map(o => o.choice).sort((a,b) => a-b), item.options.map((_,i) => i));
  assert.deepEqual(options.map(o => o.label), item.options.map((_,i) => String.fromCharCode(65+i)));
  for (const option of options) assert.equal(option.text, item.options[option.choice]);
  const focusChoice = await evaluate('Number(document.activeElement.getAttribute(' + JSON.stringify(attribute) + '))');
  assert.equal(focusChoice, options[0].choice, 'keyboard focus begins at the first displayed option');
  return options;
}
async function chooseDisplayed(options, canonicalChoice, attribute) {
  const slot = options.findIndex(option => option.choice === canonicalChoice);
  assert.ok(slot >= 0);
  for (let i = 0; i < slot; i++) await key('Tab');
  assert.equal(await evaluate('Number(document.activeElement.getAttribute(' + JSON.stringify(attribute) + '))'), canonicalChoice);
  await key('Enter');
}
async function completedSnapshot() {
  return evaluate(`({
    summary: document.querySelector('#first-try-summary').textContent,
    estimates: [...document.querySelectorAll('.mastery-box output')].map(node => node.textContent),
    firstAnswers: [...document.querySelectorAll('.review-item')].map(item => ({
      prompt: item.querySelector('.review-prompt').textContent,
      answers: [...item.querySelectorAll('.review-answers dd')].map(node => node.textContent),
      status: item.querySelector('.review-status').textContent
    }))
  })`);
}
async function independentlyRunLesson(mode) {
  await activate('#start-button');
  const observed = [];
  const expectedMastery = initialMastery(deck.concepts);
  for (let turn = 0; turn < deck.items.length; turn++) {
    const prompt = await evaluate("document.querySelector('.question-card h2').textContent");
    const item = deck.items.find(item => item.prompt === prompt);
    assert.ok(item);
    assert.ok(!observed.some(row => row.item.id === item.id), 'question appears once per lesson');
    const options = await assertOptions(item, 'data-choice');
    const choice = mode === 'longest' ? options.reduce((longest, option) => option.text.length > longest.text.length ? option : longest).choice
      : mode === 'first' ? options[0].choice
      : mode === 'correct' || turn % 2 ? item.answer : (item.answer + 1) % item.options.length;
    await chooseDisplayed(options, choice, 'data-choice');
    const correct = choice === item.answer;
    const feedback = await evaluate(`({
      disabled: [...document.querySelectorAll('[data-choice]')].every(button => button.disabled),
      correct: [...document.querySelectorAll('[data-choice].correct')].map(button => Number(button.dataset.choice)),
      wrong: [...document.querySelectorAll('[data-choice].incorrect')].map(button => Number(button.dataset.choice)),
      text: document.querySelector('#feedback-slot').textContent
    })`);
    assert.equal(feedback.disabled, true);
    assert.deepEqual(feedback.correct, [item.answer]);
    assert.deepEqual(feedback.wrong, correct ? [] : [choice]);
    assert.ok(feedback.text.includes(item.explanation));
    assert.ok(feedback.text.includes(item.transfer));
    assert.equal(await evaluate('document.activeElement.id'), 'next-button');
    expectedMastery[item.concept] = updateMastery(expectedMastery[item.concept], correct);
    observed.push({item, choice, correct, order: options.map(option => option.choice)});
    await key('Enter');
  }
  const after = await completedSnapshot();
  const correct = observed.filter(row => row.correct).length;
  assert.ok(after.summary.includes(correct + ' of ' + deck.items.length + ' connections'));
  assert.deepEqual(after.estimates, deck.concepts.map(concept => Math.round(expectedMastery[concept]*100) + '%'));
  assert.equal(after.firstAnswers.length, deck.items.length);
  for (let i = 0; i < observed.length; i++) {
    const row = observed[i];
    assert.equal(after.firstAnswers[i].prompt, row.item.prompt);
    assert.deepEqual(after.firstAnswers[i].answers, [row.item.options[row.choice], row.item.options[row.item.answer]]);
    assert.ok(after.firstAnswers[i].status.startsWith(row.correct ? 'Correct' : 'Needs review'));
  }
  return {observed, after, correct};
}
async function independentlyRunPractice(session) {
  const missed = session.observed.filter(row => !row.correct);
  assert.ok(missed.length);
  await activate('#practice-button');
  const retries = [];
  for (let turn = 0; turn < missed.length; turn++) {
    const row = missed[turn];
    assert.equal(await evaluate("document.querySelector('.practice-card h2').textContent"), row.item.prompt);
    let options = await assertOptions(row.item, 'data-practice-choice');
    assert.deepEqual(options.map(option => option.choice), row.order, 'practice preserves the session question order');
    if (turn === 0) {
      for (let i = 0; i < options.length; i++) await key('Tab');
      assert.equal(await evaluate('document.activeElement.id'), 'back-to-review');
      await key('Enter');
      assert.deepEqual(await completedSnapshot(), session.after, 'unanswered pause preserves first answers');
      await activate('#practice-button');
      options = await assertOptions(row.item, 'data-practice-choice');
      assert.deepEqual(options.map(option => option.choice), row.order, 'unanswered resume cannot remap an option');
    }
    const choice = turn === 0 ? (row.item.answer + 2) % row.item.options.length : row.item.answer;
    await chooseDisplayed(options, choice, 'data-practice-choice');
    assert.equal(await evaluate('document.activeElement.id'), 'practice-next');
    const result = await evaluate(`({
      correct: [...document.querySelectorAll('[data-practice-choice].correct')].map(button => Number(button.dataset.practiceChoice)),
      wrong: [...document.querySelectorAll('[data-practice-choice].incorrect')].map(button => Number(button.dataset.practiceChoice)),
      disabled: [...document.querySelectorAll('[data-practice-choice]')].every(button => button.disabled),
      text: document.querySelector('#practice-feedback').textContent
    })`);
    assert.deepEqual(result.correct, [row.item.answer]);
    assert.deepEqual(result.wrong, choice === row.item.answer ? [] : [choice]);
    assert.equal(result.disabled, true);
    assert.ok(result.text.includes(row.item.options[row.item.answer]));
    retries.push({id:row.item.id, prompt:row.item.prompt, choice, correct:choice===row.item.answer, text:row.item.options[choice]});
    await key('Enter');
  }
  assert.deepEqual(await completedSnapshot(), session.after, 'practice cannot rewrite original first-answer state');
  const rendered = await evaluate(`[...document.querySelectorAll('.review-item')].filter(item => item.querySelector('.review-practice-answer')).map(item => ({
    prompt: item.querySelector('.review-prompt').textContent,
    answer: item.querySelector('.review-practice-answer p').textContent
  }))`);
  assert.deepEqual(rendered, retries.map(row => ({prompt:row.prompt, answer:row.text})));
  assert.equal(await evaluate("!!document.querySelector('#practice-button')"), false);
  return retries;
}

async function saveAndCheckCanonicalNotes(name, session, retries) {
  const before = await completedSnapshot();
  const priorRequests = [...pageRequests];
  const previous = new Set(downloads.keys());
  await activate('#save-notes-button');
  let completed;
  await waitFor(() => {
    completed = [...downloads.values()].find(value => !previous.has(value.guid) && value.state === 'completed');
    return !!completed;
  }, 'real study-note download');
  assert.match(completed.suggestedFilename, /^recallweave-study-notes-\d{4}-\d{2}-\d{2}\.txt$/);
  const bytes = await readFile(join(downloadPath, completed.guid));
  const content = new TextDecoder('utf-8', {fatal:true}).decode(bytes);
  assert.ok(content.includes(session.correct + ' of ' + deck.items.length + ' connections correct on the first try.'));
  assert.ok(content.includes('MODEL STATE, NOT A GRADE'));
  assert.ok(content.includes(deck.attribution));
  assert.ok(content.includes(deck.license));
  let cursor = 0;
  for (let i=0; i<session.observed.length; i++) {
    const row=session.observed[i];
    const heading=(i+1)+'. '+row.item.prompt;
    const start=content.indexOf(heading,cursor);
    assert.ok(start>=cursor, 'original question order remains in notes');
    const next=content.indexOf('\n'+(i+2)+'. ',start+heading.length);
    const block=content.slice(start,next<0?undefined:next);
    assert.ok(block.includes('Your first answer: '+row.item.options[row.choice]));
    assert.ok(block.includes('Correct answer: '+row.item.options[row.item.answer]));
    assert.ok(block.includes('Explanation: '+row.item.explanation));
    assert.ok(block.includes('Apply the idea: '+row.item.transfer));
    const retry=retries.find(answer=>answer.id===row.item.id);
    if(retry) assert.ok(block.includes('Practice answer: '+retry.text));
    else if(!row.correct) assert.ok(block.includes('Practice answer: not recorded.'));
    cursor=start+heading.length;
  }
  assert.deepEqual(await completedSnapshot(),before);
  assert.deepEqual(pageRequests,priorRequests,'download does not make a network request');
  await writeFile(join(output,name),bytes);
  report.downloads.push({file:name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
}
const downloadPath=join(output,'downloads');
await mkdir(downloadPath,{recursive:true});
const downloads=new Map();
report.downloads=[];
socket.addEventListener('message',event=>{
  const message=JSON.parse(event.data);
  if(message.method==='Browser.downloadWillBegin'||message.method==='Browser.downloadProgress') {
    downloads.set(message.params.guid,{...downloads.get(message.params.guid),...message.params});
  }
});
await command('Browser.setDownloadBehavior',{behavior:'allowAndName',downloadPath,eventsEnabled:true},false);

report.independentReceiver = 'Canonical choice identity through physical keyboard input; inherited CDP launch/transport only';
const violations = [];
await command('Page.addScriptToEvaluateOnNewDocument', {source: `(() => {
  let state = 0x6d2b79f5;
  Math.random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
})()`});

await navigate(base + '/index.html');
const firstOnly = await independentlyRunLesson('longest');
report.longestOptionRun = {correct:firstOnly.correct, total:deck.items.length,
  questions:firstOnly.observed.map(row => ({id:row.item.id, order:row.order, chosen:row.choice, correct:row.correct}))};
if (firstOnly.correct === deck.items.length) violations.push('Choosing the longest visible option still receives every answer correct');
passed('longest-visible-option strategy is scored from its actual canonical selections');

await navigate(base + '/index.html');
const mixed = await independentlyRunLesson('mixed');
report.mixedRun = mixed.observed.map(row => ({id:row.item.id, order:row.order, chosen:row.choice, correct:row.correct}));
await saveAndCheckCanonicalNotes('modular-first-answers.txt', mixed, []);
report.practice = await independentlyRunPractice(mixed);
await saveAndCheckCanonicalNotes('modular-practice-answers.txt', mixed, report.practice);
passed('actual saved study-note bytes retain canonical first answers and separately selected retries');
passed('physical Tab/Enter input preserves canonical scoring, feedback, first-answer review and mastery');
passed('practice keeps the original question permutation through pause/resume and records separate retry text');
await screenshot('independent-canonical-review.png', '.result-card');

await navigate(base + '/index.html', 390, 844);
const correct = await independentlyRunLesson('correct');
assert.equal(correct.correct, deck.items.length);
assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'), false);
assert.equal(await evaluate("!!document.querySelector('#practice-button')"), false);
passed('all correct canonical choices remain achievable by keyboard on the 390px layout');

await command('Network.setBlockedURLs', {urls:['http://*', 'https://*']});
await navigate(pathToFileURL(join(project, 'demo.html')).href);
const direct = await independentlyRunLesson('mixed');
assert.deepEqual(direct.observed.map(row => ({id:row.item.id,order:row.order,chosen:row.choice})),
  mixed.observed.map(row => ({id:row.item.id,order:row.order,chosen:row.choice})),
  'same controlled random stream presents identical choices in modular and standalone versions');
const directRetries = await independentlyRunPractice(direct);
await saveAndCheckCanonicalNotes('standalone-practice-answers.txt', direct, directRetries);
assert.ok(pageRequests.every(url => url.startsWith('file:')));
passed('standalone lesson and practice preserve identical canonical behavior with HTTP(S) blocked');
assert.deepEqual(pageErrors, []);
passed('all observed page paths complete without JavaScript exceptions');
report.violations = violations;
assert.deepEqual(violations, []);
passed('revised content removes the demonstrated universally correct longest-option cue');
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
