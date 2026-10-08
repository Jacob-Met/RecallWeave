#!/usr/bin/env node
// Actual direct-file receiving. Requires Node 22+ and an installed sandboxed Chromium.
// This script writes only a newly created receiving directory and removes its own profile.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = path.resolve(process.argv[2] ?? fileURLToPath(new URL('../', import.meta.url)));
const out = path.resolve(process.argv[3] ?? path.join(root, '../evidence/browser-r1'));
const packageRoot = process.argv[5] ? path.resolve(process.argv[5]) : null;
const executable = process.argv[4] ?? process.env.STABLE_CHROMIUM ?? '/snap/chromium/current/usr/lib/chromium-browser/chrome';
await fs.mkdir(out); // Deliberately refuse reuse; prior failures remain separate.
const downloads = path.join(out, 'downloads');
await fs.mkdir(downloads);
const profile = await fs.mkdtemp(path.join(process.env.STABLE_PROFILE_ROOT ?? out, 'stable-profile-'));
const payloadPaths = ['src/stable-matching.mjs', 'src/stable-matching-ui.mjs', 'templates/stable-matching-explorer.html', 'courses/stable-matching.json', 'courses/stable-matching.md', 'tools/build-stable-matching.mjs'];
const sourcePaths = [...payloadPaths, 'courses/stable-matching-explorer.html', 'demo.html', 'tools/check-stable-matching-browser.mjs'];
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const hashSources = async () => Object.fromEntries(await Promise.all(sourcePaths.map(async name => [name, sha(await fs.readFile(path.join(root, name)))])));
const before = await hashSources();
const sourceHashes = Object.fromEntries(payloadPaths.map(name => [name, before[name]]));
const { traceStableMatching } = await import(pathToFileURL(path.join(root, 'src/stable-matching.mjs')));
const courseBytes = await fs.readFile(path.join(root, 'courses/stable-matching.json'));
const guideBytes = await fs.readFile(path.join(root, 'courses/stable-matching.md'));
const course = JSON.parse(courseBytes);
const left = ['A', 'B', 'C', 'D'], right = ['W', 'X', 'Y', 'Z'];
const profiles = {
  provisional: {leftPreferences:[[0,1,2],[0,1,2],[1,0,2]],rightPreferences:[[1,0,2],[0,2,1],[0,1,2]],proposingSide:'left'},
  two: {leftPreferences:[[0,1],[1,0]],rightPreferences:[[1,0],[0,1]],proposingSide:'left'},
  shared: {leftPreferences:Array.from({length:4},()=>[0,1,2,3]),rightPreferences:Array.from({length:4},()=>[3,2,1,0]),proposingSide:'left'},
  single: {leftPreferences:[[0]],rightPreferences:[[0]],proposingSide:'left'}
};
const checks = [], errors = [], requests = [], downloadEvents = [], received = [], answers = [], metrics = {};
const pending = new Map();
let browser, socket, version, receipt, nextId = 0, chromeStderr = '';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function send(method, params = {}, sessionId) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout ' + method)); }, 45000);
    pending.set(id, {resolve, reject, timer});
    socket.send(JSON.stringify({id,method,params,...(sessionId ? {sessionId} : {})}));
  });
}
async function evaluate(s, expression) {
  const result = await send('Runtime.evaluate', {expression,returnByValue:true,awaitPromise:true}, s);
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  return result.result.value;
}
async function wait(s, expression) {
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) { if (await evaluate(s, expression)) return; await delay(70); }
  throw new Error('Page state timeout: ' + expression);
}
async function page(relative, locationRoot = root) {
  const {targetId} = await send('Target.createTarget', {url:'about:blank'});
  const {sessionId:s} = await send('Target.attachToTarget', {targetId,flatten:true});
  for (const method of ['Runtime.enable','Page.enable','Network.enable','DOM.enable','Accessibility.enable']) await send(method, {}, s);
  await send('Network.emulateNetworkConditions', {offline:true,latency:0,downloadThroughput:0,uploadThroughput:0}, s);
  await send('Page.addScriptToEvaluateOnNewDocument', {source:
    "window.__storageCalls=[];for(const name of ['setItem','removeItem','clear']){const old=Storage.prototype[name];Storage.prototype[name]=function(...args){window.__storageCalls.push('Storage.'+name);return old.apply(this,args);};}for(const [object,names] of [[globalThis.indexedDB,['open','deleteDatabase']],[globalThis.caches,['open','delete']]]){if(object)for(const name of names){const old=object[name];object[name]=function(...args){window.__storageCalls.push(name);return old.apply(this,args);};}}"
  }, s);
  await send('Emulation.setDeviceMetricsOverride', {width:1280,height:950,deviceScaleFactor:1,mobile:false}, s);
  await send('Page.navigate', {url:pathToFileURL(path.join(locationRoot,relative)).href}, s);
  return s;
}
async function click(s, selector) {
  const point = await evaluate(s, '(()=>{const e=document.querySelector('+JSON.stringify(selector)+');if(!e)throw new Error("Missing element "+'+JSON.stringify(selector)+');e.scrollIntoView({block:"center"});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()');
  await send('Input.dispatchMouseEvent', {type:'mousePressed',button:'left',clickCount:1,...point}, s);
  await send('Input.dispatchMouseEvent', {type:'mouseReleased',button:'left',clickCount:1,...point}, s);
}
async function key(s, name, code, virtual, extra = {}) {
  await send('Input.dispatchKeyEvent', {type:'keyDown',key:name,code,windowsVirtualKeyCode:virtual,...extra}, s);
  await send('Input.dispatchKeyEvent', {type:'keyUp',key:name,code,windowsVirtualKeyCode:virtual,modifiers:extra.modifiers ?? 0}, s);
}
async function enter(s) { await key(s,'Enter','Enter',13,{text:'\r',unmodifiedText:'\r'}); }
async function keyboardSelect(s, selector, index) {
  await evaluate(s, 'document.querySelector('+JSON.stringify(selector)+').focus()');
  await key(s,'Home','Home',36);
  for (let i=0;i<index;i++) await key(s,'ArrowDown','ArrowDown',40);
  await key(s,'Tab','Tab',9);
}
async function keyboardText(s, selector, text) {
  await click(s,selector);
  await key(s,'a','KeyA',65,{modifiers:2});
  await send('Input.insertText', {text}, s);
}
async function view(s) {
  return evaluate(s, `(()=>({
    hidden:document.querySelector('#results').hidden,
    observationDisabled:document.querySelector('#download-observation').disabled,
    errorHidden:document.querySelector('#preference-error').hidden,
    error:document.querySelector('#preference-error').textContent,
    status:document.querySelector('#draft-status').textContent,
    focus:document.activeElement.id,
    final:document.querySelector('#final-pairs').textContent,
    proposals:document.querySelector('#total-proposals').textContent,
    stable:document.querySelector('#stable-count').textContent,
    selectedStep:Number(document.querySelector('#step-select').value),
    matchingIndex:Number(document.querySelector('#matching-select').value),
    steps:[...document.querySelector('#step-select').options].map(e=>({value:e.value,text:e.textContent})),
    matchings:[...document.querySelector('#matching-select').options].map(e=>({value:e.value,text:e.textContent})),
    decision:document.querySelector('#decision').textContent,
    decisionClass:document.querySelector('#decision').className,
    current:document.querySelector('#current-step').textContent,
    free:document.querySelector('#free-proposers').textContent,
    held:[...document.querySelectorAll('#held-table tbody tr')].map(r=>[...r.cells].map(c=>c.textContent)),
    cursors:[...document.querySelectorAll('#cursor-table tbody tr')].map(r=>[...r.cells].map(c=>c.textContent)),
    inspection:[...document.querySelectorAll('#matching-table tbody tr')].map(r=>[...r.cells].map(c=>c.textContent)),
    witnesses:[...document.querySelectorAll('#blocking-witnesses tbody tr')].map(r=>[...r.cells].map(c=>c.textContent)),
    inspectionStatus:document.querySelector('#inspection-status').textContent,
    diagram:document.querySelector('#held-diagram').getAttribute('aria-label'),
    lines:document.querySelectorAll('#held-diagram path').length,
    disabled:Object.fromEntries(['first-step','back-step','next-step','finish-step'].map(id=>[id,document.getElementById(id).disabled])),
    overflow:document.documentElement.scrollWidth>innerWidth+1,
    storageCalls:window.__storageCalls
  }))()`);
}
const pairText = matching => matching.map((r,l)=>left[l]+'–'+right[r]).join(' · ');
async function assertApplied(s, expected) {
  const actual = await view(s);
  assert.equal(actual.hidden,false);
  assert.equal(actual.errorHidden,true);
  assert.equal(actual.observationDisabled,false);
  assert.equal(actual.final,pairText(expected.final.leftMatching));
  assert.equal(actual.proposals,expected.proposalCount+' proposal'+(expected.proposalCount===1?'':'s')+' in the completed trace');
  assert.equal(actual.stable,expected.stableMatchingIndices.length+' stable of '+expected.matchings.length+' complete matching'+(expected.matchings.length===1?'':'s'));
  assert.equal(actual.steps.length,expected.states.length);
  assert.equal(actual.matchings.length,expected.matchings.length);
  assert.deepEqual(actual.matchings,expected.matchings.map((m,i)=>({value:String(i),text:pairText(m.leftMatching)+(m.stable?' — stable':' — blocking pair')})));
  return actual;
}
async function assertStep(s, result, index) {
  const actual = await view(s), state = result.states[index], side = result.profile.proposingSide;
  const ps = side==='left'?left:right, rs = side==='left'?right:left;
  const preferences = side==='left'?result.profile.leftPreferences:result.profile.rightPreferences;
  const matches = side==='left'?state.leftMatching:state.rightMatching;
  assert.equal(actual.selectedStep,index);
  assert.equal(actual.current,'Selected step '+index+' of '+result.proposalCount);
  assert.equal(actual.decisionClass,'decision'+(state.action?' '+state.action.decision:''));
  assert.deepEqual(actual.held,state.leftMatching.map((r,l)=>[
    left[l],r===null?'Free':right[r],
    r===null?'—':String(result.profile.leftPreferences[l].indexOf(r)+1),
    r===null?'—':String(result.profile.rightPreferences[r].indexOf(l)+1)
  ]));
  assert.deepEqual(actual.cursors,state.nextChoiceIndices.map((cursor,p)=>[
    ps[p],matches[p]===null?'Free':'Held by '+rs[matches[p]],
    cursor<result.size?rs[preferences[p][cursor]]+' (rank '+(cursor+1)+')':'No untried choice'
  ]));
  assert.equal(actual.free,'Free proposers: '+(state.freeProposers.map(p=>ps[p]).join(', ')||'none — the matching is complete.'));
  const pairs=state.leftMatching.flatMap((r,l)=>r===null?[]:[left[l]+'–'+right[r]]);
  assert.equal(actual.diagram,'Held pairs at step '+index+': '+(pairs.join(', ')||'none'));
  assert.equal(actual.lines,pairs.length);
  assert.deepEqual(actual.disabled,{'first-step':index===0,'back-step':index===0,'next-step':index===result.proposalCount,'finish-step':index===result.proposalCount});
  return actual;
}
async function assertInspection(s, result, index) {
  const actual = await view(s), m = result.matchings[index];
  assert.equal(actual.matchingIndex,index);
  assert.deepEqual(actual.inspection,m.leftMatching.map((r,l)=>[left[l]+'–'+right[r],String(m.leftRanks[l]),String(m.rightRanks[r])]));
  assert.equal(actual.inspectionStatus,m.stable?'Stable · no blocking pair':'Unstable · '+m.blockingPairs.length+' blocking pair'+(m.blockingPairs.length===1?'':'s'));
  assert.deepEqual(actual.witnesses,m.blockingPairs.map(p=>[
    left[p.left]+'–'+right[p.right],
    right[p.leftCurrentPartner]+' (rank '+p.leftCurrentRank+') → '+right[p.right]+' (rank '+p.leftAlternativeRank+')',
    left[p.rightCurrentPartner]+' (rank '+p.rightCurrentRank+') → '+left[p.left]+' (rank '+p.rightAlternativeRank+')'
  ]));
  return actual;
}
async function apply(s) { await click(s,'#apply'); await wait(s,"!document.querySelector('#results').hidden"); }
async function preset(s, keyName) {
  const index = ['provisional','two','shared','aligned','single'].indexOf(keyName);
  await keyboardSelect(s,'#preset',index);
  await click(s,'#load-preset');
  const retired = await view(s);
  assert.equal(retired.hidden,true);assert.equal(retired.observationDisabled,true);
  assert.match(retired.status,/Preset loaded/);
}
async function download(s, selector, filename, expected) {
  const start = downloadEvents.length;
  await click(s,selector);
  const deadline = Date.now()+45000;
  let begin;
  while(Date.now()<deadline) {
    begin=downloadEvents.slice(start).find(e=>e.method==='Browser.downloadWillBegin');
    if(begin&&downloadEvents.some(e=>e.method==='Browser.downloadProgress'&&e.params.guid===begin.params.guid&&e.params.state==='completed'))break;
    await delay(80);
  }
  assert.ok(begin,'download started');
  assert.ok(downloadEvents.some(e=>e.method==='Browser.downloadProgress'&&e.params.guid===begin.params.guid&&e.params.state==='completed'),'download completed');
  const bytes=await fs.readFile(path.join(downloads,begin.params.guid));
  if(expected!==undefined)assert.deepEqual(bytes,Buffer.from(expected));
  const target=path.join(downloads,filename);
  await fs.writeFile(target,bytes,{flag:'wx'});await fs.unlink(path.join(downloads,begin.params.guid));
  const record={filename,suggested:begin.params.suggestedFilename,bytes:bytes.length,sha256:sha(bytes)};
  received.push(record);
  return{bytes,path:target,record};
}
function observation(result, step, index) {
  return JSON.stringify({
    format:'recallweave-stable-matching-observation/1',
    model:'Strict complete equal-size one-to-one preferences; ordinal ranks; no fairness or real allocation claim.',
    sourceHashes,appliedProfile:result.profile,
    labels:{left:left.slice(0,result.size),right:right.slice(0,result.size)},
    trace:result,selectedStep:step,inspectedMatchingIndex:index,inspectedMatching:result.matchings[index]
  },null,2)+'\n';
}
async function screenshot(s, filename) {
  await evaluate(s,'window.scrollTo(0,0)');
  const {cssContentSize:size}=await send('Page.getLayoutMetrics',{},s);
  const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:size.width,height:size.height,scale:1}},s);
  await fs.writeFile(path.join(out,filename),Buffer.from(shot.data,'base64'));
  metrics[filename]={width:size.width,height:size.height};
}
try {
  browser=spawn(executable,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-sync','--disable-extensions','--password-store=basic','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe']});
  const endpoint=await new Promise((resolve,reject)=>{
    let stderr='';
    const timer=setTimeout(()=>reject(new Error('Chromium startup timeout '+stderr.slice(-2000))),90000);
    browser.on('error',e=>{clearTimeout(timer);reject(e);});
    browser.on('exit',code=>{clearTimeout(timer);reject(new Error('Chromium exited '+code+' '+stderr.slice(-2000)));});
    browser.stderr.on('data',b=>{stderr+=b;chromeStderr+=b;const m=stderr.match(/DevTools listening on (ws:\/\/127\.0\.0\.1:[^\s]+)/);if(m){clearTimeout(timer);resolve(m[1]);}});
  });
  socket=new WebSocket(endpoint);
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  socket.addEventListener('message',e=>{
    const m=JSON.parse(e.data),p=pending.get(m.id);
    if(p){pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);}
    if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);
    if(m.method==='Network.requestWillBeSent')requests.push(m.params.request.url);
    if(m.method?.startsWith('Browser.download'))downloadEvents.push(m);
  });
  version=await send('Browser.getVersion');
  await send('Browser.setDownloadBehavior',{behavior:'allowAndName',downloadPath:downloads,eventsEnabled:true});
  const s=await page('courses/stable-matching-explorer.html');
  await wait(s,"document.querySelectorAll('.preference-input').length===6");
  let state=await view(s);
  assert.equal(state.hidden,true);assert.equal(state.observationDisabled,true);
  assert.match(state.status,/Ready to apply/);
  checks.push('Direct-file initial draft requires explicit Apply; observation begins disabled.');
  await evaluate(s,"document.querySelector('#left-preference-0').focus()");
  await enter(s);await wait(s,"!document.querySelector('#results').hidden");
  const result=traceStableMatching(profiles.provisional);
  assert.equal(result.proposalCount,6);assert.deepEqual(result.final.leftMatching,[1,0,2]);
  await assertApplied(s,result);await assertStep(s,result,0);
  checks.push('Keyboard Enter applies the original six-proposal profile: A–X, B–W, C–Y.');
  await click(s,'details summary');
  for(let i=0;i<result.states.length;i++){
    await keyboardSelect(s,'#step-select',i);
    await assertStep(s,result,i);
  }
  await click(s,'#first-step');await assertStep(s,result,0);
  await click(s,'#next-step');await assertStep(s,result,1);
  await click(s,'#next-step');state=await assertStep(s,result,2);
  assert.match(state.decision,/W replaces A \(rank 2\) with B \(rank 1\)\. A becomes free/);
  await click(s,'#back-step');await assertStep(s,result,1);
  await click(s,'#finish-step');await assertStep(s,result,6);
  await keyboardSelect(s,'#step-select',4);state=await assertStep(s,result,4);
  assert.match(state.decision,/X rejects C \(rank 2\) and keeps A \(rank 1\)/);
  checks.push('All seven exact-step selections and First/Back/Next/Finish match held pairs, free proposers, next-choice cursors, ranks, diagram and disabled boundaries.');
  for(let i=0;i<6;i++){await keyboardSelect(s,'#matching-select',i);await assertInspection(s,result,i);assert.equal((await view(s)).selectedStep,4);}
  await keyboardSelect(s,'#matching-select',0);state=await assertInspection(s,result,0);
  assert.deepEqual(state.witnesses.map(row=>row[0]),['B–W','C–X']);
  await keyboardSelect(s,'#step-select',2);await assertStep(s,result,2);
  assert.equal((await view(s)).matchingIndex,0);
  await download(s,'#download-observation','default-step2-matching0.json',observation(result,2,0));
  checks.push('All six complete matchings and exact blocking witnesses agree; independent step/inspection selections and all six source hashes survive an actual byte-exact observation download.');
  const ax=await send('Accessibility.getFullAXTree',{},s);
  const exposed=ax.nodes.filter(n=>!n.ignored).map(n=>({role:n.role?.value,name:n.name?.value}));
  for(const name of ['A preferences, best first','W preferences, best first','Apply preferences','Inspect an exact step','Complete matching to inspect'])assert.ok(exposed.some(n=>n.name===name),'AX name '+name);
  assert.ok(exposed.some(n=>n.role==='image'&&n.name==='Held pairs at step 2: B–W'));
  assert.equal((await view(s)).overflow,false);
  await fs.writeFile(path.join(out,'accessibility-explorer.json'),JSON.stringify(exposed,null,2)+'\n');
  await screenshot(s,'explorer-desktop.png');
  checks.push('Desktop geometry has no page overflow; native accessibility tree exposes labelled preference/step/matching controls and current held-pair diagram.');
  await keyboardText(s,'#left-preference-0','W W Y');
  state=await view(s);assert.equal(state.hidden,true);assert.equal(state.observationDisabled,true);
  await enter(s);
  state=await view(s);assert.equal(state.hidden,true);assert.equal(state.observationDisabled,true);
  assert.equal(state.errorHidden,false);assert.match(state.error,/A must list W, X, Y exactly once/);assert.equal(state.focus,'preference-error');
  assert.equal(await evaluate(s,"document.querySelector('#left-preference-0').value"),'W W Y');
  const downloadedCourse=await download(s,'#download-course','stable-matching.json',courseBytes);
  await download(s,'#download-guide','stable-matching.md',guideBytes);
  checks.push('An actual keyboard duplicate-row draft retires results and observation, preserves W W Y and focuses the error; course and guide still download exact original bytes.');
  await keyboardSelect(s,'#group-size',3);
  state=await view(s);assert.equal(state.hidden,true);assert.equal(state.observationDisabled,true);assert.match(state.status,/Every row was reset/);
  assert.deepEqual(await evaluate(s,"[...document.querySelectorAll('#left-rows input')].map(e=>e.value)"),Array(4).fill('W X Y Z'));
  assert.deepEqual(await evaluate(s,"[...document.querySelectorAll('#right-rows input')].map(e=>e.value)"),Array(4).fill('A B C D'));
  checks.push('Changing group size explicitly resets every row, keeps the new rows as a draft and retires the old observation.');
  await preset(s,'two');await apply(s);
  const twoLeft=traceStableMatching(profiles.two);
  await assertApplied(s,twoLeft);assert.equal((await view(s)).final,'A–W · B–X');assert.equal(twoLeft.stableMatchingIndices.length,2);
  await keyboardSelect(s,'#proposing-side',1);state=await view(s);assert.equal(state.hidden,true);assert.equal(state.observationDisabled,true);
  await apply(s);
  const twoRight=traceStableMatching({...profiles.two,proposingSide:'right'});
  await assertApplied(s,twoRight);assert.equal((await view(s)).final,'A–X · B–W');
  for(let i=0;i<twoRight.states.length;i++){await keyboardSelect(s,'#step-select',i);await assertStep(s,twoRight,i);}
  const rightIndex=twoRight.matchings.findIndex(m=>m.leftMatching.every((r,l)=>r===twoRight.final.leftMatching[l]));
  await download(s,'#download-observation','right-proposing-final.json',observation(twoRight,twoRight.proposalCount,rightIndex));
  checks.push('Two-stable-outcome preset changes A–W/B–X to A–X/B–W after explicit proposing-side Apply; right-side cursors, steps and actual observation remain exact.');
  await preset(s,'shared');await apply(s);
  const shared=traceStableMatching(profiles.shared);
  assert.equal(shared.proposalCount,10);assert.equal(shared.matchings.length,24);
  await assertApplied(s,shared);
  await click(s,'#finish-step');await assertStep(s,shared,10);
  await keyboardSelect(s,'#matching-select',7);await assertInspection(s,shared,7);
  await download(s,'#download-observation','four-person-final-matching7.json',observation(shared,10,7));
  checks.push('Four-person shared-first-choice preset displays 10 proposals and all 24 matchings, with full selected observation byte parity.');
  await preset(s,'single');await apply(s);
  const single=traceStableMatching(profiles.single);
  await assertApplied(s,single);await assertStep(s,single,0);
  await click(s,'#finish-step');await assertStep(s,single,1);await assertInspection(s,single,0);
  checks.push('One-person boundary has exactly one proposal, one matching, no blocking pair and correct step controls.');
  await preset(s,'provisional');await apply(s);await keyboardSelect(s,'#step-select',2);await keyboardSelect(s,'#matching-select',0);
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true},s);
  await assertApplied(s,result);await assertStep(s,result,2);await assertInspection(s,result,0);
  assert.equal((await view(s)).overflow,false);
  metrics.phone=await evaluate(s,"({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,tables:[...document.querySelectorAll('.table-wrap')].filter(e=>e.getClientRects().length).map(e=>({client:e.clientWidth,scroll:e.scrollWidth}))})");
  await screenshot(s,'explorer-phone.png');
  checks.push('390px phone layout retains the applied replacement and blocking-pair evidence without page overflow.');
  const learner=await page('demo.html');
  await wait(learner,"document.querySelector('#deck-file') && document.querySelector('#start-button')");
  await click(learner,'#start-button');await wait(learner,"document.querySelector('.question-card h2')");
  const previousPrompt=await evaluate(learner,"document.querySelector('.question-card h2').textContent");
  const {root:dom}=await send('DOM.getDocument',{},learner);
  const {nodeId}=await send('DOM.querySelector',{nodeId:dom.nodeId,selector:'#deck-file'},learner);
  await send('DOM.setFileInputFiles',{nodeId,files:[downloadedCourse.path]},learner);
  await wait(learner,"document.querySelector('#start-deck')");
  assert.equal(await evaluate(learner,"document.querySelectorAll('#deck-preview li').length"),12);
  assert.equal(await evaluate(learner,"document.querySelector('.question-card h2').textContent"),previousPrompt);
  assert.equal(await evaluate(learner,"document.querySelector('#deck-preview h3').textContent"),course.title);
  await screenshot(learner,'learner-preview.png');
  await click(learner,'#start-deck');await wait(learner,"document.querySelector('.question-card h2')");
  const seen=[];
  for(let i=0;i<12;i++){
    const prompt=await evaluate(learner,"document.querySelector('.question-card h2').textContent");
    const item=course.items.find(q=>q.prompt===prompt);assert.ok(item);assert.ok(!seen.includes(item.id));seen.push(item.id);
    const choice=i===0?(item.answer+1)%item.options.length:item.answer;
    await click(learner,'[data-choice="'+choice+'"]');await wait(learner,"document.querySelector('#next-button')");
    const feedback=await evaluate(learner,"document.querySelector('#feedback-slot').textContent");
    assert.ok(feedback.includes(item.explanation));assert.ok(feedback.includes(item.transfer));
    answers.push({id:item.id,choice,answer:item.answer});
    await click(learner,'#next-button');
  }
  await wait(learner,"document.querySelector('#first-try-summary')");
  assert.equal(await evaluate(learner,"document.querySelectorAll('.review-item').length"),12);
  assert.match(await evaluate(learner,"document.querySelector('#first-try-summary').textContent"),/11 of 12/);
  const reviewText=await evaluate(learner,"document.querySelector('.review-list').textContent");
  for(const item of course.items){assert.ok(reviewText.includes(item.prompt));assert.ok(reviewText.includes(item.explanation));assert.ok(reviewText.includes(item.transfer));}
  await screenshot(learner,'learner-review.png');
  checks.push('Downloaded course previews 12 original questions without replacing the active lesson; explicit Start deck receives all 12 source-choice IDs, exact feedback/transfers and 11-of-12 review.');
  await click(learner,'#practice-button');await wait(learner,"document.querySelector('.practice-card h2')");
  const missed=course.items.find(q=>q.id===answers[0].id);
  assert.equal(await evaluate(learner,"document.querySelector('.practice-card h2').textContent"),missed.prompt);
  await click(learner,'[data-practice-choice="'+missed.answer+'"]');await click(learner,'#practice-next');
  await wait(learner,"document.querySelector('#practice-status')");
  assert.match(await evaluate(learner,"document.querySelector('#practice-status').textContent"),/1 of 1/);
  assert.match(await evaluate(learner,"document.querySelector('#first-try-summary').textContent"),/11 of 12/);
  const reflection='A held pair can change; a blocking pair requires both participants to prefer the switch. Stable does not mean uniquely fair.';
  await keyboardText(learner,'#application-reflection',reflection);
  const notes=await download(learner,'#save-notes-button','stable-matching-study-notes.txt');
  assert.ok(notes.bytes.toString('utf8').includes(course.title));assert.ok(notes.bytes.toString('utf8').includes(reflection));assert.ok(notes.bytes.toString('utf8').includes(missed.explanation));
  checks.push('One missed connection receives a successful separate retry while first-attempt history stays intact; an actual study-notes download preserves the typed reflection.');

  if(packageRoot){
    const packageNames=['START-HERE.html','README.txt','MANIFEST.json','demo.html','courses/stable-matching-explorer.html','courses/stable-matching.json','courses/stable-matching.md'];
    const packageHashes=Object.fromEntries(await Promise.all(packageNames.map(async n=>[n,sha(await fs.readFile(path.join(packageRoot,n)))])));
    for(const name of ['demo.html','courses/stable-matching-explorer.html','courses/stable-matching.json','courses/stable-matching.md'])assert.equal(packageHashes[name],before[name]);
    const packed=await page('START-HERE.html',packageRoot);
    await wait(packed,"document.querySelector('#open-explorer')");
    const links=await evaluate(packed,"Object.fromEntries(['open-explorer','course-download','open-learner','guide-download'].map(id=>[id,document.getElementById(id).href]))");
    for(const [id,relative] of Object.entries({'open-explorer':'courses/stable-matching-explorer.html','course-download':'courses/stable-matching.json','open-learner':'demo.html','guide-download':'courses/stable-matching.md'}))assert.equal(links[id],pathToFileURL(path.join(packageRoot,relative)).href);
    await click(packed,'#open-explorer');await wait(packed,"document.querySelectorAll('.preference-input').length===6");
    assert.equal(await evaluate(packed,'location.href'),links['open-explorer']);
    await apply(packed);await assertApplied(packed,result);await assertStep(packed,result,0);
    assert.deepEqual(await evaluate(packed,'window.__storageCalls'),[]);
    checks.push('Relocated seven-file package preserves all four canonical assets; START-HERE links resolve inside the extracted folder and its actual explorer link opens/applies the exact default profile.');
    const relocatedCourse=await download(packed,'#download-course','relocated-stable-matching.json',courseBytes);
    checks.push('Relocated explorer produces an actual course download byte-identical to the canonical original.');
    await send('Page.navigate',{url:pathToFileURL(path.join(packageRoot,'START-HERE.html')).href},packed);
    await wait(packed,"document.querySelector('#open-learner')");
    await click(packed,'#open-learner');await wait(packed,"document.querySelector('#deck-file')");
    assert.equal(await evaluate(packed,'location.href'),links['open-learner']);
    const {root:packedDom}=await send('DOM.getDocument',{},packed);
    const {nodeId:packedInput}=await send('DOM.querySelector',{nodeId:packedDom.nodeId,selector:'#deck-file'},packed);
    await send('DOM.setFileInputFiles',{nodeId:packedInput,files:[relocatedCourse.path]},packed);
    await wait(packed,"document.querySelector('#start-deck')");
    assert.equal(await evaluate(packed,"document.querySelectorAll('#deck-preview li').length"),12);
    assert.equal(await evaluate(packed,"document.querySelector('#deck-preview h3').textContent"),course.title);
    await click(packed,'#start-deck');await wait(packed,"document.querySelector('.question-card h2')");
    const packedPrompt=await evaluate(packed,"document.querySelector('.question-card h2').textContent");
    assert.ok(course.items.some(q=>q.prompt===packedPrompt));
    assert.deepEqual(await evaluate(packed,'window.__storageCalls'),[]);
    const afterPackage=Object.fromEntries(await Promise.all(packageNames.map(async n=>[n,sha(await fs.readFile(path.join(packageRoot,n)))])));
    assert.deepEqual(afterPackage,packageHashes);
    metrics.relocated={root:packageRoot,source:packageHashes,links};
    await screenshot(packed,'relocated-learner-start.png');
    checks.push('Relocated START-HERE learner link receives the actual downloaded course through the 12-item preview and explicit Start; all package bytes and storage remain unchanged.');
  }
  assert.deepEqual(await evaluate(s,'window.__storageCalls'),[]);
  assert.deepEqual(await evaluate(learner,'window.__storageCalls'),[]);
  assert.deepEqual(errors,[]);
  assert.deepEqual(requests.filter(url=>/^(https?|wss?):/.test(url)),[]);
  assert.deepEqual(await hashSources(),before);
  checks.push('Both pages stay offline with zero external network requests, page exceptions, instrumented storage writes or source-byte changes.');
  receipt={success:true,at:new Date().toISOString(),node:process.version,browser:version,checks,source:before,downloads:received,metrics,requests,errors,answers,cleanupReceipt:'profile-cleanup.json'};
} catch(error) {
  receipt={success:false,at:new Date().toISOString(),node:process.version,browser:version,checks,source:before,downloads:received,metrics,requests,errors,answers,error:String(error.stack??error)};
  process.exitCode=1;
} finally {
  await fs.writeFile(path.join(out,'chromium-stderr.log'),chromeStderr,{flag:'wx'});
  for(const name of ['chrome_debug.log','DevToolsActivePort']){try{await fs.copyFile(path.join(profile,name),path.join(out,'profile-'+name),fs.constants?.COPYFILE_EXCL ?? 1);}catch(error){if(error.code!=='ENOENT')throw error;}}
  await fs.writeFile(path.join(out,'receipt.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
  for(const p of pending.values())clearTimeout(p.timer);pending.clear();
  if(socket?.readyState===1){try{await send('Browser.close');}catch{}}
  socket?.close();
  if(browser&&browser.exitCode===null){browser.kill('SIGTERM');await delay(500);if(browser.exitCode===null)browser.kill('SIGKILL');}
  await fs.rm(profile,{recursive:true,force:true});
  await fs.writeFile(path.join(out,'profile-cleanup.json'),JSON.stringify({at:new Date().toISOString(),profile,removed:true,sandboxDisabled:false})+'\n',{flag:'wx'});
  console.log(JSON.stringify({success:receipt?.success,groups:checks.length,downloads:received.length,path:path.join(out,'receipt.json'),error:receipt?.error}));
}
