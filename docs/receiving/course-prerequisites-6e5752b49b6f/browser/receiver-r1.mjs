import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {snapshotPage,verifySurface,verifyEmpty,verifyReview,runSensitivityControls} from './browser-assertions.mjs';
import {installReceivingHooks} from './browser-hooks.mjs';
import {observeOwnedChromeProcess} from './owned-chrome-observer.mjs';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
const SOURCE=path.join(ROOT,'source-r1'),OUTPUTS=path.join(ROOT,'outputs-r1'),FIXTURES=path.join(ROOT,'fixtures-r1'),PROFILE=path.join(ROOT,'owned-profile-r1'),DOWNLOADS=path.join(OUTPUTS,'downloads');
const NODE="C:\\Program Files\\nodejs\\node.exe";
const CHROME="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const POWERSHELL="C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
const RUNTIMES=[
  {
    "path": "C:\\Program Files\\nodejs\\node.exe",
    "bytes": 91380224,
    "sha256": "63c259c81e5d472b5f11c8d506070130cb04a1ecf84b80377a34ed6ec9048088"
  },
  {
    "path": "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "bytes": 4496024,
    "sha256": "977d6483df6c457eab24a3241b44645c66067f52b73bc2c8dbd7e6469bf15d1f"
  },
  {
    "path": "C:\\Program Files\\Google\\Chrome\\Application\\154.0.8037.97\\chrome.dll",
    "bytes": 302382744,
    "sha256": "01cfba363a06b5aee6ccb9a2691062b506bac411e3b80cca54246c691784c241"
  },
  {
    "path": "C:\\Program Files\\Google\\Chrome\\Application\\154.0.8037.98\\chrome.dll",
    "bytes": 302382744,
    "sha256": "ee522fdc3adafa17c48d351e4613d40b61fe98ddbd7de57b3f20a36b43561c5d"
  },
  {
    "path": POWERSHELL,
    "bytes": 495616,
    "sha256": "8bb6fa8c283b4d92120b1ef249a9b311b0f804d4cabbe9981159976c8be76a5e"
  }
];
const report={format:'recall196-root-native-browser/2',worker:'estate-6e5752b49b6f/root',at:new Date().toISOString(),
 scope:'Actual offline standalone prerequisite reviewer using frozen manual reports, original native files, complete actual download delivery, keyboard selections, narrow layout and controlled original read/hash timing. Native API receiving remains separately qualified. No teaching benefit, deployment, modular-browser or universal platform claim.',
 predecessor:{runner:'ebe3c32ee437261e4c898445c19febbb58c82b7a',receipt:'f502ea10b8ea5ee0efb09302e66b5a4245ad6a7e',failure:'R0 omitted Enter text and stopped at native summary toggle; retained unchanged. R1 qualifies the original and complete native event sequence, with identical source, oracle and acceptance semantics.'},
 protocolGit:'0bf3c78708e4ba545e0e5ff166339b2788d6798e',referenceGit:'8a396ad7d2263be2c5603149fdd912df86e40fd2',
 sourceCommit:'1bbbc9007d29247c765965bbf1717088167c1cfb',sourceTree:'b0fedebb0ab4ec31ded8887d06e63a19496ae6ad',
 identity:{node:process.version,execPath:process.execPath,user:os.userInfo().username,hostname:os.hostname()},
 groups:[],artifacts:[],observations:[],downloads:[],downloadEvents:[],errors:[],requests:[],accepted:false};
