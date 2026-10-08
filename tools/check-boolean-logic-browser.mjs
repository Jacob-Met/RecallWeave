#!/usr/bin/env node
/** Actual Chromium/CDP receiving, using the repository's dependency-free Node 22 convention. */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile, writeFile, mkdir, mkdtemp, rm, rename} from 'node:fs/promises';
import {resolve, dirname, join, basename} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const project = resolve(option('--root', join(dirname(fileURLToPath(import.meta.url)), '..')));
const executable = option('--browser', 'chromium');
const output = resolve(option('--output', join(project, 'boolean-browser-receiving')));
await mkdir(output, {recursive: true});
const profile = await mkdtemp(join(output, 'profile-'));
const downloadsDir = join(output, 'downloads');
await mkdir(downloadsDir, {recursive: true});
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const sourcePaths = ['src/boolean-logic.mjs', 'src/boolean-logic-ui.mjs', 'templates/boolean-logic-explorer.html', 'tools/build-boolean-logic.mjs', 'tools/check-boolean-logic-browser.mjs', 'courses/boolean-logic.json', 'courses/boolean-logic-explorer.html', 'src/deck.mjs', 'src/knowledge.mjs', 'src/review.mjs', 'src/trace-archive.mjs', 'src/app.mjs', 'src/deck-picker.mjs', 'src/answer-order.mjs', 'src/session-export.mjs', 'demo.html'];
const report = {kind: 'actual Chromium direct-file receiving', project, executable, node: process.version, startedAt: new Date().toISOString(), status: 'running', checks: [], downloads: [], pageErrors: [], requests: [], sourceBefore: {}, sourceAfter: {}, screenshots: [], fixtures: []};
for (const path of sourcePaths) report.sourceBefore[path] = digest(await readFile(join(project, path)));
const courseBytes = await readFile(join(project, 'courses/boolean-logic.json'));
const course = JSON.parse(courseBytes);
const expectedAnswers = new Map([
  ['logic-connectives-1', 1], ['logic-connectives-2', 3], ['logic-connectives-3', 0],
  ['logic-implication-1', 2], ['logic-implication-2', 0], ['logic-implication-3', 2],
  ['logic-equivalence-1', 3], ['logic-equivalence-2', 1], ['logic-equivalence-3', 2],
  ['logic-inference-1', 1], ['logic-inference-2', 0], ['logic-inference-3', 3]
]);
assert.deepEqual(course.items.map(item => [item.id, item.answer]), [...expectedAnswers]);

