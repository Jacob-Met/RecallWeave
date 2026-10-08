#!/usr/bin/env node
/** Native author receiving. Uses an owned Chrome profile and direct local files only. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { once } from 'node:events';
import { buildCode, serializeExample } from '../src/prefix-coding.mjs';
import { initialMastery, updateMastery } from '../src/knowledge.mjs';
const arg=(name,fallback)=>process.argv.includes(name)?process.argv[process.argv.indexOf(name)+1]:fallback;
const root=resolve(arg('--root',fileURLToPath(new URL('../',import.meta.url))));
const executable=arg('--browser','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
const output=resolve(arg('--output',join(root,'prefix-browser-evidence')));
await mkdir(output,{recursive:false});
const downloads=join(output,'downloads');await mkdir(downloads);
const profile=await mkdtemp(join(output,'profile-'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const sourcePaths=['src/prefix-coding.mjs','src/prefix-coding-ui.mjs','templates/prefix-coding-explorer.html','tools/build-prefix-coding.mjs','courses/prefix-coding-explorer.html','courses/prefix-coding.json','courses/prefix-coding.md','src/deck.mjs','src/app.mjs','src/knowledge.mjs','src/review.mjs','src/session-export.mjs','demo.html','tools/check_prefix_coding_browser.mjs'];
async function sourceState(){
  const result={};
  for(const path of sourcePaths){const b=await readFile(join(root,path));result[path]={bytes:b.length,sha256:hash(b)};}
  return result;
}
const report={state:'running',started:new Date().toISOString(),sourceBefore:await sourceState(),checks:[],downloads:[],screenshots:[],pageErrors:[],pageRequests:[],lessonAnswers:[]};
const deckBytes=await readFile(join(root,'courses/prefix-coding.json'));
const deck=JSON.parse(deckBytes);
const initialRows=[{symbol:'A',count:8},{symbol:'B',count:3},{symbol:'C',count:2},{symbol:'D',count:1}];
const pending=new Map(),received=new Map();
let socket,browser,sessionId,seq=0,log='';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(check,label){
  let last;
  for(let i=0;i<180;i++){try{if(await check())return;}catch(e){last=e;}await pause(100);}
  throw new Error('Timed out: '+label+(last?' ('+last.message+')':''));
}
function command(method,params={},scoped=true){
  const id=++seq;
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout '+method));},15000);
    pending.set(id,{resolve,reject,timer});
    socket.send(JSON.stringify({id,method,params,...(scoped&&sessionId?{sessionId}:{})}));
  });
}
async function evaluate(expression){
  const r=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);
  return r.result.value;
}
async function key(name){
  const code=name==='Enter'?13:name==='Tab'?9:0;
  for(const type of ['keyDown','keyUp'])await command('Input.dispatchKeyEvent',{type,key:name,code:name,windowsVirtualKeyCode:code,nativeVirtualKeyCode:code,...(name==='Enter'&&type==='keyDown'?{text:'\r',unmodifiedText:'\r'}:{})});
}
async function activate(selector){
  assert.equal(await evaluate('!!document.querySelector('+JSON.stringify(selector)+')'),true,'control exists '+selector);
  assert.equal(await evaluate('!!document.querySelector('+JSON.stringify(selector)+').disabled'),false,'control enabled '+selector);
  await evaluate('document.querySelector('+JSON.stringify(selector)+').focus()');await key('Enter');
}
async function type(selector,text){
  await evaluate('document.querySelector('+JSON.stringify(selector)+').focus();document.querySelector('+JSON.stringify(selector)+').select()');
  await command('Input.insertText',{text});
}
function passed(name){report.checks.push(name);}
async function capture(name,selector){
  if(selector)await evaluate('document.querySelector('+JSON.stringify(selector)+').scrollIntoView({block:"start"})');
  const r=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  const b=Buffer.from(r.data,'base64');await writeFile(join(output,name),b);
  report.screenshots.push({path:name,bytes:b.length,sha256:hash(b)});
}
async function download(selector,expectedName){
  const before=new Set(received.keys());
  await activate(selector);
  let entry;
  await wait(()=>{entry=[...received.values()].find(x=>!before.has(x.guid)&&x.state==='completed');return !!entry;},'completed download '+expectedName);
  if(expectedName instanceof RegExp)assert.match(entry.suggestedFilename,expectedName);
  else assert.equal(entry.suggestedFilename,expectedName);
  const b=await readFile(join(downloads,entry.guid));
  report.downloads.push({...entry,bytes:b.length,sha256:hash(b)});
  return {bytes:b,path:join(downloads,entry.guid),entry};
}
async function navigate(path,width=1280,height=980){
  await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
  const url=pathToFileURL(join(root,path)).href;
  await command('Page.navigate',{url});
  await wait(()=>evaluate('document.URL==='+JSON.stringify(url)+' && document.readyState==="complete"'),'direct file '+path);
}
async function layout(){
  const d=await evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth,body:document.body.scrollWidth})');
  assert.ok(d.scroll<=d.width,'document fits '+JSON.stringify(d));return d;
}
try {
  browser=spawn(executable,['--headless=new','--disable-gpu','--no-sandbox','--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run','--no-default-browser-check','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe']});
  browser.stderr.on('data',b=>{log+=b.toString();});
  let port,endpoint,launchError;
  browser.on('error',e=>{launchError=e;});
  await wait(async()=>{
    if(launchError)throw launchError;
    if(browser.exitCode!==null)throw new Error('Chrome exited '+browser.exitCode);
    [port,endpoint]=(await readFile(join(profile,'DevToolsActivePort'),'utf8')).trim().split('\n');
    return !!port&&!!endpoint;
  },'owned browser launch');
  socket=new WebSocket('ws://127.0.0.1:'+port+endpoint);
  socket.addEventListener('message',event=>{
    const m=JSON.parse(event.data);
    if(m.id){const p=pending.get(m.id);if(!p)return;clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);}
    else if(m.method==='Runtime.exceptionThrown')report.pageErrors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);
    else if(m.method==='Network.requestWillBeSent')report.pageRequests.push(m.params.request.url);
    else if(m.method==='Browser.downloadWillBegin')received.set(m.params.guid,{...m.params,state:'started'});
    else if(m.method==='Browser.downloadProgress'){const x=received.get(m.params.guid);if(x)Object.assign(x,m.params);}
  });
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  report.browser=await command('Browser.getVersion',{},false);
  await command('Browser.setDownloadBehavior',{behavior:'allowAndName',downloadPath:downloads,eventsEnabled:true},false);
  const {targetId}=await command('Target.createTarget',{url:'about:blank'},false);
  ({sessionId}=await command('Target.attachToTarget',{targetId,flatten:true},false));
  for(const method of ['Page.enable','Runtime.enable','Network.enable','DOM.enable'])await command(method);
  await navigate('courses/prefix-coding-explorer.html');
  await wait(()=>evaluate('document.querySelector("#payload-bits").textContent==="23"'),'initial model');
  assert.equal(await evaluate('document.querySelector("#fixed-payload-bits").textContent'),'28');
  report.desktop=await layout();await capture('explorer-desktop.png');
  for(let i=1;i<=3;i++){
    await activate('#step-next');
    assert.match(await evaluate('document.querySelector("#step-status").textContent'),new RegExp('Merge '+i+' of 3'));
  }
  assert.equal(await evaluate('document.querySelector("#queue").children.length'),1);
  await capture('finished-tree-desktop.png','#merge-heading');
  passed('direct-file default model and three actual keyboard merges');
  await activate('#sample-bits');
  assert.deepEqual(JSON.parse(await evaluate('document.querySelector("#decoder-result").textContent')),['A','B','C','D']);
  const bits=await evaluate('document.querySelector("#bits").value');
  const worked=await download('#download-example','prefix-coding-example.json');
  assert.equal(worked.bytes.toString('utf8'),serializeExample(initialRows,3,bits));
  passed('actual worked-example download matches complete current exact model and decoded stream');
  await type('#bits','0');
  assert.equal(await evaluate('document.querySelector("#download-example").disabled'),true);
  await activate('#decode-button');
  assert.match(await evaluate('document.querySelector("#decode-error").textContent'),/inside a codeword/);
  assert.equal(await evaluate('document.querySelector("#decoder-result").textContent'),'');
  await activate('#sample-bits');
  assert.equal(await evaluate('document.querySelector("#download-example").disabled'),false);
  passed('incomplete bit stream retires saved result and explicit repair restores it');
  await type('#symbol-0','<b>Ω</b>');
  await type('#symbol-1','__proto__');
  await type('#symbol-2','\ta\n');
  assert.equal(await evaluate('document.querySelector("#symbol-2").value'),'\ta\n');
  assert.equal(await evaluate('document.querySelector("#codebook b")!==null'),false);
  await activate('#sample-bits');
  const literalRows=[{symbol:'<b>Ω</b>',count:8},{symbol:'__proto__',count:3},{symbol:'\ta\n',count:2},{symbol:'D',count:1}];
  const literalBits=await evaluate('document.querySelector("#bits").value');
  const literal=await download('#download-example','prefix-coding-example.json');
  assert.equal(literal.bytes.toString('utf8'),serializeExample(literalRows,0,literalBits));
  passed('native text fields and exact saved JSON preserve markup, reserved names, tabs and line breaks');
  await type('#count-0','0');
  assert.equal(await evaluate('document.querySelector("#download-example").disabled'),true);
  assert.equal(await evaluate('document.querySelector("#codebook").children.length'),0);
  const lesson=await download('#download-course','prefix-coding.json');
  assert.deepEqual(lesson.bytes,deckBytes);
  passed('invalid example retires derived fields while exact original lesson remains downloadable');
  await type('#count-0','8');
  await command('Emulation.setDeviceMetricsOverride',{width:375,height:900,deviceScaleFactor:1,mobile:false});
  await evaluate('scrollTo(0,0)');report.narrow=await layout();await capture('explorer-phone.png');
  await activate('#step-all');await capture('finished-tree-phone.png','#merge-heading');
  await capture('codebook-phone.png','#codebook-heading');
  passed('375px document fits while code forest scrolls within its own container');
  await navigate('demo.html',1280,980);
  await wait(()=>evaluate('!!document.querySelector("#deck-file")'),'direct-file maintained learner');
  const {root:domRoot}=await command('DOM.getDocument',{});
  const {nodeId}=await command('DOM.querySelector',{nodeId:domRoot.nodeId,selector:'#deck-file'});
  await command('DOM.setFileInputFiles',{nodeId,files:[lesson.path]});
  await wait(()=>evaluate('!!document.querySelector("#start-deck")'),'actual downloaded course preview');
  assert.equal(await evaluate('document.querySelector("#deck-preview-title").textContent'),deck.title);
  await activate('#start-deck');
  const mastery=initialMastery(deck.concepts);
  for(let index=0;index<deck.items.length;index++){
    await wait(()=>evaluate('!!document.querySelector(".question-card h2")'),'course question '+index);
    const prompt=await evaluate('document.querySelector(".question-card h2").textContent');
    const item=deck.items.find(x=>x.prompt===prompt);assert.ok(item);
    const correct=index%4!==0,choice=correct?item.answer:(item.answer+1)%item.options.length;
    await activate('[data-choice="'+choice+'"]');
    const feedback=await evaluate('document.querySelector("#feedback-slot").textContent');
    assert.ok(feedback.includes(item.explanation));assert.ok(feedback.includes(item.transfer));
    mastery[item.concept]=updateMastery(mastery[item.concept],correct);
    report.lessonAnswers.push({id:item.id,choice,correct});
    await activate('#next-button');
  }
  assert.equal(await evaluate('document.querySelectorAll(".review-item").length'),12);
  const first=await evaluate('document.querySelector("#first-try-summary").textContent');
  assert.match(first,/9 of 12/);
  const estimates=await evaluate('[...document.querySelectorAll(".mastery-box output")].map(x=>x.textContent)');
  assert.deepEqual(estimates,deck.concepts.map(c=>Math.round(mastery[c]*100)+'%'));
  await capture('course-learning-trace-desktop.png','.result-card');
  const notes=await download('#save-notes-button',/^recallweave-study-notes-\d{4}-\d{2}-\d{2}\.txt$/);
  for(const item of deck.items){assert.ok(notes.bytes.toString().includes(item.prompt));assert.ok(notes.bytes.toString().includes(item.explanation));assert.ok(notes.bytes.toString().includes(item.transfer));}
  assert.ok(notes.bytes.toString().includes(deck.attribution));
  await activate('#practice-button');
  for(let index=0;index<3;index++){
    const prompt=await evaluate('document.querySelector(".practice-card h2").textContent'),item=deck.items.find(x=>x.prompt===prompt);
    assert.ok(item);await activate('[data-practice-choice="'+item.answer+'"]');await activate('#practice-next');
  }
  assert.equal(await evaluate('document.querySelector("#first-try-summary").textContent'),first);
  assert.deepEqual(await evaluate('[...document.querySelectorAll(".mastery-box output")].map(x=>x.textContent)'),estimates);
  const after=await download('#save-notes-button',/^recallweave-study-notes-\d{4}-\d{2}-\d{2}\.txt$/);
  assert.notDeepEqual(after.bytes,notes.bytes);
  await command('Emulation.setDeviceMetricsOverride',{width:375,height:900,deviceScaleFactor:1,mobile:false});
  await evaluate('document.querySelector(".result-card").scrollIntoView({block:"start"})');
  report.learnerNarrow=await layout();await capture('course-learning-trace-phone.png');
  passed('actual downloaded lesson imports in direct-file learner, completes twelve questions, three practice retries and two full notes downloads');
  assert.deepEqual(report.pageErrors,[]);
  assert.deepEqual(report.pageRequests.filter(url=>/^https?:/.test(url)),[]);
  report.sourceAfter=await sourceState();assert.deepEqual(report.sourceAfter,report.sourceBefore);
  passed('no page external requests or JavaScript errors; all fourteen source files unchanged');
  report.state='passed';
}catch(error){report.state='failed';report.failure=error.stack;process.exitCode=1;}
finally{
  for(const item of pending.values())clearTimeout(item.timer);pending.clear();
  if(socket)socket.close();
  if(browser&&browser.exitCode===null){browser.kill('SIGTERM');await Promise.race([once(browser,'exit').catch(()=>{}),pause(3000)]);if(browser.exitCode===null)browser.kill('SIGKILL');}
  await writeFile(join(output,'browser.stderr.log'),log);
  await rm(profile,{recursive:true,force:true});
  report.finished=new Date().toISOString();
  await writeFile(join(output,'receipt.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({state:report.state,checks:report.checks.length,downloads:report.downloads.length,screenshots:report.screenshots.length,failure:report.failure}));
}
