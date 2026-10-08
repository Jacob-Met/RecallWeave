#!/usr/bin/env node
/** Native eigen-directions receiver. CDP transport/cleanup adapted from the existing
 * check_least_squares_browser.mjs at blob 1bd9096b497d7a09f86d8f0308b1c260b779332b.
 * Product cases below are specific to this contribution; no existing profile is reused. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {createReadStream} from 'node:fs';
import {readFile, writeFile, mkdir, mkdtemp, rm, stat, statfs} from 'node:fs/promises';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('Usage: node tools/check_eigen_directions_browser.mjs --browser /absolute/existing/chromium --output /absolute/new/evidence-directory [--root repository-directory]\nNode 22+ with built-in WebSocket. Requires 256 MiB free on the output filesystem; no install or existing-profile reuse. The output parent must exist. Each attempt needs a new output directory.');
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
const sourcePaths = ['src/eigen-directions.mjs', 'src/eigen-directions-ui.mjs', 'templates/eigen-directions-explorer.html',
  'courses/eigen-directions-explorer.html', 'courses/eigen-directions.json', 'courses/eigen-directions.md', 'tools/build-eigen-directions.mjs',
  'tools/check_eigen_directions_browser.mjs', 'tests/eigen-directions.test.mjs', 'src/deck.mjs', 'demo.html'];
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const report = {scope: 'eigen-directions lab and actual emitted-course receiving', status: 'running', started: new Date().toISOString(), project, executable, output, node: process.version,
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
  await focus('#preset');
  const positions = await evaluate('({at:document.querySelector("#preset").selectedIndex,wanted:[...document.querySelector("#preset").options].findIndex(o=>o.value===' + JSON.stringify(id) + ')})');
  assert.ok(positions.wanted >= 0);
  for (let i = 0; i < Math.abs(positions.at - positions.wanted); i++) await key(positions.wanted > positions.at ? 'ArrowDown' : 'ArrowUp');
  await key('Enter');
  assert.equal(await evaluate('document.querySelector("#preset").value'), id);
  await activate('#load-preset');
}
async function labState() {
  return evaluate('({title:document.querySelector("#result-title").textContent,eigen:document.querySelector("#result-title").dataset.eigen,' +
    'equation:document.querySelector("#action-equation").textContent,cross:document.querySelector("#cross-equation").textContent,' +
    'description:document.querySelector("#action-description").textContent,summary:document.querySelector("#direction-summary").textContent,' +
    'trace:document.querySelector("#trace").textContent,determinant:document.querySelector("#determinant").textContent,discriminant:document.querySelector("#discriminant").textContent,' +
    'status:document.querySelector("#input-status").textContent,state:document.querySelector("#input-status").dataset.state,' +
    'rows:[...document.querySelectorAll("#eigen-rows tr")].map(r=>[...r.cells].map(c=>c.textContent)),' +
    'eigenLines:document.querySelectorAll("#plot-eigen line").length,viewbox:document.querySelector("#vector-plot").getAttribute("viewBox"),' +
    'overflow:document.documentElement.scrollWidth>innerWidth})');
}
async function check(name, operation) {
  const freeBytes = await capacity(output);
  if (freeBytes < floorBytes) throw new Error('Insufficient free space before ' + name);
  const started = Date.now(), observations = await operation();
  report.checks.push({name, freeBytes, elapsedMs: Date.now() - started, observations});
  console.log('PASS ' + name);
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
  await waitFor(async () => {bytes = await readFile(path);return expectedBytes ? bytes.length === expectedBytes.length : bytes.length > 0;}, 'completed download bytes');
  if (expectedBytes) assert.deepEqual(bytes, expectedBytes, 'Actual emitted file must be exact');
  const record = {path, suggestedFilename: event.suggestedFilename, guid: event.guid, bytes: bytes.length, sha256: sha256(bytes)};
  report.downloads.push(record); return record;
}
async function hashFile(path) {
  const hash = createHash('sha256');for await (const chunk of createReadStream(path)) hash.update(chunk);return hash.digest('hex');
}
try {
  for (const path of sourcePaths) {const bytes = await readFile(join(project, path));report.source[path] = {bytes: bytes.length, sha256: sha256(bytes)};}
  const courseBytes = await readFile(join(project, 'courses/eigen-directions.json'));
  const guideBytes = await readFile(join(project, 'courses/eigen-directions.md'));
  const course = JSON.parse(courseBytes.toString('utf8')); assert.equal(course.items.length, 14);
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
  pagePhase = 'lab';await navigate(join(project, 'courses/eigen-directions-explorer.html'), '#result-title[data-eigen]');
  await check('direct-open complete applied experiment and exact probe result', async () => {
    const state = await labState();
    assert.equal(state.title, 'This probe changes line');
    assert.match(state.equation, /v = \(1, 1\)  →  Av = \(3, 1\)/);
    assert.match(state.cross, /= -2/);
    assert.deepEqual([state.trace,state.determinant,state.discriminant], ['4','3','4']);
    assert.equal(state.eigenLines, 2);
    assert.equal(state.overflow, false);
    await screenshot('lab-desktop.png');
    return state;
  });
  await check('nine examples apply through native select and keyboard activation', async () => {
    const expected = [
      ['stretch','no','4','3','4','This probe changes line'],
      ['reflection','yes','0','-1','4','Yes — eigenvalue -1'],
      ['projection','yes','1','0','1','Yes — eigenvalue 0'],
      ['shear','no','2','1','0','This probe changes line'],
      ['scalar','yes','4','4','0','Yes — eigenvalue 2'],
      ['rotation','no','0','1','-4','This probe changes line'],
      ['oblique','yes','4','3','4','Yes — eigenvalue 1'],
      ['irrational','no','1','-1','5','This probe changes line'],
      ['zero','yes','0','0','0','Yes — eigenvalue 0']
    ];
    const states=[];
    for (const [id,eigen,trace,determinant,discriminant,title] of expected) {
      await chooseExample(id);const state=await labState();
      assert.deepEqual([state.eigen,state.trace,state.determinant,state.discriminant,state.title],[eigen,trace,determinant,discriminant,title],id);
      assert.equal(state.state,'applied');states.push({id,...state});
    }
    await chooseExample('reflection');await screenshot('negative-eigenvalue.png','#experiment-result');
    await chooseExample('projection');assert.match((await labState()).description,/nonzero input maps to zero/);
    await screenshot('zero-eigenvalue.png','#experiment-result');
    return states;
  });
  await check('pending and refused edits retain explicit applied values and actual export', async () => {
    await chooseExample('reflection');const before=await labState();
    await fill('#a11','10');const pendingState=await labState();
    assert.equal(pendingState.state,'pending');assert.equal(pendingState.equation,before.equation);
    await activate('#experiment-form button');const invalidState=await labState();
    assert.equal(invalidState.state,'invalid');assert.equal(invalidState.equation,before.equation);
    assert.match(invalidState.status,/last applied/);
    const artifact=await download('#download-observation','pending-experiment','eigen-directions-experiment.json');
    const data=JSON.parse(await readFile(artifact.path,'utf8'));
    assert.deepEqual(data.matrix,[[1,0],[0,-1]]);assert.deepEqual(data.probe,[0,2]);assert.deepEqual(data.image,[0,-2]);
    assert.equal(data.isEigenvector,true);assert.equal(data.scale.text,'-1');
    const refused=[];
    for (const value of ['', '1.5', '1e0', 'NaN', '-10']) {
      await fill('#a11',value);await activate('#experiment-form button');const state=await labState();
      assert.equal(state.state,'invalid');assert.equal(state.equation,before.equation);refused.push({value,state:state.state});
    }
    await fill('#a11','1');await fill('#probe-y','0');await activate('#experiment-form button');
    assert.match((await labState()).status,/nonzero probe/);assert.equal((await labState()).equation,before.equation);
    await fill('#probe-y','2');await activate('#experiment-form button');
    assert.equal((await labState()).state,'applied');
    return {before,pendingState,invalidState,artifact,exported:data,refused};
  });
  await check('custom oblique probe changes only after explicit application', async () => {
    await chooseExample('oblique');
    await fill('#probe-y','1');
    assert.equal((await labState()).title,'Yes — eigenvalue 1');
    await activate('#experiment-form button');
    const state=await labState();assert.equal(state.title,'Yes — eigenvalue 3');
    assert.match(state.equation,/Av = \(3, 3\)/);assert.match(state.cross,/= 0/);
    return state;
  });
  await check('complex, repeated and irrational cases remain distinct', async () => {
    await chooseExample('shear');const shear=await labState();
    assert.match(shear.summary,/only one eigenline/);assert.equal(shear.eigenLines,1);assert.match(shear.rows[0][0],/repeated twice/);
    await chooseExample('scalar');const scalar=await labState();
    assert.match(scalar.summary,/every real direction/);assert.match(scalar.rows[0][2],/dimension 2/);assert.equal(scalar.eigenLines,6);
    await chooseExample('rotation');const rotation=await labState();
    assert.match(rotation.summary,/No real roots/);assert.equal(rotation.eigenLines,0);assert.match(rotation.rows[0][0],/complex numbers/);
    await chooseExample('irrational');const irrational=await labState();
    assert.equal(irrational.eigen,'no');assert.match(irrational.cross,/= 1/);assert.equal(irrational.rows[0][0],'(1 + √5)/2');
    await screenshot('irrational-eigenlines.png','#experiment-result');
    return {shear,scalar,rotation,irrational};
  });
  await check('keyboard eigenline toggle leaves accepted numeric results intact', async () => {
    await chooseExample('oblique');const before=await labState();
    await focus('#show-lines');await command('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32,nativeVirtualKeyCode:32,text:' '});
    await command('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32,nativeVirtualKeyCode:32});
    assert.equal((await labState()).eigenLines,0);assert.equal((await labState()).equation,before.equation);
    await command('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32,nativeVirtualKeyCode:32,text:' '});
    await command('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32,nativeVirtualKeyCode:32});
    assert.equal((await labState()).eigenLines,2);
    return {equation:before.equation,hiddenLineCount:0,restoredLineCount:2};
  });
  let downloadedCourse;
  await check('actual course and guide downloads preserve every source byte', async () => {
    downloadedCourse=await download('#download-course','original-course','eigen-directions.json',courseBytes);
    const guide=await download('#download-guide','original-guide','eigen-directions.md',guideBytes);
    assert.equal(await evaluate('document.querySelectorAll("a[download]").length'),0);
    return {course:downloadedCourse,guide};
  });
  await check('390px and 320px layouts preserve plot labels and keyboard controls', async () => {
    const observations=[];
    for (const width of [390,320]) {
      await command('Emulation.setDeviceMetricsOverride',{width,height:1050,deviceScaleFactor:1,mobile:false});
      await chooseExample('irrational');
      await waitFor(()=>evaluate('Math.abs(document.querySelector("#vector-plot").clientWidth-document.querySelector("#vector-plot").viewBox.baseVal.width)<1.1'),'responsive SVG coordinates');
      const layout=await evaluate('(()=>{const svg=document.querySelector("#vector-plot"),box=svg.viewBox.baseVal;return {width:innerWidth,bodyWidth:document.documentElement.scrollWidth,viewbox:box.width,clientWidth:svg.clientWidth,minTickPixels:Math.min(...[...svg.querySelectorAll(".tick")].map(n=>parseFloat(getComputedStyle(n).fontSize)*svg.getScreenCTM().a)),labels:[...svg.querySelectorAll("text")].map(n=>({text:n.textContent,x:n.getBBox().x,y:n.getBBox().y,right:n.getBBox().x+n.getBBox().width,bottom:n.getBBox().y+n.getBBox().height})),tableScrollable:document.querySelector(".table-wrap").scrollWidth>document.querySelector(".table-wrap").clientWidth};})()');
      report.lastLayout = layout;
      assert.ok(layout.bodyWidth<=width);assert.ok(layout.minTickPixels>=11.8);
      assert.ok(layout.labels.every(label=>label.x>=-1&&label.y>=-1&&label.right<=layout.viewbox+1&&label.bottom<=layout.viewbox+1));
      await fill('#probe-x','3');await fill('#probe-y','2');await activate('#experiment-form button');
      assert.equal((await labState()).state,'applied');assert.match((await labState()).cross,/= -1/);
      await screenshot('lab-mobile-'+width+'.png','#experiment-result');
      observations.push(layout);
    }
    return observations;
  });
  pagePhase='actual-learner';await navigate(join(project,'demo.html'),'#deck-file');
  await check('actual emitted course enters the unchanged learner preview and start', async () => {
    const {root}=await command('DOM.getDocument');const {nodeId}=await command('DOM.querySelector',{nodeId:root.nodeId,selector:'#deck-file'});
    await command('DOM.setFileInputFiles',{nodeId,files:[downloadedCourse.path]});
    await waitFor(()=>evaluate('!!document.querySelector("#start-deck")'),'actual course preview');
    const preview=await evaluate('({title:document.querySelector("#deck-preview-title").textContent,count:document.querySelector(".deck-preview-count").textContent,prompts:[...document.querySelectorAll("#deck-preview ol strong")].map(n=>n.textContent),attribution:document.querySelector(".deck-preview-attribution").textContent,filename:document.querySelector("#deck-file").files[0].name,fileBytes:document.querySelector("#deck-file").files[0].size})');
    assert.equal(preview.title,course.title);assert.deepEqual(preview.prompts,course.items.map(item=>item.prompt));
    assert.match(preview.count,/14 questions · 4 concepts/);assert.equal(preview.fileBytes,courseBytes.length);assert.equal(preview.filename,'eigen-directions.json');
    assert.ok(preview.attribution.includes(course.attribution));
    await screenshot('learner-preview.png','#deck-preview');
    await activate('#start-deck');await waitFor(()=>evaluate('!!document.querySelector(".question-card h2")'),'first imported question');
    return preview;
  });
  await check('fourteen imported questions reach review and a separate missed-item retry', async () => {
    const answers=[];
    for(let i=0;i<14;i++){
      const prompt=await evaluate('document.querySelector(".question-card h2").textContent');
      const item=course.items.find(candidate=>candidate.prompt===prompt);assert.ok(item);assert.equal(answers.some(answer=>answer.id===item.id),false);
      const chosen=i===0?(item.answer+1)%4:item.answer;
      await activate('[data-choice="'+chosen+'"]');
      const feedback=await evaluate('document.querySelector("#feedback-slot").textContent');
      assert.ok(feedback.includes(item.explanation));assert.ok(feedback.includes(item.transfer));
      answers.push({id:item.id,chosen,correct:chosen===item.answer});await activate('#next-button');
    }
    const before=await evaluate('({summary:document.querySelector("#first-try-summary").textContent,estimates:[...document.querySelectorAll(".mastery-box output")].map(n=>n.textContent),reviewCount:document.querySelectorAll(".review-item").length})');
    assert.match(before.summary,/13 of 14/);assert.equal(before.reviewCount,14);
    const missed=course.items.find(item=>item.id===answers[0].id);
    await activate('#practice-button');assert.equal(await evaluate('document.querySelector(".practice-card h2").textContent'),missed.prompt);
    await activate('[data-practice-choice="'+missed.answer+'"]');await activate('#practice-next');
    const after=await evaluate('({summary:document.querySelector("#first-try-summary").textContent,estimates:[...document.querySelectorAll(".mastery-box output")].map(n=>n.textContent),status:document.querySelector("#practice-status").textContent,reviewCount:document.querySelectorAll(".review-item").length})');
    assert.equal(after.summary,before.summary);assert.deepEqual(after.estimates,before.estimates);assert.match(after.status,/1 of 1 correctly on retry/);
    await screenshot('learner-review.png','.result-card');
    return {answers,before,after};
  });
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
