import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,rm,stat} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';

const config=JSON.parse(await readFile(resolve(process.argv[2]),'utf8'));
const output=resolve(config.output), profile=join(output,'chrome-profile'), downloads=join(output,'downloads');
await mkdir(output);
await mkdir(downloads);
const hash=b=>createHash('sha256').update(b).digest('hex');
const oracleBytes=await readFile(fileURLToPath(import.meta.url));
const sources=[];
for(const file of config.sources){const bytes=await readFile(file.path);assert.equal(hash(bytes),file.sha256,file.path);sources.push({...file,bytes:bytes.length});}
const deckBytes=await readFile(config.deck), deck=JSON.parse(deckBytes);
const answersReviewed=JSON.parse(await readFile(config.answersReviewed,'utf8'));
assert.equal(deck.items.length,12);
for(const item of deck.items){assert.equal(answersReviewed.answers[item.id].answer,item.answer,'independently reviewed answer '+item.id);assert.equal(answersReviewed.answers[item.id].option,item.options[item.answer]);}
const {initialMastery,updateMastery}=await import(pathToFileURL(join(config.baseline,'src/knowledge.mjs')));
const {parseDeck,serializeDeck}=await import(pathToFileURL(join(config.baseline,'src/deck.mjs')));
assert.equal(serializeDeck(parseDeck(deckBytes.toString())),deckBytes.toString(),'canonical course bytes');
const acts=[
 {id:'A',start:0,end:3,value:4},{id:'B',start:1,end:4,value:5},
 {id:'C',start:3,end:5,value:4},{id:'D',start:0,end:6,value:10},
 {id:'E',start:5,end:7,value:4},{id:'F',start:6,end:8,value:5}
];
const baseRow={j:0,id:null,p:0,take:0,skip:0,best:0,choice:'base'};
function expectedSolution(edited=false){
 const input=acts.map(a=>({...a,value:a.id==='D'&&edited?0:a.value}));
 const take=edited?[4,5,8,0,12,13]:[4,5,8,10,12,15];
 const skip=edited?[0,4,5,8,8,12]:[0,4,5,8,10,12];
 const best=edited?[4,5,8,8,12,13]:[4,5,8,10,12,15];
 const p=[0,0,1,0,3,4];
 const rows=[{...baseRow},...input.map((a,i)=>({j:i+1,id:a.id,p:p[i],take:take[i],skip:skip[i],best:best[i],choice:edited&&i===3?'skip':'take'}))];
 const backtrack=edited?[{j:6,id:'F',choice:'take',next:4},{j:4,id:'D',choice:'skip',next:3},{j:3,id:'C',choice:'take',next:1},{j:1,id:'A',choice:'take',next:0}]:[{j:6,id:'F',choice:'take',next:4},{j:4,id:'D',choice:'take',next:0}];
 return {ordered:input,rows,bestValue:best.at(-1),selectedIds:edited?['A','C','F']:['D','F'],backtrack,greedy:{selectedIds:['A','C','E'],value:12}};
}
function prefix(solution,row){
 const backtrack=[],selected=[];
 for(let j=row;j>0;){const r=solution.rows[j],next=r.choice==='take'?r.p:j-1;backtrack.push({j,id:r.id,choice:r.choice,next});if(r.choice==='take')selected.unshift(r.id);j=next;}
 const greedy={selectedIds:[],value:0};let end=-1;
 for(const a of solution.ordered.slice(0,row))if(a.start>=end){greedy.selectedIds.push(a.id);greedy.value+=a.value;end=a.end;}
 return {bestValue:solution.rows[row].best,selectedIds:selected,backtrack,greedy};
}
function traceExpected(row,revealed,edited=false){
 const solution=expectedSolution(edited);
 return {format:'recallweave-weighted-interval-trace/1',conventions:{interval:'[start,end)',resourceCount:1,timeUnit:'abstract',sort:['end','start','id-code-units'],tie:'skip-current'},activities:solution.ordered,solution,view:{row,backtrackRevealed:revealed,prefix:prefix(solution,row)}};
}
const report={format:'recallweave-weighted-interval-independent-browser/1',status:'running',node:process.version,oracleSha256:hash(oracleBytes),sources,checks:[],downloads:[],screenshots:[],pageErrors:[],pageRequests:[]};
const pass=name=>{report.checks.push(name);console.log('PASS '+name);};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function waitFor(fn,label){const stop=Date.now()+12000;let last;while(Date.now()<stop){try{const value=await fn();if(value)return value;}catch(error){last=error;}await sleep(60);}throw Error('Timeout: '+label+(last?'; '+last.message:''));}
let browser,socket,sessionId,seq=0,browserLog='',launchError;
const pending=new Map(),downloadEvents=[];
function command(method,params={},browserLevel=false){return new Promise((resolve,reject)=>{const id=++seq,timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout '+method));},10000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params,...(!browserLevel&&sessionId?{sessionId}:{})}));});}
async function evaluate(expression){const r=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;}
async function key(key,code=key){const virtualKey=key==='Enter'?13:key==='Tab'?9:0;for(const type of ['keyDown','keyUp'])await command('Input.dispatchKeyEvent',{type,key,code,windowsVirtualKeyCode:virtualKey,nativeVirtualKeyCode:virtualKey,...(key==='Enter'&&type==='keyDown'?{text:'\r',unmodifiedText:'\r'}:{})});}
async function activate(selector){assert.ok(await evaluate('(()=>{const e=document.querySelector('+JSON.stringify(selector)+');if(!e||e.disabled||!e.checkVisibility())return false;e.scrollIntoView({block:"center"});e.focus();return document.activeElement===e;})()'),'activatable '+selector);await key('Enter');}
async function text(selector){return await evaluate('document.querySelector('+JSON.stringify(selector)+')?.textContent.trim()');}
async function input(selector,value){assert.ok(await evaluate('(()=>{const e=document.querySelector('+JSON.stringify(selector)+');if(!e)return false;e.focus();return document.activeElement===e;})()'),'input focus '+selector);await command('Input.dispatchKeyEvent',{type:'keyDown',key:'a',code:'KeyA',modifiers:4,commands:['selectAll']});await command('Input.dispatchKeyEvent',{type:'keyUp',key:'a',code:'KeyA',modifiers:4});await command('Input.insertText',{text:String(value)});assert.equal(await evaluate('document.querySelector('+JSON.stringify(selector)+').value'),String(value));}
async function navigate(path,width=1280,height=900){await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});const url=pathToFileURL(path).href;await command('Page.navigate',{url});await waitFor(()=>evaluate('document.readyState==="complete" && location.href==='+JSON.stringify(url)),'navigation');}
async function capture(name){const image=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});const b=Buffer.from(image.data,'base64');await writeFile(join(output,name),b,{flag:'wx'});report.screenshots.push({name,bytes:b.length,sha256:hash(b)});}
async function download(selector,name){const count=downloadEvents.length;await activate(selector);const event=await waitFor(()=>downloadEvents[count],'download start '+selector);await waitFor(()=>event.state==='completed','download completion');const b=await readFile(join(downloads,event.guid));await writeFile(join(output,name),b,{flag:'wx'});report.downloads.push({name,suggestedFilename:event.suggestedFilename,url:event.url,bytes:b.length,sha256:hash(b)});return b;}
async function checkTrace(name,row,revealed,edited=false){const bytes=await download('#download-trace',name);assert.equal(report.downloads.at(-1).suggestedFilename,'weighted-interval-trace.json');assert.deepEqual(JSON.parse(bytes),traceExpected(row,revealed,edited));return bytes;}
async function display(best,selected,greedy){
 assert.match(await text('#best-value'),new RegExp('\\b'+best+'\\b'));
 assert.match(await text('#greedy-value'),new RegExp('\\b'+greedy+'\\b'));
 const ids=(await text('#selected-activities')).match(/\b[A-Z][A-Z0-9_-]{0,7}\b/g)||[];
 assert.deepEqual(ids.filter(id=>acts.some(a=>a.id===id)),selected);
}
async function fileInput(selector,path){const {root}=await command('DOM.getDocument');const {nodeId}=await command('DOM.querySelector',{nodeId:root.nodeId,selector});assert.ok(nodeId);await command('DOM.setFileInputFiles',{nodeId,files:[path]});}
async function masteryShown(){return evaluate('[...document.querySelectorAll(".mastery-row")].map(e=>({concept:e.querySelector("span").textContent,value:e.querySelector("output").textContent}))');}

