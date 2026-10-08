#!/usr/bin/env node
'use strict';

// Independent review of the parent's importer/app/UI composition.
// This reviewer authored the lesson codec: this is not independent codec acceptance.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');
const args = process.argv.slice(2);
function arg(name) {
  const position = args.indexOf(name);
  assert.ok(position >= 0 && args[position + 1], 'Required argument ' + name);
  return path.resolve(args[position + 1]);
}
const source = arg('--source'), output = arg('--out'), legacy = arg('--legacy'), pinsFile = arg('--pins');
fs.mkdirSync(path.join(output, 'downloads'), {recursive:true});
const report = {
  result:'RUNNING', startedAt:new Date().toISOString(), source,
  role:'Independent receiving of the parent-authored importer/app/UI join; not independent review of the reviewer-authored codec.',
  controlledBoundaries:[
    'Native File.text completes on real selected files; only delivery of completed text is held for names beginning held-.',
    'The equal-state Start case explicitly replaces Math.random with a constant in its fresh browser context, causing repeated option permutations. No application state is accessed or replaced.'
  ],
  cases:[], downloads:[], legacyInputs:[], pageErrors:[], blockedExternalRequests:[]
};
let browser, server, context, baseUrl, serial=0, core, rawBundled, normalized, plan;
function pin(file) {
  const bytes=fs.readFileSync(file);
  return {bytes:bytes.length,git_blob:crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
}
function verify(manifest) {
  const result={};
  const files=Array.isArray(manifest.files)?Object.fromEntries(manifest.files.map(row=>[row.path,row])):manifest.files;
  for(const file of ['src/app.mjs','src/lesson-archive-ui.mjs','src/lesson-archive.mjs','src/deck.mjs','src/deck-picker.mjs','tools/make_demo.py','demo.html','index.html','styles.css','src/knowledge.mjs','src/trace-archive.mjs','src/trace-archive-ui.mjs','data/deck.json'])
    assert.ok(files[file], 'Missing frozen input '+file);
  for(const [file,expected] of Object.entries(files)) {
    result[file]=pin(path.join(source,file));
    assert.equal(result[file].git_blob, typeof expected==='string'?expected:(expected.gitBlob||expected.git_blob), file+' source changed');
    if(expected.sha256) assert.equal(result[file].sha256,expected.sha256,file+' SHA256 changed');
    if(Number.isInteger(expected.bytes)) assert.equal(result[file].bytes,expected.bytes,file+' byte length changed');
  }
  return result;
}
function nativePlan(deck) {
  const asked=new Set(), mastery=core.initialMastery(deck.concepts), steps=[], answers=[];
  while(answers.length<deck.items.length) {
    const item=core.selectNextItem(deck.items,asked,mastery);
    assert.ok(item);
    const choice=answers.length===0?(item.answer+1)%item.options.length:item.answer;
    const correct=choice===item.answer;
    mastery[item.concept]=core.updateMastery(mastery[item.concept],correct);
    const answer={item:item.id,choice};
    answers.push(answer); asked.add(item.id);
    steps.push({item,answer,mastery:{...mastery}});
  }
  return {steps,answers,mastery:{...mastery}};
}
async function check(name,run) {
  const started=Date.now(), item={name};
  try {item.evidence=await run();item.result='PASS';}
  catch(error){item.result='FAIL';item.error=error.stack;throw error;}
  finally {item.durationMs=Date.now()-started;report.cases.push(item);}
}
async function page(mode='modular',{hold=false,stable=false,phone=false}={}) {
  if(context) await context.close();
  context=await browser.newContext({acceptDownloads:true,viewport:phone?{width:390,height:844}:{width:1280,height:900},isMobile:phone,hasTouch:phone});
  await context.route('**/*',route=>{
    const url=route.request().url();
    if(/^https?:/.test(url)&&!url.startsWith(baseUrl+'/')) {report.blockedExternalRequests.push(url);return route.abort();}
    return route.continue();
  });
  await context.addInitScript(({hold,stable})=>{
    if(stable) Math.random=()=>0.375;
    window.__joinReadGates=[];
    if(hold) {
      const read=File.prototype.text;
      File.prototype.text=function(...args) {
        const result=read.apply(this,args);
        if(!this.name.startsWith('held-')) return result;
        return result.then(text=>new Promise(resolve=>{
          window.__joinReadGates.push({name:this.name,nativeReadComplete:true,released:false,release(){this.released=true;resolve(text);}});
        }));
      };
    }
  },{hold,stable});
  const tab=await context.newPage();tab.setDefaultTimeout(7000);
  tab.on('pageerror',error=>report.pageErrors.push({mode,message:error.message}));
  await tab.goto(mode==='standalone'?pathToFileURL(path.join(source,'demo.html')).href:baseUrl+'/index.html');
  await tab.locator('#lesson-archive-panel').waitFor();
  assert.equal(await tab.locator('#save-lesson-button').isDisabled(),true);
  return tab;
}
async function panel(tab,id) {
  if(!await tab.locator('#'+id).evaluate(element=>element.open)) await tab.locator('#'+id+' > summary').click();
}
async function snapshot(tab) {
  return tab.evaluate(()=>({
    session:document.querySelector('#session-content').innerHTML,
    progress:document.querySelector('#step-count').textContent,
    value:document.querySelector('[role="progressbar"]').getAttribute('aria-valuenow'),
    title:document.title,
    description:document.querySelector('#lesson-description').textContent
  }));
}
async function download(tab,type,label) {
  await panel(tab,type==='lesson'?'lesson-archive-panel':'trace-archive-panel');
  const selector=type==='lesson'?'#save-lesson-button':'#save-trace-button';
  assert.equal(await tab.locator(selector).isEnabled(),true);
  const pending=tab.waitForEvent('download');await tab.locator(selector).click();const item=await pending;
  const file=path.join(output,'downloads',String(++serial).padStart(2,'0')+'-'+label+'.json');
  await item.saveAs(file);assert.equal(await item.failure(),null);
  assert.match(item.suggestedFilename(),type==='lesson'?/^recallweave-unfinished-lesson-\d{4}-\d{2}-\d{2}\.json$/:/^recallweave-learning-trace-\d{4}-\d{2}-\d{2}\.json$/);
  const data=JSON.parse(fs.readFileSync(file,'utf8')), identity=pin(file);
  report.downloads.push({file:path.relative(output,file),filename:item.suggestedFilename(),...identity});
  return {file,data,...identity};
}
async function previewLesson(tab,file) {
  await panel(tab,'lesson-archive-panel');const before=await snapshot(tab);
  await tab.locator('#lesson-file').setInputFiles(file);await tab.locator('#lesson-preview').waitFor({state:'visible'});
  assert.deepEqual(await snapshot(tab),before);return before;
}
async function importCourse(tab,file) {
  const before=await snapshot(tab);
  await tab.locator('#deck-file').setInputFiles(file);await tab.locator('#start-deck').waitFor();
  assert.deepEqual(await snapshot(tab),before,'Course preview must not replace current work');
  assert.equal(await tab.locator('#deck-preview-title').textContent(),normalized.title);
  assert.equal(await tab.locator('#deck-preview img, #deck-preview script').count(),0);
  await tab.locator('#start-deck').click();
  assert.equal(await tab.locator('#lesson-description').textContent(),normalized.title);
  assert.equal(await tab.locator('#save-lesson-button').isEnabled(),true);
}
async function bundledStart(tab) {
  await tab.locator('#use-bundled-deck').click();await tab.locator('#start-deck').click();
}
async function question(tab,step,orders,feedback=false) {
  const item=plan.steps[step].item;
  assert.equal(await tab.locator('#session-content h2').textContent(),item.prompt);
  const choices=await tab.locator('#session-content [data-choice]').evaluateAll(elements=>elements.map(element=>({choice:Number(element.dataset.choice),disabled:element.disabled})));
  assert.equal(choices.length,item.options.length);
  assert.ok(choices.every(choice=>choice.disabled===feedback));
  if(orders) assert.deepEqual(choices.map(choice=>choice.choice),orders[item.id]);
  assert.equal(await tab.locator('#session-content img, #session-content script').count(),0);
}
async function held(tab,file,index) {
  await panel(tab,'lesson-archive-panel');await tab.locator('#lesson-file').setInputFiles(file);
  await tab.waitForFunction(index=>window.__joinReadGates[index]?.nativeReadComplete,index);
}
async function release(tab,index) {
  await tab.evaluate(async index=>{
    const gate=window.__joinReadGates[index];if(!gate?.nativeReadComplete) throw Error('Native read incomplete');
    gate.release();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  },index);
}
function sameArchiveState(a,b) {
  const omit=({savedAt,...rest})=>rest;
  assert.deepEqual(omit(a),omit(b),'Equal-state reset may change only the export timestamp');
}
(async()=>{
  const manifest=JSON.parse(fs.readFileSync(pinsFile,'utf8'));
  report.driver=pin(__filename);report.manifest=manifest;
  try {
    report.sourcePins=verify(manifest);
    rawBundled=JSON.parse(fs.readFileSync(path.join(source,'data/deck.json'),'utf8'));
    core=await import(pathToFileURL(path.join(source,'src/knowledge.mjs')).href);
    const deckApi=await import(pathToFileURL(path.join(source,'src/deck.mjs')).href);
    const raw=JSON.parse(fs.readFileSync(path.join(__dirname,'authored-course.json'),'utf8'));
    normalized={format:'recallweave-deck/1',title:raw.title,attribution:raw.attribution,license:raw.license,concepts:raw.concepts,
      items:raw.items.map(({id,concept,prerequisites,prompt,options,answer,explanation,transfer})=>({id,concept,prerequisites,prompt,options,answer,explanation,transfer}))};
    assert.deepEqual(deckApi.validateDeck(raw),normalized,'Independent expected native projection');
    const courseFile=path.join(output,'authored-course.json');fs.copyFileSync(path.join(__dirname,'authored-course.json'),courseFile);
    report.fixture={raw:pin(courseFile),normalized,expected:nativePlan(normalized)};
    const oldLesson=path.join(legacy,'01-modular-question.json'),oldTrace=path.join(legacy,'02-completed-1.json');
    const oldLessonData=JSON.parse(fs.readFileSync(oldLesson,'utf8')),oldTraceData=JSON.parse(fs.readFileSync(oldTrace,'utf8'));
    assert.deepEqual(oldLessonData.deck,rawBundled);assert.deepEqual(oldTraceData.deck,rawBundled);
    for(const file of [oldLesson,oldTrace])report.legacyInputs.push({file,...pin(file)});
    const heldLesson=path.join(output,'held-raw-bundled-lesson.json');fs.copyFileSync(oldLesson,heldLesson);
    const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml'};
    server=http.createServer((request,response)=>{
      const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
      if(pathname==='/favicon.ico'){response.writeHead(204).end();return;}
      const file=path.resolve(source,'.'+pathname);
      if(!file.startsWith(source+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){response.writeHead(404).end();return;}
      response.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});response.end(fs.readFileSync(file));
    });
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));baseUrl='http://127.0.0.1:'+server.address().port;
    browser=await chromium.launch({headless:true,executablePath:process.env.RECALLWEAVE_REVIEW_CHROMIUM||'/workspace/scratch/ae0a1ea0b247/browser-tools/runtime/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
    report.chromium=browser.version();

    await check('Imported native identity crosses modular save to standalone feedback resume, completed trace and same-course reset',async()=>{
      plan=nativePlan(normalized);let tab=await page();
      await importCourse(tab,courseFile);await question(tab,0);
      await tab.locator('[data-choice="'+plan.steps[0].answer.choice+'"]').click();await question(tab,0,null,true);
      const saved=await download(tab,'lesson','imported-feedback');
      assert.deepEqual(saved.data.deck,normalized);assert.deepEqual(saved.data.firstAnswers,plan.answers.slice(0,1));assert.deepEqual(saved.data.mastery,plan.steps[0].mastery);
      assert.equal(saved.data.presentation.phase,'feedback');assert.ok(!JSON.stringify(saved.data).includes('RAW-EXTRA'));
      tab=await page('standalone',{phone:true});await panel(tab,'lesson-archive-panel');const before=await snapshot(tab);
      await tab.locator('#lesson-file').setInputFiles(saved.file);
      await tab.waitForFunction(()=>document.querySelector('#lesson-restore-status').textContent.includes('unchanged')&&!document.querySelector('#lesson-restore-status').textContent.includes('Reading'));
      assert.equal(await tab.locator('#lesson-preview').isHidden(),true);assert.deepEqual(await snapshot(tab),before);
      await importCourse(tab,courseFile);await previewLesson(tab,saved.file);
      await tab.locator('#lesson-preview-title').scrollIntoViewIfNeeded();
      const dimensions=await tab.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:innerWidth}));
      assert.ok(dimensions.document<=dimensions.viewport+1);
      const screenshot=path.join(output,'imported-phone-preview.jpg');await tab.screenshot({path:screenshot,type:'jpeg',quality:80});
      report.screenshot={file:path.basename(screenshot),...pin(screenshot)};
      await tab.locator('#resume-lesson-confirm').click();await question(tab,0,saved.data.presentation.optionOrders,true);
      await tab.locator('#next-button').click();
      for(let index=1;index<plan.steps.length;index++){
        await question(tab,index,saved.data.presentation.optionOrders);
        await tab.locator('[data-choice="'+plan.steps[index].answer.choice+'"]').click();await tab.locator('#next-button').click();
      }
      await tab.locator('.result-card').waitFor();const completed=await download(tab,'trace','imported-completed');
      assert.deepEqual(completed.data.deck,normalized);assert.deepEqual(completed.data.firstAnswers,plan.answers);assert.deepEqual(completed.data.mastery,plan.mastery);assert.equal(completed.data.practice,null);
      await tab.locator('#reset-button').click();assert.equal(await tab.locator('#save-lesson-button').isDisabled(),true);assert.equal(await tab.locator('#save-trace-button').isDisabled(),true);
      assert.equal(await tab.locator('#lesson-description').textContent(),normalized.title);await tab.locator('#start-button').waitFor();
      return {normalizedCourseIdentity:true,rawExtrasExcluded:true,exactFullPrecisionTrace:completed.sha256,feedbackNotAppliedTwice:true,resetKeepsSelectedCourse:true,phoneDimensions:dimensions};
    });

    await check('Previously downloaded raw-bundled lesson and trace remain compatible; trace restoration invalidates a pending lesson read',async()=>{
      const tab=await page('modular',{hold:true});
      await previewLesson(tab,oldLesson);await tab.locator('#resume-lesson-confirm').click();
      const resumed=await download(tab,'lesson','raw-bundled-resumed');
      assert.deepEqual(resumed.data.deck,rawBundled);assert.deepEqual(resumed.data.firstAnswers,oldLessonData.firstAnswers);assert.deepEqual(resumed.data.mastery,oldLessonData.mastery);assert.deepEqual(resumed.data.presentation,oldLessonData.presentation);
      await held(tab,heldLesson,0);await panel(tab,'trace-archive-panel');
      await tab.locator('#trace-file').setInputFiles(oldTrace);await tab.locator('#trace-preview').waitFor({state:'visible'});await tab.locator('#restore-trace-confirm').click();
      await tab.locator('.result-card').waitFor();const beforeRelease=await snapshot(tab),status=await tab.locator('#lesson-restore-status').textContent();
      await release(tab,0);assert.equal(await tab.locator('#lesson-preview').isHidden(),true);assert.deepEqual(await snapshot(tab),beforeRelease);assert.equal(await tab.locator('#lesson-restore-status').textContent(),status);
      assert.equal(await tab.locator('#save-lesson-button').isDisabled(),true);
      const trace=await download(tab,'trace','raw-bundled-restored-trace');
      assert.deepEqual(trace.data.deck,rawBundled);assert.deepEqual(trace.data.firstAnswers,oldTraceData.firstAnswers);assert.deepEqual(trace.data.mastery,oldTraceData.mastery);
      await tab.locator('#reset-button').click();assert.equal(await tab.locator('#save-lesson-button').isDisabled(),true);assert.equal(await tab.locator('#save-trace-button').isDisabled(),true);
      return {priorNativeFilesAccepted:true,rawBundledIdentityPreserved:true,heldNativeReadIgnoredAfterTraceRestore:true,resetStartsUnanswered:true};
    });

    await check('Same-course Start invalidates preview and held read even when all archived lesson values remain equal',async()=>{
      const tab=await page('modular',{hold:true,stable:true});await tab.locator('#start-button').click();
      const initial=await download(tab,'lesson','equal-state-before'),before=await snapshot(tab);
      await previewLesson(tab,oldLesson);await bundledStart(tab);
      assert.deepEqual(await snapshot(tab),before);assert.equal(await tab.locator('#lesson-preview').isHidden(),true);assert.equal(await tab.locator('#lesson-file').inputValue(),'');
      const afterPreview=await download(tab,'lesson','equal-state-after-preview-start');sameArchiveState(initial.data,afterPreview.data);
      await held(tab,heldLesson,0);await bundledStart(tab);assert.deepEqual(await snapshot(tab),before);
      const status=await tab.locator('#lesson-restore-status').textContent();assert.ok(!status.includes('Reading'));
      await release(tab,0);assert.equal(await tab.locator('#lesson-preview').isHidden(),true);assert.equal(await tab.locator('#lesson-file').inputValue(),'');
      assert.equal(await tab.locator('#lesson-restore-status').textContent(),status);assert.deepEqual(await snapshot(tab),before);
      const afterRead=await download(tab,'lesson','equal-state-after-held-start');sameArchiveState(initial.data,afterRead.data);
      return {controlledConstantRandom:true,actualBeforeAfterFilesEqualApartFromTimestamp:true,stagedPreviewCleared:true,lateNativeReadIgnored:true};
    });

    await check('Starting a newly imported course fences a pending old-course lesson read and its status',async()=>{
      const tab=await page('modular',{hold:true});await tab.locator('#start-button').click();await held(tab,heldLesson,0);
      await importCourse(tab,courseFile);const before=await snapshot(tab),status=await tab.locator('#lesson-restore-status').textContent();
      await release(tab,0);assert.equal(await tab.locator('#lesson-preview').isHidden(),true);assert.deepEqual(await snapshot(tab),before);assert.equal(await tab.locator('#lesson-restore-status').textContent(),status);
      const current=await download(tab,'lesson','new-course-after-old-read');
      assert.deepEqual(current.data.deck,normalized);assert.deepEqual(current.data.firstAnswers,[]);assert.equal(current.data.presentation.phase,'question');
      return {oldCourseCannotReturnOverNewStart:true,lateStatusIgnored:true,currentNativeFile:current.sha256};
    });
    assert.deepEqual(report.pageErrors,[]);report.result='PASS';
  }catch(error){report.result='FAIL';report.error=error.stack;process.exitCode=1;}
  finally{
    if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));
    try{report.sourcePinsAfter=verify(manifest);report.sourceUnchanged=JSON.stringify(report.sourcePinsAfter)===JSON.stringify(report.sourcePins);if(!report.sourceUnchanged)throw Error('Source changed during receiving');}
    catch(error){report.result='FAIL';report.sourceCheckError=error.message;process.exitCode=1;}
    report.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(output,'independent-importer-join-receipt.json'),JSON.stringify(report,null,2)+'\n');
    process.stdout.write(JSON.stringify({result:report.result,cases:report.cases,downloads:report.downloads.length,sourceUnchanged:report.sourceUnchanged,error:report.error},null,2)+'\n');
  }
})();
