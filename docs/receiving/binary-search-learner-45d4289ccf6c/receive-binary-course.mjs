#!/usr/bin/env node
// Independent binary-course consumer receiving. No app state injection or source changes.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,mkdtemp,rm,rename,readdir} from 'node:fs/promises';
import {resolve,join,extname} from 'node:path';
import {pathToFileURL} from 'node:url';

const args=process.argv.slice(2);
const opt=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
const base=resolve(opt('--base','/home/jacob/recallweave-binary-learner-45d4289ccf6c'));
const source=resolve(opt('--source',join(base,'source')));
const output=resolve(opt('--output','/dev/shm/recallweave-binary-learner-45d4289ccf6c/evidence/learner-1'));
const tempRoot=resolve(opt('--temporary-root','/dev/shm/recallweave-binary-learner-45d4289ccf6c'));
const executable=opt('--browser','/snap/chromium/3537/usr/lib/chromium-browser/chrome');
const input=resolve(opt('--input',join(base,'input/Binary-search-precise-boundaries.json')));
const sha=b=>createHash('sha256').update(b).digest('hex');
const saveJSON=async(name,obj)=>writeFile(join(output,name),JSON.stringify(obj,null,2)+'\n');
await mkdir(output);
const staging=join(output,'download-staging');
await mkdir(staging);
const report={schema:'recallweave.binary-course.consumer-receiving.v1',status:'running',started:new Date().toISOString(),node:process.version,executable,source,output,input,groups:[],surfaces:[],downloads:[],screenshots:[],cleanup:{},pageErrors:[],requests:[]};
const manifest=JSON.parse(await readFile(join(base,'source-receipt.json'),'utf8'));
report.mergedSource=JSON.parse(await readFile(join(base,'merged-source-custody.json'),'utf8'));
assert.equal(report.mergedSource.main,'d8a9ff81e8e5290e8daad5b4af957d4eddc0ee74');
report.sourceSha256={};
for(const f of manifest.files){
 const bytes=await readFile(join(source,f.path));
 assert.equal(sha(bytes),f.sha256,f.path); assert.equal(bytes.length,f.bytes,f.path);
 report.sourceSha256[f.path]=sha(bytes);
}
const inputBytes=await readFile(input);
assert.equal(inputBytes.length,14169);
assert.equal(sha(inputBytes),'7632d95fb566b7ae4894e113e8326406680745d7c442b9605fa458c4434cbee2');
const deck=JSON.parse(inputBytes);
const published=await readFile(join(base,'input/published-binary-search.json'));
assert.equal(sha(published),'b88e88ba249003421c014cec635ac6bbbf2cdd2f4c2f3cc3fcefbba02b153329');
assert.deepEqual(deck,JSON.parse(published));
report.inputSha256=sha(inputBytes);
report.course={title:deck.title,concepts:deck.concepts,items:deck.items.map(i=>({id:i.id,concept:i.concept,prerequisites:i.prerequisites,answer:i.answer}))};
const bundled=JSON.parse(await readFile(join(source,'data/deck.json'),'utf8'));
const miss=new Set(['bs-contract-duplicates','bs-progress-single']);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function waitFor(fn,label){
 let last; for(let n=0;n<160;n++){try{if(await fn())return;}catch(e){last=e;}await sleep(100);}
 throw new Error('Timed out '+label+(last?' ('+last.message+')':''));
}
let browser,profile,socket,sessionId,server;
let browserLog='',browserExit;
let sequence=0;
const pending=new Map(),downloadEvents=new Map();
function command(method,params={},scoped=true){
 const id=++sequence;
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout '+method));},10000);
  pending.set(id,{resolve,reject,timer});
  socket.send(JSON.stringify({id,method,params,...(scoped&&sessionId?{sessionId}:{})}));
 });
}
async function evaluate(expression){
 const result=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
 if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);
 return result.result.value;
}
const inPage=(fn,...values)=>evaluate('('+fn.toString()+')('+values.map(v=>JSON.stringify(v)).join(',')+')');
async function key(name){
 const code=name==='Tab'?9:13;
 for(const type of ['keyDown','keyUp'])await command('Input.dispatchKeyEvent',{type,key:name,code:name,windowsVirtualKeyCode:code,nativeVirtualKeyCode:code,...(name==='Enter'&&type==='keyDown'?{text:'\r',unmodifiedText:'\r'}:{})});
}
async function activate(selector){
 assert.ok(await inPage(s=>!!document.querySelector(s),selector),'Missing control '+selector);
 await inPage(s=>document.querySelector(s).focus(),selector);
 await key('Enter');
}
async function choose(choice,practice=false){
 const attr=practice?'data-practice-choice':'data-choice';
 const order=await inPage(a=>[...document.querySelectorAll('['+a+']')].map(n=>Number(n.getAttribute(a))),attr);
 assert.equal(await inPage(a=>document.activeElement.getAttribute(a),attr),String(order[0]),'First option keyboard focus');
 const index=order.indexOf(choice); assert.ok(index>=0);
 for(let k=0;k<index;k++)await key('Tab');
 await key('Enter'); return order;
}
async function selectFile(){
 const {root}=await command('DOM.getDocument');
 const {nodeId}=await command('DOM.querySelector',{nodeId:root.nodeId,selector:'#deck-file'});
 assert.ok(nodeId);
 await command('DOM.setFileInputFiles',{nodeId,files:[input]});
 await waitFor(()=>inPage(t=>!document.querySelector('#deck-preview').hidden&&document.querySelector('#deck-preview-title')?.textContent===t,deck.title),'binary preview');
}
async function geometry(selector){
 const result=await inPage(s=>({width:innerWidth,document:document.documentElement.scrollWidth,controls:[...document.querySelectorAll(s)].map(n=>{const r=n.getBoundingClientRect();return {id:n.id,text:n.textContent.trim(),left:r.left,right:r.right,width:r.width,client:n.clientWidth,scroll:n.scrollWidth};})}),selector);
 assert.ok(result.document<=result.width+1,'Document width '+JSON.stringify(result));
 for(const c of result.controls){assert.ok(c.width>0&&c.left>=-1&&c.right<=result.width+1,'Control geometry '+JSON.stringify(c));assert.ok(c.scroll<=c.client+1,'Control text fits '+JSON.stringify(c));}
 return result;
}
async function screenshot(name){
 await inPage(()=>{document.activeElement?.blur();window.scrollTo(0,0);});
 await sleep(80);
 const m=await command('Page.getLayoutMetrics');
 const size=m.cssContentSize||m.contentSize;
 const {data}=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:Math.ceil(size.width),height:Math.ceil(size.height),scale:1}});
 const bytes=Buffer.from(data,'base64'); await writeFile(join(output,name),bytes);
 report.screenshots.push({path:name,bytes:bytes.length,sha256:sha(bytes),width:size.width,height:size.height});
}
async function download(selector,filename){
 const prior=new Set(downloadEvents.keys());
 await activate(selector);
 await waitFor(()=>[...downloadEvents].some(([id,e])=>!prior.has(id)&&e.state==='completed'),'actual download '+filename);
 const [guid,event]=[...downloadEvents].find(([id,e])=>!prior.has(id)&&e.state==='completed');
 const original=join(staging,guid);
 const bytes=await readFile(original);
 await rename(original,join(output,filename));
 report.downloads.push({path:filename,actualBrowserFile:original,guid,suggestedFilename:event.suggestedFilename,bytes:bytes.length,sha256:sha(bytes),receivedBytes:event.receivedBytes});
 return bytes;
}
function checkNotes(text,answers,practiced){
 assert.ok(text.includes(deck.title));
 assert.ok(text.includes(deck.attribution)); assert.ok(text.includes(deck.license));
 assert.ok(text.includes('10 of 12 connections correct on the first try.'));
 assert.ok(text.includes(practiced?'Complete: 2 of 2 practice answers recorded; 2 correct on retry.':'Not started. 2 missed connections are available for practice.'));
 for(const answer of answers){
  const item=deck.items.find(i=>i.id===answer.item);
  for(const exact of [item.prompt,'Your first answer: '+item.options[answer.choice],'Correct answer: '+item.options[item.answer],'Explanation: '+item.explanation,'Apply the idea: '+item.transfer])assert.ok(text.includes(exact),'Notes retain '+item.id+': '+exact);
  if(miss.has(item.id)&&practiced)assert.ok(text.includes('Practice answer: '+item.options[item.answer]));
 }
}
async function reviewSnapshot(answers){
 const actual=await inPage(()=>({summary:document.querySelector('#first-try-summary').textContent,mastery:[...document.querySelectorAll('.mastery-row')].map(n=>n.textContent),items:[...document.querySelectorAll('.review-item')].map(n=>({prompt:n.querySelector('.review-prompt').textContent,answers:[...n.querySelectorAll('dd')].map(x=>x.textContent),explanation:n.querySelector('.review-body>p').textContent,transfer:n.querySelector('.review-transfer').textContent,missed:!!n.querySelector('.needs-review')}))}));
 assert.ok(actual.summary.includes('10 of 12'));
 assert.equal(actual.items.length,12);
 assert.equal(actual.items.filter(i=>i.missed).length,2);
 for(let j=0;j<answers.length;j++){
  const answer=answers[j],item=deck.items.find(i=>i.id===answer.item),row=actual.items[j];
  assert.equal(row.prompt,item.prompt);
  assert.deepEqual(row.answers,[item.options[answer.choice],item.options[item.answer]]);
  assert.equal(row.explanation,item.explanation);
  assert.equal(row.transfer,'Apply the idea: '+item.transfer);
  assert.equal(row.missed,miss.has(item.id));
 }
 return actual;
}
function group(surface,name,details){report.groups.push({surface,name,status:'passed',...details});console.log('PASS '+surface+' / '+name);}
async function surface(name,url,width,height,priorCourse){
 const {browserContextId}=await command('Target.createBrowserContext',{},false);
 await command('Browser.setDownloadBehavior',{behavior:'allowAndName',downloadPath:staging,browserContextId,eventsEnabled:true},false);
 const {targetId}=await command('Target.createTarget',{url:'about:blank',browserContextId},false);
 ({sessionId}=await command('Target.attachToTarget',{targetId,flatten:true},false));
 for(const method of ['Page.enable','Runtime.enable','Network.enable','DOM.enable'])await command(method);
 await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
 await command('Page.navigate',{url});
 await waitFor(()=>inPage(()=>document.readyState==='complete'&&!!document.querySelector('#trace-archive-panel')),'learner loaded '+name);
 const data={name,url,width,height,firstAnswers:[],practiceAnswers:[],questionStates:[],geometry:[]};report.surfaces.push(data);
 if(priorCourse){
  await activate('#start-button');
  await waitFor(()=>inPage(()=>!!document.querySelector('.question-card')),'bundled question');
  const prompt=await inPage(()=>document.querySelector('.question-card h2').textContent);
  const item=bundled.items.find(i=>i.prompt===prompt);assert.ok(item);
  await choose(item.answer);
  await waitFor(()=>inPage(()=>!!document.querySelector('#next-button')),'bundled answer feedback');
  const state=()=>inPage(()=>({session:document.querySelector('#session-content').innerHTML,progress:document.querySelector('.progress-row').innerHTML,saveDisabled:document.querySelector('#save-trace-button').disabled}));
  const before=await state();await selectFile();assert.deepEqual(await state(),before);
  await activate('#cancel-deck');
  assert.deepEqual(await state(),before);
  assert.equal(await inPage(()=>document.querySelector('#deck-preview').hidden),true);
  group(name,'prior bundled lesson survives binary preview and cancel',{bundledItem:item.id,stateSha256:sha(JSON.stringify(before))});
 }
 await selectFile();
 const preview=await inPage(()=>({title:document.querySelector('#deck-preview-title').textContent,count:document.querySelector('.deck-preview-count').textContent,attribution:document.querySelector('.deck-preview-attribution').textContent,license:document.querySelector('.deck-preview-license').textContent,prompts:[...document.querySelectorAll('#deck-preview ol strong')].map(n=>n.textContent),size:document.querySelector('#deck-file').files[0].size}));
 assert.equal(preview.title,deck.title);assert.equal(preview.size,14169);
 assert.ok(preview.count.includes('12 questions · 4 concepts'));
 assert.equal(preview.attribution,'Attribution supplied in the deck: '+deck.attribution);
 assert.equal(preview.license,'License supplied in the deck: '+deck.license);
 assert.deepEqual(preview.prompts,deck.items.map(i=>i.prompt));
 data.preview=preview;data.geometry.push(await geometry('#deck-file,#start-deck,#cancel-deck'));
 await screenshot(name+'-preview.png');
 group(name,'actual authored JSON preview retains all twelve prompts and course metadata',{fileSha256:report.inputSha256});
 await activate('#start-deck');
 await waitFor(()=>inPage(()=>!!document.querySelector('.question-card')),'binary first question');
 assert.equal(await inPage(()=>document.title),deck.title+' — RecallWeave');
 assert.deepEqual(await inPage(()=>[...document.querySelectorAll('#lesson-map .deck-concept')].map(n=>n.textContent)),deck.concepts);
 assert.equal(await inPage(()=>document.querySelector('#step-count').textContent),'0 / 12');
 for(let n=0;n<12;n++){
  const state=await inPage(()=>({prompt:document.querySelector('.question-card h2').textContent,type:document.querySelector('.question-type').textContent,choices:[...document.querySelectorAll('[data-choice]')].map(n=>({choice:Number(n.dataset.choice),text:[...n.childNodes].filter(c=>c.nodeType===Node.TEXT_NODE).map(c=>c.textContent).join(''),label:n.querySelector('.choice-key').textContent}))}));
  const item=deck.items.find(i=>i.prompt===state.prompt);assert.ok(item,'Published prompt');
  assert.ok(!data.firstAnswers.some(a=>a.item===item.id),'Each item asked once');
  assert.ok(state.type.includes(item.concept.toUpperCase()));
  assert.deepEqual(state.choices.map(c=>c.choice).sort((a,b)=>a-b),item.options.map((_,i)=>i));
  for(let i=0;i<state.choices.length;i++){const c=state.choices[i];assert.equal(c.text,item.options[c.choice]);assert.equal(c.label,String.fromCharCode(65+i));}
  data.geometry.push(await geometry('.choice'));
  if(item.id==='bs-interval-equality'){
   await screenshot(name+'-question.png');
   await inPage(()=>document.querySelector('[data-choice]').focus({preventScroll:true}));
  }
  const choice=miss.has(item.id)?(item.answer+1)%item.options.length:item.answer;
  const order=await choose(choice);
  await waitFor(()=>inPage(()=>!!document.querySelector('#next-button')),'first feedback '+item.id);
  const feedback=await inPage(()=>({text:document.querySelector('#feedback-slot .feedback').textContent,lead:document.querySelector('#feedback-slot .feedback>strong').textContent,transfer:document.querySelector('#feedback-slot .why').textContent,correct:Number(document.querySelector('.choice.correct').dataset.choice),wrong:document.querySelector('.choice.incorrect')?.dataset.choice||null,allDisabled:[...document.querySelectorAll('[data-choice]')].every(n=>n.disabled),focus:document.activeElement.id}));
  assert.ok(feedback.text.includes(item.explanation));
  assert.equal(feedback.transfer,'Try this transfer: '+item.transfer);
  assert.equal(feedback.lead,miss.has(item.id)?'Here’s the correction.':'That connection holds.');
  assert.equal(feedback.correct,item.answer);
  assert.equal(feedback.wrong,miss.has(item.id)?String(choice):null);
  assert.equal(feedback.allDisabled,true);assert.equal(feedback.focus,'next-button');
  data.firstAnswers.push({item:item.id,choice});
  data.questionStates.push({item:item.id,concept:item.concept,prerequisites:item.prerequisites,displayOrder:order,chosen:choice,feedback});
  await activate('#next-button');
 }
 await waitFor(()=>inPage(()=>!!document.querySelector('.result-card')),'complete review');
 assert.deepEqual([...new Set(data.questionStates.map(q=>q.concept))].sort(),[...deck.concepts].sort());
 group(name,'all twelve questions retain options, canonical feedback and transfer across four concepts',{answered:12,correctFirst:10,intentionalMisses:[...miss]});
 const firstReview=await reviewSnapshot(data.firstAnswers);
 data.reviewBeforePractice=firstReview;
 const notesFirst=await download('#save-notes-button',name+'-first-notes.txt');
 checkNotes(notesFirst.toString('utf8'),data.firstAnswers,false);
 await inPage(()=>document.querySelector('.review-item:has(.needs-review)').open=true);
 await screenshot(name+'-review.png');
 group(name,'complete review and actual first-session notes retain both mistakes',{reviewItems:12,needsReview:2,notesSha256:sha(notesFirst)});
 await activate('#practice-button');
 for(let n=0;n<2;n++){
  const prompt=await inPage(()=>document.querySelector('.question-card h2').textContent);
  const item=deck.items.find(i=>i.prompt===prompt);assert.ok(item&&miss.has(item.id));
  assert.equal(item.id,data.firstAnswers.filter(a=>miss.has(a.item))[n].item);
  await choose(item.answer,true);
  const feedback=await inPage(()=>document.querySelector('#practice-feedback .feedback').textContent);
  assert.ok(feedback.includes(item.explanation));assert.ok(feedback.includes('Apply the idea: '+item.transfer));
  data.practiceAnswers.push({item:item.id,choice:item.answer});
  await activate('#practice-next');
 }
 await waitFor(()=>inPage(()=>!!document.querySelector('.result-card')),'practice complete review');
 assert.deepEqual(await reviewSnapshot(data.firstAnswers),firstReview);
 assert.equal(await inPage(()=>document.querySelectorAll('.review-practice-answer').length),2);
 assert.equal(await inPage(()=>document.querySelector('#practice-status').textContent),'You answered 2 of 2 correctly on retry.');
 const notesPractice=await download('#save-notes-button',name+'-practice-notes.txt');
 checkNotes(notesPractice.toString('utf8'),data.firstAnswers,true);
 await activate('#trace-archive-panel > summary');
 assert.equal(await inPage(()=>document.querySelector('#save-trace-button').disabled),false);
 const traceBytes=await download('#save-trace-button',name+'-completed-trace.json');
 const trace=JSON.parse(traceBytes);
 assert.equal(trace.format,'recallweave.learning-trace');assert.equal(trace.version,1);
 assert.deepEqual(trace.deck,deck);assert.deepEqual(trace.firstAnswers,data.firstAnswers);assert.deepEqual(trace.practice.answers,data.practiceAnswers);
 assert.deepEqual(Object.keys(trace.mastery).sort(),[...deck.concepts].sort());
 for(let i=0;i<deck.concepts.length;i++){const c=deck.concepts[i];assert.ok(firstReview.mastery[i].includes(Math.round(trace.mastery[c]*100)+'%'));assert.ok(Number.isFinite(trace.mastery[c]));}
 data.traceMastery=trace.mastery;
 group(name,'correct retries retain first answers and export exact course plus separate practice',{practiceAnswers:2,correctRetries:2,firstAnswersUnchanged:true,masteryDisplayUnchanged:true,notesSha256:sha(notesPractice),traceSha256:sha(traceBytes)});
 await command('Target.closeTarget',{targetId},false);
 await command('Target.disposeBrowserContext',{browserContextId},false);
 sessionId=undefined;
}
try{
 profile=await mkdtemp(join(tempRoot,'browser-profile-'));
 server=createServer(async(req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=resolve(source,'.'+(path==='/'?'/index.html':path));if(!file.startsWith(source+'/')){res.writeHead(403).end();return;}const body=await readFile(file);const mime={'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.json':'application/json'}[extname(file)]||'application/octet-stream';res.writeHead(200,{'Content-Type':mime+'; charset=utf-8'});res.end(body);}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 report.httpOrigin='http://127.0.0.1:'+server.address().port;
 browser=spawn(executable,['--headless=new','--no-sandbox','--disable-gpu','--disable-background-networking','--disable-component-update','--disable-sync','--disable-extensions','--disable-breakpad','--no-first-run','--no-default-browser-check','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','pipe','pipe'],env:{...process.env,TMPDIR:profile}});
 browser.stderr.on('data',d=>{browserLog=(browserLog+d).slice(-20000);});
 browser.stdout.on('data',d=>{browserLog=(browserLog+d).slice(-20000);});
 browser.on('error',e=>{browserLog+=e.stack;});
 browser.on('exit',(code,signal)=>{browserExit={code,signal};});
 let endpoint;
 await waitFor(async()=>{if(browserExit)throw new Error('Browser exited '+JSON.stringify(browserExit));const lines=(await readFile(join(profile,'DevToolsActivePort'),'utf8')).trim().split('\n');endpoint='ws://127.0.0.1:'+lines[0]+lines[1];return true;},'native DevTools endpoint');
 socket=new WebSocket(endpoint);
 await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
 socket.addEventListener('message',event=>{
  const m=JSON.parse(String(event.data));
  if(m.id){const p=pending.get(m.id);if(p){clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);}return;}
  if(m.method==='Runtime.exceptionThrown')report.pageErrors.push(m.params.exceptionDetails);
  if(m.method==='Network.requestWillBeSent')report.requests.push({sessionId:m.sessionId,url:m.params.request.url});
  if(m.method==='Browser.downloadWillBegin')downloadEvents.set(m.params.guid,{...m.params});
  if(m.method==='Browser.downloadProgress')downloadEvents.set(m.params.guid,{...downloadEvents.get(m.params.guid),...m.params});
 });
 report.browser=await command('Browser.getVersion',{},false);
 await surface('desktop-modular',report.httpOrigin+'/',1280,900,true);
 await surface('standalone-390',pathToFileURL(join(source,'demo.html')).href,390,844,false);
 assert.equal(report.groups.length,9);assert.equal(report.downloads.length,6);
 assert.deepEqual(report.pageErrors,[]);
 assert.ok(report.requests.every(r=>!/^https?:/.test(r.url)||new URL(r.url).hostname==='127.0.0.1'),'No outbound course request');
 report.status='passed';
}catch(error){report.status='failed';report.failure={message:error.message,stack:error.stack};console.error(error.stack);}
finally{
 try{socket?.close();}catch{}
 if(browser&&!browserExit){browser.kill('SIGTERM');await sleep(700);if(!browserExit){browser.kill('SIGKILL');await sleep(300);}}
 report.cleanup.browserExit=browserExit;
 if(server){await new Promise(r=>server.close(r));report.cleanup.serverClosed=!server.listening;}
 if(profile){await rm(profile,{recursive:true,force:true});report.cleanup.ownProfileRemoved=true;}
 await writeFile(join(output,'browser.log'),browserLog);
 report.cleanup.stagingFiles=await readdir(staging);
 report.cleanup.allSourceUnchanged=true;
 for(const f of manifest.files){if(sha(await readFile(join(source,f.path)))!==f.sha256)report.cleanup.allSourceUnchanged=false;}
 report.cleanup.inputUnchanged=sha(await readFile(input))===report.inputSha256;
 if(!report.cleanup.allSourceUnchanged||!report.cleanup.inputUnchanged||report.cleanup.stagingFiles.length){report.status='failed';report.cleanup.failure='Custody or staging check failed';}
 report.finished=new Date().toISOString();
 report.receiverSha256=sha(await readFile(new URL(import.meta.url)));
 await saveJSON('receipt.json',report);
 console.log(JSON.stringify({status:report.status,groups:report.groups.length,downloads:report.downloads.length,output,receiptSha256:sha(await readFile(join(output,'receipt.json'))),cleanup:report.cleanup}));
 process.exitCode=report.status==='passed'?0:1;
}
