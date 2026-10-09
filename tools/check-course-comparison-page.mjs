#!/usr/bin/env node
// Actual course-comparison page receiving. CDP transport is adapted from the maintained handout receiver.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, mkdtemp, realpath } from 'node:fs/promises';
import { join, resolve, relative, isAbsolute, extname, basename } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import {
  parsePinnedManifest, admitSources, admitRuntime, assertBrowserVersion, resourceSnapshot,
  assertResources, awaitWebSocketOpen, observeChild, finishBrowser, removeOwnedProfile, hashFile
} from './course-comparison-receiving.mjs';
const args = process.argv.slice(2);
const option = name => { const i = args.indexOf(name); assert.ok(i >= 0 && args[i + 1], name); return args[i + 1]; };
const project = resolve(option('--root')), executable = option('--browser'), output = resolve(option('--output'));
const manifestBytes = await readFile(option('--manifest'));
const manifestSHA256 = option('--manifest-sha256'), offeredOwnerGitBlob = option('--owner-git-blob');
const expected = parsePinnedManifest(manifestBytes, manifestSHA256);
const hash = x => createHash('sha256').update(x).digest('hex');
const sourceBefore = await admitSources(project, expected, offeredOwnerGitBlob);
const sourcePaths = Object.keys(sourceBefore);
const runtimeBefore = await admitRuntime(executable, expected.runtime);
assert.equal(await realpath(fileURLToPath(import.meta.url)), await realpath(join(project, 'tools/check-course-comparison-page.mjs')), 'Execute the admitted maintained receiver');
const { compareCourses } = await import(pathToFileURL(join(project, 'src/course-comparison.mjs')).href);
await mkdir(output);
const downloadPath = join(output, 'downloads'); await mkdir(downloadPath);
let profile, childObservation;
const receiverPath = fileURLToPath(import.meta.url), receiverBefore = await hashFile(receiverPath);
const report = {
  format: 'recallweave180-author-browser/1', status: 'running', node: process.version,
  sourceSha256: sourceBefore, owner177: expected.owner177, manifestSHA256, offeredOwnerGitBlob, runtimeBefore, receiverSha256: receiverBefore,
  checks: [], artifacts: [],
  boundary: 'Uses the real owner177 comparator unchanged. The author checks consumer capture and UI; independent semantic receiving is separate.',
  faultInjection: 'Named actual File.arrayBuffer reads can be delayed/rejected; createObjectURL can refuse one download. No product state is accessed.'
};

