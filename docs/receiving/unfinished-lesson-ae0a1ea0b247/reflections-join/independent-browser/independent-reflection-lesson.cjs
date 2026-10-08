#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const args=process.argv.slice(2);
const arg=name=>{const i=args.indexOf(name);assert.ok(i>=0&&args[i+1],name);return path.resolve(args[i+1]);};
const source=arg('--source'),out=arg('--out'),pins=JSON.parse(fs.readFileSync(arg('--pins'),'utf8')),legacy=arg('--legacy');
fs.mkdirSync(path.join(out,'downloads'),{recursive:true});
const hash=bytes=>({bytes:bytes.length,git_blob:crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
const pin=file=>hash(fs.readFileSync(file));
const lesson=path.join(legacy,'01-modular-question.json'),trace=path.join(legacy,'02-completed-1.json');
const report={schema:'recallweave.reflection-lesson-independent/1',startedAt:new Date().toISOString(),result:'RUNNING',source,driver:pin(__filename),sourcePins:{},sourcePinsAfter:{},fixtures:[],cases:[],downloads:[],pageErrors:[],externalRequests:[],limits:[
  'Independent receiving of the parent-authored reflection/unfinished-lesson composition; no re-review of the accepted codec or owner notebook algorithm.',
  'Previously downloaded native question-phase lesson and completed trace are read without edits.',
  'Only delivery after actual File.text completes is held for held- filenames; no application state or model is injected.',
  'One fresh browser context fixes Math.random to 0.375 solely to prove that same-state Start still invalidates the prior native read.',
  'Synthetic local files and real Chromium; no deployed site, account, provider, persistence after reload, clinical or learning-effect claim.'
]};
let server,browser,context,baseUrl,serial=0;
function verify(){
 const result={};
 for(const [file,expected] of Object.entries(pins.files)){
  const got=pin(path.join(source,file)),want=typeof expected==='string'?expected:(expected.git_blob||expected.gitBlob||expected.sha);
  assert.equal(got.git_blob,want,file+' changed');
  if(expected.sha256)assert.equal(got.sha256,expected.sha256,file+' sha256 changed');
  result[file]=got;
 }
 for(const file of ['src/app.mjs','src/lesson-archive-ui.mjs','src/lesson-archive.mjs','src/reflections.mjs','src/session-export.mjs','src/trace-archive.mjs','src/trace-archive-ui.mjs','src/deck.mjs','src/deck-picker.mjs','src/knowledge.mjs','src/review.mjs','src/answer-order.mjs','tools/make_demo.py','demo.html','index.html','styles.css','data/deck.json'])
  assert.ok(result[file],'Required source pin missing '+file);
 return result;
}
async function panel(tab,id){if(!await tab.locator('#'+id).evaluate(e=>e.open))await tab.locator('#'+id+' > summary').click();}
async function open(mode='modular',{hold=false,stable=false}={}){
 if(context)await context.close();
 context=await browser.newContext({acceptDownloads:true,viewport:mode==='standalone'?{width:390,height:844}:{width:1280,height:900},isMobile:mode==='standalone',hasTouch:mode==='standalone'});
 await context.route('**/*',route=>{
  const u=route.request().url();
  if(/^https?:/.test(u)&&!u.startsWith(baseUrl+'/')){report.externalRequests.push(u);return route.abort();}
  return route.continue();
 });
 await context.addInitScript(({hold,stable})=>{
  if(stable)Math.random=()=>0.375;
  window.__reflectionJoinReadGates=[];
  if(hold){
   const original=File.prototype.text;
   File.prototype.text=function(...args){
    const read=original.apply(this,args);
    if(!this.name.startsWith('held-'))return read;
    return read.then(text=>new Promise(resolve=>{
     window.__reflectionJoinReadGates.push({name:this.name,nativeReadComplete:true,released:false,release(){this.released=true;resolve(text);}});
    }));
   };
  }
 },{hold,stable});
 const tab=await context.newPage();tab.setDefaultTimeout(7000);
 tab.on('pageerror',e=>report.pageErrors.push({mode,error:e.message}));
 await tab.goto(mode==='standalone'?pathToFileURL(path.join(source,'demo.html')).href:baseUrl+'/index.html');
 await tab.locator('#lesson-archive-panel').waitFor();
 return tab;
}
async function state(tab){
 return tab.evaluate(()=>({session:document.querySelector('#session-content').innerHTML,progress:document.querySelector('#step-count').textContent,
  progressValue:document.querySelector('[role="progressbar"]').getAttribute('aria-valuenow'),title:document.title,
  description:document.querySelector('#lesson-description').textContent}));
}
async function notebook(tab){
 return tab.evaluate(()=>({notes:[...document.querySelectorAll('[data-reflection-item]')].map(e=>({item:e.dataset.reflectionItem,text:e.value})),application:document.querySelector('#application-reflection')?.value}));
}
async function writeNotes(tab,values){
 for(const [id,text] of Object.entries(values.notes)){
  const field=tab.locator('[data-reflection-item="'+id+'"]');
  const details=field.locator('xpath=ancestor::details');
  if(!await details.evaluate(e=>e.open))await details.locator(':scope > summary').click();
  await field.fill(text);
 }
 await tab.locator('#application-reflection').fill(values.application);
}
async function assertNotes(tab,values){
 const actual=await notebook(tab),expected=Object.fromEntries(rawDeck.items.map(i=>[i.id,values.notes[i.id]||'']));
 assert.deepEqual(Object.fromEntries(actual.notes.map(n=>[n.item,n.text])),expected);
 assert.equal(actual.application,values.application);
 assert.equal(await tab.locator('#session-content img, #session-content script').count(),0);
 return actual;
}
async function restoreTrace(tab){
 await panel(tab,'trace-archive-panel');await tab.locator('#trace-file').setInputFiles(trace);
 await tab.locator('#trace-preview').waitFor({state:'visible'});await tab.locator('#restore-trace-confirm').click();
 await tab.locator('.result-card').waitFor();
}
async function stageLesson(tab,file=lesson){
 await panel(tab,'lesson-archive-panel');const before=await state(tab);
 await tab.locator('#lesson-file').setInputFiles(file);await tab.locator('#lesson-preview').waitFor({state:'visible'});
 assert.deepEqual(await state(tab),before,'Staging must retain current session and notebook DOM');
}
async function held(tab,file,index){
 await panel(tab,'lesson-archive-panel');await tab.locator('#lesson-file').setInputFiles(file);
 await tab.waitForFunction(i=>window.__reflectionJoinReadGates[i]?.nativeReadComplete,index);
}
async function release(tab,index){
 await tab.evaluate(async i=>{
  const gate=window.__reflectionJoinReadGates[i];if(!gate?.nativeReadComplete)throw Error('Native read missing');
  gate.release();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 },index);
}
async function download(tab,type,label){
 if(type==='lesson')await panel(tab,'lesson-archive-panel');
 if(type==='trace')await panel(tab,'trace-archive-panel');
 const selector={lesson:'#save-lesson-button',trace:'#save-trace-button',notes:'#save-notes-button'}[type];
 assert.equal(await tab.locator(selector).isEnabled(),true);
 const event=tab.waitForEvent('download');await tab.locator(selector).click();const d=await event;
 const filename=String(++serial).padStart(2,'0')+'-'+label+(type==='notes'?'.txt':'.json'),file=path.join(out,'downloads',filename);
 await d.saveAs(file);assert.equal(await d.failure(),null);
 const bytes=fs.readFileSync(file),e={file:'downloads/'+filename,nativeFilename:d.suggestedFilename(),...hash(bytes)};
 report.downloads.push(e);
 return {...e,text:bytes.toString('utf8'),data:type==='notes'?null:JSON.parse(bytes)};
}
let rawDeck,lessonData,traceData;
async function complete(tab,prefix=[]){
 const answers=prefix.map(a=>({...a})),seen=new Set(answers.map(a=>a.item));
 while(!await tab.locator('.result-card').count()){
  if(await tab.locator('#next-button').count()){await tab.locator('#next-button').click();continue;}
  assert.ok(answers.length<rawDeck.items.length,'No repeated questions');
  const prompt=await tab.locator('#session-content h2').textContent(),item=rawDeck.items.find(i=>i.prompt===prompt);
  assert.ok(item,'Question belongs to exact native deck');assert.ok(!seen.has(item.id),'Unanswered question');
  await tab.locator('[data-choice="'+item.answer+'"]').click();
  answers.push({item:item.id,choice:item.answer});seen.add(item.id);await tab.locator('#next-button').click();
 }
 assert.equal(answers.length,rawDeck.items.length);return answers;
}
async function assertNotesFile(tab,values,answers,label){
 const saved=await download(tab,'notes',label);
 for(const [id,text] of Object.entries(values.notes)){
  const item=rawDeck.items.find(i=>i.id===id);
  const at=saved.text.indexOf(item.prompt);assert.ok(at>=0);
  const next=saved.text.indexOf('\n\n',at);
  const section=next<0?saved.text.slice(at):saved.text.slice(at,next);
  for(const line of text.split('\n'))assert.ok(section.includes('  > '+line),'Native notes must retain literal value under '+id);
 }
 for(const line of values.application.split('\n'))assert.ok(saved.text.includes('  > '+line),'Native application text retained');
 for(const a of answers){const item=rawDeck.items.find(i=>i.id===a.item);assert.ok(saved.text.includes('Your first answer: '+item.options[a.choice]));}
 return saved;
}
async function freshCourseStart(tab){await tab.locator('#use-bundled-deck').click();await tab.locator('#start-deck').click();}
async function check(name,fn){
 const start=Date.now(),row={name};
 try{row.evidence=await fn();row.result='PASS';}catch(e){row.result='FAIL';row.error=e.stack;throw e;}
 finally{row.durationMs=Date.now()-start;report.cases.push(row);}
}
(async()=>{
 try{
  report.sourcePins=verify();
  rawDeck=JSON.parse(fs.readFileSync(path.join(source,'data/deck.json'),'utf8'));
  lessonData=JSON.parse(fs.readFileSync(lesson,'utf8'));traceData=JSON.parse(fs.readFileSync(trace,'utf8'));
  assert.equal(pin(lesson).sha256,'93566df34c7f14c2c138f078a0495813eca669d9ab09affda3f8849deecb8b58');
  assert.equal(pin(trace).sha256,'b9346bb56758b63ffefb626cf2889807bff3c2a02ffde1e75a49d33c4bd07d5f');
  assert.deepEqual(lessonData.deck,rawDeck);assert.deepEqual(traceData.deck,rawDeck);
  report.fixtures=[{file:lesson,...pin(lesson)},{file:trace,...pin(trace)}];
  const heldFile=path.join(out,'held-native-lesson.json');fs.copyFileSync(lesson,heldFile);
  const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml'};
  server=http.createServer((req,res)=>{
   const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   if(pathname==='/favicon.ico'){res.writeHead(204).end();return;}
   const file=path.resolve(source,'.'+pathname);
   if(!file.startsWith(source+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
   res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(fs.readFileSync(file));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));baseUrl='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({headless:true,executablePath:process.env.RECALLWEAVE_REVIEW_CHROMIUM||'/workspace/scratch/ae0a1ea0b247/browser-tools/runtime/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
  report.chromium=browser.version();

  for(const mode of ['modular','standalone'])await check(mode+': late current notebook edits survive held read, preview, explicit resume and completion',async()=>{
   const tab=await open(mode,{hold:true});await restoreTrace(tab);
   const earlier={notes:{p1:'BEFORE-READ-'+mode,x1:'BEFORE-PREVIEW-'+mode},application:'BEFORE-APPLICATION-'+mode};
   await writeNotes(tab,earlier);const before=await state(tab);
   await held(tab,heldFile,0);
   const pendingEdit={notes:{p1:'PENDING-'+mode+' <tag>& "literal"\nSecond line.',x1:'LAST-QUESTION-'+mode},application:'Pending application '+mode};
   await writeNotes(tab,pendingEdit);await release(tab,0);await tab.locator('#lesson-preview').waitFor({state:'visible'});
   assert.deepEqual(await state(tab),before,'Native read and notebook edit do not replace the session DOM');
   await assertNotes(tab,pendingEdit);
   const finalEdit={notes:{p1:'AFTER-PREVIEW-'+mode+' <b>literal</b>\nQuestion p1 retained.',x1:'AFTER-PREVIEW-x1-'+mode+' & distinct ID'},application:'AFTER-PREVIEW-APPLICATION-'+mode+'\nApply = exact current writing.'};
   await writeNotes(tab,finalEdit);
   assert.equal(await tab.locator('#lesson-preview').isVisible(),true,'Notebook editing is not a lesson replacement');
   await tab.locator('#resume-lesson-confirm').click();
   const resumed=await download(tab,'lesson',mode+'-resumed');
   assert.deepEqual(resumed.data.firstAnswers,lessonData.firstAnswers);assert.deepEqual(resumed.data.mastery,lessonData.mastery);assert.deepEqual(resumed.data.presentation,lessonData.presentation);
   const finalAnswers=await complete(tab,lessonData.firstAnswers);
   const notebookResult=await assertNotes(tab,finalEdit);
   const notes=await assertNotesFile(tab,finalEdit,finalAnswers,mode+'-notes-after-resume');
   assert.ok(!notes.text.includes('BEFORE-READ-')&&!notes.text.includes('PENDING-'+mode));
   const finalTrace=await download(tab,'trace',mode+'-trace-after-resume');assert.deepEqual(finalTrace.data.firstAnswers,finalAnswers);assert.equal(finalTrace.data.practice,null);
   for(const token of ['AFTER-PREVIEW-','PENDING-'])assert.ok(!finalTrace.text.includes(token),'Notebook must not enter trace archive');
   const width=await tab.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:innerWidth}));if(mode==='standalone')assert.ok(width.document<=width.viewport+1);
   return {heldNativeRead:true,editsAfterPreviewPreserved:true,notebook:notebookResult,firstAnswers:finalAnswers,nativeNotes:notes.sha256,nativeTrace:finalTrace.sha256,notebookExcludedFromTrace:true,width};
  });

  await check('Explicit Reset and same-course Start clear writing; equal-state Start fences late native lesson delivery',async()=>{
   const tab=await open('modular',{hold:true,stable:true});await restoreTrace(tab);
   const old={notes:{p1:'RESET-MUST-CLEAR',x1:'RESET-LAST-CLEAR'},application:'RESET-APPLICATION-CLEAR'};
   await writeNotes(tab,old);await stageLesson(tab);
   await tab.locator('#reset-button').click();
   await tab.locator('#start-button').waitFor();
   assert.equal(await tab.locator('#lesson-preview').isHidden(),true);assert.equal(await tab.locator('#lesson-file').inputValue(),'');
   assert.equal(await tab.locator('#save-lesson-button').isDisabled(),true);assert.equal(await tab.locator('#save-trace-button').isDisabled(),true);
   await stageLesson(tab);await tab.locator('#resume-lesson-confirm').click();
   const afterResetAnswers=await complete(tab,lessonData.firstAnswers);
   await assertNotes(tab,{notes:{},application:''});
   const afterReset=await download(tab,'notes','fresh-reset-notes');assert.ok(!afterReset.text.includes('RESET-MUST-CLEAR')&&!afterReset.text.includes('RESET-APPLICATION-CLEAR'));

   const started={notes:{p1:'START-MUST-CLEAR',x1:'START-LAST-CLEAR'},application:'START-APPLICATION-CLEAR'};
   await writeNotes(tab,started);await held(tab,heldFile,0);
   await freshCourseStart(tab);const before=await state(tab),status=await tab.locator('#lesson-restore-status').textContent();
   await release(tab,0);assert.equal(await tab.locator('#lesson-preview').isHidden(),true);assert.deepEqual(await state(tab),before);assert.equal(await tab.locator('#lesson-restore-status').textContent(),status);
   const beforeEqual=await download(tab,'lesson','equal-start-before');
   await held(tab,heldFile,1);await freshCourseStart(tab);
   assert.deepEqual(await state(tab),before,'Deterministic second Start has the same visible state');
   const equalStatus=await tab.locator('#lesson-restore-status').textContent();
   await release(tab,1);assert.equal(await tab.locator('#lesson-preview').isHidden(),true);assert.equal(await tab.locator('#lesson-file').inputValue(),'');assert.equal(await tab.locator('#lesson-restore-status').textContent(),equalStatus);
   const afterEqual=await download(tab,'lesson','equal-start-after'),omit=({savedAt,...rest})=>rest;
   assert.deepEqual(omit(afterEqual.data),omit(beforeEqual.data),'Equal-state proof from actual native downloads');
   const freshAnswers=await complete(tab);await assertNotes(tab,{notes:{},application:''});
   const finalNotes=await download(tab,'notes','fresh-start-notes');
   assert.ok(!finalNotes.text.includes('START-MUST-CLEAR')&&!finalNotes.text.includes('START-APPLICATION-CLEAR')&&!finalNotes.text.includes('RESET-MUST-CLEAR'));
   return {resetClearsWriting:true,stagedPreviewCleared:true,resetThenExplicitResumeDoesNotRecoverClearedWriting:true,sameCourseStartClearsWriting:true,heldDeliveryIgnoredAfterStart:true,equalStateNativeArchivesEqualApartFromTimestamp:true,afterResetAnswers,freshAnswers,resetNotes:afterReset.sha256,finalNotes:finalNotes.sha256};
  });
  assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.externalRequests,[]);report.result='PASS';
 }catch(e){report.result='FAIL';report.error=e.stack;process.exitCode=1;}
 finally{
  if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));
  try{report.sourcePinsAfter=verify();assert.deepEqual(report.sourcePinsAfter,report.sourcePins);report.sourceUnchanged=true;}
  catch(e){report.result='FAIL';report.sourceUnchanged=false;report.sourceError=e.stack;process.exitCode=1;}
  report.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(out,'receipt.json'),JSON.stringify(report,null,2)+'\n');
  process.stdout.write(JSON.stringify({result:report.result,cases:report.cases,downloads:report.downloads.length,sourceUnchanged:report.sourceUnchanged,pageErrors:report.pageErrors,error:report.error},null,2)+'\n');
 }
})();
