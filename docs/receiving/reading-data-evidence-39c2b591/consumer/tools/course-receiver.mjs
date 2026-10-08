import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const [sourceArg, manifestArg, evidenceArg, featureArg] = process.argv.slice(2);
if (!sourceArg || !manifestArg || !evidenceArg || !featureArg) throw Error('Expected SOURCE MANIFEST EVIDENCE FEATURES');
const source = path.resolve(sourceArg), evidence = path.resolve(evidenceArg);
const own = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(await fs.readFile(manifestArg, 'utf8'));
const features = JSON.parse(await fs.readFile(featureArg, 'utf8'));
const oracle = JSON.parse(await fs.readFile(path.join(own, 'course-oracle.json'), 'utf8'));
const byPrompt = new Map(oracle.items.map(item => [item.prompt, item]));
const contractPath = path.join(own, 'browser-contract.json');
const deckPath = path.join(own, '../courses/reading-data-and-evidence.json');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const chromium = process.env.RECALL_REVIEW_CHROMIUM || '/snap/bin/chromium';
const profileRoot = process.env.RECALL_REVIEW_PROFILE_ROOT;
if (!profileRoot) throw Error('An isolated Chromium profile root is required');
await fs.mkdir(evidence, { recursive: true });
await fs.mkdir(profileRoot, { recursive: true });
await fs.mkdir(path.join(evidence, 'downloads'), { recursive: true });
const profile = await fs.mkdtemp(path.join(profileRoot, 'reading-evidence-'));
const checks = [], exceptions = [], requests = [], responses = [], downloads = [], layouts = [], sessions = [], httpServed = [], networkFailures = [], fileChoosers = [];
const pending = new Map();
let browser, socket, session, next = 0, fatal = null, server, mode = null, browserVersion = null;
const startedAt = new Date().toISOString();

function send(method, params = {}, sessionId = session) {
  const id = ++next;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(Error('CDP timeout: ' + method)); }, 15000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