const started=performance.now(),hash=b=>createHash('sha256').update(b).digest('hex');
function pin(p){const st=fs.lstatSync(p);assert.ok(st.isFile(),'regular admitted file '+p);assert.equal(fs.realpathSync.native(p).toLowerCase(),p.toLowerCase(),'redirected admitted file');const s=createHash('sha256'),g=createHash('sha1').update('blob '+st.size+'\0'),fd=fs.openSync(p,'r'),chunk=Buffer.alloc(1024*1024);let total=0;try{let n;while((n=fs.readSync(fd,chunk,0,chunk.length,null))>0){total+=n;s.update(chunk.subarray(0,n));g.update(chunk.subarray(0,n));}}finally{fs.closeSync(fd);}assert.equal(total,st.size);return{path:p,bytes:total,sha256:s.digest('hex'),gitBlob:g.digest('hex'),mtimeMs:st.mtimeMs};}
function exact(record,expected){for(const key of ['bytes','sha256','gitBlob'])if(expected[key]!==undefined)assert.equal(record[key],expected[key],expected.path+' '+key);}
function write(name,b){const p=path.join(OUTPUTS,name);fs.writeFileSync(p,b,{flag:'wx'});const x=pin(p);report.artifacts.push(x);return x;}
function capacity(){const s=fs.statfsSync(ROOT),r={at:new Date().toISOString(),freeMemoryBytes:os.freemem(),freeDiskBytes:s.bavail*s.bsize};assert.ok(r.freeMemoryBytes>=2*1024**3,'unchanged2GiB RAM floor');assert.ok(r.freeDiskBytes>=1024**3,'unchanged1GiB disk floor');return r;}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let child,socket,stdoutFd,stderrFd,closePromise,browserObserver,observerAdmissionError,profileCreated=false,serial=1;const pending=new Map();
function cmd(method,params={},sessionId){return new Promise((resolve,reject)=>{const id=serial++,timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP deadline '+method));},10000);pending.set(id,{resolve,reject,timer,method});try{socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));if(method==='Browser.close')report.closeRequestSent={id,at:new Date().toISOString()};}catch(e){clearTimeout(timer);pending.delete(id);if(method==='Browser.close')report.closeRequestSendError=e.message;reject(e);}});}
async function connect(url){socket=new WebSocket(url);socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(p){clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(Error('CDP protocol '+p.method+': '+m.error.message)):p.resolve(m.result);}}else if(m.method==='Runtime.exceptionThrown'||m.method==='Log.entryAdded'&&m.params.entry.level==='error')report.errors.push(m);else if(m.method==='Network.requestWillBeSent')report.requests.push({url:m.params.request.url,method:m.params.request.method});else if(m.method==='Browser.downloadWillBegin')report.downloadEvents.push({event:'begin',...m.params});else if(m.method==='Browser.downloadProgress')report.downloadEvents.push({event:'progress',...m.params});});socket.addEventListener('close',()=>{for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('CDP socket closed '+p.method));}pending.clear();});await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('WebSocket open deadline')),10000);socket.addEventListener('open',()=>{clearTimeout(t);resolve();},{once:true});socket.addEventListener('error',()=>{clearTimeout(t);reject(Error('WebSocket open error'));},{once:true});});}

const CAPTURE_BROWSER_IDENTITY="\n$ErrorActionPreference = 'Stop'\n[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)\n[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)\n$proc = $null\ntry {\n  $spec = [Console]::In.ReadLine() | ConvertFrom-Json\n  $targetId = [int]$spec.pid\n  $proc = [System.Diagnostics.Process]::GetProcessById($targetId)\n  $heldHandle = $proc.Handle\n  $ticks = $proc.StartTime.ToUniversalTime().Ticks.ToString()\n  $exe = $proc.MainModule.FileName\n  $row = Get-CimInstance Win32_Process -Filter (\"ProcessId=\" + $targetId)\n  if ($null -eq $row -or $proc.HasExited) { throw 'CDP browser is not a live process' }\n  if ([int]$row.ProcessId -ne $targetId) { throw 'CIM PID mismatch' }\n  if (-not [String]::Equals($exe,[string]$row.ExecutablePath,[StringComparison]::OrdinalIgnoreCase)) { throw 'CIM/process executable mismatch' }\n  if ($proc.StartTime.ToUniversalTime().Ticks.ToString() -cne $ticks) { throw 'Process identity changed during capture' }\n  [Console]::Out.WriteLine(([ordered]@{\n    pid=$targetId;parentPid=[int]$row.ParentProcessId;executablePath=$exe;\n    startTimeUtcTicks=$ticks;cimCreationTimeUtc=$row.CreationDate.ToUniversalTime().ToString('o');\n    commandLine=[string]$row.CommandLine\n  } | ConvertTo-Json -Compress))\n  [Console]::Out.Flush()\n} catch {\n  [Console]::Error.WriteLine($_.Exception.Message)\n  exit 2\n} finally {\n  if ($null -ne $proc) { $proc.Dispose() }\n}\n";
async function admitBrowserObserver(){
 const info=await cmd('SystemInfo.getProcessInfo');report.cdpProcessInfo=info;
 const browsers=info.processInfo.filter(x=>x.type==='browser');assert.equal(browsers.length,1,'one CDP browser owner');const browserPid=browsers[0].id;assert.ok(Number.isSafeInteger(browserPid)&&browserPid>0,'CDP browser PID');
 const t=performance.now(),p=spawnSync(POWERSHELL,['-NoProfile','-NonInteractive','-Command',CAPTURE_BROWSER_IDENTITY],{input:JSON.stringify({pid:browserPid})+'\n',encoding:'utf8',timeout:10000,windowsHide:true,maxBuffer:64*1024});
 report.browserIdentityCapture={argv:[POWERSHELL,'-NoProfile','-NonInteractive','-Command',CAPTURE_BROWSER_IDENTITY],pid:p.pid,status:p.status,signal:p.signal,error:p.error?.message??null,stdout:p.stdout,stderr:p.stderr,elapsedMs:performance.now()-t};
 assert.equal(p.status,0,'native browser identity capture');assert.equal(p.signal,null);assert.equal(p.error,undefined);assert.equal(p.stderr,'');const identity=JSON.parse(p.stdout);assert.equal(identity.pid,browserPid);assert.equal(identity.executablePath.toLowerCase(),CHROME.toLowerCase());assert.match(identity.startTimeUtcTicks,/^[1-9][0-9]{15,18}$/);
 if(browserPid===child.pid){assert.equal(identity.parentPid,process.pid,'direct browser parent');report.browserLaunchRelation='direct';}else{assert.equal(identity.parentPid,child.pid,'single owned launcher handoff');report.browserLaunchRelation='single-handoff';}
 report.browserIdentity=identity;report.browserPid=browserPid;
 try{browserObserver=await observeOwnedChromeProcess({pid:browserPid,parentPid:identity.parentPid,executablePath:CHROME,profilePath:PROFILE,startTimeUtcTicks:identity.startTimeUtcTicks,waitMs:150000,readyTimeoutMs:10000});}
 catch(e){observerAdmissionError=e;report.browserObserverAdmissionFailure={message:e.message,observerPid:e.observerPid??null};throw e;}
 assert.equal(browserObserver.identity.commandLine,identity.commandLine,'same fresh CIM command line');assert.equal(browserObserver.identity.cimCreationTimeUtc,identity.cimCreationTimeUtc);report.browserObserverReady=browserObserver.identity;
 assert.ok(child.exitCode===null||child.exitCode===0,'launcher must not fail during handoff');assert.equal(child.signalCode,null,'launcher must not signal during handoff');
}

