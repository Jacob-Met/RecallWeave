'use strict';
// Actual installed Chromium receiving for the fixed synthetic Bloom teaching example.
// File/download observer pattern follows the separately qualified Bloom course receiver.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const stage=path.resolve(process.argv[2]||'.'),source=path.join(stage,'source');
const output=path.join(stage,process.argv[3]||'browser-results');
fs.mkdirSync(output,{recursive:true});
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const pin=p=>{const b=fs.readFileSync(p);return {path:path.relative(stage,p).split(path.sep).join('/'),bytes:b.length,sha256:hash(b)};};
const deck=fs.readFileSync(path.join(source,'courses/bloom-filters.json'));
const report={startedUTC:new Date().toISOString(),pid:process.pid,device:{hostname:os.hostname(),user:os.userInfo().username,platform:process.platform,release:os.release(),arch:process.arch,node:process.version,playwright:require(path.join(process.env.PLAYWRIGHT_MODULE||'playwright','package.json')).version},groups:[],inputs:[],downloads:[],screenshots:[],requests:[],pageErrors:[],fatal:null};
let browser;
const text=(p,id)=>p.locator('#'+id).innerText();
async function bits(p,id){return p.locator('#'+id+' li').evaluateAll(xs=>xs.filter(x=>x.dataset.bit==='1').map(x=>Number(x.dataset.index)));}
async function live(p){return {members:await text(p,'exact-members'),bits:await bits(p,'live-bits'),query:await p.locator('#query-key').inputValue(),probability:await text(p,'fixed-count')};}
async function group(name,fn){try{const detail=await fn();report.groups.push({name,status:'passed',detail});console.log('PASS '+name);}catch(e){report.groups.push({name,status:'failed',error:e.stack});console.log('FAIL '+name+': '+e.message);}}
async function context(viewport){const c=await browser.newContext({viewport,offline:true,acceptDownloads:true});c.on('request',r=>report.requests.push(r.url()));c.on('page',p=>p.on('pageerror',e=>report.pageErrors.push(e.message)));return c;}
async function shot(p,name){const file=path.join(output,name+'.png');await p.screenshot({path:file,fullPage:true});report.screenshots.push(pin(file));}
async function saveDeck(p,name){const pending=p.waitForEvent('download');await p.locator('#download-course').click();const d=await pending,file=path.join(output,name);assert.equal(d.suggestedFilename(),'bloom-filters.json');await d.saveAs(file);assert.equal(await d.failure(),null);assert.deepEqual(fs.readFileSync(file),deck);report.downloads.push({...pin(file),suggestedFilename:d.suggestedFilename()});return pin(file);}
async function insert(p,key){await p.locator('#insert-buttons [data-key="'+key+'"]').click();}
async function preset(p){await p.locator('#load-example').click();}

