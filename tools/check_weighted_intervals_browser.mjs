#!/usr/bin/env node
/**
 * Optional direct-file check for the original weighted-intervals explorer.
 * Node 22+ and an installed Chromium-family browser; no npm dependency.
 * CDP transport follows the repository's existing browser-check convention.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {readFile, writeFile, mkdir, mkdtemp, rm, readdir} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const project = resolve(option('--root', join(dirname(fileURLToPath(import.meta.url)), '..')));
const executable = option('--browser', 'chromium');
const output = resolve(option('--output', join(project, 'weighted-intervals-browser-check')));
await mkdir(output, {recursive: true});
assert.deepEqual(await readdir(output), [], 'Use a new empty output directory; earlier receipts are preserved.');
const profile = await mkdtemp(join(output, 'profile-'));
const sourcePaths = [
  'courses/weighted-intervals-core.mjs', 'courses/weighted-intervals-ui.mjs',
  'courses/weighted-intervals-explorer.template.html', 'courses/weighted-intervals-explorer.html',
  'courses/weighted-interval-scheduling.json', 'courses/weighted-interval-scheduling.md',
  'tools/build_weighted_intervals_explorer.mjs', 'tools/check_weighted_intervals_browser.mjs',
  'tests/weighted-intervals.test.mjs', 'README.md'
];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const pins = async () => Object.fromEntries(await Promise.all(sourcePaths.map(async path => [path, hash(await readFile(join(project, path)))])));
const report = {
  format: 'recallweave-weighted-intervals-author-browser/1', status: 'running',
  started: new Date().toISOString(), node: process.version, project, executable,
  sourceSha256: await pins(), checks: [], captures: [], pageErrors: [], requests: []
};
let browser, socket, sessionId, sequence = 0, browserLog = '';
const pending = new Map();
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(check, label) {
  let last;
  for (let index = 0; index < 120; index++) {
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
  const response = await command('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true});
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text);
  return response.result.value;
}
async function key(name) {
  const codes = {Enter: 13, Tab: 9, Backspace: 8};
  assert.ok(Object.hasOwn(codes, name), 'Known keyboard command');
  for (const type of ['keyDown', 'keyUp']) await command('Input.dispatchKeyEvent', {
    type, key: name, code: name, windowsVirtualKeyCode: codes[name], nativeVirtualKeyCode: codes[name],
    ...(name === 'Enter' && type === 'keyDown' ? {text: '\r', unmodifiedText: '\r'} : {})
  });
}
async function activate(selector) {
  assert.equal(await evaluate('!!document.querySelector(' + JSON.stringify(selector) + ')'), true);
  assert.equal(await evaluate('document.querySelector(' + JSON.stringify(selector) + ').disabled'), false);
  await evaluate('document.querySelector(' + JSON.stringify(selector) + ').focus()');
  await key('Enter');
}
async function input(selector, text) {
  await evaluate('(()=>{const e=document.querySelector(' + JSON.stringify(selector) + ');e.focus();e.select();})()');
  if (text) await command('Input.insertText', {text});
  else await key('Backspace');
  assert.equal(await evaluate('document.querySelector(' + JSON.stringify(selector) + ').value'), text);
}
async function loadExample(name) {
  await evaluate('(()=>{const e=document.querySelector("#example");e.value=' + JSON.stringify(name) + ';e.dispatchEvent(new Event("change",{bubbles:true}));})()');
  await activate('#load-example');
}
const text = selector => evaluate('document.querySelector(' + JSON.stringify(selector) + ').textContent');
const field = (id, name) => '#activities input[data-id="' + id + '"][data-field="' + name + '"]';
async function state() {
  return evaluate('({row:document.querySelector("#row-position").textContent,best:document.querySelector("#best-value").textContent,selected:document.querySelector("#selected-activities").textContent,error:document.querySelector("#input-error").textContent,resultHidden:document.querySelector("#result-content").hidden,traceDisabled:document.querySelector("#download-trace").disabled,active:document.activeElement.id,activities:[...document.querySelectorAll("#activities input")].map(e=>({id:e.dataset.id,field:e.dataset.field,value:e.value}))})');
}
async function capture(name, selector) {
  if (selector) await evaluate('document.querySelector(' + JSON.stringify(selector) + ').scrollIntoView({block:"start"})');
  const {data} = await command('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false});
  const bytes = Buffer.from(data, 'base64');
  await writeFile(join(output, name), bytes, {flag: 'wx'});
  report.captures.push({path: name, bytes: bytes.length, sha256: hash(bytes), viewport: await evaluate('({width:innerWidth,height:innerHeight,scrollY})')});
}
const passed = name => { report.checks.push(name); console.log('PASS ' + name); };
const url = pathToFileURL(join(project, 'courses/weighted-intervals-explorer.html')).href;
try {
  browser = spawn(executable, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-background-networking',
    '--disable-component-update', '--disable-sync', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0',
    '--user-data-dir=' + profile, 'about:blank'
  ], {stdio: ['ignore', 'ignore', 'pipe']});
  browser.stderr.on('data', data => { browserLog = (browserLog + data.toString()).slice(-16000); });
  let launchError;
  browser.on('error', error => { launchError = error; });
  let port, endpoint;
  await waitFor(async () => {
    if (launchError) throw launchError;
    if (browser.exitCode !== null) throw new Error('Browser exited ' + browser.exitCode);
    [port, endpoint] = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).trim().split('\n');
    return Boolean(port && endpoint);
  }, 'isolated native browser startup');
  socket = new WebSocket('ws://127.0.0.1:' + port + endpoint);
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const entry = pending.get(message.id);
      if (!entry) return;
      pending.delete(message.id); clearTimeout(entry.timer);
      if (message.error) entry.reject(new Error(message.error.message)); else entry.resolve(message.result);
    } else if (message.method === 'Runtime.exceptionThrown') {
      report.pageErrors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
    } else if (message.method === 'Network.requestWillBeSent') report.requests.push(message.params.request.url);
  });
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, {once: true});
    socket.addEventListener('error', reject, {once: true});
  });
  report.browser = await command('Browser.getVersion', {}, false);
  const {targetId} = await command('Target.createTarget', {url: 'about:blank'}, false);
  ({sessionId} = await command('Target.attachToTarget', {targetId, flatten: true}, false));
  await command('Page.enable'); await command('Runtime.enable'); await command('Network.enable');
  await command('Network.setBlockedURLs', {urls: ['http://*', 'https://*', 'ws://*', 'wss://*']});
  await command('Emulation.setDeviceMetricsOverride', {width: 1360, height: 1100, deviceScaleFactor: 1, mobile: false});
  await command('Page.navigate', {url});
  await waitFor(() => evaluate('document.readyState==="complete"&&document.querySelectorAll("#dp-rows tr").length===7'), 'offline explorer startup');
  assert.equal(await text('#row-position'), 'Row 0 of 6');
  assert.equal(await text('#best-value'), '0');
  assert.equal(await text('#selected-activities'), 'None');
  assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'), false);
  await activate('#show-result');
  assert.equal(await text('#best-value'), '15');
  assert.equal(await text('#selected-activities'), 'D + F');
  assert.equal(await text('#greedy-value'), '12');
  await capture('01-default-wide.png');
  passed('offline startup and real keyboard activation show the complete value-15 schedule');

  await loadExample('touching');
  await activate('#show-result');
  assert.equal(await text('#selected-activities'), 'A + B');
  assert.equal(await text('#best-value'), '7');
  await input(field('B', 'start'), '1');
  assert.equal((await state()).resultHidden, true);
  assert.equal((await state()).traceDisabled, true);
  await activate('#solve'); await activate('#show-result');
  assert.equal(await text('#selected-activities'), 'C');
  assert.equal(await text('#best-value'), '6');
  passed('trusted field editing invalidates the prior result and changed endpoint compatibility is recomputed');

  await loadExample('tie');
  await activate('#show-result'); await activate('#trace-choices');
  assert.match(await text('#backtrack-steps'), /skip B.*tie keeps the earlier prefix/);
  await activate('#next-choice');
  assert.equal(await text('#selected-activities'), 'C');
  assert.equal(await text('#best-value'), '4');
  assert.match(await text('#trace-result'), /Selected: C\. Total value: 4/);
  assert.equal(await evaluate('document.querySelector("#next-choice").disabled'), true);
  await capture('02-tie-backtrack-wide.png', '#table-title');
  passed('the equal-alternative preset explains a skipped tie and reconstructs exactly one optimum');

  await loadExample('empty');
  assert.equal(await text('#row-position'), 'Row 0 of 0');
  assert.equal(await text('#best-value'), '0');
  assert.equal(await evaluate('document.querySelector("#next-row").disabled'), true);
  await activate('#trace-choices');
  assert.equal(await evaluate('document.querySelectorAll("#backtrack-steps li").length'), 0);
  assert.match(await text('#trace-result'), /Selected: none\. Total value: 0/);
  for (let index = 0; index < 8; index++) await activate('#add-activity');
  assert.deepEqual(await evaluate('[...document.querySelectorAll("#activities input[data-field=start]")].map(e=>e.dataset.id)'), [...'ABCDEFGH']);
  assert.equal(await evaluate('document.querySelector("#add-activity").disabled'), true);
  assert.equal(await evaluate('document.activeElement.id'), 'activity-H-start');
  await activate('button[data-remove="D"]');
  assert.equal(await evaluate('document.activeElement.id'), 'activity-E-start');
  assert.equal(await evaluate('document.querySelector("#add-activity").disabled'), false);
  await activate('#add-activity');
  assert.equal(await evaluate('document.activeElement.id'), 'activity-D-start');
  assert.equal(await evaluate('document.querySelector("#add-activity").disabled'), true);
  for (const id of ['B', 'C', 'E', 'F', 'G', 'H', 'D']) await activate('button[data-remove="' + id + '"]');
  assert.equal(await evaluate('document.querySelectorAll("#activities input").length'), 3);
  assert.equal(await evaluate('document.activeElement.id'), 'activity-A-start');
  passed('empty solving, eight-activity bounds, ID reuse and remove/add keyboard focus remain coherent');

  await input(field('A', 'start'), '23');
  await input(field('A', 'end'), '24');
  await input(field('A', 'value'), '99');
  await activate('#solve');
  assert.equal(await evaluate('document.activeElement.id'), 'table-title');
  await activate('#show-result');
  assert.equal(await text('#best-value'), '99');
  assert.equal(await text('#selected-activities'), 'A');
  await input(field('A', 'value'), '');
  await activate('#solve');
  assert.equal(await evaluate('document.activeElement.id'), 'input-error');
  assert.equal(await evaluate('document.querySelector(' + JSON.stringify(field('A', 'value')) + ').getAttribute("aria-invalid")'), 'true');
  assert.equal(await evaluate('document.querySelector(' + JSON.stringify(field('A', 'value')) + ').value'), '');
  assert.match(await text('#input-error'), /A value needs a whole number from 0 to 99/);
  assert.equal((await state()).resultHidden, true);
  assert.equal((await state()).traceDisabled, true);
  assert.equal(await evaluate('document.querySelector("#download-course").disabled'), false);
  await input(field('A', 'value'), '99');
  await activate('#solve');
  assert.equal(await text('#row-position'), 'Row 0 of 1');
  assert.equal(await evaluate('document.querySelector("#input-error").hidden'), true);
  await activate('#show-result');
  report.recoveredDraft = await state();
  passed('invalid blank values keep the draft, mark and focus the error, prevent stale traces and recover explicitly');

  await command('Emulation.setDeviceMetricsOverride', {width: 390, height: 844, deviceScaleFactor: 1, mobile: false});
  await waitFor(() => evaluate('Math.abs(document.querySelector("#timeline").viewBox.baseVal.width-document.querySelector("#timeline").getBoundingClientRect().width)<1.1'), 'responsive timeline redraw');
  assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'), false);
  const geometry = await evaluate('(()=>{const s=document.querySelector("#timeline"),b=s.querySelector("rect"),r=s.getBoundingClientRect();return {width:r.width,viewBox:s.getAttribute("viewBox"),x:Number(b.getAttribute("x")),barWidth:Number(b.getAttribute("width")),labels:[...s.querySelectorAll("text")].map(e=>e.textContent),tableScrollable:document.querySelector(".table-wrap").scrollWidth>document.querySelector(".table-wrap").clientWidth,fields:[...document.querySelectorAll("#activities input")].map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}))};})()');
  const viewWidth = Number(geometry.viewBox.split(' ')[2]);
  assert.ok(Math.abs(geometry.barWidth - (viewWidth - 87) / 24) < 0.01);
  assert.ok(Math.abs(geometry.x - (70 + 23 * (viewWidth - 87) / 24)) < 0.01);
  assert.ok(geometry.labels.includes('24') && geometry.labels.includes('A · 99'));
  assert.equal(geometry.tableScrollable, true);
  assert.ok(geometry.fields.every(field => field.width > 35 && field.height >= 44));
  report.compactGeometry = geometry;
  await capture('03-boundary-compact.png', '#table-title');
  passed('390px layout retains a readable 0–24 scale, finite interval geometry and locally scrolling table without page overflow');

  await command('Page.reload', {ignoreCache: true});
  await waitFor(() => evaluate('document.querySelector("#row-position")?.textContent==="Row 0 of 6"'), 'reload starts a fresh draft');
  assert.equal(await evaluate('document.querySelector(' + JSON.stringify(field('D', 'value')) + ').value'), '10');
  assert.equal(await text('#best-value'), '0');
  assert.equal(await text('#selected-activities'), 'None');
  assert.deepEqual(report.pageErrors, []);
  assert.deepEqual(report.requests.filter(url => /^(https?|wss?):/i.test(url)), []);
  assert.deepEqual(await pins(), report.sourceSha256);
  passed('reload clears tab-only state; product source is unchanged and the page makes no external requests or runtime errors');
  report.status = 'passed';
} catch (error) {
  report.status = 'failed'; report.error = error.stack || String(error); process.exitCode = 1;
  if (socket && sessionId) {
    try { report.failureState = await state(); await capture('failure.png'); }
    catch (captureError) { report.captureError = String(captureError); }
  }
  console.error(report.error);
} finally {
  report.finished = new Date().toISOString();
  try {
    report.sourceAfter = await pins();
    report.sourceUnchanged = JSON.stringify(report.sourceAfter) === JSON.stringify(report.sourceSha256);
    await writeFile(join(output, 'browser.log'), browserLog, {flag: 'wx'});
    await writeFile(join(output, 'receipt.json'), JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  } catch (error) {
    process.exitCode = 1; console.error('Could not preserve browser evidence: ' + String(error));
  } finally {
    if (socket) { try { await command('Browser.close', {}, false); } catch {} socket.close(); }
    if (browser && browser.exitCode === null) { browser.kill(); await pause(300); }
    for (const entry of pending.values()) { clearTimeout(entry.timer); entry.reject(new Error('Browser check finished.')); }
    pending.clear();
    await rm(profile, {recursive: true, force: true});
  }
  console.log(JSON.stringify({status: report.status, checks: report.checks.length, output}));
}
