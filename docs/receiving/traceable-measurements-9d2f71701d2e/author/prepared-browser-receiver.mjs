#!/usr/bin/env node
/** Saved-file acceptance: the actual app, keyboard flow and browser download bytes. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, mkdtemp, rm, statfs, readdir, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const project = resolve(option('--root', join(dirname(fileURLToPath(import.meta.url)), '..')));
const executable = option('--browser', 'chromium');
const output = resolve(option('--output', join(project, 'browser-check')));
const space = await statfs(project);
const freeBefore = space.bavail * space.bsize;
await mkdir(output, {recursive: true});
if (freeBefore < 1024 ** 3) {
  await writeFile(join(output, 'admission-refused.json'), JSON.stringify({at:new Date().toISOString(),free_bytes:freeBefore,minimum_bytes:1024**3,status:'not-run',reason:'fixed Chrome free-space floor'},null,2)+'\n');
  throw new Error('Chrome not launched: below fixed 1 GiB free-space floor.');
}
const downloadPath = join(output, 'downloads');
await mkdir(downloadPath, {recursive: true});
const downloads = new Map();
const profile = await mkdtemp(join(output, 'profile-'));
const report = {status:'running',startedAt:new Date().toISOString(),sourceCommit:'e00a98e5c19302e893600f6d45aac08b6a69a08d',canonicalLearner:'e49aee89dc6ecf579f1c9152f32f826bf6f9d8b7',courseSha256:'c45d46851b432d3a9fb0fd89d661d3ee5d61bc4acfbdd1a8f8c82343ccf4f913',node:process.version,project,executable,checks:[],screenshots:[],downloads:[],sourceSha256:{},resourceBounds:{free_before_bytes:freeBefore,admission_minimum_bytes:1024**3,running_reserve_bytes:512*1024**2,profile_maximum_bytes:192*1024**2,output_maximum_bytes:32*1024**2},qualification:'Prescribed interactions in actual Chrome; not learner-outcome evidence. Fixed random seed affects option ordering only.'};
const inputManifest=JSON.parse(await readFile(join(project,'../SOURCE-MANIFEST.json'),'utf8'));
const protectedPaths=[...inputManifest.records.map(record=>record.path),'courses/traceable-measurements.source.json','courses/traceable-measurements.json','courses/traceable-measurements.md','tools/build_traceable_measurements.mjs','tests/traceable-measurements-course.test.mjs','docs/receiving/traceable-measurements-9d2f71701d2e/measurement-report.json'];
for (const path of protectedPaths) {
  try { report.sourceSha256[path] = createHash('sha256').update(await readFile(join(project, path))).digest('hex'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
const deck = JSON.parse(await readFile(join(project, 'courses/traceable-measurements.json'), 'utf8'));
assert.equal(report.sourceSha256['courses/traceable-measurements.json'],report.courseSha256);
const {initialMastery, updateMastery} = await import(pathToFileURL(join(project, 'src/knowledge.mjs')));
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = resolve(project, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!file.startsWith(`${project}/`)) { response.writeHead(403).end(); return; }
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
let budgetFailure = null;
let resourceTimer;
let resourceBusy=false;
const pageErrors = [];
let pageRequests = [];
const pending = new Map();
let sequence = 0;

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
async function waitFor(check, label) {
  let lastError;
  for (let step = 0; step < 160; step++) {
    if (budgetFailure) throw budgetFailure;
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
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
  await key('Enter');
}
async function displayedOrder(practice = false) {
  const attribute = practice ? 'data-practice-choice' : 'data-choice';
  return evaluate(`[...document.querySelectorAll('[${attribute}]')].map(button => Number(button.getAttribute('${attribute}')))`);
}
async function chooseCanonical(choice, practice = false) {
  const order = await displayedOrder(practice);
  const attribute = practice ? 'data-practice-choice' : 'data-choice';
  assert.equal(await evaluate(`document.activeElement.getAttribute('${attribute}')`), String(order[0]), 'First displayed choice receives keyboard focus');
  const position = order.indexOf(choice);
  assert.ok(position >= 0, 'Requested canonical choice is displayed');
  for (let step = 0; step < position; step++) await key('Tab');
  await key('Enter');
}
let orderScript;
async function setOrderSeed(seed) {
  if (orderScript) await command('Page.removeScriptToEvaluateOnNewDocument', {identifier: orderScript});
  ({identifier: orderScript} = await command('Page.addScriptToEvaluateOnNewDocument', {source: `(() => { let state = ${seed} >>> 0; Math.random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; }; })();`}));
}
async function navigate(url, width = 1280, height = 1000) {
  await command('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: false});
  pageRequests = [];
  await command('Page.navigate', {url});
  await waitFor(() => evaluate(`document.URL === ${JSON.stringify(url)} && document.readyState === 'complete' && !!document.querySelector('#start-button')`), 'lesson welcome');
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
  if (mode === 'mixed') await screenshot('answer-order-question.png', '.question-card');
  const firstAnswers = [];
  const estimates = initialMastery(deck.concepts);
  for (let index = 0; index < deck.items.length; index++) {
    const prompt = await evaluate(`document.querySelector('.question-card h2').textContent`);
    const item = deck.items.find(item => item.prompt === prompt);
    assert.ok(item, 'Question must come from the existing deck');
    const order = await displayedOrder();
    assert.deepEqual([...order].sort((a, b) => a - b), item.options.map((_, index) => index));
    const labels = await evaluate(`[...document.querySelectorAll('[data-choice]')].map(button => ({key: button.querySelector('.choice-key').textContent, text: button.textContent.slice(button.querySelector('.choice-key').textContent.length)}))`);
    assert.deepEqual(labels, order.map((choice, position) => ({key: String.fromCharCode(65 + position), text: item.options[choice]})));
    const correct = mode === 'correct' || (mode === 'mixed' && index % 2 === 1);
    const choice = correct ? item.answer : (item.answer + 1 + index % (item.options.length - 1)) % item.options.length;
    await chooseCanonical(choice);
    assert.equal(await evaluate('document.activeElement.id'), 'next-button');
    estimates[item.concept] = updateMastery(estimates[item.concept], correct);
    firstAnswers.push({item, choice, correct, order});
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
async function savedNotes(name, firstAnswers, expectedPractice) {
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
    const end = content.indexOf('\n\n', start);
    const block = content.slice(start, end < 0 ? undefined : end);
    assert.ok(block.includes(`Your first answer: ${item.options[choice]}`));
    assert.ok(block.includes(`Correct answer: ${item.options[item.answer]}`));
    assert.ok(block.includes(`Explanation: ${item.explanation}`));
    assert.ok(block.includes(`Apply the idea: ${item.transfer}`));
  }
  const after = await snapshot();
  assert.equal(after.score, stateBefore.score);
  assert.deepEqual(after.estimates, stateBefore.estimates);
  assert.equal(await evaluate('document.activeElement.id'), 'save-notes-button');
  assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'), false);
  assert.match(await evaluate(`document.querySelector('#save-notes-status').textContent`), /Download requested/);
  assert.deepEqual(pageRequests, requestedBefore, 'Saving notes must not create a network request');
  await writeFile(join(output, name), bytes);
  report.downloads.push({name, suggestedFilename: download.suggestedFilename, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex')});
  passed(`actual keyboard download preserves original trace: ${name}`);
}
const passed = name => { report.checks.push(name); console.log(`PASS ${name}`); };


async function inventory(directory, relative='') {
  const rows=[];
  for (const entry of await readdir(join(directory,relative),{withFileTypes:true})) {
    const p=join(relative,entry.name);
    try {
      if(entry.isDirectory()) rows.push(...await inventory(directory,p));
      else if(entry.isFile()) rows.push({path:p,bytes:(await stat(join(directory,p))).size});
    } catch(error) { if(error.code!=='ENOENT') throw error; }
  }
  return rows;
}
async function checkResourceBudget() {
  if(resourceBusy || !browser || browser.exitCode!==null) return;
  resourceBusy=true;
  try {
    const s=await statfs(project);
    const bytes=(await inventory(profile)).reduce((sum,row)=>sum+row.bytes,0);
    report.resourceBounds.profile_high_water_bytes=Math.max(report.resourceBounds.profile_high_water_bytes??0,bytes);
    if(s.bavail*s.bsize<512*1024**2 || bytes>192*1024**2) {
      budgetFailure=new Error('Receiver resource bound reached; this is not a course failure.');
      report.resourceRefusal={at:new Date().toISOString(),free_bytes:s.bavail*s.bsize,profile_bytes:bytes};
      browser.kill('SIGTERM');
    }
  } finally {resourceBusy=false;}
}
async function selectCourseFile() {
  const {root:dom}=await command('DOM.getDocument',{depth:1});
  const {nodeId}=await command('DOM.querySelector',{nodeId:dom.nodeId,selector:'#deck-file'});
  assert.ok(nodeId);
  await command('DOM.setFileInputFiles',{nodeId,files:[join(project,'courses/traceable-measurements.json')]});
  await waitFor(()=>evaluate('document.querySelector("#deck-preview-title")?.textContent === '+JSON.stringify(deck.title)),'import preview');
  assert.deepEqual(await evaluate('[...document.querySelectorAll("#deck-preview li strong")].map(node=>node.textContent)'),deck.items.map(item=>item.prompt));
  assert.match(await evaluate('document.querySelector(".deck-preview-count").textContent'),/12 questions · 6 concepts/);
  assert.ok((await evaluate('document.querySelector(".deck-preview-attribution").textContent')).includes(deck.attribution));
  assert.ok((await evaluate('document.querySelector(".deck-preview-license").textContent')).includes(deck.license));
}
async function reviewDetails(firstAnswers) {
  const rows=await evaluate('[...document.querySelectorAll(".review-item")].map(node=>({prompt:node.querySelector(".review-prompt").textContent,answers:[...node.querySelectorAll(".review-answers dd")].map(n=>n.textContent),transfer:node.querySelector(".review-transfer").textContent,body:node.querySelector(".review-body").textContent,id:node.querySelector("[data-reflection-item]").dataset.reflectionItem}))');
  assert.equal(rows.length,12);
  assert.deepEqual(rows.map(r=>r.id),firstAnswers.map(r=>r.item.id));
  for(let i=0;i<rows.length;i++) {
    const original=firstAnswers[i],row=rows[i];
    assert.equal(row.prompt,original.item.prompt);
    assert.deepEqual(row.answers,[original.item.options[original.choice],original.item.options[original.item.answer]]);
    assert.ok(row.body.includes(original.item.explanation));
    assert.ok(row.transfer.includes(original.item.transfer));
  }
}
async function writeReflection(selector,text) {
  await evaluate('document.querySelector('+JSON.stringify(selector)+').focus()');
  await command('Input.insertText',{text});
  assert.equal(await evaluate('document.querySelector('+JSON.stringify(selector)+').value'),text);
}
async function receivedLesson(mode) {
  await activate('#start-deck');
  assert.equal(await evaluate('document.querySelector("#lesson-description").textContent'),deck.title);
  assert.equal(await evaluate('document.querySelector("#step-count").textContent'),'0 / 12');
  assert.deepEqual(await evaluate('[...document.querySelectorAll("#lesson-map .deck-concept")].map(node=>node.textContent)'),deck.concepts);
  await activate('#start-button');
  const misses=new Set(['trace-clock-crop','trace-absolute-summary','trace-reference-foot']);
  const firstAnswers=[],seen=new Set(),estimates=initialMastery(deck.concepts);
  for(let index=0;index<12;index++) {
    const prompt=await evaluate('document.querySelector(".question-card h2").textContent');
    const item=deck.items.find(item=>item.prompt===prompt);
    assert.ok(item,'Rendered question belongs to frozen course');
    assert.ok(!seen.has(item.id),'Each question is first-answered once');seen.add(item.id);
    const order=await displayedOrder();
    assert.deepEqual([...order].sort((a,b)=>a-b),[0,1,2,3]);
    const labels=await evaluate('[...document.querySelectorAll("[data-choice]")].map(button=>({key:button.querySelector(".choice-key").textContent,text:button.textContent.slice(button.querySelector(".choice-key").textContent.length)}))');
    assert.deepEqual(labels,order.map((choice,position)=>({key:String.fromCharCode(65+position),text:item.options[choice]})));
    assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'),false,'Course question fits viewport width');
    if(item.id==='trace-source-lineage') await screenshot(mode+'-question.png','.question-card');
    const correct=!misses.has(item.id),choice=correct?item.answer:(item.answer+1)%4;
    await chooseCanonical(choice);
    const feedback=await evaluate('document.querySelector("#feedback-slot").textContent');
    assert.ok(feedback.includes(item.options[item.answer]));
    assert.ok(feedback.includes(item.explanation));assert.ok(feedback.includes(item.transfer));
    assert.equal(await evaluate('document.activeElement.id'),'next-button');
    estimates[item.concept]=updateMastery(estimates[item.concept],correct);
    firstAnswers.push({item,choice,correct,order});
    await key('Enter');
  }
  assert.equal(seen.size,12);
  assert.ok(firstAnswers.some(row=>row.order.some((choice,position)=>choice!==position)));
  const original=await snapshot();
  assert.equal(original.reviewCount,12);assert.match(original.score,/9 of 12 connections/);
  assert.equal(original.progress,'12');assert.equal(original.focus,'H2');assert.equal(original.overflow,false);
  assert.deepEqual(original.estimates,deck.concepts.map(concept=>Math.round(estimates[concept]*100)+'%'));
  assert.equal(await evaluate('document.querySelectorAll(".review-status.needs-review").length'),3);
  await reviewDetails(firstAnswers);
  passed(mode+': all 12 imported questions, shuffled labels, feedback and 9/12 original review');
  const reflectionId='trace-clock-crop';
  const reflection='Keep retained index 27 separate from original index 28; record which start defines zero.';
  const application='For a future sensor table I will retain input and output pins, the crop, the rate and the field contract.';
  const field='textarea[data-reflection-item="'+reflectionId+'"]';
  await evaluate('document.querySelector('+JSON.stringify(field)+').closest("details").querySelector("summary").focus()');
  await key('Enter');
  assert.equal(await evaluate('document.querySelector('+JSON.stringify(field)+').closest("details").open'),true);
  await writeReflection(field,reflection);
  await writeReflection('#application-reflection',application);
  await activate('#practice-button');
  const missed=firstAnswers.filter(row=>!row.correct);
  for(const originalAnswer of missed) {
    assert.equal(await evaluate('document.querySelector(".practice-card h2").textContent'),originalAnswer.item.prompt);
    assert.deepEqual(await displayedOrder(true),originalAnswer.order);
    await chooseCanonical(originalAnswer.item.answer,true);
    assert.equal(await evaluate('document.activeElement.id'),'practice-next');
    await key('Enter');
  }
  const after=await snapshot();
  assert.equal(after.score,original.score);assert.deepEqual(after.estimates,original.estimates);
  assert.equal(await evaluate('document.querySelectorAll(".review-status.needs-review").length'),3);
  assert.equal(await evaluate('document.querySelectorAll(".review-practice-answer").length'),3);
  assert.match(await evaluate('document.querySelector("#practice-status").textContent'),/3 of 3 correctly on retry/);
  assert.equal(await evaluate('document.querySelector('+JSON.stringify(field)+').value'),reflection);
  assert.equal(await evaluate('document.querySelector("#application-reflection").value'),application);
  await reviewDetails(firstAnswers);
  await screenshot(mode+'-review.png','.result-card');
  passed(mode+': three retries and reflections preserve original answers and model state');
  await savedNotes(mode+'-study-notes.txt',firstAnswers,/Complete: 3 of 3 practice answers recorded; 3 correct on retry/);
  const text=await readFile(join(output,mode+'-study-notes.txt'),'utf8');
  assert.ok(text.includes(reflection));assert.ok(text.includes(application));
  report[mode]={firstTry:original,firstAnswers:firstAnswers.map(row=>({id:row.item.id,choice:row.choice,correct:row.correct,displayOrder:row.order})),reflections:{item:reflectionId,text:reflection,application},requests:[...pageRequests]};
  return {firstAnswers,original};
}
try {
  browser = spawn(executable, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-background-networking',
    '--disable-component-update', '--disable-sync', '--no-first-run', '--no-default-browser-check',
    '--disk-cache-size=8388608', '--media-cache-size=0', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'
  ], {stdio: ['ignore', 'ignore', 'pipe']});
  resourceTimer=setInterval(()=>{checkResourceBudget().catch(error=>{budgetFailure=error;browser?.kill('SIGTERM');});},2000);
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
  }, 'browser startup');
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


  await setOrderSeed(41);
  await navigate(base+'/index.html',1280,1000);
  await activate('#start-button');
  await chooseCanonical(0);
  const progressBefore=await evaluate('({html:document.querySelector("#session-content").innerHTML,progress:document.querySelector("#step-count").textContent,title:document.title})');
  await selectCourseFile();
  assert.deepEqual(await evaluate('({html:document.querySelector("#session-content").innerHTML,progress:document.querySelector("#step-count").textContent,title:document.title})'),progressBefore);
  await activate('#cancel-deck');
  assert.deepEqual(await evaluate('({html:document.querySelector("#session-content").innerHTML,progress:document.querySelector("#step-count").textContent,title:document.title})'),progressBefore);
  passed('actual file picker preview/cancel preserves an already-answered bundled lesson');
  await selectCourseFile();
  await receivedLesson('desktop');
  assert.ok(pageRequests.every(url=>url.startsWith(base+'/')),'Modular page requested only own local origin');
  const {browserContextId}=await command('Target.createBrowserContext',{},false);
  const second=await command('Target.createTarget',{url:'about:blank',browserContextId},false);
  ({sessionId}=await command('Target.attachToTarget',{targetId:second.targetId,flatten:true},false));
  await command('Page.enable');await command('Runtime.enable');await command('Network.enable');
  await command('Browser.setDownloadBehavior',{behavior:'allowAndName',downloadPath,eventsEnabled:true,browserContextId},false);
  orderScript=null;
  await setOrderSeed(137);
  await command('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:-1,uploadThroughput:-1});
  await navigate(pathToFileURL(join(project,'demo.html')).href,390,1000);
  await selectCourseFile();
  await receivedLesson('offline-mobile');
  assert.ok(pageRequests.every(url=>url.startsWith('file:')),'Fresh direct-file page requested no hosted resource');
  passed('fresh 390 px standalone context completes imported course with page network offline');
  assert.deepEqual(pageErrors,[]);
  for(const [p,sha] of Object.entries(report.sourceSha256)) assert.equal(createHash('sha256').update(await readFile(join(project,p))).digest('hex'),sha,'Input source changed: '+p);
  report.protectedFilesUnchanged=Object.keys(report.sourceSha256).length;
  passed('all 27 frozen source/course/report inputs unchanged and no page JavaScript exceptions');
  report.status='passed';
} catch(error) {
  report.status='failed';report.error=error.stack??String(error);report.browserLog=browserLog;report.pageErrors=pageErrors;
  if(sessionId) {
    try {
      report.lastPage=await evaluate('({url:location.href,ready:document.readyState,focus:document.activeElement.outerHTML,text:document.body.innerText.slice(0,6000)})');
      await screenshot('failed-state.png');
    } catch { }
  }
  console.error(report.error);process.exitCode=1;
} finally {
  clearInterval(resourceTimer);
  if(socket?.readyState===WebSocket.OPEN) {
    try {await command('Browser.close',{},false);}catch{}
  }
  socket?.close();
  for(const request of pending.values()) clearTimeout(request.timer);
  if(browser && browser.exitCode===null) {
    await Promise.race([new Promise(resolve=>browser.once('close',resolve)),sleep(2000)]);
    if(browser.exitCode===null && browser.signalCode===null) browser.kill('SIGTERM');
    await Promise.race([new Promise(resolve=>browser.once('close',resolve)),sleep(2000)]);
  }
  server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
  const profileInventory=await inventory(profile);
  await writeFile(join(output,'profile-inventory.json'),JSON.stringify({profile,files:profileInventory,bytes:profileInventory.reduce((s,r)=>s+r.bytes,0),closed_exit:browser?.exitCode,closed_signal:browser?.signalCode},null,2)+'\n');
  if(browser && (browser.exitCode!==null || browser.signalCode!==null)) {
    assert.ok(profile.startsWith(output+'/profile-'));
    await rm(profile,{recursive:true,force:true});
    report.ownClosedProfileRemoved=true;
  } else report.ownClosedProfileRemoved=false;
  const artifacts=await inventory(output);
  report.artifactBytes=artifacts.reduce((s,r)=>s+r.bytes,0);
  if(report.artifactBytes>32*1024**2) {report.status='failed';report.error='Receiver artifact cap exceeded';process.exitCode=1;}
  const endSpace=await statfs(project);
  report.freeAfterBytes=endSpace.bavail*endSpace.bsize;report.endedAt=new Date().toISOString();
  report.pageErrors=pageErrors;
  await writeFile(join(output,'browser-report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(report.status.toUpperCase()+': '+report.checks.length+' browser checkpoints; '+join(output,'browser-report.json'));
}
