import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SELF = fileURLToPath(import.meta.url);
const NODE = 'C:\\Users\\minec\\AppData\\Local\\Hamon\\node\\node-v24.21.0-win-x64\\node.exe';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const VERSION = '154.0.8037.98';
const BASELINE = path.join(ROOT, 'baseline-handout.html');
const CANDIDATE = path.join(ROOT, 'candidate-handout.html');
const PROFILE = path.join(ROOT, 'chrome-profile');
const DOWNLOADS = path.join(ROOT, 'downloads');
const started = performance.now();
const report = {
  schema: 'recallweave170-independent-browser-receiving/1',
  worker: 'estate-6e5752b49b6f/root',
  authoredBlind: 'Issue170 contract, original698902 handout and public DOM identifiers only; no candidate implementation or author tests read before freezing',
  baselineCommit: '698902f9c9c1d5c5023092b85b3632a7cb7a01ed',
  candidateCommit: '35ba3fe7a611395016fc5c808604ea1a815dc81b',
  expectedBlobs: { baseline: 'f349e78de0095da8989a0d6552a8bf180b82713f', candidate: '901c411bd9c3707a6272df10f785d68be5279bf2' },
  identity: { deviceId: '42ad330c-bb9a-4d2f-bcb4-6efeb4c6583e', user: os.userInfo().username, hostname: os.hostname(), platform: process.platform, node: process.version, execPath: process.execPath },
  scope: [
    'Native installed Chrome, fresh owned profile, public DOM and physical file downloads/reopens',
    'CDP supplies physical local files to the native file input; no operating-system file-picker acceptance',
    'Print actions are intercepted at window.print to inspect the requested current document; actual PDF rendering is a separate author gate',
    'One file.text promise and one read error are controlled browser injections to challenge stale completion; no claim of physical filesystem failure',
    'No normal profile, external network, install, PowerShell script, execution-policy change, service change, GitHub Actions or peer cleanup'
  ],
  groups: [], downloads: [], requests: [], errors: [], failures: [], accepted: false,
};
const hash = b => createHash('sha256').update(b).digest('hex');
const blob = b => createHash('sha1').update(Buffer.from('blob ' + b.length + '\0')).update(b).digest('hex');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const plain = v => JSON.parse(JSON.stringify(v));
function writeNew(name, value) { fs.writeFileSync(path.join(ROOT, name), value, { flag: 'wx' }); }
function fp(p) {
  const st = fs.lstatSync(p); assert.ok(st.isFile(), 'regular input: ' + p);
  const b = fs.readFileSync(p);
  return { path: p, bytes: b.length, sha256: hash(b), gitBlob: blob(b), mtimeMs: st.mtimeMs };
}
const hostile = '</script><img src="https://never-requested.invalid/recall170" onerror="globalThis.__literalExecuted=1">';
const deckA = {
  format: 'recallweave-deck/1',
  title: 'Coast & water — a short paper activity',
  attribution: 'Root receiving fixture only.\n  Literal <source> & "credit".',
  license: 'CC0 — receiving fixture.\n  Keep this exact permission text.',
  concepts: [' Coastal  systems ', 'Water\ncycle', 'Unselected fossil'],
  items: [
    { id: 'alpha', concept: 'Water\ncycle', prerequisites: [], prompt: 'OMITTED_PROMPT_ONE', options: ['OMITTED_OPTION_1A', 'OMITTED_OPTION_1B'], answer: 1, explanation: 'ANSWER_ONLY_ONE', transfer: 'OMITTED_TRANSFER_ONE' },
    { id: ' alpha ', concept: ' Coastal  systems ', prerequisites: ['Unselected fossil'], prompt: '  Literal coast question\n' + hostile, options: ['Keep <A> & spaces  exactly', 'Chosen B — coastal evidence'], answer: 1, explanation: 'ANSWER_ONLY_TWO: canonical coastal explanation.', transfer: 'Coast transfer:\n  use the original wording.' },
    { id: 'third', concept: 'Unselected fossil', prerequisites: [], prompt: 'OMITTED_PROMPT_THREE', options: ['OMITTED_OPTION_3A', 'OMITTED_OPTION_3B'], answer: 0, explanation: 'ANSWER_ONLY_THREE', transfer: 'OMITTED_TRANSFER_THREE' },
    { id: 'fourth\t', concept: 'Water\ncycle', prerequisites: [], prompt: '  Literal water question\n' + 'UnbrokenWord'.repeat(12), options: ['Chosen A — water evidence', 'Keep <B> & spacing   too'], answer: 0, explanation: 'ANSWER_ONLY_FOUR: canonical water explanation.', transfer: 'Water transfer:\n  retain this separate task.' },
  ],
};
const deckB = {
  format: 'recallweave-deck/1', title: 'Second checked deck', attribution: 'Independent receiving fixture B', license: 'CC0',
  concepts: ['Replacement'],
  items: [0, 1].map(i => ({ id: 'replacement-' + i, concept: 'Replacement', prerequisites: [], prompt: 'Replacement prompt ' + i, options: ['Replacement choice ' + i + ' A', 'Replacement choice ' + i + ' B'], answer: i, explanation: 'Replacement explanation ' + i, transfer: 'Replacement transfer ' + i })),
};
const fixtureA = path.join(ROOT, 'literal-deck-a.json');
const fixtureB = path.join(ROOT, 'literal-deck-b.json');
const invalid = path.join(ROOT, 'invalid-deck.json');
function inputSnapshot() {
  return {
    receiver: fp(SELF), baseline: fp(BASELINE), candidate: fp(CANDIDATE),
    fixtureA: fp(fixtureA), fixtureB: fp(fixtureB), invalid: fp(invalid),
    node: fp(process.execPath), chrome: fp(CHROME),
    chromeDll: fp(path.join(path.dirname(CHROME), VERSION, 'chrome.dll')),
  };
}
function expectedPayload(deck, kind, indexes) {
  const chosen = new Set(indexes);
  const concepts = new Set(deck.items.filter((_, i) => chosen.has(i)).map(q => q.concept));
  return {
    kind, title: deck.title, attribution: deck.attribution, license: deck.license,
    concepts: deck.concepts.filter(c => concepts.has(c)),
    questions: deck.items.flatMap((q, i) => chosen.has(i) ? [{
      id: q.id, number: i + 1, prompt: q.prompt, options: [...q.options], transfer: q.transfer,
      ...(kind === 'answer-key' ? { answer: q.answer, explanation: q.explanation } : {}),
    }] : []),
  };
}
function expectedPaper(deck, kind, indexes) {
  const model = expectedPayload(deck, kind, indexes);
  return {
    kind, label: kind === 'worksheet' ? 'Worksheet' : 'Answer key',
    title: deck.title, attribution: deck.attribution, license: deck.license, concepts: model.concepts,
    questions: model.questions.map(q => ({
      number: q.number, prompt: q.prompt, options: q.options, transfer: q.transfer,
      answerLabel: kind === 'answer-key' ? 'Answer ' + String.fromCharCode(65 + q.answer) : null,
      correct: kind === 'answer-key' ? q.options[q.answer] : null,
      explanation: kind === 'answer-key' ? q.explanation : null,
      responseLines: kind === 'worksheet' ? 3 : 0,
    })),
  };
}
const paperExpression = String.raw`(() => {
  const p = document.getElementById('handout-paper');
  const txt = (r, s) => r.querySelector(s)?.textContent ?? null;
  return {
    kind: p.dataset.handoutKind, label: p.getAttribute('aria-label'),
    title: txt(p, '.paper-title'), attribution: txt(p, '.paper-attribution'), license: txt(p, '.paper-license'),
    concepts: [...p.querySelectorAll('.paper-concepts li')].map(x => x.textContent),
    questions: [...p.querySelectorAll('.handout-question')].map(q => ({
      number: Number(q.dataset.questionNumber), prompt: txt(q, '.question-prompt'),
      options: [...q.querySelectorAll('.question-option')].map(x => x.textContent),
      transfer: txt(q, '.question-transfer'), answerLabel: txt(q, '.answer-label'),
      correct: txt(q, '.correct-option'), explanation: txt(q, '.question-explanation'),
      responseLines: q.querySelectorAll('.response-lines span').length
    }))
  };
})()`;
let child, socket, stdoutFd, stderrFd, nextId = 1;
const pending = new Map();
function command(method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP deadline: ' + method)); }, 10000);
    pending.set(id, { resolve, reject, timer, method });
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
}
async function connect(url) {
  socket = new WebSocket(url);
  socket.addEventListener('message', event => {
    const m = JSON.parse(event.data);
    if (m.id) {
      const q = pending.get(m.id);
      if (q) { clearTimeout(q.timer); pending.delete(m.id); m.error ? q.reject(new Error(q.method + ': ' + m.error.message)) : q.resolve(m.result); }
    } else if (m.method === 'Runtime.exceptionThrown' || (m.method === 'Log.entryAdded' && m.params.entry.level === 'error')) report.errors.push(m);
    else if (m.method === 'Network.requestWillBeSent') report.requests.push({ session: m.sessionId, url: m.params.request.url, method: m.params.request.method });
    else if (m.method === 'Browser.downloadWillBegin') report.downloads.push({ ...m.params, events: [] });
    else if (m.method === 'Browser.downloadProgress') {
      const d = report.downloads.find(d => d.guid === m.params.guid);
      if (d) { d.events.push(m.params); d.state = m.params.state; }
    }
  });
  socket.addEventListener('close', () => {
    for (const q of pending.values()) { clearTimeout(q.timer); q.reject(new Error('Browser socket closed: ' + q.method)); }
    pending.clear();
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('WebSocket deadline')), 10000);
    socket.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
    socket.addEventListener('error', e => { clearTimeout(timer); reject(new Error('WebSocket error: ' + e.message)); }, { once: true });
  });
}
async function evaluate(s, expression) {
  const r = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, s);
  assert.equal(r.exceptionDetails, undefined, 'Browser evaluation exception: ' + expression.slice(0, 180));
  return r.result.value;
}
async function waitPage(s, expression, name, ms = 10000) {
  const t = performance.now();
  while (!(await evaluate(s, expression))) { assert.ok(performance.now() - t < ms, name); await delay(40); }
}
async function newPage(file, interceptPrint = false) {
  const t = await command('Target.createTarget', { url: 'about:blank' });
  const a = await command('Target.attachToTarget', { targetId: t.targetId, flatten: true });
  const s = a.sessionId;
  for (const method of ['Page.enable', 'Runtime.enable', 'Log.enable', 'Network.enable']) await command(method, {}, s);
  await command('Network.setBlockedURLs', { urls: ['http://*', 'https://*', 'ftp://*'] }, s);
  await command('Emulation.setDeviceMetricsOverride', { width: 1280, height: 960, deviceScaleFactor: 1, mobile: false }, s);
  if (interceptPrint) await command('Page.addScriptToEvaluateOnNewDocument', { source: 'globalThis.__receiverPrints=[]; window.print=()=>globalThis.__receiverPrints.push(' + paperExpression + ');' }, s);
  const n = await command('Page.navigate', { url: pathToFileURL(file).href }, s);
  assert.equal(n.errorText, undefined, 'local document navigation');
  await waitPage(s, "document.readyState==='complete' && Boolean(document.getElementById('handout-paper'))", 'document ready');
  return { session: s, target: t.targetId, file };
}
async function click(s, selector) {
  const p = await evaluate(s, '(() => { const n=document.querySelector(' + JSON.stringify(selector) + '); if(!n) throw new Error("Missing control"); n.scrollIntoView({block:"center",inline:"nearest"}); const r=n.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2,width:r.width,height:r.height}; })()');
  assert.ok(p.width > 0 && p.height > 0, 'visible click target ' + selector);
  await command('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', clickCount: 1 }, s);
  await command('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1 }, s);
}
async function space(s, selector) {
  const id = selector.slice(1);
  await evaluate(s, 'document.querySelector(' + JSON.stringify(selector) + ').focus()');
  assert.equal(await evaluate(s, 'document.activeElement.id'), id, 'keyboard focus');
  await command('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', text: ' ', windowsVirtualKeyCode: 32, nativeVirtualKeyCode: 32 }, s);
  await command('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32, nativeVirtualKeyCode: 32 }, s);
}
async function selectFile(s, file) {
  await evaluate(s, "document.getElementById('handout-file').value=''");
  const d = await command('DOM.getDocument', {}, s);
  const n = await command('DOM.querySelector', { nodeId: d.root.nodeId, selector: '#handout-file' }, s);
  assert.ok(n.nodeId > 0);
  await command('DOM.setFileInputFiles', { nodeId: n.nodeId, files: [file] }, s);
}
async function useDeck(s, file, title) {
  await selectFile(s, file);
  await waitPage(s, "!document.getElementById('handout-preview').hidden", 'checked deck preview');
  assert.equal(await evaluate(s, "document.getElementById('pending-handout-title').textContent"), title);
  await click(s, '#use-handout-deck');
  await waitPage(s, "!document.getElementById('handout-paper').hidden", 'used handout visible');
}
async function paper(s, deck, kind, indexes, label) {
  const actual = await evaluate(s, paperExpression);
  assert.deepEqual(actual, expectedPaper(deck, kind, indexes), label);
  assert.equal(await evaluate(s, "typeof globalThis.__literalExecuted"), 'undefined', 'literal markup did not execute');
  assert.equal(await evaluate(s, 'document.images.length'), 0, 'literal markup did not create images');
  return actual;
}
async function selection(s, indexes, total = 4) {
  const actual = await evaluate(s, "[...document.querySelectorAll('#handout-question-list input[type=checkbox]')].map((n,i)=>({i,checked:n.checked,disabled:n.disabled,labels:[...n.labels].map(l=>l.textContent)}))");
  assert.equal(actual.length, total, 'native question checkbox count');
  assert.deepEqual(actual.filter(x => x.checked).map(x => x.i), [...indexes].sort((a, b) => a - b), 'selected original indices');
  for (const c of actual) { assert.equal(c.disabled, false); assert.equal(c.labels.length, 1); assert.match(c.labels[0], new RegExp('Question\\s+' + (c.i + 1) + '\\b')); }
  return actual;
}
async function empty(s, total = 4) {
  const v = await evaluate(s, "({disabled:document.getElementById('selected-handout-controls').disabled,hidden:document.getElementById('handout-paper').hidden,children:document.getElementById('handout-paper').childElementCount,guidance:!document.getElementById('handout-no-questions').hidden,editable:!document.getElementById('handout-question-controls').disabled})");
  assert.deepEqual(v, { disabled: true, hidden: true, children: 0, guidance: true, editable: true });
  await selection(s, [], total);
}
function payload(text) {
  const m = text.match(/<script id="handout-data" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(m, 'one saved JSON payload'); assert.equal((text.match(/id="handout-data"/g) || []).length, 1);
  return JSON.parse(m[1]);
}
async function download(s, selector, tag, deck, kind, indexes) {
  const count = report.downloads.length;
  await click(s, selector);
  const t = performance.now();
  while (!(report.downloads.length === count + 1 && report.downloads[count].state === 'completed')) {
    assert.ok(report.downloads.length <= count + 1, 'single explicit download');
    assert.ok(performance.now() - t < 10000, 'physical download completion: ' + tag);
    await delay(40);
  }
  const record = report.downloads[count];
  const from = path.join(DOWNLOADS, record.guid);
  const to = path.join(DOWNLOADS, tag + '.html');
  assert.ok(!fs.existsSync(to), 'new receiving download name');
  const bytes = fs.readFileSync(from);
  fs.renameSync(from, to);
  record.custody = { path: to, originalGuidPath: from, bytes: bytes.length, sha256: hash(bytes), gitBlob: blob(bytes), renamedAfterComplete: true };
  const text = bytes.toString('utf8');
  assert.deepEqual(payload(text), expectedPayload(deck, kind, indexes), 'saved exact independent projection ' + tag);
  if (deck === deckA && indexes.length < deckA.items.length) {
    for (const [i, q] of deckA.items.entries()) if (!indexes.includes(i)) {
      for (const token of [q.prompt, ...q.options, q.transfer, q.explanation]) assert.equal(text.includes(token), false, 'unselected content absent: ' + token);
    }
    assert.equal(text.includes('Unselected fossil'), false, 'unselected-only concept absent');
  }
  if (kind === 'worksheet') for (const q of deck.items) assert.equal(text.includes(q.explanation), false, 'complete worksheet excludes explanation');
  assert.match(record.suggestedFilename, new RegExp('\\.' + kind + '\\.html$'));
  return { file: to, bytes, text };
}
async function capture(s, name) {
  const r = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, s);
  const b = Buffer.from(r.data, 'base64');
  assert.deepEqual([...b.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  writeNew(name, b); return { file: name, bytes: b.length, sha256: hash(b) };
}
function group(name, details) { report.groups.push({ name, accepted: true, ...details }); }
try {
  assert.equal(process.platform, 'win32'); assert.equal(process.version, 'v24.21.0');
  assert.equal(path.resolve(process.execPath).toLowerCase(), NODE.toLowerCase());
  const disk = fs.statfsSync(ROOT);
  report.admission = { freeMemoryBytes: os.freemem(), freeDiskBytes: disk.bavail * disk.bsize };
  assert.ok(report.admission.freeMemoryBytes > 2 * 1024 ** 3); assert.ok(report.admission.freeDiskBytes > 1024 ** 3);
  writeNew('literal-deck-a.json', JSON.stringify(deckA, null, 2) + '\n');
  writeNew('literal-deck-b.json', JSON.stringify(deckB, null, 2) + '\n');
  writeNew('invalid-deck.json', '{ invalid');
  report.before = inputSnapshot();
  assert.equal(report.before.baseline.gitBlob, report.expectedBlobs.baseline); assert.equal(report.before.baseline.bytes, 32997);
  assert.equal(report.before.candidate.gitBlob, report.expectedBlobs.candidate); assert.equal(report.before.candidate.bytes, 38458);
  assert.equal(report.before.node.sha256, 'ba4e6d110e8c1592a1ecd390f6b05f3da124b13871a5be62b341a07a853c6c32');
  assert.equal(report.before.chrome.sha256, '6849d2982038de9f9489a7b3858f3b785b7fec06a842c93c517281d21995c8ca');
  assert.equal(report.before.chromeDll.sha256, 'ee522fdc3adafa17c48d351e4613d40b61fe98ddbd7de57b3f20a36b43561c5d');
  fs.mkdirSync(PROFILE); fs.mkdirSync(DOWNLOADS);
  stdoutFd = fs.openSync(path.join(ROOT, 'chrome.stdout'), 'wx'); stderrFd = fs.openSync(path.join(ROOT, 'chrome.stderr'), 'wx');
  const args = ['--headless=new', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-component-update', '--disable-default-apps', '--disable-extensions', '--disable-sync', 'about:blank'];
  report.command = [CHROME, ...args];
  child = spawn(CHROME, args, { cwd: ROOT, windowsHide: true, stdio: ['ignore', stdoutFd, stderrFd] });
  report.browserPid = child.pid;
  child.once('error', e => report.failures.push({ phase: 'spawn', message: e.message }));
  const active = path.join(PROFILE, 'DevToolsActivePort'), t = performance.now();
  while (!fs.existsSync(active)) { assert.equal(child.exitCode, null); assert.ok(performance.now() - t < 20000, 'browser readiness'); await delay(100); }
  const lines = fs.readFileSync(active, 'utf8').trim().split(/\r?\n/);
  assert.match(lines[0], /^\d+$/); assert.match(lines[1], /^\/devtools\/browser\/[a-zA-Z0-9-]+$/);
  await connect('ws://127.0.0.1:' + Number(lines[0]) + lines[1]);
  report.browserVersion = await command('Browser.getVersion');
  assert.equal(report.browserVersion.product, 'Chrome/' + VERSION);
  await command('Browser.setDownloadBehavior', { behavior: 'allowAndName', downloadPath: DOWNLOADS, eventsEnabled: true });

  const baseline = await newPage(BASELINE); const bs = baseline.session;
  await useDeck(bs, fixtureA, deckA.title); await paper(bs, deckA, 'worksheet', [0, 1, 2, 3], 'baseline full worksheet');
  const baselineWs = await download(bs, '#save-worksheet', 'baseline-all-worksheet', deckA, 'worksheet', [0, 1, 2, 3]);
  const baselineKey = await download(bs, '#save-answer-key', 'baseline-all-key', deckA, 'answer-key', [0, 1, 2, 3]);
  group('original actual-browser baseline and physical full-copy oracle', { copies: [baselineWs.file, baselineKey.file], questionCount: 4 });

  const candidate = await newPage(CANDIDATE, true); const s = candidate.session;
  assert.equal(await evaluate(s, "document.getElementById('handout-question-controls').disabled"), true, 'no selection before deck use');
  await useDeck(s, fixtureA, deckA.title);
  assert.equal(await evaluate(s, "document.activeElement.classList.contains('paper-title')"), true, 'use focuses paper title');
  const labels = await selection(s, [0, 1, 2, 3]);
  for (const [i, l] of labels.entries()) { assert.ok(l.labels[0].includes(deckA.items[i].prompt)); assert.ok(l.labels[0].includes(deckA.items[i].concept)); }
  await paper(s, deckA, 'worksheet', [0, 1, 2, 3], 'candidate all-question worksheet');
  const allWs = await download(s, '#save-worksheet', 'candidate-all-worksheet', deckA, 'worksheet', [0, 1, 2, 3]);
  const allKey = await download(s, '#save-answer-key', 'candidate-all-key', deckA, 'answer-key', [0, 1, 2, 3]);
  assert.deepEqual(allWs.bytes, baselineWs.bytes, 'all-question worksheet byte-identical to actual baseline download');
  assert.deepEqual(allKey.bytes, baselineKey.bytes, 'all-question key byte-identical to actual baseline download');
  const ax = await command('Accessibility.getFullAXTree', {}, s);
  const boxes = ax.nodes.filter(n => !n.ignored && n.role?.value === 'checkbox');
  assert.equal(boxes.length, 4); for (let i = 0; i < boxes.length; i++) assert.match(boxes[i].name.value, new RegExp('Question\\s+' + (i + 1) + '\\b'));
  group('native labelled all-selection and complete legacy HTML byte parity', { labels, accessibleCheckboxes: boxes.map(n => ({ role: n.role.value, name: n.name.value })) });

  await click(s, '#clear-handout-questions'); await empty(s);
  const emptyDownloads = report.downloads.length;
  for (const selector of ['#save-worksheet', '#save-answer-key', '#print-worksheet', '#print-answer-key']) await click(s, selector);
  await evaluate(s, "['save-worksheet','save-answer-key','print-worksheet','print-answer-key'].forEach(id=>document.getElementById(id).dispatchEvent(new MouseEvent('click',{bubbles:true})))");
  await delay(150);
  assert.equal(report.downloads.length, emptyDownloads, 'empty selection cannot save');
  assert.deepEqual(await evaluate(s, 'globalThis.__receiverPrints'), [], 'empty selection cannot print stale paper');
  await space(s, '#handout-question-3'); await space(s, '#handout-question-1');
  await selection(s, [1, 3]); await paper(s, deckA, 'worksheet', [1, 3], 'reverse checkbox actions preserve original numbers/order');
  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false }, s);
  await evaluate(s, 'scrollTo(0,0)');
  const narrow = await evaluate(s, "({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,boxes:[...document.querySelectorAll('#handout-question-list input')].map(n=>({left:n.getBoundingClientRect().left,right:n.getBoundingClientRect().right}))})");
  assert.equal(narrow.width, 390); assert.ok(narrow.scrollWidth <= 391 && narrow.bodyWidth <= 391, 'narrow page no horizontal overflow');
  for (const b of narrow.boxes) assert.ok(b.left >= 0 && b.right <= 390, 'checkbox horizontally reachable');
  const narrowImage = await capture(s, 'selected-narrow.png');
  await command('Emulation.setDeviceMetricsOverride', { width: 1280, height: 960, deviceScaleFactor: 1, mobile: false }, s);
  group('empty-state refusal and keyboard selection preserve original source order', { originalNumbers: [2, 4], nativeKeyboardEvents: 4, narrow, screenshot: narrowImage, syntheticDisabledClicksAlsoRefused: true });

  const subsetWs = await download(s, '#save-worksheet', 'subset-worksheet', deckA, 'worksheet', [1, 3]);
  const subsetKey = await download(s, '#save-answer-key', 'subset-key', deckA, 'answer-key', [1, 3]);
  await click(s, '#preview-answer-key'); await paper(s, deckA, 'answer-key', [1, 3], 'explicit selected key preview');
  await click(s, '#print-worksheet'); await click(s, '#print-answer-key');
  assert.deepEqual(await evaluate(s, 'globalThis.__receiverPrints'), [expectedPaper(deckA, 'worksheet', [1, 3]), expectedPaper(deckA, 'answer-key', [1, 3])], 'print requests carry current exact respective copy');
  const desktopImage = await capture(s, 'selected-key-desktop.png');
  writeNew('selected-key-dom.html', await evaluate(s, 'document.documentElement.outerHTML'));
  group('selected-only complete saved copies and print-request content', { selectedIds: [' alpha ', 'fourth\t'], physicalCopies: [subsetWs.file, subsetKey.file], printSnapshots: 2, screenshot: desktopImage });

  const reopened = [];
  for (const [saved, kind] of [[subsetWs, 'worksheet'], [subsetKey, 'answer-key']]) {
    const page = await newPage(saved.file, true);
    await paper(page.session, deckA, kind, [1, 3], 'physically saved ' + kind + ' reopened offline');
    const copiedModel = await evaluate(page.session, "JSON.parse(document.getElementById('handout-data').textContent)");
    assert.deepEqual(copiedModel, expectedPayload(deckA, kind, [1, 3]));
    await click(page.session, '#print-handout');
    assert.deepEqual(await evaluate(page.session, 'globalThis.__receiverPrints'), [expectedPaper(deckA, kind, [1, 3])]);
    reopened.push({ file: saved.file, kind, sha256: hash(fs.readFileSync(saved.file)), model: copiedModel });
  }
  group('physical selected downloads reopen without the source deck or network', { reopened });

  await selectFile(s, fixtureB); await waitPage(s, "!document.getElementById('handout-preview').hidden", 'replacement preview');
  await click(s, '#cancel-handout-preview'); await selection(s, [1, 3]); await paper(s, deckA, 'answer-key', [1, 3], 'preview cancellation retains subset');
  await selectFile(s, invalid);
  await waitPage(s, "document.getElementById('handout-status').textContent.includes('not valid JSON')", 'invalid file refusal');
  await selection(s, [1, 3]); await paper(s, deckA, 'answer-key', [1, 3], 'invalid file retains subset');
  await evaluate(s, "globalThis.__originalFileText=File.prototype.text; File.prototype.text=function(){return Promise.reject(new Error('controlled unreadable file'));}");
  await selectFile(s, fixtureB);
  await waitPage(s, "document.getElementById('handout-status').textContent.includes('controlled unreadable file')", 'controlled unreadable refusal');
  await evaluate(s, 'File.prototype.text=globalThis.__originalFileText');
  await selection(s, [1, 3]); await paper(s, deckA, 'answer-key', [1, 3], 'unreadable result retains subset');
  await evaluate(s, "document.getElementById('handout-file').dispatchEvent(new Event('cancel'))");
  await selection(s, [1, 3]); await paper(s, deckA, 'answer-key', [1, 3], 'file cancel event retains subset');
  await evaluate(s, "File.prototype.text=function(){const f=this;return new Promise((resolve,reject)=>{globalThis.__releaseRead=()=>globalThis.__originalFileText.call(f).then(resolve,reject);});}");
  await selectFile(s, fixtureB);
  await waitPage(s, "typeof globalThis.__releaseRead==='function'", 'pending controlled file read');
  await space(s, '#handout-question-3'); await selection(s, [1]);
  await evaluate(s, 'globalThis.__releaseRead().then(()=>{File.prototype.text=globalThis.__originalFileText; return true;})');
  assert.equal(await evaluate(s, "document.getElementById('handout-preview').hidden"), true, 'late read cannot open replacement preview');
  await paper(s, deckA, 'answer-key', [1], 'late file completion cannot replace new selection');
  await selectFile(s, fixtureB); await waitPage(s, "!document.getElementById('handout-preview').hidden", 'second replacement preview');
  await space(s, '#handout-question-0'); await selection(s, [0, 1]);
  assert.equal(await evaluate(s, "document.getElementById('handout-preview').hidden"), true, 'selection retires already checked preview');
  await evaluate(s, "document.getElementById('use-handout-deck').dispatchEvent(new MouseEvent('click',{bubbles:true}))");
  await paper(s, deckA, 'answer-key', [0, 1], 'retired Use action cannot replace current deck');
  group('cancelled invalid unreadable and late/retired file work preserve ongoing selection', { controlledReadErrors: 1, controlledLateReads: 1, syntheticCancelEvents: 1, retiredPreviewUseEvents: 1, finalOriginalNumbers: [1, 2] });

  await useDeck(s, fixtureB, deckB.title); await selection(s, [0, 1], 2);
  await paper(s, deckB, 'worksheet', [0, 1], 'successful new deck resets selection and kind');
  await click(s, '#clear-handout-questions'); await empty(s, 2);
  await click(s, '#select-all-handout-questions'); await selection(s, [0, 1], 2);
  await paper(s, deckB, 'worksheet', [0, 1], 'select all current replacement deck');
  const storage = await evaluate(s, '({local:localStorage.length,session:sessionStorage.length})');
  assert.deepEqual(storage, { local: 0, session: 0 });
  group('successful new deck and Select all reset only to current checked content', { replacementQuestionCount: 2, storage });

  assert.equal(report.groups.length, 7);
  assert.equal(report.downloads.length, 6);
  assert.ok(report.downloads.every(d => d.state === 'completed'));
  assert.deepEqual(report.errors, [], 'no page runtime or console errors');
  assert.ok(report.requests.length >= 4, 'actual native navigations observed');
  const ownFilePrefix = pathToFileURL(ROOT + path.sep).href;
  assert.ok(report.requests.every(r => r.url.startsWith(ownFilePrefix) || r.url.startsWith('blob:null/')), 'only own file/blob requests');
  report.semanticChecksPassed = true;
} catch (error) {
  report.failures.push({ phase: 'browser-contract', name: error.name, message: error.message, stack: error.stack });
} finally {
  if (socket?.readyState === WebSocket.OPEN) {
    try { await command('Browser.close'); report.closeRequested = true; } catch (e) { report.closeResponse = e.message; }
  }
  if (child) {
    const t = performance.now();
    while (child.exitCode === null && child.signalCode === null && performance.now() - t < 8000) await delay(100);
    if (child.exitCode === null && child.signalCode === null) {
      const r = spawnSync('C:\\Windows\\System32\\taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { encoding: 'utf8', windowsHide: true, timeout: 5000 });
      report.ownedFallbackStop = { pid: child.pid, status: r.status, stdout: r.stdout, stderr: r.stderr, error: r.error?.message };
      report.failures.push({ phase: 'browser-close', message: 'Stopped only receiver-owned child after graceful-close deadline' });
    }
    report.browserExit = { exitCode: child.exitCode, signal: child.signalCode };
  }
  socket?.close();
  if (stdoutFd !== undefined) fs.closeSync(stdoutFd); if (stderrFd !== undefined) fs.closeSync(stderrFd);
  try {
    report.after = inputSnapshot();
    report.inputUnchanged = JSON.stringify(report.before) === JSON.stringify(report.after);
    if (!report.inputUnchanged) report.failures.push({ phase: 'input-invariance', message: 'Receiving source, fixture or runtime changed' });
  } catch (e) { report.failures.push({ phase: 'final-input-readback', message: e.message }); }
  report.elapsedMs = performance.now() - started;
  report.accepted = Boolean(report.semanticChecksPassed && report.inputUnchanged && report.failures.length === 0 && report.browserExit?.exitCode === 0);
  writeNew('independent-browser-receiving.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ accepted: report.accepted, groups: report.groups.map(g => g.name), elapsedMs: report.elapsedMs, physicalDownloads: report.downloads.length, failures: report.failures, browserExit: report.browserExit, receipt: path.join(ROOT, 'independent-browser-receiving.json') }));
  process.exitCode = report.accepted ? 0 : 1;
}
