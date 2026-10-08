#!/usr/bin/env node
/** Receive the bounded SQL teaching page in one existing, isolated Chromium process. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const root = resolve(option('--root', join(dirname(fileURLToPath(import.meta.url)), '..')));
const executable = option('--browser', 'chromium');
const output = resolve(option('--output', join(root, 'sql-browser-receiving')));
await mkdir(output); // Refuse to reuse another run's output or profile.
const downloadPath = join(output, 'downloads'); await mkdir(downloadPath);
const profile = await mkdtemp(join(output, 'profile-'));
const report = {status:'running', root, executable, checks:[], screenshots:[], downloads:[]};
const paths = ['src/deck.mjs', 'src/knowledge.mjs', 'src/review.mjs', 'src/answer-order.mjs', 'src/session-export.mjs',
  'courses/sql-query-foundations.source.json', 'courses/sql-query-foundations.json', 'courses/sql-query-foundations.md',
  'courses/sql-query-explorer.template.html', 'courses/sql-query-explorer.html',
  'tools/make_sql_query_explorer.py', 'tools/check_sql_query_browser.mjs', 'tests/sql-query-foundations.test.mjs'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
async function sourcePins() { return Object.fromEntries(await Promise.all(paths.map(async path => [path, sha(await readFile(join(root, path)))]))); }
report.before = await sourcePins();
const html = await readFile(join(root, 'courses/sql-query-explorer.html'), 'utf8');
const embedded = id => JSON.parse(html.match(new RegExp(`<script id="${id}" type="application/json">([\\s\\S]*?)</script>`))[1]);
const catalog = embedded('sql-catalog');
const course = await readFile(join(root, 'courses/sql-query-foundations.json'));
const practice = Buffer.from(embedded('sql-practice'));
const {parseDeck} = await import(pathToFileURL(join(root, 'src/deck.mjs')));
const downloads = new Map();
const pageErrors = [];
const pageRequests = [];
let browser, socket, sessionId, serverClosed = false, sequence = 0, browserLog = '';
const pending = new Map();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const server = createServer((request, response) => {
  if (new URL(request.url, 'http://localhost').pathname !== '/sql-query-explorer.html') { response.writeHead(404).end(); return; }
  response.writeHead(200, {'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'no-store'}).end(html);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
async function waitFor(check, label) {
  let last;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if (await check()) return; } catch (error) { last = error; }
    await sleep(80);
  }
  throw new Error(`Timed out: ${label}${last ? ` (${last.message})` : ''}`);
}
function command(method, params = {}, scoped = true) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
    pending.set(id, {resolve, reject, timer});
    socket.send(JSON.stringify({id, method, params, ...(scoped && sessionId ? {sessionId} : {})}));
  });
}
async function evaluate(expression) {
  const result = await command('Runtime.evaluate', {expression, returnByValue:true, awaitPromise:true});
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  return result.result.value;
}
async function key(key, shift = false) {
  const codes = {Enter:13, Tab:9, ArrowDown:40, ArrowUp:38, ArrowRight:39, Home:36, End:35};
  for (const type of ['keyDown', 'keyUp']) await command('Input.dispatchKeyEvent', {
    type, key, code:key, windowsVirtualKeyCode:codes[key], nativeVirtualKeyCode:codes[key], modifiers:shift ? 8 : 0,
    ...(key === 'Enter' && type === 'keyDown' ? {text:'\r', unmodifiedText:'\r'} : {})
  });
}
async function activate(id) { await evaluate(`document.getElementById(${JSON.stringify(id)}).focus()`); await key('Enter'); }
async function select(id, value) {
  await evaluate(`(() => { const el = document.getElementById(${JSON.stringify(id)}); el.value = ${JSON.stringify(value)}; el.dispatchEvent(new Event('change', {bubbles:true})); })()`);
  assert.equal(await evaluate(`document.getElementById(${JSON.stringify(id)}).value`), value);
}
async function navigate(url, width = 1280, height = 1150) {
  await command('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor:1, mobile:false});
  await command('Page.navigate', {url});
  await waitFor(() => evaluate(`document.URL === ${JSON.stringify(url)} && document.readyState === 'complete' && document.documentElement.dataset.ready === 'true'`), 'prepared page');
}
const passed = name => { report.checks.push(name); console.log(`PASS ${name}`); };
async function screenshot(name, id) {
  if (id) await evaluate(`document.getElementById(${JSON.stringify(id)}).scrollIntoView({block:'start'})`);
  const {data} = await command('Page.captureScreenshot', {format:'png', captureBeyondViewport:false});
  const bytes = Buffer.from(data, 'base64'); await writeFile(join(output, name), bytes);
  report.screenshots.push({name, sha256:sha(bytes), bytes:bytes.length});
}
async function receiveVariant(lesson, variant) {
  await select('example', lesson.id);
  if (variant.threshold !== undefined) await select('threshold', String(variant.threshold));
  if (variant.placement) await select('placement', variant.placement);
  assert.equal(await evaluate(`document.getElementById('query').textContent`), variant.sql);
  assert.equal(await evaluate(`document.getElementById('result-panel').hidden`), true);
  await activate('reveal-result');
  const actual = await evaluate(`({columns:[...document.querySelectorAll('#result-table th')].map(cell=>cell.textContent),
    rows:[...document.querySelectorAll('#result-table tbody tr')].map(row=>[...row.cells].map(cell=>cell.textContent)),
    count:document.getElementById('result-count').textContent,
    explanation:document.getElementById('explanation').textContent, hidden:document.getElementById('result-panel').hidden})`);
  assert.deepEqual(actual.columns, variant.columns);
  assert.deepEqual(actual.rows, variant.rows.map(row => row.map(value => value === null ? 'NULL' : String(value))));
  assert.equal(actual.count, `${variant.rows.length} result ${variant.rows.length === 1 ? 'row' : 'rows'}`);
  assert.equal(actual.explanation, variant.explanation); assert.equal(actual.hidden, false);
}
async function receiveDownload(id, expectedName, expectedBytes, name) {
  const before = new Set(downloads.keys());
  await activate(id);
  let value;
  await waitFor(() => { value = [...downloads.values()].find(value => !before.has(value.guid) && value.state === 'completed'); return Boolean(value); }, name);
  assert.equal(value.suggestedFilename, expectedName);
  const bytes = await readFile(join(downloadPath, value.guid));
  assert.deepEqual(bytes, expectedBytes);
  if (id === 'download-course') assert.equal(parseDeck(bytes.toString('utf8')).items.length, 12);
  report.downloads.push({name, suggestedFilename:value.suggestedFilename, sha256:sha(bytes), bytes:bytes.length});
}
async function closeServer() {
  if (serverClosed) return;
  server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); serverClosed = true;
}
function waitForBrowserExit(milliseconds) {
  if (!browser || browser.exitCode !== null || browser.signalCode !== null) return Promise.resolve(true);
  return new Promise(resolve => {
    const finish = () => { clearTimeout(timer); browser.off('exit', finish); resolve(true); };
    const timer = setTimeout(() => { browser.off('exit', finish); resolve(false); }, milliseconds);
    browser.once('exit', finish);
  });
}

try {
  browser = spawn(executable, ['--headless=new', '--disable-gpu', '--disable-background-networking', '--disable-component-update',
    '--disable-sync', '--disable-extensions', '--password-store=basic', '--no-first-run', '--no-default-browser-check', '--remote-debugging-address=127.0.0.1',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], {stdio:['ignore', 'ignore', 'pipe']});
  browser.stderr.on('data', bytes => { browserLog = (browserLog + bytes.toString()).slice(-6000); });
  // Match the established native Chromium receiver: use this child's local endpoint
  // and allow the existing Snap/browser runtime to finish its first startup.
  const endpoint = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Chromium startup timed out: ${browserLog}`)), 45000);
    browser.on('error', error => { clearTimeout(timer); reject(error); });
    browser.on('exit', code => { clearTimeout(timer); reject(new Error(`Chromium exited ${code}: ${browserLog}`)); });
    browser.stderr.on('data', () => {
      const found = browserLog.match(/DevTools listening on (ws:\/\/127\.0\.0\.1:[^\s]+)/);
      if (found) { clearTimeout(timer); resolve(found[1]); }
    });
  });
  socket = new WebSocket(endpoint);
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const request = pending.get(message.id); if (!request) return;
      pending.delete(message.id); clearTimeout(request.timer);
      if (message.error) request.reject(new Error(message.error.message)); else request.resolve(message.result);
    } else if (message.method === 'Browser.downloadWillBegin' || message.method === 'Browser.downloadProgress') {
      const value = message.params; downloads.set(value.guid, {...downloads.get(value.guid), ...value});
    } else if (message.method === 'Runtime.exceptionThrown') pageErrors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
    else if (message.method === 'Network.requestWillBeSent') pageRequests.push(message.params.request.url);
  });
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, {once:true}); socket.addEventListener('error', reject, {once:true}); });
  report.browser = await command('Browser.getVersion', {}, false);
  await command('Browser.setDownloadBehavior', {behavior:'allowAndName', downloadPath, eventsEnabled:true}, false);
  const {targetId} = await command('Target.createTarget', {url:'about:blank'}, false);
  ({sessionId} = await command('Target.attachToTarget', {targetId, flatten:true}, false));
  for (const method of ['Page.enable', 'Runtime.enable', 'Network.enable']) await command(method);
  await command('Network.setCacheDisabled', {cacheDisabled:true});
  await navigate(`${base}/sql-query-explorer.html`);
  assert.equal(await evaluate(`document.querySelectorAll('#example option').length`), 12);
  const inputs = await evaluate(`[...document.querySelectorAll('#input-tables table')].map(table=>[...table.tBodies[0].rows].map(row=>[...row.cells].map(cell=>cell.textContent)))`);
  assert.deepEqual(inputs, catalog.tables.map(table => table.rows.map(row => row.map(value => value === null ? 'NULL' : String(value)))));
  assert.equal(await evaluate(`document.documentElement.scrollWidth > innerWidth`), false);
  passed('actual tables contain all ten authored rows and the twelve-example control is ready');

  for (const lesson of catalog.lessons) for (const variant of lesson.variants) await receiveVariant(lesson, variant);
  passed('all twenty-two control selections show the exact SQLite columns, rows, SQL and explanations');

  await select('example', 'sql-11-left-count');
  await select('prediction', '7'); await activate('reveal-result');
  assert.match(await evaluate(`document.getElementById('feedback').textContent`), /predicted 7; SQLite returns 1 result row/);
  await select('prediction', '1');
  assert.equal(await evaluate(`document.getElementById('result-panel').hidden`), true);
  await activate('reveal-result');
  assert.match(await evaluate(`document.getElementById('feedback').textContent`), /prediction matches: 1 result row/);
  await select('example', 'sql-04-null-equals');
  assert.equal(await evaluate(`document.getElementById('prediction').value`), '');
  assert.equal(await evaluate(`document.getElementById('result-panel').hidden`), true);
  await activate('reveal-result');
  assert.equal(await evaluate(`document.querySelector('#result-table .empty').textContent`), 'No rows satisfy this query.');
  passed('optional predictions distinguish aggregate values from output rows and reset before a changed query');

  // Route real keys through native select/button behavior, separate from the full catalog binding checks above.
  await select('example', 'sql-01-rows');
  await evaluate(`document.getElementById('example').focus()`); await key('ArrowDown'); await key('Enter');
  assert.equal(await evaluate(`document.getElementById('example').value`), 'sql-02-filter');
  await evaluate(`document.getElementById('threshold').focus()`); await key('ArrowDown'); await key('Enter');
  assert.equal(await evaluate(`document.getElementById('threshold').value`), '30');
  await activate('reveal-result');
  assert.equal(await evaluate(`document.querySelector('#result-table tbody').textContent`), '6');
  await select('example', 'sql-12-left-where');
  await evaluate(`document.getElementById('placement').focus()`); await key('ArrowDown'); await key('Enter');
  assert.equal(await evaluate(`document.getElementById('placement').value`), 'on');
  await activate('reveal-result');
  assert.equal(await evaluate(`document.querySelectorAll('#result-table tbody tr').length`), 5);
  const labels = await evaluate(`[...document.querySelectorAll('select')].filter(el=>!el.disabled).map(el=>({id:el.id,label:el.labels[0]?.textContent,height:el.getBoundingClientRect().height}))`);
  assert.ok(labels.every(control => control.label && control.height >= 44));
  assert.equal(await evaluate(`document.activeElement.id`), 'reveal-result');
  passed('native keyboard selection changes example, threshold and ON placement; labelled controls keep focus');
  await screenshot('sql-desktop-left-join.png', 'explore-title');

  await receiveDownload('download-course', 'sql-query-foundations.json', course, 'loopback-course');
  await receiveDownload('download-sql', 'sql-query-practice.sql', practice, 'loopback-practice');
  passed('both explicit native downloads contain the exact course and complete practice SQL');

  await command('Emulation.setDeviceMetricsOverride', {width:390, height:844, deviceScaleFactor:1, mobile:false});
  assert.equal(await evaluate(`document.documentElement.scrollWidth > innerWidth`), false);
  await screenshot('sql-mobile-controls.png', 'explore-title');
  await select('example', 'sql-07-groups'); await activate('reveal-result');
  assert.equal(await evaluate(`document.documentElement.scrollWidth > innerWidth`), false);
  const scrollable = await evaluate(`(() => { const el=document.querySelector('#result-table .table-wrap'); el.focus(); return {width:el.clientWidth,full:el.scrollWidth,tab:el.tabIndex}; })()`);
  assert.equal(scrollable.tab, 0); assert.ok(scrollable.full >= scrollable.width);
  if (scrollable.full > scrollable.width) { await key('ArrowRight'); await waitFor(() => evaluate(`document.querySelector('#result-table .table-wrap').scrollLeft > 0`), 'keyboard table scroll'); }
  await screenshot('sql-mobile-groups.png', 'result-panel');
  passed('390px layout contains its tables, and wide result columns remain available by keyboard scrolling');

  await closeServer(); report.loopbackClosedBeforeFile = true;
  const beforeFile = pageRequests.length;
  const file = pathToFileURL(join(root, 'courses/sql-query-explorer.html')).href;
  await navigate(file, 390, 844);
  assert.equal(await evaluate(`document.getElementById('example').value`), 'sql-01-rows');
  assert.equal(await evaluate(`document.getElementById('prediction').value`), '');
  const last = catalog.lessons.at(-1);
  await receiveVariant(last, last.variants.find(value => value.key === 'where-30'));
  await receiveVariant(last, last.variants.find(value => value.key === 'on-30'));
  await receiveDownload('download-course', 'sql-query-foundations.json', course, 'direct-file-course');
  assert.ok(pageRequests.slice(beforeFile).every(url => url.startsWith('file:') || url.startsWith('blob:')));
  passed('fresh direct-file page works after server closure, including empty WHERE, retained ON stations and exact download');
  assert.ok(pageRequests.every(url => url.startsWith(base) || url.startsWith('file:') || url.startsWith('blob:')));
  assert.deepEqual(pageErrors, []);
  report.after = await sourcePins(); assert.deepEqual(report.after, report.before);
  report.pageRequests = pageRequests; report.status = 'passed';
  passed('no external page requests or JavaScript errors, and all thirteen source inputs remain unchanged');
} catch (error) {
  report.status = 'failed'; report.error = error.stack ?? String(error); report.browserLog = browserLog; report.pageErrors = pageErrors;
  if (sessionId) try { report.lastPage = await evaluate(`({url:location.href,text:document.body.innerText.slice(0,7000),focus:document.activeElement.outerHTML})`); await screenshot('failed-state.png'); } catch { /* Keep the original error. */ }
  process.exitCode = 1; console.error(report.error);
} finally {
  if (socket?.readyState === WebSocket.OPEN) try { await command('Browser.close', {}, false); } catch { /* May already be closed. */ }
  socket?.close(); for (const request of pending.values()) clearTimeout(request.timer);
  if (!await waitForBrowserExit(5000)) {
    browser.kill('SIGTERM');
    await waitForBrowserExit(5000);
  }
  await closeServer();
  try {
    if (browser && browser.exitCode === null && browser.signalCode === null) throw new Error('Owned browser exit was not observed');
    await rm(profile, {recursive:true, force:true, maxRetries:5, retryDelay:150});
    report.profileCleanup = 'Owned browser exited and its temporary profile was removed.';
  } catch (error) {
    report.profileCleanup = {retained:profile, browserPid:browser?.pid, error:error.message};
    report.status = 'failed'; process.exitCode = 1;
  }
  await writeFile(join(output, 'browser-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`SQL_BROWSER_${report.status === 'passed' ? 'OK' : 'FAILED'} checks=${report.checks.length} failures=${report.status === 'passed' ? 0 : 1}`);
}
