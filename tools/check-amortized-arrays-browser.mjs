/** Actual Chromium receiving. No npm packages, network server or user profile. */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const root = fileURLToPath(new URL('../', import.meta.url));
const evidence = resolve(process.env.ARRAY_EVIDENCE_DIR || join(root, 'docs/receiving/amortized-arrays-0a55dfe9/browser'));
mkdirSync(evidence, { recursive: true });
mkdirSync(join(evidence, 'downloads'), { recursive: true });
const profile = mkdtempSync(join(tmpdir(), 'recallweave-array-browser-'));
const downloads = join(profile, 'downloads');
mkdirSync(downloads);
const binary = process.env.CHROME_BIN || '/usr/bin/chromium';
const browser = spawn(binary, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-background-networking', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
let stderr = '';
browser.stderr.on('data', chunk => { stderr += chunk; });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(predicate, label, timeout = 10000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { const value = await predicate(); if (value) return value; await delay(50); }
  throw new Error(`Timed out: ${label}`);
}
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
let socket;
let localServer;
let pageUrl;
const delivery = process.env.ARRAY_BROWSER_DELIVERY || 'file';
if (!['file', 'loopback'].includes(delivery)) throw new Error('ARRAY_BROWSER_DELIVERY must be file or loopback.');
let id = 0;
const pending = new Map();
const events = [];
const checks = [];
const errors = [];
const requests = [];
const receipt = {
  kind: 'same-author actual Chromium receiving, not independent-worker acceptance',
  startedAt: new Date().toISOString(), node: process.version, delivery,
  sourceCommit: process.env.ARRAY_SOURCE_COMMIT || null,
  receiverSha256: sha(readFileSync(fileURLToPath(import.meta.url))),
  htmlSha256: sha(readFileSync(join(root, 'courses/amortized-arrays-lab.html'))),
  checks, errors, requests, downloads: []
};
function send(method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const requestId = ++id;
    const timer = setTimeout(() => { pending.delete(requestId); reject(new Error(`CDP timeout: ${method}`)); }, 10000);
    pending.set(requestId, { resolve, reject, timer });
    socket.send(JSON.stringify({ id: requestId, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
}
try {
  browser.on('error', error => errors.push(error.message));
  await until(() => existsSync(join(profile, 'DevToolsActivePort')), 'owned Chromium start');
  const [port, socketPath] = readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').trim().split('\n');
  socket = new WebSocket(`ws://127.0.0.1:${port}${socketPath}`);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const item = pending.get(message.id);
      if (!item) return;
      clearTimeout(item.timer);
      pending.delete(message.id);
      if (message.error) item.reject(new Error(JSON.stringify(message.error)));
      else item.resolve(message.result);
    } else {
      events.push(message);
      if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
      if (message.method === 'Network.requestWillBeSent') requests.push(message.params.request.url);
    }
  });
  receipt.browser = await send('Browser.getVersion');
  await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads, eventsEnabled: true });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const call = (method, params) => send(method, params, sessionId);
  const evaluate = async expression => {
    const value = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (value.exceptionDetails) throw new Error(JSON.stringify(value.exceptionDetails));
    return value.result.value;
  };
  const click = id => evaluate(`document.getElementById(${JSON.stringify(id)}).click()`);
  const state = () => evaluate(`({hidden:document.getElementById('results').hidden,disabled:document.getElementById('download-observation').disabled,status:document.getElementById('status').textContent,step:document.getElementById('step-label').textContent,doubleCost:document.querySelector('#doubling-card [data-value=cost]').textContent,doubleTotal:document.querySelector('#doubling-card [data-value=total]').textContent,fixedCost:document.querySelector('#fixed-card [data-value=cost]').textContent,fixedTotal:document.querySelector('#fixed-card [data-value=total]').textContent,phi:document.querySelector('#doubling-card [data-value=potential]').textContent})`);
  async function type(id, text) {
    await evaluate(`document.getElementById(${JSON.stringify(id)}).focus();document.getElementById(${JSON.stringify(id)}).select()`);
    await call('Input.insertText', { text });
  }
  async function inspect(step) {
    await evaluate(`document.getElementById('step-select').value=${JSON.stringify(String(step))};document.getElementById('step-select').dispatchEvent(new Event('change',{bubbles:true}))`);
  }
  async function receiveDownload(button, name, original) {
    await click(button);
    await until(() => existsSync(join(downloads, name)) && !existsSync(join(downloads, `${name}.crdownload`)), `download ${name}`);
    const bytes = readFileSync(join(downloads, name));
    if (original) assert.deepEqual(bytes, readFileSync(join(root, original)));
    assert.equal(basename(name), name);
    writeFileSync(join(evidence, 'downloads', name), bytes);
    receipt.downloads.push({ name, bytes: bytes.length, sha256: sha(bytes), ...(original ? { exactSource: original } : {}) });
    return bytes;
  }
  if (delivery === 'loopback') {
    const html = readFileSync(join(root, 'courses/amortized-arrays-lab.html'));
    localServer = createServer((request, response) => {
      if (request.url === '/demo.html') { response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); response.end(readFileSync(join(root, 'demo.html'))); return; }
      if (request.url !== '/amortized-arrays-lab.html') { response.writeHead(404); response.end(); return; }
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); response.end(html);
    });
    await new Promise((resolve, reject) => { localServer.once('error', reject); localServer.listen(0, '127.0.0.1', resolve); });
    pageUrl = `http://127.0.0.1:${localServer.address().port}/amortized-arrays-lab.html`;
  } else pageUrl = pathToFileURL(join(root, 'courses/amortized-arrays-lab.html')).href;
  receipt.pageUrl = pageUrl;
  await call('Runtime.enable');
  await call('Page.enable');
  await call('Network.enable');
  if (delivery === 'file') await call('Network.setBlockedURLs', { urls: ['http://*', 'https://*'] });
  else {
    await call('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }] });
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.sessionId !== sessionId || message.method !== 'Fetch.requestPaused') return;
      const { requestId, request } = message.params;
      const admitted = request.url.startsWith(new URL(pageUrl).origin + '/') || /^(blob:|data:)/.test(request.url);
      call(admitted ? 'Fetch.continueRequest' : 'Fetch.failRequest', { requestId, ...(admitted ? {} : { errorReason: 'BlockedByClient' }) }).catch(error => errors.push(error.message));
    });
  }
  await call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  receipt.navigation = await call('Page.navigate', { url: pageUrl });
  if (receipt.navigation.errorText) { receipt.document = await evaluate('({url:location.href,title:document.title,text:document.body?.innerText?.slice(0,1000)})'); throw new Error(`Navigation failed: ${receipt.navigation.errorText}`); }
  await until(() => evaluate("Boolean(document.getElementById('status')?.textContent.includes('Applied 12'))"), 'initial generated-page application');
  let current = await state();
  assert.equal(current.hidden, false); assert.equal(current.disabled, false);
  assert.equal(current.doubleCost, '0'); assert.ok(current.step.startsWith('Step 0 of 12'));
  checks.push('generated-page initial example exposes an explicit empty inspection state');

  await inspect(9);
  current = await state();
  assert.equal(current.doubleCost, '9'); assert.equal(current.doubleTotal, '24');
  assert.equal(current.fixedCost, '1'); assert.equal(current.fixedTotal, '18');
  assert.ok(current.phi.includes('= 3'));
  checks.push('actual rendered append9 distinguishes 9 actual units from charge3 and retained totals');

  await evaluate("document.getElementById('back').focus()");
  await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  assert.ok((await state()).step.startsWith('Step 8 '));
  await click('next');
  assert.ok((await state()).step.startsWith('Step 9 '));
  checks.push('native Enter activates a focused Back control; Next restores the exact retained step');

  const observation = JSON.parse(await receiveDownload('download-observation', 'amortized-arrays-observation.json'));
  assert.equal(observation.inspectionStep, 9);
  assert.deepEqual(observation.trace.input, { appends: 12, increment: 3 });
  assert.equal(observation.trace.doubling.steps[9].cost, 9);
  assert.equal(observation.trace.doubling.totals.cost, 27);
  assert.equal(observation.trace.fixedIncrement.totals.cost, 30);
  checks.push('real Blob download retains full applied traces, exact input and cursor rather than only visible totals');

  async function screenshot(name) {
    const metrics = await call('Page.getLayoutMetrics');
    const content = metrics.cssContentSize;
    const image = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: content.width, height: content.height, scale: 1 } });
    writeFileSync(join(evidence, name), Buffer.from(image.data, 'base64'));
  }
  await screenshot('desktop.png');

  await type('append-count', '1e2');
  current = await state();
  assert.equal(current.hidden, true); assert.equal(current.disabled, true);
  assert.ok(current.status.includes('retired'));
  await click('apply');
  current = await state();
  assert.equal(current.hidden, true); assert.ok(current.status.includes('decimal digits'));
  checks.push('actual typed edit retires current observation immediately; exponent input refuses without showing old results');
  await receiveDownload('download-course', 'amortized-arrays.json', 'courses/amortized-arrays.json');
  await receiveDownload('download-guide', 'amortized-arrays.md', 'courses/amortized-arrays.md');
  checks.push('original course and guide download byte-for-byte even while the calculation draft is invalid');

  await type('append-count', '129'); await click('apply');
  assert.equal((await state()).hidden, true); assert.ok((await state()).status.includes('128'));
  await type('append-count', '12'); await type('growth-increment', '0'); await click('apply');
  assert.equal((await state()).hidden, true); assert.ok((await state()).status.includes('Fixed increment'));
  checks.push('out-of-domain append count and zero increment are refused by actual controls');

  await type('append-count', '0'); await type('growth-increment', '3'); await click('apply');
  current = await state();
  assert.equal(current.hidden, false); assert.equal(current.doubleCost, '0');
  assert.ok(current.step.startsWith('Step 0 of 0'));
  assert.equal(await evaluate("['first','back','next','last'].every(id=>document.getElementById(id).disabled)"), true);
  assert.ok(await evaluate("document.getElementById('totals').textContent.includes('not defined')"));
  checks.push('zero-input recovery has no fictitious average or available next operation');

  await type('append-count', '128'); await type('growth-increment', '32'); await click('apply'); await click('last');
  current = await state();
  assert.equal(current.doubleTotal, '255'); assert.equal(current.fixedTotal, '320');
  assert.equal(await evaluate("document.querySelectorAll('#doubling-card .slot').length"), 128);
  assert.equal(await evaluate("document.querySelectorAll('#fixed-card .slot').length"), 128);
  assert.equal(await evaluate("document.querySelectorAll('#doubling-ledger tbody tr').length"), 129);
  assert.equal(await evaluate("document.querySelectorAll('#fixed-ledger tbody tr').length"), 129);
  checks.push('maximum admitted sequence renders every slot and ledger row with exact independent totals');

  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
  await evaluate("document.querySelector('[data-example=\"9,3\"]').click()");
  await click('last');
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
  assert.equal(await evaluate('innerWidth'), 390);
  current = await state(); assert.equal(current.doubleCost, '9'); assert.equal(current.fixedTotal, '18');
  await screenshot('narrow-390px.png');
  checks.push('390px actual Chromium layout has no page-wide horizontal overflow; worked-example and Last controls remain usable');
  assert.equal(await evaluate('localStorage.length'), 0);
  assert.equal(await evaluate('sessionStorage.length'), 0);
  assert.deepEqual(await evaluate('indexedDB.databases().then(x=>x.map(d=>d.name))'), []);
  const external = requests.filter(url => /^https?:/.test(url) && !(delivery === 'loopback' && url.startsWith(new URL(pageUrl).origin + '/')));
  assert.equal(external.length, 0);
  assert.equal(errors.length, 0);
  checks.push('fresh browser context makes no external HTTP(S) requests, stores no browser data and raises no page exceptions');
  // The emitted course is received by the unchanged maintained learner, not a
  // replacement session implementation. All answers below are scripted checks.
  const learnerBytes = readFileSync(join(root, 'demo.html'));
  const deck = JSON.parse(readFileSync(join(root, 'courses/amortized-arrays.json'), 'utf8'));
  const learnerUrl = delivery === 'file' ? pathToFileURL(join(root, 'demo.html')).href : new URL('/demo.html', pageUrl).href;
  receipt.learner = { demoSha256: sha(learnerBytes), courseSha256: sha(readFileSync(join(downloads, 'amortized-arrays.json'))), scripted: true, answeredIds: [] };
  const learnerNavigation = await call('Page.navigate', { url: learnerUrl });
  assert.ok(!learnerNavigation.errorText, learnerNavigation.errorText);
  await until(() => evaluate("Boolean(document.getElementById('deck-file')) && document.readyState === 'complete'"), 'maintained learner initialization');
  const beforePreview = await evaluate("({session:document.getElementById('session-content').innerHTML,progress:document.getElementById('step-count').textContent,title:document.getElementById('lesson-description').textContent})");
  const documentNode = await call('DOM.getDocument');
  const picker = await call('DOM.querySelector', { nodeId: documentNode.root.nodeId, selector: '#deck-file' });
  assert.ok(picker.nodeId);
  await call('DOM.setFileInputFiles', { nodeId: picker.nodeId, files: [join(downloads, 'amortized-arrays.json')] });
  await until(() => evaluate(`document.getElementById('deck-preview-title')?.textContent === ${JSON.stringify(deck.title)} && Boolean(document.getElementById('start-deck'))`), 'actual downloaded course preview');
  assert.deepEqual(await evaluate("({session:document.getElementById('session-content').innerHTML,progress:document.getElementById('step-count').textContent,title:document.getElementById('lesson-description').textContent})"), beforePreview);
  await screenshot('learner-preview.png');
  await click('start-deck');
  await until(() => evaluate(`document.getElementById('lesson-description')?.textContent === ${JSON.stringify(deck.title)} && !document.getElementById('start-deck')`), 'explicit course start');
  assert.equal(await evaluate("document.getElementById('step-count').textContent"), '0 / 16');
  checks.push('the actual downloaded lesson previews without replacing session state, then starts explicitly in the unchanged learner');

  let missed;
  const seen = new Set();
  for (let position = 0; position < deck.items.length; position += 1) {
    const prompt = await evaluate("document.querySelector('.question-card h2')?.textContent");
    const item = deck.items.find(value => value.prompt === prompt);
    assert.ok(item, `Receiving an original prompt at position ${position}`);
    assert.ok(!seen.has(item.id), 'No repeated first-try question');
    seen.add(item.id);
    const choice = position === 0 ? (item.answer + 1) % item.options.length : item.answer;
    if (position === 0) missed = { item, choice };
    await evaluate(`document.querySelector('[data-choice="${choice}"]').focus()`);
    await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    const feedback = await evaluate("document.getElementById('feedback-slot').textContent");
    assert.ok(feedback.includes(item.explanation));
    assert.ok(feedback.includes(item.options[item.answer]));
    assert.equal(await evaluate("document.getElementById('step-count').textContent"), `${position + 1} / 16`);
    receipt.learner.answeredIds.push(item.id);
    await click('next-button');
  }
  assert.equal(seen.size, 16);
  const firstTry = await evaluate("document.getElementById('first-try-summary').textContent");
  assert.ok(firstTry.includes('15 of 16'));
  assert.equal(await evaluate("document.querySelectorAll('.review-item').length"), 16);
  for (const item of deck.items) assert.ok(await evaluate(`document.querySelector('.review-list').textContent.includes(${JSON.stringify(item.explanation)})`));
  checks.push('all sixteen original questions, explanations and review entries are received; one intentional mistake remains a first-try mistake');

  const application = 'A resize may cost more than three units while the prefix stays below 3N.';
  const reflection = 'Actual cost and amortized charge answer different questions.';
  await type('application-reflection', application);
  await evaluate(`document.querySelector('[data-reflection-item="${missed.item.id}"]').closest('details').querySelector('summary').click()`);
  const reflectionId = await evaluate(`document.querySelector('[data-reflection-item="${missed.item.id}"]').id`);
  await type(reflectionId, reflection);
  const firstMastery = await evaluate("document.querySelector('.mastery-box').innerHTML");
  await click('practice-button');
  assert.equal(await evaluate("document.querySelector('.practice-card h2').textContent"), missed.item.prompt);
  await evaluate(`document.querySelector('[data-practice-choice="${missed.item.answer}"]').click()`);
  await click('practice-next');
  assert.equal(await evaluate("document.getElementById('first-try-summary').textContent"), firstTry);
  assert.equal(await evaluate("document.querySelector('.mastery-box').innerHTML"), firstMastery);
  assert.ok(await evaluate("document.getElementById('practice-status').textContent.includes('1 of 1')"));
  assert.equal(await evaluate("document.getElementById('application-reflection').value"), application);
  assert.equal(await evaluate(`document.querySelector('[data-reflection-item="${missed.item.id}"]').value`), reflection);
  checks.push('practice corrects the one missed item without rewriting the original score, estimates or typed reflections');

  const eventOffset = events.length;
  await click('save-notes-button');
  const noteEvent = await until(() => events.slice(eventOffset).find(event => event.method === 'Browser.downloadWillBegin'), 'native study-notes download start');
  const { guid, suggestedFilename: notesName } = noteEvent.params;
  assert.equal(basename(notesName), notesName);
  await until(() => events.slice(eventOffset).some(event => event.method === 'Browser.downloadProgress' && event.params.guid === guid && event.params.state === 'completed'), 'native study-notes download completion');
  const notesBytes = readFileSync(join(downloads, notesName));
  const notes = notesBytes.toString('utf8');
  for (const item of deck.items) { assert.ok(notes.includes(item.prompt)); assert.ok(notes.includes(item.explanation)); }
  assert.ok(notes.includes(deck.title)); assert.ok(notes.includes(missed.item.options[missed.choice]));
  assert.ok(notes.includes(application)); assert.ok(notes.includes(reflection));
  writeFileSync(join(evidence, 'downloads', notesName), notesBytes);
  receipt.downloads.push({ name: notesName, bytes: notesBytes.length, sha256: sha(notesBytes), source: 'unchanged learner study-notes export' });
  receipt.learner.firstTryCorrect = 15;
  receipt.learner.practiceCorrect = 1;
  receipt.learner.notesName = notesName;
  receipt.learner.previewPreservedSession = true;
  await screenshot('learner-completed.png');
  assert.deepEqual(readFileSync(join(root, 'demo.html')), learnerBytes);
  assert.equal(await evaluate('localStorage.length'), 0);
  assert.equal(await evaluate('sessionStorage.length'), 0);
  assert.deepEqual(await evaluate('indexedDB.databases().then(x=>x.map(d=>d.name))'), []);
  assert.equal(errors.length, 0);
  const allExternal = requests.filter(url => /^https?:/.test(url) && !(delivery === 'loopback' && url.startsWith(new URL(pageUrl).origin + '/')));
  assert.equal(allExternal.length, 0);
  checks.push('actual native study-notes bytes preserve all original questions, explanations and typed reflections; source and storage remain unchanged');

  receipt.status = 'passed';
  receipt.checkCount = checks.length;
  receipt.downloadEvents = events.filter(event => event.method === 'Browser.downloadProgress' && event.params.state === 'completed').length;
  receipt.externalRequests = allExternal;
  receipt.outputFiles = readdirSync(evidence).filter(name => name.endsWith('.png'));
} catch (error) {
  receipt.status = 'failed';
  receipt.failure = { message: error.message, stack: error.stack };
  process.exitCode = 1;
} finally {
  receipt.endedAt = new Date().toISOString();
  writeFileSync(join(evidence, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
  writeFileSync(join(evidence, 'chromium.stderr.log'), stderr);
  if (socket?.readyState === WebSocket.OPEN) {
    try { await send('Browser.close'); } catch { /* Owned child is still terminated below. */ }
    socket.close();
  }
  for (const item of pending.values()) { clearTimeout(item.timer); }
  browser.kill(); // Only the Chromium child started by this receiver.
  if (localServer) localServer.close();
  console.log(JSON.stringify({ status: receipt.status, checks: checks.length, evidence, failure: receipt.failure?.message }));
}
