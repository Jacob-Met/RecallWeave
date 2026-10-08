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
// Independently added course-receiving helpers. Existing six trace helpers remain unchanged.
const importedPrompt = 'Choose one connection from this deck and explain how it relates to another idea in your own words.';
const bundledPrompt = 'Trace energy from sunlight to a cell doing work. Where does the form of energy change, and what molecule transfers it to cellular processes?';
const emptyCourseWriting = course => ({notes:Object.fromEntries(course.items.map(item=>[item.id,''])),application:''});

async function pickerView(page) {
  return evaluate(page, `({hidden:document.querySelector('#deck-preview').hidden,
    title:document.querySelector('#deck-preview-title')?.textContent ?? null,
    status:document.querySelector('#deck-status').textContent,
    error:document.querySelector('#deck-status').classList.contains('deck-error'),
    fileNames:[...document.querySelector('#deck-file').files].map(file=>file.name)})`);
}
async function selectCourse(page, path, expectedTitle = null) {
  await command('Page.bringToFront', {}, page);
  const {root} = await command('DOM.getDocument', {depth:1}, page);
  const {nodeId} = await command('DOM.querySelector', {nodeId:root.nodeId,selector:'#deck-file'}, page);
  assert.ok(nodeId, 'The landed native deck file receiver must exist');
  await command('DOM.setFileInputFiles', {nodeId,files:[path]}, page);
  await waitFor(async()=> {
    const value=await pickerView(page);
    return expectedTitle===null ? value.error && value.hidden : !value.hidden && value.title===expectedTitle;
  }, `${page.name} ${expectedTitle===null?'refused':'previewed'} course input`);
  const value=await pickerView(page);
  report.courseInputs.push({page:page.name,path,expectedTitle,...value});
  return value;
}
async function startCourse(page, course) {
  await activate(page,'#start-deck');
  await waitFor(()=>evaluate(page,`!!document.querySelector('.question-card h2')`), `${page.name} explicit course activation`);
  const value=await evaluate(page,`({progress:document.querySelector('#step-count').textContent,
    current:Number(document.querySelector('[role="progressbar"]').getAttribute('aria-valuenow')),
    total:Number(document.querySelector('[role="progressbar"]').getAttribute('aria-valuemax')),
    notes:document.querySelectorAll('[data-reflection-item]').length,
    application:!!document.querySelector('#application-reflection'),
    feedback:document.querySelector('#feedback-slot').textContent,
    traceDisabled:document.querySelector('#save-trace-button').disabled})`);
  assert.deepEqual(value,{progress:`0 / ${course.items.length}`,current:0,total:course.items.length,notes:0,application:false,feedback:'',traceDisabled:true});
  const picker=await pickerView(page);
  assert.equal(picker.hidden,true);
  assert.deepEqual(picker.fileNames,[]);
  return value;
}
async function completeCourse(page, course, correctness) {
  const trace=[];
  for(let ordinal=0;ordinal<course.items.length;ordinal++) {
    const prompt=await evaluate(page,`document.querySelector('.question-card h2').textContent`);
    const item=course.items.find(value=>value.prompt===prompt);
    assert.ok(item,'Every imported prompt must resolve to its own canonical deck');
    assert.ok(!trace.some(row=>row.id===item.id),'Imported first answers cannot repeat an ID');
    const correct=correctness(item,ordinal);
    const choice=correct?item.answer:(item.answer+1)%item.options.length;
    await chooseText(page,item,choice);
    trace.push({id:item.id,choice,correct});
    await activate(page,'#next-button');
  }
  const fields=await evaluate(page,`[...document.querySelectorAll('[data-reflection-item]')].map(node=>node.dataset.reflectionItem)`);
  assert.deepEqual(fields,trace.map(row=>row.id));
  assert.deepEqual([...fields].sort(),course.items.map(item=>item.id).sort());
  return {trace,state:await firstState(page),retries:[]};
}
async function fillCourseWriting(page, course, prefix) {
  const expected=emptyCourseWriting(course);
  for(const item of [...course.items].reverse()) {
    expected.notes[item.id]=`${prefix}/${item.id}: ${item.prompt}\nOwn course writing e\u0301 → 🧑🏽‍🔬`;
    await editNote(page,item.id,expected.notes[item.id]);
  }
  expected.application=`${prefix}/application\nThis explanation belongs to the selected local course.`;
  await replaceWriting(page,'#application-reflection',expected.application);
  assert.deepEqual(await writing(page),expected);
  return expected;
}
async function downloadCourseNotes(page,name,course,record,expected,practiceStatus,prompt) {
  const before={first:await firstState(page),writing:await writing(page)};
  assert.deepEqual(before.writing,expected);
  assert.equal(await evaluate(page,`document.querySelector('#application-prompt').textContent`),prompt);
  const old=new Set(downloads.keys());
  await activate(page,'#save-notes-button');
  let saved;
  await waitFor(()=> {
    saved=[...downloads.values()].find(value=>!old.has(value.guid)&&value.state==='completed');
    return !!saved;
  },name);
  const bytes=await readFile(join(downloadPath,saved.guid));
  const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  await writeFile(join(output,name),bytes);
  assert.match(saved.suggestedFilename,/^recallweave-study-notes-\d{4}-\d{2}-\d{2}\.txt$/);
  assert.equal(text.split('\n')[1],course.title);
  assert.ok(text.includes(`\n${record.trace.filter(row=>row.correct).length} of ${course.items.length} connections correct on the first try.\n`));
  exactLine(text,'This count ','describes this session; it is not a measure of your ability.');
  assert.ok(text.includes(`\nPRACTICE\n${practiceStatus}\n`));
  const byId=new Map(course.items.map(item=>[item.id,item]));
  const quoted=value=>value.split('\n').map(line=>`  > ${line}`).join('\n');
  const paragraphs=[];
  for(const [ordinal,row] of record.trace.entries()) {
    const item=byId.get(row.id);
    const marker=`\n\n${ordinal+1}. ${item.prompt}\n`;
    const start=text.indexOf(marker);
    assert.ok(start>=0 && text.indexOf(marker,start+1)===-1,`One actual exported paragraph for ${row.id}`);
    const next=ordinal+1<record.trace.length?`\n\n${ordinal+2}. ${byId.get(record.trace[ordinal+1].id).prompt}\n`:'\n\nYOUR APPLICATION REFLECTION — NOT SCORED\n';
    const end=text.indexOf(next,start+marker.length);
    assert.ok(end>start);
    const block=text.slice(start+marker.length,end);
    exactLine(block,'Concept: ',item.concept);
    exactLine(block,'Your first answer: ',item.options[row.choice]);
    exactLine(block,'First try: ',row.correct?'correct':'needs review');
    exactLine(block,'Correct answer: ',item.options[item.answer]);
    exactLine(block,'Explanation: ',item.explanation);
    exactLine(block,'Apply the idea: ',item.transfer);
    const note=expected.notes[row.id];
    assert.ok(block.includes(`Your explanation — reflection, not scored:\n${note?quoted(note):'  Not written.'}`));
    for(const [id,value] of Object.entries(expected.notes)) {
      if(id!==row.id && value) assert.ok(!block.includes(quoted(value)),`No note crossover from reused ${id}`);
    }
    const retry=record.retries.find(value=>value.id===row.id);
    if(retry) {
      exactLine(block,'Practice answer: ',item.options[retry.choice]);
      exactLine(block,'Practice result: ',retry.choice===item.answer?'correct on retry':'keep reviewing');
    } else if(!row.correct) exactLine(block,'Practice answer: ','not recorded.');
    else assert.equal(block.split('\n').some(line=>line.startsWith('Practice answer: ')),false);
    paragraphs.push({id:row.id,choice:row.choice,note,retry:retry??null});
  }
  const application=text.split('\n\nYOUR APPLICATION REFLECTION — NOT SCORED\n')[1].split('\n\nDECK ATTRIBUTION\n')[0];
  assert.equal(application,`Prompt: ${prompt}\n${expected.application?quoted(expected.application):'Not written.'}`);
  assert.ok(text.includes(`\n\nDECK ATTRIBUTION\n${course.attribution}\n${course.license}\n`));
  if(prompt===importedPrompt) {
    assert.ok(!text.includes(bundledPrompt),'No energy-specific prompt may leak into imported study notes');
    assert.ok(!text.includes(deck.attribution),'Imported notes must retain their own supplied attribution');
  }
  assert.deepEqual({first:await firstState(page),writing:await writing(page)},before);
  report.downloads.push({name,page:page.name,bytes:bytes.length,sha256:digest(bytes),filename:saved.suggestedFilename,
    courseTitle:course.title,canonicalParagraphs:paragraphs,application:expected.application,prompt,practiceStatus});
  return text;
}
async function downloadCourseTrace(page,name,course,record) {
  await tracePanel(page);
  const before={first:await firstState(page),writing:await writing(page)};
  const old=new Set(downloads.keys());
  await activate(page,'#save-trace-button');
  let saved;
  await waitFor(()=> {
    saved=[...downloads.values()].find(value=>!old.has(value.guid)&&value.state==='completed');
    return !!saved;
  },name);
  const bytes=await readFile(join(downloadPath,saved.guid));
  const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  await writeFile(join(output,name),bytes);
  assert.deepEqual(Object.keys(value).sort(),['format','version','savedAt','deck','model','firstAnswers','mastery','practice'].sort());
  assert.deepEqual(value.deck,course);
  assert.deepEqual(value.firstAnswers,record.trace.map(row=>({item:row.id,choice:row.choice})));
  assert.deepEqual(value.practice,{answers:record.retries.map(row=>({item:row.id,choice:row.choice}))});
  for(const note of [...Object.values(before.writing.notes),before.writing.application]) {
    if(note) assert.ok(!bytes.toString('utf8').includes(note));
  }
  assert.deepEqual({first:await firstState(page),writing:await writing(page)},before);
  report.traces.push({name,page:page.name,bytes:bytes.length,sha256:digest(bytes),filename:saved.suggestedFilename,
    courseTitle:course.title,firstAnswers:value.firstAnswers,mastery:value.mastery,practice:value.practice});
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
  // New landed-course coupling starts only after all six historical scenarios above.
  report.courseInputs=[];
  report.courseRecords={};
  report.courseNotebooks={};
  const importedCourse={
    format:'recallweave-deck/1',title:'Observation and decisions — reused IDs, independent content',
    attribution:'Independent native receiver fixture: original three-question workshop.',
    license:'Test fixture content only; no provider or learning-benefit claim.',
    concepts:['observation','decision','communication'],
    items:[
      {id:deck.items[2].id,concept:'observation',prerequisites:[],prompt:'Which workshop sentence records an observation?',
        options:['The meeting should be delayed.','The log records a start at 09:00.'],answer:1,
        explanation:'The recorded start time is the observed event in this workshop.',transfer:'Separate an observed record from an interpretation.'},
      {id:deck.items[0].id,concept:'decision',prerequisites:['observation'],prompt:'Which choice keeps this workshop decision traceable?',
        options:['Keep only the conclusion.','Hide the record.','Change the original event.','Delete the reason.','State the record and the reason for the decision.'],answer:4,
        explanation:'A traceable choice keeps its observation and reason visible.',transfer:'Explain how a record supports one choice.'},
      {id:deck.items[1].id,concept:'communication',prerequisites:['decision'],prompt:'Which message distinguishes this workshop record from its interpretation?',
        options:['Treat an interpretation as the record.','Send only the final action.','Name the observation, interpretation, and chosen action.'],answer:2,
        explanation:'The three parts remain distinct in the message.',transfer:'Write one example containing each part.'}
    ]
  };
  assert.deepEqual(importedCourse.items.map(item=>item.id).sort(),deck.items.slice(0,3).map(item=>item.id).sort());
  const importedPath=join(output,'reused-id-local-course.json');
  const importedBytes=Buffer.from(JSON.stringify(importedCourse,null,2)+'\n');
  const invalidPath=join(output,'malformed-local-course.json');
  const invalidBytes=Buffer.from('{"title": "invalid local course",');
  await writeFile(importedPath,importedBytes);
  await writeFile(invalidPath,invalidBytes);
  report.fixtures.push({name:'reused-id-local-course.json',sha256:digest(importedBytes),bytes:importedBytes.length,
    sameBundledItemIds:importedCourse.items.map(item=>item.id),changedContent:true,privateReceivingFixture:true});
  report.fixtures.push({name:'malformed-local-course.json',sha256:digest(invalidBytes),bytes:invalidBytes.length,privateNegativeFixture:true});

  const preImportNotes=await fillNotes(target,'bundled-before-course-import');
  const beforeCourseText=await download(target,'picker-bundled-before-preview.txt',freshRecord,preImportNotes,'No missed connections in the first session.');
  const refusedCourse=await selectCourse(target,invalidPath);
  assert.ok(refusedCourse.status.includes('not valid JSON') && refusedCourse.status.includes('current session is unchanged'));
  assert.deepEqual(refusedCourse.fileNames,[]);
  assert.deepEqual(await firstState(target),freshRecord.state);
  assert.deepEqual(await writing(target),preImportNotes);
  const afterInvalidText=await download(target,'picker-bundled-after-refusal.txt',freshRecord,preImportNotes,'No missed connections in the first session.');
  assert.equal(withoutSaveTime(afterInvalidText),withoutSaveTime(beforeCourseText));
  await selectCourse(target,importedPath,importedCourse.title);
  assert.deepEqual(await firstState(target),freshRecord.state);
  assert.deepEqual(await writing(target),preImportNotes);
  preImportNotes.notes[deck.items[0].id]='Late bundled note while imported deck preview is pending.';
  preImportNotes.application='Late bundled Apply-it entry before Cancel preview.';
  await editNote(target,deck.items[0].id,preImportNotes.notes[deck.items[0].id]);
  await replaceWriting(target,'#application-reflection',preImportNotes.application);
  await activate(target,'#cancel-deck');
  assert.equal((await pickerView(target)).hidden,true);
  assert.deepEqual((await pickerView(target)).fileNames,[]);
  assert.deepEqual(await firstState(target),freshRecord.state);
  assert.deepEqual(await writing(target),preImportNotes);
  await download(target,'picker-bundled-after-cancel.txt',freshRecord,preImportNotes,'No missed connections in the first session.');
  report.courseNotebooks.bundledBeforeStart=structuredClone(preImportNotes);
  passed('malformed course input and canceled real deck preview preserve first answers and actual notes, including edits made after preview');

  await selectTrace(target,sourceTrace.path,'preview');
  await selectCourse(target,importedPath,importedCourse.title);
  assert.equal((await traceView(target)).hidden,false,'Staging a course alone cannot discard a valid current-course answer preview');
  report.courseRecords.activation=await startCourse(target,importedCourse);
  const staleTrace=await traceView(target);
  assert.equal(staleTrace.hidden,true);
  assert.deepEqual(staleTrace.fileNames,[]);
  assert.ok(staleTrace.status.startsWith('Your lesson changed.'));
  assert.equal(await evaluate(target,`document.querySelector('#lesson-description').textContent`),importedCourse.title);
  const firstImportedPrompt=await evaluate(target,`document.querySelector('.question-card h2').textContent`);
  await selectTrace(target,sourceTrace.path,'wrong-course-refusal');
  assert.equal(await evaluate(target,`document.querySelector('.question-card h2').textContent`),firstImportedPrompt);
  assert.equal(await evaluate(target,`document.querySelector('#step-count').textContent`),'0 / 3');
  const importedRecord=await completeCourse(target,importedCourse,(_item,ordinal)=>ordinal!==1);
  assert.equal(importedRecord.trace.filter(row=>row.correct).length,2);
  const blankImported=emptyCourseWriting(importedCourse);
  assert.deepEqual(await writing(target),blankImported,'Starting a course clears all reused-ID notes and the Apply-it entry');
  const startedText=await downloadCourseNotes(target,'picker-imported-after-start.txt',importedCourse,importedRecord,blankImported,
    'Not started. 1 missed connection is available for practice.',importedPrompt);
  assert.ok(!startedText.includes('bundled-before-course-import') && !startedText.includes('Late bundled'));
  report.courseRecords.importedFirst=structuredClone(importedRecord);
  passed('explicit imported-course Start clears reused-ID writing and answers, invalidates the old trace preview, and exports its own canonical content and Apply-it prompt');

  const importedNotes=await fillCourseWriting(target,importedCourse,'imported-course-notebook');
  const firstImportedState=await firstState(target);
  await activate(target,'#practice-button');
  const missedImported=importedRecord.trace.find(row=>!row.correct);
  const retryItem=importedCourse.items.find(item=>item.id===missedImported.id);
  assert.equal(await evaluate(target,`document.querySelector('.practice-card h2').textContent`),retryItem.prompt);
  await chooseText(target,retryItem,retryItem.answer,true);
  importedRecord.retries.push({id:retryItem.id,choice:retryItem.answer});
  await activate(target,'#practice-next');
  assert.deepEqual(await firstState(target),firstImportedState);
  assert.deepEqual(await writing(target),importedNotes);
  const importedText=await downloadCourseNotes(target,'picker-imported-after-practice.txt',importedCourse,importedRecord,importedNotes,
    'Complete: 1 of 1 practice answers recorded; 1 correct on retry.',importedPrompt);
  const importedTrace=await downloadCourseTrace(target,'picker-imported-trace.json',importedCourse,importedRecord);
  await activate(target,'#use-bundled-deck');
  assert.equal((await pickerView(target)).title,deck.title);
  assert.deepEqual(await firstState(target),firstImportedState);
  assert.deepEqual(await writing(target),importedNotes);
  await activate(target,'#cancel-deck');
  const afterBundledCancel=await downloadCourseNotes(target,'picker-imported-after-bundled-cancel.txt',importedCourse,importedRecord,importedNotes,
    'Complete: 1 of 1 practice answers recorded; 1 correct on retry.',importedPrompt);
  assert.equal(withoutSaveTime(afterBundledCancel),withoutSaveTime(importedText));
  report.courseRecords.importedAfterPractice=structuredClone(importedRecord);
  report.courseNotebooks.importedBeforeReset=structuredClone(importedNotes);
  passed('imported canonical answer identities, separate practice and notebook survive canceled bundled return; actual notes and answer-only trace use the imported course');

  await selectTrace(target,importedTrace.path,'preview');
  const importedUrl=await evaluate(target,'location.href');
  await activate(target,'#reset-button');
  await waitFor(()=>evaluate(target,`!!document.querySelector('#start-button')`),'same imported deck fresh session');
  assert.equal(await evaluate(target,'location.href'),importedUrl);
  assert.equal(await evaluate(target,`document.querySelector('#lesson-description').textContent`),importedCourse.title);
  assert.equal(await evaluate(target,`document.querySelector('#step-count').textContent`),'0 / 3');
  assert.equal(await evaluate(target,`document.querySelector('.simulation-launch').hidden`),true);
  assert.equal((await traceView(target)).hidden,true);
  assert.deepEqual((await traceView(target)).fileNames,[]);
  await activate(target,'#start-button');
  const resetImportedRecord=await completeCourse(target,importedCourse,()=>false);
  assert.equal(resetImportedRecord.trace.filter(row=>row.correct).length,0);
  assert.deepEqual(await writing(target),blankImported);
  const resetImportedText=await downloadCourseNotes(target,'picker-imported-after-fresh-reset.txt',importedCourse,resetImportedRecord,blankImported,
    'Not started. 3 missed connections are available for practice.',importedPrompt);
  assert.ok(!resetImportedText.includes('imported-course-notebook/'));
  await selectTrace(target,importedTrace.path,'preview');
  const afterResetNotes=structuredClone(blankImported);
  afterResetNotes.notes[importedCourse.items[1].id]='New-session note entered after importing the saved answer preview.';
  afterResetNotes.application='New-session imported Apply-it reflection after preview.';
  await editNote(target,importedCourse.items[1].id,afterResetNotes.notes[importedCourse.items[1].id]);
  await replaceWriting(target,'#application-reflection',afterResetNotes.application);
  await activate(target,'#restore-trace-confirm');
  await waitFor(async()=>(await traceView(target)).status.startsWith('Trace restored.'),'native imported-course trace restore');
  assert.deepEqual(await firstState(target),importedRecord.state);
  assert.deepEqual(await writing(target),afterResetNotes);
  const resetRestoredText=await downloadCourseNotes(target,'picker-imported-restored-after-reset.txt',importedCourse,importedRecord,afterResetNotes,
    'Complete: 1 of 1 practice answers recorded; 1 correct on retry.',importedPrompt);
  assert.ok(!resetRestoredText.includes('imported-course-notebook/'));
  const restoredImportedTrace=await downloadCourseTrace(target,'picker-imported-restored-trace.json',importedCourse,importedRecord);
  for(const key of ['deck','model','firstAnswers','mastery','practice']) assert.deepEqual(restoredImportedTrace.value[key],importedTrace.value[key]);
  report.courseRecords.importedAfterFreshReset=resetImportedRecord;
  report.courseNotebooks.importedAfterResetRestore=structuredClone(afterResetNotes);
  passed('fresh session keeps the imported course but clears its notebook and practice; restoring its real saved trace preserves only the newly written destination reflections');

  await activate(target,'#use-bundled-deck');
  assert.equal((await pickerView(target)).title,deck.title);
  assert.deepEqual(await writing(target),afterResetNotes);
  await startCourse(target,deck);
  const backToBundled=await completeCourse(target,deck,()=>true);
  assert.deepEqual(await writing(target),emptyNotes);
  assert.equal(await evaluate(target,`document.querySelector('#application-prompt').textContent`),bundledPrompt);
  const bundledAgainText=await download(target,'picker-bundled-after-explicit-return.txt',backToBundled,emptyNotes,'No missed connections in the first session.');
  assert.ok(bundledAgainText.includes(`\nPrompt: ${bundledPrompt}\n`));
  assert.ok(!bundledAgainText.includes(importedPrompt) && !bundledAgainText.includes('imported-course-notebook/') && !bundledAgainText.includes('New-session imported'));
  assert.deepEqual(await writing(sourcePage),sourceNotes);
  assert.deepEqual(await firstState(sourcePage),sourceRecord.state);
  assert.deepEqual(await readFile(sourceTrace.path),sourceTrace.bytes);
  assert.deepEqual(await readFile(importedPath),importedBytes);
  assert.deepEqual(await readFile(invalidPath),invalidBytes);
  assert.deepEqual(await readFile(importedTrace.path),importedTrace.bytes);
  assert.ok(target.requests.every(url=>url.startsWith('file:')),'Import, reset, restore and export must keep the standalone target offline');
  report.courseRecords.backToBundled=backToBundled;
  passed('explicit bundled Start clears imported writing even for reused IDs, restores the bundled prompt, and leaves the other tab and all selected files unchanged offline');


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