try{
 browser=spawn(config.chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run','--no-default-browser-check','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe']});
 browser.stderr.on('data',b=>{browserLog=(browserLog+b.toString()).slice(-6000);});browser.on('error',e=>{launchError=e;});
 const endpoint=await waitFor(async()=>{if(launchError)throw launchError;if(browser.exitCode!==null)throw Error('Chrome exited '+browser.exitCode);const parts=(await readFile(join(profile,'DevToolsActivePort'),'utf8')).trim().split('\n');return parts.length===2?'ws://127.0.0.1:'+parts[0]+parts[1]:false;},'browser launch');
 socket=new WebSocket(endpoint);
 socket.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);if(!p)return;pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')report.pageErrors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);else if(m.method==='Network.requestWillBeSent')report.pageRequests.push(m.params.request.url);else if(m.method==='Browser.downloadWillBegin')downloadEvents.push({...m.params});else if(m.method==='Browser.downloadProgress'){const d=downloadEvents.find(d=>d.guid===m.params.guid);if(d)Object.assign(d,m.params);}});
 await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
 report.browser=await command('Browser.getVersion',{},true);
 await command('Browser.setDownloadBehavior',{behavior:'allowAndName',downloadPath:downloads,eventsEnabled:true},true);
 const {targetId}=await command('Target.createTarget',{url:'about:blank'},true);({sessionId}=await command('Target.attachToTarget',{targetId,flatten:true},true));
 await command('Page.enable');await command('Runtime.enable');await command('Network.enable');await command('DOM.enable');await command('Network.setBlockedURLs',{urls:['http://*','https://*']});
 await navigate(config.explorer);
 await waitFor(()=>evaluate('!!document.querySelector("#solve")'),'explorer controls');
 assert.match(await text('#solve'),/Solve activities/);
 await activate('#solve');
 await display(0,[],0);
 await checkTrace('prefix-zero.json',0,0);
 for(let row=1;row<=6;row++){await activate('#next-row');assert.equal(Number((await text('#row-position')).match(/\d+/)[0]),row);await display(expectedSolution().rows[row].best,prefix(expectedSolution(),row).selectedIds,prefix(expectedSolution(),row).greedy.value);}
 await capture('explorer-default.png');
 await activate('#trace-choices');
 await checkTrace('default-first-choice.json',6,1);
 assert.match(await text('#backtrack-steps'),/\bF\b/);
 await activate('#next-choice');
 const trace1=await checkTrace('default-trace.json',6,2);
 assert.match(await text('#backtrack-steps'),/\bD\b/);
 const trace2=await checkTrace('default-trace-repeat.json',6,2);
 assert.deepEqual(trace1,trace2,'identical state gives identical downloaded bytes');
 await activate('#previous-row');
 await display(12,['A','C','E'],12);
 await checkTrace('prefix-five.json',5,0);
 pass('default prefix traversal, chosen-schedule backtracking, row-change reset and exact deterministic downloads');
 await input('input[data-id="D"][data-field="value"]',0);
 assert.equal(await evaluate('document.querySelector("#download-trace").disabled'),true);
 assert.equal(await evaluate('document.querySelector("#best-value").checkVisibility()'),false);
 await activate('#solve');await activate('#show-result');await display(13,['A','C','F'],12);
 await checkTrace('edited-d-zero.json',6,0,true);
 await input('input[data-id="D"][data-field="end"]',0);
 await activate('#solve');
 assert.equal(await evaluate('document.querySelector("#input-error").checkVisibility()'),true);
 assert.ok((await text('#input-error')).length>0);
 assert.equal(await evaluate('document.querySelector("#download-trace").disabled'),true);
 assert.equal(await evaluate('document.querySelector("#best-value").checkVisibility()'),false);
 assert.equal(await evaluate('document.querySelector(\'input[data-id="D"][data-field="end"]\').value'),'0');
 await input('input[data-id="D"][data-field="end"]',6);await activate('#solve');await activate('#show-result');await display(13,['A','C','F'],12);
 pass('trusted edits invalidate stale results; explicit solve changes optimum; malformed duration preserves draft and recovery');
 await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
 assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false);
 await capture('explorer-mobile.png');
 const course=await download('#download-course','downloaded-course.json');
 assert.equal(report.downloads.at(-1).suggestedFilename,'weighted-interval-scheduling.json');
 assert.deepEqual(course,deckBytes);
 pass('390px explorer layout and exact canonical course download');
 await navigate(join(config.baseline,'demo.html'));
 await waitFor(()=>evaluate('!!document.querySelector("#deck-file")'),'learner file input');
 const welcome=await text('#session-content');
 await fileInput('#deck-file',join(output,'downloaded-course.json'));
 await waitFor(()=>evaluate('!!document.querySelector("#start-deck")'),'course preview');
 assert.equal(await text('#deck-preview-title'),deck.title);
 assert.match(await text('.deck-preview-count'),/12 questions/);
 assert.equal(await text('#session-content'),welcome,'preview preserves current learner state');
 await activate('#start-deck');
 const seen=new Set(),firstAnswers=[],mastery=initialMastery(deck.concepts);
 for(let index=0;index<12;index++){
   const prompt=await text('.question-card h2'),item=deck.items.find(item=>item.prompt===prompt);
   assert.ok(item,'actual course prompt');assert.ok(!seen.has(item.id),'one first answer per question');seen.add(item.id);
   const reviewed=answersReviewed.answers[item.id].answer,choice=index===0?(reviewed+1)%item.options.length:reviewed,correct=choice===reviewed;
   await activate('[data-choice="'+choice+'"]');
   const feedback=await text('#feedback-slot');assert.ok(feedback.includes(item.explanation));assert.ok(feedback.includes(item.transfer));
   mastery[item.concept]=updateMastery(mastery[item.concept],correct);
   firstAnswers.push({item:item.id,choice,correct});
   assert.deepEqual(await masteryShown(),deck.concepts.map(concept=>({concept,value:Math.round(mastery[concept]*100)+'%'})));
   assert.equal(await evaluate('document.activeElement.id'),'next-button');
   await key('Enter');
 }
 assert.equal(seen.size,12);
 assert.match(await text('#first-try-summary'),/11 of 12/);
 assert.equal(await evaluate('document.querySelectorAll(".review-item").length'),12);
 const summary=await text('#first-try-summary'),beforeMastery=await masteryShown();
 const missed=deck.items.find(item=>item.id===firstAnswers[0].item);
 await activate('#practice-button');
 assert.equal(await text('.practice-card h2'),missed.prompt);
 await activate('[data-practice-choice="'+answersReviewed.answers[missed.id].answer+'"]');
 await key('Enter');
 assert.equal(await text('#first-try-summary'),summary);
 assert.deepEqual(await masteryShown(),beforeMastery);
 assert.match(await text('#practice-status'),/1 of 1 correctly on retry/);
 await input('#application-reflection','Touching endpoints can share one resource; check the compatible predecessor before taking a job.');
 const notes=await download('#save-notes-button','study-notes.txt');
 const noteText=notes.toString();assert.ok(noteText.includes(deck.title));assert.ok(noteText.includes(deck.attribution));assert.ok(noteText.includes(deck.license));assert.ok(noteText.includes('11 of 12 connections correct on the first try.'));assert.ok(noteText.includes('Touching endpoints can share one resource; check the compatible predecessor before taking a job.'));
 for(const item of deck.items){assert.ok(noteText.includes(item.prompt));assert.ok(noteText.includes(item.explanation));assert.ok(noteText.includes('Correct answer: '+answersReviewed.answers[item.id].option));}
 await activate('#trace-archive-panel > summary');
 const learnerTraceBytes=await download('#save-trace-button','learner-trace.json'),learnerTrace=JSON.parse(learnerTraceBytes);
 assert.deepEqual(learnerTrace.deck,parseDeck(deckBytes.toString()));
 assert.deepEqual(learnerTrace.firstAnswers,firstAnswers.map(({item,choice})=>({item,choice})));
 assert.deepEqual(learnerTrace.mastery,mastery);
 assert.deepEqual(learnerTrace.practice,{answers:[{item:missed.id,choice:answersReviewed.answers[missed.id].answer}]});
 report.learner={firstAnswers,mastery,practiceItem:missed.id};
 await capture('learner-completed.png');
 pass('downloaded course imports into unchanged direct-file learner; all12 independently reviewed answers/explanations execute, separate retry and real notes/trace preserve first session');
 assert.deepEqual(report.pageErrors,[]);
 assert.ok(report.pageRequests.every(url=>/^(file|data|blob):/.test(url)),JSON.stringify(report.pageRequests));
 pass('all observed application requests remain offline and no page JavaScript exceptions occur');
 report.status='accepted';
}catch(error){report.status='failed';report.error=error.stack;report.browserLog=browserLog;if(sessionId){try{report.lastPage=await evaluate('({url:location.href,text:document.body.innerText.slice(0,18000),active:document.activeElement.outerHTML})');await capture('failure.png');}catch{}}console.error(error.stack);process.exitCode=1;}
finally{
 if(socket?.readyState===WebSocket.OPEN){try{await command('Browser.close',{},true);}catch{}}
 socket?.close();for(const p of pending.values())clearTimeout(p.timer);
 if(browser&&browser.exitCode===null)browser.kill('SIGTERM');
 await sleep(200);await rm(profile,{recursive:true,force:true});
 for(const file of sources)assert.equal(hash(await readFile(file.path)),file.sha256,'source unchanged '+file.path);
 assert.deepEqual(await readFile(fileURLToPath(import.meta.url)),oracleBytes);
 await writeFile(join(output,'receipt.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({status:report.status,checks:report.checks.length,downloads:report.downloads.length,screenshots:report.screenshots.length,receipt:join(output,'receipt.json'),oracleSha256:report.oracleSha256}));
}
