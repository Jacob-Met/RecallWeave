#!/usr/bin/env node
/** Native offline explorer and unchanged learner receiving; no browser package is required. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, rm, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const args=process.argv.slice(2),option=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
const root=resolve(option('--root',join(dirname(fileURLToPath(import.meta.url)),'..')));
const executable=option('--browser','chromium');
const existingCourseFile=option('--course-file',null);
const lifecycleOnly=args.includes('--lifecycle-only');
const output=resolve(option('--output',join(root,'docs/receiving/union-find-44df5c2e45ae/browser-receiving')));
await mkdir(output,{recursive:false});
const profile=join(output,'profile'),downloads=join(output,'downloads');
await mkdir(profile);await mkdir(downloads);
const sourcePaths=['src/union-find.mjs','src/union-find-ui.mjs','templates/union-find-explorer.html','courses/union-find-explorer.html','courses/union-find.json','courses/union-find.md','tools/build-union-find.mjs','src/app.mjs','src/knowledge.mjs','src/review.mjs','src/deck.mjs','src/deck-picker.mjs','src/answer-order.mjs','src/reflections.mjs','src/session-export.mjs','src/trace-archive.mjs','src/trace-archive-ui.mjs','src/lesson-archive.mjs','src/lesson-archive-ui.mjs','demo.html'];
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
async function pins(){return Object.fromEntries(await Promise.all(sourcePaths.map(async path=>[path,digest(await readFile(join(root,path)))])));}
const report={format:'recallweave-union-find-native-browser/1',started:new Date().toISOString(),root,node:process.version,executable,lifecycleOnly,status:'running',checks:[],downloads:[],pageErrors:[],externalRequests:[],sourceSha256:await pins()};
const courseText=await readFile(join(root,'courses/union-find.json'),'utf8'),course=JSON.parse(courseText);
let browser,socket,sessionId,sequence=0,stderr='';
const pending=new Map(),downloadEvents=new Map();
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(check,label){
  let error;
  for(let attempt=0;attempt<180;attempt++){try{if(await check())return;}catch(caught){error=caught;}await pause(75);}
  throw new Error('Timed out: '+label+(error?' ('+error.message+')':''));
}
function command(method,params={},scoped=true){
  const id=++sequence;
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout: '+method));},10000);
    pending.set(id,{resolve,reject,timer});
    socket.send(JSON.stringify({id,method,params,...(scoped&&sessionId?{sessionId}:{})}));
  });
}
async function evaluate(expression){
  const result=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description??result.exceptionDetails.text);
  return result.result.value;
}
async function key(name,code,number,modifiers=0){
  for(const type of ['keyDown','keyUp'])await command('Input.dispatchKeyEvent',{type,key:name,code,windowsVirtualKeyCode:number,nativeVirtualKeyCode:number,modifiers,...(type==='keyDown'&&name==='Enter'?{text:'\r',unmodifiedText:'\r'}:{})});
}
async function activate(selector){
  assert.ok(await evaluate('!!document.querySelector('+JSON.stringify(selector)+')'),'missing '+selector);
  await evaluate('document.querySelector('+JSON.stringify(selector)+').focus()');
  await key('Enter','Enter',13);
}
async function setText(selector,text){
  await evaluate('document.querySelector('+JSON.stringify(selector)+').focus()');
  await key('a','KeyA',65,2);
  await command('Input.insertText',{text});
}
async function selectIndex(selector,index){
  await evaluate('document.querySelector('+JSON.stringify(selector)+').focus()');
  await key('Home','Home',36);
  for(let i=0;i<index;i++)await key('ArrowDown','ArrowDown',40);
  await key('Enter','Enter',13);
}
async function toggle(){
  await evaluate("document.querySelector('#compression').focus()");
  await key(' ','Space',32);
}
async function navigate(path,selector){
  const url=pathToFileURL(join(root,path)).href;
  await command('Page.navigate',{url});
  await until(()=>evaluate('document.URL==='+JSON.stringify(url)+'&&document.readyState==="complete"&&!!document.querySelector('+JSON.stringify(selector)+')'),'load '+path);
}
async function readState(){
  return evaluate('({visible:!document.querySelector("#result-area").hidden,step:document.querySelector("#step-position").textContent,components:document.querySelector("#component-count").textContent,links:document.querySelector("#link-count").textContent,depth:document.querySelector("#tree-depth").textContent,rows:[...document.querySelectorAll("#parent-rows tr")].map(row=>[...row.cells].map(cell=>cell.textContent)),description:document.querySelector("#step-description").textContent,comparison:document.querySelector("#comparison").textContent,downloadDisabled:document.querySelector("#download-trace").disabled,error:document.querySelector("#input-error").textContent})');
}
const pass=message=>report.checks.push(message);
async function saveScreenshot(name){
  const shot=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  await writeFile(join(output,name),Buffer.from(shot.data,'base64'));
}
async function completedDownload(selector,expectedName){
  const before=new Set(downloadEvents.keys());
  const destination=join(downloads,String(report.downloads.length+1).padStart(2,'0'));
  await mkdir(destination);
  await command('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:destination,eventsEnabled:true},false);
  await activate(selector);
  let record;
  await until(()=>{
    record=[...downloadEvents.values()].find(item=>!before.has(item.guid)&&item.state==='completed'&&(!expectedName||item.suggestedFilename===expectedName));
    return !!record;
  },'completed download '+(expectedName||selector));
  const path=join(destination,record.suggestedFilename);
  let bytes;
  await until(async()=>{try{bytes=await readFile(path);return bytes.length===record.totalBytes;}catch{return false;}},'physical download bytes');
  report.downloads.push({name:record.suggestedFilename,directory:destination,bytes:bytes.length,sha256:digest(bytes),guid:record.guid,state:record.state});
  return {path,bytes};
}
try{
  browser=spawn(executable,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-sync','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe']});
  browser.stderr.on('data',chunk=>{stderr+=chunk.toString();});
  browser.on('error',error=>{stderr+='\n'+error.stack;});
  await until(()=>/DevTools listening on (ws:\/\/\S+)/.test(stderr),'browser DevTools startup');
  socket=new WebSocket(stderr.match(/DevTools listening on (ws:\/\/\S+)/)[1]);
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  socket.addEventListener('message',event=>{
    const message=JSON.parse(event.data);
    if(message.id){const item=pending.get(message.id);if(item){clearTimeout(item.timer);pending.delete(message.id);if(message.error)item.reject(new Error(JSON.stringify(message.error)));else item.resolve(message.result);}}
    if(message.method==='Runtime.exceptionThrown')report.pageErrors.push(message.params.exceptionDetails.exception?.description??message.params.exceptionDetails.text);
    if(message.method==='Network.requestWillBeSent'&&/^https?:/i.test(message.params.request.url))report.externalRequests.push(message.params.request.url);
    if(message.method==='Browser.downloadWillBegin')downloadEvents.set(message.params.guid,{...message.params,state:'started'});
    if(message.method==='Browser.downloadProgress'){const current=downloadEvents.get(message.params.guid);if(current)Object.assign(current,message.params);}
  });
  const {targetId}=await command('Target.createTarget',{url:'about:blank'},false);
  ({sessionId}=await command('Target.attachToTarget',{targetId,flatten:true},false));
  await command('Page.enable');await command('Runtime.enable');await command('Network.enable');
  await command('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads,eventsEnabled:true},false);
  await command('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});
  if(lifecycleOnly){
    pass('isolated browser starts and accepts the native protocol before cleanup');
    report.status='passed';
  }else{
  let downloadedCourse;
  if(!existingCourseFile){
  await navigate('courses/union-find-explorer.html','#apply-commands');
  assert.equal((await readState()).components,'6');
  for(let i=0;i<4;i++)await activate('#next-step');
  let state=await readState();assert.equal(state.components,'2');assert.equal(state.rows[3][1],'C');
  await activate('#next-step');state=await readState();assert.equal(state.components,'2');assert.equal(state.rows[3][1],'A');assert.equal(state.links,'2');
  await activate('#final-step');state=await readState();
  assert.equal(state.components,'1');assert.ok(state.rows.every(row=>row[1]==='A'));
  assert.match(state.comparison,/8 parent links followed with compression; 9 without/);
  pass('actual keyboard stepping separates joins, compression and redundant connections');
  await evaluate("document.querySelector('#trace-heading').scrollIntoView()");
  await saveScreenshot('explorer-desktop.png');
  await selectIndex('#preset',1);await activate('#use-example');
  assert.equal((await readState()).visible,false);assert.equal((await readState()).downloadDisabled,true);
  await activate('#apply-commands');await activate('#final-step');
  state=await readState();assert.equal(state.rows[7][1],'A');assert.equal(state.links,'1');
  await toggle();assert.equal((await readState()).visible,false);
  await activate('#apply-commands');await activate('#final-step');
  state=await readState();assert.equal(state.rows[7][1],'G');assert.equal(state.links,'3');assert.equal(state.components,'1');
  pass('native preset and compression controls clear stale output and show the unchanged partition with distinct parent paths');
  await setText('#commands','join A Q');await activate('#apply-commands');
  state=await readState();assert.equal(state.visible,false);assert.equal(state.downloadDisabled,true);assert.match(state.error,/Line 1/);
  await setText('#commands',Array(33).fill('find A').join('\n'));await activate('#apply-commands');assert.match((await readState()).error,/32 commands/);
  await selectIndex('#element-count',0);await setText('#commands','');await activate('#apply-commands');
  state=await readState();assert.equal(state.components,'1');assert.deepEqual(state.rows,[['A','A','A','1']]);
  assert.equal(await evaluate("document.querySelector('#step-slider').disabled"),true);
  pass('out-of-range elements and overlong histories refuse; one-element empty histories remain usable');
  await selectIndex('#preset',0);await activate('#use-example');await toggle();await activate('#apply-commands');
  for(let i=0;i<5;i++)await activate('#next-step');
  downloadedCourse=await completedDownload('#download-course','union-find.json');
  assert.equal(downloadedCourse.bytes.toString('utf8'),courseText);
  const downloadedGuide=await completedDownload('#download-guide','union-find.md');
  assert.equal(downloadedGuide.bytes.toString('utf8'),await readFile(join(root,'courses/union-find.md'),'utf8'));
  const downloadedTrace=await completedDownload('#download-trace','union-find-trace.json'),observation=JSON.parse(downloadedTrace.bytes);
  assert.equal(observation.selectedState,5);assert.equal(observation.trace.compress,true);
  assert.deepEqual(observation.trace.snapshots[5].parent,[0,0,0,0,4,4]);
  assert.equal(observation.trace.snapshots.length,9);assert.equal(observation.comparisonWithoutChosenCompression.compress,false);
  pass('three completed native downloads preserve exact original course, guide and selected complete trace');
  await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
  await evaluate("document.querySelector('#trace-heading').scrollIntoView()");
  const layout=await evaluate('({width:innerWidth,documentWidth:document.documentElement.scrollWidth,unlabeled:[...document.querySelectorAll("input,select,textarea")].filter(node=>!node.labels?.length).map(node=>node.id)})');
  assert.ok(layout.documentWidth<=layout.width);assert.deepEqual(layout.unlabeled,[]);
  report.layout=layout;await saveScreenshot('explorer-390.png');
  pass('390px page contains its layout and every native form control has a label');
  await command('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});
  }else{
    const bytes=await readFile(resolve(existingCourseFile));
    assert.equal(bytes.toString('utf8'),courseText,'reused completed download must match the exact course');
    downloadedCourse={path:resolve(existingCourseFile),bytes};
    report.reusedCompletedCourse={path:downloadedCourse.path,bytes:bytes.length,sha256:digest(bytes)};
    pass('exact prior completed course download reused for the unresolved learner boundary');
  }
  await navigate('demo.html','#deck-file');
  const {root:documentRoot}=await command('DOM.getDocument');
  const {nodeId}=await command('DOM.querySelector',{nodeId:documentRoot.nodeId,selector:'#deck-file'});
  await command('DOM.setFileInputFiles',{nodeId,files:[downloadedCourse.path]});
  await until(()=>evaluate('!!document.querySelector("#start-deck")'),'downloaded course preview');
  assert.equal(await evaluate('document.querySelector("#deck-preview-title").textContent'),course.title);
  await activate('#start-deck');
  const firstAnswers=[];
  for(let index=0;index<course.items.length;index++){
    await until(()=>evaluate('!!document.querySelector(".question-card h2")&&!document.querySelector("#next-button")'),'next imported question');
    const prompt=await evaluate('document.querySelector(".question-card h2").textContent');
    const item=course.items.find(item=>item.prompt===prompt);assert.ok(item,'canonical question must be present');
    assert.ok(!firstAnswers.some(answer=>answer.id===item.id),'question must not repeat');
    const choice=index<2?(item.answer+1)%item.options.length:item.answer;
    await activate('[data-choice="'+choice+'"]');
    await until(()=>evaluate('!!document.querySelector("#next-button")'),'first-answer feedback');
    firstAnswers.push({id:item.id,choice,correct:choice===item.answer});
    await activate('#next-button');
  }
  await until(()=>evaluate('!!document.querySelector("#first-try-summary")'),'completed imported learner review');
  const firstSummary=await evaluate('document.querySelector("#first-try-summary").textContent');
  assert.match(firstSummary,/10 of 12/);
  assert.equal(await evaluate('document.querySelectorAll(".review-item").length'),12);
  const firstEstimates=await evaluate('[...document.querySelectorAll(".mastery-box output")].map(node=>node.textContent)');
  await setText('#application-reflection','A find can shorten its parent path while preserving every connected component.');
  const notesBefore=await completedDownload('#save-notes-button');
  assert.match(notesBefore.bytes.toString('utf8'),/A find can shorten its parent path/);
  await activate('#practice-button');
  for(let index=0;index<2;index++){
    await until(()=>evaluate('!!document.querySelector("[data-practice-choice]")&&!document.querySelector("#practice-next")'),'separate imported-course practice');
    const prompt=await evaluate('document.querySelector(".practice-card h2").textContent'),item=course.items.find(item=>item.prompt===prompt);
    assert.ok(firstAnswers.some(answer=>answer.id===item.id&&!answer.correct));
    await activate('[data-practice-choice="'+item.answer+'"]');await activate('#practice-next');
  }
  await until(()=>evaluate('!!document.querySelector("#first-try-summary")'),'practice results');
  assert.equal(await evaluate('document.querySelector("#first-try-summary").textContent'),firstSummary);
  assert.deepEqual(await evaluate('[...document.querySelectorAll(".mastery-box output")].map(node=>node.textContent)'),firstEstimates);
  assert.match(await evaluate('document.querySelector("#practice-status").textContent'),/2 of 2 correctly/);
  const notesAfter=await completedDownload('#save-notes-button');
  assert.match(notesAfter.bytes.toString('utf8'),/A find can shorten its parent path/);
  report.learner={firstAnswers,firstSummary,firstEstimates,practiceCorrect:2};
  pass('actual downloaded deck completes twelve first answers, review, two separate retries and two reflection-preserving note downloads in unchanged standalone learner');
  assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.externalRequests,[]);
  assert.deepEqual(await pins(),report.sourceSha256);
  pass('all twenty source pins remain exact with no page exceptions or external requests');
  report.status='passed';
  }
}catch(error){
  report.status='failed';report.error=error.stack;process.exitCode=1;
  try{report.failureState=await readState();await saveScreenshot('failure.png');}catch{}
}finally{
  report.behaviorStatus=report.status;
  if(socket){try{await command('Browser.close',{},false);}catch{}socket.close();}
  try{
    if(browser&&browser.exitCode===null){
      for(let attempt=0;attempt<20&&browser.exitCode===null;attempt++)await pause(100);
      if(browser.exitCode===null)browser.kill('SIGTERM');
      for(let attempt=0;attempt<30&&browser.exitCode===null;attempt++)await pause(100);
      if(browser.exitCode===null)throw new Error('Owned browser did not finish after close and SIGTERM; profile retained.');
    }
    await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200});
    report.cleanup={status:'passed',ownedProfileRemoved:true};
  }catch(error){
    report.cleanup={status:'failed',error:error.stack};report.status='failed';process.exitCode=1;
  }
  for(const item of pending.values()){clearTimeout(item.timer);item.reject(new Error('Receiving finished'));}pending.clear();
  report.finished=new Date().toISOString();
  await writeFile(join(output,'receipt.json'),JSON.stringify(report,null,2)+'\n');
  await writeFile(join(output,'browser.log'),stderr);
  console.log(JSON.stringify({status:report.status,behaviorStatus:report.behaviorStatus,cleanup:report.cleanup,checks:report.checks.length,downloads:report.downloads.length,output,error:report.error},null,2));
}
