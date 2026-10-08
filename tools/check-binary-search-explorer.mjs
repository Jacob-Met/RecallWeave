#!/usr/bin/env node
// Bounded native Chrome/CDP receiving for the standalone binary-search companion.
// No dependencies, provider access, learner state, or existing browser profile.
// Usage: node tools/check-binary-search-explorer.mjs --output-dir /absolute/new-dir
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
  if (!['--output-dir', '--chrome', '--freeze'].includes(args[i]) || !args[i + 1])
    throw new Error('Use --output-dir /absolute/new-dir [--chrome /path] [--freeze /path].');
  if (options[args[i]]) throw new Error('Duplicate option: ' + args[i]);
  options[args[i]] = args[i + 1];
}
if (!options['--output-dir'] || !isAbsolute(options['--output-dir']))
  throw new Error('--output-dir must be an absolute, new directory outside the source tree.');
const output = resolve(options['--output-dir']);
if (output === root || output.startsWith(root + sep))
  throw new Error('Browser evidence belongs outside the source tree.');
const chromePath = options['--chrome'] || process.env.CHROME ||
  (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : '/usr/bin/google-chrome');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const gitBlob = bytes => createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const trackedPaths = [
  'courses/binary-search-explorer.html', 'courses/binary-search-explorer.template.html',
  'courses/binary-search.json', 'courses/binary-search.md',
  'src/binary-search-explorer.mjs', 'src/binary-search-explorer-ui.mjs',
  'tools/build-binary-search-explorer.mjs', 'tests/binary-search-explorer.test.mjs'
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
  schema: 'recallweave.binary-search-browser-receiving/1',
  started_at: new Date().toISOString(),
  source_root: root,
  entry: pathToFileURL(join(root, 'courses/binary-search-explorer.html')).href,
  driver: { path: ownFile, sha256: sha(await readFile(ownFile)) },
  runtime: { node: process.version, platform: process.platform, arch: process.arch, chrome_path: chromePath },
  scope: 'Actual isolated native Chrome on the direct standalone file; mouse/keyboard input, DOM semantics and actual saved files. No learner/importer execution.',
  checks: [], assertions: 0, downloads: [], screenshots: [],
  network_requests: [], network_failures: [], page_errors: [],
  instrumentation: 'Read-only DOM inspection; CDP native input. One-shot in-page URL/anchor failures are synthetic receiver controls and never modify source files.',
  cleanup: {}
};
let cdp, session, browser, profile, browserClosed = false, stderrStream, stdoutStream;
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
async function build(values, target) {
  await fill('#values', values);
  await fill('#target', target);
  await key('Enter', 'Enter', 13);
  await until(() => evaluate('!document.getElementById("trace-view").hidden || !!document.getElementById("input-error").textContent'), 'build or accessible refusal');
}
async function state() {
  return evaluate('(() => { const $=id=>document.getElementById(id); return {'
    + 'values:$("values").value,target:$("target").value,focus:document.activeElement?.id,'
    + 'traceHidden:$("trace-view").hidden,emptyHidden:$("empty-view").hidden,'
    + 'count:$("step-count").textContent,bounds:$("bounds").textContent,possible:$("possible-boundaries").textContent,'
    + 'remaining:$("remaining").textContent,heading:$("trace-heading").textContent,'
    + 'last:$("last-decision").textContent,next:$("next-decision").textContent,membership:$("membership").textContent,'
    + 'announcement:$("step-announcement").textContent,error:$("input-error").textContent,'
    + 'valuesInvalid:$("values").getAttribute("aria-invalid"),targetInvalid:$("target").getAttribute("aria-invalid"),'
    + 'fileStatus:$("file-status").textContent,fileError:$("file-status").classList.contains("error"),'
    + 'disabled:Object.fromEntries(["first-step","previous-step","next-step","last-step","download-trace"].map(id=>[id,$(id).disabled])),'
    + 'cells:[...$("array").children].map(e=>({classes:e.className,value:e.querySelector(".array-value").textContent,'
    + 'index:e.querySelector(".index-label").textContent,marker:e.querySelector(".boundary-marker").textContent,'
    + 'boundary:e.querySelector(".boundary-label").textContent})),'
    + 'history:[...$("history-body").rows].map(r=>[...r.cells].map(c=>c.textContent)),'
    + 'noHistory:$("no-history").hidden,historyHidden:$("history-table").hidden}; })()');
}
const stableTrace = s => JSON.stringify({
  values: s.values, target: s.target, traceHidden: s.traceHidden, count: s.count, bounds: s.bounds,
  possible: s.possible, remaining: s.remaining, membership: s.membership, cells: s.cells, history: s.history
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
  const actual = await readFile(join(output, 'downloads', guid));
  check(actual.equals(expected), 'The saved file bytes must match the independent expected bytes',
    { filename, expected_sha256: sha(expected), actual_sha256: sha(actual), expected_bytes: expected.length, actual_bytes: actual.length });
  const name = String(report.downloads.length + 1).padStart(2, '0') + '-' + filename;
  await rename(join(output, 'downloads', guid), join(output, 'downloads', name));
  const row = { name, suggested_filename: filename, bytes: actual.length, sha256: sha(actual), guid, state: completed.params.state };
  report.downloads.push(row);
  return row;
}
async function screenshot(name, selector) {
  if (selector) await evaluate('(() => { const r=document.querySelector(' + JSON.stringify(selector)
    + ').getBoundingClientRect(); window.scrollTo({top:scrollY+r.top-20,left:0,behavior:"instant"}); })()');
  await delay(80);
  const image = await page('Page.captureScreenshot', { format: 'png', fromSurface: true });
  const bytes = Buffer.from(image.data, 'base64');
  await writeFile(join(output, name), bytes, { flag: 'wx' });
  const row = { name, bytes: bytes.length, sha256: sha(bytes),
    viewport: await evaluate('({width:innerWidth,height:innerHeight,scrollX,scrollY})') };
  report.screenshots.push(row);
  return row;
}
const duplicateTrace = {
  format: 'recallweave.binary-search-trace/1', values: [1, 5, 5, 5, 9], target: 5,
  steps: [
    { lo: 0, hi: 5, mid: 2, value: 5, lessThanTarget: false, nextLo: 0, nextHi: 2 },
    { lo: 0, hi: 2, mid: 1, value: 5, lessThanTarget: false, nextLo: 0, nextHi: 1 },
    { lo: 0, hi: 1, mid: 0, value: 1, lessThanTarget: true, nextLo: 1, nextHi: 1 }
  ],
  boundary: 1, present: true, comparisons: 3,
  enteredText: { values: '1, 5, 5, 5, 9', target: ' +5 ' }
};
const traceBytes = Buffer.from(JSON.stringify(duplicateTrace, null, 2) + '\n');
try {
  await mkdir(output);
  await mkdir(join(output, 'downloads'));
  report.source_before = await snapshot();
  if (options['--freeze']) {
    const bytes = await readFile(options['--freeze']);
    const frozen = JSON.parse(bytes);
    report.freeze = { path: options['--freeze'], sha256: sha(bytes), capture_commit: frozen.capture_commit };
    for (const row of frozen.files) {
      const actual = await readFile(join(root, row.path));
      check(sha(actual) === row.sha256 && gitBlob(actual) === row.git_blob && actual.length === row.bytes,
        'Frozen source mismatch: ' + row.path);
    }
  }
  report.source_capture = await command('git', ['rev-parse', 'HEAD']);
  report.runtime.chrome = await command(chromePath, ['--version']);
  const fs = await statfs(output);
  report.free_bytes_before = fs.bavail * fs.bsize;
  check(report.free_bytes_before > 128 * 1024 * 1024, 'Need 128 MiB free for this isolated Chrome receiving');
  profile = await mkdtemp('/tmp/rwbs-');
  report.profile = profile;
  stdoutStream = createWriteStream(join(output, 'chrome-stdout.log'), { flags: 'wx' });
  stderrStream = createWriteStream(join(output, 'chrome-stderr.log'), { flags: 'wx' });
  browser = spawn(chromePath, [
    '--headless=new', '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1',
    '--user-data-dir=' + profile, '--no-first-run', '--no-default-browser-check',
    '--disable-background-networking', '--disable-component-update', '--disable-sync',
    '--disable-default-apps', '--disable-breakpad', '--metrics-recording-only',
    '--disable-features=Translate', 'about:blank'
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  browser.once('close', () => { browserClosed = true; });
  browser.stdout.pipe(stdoutStream);
  browser.stderr.pipe(stderrStream);
  const portInfo = await until(async () => {
    try { return (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).trim().split('\n'); }
    catch (error) { if (error.code === 'ENOENT' && !browserClosed) return false; throw error; }
  }, 'fresh Chrome debugging port');
  const ws = new WebSocket('ws://127.0.0.1:' + portInfo[0] + portInfo[1]);
  await once(ws, 'open');
  cdp = new CDP(ws);
  report.runtime.browser = await cdp.send('Browser.getVersion');
  await cdp.send('Browser.setDownloadBehavior', {
    behavior: 'allowAndName', downloadPath: join(output, 'downloads'), eventsEnabled: true
  });
  const target = await cdp.send('Target.createTarget', { url: 'about:blank' });
  session = (await cdp.send('Target.attachToTarget', { targetId: target.targetId, flatten: true })).sessionId;
  await page('Page.enable');
  await page('Runtime.enable');
  await page('Network.enable');
  await page('Network.setBlockedURLs', { urls: ['http://*', 'https://*'] });
  await page('Emulation.setDeviceMetricsOverride', { width: 1365, height: 1000, deviceScaleFactor: 1, mobile: false });
  await page('Page.navigate', { url: report.entry });
  await until(() => evaluate('document.readyState==="complete" && document.getElementById("array")?.children.length > 0'),
    'standalone module to render');
  await group('direct-file startup and boundary-only END cell', async () => {
    const s = await state();
    check(s.values === '2,4,6,8,10,12,14,16' && s.target === '7', 'The original inputs must be retained', s);
    check(s.bounds === '[0, 8)' && s.possible === '[0, 8]' && s.count === '0 of 3 ordering comparisons', 'Initial interval/count', s);
    check(s.cells.length === 9 && s.cells[8].value === 'END' && s.cells[8].index === 'no element', 'END must be a boundary without an invented element', s.cells);
    check(s.history.length === 0 && s.historyHidden, 'Initial history must be empty', s.history);
    return { bounds: s.bounds, count: s.count, end: s.cells[8] };
  });
  await group('native input and Enter build preserve duplicate text', async () => {
    await build(duplicateTrace.enteredText.values, duplicateTrace.enteredText.target);
    const s = await state();
    check(!s.traceHidden && s.bounds === '[0, 5)' && s.count === '0 of 3 ordering comparisons', 'Duplicate trace begins before any comparison', s);
    check(s.focus === 'trace-heading', 'Build must place focus on the trace heading', s.focus);
    check(s.values === duplicateTrace.enteredText.values && s.target === duplicateTrace.enteredText.target, 'No input rewriting');
    return { bounds: s.bounds, focus: s.focus, entered: { values: s.values, target: s.target } };
  });
  await group('keyboard Next keeps the equal midpoint boundary', async () => {
    await tabTo('#next-step');
    await key(' ', 'Space', 32);
    const s = await state();
    check(s.bounds === '[0, 2)' && s.possible === '[0, 2]' && s.remaining === '2', 'Equality must move hi to mid, retaining boundary 2', s);
    check(JSON.stringify(s.history[0]) === JSON.stringify(['1', '[0, 5)', '2', '5', '5 ≥ 5; hi = 2', '[0, 2)']), 'First completed comparison must be exact', s.history);
    check(s.cells[2].marker.includes('hi') && s.cells[2].classes.includes('at-least'), 'The equal element qualifies while its boundary remains possible', s.cells[2]);
    return { bounds: s.bounds, possible: s.possible, history: s.history, boundary: s.cells[2] };
  });
  await group('mouse Next and Back replay only completed decisions', async () => {
    await click('#next-step');
    let s = await state();
    check(s.bounds === '[0, 1)' && s.history.length === 2, 'Second equality leaves boundary 1', s);
    await click('#previous-step');
    s = await state();
    check(s.bounds === '[0, 2)' && s.history.length === 1, 'Back restores exact previous interval and history', s);
    await tabTo('#next-step');
    await key('Enter', 'Enter', 13);
    s = await state();
    check(s.bounds === '[0, 1)' && s.history.length === 2, 'Keyboard Enter replays the same second comparison', s);
    return { bounds: s.bounds, history: s.history };
  });
  await group('Final and First controls preserve first occurrence and focus', async () => {
    await click('#last-step');
    let s = await state();
    check(s.bounds === '[1, 1)' && s.possible === '[1, 1]' && s.history.length === 3, 'Duplicate result boundary', s);
    check(s.membership === 'Target 5 is present. Index 1 is its first occurrence.', 'First duplicate membership', s.membership);
    check(s.focus === 'trace-heading' && s.disabled['next-step'] && s.disabled['last-step'], 'A newly disabled clicked control must not strand focus', s);
    check(!s.cells.some(cell => cell.classes.includes('middle')) && s.cells[1].classes.includes('result-cell'), 'Finished result has no next midpoint');
    await click('#first-step');
    s = await state();
    check(s.bounds === '[0, 5)' && s.history.length === 0 && s.focus === 'trace-heading', 'First state resets visible history without editing inputs', s);
    await click('#last-step');
    return { final: await state(), screenshot: await screenshot('desktop-duplicate-result.png', '#trace-view') };
  });
  await group('actual trace download matches a manually specified trace byte-for-byte', async () =>
    savedDownload('#download-trace', 'binary-search-trace.json', traceBytes));
  const course = await readFile(join(root, 'courses/binary-search.json'));
  const guide = await readFile(join(root, 'courses/binary-search.md'));
  await group('actual course and guide downloads preserve their original bytes', async () => {
    const rows = [
      await savedDownload('#download-course', 'binary-search.json', course),
      await savedDownload('#download-guide', 'binary-search.md', guide)
    ];
    return { rows, original_course_git_blob: gitBlob(course), original_guide_git_blob: gitBlob(guide) };
  });
  await evaluate('(() => { const originalCreate=URL.createObjectURL,originalRevoke=URL.revokeObjectURL,originalClick=HTMLAnchorElement.prototype.click;'
    + 'const r=window.__binaryReceiverDownloads={mode:null,created:[],revoked:[],anchorWasConnected:[]};'
    + 'URL.createObjectURL=function(...args){if(r.mode==="url"){r.mode=null;throw new Error("receiver URL failure");}'
    + 'const url=originalCreate.apply(this,args);r.created.push(url);return url;};'
    + 'URL.revokeObjectURL=function(url){r.revoked.push(url);return originalRevoke.call(this,url);};'
    + 'HTMLAnchorElement.prototype.click=function(...args){r.anchorWasConnected.push(this.isConnected);'
    + 'if(r.mode==="link"){r.mode=null;throw new Error("receiver link failure");}return originalClick.apply(this,args);};'
    + 'r.restore=()=>{URL.createObjectURL=originalCreate;URL.revokeObjectURL=originalRevoke;HTMLAnchorElement.prototype.click=originalClick;};})()');
  await group('URL preparation failure is honest, leaves no anchor, and can retry', async () => {
    const before = stableTrace(await state()), downloadCount = cdp.events.filter(e => e.method === 'Browser.downloadWillBegin').length;
    await evaluate('window.__binaryReceiverDownloads.mode="url"');
    await click('#download-trace');
    let s = await state();
    check(s.fileError && s.fileStatus.includes('Could not prepare the download.') && s.fileStatus.includes('receiver URL failure'), 'Preparation error must be visible and truthful', s);
    check(stableTrace(s) === before && !s.disabled['download-trace'], 'Failure preserves the current trace and retry control');
    check(await evaluate('document.querySelectorAll("a[download]").length') === 0, 'Failed preparation leaves no temporary anchor');
    check(cdp.events.filter(e => e.method === 'Browser.downloadWillBegin').length === downloadCount, 'No download is falsely dispatched');
    const saved = await savedDownload('#download-trace', 'binary-search-trace.json', traceBytes);
    await until(() => evaluate('window.__binaryReceiverDownloads.revoked.length===1'), 'retry object URL revocation');
    s = await state();
    check(!s.fileError && stableTrace(s) === before, 'Successful retry clears error without changing trace');
    return { saved, instrumentation: await evaluate('({created:__binaryReceiverDownloads.created.length,revoked:__binaryReceiverDownloads.revoked.length,anchors:document.querySelectorAll("a[download]").length})') };
  });
  await group('anchor activation failure removes and revokes resources before successful retry', async () => {
    const before = stableTrace(await state()), count = report.downloads.length;
    await evaluate('window.__binaryReceiverDownloads.mode="link"');
    await click('#download-guide');
    const s = await state();
    check(s.fileError && s.fileStatus.includes('receiver link failure'), 'Anchor activation error must be displayed', s.fileStatus);
    check(stableTrace(s) === before && !s.disabled['download-trace'], 'Link failure keeps current state retryable');
    check(await evaluate('document.querySelectorAll("a[download]").length') === 0, 'Throwing anchor is removed immediately');
    await until(() => evaluate('window.__binaryReceiverDownloads.revoked.length===2'), 'failed-link object URL revocation');
    const saved = await savedDownload('#download-guide', 'binary-search.md', guide);
    await until(() => evaluate('window.__binaryReceiverDownloads.revoked.length===3'), 'guide retry object URL revocation');
    check(report.downloads.length === count + 1, 'Exactly the successful retry was saved');
    check(await evaluate('__binaryReceiverDownloads.anchorWasConnected.every(Boolean)'), 'Download activation uses connected anchors');
    check(stableTrace(await state()) === before, 'Both failed and successful guide attempts preserve trace');
    await evaluate('__binaryReceiverDownloads.restore()');
    return { saved, instrumentation: await evaluate('({created:__binaryReceiverDownloads.created.length,revoked:__binaryReceiverDownloads.revoked.length,anchors:document.querySelectorAll("a[download]").length})') };
  });
  await group('editing invalidates the old trace before a new successful build', async () => {
    await fill('#target', '6');
    let s = await state();
    check(s.traceHidden && !s.emptyHidden && Object.values(s.disabled).every(Boolean), 'Any input edit invalidates the old trace and download', s);
    await key('Enter', 'Enter', 13);
    await click('#last-step');
    s = await state();
    check(s.bounds === '[4, 4)' && s.membership === 'Target 6 is absent. Insert it before index 4, whose value is 9.', 'A rebuilt trace uses only new inputs', s);
    return { bounds: s.bounds, membership: s.membership };
  });
  await group('invalid arrays and target values refuse accessibly and recover', async () => {
    await build('3,1', '2');
    let s = await state();
    check(s.traceHidden && s.values === '3,1' && s.valuesInvalid === 'true' && s.focus === 'values', 'Unsorted input remains editable and is not silently sorted', s);
    check(s.error.includes('out of order') && s.disabled['download-trace'], 'Old trace cannot be exported after invalid build', s);
    await build('1,3', '2.5');
    s = await state();
    check(s.targetInvalid === 'true' && s.focus === 'target' && s.error.includes('whole integer'), 'Invalid target is identified and focused', s);
    await fill('#target', '2');
    await key('Enter', 'Enter', 13);
    await click('#last-step');
    s = await state();
    check(!s.traceHidden && s.error === '' && s.targetInvalid === null && s.valuesInvalid === null && s.bounds === '[1, 1)', 'Corrected input retries without stale errors', s);
    return { bounds: s.bounds, error: s.error, focus: s.focus };
  });
  await group('empty input yields one boundary, zero reads, and a correct saved trace', async () => {
    await build('', '7');
    const s = await state();
    check(s.count === '0 of 0 ordering comparisons' && s.bounds === '[0, 0)' && s.possible === '[0, 0]', 'Empty trace has no comparison', s);
    check(s.cells.length === 1 && s.cells[0].value === 'END' && s.cells[0].index === 'no element' && s.cells[0].classes.includes('result-cell'), 'Empty result is a boundary with no element', s.cells);
    check(!s.cells.some(cell => cell.classes.includes('middle')) && s.history.length === 0 && s.historyHidden, 'No empty-array read is invented');
    check(['first-step', 'previous-step', 'next-step', 'last-step'].every(id => s.disabled[id]) && !s.disabled['download-trace'], 'Empty trace is already finished but exportable', s.disabled);
    const expected = Buffer.from(JSON.stringify({
      format: 'recallweave.binary-search-trace/1', values: [], target: 7, steps: [],
      boundary: 0, present: false, comparisons: 0, enteredText: { values: '', target: '7' }
    }, null, 2) + '\n');
    return { state: s, saved: await savedDownload('#download-trace', 'binary-search-trace.json', expected) };
  });
  await group('after-array result never invents a value at the end boundary', async () => {
    await build('-2,0,6', '8');
    await click('#last-step');
    const s = await state();
    check(s.bounds === '[3, 3)' && s.possible === '[3, 3]' && s.count === '2 of 2 ordering comparisons', 'End boundary/count', s);
    check(s.cells.length === 4 && s.cells[3].classes.includes('result-cell') && s.cells[3].value === 'END' && s.cells[3].index === 'no element', 'End result must not render a nonexistent element', s.cells);
    check(s.membership === 'Target 8 is absent. Boundary 3 is after the final element.', 'End membership text', s.membership);
    check(!/\b(?:undefined|NaN)\b/.test(await evaluate('document.body.innerText')), 'No undefined or NaN value is exposed');
    return { bounds: s.bounds, membership: s.membership, end: s.cells[3] };
  });
  await group('390px layout contains array/table scrolling and keeps controls usable', async () => {
    await page('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
    await build(Array.from({ length: 32 }, (_, i) => i).join(','), '31');
    await click('#last-step');
    const layout = await evaluate('(() => {const a=document.getElementById("array"),h=document.querySelector(".history-scroll");'
      + 'return {width:innerWidth,documentWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,'
      + 'arrayClient:a.clientWidth,arrayScroll:a.scrollWidth,historyClient:h.clientWidth,historyScroll:h.scrollWidth,'
      + 'buttons:[...document.querySelectorAll(".step-controls button")].map(e=>{const r=e.getBoundingClientRect();return {id:e.id,x:r.x,width:r.width,height:r.height};})};})()');
    check(layout.width === 390 && layout.documentWidth <= 391 && layout.bodyWidth <= 391, 'No horizontal page overflow at 390px', layout);
    check(layout.arrayScroll > layout.arrayClient && layout.historyScroll > layout.historyClient, 'Wide data must scroll inside its own regions', layout);
    check(layout.buttons.every(b => b.x >= 0 && b.x + b.width <= 390 && b.height >= 44), 'Narrow buttons remain within viewport and touch-sized', layout.buttons);
    await click('#first-step');
    await tabTo('#array');
    const before = await evaluate('document.getElementById("array").scrollLeft');
    for (let i = 0; i < 8; i++) await key('ArrowRight', 'ArrowRight', 39);
    await delay(150);
    const after = await evaluate('document.getElementById("array").scrollLeft');
    check(after > before && await evaluate('scrollX') === 0, 'Keyboard horizontal scrolling stays in the array', { before, after });
    await click('#last-step');
    const shots = [
      await screenshot('mobile-390-trace.png', '#trace-view'),
      await screenshot('mobile-390-controls.png', '.step-controls')
    ];
    return { layout, keyboard_scroll: { before, after }, screenshots: shots };
  });
  await group('offline boundary and source integrity', async () => {
    check(report.page_errors.length === 0, 'No uncaught page exceptions', report.page_errors);
    const external = report.network_requests.filter(r => /^https?:/.test(r.url));
    check(external.length === 0, 'Standalone receiving must not attempt an HTTP request', external);
    const stores = await evaluate('({local:localStorage.length,session:sessionStorage.length,downloadAnchors:document.querySelectorAll("a[download]").length})');
    check(stores.local === 0 && stores.session === 0 && stores.downloadAnchors === 0, 'No learner persistence or temporary download anchor is left behind', stores);
    const after = await snapshot();
    check(JSON.stringify(after) === JSON.stringify(report.source_before), 'Every exercised source/course file must remain unchanged');
    report.source_after = after;
    return { stores, requests: report.network_requests, source_files_unchanged: after.length };
  });
  report.status = 'PASS';
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
