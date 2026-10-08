#!/usr/bin/env node
/** Optional receiving with Node 22+ and an installed Chromium.
 * CDP transport follows tools/check_browser.mjs and check_shortest_paths_browser.mjs.
 * Uses a new profile, actual downloads, and unchanged current learner files.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFile, writeFile, mkdir, mkdtemp, rm, readdir} from 'node:fs/promises';
import {dirname, extname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
for (let i = 0; i < args.length; i += 2) {
  if (!['--root', '--browser', '--output'].includes(args[i]) || !args[i + 1] ||
      args.indexOf(args[i]) !== i) throw new Error('Usage: --root PROJECT --browser EXECUTABLE --output EMPTY_DIRECTORY');
}
const project = resolve(option('--root', join(dirname(fileURLToPath(import.meta.url)), '..')));
const executable = option('--browser', 'chromium');
const output = resolve(option('--output', join(project, 'finite-automata-browser-check')));
await mkdir(output, {recursive: true});
assert.equal((await readdir(output)).length, 0, 'Use an empty output directory to preserve earlier evidence.');
const downloads = join(output, 'downloads');
await mkdir(downloads);
const profile = await mkdtemp(join(output, 'profile-'));
const sourcePaths = [
  'src/finite-automata.mjs', 'src/finite-automata-ui.mjs', 'courses/finite-automata.json',
  'courses/finite-automata-explorer.template.html', 'courses/finite-automata-explorer.html',
  'tools/build-finite-automata.mjs', 'tools/check_finite_automata_browser.mjs',
  'src/deck.mjs', 'src/deck-picker.mjs', 'src/app.mjs', 'src/knowledge.mjs', 'src/review.mjs',
  'src/answer-order.mjs', 'src/reflections.mjs', 'src/session-export.mjs',
  'src/trace-archive.mjs', 'src/trace-archive-ui.mjs', 'src/lesson-archive.mjs', 'src/lesson-archive-ui.mjs',
  'data/deck.json', 'index.html', 'demo.html', 'styles.css'
];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const pins = async () => Object.fromEntries(await Promise.all(sourcePaths.map(async path =>
  [path, hash(await readFile(join(project, path)))])));
const report = {
  format: 'recallweave-finite-automata-browser/1', status: 'running', started: new Date().toISOString(),
  node: process.version, project, executable, sourceSha256: await pins(),
  checks: [], captures: [], downloads: [], pageErrors: [], requests: [], lessons: []
};
const {parseDeck} = await import(pathToFileURL(join(project, 'src/deck.mjs')));
const {initialMastery, updateMastery} = await import(pathToFileURL(join(project, 'src/knowledge.mjs')));
const {getPreset, traceWord, compareMachines} = await import(pathToFileURL(join(project, 'src/finite-automata.mjs')));
const courseBytes = await readFile(join(project, 'courses/finite-automata.json'));
const deck = parseDeck(courseBytes.toString('utf8'));
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = resolve(project, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(project + '/')) {response.writeHead(403).end(); return;}
    const body = await readFile(file);
    const mime = {'.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json'}[extname(file)];
    response.writeHead(200, {'Content-Type': (mime || 'application/octet-stream') + '; charset=utf-8'});
    response.end(body);
  } catch {response.writeHead(404).end();}
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = 'http://127.0.0.1:' + server.address().port;
let browser, socket, sessionId, browserLog = '', sequence = 0;
const pending = new Map();
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(check, label) {
  let last;
  for (let attempt = 0; attempt < 160; attempt++) {
    try {if (await check()) return;} catch (error) {last = error;}
    await pause(100);
  }
  throw new Error('Timed out: ' + label + (last ? ' (' + last.message + ')' : ''));
}
function command(method, params = {}, scoped = true) {
  const id = ++sequence;
  const requestedAt = new Error('Requested ' + method).stack;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {pending.delete(id); reject(new Error('CDP timeout: ' + method + '\n' + requestedAt));}, 10000);
    pending.set(id, {resolve, reject, timer});
    report.lastCommand = {method, expression: params.expression?.slice(0, 500)};
    socket.send(JSON.stringify({id, method, params, ...(scoped && sessionId ? {sessionId} : {})}));
  });
}
async function evaluate(expression) {
  const result = await command('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true});
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
async function key(name) {
  const number = {Tab: 9, Enter: 13, Space: 32}[name];
  for (const type of ['keyDown', 'keyUp']) await command('Input.dispatchKeyEvent', {
    type, key: name === 'Space' ? ' ' : name, code: name,
    windowsVirtualKeyCode: number, nativeVirtualKeyCode: number,
    ...(name === 'Enter' && type === 'keyDown' ? {text: '\r', unmodifiedText: '\r'} : {})
  });
}
async function activate(selector, keyName = 'Enter') {
  assert.ok(await evaluate('!!document.querySelector(' + JSON.stringify(selector) + ')'), 'Missing control ' + selector);
  await evaluate('document.querySelector(' + JSON.stringify(selector) + ').focus()');
  await key(keyName);
}
async function choose(selector, value) {
  await evaluate('(()=>{const e=document.querySelector(' + JSON.stringify(selector) + ');e.value=' +
    JSON.stringify(value) + ';e.dispatchEvent(new Event("change",{bubbles:true}));})()');
}
async function typeText(selector, text) {
  await evaluate('(()=>{const e=document.querySelector(' + JSON.stringify(selector) + ');e.focus();e.select();})()');
  await command('Input.insertText', {text});
}
const text = selector => evaluate('document.querySelector(' + JSON.stringify(selector) + ').textContent');
const prop = (selector, property) => evaluate('document.querySelector(' + JSON.stringify(selector) + ')[' + JSON.stringify(property) + ']');
const traceStates = () => evaluate('[...document.querySelectorAll("#trace-path strong")].map(e=>e.textContent)');
async function screenshot(name, selector) {
  if (selector) await evaluate('document.querySelector(' + JSON.stringify(selector) + ').scrollIntoView({block:"start"})');
  const {data} = await command('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false});
  const bytes = Buffer.from(data, 'base64');
  await writeFile(join(output, name), bytes);
  report.captures.push({path: name, bytes: bytes.length, sha256: hash(bytes),
    viewport: await evaluate('({width:innerWidth,height:innerHeight,scrollY})')});
}
async function download(selector, filename, recordName) {
  // Keep the completed file where Chrome put it while the browser is running.
  // Each real download gets its own directory, so names never need to be moved.
  const relative = recordName.replace(/\.json$/, '');
  const directory = join(downloads, relative);
  await mkdir(directory);
  await command('Browser.setDownloadBehavior', {
    behavior: 'allow', downloadPath: directory, eventsEnabled: true
  }, false);
  await activate(selector);
  const target = join(directory, filename);
  await waitFor(async () => {
    const files = await readdir(directory);
    return files.includes(filename) && !files.some(name => name.endsWith('.crdownload'));
  }, filename + ' actual browser download');
  const bytes = await readFile(target);
  report.downloads.push({path: 'downloads/' + relative + '/' + filename, bytes: bytes.length, sha256: hash(bytes)});
  return {bytes, path: target};
}
const passed = name => {report.checks.push(name); console.log('PASS ' + name);};
async function navigate(url, ready, width = 1360, height = 1080) {
  await command('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: false});
  await command('Page.navigate', {url});
  await waitFor(() => evaluate('document.URL===' + JSON.stringify(url) + '&&document.readyState==="complete"&&(' + ready + ')'), 'page ' + url);
}
async function selectDownloadedCourse(path) {
  const {root} = await command('DOM.getDocument', {depth: -1});
  const {nodeId} = await command('DOM.querySelector', {nodeId: root.nodeId, selector: '#deck-file'});
  assert.ok(nodeId, 'Current importer has a real file input');
  await command('DOM.setFileInputFiles', {nodeId, files: [path]});
  await waitFor(() => evaluate('!!document.querySelector("#start-deck")'), 'current importer preview');
}
async function receiveCourse(url, label, downloadedPath) {
  await navigate(url, '!!document.querySelector("#start-button")');
  await selectDownloadedCourse(downloadedPath);
  assert.equal(await text('#deck-preview-title'), deck.title);
  assert.equal(await evaluate('document.querySelectorAll("#deck-preview ol li").length'), 12);
  assert.match(await text('.deck-preview-count'), /12 questions · 4 concepts/);
  assert.ok(await prop('#start-button', 'isConnected'), 'Preview keeps current welcome session');
  await activate('#cancel-deck');
  assert.equal(await prop('#deck-preview', 'hidden'), true);
  assert.ok(await prop('#start-button', 'isConnected'));
  await selectDownloadedCourse(downloadedPath);
  await activate('#start-deck');
  await waitFor(() => evaluate('!!document.querySelector(".question-card h2")'), 'first imported question');
  const answers = [], estimates = initialMastery(deck.concepts);
  for (let index = 0; index < deck.items.length; index++) {
    const prompt = await text('.question-card h2');
    const item = deck.items.find(item => item.prompt === prompt);
    assert.ok(item, 'Displayed item comes from the exact downloaded course');
    assert.ok(!answers.some(answer => answer.id === item.id));
    const order = await evaluate('[...document.querySelectorAll("[data-choice]")].map(e=>Number(e.dataset.choice))');
    assert.deepEqual([...order].sort((a, b) => a - b), [0, 1, 2, 3]);
    const correct = index % 3 !== 0;
    const choice = correct ? item.answer : (item.answer + 1) % 4;
    assert.equal(await evaluate('document.activeElement.dataset.choice'), String(order[0]));
    for (let position = 0; position < order.indexOf(choice); position++) await key('Tab');
    await key('Enter');
    assert.equal(await evaluate('document.activeElement.id'), 'next-button');
    assert.ok((await text('#feedback-slot')).includes(item.explanation));
    assert.ok((await text('#feedback-slot')).includes(item.transfer));
    estimates[item.concept] = updateMastery(estimates[item.concept], correct);
    answers.push({id: item.id, choice, correct, displayedOrder: order});
    await key('Enter');
  }
  assert.equal(await evaluate('document.querySelectorAll(".review-item").length'), 12);
  assert.match(await text('#first-try-summary'), /8 of 12/);
  assert.equal(await evaluate('document.querySelector("[role=progressbar]").getAttribute("aria-valuenow")'), '12');
  assert.deepEqual(await evaluate('[...document.querySelectorAll(".mastery-box output")].map(e=>e.textContent)'),
    deck.concepts.map(concept => Math.round(estimates[concept] * 100) + '%'));
  assert.ok((await text('.source-note')).includes(deck.attribution));
  assert.ok((await text('.source-note')).includes(deck.license));
  assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'), false);
  await screenshot(label + '-lesson-review.png', '.result-card');
  await activate('#practice-button');
  await waitFor(() => evaluate('!!document.querySelector("[data-practice-choice]")'), 'existing practice route');
  const practicePrompt = await text('.question-card h2');
  const firstMissed = answers.find(answer => !answer.correct);
  assert.equal(practicePrompt, deck.items.find(item => item.id === firstMissed.id).prompt);
  await activate('#back-to-review');
  assert.match(await text('#first-try-summary'), /8 of 12/);
  report.lessons.push({label, url, downloadedCourseSha256: hash(await readFile(downloadedPath)),
    answers, estimates, reviewCount: 12, firstCorrect: 8, practiceOpened: true});
  passed(label + ': exact downloaded course previews/cancels/starts, completes 12 questions with feedback, and enters existing practice');
}

try {
  browser = spawn(executable, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-background-networking',
    '--disable-component-update', '--disable-sync', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0',
    '--user-data-dir=' + profile, 'about:blank'
  ], {stdio: ['ignore', 'ignore', 'pipe']});
  browser.stderr.on('data', data => {browserLog = (browserLog + data.toString()).slice(-12000);});
  let launchError;
  browser.on('error', error => {launchError = error;});
  let port, endpoint;
  await waitFor(async () => {
    if (launchError) throw launchError;
    if (browser.exitCode !== null) throw new Error('Browser exited ' + browser.exitCode);
    [port, endpoint] = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).trim().split('\n');
    return Boolean(port && endpoint);
  }, 'isolated Chromium startup');
  socket = new WebSocket('ws://127.0.0.1:' + port + endpoint);
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const request = pending.get(message.id); if (!request) return;
      pending.delete(message.id); clearTimeout(request.timer);
      if (message.error) request.reject(new Error(message.error.message)); else request.resolve(message.result);
    } else if (message.method === 'Runtime.exceptionThrown') {
      report.pageErrors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    } else if (message.method === 'Network.requestWillBeSent') report.requests.push(message.params.request.url);
  });
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, {once: true});
    socket.addEventListener('error', reject, {once: true});
  });
  report.browser = await command('Browser.getVersion', {}, false);
  await command('Browser.setDownloadBehavior', {behavior: 'allow', downloadPath: downloads, eventsEnabled: true}, false);
  const {targetId} = await command('Target.createTarget', {url: 'about:blank'}, false);
  ({sessionId} = await command('Target.attachToTarget', {targetId, flatten: true}, false));
  await command('Page.enable'); await command('Runtime.enable'); await command('Network.enable');
  const explorerUrl = pathToFileURL(join(project, 'courses/finite-automata-explorer.html')).href;
  await navigate(explorerUrl, 'document.querySelectorAll("#machine-rows tr").length===2');
  assert.equal(await prop('#download-trace', 'disabled'), true);
  assert.equal(await prop('#download-comparison', 'disabled'), true);
  assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'), false);
  await screenshot('01-explorer-desktop.png');
  passed('direct-file explorer starts with a complete two-state table, no stale results and no desktop overflow');

  await activate('#trace-word');
  assert.equal(await text('#trace-heading'), 'Rejected');
  assert.deepEqual(await traceStates(), ['q0', 'q1', 'q1', 'q0', 'q1']);
  const traceDownload = await download('#download-trace', 'recallweave-finite-automata-trace.json', '01-word-trace.json');
  assert.deepEqual(JSON.parse(traceDownload.bytes).trace, traceWord(getPreset('even-ones').machine, '1011'));
  passed('actual keyboard trace and saved file preserve the exact word, intermediate states and rejecting final state');

  await typeText('#word', '0');
  assert.equal(await prop('#trace-result', 'hidden'), true);
  assert.equal(await prop('#download-trace', 'disabled'), true);
  await activate('#empty-word');
  assert.equal(await prop('#word', 'value'), '');
  assert.equal(await text('#trace-heading'), 'Accepted');
  assert.deepEqual(await traceStates(), ['q0']);
  assert.equal(await evaluate('document.querySelectorAll("#trace-rows tr").length'), 1);
  const emptyDownload = await download('#download-trace', 'recallweave-finite-automata-trace.json', '02-empty-word-trace.json');
  assert.equal(JSON.parse(emptyDownload.bytes).trace.word, '');
  assert.deepEqual(JSON.parse(emptyDownload.bytes).trace.steps, []);
  passed('word edits invalidate the saved result; ε takes no transition and survives the real JSON download');

  for (const invalid of ['10 1', '102', 'ε', '1'.repeat(65)]) {
    await typeText('#word', invalid);
    await activate('#trace-word');
    assert.equal(await prop('#trace-result', 'hidden'), true);
    assert.equal(await prop('#download-trace', 'disabled'), true);
    assert.equal(await evaluate('document.querySelector("#trace-status").classList.contains("error")'), true);
  }
  await typeText('#word', '1'.repeat(64));
  await activate('#trace-word');
  assert.equal(await text('#trace-heading'), 'Accepted');
  assert.equal(await evaluate('document.querySelectorAll("#trace-rows tr").length'), 65);
  passed('literal alphabet and 64-symbol boundary are enforced without retaining earlier accepting results');

  await activate('#compare-machines');
  assert.equal(await text('#comparison-heading'), 'Equivalent for every binary word');
  const sameDownload = await download('#download-comparison', 'recallweave-finite-automata-comparison.json', '03-equivalent-comparison.json');
  assert.deepEqual(JSON.parse(sameDownload.bytes).comparison, compareMachines(getPreset('even-ones').machine, getPreset('even-ones').machine));
  await typeText('#word', '1');
  assert.equal(await prop('#comparison-result', 'hidden'), false, 'Word edits do not alter a machine-only proof');
  assert.equal(await prop('#trace-result', 'hidden'), true);
  passed('exact equivalence reaches all relevant pairs and its download remains tied to the two unchanged machines');

  await activate('#accept-0', 'Space');
  assert.equal(await prop('#comparison-result', 'hidden'), true);
  assert.equal(await prop('#download-comparison', 'disabled'), true);
  await activate('#compare-machines');
  assert.equal(await text('#witness'), 'ε');
  assert.equal(await text('#witness-length'), '0');
  await activate('#use-witness');
  assert.equal(await text('#trace-heading'), 'Rejected');
  assert.deepEqual(await traceStates(), ['q0']);
  await typeText('#machine-name', ' ');
  await activate('#trace-word');
  await activate('#compare-machines');
  assert.equal(await prop('#download-trace', 'disabled'), true);
  assert.equal(await prop('#download-comparison', 'disabled'), true);
  assert.match(await text('#comparison-status'), /name/);
  passed('acceptance edits invalidate both artifacts; empty-word disagreement and invalid machine names use the real admission path');

  await activate('#load-preset');
  await choose('#reference-preset', 'all-words');
  await activate('#compare-machines');
  assert.equal(await text('#witness'), '1');
  const differentDownload = await download('#download-comparison', 'recallweave-finite-automata-comparison.json', '04-shortest-witness-comparison.json');
  assert.deepEqual(JSON.parse(differentDownload.bytes).comparison, compareMachines(getPreset('even-ones').machine, getPreset('all-words').machine));
  await activate('#use-witness');
  assert.equal(await prop('#word', 'value'), '1');
  assert.equal(await text('#trace-heading'), 'Rejected');
  await screenshot('02-shortest-witness.png', '#comparison-panel-heading');
  passed('the shortest nonempty witness is displayed, exported and traced through the edited machine');

  await typeText('#machine-name', '<b>Parity</b>');
  await activate('#trace-word');
  assert.ok((await text('#trace-summary')).includes('<b>Parity</b>'));
  assert.equal(await evaluate('document.querySelectorAll("#trace-summary b").length'), 0);
  await choose('#machine-preset', 'ends-01');
  await activate('#load-preset');
  await typeText('#word', '010');
  await activate('#trace-word');
  assert.deepEqual(await traceStates(), ['q0', 'q1', 'q2', 'q1']);
  assert.equal(await text('#trace-heading'), 'Rejected');
  passed('user names render literally and an accepting prefix does not stop the suffix machine');

  await choose('#state-count', '6');
  assert.equal(await evaluate('document.querySelectorAll("#machine-rows tr").length'), 3, 'Count selection alone preserves the edited machine');
  await activate('#new-machine');
  assert.equal(await evaluate('document.querySelectorAll("#machine-rows tr").length'), 6);
  await activate('#accept-0', 'Space');
  for (let tab = 0; tab < 90; tab++) {
    if (await evaluate('document.activeElement.id==="compare-machines"')) break;
    await key('Tab');
  }
  assert.equal(await evaluate('document.activeElement.id'), 'compare-machines');
  await key('Enter');
  assert.equal(await text('#comparison-heading'), 'Equivalent for every binary word');
  assert.equal(await evaluate('document.querySelectorAll("#pair-rows tr").length'), 1);
  await choose('#transition-0-1', '1');
  assert.equal(await prop('#download-comparison', 'disabled'), true);
  await activate('#compare-machines');
  assert.equal(await text('#witness'), '1');
  await choose('#initial-state', '1');
  await activate('#compare-machines');
  assert.equal(await text('#witness'), 'ε');
  await choose('#transition-0-1', '');
  await activate('#compare-machines');
  assert.equal(await prop('#comparison-result', 'hidden'), true);
  assert.equal(await prop('#download-comparison', 'disabled'), true);
  assert.match(await text('#comparison-status'), /existing state/);
  passed('six-state editing, unreachable memory, initial-state changes and incomplete-cell refusal preserve exact comparison semantics');

  await choose('#machine-preset', 'even-ones');
  await activate('#load-preset');
  await choose('#reference-preset', 'all-words');
  await activate('#compare-machines');
  await activate('#use-witness');
  await command('Emulation.setDeviceMetricsOverride', {width: 390, height: 844, deviceScaleFactor: 1, mobile: true});
  assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'), false);
  await screenshot('03-explorer-compact.png', '#machine-heading');
  await screenshot('04-comparison-compact.png', '#comparison-panel-heading');
  await activate('.skip');
  assert.equal(await evaluate('document.activeElement.id'), 'main');
  const courseDownload = await download('#download-course', 'recallweave-finite-automata-course.json', '05-course.json');
  assert.deepEqual(courseDownload.bytes, courseBytes);
  assert.deepEqual(parseDeck(courseDownload.bytes.toString('utf8')), deck);
  passed('390px layout and keyboard skip link work; the browser saves the exact twelve-question course bytes');

  await command('Page.reload', {ignoreCache: true});
  await waitFor(() => evaluate('document.querySelector("#word")?.value==="1011"&&document.querySelector("#trace-result").hidden'), 'reload resets local edits');
  assert.equal(await prop('#machine-name', 'value'), 'Even number of 1s');
  assert.equal(await prop('#reference-preset', 'value'), 'even-ones');
  assert.deepEqual(report.requests.filter(url => /^https?:/i.test(url)), []);
  passed('offline explorer reload restores its initial setup without HTTP requests or automatic storage');

  await receiveCourse(base + '/index.html', '05-modular', courseDownload.path);
  await receiveCourse(pathToFileURL(join(project, 'demo.html')).href, '06-standalone', courseDownload.path);
  assert.deepEqual(report.pageErrors, []);
  assert.deepEqual(report.requests.filter(url => /^https?:/i.test(url) && !url.startsWith(base + '/')), []);
  assert.deepEqual(await pins(), report.sourceSha256);
  passed('all explorer and learner source bytes remain unchanged; page execution has no errors or external HTTP requests');
  report.status = 'passed';
} catch (error) {
  report.status = 'failed'; report.error = error.stack || String(error); process.exitCode = 1;
  console.error(report.error);
  if (socket && sessionId) {
    try {
      report.failureState = await evaluate('({url:location.href,title:document.title,text:document.body.innerText})');
      await screenshot('failure.png');
    } catch (captureError) {report.captureError = String(captureError);}
  }
} finally {
  report.finished = new Date().toISOString();
  try {
    await writeFile(join(output, 'browser.log'), browserLog);
    await writeFile(join(output, 'receipt.json'), JSON.stringify(report, null, 2) + '\n');
  } catch (error) {process.exitCode = 1; console.error('Could not preserve browser evidence: ' + error);}
  finally {
    if (socket) {try {await command('Browser.close', {}, false);} catch {} socket.close();}
    if (browser && browser.exitCode === null) {browser.kill(); await pause(300);}
    for (const entry of pending.values()) {clearTimeout(entry.timer); entry.reject(new Error('Browser receiving finished.'));}
    pending.clear();
    await new Promise(resolve => server.close(resolve));
    await rm(profile, {recursive: true, force: true});
  }
  console.log(JSON.stringify({status: report.status, checks: report.checks.length, output}));
}
