#!/usr/bin/env node
/** Reflection receiving through the real app and downloads. Transport reused from check_notes_browser.mjs. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, writeFile, rename, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const project = resolve(option('--root', join(dirname(fileURLToPath(import.meta.url)), '..')));
const executable = option('--browser', 'chromium');
const output = resolve(option('--output', join(project, 'browser-check')));
await mkdir(output, {recursive: false});
const downloadPath = join(output, 'downloads');
await mkdir(downloadPath, {recursive: true});
const downloads = new Map();
const profile = await mkdtemp(join(output, 'profile-'));
const report = {status: 'running', project, executable, checks: [], screenshots: [], downloads: [], sourceSha256: {}};
const sourcePaths = ['src/reflection-file.mjs', 'src/reflection-file-ui.mjs', 'src/app.mjs', 'src/knowledge.mjs', 'src/review.mjs', 'src/reflections.mjs', 'src/answer-order.mjs', 'src/session-export.mjs', 'data/deck.json', 'demo.html', 'index.html', 'styles.css', 'tools/make_demo.py'];
for (const path of sourcePaths) {
  try { report.sourceSha256[path] = createHash('sha256').update(await readFile(join(project, path))).digest('hex'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
const deck = JSON.parse(await readFile(join(project, 'data/deck.json'), 'utf8'));
const {initialMastery, updateMastery} = await import(pathToFileURL(join(project, 'src/knowledge.mjs')));
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = resolve(project, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!file.startsWith(project + sep)) { response.writeHead(403).end(); return; }
    const body = await readFile(file);
    const mime = {'.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json'}[extname(file)];
    response.writeHead(200, {'Content-Type': `${mime ?? 'application/octet-stream'}; charset=utf-8`});
    response.end(body);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
let browser;
let socket;
let sessionId;
let browserLog = '';
const pageErrors = [];
let pageRequests = [];
const pending = new Map();
let sequence = 0;

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
async function waitFor(check, label, attempts = 160) {
  let lastError;
  for (let step = 0; step < attempts; step++) {
    try { if (await check()) return; } catch (error) { lastError = error; }
    await sleep(100);
  }
  throw new Error(`Timed out: ${label}${lastError ? ` (${lastError.message})` : ''}`);
}
function command(method, params = {}, scoped = true) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 10000);
    pending.set(id, {resolve, reject, timer});
    socket.send(JSON.stringify({id, method, params, ...(scoped && sessionId ? {sessionId} : {})}));
  });
}
async function evaluate(expression) {
  const result = await command('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true});
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  return result.result.value;
}
async function key(name, shift = false) {
  const code = name === 'Tab' ? 9 : 13;
  for (const type of ['keyDown', 'keyUp']) {
    await command('Input.dispatchKeyEvent', {
      type, key: name, code: name, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code,
      modifiers: shift ? 8 : 0,
      ...(name === 'Enter' && type === 'keyDown' ? {text: '\r', unmodifiedText: '\r'} : {})
    });
  }
}
async function activate(selector) {
  assert.ok(await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`), `Missing control ${selector}`);
  await command('Page.bringToFront');
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
  await key('Enter');
}
async function navigate(url, width = 1280, height = 1000) {
  await command('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: false});
  pageRequests = [];
  await command('Page.navigate', {url});
  await waitFor(() => evaluate(`document.URL === ${JSON.stringify(url)} && document.readyState === 'complete' && !!document.querySelector('#start-button') && document.querySelector('#progress-fill').style.width === '0%'`), 'initialized lesson welcome');
}
async function snapshot() {
  return evaluate(`({
    score: document.querySelector('.result-card > p')?.textContent,
    estimates: [...document.querySelectorAll('.mastery-box output')].map(node => node.textContent),
    reviewCount: document.querySelectorAll('.review-item').length,
    progress: document.querySelector('[role="progressbar"]').getAttribute('aria-valuenow'),
    focus: document.activeElement.tagName,
    overflow: document.documentElement.scrollWidth > innerWidth
  })`);
}
async function lesson(mode) {
  await activate('#start-button');
  await waitFor(() => evaluate(`!!document.querySelector('.question-card h2')`), 'first question after keyboard start');
  const firstAnswers = [];
  const estimates = initialMastery(deck.concepts);
  for (let index = 0; index < deck.items.length; index++) {
    const prompt = await evaluate(`document.querySelector('.question-card h2').textContent`);
    const item = deck.items.find(item => item.prompt === prompt);
    assert.ok(item, 'Question must come from the existing deck');
    assert.ok(await evaluate(`document.activeElement.matches('[data-choice]')`), 'An answer receives keyboard focus');
    const correct = mode === 'correct' || (mode === 'mixed' && index % 2 === 1);
    const choice = correct ? item.answer : (item.answer + 1 + index % (item.options.length - 1)) % item.options.length;
    await activate(`[data-choice="${choice}"]`);
    assert.equal(await evaluate('document.activeElement.id'), 'next-button');
    estimates[item.concept] = updateMastery(estimates[item.concept], correct);
    firstAnswers.push({item, choice, correct});
    await key('Enter');
  }
  const state = await snapshot();
  assert.deepEqual(state.estimates, deck.concepts.map(concept => `${Math.round(estimates[concept] * 100)}%`));
  assert.equal(state.progress, String(deck.items.length));
  return {firstAnswers, state};
}
async function screenshot(name, selector) {
  if (selector) await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'start'})`);
  const {data} = await command('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false});
  await writeFile(join(output, name), Buffer.from(data, 'base64'));
  report.screenshots.push(name);
}
async function savedNotes(name, firstAnswers, expectedPractice, expectedNotes, application) {
  const stateBefore = await snapshot();
  const requestedBefore = [...pageRequests];
  const previous = new Set(downloads.keys());
  await activate('#save-notes-button');
  let download;
  await waitFor(() => {
    download = [...downloads.values()].find(value => !previous.has(value.guid) && value.state === 'completed');
    return !!download;
  }, `saved study notes: ${name}`);
  assert.match(download.suggestedFilename, /^recallweave-study-notes-\d{4}-\d{2}-\d{2}\.txt$/);
  const bytes = await readFile(join(downloadPath, download.guid));
  const content = new TextDecoder('utf-8', {fatal: true}).decode(bytes);
  assert.match(content, /MODEL STATE, NOT A GRADE/);
  assert.match(content, expectedPractice);
  assert.ok(content.includes(deck.attribution));
  assert.ok(content.includes(deck.license));
  let previousQuestion = -1;
  for (const {item, choice} of firstAnswers) {
    const start = content.indexOf(item.prompt);
    assert.ok(start > previousQuestion);
    previousQuestion = start;
    const ordinal = firstAnswers.findIndex(answer => answer.item.id === item.id);
    const end = ordinal + 1 < firstAnswers.length ? content.indexOf(`${ordinal + 2}. ${firstAnswers[ordinal + 1].item.prompt}`) : content.indexOf('YOUR APPLICATION REFLECTION');
    const block = content.slice(start, end < 0 ? undefined : end);
    assert.ok(block.includes(`Your first answer: ${item.options[choice]}`));
    assert.ok(block.includes(`Correct answer: ${item.options[item.answer]}`));
    assert.ok(block.includes(`Explanation: ${item.explanation}`));
    assert.ok(block.includes(`Apply the idea: ${item.transfer}`));
    const text = expectedNotes[item.id] ?? '';
    assert.ok(block.includes(`Your explanation — reflection, not scored:\n${text ? text.split('\n').map(line => `  > ${line}`).join('\n') : '  Not written.'}`), `Saved reflection belongs to ${item.id}`);
  }
  assert.ok(content.includes('YOUR APPLICATION REFLECTION — NOT SCORED'));
  assert.ok(content.includes(application ? application.split('\n').map(line => `  > ${line}`).join('\n') : 'Not written.'));
  const after = await snapshot();
  assert.equal(after.score, stateBefore.score);
  assert.deepEqual(after.estimates, stateBefore.estimates);
  assert.equal(await evaluate('document.activeElement.id'), 'save-notes-button');
  assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'), false);
  assert.match(await evaluate(`document.querySelector('#save-notes-status').textContent`), /Download requested/);
  assert.deepEqual(pageRequests, requestedBefore, 'Saving notes must not create a network request');
  await rename(join(downloadPath, download.guid), join(output, name));
  report.downloads.push({name, suggestedFilename: download.suggestedFilename, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex')});
  passed(`actual saved notes retain reflections and original trace: ${name}`);
  return content;
}

async function readWriting() {
  return evaluate(`({notes: Object.fromEntries([...document.querySelectorAll('[data-reflection-item]')].map(field => [field.dataset.reflectionItem, field.value])), application: document.querySelector('#application-reflection')?.value})`);
}

async function openReflection(itemId) {
  const selector = `[data-reflection-item="${itemId}"]`;
  assert.ok(await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`), `Missing reflection for ${itemId}`);
  if (!await evaluate(`document.querySelector(${JSON.stringify(selector)}).closest('details').open`)) {
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).closest('details').querySelector('summary').focus()`);
    await key('Enter');
  }
  return selector;
}

async function writeText(selector, value) {
  await command('Page.bringToFront');
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
  for (const type of ['keyDown', 'keyUp']) {
    await command('Input.dispatchKeyEvent', {type, key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65, modifiers: 2});
  }
  for (const type of ['keyDown', 'keyUp']) {
    await command('Input.dispatchKeyEvent', {type, key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8, nativeVirtualKeyCode: 8});
  }
  if (value) await command('Input.insertText', {text: value});
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(selector)}).value`), value);
  assert.equal(await evaluate(`document.activeElement === document.querySelector(${JSON.stringify(selector)})`), true, 'Writing retains focus');
}

async function firstAnswerReadout() {
  return evaluate(`({summary: document.querySelector('#first-try-summary').textContent, estimates: [...document.querySelectorAll('.mastery-box output')].map(node => node.outerHTML), firstAnswers: [...document.querySelectorAll('.review-item .review-answers')].map(node => node.textContent)})`);
}
const passed = name => { report.checks.push(name); console.log(`PASS ${name}`); };

try {
  browser = spawn(executable, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-background-networking',
    '--disable-component-update', '--disable-sync', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'
  ], {stdio: ['ignore', 'ignore', 'pipe']});
  browser.stderr.on('data', data => { browserLog = (browserLog + data.toString()).slice(-6000); });
  let launchError;
  browser.on('error', error => { launchError = error; });
  let port;
  let endpoint;
  await waitFor(async () => {
    if (launchError) throw launchError;
    if (browser.exitCode !== null) throw new Error(`Browser exited ${browser.exitCode}: ${browserLog}`);
    [port, endpoint] = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).trim().split('\n');
    return Boolean(port && endpoint);
  }, 'browser startup', 600);
  socket = new WebSocket(`ws://127.0.0.1:${port}${endpoint}`);
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      clearTimeout(request.timer);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result);
    } else if (message.method === 'Browser.downloadWillBegin' || message.method === 'Browser.downloadProgress') {
      const value = message.params;
      downloads.set(value.guid, {...downloads.get(value.guid), ...value});
    } else if (message.method === 'Runtime.exceptionThrown') {
      pageErrors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
    } else if (message.method === 'Network.requestWillBeSent') {
      pageRequests.push(message.params.request.url);
    }
  });
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, {once: true}); socket.addEventListener('error', reject, {once: true}); });
  report.browser = await command('Browser.getVersion', {}, false);
  await command('Browser.setDownloadBehavior', {behavior: 'allowAndName', downloadPath, eventsEnabled: true}, false);
  const {targetId} = await command('Target.createTarget', {url: 'about:blank'}, false);
  ({sessionId} = await command('Target.attachToTarget', {targetId, flatten: true}, false));
  await command('Page.enable');
  await command('Runtime.enable');
  await command('Network.enable');


  async function openWritingPanel(){
    if(!await evaluate('document.querySelector("#reflection-file-panel").open'))await activate('#reflection-file-panel > summary');
  }
  async function chooseWriting(path){
    const doc=await command('DOM.getDocument');
    const node=await command('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'#reflection-file'});
    await command('DOM.setFileInputFiles',{nodeId:node.nodeId,files:[path]});
  }
  async function downloadWriting(name){
    const prior=new Set(downloads.keys());
    await activate('#save-reflections-button');
    let download;
    await waitFor(()=>{download=[...downloads.values()].find(d=>!prior.has(d.guid)&&d.state==='completed');return !!download;},'actual writing download');
    const target=join(output,name);
    await rename(join(downloadPath,download.guid),target);
    const bytes=await readFile(target);
    report.downloads.push({name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),suggestedFilename:download.suggestedFilename});
    return {path:target,document:JSON.parse(bytes.toString('utf8'))};
  }
  for(const [mode,url] of [['modular',base+'/index.html'],['standalone',pathToFileURL(join(project,'demo.html')).href]]){
    if(mode==='standalone')await command('Network.setBlockedURLs',{urls:['http://*','https://*']});
    await navigate(url,mode==='modular'?1280:390,1000);
    const {firstAnswers}=await lesson('mixed');
    const first=firstAnswers[0].item.id;
    const literal='My explanation: glucose → ATP.\nLiteral <em>wording</em> π � '+ 'continuous'.repeat(40);
    const application='My application: sunlight → chemical energy.\nI would explain the pathway.';
    await writeText(await openReflection(first),literal);
    await writeText('#application-reflection',application);
    const originalWriting=await readWriting();
    const unchanged=await firstAnswerReadout();
    await openWritingPanel();
    const saved=await downloadWriting(mode+'-writing.json');
    assert.equal(saved.document.notes.find(n=>n.item===first).text,literal);
    assert.equal(saved.document.application,application);
    assert.equal(Object.hasOwn(saved.document,'firstAnswers'),false);
    assert.deepEqual(await firstAnswerReadout(),unchanged);
    passed(mode+': actual downloaded file keeps writing separately from answer state');

    await writeText(await openReflection(first),'New local draft');
    await writeText('#application-reflection','Keep this until I confirm');
    const local=await readWriting();
    await chooseWriting(saved.path);
    await waitFor(()=>evaluate('!document.querySelector("#reflection-file-preview").hidden'),'writing preview');
    assert.deepEqual(await readWriting(),local);
    assert.ok(await evaluate('document.querySelector("#reflection-preview-writing").textContent.includes('+JSON.stringify(literal)+')'));
    assert.equal(await evaluate('!!document.querySelector("#reflection-preview-writing em")'),false);
    await activate('#reflection-replace-cancel');
    assert.deepEqual(await readWriting(),local);
    await chooseWriting(saved.path);
    await waitFor(()=>evaluate('!document.querySelector("#reflection-file-preview").hidden'),'second writing preview');
    await writeText(await openReflection(first),'An edit after preview');
    assert.equal(await evaluate('document.querySelector("#reflection-file-preview").hidden'),true);
    assert.equal((await readWriting()).notes[first],'An edit after preview');
    passed(mode+': preview, cancel and intervening edit preserve current writing');

    await chooseWriting(saved.path);
    await waitFor(()=>evaluate('!document.querySelector("#reflection-file-preview").hidden'),'accepted preview');
    await activate('#reflection-replace-confirm');
    assert.deepEqual(await readWriting(),originalWriting);
    assert.deepEqual(await firstAnswerReadout(),unchanged);
    await savedNotes(mode+'-restored-notes.txt',firstAnswers,/not started/i,{[first]:literal},application);
    passed(mode+': explicit replacement restores writing and existing text-note export without changing answers');


    const corrupt=structuredClone(saved.document);
    corrupt.notes.find(note=>note.item===first).text='BAD_UTF8_BYTE_MARKER';
    const encoded=JSON.stringify(corrupt);
    const marker=encoded.indexOf('BAD_UTF8_BYTE_MARKER');
    const badBytes=Buffer.concat([Buffer.from(encoded.slice(0,marker)),Buffer.from([0xc3,0x28]),Buffer.from(encoded.slice(marker+'BAD_UTF8_BYTE_MARKER'.length))]);
    const badPath=join(output,mode+'-invalid-utf8.json');await writeFile(badPath,badBytes);
    await chooseWriting(badPath);
    await waitFor(()=>evaluate('document.querySelector("#reflection-file-status").textContent.includes("not valid UTF-8")'),'invalid UTF-8 refusal');
    assert.equal(await evaluate('document.querySelector("#reflection-file-preview").hidden'),true);
    assert.deepEqual(await readWriting(),originalWriting);
    assert.deepEqual(await firstAnswerReadout(),unchanged);
    passed(mode+': malformed UTF-8 bytes refuse before preview or writing adoption');

    const bomBytes=Buffer.concat([Buffer.from([0xef,0xbb,0xbf]),await readFile(saved.path)]);
    const bomPath=join(output,mode+'-bom-writing.json');await writeFile(bomPath,bomBytes);
    await chooseWriting(bomPath);
    await waitFor(()=>evaluate('!document.querySelector("#reflection-file-preview").hidden'),'valid UTF-8 BOM preview');
    assert.ok(await evaluate('document.querySelector("#reflection-preview-writing").textContent.includes('+JSON.stringify(literal)+')'));
    await activate('#reflection-replace-confirm');
    assert.deepEqual(await readWriting(),originalWriting);
    assert.deepEqual(await firstAnswerReadout(),unchanged);
    passed(mode+': UTF-8 BOM, ordinary Unicode and literal U+FFFD preserve exact writing');
    report.byteFiles??=[];
    for(const [name,bytes,purpose]of [[mode+'-invalid-utf8.json',badBytes,'malformed byte refusal'],[mode+'-bom-writing.json',bomBytes,'valid Unicode and BOM']]){
      report.byteFiles.push({name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),purpose});
    }

    const wrong=structuredClone(saved.document);wrong.deck.items[0].prompt+=' changed';
    const wrongPath=join(output,mode+'-wrong-course.json');await writeFile(wrongPath,JSON.stringify(wrong));
    await chooseWriting(wrongPath);
    await waitFor(()=>evaluate('document.querySelector("#reflection-file-status").textContent.includes("different course")'),'wrong course refusal');
    assert.deepEqual(await readWriting(),originalWriting);
    assert.deepEqual(await firstAnswerReadout(),unchanged);
    passed(mode+': changed course identity refuses with original writing intact');

    await evaluate('window.originalFileArrayBuffer=File.prototype.arrayBuffer;File.prototype.arrayBuffer=function(){const file=this;return new Promise((resolve,reject)=>{window.releaseWritingRead=()=>window.originalFileArrayBuffer.call(file).then(resolve,reject);});};');
    await chooseWriting(saved.path);
    await waitFor(()=>evaluate('typeof window.releaseWritingRead==="function"'),'delayed real file read');
    await writeText(await openReflection(first),'Edited while the file was reading');
    await evaluate('window.releaseWritingRead();File.prototype.arrayBuffer=window.originalFileArrayBuffer;');
    await sleep(200);
    assert.equal(await evaluate('document.querySelector("#reflection-file-preview").hidden'),true);
    assert.equal((await readWriting()).notes[first],'Edited while the file was reading');
    passed(mode+': stale file completion cannot reopen retired preview');

    await chooseWriting(saved.path);
    await waitFor(()=>evaluate('!document.querySelector("#reflection-file-preview").hidden'),'preview before reset');
    await activate('#reset-button');
    assert.equal(await evaluate('document.querySelector("#reflection-file-preview").hidden'),true);
    await lesson('correct');
    const secondAnswers=await firstAnswerReadout();
    await openWritingPanel();
    await chooseWriting(saved.path);
    await waitFor(()=>evaluate('!document.querySelector("#reflection-file-preview").hidden'),'same course fresh-session preview');
    await activate('#reflection-replace-confirm');
    assert.deepEqual(await readWriting(),originalWriting);
    assert.deepEqual(await firstAnswerReadout(),secondAnswers);
    passed(mode+': reset retires preview; same-course writing can be reopened against new answers');

    const blank=structuredClone(saved.document);for(const note of blank.notes)note.text='';blank.application='';
    const blankPath=join(output,mode+'-blank-writing.json');await writeFile(blankPath,JSON.stringify(blank));
    await chooseWriting(blankPath);
    await waitFor(()=>evaluate('!document.querySelector("#reflection-file-preview").hidden'),'blank preview');
    assert.ok(await evaluate('document.querySelector("#reflection-preview-summary").textContent.includes("Writing in 0")'));
    await activate('#reflection-replace-confirm');
    const empty=await readWriting();
    assert.ok(Object.values(empty.notes).every(text=>text===''));assert.equal(empty.application,'');
    assert.deepEqual(await firstAnswerReadout(),secondAnswers);
    passed(mode+': explicit whole-note replacement includes intentional empty fields');

    await chooseWriting(saved.path);
    await waitFor(()=>evaluate('!document.querySelector("#reflection-file-preview").hidden'),'layout preview');
    await command('Emulation.setDeviceMetricsOverride',{width:320,height:850,deviceScaleFactor:1,mobile:false});
    await evaluate('document.querySelector("#reflection-preview-writing details").open=true;');
    assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false);
    await screenshot(mode+'-preview-320px.png','#reflection-preview-title');
    assert.ok(pageRequests.every(request=>request.startsWith(mode==='modular'?base:'file:')),'unexpected target request');
    passed(mode+': keyboard-operated preview remains literal at320px and needs no external request');
  }
  assert.deepEqual(pageErrors,[]);
  report.status='passed';
} catch (error) {
  report.status = 'failed';
  report.error = error.stack ?? String(error);
  report.browserLog = browserLog;
  report.pageErrors = pageErrors;
  if (sessionId) {
    try {
      report.lastPage = await evaluate(`({url: location.href, ready: document.readyState, focused: document.hasFocus(), progressStyle: document.querySelector('#progress-fill')?.getAttribute('style'), focus: document.activeElement.outerHTML, text: document.body.innerText.slice(0, 6000)})`);
      await screenshot('failed-state.png');
    } catch { /* Preserve the original failure when the browser is unavailable. */ }
  }
  console.error(report.error);
  process.exitCode = 1;
} finally {
  if (socket?.readyState === WebSocket.OPEN) {
    try { await command('Browser.close', {}, false); } catch { /* Browser may already have exited. */ }
  }
  socket?.close();
  for (const request of pending.values()) clearTimeout(request.timer);
  if (browser && browser.exitCode === null) browser.kill('SIGTERM');
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  await sleep(300);
  await rm(profile, {recursive: true, force: true, maxRetries: 5, retryDelay: 200});
  report.sourceAfterSha256 = {};
  for (const path of sourcePaths) {
    try { report.sourceAfterSha256[path] = createHash('sha256').update(await readFile(join(project, path))).digest('hex'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  if (JSON.stringify(report.sourceAfterSha256) !== JSON.stringify(report.sourceSha256)) {
    report.status = 'failed';
    report.sourceChanged = true;
    process.exitCode = 1;
  }
  await writeFile(join(output, 'browser-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`${report.status.toUpperCase()}: ${report.checks.length} browser checkpoints; ${join(output, 'browser-report.json')}`);
}