async function evaluate(session,expression){const r=await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},session);assert.equal(r.exceptionDetails,undefined,JSON.stringify(r.exceptionDetails));return r.result.value;}

let session,frameId,ref,fixtures=[],currentFixture=null,currentExpected=null,width=1280,observationNumber=0;
const deadline=()=>assert.ok(performance.now()-started<150000,'frozen 150-second receiver budget');
async function ev(expression){deadline();return evaluate(session,expression);}
async function until(expression,label){const end=performance.now()+10000;for(;;){if(await ev(expression))return;assert.ok(performance.now()<end,label+' deadline');await delay(20);}}
async function click(selector){return ev('(()=>{const e=document.querySelector('+JSON.stringify(selector)+');if(!e)throw Error("Missing click target");if(e.disabled)throw Error("Disabled click target");e.click();return true;})()');}
async function openWitnesses(){await ev('(()=>{for(const d of document.querySelectorAll("#review details"))if(!d.open)d.querySelector("summary").click();return true;})()');}
async function snap(label,{empty=false,pendingState=false,save=true}={}){
  await openWitnesses();const d=await ev('('+snapshotPage.toString()+')()');
  if(empty)verifyEmpty(d,width,{pending:pendingState});else verifyReview(d,currentExpected,currentFixture.source,width,{pending:pendingState});
  if(save){const name=String(observationNumber++).padStart(3,'0')+'-'+label.replace(/[^a-z0-9-]/gi,'-')+'.json';const p=write(name,JSON.stringify(d,null,2)+'\n');report.observations.push({label,source:currentFixture?.source??null,selection:currentExpected?.selection.index??null,width,pending:pendingState,empty,artifact:p});}
  return d;
}
function fixture(relative,bytes,expectedIndex=0){
  const p=path.join(FIXTURES,...relative.split('/'));assert.ok(p.startsWith(FIXTURES+path.sep));fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,bytes,{flag:'wx'});
  const pinning=pin(p),source={filename:path.basename(p),bytes:pinning.bytes,sha256:pinning.sha256};return{path:p,source,pin:pinning,expectedIndex};
}
async function selectFile(f){
  const document=await cmd('DOM.getDocument',{},session);const input=await cmd('DOM.querySelector',{nodeId:document.root.nodeId,selector:'#course-file'},session);
  assert.ok(input.nodeId>0);await cmd('DOM.setFileInputFiles',{nodeId:input.nodeId,files:[f.path]},session);
}
async function loadValid(f,index=0,label='admitted'){
  await selectFile(f);await until('document.querySelector("#review").getAttribute("aria-busy")==="false" && document.querySelector("#source-sha256").textContent==='+JSON.stringify(f.source.sha256),'file admission');
  currentFixture=f;currentExpected=ref.fixtures[f.expectedIndex].expected[index];
  if(index!==0)await keyboardSelect(index);
  return snap(label);
}
async function keyboardSelect(index){
  await ev('(()=>{const e=document.querySelector("#concept-overview button[data-select-concept=\\"'+index+'\\"]");if(!e||e.disabled)throw Error("Selection unavailable");e.focus();return true;})()');
  await cmd('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'},session);
  await cmd('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13},session);
  currentExpected=ref.fixtures[currentFixture.expectedIndex].expected[index];
  const focused=await ev('document.activeElement?.id');assert.equal(focused,'selected-concept','keyboard selection moves focus to heading');
}
async function actualDownload(label){
  const n=report.downloadEvents.filter(x=>x.event==='begin').length;
  await click('#download-review');
  const end=performance.now()+10000;let begin,complete;
  while(true){
    const starts=report.downloadEvents.filter(x=>x.event==='begin');assert.ok(starts.length<=n+1,'one download per explicit click');begin=starts[n];
    if(begin){assert.equal(begin.suggestedFilename,'course-prerequisite-review.json');assert.equal(begin.frameId,frameId);assert.match(begin.url,/^blob:/);assert.match(begin.guid,/^[a-zA-Z0-9-]+$/);complete=report.downloadEvents.find(x=>x.event==='progress'&&x.guid===begin.guid&&x.state==='completed');assert.ok(!report.downloadEvents.some(x=>x.event==='progress'&&x.guid===begin.guid&&x.state==='canceled'),'download not canceled');if(complete)break;}
    assert.ok(performance.now()<end,'actual download completion deadline');deadline();await delay(20);
  }
  const p=path.join(DOWNLOADS,begin.guid),record=pin(p),raw=fs.readFileSync(p);
  assert.ok(raw.length>0&&raw.length<8*1024**2);assert.equal(raw.at(-1),10);const text=new TextDecoder('utf-8',{fatal:true}).decode(raw);
  assert.ok(!/PRIVATE-(?:OPTION|ANSWER|EXPLANATION|TRANSFER)/.test(text));
  const expected={format:'recallweave-prerequisite-review/1',source:currentFixture.source,report:currentExpected};
  assert.deepEqual(JSON.parse(text),expected,'entire actual downloaded manual report/source envelope');
  assert.equal(complete.receivedBytes,record.bytes);assert.equal(complete.totalBytes,record.bytes);
  report.artifacts.push(record);report.downloads.push({label,begin,complete,file:record,source:currentFixture.source,selection:currentExpected.selection.index,exactManualEnvelope:true});
  return record;
}
async function screen(name,selector=null){
  if(selector)await ev('document.querySelector('+JSON.stringify(selector)+').scrollIntoView({block:"start"});true');
  else await ev('scrollTo(0,0);true');
  return write(name,Buffer.from((await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},session)).data,'base64'));
}
async function invalidFile(f,label,{empty=false}={}){
  await selectFile(f);await until('document.querySelector("#review").getAttribute("aria-busy")==="false" && document.querySelector("#review-status").textContent.startsWith("Could not review this file.")','invalid file refusal');
  const d=await snap(label,{empty});if(!empty)assert.ok(d.state.status.includes('Still showing previous file: '+currentFixture.source.filename+'.'));return d;
}
async function clearCurrent(label){
  await click('#clear-course');currentFixture=null;currentExpected=null;const d=await snap(label,{empty:true});assert.equal(d.state.focus,'course-file');assert.match(d.state.status,/Review cleared/);return d;
}
async function arm(kind,token,f){
  await ev('globalThis.__rwReceiving.arm('+JSON.stringify(kind)+','+JSON.stringify(token)+','+JSON.stringify(f?.source.filename)+')');
}
async function release(token,outcome){
  await ev('globalThis.__rwReceiving.release('+JSON.stringify(token)+','+JSON.stringify(outcome)+')');
  await ev('Promise.resolve().then(()=>true)');
}
async function awaitGate(token){await until('globalThis.__rwReceiving.snapshot().pending.includes('+JSON.stringify(token)+')','controlled pending '+token);}
async function race(kind,outcome,clear){
  const token=kind+'-'+outcome+'-'+(clear?'clear':'replace'),before=fixtures[0],older=fixtures[1],newer=fixtures[2];
  await loadValid(before,2,token+'-baseline');await arm(kind,token,older);await selectFile(older);await awaitGate(token);
  const paused=await snap(token+'-pending',{pendingState:true});assert.match(paused.state.status,/previous file is still shown/);
  if(clear){await clearCurrent(token+'-cleared');await release(token,outcome);await snap(token+'-stale-ignored',{empty:true});}
  else{await loadValid(newer,5,token+'-newer');await release(token,outcome);await snap(token+'-stale-ignored');await actualDownload(token+'-download');}
  report.groups.push({id:token,passed:true,controlledOriginalOperation:kind,staleOutcome:outcome,clear});
}

