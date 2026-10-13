'use strict';
// Real installed Chromium and actual file/download paths; all ballots and answers are synthetic.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const crypto = require('node:crypto'), assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const stage = path.resolve(process.argv[2] || '.');
const source = path.join(stage, 'source'), output = path.join(stage, process.argv[3] || 'browser-results');
fs.mkdirSync(output, {recursive:true});
const raw = fs.readFileSync(path.join(source, 'courses/ranked-voting.json'));
const deck = JSON.parse(raw);
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const filePin = p => { const b = fs.readFileSync(p); return {path:path.relative(stage,p).split(path.sep).join('/'),bytes:b.length,sha256:hash(b)}; };
const report = {startedUTC:new Date().toISOString(),device:{hostname:os.hostname(),user:os.userInfo().username,platform:process.platform,release:os.release(),arch:process.arch,node:process.version,playwright:require(path.join(process.env.PLAYWRIGHT_MODULE || 'playwright','package.json')).version},inputs:[],groups:[],downloads:[],screenshots:[],requests:[],pageErrors:[],fatal:null};
let browser;
async function group(name, fn) { try { const details = await fn(); report.groups.push({name,status:'passed',details}); console.log('PASS '+name); } catch(e) { report.groups.push({name,status:'failed',error:e.stack}); console.log('FAIL '+name+': '+e.message); } }
async function screenshot(page,name) { const p=path.join(output,name+'.png'); await page.screenshot({path:p,fullPage:true}); report.screenshots.push(filePin(p)); }
async function download(page,click,name) { const pending=page.waitForEvent('download'); await click(); const d=await pending; const p=path.join(output,name); await d.saveAs(p); assert.equal(await d.failure(),null); report.downloads.push({...filePin(p),suggestedFilename:d.suggestedFilename()}); return p; }
async function fresh(viewport) {
  const context=await browser.newContext({acceptDownloads:true,viewport,offline:true});
  context.on('request',r=>report.requests.push(r.url()));
  context.on('page',p=>p.on('pageerror',e=>report.pageErrors.push(e.message)));
  return context;
}
async function learnerFlow(context,html,course,label) {
  const page=await context.newPage();
  await page.goto(pathToFileURL(html).href);
  assert.equal(await page.locator('#step-count').innerText(),'0 / 6');
  await page.locator('#deck-file').setInputFiles(course);
  await page.locator('#start-deck').waitFor({state:'visible'});
  assert.equal(await page.locator('#deck-preview-title').innerText(),deck.title);
  assert.equal(await page.locator('#deck-preview ol li').count(),16);
  assert.equal(await page.locator('#step-count').innerText(),'0 / 6');
  assert.ok((await page.locator('#deck-preview').innerText()).includes(deck.license));
  await screenshot(page,label+'-preview');
  await page.locator('#start-deck').click();
  assert.equal(await page.locator('#lesson-description').innerText(),deck.title);
  assert.equal(await page.locator('#step-count').innerText(),'0 / 16');
  await page.locator('.question-card h2').waitFor({state:'visible'});
  const answered=[],missed=deck.items.find(q=>q.id==='rv-condorcet-winner'),wrong=(missed.answer+1)%4;
  for(let n=0;n<16;n++){
    const prompt=await page.locator('.question-card h2').innerText();
    const q=deck.items.find(q=>q.prompt===prompt);
    assert.ok(q,'Displayed prompt belongs to course');assert.ok(!answered.includes(q.id));
    if(n===0) {
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow');
      await screenshot(page,label+'-question');
    }
    const choice=q.id===missed.id?wrong:q.answer;
    await page.locator('[data-choice="'+choice+'"]').click();
    const feedback=await page.locator('#feedback-slot').innerText();
    assert.ok(feedback.includes(q.explanation));assert.ok(feedback.includes(q.transfer));assert.ok(feedback.includes(q.options[q.answer]));
    answered.push(q.id);await page.locator('#next-button').click();
  }
  assert.equal(new Set(answered).size,16);
  assert.ok((await page.locator('#first-try-summary').innerText()).includes('15 of 16'));
  assert.equal(await page.locator('.review-item').count(),16);
  const firstSummary=await page.locator('#first-try-summary').innerText();
  const originalMastery=await page.locator('.mastery-box').innerText();
  const missedDetail=page.locator('.review-item').filter({has:page.locator('[data-reflection-item="'+missed.id+'"]')});
  await missedDetail.locator('summary').click();
  assert.ok((await missedDetail.innerText()).includes(missed.options[wrong]));
  const reflection='B beats each opponent while only 7 rank B first.\nA pairwise tally uses lower preferences.';
  const application='Keep full rankings when a later comparison needs relative order.';
  await page.locator('[data-reflection-item="'+missed.id+'"]').fill(reflection);
  await page.locator('#application-reflection').fill(application);
  await page.locator('#practice-button').click();
  assert.equal(await page.locator('.practice-card h2').innerText(),missed.prompt);
  await page.locator('[data-practice-choice="'+missed.answer+'"]').click();
  await page.locator('#practice-next').click();
  assert.equal(await page.locator('#first-try-summary').innerText(),firstSummary);
  assert.equal(await page.locator('.mastery-box').innerText(),originalMastery);
  assert.equal(await page.locator('[data-reflection-item="'+missed.id+'"]').inputValue(),reflection);
  assert.equal(await page.locator('#application-reflection').inputValue(),application);
  assert.ok((await page.locator('#practice-status').innerText()).includes('1 of 1 correctly on retry'));
  const notesPath=await download(page,()=>page.locator('#save-notes-button').click(),label+'-study-notes.txt');
  const notes=fs.readFileSync(notesPath,'utf8');
  for(const q of deck.items)for(const value of [q.prompt,q.explanation,q.transfer,q.options[q.answer]])assert.ok(notes.includes(value),q.id);
  for(const line of reflection.split('\n'))assert.ok(notes.includes('  > '+line));
  assert.ok(notes.includes('  > '+application));
  assert.ok(notes.includes('Your first answer: '+missed.options[wrong]));
  assert.ok(notes.includes('Practice answer: '+missed.options[missed.answer]));
  assert.ok(notes.includes('15 of 16 connections correct on the first try.'));
  assert.ok(notes.includes('Complete: 1 of 1 practice answers recorded; 1 correct on retry.'));
  assert.ok(notes.includes(deck.attribution));assert.ok(notes.includes(deck.license));
  assert.equal(await page.locator('#first-try-summary').innerText(),firstSummary);
  await screenshot(page,label+'-review');
  await page.close();
  return {answered,firstCorrect:15,practiceCorrect:1,reflectionsRetained:true,notes:filePin(notesPath),viewport:context.pages().length?'existing':label};
}
(async()=>{
  try {
    report.inputs=['source/demo.html','source/catalog.html','source/explore.html','source/courses/ranked-voting.json','source/courses/ranked-voting.md','source/offline/recallweave-offline.zip','original/catalog.html','original/explore.html'].map(p=>filePin(path.join(stage,p)));
    report.runner=filePin(__filename);
    browser=await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
    report.browserVersion=browser.version();
    await group('original published catalog does not contain the new course',async()=>{
      const c=await fresh({width:1280,height:900}),p=await c.newPage();
      await p.goto(pathToFileURL(path.join(stage,'original/catalog.html')).href);
      assert.equal(await p.locator('[data-course]').count(),43);
      await p.locator('#catalog-search').fill('same rankings');
      assert.equal(await p.locator('[data-course]:visible').count(),0);
      assert.ok((await p.locator('#catalog-message').innerText()).includes('No courses match'));
      await p.goto(pathToFileURL(path.join(stage,'original/explore.html')).href);
      await p.locator('#course-search').fill('same rankings');
      assert.equal(await p.locator('[data-course]:visible').count(),0);
      await c.close();return {originalCourses:43,newCourseMatches:0};
    });
    let downloadedCourse;
    await group('candidate directory links and exact catalog course download',async()=>{
      const c=await fresh({width:1280,height:900}),p=await c.newPage();
      await p.goto(pathToFileURL(path.join(source,'explore.html')).href);
      assert.equal(await p.locator('[data-course]').count(),44);
      await p.locator('#course-search').fill('same rankings');
      assert.equal(await p.locator('[data-course]:visible').count(),1);
      const card=p.locator('[data-course]:visible');
      for(const suffix of ['ranked-voting.json','ranked-voting.md'])assert.equal(await card.locator('a[href$="'+suffix+'"]').count(),1);
      await screenshot(p,'directory');
      await p.goto(pathToFileURL(path.join(source,'catalog.html')).href);
      await p.locator('#catalog-search').fill('pairwise-majorities');
      assert.equal(await p.locator('[data-course]:visible').count(),1);
      assert.equal(await p.locator('[data-course="ranked-voting.json"] .course-count').innerText(),'16 questions · 4 concepts');
      downloadedCourse=await download(p,()=>p.locator('[data-download="ranked-voting.json"]').click(),'catalog-ranked-voting.json');
      assert.deepEqual(fs.readFileSync(downloadedCourse),raw);
      await screenshot(p,'catalog');await c.close();
      return {candidateCourses:44,guideAndCourseLinks:true,download:filePin(downloadedCourse)};
    });
    await group('desktop real learner: preview, sixteen answers, retry, reflections and downloaded notes',async()=>{
      assert.ok(downloadedCourse);const c=await fresh({width:1280,height:900});
      try{return await learnerFlow(c,path.join(source,'demo.html'),downloadedCourse,'desktop');}finally{await c.close();}
    });
    await group('extracted offline pack: checksums, mobile learner and complete downloaded notes',async()=>{
      const code="import pathlib,zipfile,json,hashlib; root=pathlib.Path(r'"+stage.replaceAll("'","\\'")+"'); z=zipfile.ZipFile(root/'source/offline/recallweave-offline.zip'); assert z.testzip() is None; z.extractall(root/'unpacked'); p=root/'unpacked/RecallWeave'; m=json.loads((p/'SHA256SUMS.json').read_text()); [(lambda b,e: (len(b)==e['bytes'] and hashlib.sha256(b).hexdigest()==e['sha256']) or (_ for _ in ()).throw(AssertionError(e['path'])) )((p/e['path']).read_bytes(),e) for e in m['files']]; print(json.dumps({'members':len(z.namelist()),'verified':len(m['files'])}))";
      const r=spawnSync('python',['-B','-c',code],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);
      const unpacked=path.join(stage,'unpacked/RecallWeave');
      assert.deepEqual(fs.readFileSync(path.join(unpacked,'courses/ranked-voting.json')),raw);
      assert.deepEqual(fs.readFileSync(path.join(unpacked,'demo.html')),fs.readFileSync(path.join(source,'demo.html')));
      const c=await fresh({width:390,height:844});
      try{
        const p=await c.newPage();await p.goto(pathToFileURL(path.join(unpacked,'catalog.html')).href);
        await p.locator('#catalog-search').fill('same rankings');
        const d=await download(p,()=>p.locator('[data-download="ranked-voting.json"]').click(),'offline-ranked-voting.json');
        assert.deepEqual(fs.readFileSync(d),raw);await p.close();
        const learner=await learnerFlow(c,path.join(unpacked,'demo.html'),d,'mobile-offline');
        return {pack:JSON.parse(r.stdout),learner};
      }finally{await c.close();}
    });
    assert.deepEqual(report.pageErrors,[]);
    assert.ok(report.requests.every(url=>url.startsWith('file:')||url.startsWith('blob:')),'Only file/blob requests');
  }catch(e){report.fatal=e.stack;}
  finally{
    if(browser)await browser.close();
    report.finishedUTC=new Date().toISOString();
    report.status=!report.fatal&&report.groups.length===4&&report.groups.every(g=>g.status==='passed')?'passed':'failed';
    fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({status:report.status,groups:report.groups,pageErrors:report.pageErrors,fatal:report.fatal,requests:report.requests,downloads:report.downloads},null,2));
    if(report.status!=='passed')process.exitCode=1;
  }
})();