async function until(expression) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (await evaluate(expression)) return;
    await delay(60);
  }
  throw Error('Browser condition not reached: ' + expression);
}
async function settle() {
  await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
}
async function group(name, fn) {
  try { const observed = await fn(); checks.push({ name: mode ? `${mode}.${name}` : name, passed: true, observed }); }
  catch (error) { checks.push({ name: mode ? `${mode}.${name}` : name, passed: false, failure: error.stack || String(error) }); throw error; }
  await fs.writeFile(path.join(evidence, 'observations.json'), JSON.stringify(checks, null, 2) + '\n');
}
async function click(selector) {
  const point = await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e||e.disabled)throw Error('Missing/disabled pointer target');e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
}
async function shot(name, selector) {
  if (selector) await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'start'})`);
  await settle();
  const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await fs.writeFile(path.join(evidence, `${mode}-${name}.png`), Buffer.from(result.data, 'base64'));
}
async function layout(label) {
  const observed = await evaluate(`({viewport:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth,boxes:[...document.querySelectorAll('#session-content h2,.choice,#lesson-description,.deck-concept')].map(e=>{const r=e.getBoundingClientRect();return{text:e.textContent,x:r.x,right:r.right,width:r.width,scroll:e.scrollWidth,client:e.clientWidth}})})`);
  layouts.push({ mode, label, ...observed });
}
async function question(practice = false) {
  return evaluate(`({prompt:document.querySelector('#session-content h2')?.textContent,choices:[...document.querySelectorAll(${JSON.stringify(practice ? '[data-practice-choice]' : '[data-choice]')})].map((e,index)=>{const clone=e.cloneNode(true);clone.querySelector('.choice-key')?.remove();return{index,text:clone.textContent,disabled:e.disabled,correct:e.classList.contains('correct'),incorrect:e.classList.contains('incorrect')}}),type:document.querySelector('.question-type')?.textContent,progress:document.querySelector('#step-count').textContent})`);
}
async function choose(text, practice = false) {
  const current = await question(practice);
  const matches = current.choices.filter(choice => choice.text === text);
  assert.equal(matches.length, 1, 'A unique visible option must match the independent answer text');
  await click(`${practice ? '[data-practice-choice]' : '[data-choice]'}:nth-child(${matches[0].index + 1})`);
  await until(`!!document.querySelector(${JSON.stringify(practice ? '#practice-next' : '#next-button')})`);
  return matches[0].index;
}
async function trace() {
  return evaluate(`({summary:document.querySelector('#first-try-summary')?.textContent,mastery:[...document.querySelectorAll('.mastery-row')].map(e=>({concept:e.querySelector('span').textContent,value:e.querySelector('output').textContent,aria:e.querySelector('output').getAttribute('aria-label')})),rows:[...document.querySelectorAll('.review-item')].map(e=>({prompt:e.querySelector('.review-prompt').textContent,status:e.querySelector('.review-status').textContent,first:e.querySelectorAll('.review-answers dd')[0].textContent,correct:e.querySelectorAll('.review-answers dd')[1].textContent,explanation:e.querySelector('.review-body>p').textContent,transfer:e.querySelector('.review-transfer').textContent,practice:e.querySelector('.review-practice-answer')?.textContent||null})),practice:document.querySelector('#practice-status')?.textContent||null,attribution:document.querySelector('.source-note')?.textContent,notes:!!document.querySelector('#save-notes-button')})`);
}
function firstProjection(state) {
  return { summary: state.summary, mastery: state.mastery, rows: state.rows.map(({ practice, ...row }) => row), attribution: state.attribution };
}
async function downloadNotes(label, firstState, attemptOrder, practiced) {
  const before = await trace();
  const count = downloads.length;
  await click('#save-notes-button');
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline && !downloads.slice(count).some(d => d.state === 'completed')) await delay(80);
  const download = downloads.slice(count).find(d => d.state === 'completed');
  assert.ok(download, 'Actual browser download must complete');
  assert.match(download.suggestedFilename, /^recallweave-study-notes-\d{4}-\d{2}-\d{2}\.txt$/);
  const bytes = await fs.readFile(path.join(evidence, 'downloads', download.guid));
  const notes = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  assert.ok(notes.includes(oracle.title));
  assert.ok(notes.includes('FIRST SESSION\n10 of 12 connections correct on the first try.'));
  assert.ok(notes.includes(oracle.attribution)); assert.ok(notes.includes(oracle.license));
  for (const row of firstState.mastery) assert.ok(notes.includes(`${row.concept}: ${row.value}`));
  assert.ok(notes.includes(practiced ? 'Complete: 2 of 2 practice answers recorded; 2 correct on retry.' : 'Not started. 2 missed connections are available for practice.'));
  for (let i = 0; i < attemptOrder.length; i++) {
    const item = attemptOrder[i];
    const start = notes.indexOf(`${i + 1}. ${item.prompt}\n`);
    assert.ok(start >= 0, 'Note retains question order and prompt: ' + item.id);
    const end = i + 1 < attemptOrder.length ? notes.indexOf(`${i + 2}. ${attemptOrder[i + 1].prompt}\n`, start + 1) : notes.indexOf('\nDECK ATTRIBUTION', start);
    assert.ok(end > start);
    const section = notes.slice(start, end);
    for (const line of [`Concept: ${item.concept}`, `Your first answer: ${item.selected_first_text}`, `First try: ${item.expected_first_correct ? 'correct' : 'needs review'}`, `Correct answer: ${item.expected_correct_text}`, `Explanation: ${item.explanation}`, `Apply the idea: ${item.transfer}`]) assert.ok(section.includes(line), item.id + ': ' + line);
    if (!item.expected_first_correct) assert.ok(section.includes(practiced ? `Practice answer: ${item.expected_correct_text}\nPractice result: correct on retry` : 'Practice answer: not recorded.'));
    else assert.ok(!section.includes('Practice answer:'));
  }
  assert.deepEqual(await trace(), before, 'Downloading study notes must not change learning or practice state');
  const filename = `${mode}-${label}-study-notes.txt`;
  await fs.rename(path.join(evidence, 'downloads', download.guid), path.join(evidence, filename));
  Object.assign(download, { savedAs: filename, bytes: bytes.length, sha256: sha(bytes) });
  return { filename, sha256: sha(bytes), bytes: bytes.length, status: await evaluate("document.querySelector('#save-notes-status').textContent") };
}
async function verifySource() {
  for (const row of manifest.source_files) assert.equal(sha(await fs.readFile(path.join(source, row.path))), row.sha256, row.path);
  assert.equal(sha(await fs.readFile(deckPath)), oracle.deck_sha256);
}
async function verifyDelivered() {
  const sourceByPath = new Map(manifest.source_files.map(row => [row.path, row.sha256]));
  const actual = [];
  for (const response of responses.filter(r => r.session === session)) {
    const url = new URL(response.url);
    const rel = url.protocol === 'file:' ? path.relative(source, fileURLToPath(url)) : decodeURIComponent(url.pathname.slice(1));
    if (!sourceByPath.has(rel)) continue;
    const body = await send('Network.getResponseBody', { requestId: response.requestId });
    response.sha256 = sha(Buffer.from(body.body, body.base64Encoded ? 'base64' : 'utf8'));
    assert.equal(response.sha256, sourceByPath.get(rel), 'Actual delivered bytes: ' + rel);
    actual.push(rel);
  }
  assert.ok(actual.includes(mode === 'desktop-http' ? 'src/app.mjs' : 'demo.html'));
  return actual;
}

async function runCurrentMainControl() {
  mode = 'current-main-no-import';
  const target = await send('Target.createTarget', {url:'about:blank'}, null);
  session = (await send('Target.attachToTarget', {targetId:target.targetId, flatten:true}, null)).sessionId;
  await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
  const url = pathToFileURL(path.join(source, '../baseline/demo.html')).href;
  await send('Page.navigate', {url});
  await until("!!document.querySelector('#start-button')");
  await group('real_main_can_start_but_has_no_local_deck_picker', async () => {
    const observed = await evaluate("({title:document.title,progress:document.querySelector('#step-count').textContent,deckFile:!!document.querySelector('#deck-file'),deckPicker:!!document.querySelector('#deck-picker')})");
    assert.equal(observed.progress, '0 / 6');
    assert.equal(observed.deckFile, false); assert.equal(observed.deckPicker, false);
    await click('#start-button');
    await until("!!document.querySelector('[data-choice]')");
    const shown = await question();
    assert.ok(shown.prompt && shown.choices.length >= 2);
    assert.equal(byPrompt.has(shown.prompt), false);
    const response = responses.find(row => row.session === session && row.url === url);
    assert.ok(response, 'Current-main standalone response is observed');
    const body = await send('Network.getResponseBody', {requestId:response.requestId});
    const bytes = Buffer.from(body.body, body.base64Encoded ? 'base64' : 'utf8');
    const blob = crypto.createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
    assert.equal(blob, '04ec6a5a58613880f7fd97c0eacd682bbc921a62');
    await shot('bundled-capability');
    return {ref:'4775af91ba6a5d4df787669f39b44364dd1e37ba',blob,observed,shown};
  });
  await send('Target.closeTarget', {targetId:target.targetId}, null);
  session = undefined;
}

async function runEntry(entry) {
  mode = entry.name;
  const target = await send('Target.createTarget', { url: 'about:blank' }, null);
  session = (await send('Target.attachToTarget', { targetId: target.targetId, flatten: true }, null)).sessionId;
  await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: entry.width, height: entry.height, deviceScaleFactor: 1, mobile: entry.name === 'mobile-file' });
  await send('Page.navigate', { url: entry.url });
  await until("!!document.querySelector('#deck-file')&&!!document.querySelector('#start-button')");
  await settle();
  const attemptOrder = [], presentations = [];
  let firstState;
  await group('authored_file_preview_and_explicit_start', async () => {
    const initial = await evaluate("({progress:document.querySelector('#step-count').textContent,session:document.querySelector('#session-content').textContent})");
    const chooserCount=fileChoosers.length;
    await send('Page.setInterceptFileChooserDialog',{enabled:true});
    await click('#deck-file');
    const chooserDeadline=Date.now()+10000;
    while(Date.now()<chooserDeadline && !fileChoosers.slice(chooserCount).some(row=>row.session===session)) await delay(50);
    const chooser=fileChoosers.slice(chooserCount).find(row=>row.session===session);
    assert.ok(chooser,'Native file input must open its chooser');
    await send('DOM.setFileInputFiles',{backendNodeId:chooser.backendNodeId,files:[deckPath]});
    await send('Page.setInterceptFileChooserDialog',{enabled:false});
    await until("!!document.querySelector('#start-deck')");
    const preview = await evaluate("({title:document.querySelector('#deck-preview-title').textContent,count:document.querySelector('.deck-preview-count').textContent,prompts:[...document.querySelectorAll('.deck-questions strong')].map(e=>e.textContent),attribution:document.querySelector('.deck-preview-attribution').textContent,license:document.querySelector('.deck-preview-license').textContent,progress:document.querySelector('#step-count').textContent,session:document.querySelector('#session-content').textContent})");
    assert.equal(preview.title, oracle.title); assert.match(preview.count, /12 questions · 4 concepts/);
    assert.deepEqual(preview.prompts, oracle.items.map(item => item.prompt));
    assert.ok(preview.attribution.endsWith(oracle.attribution)); assert.ok(preview.license.endsWith(oracle.license));
    assert.equal(preview.progress, initial.progress); assert.equal(preview.session, initial.session);
    await shot('preview', '#deck-picker');
    await click('#start-deck');
    await until("!!document.querySelector('[data-choice]')");
    return preview;
  });
  await group('course_context_and_concepts', async () => {
    const context = await evaluate("({description:document.querySelector('#lesson-description').textContent,title:document.title,size:document.querySelector('#lesson-size').textContent,concepts:[...document.querySelectorAll('.deck-concept')].map(e=>e.textContent),max:document.querySelector('[role=progressbar]').getAttribute('aria-valuemax'),subject:document.querySelector('#lesson-subject').textContent})");
    assert.equal(context.description, oracle.title); assert.ok(context.title.includes(oracle.title));
    assert.deepEqual(context.concepts, oracle.concepts); assert.equal(context.max, '12'); assert.equal(context.size, '12 challenges');
    return context;
  });
  await group('all_twelve_authored_questions_feedback_and_transfer', async () => {
    for (let i = 0; i < oracle.items.length; i++) {
      const shown = await question();
      const item = byPrompt.get(shown.prompt);
      assert.ok(item, 'Rendered question must map to an accepted authored prompt');
      assert.ok(!attemptOrder.some(old => old.id === item.id), 'Each item appears once');
      assert.deepEqual(shown.choices.map(choice => choice.text).sort(), [...item.options].sort());
      assert.ok(shown.type.endsWith(item.concept.toUpperCase()));
      assert.equal(shown.progress, `${i} / 12`);
      await layout(item.id);
      if (item.id === 'context-2') await shot('subgroup-comparison', '.question-card');
      const selectedIndex = await choose(item.selected_first_text);
      const feedback = await evaluate("document.querySelector('#feedback-slot').textContent");
      assert.ok(feedback.includes(item.explanation)); assert.ok(feedback.includes(item.transfer));
      assert.ok(feedback.includes(item.expected_first_correct ? 'That connection holds.' : 'Here’s the correction.'));
      const marked = await question();
      assert.deepEqual(marked.choices.filter(choice => choice.correct).map(choice => choice.text), [item.expected_correct_text]);
      assert.deepEqual(marked.choices.filter(choice => choice.incorrect).map(choice => choice.text), item.expected_first_correct ? [] : [item.selected_first_text]);
      assert.ok(marked.choices.every(choice => choice.disabled));
      if (item.id === 'design-2') await shot('random-assignment-correction', '#feedback-slot');
      attemptOrder.push(item);
      presentations.push({ id: item.id, optionOrder: shown.choices.map(choice => choice.text), selectedDisplayIndex: selectedIndex, selectedText: item.selected_first_text, expectedCorrectText: item.expected_correct_text, firstCorrect: item.expected_first_correct, explanation: item.explanation, transfer: item.transfer });
      await click('#next-button');
      await until(i === oracle.items.length - 1 ? "!!document.querySelector('.result-card')" : "!!document.querySelector('[data-choice]:not(:disabled)')");
    }
    assert.deepEqual(attemptOrder.map(item => item.id).sort(), oracle.items.map(item => item.id).sort());
    const shuffled = presentations.filter(p => JSON.stringify(p.optionOrder) !== JSON.stringify(oracle.items.find(item => item.id === p.id).options));
    if (features.choice_shuffle) assert.ok(shuffled.length > 0, 'Declared choice shuffling must actually occur');
    else assert.equal(shuffled.length, 0, 'Original importer declared authored option order');
    return { presentations, shuffledQuestionCount: shuffled.length };
  });
  await group('canonical_first_trace_and_model_state', async () => {
    firstState = await trace();
    assert.match(firstState.summary, /10 of 12 connections on the first try/);
    assert.equal(firstState.rows.length, 12); assert.deepEqual(firstState.mastery.map(row => row.concept), oracle.concepts);
    for (let i = 0; i < attemptOrder.length; i++) {
      const item = attemptOrder[i], row = firstState.rows[i];
      assert.equal(row.prompt, item.prompt); assert.equal(row.first, item.selected_first_text); assert.equal(row.correct, item.expected_correct_text);
      assert.equal(row.explanation, item.explanation); assert.ok(row.transfer.endsWith(item.transfer));
      assert.equal(row.status, `${item.expected_first_correct ? 'Correct' : 'Needs review'} · first try`); assert.equal(row.practice, null);
    }
    assert.ok(firstState.attribution.includes(oracle.attribution)); assert.ok(firstState.attribution.includes(oracle.license));
    assert.equal(firstState.notes, features.study_notes);
    await shot('first-trace', '.result-card');
    return firstState;
  });
  if (features.study_notes) await group('actual_study_notes_before_practice', () => downloadNotes('before-practice', firstState, attemptOrder, false));
  await group('separate_missed_practice_pause_resume', async () => {
    const missed = attemptOrder.filter(item => !item.expected_first_correct);
    assert.deepEqual(missed.map(item => item.id).sort(), oracle.missed_ids);
    await click('#practice-button');
    const recorded = [];
    for (let i = 0; i < missed.length; i++) {
      await until("!!document.querySelector('[data-practice-choice]:not(:disabled)')");
      const shown = await question(true), item = missed[i];
      assert.equal(shown.prompt, item.prompt); assert.deepEqual(shown.choices.map(choice => choice.text).sort(), [...item.options].sort());
      const selected = await choose(item.expected_correct_text, true);
      const feedback = await evaluate("document.querySelector('#practice-feedback').textContent");
      for (const expected of ['That connection holds on retry.', item.expected_correct_text, item.explanation, item.transfer]) assert.ok(feedback.includes(expected));
      recorded.push({ id: item.id, displayedOptions: shown.choices.map(choice => choice.text), selectedDisplayIndex: selected, selectedText: item.expected_correct_text });
      await click('#practice-next');
      if (i === 0) {
        await until("!!document.querySelector('[data-practice-choice]:not(:disabled)')");
        await click('#back-to-review');
        const paused = await trace();
        assert.deepEqual(firstProjection(paused), firstProjection(firstState));
        assert.match(paused.practice, /Practice paused: 1 of 2 answered/);
        assert.equal(paused.rows.filter(row => row.practice !== null).length, 1);
        await click('#practice-button');
        assert.equal((await question(true)).prompt, missed[1].prompt);
      }
    }
    await until("!!document.querySelector('.result-card')");
    const finished = await trace();
    assert.deepEqual(firstProjection(finished), firstProjection(firstState));
    assert.match(finished.practice, /2 of 2 correctly on retry/);
    for (let i = 0; i < attemptOrder.length; i++) {
      const item = attemptOrder[i], row = finished.rows[i];
      if (item.expected_first_correct) assert.equal(row.practice, null);
      else { assert.ok(row.practice.includes('correct on retry')); assert.ok(row.practice.endsWith(item.expected_correct_text)); }
    }
    await shot('practice-complete', '.practice-summary');
    return { recorded, completedTrace: finished };
  });
  if (features.study_notes) await group('actual_study_notes_after_practice', () => downloadNotes('after-practice', firstState, attemptOrder, true));
  await group('long_course_content_responsive_width', async () => {
    const actual = layouts.filter(row => row.mode === mode);
    for (const row of actual) {
      assert.ok(row.document <= row.viewport + 1, `${row.label}: document width ${row.document} > ${row.viewport}`);
      for (const box of row.boxes) { assert.ok(box.x >= -1 && box.right <= row.viewport + 1, `${row.label}: box outside viewport ${JSON.stringify(box)}`); assert.ok(box.scroll <= box.client + 1, `${row.label}: internal horizontal text overflow ${JSON.stringify(box)}`); }
    }
    return { width: entry.width, questionsMeasured: actual.length, layouts: actual };
  });

  await group('explicit_switch_back_to_bundled_lesson', async () => {
    const complete = await trace();
    await click('#use-bundled-deck');
    await until("!!document.querySelector('#start-deck')");
    assert.deepEqual(await trace(), complete, 'Previewing the bundled course preserves the completed imported trace');
    const bundled = JSON.parse(await fs.readFile(path.join(source, 'data/deck.json'), 'utf8'));
    const preview = await evaluate("({title:document.querySelector('#deck-preview-title').textContent,count:document.querySelector('.deck-preview-count').textContent})");
    assert.equal(preview.title, bundled.title); assert.match(preview.count, /6 questions/);
    await click('#start-deck');
    await until("!!document.querySelector('[data-choice]')");
    const shown = await question();
    assert.ok(bundled.items.some(item => item.prompt === shown.prompt));
    assert.equal(shown.progress, '0 / 6');
    const context = await evaluate("({title:document.title,description:document.querySelector('#lesson-description').textContent,source:document.querySelector('#lesson-subject').textContent,max:document.querySelector('[role=progressbar]').getAttribute('aria-valuemax'),traceRows:document.querySelectorAll('.review-item').length})");
    assert.ok(!context.title.includes(oracle.title));
    assert.ok(!context.description.includes(oracle.title));
    assert.equal(context.max, '6'); assert.equal(context.traceRows, 0);
    for (const saved of downloads.filter(row => row.mode === mode && row.savedAs)) {
      assert.equal(sha(await fs.readFile(path.join(evidence, saved.savedAs))), saved.sha256, 'Switching courses retains the already-downloaded course notes');
    }
    await shot('bundled-restored', '.question-card');
    return {preview,shown,context};
  });

  const delivered = await verifyDelivered();
  sessions.push({ name: mode, url: entry.url, viewport: { width: entry.width, height: entry.height }, firstOrder: attemptOrder.map(item => item.id), sourceFilesDelivered: delivered, features });
  await send('Target.closeTarget', { targetId: target.targetId }, null);
  session = undefined;
}

try {
  await verifySource();
  server = http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    if (url.pathname === '/favicon.ico') { response.writeHead(204); response.end(); return; }
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
    const filename = path.resolve(source, relative);
    if (!filename.startsWith(source + path.sep)) { response.writeHead(403); response.end(); return; }
    try {
      const bytes = await fs.readFile(filename);
      response.writeHead(200, { 'content-type': ({ '.html': 'text/html; charset=utf-8', '.mjs': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8' })[path.extname(filename)] || 'application/octet-stream', 'cache-control': 'no-store' });
      httpServed.push({path:relative,sha256:sha(bytes),bytes:bytes.length});
      response.end(bytes);
    } catch { response.writeHead(404); response.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const selfResponse=await fetch('http://127.0.0.1:'+server.address().port+'/index.html',{signal:AbortSignal.timeout(5000)});
  const selfBytes=Buffer.from(await selfResponse.arrayBuffer());
  assert.equal(selfResponse.status,200);
  assert.equal(sha(selfBytes),manifest.source_files.find(row=>row.path==='index.html').sha256);
  await fs.writeFile(path.join(evidence,'http-self-probe.json'),JSON.stringify({status:selfResponse.status,sha256:sha(selfBytes),bytes:selfBytes.length},null,2)+'\n');

  browser = spawn(chromium, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-component-update', '--disable-sync', '--disable-extensions', '--password-store=basic', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  const endpoint = await new Promise((resolve, reject) => {
    let stderr = '';
    const timer = setTimeout(() => reject(Error('Chromium startup timeout: ' + stderr.slice(-2000))), 15000);
    browser.on('error', error => { clearTimeout(timer); reject(error); });
    browser.on('exit', code => { clearTimeout(timer); reject(Error('Chromium exited ' + code)); });
    browser.stderr.on('data', bytes => { fs.appendFile(path.join(evidence, 'chrome.stderr.log'), bytes).catch(() => {}); stderr += bytes; const match = stderr.match(/DevTools listening on (ws:\/\/127\.0\.0\.1:[^\s]+)/); if (match) { clearTimeout(timer); resolve(match[1]); } });
  });
  socket = new WebSocket(endpoint);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) { const item = pending.get(message.id); pending.delete(message.id); clearTimeout(item.timer); if (message.error) item.reject(Error(JSON.stringify(message.error))); else item.resolve(message.result); }
    if (message.method === 'Runtime.exceptionThrown') exceptions.push({ mode, session: message.sessionId, text: message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text });
    if (message.method === 'Network.requestWillBeSent') requests.push({ mode, url: message.params.request.url, method: message.params.request.method });
    if (message.method === 'Page.fileChooserOpened') fileChoosers.push({mode,session:message.sessionId,...message.params});
    if (message.method === 'Network.loadingFailed') networkFailures.push({mode,session:message.sessionId,...message.params});
    if (message.method === 'Network.responseReceived') responses.push({ mode, url: message.params.response.url, session: message.sessionId, requestId: message.params.requestId, status: message.params.response.status });
    if (message.method === 'Browser.downloadWillBegin') downloads.push({ mode, ...message.params });
    if (message.method === 'Browser.downloadProgress') { const download = downloads.find(item => item.guid === message.params.guid); if (download) Object.assign(download, message.params); }
  });
  browserVersion=(await send('Browser.getVersion',{},null)).product;
  await send('Browser.setDownloadBehavior', { behavior: 'allowAndName', downloadPath: path.join(evidence, 'downloads'), eventsEnabled: true }, null);
  await runCurrentMainControl();
  await runEntry({ name: 'desktop-http', width: 1360, height: 1000, url: `http://127.0.0.1:${server.address().port}/index.html` });
  await runEntry({ name: 'mobile-file', width: 390, height: 900, url: pathToFileURL(path.join(source, 'demo.html')).href });
  mode = null;
  await group('source_delivery_and_execution_boundaries', async () => {
    await verifySource();
    assert.deepEqual(exceptions, []);
    const unexpected = requests.filter(request => {
      const url = new URL(request.url);
      if (url.protocol === 'http:') return url.hostname !== '127.0.0.1' || Number(url.port) !== server.address().port;
      if (url.protocol === 'file:') return ![source, path.resolve(source, '../baseline')].some(root => fileURLToPath(url).startsWith(root + path.sep));
      return !['blob:', 'data:', 'about:'].includes(url.protocol);
    });
    assert.deepEqual(unexpected, []);
    return { verifiedSourceFiles: manifest.source_files.length, acceptedDeckSha256: oracle.deck_sha256, exceptions, requestCount: requests.length, sessions };
  });
} catch (error) {
  fatal = error.stack || String(error);
  if (socket?.readyState === 1 && session) { try { await shot('failure'); } catch {} }
} finally {
  if (socket?.readyState === 1) { try { await send('Browser.close', {}, null); } catch {} socket.close(); }
  if (browser && browser.exitCode === null) browser.kill('SIGTERM');
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  for (const item of pending.values()) clearTimeout(item.timer);
  await delay(150);
  await fs.rm(profile, { recursive: true, force: true });
  const receipt = { schema: 'recallweave.reading-evidence-course-receiving.v1', startedAt, completedAt: new Date().toISOString(), source, features, manifestSha256: sha(await fs.readFile(manifestArg)), receiverSha256: sha(await fs.readFile(fileURLToPath(import.meta.url))), contractSha256: sha(await fs.readFile(contractPath)), oracleSha256: sha(await fs.readFile(path.join(own, 'course-oracle.json'))), courseSha256: sha(await fs.readFile(deckPath)), node: process.version, chromium: browserVersion, checks, sessions, requests, responses, downloads, exceptions, httpServed, networkFailures, fileChoosers, fatal, cleanup: { ownServerClosed: !server?.listening, ownProfileRemoved: true }, qualification: 'Actual native Chromium DOM, pointer input, real local file admission and downloaded bytes. Candidate/composed source identity stays separate. No source, owner checkout, or live user session writes.' };
  await fs.writeFile(path.join(evidence, 'browser-receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
}
const failed = checks.filter(check => !check.passed).map(check => check.name);
console.log(JSON.stringify({ passed: checks.length - failed.length, failed, fatal, evidence }));
if (fatal || failed.length) process.exitCode = 1;
