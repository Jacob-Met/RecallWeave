import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const NODE = 'C:\\Users\\minec\\AppData\\Local\\Hamon\\node\\node-v24.21.0-win-x64\\node.exe';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DLL = 'C:\\Program Files\\Google\\Chrome\\Application\\154.0.8037.98\\chrome.dll';
const PROFILE = path.join(ROOT, 'chrome-profile');
const report = { schema:'recallweave180-root-exact-renderer-probe/1', worker:'estate-6e5752b49b6f/root',
  scope:'Actual installed Chrome executes the unchanged renderer-function slice and CSS from received R1/R2 against an independently authored contract-shaped report. This is a focused source/UI receiving probe, not owner177 comparison execution, full product/file-lifecycle receiving, generated-page acceptance or deployment.',
  began:new Date().toISOString(), identity:{user:os.userInfo().username,host:os.hostname(),node:process.version,execPath:process.execPath}, errors:[],requests:[],observations:[],artifacts:[],accepted:false };
const began=performance.now();
const hash=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const fp=p=>{const s=fs.lstatSync(p);assert.ok(s.isFile());const b=fs.readFileSync(p);return{path:p,bytes:b.length,sha256:hash(b),gitBlob:blob(b),mtimeMs:s.mtimeMs};};
const write=(name,bytes)=>{fs.writeFileSync(path.join(ROOT,name),bytes,{flag:'wx'});return fp(path.join(ROOT,name));};
const r1=JSON.parse(fs.readFileSync(path.join(ROOT,'intake-r1.json'),'utf8'));
const r2=JSON.parse(fs.readFileSync(path.join(ROOT,'intake-r2.json'),'utf8'));
const files=[fileURLToPath(import.meta.url),path.join(ROOT,'intake-r1.json'),path.join(ROOT,'intake-r2.json'),NODE,CHROME,DLL,...r2.files.map(f=>path.join(r2.nativeProductRoot,f.path))];
function snapshots(){return files.map(fp);}
function exactSources(intake){const m=new Map();for(const f of intake.files){const b=Buffer.from(f.text);assert.equal(b.length,f.bytes);assert.equal(hash(b),f.sha256);assert.equal(blob(b),f.gitBlob);m.set(f.path,f.text);}return m;}
const idList=['a b','a  b'];
const q=(id,i,later)=>({id,concept:'Literal space identities',prerequisites:[],prompt:(later?'Revised':'Earlier')+' prompt '+i+'\n日本語 <literal>',options:['Answer  A','Answer B'],answer:0,explanation:'Exact answer explanation.',transfer:'Apply the unchanged idea.'});
const beforeItems=idList.map((id,i)=>q(id,i,false)), afterItems=idList.map((id,i)=>q(id,i,true));
const reference={format:'recallweave-course-comparison-browser/1',files:{before:{name:'earlier.json',bytes:1234,sha256:'1'.repeat(64)},after:{name:'revised.json',bytes:1235,sha256:'2'.repeat(64)}},sameBytes:false,comparison:{format:'recallweave-course-comparison/1',sameContent:false,metadataChanges:[],concepts:{beforeOrder:['Literal space identities'],afterOrder:['Literal space identities'],added:[],removed:[],retainedOrderChanged:false},questions:{beforeOrder:idList,afterOrder:idList,added:[],removed:[],retained:idList.map((id,i)=>({id,beforeIndex:i,afterIndex:i,positionChanged:false,changedFields:['prompt'],answerIndexChanged:false,answerTextChanged:false,before:beforeItems[i],after:afterItems[i]})),retainedOrderChanged:false,summary:{beforeCount:2,afterCount:2,added:0,removed:0,changed:2,unchanged:0,positionChanged:0}}}};
function makeProbe(label,intake){
 const m=exactSources(intake),ui=m.get('src/course-comparison-ui.mjs'),start=ui.indexOf('const byId = '),end=ui.indexOf('\nfunction render() {');
 assert.ok(start>=0&&end>start);const renderer=ui.slice(start,end);
 assert.ok(renderer.includes('function renderReport(report) {'));assert.ok(!renderer.includes('createCourseComparisonPage('));
 const script=renderer+'\nrenderReport({data:'+JSON.stringify(reference)+'});\ndocument.getElementById("comparison-result").hidden=false;document.querySelectorAll("details").forEach(d=>{d.open=true;});globalThis.__rootProbeReady=true;\n';
 let html=m.get('course-compare/index.html');
 const styleMarker='<link rel="stylesheet" href="./styles.css">',scriptMarker='<script type="module" src="../src/course-comparison-ui.mjs"></script>';
 assert.equal(html.split(styleMarker).length,2);assert.equal(html.split(scriptMarker).length,2);
 html=html.replace(styleMarker,'<style>\n'+m.get('course-compare/styles.css')+'\n</style>').replace(scriptMarker,'<script>\n'+script.replace(/<\/script/gi,'<\\/script')+'\n</script>');
 const artifact=write(label+'-renderer-probe.html',html);report.artifacts.push(artifact);
 report[label+'Source']={ui:intake.files.find(f=>f.path==='src/course-comparison-ui.mjs').gitBlob,css:intake.files.find(f=>f.path==='course-compare/styles.css').gitBlob,template:intake.files.find(f=>f.path==='course-compare/index.html').gitBlob,rendererSliceSha256:hash(Buffer.from(renderer)),sliceStringOffsets:[start,end],substitutions:'Only native link/script loading replaced by exact CSS and selected renderer functions plus declared fixed reference; no module/comparison/file-lifecycle execution.'};
 return artifact.path;
}
const pause=ms=>new Promise(r=>setTimeout(r,ms));
let child,socket,serial=1,chromeClosed,profileCreated=false;const pending=new Map();let chromeStdout,chromeStderr;
async function connect(url){socket=new WebSocket(url);socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(p){clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(new Error(p.method+': '+m.error.message)):p.resolve(m.result);}}else if(m.method==='Runtime.exceptionThrown'||(m.method==='Log.entryAdded'&&m.params.entry.level==='error'))report.errors.push(m);else if(m.method==='Network.requestWillBeSent')report.requests.push({url:m.params.request.url,method:m.params.request.method});});socket.addEventListener('close',()=>{for(const p of pending.values()){clearTimeout(p.timer);p.reject(new Error('Socket closed: '+p.method));}pending.clear();});await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(new Error('WebSocket deadline')),10000);socket.addEventListener('open',()=>{clearTimeout(t);resolve();},{once:true});socket.addEventListener('error',e=>{clearTimeout(t);reject(new Error(e.message||'WebSocket error'));},{once:true});});}
function cmd(method,params={},sessionId){return new Promise((resolve,reject)=>{const id=serial++,timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP deadline '+method));},10000);pending.set(id,{resolve,reject,timer,method});socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});}
async function ev(s,expression){const r=await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},s);assert.equal(r.exceptionDetails,undefined);return r.result.value;}
const measurements=String.raw`(() => {
  function metric(el) {
    const text=el.firstChild, full=text.textContent, start=full.indexOf('"'), range=document.createRange();
    range.setStart(text,start);range.setEnd(text,full.length);
    return {text:full,quoted:full.slice(start),whiteSpace:getComputedStyle(el).whiteSpace,width:range.getBoundingClientRect().width,rect:el.getBoundingClientRect().toJSON()};
  }
  return {paragraphs:[...document.querySelectorAll('.question-id')].map(metric),summaries:[...document.querySelectorAll('.question-change>summary')].map(metric),warning:document.querySelector('.report-warning').textContent,sourceIdLists:[...document.querySelectorAll('.comparison-section')].find(s=>s.querySelector('h3')?.textContent==='Question identities and source order').querySelector('ol').textContent,scrollWidth:document.documentElement.scrollWidth,innerWidth,questionTexts:[...document.querySelectorAll('.question-record .text-value')].map(x=>x.textContent),unexpectedImages:document.querySelectorAll('img').length};
})()`;
try{
 assert.equal(process.version,'v24.21.0');assert.equal(process.platform,'win32');assert.equal(process.execPath.toLowerCase(),NODE.toLowerCase());
 const disk=fs.statfsSync(ROOT);report.admission={at:new Date().toISOString(),freeMemoryBytes:os.freemem(),freeDiskBytes:disk.bavail*disk.bsize};assert.ok(report.admission.freeMemoryBytes>2*1024**3);assert.ok(report.admission.freeDiskBytes>1024**3);
 report.before=snapshots();assert.equal(report.before.find(x=>x.path===NODE).sha256,'ba4e6d110e8c1592a1ecd390f6b05f3da124b13871a5be62b341a07a853c6c32');assert.equal(report.before.find(x=>x.path===CHROME).sha256,'6849d2982038de9f9489a7b3858f3b785b7fec06a842c93c517281d21995c8ca');assert.equal(report.before.find(x=>x.path===DLL).sha256,'ee522fdc3adafa17c48d351e4613d40b61fe98ddbd7de57b3f20a36b43561c5d');
 for(const f of r2.files)assert.equal(report.before.find(x=>x.path===path.join(r2.nativeProductRoot,f.path)).sha256,f.sha256,'Current source exactly admitted');
 const probes=[['r1',makeProbe('r1',r1)],['r2',makeProbe('r2',r2)]];
 const spawnDisk=fs.statfsSync(ROOT);report.preSpawnAdmission={at:new Date().toISOString(),freeMemoryBytes:os.freemem(),freeDiskBytes:spawnDisk.bavail*spawnDisk.bsize};assert.ok(report.preSpawnAdmission.freeMemoryBytes>2*1024**3);assert.ok(report.preSpawnAdmission.freeDiskBytes>1024**3);
 fs.mkdirSync(PROFILE);profileCreated=true;chromeStdout=fs.openSync(path.join(ROOT,'chrome.stdout'),'wx');chromeStderr=fs.openSync(path.join(ROOT,'chrome.stderr'),'wx');
 const args=['--headless=new','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+PROFILE,'--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-default-apps','--disable-extensions','--disable-sync','about:blank'];report.command=[CHROME,...args];child=spawn(CHROME,args,{cwd:ROOT,windowsHide:true,stdio:['ignore',chromeStdout,chromeStderr]});report.browserPid=child.pid;chromeClosed=new Promise(resolve=>child.once('close',(code,signal)=>resolve({code,signal})));child.on('error',e=>{report.spawnError=e.message;});
 const active=path.join(PROFILE,'DevToolsActivePort'),until=performance.now()+20000;while(!fs.existsSync(active)){assert.equal(child.exitCode,null);assert.ok(performance.now()<until);await pause(100);}
 const lines=fs.readFileSync(active,'utf8').trim().split(/\r?\n/);assert.match(lines[0],/^\d+$/);assert.match(lines[1],/^\/devtools\/browser\/[a-zA-Z0-9-]+$/);await connect('ws://127.0.0.1:'+Number(lines[0])+lines[1]);report.browserVersion=await cmd('Browser.getVersion');assert.equal(report.browserVersion.product,'Chrome/154.0.8037.98');
 for(const [label,p]of probes){
  const t=await cmd('Target.createTarget',{url:'about:blank'}),a=await cmd('Target.attachToTarget',{targetId:t.targetId,flatten:true}),s=a.sessionId;
  await cmd('Runtime.enable',{},s);await cmd('Page.enable',{},s);await cmd('Log.enable',{},s);await cmd('Network.enable',{},s);await cmd('Network.setBlockedURLs',{urls:['http://*','https://*','ftp://*']},s);
  await cmd('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false},s);await cmd('Page.navigate',{url:pathToFileURL(p).href},s);
  const deadline=performance.now()+10000;while(!await ev(s,'globalThis.__rootProbeReady===true')){assert.ok(performance.now()<deadline);await pause(50);}await ev(s,'document.fonts.ready.then(()=>true)');
  for(const width of [1280,390]){
   await cmd('Emulation.setDeviceMetricsOverride',{width,height:width===1280?1000:844,deviceScaleFactor:1,mobile:false},s);
   const m=await ev(s,measurements);assert.equal(m.paragraphs.length,4);assert.equal(m.summaries.length,2);assert.equal(m.paragraphs[0].quoted,'"a b"');assert.equal(m.paragraphs[2].quoted,'"a  b"');assert.equal(m.summaries[0].quoted,'"a b"');assert.equal(m.summaries[1].quoted,'"a  b"');assert.equal(m.unexpectedImages,0);assert.ok(m.questionTexts.some(t=>t.includes('日本語 <literal>')));
   for(const pair of [[m.paragraphs[0],m.paragraphs[2]],[m.summaries[0],m.summaries[1]]]){if(label==='r1'){assert.equal(pair[0].whiteSpace,'normal');assert.equal(pair[1].whiteSpace,'normal');assert.ok(Math.abs(pair[0].width-pair[1].width)<0.1,'R1 visual ambiguity reproduced');}else{assert.equal(pair[0].whiteSpace,'pre-wrap');assert.equal(pair[1].whiteSpace,'pre-wrap');assert.ok(pair[1].width-pair[0].width>2,'R2 preserves extra visible space');}}
   assert.ok(m.scrollWidth<=m.innerWidth+1,'No horizontal document overflow at '+width);
   if(label==='r1')assert.match(m.warning,/both complete courses/);else{assert.match(m.warning,/full question records and answer keys, together with the reported differences/);assert.doesNotMatch(m.warning,/both complete courses/);}
   report.observations.push({version:label,width,...m});
   await ev(s,'document.querySelector(".question-change").scrollIntoView({block:"start"});true');
   const screenshot=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},s);report.artifacts.push(write(label+'-ids-'+width+'.png',Buffer.from(screenshot.data,'base64')));
  }
  await cmd('Target.closeTarget',{targetId:t.targetId});
 }
 assert.deepEqual(report.errors,[]);assert.ok(report.requests.every(r=>r.url.startsWith('file:')));report.accepted=true;
}catch(e){report.failure={name:e.name,message:e.message,stack:e.stack};process.exitCode=1;}
finally{
 if(socket?.readyState===WebSocket.OPEN){try{await cmd('Browser.close');}catch(e){report.closeCommandError=e.message;}}
 if(child){const closed=await new Promise(resolve=>{const timer=setTimeout(()=>resolve({observed:false,code:child.exitCode,signal:child.signalCode}),10000);chromeClosed.then(result=>{clearTimeout(timer);resolve({observed:true,...result});});});report.browserClosed=closed.observed;report.browserExitCode=closed.code;report.browserSignal=closed.signal;if(!closed.observed||closed.code!==0||closed.signal!==null){report.accepted=false;process.exitCode=1;report.closeIncomplete=true;}}
 if(socket&&socket.readyState!==WebSocket.CLOSED)socket.close();
 for(const p of pending.values()){clearTimeout(p.timer);}pending.clear();
 if(chromeStdout!==undefined)fs.closeSync(chromeStdout);if(chromeStderr!==undefined)fs.closeSync(chromeStderr);
 if(profileCreated){if(!child||(report.browserClosed&&report.browserExitCode===0&&report.browserSignal===null)){try{fs.rmSync(PROFILE,{recursive:true,maxRetries:4,retryDelay:100});report.ownProfileRemoved=!fs.existsSync(PROFILE);assert.ok(report.ownProfileRemoved);}catch(e){report.accepted=false;process.exitCode=1;report.profileCleanupError=e.message;}}else{report.accepted=false;process.exitCode=1;report.profileRemovalHeld='Own browser close not confirmed';}}
 try{if(report.before){report.after=snapshots();assert.deepEqual(report.after,report.before);report.inputsUnchanged=true;}else{report.preservationState='Not measured: resource admission stopped before first snapshot; no browser or product operation was attempted.';}}catch(e){report.accepted=false;process.exitCode=1;report.preservationError=e.message;}
 report.elapsedMs=performance.now()-began;report.ended=new Date().toISOString();write('renderer-receiving.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({accepted:report.accepted,elapsedMs:report.elapsedMs,observations:report.observations.length,errors:report.errors.length,actualChromeExit:report.browserExitCode,failure:report.failure}));
}
