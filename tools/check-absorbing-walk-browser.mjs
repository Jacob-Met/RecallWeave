#!/usr/bin/env node
/** Actual offline consumer acceptance. Node 22+ and an installed Chromium-family browser. */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir,rm,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join,dirname} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
const option=(name,fallback)=>{const i=process.argv.indexOf(name);return i<0?fallback:process.argv[i+1];};
const project=resolve(option('--root',join(dirname(fileURLToPath(import.meta.url)),'..')));
const output=resolve(option('--output',join(project,'absorbing-walk-browser')));
const executable=option('--browser','chromium');
await mkdir(output); // A fresh output directory is required; do not replay uncertain runs.
const profile=join(output,'profile');await mkdir(profile);
const report={status:'running',started:new Date().toISOString(),pid:process.pid,checks:[],downloads:[],screenshots:[],requests:[],errors:[]};
const pending=new Map();let sequence=0,socket,sessionId,browser,browserClosed=false;
let pipeBrowser,pipeSession,pipeBrowserSession,pipeContextId;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
async function wait(check,label){let last;for(let i=0;i<120;i++){try{if(await check())return;}catch(e){last=e;}await sleep(100);}throw new Error('Timeout '+label+(last?': '+last.message:''));}
function command(method,params={},scoped=true){
 if(pipeBrowser)return (scoped?pipeSession:pipeBrowserSession).send(method,{...params,...(method==='Browser.setDownloadBehavior'?{browserContextId:pipeContextId}:{})});
 const id=++sequence;return new Promise((resolve,reject)=>{
 const timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout '+method));},10000);
 pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params,...(scoped&&sessionId?{sessionId}:{})}));
 });
}
async function evaluate(expression){const r=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;}
async function key(key,code=key,modifiers=0){for(const type of ['keyDown','keyUp'])await command('Input.dispatchKeyEvent',{type,key,code,modifiers,...(key==='Enter'?{windowsVirtualKeyCode:13,nativeVirtualKeyCode:13,...(type==='keyDown'?{text:'\r',unmodifiedText:'\r'}:{})}:{}),...(key==='Tab'?{windowsVirtualKeyCode:9,nativeVirtualKeyCode:9}:{})});}
async function activate(selector){assert.ok(await evaluate('!!document.querySelector('+JSON.stringify(selector)+')'),selector);await evaluate('document.querySelector('+JSON.stringify(selector)+').focus()');await key('Enter');}
async function enter(name,value){const selector='[name="'+name+'"]';await evaluate('document.querySelector('+JSON.stringify(selector)+').focus();document.querySelector('+JSON.stringify(selector)+').select()');await command('Input.insertText',{text:String(value)});}
async function navigate(url,width=1200,height=960){await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await command('Page.navigate',{url});await wait(()=>evaluate('document.readyState==="complete" && location.href==='+JSON.stringify(url)),'navigation');}
async function screenshot(name,selector){if(selector)await evaluate('document.querySelector('+JSON.stringify(selector)+').scrollIntoView({block:"start"})');const r=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});const bytes=Buffer.from(r.data,'base64');await writeFile(join(output,name),bytes);report.screenshots.push({name,bytes:bytes.length,sha256:sha(bytes)});}
async function download(selector,label,filename){
 const dir=join(output,'download-'+label);await mkdir(dir);
 await command('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:dir,eventsEnabled:true},false);
 await activate(selector);
 let path;
 await wait(async()=>{const files=await readdir(dir);const done=files.filter(x=>!x.endsWith('.crdownload'));if(done.length===1){path=join(dir,done[0]);return !filename||done[0]===filename;}return false;},'actual download '+label);
 const bytes=await readFile(path);report.downloads.push({label,path,bytes:bytes.length,sha256:sha(bytes)});
 return {path,bytes};
}
const passed=name=>{report.checks.push(name);console.log('PASS '+name);};
try {
 const playwrightPath=option('--playwright',null);
 if(playwrightPath){
  const {chromium}=await import(pathToFileURL(resolve(playwrightPath)));
  pipeBrowser=await chromium.launch({executablePath:executable,headless:true});
  pipeBrowser.on('disconnected',()=>{browserClosed=true;});
  const context=await pipeBrowser.newContext({acceptDownloads:true});
  const page=await context.newPage();
  pipeSession=await context.newCDPSession(page);pipeBrowserSession=await pipeBrowser.newBrowserCDPSession();
  pipeContextId=(await pipeBrowserSession.send('Target.getBrowserContexts')).browserContextIds[0];
  assert.ok(pipeContextId,'owned pipe browser context');
  pipeSession.on('Runtime.exceptionThrown',p=>report.errors.push(p.exceptionDetails.exception?.description||p.exceptionDetails.text));
  pipeSession.on('Network.requestWillBeSent',p=>report.requests.push(p.request.url));
  report.browser=await command('Browser.getVersion',{},false);report.transport='explicit existing Playwright pipe launch/newContext; CDP assertions unchanged';
  for(const method of ['Page.enable','Runtime.enable','Network.enable','DOM.enable'])await command(method);
 } else {
 browser=spawn(executable,['--headless=new','--disable-gpu','--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run','--no-default-browser-check','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe']});
 report.browserPid=browser.pid;let log='';browser.stderr.on('data',d=>{log=(log+d).slice(-12000);});browser.on('exit',code=>{browserClosed=true;report.browserExit=code;});
 let endpoint;
 await wait(async()=>{if(browserClosed)throw new Error('Browser closed: '+log);const [port,path]=(await readFile(join(profile,'DevToolsActivePort'),'utf8')).trim().split('\n');endpoint='ws://127.0.0.1:'+port+path;return !!port&&!!path;},'installed browser startup');
 socket=new WebSocket(endpoint);socket.addEventListener('message',event=>{
 const msg=JSON.parse(event.data);if(msg.id){const p=pending.get(msg.id);if(!p)return;pending.delete(msg.id);clearTimeout(p.timer);msg.error?p.reject(new Error(msg.error.message)):p.resolve(msg.result);}
 else if(msg.method==='Runtime.exceptionThrown')report.errors.push(msg.params.exceptionDetails.exception?.description||msg.params.exceptionDetails.text);
 else if(msg.method==='Network.requestWillBeSent')report.requests.push(msg.params.request.url);
 });
 await new Promise((r,j)=>{socket.addEventListener('open',r,{once:true});socket.addEventListener('error',j,{once:true});});
 report.browser=await command('Browser.getVersion',{},false);
 const {targetId}=await command('Target.createTarget',{url:'about:blank'},false);
 ({sessionId}=await command('Target.attachToTarget',{targetId,flatten:true},false));
 for(const method of ['Page.enable','Runtime.enable','Network.enable','DOM.enable'])await command(method);
 }
 let course;
 if(!process.argv.includes('--learner-only')){
 const lab=pathToFileURL(join(project,'courses/absorbing-walk-lab.html')).href;
 await navigate(lab);
 await wait(()=>evaluate('document.querySelector("#preset")?.options.length===5'),'offline module');
 assert.equal(await evaluate('document.querySelector("#results").hidden'),true);
 await activate('#apply');
 assert.equal(await evaluate('document.querySelector("#step-label").textContent'),'Step 0 of 12');
 assert.equal(await evaluate('document.querySelector("#distribution-table tbody").rows.length'),7);
 await activate('#next');assert.equal(await evaluate('document.querySelector("#step-label").textContent'),'Step 1 of 12');
 await activate('#last');assert.equal(await evaluate('document.querySelector("#step-label").textContent'),'Step 12 of 12');
 const first=await download('#download-experiment','experiment','absorbing-walk-experiment.json');
 const {analyzeWalk}=await import(pathToFileURL(join(project,'src/absorbing-walk.mjs')));
 const record=JSON.parse(first.bytes);assert.deepEqual(record,{...analyzeWalk({upper:6,start:3,rightNumerator:1,rightDenominator:2,horizon:12}),selectedStep:12});assert.equal(first.bytes.at(-1),10);
 await screenshot('desktop-experiment.png','#results');
 passed('direct-open module, native keyboard navigation and actual complete exact experiment download');
 course=await download('#download-course','course','absorbing-walk.json');
 assert.deepEqual(course.bytes,await readFile(join(project,'courses/absorbing-walk.json')));
 const guide=await download('#download-guide','guide','absorbing-walk.md');
 assert.deepEqual(guide.bytes,await readFile(join(project,'courses/absorbing-walk.md')));
 passed('real fixed course and guide downloads match original source bytes');
 await enter('rightDenominator',0);
 assert.equal(await evaluate('document.querySelector("#results").hidden && document.querySelector("#download-experiment").disabled'),true);
 await activate('#apply');assert.equal(await evaluate('document.querySelector("#status").dataset.state'),'invalid');
 assert.equal(await evaluate('document.querySelector("#download-experiment").disabled'),true);
 await enter('rightDenominator',6);await enter('rightNumerator',4);await activate('#apply');
 assert.equal(await evaluate('document.querySelector("#step-label").textContent'),'Step 0 of 12');
 const sameCourse=await download('#download-course','course-after-edit','absorbing-walk.json');assert.deepEqual(sameCourse.bytes,course.bytes);
 passed('real input events retire the applied result; invalid Apply has no stale export; course stays fixed');
 await navigate(lab,390,844);await wait(()=>evaluate('document.querySelector("#preset")?.options.length===5'),'phone module');
 await activate('#load-preset');await activate('#last');
 assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false);
 await screenshot('phone-distribution.png','#results');
 await screenshot('phone-expectation.png','#time-comparison');
 await enter('horizon',0);await activate('#apply');
 assert.equal(await evaluate('document.querySelector("#first").disabled&&document.querySelector("#last").disabled'),true);
 assert.equal(await evaluate('document.querySelector("#contribution-table tbody").rows.length'),0);
 passed('390px actual layout has no page overflow and zero horizon stays navigable');
 } else {
  const coursePath=option('--course-file',null);assert.ok(coursePath,'retain an actual earlier course download');
  course={path:resolve(coursePath),bytes:await readFile(resolve(coursePath))};
  assert.deepEqual(course.bytes,await readFile(join(project,'courses/absorbing-walk.json')));
  report.retainedDownload={path:course.path,bytes:course.bytes.length,sha256:sha(course.bytes)};
 }
 const deck=JSON.parse(course.bytes);
 await navigate(pathToFileURL(join(project,'demo.html')).href,1200,960);
 await wait(()=>evaluate('!!document.querySelector("#deck-file")'),'original learner');
 const originalTitle=await evaluate('document.title');
 const doc=await command('DOM.getDocument');
 const node=await command('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'#deck-file'});
 await command('DOM.setFileInputFiles',{nodeId:node.nodeId,files:[course.path]});
 await wait(()=>evaluate('!!document.querySelector("#start-deck")'),'actual file preview');
 assert.equal(await evaluate('document.title'),originalTitle);
 assert.equal(await evaluate('document.querySelector("#deck-preview-title").textContent'),deck.title);
 await screenshot('original-learner-preview.png','#deck-preview');
 await activate('#start-deck');
 await wait(()=>evaluate('!!document.querySelector(".question-card h2")'),'explicit deck start enters first question');
 for(let i=0;i<deck.items.length;i++){
  const prompt=await evaluate('document.querySelector(".question-card h2").textContent');
  const item=deck.items.find(x=>x.prompt===prompt);assert.ok(item);
  const choice=i===0?(item.answer+1)%item.options.length:item.answer;
  await activate('[data-choice="'+choice+'"]');await activate('#next-button');
 }
 assert.equal(await evaluate('document.querySelectorAll(".review-item").length'),12);
 assert.match(await evaluate('document.querySelector("#first-try-summary").textContent'),/11 of 12/);
 await activate('#practice-button');
 const retryPrompt=await evaluate('document.querySelector(".practice-card h2").textContent');
 const retry=deck.items.find(x=>x.prompt===retryPrompt);
 await activate('[data-practice-choice="'+retry.answer+'"]');await activate('#practice-next');
 assert.match(await evaluate('document.querySelector("#practice-status").textContent'),/1 of 1 correctly/);
 const notes=await download('#save-notes-button','study-notes');
 assert.ok(notes.bytes.toString('utf8').includes(deck.title));
 assert.ok(notes.bytes.toString('utf8').includes(retry.explanation));
 await screenshot('original-learner-review.png','.result-card');
 passed('actual downloaded course preview, explicit Start, twelve-question lesson, missed-item practice and study-notes download use unchanged learner');
 assert.deepEqual(report.errors,[]);
 assert.ok(report.requests.every(url=>/^(file:|blob:|data:)/.test(url)),JSON.stringify(report.requests));
 passed('no page exception or remote request on tested offline paths');
 report.status='passed';
} catch(error) {
 report.status='failed';report.error=error.stack||String(error);process.exitCode=1;
 try{report.lastPage=await evaluate('({url:location.href,text:document.body.innerText.slice(0,7000),focus:document.activeElement.outerHTML})');await screenshot('failure.png');}catch{}
} finally {
 if(pipeBrowser){try{await pipeBrowser.close();}catch(error){report.closeError=String(error);}}
 if(socket?.readyState===WebSocket.OPEN){try{await command('Browser.close',{},false);}catch{}}
 socket?.close();for(const p of pending.values())clearTimeout(p.timer);
 if(browser){for(let i=0;i<40&&!browserClosed;i++)await sleep(100);if(!browserClosed){report.forced=true;browser.kill();await sleep(500);}}
 report.browserClosed=browserClosed;
 if(browserClosed){await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200});report.profileRemoved=true;}
 report.ended=new Date().toISOString();await writeFile(join(output,'receipt.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({status:report.status,checks:report.checks.length,browserClosed,output}));
}
