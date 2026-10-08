#!/usr/bin/env node
/**
 * Independent authored-course x completed-trace consumer receiving.
 * Source remains read-only. Only browser entropy and delayed File.text scheduling
 * are instrumented; decks, answers, mastery and practice enter through real controls.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFile, writeFile, mkdir, mkdtemp, rm, cp} from 'node:fs/promises';
import {resolve, join, extname} from 'node:path';
import {pathToFileURL} from 'node:url';

const options=process.argv.slice(2);
const arg=(name,fallback)=>options.includes(name)?options[options.indexOf(name)+1]:fallback;
const project=resolve(arg('--root','.'));
const output=resolve(arg('--output','receiving'));
const authoredPath=resolve(arg('--input','authored-final.json'));
const executable=arg('--browser','/snap/bin/chromium');
await mkdir(output,{recursive:true});
const downloadPath=join(output,'downloads');
await mkdir(downloadPath,{recursive:true});
const profile=await mkdtemp(join(output,'profile-'));
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const inputBytes=await readFile(authoredPath);
assert.equal(inputBytes.length,1642);
assert.equal(sha256(inputBytes),'6b6aafa39048d22be31a8d3221bce5e6ba320e3754de447a88e02b5953a7b0a9');
const imported=await import(pathToFileURL(join(project,'src/deck.mjs')));
const deck=imported.parseDeck(inputBytes.toString('utf8'));
const {initialMastery,updateMastery,selectNextItem}=await import(pathToFileURL(join(project,'src/knowledge.mjs')));
const {createReview,beginPractice,answerPractice}=await import(pathToFileURL(join(project,'src/review.mjs')));
const {readTraceArchive}=await import(pathToFileURL(join(project,'src/trace-archive.mjs')));
const {createStudyNotes}=await import(pathToFileURL(join(project,'src/session-export.mjs')));
const files=['src/app.mjs','src/deck.mjs','src/deck-picker.mjs','src/knowledge.mjs','src/review.mjs','src/answer-order.mjs','src/session-export.mjs','src/trace-archive.mjs','src/trace-archive-ui.mjs','index.html','styles.css','data/deck.json','tools/make_demo.py','demo.html'];
const sourceBefore=Object.fromEntries(await Promise.all(files.map(async file=>[file,sha256(await readFile(join(project,file)))])));
const report={status:'running',owner:'estate-49f845d0dece/recall_import_receiving',startedAt:new Date().toISOString(),ownerOriginalRef:'1804b98a4d94b98556eca9256ec24259b92d007c',ownerCompositionBase:'4775af91ba6a5d4df787669f39b44364dd1e37ba',observedMain:'d22b5ef7c641fc1726ae5b774383f8e6527d73e7',scope:'Exact accessible owner composition; no current-main adoption or deployment claim',project,receiverSha256:sha256(await readFile(new URL(import.meta.url))),node:process.version,platform:process.platform,arch:process.arch,authored:{path:authoredPath,bytes:inputBytes.length,sha256:sha256(inputBytes),authorHead:'66da3a4af752a9b57a6366e66a5d9438fc277587'},sourceBefore,checks:[],downloads:[],screenshots:[],entries:[],pageErrors:[],requests:[],instrumentation:['Math.random = 0 in first document, 0.999999 in fresh document; deterministic differing display permutations only','One named trace File.text read delayed until after explicit course switch'],notQualified:['Reflection and incomplete-lesson hooks are outside this receiving scope; neither is in this snapshot','Actual operating-system chooser cancellation; empty native file-input selection is used instead']};
const saveReport=()=>writeFile(join(output,'browser-report.json'),JSON.stringify(report,null,2)+'\n');
await saveReport();
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const server=createServer(async (request,response)=>{
  try {
    const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
    const file=resolve(project,'.'+(pathname==='/'?'/index.html':pathname));
    if(!file.startsWith(project+'/')){response.writeHead(403).end();return;}
    const bytes=await readFile(file);
    const mime={'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.json':'application/json'}[extname(file)];
    response.writeHead(200,{'Content-Type':(mime||'application/octet-stream')+'; charset=utf-8'});
    response.end(bytes);
  }catch{response.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
let browser,socket,sessionId,activeTargetId,sequence=0,browserLog='';
const requests=new Map();
const downloads=new Map();
async function waitFor(check,label,attempts=160){
  let last;
  for(let step=0;step<attempts;step++){
    try{if(await check())return;}catch(error){last=error;}
    await delay(75);
  }
  throw new Error('Timed out: '+label+(last?' ('+last.message+')':''));
}
function command(method,params={},scoped=true){
  const id=++sequence;
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{requests.delete(id);reject(new Error('CDP timeout: '+method));},10000);
    requests.set(id,{resolve,reject,timer});
    socket.send(JSON.stringify({id,method,params,...(scoped&&sessionId?{sessionId}:{})}));
  });
}
async function evaluate(expression){
  const value=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(value.exceptionDetails)throw new Error(value.exceptionDetails.exception?.description||value.exceptionDetails.text);
  return value.result.value;
}
async function activate(selector){
  assert.ok(await evaluate('!!document.querySelector('+JSON.stringify(selector)+')'),'Missing '+selector);
  assert.equal(await evaluate('!!document.querySelector('+JSON.stringify(selector)+').disabled'),false,'Disabled '+selector);
  await evaluate('document.querySelector('+JSON.stringify(selector)+').focus()');
  for(const type of ['keyDown','keyUp'])await command('Input.dispatchKeyEvent',{type,key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13,...(type==='keyDown'?{text:'\r',unmodifiedText:'\r'}:{})});
}
const text=selector=>evaluate('document.querySelector('+JSON.stringify(selector)+')?.textContent ?? null');
const hidden=selector=>evaluate('document.querySelector('+JSON.stringify(selector)+').hidden');
const completeState=()=>evaluate("({session:document.querySelector('#session-content').innerHTML,title:document.title,description:document.querySelector('#lesson-description').textContent,progress:document.querySelector('#step-count').textContent})");
const learningState=()=>evaluate("({first:document.querySelector('#first-try-summary')?.textContent??null,mastery:[...document.querySelectorAll('.mastery-box output')].map(x=>x.textContent),review:[...document.querySelectorAll('.review-item')].map(x=>({prompt:x.querySelector('.review-prompt').textContent,answers:[...x.querySelectorAll('dd')].map(n=>n.textContent),retry:x.querySelector('.review-practice-answer')?.textContent??null})),practice:document.querySelector('#practice-status')?.textContent??null,reflection:document.querySelector('.reflection')?.textContent??null,progress:document.querySelector('#step-count').textContent})");
async function chooseFile(selector,file){
  const {root}=await command('DOM.getDocument');
  const {nodeId}=await command('DOM.querySelector',{nodeId:root.nodeId,selector});
  await command('DOM.setFileInputFiles',{nodeId,files:file?[file]:[]});
}
async function openArchive(){
  if(!await evaluate("document.querySelector('#trace-archive-panel').open"))await activate('#trace-archive-panel > summary');
}
async function newDocument(url,width,entropy){
  if(activeTargetId)await command('Target.closeTarget',{targetId:activeTargetId},false);
  ({targetId:activeTargetId}=await command('Target.createTarget',{url:'about:blank'},false));
  ({sessionId}=await command('Target.attachToTarget',{targetId:activeTargetId,flatten:true},false));
  await command('Page.enable');await command('Runtime.enable');await command('Network.enable');
  await command('Page.addScriptToEvaluateOnNewDocument',{source:'Math.random = () => '+entropy+';'});
  await command('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
  await command('Page.navigate',{url});
  await waitFor(()=>evaluate('document.URL === '+JSON.stringify(url)+" && document.readyState === 'complete' && !!document.querySelector('#start-button') && !!document.querySelector('#trace-file')"),'new learner document');
  await openArchive();
  assert.equal(await evaluate("document.querySelector('#save-trace-button').disabled"),true);
}
async function deckPreview(file=authoredPath){
  await chooseFile('#deck-file',file);
  await waitFor(()=>evaluate("!!document.querySelector('#start-deck')"),'course preview');
}
async function startPreview(){
  await activate('#start-deck');
  await waitFor(()=>evaluate("!!document.querySelector('[data-choice]')"),'imported first question');
}
async function tracePreview(file){
  await openArchive();await chooseFile('#trace-file',file);
  await waitFor(()=>hidden('#trace-preview').then(value=>!value),'trace preview');
}
async function screenshot(name,selector){
  if(selector)await evaluate('document.querySelector('+JSON.stringify(selector)+").scrollIntoView({block:'start'})");
  const {data}=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  const bytes=Buffer.from(data,'base64');
  await writeFile(join(output,name),bytes);
  report.screenshots.push({name,bytes:bytes.length,sha256:sha256(bytes)});
}
async function download(selector,name){
  const previous=new Set(downloads.keys());
  await activate(selector);
  let entry;
  await waitFor(()=>{entry=[...downloads.values()].find(value=>!previous.has(value.guid)&&value.state==='completed');return !!entry;},'download '+name);
  const bytes=await readFile(join(downloadPath,entry.guid));
  await writeFile(join(output,name),bytes);
  const record={name,suggestedFilename:entry.suggestedFilename,bytes:bytes.length,sha256:sha256(bytes)};
  report.downloads.push(record);
  return {path:join(output,name),bytes,record};
}
async function savedTrace(name){
  await openArchive();
  const before=await learningState();
  const result=await download('#save-trace-button',name);
  assert.match(result.record.suggestedFilename,/^recallweave-learning-trace-\d{4}-\d{2}-\d{2}\.json$/);
  result.document=JSON.parse(result.bytes);
  result.restored=readTraceArchive(result.bytes.toString('utf8'),deck);
  assert.deepEqual(await learningState(),before);
  return result;
}
const sameArchiveState=(actual,expected)=>{
  for(const field of ['deck','model','firstAnswers','mastery','practice'])assert.deepEqual(actual[field],expected[field],field);
};
async function pass(name){report.checks.push(name);console.log('PASS '+name);await saveReport();}
async function answerButton(item,selector){
  const attr=selector==='[data-choice]'?'choice':'practiceChoice';
  const buttons=await evaluate('[...document.querySelectorAll('+JSON.stringify(selector)+')].map(button=>({canonical:Number(button.dataset.'+attr+'),letter:button.querySelector(".choice-key").textContent,text:[...button.childNodes].filter(node=>node.nodeType===3).map(node=>node.textContent).join("")}))');
  assert.deepEqual(buttons.map(x=>x.canonical).sort((a,b)=>a-b),item.options.map((_,i)=>i));
  for(let i=0;i<buttons.length;i++){
    assert.equal(buttons[i].letter,String.fromCharCode(65+i));
    assert.equal(buttons[i].text,item.options[buttons[i].canonical]);
  }
  return buttons.map(x=>x.canonical);
}
try{
  browser=spawn(executable,['--headless=new','--no-sandbox','--disable-gpu','--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run','--no-default-browser-check','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe']});
  browser.stderr.on('data',bytes=>{browserLog=(browserLog+bytes.toString()).slice(-10000);});
  let launchError;browser.on('error',error=>{launchError=error;});
  let port,endpoint;
  await waitFor(async()=>{if(launchError)throw launchError;if(browser.exitCode!==null)throw new Error('Browser exit '+browser.exitCode+': '+browserLog);[port,endpoint]=(await readFile(join(profile,'DevToolsActivePort'),'utf8')).trim().split('\n');return !!(port&&endpoint);},'browser startup',600);
  socket=new WebSocket('ws://127.0.0.1:'+port+endpoint);
  socket.addEventListener('message',event=>{
    const message=JSON.parse(event.data);
    if(message.id){const request=requests.get(message.id);if(!request)return;requests.delete(message.id);clearTimeout(request.timer);message.error?request.reject(new Error(message.error.message)):request.resolve(message.result);}
    else if(message.method==='Browser.downloadWillBegin'||message.method==='Browser.downloadProgress'){const value=message.params;downloads.set(value.guid,{...downloads.get(value.guid),...value});}
    else if(message.method==='Runtime.exceptionThrown')report.pageErrors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);
    else if(message.method==='Network.requestWillBeSent')report.requests.push({sessionId:message.sessionId,url:message.params.request.url});
  });
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  report.browser=await command('Browser.getVersion',{},false);
  await command('Browser.setDownloadBehavior',{behavior:'allowAndName',downloadPath,eventsEnabled:true},false);
  for(const [name,url,width] of [['modular',base+'/',1280],['standalone',pathToFileURL(join(project,'demo.html')).href,390]]){
    const entry={name,url,width,firstAnswers:[],optionOrders:{},freshOptionOrders:{},canonicalChoiceRoundTrip:false};
    report.entries.push(entry);
    await newDocument(url,width,0);
    await activate('#start-button');await activate('[data-choice="1"]');
    const original=await completeState();
    await deckPreview();
    assert.equal(await text('#deck-preview-title'),deck.title);
    assert.deepEqual(await completeState(),original);
    assert.deepEqual(await evaluate("[...document.querySelectorAll('.deck-questions li strong')].map(x=>x.textContent)"),deck.items.map(x=>x.prompt));
    assert.equal(await evaluate("document.querySelectorAll('#deck-preview b, #deck-preview map').length"),0);
    await activate('#cancel-deck');
    assert.equal(await hidden('#deck-preview'),true);
    assert.deepEqual(await completeState(),original);
    const invalidDeck=join(output,name+'-invalid-deck.json');
    await writeFile(invalidDeck,'{"invalid":');
    await chooseFile('#deck-file',invalidDeck);
    await waitFor(()=>text('#deck-status').then(value=>value.includes('not valid JSON')),'invalid deck refusal');
    assert.deepEqual(await completeState(),original);
    await chooseFile('#deck-file',null);
    assert.deepEqual(await completeState(),original);
    await pass(name+': actual authored file preview, cancel, empty selection and JSON refusal preserve answered bundled lesson');
    await deckPreview();await screenshot(name+'-authored-preview.png','#deck-preview');await startPreview();
    assert.equal(await text('#lesson-description'),deck.title);
    assert.equal(await text('#step-count'),'0 / 3');
    const mastery=initialMastery(deck.concepts),asked=new Set(),answers=[];
    for(let index=0;index<deck.items.length;index++){
      const expected=selectNextItem(deck.items,asked,mastery);
      assert.equal(await text('.question-card h2'),expected.prompt);
      const item=expected;
      asked.add(item.id);
      entry.optionOrders[item.id]=await answerButton(item,'[data-choice]');
      const choice=index===1?item.answer:(item.answer+1)%item.options.length;
      const correct=choice===item.answer;
      await activate('[data-choice="'+choice+'"]');
      assert.ok((await text('#feedback-slot')).includes(item.explanation));
      assert.equal(await evaluate("document.querySelectorAll('#feedback-slot b[data-receiving]').length"),0);
      answers.push({item:item.id,concept:item.concept,choice,correct});
      mastery[item.concept]=updateMastery(mastery[item.concept],correct);
      await activate('#next-button');
    }
    entry.firstAnswers=answers;
    assert.ok(Object.values(entry.optionOrders).some(order=>order.some((canonical,index)=>canonical!==index)));
    const review=createReview(deck.items,answers);
    assert.deepEqual((await learningState()).mastery,deck.concepts.map(c=>Math.round(mastery[c]*100)+'%'));
    assert.deepEqual((await learningState()).review.map(row=>row.answers),review.map(item=>[item.options[item.choice],item.options[item.answer]]));
    assert.ok((await text('.source-note')).includes(deck.attribution));
    assert.ok((await text('.source-note')).includes(deck.license));
    assert.equal(await evaluate("document.querySelectorAll('#session-content b[data-receiving],#session-content map').length"),0);
    const baseline=await savedTrace(name+'-first-trace.json');
    assert.deepEqual(baseline.document.deck,deck);
    assert.deepEqual(baseline.document.firstAnswers,answers.map(({item,choice})=>({item,choice})));
    assert.deepEqual(baseline.document.mastery,mastery);
    assert.equal(baseline.document.practice,null);
    await pass(name+': all authored questions, literal Unicode/markup, adaptive order and shuffled canonical first choices reach an actual completed trace download');
    let practice=beginPractice(review);
    assert.equal(practice.items.length,2);
    const firstPractice=practice.items[0];
    await activate('#practice-button');
    assert.equal(await text('.practice-card h2'),firstPractice.prompt);
    assert.deepEqual(await answerButton(firstPractice,'[data-practice-choice]'),entry.optionOrders[firstPractice.id]);
    await activate('[data-practice-choice="'+firstPractice.answer+'"]');
    practice=answerPractice(practice,firstPractice.id,firstPractice.answer);
    await activate('#back-to-review');
    const pausedState=await learningState();
    const paused=await savedTrace(name+'-paused-trace.json');
    assert.deepEqual(paused.document.firstAnswers,baseline.document.firstAnswers);
    assert.deepEqual(paused.document.mastery,baseline.document.mastery);
    assert.deepEqual(paused.document.practice,{answers:practice.answers.map(({item,choice})=>({item,choice}))});
    const notes=await download('#save-notes-button',name+'-paused-notes.txt');
    assert.equal(notes.bytes.toString('utf8'),createStudyNotes({deck,review,mastery,practice,exportedAt:notes.bytes.toString('utf8').match(/^Saved: (.+)$/m)[1],conceptLabel:c=>c}).text);
    await screenshot(name+'-paused-trace.png','.result-card');
    await pass(name+': one retry pauses; saved JSON and actual notes preserve first choices, exact model estimates and canonical practice answer');
    await newDocument(url,width,0.999999);
    const freshBundled=await completeState();
    await chooseFile('#trace-file',paused.path);
    await waitFor(()=>text('#trace-restore-status').then(value=>value.includes('different course')),'wrong bundled course refusal');
    assert.equal(await hidden('#trace-preview'),true);
    assert.deepEqual(await completeState(),freshBundled);
    await deckPreview();assert.deepEqual(await completeState(),freshBundled);await startPreview();
    const fresh=await completeState();
    const freshPrompt=await text('.question-card h2');
    const freshItem=deck.items.find(item=>item.prompt===freshPrompt);
    entry.freshOptionOrders[freshItem.id]=await answerButton(freshItem,'[data-choice]');
    assert.notDeepEqual(entry.freshOptionOrders[freshItem.id],entry.optionOrders[freshItem.id]);
    await tracePreview(paused.path);
    assert.deepEqual(await completeState(),fresh);
    assert.ok((await text('#trace-preview-summary')).includes('Practice: 1 of 2'));
    await screenshot(name+'-restore-preview.png','#trace-archive');
    await activate('#restore-trace-cancel');
    assert.equal(await hidden('#trace-preview'),true);
    assert.deepEqual(await completeState(),fresh);
    const corrupt=structuredClone(paused.document);
    corrupt.mastery[deck.concepts[0]]=0;
    const corruptPath=join(output,name+'-corrupt-trace.json');
    await writeFile(corruptPath,JSON.stringify(corrupt,null,2)+'\n');
    await chooseFile('#trace-file',corruptPath);
    await waitFor(()=>text('#trace-restore-status').then(value=>value.includes('original model estimates')),'tampered mastery refusal');
    assert.equal(await hidden('#trace-preview'),true);
    assert.deepEqual(await completeState(),fresh);
    await pass(name+': fresh document refuses trace before course admission; same-course import, trace preview, cancellation and tamper refusal preserve fresh lesson');
    await tracePreview(paused.path);await activate('#restore-trace-confirm');
    assert.deepEqual(await learningState(),pausedState);
    assert.equal(await hidden('#trace-preview'),true);
    const restored=await savedTrace(name+'-restored-trace.json');
    sameArchiveState(restored.document,paused.document);
    entry.canonicalChoiceRoundTrip=true;
    await activate('#practice-button');
    const next=practice.items[practice.answers.length];
    assert.equal(await text('.practice-card h2'),next.prompt);
    entry.freshOptionOrders[next.id]=await answerButton(next,'[data-practice-choice]');
    assert.notDeepEqual(entry.freshOptionOrders[next.id],entry.optionOrders[next.id]);
    const retryChoice=(next.answer+1)%next.options.length;
    await activate('[data-practice-choice="'+retryChoice+'"]');
    practice=answerPractice(practice,next.id,retryChoice);
    await activate('#practice-next');
    assert.ok((await text('#practice-status')).includes('1 of 2 correctly'));
    const continued=await savedTrace(name+'-continued-trace.json');
    assert.deepEqual(continued.document.firstAnswers,paused.document.firstAnswers);
    assert.deepEqual(continued.document.mastery,paused.document.mastery);
    assert.deepEqual(continued.document.practice,{answers:practice.answers.map(({item,choice})=>({item,choice}))});
    const finalNotes=await download('#save-notes-button',name+'-continued-notes.txt');
    assert.equal(finalNotes.bytes.toString('utf8'),createStudyNotes({deck,review,mastery,practice,exportedAt:finalNotes.bytes.toString('utf8').match(/^Saved: (.+)$/m)[1],conceptLabel:c=>c}).text);
    assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'),false);
    await screenshot(name+'-continued-practice.png','.result-card');
    await pass(name+': explicit restore redownloads identical state; continued practice uses changed display order while original first choices and mastery remain exact');
    const completed=await completeState();
    await tracePreview(paused.path);
    await deckPreview();
    assert.deepEqual(await completeState(),completed);
    assert.equal(await hidden('#trace-preview'),false);
    await startPreview();
    assert.equal(await hidden('#trace-preview'),true);
    assert.ok((await text('#trace-restore-status')).includes('Your lesson changed'));
    const delayedPath=join(output,name+'-delayed-trace.json');
    await cp(paused.path,delayedPath);
    await evaluate("window.receivingRead=File.prototype.text;File.prototype.text=function(){if(this.name.endsWith('-delayed-trace.json')){const file=this;return new Promise(resolve=>{window.releaseReceivingRead=()=>window.receivingRead.call(file).then(resolve);});}return window.receivingRead.call(this);};");
    await chooseFile('#trace-file',delayedPath);
    await waitFor(()=>evaluate("typeof window.releaseReceivingRead === 'function'"),'held trace read');
    await activate('#use-bundled-deck');await startPreview();
    const switched=await completeState();
    await evaluate('File.prototype.text=window.receivingRead;window.releaseReceivingRead()');
    assert.equal(await hidden('#trace-preview'),true);
    assert.deepEqual(await completeState(),switched);
    assert.ok((await text('#trace-restore-status')).includes('Your lesson changed'));
    assert.equal(await evaluate("document.querySelector('#save-trace-button').disabled"),true);
    await pass(name+': explicit fresh import invalidates staged restore; delayed actual trace read cannot revive after course switch');
  }
  assert.deepEqual(report.pageErrors,[]);
  const external=report.requests.filter(({url})=>!url.startsWith(base+'/')&&!url.startsWith('file:')&&!url.startsWith('blob:')&&!url.startsWith('data:'));
  assert.deepEqual(external,[]);
  report.externalRequests=external;
  const sourceAfter=Object.fromEntries(await Promise.all(files.map(async file=>[file,sha256(await readFile(join(project,file)))])));
  assert.deepEqual(sourceAfter,sourceBefore);
  report.sourceAfter=sourceAfter;
  await pass('all exercised source bytes unchanged; both entrypoints finish without script exceptions or hosted requests');
  report.status='passed';
}catch(error){
  report.status='failed';report.error=error.stack||String(error);report.browserLog=browserLog;
  if(sessionId)try{report.lastPage=await evaluate("({url:location.href,ready:document.readyState,focus:document.activeElement.outerHTML,text:document.body.innerText.slice(0,7000)})");await screenshot('failed-state.png');}catch{}
  console.error(report.error);process.exitCode=1;
}finally{
  report.finishedAt=new Date().toISOString();
  await writeFile(join(output,'browser.stderr.log'),browserLog);
  if(socket?.readyState===WebSocket.OPEN)try{await command('Browser.close',{},false);}catch{}
  socket?.close();
  for(const request of requests.values())clearTimeout(request.timer);
  if(browser&&browser.exitCode===null)browser.kill('SIGTERM');
  server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
  await delay(300);
  await rm(profile,{recursive:true,force:true});
  await saveReport();
  console.log(report.status.toUpperCase()+': '+report.checks.length+' checks; '+join(output,'browser-report.json'));
}
