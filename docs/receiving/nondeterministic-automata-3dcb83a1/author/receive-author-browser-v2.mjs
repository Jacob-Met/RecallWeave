import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const ROOT = 'C:\\Users\\jacob\\recallweave-nfa-3dcb83a1';
const SOURCE = join(ROOT, 'source'), OUT = join(ROOT, 'author-browser-v2');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const pin = data => ({ bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') });
const result = { schema: 'recallweave-nfa-author-browser/1', started: new Date().toISOString(), checks: [], pageExceptions: [], externalRequests: [], cleanupFallback: false };
let browser = null, client = null, browserExit = null;
const chromeStdout = [], chromeStderr = [];
function check(label, condition, actual = null) {
  result.checks.push({ label, pass: !!condition, actual });
  if (!condition) throw new Error(label);
}
async function snapshot(path) {
  const rows = {};
  async function walk(dir, prefix = '') {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) throw new Error('Unexpected source link: ' + entry.name);
      const relative = prefix + entry.name;
      if (entry.isDirectory()) await walk(join(dir, entry.name), relative + '/');
      else if (entry.isFile()) rows[relative] = pin(await readFile(join(dir, entry.name)));
    }
  }
  await walk(path); return rows;
}
async function connect(url) {
  const ws = new WebSocket(url);
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
  let next = 0; const pending = new Map();
  ws.addEventListener('message', event => {
    const item = JSON.parse(String(event.data));
    if (item.id) {
      const entry = pending.get(item.id); if (!entry) return;
      clearTimeout(entry.timer); pending.delete(item.id);
      if (item.error) entry.reject(new Error(JSON.stringify(item.error))); else entry.resolve(item.result);
    } else {
      if (item.method === 'Runtime.exceptionThrown') result.pageExceptions.push(item.params);
      if (item.method === 'Network.requestWillBeSent' && /^https?:/i.test(item.params.request.url)) result.externalRequests.push(item.params.request.url);
    }
  });
  return {
    send(method, params = {}) {
      const id = ++next;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 12000);
        pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params }));
      });
    }, close() { ws.close(); }
  };
}
async function value(expression) {
  const r = await client.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value;
}
async function waitFor(fn, label, timeout = 8000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { const v = await fn(); if (v) return v; await delay(50); }
  throw new Error('Timed out: ' + label);
}
async function click(id) {
  const expression = "(() => {const e=document.getElementById(" + JSON.stringify(id) + ");e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()";
  const rect = await value(expression);
  await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: rect.x, y: rect.y, button: 'left', clickCount: 1 });
  await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: rect.x, y: rect.y, button: 'left', clickCount: 1 });
}
async function key(name, code, virtual, modifiers = 0) {
  await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: name, code, windowsVirtualKeyCode: virtual, modifiers,
    ...(name === 'Enter' ? { text: '\r', unmodifiedText: '\r' } : {}) });
  await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code, windowsVirtualKeyCode: virtual, modifiers });
}
async function type(id, text) {
  await click(id); await key('a', 'KeyA', 65, 2); await key('Backspace', 'Backspace', 8);
  if (text) await client.send('Input.insertText', { text });
}
async function capture(name) {
  const r = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const data = Buffer.from(r.data, 'base64'); await writeFile(join(OUT, name), data, { flag: 'wx' }); result[name] = pin(data);
}
async function downloaded(name) {
  const path = join(OUT, 'downloads', name);
  await waitFor(async () => { try { return (await stat(path)).isFile(); } catch { return false; } }, name);
  return readFile(path);
}
try {
  await mkdir(OUT); await mkdir(join(OUT, 'downloads'));
  const sourceBefore = await snapshot(SOURCE); result.sourceBefore = sourceBefore;
  check('exact frozen model', sourceBefore['src/nondeterministic-automata.mjs'].sha256 === '9ea57582393415ed0b0590d9f4f72d9268a731c81837a54a1288c877bf421b6b');
  check('exact frozen HTML', sourceBefore['courses/nondeterministic-automata-explorer.html'].sha256 === '38781b86e8215d052c8cc57151c38ef3a133e19789fa0c5f2d61b526e41cad3d');
  result.chrome = { path: CHROME, ...pin(await readFile(CHROME)) };
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + join(OUT, 'profile'), '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-component-update', '--disable-default-apps', '--disable-sync', '--metrics-recording-only', '--no-proxy-server', '--window-size=1200,900', 'about:blank'];
  result.chromeArgs = args;
  browser = spawn(CHROME, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true }); result.browserPid = browser.pid;
  browser.stdout.on('data', data => chromeStdout.push(data)); browser.stderr.on('data', data => chromeStderr.push(data));
  browser.on('exit', (code, signal) => { browserExit = { code, signal }; });
  const portText = await waitFor(async () => { try { return await readFile(join(OUT, 'profile', 'DevToolsActivePort'), 'utf8'); } catch { return null; } }, 'own DevTools port', 15000);
  const port = Number(portText.split(/\r?\n/)[0]); check('own loopback port', Number.isInteger(port) && port > 0);
  const pages = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
  client = await connect(pages.find(item => item.type === 'page').webSocketDebuggerUrl);
  await client.send('Page.enable'); await client.send('Runtime.enable'); await client.send('Network.enable');
  await client.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: join(OUT, 'downloads'), eventsEnabled: true });
  await client.send('Page.navigate', { url: pathToFileURL(join(SOURCE, 'courses/nondeterministic-automata-explorer.html')).href });
  await waitFor(() => value("document.readyState === 'complete' && document.querySelectorAll('#machine-body tr').length === 3"), 'actual file app');
  check('initial explicit-analysis state', await value("document.getElementById('result').hidden && document.getElementById('download-result').disabled"));
  await click('analyze');
  check('default1010 accepted', await value("document.getElementById('decision').textContent === 'Accepted'"));
  const firstRows = await value("[...document.querySelectorAll('#trace-body tr')].map(r=>[...r.cells].map(c=>c.textContent))");
  check('literal whole-word trace', firstRows.length === 5 && firstRows.at(-1)[4] === '{q0, q2}' && firstRows[3][4] === '{q0, q1}', firstRows);
  await click('download-result');
  const analysisBytes = await downloaded('nondeterministic-automata-analysis.json'), analysis = JSON.parse(analysisBytes);
  check('actual analysis download preserves inputs and active set', analysis.word === '1010' && analysis.accepted === true && JSON.stringify(analysis.nfa.steps.at(-1).active) === '[0,2]');
  result.analysisDownload = pin(analysisBytes);
  await type('word', '101');
  check('real word edit clears stale output and download', await value("document.getElementById('result').hidden && document.getElementById('download-result').disabled"));
  await key('Tab', 'Tab', 9);
  check('keyboard reaches Analyze', await value("document.activeElement.id === 'analyze'"));
  await key('Enter', 'Enter', 13);
  check('keyboard recompute rejects101 after accepted prefix', await value("document.getElementById('decision').textContent === 'Rejected' && !document.getElementById('result').hidden"));
  await type('word', 'ε'); await click('analyze');
  check('invalid literal epsilon refuses with no stale output', await value("document.getElementById('status').classList.contains('error') && document.getElementById('result').hidden && document.getElementById('download-result').disabled"));
  await type('word', '0'); await type('zero-0', '0,0'); await click('analyze');
  check('duplicate destination gets actionable refusal', await value("document.getElementById('status').textContent.includes('duplicate') && document.getElementById('result').hidden"));
  await value("document.getElementById('preset').value='epsilon-cycle'");
  await click('load-preset'); await click('analyze');
  const cycle = await value("[...document.querySelectorAll('#trace-body tr')].map(r=>[...r.cells].map(c=>c.textContent))");
  check('epsilon cycle and after-symbol closure are visible separately', cycle.length === 3 && cycle[0][4] === '{q0, q1}' && cycle[1][3] === '{q2}' && cycle[1][4] === '{q2, q3}' && cycle[2][4] === '{q4}', cycle);
  check('full subset table has complete binary columns', await value("document.querySelectorAll('#subset-body tr').length === 4 && [...document.querySelectorAll('#subset-body tr')].every(r=>r.cells[3].textContent.startsWith('D') && r.cells[4].textContent.startsWith('D'))"));
  await value("document.getElementById('trace-title').scrollIntoView({block:'start'})"); await capture('trace-desktop.png');
  for (const [id, name, sourceName] of [
    ['download-course', 'nondeterministic-automata.json', 'courses/nondeterministic-automata.json'],
    ['download-guide', 'nondeterministic-automata.md', 'courses/nondeterministic-automata.md'],
    ['download-html', 'nondeterministic-automata-explorer.html', 'courses/nondeterministic-automata-explorer.html']
  ]) {
    await click(id); const data = await downloaded(name), original = await readFile(join(SOURCE, sourceName));
    check('exact downloaded bytes: ' + name, data.equals(original), pin(data));
  }
  await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await value("window.scrollTo(0,0)");
  check('small-screen page avoids global horizontal overflow', await value("document.documentElement.scrollWidth <= window.innerWidth"), await value("({scroll:document.documentElement.scrollWidth,inner:window.innerWidth})"));
  await capture('phone-top.png');
  await client.send('Emulation.clearDeviceMetricsOverride');
  await client.send('Page.navigate', { url: pathToFileURL(join(OUT, 'downloads', 'nondeterministic-automata-explorer.html')).href });
  await waitFor(() => value("document.querySelectorAll('#machine-body tr').length === 3 && document.getElementById('word').value==='1010'"), 'downloaded offline HTML');
  await click('analyze');
  check('downloaded relocated HTML executes original example', await value("document.getElementById('decision').textContent === 'Accepted'"));
  check('no page exceptions', result.pageExceptions.length === 0, result.pageExceptions);
  check('no page HTTP requests', result.externalRequests.length === 0, result.externalRequests);
  const sourceAfter = await snapshot(SOURCE);
  check('all ten source inputs unchanged', JSON.stringify(sourceAfter) === JSON.stringify(sourceBefore));
  result.sourceAfter = sourceAfter;
  await client.send('Browser.close'); client.close(); client = null;
  await waitFor(() => browserExit, 'own browser exit');
  check('own browser closed normally', browserExit.code === 0, browserExit);
} catch (error) {
  result.error = { name: error.name, message: error.message, stack: error.stack };
  if (client) { try { await capture('failure.png'); await client.send('Browser.close'); client.close(); } catch (cleanup) { result.cleanupError = String(cleanup); } }
  if (browser && browser.exitCode === null) { await delay(1000); if (browser.exitCode === null) { result.cleanupFallback = true; browser.kill(); } }
} finally {
  result.browserExit = browserExit; result.ended = new Date().toISOString();
  result.passed = result.checks.filter(row => row.pass).length;
  result.failed = result.checks.filter(row => !row.pass).length + (result.error && result.checks.every(row => row.pass) ? 1 : 0);
  await writeFile(join(OUT, 'chrome.stdout'), Buffer.concat(chromeStdout), { flag: 'wx' });
  await writeFile(join(OUT, 'chrome.stderr'), Buffer.concat(chromeStderr), { flag: 'wx' });
  await writeFile(join(OUT, 'result.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ passed: result.passed, failed: result.failed, error: result.error, browserExit: result.browserExit, cleanupFallback: result.cleanupFallback }));
  if (result.failed) process.exitCode = 1;
}
