#!/usr/bin/env node
// Bounded native Chrome/CDP receiving for the standalone minimum-spanning-forest companion.
// No dependencies, provider access, learner state, or existing browser profile.
// Usage: node tools/check-minimum-spanning-forest.mjs --output-dir /absolute/new-dir
//        [--chrome /path/to/chrome] [--freeze /path/to/source-freeze.json]
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { readFile, writeFile, mkdir, mkdtemp, rm, rename, statfs } from 'node:fs/promises';
import { dirname, resolve, join, isAbsolute, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { once } from 'node:events';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ownFile = fileURLToPath(import.meta.url);
const args = process.argv.slice(2);
const options = {};
for (let i = 0; i < args.length; i += 2) {
  if (!['--output-dir', '--chrome', '--freeze', '--profile-parent'].includes(args[i]) || !args[i + 1])
    throw new Error('Use --output-dir /absolute/new-dir [--chrome /path] [--freeze /path] [--profile-parent /absolute/parent].');
  if (options[args[i]]) throw new Error('Duplicate option: ' + args[i]);
  options[args[i]] = args[i + 1];
}
if (!options['--output-dir'] || !isAbsolute(options['--output-dir']))
  throw new Error('--output-dir must be an absolute, new directory outside the source tree.');
const output = resolve(options['--output-dir']);
if (output === root || output.startsWith(root + sep))
  throw new Error('Browser evidence belongs outside the source tree.');
const chromePath = options['--chrome'] || process.env.CHROME ||
  (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : '/snap/bin/chromium');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const gitBlob = bytes => createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const trackedPaths = [
  "src/minimum-spanning-forest.mjs",
  "src/minimum-spanning-forest-ui.mjs",
  "courses/minimum-spanning-forest.json",
  "courses/minimum-spanning-forest.md",
  "courses/minimum-spanning-forest-explorer.template.html",
  "courses/minimum-spanning-forest-explorer.html",
  "tools/build-minimum-spanning-forest.mjs"
];
async function snapshot() {
  return Promise.all(trackedPaths.map(async path => {
    const bytes = await readFile(join(root, path));
    return { path, bytes: bytes.length, sha256: sha(bytes), git_blob: gitBlob(bytes) };
  }));
}
async function command(file, argv) {
  const child = spawn(file, argv, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  const stdout = [], stderr = [];
  child.stdout.on('data', x => stdout.push(x));
  child.stderr.on('data', x => stderr.push(x));
  const [code, signal] = await once(child, 'close');
  return { code, signal, stdout: Buffer.concat(stdout).toString(), stderr: Buffer.concat(stderr).toString() };
}
const report = {
  schema: 'recallweave.minimum-spanning-forest-browser-receiving/1',
  started_at: new Date().toISOString(),
  source_root: root,
  entry: pathToFileURL(join(root, 'courses/minimum-spanning-forest-explorer.html')).href,
  driver: { path: ownFile, sha256: sha(await readFile(ownFile)) },
  runtime: { node: process.version, platform: process.platform, arch: process.arch, chrome_path: chromePath },
  scope: 'Actual isolated native Chrome on the direct standalone file; mouse/keyboard input, DOM semantics and actual saved files. No learner/importer execution or repetition of helper mathematics.',
  checks: [], assertions: 0, downloads: [], screenshots: [],
  network_requests: [], network_failures: [], page_errors: [],
  instrumentation: 'Read-only DOM inspection; CDP native input. One-shot in-page URL/anchor failures are synthetic receiver controls and never modify source files.',
  cleanup: {}
};
let cdp, session, browser, profile, downloadDir, browserClosed = false, stderrStream, stdoutStream;
let activeCheck;
function check(ok, message, detail) {
  report.assertions++;
  if (!ok) throw new Error(message + (detail === undefined ? '' : '\n' + JSON.stringify(detail)));
}
async function group(name, fn) {
  const item = { name, started_at: new Date().toISOString(), assertions_before: report.assertions };
  activeCheck = item;
  try {
    item.observed = await fn();
    item.status = 'PASS';
  } catch (error) {
    item.status = 'FAIL';
    item.error = error.stack || String(error);
    throw error;
  } finally {
    item.assertions = report.assertions - item.assertions_before;
    delete item.assertions_before;
    item.completed_at = new Date().toISOString();
    report.checks.push(item);
    activeCheck = undefined;
  }
}
async function until(fn, label, timeout = 10000) {
  const deadline = Date.now() + timeout;
  let value;
  while (Date.now() < deadline) {
    value = await fn();
    if (value) return value;
    await delay(40);
  }
  throw new Error('Timed out: ' + label + (value === undefined ? '' : '; last=' + JSON.stringify(value)));
}
class CDP {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 0;
    this.pending = new Map();
    this.events = [];
    socket.addEventListener('message', event => {
      const data = JSON.parse(event.data);
      if (data.id) {
        const pending = this.pending.get(data.id);
        if (!pending) return;
        clearTimeout(pending.timer);
        this.pending.delete(data.id);
        if (data.error) pending.reject(new Error(pending.method + ': ' + JSON.stringify(data.error)));
        else pending.resolve(data.result);
      } else {
        this.events.push(data);
        if (data.method === 'Network.requestWillBeSent') report.network_requests.push({
          url: data.params.request.url, type: data.params.type, method: data.params.request.method
        });
        if (data.method === 'Network.loadingFailed') report.network_failures.push(data.params);
        if (data.method === 'Runtime.exceptionThrown') report.page_errors.push(data.params.exceptionDetails);
      }
    });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('CDP timeout: ' + method));
      }, 10000);
      this.pending.set(id, { resolve, reject, timer, method });
      this.socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
}
const page = (method, params) => cdp.send(method, params, session);
async function evaluate(expression) {
  const result = await page('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error('Browser evaluation: ' + JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function key(key, code, keyCode, extra = {}) {
  // Native form/button activation needs the character event as well as key identity.
  const character = key === 'Enter' ? { text: '\r', unmodifiedText: '\r' }
    : key === ' ' ? { text: ' ', unmodifiedText: ' ' } : {};
  await page('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: keyCode, ...character, ...extra });
  await page('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: keyCode, ...extra });
}
async function click(selector) {
  const point = await evaluate('(() => { const e = document.querySelector(' + JSON.stringify(selector) + ');'
    + 'if (!e || e.disabled) throw new Error("Missing/disabled control: " + ' + JSON.stringify(selector) + ');'
    + 'e.scrollIntoView({block:"center",inline:"nearest"}); const r=e.getBoundingClientRect();'
    + 'const x=r.x+r.width/2,y=r.y+r.height/2; const hit=document.elementFromPoint(x,y);'
    + 'if(!r.width||!r.height||!(hit===e||e.contains(hit))) throw new Error("Control not hit-testable");'
    + 'return {x,y};})()');
  await page('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
  await page('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
  await page('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
}
async function fill(selector, text) {
  await click(selector);
  await key('a', 'KeyA', 65, { modifiers: process.platform === 'darwin' ? 4 : 2, commands: ['selectAll'] });
  await key('Backspace', 'Backspace', 8);
  if (text) await page('Input.insertText', { text });
  check(await evaluate('document.querySelector(' + JSON.stringify(selector) + ').value') === text,
    'Native editing must preserve the exact entered text', { selector, text });
}
async function tabTo(selector) {
  for (let i = 0; i < 30; i++) {
    if (await evaluate('document.activeElement === document.querySelector(' + JSON.stringify(selector) + ')')) return;
    await key('Tab', 'Tab', 9);
  }
  throw new Error('Keyboard Tab could not reach ' + selector);
}

async function selectIndex(selector, index) {
  await click(selector);
  await key('Home', 'Home', 36);
  for (let i = 0; i < index; i++) await key('ArrowDown', 'ArrowDown', 40);
  await key('Enter', 'Enter', 13);
  check(await evaluate('document.querySelector(' + JSON.stringify(selector) + ').selectedIndex') === index,
    'Native select must choose requested option', {selector, index});
}
async function build(count, edges, keyboard = false) {
  await selectIndex('#vertex-count', count - 1);
  await fill('#edges-input', edges);
  if (keyboard) { await tabTo('#build-trace'); await key('Enter', 'Enter', 13); }
  else await click('#build-trace');
  await until(() => evaluate('!document.getElementById("trace-view").hidden || !document.getElementById("input-error").hidden'), 'build or accessible refusal');
}
async function preset(index) {
  await selectIndex('#example', index + 1);
  await click('#apply-example');
  const retired = await state();
  check(retired.traceHidden && retired.disabled['download-trace'] && retired.focus === 'edges-input',
    'Loading a preset must retire the old trace and require explicit Build', retired);
  await click('#build-trace');
  await until(() => evaluate('!document.getElementById("trace-view").hidden'), 'preset build');
}
async function state() {
  return evaluate('(() => {const $=id=>document.getElementById(id);return {'
    + 'vertexCount:$("vertex-count").value,edges:$("edges-input").value,focus:document.activeElement?.id,'
    + 'traceHidden:$("trace-view").hidden,emptyHidden:$("empty-view").hidden,error:$("input-error").textContent,errorHidden:$("input-error").hidden,'
    + 'inputInvalid:$("edges-input").getAttribute("aria-invalid"),count:$("step-count").textContent,'
    + 'accepted:$("accepted-count").textContent,componentCount:$("component-count").textContent,total:$("total-weight").textContent,'
    + 'components:[...$("components").children].map(x=>x.textContent),last:$("last-decision").textContent,next:$("next-decision").textContent,'
    + 'resultHidden:$("result").hidden,resultHeading:$("result-heading").textContent,resultSummary:$("result-summary").textContent,'
    + 'announcement:$("step-announcement").textContent,fileStatus:$("file-status").textContent,'
    + 'disabled:Object.fromEntries(["first-step","previous-step","next-step","last-step","download-trace"].map(id=>[id,$(id).disabled])),'
    + 'edgeRows:[...$("edge-body").rows].map(r=>({id:Number(r.dataset.edge),classes:r.className,current:r.getAttribute("aria-current"),cells:[...r.cells].map(c=>c.textContent)})),'
    + 'history:[...$("history-body").rows].map(r=>[...r.cells].map(c=>c.textContent)),historyHidden:$("history-table").hidden,'
    + 'edgeHidden:$("edge-table").hidden,noEdgesHidden:$("no-edges").hidden,'
    + 'graph:{title:$("graph-title").textContent,description:$("graph-description").textContent,'
    + 'vertices:[...$("graph").querySelectorAll(".graph-vertex")].map(g=>g.textContent),'
    + 'edges:[...$("graph").querySelectorAll(".graph-edge")].map(e=>e.getAttribute("class"))}};})()');
}
const stableTrace = s => JSON.stringify({
  vertexCount:s.vertexCount,edges:s.edges,traceHidden:s.traceHidden,count:s.count,accepted:s.accepted,
  componentCount:s.componentCount,total:s.total,components:s.components,last:s.last,next:s.next,
  resultHidden:s.resultHidden,resultHeading:s.resultHidden?null:s.resultHeading,resultSummary:s.resultHidden?null:s.resultSummary,
  disabled:s.disabled,edgeRows:s.edgeRows,history:s.history,historyHidden:s.historyHidden,
  edgeHidden:s.edgeHidden,noEdgesHidden:s.noEdgesHidden,graph:s.graph
});
async function savedDownload(selector, filename, expected) {
  const eventStart = cdp.events.length;
  await click(selector);
  const begin = await until(() => cdp.events.slice(eventStart).find(e =>
    e.method === 'Browser.downloadWillBegin' && e.params.suggestedFilename === filename), 'native saved file ' + filename);
  const guid = begin.params.guid;
  const completed = await until(() => cdp.events.slice(eventStart).find(e =>
    e.method === 'Browser.downloadProgress' && e.params.guid === guid && ['completed', 'canceled'].includes(e.params.state)),
    'download completion ' + filename);
  check(completed.params.state === 'completed', 'The browser must complete the download', completed.params);
  const actual = await readFile(join(downloadDir, guid));
  if (expected) check(actual.equals(expected), 'Actual saved bytes must match the independent expected bytes',
    {filename,expected_sha256:sha(expected),actual_sha256:sha(actual),expected_bytes:expected.length,actual_bytes:actual.length});
  const name = String(report.downloads.length + 1).padStart(2, '0') + '-' + filename;
  await writeFile(join(output, 'downloads', name), actual, {flag:'wx'});
  await rm(join(downloadDir, guid));
  const row = {name,suggested_filename:filename,bytes:actual.length,sha256:sha(actual),guid,state:completed.params.state};
  report.downloads.push(row);
  return {row, text:actual.toString('utf8')};
}
async function screenshot(name, selector) {
  if (selector) await evaluate('(() => {const r=document.querySelector(' + JSON.stringify(selector)
    + ').getBoundingClientRect();window.scrollTo({top:scrollY+r.top-20,left:0,behavior:"instant"});})()');
  await delay(80);
  const image = await page('Page.captureScreenshot', {format:'png',fromSurface:true});
  const bytes = Buffer.from(image.data,'base64');
  await writeFile(join(output,name),bytes,{flag:'wx'});
  const row = {name,bytes:bytes.length,sha256:sha(bytes),viewport:await evaluate('({width:innerWidth,height:innerHeight,scrollX,scrollY})')};
  report.screenshots.push(row);
  return row;
}
// Fixed consumer oracle, authored independently of the production helper.
// The sequence and each component partition are enumerated, not computed by Kruskal.
const defaultText = 'A B 4\nA C 1\nB C 2\nB D 5\nC D 3';
const defaultEdges = [
  {id:0,from:0,to:1,weight:4},{id:1,from:0,to:2,weight:1},{id:2,from:1,to:2,weight:2},
  {id:3,from:1,to:3,weight:5},{id:4,from:2,to:3,weight:3}
];
const partitions = [
  [[0],[1],[2],[3]],[[0,2],[1],[3]],[[0,1,2],[3]],[[0,1,2,3]],[[0,1,2,3]],[[0,1,2,3]]
];
const acceptedPrefixes = [[],[1],[1,2],[1,2,4],[1,2,4],[1,2,4]];
const ordered = [1,2,4,0,3], totals = [0,1,3,6,6,6];
const defaultTrace = {
  format:'recallweave.minimum-spanning-forest-trace/1',vertexCount:4,edges:defaultEdges,orderedEdgeIds:ordered,
  steps:ordered.map((id,index)=>({
    number:index+1,edgeId:id,from:defaultEdges[id].from,to:defaultEdges[id].to,weight:defaultEdges[id].weight,
    accepted:index<3,beforeComponents:partitions[index],afterComponents:partitions[index+1],
    acceptedEdgeIds:acceptedPrefixes[index+1],totalWeight:totals[index+1]
  })),
  forestEdgeIds:[1,2,4],totalWeight:6,components:[[0,1,2,3]],connected:true,decisions:5
};
const expectedDownload = frame => Buffer.from(JSON.stringify({
  format:'recallweave.minimum-spanning-forest-export/1',entered:{vertexCount:'4',edges:defaultText},
  selectedDecision:frame,trace:defaultTrace
},null,2)+'\n');
const names = group => '{' + group.map(v=>String.fromCharCode(65+v)).join(', ') + '}';
const edgeName = edge => 'E'+(edge.id+1)+' · '+String.fromCharCode(65+edge.from)+'–'+String.fromCharCode(65+edge.to);
async function assertDefaultFrame(frame) {
  const s = await state();
  check(!s.traceHidden && s.count === frame+' / 5', 'Visible exact decision prefix', s);
  check(s.accepted === String(acceptedPrefixes[frame].length) && s.componentCount === String(partitions[frame].length)
    && s.total === String(totals[frame]), 'Metrics match the manually enumerated prefix', s);
  check(JSON.stringify(s.components) === JSON.stringify(partitions[frame].map(names)), 'Readable partition matches prefix', s.components);
  check(s.edgeRows.length===5 && s.graph.vertices.length===4 && s.graph.edges.length===5, 'All original edges and vertices remain present', s);
  for (let i=0;i<5;i++) {
    const e=defaultEdges[ordered[i]], status=i<frame?(i<3?'Accepted':'Cycle rejected'):i===frame?'Next':'Not decided';
    check(s.edgeRows[i].id===e.id && JSON.stringify(s.edgeRows[i].cells)===JSON.stringify([String(i+1),edgeName(e),String(e.weight),status]),
      'Readable decision-order row retains exact edge identity and status', s.edgeRows[i]);
    check(s.edgeRows[i].current === (i===frame?'step':null), 'Only next edge is aria-current', s.edgeRows[i]);
  }
  const expectedHistory=defaultTrace.steps.slice(0,frame).map(step=>[
    String(step.number),edgeName(defaultEdges[step.edgeId]),String(step.weight),
    step.accepted?'Accept: join components':'Reject: cycle',step.afterComponents.map(names).join(' · '),String(step.totalWeight)
  ]);
  check(JSON.stringify(s.history)===JSON.stringify(expectedHistory), 'Applied history is an exact prefix with reasons, partitions and totals', s.history);
  const graphKinds=['accepted','rejected','candidate','undecided'];
  const actualCounts=graphKinds.map(k=>s.graph.edges.filter(x=>x.split(' ').includes(k)).length);
  const expectedCounts=[Math.min(frame,3),Math.max(frame-3,0),frame<5?1:0,Math.max(4-frame,0)];
  check(JSON.stringify(actualCounts)===JSON.stringify(expectedCounts), 'Graph classes agree with readable table', {actualCounts,expectedCounts});
  check(s.disabled['first-step']===(frame===0) && s.disabled['previous-step']===(frame===0)
    && s.disabled['next-step']===(frame===5) && s.disabled['last-step']===(frame===5)
    && !s.disabled['download-trace'], 'Navigation enabled state follows exact frame', s.disabled);
  check(s.resultHidden===(frame!==5) && s.historyHidden===(frame===0), 'Result/history visibility follows completed decisions', s);
  return s;
}
try {
  await mkdir(output);
  await mkdir(join(output, 'downloads'));
  report.source_before = await snapshot();
  if (options['--freeze']) {
    const bytes = await readFile(options['--freeze']);
    const frozen = JSON.parse(bytes);
    report.freeze = { path: options['--freeze'], sha256: sha(bytes), source_commit: frozen.source_commit, tree: frozen.tree, actual_parent: frozen.actual_parent };
    for (const row of frozen.files) {
      const actual = await readFile(join(root, row.path));
      check(sha(actual) === row.sha256 && gitBlob(actual) === row.git_blob && actual.length === row.bytes,
        'Frozen source mismatch: ' + row.path);
    }
  }
  report.runtime.chrome = await command(chromePath, ['--version']);
  const fs = await statfs(output);
  report.free_bytes_before = fs.bavail * fs.bsize;
  check(report.free_bytes_before > 128 * 1024 * 1024, 'Need 128 MiB free for this isolated Chrome receiving');
  const profileParent = options['--profile-parent'] || (process.platform === 'linux' && chromePath.includes('snap') ? '/root/snap/chromium/common' : '/tmp');
  if (!isAbsolute(profileParent)) throw new Error('--profile-parent must be absolute.');
  profile = await mkdtemp(join(profileParent, 'hamon-a3425ebf9874-mst-'));
  downloadDir = join(profile, 'receiving-downloads');
  await mkdir(downloadDir);
  const entryBytes = await readFile(join(root,'courses/minimum-spanning-forest-explorer.html'));
  const copiedEntry = join(profile,'minimum-spanning-forest-explorer.html');
  await writeFile(copiedEntry,entryBytes,{flag:'wx'});
  check(sha(await readFile(copiedEntry))===sha(entryBytes),'Snap-readable standalone copy must be byte-exact');
  report.browser_entry = pathToFileURL(copiedEntry).href;
  report.entry_copy_sha256 = sha(entryBytes);
  report.profile = profile;
  stdoutStream = createWriteStream(join(output, 'chrome-stdout.log'), { flags: 'wx' });
  stderrStream = createWriteStream(join(output, 'chrome-stderr.log'), { flags: 'wx' });
  browser = spawn(chromePath, [
    '--headless=new', ...(process.platform === 'linux' ? ['--no-sandbox', '--disable-dev-shm-usage'] : []), '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1',
    '--user-data-dir=' + profile, '--no-first-run', '--no-default-browser-check',
    '--disable-background-networking', '--disable-component-update', '--disable-sync',
    '--disable-default-apps', '--disable-breakpad', '--metrics-recording-only',
    '--disable-features=Translate', 'about:blank'
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  report.browser_pid = browser.pid;
  browser.once('close', () => { browserClosed = true; });
  browser.stdout.pipe(stdoutStream);
  browser.stderr.pipe(stderrStream);
  const portInfo = await until(async () => {
    try { return (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).trim().split('\n'); }
    catch (error) { if (error.code === 'ENOENT' && !browserClosed) return false; throw error; }
  }, 'fresh Chrome debugging port', 45000);
  const ws = new WebSocket('ws://127.0.0.1:' + portInfo[0] + portInfo[1]);
  await once(ws, 'open');
  cdp = new CDP(ws);
  report.runtime.browser = await cdp.send('Browser.getVersion');
  await cdp.send('Browser.setDownloadBehavior', {
    behavior: 'allowAndName', downloadPath: downloadDir, eventsEnabled: true
  });
  const target = await cdp.send('Target.createTarget', { url: 'about:blank' });
  session = (await cdp.send('Target.attachToTarget', { targetId: target.targetId, flatten: true })).sessionId;
  await page('Page.enable');
  await page('Runtime.enable');
  await page('Network.enable');
  await page('Network.setBlockedURLs', { urls: ['http://*', 'https://*'] });
  await page('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await page('Page.navigate', { url: report.browser_entry });
  await until(() => evaluate('document.readyState==="complete" && document.getElementById("example")?.options.length === 6'),
    'standalone module to render');
  await page('Network.emulateNetworkConditions', {offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});

  await group('offline direct-file startup requires explicit Build', async () => {
    const s=await state();
    check(s.vertexCount==='4' && s.edges===defaultText,'Default graph text is exact',s);
    check(s.traceHidden && !s.emptyHidden && Object.values(s.disabled).every(Boolean),'No implied trace or enabled trace action before Build',s);
    check(s.errorHidden && s.history.length===0,'Startup has no error or invented decision',s);
    const semantics=await evaluate('({form:document.getElementById("search-form").tagName,textarea:document.getElementById("edges-input").tagName,live:document.getElementById("step-announcement").getAttribute("aria-live"),error:document.getElementById("input-error").getAttribute("role")})');
    check(semantics.form==='FORM' && semantics.textarea==='TEXTAREA' && semantics.live==='polite' && semantics.error==='alert','Native form and live/error semantics are exposed',semantics);
    return {inputs:{vertexCount:s.vertexCount,edges:s.edges},semantics};
  });
  const frames=[];
  await group('native keyboard Build begins with every vertex separate', async () => {
    await build(4,defaultText,true);
    const s=await assertDefaultFrame(0);
    check(s.focus==='trace-heading','Build moves focus to the trace heading',s.focus);
    check(s.announcement.length>0,'Build announces current state');
    frames[0]=stableTrace(s);
    return {count:s.count,components:s.components,focus:s.focus,announcement:s.announcement};
  });
  await group('native Next visits the accepted and rejected decisions exactly', async () => {
    const observed=[];
    for(let frame=1;frame<=5;frame++){
      if(frame===1){await tabTo('#next-step');await key(' ','Space',32);}
      else await click('#next-step');
      const s=await assertDefaultFrame(frame);
      frames[frame]=stableTrace(s);
      check(s.announcement.length>0,'Navigation announces state');
      observed.push({frame,accepted:s.accepted,total:s.total,components:s.components,last:s.last});
    }
    check((await state()).resultHeading.toLowerCase().includes('tree'),'Connected completion is identified as a tree');
    return {observed,screenshot:await screenshot('desktop-complete-trace.png','#trace-view')};
  });
  await group('Previous First and Finish restore exact immutable frames', async () => {
    await click('#previous-step');
    check(stableTrace(await assertDefaultFrame(4))===frames[4],'Previous restores exact frame four');
    await click('#first-step');
    check(stableTrace(await assertDefaultFrame(0))===frames[0],'First restores exact initial frame');
    await click('#next-step');await click('#next-step');
    const two=await assertDefaultFrame(2);
    check(stableTrace(two)===frames[2],'Replayed frame two is identical');
    const partial=await savedDownload('#download-trace','minimum-spanning-forest-trace.json',expectedDownload(2));
    await click('#last-step');
    check(stableTrace(await assertDefaultFrame(5))===frames[5],'Finish restores exact final frame');
    const full=await savedDownload('#download-trace','minimum-spanning-forest-trace.json',expectedDownload(5));
    const a=JSON.parse(partial.text),b=JSON.parse(full.text);
    check(a.selectedDecision===2 && b.selectedDecision===5 && JSON.stringify(a.trace)===JSON.stringify(b.trace),'Saved selection differs while full trace remains identical');
    return {partial:partial.row,complete:full.row};
  });
  await group('equal-weight preset retains original input order', async () => {
    await preset(1);
    let s=await state();
    check(s.vertexCount==='3' && s.edges==='A C 1\nA B 1\nB C 1','Tie preset text',s);
    check(s.count==='0 / 3','Tie trace begins before decisions',s);
    await click('#next-step');s=await state();
    check(s.edgeRows[0].cells[1]==='E1 · A–C' && s.edgeRows[0].cells[3]==='Accepted' && s.total==='1','First equal edge retains line identity',s);
    await click('#next-step');s=await state();
    check(s.edgeRows[1].cells[1]==='E2 · A–B' && s.edgeRows[1].cells[3]==='Accepted' && s.total==='2','Second equal edge retains line identity',s);
    await click('#last-step');s=await state();
    check(s.edgeRows[2].cells[1]==='E3 · B–C' && s.edgeRows[2].cells[3]==='Cycle rejected' && s.accepted==='2' && s.total==='2','Last equal edge is the cycle rejection',s);
    const d=await savedDownload('#download-trace','minimum-spanning-forest-trace.json');
    const x=JSON.parse(d.text);
    check(JSON.stringify(x.trace.orderedEdgeIds)==='[0,1,2]' && JSON.stringify(x.trace.forestEdgeIds)==='[0,1]' && x.selectedDecision===3,'Saved tied trace preserves IDs',x);
    return {rows:s.edgeRows,saved:d.row};
  });
  await group('negative and disconnected presets preserve all vertices', async () => {
    await preset(2);await click('#last-step');
    let s=await state();
    check(s.total==='-3' && s.accepted==='3' && s.componentCount==='1' && s.count==='5 / 5','Negative-weight completion',s);
    check(JSON.stringify(s.edgeRows.map(r=>r.cells[3]))===JSON.stringify(['Accepted','Accepted','Cycle rejected','Accepted','Cycle rejected']),'Cycle choice is independent of negative sign',s.edgeRows);
    const negative=await savedDownload('#download-trace','minimum-spanning-forest-trace.json');
    let x=JSON.parse(negative.text);
    check(x.trace.totalWeight===-3 && JSON.stringify(x.trace.forestEdgeIds)==='[0,1,3]','Saved negative result',x);
    await preset(3);await click('#last-step');s=await state();
    check(s.total==='1' && s.accepted==='3' && s.componentCount==='3' && s.count==='4 / 4','Disconnected total/components',s);
    check(JSON.stringify(s.components)===JSON.stringify(['{A, B, C}','{D, E}','{F}']) && s.graph.vertices.length===6,'Isolated vertex remains in readable and visual state',s);
    check(s.resultHeading.toLowerCase().includes('forest'),'Disconnected result is identified as a forest',s.resultHeading);
    const disconnected=await savedDownload('#download-trace','minimum-spanning-forest-trace.json');
    x=JSON.parse(disconnected.text);
    check(x.trace.connected===false && JSON.stringify(x.trace.components)==='[[0,1,2],[3,4],[5]]' && x.trace.totalWeight===1,'Saved disconnected result preserves isolate',x);
    return {negative:negative.row,disconnected:disconnected.row,components:s.components};
  });
  await group('singleton completes without an invented edge or decision', async () => {
    await preset(4);
    const s=await state();
    check(s.vertexCount==='1' && s.edges==='' && s.count==='0 / 0' && s.total==='0' && s.accepted==='0' && s.componentCount==='1','Singleton metrics',s);
    check(s.graph.vertices.length===1 && s.graph.edges.length===0 && s.edgeRows.length===0 && s.history.length===0,'No fabricated edge or decision',s);
    check(s.edgeHidden && !s.noEdgesHidden && !s.resultHidden && s.disabled['next-step'] && s.disabled['last-step'] && !s.disabled['download-trace'],'Zero-decision completion remains downloadable',s);
    const d=await savedDownload('#download-trace','minimum-spanning-forest-trace.json');
    const x=JSON.parse(d.text);
    check(x.entered.edges==='' && x.selectedDecision===0 && x.trace.decisions===0 && x.trace.connected===true && JSON.stringify(x.trace.components)==='[[0]]','Saved singleton boundary',x);
    return {saved:d.row,state:s};
  });
  await group('editing either input retires trace; textarea Enter remains a newline', async () => {
    await preset(0);await click('#last-step');
    await click('#edges-input');await key('End','End',35,{modifiers:2});
    const before=await evaluate('document.getElementById("edges-input").value');
    await key('Enter','Enter',13);
    let s=await state();
    check(s.edges===before+'\n' && s.traceHidden && s.disabled['download-trace'] && s.focus==='edges-input','Textarea Enter edits and retires instead of submitting',s);
    await click('#build-trace');
    s=await state();
    check(!s.traceHidden && s.count==='0 / 5' && s.edges===before+'\n','Explicit Build accepts exact trailing newline',s);
    await selectIndex('#vertex-count',4);
    s=await state();
    check(s.vertexCount==='5' && s.traceHidden && Object.values(s.disabled).every(Boolean),'Vertex-count edit retires previous graph',s);
    await click('#build-trace');await click('#last-step');s=await state();
    check(s.componentCount==='2' && JSON.stringify(s.components)===JSON.stringify(['{A, B, C, D}','{E}']),'Rebuild includes newly introduced isolate',s);
    return {retired_on_text:true,retired_on_count:true,rebuilt_components:s.components};
  });
  await group('malformed duplicate and out-of-domain edits refuse cleanly then retry', async () => {
    const inputs=['A B','A B 1\nB A 2','A A 1','A E 1','A B 100'];
    const refusals=[];
    for(const edges of inputs){
      await build(4,edges);
      const s=await state();
      check(s.traceHidden && !s.errorHidden && s.error.length>0 && s.inputInvalid==='true' && s.focus==='edges-input','Invalid input is announced without retaining an old trace',s);
      check(Object.values(s.disabled).every(Boolean),'Refused trace actions remain disabled',s.disabled);
      refusals.push({entered:edges,error:s.error});
    }
    await build(4,defaultText,true);
    const s=await assertDefaultFrame(0);
    check(s.errorHidden && !s.error && s.inputInvalid===null && s.focus==='trace-heading','Successful retry clears error semantics',s);
    return {refusals,retry_focus:s.focus};
  });
  await group('original course and guide are actual byte-exact offline downloads', async () => {
    const course=await savedDownload('#download-course','minimum-spanning-forest.json',await readFile(join(root,'courses/minimum-spanning-forest.json')));
    const guide=await savedDownload('#download-guide','minimum-spanning-forest.md',await readFile(join(root,'courses/minimum-spanning-forest.md')));
    return {course:course.row,guide:guide.row};
  });
  await group('one-shot URL and anchor failures preserve trace and allow explicit retry', async () => {
    await click('#next-step');await click('#next-step');
    await assertDefaultFrame(2);
    const stable=stableTrace(await state()), outcomes=[];
    for(const failure of ['url','anchor']){
      await evaluate('(() => {const failure='+JSON.stringify(failure)+';const originalCreate=URL.createObjectURL,originalRevoke=URL.revokeObjectURL,originalClick=HTMLAnchorElement.prototype.click;'
        +'window.__mstReceiver={active:new Set(),created:0,revoked:0,previousRevocations:0,attempts:0,restore(){URL.createObjectURL=originalCreate;URL.revokeObjectURL=originalRevoke;HTMLAnchorElement.prototype.click=originalClick;}};'
        +'const r=window.__mstReceiver;URL.createObjectURL=function(blob){if(failure==="url" && r.attempts++===0)throw new Error("synthetic receiver URL failure");const u=originalCreate.call(this,blob);r.active.add(u);r.created++;return u;};'
        +'URL.revokeObjectURL=function(u){if(r.active.delete(u))r.revoked++;else r.previousRevocations++;return originalRevoke.call(this,u);};'
        +'HTMLAnchorElement.prototype.click=function(){if(failure==="anchor" && r.attempts++===0)throw new Error("synthetic receiver anchor failure");return originalClick.call(this);};})()');
      const eventStart=cdp.events.length;
      await click('#download-trace');
      const s=await state();
      check(s.fileStatus.includes('could not start the download'),'Download failure is reported',s.fileStatus);
      check(stableTrace(s)===stable,'Download failure leaves input, selection and trace unchanged');
      check(await evaluate('document.querySelectorAll("a[download]").length')===0,'Temporary anchor is removed after failure');
      check(!cdp.events.slice(eventStart).some(e=>e.method==='Browser.downloadWillBegin'),'Injected failure does not claim a saved download');
      await delay(1200);
      const cleanup=await evaluate('({active:__mstReceiver.active.size,created:__mstReceiver.created,revoked:__mstReceiver.revoked,previousRevocations:__mstReceiver.previousRevocations})');
      check(cleanup.active===0 && cleanup.created===cleanup.revoked,'Created object URLs are eventually revoked after failure',cleanup);
      await evaluate('__mstReceiver.restore();delete window.__mstReceiver;');
      const retry=await savedDownload('#download-trace','minimum-spanning-forest-trace.json',expectedDownload(2));
      check(stableTrace(await state())===stable,'Successful retry also preserves the selected trace');
      outcomes.push({failure,cleanup,retry:retry.row});
    }
    return outcomes;
  });
  await group('390px layout and keyboard scrolling keep data within the page', async () => {
    await page('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
    await click('#last-step');
    const s=await assertDefaultFrame(5);
    const layout=await evaluate('(() => {const graph=document.querySelector(".graph-wrap"),history=document.querySelector("[aria-label=\\"Applied decision history\\"]");return {width:innerWidth,documentWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,graph:{client:graph.clientWidth,scroll:graph.scrollWidth,tab:graph.tabIndex},history:{client:history.clientWidth,scroll:history.scrollWidth,tab:history.tabIndex},buttons:[...document.querySelectorAll(".nav button")].map(e=>{const r=e.getBoundingClientRect();return {id:e.id,x:r.x,width:r.width,height:r.height};})};})()');
    check(layout.width===390 && layout.documentWidth<=391 && layout.bodyWidth<=391,'No horizontal page overflow at 390px',layout);
    check(layout.graph.scroll>layout.graph.client && layout.history.scroll>layout.history.client && layout.graph.tab===0 && layout.history.tab===0,'Wide graph and history have focusable internal scroll regions',layout);
    check(layout.buttons.every(b=>b.x>=0 && b.x+b.width<=390 && b.height>=44),'All navigation controls stay in viewport and retain touch height',layout.buttons);
    await tabTo('[aria-label="Applied decision history"]');
    const before=await evaluate('document.querySelector("[aria-label=\\"Applied decision history\\"]").scrollLeft');
    for(let i=0;i<8;i++)await key('ArrowRight','ArrowRight',39);
    await delay(180);
    const after=await evaluate('document.querySelector("[aria-label=\\"Applied decision history\\"]").scrollLeft');
    check(after>before && await evaluate('scrollX')===0,'Native keyboard scrolling is contained in the history region',{before,after});
    await click('#first-step');await tabTo('#next-step');await key('Enter','Enter',13);
    await assertDefaultFrame(1);
    await click('#last-step');
    return {layout,keyboard_scroll:{before,after},screenshots:[
      await screenshot('mobile-390-trace.png','#trace-view'),
      await screenshot('mobile-390-history.png','#history-heading')
    ]};
  });
  await group('offline no-storage boundary and frozen source integrity', async () => {
    check(report.page_errors.length===0,'No uncaught page exceptions',report.page_errors);
    const external=report.network_requests.filter(r=>/^https?:/.test(r.url));
    check(external.length===0,'Standalone page must not attempt HTTP requests',external);
    await delay(1200);
    const stores=await evaluate('({local:localStorage.length,session:sessionStorage.length,anchors:document.querySelectorAll("a[download]").length})');
    check(stores.local===0 && stores.session===0 && stores.anchors===0,'No persistence or temporary anchors remain',stores);
    const after=await snapshot();
    check(JSON.stringify(after)===JSON.stringify(report.source_before),'All seven exercised source/course files remain exact');
    return {stores,requests:report.network_requests,source_files_unchanged:after.length};
  });
  report.status='PASS';
} catch (error) {
  report.status = 'FAIL';
  report.error = error.stack || String(error);
  process.exitCode = 1;
} finally {
  if (cdp) {
    try { await cdp.send('Browser.close'); } catch (error) { report.cleanup.browser_close_note = String(error); }
    try { cdp.socket.close(); } catch {}
  }
  if (browser && !browserClosed) {
    await Promise.race([once(browser, 'close'), delay(1500)]);
    if (!browserClosed) {
      browser.kill('SIGTERM');
      await Promise.race([once(browser, 'close'), delay(1500)]);
    }
    if (!browserClosed) { browser.kill('SIGKILL'); await once(browser, 'close'); }
  }
  report.cleanup.browser_process_closed = !browser || browserClosed;
  if (profile) {
    try { await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); report.cleanup.own_profile_removed = true; }
    catch (error) { report.cleanup.own_profile_removed = false; report.cleanup.profile_error = String(error); process.exitCode = 1; }
  }
  if (stdoutStream && !stdoutStream.closed) await once(stdoutStream, 'close').catch(() => {});
  if (stderrStream && !stderrStream.closed) await once(stderrStream, 'close').catch(() => {});
  try {
    const after = await snapshot();
    report.source_after = after;
    report.source_unchanged = JSON.stringify(after) === JSON.stringify(report.source_before);
    if (!report.source_unchanged) { report.status = 'FAIL'; process.exitCode = 1; }
  } catch (error) { report.source_readback_error = String(error); report.status = 'FAIL'; process.exitCode = 1; }
  report.completed_at = new Date().toISOString();
  report.passed_groups = report.checks.filter(x => x.status === 'PASS').length;
  report.failed_groups = report.checks.filter(x => x.status === 'FAIL').length;
  const bytes = Buffer.from(JSON.stringify(report, null, 2) + '\n');
  try {
    await writeFile(join(output, 'browser-receipt.json'), bytes, { flag: 'wx' });
    console.log(JSON.stringify({
      status: report.status, passed_groups: report.passed_groups, failed_groups: report.failed_groups,
      assertions: report.assertions, saved_files: report.downloads.length, screenshots: report.screenshots.length,
      receipt: join(output, 'browser-receipt.json'), sha256: sha(bytes), source_unchanged: report.source_unchanged,
      cleanup: report.cleanup
    }));
  } catch (error) { console.error('Could not save receiving receipt:', error); process.exitCode = 1; }
}