const before = {
  "title": "A short activity <literal> 日本語",
  "attribution": "Original receiving fixture\nTeacher & group",
  "license": "Synthetic test content; retain this credit.",
  "concepts": [
    "First concept",
    "Second concept",
    "Unselected concept"
  ],
  "items": [
    {
      "id": "q-first",
      "concept": "First concept",
      "prerequisites": [],
      "prompt": "FIRST_PUBLIC_PROMPT",
      "options": [
        "A first",
        "B first"
      ],
      "answer": 1,
      "explanation": "FIRST_PRIVATE_EXPLANATION",
      "transfer": "FIRST_TRANSFER"
    },
    {
      "id": " q spaced ",
      "concept": "Second concept",
      "prerequisites": [
        "First concept"
      ],
      "prompt": "SECOND_PUBLIC_PROMPT <script>literal</script>\nNew line",
      "options": [
        "A second",
        "B second",
        "C second"
      ],
      "answer": 2,
      "explanation": "SECOND_PRIVATE_EXPLANATION",
      "transfer": "SECOND_TRANSFER"
    },
    {
      "id": "__proto__",
      "concept": "First concept",
      "prerequisites": [],
      "prompt": "THIRD_PUBLIC_PROMPT",
      "options": [
        "A third",
        "B third"
      ],
      "answer": 0,
      "explanation": "THIRD_PRIVATE_EXPLANATION",
      "transfer": "THIRD_TRANSFER"
    },
    {
      "id": "constructor",
      "concept": "Unselected concept",
      "prerequisites": [],
      "prompt": "FOURTH_EXCLUDED_PROMPT",
      "options": [
        "FOURTH_EXCLUDED_OPTION_A",
        "FOURTH_EXCLUDED_OPTION_B"
      ],
      "answer": 1,
      "explanation": "FOURTH_PRIVATE_EXPLANATION",
      "transfer": "FOURTH_EXCLUDED_TRANSFER"
    }
  ]
};
const after = structuredClone(before);
after.title = 'Revised lesson <literal> 日本語';
after.attribution = 'Revised author\nExact source';
after.license = 'Revised permission';
after.concepts.reverse();
after.items = [after.items[2], after.items[1], after.items[3]];
after.items[0].options[0] = 'REVISED_CORRECT_TEXT';
after.items[1].options = ['C second', 'A second', 'B second'];
after.items[1].answer = 0;
after.items[2].id = 'renamed fourth';
const beforeRaw = Buffer.from(JSON.stringify(before, null, 2) + '\n');
const afterRaw = Buffer.from(JSON.stringify(after, null, 2) + '\n');
const beforePath = join(output, 'earlier 日本語.json'), afterPath = join(output, 'revised lesson 日本語.json');
const slowPath = join(output, 'slow-replacement.json'), invalidPath = join(output, 'invalid.json'), hugePath = join(output, 'oversize.json'), prettyPath = join(output, 'same-content-different-bytes.json');
await writeFile(beforePath, beforeRaw); await writeFile(afterPath, afterRaw);
await writeFile(slowPath, beforeRaw); await writeFile(invalidPath, '{"title":}');
await writeFile(hugePath, Buffer.alloc(262145, 32));
await writeFile(prettyPath, JSON.stringify({ ...before, ignoredExtension: 'ignored by native validator' }));
const expectedReport = (a, b, aRaw, bRaw) => ({
  format: 'recallweave-course-comparison-browser/1',
  files: { before: { name: basename(a), bytes: aRaw.length, sha256: hash(aRaw) }, after: { name: basename(b), bytes: bRaw.length, sha256: hash(bRaw) } },
  sameBytes: aRaw.equals(bRaw), comparison: compareCourses(aRaw.toString('utf8'), bRaw.toString('utf8'))
});
const downloads = new Map(), chooserEvents = [], pageErrors = [], allRequests = [];
let pageRequests = [], browser, socket, sessionId, browserLog = '', sequence = 0;
const pending = new Map(), sleep = ms => new Promise(r => setTimeout(r, ms));
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = resolve(project, '.' + pathname), rel = relative(project, file);
    if (rel.startsWith('..') || isAbsolute(rel)) { res.writeHead(403).end(); return; }
    const content = await readFile(file), mime = { '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css' }[extname(file)] ?? 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime + '; charset=utf-8' }).end(content);
  } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + server.address().port;
