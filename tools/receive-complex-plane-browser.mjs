#!/usr/bin/env node
/**
 * Optional native browser receiving for the new complex-plane lab.
 * Requires Node with built-in WebSocket (the received route uses Node 26)
 * and an existing Chrome executable. Installs nothing.
 *
 * node tools/receive-complex-plane-browser.mjs --chrome /path/to/chrome \
 *   --source /path/to/RecallWeave --output /new/private/receipt-directory \
 *   [--baseline /path/to/baseline --base-manifest /path/to/manifest.json]
 *
 * Uses a private headless profile and file URLs; blocks page HTTP(S).
 * The focused independent math and existing learner journeys are separate.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const { values } = parseArgs({ options: {
  chrome: { type: 'string' }, source: { type: 'string' }, output: { type: 'string' },
  baseline: { type: 'string' }, 'base-manifest': { type: 'string' },
}});
if (!values.chrome || !values.output || typeof WebSocket !== 'function') {
  throw new Error('Supply --chrome and a new --output directory; use Node with built-in WebSocket.');
}
const sourceRoot = await fs.realpath(values.source || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
const outputRoot = path.resolve(values.output);
await fs.mkdir(outputRoot);
const downloadRoot = path.join(outputRoot, 'downloads');
const profileRoot = path.join(outputRoot, 'private-profile');
await fs.mkdir(downloadRoot);
await fs.mkdir(profileRoot);
const sha = b => createHash('sha256').update(b).digest('hex');
async function pin(filename, label = filename) {
  const b = await fs.readFile(filename);
  const stat = await fs.stat(filename);
  return { path: label, bytes: b.length, sha256: sha(b),
    git_blob: createHash('sha1').update('blob ' + b.length + '\0').update(b).digest('hex'),
    mode: stat.mode & 0o111 ? '100755' : '100644' };
}
const sourcePaths = [
  'courses/complex-plane.json', 'courses/complex-plane.md',
  'src/complex-plane.mjs', 'src/complex-plane-ui.mjs',
  'templates/complex-plane-lab.html', 'courses/complex-plane-lab.html',
  'tools/build-complex-plane.mjs', 'tools/receive-complex-plane-browser.mjs',
  'tests/complex-plane.test.mjs', 'tests/complex-plane-course.test.mjs',
];
const before = await Promise.all(sourcePaths.map(p => pin(path.join(sourceRoot, p), p)));
const receipt = {
  schema: 'recallweave.complex-plane.browser-receiving/1',
  started_at: new Date().toISOString(), author: 'chatgpt-31366547c1f5/local_state',
  scope: 'Author integration smoke; independent math and learner receiving remain separate.',
  source_root: sourceRoot, baseline_root: values.baseline || null,
  node: { version: process.version, executable: process.execPath },
  chrome: values.chrome, file_only: true, source_before: before, groups: [],
  page_errors: [], page_network_requests: [], downloads: [], screenshots: [], status: 'running',
};
async function originalPins() {
  if (!values['base-manifest']) return null;
  const manifest = JSON.parse(await fs.readFile(values['base-manifest'], 'utf8'));
  const roots = [sourceRoot, ...(values.baseline ? [values.baseline] : [])];
  for (const root of roots) for (const item of manifest) {
    const p = await pin(path.join(root, item.path), item.path);
    assert.equal(p.sha256, item.sha256, 'Original input bytes changed: ' + root + '/' + item.path);
    assert.equal(p.git_blob, item.git_blob, 'Original Git blob differs: ' + item.path);
    assert.equal(p.bytes, item.bytes, 'Original input size differs: ' + item.path);
    assert.equal(p.mode, item.mode, 'Original mode differs: ' + item.path);
  }
  return { manifest: await pin(values['base-manifest']), files_per_root: manifest.length, roots, preserved: true };
}
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(fn, label, limit = 12000) {
  const start = Date.now();
  let last;
  do {
    last = await fn();
    if (last) return last;
    await delay(50);
  } while (Date.now() - start < limit);
  throw new Error('Timed out: ' + label);
}
let browser = null, connection = null, sessionId = null, exitPromise = null, closed = false;
let stderr = '', stdout = '';
let fatal = null;
async function group(name, fn) {
  const started = Date.now();
  try {
    const details = await fn();
    receipt.groups.push({ name, status: 'passed', elapsed_ms: Date.now() - started, details });
  } catch (error) {
    receipt.groups.push({ name, status: 'failed', elapsed_ms: Date.now() - started,
      error: { name: error.name, message: error.message, stack: error.stack } });
    throw error;
  }
}
function makeConnection(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url), pending = new Map();
    let sequence = 0;
    socket.addEventListener('error', reject, { once: true });
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const waiter = pending.get(message.id);
        if (!waiter) return;
        pending.delete(message.id); clearTimeout(waiter.timeout);
        if (message.error) waiter.reject(new Error(message.error.message));
        else waiter.resolve(message.result);
      } else {
        if (message.method === 'Runtime.exceptionThrown') receipt.page_errors.push(message.params.exceptionDetails);
        if (message.method === 'Network.requestWillBeSent') {
          const url = message.params.request.url;
          if (/^https?:/.test(url)) receipt.page_network_requests.push(url);
        }
        if (message.method === 'Browser.downloadWillBegin') receipt.downloads.push({
          guid: message.params.guid, suggested_filename: message.params.suggestedFilename, state: 'begun',
        });
        if (message.method === 'Browser.downloadProgress') {
          const item = receipt.downloads.find(x => x.guid === message.params.guid);
          if (item) { item.state = message.params.state; item.received_bytes = message.params.receivedBytes; }
        }
      }
    });
    socket.addEventListener('close', () => {
      for (const waiter of pending.values()) { clearTimeout(waiter.timeout); waiter.reject(new Error('Browser connection closed.')); }
      pending.clear();
    });
    socket.addEventListener('open', () => resolve({
      send(method, params = {}, session) {
        return new Promise((resolveCommand, rejectCommand) => {
          const id = ++sequence;
          const timeout = setTimeout(() => { pending.delete(id); rejectCommand(new Error('CDP timeout: ' + method)); }, 10000);
          pending.set(id, { resolve: resolveCommand, reject: rejectCommand, timeout });
          socket.send(JSON.stringify({ id, method, params, ...(session ? { sessionId: session } : {}) }));
        });
      },
      close() { socket.close(); },
    }), { once: true });
  });
}
const send = (method, params = {}) => connection.send(method, params, sessionId);
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text + ': ' + (result.exceptionDetails.exception?.description || ''));
  return result.result.value;
}
async function click(id) {
  const box = await evaluate('(() => { const e=document.getElementById(' + JSON.stringify(id) +
    '); e.scrollIntoView({block:"center"}); const b=e.getBoundingClientRect(); return {x:b.x+b.width/2,y:b.y+b.height/2}; })()');
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...box });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...box });
}
async function type(id, value) {
  await evaluate('(() => { const e=document.getElementById(' + JSON.stringify(id) + '); e.focus(); e.select(); })()');
  if (value) await send('Input.insertText', { text: value });
  else {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
  }
}
async function configure(values) {
  for (const [id, value] of Object.entries(values)) {
    if (id === 'complex-steps') await evaluate('(() => { const e=document.getElementById("complex-steps"); e.value=' +
      JSON.stringify(value) + ';e.dispatchEvent(new Event("change",{bubbles:true})); })()');
    else await type(id, value);
  }
}
async function state() {
  return evaluate('({hidden:document.getElementById("complex-results").hidden,disabled:document.getElementById("complex-experiment-download").disabled,' +
    'rows:document.querySelectorAll("#complex-points tr").length,status:document.getElementById("complex-status").textContent,' +
    'focused:document.activeElement.id,product:document.getElementById("complex-product").textContent})');
}
async function downloaded(name) {
  await until(() => receipt.downloads.some(d => d.suggested_filename === name && d.state === 'completed'), 'physical download ' + name);
  const filename = path.join(downloadRoot, name);
  await until(async () => { try { return (await fs.stat(filename)).size > 0; } catch { return false; } }, 'download bytes ' + name);
  return filename;
}
async function capture(name, width, height) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 760 });
  await evaluate('window.scrollTo(0,0)');
  await delay(80);
  const metrics = await send('Page.getLayoutMetrics');
  const geometry = await evaluate('(() => {const p=document.getElementById("complex-plot").getBoundingClientRect(),t=document.querySelector(".table-scroll"),h=document.getElementById("complex-scroll-help");return {viewport:innerWidth,body:document.documentElement.scrollWidth,plot:{width:p.width,height:p.height},table:{client:t.clientWidth,scroll:t.scrollWidth},hint_visible:getComputedStyle(h).display!=="none"};})()');
  assert.ok(geometry.body <= width + 1, 'The page must not overflow horizontally');
  assert.ok(Math.abs(geometry.plot.width - geometry.plot.height) < 1, 'The rendered plot must remain square');
  if (width < 760) assert.equal(geometry.hint_visible, true);
  const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true,
    clip: { x: 0, y: 0, width, height: Math.ceil(metrics.cssContentSize.height), scale: 1 } });
  const filename = path.join(outputRoot, name + '.png');
  await fs.writeFile(filename, Buffer.from(screenshot.data, 'base64'), { flag: 'wx' });
  receipt.screenshots.push({ ...await pin(filename, name + '.png'), geometry });
  return geometry;
}

try {
  receipt.original_inputs_before = await originalPins();
  await group('unchanged baseline has no complex course or lab entrypoint', async () => {
    if (!values.baseline) return { status: 'not_requested' };
    for (const filename of ['courses/complex-plane.json', 'courses/complex-plane-lab.html']) {
      await assert.rejects(fs.stat(path.join(values.baseline, filename)), { code: 'ENOENT' });
    }
    return { paths_absent: ['courses/complex-plane.json', 'courses/complex-plane-lab.html'],
      interpretation: 'The retained exact partial baseline has no authored entrypoint; complete primary-tree absence was separately established before implementation. This is not a baseline browser journey.' };
  });
  const argv = ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--disable-background-networking', '--disable-component-update', '--disable-default-apps', '--disable-sync',
    '--metrics-recording-only', '--disable-features=MediaRouter,OptimizationHints,AutofillServerCommunication',
    '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0',
    '--user-data-dir=' + profileRoot, '--window-size=1440,1100', 'about:blank'];
  receipt.chrome_argv = argv;
  browser = spawn(values.chrome, argv, { stdio: ['ignore', 'pipe', 'pipe'] });
  exitPromise = new Promise(resolve => {
    browser.once('exit', (code, signal) => { closed = true; resolve({ code, signal }); });
    browser.once('error', error => { closed = true; resolve({ error: error.message }); });
  });
  browser.stdout.on('data', d => { stdout += d; });
  browser.stderr.on('data', d => { stderr += d; });
  const activePort = await until(async () => {
    try { const lines = (await fs.readFile(path.join(profileRoot, 'DevToolsActivePort'), 'utf8')).trim().split('\n');
      return lines.length >= 2 ? lines : false; } catch { return false; }
  }, 'private Chrome debugging endpoint');
  connection = await makeConnection('ws://127.0.0.1:' + activePort[0] + activePort[1]);
  receipt.browser_version = await connection.send('Browser.getVersion');
  const target = await connection.send('Target.createTarget', { url: 'about:blank' });
  sessionId = (await connection.send('Target.attachToTarget', { targetId: target.targetId, flatten: true })).sessionId;
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Network.setBlockedURLs', { urls: ['http://*', 'https://*'] });
  await connection.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadRoot, eventsEnabled: true });
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await group('standalone file opens without a server and requires explicit calculation', async () => {
    const url = pathToFileURL(path.join(sourceRoot, 'courses/complex-plane-lab.html')).href;
    const navigation = await send('Page.navigate', { url });
    assert.equal(navigation.errorText, undefined);
    await until(() => evaluate('document.readyState === "complete" && document.getElementById("complex-status")?.textContent.includes("Choose Calculate")'), 'mounted local lab');
    const current = await state();
    assert.equal(current.hidden, true); assert.equal(current.disabled, true); assert.equal(current.rows, 0);
    return { url, ...current };
  });
  await group('keyboard calculation presents the current author example', async () => {
    await configure({ 'z-re': '2', 'z-im': '3', 'w-re': '4', 'w-im': '-1', 'complex-steps': '3' });
    await evaluate('document.getElementById("w-im").focus()');
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r' });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    const current = await state();
    assert.equal(current.hidden, false); assert.equal(current.disabled, false); assert.equal(current.rows, 4);
    assert.equal(current.product, '11 + 10i'); assert.equal(current.focused, 'complex-result-title');
    return current;
  });
  await group('physical lesson and experiment downloads retain exact accepted content', async () => {
    await click('complex-experiment-download');
    const experimentPath = await downloaded('complex-multiplication-experiment.json');
    const experiment = JSON.parse(await fs.readFile(experimentPath, 'utf8'));
    assert.equal(experiment.format, 'recallweave-complex-multiplication/1');
    assert.deepEqual(experiment.inputs, { z: { re: '2', im: '3' }, w: { re: '4', im: '-1' }, steps: 3 });
    assert.deepEqual(experiment.points.map(p => [p.re, p.im]), [[2, 3], [11, 10], [54, 29], [245, 62]]);
    const shownModulus = await evaluate('document.querySelector("#complex-points tr td:nth-child(4)").textContent');
    assert.equal(experiment.points[0].modulus, Math.hypot(2, 3));
    assert.notEqual(Number(shownModulus), experiment.points[0].modulus, 'The saved numeric modulus must not be rounded table text');
    await click('complex-deck-download');
    const coursePath = await downloaded('complex-plane.json');
    const sourceBytes = await fs.readFile(path.join(sourceRoot, 'courses/complex-plane.json'));
    assert.deepEqual(await fs.readFile(coursePath), sourceBytes);
    return { experiment: await pin(experimentPath), lesson: await pin(coursePath), shown_modulus: shownModulus,
      saved_modulus: experiment.points[0].modulus, lesson_items: JSON.parse(sourceBytes).items.length };
  });
  await group('editing retires the result and invalid input refuses without stale output', async () => {
    await type('z-re', '');
    let current = await state();
    assert.equal(current.hidden, true); assert.equal(current.disabled, true); assert.equal(current.rows, 0);
    await click('complex-calculate');
    current = await state();
    assert.match(current.status, /plain decimal/); assert.equal(current.hidden, true); assert.equal(current.disabled, true);
    assert.equal(current.focused, 'complex-status'); assert.equal(current.rows, 0);
    return current;
  });
  await group('recovery works and eventless draft changes cannot export the old calculation', async () => {
    await type('z-re', '2'); await click('complex-calculate');
    assert.equal((await state()).rows, 4);
    const downloadsBefore = receipt.downloads.length;
    const filesBefore = await fs.readdir(downloadRoot);
    await evaluate('document.getElementById("z-re").value = "3"');
    await click('complex-experiment-download');
    await delay(160);
    const current = await state();
    assert.equal(current.hidden, true); assert.equal(current.disabled, true); assert.equal(current.rows, 0);
    assert.match(current.status, /Calculate products before downloading/);
    assert.equal(receipt.downloads.length, downloadsBefore);
    assert.deepEqual(await fs.readdir(downloadRoot), filesBefore);
    return { ...current, downloads_before: downloadsBefore, downloads_after: receipt.downloads.length };
  });
  await group('preset requires a new calculation and desktop/mobile layouts retain local scrolling', async () => {
    await evaluate('document.querySelector("[data-complex-preset=growth]").id = "receiving-preset"');
    await click('receiving-preset');
    let current = await state();
    assert.equal(current.hidden, true); assert.equal(current.disabled, true); assert.equal(current.rows, 0);
    assert.equal(current.focused, 'complex-calculate');
    await configure({ 'z-re': '2', 'z-im': '3', 'w-re': '4', 'w-im': '-1', 'complex-steps': '3' });
    await click('complex-calculate');
    const desktop = await capture('desktop-current-experiment', 1440, 1100);
    const mobile = await capture('mobile-current-experiment', 390, 844);
    return { desktop, mobile };
  });
  await group('page makes no HTTP requests or persistent local state and preserves all source bytes', async () => {
    assert.deepEqual(receipt.page_errors, []);
    assert.deepEqual(receipt.page_network_requests, []);
    const storage = await evaluate('(async () => ({localStorage:localStorage.length,sessionStorage:sessionStorage.length,indexedDB:(await indexedDB.databases()).length}))()');
    assert.deepEqual(storage, { localStorage: 0, sessionStorage: 0, indexedDB: 0 });
    const after = await Promise.all(sourcePaths.map(p => pin(path.join(sourceRoot, p), p)));
    assert.deepEqual(after, before);
    receipt.source_after = after;
    receipt.original_inputs_after = await originalPins();
    return { storage, preserved_source_files: after.length, blocked_page_schemes: ['http', 'https'] };
  });
  receipt.status = 'passed';
} catch (error) {
  fatal = error;
  receipt.status = 'failed';
  receipt.failure = { name: error.name, message: error.message, stack: error.stack };
} finally {
  if (connection && !closed) {
    try { await connection.send('Browser.close'); } catch {}
  }
  if (exitPromise) receipt.browser_exit = await Promise.race([exitPromise, delay(5000).then(() => ({ status: 'still_running' }))]);
  if (connection) connection.close();
  if (closed) {
    await fs.rm(profileRoot, { recursive: true, force: true });
    receipt.private_profile = 'Removed only this receiver-owned profile after its Chrome process exited; downloads and evidence retained.';
  } else receipt.private_profile = 'Retained; browser exit was not confirmed.';
  await fs.writeFile(path.join(outputRoot, 'chrome.stdout'), stdout, { flag: 'wx' });
  await fs.writeFile(path.join(outputRoot, 'chrome.stderr'), stderr, { flag: 'wx' });
  receipt.chrome_stdout = await pin(path.join(outputRoot, 'chrome.stdout'), 'chrome.stdout');
  receipt.chrome_stderr = await pin(path.join(outputRoot, 'chrome.stderr'), 'chrome.stderr');
  receipt.finished_at = new Date().toISOString();
  await fs.writeFile(path.join(outputRoot, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ status: receipt.status, groups: receipt.groups.map(g => ({ name: g.name, status: g.status })),
    failure: receipt.failure || null, receipt: await pin(path.join(outputRoot, 'receipt.json')), browser_exit: receipt.browser_exit,
    screenshots: receipt.screenshots, downloads: receipt.downloads }));
  if (fatal) process.exitCode = 1;
}
