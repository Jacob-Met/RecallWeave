import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const root=process.cwd(), out=path.join(root,'output');
fs.mkdirSync(out);
fs.mkdirSync(path.join(out,'downloads'));
fs.mkdirSync(path.join(out,'screenshots'));
const pins=JSON.parse(fs.readFileSync('EXPECTED_PINS.json','utf8'));
const contract=JSON.parse(fs.readFileSync('recipient-contract.json','utf8'));
const input=JSON.parse(fs.readFileSync('receiver-input.json','utf8'));
const require=createRequire(import.meta.url);
const {chromium}=require(input.playwrightPath);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const git=b=>crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const receipt={schema:'recallweave-independent-hull-native/1',startedAt:new Date().toISOString(),ownerHandoff:6070711854,contractBlob:'62547ee2264ae2b57679eac22a0f51a3bdea4449',receiverSha256:sha(fs.readFileSync('independent-browser.mjs')),runtime:{node:process.version,platform:process.platform,playwright:require(input.playwrightPath+'/package.json').version,chromiumPath:input.chromiumPath},groups:[],downloads:[],screenshots:[],pageErrors:[],consoleErrors:[],remotePageRequests:[],requests:[],storage:[],firstAnswers:[],cleanupErrors:[],authorBrowserHarnessExecuted:false,priorMathBuilderExecuted:false,ordinaryBaselineRerun:false};
const check=(value,message)=>assert.ok(value,message);
const pause=ms=>new Promise(r=>setTimeout(r,ms));
function sourcePins(){return pins.map(p=>{const b=fs.readFileSync(p.path);return {path:p.path,bytes:b.length,sha256:sha(b),gitBlob:git(b)};});}
function saveReceipt(){fs.writeFileSync(path.join(out,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');}
async function group(name,fn){const r={name,startedAt:new Date().toISOString()};try{r.detail=await fn();r.status='pass';}catch(e){r.status='fail';r.error={name:e.name,message:e.message,stack:e.stack};throw e;}finally{r.finishedAt=new Date().toISOString();receipt.groups.push(r);saveReceipt();}}
let child,browser,context,cdp,watchdog;
const stdout=[],stderr=[];
const lifecycle={pid:null,closeRequested:false,closed:false,earlyClose:false,exitCode:null,signal:null,error:null};
let resolveClose;const closed=new Promise(r=>{resolveClose=r;});
const trackedPages=[];
async function track(page,name){
 page.setDefaultTimeout(10000);trackedPages.push({page,name});
 page.on('pageerror',e=>receipt.pageErrors.push({page:name,message:e.message,stack:e.stack}));
 page.on('console',m=>{if(m.type()==='error')receipt.consoleErrors.push({page:name,text:m.text()});});
 page.on('request',r=>{receipt.requests.push({page:name,url:r.url()});if(/^https?:/.test(r.url()))receipt.remotePageRequests.push({page:name,url:r.url()});});
 return page;
}
async function capture(page,name,fullPage=false){
 const p=path.join(out,'screenshots',name+'.jpg');
 await page.screenshot({path:p,type:'jpeg',quality:85,fullPage});
 const b=fs.readFileSync(p);receipt.screenshots.push({path:'screenshots/'+name+'.jpg',bytes:b.length,sha256:sha(b),viewport:page.viewportSize()});
}
async function download(page,selector,name){
 const ready=page.waitForEvent('download');await page.locator(selector).click();const d=await ready;
 assert.equal(await d.failure(),null);
 const dest=path.join(out,'downloads',name);await d.saveAs(dest);const bytes=fs.readFileSync(dest);
 receipt.downloads.push({path:'downloads/'+name,suggestedFilename:d.suggestedFilename(),bytes:bytes.length,sha256:sha(bytes)});
 return {bytes,path:dest};
}
async function trace(page,name){return JSON.parse((await download(page,'#download-trace',name+'.json')).bytes.toString('utf8'));}
async function compute(page,points){
 await page.locator('#points-input').fill(JSON.stringify(points));
 assert.equal(await page.locator('#download-trace').isDisabled(),true);
 await page.locator('#compute-hull').click();
 assert.equal(await page.locator('#hull-error').innerText(),'');
 assert.equal(await page.locator('#download-trace').isEnabled(),true);
}
function checkGeometry(record,witness){
 assert.equal(record.format,'recallweave-convex-hull/1');
 assert.deepEqual(record.inputs.map(p=>[p.x,p.y]),witness.points);
 assert.deepEqual(record.inputs.map(p=>p.id),witness.points.map((_,i)=>'P'+(i+1)));
 const byId=new Map(record.inputs.map(p=>[p.id,p]));
 assert.deepEqual(record.hull.map(id=>{const p=byId.get(id);return [p.x,p.y];}),witness.expected.hull,witness.name+' frozen hull');
 assert.equal(record.twiceArea,witness.expected.twiceArea);
 assert.equal(record.area,witness.expected.twiceArea/2);
 const expectedKind=witness.expected.hull.length===0?'empty':witness.expected.hull.length===1?'point':witness.expected.hull.length===2?'segment':'polygon';
 assert.equal(record.kind,expectedKind);
 assert.equal(record.classifications.length,witness.points.length);
 for(const [index,p] of record.inputs.entries()){
  const first=witness.points.findIndex(q=>q[0]===p.x&&q[1]===p.y);
  assert.equal(record.classifications[index].id,p.id);
  assert.equal(record.classifications[index].representativeId,'P'+(first+1));
  assert.equal(record.classifications[index].duplicate,index!==first);
 }
 for(const coord of witness.expected.interiorCoordinates||[]){
  const i=witness.points.findIndex(p=>p[0]===coord[0]&&p[1]===coord[1]);assert.equal(record.classifications[i].role,'interior');
 }
 for(const coord of witness.expected.nonVertexBoundaryCoordinates||[]){
  const i=witness.points.findIndex(p=>p[0]===coord[0]&&p[1]===coord[1]);assert.equal(record.classifications[i].role,'edge');
 }
 if(witness.expected.duplicateOriginalPositions){
  const ids=witness.expected.duplicateOriginalPositions.map(i=>'P'+i);
  const representative=record.unique.find(p=>p.id===ids[0]);assert.deepEqual(representative.inputIds,ids);
 }
 assert.equal(record.steps.at(-1).phase,'complete');assert.deepEqual(record.steps.at(-1).after,record.hull);
}
try{
 await group('exact source admission and bounded existing native route',async()=>{
  receipt.before=sourcePins();for(let i=0;i<pins.length;i++)assert.deepEqual(receipt.before[i],pins[i]);
  assert.equal(pins.length,18);assert.equal(pins.reduce((n,p)=>n+p.bytes,0),277450);
  const capacity=fs.statfsSync(root);receipt.capacity={freeBytes:capacity.bavail*capacity.bsize,freeMemoryBytes:os.freemem()};
  check(receipt.capacity.freeBytes>=1024**3,'At least one GiB available temporary capacity');check(receipt.capacity.freeMemoryBytes>=512*1024**2,'At least 512 MiB available memory');
  receipt.runtime.chromiumSha256=sha(fs.readFileSync(input.chromiumPath));
  assert.equal(receipt.runtime.chromiumSha256,contract.environment.chromiumSHA256);
  return {files:pins.length,bytes:277450,capacity:receipt.capacity};
 });
 const profile=path.join(root,'profile');fs.mkdirSync(profile);
 const args=['--headless','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--disable-background-networking','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'];
 receipt.browserArgv=[input.chromiumPath,...args];
 child=spawn(input.chromiumPath,args,{stdio:['ignore','pipe','pipe']});lifecycle.pid=child.pid;
 let wsResolve,wsReject;const endpoint=new Promise((resolve,reject)=>{wsResolve=resolve;wsReject=reject;});
 child.stdout.on('data',b=>stdout.push(Buffer.from(b)));
 child.stderr.on('data',b=>{stderr.push(Buffer.from(b));const match=Buffer.concat(stderr).toString().match(/DevTools listening on (ws:\/\/127\.0\.0\.1:[^\s]+)/);if(match)wsResolve(match[1]);});
 child.once('error',e=>{lifecycle.error={name:e.name,message:e.message,code:e.code};wsReject(e);});
 child.once('close',(code,signal)=>{lifecycle.closed=true;lifecycle.earlyClose=!lifecycle.closeRequested;lifecycle.exitCode=code;lifecycle.signal=signal;resolveClose();wsReject(new Error('Spawned Chromium closed before ready'));});
 let timer;const ws=await Promise.race([endpoint,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Chromium readiness timed out')),15000);})]);clearTimeout(timer);
 browser=await chromium.connectOverCDP(ws);
 receipt.runtime.chromiumVersion=browser.version();assert.equal(browser.version(),contract.environment.chromium);
 cdp=await browser.newBrowserCDPSession();
 context=await browser.newContext({acceptDownloads:true,viewport:{width:1280,height:1000}});
 await context.route(/^https?:\/\//,route=>route.abort('blockedbyclient'));
 await context.addInitScript(()=>{
  globalThis.__independentStorageCalls=[];
  for(const method of ['setItem','removeItem','clear']){
   const original=Storage.prototype[method];
   Storage.prototype[method]=function(...args){globalThis.__independentStorageCalls.push({method,key:args[0]===undefined?null:String(args[0])});return Reflect.apply(original,this,args);};
  }
 });
 watchdog=setTimeout(()=>{receipt.timedOut=true;lifecycle.closeRequested=true;void cdp.send('Browser.close').catch(()=>{});},80000);
 const page=await track(await context.newPage(),'explorer-desktop');
 await page.goto(pathToFileURL(path.join(root,'courses/convex-hull-explorer.html')).href,{waitUntil:'load'});
 let rectangle;
 await group('explicit keyboard compute and independently frozen rectangle identities',async()=>{
  assert.equal(await page.locator('#result-summary').innerText(),'No current computation.');
  assert.equal(await page.locator('#download-trace').isDisabled(),true);
  const witness=contract.independentGeometry[0];
  await page.locator('#points-input').fill(JSON.stringify(witness.points));
  await page.locator('#points-input').focus();
  const focusPath=[];
  for(let i=0;i<12;i++){await page.keyboard.press('Tab');const id=await page.evaluate(()=>document.activeElement?.id||document.activeElement?.getAttribute('data-hull-preset'));focusPath.push(id);if(id==='compute-hull')break;}
  assert.equal(await page.locator('#compute-hull').evaluate(e=>e===document.activeElement),true);
  await page.keyboard.press('Enter');
  rectangle=await trace(page,'rectangle-first-step');checkGeometry(rectangle,witness);assert.equal(rectangle.selectedStep,0);
  assert.equal(await page.locator('#point-rows tr').count(),7);
  const rows=await page.locator('#point-rows tr').allTextContents();
  check(rows[4].includes('interior'),'Interior point visible');check(rows[5].includes('edge'),'Boundary nonvertex visible');check(rows[6].includes('P1 (duplicate)'),'Duplicate representative visible');
  return {focusPath,summary:await page.locator('#result-summary').innerText(),rows,hull:rectangle.hull,twiceArea:rectangle.twiceArea};
 });
 await group('previous next final affect inspection while actual downloads retain the full result',async()=>{
  const summary=await page.locator('#result-summary').innerText();
  await page.locator('#next-step').click();const next=await trace(page,'rectangle-selected-step');assert.equal(next.selectedStep,1);
  const {selectedStep:n,...fullNext}=next,{selectedStep:r,...fullInitial}=rectangle;assert.deepEqual(fullNext,fullInitial);
  await page.locator('#previous-step').click();check((await page.locator('#step-summary').innerText()).startsWith('Step 1 of '),'Previous returns to first inspection');
  await page.locator('#final-step').click();const final=await trace(page,'rectangle-final-step');assert.equal(final.selectedStep,rectangle.steps.length-1);
  const {selectedStep:f,...fullFinal}=final;assert.deepEqual(fullFinal,fullInitial);
  assert.equal(await page.locator('#result-summary').innerText(),summary);assert.equal(await page.locator('#hull-diagram polygon.hull-region').count(),1);
  assert.equal(await page.locator('#next-step').isDisabled(),true);assert.equal(await page.locator('#final-step').isDisabled(),true);
  await capture(page,'desktop-complete',true);
  return {initial:0,middle:1,final:final.selectedStep,totalSteps:final.steps.length,summary};
 });
 for(const witness of contract.independentGeometry.slice(1)){
  await group('frozen geometry: '+witness.name,async()=>{
   await compute(page,witness.points);const record=await trace(page,witness.name);checkGeometry(record,witness);
   assert.equal(await page.locator('#point-rows tr').count(),witness.points.length);
   return {kind:record.kind,hull:record.hull,twiceArea:record.twiceArea,rows:await page.locator('#point-rows tr').allTextContents()};
  });
 }
 await group('real edits and all frozen refusals retire displayed geometry and trace',async()=>{
  const bad=[['blank text',''],['malformed JSON','[[0,0],'],['seventeen pairs',JSON.stringify(Array.from({length:17},(_,i)=>[i,0]))],['coordinate outside [-20,20]','[[21,0]]'],['noninteger coordinate','[[0.5,0]]']];
  const refusals=[];
  for(const [name,value] of bad){
   await compute(page,contract.independentGeometry[0].points);
   await page.locator('#points-input').fill(value);
   assert.equal(await page.locator('#result-summary').innerText(),'No current computation.');
   assert.equal(await page.locator('#point-rows tr').count(),0);assert.equal(await page.locator('#hull-diagram circle').count(),0);
   assert.equal(await page.locator('#download-trace').isDisabled(),true);
   await page.locator('#compute-hull').click();
   assert.equal(await page.locator('#points-input').inputValue(),value);
   check((await page.locator('#hull-error').innerText()).length>0,'Refusal feedback');
   for(const id of ['previous-step','next-step','final-step','download-trace'])assert.equal(await page.locator('#'+id).isDisabled(),true);
   assert.equal(await page.locator('#result-summary').innerText(),'No current computation.');
   refusals.push({name,message:await page.locator('#hull-error').innerText(),status:await page.locator('#hull-status').innerText()});
  }
  await page.locator('[data-hull-preset="rectangle"]').click();
  assert.equal(await page.locator('#download-trace').isDisabled(),true);assert.equal(await page.locator('#hull-error').innerText(),'');
  return {refusals,presetStatus:await page.locator('#hull-status').innerText()};
 });
 let actualLesson;
 await group('actual lesson and worked-guide downloads match final owner source bytes',async()=>{
  actualLesson=await download(page,'#download-lesson','actual-convex-hull.json');
  const guide=await download(page,'#download-guide','actual-convex-hull.md');
  assert.deepEqual(actualLesson.bytes,fs.readFileSync('courses/convex-hull.json'));assert.deepEqual(guide.bytes,fs.readFileSync('courses/convex-hull.md'));
  return {lessonSha256:sha(actualLesson.bytes),guideSha256:sha(guide.bytes)};
 });
 const lesson=JSON.parse(actualLesson.bytes.toString('utf8'));
 const learner=await track(await context.newPage(),'unchanged-learner');
 await group('actual downloaded twelve-question course is previewed then explicitly started',async()=>{
  await learner.goto(pathToFileURL(path.join(root,'demo.html')).href,{waitUntil:'load'});
  await learner.locator('#deck-file').setInputFiles(actualLesson.path);await learner.locator('#start-deck').waitFor({state:'visible'});
  assert.equal(lesson.items.length,12);
  check((await learner.locator('#deck-preview').innerText()).includes(lesson.title),'Actual course title in preview');
  assert.equal(await learner.locator('[data-choice]').count(),0);
  await learner.locator('#start-deck').focus();await learner.keyboard.press('Enter');
  await learner.locator('[data-choice]').first().waitFor({state:'visible'});
  return {title:lesson.title,questions:12,startedBy:'focused Start this deck + Enter'};
 });
 const missed=[];
 await group('twelve actual answers retain exact feedback and two independent wrong-answer paths',async()=>{
  const seen=new Set();
  for(let i=0;i<12;i++){
   const prompt=await learner.locator('#session-content .question-card h2').innerText();
   const item=lesson.items.find(x=>x.prompt===prompt);check(item,'Displayed question is from actual downloaded course');check(!seen.has(item.id),'No duplicate first attempt');seen.add(item.id);
   const wrong=i===0||i===5,choice=wrong?(item.answer+1)%item.options.length:item.answer;if(wrong)missed.push(item);
   await learner.locator('[data-choice="'+choice+'"]').click();
   const feedback=await learner.locator('#feedback-slot').innerText();
   check(feedback.includes(item.explanation),'Authored explanation is displayed literally');check(feedback.includes(item.transfer),'Authored transfer is displayed literally');
   receipt.firstAnswers.push({item:item.id,choice,correct:!wrong,feedback});
   assert.equal(await learner.locator('[data-choice]:not([disabled])').count(),0);await learner.locator('#next-button').click();
  }
  assert.equal(await learner.locator('.review-item').count(),12);assert.equal(await learner.locator('.review-status.needs-review').count(),2);
  const summary=await learner.locator('#first-try-summary').innerText();check(summary.includes('10 of 12'),'Ten correct first attempts');
  return {summary,missed:missed.map(i=>i.id)};
 });
 const note='Independent hull note <b>& "literal"</b>\nA boundary point can remain outside the vertex list. Ω';
 const application='I will keep original point identities.\nLiteral: <svg> & "P1"';
 let firstSummary,masteryBefore;
 await group('literal reflection and two retries preserve all original answers and estimates',async()=>{
  const details=learner.locator('.review-item').filter({has:learner.locator('[data-reflection-item="'+missed[0].id+'"]')});
  await details.locator('summary').click();await details.locator('textarea').fill(note);await learner.locator('#application-reflection').fill(application);
  firstSummary=await learner.locator('#first-try-summary').innerText();masteryBefore=await learner.locator('.mastery-box').innerText();
  await learner.locator('#practice-button').click();
  for(let i=0;i<missed.length;i++){
   const prompt=await learner.locator('#session-content .question-card h2').innerText();const item=missed.find(x=>x.prompt===prompt);check(item,'Retry concerns a missed first answer');
   await learner.locator('[data-practice-choice="'+item.answer+'"]').click();
   check((await learner.locator('#practice-feedback').innerText()).includes(item.explanation),'Retry displays the course explanation');
   await learner.locator('#practice-next').click();
  }
  assert.equal(await learner.locator('#first-try-summary').innerText(),firstSummary);assert.equal(await learner.locator('.mastery-box').innerText(),masteryBefore);
  assert.equal(await learner.locator('[data-reflection-item="'+missed[0].id+'"]').inputValue(),note);assert.equal(await learner.locator('#application-reflection').inputValue(),application);
  assert.equal(await learner.locator('.review-status.needs-review').count(),2);
  check((await learner.locator('#practice-status').innerText()).includes('2 of 2 correctly on retry'),'Two successful retries remain separate');
  return {summary:firstSummary,practice:await learner.locator('#practice-status').innerText(),note,application};
 });
 await group('real study-notes download retains twelve first answers retries and literal multiline writing',async()=>{
  const notes=await download(learner,'#save-notes-button','actual-hull-study-notes.txt');const text=notes.bytes.toString('utf8');
  check(text.includes('10 of 12 connections correct on the first try.'),'Original first score in notes');
  check(text.includes('Complete: 2 of 2 practice answers recorded; 2 correct'),'Separate retry result in notes');
  for(const literal of [note,application])check(text.includes(literal.split('\n').map(line=>'  > '+line).join('\n')),'Literal note lines with existing export markers');
  for(const answer of receipt.firstAnswers){const item=lesson.items.find(x=>x.id===answer.item);check(text.includes(item.prompt),'Each question in notes');check(text.includes(item.options[answer.choice]),'Each first choice in notes');check(text.includes(item.explanation),'Each explanation in notes');}
  await learner.locator('#first-try-summary').scrollIntoViewIfNeeded();await capture(learner,'learner-review');
  return {bytes:notes.bytes.length,sha256:sha(notes.bytes),firstScore:'10/12',retries:'2/2',literalLinesPreserved:true};
 });
 const phone=await track(await context.newPage(),'explorer-390px');
 await group('native 390px view retains reachable controls and diagram without page overflow',async()=>{
  await phone.setViewportSize({width:390,height:844});
  await phone.goto(pathToFileURL(path.join(root,'courses/convex-hull-explorer.html')).href,{waitUntil:'load'});
  await compute(phone,contract.independentGeometry[0].points);await phone.locator('#final-step').click();
  const bounds=await phone.evaluate(()=>({innerWidth,scrollWidth:document.documentElement.scrollWidth,buttons:[...document.querySelectorAll('button')].map(b=>{const r=b.getBoundingClientRect();return {id:b.id,text:b.textContent,left:r.left,right:r.right,width:r.width};})}));
  check(bounds.scrollWidth<=390,'No horizontal page overflow');for(const b of bounds.buttons)check(b.left>=0&&b.right<=390,'Button remains within the narrow viewport: '+b.text);
  await phone.evaluate(()=>scrollTo(0,0));await capture(phone,'phone-top');
  await phone.locator('#hull-diagram').scrollIntoViewIfNeeded();await capture(phone,'phone-diagram');
  await phone.locator('#compute-hull').scrollIntoViewIfNeeded();await capture(phone,'phone-controls');
  return bounds;
 });
 await group('native observations contain no page failures remote requests or storage activity and preserve sources',async()=>{
  for(const {page,name} of trackedPages){receipt.storage.push({page:name,...await page.evaluate(()=>({localStorageLength:localStorage.length,sessionStorageLength:sessionStorage.length,observedStorageMethodCalls:globalThis.__independentStorageCalls}))});}
  for(const s of receipt.storage){assert.equal(s.localStorageLength,0);assert.equal(s.sessionStorageLength,0);assert.deepEqual(s.observedStorageMethodCalls,[]);}
  assert.deepEqual(receipt.pageErrors,[]);assert.deepEqual(receipt.consoleErrors,[]);assert.deepEqual(receipt.remotePageRequests,[]);
  receipt.after=sourcePins();assert.deepEqual(receipt.after,receipt.before);
  return {pages:trackedPages.length,pageErrors:0,consoleErrors:0,remotePageRequests:0,storage:receipt.storage,sourcePreserved:true};
 });
 receipt.status='pass';
}catch(e){
 receipt.status='fail';receipt.failure={name:e.name,message:e.message,stack:e.stack};
 try{if(trackedPages.length)await capture(trackedPages.at(-1).page,'failure');}catch{}
}finally{
 clearTimeout(watchdog);
 lifecycle.closeRequested=true;
 try{if(context)await context.close();}catch(e){receipt.cleanupErrors.push('context.close: '+e.message);}
 try{if(cdp&&!lifecycle.closed)await cdp.send('Browser.close');}catch(e){receipt.closeRequestMessage=e.message;}
 if(child){
  await Promise.race([closed,pause(8000)]);
  if(!lifecycle.closed){receipt.cleanupErrors.push('Observed Chrome child did not close after Browser.close');child.kill('SIGTERM');await Promise.race([closed,pause(4000)]);}
  if(!lifecycle.closed||lifecycle.exitCode!==0||lifecycle.signal!==null||lifecycle.earlyClose||lifecycle.error)receipt.cleanupErrors.push('Observed spawned Chrome close was not clean');
 }
 try{if(browser)await browser.close();}catch(e){receipt.browserConnectionCloseMessage=e.message;}
 receipt.childLifecycle=lifecycle;
 receipt.rawStreamsComplete=lifecycle.closed;
 receipt.after=sourcePins();receipt.sourcePreserved=JSON.stringify(receipt.before)===JSON.stringify(receipt.after);
 if(!receipt.sourcePreserved)receipt.cleanupErrors.push('Pinned source changed');
 if(receipt.cleanupErrors.length||receipt.timedOut)receipt.status='fail';
 fs.writeFileSync(path.join(out,'chrome.stdout.log'),Buffer.concat(stdout));
 fs.writeFileSync(path.join(out,'chrome.stderr.log'),Buffer.concat(stderr));
 const profile=path.join(root,'profile');
 function inventory(dir){if(!fs.existsSync(dir))return [];return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{const p=path.join(dir,e.name);if(e.isDirectory())return inventory(p);if(!e.isFile())return [];const b=fs.readFileSync(p);return [{path:path.relative(profile,p),bytes:b.length,sha256:sha(b)}];});}
 try{receipt.profileInventory=inventory(profile);}catch(e){receipt.profileInventoryError=e.message;}
 receipt.finishedAt=new Date().toISOString();saveReceipt();
 console.log(JSON.stringify({status:receipt.status,groups:receipt.groups.length,passed:receipt.groups.filter(g=>g.status==='pass').length,failure:receipt.failure,cleanupErrors:receipt.cleanupErrors,sourcePreserved:receipt.sourcePreserved,childLifecycle:lifecycle}));
 process.exitCode=receipt.status==='pass'?0:1;
}
