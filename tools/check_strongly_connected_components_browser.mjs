#!/usr/bin/env node
/** Actual direct-file receiving with Node 22+ and an already installed Chromium. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawn, execFileSync} from 'node:child_process';
import {readFile, writeFile, mkdir, mkdtemp, rm, readdir} from 'node:fs/promises';
import {dirname, join, resolve, relative} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const args = process.argv.slice(2);
const option = (key, fallback) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
const project = resolve(option('--root', join(dirname(fileURLToPath(import.meta.url)), '..')));
const executable = option('--browser', 'chromium');
const output = resolve(option('--output', join(project, 'strong-components-browser-check')));
await mkdir(output, {recursive: true});
assert.equal((await readdir(output)).length, 0, 'Choose an empty output directory; existing evidence must be preserved.');
const profile = await mkdtemp(join(output, 'profile-'));
const downloadRoot = join(output, 'downloads');
await mkdir(downloadRoot);
const sourcePaths = [
  'src/strongly-connected-components.mjs', 'src/strongly-connected-components-ui.mjs',
  'courses/strongly-connected-components.json', 'courses/strongly-connected-components.md',
  'courses/strongly-connected-components-explorer.template.html', 'courses/strongly-connected-components-explorer.html',
  'tools/build-strongly-connected-components.mjs', 'tools/check_strongly_connected_components_browser.mjs',
  'src/deck.mjs', 'src/app.mjs', 'demo.html'
];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const pins = async () => Object.fromEntries(await Promise.all(sourcePaths.map(async path => [path, hash(await readFile(join(project, path)))])));
const courseBytes = await readFile(join(project, 'courses/strongly-connected-components.json'));
const guideBytes = await readFile(join(project, 'courses/strongly-connected-components.md'));
const course = JSON.parse(courseBytes);
const report = {
  format: 'recallweave-strong-components-native-browser/1', status: 'running',
  started: new Date().toISOString(), node: process.version, project, executable,
  sourceHead: execFileSync('git', ['-C', project, 'rev-parse', 'HEAD'], {encoding: 'utf8'}).trim(),
  sourceSha256: await pins(), checks: [], captures: [], downloads: [], pageErrors: [], requests: [],
  inputMechanisms: 'Keyboard Enter activates focused buttons and the skip link. Authored text/select values use declared DOM input/change events. The actual downloaded course file is selected with the installed browser protocol. These are browser receiving actions, not physical keyboard, touch or printer claims.'
};
let browser, socket, sessionId, sequence = 0, browserLog = '', downloadIndex = 0;
const pending = new Map();
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(check, label) {
  let last;
  for (let i = 0; i < 120; i++) {
    try { if (await check()) return; } catch (error) { last = error; }
    await pause(100);
  }
  throw new Error('Timed out: ' + label + (last ? ' (' + last.message + ')' : ''));
}
function command(method, params = {}, scoped = true) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 10000);
    pending.set(id, {resolve, reject, timer});
    socket.send(JSON.stringify({id, method, params, ...(scoped && sessionId ? {sessionId} : {})}));
  });
}
async function evaluate(expression) {
  const value = await command('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true});
  if (value.exceptionDetails) throw new Error(value.exceptionDetails.exception?.description || value.exceptionDetails.text);
  return value.result.value;
}
async function key(name) {
  const code = name === 'Tab' ? 9 : 13;
  for (const type of ['keyDown', 'keyUp']) await command('Input.dispatchKeyEvent', {
    type, key: name, code: name, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code,
    ...(name === 'Enter' && type === 'keyDown' ? {text: '\r', unmodifiedText: '\r'} : {})
  });
}
async function activate(selector) {
  assert.equal(await evaluate('!!document.querySelector(' + JSON.stringify(selector) + ')'), true, selector);
  await evaluate('document.querySelector(' + JSON.stringify(selector) + ').focus()');
  await key('Enter');
}
async function choose(selector, value, event = 'change') {
  await evaluate('(()=>{const element=document.querySelector(' + JSON.stringify(selector) + ');element.value=' + JSON.stringify(value) + ';element.dispatchEvent(new Event(' + JSON.stringify(event) + ',{bubbles:true}));})()');
}
const text = selector => evaluate('document.querySelector(' + JSON.stringify(selector) + ').textContent');
const eventIndex = () => evaluate('Number(document.querySelector("#step-count").dataset.eventIndex)');
const states = () => evaluate('Object.fromEntries([...document.querySelectorAll("#node-states tr")].map(row=>[row.dataset.node,[...row.cells].map(cell=>cell.textContent)]))');
async function screenshot(name, selector) {
  if (selector) await evaluate('document.querySelector(' + JSON.stringify(selector) + ').scrollIntoView({block:"start"})');
  const {data} = await command('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false});
  const bytes = Buffer.from(data, 'base64');
  await writeFile(join(output, name), bytes);
  report.captures.push({path: name, bytes: bytes.length, sha256: hash(bytes), viewport: await evaluate('({width:innerWidth,height:innerHeight,scrollY})')});
}
async function download(selector, filename) {
  const directory = join(downloadRoot, String(++downloadIndex).padStart(2, '0'));
  await mkdir(directory);
  await command('Browser.setDownloadBehavior', {behavior: 'allow', downloadPath: directory, eventsEnabled: true}, false);
  await activate(selector);
  await waitFor(async () => {
    const names = await readdir(directory);
    return names.includes(filename) && !names.some(name => name.endsWith('.crdownload'));
  }, 'actual browser download: ' + filename);
  const path = join(directory, filename), bytes = await readFile(path);
  report.downloads.push({path: relative(output, path), bytes: bytes.length, sha256: hash(bytes)});
  return {path, bytes};
}
async function selectFile(selector, path) {
  const {root} = await command('DOM.getDocument');
  const {nodeId} = await command('DOM.querySelector', {nodeId: root.nodeId, selector});
  assert.ok(nodeId, selector);
  await command('DOM.setFileInputFiles', {nodeId, files: [path]});
}
const passed = name => { report.checks.push(name); console.log('PASS ' + name); };
const url = pathToFileURL(join(project, 'courses/strongly-connected-components-explorer.html')).href;

try {
  browser = spawn(executable, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-background-networking', '--disable-component-update', '--disable-sync', '--no-first-run', '--no-default-browser-check', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], {stdio: ['ignore', 'ignore', 'pipe']});
  browser.stderr.on('data', bytes => { browserLog = (browserLog + bytes.toString()).slice(-16000); });
  let launchError;
  browser.on('error', error => { launchError = error; });
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
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, {once: true}); socket.addEventListener('error', reject, {once: true}); });
  report.browser = await command('Browser.getVersion', {}, false);
  const {targetId} = await command('Target.createTarget', {url: 'about:blank'}, false);
  ({sessionId} = await command('Target.attachToTarget', {targetId, flatten: true}, false));
  await command('Page.enable'); await command('Runtime.enable'); await command('Network.enable');
  await command('Emulation.setDeviceMetricsOverride', {width: 1340, height: 1040, deviceScaleFactor: 1, mobile: false});
  await command('Page.navigate', {url});
  await waitFor(() => evaluate('document.readyState==="complete"&&document.querySelectorAll("#node-states tr").length===6'), 'direct-file explorer startup');
  assert.equal(await eventIndex(), 0);
  assert.equal(await evaluate('document.querySelector("#certificate").hidden'), true);
  assert.ok(Object.values(await states()).every(row => row[4] === 'Unassigned'));
  await key('Tab');
  assert.equal(await evaluate('document.activeElement.className'), 'skip');
  await key('Enter');
  assert.equal(await evaluate('document.activeElement.id'), 'trace-title');
  passed('direct-file startup and keyboard skip link expose a fresh unassigned graph');

  await choose('#prediction', '3', 'input'); await activate('#check-prediction');
  assert.match(await text('#prediction-feedback'), /Yes\. 3 components/);
  assert.equal(await eventIndex(), 0);
  await activate('#next'); await activate('#next');
  assert.equal(await eventIndex(), 2);
  assert.equal((await states()).A[1], 'In DFS path');
  await activate('#previous'); assert.equal(await eventIndex(), 1);
  await activate('#first'); assert.equal(await eventIndex(), 0);
  passed('prediction and keyboard navigation preserve exact snapshot positions');

  const secondPassIndex = await evaluate('[...document.querySelector("#event-choice").options].find(option=>option.textContent.includes("· transpose")).value');
  await choose('#event-choice', secondPassIndex);
  assert.match(await text('#graph-note'), /Every displayed arrow is reversed/);
  assert.deepEqual(await evaluate('[...document.querySelectorAll("#network path > title")].map(node=>node.textContent)'), ['B → A', 'C → B', 'A → C', 'D → C', 'E → D', 'D → E', 'F → E']);
  await screenshot('01-transpose-wide.png', '#results');
  await activate('#finish');
  assert.deepEqual(await evaluate('[...document.querySelectorAll("#component-members li")].map(node=>node.textContent)'), ['C1 = {A, C, B}', 'C2 = {D, E}', 'C3 = {F}']);
  assert.deepEqual(await evaluate('[...document.querySelectorAll("#component-edges li")].map(node=>node.textContent)'), ['C1 → C2: C → D', 'C2 → C3: E → F']);
  assert.equal(await evaluate('document.querySelector("#finish").disabled'), true);
  await screenshot('02-condensation-wide.png', '#certificate');
  passed('the actual diagram reverses every edge and finishes with the expected partition and witnesses');

  const exported = await download('#download-trace', 'strong-components-trace.json');
  const inspected = JSON.parse(exported.bytes);
  assert.equal(inspected.format, 'recallweave-strong-components-trace/1');
  assert.equal(inspected.inspection.eventIndex, inspected.events.length - 1);
  assert.deepEqual(inspected.result.components, [['A', 'C', 'B'], ['D', 'E'], ['F']]);
  assert.equal(inspected.counts.forwardEdgeVisits, 7);
  assert.equal(inspected.counts.transposeEdgeVisits, 7);
  assert.equal(inspected.events[0].componentByNode.A, null);
  const receivedCourse = await download('#download-course', 'strongly-connected-components.json');
  const receivedGuide = await download('#download-guide', 'strongly-connected-components.md');
  assert.deepEqual(receivedCourse.bytes, courseBytes); assert.deepEqual(receivedGuide.bytes, guideBytes);
  passed('three actual downloads retain the complete trace and exact authored course/guide bytes');

  await evaluate('(()=>{const original=URL.createObjectURL;URL.createObjectURL=function(...args){URL.createObjectURL=original;throw new Error("one authored receiving exception");};})()');
  await activate('#download-trace');
  assert.match(await text('#download-status'), /You can retry/);
  assert.equal(await evaluate('document.querySelector("#download-trace").disabled'), false);
  const retry = await download('#download-trace', 'strong-components-trace.json');
  assert.deepEqual(retry.bytes, exported.bytes);
  passed('a single injected download preparation error permits an identical real retry');

  await choose('#edge-text', 'A B\nB C\nC A\nC D\nD E\nE D\nE F\nF A', 'input');
  assert.equal(await evaluate('document.querySelector("#results").hidden'), true);
  assert.equal(await evaluate('document.querySelector("#download-trace").disabled'), true);
  assert.equal(await evaluate('document.querySelector("#check-prediction").disabled'), true);
  await activate('#build'); await activate('#finish');
  assert.match(await text('#component-summary'), /^1 maximal/);
  await choose('#edge-text', 'A Unknown', 'input'); await activate('#build');
  assert.match(await text('#error'), /declared/);
  assert.equal(await evaluate('document.querySelector("#results").hidden'), true);
  assert.equal(await evaluate('document.querySelector("#download-trace").disabled'), true);
  await choose('#example', 'order'); await activate('#finish');
  assert.deepEqual(await evaluate('[...document.querySelectorAll("#component-members li")].map(node=>node.textContent)'), ['C1 = {B}', 'C2 = {A}', 'C3 = {C}']);
  await choose('#example', 'separate'); await activate('#finish');
  assert.match(await text('#component-summary'), /^4 maximal/);
  passed('changed text retires stale output, invalid endpoints refuse, and order/isolated-node examples recover');

  await command('Emulation.setDeviceMetricsOverride', {width: 390, height: 844, deviceScaleFactor: 1, mobile: false});
  const nodes = Array.from({length: 12}, (_, index) => 'N' + index);
  const edges = nodes.flatMap((from, index) => [1, 2, 3].map(offset => from + ' ' + nodes[(index + offset) % nodes.length])).join('\n');
  await choose('#node-text', nodes.join(' '), 'input'); await choose('#edge-text', edges, 'input'); await activate('#build'); await activate('#finish');
  assert.equal((await evaluate('document.querySelectorAll("#node-states tr").length')), 12);
  assert.match(await text('#component-summary'), /^1 maximal/);
  assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'), false);
  await screenshot('03-boundary-compact.png', '#results');
  await choose('#example', 'bridges'); await activate('#finish');
  await screenshot('04-components-compact.png', '#certificate');
  passed('the 390px layout admits twelve nodes and thirty-six edges without page overflow');

  await command('Page.reload', {ignoreCache: true});
  await waitFor(() => evaluate('document.querySelector("#step-count")?.dataset.eventIndex==="0"&&document.querySelectorAll("#node-states tr").length===6'), 'reload restores the original example');
  assert.equal(await evaluate('localStorage.length'), 0);
  assert.equal(await evaluate('sessionStorage.length'), 0);
  passed('reload starts the original graph and no browser storage is written');

  await command('Page.navigate', {url: pathToFileURL(join(project, 'demo.html')).href});
  await waitFor(() => evaluate('document.readyState==="complete"&&!!document.querySelector("#deck-file")'), 'existing direct-file learner');
  await activate('#start-button');
  await waitFor(() => evaluate('!!document.querySelector("[data-choice]")'), 'bundled learner question');
  await activate('[data-choice]');
  const previousSession = await evaluate('document.querySelector("#session-content").innerHTML');
  await selectFile('#deck-file', receivedCourse.path);
  await waitFor(() => evaluate('!!document.querySelector("#start-deck")'), 'downloaded lesson preview');
  assert.equal(await text('#deck-preview-title'), course.title);
  assert.equal(await evaluate('document.querySelector("#session-content").innerHTML'), previousSession);
  await activate('#cancel-deck');
  assert.equal(await evaluate('document.querySelector("#session-content").innerHTML'), previousSession);
  await selectFile('#deck-file', receivedCourse.path);
  await waitFor(() => evaluate('!!document.querySelector("#start-deck")'), 'second lesson preview');
  await activate('#start-deck');
  await waitFor(() => evaluate('document.querySelector("#step-count")?.textContent==="0 / 12"&&!!document.querySelector("[data-choice]")'), 'explicit imported lesson start');
  assert.equal(await text('#lesson-description'), course.title);
  report.learnerQuestions = [];
  for (let index = 0; index < course.items.length; index++) {
    const prompt = await text('.question-card h2');
    const item = course.items.find(item => item.prompt === prompt);
    assert.ok(item, 'the learner displays an authored course question');
    assert.equal(report.learnerQuestions.includes(item.id), false);
    report.learnerQuestions.push(item.id);
    await activate('[data-choice="' + item.answer + '"]');
    assert.ok((await text('#feedback-slot')).includes(item.explanation));
    await activate('#next-button');
  }
  assert.equal(await text('#step-count'), '12 / 12');
  assert.match(await text('#first-try-summary'), /12 of 12/);
  assert.equal(await evaluate('document.querySelectorAll(".review-item").length'), 12);
  assert.match(await text('.source-note'), /Cornell University/);
  assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'), false);
  report.learnerSummary = await text('#first-try-summary');
  await screenshot('05-imported-lesson-complete.png', '.result-card');
  passed('the actual downloaded file previews without replacing a session, cancels safely, and completes all twelve questions after explicit start');

  assert.deepEqual(report.pageErrors, []);
  assert.deepEqual(report.requests.filter(url => /^https?:/i.test(url)), []);
  assert.deepEqual(await pins(), report.sourceSha256);
  passed('source bytes are unchanged and both offline pages have no JavaScript exceptions or HTTP requests');
  report.status = 'passed';
} catch (error) {
  report.status = 'failed'; report.error = error.stack || String(error); process.exitCode = 1;
  if (socket && sessionId) try { report.failureText = await evaluate('document.body.innerText'); await screenshot('failure.png'); } catch (captureError) { report.captureError = String(captureError); }
  console.error(report.error);
} finally {
  if (socket) { try { await command('Browser.close', {}, false); } catch {} socket.close(); }
  if (browser && browser.exitCode === null) { browser.kill(); await pause(300); }
  for (const entry of pending.values()) { clearTimeout(entry.timer); entry.reject(new Error('Browser receiving finished.')); }
  pending.clear();
  try {
    await rm(profile, {recursive: true, force: true});
    report.cleanup = {ownedProfileRemoved: true, browserExitCode: browser?.exitCode ?? null};
    report.finished = new Date().toISOString();
    await writeFile(join(output, 'browser.log'), browserLog);
    await writeFile(join(output, 'receipt.json'), JSON.stringify(report, null, 2) + '\n');
  } catch (error) { process.exitCode = 1; console.error('Could not preserve final evidence: ' + error); }
  console.log(JSON.stringify({status: report.status, checks: report.checks.length, output}));
}
