#!/usr/bin/env node
/**
 * Independent course-handout receiving.
 * Node 22+; an installed Chrome/Chromium; no package or browser installation.
 * Uses the project's existing WebSocket/CDP pattern with separately authored checks.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFile, writeFile, mkdir, mkdtemp, rm, readdir} from 'node:fs/promises';
import {dirname, extname, join, resolve, basename} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const arguments_ = process.argv.slice(2);
const option = (name, fallback) => arguments_.includes(name)
  ? arguments_[arguments_.indexOf(name) + 1] : fallback;
const project = resolve(option('--root', join(dirname(fileURLToPath(import.meta.url)), '..')));
const executable = option('--browser', 'google-chrome');
const output = resolve(option('--output', join(project, 'course-handout-receiving')));
const fixturePath = join(project, 'docs/receiving/course-handout-7879c2abc07f/fixture.json');
const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));
assert.equal(fixture.format, 'course-handout-receiving-fixture/1');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
await mkdir(output, {recursive: true});
assert.deepEqual(await readdir(output), [], 'Receiving output directory must start empty');
const downloadPath = join(output, 'downloads');
await mkdir(downloadPath);
const profile = await mkdtemp(join(output, 'profile-'));
const report = {
  schema: 'course-handout-browser-receiving/1', status: 'running',
  project, executable, runtime: process.version,
  checkout: process.env.GITHUB_SHA ?? null,
  claim: 'https://github.com/Jacob-Met/RecallWeave/issues/35#issuecomment-6060395064',
  checks: [], artifacts: [], sourceSha256: {}, sourceUnchanged: false,
  faultInjection: 'Only named File.text promises are delayed/rejected after starting the real native read. Product internals are never accessed.',
  fileSelection: 'The real choose button opens Page.fileChooserOpened; DOM.setFileInputFiles supplies the native input selection.',
  printBoundary: 'Original window.print is called and observed; Page.printToPDF preserves actual Chrome-rendered PDFs. No operating-system printer is exercised.'
};
const sourcePaths = [
  'handout/index.html', 'handout/handout.css', 'handout.html',
  'src/course-handout.mjs', 'src/course-handout-ui.mjs', 'tools/make_handout.py',
  'src/deck.mjs', 'author/index.html', 'author/author.css', 'author.html',
  'src/deck-author.mjs', 'src/deck-author-ui.mjs', 'src/deck-author-loader.mjs',
  'src/deck-author-draft.mjs', 'tools/make_author.py',
  'tools/check_course_handout_browser.mjs',
  'docs/receiving/course-handout-7879c2abc07f/fixture.json'
];
for (const path of sourcePaths) {
  try { report.sourceSha256[path] = hash(await readFile(join(project, path))); }
  catch (error) { if (error.code !== 'ENOENT') throw error; report.sourceSha256[path] = null; }
}
await writeFile(join(output, 'fixture.json'), await readFile(fixturePath));
const sourceBefore = {...report.sourceSha256};
const downloads = new Map();
const chooserEvents = [];
const pageErrors = [];
let pageRequests = [];
let browser;
let socket;
let sessionId;
let browserLog = '';
let sequence = 0;
const pending = new Map();
const sleep = milliseconds => new Promise(resolve_ => setTimeout(resolve_, milliseconds));
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = resolve(project, `.${pathname === '/' ? '/handout/index.html' : pathname}`);
    if (!file.startsWith(project + '/')) { response.writeHead(403).end(); return; }
    const content = await readFile(file);
    const mime = {'.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css',
      '.json': 'application/json'}[extname(file)] ?? 'application/octet-stream';
    response.writeHead(200, {'Content-Type': mime + '; charset=utf-8'});
    response.end(content);
  } catch { response.writeHead(404).end('No file at the requested current-source path.'); }
});
await new Promise(resolve_ => server.listen(0, '127.0.0.1', resolve_));
const base = 'http://127.0.0.1:' + server.address().port;

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
const passed = name => { report.checks.push(name); console.log('PASS ' + name); };

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
async function chooseFile(file) {
  const count = chooserEvents.length;
  await activate('#choose-handout-file');
  await waitFor(() => chooserEvents.length > count, 'native handout file chooser');
  const event = chooserEvents.at(-1);
  assert.equal(event.mode, 'selectSingle');
  let identity = {backendNodeId: event.backendNodeId};
  if (!event.backendNodeId) {
    const {root} = await command('DOM.getDocument');
    const {nodeId} = await command('DOM.querySelector', {nodeId: root.nodeId, selector: '#handout-file'});
    identity = {nodeId};
  }
  const {node} = await command('DOM.describeNode', identity);
  const attributes = Object.fromEntries(Array.from({length: node.attributes.length / 2},
    (_, index) => node.attributes.slice(index * 2, index * 2 + 2)));
  assert.equal(attributes.id, 'handout-file');
  assert.equal(attributes.type, 'file');
  await command('DOM.setFileInputFiles', {files: file ? [file] : [], ...identity});
}
async function stagedFile(file) {
  await chooseFile(file);
  await waitFor(() => evaluate('!document.querySelector("#handout-preview").hidden && ' +
    '!document.querySelector("#use-handout-deck").matches(":disabled")'), 'validated pending preview');
}
async function acceptedState() {
  return evaluate('({title:document.querySelector("#selected-handout-title").textContent,' +
    'kind:document.querySelector("#handout-paper").dataset.handoutKind,' +
    'paper:document.querySelector("#handout-paper").innerHTML,' +
    'worksheet:document.querySelector("#preview-worksheet").checked,' +
    'key:document.querySelector("#preview-answer-key").checked})');
}
async function readPaper() {
  return evaluate('({title:document.querySelector(".paper-title")?.textContent,' +
    'attribution:document.querySelector(".paper-attribution")?.textContent,' +
    'license:document.querySelector(".paper-license")?.textContent,' +
    'questions:[...document.querySelectorAll(".handout-question")].map(q=>({' +
    'prompt:q.querySelector(".question-prompt")?.textContent,' +
    'options:[...q.querySelectorAll("li.question-option")].map(n=>n.textContent),' +
    'optionType:q.querySelector("ol")?.type,listStyle:q.querySelector("ol")?getComputedStyle(q.querySelector("ol")).listStyleType:null,' +
    'transfer:q.querySelector(".question-transfer")?.textContent,' +
    'answer:q.querySelector(".answer-label")?.textContent??null,' +
    'correct:q.querySelector(".correct-option")?.textContent??null,' +
    'explanation:q.querySelector(".question-explanation")?.textContent??null}))})');
}
function checkPaper(actual, deck, kind) {
  assert.equal(actual.title, deck.title);
  assert.equal(actual.attribution, deck.attribution);
  assert.equal(actual.license, deck.license);
  assert.equal(actual.questions.length, deck.items.length);
  for (let index = 0; index < deck.items.length; index++) {
    const expected = deck.items[index];
    const rendered = actual.questions[index];
    assert.equal(rendered.prompt, expected.prompt);
    assert.deepEqual(rendered.options, expected.options, 'Canonical options for question ' + (index + 1));
    assert.ok(rendered.optionType === 'A' || rendered.listStyle === 'upper-alpha',
      'Printed option positions use A–F to match the answer key');
    assert.equal(rendered.transfer, expected.transfer);
    if (kind === 'worksheet') {
      assert.equal(rendered.answer, null);
      assert.equal(rendered.correct, null);
      assert.equal(rendered.explanation, null);
    } else {
      const letter = String.fromCharCode(65 + expected.answer);
      assert.match(rendered.answer, new RegExp('^Answer\\s*:?\\s*' + letter + '\\b'));
      assert.equal(rendered.correct, expected.options[expected.answer]);
      assert.equal(rendered.explanation, expected.explanation);
    }
  }
}
async function noInjectionOrOverflow(label) {
  const state = await evaluate('({overflow:document.documentElement.scrollWidth > innerWidth+1,' +
    'injection:window.handoutInjection??null,keyInjection:window.keyInjection??null,' +
    'multiline:[...document.querySelectorAll(".paper-title,.paper-attribution,.paper-license,.question-prompt,.question-option,.question-transfer,.question-explanation")].filter(n=>n.textContent.includes("\\n")).map(n=>getComputedStyle(n).whiteSpace),' +
    'unexpected:document.querySelectorAll(".handout-question img,.handout-question script,' +
    '.handout-question iframe,.handout-question b,.handout-question section").length})');
  assert.equal(state.overflow, false, label + ' horizontal layout');
  assert.equal(state.injection, null, label + ' literal prompt');
  assert.equal(state.keyInjection, null, label + ' literal explanation');
  assert.equal(state.unexpected, 0, label + ' no markup interpreted as child elements');
  assert.ok(state.multiline.every(value => ['pre-wrap', 'pre-line', 'break-spaces', 'pre'].includes(value)),
    label + ' preserves authored line breaks visibly');
}
async function holdRead(file) {
  await evaluate('(() => { const original=File.prototype.text; const state=' +
    'window.__handoutReceiverRead={original,pending:false,release:null}; ' +
    'File.prototype.text=function(){const actual=original.call(this); if(this.name!==' +
    JSON.stringify(basename(file)) + ') return actual; state.pending=true; ' +
    'return new Promise((resolve,reject)=>{state.release=async(mode)=>{' +
    'const text=await actual; state.pending=false; if(mode==="reject") ' +
    'reject(new Error("Independent delayed read refusal")); else resolve(text);};});};})()');
}
async function releaseRead(mode = 'resolve') {
  await evaluate('window.__handoutReceiverRead.release(' + JSON.stringify(mode) + ')');
  await evaluate('File.prototype.text=window.__handoutReceiverRead.original');
  await sleep(100);
}
async function observePrint() {
  await evaluate('(() => {if(window.__handoutReceiverPrint) return; ' +
    'const original=window.print; const state=window.__handoutReceiverPrint={requests:[],before:0,after:0}; ' +
    'addEventListener("beforeprint",()=>state.before++); addEventListener("afterprint",()=>state.after++); ' +
    'window.print=function(...args){state.requests.push(document.querySelector("#handout-paper")?.dataset.handoutKind??null); ' +
    'return original.apply(window,args);};})()');
}
async function nativeText(program, args) {
  return new Promise((resolve_, reject) => {
    const child = spawn(program, args, {stdio: ['ignore', 'pipe', 'pipe']});
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => { child.kill('SIGTERM'); reject(new Error(program + ' timed out')); }, 10000);
    child.stdout.on('data', bytes => {
      stdout += bytes.toString('utf8');
      if (stdout.length > 1024 * 1024) { child.kill('SIGTERM'); reject(new Error('PDF text exceeded receiving limit')); }
    });
    child.stderr.on('data', bytes => { stderr = (stderr + bytes.toString('utf8')).slice(-6000); });
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', code => { clearTimeout(timer); resolve_({code, stdout, stderr}); });
  });
}
async function checkPdfText(name, kind, deck) {
  if (report.pdfTextTool?.available === false) return;
  let actual;
  try { actual = await nativeText('pdftotext', ['-layout', join(output, name + '.pdf'), '-']); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    report.pdfTextTool = {available: false,
      boundary: 'The hosted image has no pdftotext. PDFs and print screenshots are preserved for direct independent artifact inspection; no PDF text pass is claimed.'};
    console.log('PDF_TEXT_TOOL unavailable; actual PDF artifact inspection remains separate');
    return;
  }
  assert.equal(actual.code, 0, actual.stderr);
  report.pdfTextTool = {available: true, command: 'pdftotext -layout <actual-browser-PDF> -',
    normalization: 'NFKC and whitespace only, to compare printed line wrapping'};
  const normalize = value => value.normalize('NFKC').replace(/\s+/gu, ' ').trim();
  const text = normalize(actual.stdout);
  for (const value of [deck.title, deck.attribution, deck.license]) {
    assert.ok(text.includes(normalize(value)), 'PDF retains course metadata: ' + name);
  }
  for (const item of deck.items) {
    for (const value of [item.prompt, ...item.options, item.transfer]) {
      assert.ok(text.includes(normalize(value)), 'PDF retains complete prompt/option/transfer text: ' + name);
    }
    if (kind === 'answer-key') assert.ok(text.includes(normalize(item.explanation)),
      'Actual key PDF retains its explanation');
  }
  if (kind === 'worksheet') assert.ok(!text.includes('KEY-ONLY-'),
    'Actual worksheet PDF contains no private key explanation sentinel');
  await saveArtifact(name + '.txt', actual.stdout, {kind: 'actual PDF text extraction', documentKind: kind});
}
async function printArtifact(button, name, kind, deck) {
  await observePrint();
  const before = await evaluate('window.__handoutReceiverPrint.requests.length');
  await activate(button);
  await waitFor(() => evaluate('window.__handoutReceiverPrint.requests.length > ' + before),
    'actual window.print request');
  checkPaper(await readPaper(), deck, kind);
  const observed = await evaluate('window.__handoutReceiverPrint');
  assert.equal(observed.requests.at(-1), kind, 'Print button explicitly selects the requested document');
  await command('Emulation.setEmulatedMedia', {media: 'print'});
  checkPaper(await readPaper(), deck, kind);
  const geometry = await evaluate('({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth+1,' +
    'questions:[...document.querySelectorAll(".handout-question")].map(q=>{' +
    'const b=q.getBoundingClientRect();const s=getComputedStyle(q);return {height:b.height,width:b.width,' +
    'breakInside:s.breakInside,fontSize:getComputedStyle(q.querySelector(".question-prompt")).fontSize};}),' +
    'hiddenControls:[...document.querySelectorAll("button,input")].filter(n=>' +
    'n.getBoundingClientRect().width>0 && n.getBoundingClientRect().height>0).map(n=>n.id)})');
  assert.equal(geometry.overflow, false, 'Print media must not overflow horizontally');
  assert.ok(geometry.questions.every(q => q.width > 0 && q.height > 0));
  assert.deepEqual(geometry.hiddenControls, [], 'Print output excludes interactive controls');
  const {data} = await command('Page.printToPDF', {
    printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false,
    paperWidth: 8.2677, paperHeight: 11.6929, marginTop: 0.45,
    marginBottom: 0.45, marginLeft: 0.45, marginRight: 0.45, generateTaggedPDF: true
  });
  const bytes = Buffer.from(data, 'base64');
  assert.equal(bytes.subarray(0, 5).toString('ascii'), '%PDF-');
  assert.ok(bytes.length > 3000, 'Actual PDF is more than an empty wrapper');
  const pageCount = (bytes.toString('latin1').match(/\/Type\s*\/Page\b/g) ?? []).length;
  assert.ok(pageCount >= 1 && pageCount <= 12, 'Bounded printable fixture page count');
  await saveArtifact(name + '.pdf', bytes, {kind, pageCount, geometry,
    printObservation: await evaluate('window.__handoutReceiverPrint')});
  await checkPdfText(name, kind, deck);
  await screenshot(name + '.png', '.handout-question:last-child');
  await command('Emulation.setEmulatedMedia', {media: ''});
}
function checkExportText(text, deck, kind) {
  assert.ok(!text.includes('KEY-ONLY-') || kind === 'answer-key',
    'Worksheet complete HTML cannot contain private explanation sentinel text');
  const match = text.match(/<script\b[^>]*\bid=["']handout-data["'][^>]*>([\s\S]*?)<\/script\s*>/i);
  assert.ok(match, 'Downloaded document contains its declared handout-data projection');
  const data = JSON.parse(match[1]);
  assert.deepEqual(Object.keys(data).sort(),
    ['kind', 'title', 'attribution', 'license', 'concepts', 'questions'].sort(),
    'Only the declared document projection is embedded');
  assert.equal(data.kind, kind);
  for (const field of ['title', 'attribution', 'license', 'concepts']) {
    assert.deepEqual(data[field], deck[field]);
  }
  assert.equal(data.questions.length, deck.items.length);
  for (let index = 0; index < deck.items.length; index++) {
    const item = deck.items[index];
    const expected = {id: item.id, number: index + 1, prompt: item.prompt,
      options: item.options, transfer: item.transfer};
    if (kind === 'answer-key') { expected.answer = item.answer; expected.explanation = item.explanation; }
    assert.deepEqual(data.questions[index], expected,
      'Exact independent public projection, with no extra hidden fields');
    if (kind === 'worksheet') {
      assert.ok(!text.includes(item.explanation));
      assert.ok(!text.includes(JSON.stringify(item.explanation).slice(1, -1)));
    }
  }
  return data;
}

try {
  assert.ok(typeof WebSocket === 'function', 'Use Node 22 or newer with built-in WebSocket');
  browser = spawn(executable, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--disable-background-networking', '--disable-component-update', '--disable-sync',
    '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0',
    '--user-data-dir=' + profile, 'about:blank'
  ], {stdio: ['ignore', 'ignore', 'pipe']});
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
      pageRequests.push(message.params.request.url);
    }
  });
  await new Promise((resolve_, reject) => {
    socket.addEventListener('open', resolve_, {once: true});
    socket.addEventListener('error', reject, {once: true});
  });
  report.browser = await command('Browser.getVersion', {}, false);
  await command('Browser.setDownloadBehavior', {behavior: 'allowAndName', downloadPath, eventsEnabled: true}, false);
  const {targetId} = await command('Target.createTarget', {url: 'about:blank'}, false);
  ({sessionId} = await command('Target.attachToTarget', {targetId, flatten: true}, false));
  await command('Page.enable');
  await command('Runtime.enable');
  await command('Network.enable');
  await command('Page.setInterceptFileChooserDialog', {enabled: true});

  // Real producer: start in the shipped blank studio and type every fixture field.
  await navigate(base + '/author/index.html', '#check-draft');
  await textInput('#deck-title', fixture.title);
  await textInput('#deck-attribution', fixture.attribution);
  await textInput('#deck-license', fixture.license);
  await textInput('#concept-list textarea', fixture.concept);
  for (let index = 0; index < fixture.questions.length; index++) {
    if (index) await activate('#add-question');
    const item = fixture.questions[index];
    await textInput('#question-prompt', item.prompt);
    for (let count = 2; count < item.authoredOptions.length; count++) await activate('#add-option');
    for (let choice = 0; choice < item.authoredOptions.length; choice++) {
      await textInput('#option-list .option-row:nth-child(' + (choice + 1) + ') textarea', item.authoredOptions[choice]);
    }
    await click('#option-list .option-row:nth-child(' + (item.authoredAnswer + 1) + ') input[name="correct-answer"]');
    if (Number.isInteger(item.moveUp)) {
      await activate('#option-list .option-row:nth-child(' + (item.moveUp + 1) + ') button[aria-label^="Move up"]');
    }
    await textInput('#question-explanation', item.explanation);
    await textInput('#question-transfer', item.transfer);
  }
  await activate('#check-draft');
  await waitFor(() => evaluate('!document.querySelector("#download-deck").disabled'), 'native studio checked deck');
  const authored = await downloaded('#download-deck', 'authored-deck.json');
  const deck = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(authored.bytes));
  assert.equal(deck.title, fixture.title);
  assert.equal(deck.attribution, fixture.attribution);
  assert.equal(deck.license, fixture.license);
  assert.deepEqual(deck.concepts, [fixture.concept]);
  assert.equal(deck.items.length, fixture.questions.length);
  for (let index = 0; index < fixture.questions.length; index++) {
    const expected = fixture.questions[index];
    assert.equal(deck.items[index].prompt, expected.prompt);
    assert.deepEqual(deck.items[index].options, expected.expectedOptions);
    assert.equal(deck.items[index].answer, expected.expectedAnswer);
    assert.equal(deck.items[index].explanation, expected.explanation);
    assert.equal(deck.items[index].transfer, expected.transfer);
  }
  report.authoredCanonicalKeys = deck.items.map(item => String.fromCharCode(65 + item.answer));
  passed('actual studio typing, selected-option movement and checked JSON download preserve independent B/A/F key');

  const replacementFile = join(output, 'replacement-deck.json');
  const slowFile = join(output, 'slow-deck.json');
  const invalidFile = join(output, 'invalid-deck.json');
  const oversizedFile = join(output, 'oversized-deck.json');
  await writeFile(replacementFile, JSON.stringify(fixture.replacement));
  await writeFile(slowFile, JSON.stringify(fixture.replacement));
  const invalidDeck = structuredClone(fixture.replacement);
  invalidDeck.items[0].answer = 12;
  await writeFile(invalidFile, JSON.stringify(invalidDeck));
  await writeFile(oversizedFile, 'x'.repeat(262145));

  await navigate(base + '/handout/index.html', '#choose-handout-file');
  const empty = await acceptedState();
  for (const id of ['save-worksheet', 'save-answer-key', 'print-worksheet', 'print-answer-key']) {
    assert.equal(await evaluate('document.querySelector("#' + id + '").matches(":disabled")'), true);
  }
  await stagedFile(authored.file);
  assert.deepEqual(await acceptedState(), empty, 'Staging must not commit a deck');
  assert.equal(await evaluate('document.querySelector("#pending-handout-title").textContent'), fixture.title);
  await activate('#use-handout-deck');
  checkPaper(await readPaper(), deck, 'worksheet');
  assert.equal((await acceptedState()).kind, 'worksheet');
  assert.equal(await evaluate('document.querySelector("#handout-preview").hidden'), true);
  await noInjectionOrOverflow('modular accepted worksheet');
  await screenshot('teacher-desktop.png', '#choose-handout-file');
  passed('native file selection stages exact title and only explicit Use commits a worksheet');

  await click('#preview-answer-key');
  checkPaper(await readPaper(), deck, 'answer-key');
  const acceptedKey = await acceptedState();
  await stagedFile(replacementFile);
  assert.deepEqual(await acceptedState(), acceptedKey);
  await activate('#cancel-handout-preview');
  assert.deepEqual(await acceptedState(), acceptedKey);
  assert.equal(await evaluate('document.querySelector("#handout-preview").hidden'), true);
  for (const [file, message] of [[invalidFile, /answer/i], [oversizedFile, /256\s*KiB/i]]) {
    await chooseFile(file);
    await waitFor(async () => message.test(await evaluate('document.querySelector("#handout-status").textContent')),
      'native refused file');
    assert.match(await evaluate('document.querySelector("#handout-status").textContent'), message);
    assert.deepEqual(await acceptedState(), acceptedKey);
    assert.equal(await evaluate('document.querySelector("#handout-preview").hidden'), true);
  }
  passed('preview cancellation, invalid answer and oversized file preserve accepted deck, key mode and rendered paper');

  await holdRead(slowFile);
  await chooseFile(slowFile);
  await waitFor(() => evaluate('window.__handoutReceiverRead.pending'), 'held real native file read');
  await chooseFile(null);
  await releaseRead();
  assert.deepEqual(await acceptedState(), acceptedKey);
  assert.equal(await evaluate('document.querySelector("#handout-preview").hidden'), true);
  assert.equal(await evaluate('document.querySelector("#use-handout-deck").getClientRects().length'), 0);
  passed('opening a new chooser with no selection invalidates the pending native read without replacing accepted work');

  await holdRead(slowFile);
  await chooseFile(slowFile);
  await waitFor(() => evaluate('window.__handoutReceiverRead.pending'), 'second held native read');
  await stagedFile(replacementFile);
  await activate('#use-handout-deck');
  checkPaper(await readPaper(), fixture.replacement, 'worksheet');
  const replacementState = await acceptedState();
  const replacementStatus = await evaluate('document.querySelector("#handout-status").textContent');
  await releaseRead('reject');
  assert.deepEqual(await acceptedState(), replacementState);
  assert.equal(await evaluate('document.querySelector("#handout-status").textContent'), replacementStatus);
  await stagedFile(authored.file);
  await activate('#use-handout-deck');
  checkPaper(await readPaper(), deck, 'worksheet');
  passed('new explicit acceptance wins over an obsolete rejected read and defaults to worksheet mode');

  await click('#preview-answer-key');
  checkPaper(await readPaper(), deck, 'answer-key');
  await noInjectionOrOverflow('modular answer key');
  const worksheet = await downloaded('#save-worksheet', 'downloaded-worksheet.html');
  const answerKey = await downloaded('#save-answer-key', 'downloaded-answer-key.html');
  assert.match(worksheet.suggestedFilename, /\.worksheet\.html$/);
  assert.match(answerKey.suggestedFilename, /\.answer-key\.html$/);
  assert.notEqual(worksheet.suggestedFilename, answerKey.suggestedFilename);
  const worksheetText = new TextDecoder('utf-8', {fatal: true}).decode(worksheet.bytes);
  const keyText = new TextDecoder('utf-8', {fatal: true}).decode(answerKey.bytes);
  const worksheetData = checkExportText(worksheetText, deck, 'worksheet');
  const keyData = checkExportText(keyText, deck, 'answer-key');
  report.projectionData = {worksheet: worksheetData, answerKey: keyData};
  passed('actual separate worksheet/key downloads preserve canonical content and omit private worksheet data');

  // Explicit print controls select their requested material, regardless of preview.
  await printArtifact('#print-worksheet', 'teacher-worksheet-print', 'worksheet', deck);
  await printArtifact('#print-answer-key', 'teacher-answer-key-print', 'answer-key', deck);
  passed('teacher print buttons call native print in the explicit worksheet/key mode and produce bounded PDFs');

  // Direct-open teacher page uses the actual downloaded JSON, with no hosted reads.
  await navigate(pathToFileURL(join(project, 'handout.html')).href, '#choose-handout-file', 390, 844);
  await stagedFile(authored.file);
  await activate('#use-handout-deck');
  checkPaper(await readPaper(), deck, 'worksheet');
  await noInjectionOrOverflow('390px direct-open teacher worksheet');
  await screenshot('standalone-controls-390.png', '#choose-handout-file');
  await screenshot('standalone-worksheet-390.png', '.handout-question:last-child');
  await click('#preview-answer-key');
  checkPaper(await readPaper(), deck, 'answer-key');
  await noInjectionOrOverflow('390px direct-open teacher answer key');
  assert.ok(pageRequests.every(url => url.startsWith('file:') || url.startsWith('blob:')));
  passed('direct-open teacher page admits actual studio download and keeps worksheet/key readable at 390px without hosted requests');

  for (const [kind, exported] of [['worksheet', worksheet], ['answer-key', answerKey]]) {
    for (const width of [1280, 390]) {
      const label = kind + '-' + width;
      await navigate(pathToFileURL(exported.file).href, '#print-handout', width, width === 390 ? 844 : 1000);
      checkPaper(await readPaper(), deck, kind);
      await noInjectionOrOverflow('reopened ' + label);
      assert.ok(pageRequests.every(url => url.startsWith('file:') || url.startsWith('blob:')));
      if (kind === 'worksheet') {
        assert.equal(await evaluate('document.querySelectorAll(".answer-label,.correct-option,.question-explanation").length'), 0);
        assert.equal(await evaluate('document.documentElement.outerHTML.includes("KEY-ONLY-")'), false);
      }
      await printArtifact('#print-handout', 'reopened-' + label + '-print', kind, deck);
      passed('actual downloaded ' + label + ' reopens offline with exact text and a real print PDF');
    }
  }
  assert.deepEqual(pageErrors, [], 'All receiving routes must stay free of JavaScript exceptions');
  passed('literal markup stays text and no tested page produces a runtime exception');
  report.status = 'passed';
} catch (error) {
  report.status = 'failed';
  report.error = error.stack ?? String(error);
  report.browserLog = browserLog;
  report.pageErrors = pageErrors;
  if (sessionId) {
    try {
      report.lastPage = await evaluate('({url:location.href,ready:document.readyState,' +
        'focus:document.activeElement?.outerHTML,text:document.body?.innerText.slice(0,8000)})');
      await screenshot('failed-state.png');
    } catch { /* Preserve the first actual failure. */ }
  }
  console.error(report.error);
  process.exitCode = 1;
} finally {
  if (socket?.readyState === WebSocket.OPEN) {
    try { await command('Browser.close', {}, false); } catch { /* Browser may already be closed. */ }
  }
  socket?.close();
  for (const request of pending.values()) clearTimeout(request.timer);
  if (browser && browser.exitCode === null) browser.kill('SIGTERM');
  server.closeAllConnections();
  await new Promise(resolve_ => server.close(resolve_));
  await sleep(300);
  await rm(profile, {recursive: true, force: true});
  await rm(downloadPath, {recursive: true, force: true});
  await rm(join(output, 'oversized-deck.json'), {force: true});
  const after = {};
  for (const path of sourcePaths) {
    try { after[path] = hash(await readFile(join(project, path))); }
    catch (error) { if (error.code !== 'ENOENT') throw error; after[path] = null; }
  }
  report.sourceUnchanged = JSON.stringify(after) === JSON.stringify(sourceBefore);
  if (!report.sourceUnchanged) { report.status = 'failed'; process.exitCode = 1; }
  report.pageErrors = pageErrors;
  report.nativeFileChooserEvents = chooserEvents.length;
  report.totalArtifactBytes = report.artifacts.reduce((sum, item) => sum + item.bytes, 0);
  if (report.totalArtifactBytes > 8 * 1024 * 1024) {
    report.status = 'failed'; report.artifactLimitExceeded = true; process.exitCode = 1;
  }
  await writeFile(join(output, 'receiving-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log('HANDOUT_RECEIVING_RESULT ' + report.status.toUpperCase() +
    ' checks=' + report.checks.length + ' artifacts=' + report.artifacts.length +
    ' source_unchanged=' + report.sourceUnchanged);
}