(async()=>{
 try{
  report.inputs=['source/src/bloom-filters.mjs','source/src/bloom-filters-ui.mjs','source/src/deck.mjs','source/courses/bloom-filters-explorer.template.html','source/courses/bloom-filters-explorer.html','source/courses/bloom-filters.json','source/tools/make_bloom_filters_explorer.mjs','source/tests/bloom-filters-explorer.test.mjs','source/docs/BLOOM_FILTERS_EXPLORER.md','source/catalog/companions.json','source/explore.html','original/explore.html'].map(x=>pin(path.join(stage,x)));
  report.runner=pin(__filename);
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});report.browserVersion=browser.version();
  await group('maintained directory gains exactly the offered Bloom companion',async()=>{
   const c=await context({width:1280,height:900}),p=await c.newPage();
   try{
    await p.goto(pathToFileURL(path.join(stage,'original/explore.html')).href);await p.locator('#course-search').fill('bloom filters');
    assert.equal(await p.locator('[data-course]:visible').count(),1);assert.equal(await p.locator('[data-course]:visible .lab-links a').count(),0);
    await p.goto(pathToFileURL(path.join(source,'explore.html')).href);assert.equal(await p.locator('[data-course]').count(),45);await p.locator('#course-search').fill('bloom filters');
    const card=p.locator('[data-course]:visible');assert.equal(await card.count(),1);assert.equal(await card.locator('.lab-links a').count(),1);
    assert.equal(await card.locator('.lab-links a').getAttribute('href'),'courses/bloom-filters-explorer.html');await card.locator('.lab-links a').click();await p.locator('html.ready').waitFor();assert.equal(await text(p,'exact-members'),'A, B');
    return {courses:45,originalLabsForBloom:0,candidateLabsForBloom:1,actualLinkOpened:true};
   }finally{await c.close();}
  });
  const c=await context({width:1280,height:1000}),p=await c.newPage();
  await p.goto(pathToFileURL(path.join(source,'courses/bloom-filters-explorer.html')).href);await p.locator('html.ready').waitFor();
  await group('initial shared bits and fixed queries distinguish exact membership',async()=>{
   await preset(p);assert.deepEqual(await bits(p,'live-bits'),[1,4,6]);assert.equal(await text(p,'exact-members'),'A, B');assert.equal(await text(p,'fixed-count'),'9 / 64');
   assert.equal(await p.locator('#classification').getAttribute('data-kind'),'false-positive');assert.equal(await text(p,'filter-answer'),'Maybe present');
   for(const [key,kind]of [['A','true-positive'],['Y','true-negative'],['C','false-positive'],['X','false-positive'],['X','false-positive']]){
    await p.locator('#query-key').selectOption(key);assert.equal(await p.locator('#classification').getAttribute('data-kind'),kind);assert.deepEqual(await bits(p,'live-bits'),[1,4,6]);assert.equal(await text(p,'exact-members'),'A, B');
   }
   await shot(p,'desktop-initial');return {exactMembers:'A, B',setPositions:[1,4,6],queryKinds:['true-positive','true-negative','false-positive'],repeatQueryUnchanged:true};
  });
  await group('inserted false-positive key changes exact membership while repeat insertion is idempotent',async()=>{
   await preset(p);await insert(p,'X');assert.equal(await text(p,'exact-members'),'A, B, X');assert.deepEqual(await bits(p,'live-bits'),[1,4,6]);assert.equal(await p.locator('#classification').getAttribute('data-kind'),'true-positive');
   const before=await live(p);await insert(p,'X');assert.deepEqual(await live(p),before);assert.ok((await text(p,'operation-status')).includes('already present'));
   return {members:'A, B, X',bitsUnchanged:true,repeatedInsertionUnchanged:true};
  });
  await group('empty and repeated-position states clear stale deletion preview',async()=>{
   await p.locator('#reset').click();assert.equal(await text(p,'exact-members'),'Empty');assert.deepEqual(await bits(p,'live-bits'),[]);assert.equal(await text(p,'fixed-count'),'0 / 64');assert.ok(await p.locator('#remove-key').isDisabled());assert.ok(await p.locator('#deletion-preview').isHidden());assert.ok(await p.locator('#deletion-empty').isVisible());
   await insert(p,'Z');await p.locator('#query-key').selectOption('Z');assert.deepEqual(await bits(p,'live-bits'),[2]);assert.equal(await text(p,'fixed-count'),'1 / 64');assert.equal(await p.locator('#classification').getAttribute('data-kind'),'true-positive');
   assert.deepEqual(await bits(p,'unsafe-bits'),[]);assert.deepEqual(await bits(p,'rebuilt-bits'),[]);assert.equal(await text(p,'remaining-members'),'Empty');assert.deepEqual(await bits(p,'live-bits'),[2]);
   return {emptyPreviewDisabled:true,ZPositions:[2,2],singleSetBit:2,oneAcceptedPair:true};
  });
  await group('deletion copies preserve live state and expose both shared-bit losses',async()=>{
   await preset(p);const before=await live(p);assert.equal(await p.locator('#remove-key').inputValue(),'A');
   assert.deepEqual(await bits(p,'unsafe-bits'),[6]);assert.deepEqual(await bits(p,'rebuilt-bits'),[4,6]);assert.equal(await p.locator('#deletion-detail').getAttribute('data-missed'),'B');
   await p.locator('#remove-key').selectOption('B');assert.deepEqual(await bits(p,'unsafe-bits'),[1]);assert.deepEqual(await bits(p,'rebuilt-bits'),[1,4]);assert.equal(await p.locator('#deletion-detail').getAttribute('data-missed'),'A');assert.deepEqual(await live(p),before);
   await insert(p,'Y');assert.equal(await p.locator('#remove-key').inputValue(),'B');assert.equal(await text(p,'exact-members'),'A, B, Y');
   await preset(p);assert.equal(await p.locator('#remove-key').inputValue(),'A');assert.deepEqual(await live(p),before);
   return {removeALoses:'B',removeBLoses:'A',previewNeverMutatedLive:true,validSelectionRetained:true,presetRestoresQueryAndRemoval:true};
  });
  await group('all 64 rendered ordered pairs track state while the separate construction table stays fixed',async()=>{
   await preset(p);const randomBefore=await p.locator('#random-body').innerText();
   for(const positions of [[1,4,6],[1,3,4,6]]){
    if(positions.length===4)await insert(p,'Y');
    const cells=await p.locator('#fixed-body td').evaluateAll(xs=>xs.map(x=>({a:Number(x.dataset.first),b:Number(x.dataset.second),accepted:x.dataset.accepted==='true',symbol:x.textContent})));
    assert.equal(cells.length,64);assert.equal(new Set(cells.map(x=>x.a+','+x.b)).size,64);
    for(const cell of cells){const expected=positions.includes(cell.a)&&positions.includes(cell.b);assert.equal(cell.accepted,expected);assert.equal(cell.symbol,expected?'✓':'·');}
    assert.equal(cells.filter(x=>x.accepted).length,positions.length**2);assert.equal(await text(p,'fixed-count'),positions.length**2+' / 64');
    assert.equal(await p.locator('#random-body').innerText(),randomBefore);assert.equal(await text(p,'random-count'),'10 / 16 = 5 / 8');
   }
   assert.deepEqual(await p.locator('#random-body tr').evaluateAll(rows=>rows.map(r=>Array.from(r.children).map(c=>c.textContent))),[['(0, 0)','1','1 / 4'],['(0, 1)','2','4 / 4'],['(1, 0)','2','4 / 4'],['(1, 1)','1','1 / 4']]);
   return {states:[9,16],all64CoordinatesChecked:true,separateRows:[1,4,4,1],independentConstructionRetained:true};
  });
  await group('real keyboard insertion and selection retain useful focus',async()=>{
   await p.locator('#reset').click();const button=p.locator('#insert-buttons [data-key="Z"]');await button.focus();await p.keyboard.press('Enter');assert.equal(await text(p,'exact-members'),'Z');assert.ok(await button.evaluate(e=>e===document.activeElement));
   await p.locator('#query-key').focus();await p.keyboard.press('End');assert.equal(await p.locator('#query-key').inputValue(),'Z');assert.equal(await p.locator('#classification').getAttribute('data-kind'),'true-positive');assert.ok(await p.locator('#query-key').evaluate(e=>e===document.activeElement));
   return {keyboardEnterInsertedZ:true,focusRetained:true,keyboardSelectQueriedZ:true};
  });
  await group('edited desktop state downloads the exact frozen lesson',async()=>{
   const before=await live(p),download=await saveDeck(p,'desktop-bloom-filters.json');assert.deepEqual(await live(p),before);return {download,stateUnchanged:true};
  });
  await c.close();
  await group('moved standalone page opens at 390px and downloads without sibling files',async()=>{
   const moved=path.join(output,'standalone');fs.mkdirSync(moved,{recursive:true});const file=path.join(moved,'explorer.html');fs.copyFileSync(path.join(source,'courses/bloom-filters-explorer.html'),file);assert.deepEqual(fs.readdirSync(moved),['explorer.html']);
   const narrow=await context({width:390,height:844}),q=await narrow.newPage();
   try{
    await q.goto(pathToFileURL(file).href);await q.locator('html.ready').waitFor();assert.equal(await text(q,'exact-members'),'A, B');assert.deepEqual(await bits(q,'live-bits'),[1,4,6]);
    assert.ok(await q.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow');
    for(const id of ['live-bits','unsafe-bits','rebuilt-bits','fixed-body']){const r=await q.locator('#'+id).boundingBox();assert.ok(r.x>=0&&r.x+r.width<=391,id+' stays in viewport');}
    await shot(q,'mobile-standalone');await insert(q,'X');const downloaded=await saveDeck(q,'mobile-bloom-filters.json');
    await q.reload();await q.locator('html.ready').waitFor();assert.equal(await text(q,'exact-members'),'A, B');assert.equal(await q.locator('#classification').getAttribute('data-kind'),'false-positive');
    return {viewport:{width:390,height:844},noHorizontalOverflow:true,siblings:['explorer.html'],reopenRestoresExample:true,download:downloaded};
   }finally{await narrow.close();}
  });
  report.inputReadback=report.inputs.map(e=>{const a=pin(path.join(stage,e.path));assert.deepEqual(a,e);return a;});assert.deepEqual(pin(__filename),report.runner);report.sourceBodiesUnchanged=true;
  assert.deepEqual(report.pageErrors,[]);assert.ok(report.requests.every(url=>url.startsWith('file:')||url.startsWith('blob:')),'No external requests');
 }catch(e){report.fatal=e.stack;}
 finally{
  if(browser)await browser.close();report.finishedUTC=new Date().toISOString();report.status=!report.fatal&&report.groups.length===9&&report.groups.every(x=>x.status==='passed')?'passed':'failed';
  fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,groups:report.groups,requests:report.requests,pageErrors:report.pageErrors,fatal:report.fatal},null,2));if(report.status!=='passed')process.exitCode=1;
 }
})();