try {
  assert.equal(process.platform,'win32');assert.equal(process.version,'v24.14.0');assert.equal(process.execPath.toLowerCase(),NODE.toLowerCase());assert.equal(os.userInfo().username,'jacob');assert.equal(os.hostname(),'MSI');assert.ok(!process.env.NODE_OPTIONS&&!process.env.NODE_PATH);
  report.entryCapacity=capacity();for(const p of [OUTPUTS,FIXTURES,PROFILE,path.join(ROOT,'browser-receiving-r1.json')])assert.equal(fs.existsSync(p),false,'fresh own receiver output '+p);
  const manifestPath=path.join(ROOT,'source-manifest-r1.json'),referencePath=path.join(ROOT,'blind-browser-reference.json'),protocolPath=path.join(ROOT,'blind-browser-protocol.json');
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));ref=JSON.parse(fs.readFileSync(referencePath,'utf8'));
  exact(pin(manifestPath),{gitBlob:'95781683993911cbb51d82cfca8fb9652cbf6c3a'});
  exact(pin(referencePath),{gitBlob:report.referenceGit});exact(pin(protocolPath),{gitBlob:report.protocolGit});
  assert.equal(manifest.base,'698902f9c9c1d5c5023092b85b3632a7cb7a01ed');assert.equal(Object.keys(manifest.files).length,11);
  const sourcePins=Object.entries(manifest.files).map(([relative,x])=>{const p=path.join(SOURCE,...relative.split('/'));assert.ok(p.startsWith(SOURCE+path.sep));const r=pin(p);exact(r,{...x,gitBlob:x.git});return r;});
  report.runtimePins=RUNTIMES.map(x=>{const p=pin(x.path);exact(p,x);return p;});
  report.receiverPins=['browser-assertions.mjs','browser-hooks.mjs','owned-chrome-observer.mjs','receive-browser.mjs','blind-browser-reference.json','blind-browser-protocol.json','source-manifest-r1.json'].map(p=>pin(path.join(ROOT,p)));
  exact(report.receiverPins.find(x=>x.path.endsWith('browser-assertions.mjs')),{gitBlob:'b5db3059cf3bc788ae7da7dbfcfd42009aa87df5'});
  exact(report.receiverPins.find(x=>x.path.endsWith('browser-hooks.mjs')),{gitBlob:'328f0b52647707ce962ea9fefe5f916184cbb34e'});
  exact(report.receiverPins.find(x=>x.path.endsWith('owned-chrome-observer.mjs')),{bytes:9286,sha256:'42ee5938f9eaea96b8f494e71c21f624a936b315580a15b33d14bfe19c1bdb8e',gitBlob:'5ca69ca68cde91c2439f3b795f280cbc5e552793'});
  fs.mkdirSync(OUTPUTS);fs.mkdirSync(DOWNLOADS);fs.mkdirSync(FIXTURES);
  fixtures=ref.fixtures.map((f,i)=>fixture(f.name,Buffer.from(f.text,'utf8'),i));
  const single=Buffer.from(ref.fixtures[3].text,'utf8');assert.ok(single.length<262144);
  const boundary=fixture('exact-262144.json',Buffer.concat([single,Buffer.alloc(262144-single.length,32)]),3);
  const oversize=fixture('over-262145.json',Buffer.concat([single,Buffer.alloc(262145-single.length,32)]),3);
  const malformed=Buffer.from(single);const marker=malformed.indexOf(Buffer.from('<review>'));assert.ok(marker>0);malformed[marker]=255;
  const badUtf8=fixture('invalid-literal-utf8.json',malformed,3);
  const bom=fixture('original-BOM.json',Buffer.concat([Buffer.from([239,187,191]),single]),3);
  const broken=fixture('invalid-json.json',Buffer.from('{"title":'),3);
  const cycleData=JSON.parse(ref.fixtures[0].text);cycleData.items[1].prerequisites=['Finish'];
  const cycle=fixture('cyclic-course.json',Buffer.from(JSON.stringify(cycleData)),0);
  const uncoveredData=JSON.parse(ref.fixtures[0].text);uncoveredData.items=uncoveredData.items.filter(x=>x.concept!=='Island');
  const uncovered=fixture('uncovered-course.json',Buffer.from(JSON.stringify(uncoveredData)),0);
  const sameNameA=fixture('same-a/same-course.json',Buffer.from(ref.fixtures[0].text),0),sameNameB=fixture('same-b/same-course.json',Buffer.from(ref.fixtures[1].text),1);
  const allFixtures=[...fixtures,boundary,oversize,badUtf8,bom,broken,cycle,uncovered,sameNameA,sameNameB];
  report.fixturePins=allFixtures.map(f=>f.pin);
  report.before=[...sourcePins,...report.receiverPins,...report.runtimePins,...report.fixturePins];
  report.originalBaseline={sourceBase:manifest.base,absence:'Prerequisite feature absent at frozen original 2915-leaf main; exact baseline tree and existing-validator acceptance are preserved in previously executed independent receipts, not replayed here.',unchangedValidator:'f0f8a4b234489c2388f427633f548d56c6ed4c03',validatorReceipt:'7e147874f05d90e7c8d89153f6725612ebcd736c',independentNativeReceipt:'362b602ea7af14cbd6fe2c89b089238c0b02b824',replayed:false};
  fs.mkdirSync(PROFILE);profileCreated=true;stdoutFd=fs.openSync(path.join(ROOT,'chrome-r1.stdout'),'wx');stderrFd=fs.openSync(path.join(ROOT,'chrome-r1.stderr'),'wx');
  report.prelaunchCapacity=capacity();
  const args=['--headless=new','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+PROFILE,'--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-default-apps','--disable-extensions','--disable-sync','about:blank'];
  report.browserCommand=[CHROME,...args];child=spawn(CHROME,args,{cwd:ROOT,windowsHide:true,stdio:['ignore',stdoutFd,stderrFd]});report.launcherPid=child.pid;
  closePromise=new Promise(resolve=>child.once('close',(code,signal)=>{report.launcherExitEvent={code,signal,at:new Date().toISOString()};resolve({code,signal});}));child.once('error',e=>report.errors.push({phase:'spawn',message:e.message}));assert.ok(Number.isSafeInteger(child.pid)&&child.pid>0);
  const active=path.join(PROFILE,'DevToolsActivePort'),startupEnd=performance.now()+20000;
  while(!fs.existsSync(active)){assert.ok(child.exitCode===null||child.exitCode===0,'launcher handoff');assert.equal(child.signalCode,null);assert.ok(performance.now()<startupEnd,'Chrome start deadline');await delay(100);}
  const [port,endpoint]=fs.readFileSync(active,'utf8').trim().split(/\r?\n/);assert.match(port,/^\d+$/);assert.match(endpoint,/^\/devtools\/browser\/[\w-]+$/);
  await connect('ws://127.0.0.1:'+port+endpoint);report.browserVersion=await cmd('Browser.getVersion');assert.ok(['Chrome/154.0.8037.97','Chrome/154.0.8037.98'].includes(report.browserVersion.product));await admitBrowserObserver();
  const pages=(await cmd('Target.getTargets')).targetInfos.filter(x=>x.type==='page');assert.equal(pages.length,1);assert.equal(pages[0].url,'about:blank');
  session=(await cmd('Target.attachToTarget',{targetId:pages[0].targetId,flatten:true})).sessionId;report.targetId=pages[0].targetId;
  for(const method of ['Page.enable','Runtime.enable','Log.enable','Network.enable'])await cmd(method,{},session);
  await cmd('Network.setBlockedURLs',{urls:['http://*','https://*','ftp://*']},session);
  await cmd('Page.addScriptToEvaluateOnNewDocument',{source:'('+installReceivingHooks.toString()+')()'},session);
  await cmd('Browser.setDownloadBehavior',{behavior:'allowAndName',downloadPath:DOWNLOADS,eventsEnabled:true});
  await cmd('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false},session);
  const nav=await cmd('Page.navigate',{url:pathToFileURL(path.join(SOURCE,'prerequisites.html')).href},session);assert.equal(nav.errorText,undefined);frameId=nav.frameId;report.frameId=frameId;
  await until('document.readyState==="complete" && !!globalThis.__rwReceiving','standalone readiness');await ev('document.fonts.ready.then(()=>true)');
  await snap('initial-empty',{empty:true});
  await ev('document.querySelector("#course-file").focus();true');assert.equal(await ev('document.activeElement.id'),'course-file');
  await screen('initial-desktop.png');report.groups.push({id:'initial-empty',passed:true});
  for(const campaign of ref.selectionCampaign){
    const f=fixtures[campaign.fixture];await loadValid(f,0,'fixture-'+campaign.fixture+'-initial');
    for(const index of campaign.indices){
      if(index!==currentExpected.selection.index)await keyboardSelect(index);
      const d=await snap('fixture-'+campaign.fixture+'-selection-'+index);
      if(campaign.fixture===0&&index===0){
        report.sensitivityControls=runSensitivityControls(d,currentExpected,currentFixture.source,width);assert.equal(report.sensitivityControls.length,11);
        await ev('(()=>{globalThis.__rwKeyEvents=[];globalThis.__rwKeyRecorder=e=>globalThis.__rwKeyEvents.push({type:e.type,key:e.key,code:e.code,keyCode:e.keyCode,charCode:e.charCode,isTrusted:e.isTrusted,tag:e.target.tagName});for(const t of ["keydown","keypress","keyup"])document.addEventListener(t,globalThis.__rwKeyRecorder,true);document.querySelector("#direct-prerequisites summary").focus();return document.activeElement.tagName;})()');
        assert.equal(await ev('document.activeElement.tagName'),'SUMMARY');
        await cmd('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13},session);
        await cmd('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13},session);
        report.keyboardTransportControl={original:await ev('globalThis.__rwKeyEvents'),originalOpen:await ev('document.querySelector("#direct-prerequisites details").open')};
        assert.equal(report.keyboardTransportControl.originalOpen,true);
        assert.deepEqual(report.keyboardTransportControl.original.map(x=>x.type),['keydown','keyup'],'original incomplete event sequence lacks keypress');
        for(const x of report.keyboardTransportControl.original)assert.equal(x.isTrusted,true);
        await ev('globalThis.__rwKeyEvents=[];true');
        for(const expectedOpen of [false,true]){
          await cmd('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'},session);
          await cmd('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13},session);
          assert.equal(await ev('document.querySelector("#direct-prerequisites details").open'),expectedOpen,'complete native Enter witness disclosure');
        }
        report.keyboardTransportControl.corrected=await ev('globalThis.__rwKeyEvents');
        assert.deepEqual(report.keyboardTransportControl.corrected.map(x=>x.type),['keydown','keypress','keyup','keydown','keypress','keyup']);
        assert.ok(report.keyboardTransportControl.corrected.every(x=>x.isTrusted&&x.tag==='SUMMARY'));
        assert.ok(report.keyboardTransportControl.corrected.filter(x=>x.type==='keypress').every(x=>x.charCode===13));
        report.keyboardTransportControl.passed=true;
        await ev('for(const t of ["keydown","keypress","keyup"])document.removeEventListener(t,globalThis.__rwKeyRecorder,true);true');
        await screen('union-desktop-witnesses.png','#direct-prerequisites');
      }
      await actualDownload('fixture-'+campaign.fixture+'-selection-'+index);
      if(campaign.fixture===1&&index===2)await screen('diamond-desktop-dependent-paths.png','#dependent-paths');
      if(campaign.fixture===2&&[0,5,6].includes(index)){
        await screen('literal-desktop-'+index+'.png',index===6?'#selected-questions':'#selected-concept');
        width=390;await cmd('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:false},session);
        await snap('literal-phone-'+index);await screen('literal-phone-'+index+'.png',index===6?'#selected-questions':'#selected-concept');
        if(index===0){await screen('literal-phone-provenance.png','#course-title');await screen('literal-phone-witnesses.png','#direct-prerequisites');await screen('literal-phone-paths.png','#requirement-paths');}
        width=1280;await cmd('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false},session);
      }
    }
    report.groups.push({id:'manual-course-'+campaign.fixture,selections:campaign.indices,passed:true});
  }
  await loadValid(boundary,0,'exact-size-limit');assert.equal(currentFixture.source.bytes,262144);await actualDownload('exact-size-limit');
  for(const [f,label] of [[oversize,'over-size-limit'],[badUtf8,'fatal-utf8'],[bom,'original-BOM-refusal'],[broken,'invalid-json'],[cycle,'cyclic-dependencies'],[uncovered,'uncovered-concept']])await invalidFile(f,label);
  await actualDownload('after-all-invalid-replacements');report.groups.push({id:'exact-limit-and-strict-replacement-refusals',cases:6,passed:true});
  await loadValid(sameNameA,2,'same-name-original');const beforeSame=structuredClone(currentFixture.source);await loadValid(sameNameB,5,'same-name-replacement');
  assert.equal(currentFixture.source.filename,beforeSame.filename);assert.notEqual(currentFixture.source.sha256,beforeSame.sha256);await actualDownload('same-name-different-content');
  const beforeCancel=(await ev('('+snapshotPage.toString()+')()')).state.status;
  await ev('document.querySelector("#course-file").dispatchEvent(new Event("change",{bubbles:true}));true');
  const canceled=await snap('empty-file-choice-cancel-transition');assert.equal(canceled.state.status,beforeCancel);
  report.groups.push({id:'same-name-and-cancel',passed:true,cancellationScope:'No-file change transition after reset; not a real OS chooser cancellation'});
  await clearCurrent('explicit-clear');await invalidFile(broken,'invalid-from-empty',{empty:true});
  report.groups.push({id:'clear-and-invalid-empty',passed:true});
  for(const kind of ['read','digest'])for(const [outcome,clear] of [['resolve',false],['reject',false],['resolve',true],['reject',true]])await race(kind,outcome,clear);
  await loadValid(fixtures[0],4,'download-retry-baseline');
  const startsBeforeFailure=report.downloadEvents.filter(x=>x.event==='begin').length;
  await ev('globalThis.__rwReceiving.failURL("retry-once")');await click('#download-review');const failedDownload=await snap('controlled-download-failure');
  assert.match(failedDownload.state.status,/Could not start the review download/);assert.match(failedDownload.state.status,/try again/);
  assert.equal(report.downloadEvents.filter(x=>x.event==='begin').length,startsBeforeFailure);
  await actualDownload('ordinary-retry-after-preparation-failure');report.groups.push({id:'download-failure-and-retry',passed:true});
  report.hooksFinal=await ev('globalThis.__rwReceiving.restore()');assert.equal(report.hooksFinal.restored,true);assert.deepEqual(report.hooksFinal.pending,[]);assert.deepEqual(report.hooksFinal.armed,[]);assert.deepEqual(report.hooksFinal.storageWrites,[]);
  await snap('restored-hook-final-review');await screen('final-desktop.png','#selected-concept');
  assert.deepEqual(report.errors,[]);
  const fileURL=pathToFileURL(path.join(SOURCE,'prerequisites.html')).href;assert.equal(report.requests.filter(x=>x.url===fileURL).length,1);
  assert.ok(report.requests.every(x=>x.method==='GET'&&(x.url===fileURL||report.downloadEvents.some(e=>e.event==='begin'&&e.url===x.url))),'only own direct-file and explicit download requests');
  for(const x of report.artifacts)exact(pin(x.path),x);report.artifactBytes=report.artifacts.reduce((n,x)=>n+x.bytes,0);assert.ok(report.artifactBytes<=268435456);
  assert.equal(report.downloads.length,20);assert.equal(report.groups.length,17);
  report.semanticChecksPassed=true;
} catch(e) {
  report.failure={name:e.name,message:e.message,stack:e.stack};
  if(session&&socket?.readyState===WebSocket.OPEN){try{const d=await evaluate(session,'('+snapshotPage.toString()+')()');write('failure-dom.json',JSON.stringify(d,null,2)+'\n');write('failure-view.png',Buffer.from((await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},session)).data,'base64'));report.hooksAtFailure=d.hooks;}catch(x){report.failureCaptureError=x.message;}}
} finally {
if(browserObserver&&report.browserObserverReady&&socket?.readyState===WebSocket.OPEN){try{await cmd('Browser.close');report.closeResponse='confirmed';}catch(e){report.closeResponseError=e.message;if(!(report.closeRequestSent&&!report.closeRequestSendError&&e.message==='CDP socket closed Browser.close'))report.closeRequestFailure=e.message;}}else if(child)report.closeRequestFailure='Owned browser READY and open control socket unavailable for own close request';
if(browserObserver){try{report.browserObserverClose=await browserObserver.closed;report.browserClose={observed:report.browserObserverClose.confirmedExit===true,code:report.browserObserverClose.exitCode,observerExitCode:report.browserObserverClose.observerExitCode,observerSignal:report.browserObserverClose.observerSignal,method:'retained Windows process handle'};}catch(e){report.browserObserverClose=e.receipt??null;report.browserObserverCloseFailure=e.message;report.browserClose={observed:false,code:null};}}
else if(observerAdmissionError?.observerClosed){try{report.unadmittedObserverClose=await observerAdmissionError.observerClosed;}catch(e){report.unadmittedObserverClose=e.receipt??null;report.unadmittedObserverCloseFailure=e.message;}}
if(child&&closePromise){report.launcherClose=await new Promise(resolve=>{const timer=setTimeout(()=>resolve({observed:false,code:child.exitCode,signal:child.signalCode}),2000);closePromise.then(x=>{clearTimeout(timer);resolve({observed:true,...x});});});}
socket?.close();for(const p of pending.values())clearTimeout(p.timer);pending.clear();if(stdoutFd!==undefined)fs.closeSync(stdoutFd);if(stderrFd!==undefined)fs.closeSync(stderrFd);
if(profileCreated){if(report.browserObserverReady&&report.closeRequestSent&&!report.closeRequestSendError&&!report.closeRequestFailure&&report.browserClose?.observed===true&&report.browserClose.code===0&&report.browserClose.observerExitCode===0&&report.browserClose.observerSignal===null){try{fs.rmSync(PROFILE,{recursive:true,maxRetries:4,retryDelay:100});report.ownProfileRemoved=!fs.existsSync(PROFILE);}catch(e){report.cleanupError=e.message;}}else report.profileRemovalHeld='Owned actual browser READY, successful close transmission and retained-handle zero exit not confirmed';}
try{if(report.before){report.after=report.before.map(x=>pin(x.path));assert.deepEqual(report.after,report.before);report.inputsUnchanged=true;}else report.inputsUnchanged=false;}catch(e){report.preservationError=e.message;report.inputsUnchanged=false;}

if(report.semanticChecksPassed){try{assert.deepEqual(report.errors,[]);const fileURL=pathToFileURL(path.join(SOURCE,'prerequisites.html')).href;assert.equal(report.requests.filter(x=>x.url===fileURL).length,1);assert.ok(report.requests.every(x=>x.method==='GET'&&(x.url===fileURL||report.downloadEvents.some(e=>e.event==='begin'&&e.url===x.url))));assert.equal(report.downloadEvents.filter(x=>x.event==='begin').length,report.downloads.length);report.finalEventsAccepted=true;}catch(e){report.finalEventsAccepted=false;report.finalEventFailure=e.message;}}else report.finalEventsAccepted=false;
report.elapsedMs=performance.now()-started;report.withinFrozenTimeBudget=report.elapsedMs<=150000;
report.accepted=Boolean(report.withinFrozenTimeBudget===true&&report.keyboardTransportControl?.passed===true&&report.sensitivityControls?.length===11&&report.finalEventsAccepted===true&&report.semanticChecksPassed===true&&report.groups.length===17&&report.groups.every(x=>x.passed)&&report.downloads.length===20&&report.hooksFinal?.restored===true&&report.inputsUnchanged===true&&report.browserObserverReady&&report.closeRequestSent&&!report.closeRequestSendError&&!report.closeRequestFailure&&!report.browserObserverCloseFailure&&report.browserClose?.observed===true&&report.browserClose.code===0&&report.browserClose.observerExitCode===0&&report.browserClose.observerSignal===null&&report.launcherClose?.observed===true&&report.launcherClose.code===0&&report.launcherClose.signal===null&&report.ownProfileRemoved===true&&!report.failure);
report.ended=new Date().toISOString();try{fs.writeFileSync(path.join(ROOT,'browser-receiving-r1.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});}catch(e){report.accepted=false;console.error('Receipt write failed: '+e.message);}
console.log(JSON.stringify({accepted:report.accepted,groups:report.groups.length,downloads:report.downloads.length,observations:report.observations.length,artifacts:report.artifacts.length,elapsedMs:report.elapsedMs,browserClose:report.browserClose,launcherClose:report.launcherClose,closeRequestFailure:report.closeRequestFailure,failure:report.failure}));
process.exitCode=report.accepted?0:1;
}
