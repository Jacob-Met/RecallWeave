#!/usr/bin/env node
// Optional real-browser receiving. Node 22+ and an installed Chrome/Chromium.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,mkdtemp,readdir,rm} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const args=process.argv.slice(2);
const option=(name,fallback)=>args.includes(name)?args[args.indexOf(name)+1]:fallback;
const root=resolve(option('--root',join(dirname(fileURLToPath(import.meta.url)),'..')));
const executable=option('--browser',process.env.RECALLWEAVE_CHROME_PATH||'chromium');
const output=resolve(option('--output',join(root,'rates-browser-results')));
await mkdir(output,{recursive:true});
assert.deepEqual(await readdir(output),[],'Use an empty evidence directory.');
const downloads=join(output,'downloads');await mkdir(downloads);
const profile=await mkdtemp(join(output,'profile-'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const paths=['src/rates-accumulation.mjs','src/rates-accumulation-ui.mjs','courses/rates-accumulation.json','courses/rates-accumulation.md','courses/rates-accumulation-explorer.template.html','courses/rates-accumulation-explorer.html','tools/build-rates-accumulation.mjs','tools/check_rates_accumulation_browser.mjs','demo.html','src/app.mjs','src/deck.mjs','src/deck-picker.mjs','src/knowledge.mjs','src/review.mjs','src/session-export.mjs','src/answer-order.mjs','src/reflections.mjs'];
const pins=async()=>Object.fromEntries(await Promise.all(paths.map(async p=>[p,sha(await readFile(join(root,p)))])));
const courseBytes=await readFile(join(root,'courses/rates-accumulation.json')),deck=JSON.parse(courseBytes);
const report={format:'recallweave-rates-author-browser/1',status:'running',started:new Date().toISOString(),node:process.version,root,executable,sourceSha256:await pins(),checks:[],downloads:[],screenshots:[],pageErrors:[],requests:[]};
let browser,socket,sessionId,seq=0,log='';
const pending=new Map(),downloadEvents=new Map();
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function until(check,label){
 let last;for(let i=0;i<100;i++){try{if(await check())return;}catch(e){last=e;}await pause(100);}
 throw new Error('Timed out: '+label+(last?' '+last.message:''));
}
function command(method,params={},scoped=true){
 const id=++seq;return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout: '+method));},10000);
  pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params,...(scoped&&sessionId?{sessionId}:{})}));
 });
}
async function evaluate(expression){
 const r=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
 if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;
}
async function key(name){
 const codes={Tab:9,Enter:13,Home:36,End:35,ArrowRight:39};
 for(const type of ['keyDown','keyUp'])await command('Input.dispatchKeyEvent',{type,key:name,code:name,windowsVirtualKeyCode:codes[name],nativeVirtualKeyCode:codes[name],...(name==='Enter'&&type==='keyDown'?{text:'\r',unmodifiedText:'\r'}:{})});
}
async function activate(selector){await evaluate('document.querySelector('+JSON.stringify(selector)+').focus()');await key('Enter');}
async function change(selector,value,event='input'){
 await evaluate('(()=>{const e=document.querySelector('+JSON.stringify(selector)+');e.value='+JSON.stringify(value)+';e.dispatchEvent(new Event('+JSON.stringify(event)+',{bubbles:true}));})()');
}
const text=id=>evaluate('document.getElementById('+JSON.stringify(id)+').textContent');
const fractions=()=>evaluate("Object.fromEntries(['velocity','displacement','distance','average'].map(k=>[k,document.getElementById(k+'-value').dataset.fraction]))");
const visible=()=>evaluate("!document.getElementById('rates-results').hidden");
const pass=name=>{report.checks.push(name);console.log('PASS '+name);};
async function screenshot(name,selector){
 if(selector)await evaluate('document.querySelector('+JSON.stringify(selector)+').scrollIntoView({block:"start"})');
 await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
 const {data}=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 const bytes=Buffer.from(data,'base64');await writeFile(join(output,name),bytes);report.screenshots.push({name,sha256:sha(bytes),bytes:bytes.length});
}
async function download(selector,filename){
 const before=new Set(downloadEvents.keys());await activate(selector);
 let event;await until(()=>{event=[...downloadEvents.values()].find(e=>!before.has(e.guid)&&e.state==='completed');return !!event;},'download '+filename);
 assert.equal(event.suggestedFilename,filename);
 const path=join(downloads,filename);await until(async()=>{await readFile(path);return true;},'physical '+filename);
 const bytes=await readFile(path);report.downloads.push({path:'downloads/'+filename,sha256:sha(bytes),bytes:bytes.length,guid:event.guid});
 return {path,bytes};
}
async function fileInput(selector,path){
 const {root:doc}=await command('DOM.getDocument');
 const {nodeId}=await command('DOM.querySelector',{nodeId:doc.nodeId,selector});
 assert.ok(nodeId);await command('DOM.setFileInputFiles',{nodeId,files:[path]});
}
async function example(id){await change('#rate-preset',id,'change');await activate('#use-example');}
try{
 browser=spawn(executable,['--headless=new','--no-sandbox','--disable-gpu','--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run','--no-default-browser-check','--disk-cache-size=0','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe']});
 browser.stderr.on('data',b=>{log=(log+b.toString()).slice(-16000);});let launchError;browser.on('error',e=>{launchError=e;});
 let port,endpoint;await until(async()=>{if(launchError)throw launchError;if(browser.exitCode!==null)throw new Error('Chrome exited '+browser.exitCode);[port,endpoint]=(await readFile(join(profile,'DevToolsActivePort'),'utf8')).trim().split('\n');return !!port&&!!endpoint;},'Chrome startup');
 socket=new WebSocket('ws://127.0.0.1:'+port+endpoint);
 socket.addEventListener('message',event=>{
  const m=JSON.parse(event.data);
  if(m.id){const p=pending.get(m.id);if(!p)return;pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);}
  else if(m.method==='Runtime.exceptionThrown')report.pageErrors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);
  else if(m.method==='Network.requestWillBeSent')report.requests.push(m.params.request.url);
  else if(m.method==='Browser.downloadWillBegin'||m.method==='Browser.downloadProgress')downloadEvents.set(m.params.guid,{...downloadEvents.get(m.params.guid),...m.params});
 });
 await new Promise((r,j)=>{socket.addEventListener('open',r,{once:true});socket.addEventListener('error',j,{once:true});});
 report.browser=await command('Browser.getVersion',{},false);
 await command('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads,eventsEnabled:true},false);
 const {targetId}=await command('Target.createTarget',{url:'about:blank'},false);
 ({sessionId}=await command('Target.attachToTarget',{targetId,flatten:true},false));
 await command('Page.enable');await command('Runtime.enable');await command('Network.enable');
 await command('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
 await command('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});
 await command('Page.navigate',{url:pathToFileURL(join(root,'courses/rates-accumulation-explorer.html')).href});
 await until(()=>evaluate("document.getElementById('distance-value')?.dataset.fraction==='16/1'"),'standalone explorer');
 assert.deepEqual(await fractions(),{velocity:'0/1',displacement:'0/1',distance:'16/1',average:'0/1'});
 assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false);
 await screenshot('01-explorer-desktop.png','header');
 pass('standalone startup shows zero displacement and sixteen metres traveled without overflow');

 await evaluate("document.getElementById('inspect-slider').focus()");await key('Home');
 assert.deepEqual(await fractions(),{velocity:'0/1',displacement:'0/1',distance:'0/1',average:'undefined'});
 await key('ArrowRight');
 assert.deepEqual(await fractions(),{velocity:'1/5',displacement:'1/100',distance:'1/100',average:'1/10'});
 await key('End');assert.equal((await fractions()).distance,'16/1');
 await change('#inspect-time','2');assert.equal(await evaluate("document.getElementById('acceleration-value').dataset.kind"),'corner');
 await change('#inspect-time','4');assert.equal(await evaluate("document.getElementById('acceleration-value').dataset.kind"),'defined');
 pass('actual slider keys and time input distinguish zero duration, a corner and a straight knot');

 await example('crossing');assert.deepEqual(await fractions(),{velocity:'-1/1',displacement:'4/1',distance:'5/1',average:'1/1'});
 await change('#inspect-time','2');assert.deepEqual(await fractions(),{velocity:'1/1',displacement:'4/1',distance:'4/1',average:'2/1'});
 await change('#inspect-time','3.1');assert.equal((await fractions()).distance,'901/200');
 await activate('#segment-details summary');assert.match(await text('segment-rows'),/3/);
 pass('one-interval sign crossing preserves exact prefix distance and the complete interval table');

 await change('#curve-points tr:nth-child(1) [data-velocity]','1');
 assert.equal(await visible(),false);assert.equal(await evaluate("document.getElementById('download-calculation').disabled"),true);
 await change('#curve-points tr:nth-child(2) [data-time]','1');
 await change('#curve-points tr:nth-child(2) [data-velocity]','-2');
 await activate('#apply-curve');await change('#inspect-time','0.5');
 assert.deepEqual(await fractions(),{velocity:'-1/2',displacement:'1/8',distance:'5/24',average:'1/4'});
 assert.match(await text('segment-rows'),/1\/3/);
 const calculation=await download('#download-calculation','rates-accumulation-calculation.json');
 const retained=JSON.parse(calculation.bytes);assert.equal(retained.time.fraction,'1/2');assert.equal(retained.distance.fraction,'5/24');assert.equal(retained.source,'time_s,velocity_m_s\n0,1\n1,-2');
 const course=await download('#download-lesson','rates-accumulation.json');assert.deepEqual(course.bytes,courseBytes);
 const guide=await download('#download-guide','rates-accumulation-guide.md');assert.deepEqual(guide.bytes,await readFile(join(root,'courses/rates-accumulation.md')));
 pass('edited non-grid crossing and three physical downloads preserve exact curve, course and guide');

 await change('#curve-points tr:nth-child(2) [data-time]','0');await activate('#apply-curve');
 assert.equal(await visible(),false);assert.match(await text('curve-error'),/increase strictly/);
 await change('#curve-points tr:nth-child(2) [data-time]','1');await activate('#apply-curve');
 await change('#inspect-time','0.11');assert.equal(await visible(),false);assert.match(await text('inspection-error'),/one decimal/);
 await change('#inspect-time','0.5');assert.equal(await visible(),true);assert.equal((await fractions()).distance,'5/24');
 pass('invalid curve and inspection values retire stale results and recover by explicit correction');

 report.phoneLayout=[];
 for(const width of [390,320]){
  await command('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
  await until(()=>evaluate("[...document.querySelectorAll('.plot svg text')].every(e=>parseFloat(getComputedStyle(e).fontSize)*e.getScreenCTM().a>=12)"),'readable graph labels at '+width+' pixels');
  assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false);
  report.phoneLayout.push(await evaluate("({viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,minimumLabelPixels:Math.min(...[...document.querySelectorAll('.plot svg text')].map(e=>parseFloat(getComputedStyle(e).fontSize)*e.getScreenCTM().a))})"));
  if(width===390){await screenshot('02-explorer-phone.png','#inspect-heading');await screenshot('03-graphs-phone.png','#velocity-plot-title');}
  else await screenshot('03-graphs-320.png','#velocity-plot-title');
  assert.ok(await evaluate("[...document.querySelectorAll('svg path,svg polygon,svg line,svg circle,svg rect')].every(e=>[...e.attributes].every(a=>!a.value.includes('NaN')&&!a.value.includes('Infinity')))"));
 }
 await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 pass('390 and 320 pixel layouts retain readable graph labels, finite coordinates and selected results');

 await command('Page.navigate',{url:pathToFileURL(join(root,'demo.html')).href});
 await until(()=>evaluate("!!document.getElementById('start-button')"),'standalone learner');
 await activate('#start-button');await activate('[data-choice="0"]');
 const prior=await evaluate("({question:document.querySelector('.question-card h2').textContent,progress:document.getElementById('step-count').textContent})");
 await fileInput('#deck-file',course.path);await until(()=>evaluate("!!document.getElementById('start-deck')"),'course preview');
 assert.equal(await text('deck-preview-title'),deck.title);
 assert.deepEqual(await evaluate("({question:document.querySelector('.question-card h2').textContent,progress:document.getElementById('step-count').textContent})"),prior);
 await activate('#cancel-deck');
 assert.deepEqual(await evaluate("({question:document.querySelector('.question-card h2').textContent,progress:document.getElementById('step-count').textContent})"),prior);
 await fileInput('#deck-file',course.path);await until(()=>evaluate("!!document.getElementById('start-deck')"),'second course preview');
 await activate('#start-deck');
 pass('actual downloaded course previews and cancels without changing the ongoing learner');

 const answers=[],seen=new Set();
 for(let i=0;i<deck.items.length;i++){
  const prompt=await evaluate("document.querySelector('.question-card h2').textContent");
  const item=deck.items.find(q=>q.prompt===prompt);assert.ok(item);assert.ok(!seen.has(item.id));seen.add(item.id);
  const displayed=await evaluate("[...document.querySelectorAll('[data-choice]')].map(b=>({index:Number(b.dataset.choice),text:b.textContent.slice(b.querySelector('.choice-key').textContent.length)}))");
  assert.deepEqual(displayed.map(x=>x.text),displayed.map(x=>item.options[x.index]));
  const choice=i===0?(item.answer+1)%4:item.answer;
  await activate('[data-choice="'+choice+'"]');
  const feedback=await evaluate("document.getElementById('feedback-slot').textContent");
  assert.ok(feedback.includes(item.explanation));assert.ok(feedback.includes(item.transfer));
  answers.push({id:item.id,choice,answer:item.answer});await activate('#next-button');
 }
 assert.equal(await evaluate("document.querySelectorAll('.review-item').length"),12);
 const originalScore=await evaluate("document.querySelector('.result-card>p').textContent");
 assert.match(originalScore,/11 of 12/);
 await activate('#practice-button');
 const missed=deck.items.find(q=>q.id===answers[0].id);assert.equal(await evaluate("document.querySelector('.practice-card h2').textContent"),missed.prompt);
 await activate('[data-practice-choice="'+missed.answer+'"]');await activate('#practice-next');
 assert.equal(await evaluate("document.querySelector('.result-card>p').textContent"),originalScore);
 await screenshot('04-course-review-phone.png','.result-card');
 report.firstAnswers=answers;report.score=originalScore;
 pass('all twelve original questions complete with one retained first miss and a separate correct retry');

 const before=new Set(downloadEvents.keys());await activate('#save-notes-button');let noteEvent;
 await until(()=>{noteEvent=[...downloadEvents.values()].find(e=>!before.has(e.guid)&&e.state==='completed');return !!noteEvent;},'actual study notes');
 const notesPath=join(downloads,noteEvent.suggestedFilename),notes=await readFile(notesPath,'utf8');
 assert.match(noteEvent.suggestedFilename,/^recallweave-study-notes-.*\.txt$/);
 assert.ok(notes.includes(deck.title));assert.ok(notes.includes(deck.attribution));assert.ok(notes.includes(deck.license));
 for(const a of answers){const q=deck.items.find(q=>q.id===a.id);assert.ok(notes.includes(q.prompt));assert.ok(notes.includes('Your first answer: '+q.options[a.choice]));assert.ok(notes.includes(q.explanation));assert.ok(notes.includes(q.transfer));}
 assert.match(notes,/Practice answer:/);assert.ok(notes.includes(missed.options[missed.answer]));assert.match(notes,/MODEL STATE, NOT A GRADE/);
 report.downloads.push({path:'downloads/'+noteEvent.suggestedFilename,sha256:sha(notes),bytes:Buffer.byteLength(notes),guid:noteEvent.guid});
 assert.deepEqual(report.pageErrors,[]);
 assert.deepEqual(report.requests.filter(u=>/^https?:/.test(u)),[]);
 assert.deepEqual(await pins(),report.sourceSha256);
 pass('physical study notes keep every authored item and distinct first/practice answers without network requests');
 report.status='passed';
}catch(error){report.status='failed';report.error=error.stack;process.exitCode=1;console.error(error.stack);
 try{if(socket?.readyState===1)await screenshot('failure.png');}catch{}
}finally{
 report.finished=new Date().toISOString();
 try{if(socket?.readyState===1)await command('Browser.close',{},false);}catch{}
 try{socket?.close();}catch{}
 for(const p of pending.values()){clearTimeout(p.timer);p.reject(new Error('Receiver shutting down'));}pending.clear();
 if(browser&&browser.exitCode===null){await Promise.race([new Promise(r=>browser.once('exit',r)),pause(1500)]);if(browser.exitCode===null)browser.kill('SIGTERM');}
 await pause(200);
 try{await rm(profile,{recursive:true,force:true,maxRetries:4,retryDelay:100});report.profileRemoved=true;}catch(error){report.cleanupError=error.message;process.exitCode=1;}
 await writeFile(join(output,'browser.log'),log);
 await writeFile(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({status:report.status,checks:report.checks.length,output}));
}