const passed = name => { report.checks.push(name); console.log('PASS ' + name); };
async function waitFor(check, label, attempts = 120) {
  let lastError;
  for (let step = 0; step < attempts; step++) {
    try { if (await check()) return; } catch (error) { lastError = error; }
    await sleep(100);
  }
  throw new Error('Timed out: ' + label + (lastError ? ' (' + lastError.message + ')' : ''));
}
function command(method, params = {}, scoped = true) {
  const id = ++sequence;
  return new Promise((resolve_, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id); reject(new Error('CDP timeout: ' + method));
    }, 15000);
    pending.set(id, {resolve: resolve_, reject, timer});
    socket.send(JSON.stringify({id, method, params, ...(scoped && sessionId ? {sessionId} : {})}));
  });
}
async function evaluate(expression) {
  const result = await command('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true});
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description
    ?? result.exceptionDetails.text);
  return result.result.value;
}
async function key(key_, code, virtualKey, modifiers = 0) {
  for (const type of ['keyDown', 'keyUp']) {
    await command('Input.dispatchKeyEvent', {type, key: key_, code,
      windowsVirtualKeyCode: virtualKey, nativeVirtualKeyCode: virtualKey, modifiers,
      ...(key_ === 'Enter' && type === 'keyDown' ? {text: '\r', unmodifiedText: '\r'} : {})});
  }
}
async function activate(selector) {
  const exists = await evaluate('(() => { const node = document.querySelector(' +
    JSON.stringify(selector) + '); if (!node || node.matches(":disabled") || !node.getClientRects().length) return false; ' +
    'node.scrollIntoView({block:"center"}); node.focus(); return true; })()');
  assert.ok(exists, 'Available keyboard control: ' + selector);
  await key('Enter', 'Enter', 13);
}
async function click(selector) {
  const box = await evaluate('(() => { const node = document.querySelector(' +
    JSON.stringify(selector) + '); if (!node || node.matches(":disabled")) return null; ' +
    'node.scrollIntoView({block:"center"}); const b = node.getBoundingClientRect(); ' +
    'return {x:b.x+b.width/2,y:b.y+b.height/2,width:b.width,height:b.height}; })()');
  assert.ok(box && box.width > 0 && box.height > 0, 'Visible pointer control: ' + selector);
  for (const type of ['mousePressed', 'mouseReleased']) {
    await command('Input.dispatchMouseEvent', {type, x: box.x, y: box.y,
      button: 'left', clickCount: 1});
  }
}
async function textInput(selector, value) {
  await evaluate('(() => {const node=document.querySelector(' + JSON.stringify(selector) +
    '); if(!node) throw new Error("Missing input"); node.scrollIntoView({block:"center"}); node.focus();})()');
  await key('a', 'KeyA', 65, 2);
  await command('Input.insertText', {text: value});
  assert.equal(await evaluate('document.querySelector(' + JSON.stringify(selector) + ').value'), value);
}
async function navigate(url, readySelector, width = 1280, height = 1000) {
  await command('Emulation.setEmulatedMedia', {media: ''});
  await command('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: false});
  pageRequests = [];
  await command('Page.navigate', {url});
  await waitFor(() => evaluate('document.URL === ' + JSON.stringify(url) +
    ' && document.readyState === "complete" && !!document.querySelector(' +
    JSON.stringify(readySelector) + ')'), 'actual page ' + url);
}
async function saveArtifact(name, bytes, details = {}) {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  assert.ok(buffer.length <= 2 * 1024 * 1024, 'Bounded artifact: ' + name);
  await writeFile(join(output, name), buffer);
  const value = {name, bytes: buffer.length, sha256: hash(buffer), ...details};
  report.artifacts.push(value);
  return value;
}
async function screenshot(name, selector = null) {
  if (selector) await evaluate('document.querySelector(' + JSON.stringify(selector) +
    ').scrollIntoView({block:"start"})');
  const {data} = await command('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false});
  return saveArtifact(name, Buffer.from(data, 'base64'), {kind: 'actual Chrome screenshot'});
}
async function downloaded(button, name) {
  const prior = new Set(downloads.keys());
  await activate(button);
  let actual;
  await waitFor(() => {
    actual = [...downloads.values()].find(value => !prior.has(value.guid) && value.state === 'completed');
    return !!actual;
  }, 'actual download ' + name);
  const bytes = await readFile(join(downloadPath, actual.guid));
  await saveArtifact(name, bytes, {kind: 'actual browser download',
    suggestedFilename: actual.suggestedFilename});
  return {bytes, file: join(output, name), suggestedFilename: actual.suggestedFilename};
}

async function chooseFile(role, file) {
  const count = chooserEvents.length;
  await activate('#choose-' + role);
  await waitFor(() => chooserEvents.length > count, 'actual ' + role + ' file chooser');
  const event = chooserEvents.at(-1); assert.equal(event.mode, 'selectSingle');
  let identity = { backendNodeId: event.backendNodeId };
  if (!event.backendNodeId) {
    const { root } = await command('DOM.getDocument');
    const { nodeId } = await command('DOM.querySelector', { nodeId: root.nodeId, selector: '#file-' + role });
    identity = { nodeId };
  }
  const { node } = await command('DOM.describeNode', identity);
  const attr = Object.fromEntries(Array.from({ length: node.attributes.length / 2 }, (_, i) => node.attributes.slice(i * 2, i * 2 + 2)));
  assert.equal(attr.id, 'file-' + role); assert.equal(attr.type, 'file');
  await command('DOM.setFileInputFiles', { files: file ? [file] : [], ...identity });
}
async function loaded(role, path) {
  await chooseFile(role, path);
  await waitFor(() => evaluate('document.querySelector("#details-' + role + ' .filename")?.textContent === ' + JSON.stringify(basename(path)) + ' && !document.querySelector("#details-' + role + ' .loading")'), 'accepted ' + role);
}
async function reportVisible(value) {
  assert.equal(await evaluate('document.querySelector("#comparison-result").hidden'), !value);
  assert.equal(await evaluate('document.querySelector("#download-comparison").disabled'), !value);
}
async function noOverflow() {
  const result = await evaluate('({width:innerWidth,body:document.documentElement.scrollWidth,over:[...document.querySelectorAll("button,.file-card,.question-change,.question-record")].filter(n=>n.getClientRects().length&&n.getBoundingClientRect().right>innerWidth+1).map(n=>n.tagName+"#"+n.id)})');
  assert.ok(result.body <= result.width + 1, JSON.stringify(result)); assert.deepEqual(result.over, []);
}
async function holdRead(path) {
  await evaluate('(() => { const original=File.prototype.arrayBuffer; const state=window.__comparisonRead={original,pending:false,release:null,calls:[]}; File.prototype.arrayBuffer=function(){state.calls.push(this.name);const actual=original.call(this);if(this.name!==' + JSON.stringify(basename(path)) + ')return actual;state.pending=true;return new Promise((resolve,reject)=>{state.release=async(mode)=>{const bytes=await actual;state.pending=false;if(mode==="reject")reject(new Error("Author receiving read refusal"));else resolve(bytes);};});};})()');
}
async function releaseRead(mode = 'resolve') {
  await evaluate('window.__comparisonRead.release(' + JSON.stringify(mode) + ')');
  await evaluate('File.prototype.arrayBuffer=window.__comparisonRead.original');
  await sleep(100);
}
async function compareLoaded() {
  await activate('#compare-courses');
  await waitFor(() => evaluate('!document.querySelector("#comparison-result").hidden'), 'explicit comparison');
  assert.equal(await evaluate('document.activeElement.id'), 'comparison-heading');
}
try {
  assert.ok(typeof WebSocket === 'function', 'Use Node 22 or newer with built-in WebSocket');
  report.resourceAdmission = await resourceSnapshot(output);
  assertResources(report.resourceAdmission);
  profile = await mkdtemp(join(output, 'profile-'));
  report.preLaunchResources = await resourceSnapshot(output);
  assertResources(report.preLaunchResources);
  browser = spawn(runtimeBefore.chrome.path, [
    '--headless=new', '--disable-gpu', '--disable-dev-shm-usage',
    '--disable-background-networking', '--disable-component-update', '--disable-sync',
    '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0',
    '--user-data-dir=' + profile, 'about:blank'
  ], {stdio: ['ignore', 'ignore', 'pipe']});
  childObservation = observeChild(browser);
  let launchError;
  browser.on('error', error => { launchError = error; });
  browser.stderr.on('data', data => { browserLog = (browserLog + data).slice(-6000); });
  let port;
  let endpoint;
  await waitFor(async () => {
    if (launchError) throw launchError;
    if (browser.exitCode !== null) throw new Error('Browser exited: ' + browserLog);
    [port, endpoint] = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).trim().split('\n');
    return !!(port && endpoint);
  }, 'installed browser startup');
  socket = new WebSocket('ws://127.0.0.1:' + port + endpoint);
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      clearTimeout(request.timer);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result);
    } else if (message.method === 'Browser.downloadWillBegin' ||
               message.method === 'Browser.downloadProgress') {
      const value = message.params;
      downloads.set(value.guid, {...downloads.get(value.guid), ...value});
    } else if (message.method === 'Page.fileChooserOpened') {
      chooserEvents.push(message.params);
    } else if (message.method === 'Runtime.exceptionThrown') {
      pageErrors.push(message.params.exceptionDetails.exception?.description
        ?? message.params.exceptionDetails.text);
    } else if (message.method === 'Network.requestWillBeSent') {
      pageRequests.push(message.params.request.url); allRequests.push(message.params.request.url);
    }
  });
  await awaitWebSocketOpen(socket);
  report.browser = await command('Browser.getVersion', {}, false);
  assertBrowserVersion(report.browser.product, runtimeBefore);
  await command('Browser.setDownloadBehavior', {behavior: 'allowAndName', downloadPath, eventsEnabled: true}, false);
  const {targetId} = await command('Target.createTarget', {url: 'about:blank'}, false);
  ({sessionId} = await command('Target.attachToTarget', {targetId, flatten: true}, false));
  await command('Page.enable');
  await command('Runtime.enable');
  await command('Network.enable');
  await command('Page.setInterceptFileChooserDialog', {enabled: true});


  for (const [mode,url,width,height] of [
    ['modular',base+'/course-compare/index.html',1280,960],
    ['standalone',pathToFileURL(join(project,'course-compare.html')).href,390,844]
  ]) {
    await navigate(url,'#choose-before',width,height);
    assert.equal(await evaluate('document.querySelector("#compare-courses").disabled'),true);
    await reportVisible(false);
    await loaded('before',beforePath); assert.equal(await evaluate('document.querySelector("#compare-courses").disabled'),true);
    await loaded('after',afterPath); await compareLoaded();
    const summary=await evaluate('document.querySelector("#comparison-content").innerText');
    for(const text of ['Revised lesson','Earlier questions','Revised questions','Added questions','Removed questions'])assert.ok(summary.includes(text),text);
    const detailSelectors=await evaluate('[...document.querySelectorAll(".question-change>summary")].map((n,i)=>({i,text:n.textContent}))');
    assert.ok(detailSelectors.some(x=>x.text.includes('" q spaced "')));
    for(let i=0;i<detailSelectors.length;i++) {
      assert.ok(await evaluate('(()=>{const n=document.querySelectorAll(".question-change>summary")['+i+'];if(!n||!n.getClientRects().length)return false;n.scrollIntoView({block:"center"});n.focus();return document.activeElement===n;})()'));
      await key('Enter','Enter',13);
    }
    const text=await evaluate('document.querySelector("#comparison-content").innerText');
    for(const value of ['Correct-answer position changed','Correct-option text retained','Correct-option text changed','REVISED_CORRECT_TEXT','SECOND_PUBLIC_PROMPT <script>literal</script>','renamed fourth'])assert.ok(text.includes(value),value);
    assert.equal(await evaluate('document.querySelectorAll("#comparison-content script,#comparison-content iframe").length'),0);
    const copy=await downloaded('#download-comparison',mode+'-comparison.json');
    assert.deepEqual(JSON.parse(copy.bytes.toString('utf8')),expectedReport(beforePath,afterPath,beforeRaw,afterRaw));
    assert.equal(copy.bytes.toString('utf8'),JSON.stringify(expectedReport(beforePath,afterPath,beforeRaw,afterRaw),null,2)+'\n');
    await noOverflow(); await screenshot(mode+'-comparison.png','#comparison-heading');
    passed(mode+': actual local choices, explicit comparison, literal fields, exact captured download and narrow layout');
    await chooseFile('before',null); await reportVisible(true);
    await chooseFile('before',invalidPath);
    await waitFor(()=>evaluate('!document.querySelector("#error-before").hidden'),'invalid replacement refusal');
    await reportVisible(false);
    assert.equal(await evaluate('document.querySelector("#details-before .filename").textContent'),basename(beforePath));
    await compareLoaded();
    const retained=await downloaded('#download-comparison',mode+'-after-refusal.json');
    assert.deepEqual(retained.bytes,copy.bytes);
    passed(mode+': chooser cancellation preserves report; invalid replacement retains accepted copy but requires explicit comparison');
    await holdRead(slowPath); await chooseFile('before',slowPath);
    await waitFor(()=>evaluate('window.__comparisonRead.pending'),'held actual file read');
    await reportVisible(false); assert.equal(await evaluate('document.querySelector("#compare-courses").disabled'),true);
    await loaded('before',beforePath); await compareLoaded();
    await releaseRead(); await reportVisible(true);
    assert.equal(await evaluate('document.querySelector("#details-before .filename").textContent'),basename(beforePath));
    await holdRead(slowPath); await chooseFile('after',slowPath);
    await waitFor(()=>evaluate('window.__comparisonRead.pending'),'held revised read');
    await activate('#clear-after');
    assert.equal(await evaluate('document.activeElement.id'),'choose-after');
    await releaseRead();
    await reportVisible(false); assert.equal(await evaluate('document.querySelector("#compare-courses").disabled'),true);
    assert.equal(await evaluate('document.querySelector("#details-after .filename")'),null);
    await loaded('after',afterPath); await compareLoaded();
    passed(mode+': newer same-role capture and keyboard Clear retire obsolete reads without restoring stale report');
    await holdRead(slowPath); await chooseFile('before',hugePath);
    await waitFor(()=>evaluate('!document.querySelector("#error-before").hidden'),'oversize refusal');
    assert.deepEqual(await evaluate('window.__comparisonRead.calls'),[]);
    await evaluate('File.prototype.arrayBuffer=window.__comparisonRead.original');
    await reportVisible(false);
    await compareLoaded();
    await evaluate('window.__originalCreateURL=URL.createObjectURL;URL.createObjectURL=()=>{throw new Error("Author download refusal")};');
    await activate('#download-comparison');
    assert.ok((await evaluate('document.querySelector("#comparison-status").textContent')).includes('retained'));
    await reportVisible(true);
    await evaluate('URL.createObjectURL=window.__originalCreateURL');
    const retry=await downloaded('#download-comparison',mode+'-download-retry.json');
    assert.deepEqual(retry.bytes,copy.bytes);
    passed(mode+': pre-read raw-size refusal and real download preparation refusal retain exact retry state');
    await loaded('after',beforePath); await compareLoaded();
    let reportCopy=await downloaded('#download-comparison',mode+'-identical.json');
    assert.equal(JSON.parse(reportCopy.bytes).sameBytes,true);
    assert.equal(JSON.parse(reportCopy.bytes).comparison.sameContent,true);
    await loaded('after',prettyPath); await compareLoaded();
    reportCopy=await downloaded('#download-comparison',mode+'-same-content.json');
    assert.equal(JSON.parse(reportCopy.bytes).sameBytes,false);
    assert.equal(JSON.parse(reportCopy.bytes).comparison.sameContent,true);
    await noOverflow(); await screenshot(mode+'-files.png','#intake-heading');
    if(mode==='standalone')assert.ok(pageRequests.every(x=>x.startsWith('file:')||x.startsWith('blob:')));
    passed(mode+': raw-byte versus admitted-content identity remains separate in actual saved reports');
  }
  assert.deepEqual(pageErrors,[]);
  assert.ok(allRequests.every(u=>u.startsWith(base+'/')||u.startsWith('file:')||u.startsWith('blob:')));
  report.status='checks-passed';
}catch(error){
 report.status='failed';report.error=error.stack??String(error);report.browserLog=browserLog;process.exitCode=1;
 try{report.lastPage=await evaluate('({url:location.href,focus:document.activeElement?.outerHTML,text:document.body?.innerText.slice(0,6000)})');await screenshot('failure.png');}catch{}
 console.error(report.error);
}finally{
 report.cleanupErrors=[];
 const cleanupFailure=error=>{report.cleanupErrors.push(error.stack??String(error));};
 try {
   report.browserClosure=await finishBrowser(browser,childObservation,()=>{
     if(socket?.readyState!==WebSocket.OPEN)throw new Error('No open control socket for requested shutdown');
     return command('Browser.close',{},false);
   });
   if(browser&&!report.browserClosure.ok)cleanupFailure(new Error('Browser did not complete an unforced requested zero-exit shutdown'));
 }catch(error){cleanupFailure(error);}
 socket?.close();for(const p of pending.values())clearTimeout(p.timer);
 try {
   server.closeAllConnections();
   await new Promise((resolve_,reject)=>{
     const timer=setTimeout(()=>reject(new Error('Local server close timed out')),3000);
     server.close(error=>{clearTimeout(timer);error?reject(error):resolve_();});
   });
   report.serverClosed=!server.listening;
 }catch(error){report.serverClosed=false;cleanupFailure(error);}
 report.profileCreated=Boolean(profile);report.profileRemoved=null;
 if(profile&&(!browser||report.browserClosure?.closed)){
   try{report.profileRemoved=await removeOwnedProfile(profile,output);if(!report.profileRemoved)throw new Error('Owned profile still exists');}
   catch(error){report.profileRemoved=false;cleanupFailure(error);}
 }else if(profile){report.profileRemoved=false;cleanupFailure(new Error('Profile retained because child closure is unconfirmed'));}
 try {
   const after=await admitSources(project,expected,offeredOwnerGitBlob);
   report.sourceUnchanged=JSON.stringify(sourceBefore)===JSON.stringify(after);
   report.runtimeAfter=await admitRuntime(executable,expected.runtime);
   report.runtimeUnchanged=JSON.stringify(report.runtimeAfter)===JSON.stringify(runtimeBefore);
   report.receiverUnchanged=receiverBefore===await hashFile(receiverPath);
 }catch(error){cleanupFailure(error);}
 report.pageErrors=pageErrors;report.requests=allRequests;report.fileChoosers=chooserEvents.length;
 report.browserExit=report.browserClosure?.code??null;report.browserSignal=report.browserClosure?.signal??null;
 const accepted=report.status==='checks-passed'&&report.checks.length===10&&
   report.browserClosure?.ok&&report.profileRemoved===true&&report.serverClosed&&
   report.sourceUnchanged&&report.runtimeUnchanged&&report.receiverUnchanged&&report.cleanupErrors.length===0;
 report.status=accepted?'passed':'failed';if(!accepted)process.exitCode=1;
 if(browser&&!report.browserClosure?.closed){
   report.unconfirmedOwnedProcess={pid:browser.pid??null,exitCode:browser.exitCode,signalCode:browser.signalCode};
   browser.stderr?.destroy();browser.unref();
 }
 await writeFile(join(output,'receiving.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({status:report.status,checks:report.checks.length,artifacts:report.artifacts.length,sourceUnchanged:report.sourceUnchanged,browserClosure:report.browserClosure,profileRemoved:report.profileRemoved,cleanupErrors:report.cleanupErrors.length}));
}
