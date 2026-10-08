#!/usr/bin/env node
/** Course-specific native receiver. CDP transport follows tools/check_browser.mjs.
 * Uses existing Node and Chrome, actual inputs/downloads and the unchanged current learner. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {createReadStream} from 'node:fs';
import {readFile, writeFile, mkdir, mkdtemp, rm, stat, statfs} from 'node:fs/promises';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const args = process.argv.slice(2);
const mobileOnly = args.includes('--mobile-only');
if (mobileOnly) args.splice(args.indexOf('--mobile-only'), 1);
if (args.includes('--help')) {
  console.log('Usage: node tools/check_least_squares_browser.mjs --browser /absolute/existing/chromium --output /absolute/new/evidence-directory [--root repository-directory] [--mobile-only]\nNode 22+ with built-in WebSocket. Requires 256 MiB free on the output filesystem; no install or existing-profile reuse. The output parent must exist. Each attempt needs a new output directory.');
  process.exit(0);
}
const supplied = {};
for (let i = 0; i < args.length; i += 2) {
  if (!['--browser', '--output', '--root'].includes(args[i]) || !args[i + 1] || args[i + 1].startsWith('--') || args[i] in supplied) throw new Error('Use --help for the exact receiver arguments.');
  supplied[args[i]] = args[i + 1];
}
if (!supplied['--browser'] || !supplied['--output']) throw new Error('An existing browser and new evidence directory are required. Use --help.');
const project = resolve(supplied['--root'] ?? fileURLToPath(new URL('../', import.meta.url)));
const executable = resolve(supplied['--browser']), output = resolve(supplied['--output']);
const floorBytes = 256 * 1024 * 1024;
const capacity = async path => { const s = await statfs(path); return Number(s.bavail) * Number(s.bsize); };
const preflightFreeBytes = await capacity(dirname(output));
if (preflightFreeBytes < floorBytes) {
  console.error(JSON.stringify({status: 'capacity-refusal', preflightFreeBytes, floorBytes, output, browserStarted: false}));
  process.exit(2);
}
await mkdir(output); // Refuse an existing attempt; never overwrite a prior download or failure.
const profile = await mkdtemp(join(output, 'profile-'));
const sourcePaths = ['courses/least-squares-core.mjs', 'courses/least-squares-ui.mjs', 'courses/least-squares-lab.template.html',
  'courses/least-squares-lab.html', 'courses/least-squares.json', 'courses/least-squares.md', 'tools/build_least_squares.mjs',
  'tools/check_least_squares_browser.mjs', 'tests/least-squares.test.mjs', 'src/deck.mjs', 'demo.html'];
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const report = {scope: mobileOnly ? 'mobile CSS correction and residual selector operation only' : 'full lab and actual emitted-course receiving', status: 'running', started: new Date().toISOString(), project, executable, output, node: process.version,
  platform: process.platform, capacity: {preflightFreeBytes, floorBytes}, source: {}, checks: [], downloads: [], screenshots: [], requests: [], pageErrors: []};
const sleep = milliseconds => new Promise(done => setTimeout(done, milliseconds));
const pending = new Map(), downloadEvents = new Map();
let browser, socket, sessionId, sequence = 0, browserLog = '', browserExit, pagePhase = 'setup';
async function waitFor(check, label, milliseconds = 20000) {
  const deadline = Date.now() + milliseconds; let lastError;
  while (Date.now() < deadline) {
    try { if (await check()) return; } catch (error) { lastError = error; }
    await sleep(80);
  }
  throw new Error(`Timed out: ${label}${lastError ? ` (${lastError.message})` : ''}`);
}
function command(method, params = {}, scoped = true) {
  const id = ++sequence;
  return new Promise((fulfill, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
    pending.set(id, {fulfill, reject, timer});
    socket.send(JSON.stringify({id, method, params, ...(scoped && sessionId ? {sessionId} : {})}));
  });
}
async function evaluate(expression) {
  const result = await command('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true});
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  return result.result.value;
}
async function key(name, modifiers = 0) {
  const keys = {Enter: 13, Tab: 9, ArrowDown: 40, ArrowUp: 38, ArrowRight: 39, Home: 36, a: 65};
  for (const type of ['keyDown', 'keyUp']) await command('Input.dispatchKeyEvent', {type, key: name, code: name === 'a' ? 'KeyA' : name,
    windowsVirtualKeyCode: keys[name], nativeVirtualKeyCode: keys[name], modifiers,
    ...(name === 'Enter' && type === 'keyDown' ? {text: '\r', unmodifiedText: '\r'} : {})});
}
async function focus(selector) {
  assert.equal(await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`), true, `Missing ${selector}`);
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
}
async function activate(selector) { await focus(selector); await key('Enter'); }
async function fill(selector, text) {
  await focus(selector); await key('a', process.platform === 'darwin' ? 4 : 2);
  await command('Input.insertText', {text: String(text)});
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(selector)}).value`), String(text), `Actual input ${selector}`);
}
async function chooseExample(id) {
  await focus('#example-select');
  const positions = await evaluate(`({at:document.querySelector('#example-select').selectedIndex,
    wanted:[...document.querySelector('#example-select').options].findIndex(o=>o.value===${JSON.stringify(id)})})`);
  assert.ok(positions.wanted >= 0);
  for (let i = 0; i < Math.abs(positions.at - positions.wanted); i++) await key(positions.wanted > positions.at ? 'ArrowDown' : 'ArrowUp');
  await key('Enter');
  assert.equal(await evaluate("document.querySelector('#example-select').value"), id, 'Native example selection');
  await activate('#load-example');
  assert.equal(await evaluate("document.activeElement.getAttribute('aria-label')"), 'Point 1, x', 'Loaded data input focus');
}
async function labState() {
  return evaluate(`({equation:document.querySelector('#fit-equation').textContent,
    a:document.querySelector('#fit-a').firstChild?.textContent??'',b:document.querySelector('#fit-b').firstChild?.textContent??'',
    mean:document.querySelector('#mean-point').textContent,fitSSE:document.querySelector('#fit-sse').firstChild?.textContent??'',
    trialSSE:document.querySelector('#trial-sse').firstChild?.textContent??'',excess:document.querySelector('#excess-sse').firstChild?.textContent??'',
    status:document.querySelector('#lab-status').textContent,prediction:document.querySelector('#prediction-result').textContent,
    predictionScope:document.querySelector('#prediction-scope').textContent,identity:document.querySelector('#identity-values').textContent,
    rowValues:[...document.querySelectorAll('#point-rows .point-row')].map(r=>[...r.querySelectorAll('input')].map(i=>i.value)),
    table:[...document.querySelectorAll('#residual-rows tr')].map(r=>[...r.cells].map(c=>c.textContent)),
    fitVisible:!document.querySelector('#fit-content').hidden,copyDisabled:document.querySelector('#use-fit').disabled,
    pointMarks:document.querySelectorAll('[data-kind=point]').length,fitLines:document.querySelectorAll('[data-kind=fit-line]').length,
    trialLines:document.querySelectorAll('[data-kind=trial-line]').length,plotNote:document.querySelector('#plot-note').textContent,
    overflow:document.documentElement.scrollWidth>innerWidth})`);
}
async function check(name, operation) {
  if (mobileOnly && name !== '390px plot text stays readable and the exact table scrolls by keyboard') return;
  const freeBytes = await capacity(output);
  if (freeBytes < floorBytes) throw new Error(`Capacity dropped below 256 MiB before ${name}: ${freeBytes} bytes.`);
  const started = Date.now(), observations = await operation();
  report.checks.push({name, freeBytes, elapsedMs: Date.now() - started, observations}); console.log(`PASS ${name}`);
}
async function navigate(path, readySelector, width = 1280, height = 1050) {
  await command('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: false});
  const url = pathToFileURL(path).href; await command('Page.navigate', {url});
  await waitFor(() => evaluate(`location.href===${JSON.stringify(url)} && document.readyState==='complete' && !!document.querySelector(${JSON.stringify(readySelector)})`), 'directly opened page');
}
async function screenshot(name, selector) {
  if (selector) await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'start'})`);
  else await evaluate('window.scrollTo(0,0)');
  await evaluate('new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)))');
  const {data} = await command('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false});
  const bytes = Buffer.from(data, 'base64'); await writeFile(join(output, name), bytes);
  report.screenshots.push({path: name, bytes: bytes.length, sha256: sha256(bytes), scope: 'Captured viewport; no assertion about uncaptured content'});
}
async function download(button, subdirectory, expectedName, expectedBytes) {
  const destination = join(output, subdirectory); await mkdir(destination);
  await command('Browser.setDownloadBehavior', {behavior: 'allow', downloadPath: destination, eventsEnabled: true}, false);
  const earlier = new Set(downloadEvents.keys()); await activate(button); let event;
  await waitFor(() => {event = [...downloadEvents.entries()].find(([id, value]) => !earlier.has(id) && value.state === 'completed')?.[1];return Boolean(event);}, `actual ${expectedName} download`);
  assert.equal(event.suggestedFilename, expectedName);
  const path = join(destination, expectedName); let bytes;
  await waitFor(async () => {bytes = await readFile(path);return bytes.length === expectedBytes.length;}, 'completed download bytes');
  assert.deepEqual(bytes, expectedBytes, 'Actual emitted file must be exact');
  const record = {path, suggestedFilename: event.suggestedFilename, guid: event.guid, bytes: bytes.length, sha256: sha256(bytes)};
  report.downloads.push(record); return record;
}
async function hashFile(path) {
  const hash = createHash('sha256');for await (const chunk of createReadStream(path)) hash.update(chunk);return hash.digest('hex');
}
try {
  for (const path of sourcePaths) {const bytes = await readFile(join(project, path));report.source[path] = {bytes: bytes.length, sha256: sha256(bytes)};}
  const courseBytes = await readFile(join(project, 'courses/least-squares.json'));
  const guideBytes = await readFile(join(project, 'courses/least-squares.md'));
  const course = JSON.parse(courseBytes.toString('utf8')); assert.equal(course.items.length, 16);
  const binaryStat = await stat(executable);report.browserExecutable = {bytes: binaryStat.size, sha256: await hashFile(executable)};
  report.capacity.beforeLaunchBytes = await capacity(output);
  if (report.capacity.beforeLaunchBytes < floorBytes) throw new Error('Capacity dropped below 256 MiB before browser launch.');
  browser = spawn(executable, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-background-networking', '--disable-component-update',
    '--disable-sync', '--no-first-run', '--no-default-browser-check', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0',
    `--user-data-dir=${profile}`, 'about:blank'], {stdio: ['ignore', 'ignore', 'pipe'], detached: true});
  report.browserPid = browser.pid;
  browserExit = new Promise(done => {browser.once('exit', (code, signal) => done({code, signal}));browser.once('error', error => done({error: error.message}));});
  browser.stderr.on('data', bytes => {browserLog = (browserLog + bytes.toString()).slice(-12000);});
  let launchError, port, endpoint;browser.on('error', error => {launchError = error;});
  await waitFor(async () => {
    if (launchError) throw launchError;
    if (browser.exitCode !== null) throw new Error(`Browser exited ${browser.exitCode}: ${browserLog}`);
    [port, endpoint] = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).trim().split('\n');return Boolean(port && endpoint);
  }, 'fresh private browser startup', 45000);
  socket = new WebSocket(`ws://127.0.0.1:${port}${endpoint}`);
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const request = pending.get(message.id);if (!request) return;pending.delete(message.id);clearTimeout(request.timer);
      if (message.error) request.reject(new Error(message.error.message));else request.fulfill(message.result);
    } else if (message.method === 'Runtime.exceptionThrown') report.pageErrors.push({phase: pagePhase, error: message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text});
    else if (message.method === 'Network.requestWillBeSent') report.requests.push({phase: pagePhase, url: message.params.request.url, type: message.params.type});
    else if (message.method === 'Browser.downloadWillBegin') downloadEvents.set(message.params.guid, {...message.params, state: 'started'});
    else if (message.method === 'Browser.downloadProgress') downloadEvents.set(message.params.guid, {...downloadEvents.get(message.params.guid), ...message.params});
  });
  await new Promise((done, reject) => {socket.addEventListener('open', done, {once: true});socket.addEventListener('error', reject, {once: true});});
  report.browser = await command('Browser.getVersion', {}, false);
  const {targetId} = await command('Target.createTarget', {url: 'about:blank'}, false);
  ({sessionId} = await command('Target.attachToTarget', {targetId, flatten: true}, false));
  await command('Page.enable');await command('Runtime.enable');await command('Network.enable');await command('DOM.enable');
  await command('Network.setBlockedURLs', {urls: ['http://*', 'https://*']});
  pagePhase = 'lab';await navigate(join(project, 'courses/least-squares-lab.html'), '#fit-content:not([hidden])');
  await check('direct-open exact noisy example and complete numeric table', async () => {
    const state = await labState();assert.equal(state.a, '2/3');assert.equal(state.b, '1');assert.equal(state.fitSSE, '2/3');
    assert.equal(state.trialSSE, '2');assert.equal(state.excess, '4/3');assert.equal(state.mean, '(0, 2/3)');
    assert.deepEqual(state.table.map(row => row.slice(3, 6)), [['-4/3', '1/3', '1/9'], ['2/3', '-2/3', '4/9'], ['8/3', '1/3', '1/9']]);
    assert.equal(state.pointMarks, 3);assert.equal(state.fitLines, 1);assert.equal(state.overflow, false);
    assert.match(state.prediction, /5\/3/);assert.match(state.predictionScope, /Inside/);await screenshot('lab-desktop.png');return state;
  });
  await check('all six examples through native select and button controls', async () => {
    const expected = [['noisy', '2/3', '1', '2/3', '2', 3], ['perfect', '1', '2', '0', '11', 3], ['curved', '2', '0', '14', '34', 5],
      ['repeated', '1', '1/2', '2', '4', 3], ['equal-x', 'Not unique', 'Not unique', '8', '8', 3], ['influential', '500/251', '-289/251', '2400/251', '400', 4]];
    const observations = [];
    for (const [id, a, b, sse, trial, count] of expected) {
      await chooseExample(id);const state = await labState();assert.equal(state.a, a, id);assert.equal(state.b, b, id);assert.equal(state.fitSSE, sse, id);assert.equal(state.trialSSE, trial, id);
      assert.equal(state.table.length, count);assert.equal(state.pointMarks, count);assert.equal(state.copyDisabled, id === 'equal-x');assert.equal(state.fitLines, id === 'equal-x' ? 0 : 1);observations.push({id, ...state});
    }return observations;
  });
  await check('exact copy, rounded trial and changed y give distinct current results', async () => {
    await chooseExample('noisy');await activate('#use-fit');assert.equal(await evaluate("document.querySelector('#trial-a').value"), '2/3');assert.equal((await labState()).excess, '0');
    await fill('#trial-a', '0.667');assert.equal((await labState()).excess, '1/3000000');
    await activate('#use-fit');await fill('#point-rows .point-row:nth-child(2) [data-axis=y]', '2');
    const state = await labState();assert.equal(state.a, '4/3');assert.equal(state.b, '1');assert.equal(state.fitSSE, '2/3');
    assert.deepEqual(state.table.map(row => row[4]), ['-1/3', '2/3', '-1/3']);assert.match(await evaluate("document.querySelector('#example-note').textContent"), /Your edited data/);return state;
  });
  let downloadedCourse;
  await check('invalid input retires results while the fixed course really downloads', async () => {
    const states = [];
    for (const value of ['', '21', '0.5']) {
      await fill('#point-rows .point-row:first-child [data-axis=x]', value);const state = await labState();assert.equal(state.fitVisible, false);assert.equal(state.table.length, 0);
      assert.equal(state.pointMarks, 0);assert.equal(state.a, '');assert.equal(state.copyDisabled, true);assert.equal(state.rowValues[0][0], value);
      assert.equal(await evaluate("document.querySelector('#download-course').disabled"), false);states.push(state);
    }
    downloadedCourse = await download('#download-course', 'course-in-invalid-state', 'least-squares.json', courseBytes);
    await fill('#point-rows .point-row:first-child [data-axis=x]', '-2');assert.equal((await labState()).a, '4/3');return {states, downloadedCourse};
  });
  await check('all-equal x identifies a value without inventing line coefficients', async () => {
    await chooseExample('equal-x');assert.equal((await labState()).identity, '0 = 0 + 0');
    await fill('#query-x', '4');const outside = await labState();assert.match(outside.prediction, /no unique fitted value/);
    await fill('#trial-a', '3');await fill('#trial-b', '0');const secondLine = await labState();assert.equal(secondLine.trialSSE, '8');assert.equal(secondLine.copyDisabled, true);
    assert.equal(secondLine.fitLines, 0);assert.match(secondLine.prediction, /no unique/);await fill('#query-x', '3');assert.match((await labState()).prediction, /ŷ = 3/);
    await screenshot('lab-equal-x.png', '#fit-heading');
    await fill('#point-rows .point-row:first-child [data-axis=x]', '4');const restored = await labState();assert.equal(restored.a, '13');assert.equal(restored.b, '-3');assert.equal(restored.fitSSE, '2');
    assert.equal(restored.copyDisabled, false);assert.equal(restored.fitLines, 1);return {outside, secondLine, restored};
  });
  await check('row bounds and add/remove keyboard focus preserve usable data', async () => {
    await chooseExample('noisy');await activate('#point-rows .point-row:first-child button');assert.equal((await labState()).rowValues.length, 2);
    assert.equal(await evaluate("[...document.querySelectorAll('#point-rows button')].every(b=>b.disabled)"), true);assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'), 'Point 1, x');
    for (let i = 2; i < 12; i++) await activate('#add-row');
    assert.equal((await labState()).rowValues.length, 12);assert.equal(await evaluate("document.querySelector('#add-row').disabled"), true);assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'), 'Point 12, x');
    await key('Tab');assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'), 'Point 12, y');await key('Tab');assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'), 'Remove point 12');
    await key('Enter');assert.equal((await labState()).rowValues.length, 11);assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'), 'Point 11, x');assert.equal(await evaluate("document.querySelector('#add-row').disabled"), false);
    return {minimum: 2, maximum: 12, afterRemoval: 11, finalFocus: 'Point 11, x'};
  });
  await check('offscreen trial preserves point scale and exact error table', async () => {
    await chooseExample('noisy');await fill('#trial-a', '1000');await fill('#trial-b', '0');const state = await labState();assert.equal(state.trialLines, 0);assert.equal(state.pointMarks, 3);assert.equal(state.fitLines, 1);
    assert.equal(state.trialSSE, '2996010');assert.match(state.plotNote, /entirely off screen/);assert.deepEqual(state.table.map(row => row[6]), ['1000', '1000', '1000']);return state;
  });
  await check('query endpoints, extrapolation and invalid scalar recovery stay distinct', async () => {
    await chooseExample('noisy');await fill('#query-x', '2');const endpoint = await labState();assert.match(endpoint.predictionScope, /Inside/);assert.match(endpoint.prediction, /8\/3/);
    await fill('#query-x', '2001/1000');const adjacent = await labState();assert.match(adjacent.predictionScope, /Extrapolation/);
    await fill('#query-x', '41');assert.equal((await labState()).fitVisible, false);await fill('#query-x', '3');const restored = await labState();assert.match(restored.prediction, /11\/3/);
    await fill('#trial-b', '1/0');assert.equal((await labState()).fitVisible, false);await fill('#trial-b', '1');assert.equal((await labState()).fitVisible, true);return {endpoint, adjacent, restored};
  });
  await check('390px plot text stays readable and the exact table scrolls by keyboard', async () => {
    await command('Emulation.setDeviceMetricsOverride', {width: 390, height: 1100, deviceScaleFactor: 1, mobile: false});await chooseExample('curved');
    await waitFor(() => evaluate("Math.abs(document.querySelector('#plot svg').viewBox.baseVal.width-document.querySelector('#plot').clientWidth)<1"), 'responsive plot redraw');
    const layout = await evaluate(`({viewport:innerWidth,bodyWidth:document.documentElement.scrollWidth,plotWidth:document.querySelector('#plot').clientWidth,
      svgWidth:document.querySelector('#plot svg').viewBox.baseVal.width,tickFont:Math.min(...[...document.querySelectorAll('#plot text')].map(n=>Number(n.getAttribute('font-size')))),
      tableWidth:document.querySelector('#table-content').clientWidth,tableScrollWidth:document.querySelector('#table-content').scrollWidth})`);
    assert.ok(layout.bodyWidth <= layout.viewport);assert.ok(layout.tickFont >= 12);assert.ok(layout.tableScrollWidth > layout.tableWidth);
    const mode = await evaluate(`(() => {const select=document.querySelector('#residual-model'),probe=document.createElement('span');probe.style.font=getComputedStyle(select).font;probe.style.position='absolute';probe.style.visibility='hidden';probe.textContent=select.selectedOptions[0].textContent;document.body.append(probe);const measured={controlWidth:select.getBoundingClientRect().width,textWidth:probe.getBoundingClientRect().width,text:probe.textContent};probe.remove();return measured;})()`);
    assert.ok(mode.controlWidth-mode.textWidth>=32, 'Selected residual wording needs room for padding and native arrow');layout.residualSelector=mode;
    await screenshot('lab-mobile.png', '#plot-heading');await focus('#table-content');await key('ArrowRight');await waitFor(() => evaluate("document.querySelector('#table-content').scrollLeft>0"), 'keyboard internal table scroll');
    layout.keyboardScrollLeft = await evaluate("document.querySelector('#table-content').scrollLeft");
    const unchangedTable = (await labState()).table;
    const operation = [];
    for (const [keyName, value, lineKind, word] of [['ArrowDown','trial','trial-line','trial'],['ArrowUp','fit','fit-line','fitted']]) {
      await focus('#residual-model');await key(keyName);await key('Enter');
      await waitFor(() => evaluate(`document.querySelector('#residual-model').value===${JSON.stringify(value)} && document.querySelector('#plot-description').textContent.includes(${JSON.stringify(word+' residuals')})`), 'changed residual drawing');
      const drawing = await evaluate(`({wording:document.querySelector('#residual-model').selectedOptions[0].textContent,lineY:document.querySelector('[data-kind=${lineKind}]').getAttribute('y1'),residualY:[...document.querySelectorAll('[data-kind=residual]')].map(n=>n.getAttribute('y2'))})`);
      assert.ok(drawing.residualY.every(y=>Math.abs(Number(y)-Number(drawing.lineY))<1e-8), 'Residuals end at the selected horizontal line in the curved example');
      assert.deepEqual((await labState()).table, unchangedTable);operation.push({value,...drawing});
    }
    layout.dropdownOperations=operation;return layout;
  });
  await check('a transient download failure permits retry and cleans up its link and URL', async () => {
    await evaluate(`(() => {const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL),owned=new Set();window.__leastSquaresDownloadEvents=[];let refuse=true;
      URL.createObjectURL=(...args)=>{if(refuse){refuse=false;throw new Error('receiver-injected one-time setup failure');}const url=create(...args);owned.add(url);window.__leastSquaresDownloadEvents.push(['create',url]);return url;};
      URL.revokeObjectURL=url=>{if(owned.has(url))window.__leastSquaresDownloadEvents.push(['revoke',url]);return revoke(url);};})()`);
    const before = await labState();await activate('#download-guide');assert.equal(await evaluate("document.querySelector('#download-guide').disabled"), false);assert.match(await evaluate("document.querySelector('#download-status').textContent"), /try the button again/);
    const artifact = await download('#download-guide', 'guide-after-retry', 'least-squares.md', guideBytes);await waitFor(() => evaluate("window.__leastSquaresDownloadEvents.filter(e=>e[0]==='revoke').length===1"), 'owned Blob URL cleanup');
    const events = await evaluate('window.__leastSquaresDownloadEvents');assert.equal(events[0][1], events[1][1]);assert.equal(await evaluate('document.querySelectorAll("a[download]").length'), 0);
    assert.deepEqual(await labState(), before);return {artifact, cleanup: events.map(([kind]) => kind), injectedFailure: 'one createObjectURL exception caught by the production handler'};
  });
  if (!mobileOnly) {
  pagePhase = 'actual-learner';await navigate(join(project, 'demo.html'), '#deck-file');
  await check('actual downloaded JSON is consumed by current learner import and preview', async () => {
    const {root} = await command('DOM.getDocument');const {nodeId} = await command('DOM.querySelector', {nodeId: root.nodeId, selector: '#deck-file'});
    await command('DOM.setFileInputFiles', {nodeId, files: [downloadedCourse.path]});await waitFor(() => evaluate("!!document.querySelector('#start-deck')"), 'actual file preview');
    const preview = await evaluate(`({title:document.querySelector('#deck-preview-title').textContent,count:document.querySelector('.deck-preview-count').textContent,
      prompts:[...document.querySelectorAll('#deck-preview ol strong')].map(n=>n.textContent),attribution:document.querySelector('.deck-preview-attribution').textContent,
      filename:document.querySelector('#deck-file').files[0].name,fileBytes:document.querySelector('#deck-file').files[0].size})`);
    assert.equal(preview.title, course.title);assert.deepEqual(preview.prompts, course.items.map(item => item.prompt));assert.match(preview.count, /16 questions · 4 concepts/);
    assert.equal(preview.fileBytes, courseBytes.length);assert.equal(preview.filename, 'least-squares.json');assert.ok(preview.attribution.includes(course.attribution));await screenshot('learner-import.png', '#deck-preview');
    await activate('#start-deck');await waitFor(() => evaluate("!!document.querySelector('.question-card h2')"), 'imported first question');return {...preview, emittedFileSha256: downloadedCourse.sha256};
  });
  await check('all sixteen imported questions reach review and a separate practice retry', async () => {
    const answers = [];
    for (let i = 0; i < 16; i++) {
      const prompt = await evaluate("document.querySelector('.question-card h2').textContent");const item = course.items.find(candidate => candidate.prompt === prompt);assert.ok(item, 'Question belongs to emitted course');
      assert.equal(answers.some(answer => answer.id === item.id), false);const chosen = i === 0 ? (item.answer + 1) % 4 : item.answer;
      const order = await evaluate("[...document.querySelectorAll('[data-choice]')].map(b=>Number(b.dataset.choice))");await activate(`[data-choice="${chosen}"]`);
      const feedback = await evaluate("document.querySelector('#feedback-slot').textContent");assert.ok(feedback.includes(item.explanation));assert.ok(feedback.includes(item.transfer));answers.push({id: item.id, chosen, correct: chosen === item.answer, displayedOrder: order});await activate('#next-button');
    }
    assert.equal(new Set(answers.map(answer => answer.id)).size, 16);
    const firstTry = await evaluate(`({summary:document.querySelector('#first-try-summary').textContent,estimates:[...document.querySelectorAll('.mastery-box output')].map(n=>n.textContent),
      reviewCount:document.querySelectorAll('.review-item').length,prompts:[...document.querySelectorAll('.review-prompt')].map(n=>n.textContent)})`);
    assert.match(firstTry.summary, /15 of 16/);assert.equal(firstTry.reviewCount, 16);assert.deepEqual([...firstTry.prompts].sort(), course.items.map(item => item.prompt).sort());
    const missed = course.items.find(item => item.id === answers[0].id), index = firstTry.prompts.indexOf(missed.prompt);await activate(`.review-item:nth-of-type(${index + 1}) summary`);
    const selectedReview = await evaluate(`(() => {const row=[...document.querySelectorAll('.review-item')].find(n=>n.querySelector('.review-prompt').textContent===${JSON.stringify(missed.prompt)});return {open:row.open,answers:[...row.querySelectorAll('.review-answers dd')].map(n=>n.textContent),text:row.textContent};})()`);
    assert.equal(selectedReview.open, true);assert.deepEqual(selectedReview.answers, [missed.options[answers[0].chosen], missed.options[missed.answer]]);assert.ok(selectedReview.text.includes(missed.explanation));assert.ok(selectedReview.text.includes(missed.transfer));
    await activate('#practice-button');assert.equal(await evaluate("document.querySelector('.practice-card h2').textContent"), missed.prompt);await activate(`[data-practice-choice="${missed.answer}"]`);await activate('#practice-next');
    const after = await evaluate(`({summary:document.querySelector('#first-try-summary').textContent,estimates:[...document.querySelectorAll('.mastery-box output')].map(n=>n.textContent),
      status:document.querySelector('#practice-status').textContent,reviewCount:document.querySelectorAll('.review-item').length,retryCount:document.querySelectorAll('.review-practice-answer').length})`);
    assert.equal(after.summary, firstTry.summary);assert.deepEqual(after.estimates, firstTry.estimates);assert.match(after.status, /1 of 1 correctly on retry/);assert.equal(after.reviewCount, 16);assert.equal(after.retryCount, 1);
    await screenshot('learner-review.png', '.result-card');return {answers, firstTry, selectedReview, after};
  });
  }
  assert.deepEqual(report.pageErrors, []);assert.ok(report.requests.every(request => /^(file:|blob:|data:)/.test(request.url)), 'Neither page may issue hosted requests');
  for (const path of sourcePaths) assert.equal(sha256(await readFile(join(project, path))), report.source[path].sha256, `Source changed: ${path}`);
  const afterBinaryStat = await stat(executable);assert.equal(afterBinaryStat.size, binaryStat.size);assert.equal(afterBinaryStat.mtimeMs, binaryStat.mtimeMs);report.status = 'passed';
} catch (error) {
  report.status = 'failed';report.error = error.stack ?? String(error);report.browserLog = browserLog;
  if (sessionId && socket?.readyState === WebSocket.OPEN) {
    try {report.lastPage = await evaluate('({url:location.href,focus:document.activeElement?.outerHTML,text:document.body.innerText.slice(0,18000)})');await screenshot('failed-state.png');}
    catch (captureError) {report.failureCaptureError = captureError.message;}
  }
  console.error(report.error);process.exitCode = 1;
} finally {
  if (socket?.readyState === WebSocket.OPEN) {try {await command('Browser.close', {}, false);} catch {}}
  socket?.close();for (const request of pending.values()) clearTimeout(request.timer);
  if (browser) {
    let exited = await Promise.race([browserExit, sleep(1500).then(() => null)]);
    for (const signal of ['SIGTERM', 'SIGKILL']) {
      if (exited || !browser.pid) break;
      try {process.kill(-browser.pid, signal);} catch (error) {if (error.code !== 'ESRCH') report.cleanupError = error.message;}
      exited = await Promise.race([browserExit, sleep(1500).then(() => null)]);
    }
    report.browserExit = exited ?? {state: 'termination-sent'};
  }
  await rm(profile, {recursive: true, force: true});report.profileRemoved = true;report.finished = new Date().toISOString();
  report.capacity.afterCleanupBytes = await capacity(output);
  await writeFile(join(output, 'browser-receipt.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`${report.status.toUpperCase()}: ${report.checks.length} lab/import groups; ${join(output, 'browser-receipt.json')}`);
}
