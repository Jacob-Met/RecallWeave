'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {pathToFileURL}=require('node:url');
const {createHash}=require('node:crypto');
const puppeteer=require('/Users/me/.npm/_npx/4b4c857f6efdfb61/node_modules/puppeteer/lib/puppeteer/puppeteer.js');
const here=__dirname;
const arg=(name,fallback)=>{const i=process.argv.indexOf(name);return i<0?fallback:process.argv[i+1];};
const source=path.resolve(arg('--source',path.join(here,'primary')));
const primary=path.resolve(arg('--primary',path.join(here,'primary')));
const output=path.resolve(arg('--output',path.join(here,'browser-baseline')));
const phase=arg('--phase','baseline');
const only=arg('--groups',null);
const hash=b=>({bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')});
const norm=s=>s.replace(/\r\n/g,'\n');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const publicIds=['csv-file','course-title','course-attribution','course-license','choose-csv','download-csv-template','check-csv','download-course','csv-status','csv-filename','course-preview','course-questions'];
const sourcePaths=['csv-course.html','templates/csv-course.html','src/course-csv.mjs','src/course-csv-ui.mjs','src/deck.mjs','author.html','demo.html'];
const pins=root=>sourcePaths.filter(p=>fs.existsSync(path.join(root,p))).map(p=>({path:p,...hash(fs.readFileSync(path.join(root,p)))}));
const primaryPins={
 'author.html':'185643e467d8567d2d7c5141d7d67a1fddaf11fdcc38fb7f98554a94ae7c3a4e',
 'demo.html':'c7f1877facf1c62c741373b6bd03b645ec351af3457da06c45988efde805701a',
 'src/deck.mjs':'621438c166ec4bfafd9d87c698a1d46cb1722f4fb92dcbb8d9f52fce682c338b'
};
(async()=>{
 const stat=fs.statfsSync(here),free=stat.bavail*stat.bsize;
 const preflight={at:new Date().toISOString(),free_bytes:free,launch_floor_bytes:300000000};
 if(free<preflight.launch_floor_bytes){console.log(JSON.stringify({schema:'recall-csv-root-browser.v1',phase,preflight,blocked:'Native browser launch floor not met; no browser or test started.'}));process.exitCode=75;return;}
 assert(!fs.existsSync(output),'Use a new receiving output directory.');
 for(const [p,h]of Object.entries(primaryPins))assert.equal(hash(fs.readFileSync(path.join(primary,p))).sha256,h,p);
 const oracleModule=await import(pathToFileURL(path.join(here,'independent-native-v3.mjs')).href);
 const oracle=await oracleModule.makeOracle(primary);
 const {metadata,fixture,makeCsv,rowsFor,rawDeck}=oracleModule;
 const before={primary:pins(primary),candidate:pins(source)};
 fs.mkdirSync(output);
 const fixtureDir=path.join(output,'fixtures');fs.mkdirSync(fixtureDir);
 const fixtureFiles={
  valid:path.join(fixtureDir,'independent-question-bank.csv'),
  checked:path.join(fixtureDir,'independent-expected.json'),
  malformed:path.join(fixtureDir,'malformed-later.csv'),
  badUtf8:path.join(fixtureDir,'invalid-utf8.csv'),
  slow:path.join(fixtureDir,'slow.csv'),
  replacement:path.join(fixtureDir,'replacement.csv')
 };
 const replacement=[{id:'replacement-009',concept:'Replacement',prompt:'A later selected file owns this preview.',options:['latest','retired'],answer:0,explanation:'Only the current selection belongs here.',transfer:'Keep a new file distinct.',prerequisites:[]}];
 const replacementCsv=makeCsv(rowsFor(replacement));
 const replacementJson=oracle.native.serializeDeck(rawDeck(replacement));
 fs.writeFileSync(fixtureFiles.valid,oracle.csv);fs.writeFileSync(fixtureFiles.checked,oracle.json);
 fs.writeFileSync(fixtureFiles.malformed,oracle.csv+'"broken","later"\n');
 const needle='Numeric identifiers are text',split=oracle.csv.indexOf(needle);assert(split>=0);
 const badUtf8=Buffer.concat([Buffer.from(oracle.csv.slice(0,split)),Buffer.from([0xc3,0x28]),Buffer.from(oracle.csv.slice(split+needle.length))]);
 assert.throws(()=>new TextDecoder('utf-8',{fatal:true}).decode(badUtf8));
 const replacementDecoded=new TextDecoder('utf-8').decode(badUtf8);
 assert(replacementDecoded.includes('\ufffd('));
 fs.writeFileSync(fixtureFiles.badUtf8,badUtf8);
 fs.writeFileSync(fixtureFiles.slow,oracle.csv);fs.writeFileSync(fixtureFiles.replacement,replacementCsv);
 const httpRequests=[],nonlocal=[],pageErrors=[],downloads=[],results=[];
 const server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  let root,relative;
  if(pathname.startsWith('/primary/')){root=primary;relative=pathname.slice(9);}
  else if(pathname.startsWith('/candidate/')){root=source;relative=pathname.slice(11);}
  else if(pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
  else{res.writeHead(404);res.end('Not found');return;}
  const target=path.resolve(root,relative);
  if(!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  try{const data=fs.readFileSync(target),ext=path.extname(target);const type=({'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.csv':'text/csv; charset=utf-8'})[ext]||'application/octet-stream';httpRequests.push({method:req.method,path:pathname,status:200,...hash(data)});res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});res.end(data);}
  catch(e){httpRequests.push({method:req.method,path:pathname,status:404});res.writeHead(404);res.end('Not found');}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const profile=path.join(output,'chrome-profile');
 let browser,version;
 let savedDeck=null;
 async function pageAt(route){
  const page=await browser.newPage();page.setDefaultTimeout(5000);await page.setViewport({width:1280,height:900,deviceScaleFactor:1});
  page.on('pageerror',error=>pageErrors.push({route,error:String(error)}));
  await page.setRequestInterception(true);
  page.on('request',request=>{const url=request.url();if(url.startsWith(base+'/')||url.startsWith('data:')||url.startsWith('blob:'))request.continue();else{nonlocal.push({url,route});request.abort();}});
  const response=await page.goto(base+route,{waitUntil:'load'});
  assert.equal(response.status(),200,'The requested capability must exist: '+route);
  return page;
 }
 async function frames(page){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
 async function fill(page,selector,value){
  await page.$eval(selector,el=>{el.focus();el.setSelectionRange(0,el.value.length);});
  await page.keyboard.press('Backspace');
  assert.equal(await page.$eval(selector,el=>el.value),'','Text-selection control must actually clear.');
  await page.type(selector,value);
  assert.equal(await page.$eval(selector,el=>el.value),value,'Typing must produce the requested literal value.');
 }
 async function metadataInto(page,meta=metadata){for(const name of ['title','attribution','license'])await fill(page,'#course-'+name,meta[name]);}
 async function metaValues(page){return page.evaluate(()=>Object.fromEntries(['title','attribution','license'].map(n=>[n,document.querySelector('#course-'+n).value])));}
 async function choose(page,file,{settle=true}={}){
  const [chooser]=await Promise.all([page.waitForFileChooser(),page.click('#choose-csv')]);
  await chooser.accept([file]);
  if(settle){await frames(page);await page.waitForFunction(()=>{const s=document.querySelector('#csv-status');return s&&s.textContent.length>0&&!/reading|loading/i.test(s.textContent);});}
 }
 async function retireAssert(page){const state=await page.evaluate(()=>({hidden:document.querySelector('#course-preview').hidden,disabled:document.querySelector('#download-course').disabled}));assert.deepEqual(state,{hidden:true,disabled:true});}
 async function check(page){assert.equal(await page.$eval('#check-csv',el=>el.disabled),false);await page.click('#check-csv');await page.waitForFunction(()=>!document.querySelector('#course-preview').hidden&&!document.querySelector('#download-course').disabled);}
 async function readyPage(){const page=await pageAt('/candidate/csv-course.html');await metadataInto(page);await choose(page,fixtureFiles.valid);await check(page);return page;}
 async function rejectedCheck(page){if(!await page.$eval('#check-csv',el=>el.disabled))await page.click('#check-csv');await frames(page);await retireAssert(page);assert((await page.$eval('#csv-status',el=>el.textContent)).trim().length>0);}
 async function download(page,selector,expectedName){
  const directory=path.join(output,'download-'+String(downloads.length+1).padStart(2,'0'));fs.mkdirSync(directory);
  const client=await page.createCDPSession();await client.send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:directory});
  await page.click(selector);
  const deadline=Date.now()+8000;let names=[];
  while(Date.now()<deadline){names=fs.readdirSync(directory);if(names.includes(expectedName)&&names.every(n=>!n.endsWith('.crdownload')))break;await delay(40);}
  assert.deepEqual(names,[expectedName],'Actual saved download name and completion');
  const target=path.join(directory,expectedName),data=fs.readFileSync(target);
  downloads.push({selector,name:expectedName,path:target,...hash(data)});await client.detach();return {path:target,data};
 }
 async function studioReceive(file){
  const page=await pageAt('/primary/author.html');
  const original=await page.$$eval('#author-form input,#author-form textarea,#author-form select',els=>els.map(e=>({id:e.id,value:e.value,checked:e.checked})));
  await (await page.$('#open-deck')).uploadFile(file);
  await page.waitForFunction(()=>!document.querySelector('#open-preview').hidden&&!document.querySelector('#replace-draft').disabled);
  assert.deepEqual(await page.$$eval('#author-form input,#author-form textarea,#author-form select',els=>els.map(e=>({id:e.id,value:e.value,checked:e.checked}))),original);
  assert.match(await page.$eval('#open-preview-summary',el=>el.textContent),/4 questions.*3 concepts/);
  await page.click('#replace-draft');
  for(const key of ['title','attribution','license'])assert.equal(await page.$eval('#deck-'+key,el=>el.value),metadata[key]);
  assert.equal(norm(await page.$eval('#question-prompt',el=>el.value)),norm(fixture[0].prompt));
  assert.match(await page.$eval('#question-count',el=>el.textContent),/4/);
  await page.click('#check-draft');
  await page.waitForFunction(()=>!document.querySelector('#author-preview').hidden&&!document.querySelector('#download-deck').disabled);
  assert.equal(await page.$$eval('#preview-content img',els=>els.length),0);
  await page.close();
 }
 async function learnerReceive(file){
  const page=await pageAt('/primary/demo.html');
  const beforeSession=await page.$eval('#session-content',el=>el.innerHTML);
  await (await page.$('#deck-file')).uploadFile(file);
  await page.waitForSelector('#start-deck');
  assert.equal(await page.$eval('#session-content',el=>el.innerHTML),beforeSession);
  assert.match(await page.$eval('.deck-preview-count',el=>el.textContent),/4 questions.*3 concepts/);
  await page.click('#start-deck');
  assert.equal(await page.$eval('#lesson-description',el=>el.textContent),metadata.title);
  const seen=[];
  for(let step=0;step<4;step++){
   await page.waitForSelector('[data-choice]:not([disabled])');
   const prompt=norm(await page.$eval('#session-content h2',el=>el.textContent));
   const item=fixture.find(q=>norm(q.prompt)===prompt);assert(item,'The rendered question belongs to the exact imported deck.');assert(!seen.includes(item.id));seen.push(item.id);
   assert.equal(await page.$$eval('[data-choice]',els=>els.length),item.options.length);
   await page.click('[data-choice="'+item.answer+'"]');
   const feedback=norm(await page.$eval('#feedback-slot',el=>el.textContent));
   assert(feedback.includes('That connection holds.'));assert(feedback.includes(norm(item.explanation)));assert(feedback.includes(norm(item.transfer)));
   assert.equal(await page.$$eval('#session-content img',els=>els.length),0);
   await page.click('#next-button');
  }
  assert.deepEqual([...seen].sort(),fixture.map(q=>q.id).sort());
  assert.equal(await page.$eval('#step-count',el=>el.textContent),'4 / 4');
  assert.equal(await page.evaluate(()=>window.__csvProbe),undefined);
  await page.close();
 }
 async function heldRead(page){
  await page.evaluate(()=>{
   const arrayBuffer=Blob.prototype.arrayBuffer,read=FileReader.prototype.readAsArrayBuffer;
   window.__heldReads=[];window.__releasedReads=0;window.__completedReads=0;
   Blob.prototype.arrayBuffer=async function(...args){
    if(this.name==='slow.csv'){await new Promise(resolve=>window.__heldReads.push(resolve));window.__releasedReads++;}
    const result=await Reflect.apply(arrayBuffer,this,args);
    if(this.name==='slow.csv')window.__completedReads++;return result;
   };
   FileReader.prototype.readAsArrayBuffer=function(file){
    if(file?.name==='slow.csv'){window.__heldReads.push(()=>{window.__releasedReads++;this.addEventListener('loadend',()=>window.__completedReads++,{once:true});Reflect.apply(read,this,[file]);});return;}
    return Reflect.apply(read,this,[file]);
   };
  });
 }
 async function release(page){
  await page.evaluate(()=>{const gates=window.__heldReads.splice(0);for(const gate of gates)gate();});
  await page.waitForFunction(()=>window.__completedReads===1);await frames(page);
 }
 async function group(name,fn){
  if(only&&!new RegExp(only).test(name))return;
  try{await fn();results.push({name,pass:true});}
  catch(error){results.push({name,pass:false,error:String(error.stack||error)});}
  finally{for(const page of await browser.pages())if(page.url()!=='about:blank')await page.close().catch(()=>{});}
  console.log(JSON.stringify({group:name,...results.at(-1)}));
 }
 try{
  browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,userDataDir:profile,args:['--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-sync']});
  version=await browser.version();
  await group('primary studio checked JSON positive and equivalent CSV refusal',async()=>{
   await studioReceive(fixtureFiles.checked);
   const page=await pageAt('/primary/author.html');
   const original=await page.$$eval('input,textarea,select',els=>els.filter(e=>e.type!=='file').map(e=>({id:e.id,value:e.value,checked:e.checked})));
   await (await page.$('#open-deck')).uploadFile(fixtureFiles.valid);
   await page.waitForFunction(()=>document.querySelector('#author-status').textContent.includes('not valid JSON'));
   assert.deepEqual(await page.$$eval('input,textarea,select',els=>els.filter(e=>e.type!=='file').map(e=>({id:e.id,value:e.value,checked:e.checked}))),original);
   assert.equal(await page.$eval('#open-preview',el=>el.hidden),true);await page.close();
  });
  await group('primary learner receives and answers all four independent questions',()=>learnerReceive(fixtureFiles.checked));
  await group('public CSV controls start empty labelled and unprepared',async()=>{
   const page=await pageAt('/candidate/csv-course.html');
   for(const id of publicIds)assert.equal(await page.$$eval('#'+id,els=>els.length),1,id);
   assert.deepEqual(await metaValues(page),{title:'',attribution:'',license:''});
   for(const key of ['title','attribution','license'])assert((await page.$eval('label[for="course-'+key+'"]',el=>el.textContent)).trim().length>0);
   for(const [id,label]of [['choose-csv','Choose CSV'],['download-csv-template','Download CSV template'],['check-csv','Check and preview'],['download-course','Download checked deck (.json)']])assert.equal((await page.$eval('#'+id,el=>el.textContent)).trim(),label);
   assert.equal(await page.$eval('#csv-status',el=>el.getAttribute('role')),'status');await retireAssert(page);await page.close();
  });
  await group('actual CSV template download is reusable with explicit metadata',async()=>{
   const page=await pageAt('/candidate/csv-course.html');const saved=await download(page,'#download-csv-template','course-question-bank.csv');
   const text=new TextDecoder('utf-8',{fatal:true}).decode(saved.data);
   assert(text.includes('correct_option'));assert(text.includes('option_1'));assert(saved.data.length>100);
   await metadataInto(page);await choose(page,saved.path);await check(page);
   const deck=await download(page,'#download-course','recallweave-course.json');const checked=oracle.native.parseDeck(deck.data.toString('utf8'));
   assert(checked.items.length>=1);for(const key of ['title','attribution','license'])assert.equal(checked[key],metadata[key]);await page.close();
  });
  await group('preview preserves literal content and downloads exact independent JSON',async()=>{
   const page=await readyPage();
   const preview=norm(await page.$eval('#course-questions',el=>el.textContent));
   for(const q of fixture){assert(preview.includes(norm(q.prompt)));for(const value of q.options)assert(preview.includes(value));}
   assert.equal(await page.$$eval('#course-preview img',els=>els.length),0);assert.equal(await page.evaluate(()=>window.__csvProbe),undefined);
   const saved=await download(page,'#download-course','recallweave-course.json');assert.equal(saved.data.toString('utf8'),oracle.json);savedDeck=saved.path;
   await page.screenshot({path:path.join(output,'desktop.png'),fullPage:true});await page.close();
  });
  await group('actual converter download opens in unchanged author studio',async()=>{assert(savedDeck,'Converter download must exist.');await studioReceive(savedDeck);});
  await group('actual converter download completes unchanged learner session',async()=>{assert(savedDeck,'Converter download must exist.');await learnerReceive(savedDeck);});
  await group('malformed UTF8 refuses a structurally valid otherwise acceptable CSV',async()=>{
   const page=await readyPage();await choose(page,fixtureFiles.badUtf8);await rejectedCheck(page);assert.deepEqual(await metaValues(page),metadata);await page.close();
  });
  await group('a malformed later record retires the complete previous prepared deck',async()=>{
   const page=await readyPage();await choose(page,fixtureFiles.malformed);await rejectedCheck(page);assert.deepEqual(await metaValues(page),metadata);await page.close();
  });
  await group('metadata edits retire output retain source and require explicit recheck',async()=>{
   const page=await readyPage();const changed={...metadata,title:'Changed title after checking'};
   await fill(page,'#course-title',changed.title);await retireAssert(page);
   assert.equal(await page.$eval('#csv-file',el=>el.files[0]?.name),'independent-question-bank.csv');
   await check(page);const saved=await download(page,'#download-course','recallweave-course.json');
   assert.equal(saved.data.toString('utf8'),oracle.native.serializeDeck(rawDeck(fixture,changed)));await page.close();
  });
  await group('choosing then cancelling retires source and preview but keeps metadata',async()=>{
   const page=await readyPage();
   const [chooser]=await Promise.all([page.waitForFileChooser(),page.click('#choose-csv')]);
   await retireAssert(page);assert.deepEqual(await metaValues(page),metadata);await chooser.cancel();await rejectedCheck(page);
   assert.deepEqual(await metaValues(page),metadata);await page.close();
  });
  await group('a late old file read cannot replace a newer selected checked deck',async()=>{
   const page=await pageAt('/candidate/csv-course.html');await metadataInto(page);await heldRead(page);
   await choose(page,fixtureFiles.slow,{settle:false});await page.waitForFunction(()=>window.__heldReads.length===1);
   await choose(page,fixtureFiles.replacement);await check(page);await release(page);
   assert((await page.$eval('#course-questions',el=>el.textContent)).includes(replacement[0].prompt));
   const saved=await download(page,'#download-course','recallweave-course.json');assert.equal(saved.data.toString('utf8'),replacementJson);await page.close();
  });
  await group('a cancelled pending file read cannot resurrect source or output',async()=>{
   const page=await pageAt('/candidate/csv-course.html');await metadataInto(page);await heldRead(page);
   await choose(page,fixtureFiles.slow,{settle:false});await page.waitForFunction(()=>window.__heldReads.length===1);
   const [chooser]=await Promise.all([page.waitForFileChooser(),page.click('#choose-csv')]);await chooser.cancel();
   await release(page);await rejectedCheck(page);assert.deepEqual(await metaValues(page),metadata);await page.close();
  });
  await group('390px controls and previews remain readable and keyboard file choice works',async()=>{
   const page=await readyPage();await page.setViewport({width:390,height:844,deviceScaleFactor:1});await frames(page);
   const layout=await page.evaluate(()=>{
    const ids=['course-title','course-attribution','course-license','choose-csv','download-csv-template','check-csv','download-course'];
    return{width:innerWidth,document:document.documentElement.scrollWidth,controls:ids.map(id=>{const el=document.getElementById(id),r=el.getBoundingClientRect(),style=getComputedStyle(el);return{id,left:r.left,right:r.right,width:r.width,height:r.height,font:Number.parseFloat(style.fontSize),visible:style.display!=='none'&&style.visibility!=='hidden'};})};
   });
   assert(layout.document<=layout.width+1,JSON.stringify(layout));
   for(const c of layout.controls){assert(c.visible&&c.width>0&&c.height>=24&&c.left>=-1&&c.right<=391&&c.font>=14,JSON.stringify(c));}
   fs.writeFileSync(path.join(output,'narrow-layout.json'),JSON.stringify(layout,null,2)+'\n');
   await page.screenshot({path:path.join(output,'narrow.png'),fullPage:true});
   await page.focus('#choose-csv');const [chooser]=await Promise.all([page.waitForFileChooser(),page.keyboard.press('Enter')]);await chooser.cancel();await retireAssert(page);await page.close();
  });
  await group('no script execution errors external requests or source changes',async()=>{
   assert.deepEqual(pageErrors,[]);assert.deepEqual(nonlocal,[]);
   assert.deepEqual({primary:pins(primary),candidate:pins(source)},before);
  });
 }finally{
  if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));
  if(fs.existsSync(profile))fs.rmSync(profile,{recursive:true,force:false});
 }
 const after={primary:pins(primary),candidate:pins(source)};
 const receipt={schema:'recall-csv-root-browser.v1',phase,at:new Date().toISOString(),preflight,node:process.version,platform:process.platform,browser:version,base,driver:'Real local file chooser and downloads; native typing with explicit DOM selection. Held synthetic reads intercept public Blob/FileReader boundaries only.',probe:hash(fs.readFileSync(__filename)),oracle:hash(Buffer.from(oracle.json)),source_before:before,source_after:after,fixtures:Object.entries(fixtureFiles).map(([name,p])=>({name,path:p,...hash(fs.readFileSync(p))})),downloads,requests:httpRequests,nonlocal,page_errors:pageErrors,groups:results,passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass).length,profile_removed:!fs.existsSync(profile)};
 fs.writeFileSync(path.join(output,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');
 console.log(JSON.stringify(receipt));process.exitCode=receipt.failed?1:0;
})().catch(error=>{console.error(error.stack||error);process.exitCode=2;});
