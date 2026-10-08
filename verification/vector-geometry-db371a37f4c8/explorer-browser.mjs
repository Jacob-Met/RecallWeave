// Real Chromium receiving for the shipped standalone teaching surface.
// CDP transport follows ShadeWindow's existing dependency-free native receiver.
// Node 22+; set RECALLWEAVE_CHROMIUM to the installed Chromium executable.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn, execFileSync } from 'node:child_process';

const root = path.resolve(process.argv[2] ?? fileURLToPath(new URL('../../', import.meta.url)));
const browserPath = process.env.RECALLWEAVE_CHROMIUM ?? 'chromium';
const evidence = process.env.RECALLWEAVE_EVIDENCE_DIR ?? await fs.mkdtemp(path.join(os.tmpdir(), 'recallweave-vectors-evidence-'));
const profileRoot = process.env.RECALLWEAVE_PROFILE_ROOT ?? os.tmpdir();
await fs.mkdir(evidence, { recursive: true });
await fs.mkdir(profileRoot, { recursive: true });
const downloads = await fs.mkdtemp(path.join(evidence, 'downloads-'));
const profile = await fs.mkdtemp(path.join(profileRoot, 'recallweave-vectors-db371a37f4c8-production-'));
const htmlPath = path.join(root, 'courses/vector-geometry-explorer.html');
const coursePath = path.join(root, 'courses/vector-geometry.json');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const html = await fs.readFile(htmlPath), course = await fs.readFile(coursePath);
const sourceSha256 = { 'courses/vector-geometry-explorer.html': hash(html), 'courses/vector-geometry.json': hash(course) };
const requests = [], httpRequests = [], exceptions = [], downloadsBegun = [], downloadsCompleted = [], checks = [];
const server = http.createServer((request, response) => {
  httpRequests.push(request.url);
  if (request.url === '/courses/vector-geometry-explorer.html') {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    response.end(html);
  } else { response.writeHead(404); response.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const httpOrigin = `http://127.0.0.1:${server.address().port}`;
const fileURL = pathToFileURL(htmlPath).href;
let serverClosed = false, browser, socket, receipt, failure, browserVersion;
let nextId = 0;
const pending = new Map();
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function send(method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
}
async function evaluate(sessionId, expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
}
async function until(predicate, description) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await delay(75);
  }
  throw new Error(`Timed out: ${description}`);
}
async function page(url) {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  await send('Network.enable', {}, sessionId);
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false }, sessionId);
  await send('Page.navigate', { url }, sessionId);
  await until(() => evaluate(sessionId, 'Boolean(document.querySelector("#value-p")?.textContent)'), 'initial calculated projection');
  return { targetId, sessionId };
}
async function click(sessionId, selector) {
  const point = await evaluate(sessionId, `(() => {
    const e = document.querySelector(${JSON.stringify(selector)}); e.scrollIntoView({block:'center'});
    const r = e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2};
  })()`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point }, sessionId);
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point }, sessionId);
}
async function key(sessionId, key, code, virtual, modifiers = 0, text) {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: virtual, modifiers, ...(text ? {text} : {}) }, sessionId);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: virtual, modifiers }, sessionId);
}
async function typeValue(sessionId, selector, value) {
  await click(sessionId, selector);
  await key(sessionId, 'a', 'KeyA', 65, 2);
  await key(sessionId, 'Backspace', 'Backspace', 8);
  if (value !== '') await send('Input.insertText', { text: value }, sessionId);
}
async function state(sessionId) {
  return evaluate(sessionId, `(() => ({
    values: ['bx','by','ax','ay'].map(id=>document.getElementById(id).value),
    invalid: [...document.querySelectorAll('input[aria-invalid="true"]')].map(e=>e.id),
    error: document.getElementById('geometry-error').hidden ? null : document.getElementById('geometry-error').textContent,
    resultHidden: document.getElementById('geometry-result').hidden,
    readouts: Object.fromEntries(['b','p','r','dot','aa','check'].map(id=>[id,document.getElementById('value-'+id).textContent])),
    summary: document.getElementById('result-heading').textContent,
    description: document.getElementById('plot-description').textContent,
    lineCount: document.getElementById('geometry-lines').children.length,
    arrows: Object.fromEntries([...document.querySelectorAll('#geometry-lines line[marker-end]')].map(e=>[
      e.getAttribute('marker-end').match(/arrow-(.)/)[1], ['x1','y1','x2','y2'].map(a=>Number(e.getAttribute(a)))])),
    preset: document.querySelector('[data-preset][aria-pressed="true"]')?.dataset.preset ?? null,
    download: document.getElementById('download-status').textContent,
    overflow: document.documentElement.scrollWidth > innerWidth+1,
    active: document.activeElement.id || document.activeElement.dataset.preset || document.activeElement.tagName,
  }))()`);
}
function arrowEquals(actual, from, to) {
  // Independent expected endpoint conversion for the documented +/-9 axes.
  const expected = [from[0] / 18 * 500 + 300, -from[1] / 18 * 500 + 300,
    to[0] / 18 * 500 + 300, -to[1] / 18 * 500 + 300];
  assert.equal(actual.length, expected.length);
  actual.forEach((number, i) => assert.ok(Math.abs(number - expected[i]) < 1e-9));
}
async function screenshot(sessionId, name) {
  await evaluate(sessionId, 'scrollTo(0,0)');
  const { cssContentSize } = await send('Page.getLayoutMetrics', {}, sessionId);
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: cssContentSize.width, height: cssContentSize.height, scale: 1 } }, sessionId);
  await fs.writeFile(path.join(evidence, name), Buffer.from(r.data, 'base64'));
}
async function completedDownload(prior) {
  await until(() => downloadsCompleted.length > prior, 'actual completed JSON download');
  const complete = downloadsCompleted.at(-1);
  const began = downloadsBegun.find(r => r.guid === complete.guid);
  assert.equal(began.suggestedFilename, 'vector-geometry.json');
  const filename = complete.filePath ?? path.join(downloads, complete.guid);
  const bytes = await fs.readFile(filename);
  assert.deepEqual(bytes, course);
  return { guid: complete.guid, suggestedFilename: began.suggestedFilename, bytes: bytes.length, sha256: hash(bytes) };
}

