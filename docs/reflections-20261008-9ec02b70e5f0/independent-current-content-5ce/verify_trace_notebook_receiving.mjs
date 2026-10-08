#!/usr/bin/env node
/** Independent public-page receiving checks. No app globals are replaced.
 *
 * The CDP transport follows the existing optional browser runner's approach;
 * the native trace/notebook coupling controls below are separately authored.
 * Prior keyboard, canonical-ID and exact downloaded-paragraph helpers are retained. Every browser profile/database is disposable.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const option = (key, fallback) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
const pinsPath = resolve(option('--pins', join(here, 'source-pins.json')));
const pins = JSON.parse(await readFile(pinsPath, 'utf8'));
const project = resolve(option('--root', pins.source_root));
const output = resolve(option('--output', join(here, 'receiving')));
const executable = option('--browser', '/workspace/scratch/ce7eb129730f/project-browser-runtime/tmp/chromium');
const digest = raw => createHash('sha256').update(raw).digest('hex');
await mkdir(output, {recursive: false});
const downloadPath = join(output, 'downloads');
await mkdir(downloadPath);
const profile = await mkdtemp(join(output, 'profile-'));
const report = {status: 'running', project, pinsPath, executable, checks: [], downloads: [], traces: [], tracePreviews: [], fixtures: [], nativeActions: [], failurePageState: {}, pages: {}, sourceBefore: {}, sourceAfter: {}};

async function verifySources(destination) {
  for (const [name, pin] of Object.entries(pins.files)) {
    const raw = await readFile(join(project, name));
    const actual = {sha256: digest(raw), size: raw.length};
    report[destination][name] = actual;
    assert.deepEqual(actual, pin, `Frozen source changed: ${name}`);
  }
}
await verifySources('sourceBefore');
const deck = JSON.parse(await readFile(join(project, 'data/deck.json'), 'utf8'));
const itemsById = new Map(deck.items.map(item => [item.id, item]));
assert.equal(itemsById.size, deck.items.length);
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const file = resolve(project, `.${decodeURIComponent(url.pathname) === '/' ? '/index.html' : decodeURIComponent(url.pathname)}`);
    if (!file.startsWith(project + '/')) { response.writeHead(403).end(); return; }
    const body = await readFile(file);
    const mime = {'.html': 'text/html', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css'}[extname(file)];
    response.writeHead(200, {'Content-Type': `${mime ?? 'application/octet-stream'};charset=utf-8`}).end(body);
  } catch { response.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const base = `http://127.0.0.1:${server.address().port}`;
let browser, socket, browserLog = '', launchError;
let sequence = 0;
const pending = new Map();
const downloads = new Map();
const pages = new Map();
const sleep = ms => new Promise(done => setTimeout(done, ms));

async function waitFor(check, label) {
  let last;
  for (let n = 0; n < 120; n++) {
    try { if (await check()) return; } catch (error) { last = error; }
    await sleep(100);
  }
  throw new Error(`Timed out: ${label}${last ? `; ${last.message}` : ''}`);
}
function command(method, params = {}, page = null) {
  const id = ++sequence;
  const nativeAction = method.startsWith('Input.') || method === 'DOM.setFileInputFiles'
    ? {id, page:page?.name ?? null, method, params, startedAt:new Date().toISOString(), status:'pending'} : null;
  if (nativeAction) report.nativeActions.push(nativeAction);
  return new Promise((done, fail) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      if (nativeAction) { nativeAction.status='timeout'; nativeAction.finishedAt=new Date().toISOString(); }
      fail(new Error(`CDP timeout: ${method}; page=${page?.name ?? 'browser'}; params=${JSON.stringify(params)}`));
    }, 10000);
    pending.set(id, {
      done:value=>{ if(nativeAction){nativeAction.status='acknowledged';nativeAction.finishedAt=new Date().toISOString();} done(value); },
      fail:error=>{ if(nativeAction){nativeAction.status='error';nativeAction.finishedAt=new Date().toISOString();nativeAction.error=String(error);} fail(error); },
      timer
    });
    socket.send(JSON.stringify({id, method, params, ...(page ? {sessionId: page.sessionId} : {})}));
  });
}
async function evaluate(page, expression) {
  const result = await command('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true}, page);
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  return result.result.value;
}
async function key(page, name, code, number, modifiers = 0) {
  for (const type of ['keyDown', 'keyUp']) {
    await command('Input.dispatchKeyEvent', {type, key: name, code, windowsVirtualKeyCode: number, nativeVirtualKeyCode: number, modifiers,
      ...(name === 'Enter' && type === 'keyDown' ? {text: '\r', unmodifiedText: '\r'} : {})}, page);
  }
}
async function activate(page, selector) {
  await command('Page.bringToFront', {}, page);
  assert.equal(await evaluate(page, `!!document.querySelector(${JSON.stringify(selector)})`), true, `Missing ${selector}`);
  await evaluate(page, `document.querySelector(${JSON.stringify(selector)}).focus()`);
  await key(page, 'Enter', 'Enter', 13);
}
async function newPage(name, url, offline = false) {
  const {targetId} = await command('Target.createTarget', {url: 'about:blank'});
  const {sessionId} = await command('Target.attachToTarget', {targetId, flatten: true});
  const page = {name, targetId, sessionId, requests: [], errors: []};
  pages.set(sessionId, page);
  for (const method of ['Page.enable', 'Runtime.enable', 'Network.enable']) await command(method, {}, page);
  if (offline) await command('Network.setBlockedURLs', {urls: ['http://*', 'https://*']}, page);
  await command('Page.navigate', {url}, page);
  await waitFor(() => evaluate(page, `document.URL === ${JSON.stringify(url)} && !!document.querySelector('#start-button')`), `${name} welcome`);
  return page;
}
async function chooseText(page, item, choice, practice = false) {
  // Locate the native option by its actual text, independently of display order.
  const attr = practice ? 'data-practice-choice' : 'data-choice';
  const value = await evaluate(page, `(() => {
    const found = [...document.querySelectorAll('[${attr}]')].filter(button => button.textContent.endsWith(${JSON.stringify(item.options[choice])}));
    if (found.length !== 1) throw new Error('Choice text must have exactly one native receiver');
    return found[0].getAttribute('${attr}');
  })()`);
  await activate(page, `[${attr}=${JSON.stringify(value)}]`);
}
async function firstState(page) {
  return evaluate(page, `({summary:document.querySelector('#first-try-summary').textContent,
    mastery:[...document.querySelectorAll('.mastery-box output')].map(node => node.outerHTML),
    first:[...document.querySelectorAll('.review-answers')].map(node => node.textContent)})`);
}
async function writing(page) {
  return evaluate(page, `({notes:Object.fromEntries([...document.querySelectorAll('[data-reflection-item]')].map(node => [node.dataset.reflectionItem,node.value])),
    application:document.querySelector('#application-reflection').value})`);
}
async function lesson(page, correctness) {
  await waitFor(() => evaluate(page, `!!document.querySelector('#start-button') && document.querySelector('#progress-fill')?.style.width === '0%'`), `${page.name} native initialization`);
  await activate(page, '#start-button');
  await waitFor(() => evaluate(page, `!!document.querySelector('.question-card h2')`), `${page.name} first question`);
  const trace = [];
  for (let n = 0; n < deck.items.length; n++) {
    const prompt = await evaluate(page, `document.querySelector('.question-card h2').textContent`);
    const item = deck.items.find(item => item.prompt === prompt);
    assert.ok(item, 'Every prompt must resolve to the frozen canonical deck');
    assert.ok(!trace.some(row => row.id === item.id), 'No repeated canonical item');
    const correct = correctness(item, n);
    const choice = correct ? item.answer : (item.answer + 1 + n % (item.options.length - 1)) % item.options.length;
    await chooseText(page, item, choice);
    trace.push({id:item.id, choice, correct});
    await activate(page, '#next-button');
  }
  const identities = await evaluate(page, `[...document.querySelectorAll('[data-reflection-item]')].map(node => node.dataset.reflectionItem)`);
  assert.deepEqual(identities, trace.map(row => row.id));
  assert.deepEqual([...identities].sort(), [...itemsById.keys()].sort());
  return {trace, state:await firstState(page), retries:[]};
}
async function replaceWriting(page, selector, text) {
  await command('Page.bringToFront', {}, page);
  await evaluate(page, `document.querySelector(${JSON.stringify(selector)}).focus()`);
  await key(page, 'a', 'KeyA', 65, 2);
  await key(page, 'Backspace', 'Backspace', 8);
  if (text) await command('Input.insertText', {text}, page);
  assert.equal(await evaluate(page, `document.querySelector(${JSON.stringify(selector)}).value`), text);
}
async function editNote(page, id, text) {
  await command('Page.bringToFront', {}, page);
  const selector = `[data-reflection-item=${JSON.stringify(id)}]`;
  if (!await evaluate(page, `document.querySelector(${JSON.stringify(selector)}).closest('details').open`)) {
    await evaluate(page, `document.querySelector(${JSON.stringify(selector)}).closest('details').querySelector('summary').focus()`);
    await key(page, 'Enter', 'Enter', 13);
  }
  await replaceWriting(page, selector, text);
}
async function fillNotes(page, prefix) {
  const notes = {};
  // Edit by the deck's reverse canonical order, deliberately unrelated to UI order.
  for (const item of [...deck.items].reverse()) {
    notes[item.id] = `${prefix}/${item.id}: e\u0301 → ATP 🧑🏽‍🔬\nFirst try: this is learner writing, not the recorded result.\n\n${item.prompt}`;
    await editNote(page, item.id, notes[item.id]);
  }
  const application = `${prefix}/application\nFIRST SESSION\n6 of 6 is a quoted phrase, not a changed answer.`;
  await replaceWriting(page, '#application-reflection', application);
  const expected = {notes, application};
  assert.deepEqual(await writing(page), expected);
  return expected;
}
function paragraph(text, item, ordinal, trace) {
  const marker = `\n\n${ordinal + 1}. ${item.prompt}\n`;
  const start = text.indexOf(marker);
  assert.ok(start >= 0 && text.indexOf(marker, start + 1) === -1, `Exactly one canonical paragraph for ${item.id}`);
  const next = ordinal + 1 < trace.length
    ? `\n\n${ordinal + 2}. ${itemsById.get(trace[ordinal + 1].id).prompt}\n`
    : '\n\nYOUR APPLICATION REFLECTION — NOT SCORED\n';
  const end = text.indexOf(next, start + marker.length);
  assert.ok(end > start, `Next structural boundary for ${item.id}`);
  return text.slice(start + marker.length, end);
}
function exactLine(block, prefix, expected) {
  assert.deepEqual(block.split('\n').filter(line => line.startsWith(prefix)), [prefix + expected]);
}
async function download(page, name, record, expected, practiceStatus) {
  const before = {first:await firstState(page), writing:await writing(page)};
  const old = new Set(downloads.keys());
  await activate(page, '#save-notes-button');
  let saved;
  await waitFor(() => {
    saved = [...downloads.values()].find(value => !old.has(value.guid) && value.state === 'completed');
    return !!saved;
  }, name);
  const bytes = await readFile(join(downloadPath, saved.guid));
  const text = new TextDecoder('utf-8', {fatal: true}).decode(bytes);
  await writeFile(join(output, name), bytes);
  assert.match(saved.suggestedFilename, /^recallweave-study-notes-\d{4}-\d{2}-\d{2}\.txt$/);
  exactLine(text, 'This count ', 'describes this session; it is not a measure of your ability.');
  assert.ok(text.includes(`\n${record.trace.filter(row => row.correct).length} of ${deck.items.length} connections correct on the first try.\n`));
  assert.ok(text.includes(`\nPRACTICE\n${practiceStatus}\n`));
  assert.ok(text.includes(deck.attribution) && text.includes(deck.license));
  const quoted = value => value.split('\n').map(line => `  > ${line}`).join('\n');
  const parsed = [];
  for (const [ordinal, row] of record.trace.entries()) {
    const item = itemsById.get(row.id);
    const block = paragraph(text, item, ordinal, record.trace);
    exactLine(block, 'Your first answer: ', item.options[row.choice]);
    exactLine(block, 'First try: ', row.correct ? 'correct' : 'needs review');
    exactLine(block, 'Correct answer: ', item.options[item.answer]);
    exactLine(block, 'Explanation: ', item.explanation);
    exactLine(block, 'Apply the idea: ', item.transfer);
    const note = expected.notes[row.id];
    assert.ok(block.includes(`Your explanation — reflection, not scored:\n${note ? quoted(note) : '  Not written.'}`), `Exact latest note for ${row.id}`);
    for (const [otherId, other] of Object.entries(expected.notes)) {
      if (otherId !== row.id && other) assert.ok(!block.includes(quoted(other)), `No ${otherId} note under ${row.id}`);
    }
    const retry = record.retries.find(retry => retry.id === row.id);
    if (retry) {
      exactLine(block, 'Practice answer: ', item.options[retry.choice]);
      exactLine(block, 'Practice result: ', retry.choice === item.answer ? 'correct on retry' : 'keep reviewing');
    } else if (!row.correct) exactLine(block, 'Practice answer: ', 'not recorded.');
    else assert.equal(block.split('\n').some(line => line.startsWith('Practice answer: ')), false);
    parsed.push({id:row.id, choice:row.choice, note, retry:retry ?? null});
  }
  const application = text.split('\n\nYOUR APPLICATION REFLECTION — NOT SCORED\n')[1].split('\n\nDECK ATTRIBUTION\n')[0];
  assert.ok(application.endsWith(expected.application ? quoted(expected.application) : 'Not written.'));
  assert.deepEqual({first:await firstState(page),writing:await writing(page)}, before, 'Download leaves every live answer and field intact');
  report.downloads.push({name,page:page.name,bytes:bytes.length,sha256:digest(bytes),filename:saved.suggestedFilename,canonicalParagraphs:parsed,application:expected.application,practiceStatus});
  return text;
}
async function answerRetry(page, record, ordinal, correct) {
  const missed = record.trace.filter(row => !row.correct);
  const item = itemsById.get(missed[ordinal].id);
  assert.equal(await evaluate(page, `document.querySelector('.practice-card h2').textContent`), item.prompt);
  const choice = correct ? item.answer : (item.answer + 2) % item.options.length;
  await chooseText(page, item, choice, true);
  record.retries.push({id:item.id,choice});
}

async function tracePanel(page) {
  await command('Page.bringToFront', {}, page);
  if (!await evaluate(page, `document.querySelector('#trace-archive-panel').open`)) {
    await activate(page, '#trace-archive-panel > summary');
  }
}
async function traceView(page) {
  return evaluate(page, `({hidden:document.querySelector('#trace-preview').hidden,
    summary:document.querySelector('#trace-preview-summary').textContent,
    status:document.querySelector('#trace-restore-status').textContent,
    policy:document.querySelector('#trace-preview').textContent,
    fileNames:[...document.querySelector('#trace-file').files].map(file=>file.name)})`);
}
async function selectTrace(page, path, expectation) {
  await tracePanel(page);
  const {root} = await command('DOM.getDocument', {depth:1}, page);
  const {nodeId} = await command('DOM.querySelector', {nodeId:root.nodeId, selector:'#trace-file'}, page);
  assert.ok(nodeId, 'Native file receiver must exist');
  await command('DOM.setFileInputFiles', {nodeId, files:[path]}, page);
  await waitFor(async () => {
    const view = await traceView(page);
    return expectation === 'preview' ? !view.hidden && view.status.startsWith('Preview ready.')
      : view.hidden && view.status.includes('different course or course version');
  }, `${page.name} ${expectation} for selected native file`);
  const view = await traceView(page);
  report.tracePreviews.push({page:page.name,path,expectation,...view});
  return view;
}
async function downloadTrace(page, name, record, expectedMastery = null) {
  await tracePanel(page);
  assert.equal(await evaluate(page, `document.querySelector('#save-trace-button').disabled`), false);
  const before = {first:await firstState(page),writing:await writing(page)};
  const old = new Set(downloads.keys());
  await activate(page, '#save-trace-button');
  let saved;
  await waitFor(() => {
    saved = [...downloads.values()].find(value=>!old.has(value.guid) && value.state === 'completed');
    return !!saved;
  }, name);
  const bytes = await readFile(join(downloadPath,saved.guid));
  const text = new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  const value = JSON.parse(text);
  await writeFile(join(output,name),bytes);
  assert.match(saved.suggestedFilename,/^recallweave-learning-trace-\d{4}-\d{2}-\d{2}\.json$/);
  assert.deepEqual(Object.keys(value).sort(),['format','version','savedAt','deck','model','firstAnswers','mastery','practice'].sort());
  assert.deepEqual(value.deck,deck);
  assert.deepEqual(value.firstAnswers,record.trace.map(row=>({item:row.id,choice:row.choice})));
  assert.deepEqual(value.practice,{answers:record.retries.map(row=>({item:row.id,choice:row.choice}))});
  if (expectedMastery) assert.deepEqual(value.mastery,expectedMastery);
  for (const note of [...Object.values(before.writing.notes),before.writing.application]) {
    if (note) assert.ok(!text.includes(note), 'The answer archive must not embed the current notebook');
  }
  assert.deepEqual({first:await firstState(page),writing:await writing(page)},before);
  const receipt={name,page:page.name,bytes:bytes.length,sha256:digest(bytes),filename:saved.suggestedFilename,
    firstAnswers:value.firstAnswers,mastery:value.mastery,practice:value.practice};
  report.traces.push(receipt);
  return {value,bytes,path:join(output,name)};
}
const withoutSaveTime = text => text.replace(/^Saved:.*$/m,'Saved: <time>');

const passed = name => { report.checks.push(name); console.log(`PASS ${name}`); };

try {
  browser = spawn(executable, ['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run','--no-default-browser-check','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'], {stdio:['ignore','ignore','pipe']});
  browser.stderr.on('data', data => { browserLog = (browserLog + data).slice(-6000); });
  browser.on('error', error => { launchError = error; });
  let port, endpoint;
  await waitFor(async () => {
    if (launchError) throw launchError;
    if (browser.exitCode !== null) throw new Error(`Browser exited ${browser.exitCode}: ${browserLog}`);
    [port,endpoint] = (await readFile(join(profile,'DevToolsActivePort'),'utf8')).trim().split('\n');
    return !!(port && endpoint);
  }, 'browser start');
  socket = new WebSocket(`ws://127.0.0.1:${port}${endpoint}`);
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id); clearTimeout(request.timer);
      if (message.error) request.fail(new Error(message.error.message)); else request.done(message.result);
    } else if (message.method === 'Browser.downloadWillBegin' || message.method === 'Browser.downloadProgress') {
      const value = message.params;
      downloads.set(value.guid,{...downloads.get(value.guid),...value});
    } else if (message.method === 'Network.requestWillBeSent') {
      pages.get(message.sessionId)?.requests.push(message.params.request.url);
    } else if (message.method === 'Runtime.exceptionThrown') {
      pages.get(message.sessionId)?.errors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
    }
  });
  await new Promise((done,fail) => { socket.addEventListener('open',done,{once:true}); socket.addEventListener('error',fail,{once:true}); });
  report.browser = await command('Browser.getVersion');
  await command('Browser.setDownloadBehavior',{behavior:'allowAndName',downloadPath,eventsEnabled:true});
  const sourcePage = await newPage('modular-source',base+'/index.html');
  const sourceRecord = await lesson(sourcePage,()=>false);
  const sourceNotes = await fillNotes(sourcePage,'trace-source-notebook');
  await activate(sourcePage,'#practice-button');
  await answerRetry(sourcePage,sourceRecord,0,true);
  await activate(sourcePage,'#practice-next');
  await answerRetry(sourcePage,sourceRecord,1,false);
  await activate(sourcePage,'#back-to-review');
  assert.deepEqual(await firstState(sourcePage),sourceRecord.state);
  assert.deepEqual(await writing(sourcePage),sourceNotes);
  const sourceTrace = await downloadTrace(sourcePage,'source-paused-trace.json',sourceRecord);
  const target = await newPage('standalone-target',pathToFileURL(join(project,'demo.html')).href,true);
  const targetRecord = await lesson(target,()=>true);
  const targetNotes = await fillNotes(target,'target-current-notebook');
  assert.notDeepEqual(targetRecord.state,sourceRecord.state,'The restoring tab must start with observably different answers');
  const targetBefore = await download(target,'target-before-preview.txt',targetRecord,targetNotes,'No missed connections in the first session.');
  report.records={source:sourceRecord,targetBeforeRestore:targetRecord};
  report.notebooks={source:structuredClone(sourceNotes),targetBeforePreview:structuredClone(targetNotes)};
  passed('real modular source exports answers and paused practice only; standalone target starts with its own different answers and notebook');

  let preview = await selectTrace(target,sourceTrace.path,'preview');
  assert.ok(preview.summary.includes('First try: 0 of 6 connections correct.'));
  assert.ok(preview.summary.includes('Practice: 2 of 6 answers recorded.'));
  assert.ok(preview.policy.includes('any reflections already in this tab stay as they are.'));
  assert.deepEqual(await firstState(target),targetRecord.state);
  assert.deepEqual(await writing(target),targetNotes);
  await activate(target,'#restore-trace-cancel');
  preview = await traceView(target);
  assert.equal(preview.hidden,true);
  assert.ok(preview.status.startsWith('Restore canceled.'));
  assert.deepEqual(preview.fileNames,[]);
  const afterCancel=await download(target,'target-after-cancel.txt',targetRecord,targetNotes,'No missed connections in the first session.');
  assert.equal(withoutSaveTime(afterCancel),withoutSaveTime(targetBefore));
  passed('preview and explicit cancel leave first answers, practice and exact exported notebook unchanged');

  await selectTrace(target,sourceTrace.path,'preview');
  const editedId=deck.items[0].id, clearedId=deck.items[1].id;
  targetNotes.notes[editedId]='Late target edit after preview: e\u0301 → ATP 🧑🏽‍🔬\nFirst try: this remains unscored notebook text.';
  targetNotes.notes[clearedId]='';
  targetNotes.application='Late Apply-it entry after preview\nCorrect answer: a learner quotation, not a changed answer.';
  await editNote(target,editedId,targetNotes.notes[editedId]);
  await editNote(target,clearedId,'');
  await replaceWriting(target,'#application-reflection',targetNotes.application);
  assert.equal((await traceView(target)).hidden,false,'A notebook edit does not replace the pending answer preview');
  assert.deepEqual(await firstState(target),targetRecord.state);
  assert.deepEqual(await writing(target),targetNotes);
  report.notebooks.targetImmediatelyBeforeConfirmation=structuredClone(targetNotes);
  await activate(target,'#restore-trace-confirm');
  await waitFor(async()=>(await traceView(target)).status.startsWith('Trace restored.'),'confirmed native trace restoration');
  assert.deepEqual(await firstState(target),sourceRecord.state);
  assert.deepEqual(await writing(target),targetNotes,'Confirmation keeps the latest destination notebook, including clear and Apply-it edit');
  const restoredText=await download(target,'target-after-confirmed-restore.txt',sourceRecord,targetNotes,'Paused: 2 of 6 practice answers recorded; 1 correct on retry.');
  assert.ok(!restoredText.includes('trace-source-notebook/'));
  const targetTrace=await downloadTrace(target,'target-restored-trace.json',sourceRecord,sourceTrace.value.mastery);
  for (const key of ['firstAnswers','mastery','practice','deck','model']) assert.deepEqual(targetTrace.value[key],sourceTrace.value[key]);
  passed('confirmed same-course restore changes answers and practice while retaining edits made after preview; real notes and trace exports agree');

  const wrongCourse=structuredClone(sourceTrace.value);
  wrongCourse.deck.title+=' — different private course version';
  wrongCourse.deck.items[0].prompt+=' (different course wording)';
  const wrongPath=join(output,'wrong-course-same-ids.json');
  const wrongBytes=Buffer.from(JSON.stringify(wrongCourse,null,2)+'\n');
  await writeFile(wrongPath,wrongBytes);
  assert.deepEqual(wrongCourse.deck.items.map(item=>item.id),deck.items.map(item=>item.id));
  for (const key of ['firstAnswers','mastery','practice']) assert.deepEqual(wrongCourse[key],sourceTrace.value[key]);
  report.fixtures.push({name:'wrong-course-same-ids.json',sourceTraceSha256:digest(sourceTrace.bytes),sha256:digest(wrongBytes),
    changedFields:['deck.title','deck.items[0].prompt'],sameItemIds:wrongCourse.deck.items.map(item=>item.id),privateNegativeFixture:true});
  const refused=await selectTrace(target,wrongPath,'wrong-course-refusal');
  assert.equal(refused.hidden,true);
  assert.deepEqual(await firstState(target),sourceRecord.state);
  assert.deepEqual(await writing(target),targetNotes);
  const refusedText=await download(target,'target-after-wrong-course-refusal.txt',sourceRecord,targetNotes,'Paused: 2 of 6 practice answers recorded; 1 correct on retry.');
  assert.equal(withoutSaveTime(refusedText),withoutSaveTime(restoredText));
  assert.deepEqual(await readFile(wrongPath),wrongBytes);
  passed('a different course version with the same item IDs is refused through the native file receiver without changing exact study notes');

  const resumedRecord=structuredClone(sourceRecord);
  await activate(target,'#practice-button');
  await answerRetry(target,resumedRecord,2,true);
  await activate(target,'#back-to-review');
  assert.deepEqual(await firstState(target),sourceRecord.state);
  assert.deepEqual(await writing(target),targetNotes);
  await download(target,'target-after-resumed-practice.txt',resumedRecord,targetNotes,'Paused: 3 of 6 practice answers recorded; 2 correct on retry.');
  passed('restored practice resumes at the next unanswered item while every original first answer and destination note stays intact');

  await activate(target,'#reset-button');
  await waitFor(()=>evaluate(target,`!!document.querySelector('#start-button')`),'actual standalone reset');
  const freshRecord=await lesson(target,()=>true);
  const emptyNotes={notes:Object.fromEntries(deck.items.map(item=>[item.id,''])),application:''};
  assert.deepEqual(await writing(target),emptyNotes);
  const freshText=await download(target,'target-after-fresh-reset.txt',freshRecord,emptyNotes,'No missed connections in the first session.');
  assert.ok(!freshText.includes('target-current-notebook/') && !freshText.includes('Late target edit') && !freshText.includes('Late Apply-it'));
  assert.deepEqual(await writing(sourcePage),sourceNotes);
  assert.deepEqual(await firstState(sourcePage),sourceRecord.state);
  assert.deepEqual(await readFile(sourceTrace.path),sourceTrace.bytes);
  assert.ok(target.requests.every(url=>url.startsWith('file:')),'The standalone target must stay offline during file restore and export');
  report.records.targetAfterResumedPractice=resumedRecord;
  report.records.targetAfterFreshReset=freshRecord;
  passed('fresh reset clears the restored tab notebook and answers; source tab and original downloaded trace remain unchanged with HTTP(S) blocked');
  for (const page of pages.values()) assert.deepEqual(page.errors,[],`${page.name} page exceptions`);
  report.status='passed';
} catch (error) {
  report.status='failed'; report.error=error.stack??String(error); report.browserLog=browserLog;
  console.error(report.error); process.exitCode=1;
  for (const page of pages.values()) {
    try {
      report.failurePageState[page.name]=await evaluate(page, `({url:location.href,title:document.title,
        activeElement:document.activeElement?.outerHTML ?? null,
        question:document.querySelector('.question-card h2')?.textContent ?? null,
        firstSummary:document.querySelector('#first-try-summary')?.textContent ?? null,
        practice:document.querySelector('#practice-status')?.textContent ?? null,
        writing:Object.fromEntries([...document.querySelectorAll('[data-reflection-item]')].map(node=>[node.dataset.reflectionItem,node.value])),
        application:document.querySelector('#application-reflection')?.value ?? null,
        traceStatus:document.querySelector('#trace-restore-status')?.textContent ?? null,
        previewHidden:document.querySelector('#trace-preview')?.hidden ?? null,
        progress:document.querySelector('[role=progressbar]')?.outerHTML ?? null})`);
    } catch (captureError) { report.failurePageState[page.name]={captureError:String(captureError)}; }
  }
} finally {
  for (const page of pages.values()) report.pages[page.name]={requests:page.requests,errors:page.errors};
  if (socket?.readyState === WebSocket.OPEN) {
    try { await command('Browser.close'); } catch { /* Keep original failure. */ }
  }
  socket?.close();
  for (const request of pending.values()) clearTimeout(request.timer);
  if (browser && browser.exitCode === null) browser.kill('SIGTERM');
  server.closeAllConnections(); await new Promise(done=>server.close(done));
  await sleep(300); await rm(profile,{recursive:true,force:true});
  try { await verifySources('sourceAfter'); }
  catch (error) { report.status='failed';report.custodyError=error.stack??String(error);process.exitCode=1; }
  report.node=process.version;
  report.browserLog=browserLog;
  await writeFile(join(output,'receiving-report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(`${report.status.toUpperCase()}: ${report.checks.length} independent browser checks, ${report.downloads.length} actual notes files, ${report.traces.length} actual trace files`);
}