let browser, socket, sessionId;
let sequence = 0;
let browserLog = '';
const pending = new Map();
const downloadEvents = [];
const completed = new Set();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(check, label) {
  let last;
  for (let step = 0; step < 150; step++) {
    try { if (await check()) return; } catch (error) { last = error; }
    await sleep(100);
  }
  throw new Error(`Timed out: ${label}${last ? `: ${last.message}` : ''}`);
}
function command(method, params = {}, scoped = true) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {pending.delete(id); reject(new Error(`CDP timeout: ${method}`));}, 12000);
    pending.set(id, {resolve, reject, timer});
    socket.send(JSON.stringify({id, method, params, ...(scoped && sessionId ? {sessionId} : {})}));
  });
}
async function evaluate(expression) {
  const result = await command('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true});
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  return result.result.value;
}
async function key(name, modifiers = 0) {
  const keys = {Enter: [13, 'Enter', '\r'], Tab: [9, 'Tab'], a: [65, 'KeyA'], ' ': [32, 'Space', ' ']};
  const [code, physical, text] = keys[name];
  for (const type of ['keyDown', 'keyUp']) await command('Input.dispatchKeyEvent', {type, key: name, code: physical, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code, modifiers, ...(type === 'keyDown' && text ? {text, unmodifiedText: text} : {})});
}
async function activate(selector) {
  assert.ok(await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`), selector);
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
  assert.ok(await evaluate(`document.activeElement.matches(${JSON.stringify(selector)})`), `Control receives focus: ${selector}`);
  await key('Enter');
}
async function fill(selector, text) {
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
  await key('a', 2);
  if (text) await command('Input.insertText', {text});
  else for (const type of ['keyDown', 'keyUp']) await command('Input.dispatchKeyEvent', {type, key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8, nativeVirtualKeyCode: 8});
}
async function expressions(left, right = '') { await fill('#expression-left', left); await fill('#expression-right', right); }
async function rows() { return evaluate(`[...document.querySelectorAll('#truth-body tr')].map(row => [...row.querySelectorAll('td')].map(cell => cell.textContent))`); }
async function navigate(path, ready, width = 1280, height = 950) {
  await command('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: false});
  const url = pathToFileURL(path).href;
  await command('Page.navigate', {url});
  await waitFor(() => evaluate(`document.URL === ${JSON.stringify(url)} && document.readyState === 'complete' && !!document.querySelector(${JSON.stringify(ready)})`), 'direct-file page ready');
}
async function capture(name, selector) {
  if (selector) await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'start'})`);
  const {data} = await command('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false});
  const bytes = Buffer.from(data, 'base64');
  await writeFile(join(output, name), bytes);
  report.screenshots.push({path: name, sha256: digest(bytes), bytes: bytes.length});
}
async function download(selector, expectedName) {
  const before = downloadEvents.length;
  await activate(selector);
  await waitFor(() => downloadEvents.length > before, 'actual browser download starts');
  const event = downloadEvents[before];
  assert.ok(expectedName.test(event.suggestedFilename), event.suggestedFilename);
  assert.equal(basename(event.suggestedFilename), event.suggestedFilename);
  await waitFor(() => completed.has(event.guid), 'actual browser download completes');
  const source = join(downloadsDir, event.guid);
  const bytes = await readFile(source);
  const path = `${String(before + 1).padStart(2, '0')}-${event.suggestedFilename}`;
  const saved = join(downloadsDir, path);
  await rename(source, saved);
  report.downloads.push({path: `downloads/${path}`, requestedFilename: event.suggestedFilename, bytes: bytes.length, sha256: digest(bytes)});
  return {bytes, text: bytes.toString('utf8'), path: saved};
}
async function chooseFile(selector, path) {
  const {root} = await command('DOM.getDocument', {depth: 1});
  const {nodeId} = await command('DOM.querySelector', {nodeId: root.nodeId, selector});
  assert.ok(nodeId);
  await command('DOM.setFileInputFiles', {nodeId, files: [path]});
}
const passed = (name, details = {}) => { report.checks.push({name, pass: true, ...details}); console.log(`PASS ${name}`); };

try {
  browser = spawn(executable, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-background-networking', '--disable-component-update', '--disable-sync', '--no-first-run', '--no-default-browser-check', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], {stdio: ['ignore', 'ignore', 'pipe']});
  let launchError;
  browser.on('error', error => {launchError = error;});
  browser.stderr.on('data', data => {browserLog = (browserLog + data.toString()).slice(-12000);});
  let endpoint;
  await waitFor(async () => {
    if (launchError) throw launchError;
    if (browser.exitCode !== null) throw new Error(`Browser exited ${browser.exitCode}: ${browserLog}`);
    const [port, path] = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).trim().split('\n');
    endpoint = `ws://127.0.0.1:${port}${path}`;
    return Boolean(port && path);
  }, 'isolated Chromium startup');
  socket = new WebSocket(endpoint);
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const entry = pending.get(message.id); if (!entry) return;
      pending.delete(message.id); clearTimeout(entry.timer);
      if (message.error) entry.reject(new Error(message.error.message)); else entry.resolve(message.result);
    } else if (message.method === 'Runtime.exceptionThrown') report.pageErrors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
    else if (message.method === 'Network.requestWillBeSent') report.requests.push(message.params.request.url);
    else if (message.method === 'Browser.downloadWillBegin') downloadEvents.push(message.params);
    else if (message.method === 'Browser.downloadProgress' && message.params.state === 'completed') completed.add(message.params.guid);
  });
  await new Promise((resolve, reject) => {socket.addEventListener('open', resolve, {once: true}); socket.addEventListener('error', reject, {once: true});});
  report.browser = await command('Browser.getVersion', {}, false);
  report.executableSha256 = digest(await readFile(executable));
  await command('Browser.setDownloadBehavior', {behavior: 'allowAndName', downloadPath: downloadsDir, eventsEnabled: true}, false);
  const {targetId} = await command('Target.createTarget', {url: 'about:blank'}, false);
  ({sessionId} = await command('Target.attachToTarget', {targetId, flatten: true}, false));
  for (const method of ['Page.enable', 'Runtime.enable', 'Network.enable', 'DOM.enable']) await command(method);
  await navigate(join(project, 'courses/boolean-logic-explorer.html'), '#truth-body tr');
  assert.deepEqual(await rows(), [['True', 'True', 'True', 'True', 'Yes'], ['True', 'False', 'False', 'True', 'No — counterexample'], ['False', 'True', 'True', 'False', 'No — counterexample'], ['False', 'False', 'True', 'True', 'Yes']]);
  await activate('#inspect-difference');
  assert.equal(await evaluate(`document.querySelector('#selected-assignment').textContent`), 'A=True, B=False');
  assert.equal(await evaluate('document.activeElement.dataset.inspectRow'), '1');
  passed('direct-file converse table and keyboard counterexample navigation use the actual four assignments');
  await capture('desktop-counterexample.png', '#table-title');

  await expressions('A -> B -> C', '(A -> B) -> C');
  assert.equal(await evaluate(`document.querySelector('#left-canonical').textContent`), '(A -> (B -> C))');
  const groupingRows = await rows();
  assert.deepEqual(groupingRows.map(row => row[3]), ['True', 'False', 'True', 'True', 'True', 'True', 'True', 'True']);
  assert.deepEqual(groupingRows.filter(row => row.at(-1) !== 'Yes').map(row => row.slice(0, 3)), [['False', 'True', 'False'], ['False', 'False', 'False']]);
  await expressions('A or B and C');
  assert.deepEqual((await rows()).map(row => row.at(-1)), ['True', 'True', 'True', 'True', 'True', 'False', 'False', 'False']);
  await expressions('A', 'A or (B and not B)');
  assert.equal((await rows()).length, 4);
  assert.ok((await rows()).every(row => row.at(-1) === 'Yes'));
  passed('independent grouping, precedence and retained-union cases render their complete expected columns');

  for (const [example, count, truthColumn] of [
    ['contrapositive', 4, null], ['demorgan', 4, null], ['inference', 4, ['True', 'True', 'True', 'True']]
  ]) {
    await activate(`[data-example="${example}"]`);
    const rendered = await rows(); assert.equal(rendered.length, count);
    if (truthColumn) assert.deepEqual(rendered.map(row => row[2]), truthColumn);
    else assert.ok(rendered.every(row => row.at(-1) === 'Yes'));
  }
  await expressions('false', 'true');
  assert.deepEqual(await rows(), [['False', 'True', 'No — counterexample']]);
  assert.match(await evaluate(`document.querySelector('#selected-assignment').textContent`), /one constant assignment/);
  await expressions('E or C', 'B and A or D');
  assert.equal((await rows()).length, 32);
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('#truth-head th')].map(n => n.textContent)`), ['Inspect', 'A', 'B', 'C', 'D', 'E', 'Expression 1', 'Expression 2', 'Same result']);
  passed('examples, constants and five-variable limits remain distinct and inspectable');

  const refused = ['A and', 'trueandfalse', 'A => B', 'А', 'Α', '<img src=x>', 'A ∨ B', 'A -> B.'];
  for (const invalid of refused) {
    await expressions('A', 'B');
    assert.equal((await rows()).length, 4);
    await fill('#expression-left', invalid);
    assert.equal((await rows()).length, 0);
    assert.equal(await evaluate(`document.querySelector('#download-table').disabled`), true);
    assert.equal(await evaluate(`document.querySelector('#selected-section').hidden`), true);
    assert.equal(await evaluate(`document.querySelector('#comparison-verdict').textContent`), '');
    assert.ok(await evaluate(`document.querySelector('#expression-error').textContent.length > 0`));
    assert.equal(await evaluate(`document.querySelectorAll('img').length`), 0);
  }
  await expressions('A', 'B or');
  assert.equal(await evaluate(`document.querySelector('#expression-right').getAttribute('aria-invalid')`), 'true');
  await fill('#expression-right', 'B');
  assert.equal(await evaluate(`document.querySelector('#expression-error').textContent`), '');
  assert.equal((await rows()).length, 4);
  passed('changed-input refusals clear all derived output and recover from current controls', {refusedInputs: refused});

  for (const [valid, invalid] of [
    ['('.repeat(32) + 'A' + ')'.repeat(32), '('.repeat(33) + 'A' + ')'.repeat(33)],
    ['not '.repeat(32) + 'A', 'not '.repeat(33) + 'A']
  ]) {
    await expressions(valid); assert.equal((await rows()).length, 2);
    await fill('#expression-left', invalid); assert.equal((await rows()).length, 0);
    assert.equal(await evaluate(`document.querySelector('#download-table').disabled`), true);
  }
  passed('actual controls distinguish the declared 32/33 parentheses and operator boundaries');

  await expressions('A -> B', 'B -> A');
  await evaluate(`document.querySelector('#differences-only').focus()`); await key(' ');
  assert.equal((await rows()).length, 2);
  const csv = await download('#download-table', /^recallweave-boolean-truth-table\.csv$/u);
  assert.equal(csv.text, '"A","B","Expression 1: (A -> B)","Expression 2: (B -> A)","Same result"\r\n"True","True","True","True","Yes"\r\n"True","False","False","True","No"\r\n"False","True","True","False","No"\r\n"False","False","True","True","Yes"\r\n');
  await expressions('false');
  const constantCsv = await download('#download-table', /^recallweave-boolean-truth-table\.csv$/u);
  assert.equal(constantCsv.text, '"Expression 1: false"\r\n"False"\r\n');
  const downloadCount = downloadEvents.length;
  // Explicit adversarial fixture: a value assignment without an input event must still be checked on download.
  await evaluate(`document.querySelector('#expression-left').value = 'A and'`);
  await activate('#download-table');
  assert.equal(await evaluate(`document.querySelector('#download-table').disabled`), true);
  assert.equal((await rows()).length, 0);
  assert.equal(downloadEvents.length, downloadCount);
  passed('actual CSV bytes include the full filtered table and cannot revive an obsolete expression', {programmaticFixture: 'Value changed without input event before the real download button.'});

  await expressions('A -> B', 'B -> A');
  const savedCourse = await download('#download-course', /^boolean-logic\.json$/u);
  assert.deepEqual(savedCourse.bytes, courseBytes);
  await command('Emulation.setDeviceMetricsOverride', {width: 390, height: 844, deviceScaleFactor: 1, mobile: false});
  await evaluate(`document.querySelector('#expression-left').focus()`); await key('Tab');
  assert.equal(await evaluate('document.activeElement.id'), 'expression-right');
  await key('Tab'); assert.equal(await evaluate('document.activeElement.dataset.example'), 'implication');
  assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'), false);
  await capture('mobile-controls.png', '#expressions-title');
  await activate('[data-example="converse"]');
  await activate('#inspect-difference');
  await capture('mobile-counterexample.png', '#selected-section');
  passed('the exact course download and narrow-screen keyboard controls are usable');

  const {renderBooleanExplorer} = await import(pathToFileURL(join(project, 'tools/build-boolean-logic.mjs')));
  const literalDeck = structuredClone(course);
  literalDeck.title = 'Logic </script><img src=x> & $& Unicode λ';
  const literalText = JSON.stringify(literalDeck, null, 2) + '\n';
  const fixture = renderBooleanExplorer({template: await readFile(join(project, 'templates/boolean-logic-explorer.html'), 'utf8'), validator: await readFile(join(project, 'src/deck.mjs'), 'utf8'), model: await readFile(join(project, 'src/boolean-logic.mjs'), 'utf8'), ui: await readFile(join(project, 'src/boolean-logic-ui.mjs'), 'utf8'), deckText: literalText});
  const fixturePath = join(output, 'authored-literal-course-fixture.html');
  await writeFile(fixturePath, fixture);
  report.fixtures.push({path: basename(fixturePath), sha256: digest(fixture), kind: 'Explicit authored title fixture through actual production builder'});
  await navigate(fixturePath, '#truth-body tr');
  assert.equal(await evaluate(`document.querySelector('#course-title').textContent`), literalDeck.title);
  assert.equal(await evaluate(`document.querySelectorAll('img').length`), 0);
  const literalDownload = await download('#download-course', /^boolean-logic\.json$/u);
  assert.equal(literalDownload.text, literalText);
  passed('the production standalone builder renders authored markup literally and downloads its original bytes');

  await navigate(join(project, 'demo.html'), '#deck-file');
  await chooseFile('#deck-file', savedCourse.path);
  await waitFor(() => evaluate(`!!document.querySelector('#start-deck')`), 'actual downloaded deck preview');
  assert.equal(await evaluate(`document.querySelector('#deck-preview-title').textContent`), course.title);
  assert.equal(await evaluate(`document.querySelectorAll('.question-card').length`), 0);
  await activate('#start-deck');
  const firstAnswers = [];
  for (let index = 0; index < 12; index++) {
    const prompt = await evaluate(`document.querySelector('.question-card h2').textContent`);
    const item = course.items.find(item => item.prompt === prompt);
    assert.ok(item && !firstAnswers.some(answer => answer.item === item.id));
    const choices = await evaluate(`[...document.querySelectorAll('[data-choice]')].map(n => ({choice:Number(n.dataset.choice), text:n.textContent.slice(n.querySelector('.choice-key').textContent.length)}))`);
    assert.deepEqual(choices.map(c => c.choice).sort(), [0, 1, 2, 3]);
    for (const choice of choices) assert.equal(choice.text, item.options[choice.choice]);
    const correct = index % 2 === 0;
    const choice = correct ? expectedAnswers.get(item.id) : (expectedAnswers.get(item.id) + 1) % 4;
    await activate(`[data-choice="${choice}"]`);
    assert.ok((await evaluate(`document.querySelector('.feedback').textContent`)).includes(item.explanation));
    firstAnswers.push({item: item.id, choice});
    await activate('#next-button');
  }
  assert.match(await evaluate(`document.querySelector('#first-try-summary').textContent`), /6 of 12/);
  const reviewRows = await evaluate(`[...document.querySelectorAll('.review-item')].map(n => ({prompt:n.querySelector('.review-prompt').textContent, answers:[...n.querySelectorAll('.review-answers dd')].map(x=>x.textContent)}))`);
  assert.equal(reviewRows.length, 12);
  for (const [index, row] of reviewRows.entries()) {
    const answer = firstAnswers[index]; const item = course.items.find(item => item.id === answer.item);
    assert.equal(row.prompt, item.prompt);
    assert.deepEqual(row.answers, [item.options[answer.choice], item.options[expectedAnswers.get(item.id)]]);
  }
  const firstMastery = await evaluate(`[...document.querySelectorAll('.mastery-box output')].map(n=>n.textContent)`);
  await activate('#trace-archive-panel > summary');
  const firstTraceFile = await download('#save-trace-button', /^recallweave-learning-trace-\d{4}-\d{2}-\d{2}\.json$/u);
  const firstTrace = JSON.parse(firstTraceFile.text);
  assert.deepEqual(firstTrace.firstAnswers, firstAnswers);
  assert.equal(firstTrace.practice, null);
  assert.deepEqual(firstTrace.deck, course);
  passed('the real offline learner previews the actual download and preserves all 12 canonical first answers', {firstAnswers});

  await activate('#practice-button');
  const missed = firstAnswers.filter(answer => answer.choice !== expectedAnswers.get(answer.item));
  const practiceAnswers = [];
  for (let index = 0; index < missed.length; index++) {
    const item = course.items.find(item => item.id === missed[index].item);
    assert.equal(await evaluate(`document.querySelector('.practice-card h2').textContent`), item.prompt);
    const choice = expectedAnswers.get(item.id);
    await activate(`[data-practice-choice="${choice}"]`);
    practiceAnswers.push({item: item.id, choice});
    if (index === 2) {
      await activate('#back-to-review');
      const paused = JSON.parse((await download('#save-trace-button', /^recallweave-learning-trace-\d{4}-\d{2}-\d{2}\.json$/u)).text);
      assert.deepEqual(paused.firstAnswers, firstAnswers);
      assert.deepEqual(paused.mastery, firstTrace.mastery);
      assert.deepEqual(paused.practice.answers, practiceAnswers);
      await activate('#practice-button');
    } else await activate('#practice-next');
  }
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('.mastery-box output')].map(n=>n.textContent)`), firstMastery);
  const completedTraceFile = await download('#save-trace-button', /^recallweave-learning-trace-\d{4}-\d{2}-\d{2}\.json$/u);
  const completedTrace = JSON.parse(completedTraceFile.text);
  assert.deepEqual(completedTrace.firstAnswers, firstAnswers);
  assert.deepEqual(completedTrace.mastery, firstTrace.mastery);
  assert.deepEqual(completedTrace.practice.answers, practiceAnswers);
  const notes = await download('#save-notes-button', /^recallweave-study-notes-.*\.txt$/u);
  for (const item of course.items) { assert.ok(notes.text.includes(item.prompt)); assert.ok(notes.text.includes(item.explanation)); assert.ok(notes.text.includes(item.transfer)); }
  await capture('learner-completed-review.png', '.result-card');
  passed('actual paused/resumed practice and downloaded traces/notes preserve the original first-answer model state');

  await navigate(join(project, 'demo.html'), '#deck-file');
  await chooseFile('#deck-file', savedCourse.path);
  await waitFor(() => evaluate(`!!document.querySelector('#start-deck')`), 'fresh downloaded course preview');
  await activate('#start-deck');
  await activate('#trace-archive-panel > summary');
  await chooseFile('#trace-file', completedTraceFile.path);
  await waitFor(() => evaluate(`!document.querySelector('#trace-preview').hidden`), 'fresh completed trace preview');
  await activate('#restore-trace-confirm');
  assert.match(await evaluate(`document.querySelector('#first-try-summary').textContent`), /6 of 12/);
  assert.equal(await evaluate(`document.querySelectorAll('.review-item').length`), 12);
  assert.match(await evaluate(`document.querySelector('#practice-title').textContent`), /Practice complete/);
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('.mastery-box output')].map(n=>n.textContent)`), firstMastery);
  passed('a fresh direct-file learner restores the actual completed course trace through the existing explicit preview/restore flow');

  assert.deepEqual(report.pageErrors, []);
  const outside = report.requests.filter(url => !/^(file:|blob:|data:|about:)/u.test(url));
  assert.deepEqual(outside, []);
  passed('all application requests remain local and no page exception is observed');
  report.status = 'pass';
} catch (error) {
  report.status = 'fail'; report.failure = error.stack || String(error);
  console.error(report.failure);
  if (socket?.readyState === 1) { try { await capture('failure-viewport.png'); } catch {} }
  process.exitCode = 1;
} finally {
  report.browserLog = browserLog;
  for (const path of sourcePaths) report.sourceAfter[path] = digest(await readFile(join(project, path)));
  report.sourceUnchanged = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
  if (!report.sourceUnchanged) { report.status = 'fail'; process.exitCode = 1; }
  report.finishedAt = new Date().toISOString();
  if (socket?.readyState === 1) { try { await command('Browser.close', {}, false); } catch {} }
  socket?.close();
  if (browser && browser.exitCode === null) { browser.kill('SIGTERM'); await new Promise(resolve => {browser.once('exit', resolve); setTimeout(resolve, 3000);}); }
  for (const entry of pending.values()) clearTimeout(entry.timer);
  // Preserve observations before cleanup: a late Chrome process may briefly hold its own profile open.
  const receiptPath = join(output, 'receipt.json');
  await writeFile(receiptPath, JSON.stringify(report, null, 2) + '\n');
  try {
    await rm(profile, {recursive: true, force: true, maxRetries: 6, retryDelay: 150});
    report.profileCleanup = {status: 'pass'};
  } catch (error) {
    report.profileCleanup = {status: 'fail', error: error.message};
    report.status = 'fail'; process.exitCode = 1;
  }
  report.finishedAt = new Date().toISOString();
  await writeFile(receiptPath, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({status: report.status, checks: report.checks.length, downloads: report.downloads.length, sourceUnchanged: report.sourceUnchanged, output}));
}