try {
  browserVersion = execFileSync(browserPath, ['--version'], {encoding:'utf8', timeout:45000}).trim();
  browser = spawn(browserPath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--disable-background-networking', '--disable-component-update', '--disable-sync', '--disable-extensions',
    '--password-store=basic', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0',
    `--user-data-dir=${profile}`, 'about:blank'], {stdio:['ignore','ignore','pipe']});
  const endpoint = await new Promise((resolve, reject) => {
    let log = '';
    const timer = setTimeout(() => reject(new Error(`Chromium startup: ${log.slice(-1500)}`)), 45000);
    browser.on('error', error=>{clearTimeout(timer);reject(error)});
    browser.on('exit', code=>{clearTimeout(timer);reject(new Error(`Chromium exited ${code}: ${log.slice(-1500)}`))});
    browser.stderr.on('data', bytes=>{
      log += bytes.toString();
      const found = log.match(/DevTools listening on (ws:\/\/127\.0\.0\.1:[^\s]+)/);
      if (found) { clearTimeout(timer); resolve(found[1]); }
    });
  });
  socket = new WebSocket(endpoint);
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})});
  socket.addEventListener('message', event=>{
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const task = pending.get(message.id); pending.delete(message.id); clearTimeout(task.timer);
      if (message.error) task.reject(new Error(JSON.stringify(message.error))); else task.resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails);
    if (message.method === 'Network.requestWillBeSent') requests.push(message.params.request.url);
    if (message.method === 'Browser.downloadWillBegin') downloadsBegun.push(message.params);
    if (message.method === 'Browser.downloadProgress' && message.params.state === 'completed') downloadsCompleted.push(message.params);
  });
  await send('Browser.setDownloadBehavior', { behavior:'allowAndName', downloadPath:downloads, eventsEnabled:true });
  const served = await page(httpOrigin+'/courses/vector-geometry-explorer.html');
  let s = await state(served.sessionId);
  assert.deepEqual(s.readouts, {b:'(3, 4)',p:'(4, 2)',r:'(-1, 2)',dot:'10',aa:'5',check:'0'});
  arrowEquals(s.arrows.b,[0,0],[3,4]); arrowEquals(s.arrows.p,[0,0],[4,2]); arrowEquals(s.arrows.r,[4,2],[3,4]);
  assert.match(s.description, /positive y upward/);
  assert.equal(s.error, null);
  checks.push('Actual loopback HTTP source calculates the course example and all plotted arrow endpoints match the numeric geometry');
  await screenshot(served.sessionId, 'desktop.png');

  await click(served.sessionId,'[data-preset="same-line"]');
  s = await state(served.sessionId);
  assert.equal(s.readouts.p, '(4, 2)'); assert.equal(s.readouts.r,'(-1, 2)'); assert.equal(s.readouts.aa,'20');
  const labelOverlap = await evaluate(served.sessionId,`(() => {
    const labels = [...document.querySelectorAll('#geometry-lines text')];
    const a=labels.find(e=>e.textContent==='a').getBoundingClientRect(), p=labels.find(e=>e.textContent==='p').getBoundingClientRect();
    return a.left<p.right && a.right>p.left && a.top<p.bottom && a.bottom>p.top;
  })()`);
  assert.equal(labelOverlap, false);
  await key(served.sessionId,'Tab','Tab',9);
  await key(served.sessionId,'Enter','Enter',13,0,'\r');
  s = await state(served.sessionId);
  assert.equal(s.preset,'perpendicular'); assert.equal(s.readouts.p,'(0, 0)'); assert.equal(s.arrows.p,undefined);
  await click(served.sessionId,'[data-preset="along"]');
  s = await state(served.sessionId); assert.equal(s.readouts.r,'(0, 0)'); assert.equal(s.arrows.r,undefined);
  checks.push('Pointer and native Tab/Enter presets show invariant, perpendicular and parallel cases; coincident a/p labels remain separate');

  await click(served.sessionId,'[data-preset="example"]');
  await typeValue(served.sessionId,'#ax','-2'); await typeValue(served.sessionId,'#ay','-1');
  s = await state(served.sessionId); assert.equal(s.readouts.p,'(4, 2)'); assert.equal(s.preset,null);
  await typeValue(served.sessionId,'#bx','0.25');
  s = await state(served.sessionId); assert.equal(s.readouts.b,'(0.25, 4)'); assert.equal(s.error,null);
  assert.equal(await evaluate(served.sessionId,`document.querySelectorAll('input').length===4 && [...document.querySelectorAll('input')].every(e=>e.labels.length===1)`),true);
  checks.push('Native number-field typing updates signed and quarter-step coordinates with an accessible label on every control');

  for (const [selector,value] of [['#bx',''],['#bx','0.1'],['#bx','6.25']]) {
    await typeValue(served.sessionId,selector,value);
    s=await state(served.sessionId);
    assert.equal(s.resultHidden,true); assert.equal(s.lineCount,0); assert.match(s.error,/coordinates/);
    assert.deepEqual(s.invalid,['bx']); assert.match(s.description,/No calculated geometry/);
  }
  await click(served.sessionId,'[data-preset="example"]');
  await typeValue(served.sessionId,'#ax','0'); await typeValue(served.sessionId,'#ay','0');
  s=await state(served.sessionId);
  assert.match(s.error,/direction cannot be/); assert.equal(s.lineCount,0); assert.equal(s.resultHidden,true);
  assert.deepEqual(s.invalid,['ax','ay']);
  await key(served.sessionId,'Tab','Tab',9); await key(served.sessionId,'Enter','Enter',13,0,'\r');
  s=await state(served.sessionId); assert.equal(s.error,null); assert.equal(s.preset,'example'); assert.equal(s.resultHidden,false);
  checks.push('Empty, off-step, out-of-range and zero-direction input clears stale geometry, identifies invalid fields and recovers by keyboard');

  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false},served.sessionId);
  await click(served.sessionId,'[data-preset="same-line"]');
  assert.equal((await state(served.sessionId)).overflow,false);
  const controlRects=await evaluate(served.sessionId,`[...document.querySelectorAll('input,.preset,#download-course')].map(e=>{
    const r=e.getBoundingClientRect(); return {x:r.x,right:r.right,width:r.width,height:r.height};})`);
  assert.ok(controlRects.every(r=>r.x>=0 && r.right<=390 && r.width>=44 && r.height>=44));
  await screenshot(served.sessionId,'mobile.png');
  checks.push('390px layout fits all controls and numeric evidence with no document overflow; interactive controls remain at least 44px');

  await send('Target.closeTarget',{targetId:served.targetId});
  server.closeAllConnections(); await new Promise(resolve=>server.close(resolve)); serverClosed=true;
  const offline=await page(fileURL);
  s=await state(offline.sessionId); assert.equal(s.readouts.p,'(4, 2)');
  assert.equal(await evaluate(offline.sessionId,'location.protocol'),'file:');
  await typeValue(offline.sessionId,'#by','-4');
  assert.equal((await state(offline.sessionId)).readouts.b,'(3, -4)');
  const beforeDownload=downloadsCompleted.length;
  await click(offline.sessionId,'#download-course');
  const firstDownload=await completedDownload(beforeDownload);
  assert.match((await state(offline.sessionId)).download,/Course file prepared/);
  checks.push('Fresh direct-file opening works after its HTTP server is stopped; actual downloaded JSON bytes equal the frozen twelve-item course');

  await evaluate(offline.sessionId,`window.savedCreateObjectURL=URL.createObjectURL; URL.createObjectURL=()=>{throw new Error('intentional allocation failure')}`);
  const beforeFailure=await state(offline.sessionId);
  await click(offline.sessionId,'#download-course');
  s=await state(offline.sessionId); assert.match(s.download,/could not be prepared/); assert.deepEqual(s.readouts,beforeFailure.readouts);
  await evaluate(offline.sessionId,'URL.createObjectURL=window.savedCreateObjectURL; delete window.savedCreateObjectURL');
  const priorRetry=downloadsCompleted.length;
  await key(offline.sessionId,'Enter','Enter',13,0,'\r');
  const retryDownload=await completedDownload(priorRetry);
  checks.push('A refused Blob allocation leaves the learner geometry unchanged and native keyboard retry completes the exact course download');

  assert.deepEqual(exceptions,[]);
  assert.ok(requests.every(url=>url===fileURL || url.startsWith(httpOrigin+'/') || url.startsWith('blob:')));
  assert.deepEqual(await fs.readFile(htmlPath),html); assert.deepEqual(await fs.readFile(coursePath),course);
  checks.push('No uncaught page exception or external page request; source HTML and course remain byte-identical');
  receipt={status:'pass',node:process.version,browser:browserVersion,actualBrowser:true,
    serving:['real isolated loopback HTTP','fresh file:// page after HTTP server stopped'],
    viewports:[[1280,1000],[390,844]],sourceSha256,checks,requests,httpRequests,
    downloads:[firstDownload,retryDownload],learningEfficacyClaimed:false,importerWorkflowTested:false};
} catch(error) {
  failure=error;
  receipt={status:'fail',node:process.version,browser:browserVersion,sourceSha256,checks,requests,httpRequests,
    error:{message:error.message,stack:error.stack},exceptions};
} finally {
  if(socket?.readyState===WebSocket.OPEN) await Promise.race([send('Browser.close').catch(()=>{}),delay(3000)]);
  socket?.close();
  if(browser && browser.exitCode===null){browser.kill('SIGTERM');await Promise.race([new Promise(resolve=>browser.once('exit',resolve)),delay(4000)]);if(browser.exitCode===null)browser.kill('SIGKILL')}
  if(!serverClosed){server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
  await fs.rm(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});
  for(const task of pending.values())clearTimeout(task.timer);
}
await fs.writeFile(path.join(evidence,'explorer-browser-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt,null,2));
if(failure) throw failure;
