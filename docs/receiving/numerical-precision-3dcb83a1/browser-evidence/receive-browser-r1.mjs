#!/usr/bin/env node
// Independent product receiving. Uses RecallWeave's existing package-free CDP pattern.
// Only owned loopback pages, authored artifacts, a fresh browser profile and download directory.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,statfs} from 'node:fs/promises';
import {resolve,join,extname} from 'node:path';
import {pathToFileURL} from 'node:url';

const task='/dev/shm/recallweave-precision-3dcb83a1';
const work='/dev/shm/hamon-recallweave-browser-3dcb83a1';
const run=process.argv[2]||'r1';
assert.match(run,/^r[1-9][0-9]*$/);
const output=join(work,run);
const htmlPath=join(task,'source-v2/courses/numerical-precision-explorer.html');
const deckPath=join(task,'source/courses/numerical-precision.json');
const guidePath=join(task,'source-v2/courses/numerical-precision.md');
const importer=join(task,'importer-current');
const executable='/snap/bin/chromium';
const token='hamon-recallweave-3dcb83a1-'+run+'-'+Date.now();
const profile='/tmp/'+token+'-profile';
const downloads='/tmp/'+token+'-downloads';
const sha=data=>createHash('sha256').update(data).digest('hex');
const gitBlob=data=>createHash('sha1').update('blob '+data.length+'\0').update(data).digest('hex');
const fsFree=async path=>{const s=await statfs(path);return Number(s.bavail)*Number(s.bsize);};
const mem=Number((await readFile('/proc/meminfo','utf8')).match(/^MemAvailable:\s+(\d+)/m)[1])*1024;
const admission={sourceFree:await fsFree(work),temporaryFree:await fsFree('/tmp'),memoryAvailable:mem,
  sourceFloor:1073741824,temporaryFloor:805306368,memoryFloor:1610612736};
assert.ok(admission.sourceFree>=admission.sourceFloor&&admission.temporaryFree>=admission.temporaryFloor&&mem>=admission.memoryFloor,
  'Browser resource admission refused: '+JSON.stringify(admission));
const html=await readFile(htmlPath),deckBytes=await readFile(deckPath),guideBytes=await readFile(guidePath);
assert.equal(sha(html),'44947a2c492513d2489d7af8f3738503e3f7a39d39886dba49dc4f8036a13797');
assert.equal(sha(deckBytes),'7593052ae2eaf3434397d8e733bc0b3538dbfa30b8d274cfd7dd38ff5e48cb09');
assert.equal(sha(guideBytes),'136b981ad82b678dd8100d24b21e8fd8ec8b70a4c52e1b7e9c7a7a46054fa5db');
const deck=JSON.parse(deckBytes);
const manifest=JSON.parse(await readFile(join(task,'importer-manifest.json'),'utf8'));
async function pins() {
  const rows=[];
  for(const file of manifest.files) {
    const bytes=await readFile(join(importer,file.path));
    assert.equal(sha(bytes),file.sha256,file.path);
    assert.equal(gitBlob(bytes),file.git_blob,file.path);
    rows.push({path:file.path,sha256:sha(bytes),git_blob:gitBlob(bytes),bytes:bytes.length});
  }
  for(const [path,expected] of [[htmlPath,html],[deckPath,deckBytes],[guidePath,guideBytes]]) {
    assert.ok((await readFile(path)).equals(expected),'Changed authored artifact '+path);
  }
  return rows;
}
const before=await pins();
await mkdir(output);
const report={status:'running',run,admission,source:{html:sha(html),deck:sha(deckBytes),guide:sha(guideBytes)},
  importerCommit:manifest.commit,importerTree:manifest.tree,importerPins:before,checks:[],screenshots:[],downloads:[],
  profile,downloadDirectory:downloads,scope:'Actual Chromium with sandbox enabled; authored source downloaded from owned loopback, then opened as file://; real downloads are consumed through browser file inputs. No existing browser profile or shared source is modified.'};
