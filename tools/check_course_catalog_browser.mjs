#!/usr/bin/env node
/** Optional receiving: Node 22+, an installed Chromium, and an exclusive output directory. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {readFile, writeFile, mkdir, mkdtemp, rm, lstat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {parseDeck} from '../src/deck.mjs';
import {createCatalog} from '../src/course-catalog.mjs';
import {loadCatalogInputs, renderCatalogPage, buildCatalog} from './build-course-catalog.mjs';

const args=process.argv.slice(2);
const options={root:resolve(dirname(fileURLToPath(import.meta.url)),'..'), browser:'chromium'};
for(let i=0;i<args.length;i++){
  const name=args[i];
  if(!['--root','--browser','--output'].includes(name)||!args[i+1]||args[i+1].startsWith('--')) throw new Error('Usage: node tools/check_course_catalog_browser.mjs --browser /path/to/chromium --output new-directory [--root project-directory]');
  options[name.slice(2)]=args[++i];
}
if(!options.output)throw new Error('Choose a new --output directory for receiving evidence.');
const project=resolve(options.root), output=resolve(options.output);
const {catalog,sources}=await loadCatalogInputs(project);
await buildCatalog({root:project,check:true});
await mkdir(output);
const downloads=join(output,'downloads');
await mkdir(downloads);
const profile=await mkdtemp(join(tmpdir(),'recallweave-catalog-profile-'));
const report={format:'recallweave-course-catalog-receiving/1',status:'running',startedAt:new Date().toISOString(),project,output,executable:options.browser,node:process.version,checks:[],downloads:[],screenshots:[],pageErrors:[],requests:[],sourceSha256:{},bounds:['Actual system Chromium, a new owned profile, native file downloads and the existing learner file input.','Authored adversarial course text tests literal display; no subject-content or learning-efficacy claim.','Only one first-answer transition is exercised; existing full-course receiving remains with the course and importer authors.','The learner new tab is attached after opening; its initial navigation precedes this receiver\'s network observation and offline emulation.']};
const sourcePaths=[...new Set(['README.md','demo.html','author.html','src/deck.mjs','src/course-catalog.mjs','src/course-catalog-ui.mjs','courses/catalog-manifest.json','courses/catalog.template.html','courses/catalog.html','tools/build-course-catalog.mjs','tools/check_course_catalog_browser.mjs','tests/course-catalog.test.mjs',...catalog.courses.flatMap(c=>[c.deck,...c.links.map(l=>l.path)])])].sort();
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
for(const path of sourcePaths)report.sourceSha256[path]=sha(await readFile(join(project,path)));
let browser, socket, sessionId, targetId, browserLog='', sequence=0;
let launchError;
const pending=new Map(), downloadEvents=new Map();
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitFor(check,label){
  let lastError;
  for(let i=0;i<160;i++){
    try{if(await check())return;}catch(error){lastError=error;}
    await sleep(100);
  }
  throw new Error('Timed out: '+label+(lastError?' ('+lastError.message+')':''));
}
function command(method,params={},scoped=true){
  const id=++sequence;
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout: '+method));},10000);
    pending.set(id,{resolve,reject,timer});
    socket.send(JSON.stringify({id,method,params,...(scoped&&sessionId?{sessionId}:{})}));
  });
}
async function evaluate(expression){
  const result=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description??result.exceptionDetails.text);
  return result.result.value;
}
async function key(name,shift=false){
  const code={Enter:13,Tab:9,Home:36,End:35,ArrowDown:40,Escape:27}[name];
  for(const type of ['keyDown','keyUp'])await command('Input.dispatchKeyEvent',{type,key:name,code:name,windowsVirtualKeyCode:code,nativeVirtualKeyCode:code,modifiers:shift?8:0,...(name==='Enter'&&type==='keyDown'?{text:'\r',unmodifiedText:'\r'}:{})});
}
async function activate(selector){
  assert.ok(await evaluate('!!document.querySelector('+JSON.stringify(selector)+')'),'Missing '+selector);
  await evaluate('document.querySelector('+JSON.stringify(selector)+').focus()');
  await key('Enter');
}
async function enablePage(){
  await command('Page.enable');await command('Runtime.enable');await command('Network.enable');
  await command('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
}
async function navigate(url,width=1280,height=1000){
  await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
  await command('Page.navigate',{url});
  await waitFor(()=>evaluate('document.URL==='+JSON.stringify(url)+'&&document.readyState==="complete"'),'document '+url);
}
async function capture(name,selector){
  if(selector)await evaluate('document.querySelector('+JSON.stringify(selector)+').scrollIntoView({block:"start"})');
  const {data}=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  const bytes=Buffer.from(data,'base64');
  await writeFile(join(output,name),bytes,{flag:'wx'});
  report.screenshots.push({path:name,bytes:bytes.length,sha256:sha(bytes)});
}
function passed(name,detail){
  report.checks.push({name,passed:true,...(detail===undefined?{}:{detail})});
  console.log('PASS '+name);
}
async function visibleIds(){
  return evaluate('[...document.querySelectorAll("[data-course]")].filter(n=>!n.hidden).map(n=>n.dataset.course)');
}
async function download(course,directory=downloads){
  const known=new Set(downloadEvents.keys());
  await activate('[data-download="'+course.id+'"]');
  let event;
  await waitFor(()=>{
    event=[...downloadEvents.values()].find(e=>!known.has(e.guid)&&e.suggestedFilename===course.download&&e.state==='completed');
    return Boolean(event);
  },'completed browser download '+course.download);
  const path=join(directory,course.download), bytes=await readFile(path);
  assert.deepEqual(bytes,Buffer.from(course.text,'utf8'));
  assert.ok((await evaluate('document.querySelector("#download-status").textContent')).includes('Download requested: '+course.download));
  assert.equal(await evaluate('document.activeElement.dataset.download'),course.id);
  report.downloads.push({id:course.id,path,bytes:bytes.length,sha256:sha(bytes),eventGuid:event.guid,suggestedFilename:event.suggestedFilename});
  return path;
}
async function chooseFile(path){
  const {root}=await command('DOM.getDocument',{depth:1});
  const {nodeId}=await command('DOM.querySelector',{nodeId:root.nodeId,selector:'#deck-file'});
  assert.ok(nodeId,'Existing learner file input');
  await command('DOM.setFileInputFiles',{nodeId,files:[path]});
}
try{
  browser=spawn(options.browser,['--headless=new','--no-sandbox','--disable-gpu','--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run','--no-default-browser-check','--disk-cache-size=1048576','--media-cache-size=1048576','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe']});
  report.browserPid=browser.pid;
  report.profilePath=profile;
  browser.stderr.on('data',data=>{browserLog=(browserLog+data.toString()).slice(-16000);});
  browser.on('error',error=>{launchError=error;});
  let port,endpoint;
  await waitFor(async()=>{
    if(launchError)throw launchError;
    if(browser.exitCode!==null)throw new Error('Browser exited '+browser.exitCode+': '+browserLog);
    [port,endpoint]=(await readFile(join(profile,'DevToolsActivePort'),'utf8')).trim().split('\n');
    return Boolean(port&&endpoint);
  },'browser startup');
  socket=new WebSocket('ws://127.0.0.1:'+port+endpoint);
  socket.addEventListener('message',event=>{
    const message=JSON.parse(event.data);
    if(message.id){
      const request=pending.get(message.id);if(!request)return;
      pending.delete(message.id);clearTimeout(request.timer);
      if(message.error)request.reject(new Error(message.error.message));else request.resolve(message.result);
    }else if(message.method==='Runtime.exceptionThrown'){
      report.pageErrors.push(message.params.exceptionDetails.exception?.description??message.params.exceptionDetails.text);
    }else if(message.method==='Network.requestWillBeSent'){
      report.requests.push({url:message.params.request.url,sessionId:message.sessionId});
    }else if(message.method==='Browser.downloadWillBegin'){
      const e=message.params;downloadEvents.set(e.guid,{...e,state:'started'});
    }else if(message.method==='Browser.downloadProgress'){
      const e=message.params, prior=downloadEvents.get(e.guid)||{guid:e.guid};
      downloadEvents.set(e.guid,{...prior,...e});
    }
  });
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  report.browser=await command('Browser.getVersion',{},false);
  ({targetId}=await command('Target.createTarget',{url:'about:blank'},false));
  ({sessionId}=await command('Target.attachToTarget',{targetId,flatten:true},false));
  await enablePage();
  await command('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads,eventsEnabled:true},false);
  const catalogURL=pathToFileURL(join(project,'courses/catalog.html')).href;
  await navigate(catalogURL);
  await waitFor(()=>evaluate('document.querySelectorAll("[data-course]").length==='+catalog.courses.length),'catalog cards');
  assert.deepEqual(await visibleIds(),catalog.courses.map(c=>c.id));
  const observed=await evaluate('[...document.querySelectorAll("[data-course]")].map(n=>({id:n.dataset.course,title:n.querySelector("h3").textContent,counts:n.querySelector(".course-counts").textContent,concepts:[...n.querySelectorAll(".concepts li")].map(x=>x.textContent),notes:[...n.querySelectorAll("dd")].map(x=>x.textContent)}))');
  assert.deepEqual(observed,catalog.courses.map(c=>({id:c.id,title:c.title,counts:c.questionCount+' questions · '+c.conceptCount+' concepts',concepts:c.concepts,notes:[c.attribution,c.license]})));
  passed('all manifest cards retain source titles, counts, concepts, attribution and permission notes');
  assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false);
  await capture('catalog-desktop.png');
  await evaluate('document.querySelector("#course-search").focus()');
  await command('Input.insertText',{text:'DEPENDENCY cycles'});
  assert.deepEqual(await visibleIds(),['dependency-graphs']);
  assert.equal(await evaluate('document.activeElement.id'),'course-search');
  await activate('#clear-filters');
  assert.equal(await evaluate('document.activeElement.id'),'course-search');
  await key('Tab');
  assert.equal(await evaluate('document.activeElement.id'),'course-subject');
  await key('Home');await key('ArrowDown');await key('Enter');
  await waitFor(()=>evaluate('document.querySelector("#course-subject").value==="Algorithms"'),'keyboard subject selection');
  assert.deepEqual(await visibleIds(),catalog.courses.filter(c=>c.subject==='Algorithms').map(c=>c.id));
  await evaluate('document.querySelector("#course-search").focus()');
  await command('Input.insertText',{text:'sorted'});
  assert.deepEqual(await visibleIds(),['binary-search']);
  passed('literal multiword search and keyboard subject filtering combine without losing search focus');
  await activate('#clear-filters');
  await command('Input.insertText',{text:'[no matching lesson]'});
  assert.deepEqual(await visibleIds(),[]);
  assert.equal(await evaluate('document.querySelector("#no-results").hidden'),false);
  assert.equal(await evaluate('document.querySelector("#result-count").textContent'),'0 of '+catalog.courses.length+' lessons');
  await activate('#clear-filters');
  assert.equal(await evaluate('document.activeElement.id'),'course-search');
  assert.equal(await evaluate('document.querySelector("#clear-filters").disabled'),true);
  assert.deepEqual(await visibleIds(),catalog.courses.map(c=>c.id));
  passed('no-results state and keyboard reset restore the full catalog');
  await activate('[data-course="cellular-energy"] summary');
  assert.equal(await evaluate('document.querySelector("[data-course=cellular-energy] details").open'),true);
  assert.notEqual(await evaluate('getComputedStyle(document.activeElement).outlineStyle'),'none');
  passed('source details are keyboard operable with visible focus');
  await activate('[data-course="cellular-energy"] summary');
  await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
  await evaluate('document.querySelector("#lessons").scrollIntoView({block:"start"})');
  assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false);
  const clipped=await evaluate('[...document.querySelectorAll("input,select,button")].filter(n=>!n.hidden&&n.getClientRects().length).filter(n=>{const r=n.getBoundingClientRect();return r.left<0||r.right>innerWidth;}).map(n=>n.id||n.dataset.download)');
  assert.deepEqual(clipped,[]);
  await capture('catalog-phone.png','#lessons');
  passed('390px catalog has no horizontal overflow or clipped controls');
  await command('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});
  const downloaded=new Map();
  for(const course of catalog.courses)downloaded.set(course.id,await download(course));
  passed('all manifest browser downloads match every original UTF-8 byte',[...report.downloads]);
  const links=await evaluate('[...document.querySelectorAll("a[target=_blank]")].map(a=>({href:a.href,rel:a.rel}))');
  for(const link of links){assert.equal(new URL(link.href).protocol,'file:');assert.ok(link.rel.split(/\s+/).includes('noopener'));assert.ok((await lstat(fileURLToPath(link.href))).isFile());}
  const catalogSession=sessionId;
  const learnerURL=pathToFileURL(join(project,'demo.html')).href;
  await activate('header a[href="../demo.html"]');
  let learner;
  await waitFor(async()=>{learner=(await command('Target.getTargets',{},false)).targetInfos.find(t=>t.type==='page'&&t.targetId!==targetId&&t.url===learnerURL);return Boolean(learner);},'learner opened from the actual catalog link');
  ({sessionId}=await command('Target.attachToTarget',{targetId:learner.targetId,flatten:true},false));
  await enablePage();
  await waitFor(()=>evaluate('document.readyState==="complete"&&!!document.querySelector("#deck-file")'),'existing learner picker');
  assert.equal(await evaluate('window.opener===null'),true);
  passed('companion paths exist and Open learner opens the existing file in a separate tab');
  for(let index=0;index<catalog.courses.length;index++){
    const course=catalog.courses[index],deck=parseDeck(course.text);
    await chooseFile(downloaded.get(course.id));
    await waitFor(()=>evaluate('document.querySelector("#deck-preview-title")?.textContent==='+JSON.stringify(course.title)),'preview '+course.id);
    const preview=await evaluate('({title:document.querySelector("#deck-preview-title").textContent,count:document.querySelector(".deck-preview-count").textContent,attribution:document.querySelector(".deck-preview-attribution").textContent,license:document.querySelector(".deck-preview-license").textContent,prompts:[...document.querySelectorAll(".deck-questions ol li")].map(n=>n.textContent)})');
    assert.equal(preview.title,deck.title);
    assert.ok(preview.count.includes(deck.items.length+' questions · '+deck.concepts.length+' concepts'));
    assert.ok(preview.attribution.endsWith(deck.attribution));
    assert.ok(preview.license.endsWith(deck.license));
    assert.equal(preview.prompts.length,deck.items.length);
    deck.items.forEach((item,i)=>assert.ok(preview.prompts[i].includes(item.prompt)));
    if(index<catalog.courses.length-1){
      await activate('#cancel-deck');
      assert.equal(await evaluate('document.querySelector("#deck-preview").hidden'),true);
      assert.ok(await evaluate('!!document.querySelector("#start-button")'));
    }else{
      await capture('catalog-download-learner-preview.png','#deck-preview');
      await activate('#start-deck');
      await waitFor(()=>evaluate('!!document.querySelector(".question-card h2")'),'started downloaded lesson');
      const prompt=await evaluate('document.querySelector(".question-card h2").textContent');
      const item=deck.items.find(item=>item.prompt===prompt);
      assert.ok(item,'First selected question belongs to downloaded lesson');
      await activate('[data-choice="'+item.answer+'"]');
      const feedback=await evaluate('document.querySelector(".feedback").textContent');
      assert.ok(feedback.includes(item.explanation));
      assert.ok(feedback.includes(item.transfer));
      assert.equal(await evaluate('document.activeElement.id'),'next-button');
      report.firstAnswer={course:course.id,item:item.id,canonicalChoice:item.answer};
    }
  }
  passed('all downloaded decks preview with original prompts and sources; explicit start and first answer use the selected downloaded deck');
  await command('Target.closeTarget',{targetId:learner.targetId},false);
  sessionId=catalogSession;
  const literalText='Literal </script><img src=x onerror=window.__catalogInjected=1> @@CATALOG_SCRIPT@@';
  const literalDeck=JSON.parse(catalog.courses[0].text);
  literalDeck.title=literalText;literalDeck.attribution='Original literal note '+literalText;
  const rawLiteral=JSON.stringify(literalDeck,null,2).replace(/\n/g,'\r\n')+'\r\n';
  const fixtureManifest={format:catalog.format,courses:[{...catalog.courses[0],links:[]}]};
  const literalCatalog=createCatalog(fixtureManifest,new Map([[catalog.courses[0].deck,rawLiteral]]));
  const literalPage=join(output,'literal-catalog.html');
  await writeFile(literalPage,renderCatalogPage(literalCatalog,sources),{flag:'wx'});
  await navigate(pathToFileURL(literalPage).href,390,844);
  await waitFor(()=>evaluate('!!document.querySelector("[data-course] h3")'),'literal standalone catalog');
  assert.equal(await evaluate('document.querySelector("[data-course] h3").textContent'),literalText);
  assert.equal(await evaluate('document.querySelectorAll("img,iframe").length'),0);
  assert.equal(await evaluate('window.__catalogInjected===undefined'),true);
  assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false);
  const literalDownloads=join(output,'literal-downloads');await mkdir(literalDownloads);
  await command('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:literalDownloads,eventsEnabled:true},false);
  await download(literalCatalog.courses[0],literalDownloads);
  await capture('catalog-literal-phone.png','#lessons');
  passed('HTML-like authored text stays literal and its standalone CRLF download keeps exact bytes');
  assert.deepEqual(report.pageErrors,[]);
  const external=report.requests.filter(r=>!['file:','blob:','data:','about:'].includes(new URL(r.url).protocol));
  assert.deepEqual(external,[]);
  assert.equal(await evaluate('localStorage.length===0&&sessionStorage.length===0'),true);
  passed('catalogs load under offline emulation; attached sessions report no external request or page error, and the final document leaves storage empty');
  report.status='passed';
}catch(error){
  report.status='failed';report.error=error.stack||String(error);console.error(report.error);process.exitCode=1;
}finally{
  for(const [path,expected] of Object.entries(report.sourceSha256)){
    if(sha(await readFile(join(project,path)))!==expected){report.status='failed';report.sourceChanged=path;process.exitCode=1;}
  }
  for(const request of pending.values()){clearTimeout(request.timer);request.reject(new Error('Receiving browser closed'));}
  pending.clear();
  if(socket?.readyState===WebSocket.OPEN&&browser?.exitCode===null&&browser?.signalCode===null){
    const closed=new Promise(resolve=>browser.once('exit',resolve));
    try{
      socket.send(JSON.stringify({id:++sequence,method:'Browser.close',params:{}}));
      report.gracefulCloseRequested=true;
      await Promise.race([closed,sleep(4000)]);
    }catch(error){report.gracefulCloseError=String(error);}
  }
  socket?.close();
  if(browser&&browser.exitCode===null&&browser.signalCode===null){
    const closed=new Promise(resolve=>browser.once('exit',resolve));
    browser.kill('SIGTERM');await Promise.race([closed,sleep(4000)]);
    if(browser.exitCode===null&&browser.signalCode===null){browser.kill('SIGKILL');await Promise.race([closed,sleep(1000)]);}
  }
  report.browserExit={code:browser?.exitCode,signal:browser?.signalCode};
  try{await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});report.profileRemoved=true;}catch(error){report.profileRemoved=false;report.cleanupError=String(error);report.status='failed';process.exitCode=1;}
  report.finishedAt=new Date().toISOString();
  await writeFile(join(output,'browser.stderr.log'),browserLog,{flag:'wx'});
  await writeFile(join(output,'receiving.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({status:report.status,checks:report.checks.length,receipt:join(output,'receiving.json'),profileRemoved:report.profileRemoved}));
}
