import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { expectedPrefixTable, certificateCost } from './core-oracle-v1.mjs';

const source = path.resolve(process.argv[2]), out = path.resolve(process.argv[3]), visible = path.resolve(process.argv[4]);
const puppeteer = (await import(pathToFileURL(process.env.PUPPETEER_PATH || '/home/jacob/.local/lib/node_modules/@wonderwhy-er/desktop-commander/node_modules/puppeteer/lib/puppeteer/puppeteer.js'))).default;
await fs.mkdir(out,{recursive:false});await fs.mkdir(visible,{recursive:false});
const profile=path.join(visible,'profile'),downloads=path.join(visible,'downloads'),assets=path.join(visible,'assets');
await fs.mkdir(downloads);await fs.mkdir(assets);
const sha=b=>createHash('sha256').update(b).digest('hex');
const artifact=await fs.readFile(path.join(source,'courses/edit-distance-explorer.html'));
const learner=await fs.readFile(path.join(source,'demo.html'));
await fs.writeFile(path.join(assets,'explorer.html'),artifact);await fs.writeFile(path.join(assets,'learner.html'),learner);
const courseBytes=await fs.readFile(path.join(source,'courses/edit-distance.json')),deck=JSON.parse(courseBytes);
const guideBytes=await fs.readFile(path.join(source,'courses/edit-distance.md'));
const report={schema:'recallweave.independent-edit-distance.browser.v1',source,tree:'eb5ab352400a643bd85768b46b81921820a5f233',started:new Date().toISOString(),node:process.version,receiverSha256:sha(await fs.readFile(new URL(import.meta.url))),assets:{artifact:sha(artifact),learner:sha(learner),course:sha(courseBytes),guide:sha(guideBytes)},groups:[],downloads:[],requests:[],requestFailures:[],pageErrors:[],consoleErrors:[],clicks:[]};
let browser,explorer,learn,cdp;
const files=new Map();
async function snapshot() {
  const state={};
  for(const [name,page] of [['explorer',explorer],['learner',learn]]){
    if(!page||page.isClosed())continue;
    try{state[name]=await page.evaluate(()=>({url:location.href,visibility:document.visibilityState,title:document.title,status:document.querySelector('#edit-status')?.textContent,deckStatus:document.querySelector('#deck-status')?.textContent,body:document.body.innerText.slice(0,18000)}));}catch(error){state[name]={error:String(error)};}
  }
  state.files=await Promise.all([...files.values()].map(async x=>{try{const b=await fs.readFile(path.join(downloads,x.guid));return {...x,bytes:b.length,sha256:sha(b)};}catch(error){return {...x,error:String(error)}}}));
  return state;
}
async function click(page,selector){
  await page.bringToFront();
  const el=await page.waitForSelector(selector,{visible:true,timeout:15000});
  assert.equal(await el.evaluate(n=>!!n.disabled),false,'Enabled target required: '+selector);
  await el.evaluate(n=>n.scrollIntoView({behavior:'instant',block:'center',inline:'center'}));
  const box=await el.boundingBox();assert(box,selector);
  const point={x:box.x+box.width/2,y:box.y+box.height/2};
  const hit=await el.evaluate((n,p)=>{const h=document.elementFromPoint(p.x,p.y);return {hit:!!h&&(h===n||n.contains(h)),tag:h?.tagName,text:h?.textContent?.slice(0,100)};},point);
  report.clicks.push({selector,point,...hit});assert(hit.hit,'Click hit mismatch for '+selector);
  await page.mouse.click(point.x,point.y);
}
async function field(page,selector,value){
  await click(page,selector);await page.keyboard.down('Control');await page.keyboard.press('A');await page.keyboard.up('Control');await page.keyboard.press('Backspace');
  if(value)await page.keyboard.type(value);
  assert.equal(await page.$eval(selector,n=>n.value),value);
}
async function waitForDownload(action,name){
  const seen=new Set(files.keys());await action();
  const deadline=Date.now()+20000;
  let item;
  while(Date.now()<deadline){
    item=[...files.values()].find(x=>!seen.has(x.guid)&&x.state==='completed');
    if(item)break;
    await new Promise(r=>setTimeout(r,50));
  }
  assert(item,'Actual download completed: '+name);
  const filename=path.join(downloads,item.guid),b=await fs.readFile(filename);
  const entry={...item,label:name,bytes:b.length,sha256:sha(b),path:filename};
  report.downloads.push(entry);await fs.writeFile(path.join(out,name),b);return {entry,bytes:b,path:filename};
}
async function compute(values){
  for(const [id,value]of Object.entries(values))await field(explorer,'#edit-'+id,String(value));
  await click(explorer,'#edit-compute');
  await explorer.waitForFunction(()=>!document.querySelector('#edit-result').hidden,{timeout:15000});
}
async function receivedTable(sourceText,targetText,costs){
  const actual=await explorer.$$eval('#edit-matrix tbody tr',rows=>rows.map(row=>[...row.querySelectorAll('button')].map(b=>Number(b.textContent))));
  assert.deepEqual(actual,expectedPrefixTable(sourceText,targetText,costs));
  assert.equal(Number(await explorer.$eval('#edit-minimum',n=>n.textContent)),actual.at(-1).at(-1));
}
async function chooseCourse(filename){
  await learn.bringToFront();const chooser=learn.waitForFileChooser();await click(learn,'#deck-file');await(await chooser).accept([filename]);
  await learn.waitForFunction(()=>!document.querySelector('#deck-preview').hidden||document.querySelector('#deck-status').classList.contains('deck-error'),{timeout:15000});
  assert.equal(await learn.$eval('#deck-preview',n=>n.hidden),false,await learn.$eval('#deck-status',n=>n.textContent));
}
async function group(name,fn){
  try{const detail=await fn();report.groups.push({name,passed:true,detail});}
  catch(error){report.groups.push({name,passed:false,error:error.stack,state:await snapshot()});}
  await fs.writeFile(path.join(out,'receipt.partial.json'),JSON.stringify(report,null,2)+'\n');
}
try{
  browser=await puppeteer.launch({executablePath:'/snap/bin/chromium',headless:true,userDataDir:profile,args:['--disk-cache-size=1048576','--disable-background-networking']});
  report.chrome=await browser.version();cdp=await browser.target().createCDPSession();
  await cdp.send('Browser.setDownloadBehavior',{behavior:'allowAndName',downloadPath:downloads,eventsEnabled:true});
  cdp.on('Browser.downloadWillBegin',event=>files.set(event.guid,{guid:event.guid,suggestedFilename:event.suggestedFilename,url:event.url,state:'started'}));
  cdp.on('Browser.downloadProgress',event=>{const item=files.get(event.guid);if(item)Object.assign(item,{state:event.state,totalBytes:event.totalBytes,receivedBytes:event.receivedBytes});});
  const setup=async name=>{
    const page=await browser.newPage();await page.setViewport({width:1180,height:900});await page.setOfflineMode(true);
    page.on('request',q=>report.requests.push({page:name,url:q.url()}));
    page.on('requestfailed',q=>report.requestFailures.push({page:name,url:q.url(),error:q.failure()?.errorText}));
    page.on('pageerror',e=>report.pageErrors.push({page:name,error:e.message}));
    page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push({page:name,text:m.text()});});
    return page;
  };
  explorer=await setup('explorer');learn=await setup('learner');
  await explorer.goto(pathToFileURL(path.join(assets,'explorer.html')).href,{waitUntil:'load',timeout:20000});
  await learn.goto(pathToFileURL(path.join(assets,'learner.html')).href,{waitUntil:'load',timeout:20000});
  await group('offline table/alignment, literal input retirement and actual artifact downloads',async()=>{
    await compute({source:'ab',target:'ba',insert:1,delete:1,substitute:1});
    await receivedTable('ab','ba',{insert:1,delete:1,substitute:1});
    assert.match(await explorer.$eval('#edit-details',n=>n.textContent),/3 predecessor choices tie/);
    await click(explorer,'#edit-matrix button[data-row="2"][data-column="2"]');await explorer.keyboard.press('ArrowLeft');
    assert.equal(await explorer.$eval('#edit-column',n=>n.value),'1');
    const values={source:'ab',target:'ba',insert:1,delete:1,substitute:1};
    for(const [id,value]of [['source',' a'],['target','a '],['insert',2],['delete',3],['substitute',4]]){
      await field(explorer,'#edit-'+id,String(value));values[id]=value;
      assert.equal(await explorer.$eval('#edit-result',n=>n.hidden),true);
      assert.equal(await explorer.$eval('#edit-download-experiment',n=>n.disabled),true);
      assert.equal(await explorer.$$eval('#edit-matrix button',n=>n.length),0);
      await click(explorer,'#edit-compute');await receivedTable(values.source,values.target,{insert:values.insert,delete:values.delete,substitute:values.substitute});
    }
    await field(explorer,'#edit-source','x'.repeat(17));await click(explorer,'#edit-compute');
    assert.equal(await explorer.$eval('#edit-result',n=>n.hidden),true);
    assert.match(await explorer.$eval('#edit-status',n=>n.textContent),/Cannot compute/);
    await compute({source:'é',target:'e\u0301',insert:1,delete:1,substitute:1});
    await receivedTable('é','e\u0301',{insert:1,delete:1,substitute:1});
    const experiment=await waitForDownload(()=>click(explorer,'#edit-download-experiment'),'experiment.json');
    const run=JSON.parse(experiment.bytes);assert.equal(run.input.source,'é');assert.equal(run.input.target,'e\u0301');
    assert.equal(run.distance,2);assert.equal(certificateCost(run.input.source,run.input.target,run.alignment.map(x=>({op:x.kind,from:x.source,to:x.target})),run.input.costs),2);
    const guide=await waitForDownload(()=>click(explorer,'#edit-download-guide'),'worked-guide.md');assert.deepEqual(guide.bytes,guideBytes);
    await compute({source:'<b>',target:'<i>',insert:1,delete:1,substitute:1});await receivedTable('<b>','<i>',{insert:1,delete:1,substitute:1});
    assert.match(await explorer.$eval('#edit-input-summary',n=>n.textContent),/<b>/);assert.equal(await explorer.$$eval('#edit-input-summary b',n=>n.length),0);
    await explorer.setViewport({width:390,height:844});await explorer.bringToFront();
    const widths=await explorer.evaluate(()=>({doc:document.documentElement.scrollWidth,view:innerWidth}));assert(widths.doc<=widths.view+1);
    await explorer.screenshot({path:path.join(out,'phone-explorer.png'),fullPage:true});
    return {tieChoices:3,inputRetirements:5,invalidBuildRefused:true,literalAndUnicode:true,phone:widths};
  });
  await group('genuine course download into unchanged learner; preview/cancel, full review, practice and notes',async()=>{
    const course=await waitForDownload(()=>click(explorer,'#edit-download-lesson'),'downloaded-course.json');assert.deepEqual(course.bytes,courseBytes);
    await click(learn,'#start-button');await click(learn,'.choice');
    const prior=await learn.$eval('#session-content',n=>n.innerHTML);
    await chooseCourse(course.path);assert.equal(await learn.$eval('#deck-preview-title',n=>n.textContent),deck.title);
    assert.equal(await learn.$eval('#session-content',n=>n.innerHTML),prior);
    await click(explorer,'#edit-load-preset');assert.equal(await learn.$eval('#session-content',n=>n.innerHTML),prior);
    await click(learn,'#cancel-deck');assert.equal(await learn.$eval('#session-content',n=>n.innerHTML),prior);
    await chooseCourse(course.path);await click(learn,'#start-deck');
    const answers=[],seen=new Set();let missed;
    for(let n=0;n<deck.items.length;n++){
      const prompt=await learn.$eval('.question-card h2',n=>n.textContent),item=deck.items.find(x=>x.prompt===prompt);
      assert(item&&!seen.has(item.id));seen.add(item.id);
      const choice=n===0?(item.answer+1)%item.options.length:item.answer;if(n===0)missed=item;
      await click(learn,'[data-choice="'+choice+'"]');
      assert((await learn.$eval('#feedback-slot',n=>n.textContent)).includes(item.explanation));
      answers.push({item:item.id,choice,correct:choice===item.answer});await click(learn,'#next-button');
    }
    assert.equal(seen.size,12);assert.equal(await learn.$$eval('.review-item',n=>n.length),12);
    const before=await learn.evaluate(()=>({first:document.querySelector('#first-try-summary').textContent,answers:[...document.querySelectorAll('.review-answers')].map(n=>n.textContent),mastery:document.querySelector('.mastery-box').innerHTML}));
    assert.match(before.first,/11 of 12/);
    await click(learn,'#practice-button');assert.equal(await learn.$eval('.practice-card h2',n=>n.textContent),missed.prompt);
    await click(learn,'[data-practice-choice="'+missed.answer+'"]');await click(learn,'#practice-next');
    const after=await learn.evaluate(()=>({first:document.querySelector('#first-try-summary').textContent,answers:[...document.querySelectorAll('.review-answers')].map(n=>n.textContent),mastery:document.querySelector('.mastery-box').innerHTML}));
    assert.deepEqual(after,before);assert.match(await learn.$eval('#practice-status',n=>n.textContent),/1 of 1 correctly/);
    const reflection='An alignment is a cost certificate, not meaning. <literal> Ω';
    await field(learn,'#application-reflection',reflection);
    const notes=await waitForDownload(()=>click(learn,'#save-notes-button'),'study-notes.txt');
    const text=notes.bytes.toString('utf8');assert(text.includes(deck.title)&&text.includes(deck.attribution)&&text.includes(reflection)&&text.includes(missed.options[answers[0].choice]));
    await learn.screenshot({path:path.join(out,'learner-review.png'),fullPage:true});
    return {courseSha256:sha(course.bytes),priorSessionPreserved:true,questions:answers,firstReviewUnchangedAfterPractice:true,notesSha256:sha(notes.bytes)};
  });
  report.final=await snapshot();
  report.storage=await Promise.all([explorer,learn].map(page=>page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length}))));
  assert(report.storage.every(x=>x.local===0&&x.session===0));
  report.externalRequests=report.requests.filter(x=>/^https?:/.test(x.url));assert.deepEqual(report.externalRequests,[]);
  assert.deepEqual(report.pageErrors,[]);
}catch(error){report.outerError=error.stack;report.final=await snapshot();}
finally{
  if(browser)await browser.close().catch(e=>report.closeError=String(e));
  report.finished=new Date().toISOString();report.passed=!report.outerError&&report.groups.length===2&&report.groups.every(x=>x.passed);
  await fs.writeFile(path.join(out,'receipt.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({passed:report.passed,groups:report.groups.map(x=>({name:x.name,passed:x.passed})),downloads:report.downloads.length,out}));
  process.exitCode=report.passed?0:1;
}