let browser,socket,sessionId,server,base,endpoint,sequence=0,log='';
const pending=new Map(),requests=[],errors=[],downloadEvents=new Map();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function waitFor(test,label) {
  let last;
  for(let n=0;n<160;n++) {
    try {if(await test()) return;} catch(error){last=error;}
    if(browser&&browser.exitCode!==null)throw new Error('Owned browser exited: '+browser.exitCode+' '+log.slice(-2500));
    await sleep(100);
  }
  throw new Error('Timed out: '+label+(last?' '+last.message:''));
}
function command(method,params={},scoped=true) {
  const id=++sequence;
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout '+method));},10000);
    pending.set(id,{resolve,reject,timer});
    socket.send(JSON.stringify({id,method,params,...(scoped&&sessionId?{sessionId}:{})}));
  });
}
async function evaluate(expression) {
  const r=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
  if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);
  return r.result.value;
}
const q=JSON.stringify;
async function key(name,shift=false) {
  const codes={Enter:13,Tab:9,ArrowDown:40,ArrowUp:38,Home:36,End:35};
  for(const type of ['keyDown','keyUp'])await command('Input.dispatchKeyEvent',{type,key:name,code:name,
    windowsVirtualKeyCode:codes[name],nativeVirtualKeyCode:codes[name],modifiers:shift?8:0,
    ...(name==='Enter'&&type==='keyDown'?{text:'\r',unmodifiedText:'\r'}:{})});
}
async function activate(selector) {
  assert.equal(await evaluate('!!document.querySelector('+q(selector)+')'),true,'Missing '+selector);
  await evaluate('document.querySelector('+q(selector)+').focus()');
  await key('Enter');
}
async function input(selector,text) {
  await evaluate('document.querySelector('+q(selector)+').focus(); document.querySelector('+q(selector)+').select()');
  await command('Input.insertText',{text});
}
async function screenshot(name,selector) {
  if(selector)await evaluate('document.querySelector('+q(selector)+').scrollIntoView({block:"start"})');
  const r=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  const bytes=Buffer.from(r.data,'base64');
  await writeFile(join(output,name),bytes);
  report.screenshots.push({name,sha256:sha(bytes),bytes:bytes.length});
}
const passed=(name,data)=>{report.checks.push({name,...(data?{data}:{})});process.stdout.write('PASS '+name+'\n');};
async function navigate(url,ready,width=1280,height=1000) {
  await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
  const r=await command('Page.navigate',{url});
  if(r.errorText)throw new Error('Navigation failed: '+r.errorText+' '+url);
  await waitFor(()=>evaluate('document.readyState==="complete"&&('+ready+')'),'ready '+url);
}
async function downloaded(filename,action) {
  const old=new Set(downloadEvents.keys());
  await action();
  let record;
  await waitFor(()=>{
    record=[...downloadEvents.values()].find(x=>!old.has(x.guid)&&x.suggestedFilename===filename);
    if(record?.state==='canceled')throw new Error('Download canceled '+JSON.stringify(record));
    return record?.state==='completed';
  },'download '+filename);
  record.path=record.filePath||join(downloads,filename);
  assert.ok(record.path.startsWith(downloads+'/'),'Unexpected owned download path');
  report.downloads.push({...record});
  return record;
}
async function selectFile(selector,path) {
  const {root}=await command('DOM.getDocument');
  const {nodeId}=await command('DOM.querySelector',{nodeId:root.nodeId,selector});
  assert.ok(nodeId,'File input missing '+selector);
  await command('DOM.setFileInputFiles',{nodeId,files:[path]});
}
async function fileText(selector,path) {
  await selectFile(selector,path);
  return evaluate('document.querySelector('+q(selector)+').files[0].text()');
}
async function verifyDownloaded(record,expected) {
  await navigate(base+'/receiving','!!document.querySelector("#received-file")');
  const text=await fileText('#received-file',record.path);
  assert.equal(sha(Buffer.from(text)),sha(expected),'Real downloaded bytes '+record.suggestedFilename);
  record.sha256=sha(Buffer.from(text));record.bytes=Buffer.byteLength(text);
  return text;
}
try {
  server=createServer(async(request,response)=>{
    try {
      const path=new URL(request.url,'http://localhost').pathname;
      if(path==='/download-explorer') {
        response.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Content-Disposition':'attachment; filename="numerical-precision-explorer.html"'});
        response.end(html);return;
      }
      if(path==='/receiving') {
        response.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
        response.end('<!doctype html><html lang="en"><title>Owned artifact receiver</title><label for="received-file">Read authored download</label><input id="received-file" type="file"></html>');return;
      }
      if(!path.startsWith('/learner/')){response.writeHead(404).end();return;}
      const relative=decodeURIComponent(path.slice('/learner/'.length))||'index.html';
      const file=resolve(importer,relative);
      if(!file.startsWith(importer+'/')){response.writeHead(403).end();return;}
      const bytes=await readFile(file);
      const mime={'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.json':'application/json'}[extname(file)]||'application/octet-stream';
      response.writeHead(200,{'Content-Type':mime+'; charset=utf-8'});response.end(bytes);
    }catch{response.writeHead(404).end();}
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  base='http://127.0.0.1:'+server.address().port;
  report.loopback=base;
  const argv=['--headless=new','--disable-gpu','--disable-background-networking','--disable-component-update','--disable-sync',
    '--no-first-run','--no-default-browser-check','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0',
    '--user-data-dir='+profile,'--disk-cache-size=1048576','about:blank'];
  report.browserCommand=[executable,...argv];
  browser=spawn(executable,argv,{stdio:['ignore','ignore','pipe']});
  browser.on('error',error=>{log+='\nLAUNCH '+error.stack;});
  browser.stderr.on('data',bytes=>{
    log=(log+bytes.toString()).slice(-24000);
    endpoint=log.match(/DevTools listening on (ws:\/\/127\.0\.0\.1:\d+\/[^\s]+)/)?.[1]||endpoint;
  });
  await waitFor(()=>Boolean(endpoint),'owned browser endpoint');
  socket=new WebSocket(endpoint);
  socket.addEventListener('message',event=>{
    const message=JSON.parse(event.data);
    if(message.id) {
      const p=pending.get(message.id);if(!p)return;
      pending.delete(message.id);clearTimeout(p.timer);
      if(message.error)p.reject(new Error(message.error.message));else p.resolve(message.result);
    }else if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails);
    else if(message.method==='Network.requestWillBeSent')requests.push(message.params.request.url);
    else if(message.method==='Browser.downloadWillBegin')downloadEvents.set(message.params.guid,{...message.params});
    else if(message.method==='Browser.downloadProgress') {
      const p=message.params;downloadEvents.set(p.guid,{...downloadEvents.get(p.guid),...p});
    }
  });
  await new Promise((r,j)=>{socket.addEventListener('open',r,{once:true});socket.addEventListener('error',j,{once:true});});
  report.browser=await command('Browser.getVersion',{},false);
  const protocol=await (await fetch(endpoint.replace('ws:','http:').split('/devtools/')[0]+'/json/protocol')).json();
  report.protocol=protocol.domains.filter(d=>['Browser','DOM'].includes(d.domain)).map(d=>({domain:d.domain,
    methods:d.commands.filter(c=>['setDownloadBehavior','setFileInputFiles'].includes(c.name)).map(c=>({name:c.name,parameters:c.parameters})),
    events:d.events?.filter(e=>['downloadWillBegin','downloadProgress'].includes(e.name))}));
  await command('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads,eventsEnabled:true},false);
  const {targetId}=await command('Target.createTarget',{url:'about:blank'},false);
  ({sessionId}=await command('Target.attachToTarget',{targetId,flatten:true},false));
  for(const method of ['Page.enable','Runtime.enable','Network.enable','DOM.enable'])await command(method);
  const sourceDownload=await downloaded('numerical-precision-explorer.html',async()=>{
    await command('Page.navigate',{url:base+'/download-explorer'});
  });
  await verifyDownloaded(sourceDownload,html);
  const offlineURL=pathToFileURL(sourceDownload.path).href;
  const offlineStart=requests.length;
  await navigate(offlineURL,'!!document.querySelector("#number-result")&&document.querySelector("#number-result").textContent.length>0');
  assert.equal(await evaluate('document.querySelector("#number-result").textContent'),'0.30000000000000004');
  assert.equal(await evaluate('document.querySelector("#precision-questions").children.length'),12);
  const labels=await evaluate('[...document.querySelectorAll("label[for]")].map(x=>({for:x.htmlFor,text:x.textContent}))');
  assert.deepEqual(labels.map(x=>x.for),['precision-a','precision-operation','precision-b']);
  assert.equal(await evaluate('document.querySelector("#precision-error").getAttribute("role")'),'alert');
  assert.equal(await evaluate('document.querySelector("#precision-status").getAttribute("role")'),'status');
  passed('real downloaded standalone opens through file URL with initial comparison and twelve questions');
  await input('#precision-a','0.5');
  assert.equal(await evaluate('document.querySelector("#precision-result").hidden&&document.querySelector("#download-worked").disabled'),true);
  await key('Tab');
  assert.equal(await evaluate('document.activeElement.id'),'precision-operation');
  await key('Tab');
  assert.equal(await evaluate('document.activeElement.id'),'precision-b');
  await input('#precision-b','0.25');
  await key('Tab');
  assert.equal(await evaluate('document.activeElement.textContent.trim()'),'Compare values');
  await key('Enter');
  assert.equal(await evaluate('document.querySelector("#number-result").textContent'),'0.75');
  passed('keyboard traverses labeled inputs and submit; edits remove stale result before recomputation');
  await input('#precision-b','1e3');
  await key('Enter');
  assert.equal(await evaluate('document.activeElement.id'),'precision-b');
  assert.equal(await evaluate('document.querySelector("#precision-b").getAttribute("aria-invalid")'),'true');
  assert.equal(await evaluate('!document.querySelector("#precision-error").hidden&&document.querySelector("#precision-result").hidden&&document.querySelector("#download-worked").disabled'),true);
  await input('#precision-b','0.25');await key('Enter');
  assert.equal(await evaluate('document.querySelector("#precision-error").hidden&&!document.querySelector("#precision-result").hidden'),true);
  passed('invalid decimal focuses the offending field, refuses stale output and recovers through ordinary input');
  await activate('[data-preset="lost-integer-step"]');
  assert.equal(await evaluate('document.querySelector("#number-result").textContent'),'9007199254740992');
  assert.match(await evaluate('document.querySelector("#integer-status").textContent'),/outside.*safe interval/);
  await activate('[data-preset="exact-unsafe-sum"]');
  assert.match(await evaluate('document.querySelector("#precision-verdict").textContent'),/^Matches/);
  assert.match(await evaluate('document.querySelector("#integer-status").textContent'),/outside.*safe interval/);
  passed('outside-safe-range status remains distinct from whether the displayed result is exact');
  await activate('[data-preset="decimal-sum"]');
  await screenshot('explorer-desktop.png','#precision-result');
  await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
  await activate('#value-rows tr:last-child summary');
  assert.equal(await evaluate('document.querySelector("#value-rows tr:last-child details").open'),true);
  assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false);
  await screenshot('explorer-phone-exact.png','#precision-result');
  await activate('.all-questions>summary');
  await activate('#precision-questions .question:last-child summary');
  assert.equal(await evaluate('document.querySelector("#precision-questions .question:last-child details").open'),true);
  assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false);
  passed('390px exact-value expansion and worked-answer disclosure remain keyboard operable without horizontal overflow');
  const beforeFailure=await evaluate('document.querySelector("#number-result").textContent');
  await evaluate('window.receivingCreateObjectURL=URL.createObjectURL; URL.createObjectURL=()=>{throw new Error("owned receiving preparation refusal");}');
  await activate('#download-worked');
  assert.equal(await evaluate('!document.querySelector("#precision-result").hidden&&!document.querySelector("#precision-error").hidden'),true);
  assert.equal(await evaluate('document.querySelector("#number-result").textContent'),beforeFailure);
  await evaluate('URL.createObjectURL=window.receivingCreateObjectURL;delete window.receivingCreateObjectURL;');
  const worked=await downloaded('numerical-precision-worked.json',()=>activate('#download-worked'));
  const lesson=await downloaded('numerical-precision.json',()=>activate('#download-lesson'));
  const guide=await downloaded('numerical-precision-guide.md',()=>activate('#download-guide'));
  assert.equal(await evaluate('document.querySelector("#number-result").textContent'),beforeFailure);
  const offlineRequests=requests.slice(offlineStart);
  assert.ok(offlineRequests.every(url=>url.startsWith('file:')||url.startsWith('blob:file:')),'Standalone attempted nonlocal request '+JSON.stringify(offlineRequests));
  report.offlineRequests=offlineRequests;
  passed('real file-based downloads succeed after controlled preparation refusal and preserve the comparison');
  await verifyDownloaded(lesson,deckBytes);
  await verifyDownloaded(guide,guideBytes);
  await navigate(base+'/receiving','!!document.querySelector("#received-file")');
  const workedText=await fileText('#received-file',worked.path);
  const workedRecord=JSON.parse(workedText);
  assert.match(workedText,/"0\.1"/);assert.match(workedText,/"0\.2"/);
  report.workedRecord={sha256:sha(Buffer.from(workedText)),bytes:Buffer.byteLength(workedText),record:workedRecord};
  await writeFile(join(output,'downloaded-worked.json'),workedText);
  passed('completed browser lesson and guide files retain exact authored bytes; worked JSON contains the displayed operands');
  await navigate(base+'/learner/index.html','!!document.querySelector("#deck-file")&&!!document.querySelector("#start-button")',390,844);
  const priorTitle=await evaluate('document.querySelector("#page-title").textContent');
  await selectFile('#deck-file',lesson.path);
  await waitFor(()=>evaluate('!!document.querySelector("#start-deck")'),'incoming lesson preview');
  assert.equal(await evaluate('document.querySelector("#deck-preview-title").textContent'),deck.title);
  assert.equal(await evaluate('document.querySelector("#page-title").textContent'),priorTitle);
  assert.match(await evaluate('document.querySelector(".deck-preview-count").textContent'),/12 questions/);
  assert.equal(sha(Buffer.from(await evaluate('document.querySelector("#deck-file").files[0].text()'))),sha(deckBytes));
  await screenshot('learner-import-preview-phone.png','#deck-picker');
  await activate('#start-deck');
  await waitFor(()=>evaluate('document.querySelector("[role=progressbar]").getAttribute("aria-valuemax")==="12"'),'selected lesson');
  if(await evaluate('!!document.querySelector("#start-button")'))await activate('#start-button');
  const seen=[],missed=[];
  for(let n=0;n<12;n++) {
    await waitFor(()=>evaluate('!!document.querySelector(".question-card h2")'),'lesson question '+n);
    const prompt=await evaluate('document.querySelector(".question-card h2").textContent');
    const item=deck.items.find(x=>x.prompt===prompt);
    assert.ok(item,'Rendered prompt belongs to downloaded course');assert.ok(!seen.includes(item.id));seen.push(item.id);
    const wrong=n%3===0,answer=wrong?(item.answer+1)%item.options.length:item.answer;
    if(wrong)missed.push(item.id);
    const order=await evaluate('[...document.querySelectorAll("[data-choice]")].map(x=>Number(x.getAttribute("data-choice")))');
    assert.deepEqual([...order].sort((a,b)=>a-b),item.options.map((_,i)=>i));
    assert.equal(await evaluate('Number(document.activeElement.getAttribute("data-choice"))'),order[0]);
    for(let i=0;i<order.indexOf(answer);i++)await key('Tab');
    await key('Enter');
    assert.equal(await evaluate('document.activeElement.id'),'next-button');
    await key('Enter');
  }
  await waitFor(()=>evaluate('!!document.querySelector(".result-card")'),'completed lesson');
  const snapshot=()=>evaluate('({score:document.querySelector(".result-card>p").textContent,estimates:[...document.querySelectorAll(".mastery-box output")].map(x=>x.textContent),reviews:document.querySelectorAll(".review-item").length,overflow:document.documentElement.scrollWidth>innerWidth})');
  const original=await snapshot();
  assert.equal(original.reviews,12);assert.equal(original.overflow,false);assert.match(original.score,/8.*12/);
  await activate('#practice-button');
  for(let n=0;n<4;n++) {
    const prompt=await evaluate('document.querySelector(".practice-card h2").textContent');
    const item=deck.items.find(x=>x.prompt===prompt);assert.ok(item&&missed.includes(item.id));
    await activate('[data-practice-choice="'+item.answer+'"]');
    await key('Enter');
  }
  const final=await snapshot();
  assert.equal(final.score,original.score);assert.deepEqual(final.estimates,original.estimates);assert.equal(final.overflow,false);
  assert.match(await evaluate('document.querySelector("#practice-status").textContent'),/4 of 4/);
  assert.equal(await evaluate('document.querySelectorAll(".review-practice-answer").length'),4);
  await screenshot('learner-completed-phone.png','.result-card');
  report.learner={seen,plannedMisses:missed,original,final};
  passed('actual downloaded JSON previews without replacement, then completes twelve shuffled questions and four corrections with original trace retained');
  assert.deepEqual(errors,[]);
  report.externalRequests=requests.filter(url=>!url.startsWith(base+'/')&&!url.startsWith('file:')&&!url.startsWith('blob:file:'));
  assert.deepEqual(report.externalRequests,[]);
  assert.deepEqual(await pins(),before);
  passed('all received paths have no page exceptions or external requests and source bytes remain unchanged');
  report.status='passed';
}catch(error) {
  report.status='failed';report.error=error.stack||String(error);report.pageErrors=errors;
  if(sessionId)try{report.lastPage=await evaluate('({url:location.href,ready:document.readyState,focus:document.activeElement?.outerHTML,text:document.body.innerText.slice(0,9000)})');await screenshot('failed-state.png');}catch{}
  process.stderr.write(report.error+'\n');process.exitCode=1;
}finally {
  report.requests=requests;report.downloads=[...downloadEvents.values()].map(x=>({...x,path:x.filePath||join(downloads,x.suggestedFilename||x.guid)}));
  report.finished=new Date().toISOString();report.scriptSha256=sha(await readFile(new URL(import.meta.url)));
  await writeFile(join(output,'browser-report.json'),JSON.stringify(report,null,2)+'\n');
  await writeFile(join(output,'browser-stderr.log'),log);
  if(socket?.readyState===WebSocket.OPEN)try{await command('Browser.close',{},false);}catch{}
  socket?.close();
  if(browser&&browser.exitCode===null) {
    await Promise.race([new Promise(r=>browser.once('exit',r)),sleep(3000)]);
    if(browser.exitCode===null)browser.kill('SIGTERM');
  }
  if(server)await new Promise(r=>server.close(r));
  process.stdout.write(JSON.stringify({status:report.status,checks:report.checks.length,report:join(output,'browser-report.json')})+'\n');
}
