// Original ZIP-use receiver; authored for the fixed eight-member cf5799 delivery.
// Stock Node/CDP mechanics adapted from executed Longwater blob
// a176171e9eec70688c3913a2d03423e655b2c2fd. No Longwater cases/state are reused.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import {createReadStream,constants} from "node:fs";
import path from "node:path";
import {spawn} from "node:child_process";
import {fileURLToPath,pathToFileURL} from "node:url";

const [source,evidence,downloadsDir,profile]=process.argv.slice(2);
assert.equal(process.argv.length,6,"PACKAGE EVIDENCE DOWNLOADS PROFILE required");
for(const p of [source,evidence,downloadsDir,profile])assert.equal(path.resolve(p),p);
const outer=path.dirname(source);
assert.match(path.basename(outer),/^recall-zip-use-6c20bb4b010e-[0-9]+$/);
for(const p of [evidence,downloadsDir,profile])assert.equal(path.dirname(p),outer);
assert.equal(new Set([source,evidence,downloadsDir,profile]).size,4);
const EXPECTED={"AI-DISCLOSURE.md":{"bytes":578,"sha256":"f3a9b47aeee8b8f353632012d6816cbb9d24bddbf04358a8d2fc0921ce75796a","git_blob":"a7c78b66d3d366a80108cb7650f894d293d70fa7"},"MANIFEST.sha256":{"bytes":616,"sha256":"c0ef6bb1aa105024fa47800701e7a5409e8b3acda7a6ef66d789ff932735aea1","git_blob":"654a200ea39ea1dc9f161ead8d9ed2d02ec2835c"},"SOURCE-PROVENANCE.json":{"bytes":3224,"sha256":"e8209402ceddb7f674daf2461942ea71c758cb6f4472be9889cebb5ba13b5aa4","git_blob":"4243f30417e5fbe6d2142c8dc417790386db02bf"},"START-HERE.html":{"bytes":3625,"sha256":"be0548a518d3841ddc90351453f58bbb07a0702f7d2a01533ad4fd7e0738ed57","git_blob":"9f2be3e41696f02c05b38166e08f7ceffb7d4302"},"courses/edit-distance-explorer.html":{"bytes":47877,"sha256":"eff706073ff25346d0b88e3f292ffcf02158db147f9f4dae0e18d1e08e2f3a01","git_blob":"e358cedae9a3b7f14ecb2d341faa3417f75d0cff"},"courses/edit-distance.json":{"bytes":11066,"sha256":"753499d3f6909d46d7628a5cabd85f2f5d2f94e9719d58313cbf13d73374df99","git_blob":"df3aaf73eac33ce64ca7efd098a200385749a70e"},"courses/edit-distance.md":{"bytes":9713,"sha256":"e48e2bbb2bad6f05cca0c64b8714d19f36b99de701555e019de283fb80a25a57","git_blob":"249bd1dfc7b4156f6d4496465afc10439c6bca24"},"demo.html":{"bytes":98468,"sha256":"fe7d44d125f9797c867251c05f02868a7cacf91c7d5129f46bbca3c69dc7ae1d","git_blob":"ef7bc3e27e7f161d917ced6a457fad8822802f3f"}};
const NODE={path:"/opt/codex/runtimes/codex-primary-runtime/dependencies/node/bin/node",bytes:125989464,sha256:"bc17c508ffeed0ec622934f9b7fa72f8e78da65350e63c3eceb56fa688aa5e12"};
const CHROME={path:"/tmp/hamon-project-browser-ce7eb129730f/portable-153/chromium",bytes:209022176,sha256:"53a15d6c3a3d27dfb54c4ba60278b1683136f70cf1e67e989da7dfbd3d451ef0"};
const startedAt=new Date().toISOString();
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const pin=b=>({bytes:b.length,sha256:sha(b),git_blob:crypto.createHash("sha1").update("blob "+b.length+"\0").update(b).digest("hex")});
let browser,socket,session,context,log,logQueue=Promise.resolve(),logFailure=null;
let nextId=0,phase="admission",fatal=null,stopReason=null,chromeStderr="",stderrOverflow=false;
let browserExit=null,browserError=null,flowCompleted=false,deadline,evidenceIdentity=null;
const pending=new Map(),events=[],downloads=[],requests=[],exceptions=[],responses=[],phases=[],cleanup=[];
let beforeMembers=null,afterMembers=null,runtime=null,version=null;
const selfPin=pin(await fs.readFile(fileURLToPath(import.meta.url)));
async function privateDirectory(p){
  const s=await fs.lstat(p);
  assert.ok(s.isDirectory()&&!s.isSymbolicLink(),p);
  assert.equal(s.uid,process.getuid(),p);
  assert.equal(s.mode&0o777,0o700,p);
  assert.equal(await fs.realpath(p),p,p);
  return{dev:s.dev,ino:s.ino};
}
async function binaryPin(expected){
  const before=await fs.lstat(expected.path);
  assert.ok(before.isFile()&&!before.isSymbolicLink(),expected.path);
  assert.equal(before.size,expected.bytes);
  const h=crypto.createHash("sha256");
  for await(const chunk of createReadStream(expected.path))h.update(chunk);
  assert.equal(h.digest("hex"),expected.sha256,expected.path);
  const after=await fs.lstat(expected.path);
  assert.deepEqual([after.dev,after.ino,after.size,after.mtimeMs],[before.dev,before.ino,before.size,before.mtimeMs]);
  return{...expected,dev:after.dev,ino:after.ino};
}
async function resourceAdmission(){
  const m=(await fs.readFile("/proc/meminfo","utf8")).match(/^MemAvailable:\s+([0-9]+)\s+kB$/m);
  assert.ok(m,"MemAvailable available");
  const memory=Number(m[1])*1024;
  const disk=await fs.statfs(outer),available=Number(disk.bavail)*Number(disk.bsize);
  assert.ok(memory>=1073741824,"1 GiB MemAvailable floor");
  assert.ok(available>=536870912,"512 MiB stage filesystem floor");
  return{at:new Date().toISOString(),memAvailable:memory,filesystemAvailable:available};
}
async function memberReadback(){
  await privateDirectory(source);
  const rows={};
  assert.deepEqual((await fs.readdir(source)).sort(),["AI-DISCLOSURE.md","MANIFEST.sha256","SOURCE-PROVENANCE.json","START-HERE.html","courses","demo.html"].sort());
  await privateDirectory(path.join(source,"courses"));
  assert.deepEqual((await fs.readdir(path.join(source,"courses"))).sort(),["edit-distance-explorer.html","edit-distance.json","edit-distance.md"]);
  for(const [name,expected]of Object.entries(EXPECTED)){
    const p=path.join(source,name),s=await fs.lstat(p);
    assert.ok(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1,name);
    assert.equal(s.uid,process.getuid());assert.equal(s.mode&0o777,0o600);
    const raw=await fs.readFile(p);rows[name]=pin(raw);assert.deepEqual(rows[name],expected,name);
  }
  return rows;
}
function record(direction,value){
  const item={at:new Date().toISOString(),phase,direction,value};
  const line=JSON.stringify(item)+"\n";
  if(events.length>=3000||Buffer.byteLength(line)>262144){
    stopReason??="protocol evidence bound exceeded";return;
  }
  events.push(item);
  logQueue=logQueue.then(async()=>{await requireOwnedEvidence();await log.write(line);}).catch(error=>{logFailure??=String(error);stopReason??="protocol evidence write failed";});
}
function send(method,params={},sessionId=session,timeout=10000){
  if(stopReason&&phase!=="cleanup")return Promise.reject(Error(stopReason));
  const id=++nextId,message={id,method,params,...(sessionId?{sessionId}:{})};
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{pending.delete(id);reject(Error("CDP timeout: "+method));},timeout);
    pending.set(id,{resolve,reject,timer});record("send",message);
    try{socket.send(JSON.stringify(message));}
    catch(error){clearTimeout(timer);pending.delete(id);reject(error);}
  });
}
async function evaluate(expression){
  const result=await send("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});
  if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);
  return result.result.value;
}
async function until(expression){
  const end=Date.now()+10000;
  while(Date.now()<end){if(stopReason)throw Error(stopReason);if(await evaluate(expression))return;await delay(40);}
  throw Error("Browser condition not reached: "+expression);
}
async function click(selector){
  const point=await evaluate("(()=>{const e=document.querySelector("+JSON.stringify(selector)+");if(!e||e.disabled)throw Error('Missing or disabled target');e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();if(!r.width||!r.height)throw Error('Hidden target');return{x:r.x+r.width/2,y:r.y+r.height/2}})()");
  await send("Input.dispatchMouseEvent",{type:"mousePressed",button:"left",clickCount:1,...point});
  await send("Input.dispatchMouseEvent",{type:"mouseReleased",button:"left",clickCount:1,...point});
}
async function requireOwnedEvidence(){
  assert.ok(evidenceIdentity,"evidence directory was not created by this receiver");
  assert.deepEqual(await privateDirectory(evidence),evidenceIdentity,"owned evidence identity changed");
}
async function writeJSON(name,value){
  await requireOwnedEvidence();
  await fs.writeFile(path.join(evidence,name),JSON.stringify(value,null,2)+"\n",{flag:"wx",mode:0o600});
}
async function screenshot(name){
  const result=await send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});
  const bytes=Buffer.from(result.data,"base64");
  assert.ok(bytes.length<=4*1024*1024,"screenshot byte bound");
  await requireOwnedEvidence();
  await fs.writeFile(path.join(evidence,name),bytes,{flag:"wx",mode:0o600});
  return{name,...pin(bytes)};
}
async function actualDownload(selector,filename,member){
  const offset=downloads.length;
  await click(selector);
  const end=Date.now()+10000;
  while(Date.now()<end&&!downloads.slice(offset).some(d=>d.state==="completed")){if(stopReason)throw Error(stopReason);await delay(40);}
  const fresh=downloads.slice(offset);
  assert.equal(fresh.length,1,"exactly one actual download for click");
  const d=fresh[0];assert.equal(d.state,"completed");assert.equal(d.suggestedFilename,filename);
  assert.match(d.guid,/^[a-zA-Z0-9-]+$/);
  const original=path.join(downloadsDir,d.guid),s=await fs.lstat(original);
  assert.ok(s.isFile()&&!s.isSymbolicLink());
  const raw=await fs.readFile(original);assert.deepEqual(pin(raw),EXPECTED[member]);
  const named=path.join(downloadsDir,filename);
  await fs.copyFile(original,named,constants.COPYFILE_EXCL);
  assert.deepEqual(await fs.readFile(named),raw);
  d.receivedPin=pin(raw);d.savedOriginal=original;d.namedCopy=named;
  return{filename,member,...pin(raw),downloadGuid:d.guid};
}
function onMessage(event){
  let message;
  try{message=JSON.parse(event.data);}catch(error){stopReason??=String(error);return;}
  // Preserve full responses, except screenshots whose original bytes are saved separately.
  const request=pending.get(message.id);
  record("receive",message.result?.data&&typeof message.result.data==="string"
    ?{...message,result:{...message.result,data:"[saved PNG bytes; base64 omitted from protocol log]"}}:message);
  if(request){pending.delete(message.id);clearTimeout(request.timer);message.error?request.reject(Error(JSON.stringify(message.error))):request.resolve(message.result);}
  if(message.method==="Runtime.exceptionThrown")exceptions.push(message.params.exceptionDetails);
  if(message.method==="Network.requestWillBeSent")requests.push({url:message.params.request.url,method:message.params.request.method});
  if(message.method==="Network.responseReceived")responses.push({url:message.params.response.url,status:message.params.response.status});
  if(message.method==="Browser.downloadWillBegin")downloads.push({...message.params});
  if(message.method==="Browser.downloadProgress"){const row=downloads.find(d=>d.guid===message.params.guid);if(row)Object.assign(row,message.params);}
}
async function closeBrowser(){
  phase="cleanup";
  if(socket?.readyState===1){
    if(context)try{await send("Target.disposeBrowserContext",{browserContextId:context},null,2000);cleanup.push({operation:"dispose-context",ok:true});}
    catch(error){cleanup.push({operation:"dispose-context",ok:false,error:String(error)});}
    try{await send("Browser.close",{},null,2000);cleanup.push({operation:"Browser.close",ok:true});}
    catch(error){cleanup.push({operation:"Browser.close",ok:false,error:String(error)});}
  }
  if(browser&&browserExit===null){
    const end=Date.now()+4000;while(browserExit===null&&Date.now()<end)await delay(50);
  }
  if(browser&&browserExit===null){
    cleanup.push({operation:"SIGTERM-own-browser-child",pid:browser.pid,sent:browser.kill("SIGTERM")});
    const end=Date.now()+3000;while(browserExit===null&&Date.now()<end)await delay(50);
  }
  if(browser&&browserExit===null){
    cleanup.push({operation:"SIGKILL-own-browser-child",pid:browser.pid,sent:browser.kill("SIGKILL")});
    const end=Date.now()+2000;while(browserExit===null&&Date.now()<end)await delay(50);
  }
  cleanup.push({operation:"direct-browser-exit",observed:browserExit!==null,exit:browserExit,error:browserError});
  // Descendant/group reconciliation belongs to the admitted outer parent.
  // Keep profile and every evidence/download file for parent export/ACK custody.
  socket?.close();
  for(const item of pending.values()){clearTimeout(item.timer);item.reject(Error("receiver closing"));}
  pending.clear();
}
const stop=reason=>{
  stopReason??=reason;
  for(const [id,item]of pending){clearTimeout(item.timer);item.reject(Error(stopReason));pending.delete(id);}
};
process.once("SIGTERM",()=>stop("outer parent SIGTERM"));
process.once("SIGINT",()=>stop("outer parent SIGINT"));
try{
  await privateDirectory(outer);await privateDirectory(source);
  await fs.mkdir(evidence,{mode:0o700,recursive:false});
  evidenceIdentity=await privateDirectory(evidence);
  for(const p of [downloadsDir,profile])await fs.mkdir(p,{mode:0o700,recursive:false});
  await requireOwnedEvidence();
  log=await fs.open(path.join(evidence,"protocol.jsonl"),"wx",0o600);
  assert.equal(process.execPath,NODE.path);assert.equal(process.version,"v24.19.0");
  for(const name of ["NODE_OPTIONS","NODE_COMPILE_CACHE","NODE_V8_COVERAGE"])assert.ok(!process.env[name],name+" must be absent/empty");
  const factoryNodeModules="/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules";
  if(process.env.NODE_PATH){assert.equal(process.env.NODE_PATH,factoryNodeModules,"Only the admitted factory NODE_PATH is permitted");assert.equal(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,factoryNodeModules,"Factory runtime modules binding changed");}
  const nodeEnvironment={kind:"factory-node-path-admission",factoryNodeModules,values:Object.fromEntries(["NODE_PATH","CODEX_PRIMARY_RUNTIME_NODE_MODULES","NODE_OPTIONS","NODE_V8_COVERAGE","NODE_COMPILE_CACHE"].map(name=>[name,process.env[name]??null]))};
  runtime={nodeEnvironment,node:await binaryPin(NODE),chromium:await binaryPin(CHROME),resource:await resourceAdmission()};
  beforeMembers=await memberReadback();
  const course=JSON.parse(await fs.readFile(path.join(source,"courses/edit-distance.json"),"utf8"));
  assert.equal(course.items.length,12);assert.equal(course.concepts.length,4);
  assert.equal(course.items[0].id,"edit-01");assert.equal(course.items[0].answer,1);
  assert.equal(course.items[0].options[1],"1, by substituting the middle symbol");
  deadline=setTimeout(()=>stop("180-second receiver deadline"),180000);
  phase="browser-start";
  browser=spawn(CHROME.path,["--headless=new","--no-sandbox","--disable-dev-shm-usage","--disable-gpu","--no-first-run","--no-default-browser-check","--disable-background-networking","--disable-component-update","--disable-sync","--disable-extensions","--password-store=basic","--remote-debugging-address=127.0.0.1","--remote-debugging-port=0","--user-data-dir="+profile,"about:blank"],{stdio:["ignore","ignore","pipe"]});
  browser.on("error",error=>{browserError=String(error);stop(browserError);});
  browser.on("exit",(code,signal)=>{browserExit={code,signal};});
  browser.stderr.on("data",chunk=>{
    const text=chunk.toString("utf8");
    if(Buffer.byteLength(chromeStderr)+chunk.length>1048576){stderrOverflow=true;stop("Chrome stderr exceeded1MiB");return;}
    chromeStderr+=text;
  });
  await writeJSON("browser-child.json",{pid:browser.pid,parent:process.pid,detached:false,spawnedAt:new Date().toISOString(),profile});
  const startupEnd=Date.now()+20000;let endpoint;
  while(Date.now()<startupEnd&&!endpoint){
    if(stopReason||browserExit)throw Error(stopReason||"browser exited during startup");
    endpoint=chromeStderr.match(/DevTools listening on (ws:\/\/127\.0\.0\.1:[^\s]+)/)?.[1];
    if(!endpoint)await delay(40);
  }
  assert.ok(endpoint,"bounded local CDP endpoint");
  socket=new WebSocket(endpoint);
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error("WebSocket open timeout")),10000);
    socket.addEventListener("open",()=>{clearTimeout(timer);resolve();},{once:true});
    socket.addEventListener("error",e=>{clearTimeout(timer);reject(Error(String(e)));},{once:true});
  });
  socket.addEventListener("message",onMessage);
  socket.addEventListener("close",()=>{if(phase!=="cleanup")stop("CDP socket closed unexpectedly");});
  version=await send("Browser.getVersion",{},null);
  assert.match(version.product,/^(?:HeadlessChrome|Chrome)\/153\.0\.8010\.0$/);
  context=(await send("Target.createBrowserContext",{disposeOnDetach:true},null)).browserContextId;
  await send("Browser.setDownloadBehavior",{behavior:"allowAndName",browserContextId:context,downloadPath:downloadsDir,eventsEnabled:true},null);
  const target=(await send("Target.createTarget",{url:"about:blank",browserContextId:context},null)).targetId;
  session=(await send("Target.attachToTarget",{targetId:target,flatten:true},null)).sessionId;
  for(const name of ["Runtime","Page","DOM","Network"])await send(name+".enable");
  await send("Network.setBlockedURLs",{urls:["http://*","https://*","ws://*","wss://*","ftp://*"]});
  await send("Emulation.setDeviceMetricsOverride",{width:1280,height:900,deviceScaleFactor:1,mobile:false});
  const startURL=pathToFileURL(path.join(source,"START-HERE.html")).href;
  phase="entry-and-downloads";
  await send("Page.navigate",{url:startURL});
  await until("document.readyState==='complete'&&!!document.querySelector('a[href=\"courses/edit-distance-explorer.html\"]')");
  const entry=await evaluate("({url:location.href,title:document.title,links:[...document.querySelectorAll('a')].map(a=>({text:a.textContent,href:a.getAttribute('href')}))})");
  assert.equal(entry.url,startURL);await writeJSON("entry.json",entry);
  await click('a[href="courses/edit-distance-explorer.html"]');
  await until("document.readyState==='complete'&&!!document.querySelector('#edit-download-lesson')");
  assert.equal(await evaluate("location.href"),pathToFileURL(path.join(source,"courses/edit-distance-explorer.html")).href);
  const got=[
    await actualDownload("#edit-download-lesson","edit-distance.json","courses/edit-distance.json"),
    await actualDownload("#edit-download-guide","edit-distance.md","courses/edit-distance.md")
  ];
  await writeJSON("downloads.json",got);phases.push({name:phase,passed:true,downloads:got});

  phase="native-file-preview";
  await send("Page.navigate",{url:startURL});
  await until("document.readyState==='complete'&&!!document.querySelector('a[href=\"demo.html\"]')");
  await click('a[href="demo.html"]');
  await until("document.readyState==='complete'&&!!document.querySelector('#deck-file')");
  assert.equal(await evaluate("location.href"),pathToFileURL(path.join(source,"demo.html")).href);
  const biology=await evaluate("({subject:document.querySelector('#lesson-subject').textContent,size:document.querySelector('#lesson-size').textContent,count:document.querySelector('#step-count').textContent,previewHidden:document.querySelector('#deck-preview').hidden})");
  assert.deepEqual(biology,{subject:"FIELD NOTES  /  BIOLOGY 01",size:"6 short challenges",count:"0 / 6",previewHidden:true});
  await writeJSON("biology.json",biology);
  const document=await send("DOM.getDocument");
  const input=await send("DOM.querySelector",{nodeId:document.root.nodeId,selector:"#deck-file"});
  assert.ok(input.nodeId);
  const chosen=path.join(downloadsDir,"edit-distance.json");
  assert.deepEqual(pin(await fs.readFile(chosen)),EXPECTED["courses/edit-distance.json"]);
  await send("DOM.setFileInputFiles",{nodeId:input.nodeId,files:[chosen]});
  await until("!document.querySelector('#deck-preview').hidden&&!!document.querySelector('#start-deck')");
  await click("#deck-preview .deck-questions > summary");
  await until("document.querySelector('#deck-preview .deck-questions').open");
  const preview=await evaluate("({title:document.querySelector('#deck-preview-title').textContent,count:document.querySelector('.deck-preview-count').textContent,attribution:document.querySelector('.deck-preview-attribution').textContent,license:document.querySelector('.deck-preview-license').textContent,prompts:[...document.querySelectorAll('.deck-questions ol>li>strong')].map(e=>e.textContent),detailsOpen:document.querySelector('.deck-questions').open,currentCount:document.querySelector('#step-count').textContent,filename:document.querySelector('#deck-file').files[0].name})");
  assert.equal(preview.title,course.title);
  assert.equal(preview.count,"edit-distance.json · 12 questions · 4 concepts");
  assert.equal(preview.attribution,"Attribution supplied in the deck: "+course.attribution);
  assert.equal(preview.license,"License supplied in the deck: "+course.license);
  assert.deepEqual(preview.prompts,course.items.map(i=>i.prompt));
  assert.equal(preview.detailsOpen,true);assert.equal(preview.currentCount,"0 / 6");
  assert.equal(preview.filename,"edit-distance.json");
  await writeJSON("preview.json",preview);
  await screenshot("preview.png");phases.push({name:phase,passed:true,selectedFile:chosen});

  phase="single-answer-feedback";
  await click("#start-deck");
  await until("!!document.querySelector('#session-content .question-card h2')");
  // Start this deck renders the question directly; do not click a welcome control.
  const question=await evaluate("({title:document.querySelector('#lesson-description').textContent,size:document.querySelector('#lesson-size').textContent,concepts:[...document.querySelectorAll('#lesson-map .deck-concept')].map(e=>e.textContent),count:document.querySelector('#step-count').textContent,prompt:document.querySelector('#session-content .question-card h2').textContent,choices:[...document.querySelectorAll('#session-content .choice')].map(e=>({choice:e.dataset.choice,text:[...e.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join('').trim(),disabled:e.disabled})),previewHidden:document.querySelector('#deck-preview').hidden})");
  assert.equal(question.title,course.title);assert.equal(question.size,"12 challenges");
  assert.deepEqual(question.concepts,course.concepts);assert.equal(question.count,"0 / 12");
  assert.equal(question.prompt,course.items[0].prompt);assert.equal(question.previewHidden,true);
  assert.equal(question.choices.length,4);
  for(const choice of question.choices){assert.equal(choice.text,course.items[0].options[Number(choice.choice)]);assert.equal(choice.disabled,false);}
  await writeJSON("question.json",question);
  await click('#session-content .choice[data-choice="1"]');
  await until("document.querySelector('#step-count').textContent==='1 / 12'&&!!document.querySelector('#feedback-slot .feedback')");
  const feedback=await evaluate("({heading:document.querySelector('#feedback-slot .feedback>strong').textContent,text:document.querySelector('#feedback-slot .feedback').textContent,answers:[...document.querySelectorAll('#feedback-slot .feedback>p')].map(p=>p.textContent),transfer:document.querySelector('#feedback-slot .why').textContent,count:document.querySelector('#step-count').textContent,max:document.querySelector('[role=progressbar]').getAttribute('aria-valuemax'),now:document.querySelector('[role=progressbar]').getAttribute('aria-valuenow'),choices:[...document.querySelectorAll('#session-content .choice')].map(e=>({choice:e.dataset.choice,disabled:e.disabled,correct:e.classList.contains('correct')})),next:document.querySelector('#next-button').textContent,focused:document.activeElement.id})");
  assert.equal(feedback.heading,"That connection holds.");
  assert.deepEqual(feedback.answers,["Your answer: "+course.items[0].options[1],"Correct answer: "+course.items[0].options[1]]);
  assert.ok(feedback.text.includes(course.items[0].explanation));
  assert.equal(feedback.transfer,"Try this transfer: "+course.items[0].transfer);
  assert.equal(feedback.count,"1 / 12");assert.equal(feedback.max,"12");assert.equal(feedback.now,"1");
  assert.equal(feedback.focused,"next-button");assert.match(feedback.next,/^Follow the next thread/);
  assert.ok(feedback.choices.every(c=>c.disabled));assert.deepEqual(feedback.choices.filter(c=>c.correct).map(c=>c.choice),["1"]);
  await writeJSON("feedback.json",feedback);await screenshot("feedback.png");
  phases.push({name:phase,passed:true,item:"edit-01",answerIndex:1});
  assert.deepEqual(exceptions,[]);
  const external=requests.filter(r=>/^https?:|^wss?:|^ftp:/i.test(r.url));
  assert.deepEqual(external,[],"no application network requests attempted");
  const outside=requests.filter(r=>r.url.startsWith("file:")&&!fileURLToPath(r.url).startsWith(source+path.sep));
  assert.deepEqual(outside,[],"no file navigation outside extracted package");
  assert.equal(downloads.length,2);
  afterMembers=await memberReadback();assert.deepEqual(afterMembers,beforeMembers);
  flowCompleted=true;
}catch(error){fatal=error.stack||String(error);}
finally{
  clearTimeout(deadline);
  await closeBrowser().catch(error=>cleanup.push({operation:"cleanup-failed",ok:false,error:String(error)}));
  try{afterMembers=await memberReadback();if(beforeMembers)assert.deepEqual(afterMembers,beforeMembers);}
  catch(error){fatal??=error.stack||String(error);}
  if(stderrOverflow||logFailure||stopReason||browserError||browser&&browserExit===null)fatal??=String(stderrOverflow?"stderr overflow":logFailure||stopReason||browserError||"browser exit unobserved");
  try{await logQueue;}catch(error){logFailure??=String(error);}
  if(log)await log.close().catch(error=>{logFailure??=String(error);});
  const receipt={format:"recallweave-extracted-zip-use/v1",startedAt,finishedAt:new Date().toISOString(),driver:selfPin,source,evidence,downloadsDir,profile,originalZip:{bytes:53535,sha256:"a86d823d70be98d08fd804ce9d8bccdb071b586adf5c30c0784a96a5db2a03e9",git_blob:"ae0f3ed4e067fd527b1db7e103270419242db0c2"},node:process.version,runtime,version,evidenceIdentity,phases,flowCompleted,passed:flowCompleted&&!fatal&&!logFailure,beforeMembers,afterMembers,requests,responses,downloads,exceptions,fatal,stopReason,logFailure,cleanup,profileRetained:true,remainingGroupBoundary:"Outer parent must reconcile only its admitted Node/browser process group; direct browser exit alone does not prove every descendant ended.",boundary:"One actual original ZIP-use flow. No historical two-group, mathematical, full12-question, resume, provider, Harmony or installed-adoption qualification. Only normal UI clicks/scrolls, CDP file input and read-only DOM observations."};
  try{
    await requireOwnedEvidence();
    await fs.writeFile(path.join(evidence,"chrome-stderr.log"),chromeStderr,{flag:"wx",mode:0o600});
    await writeJSON("receipt.json",receipt);
  }catch(error){console.error("Evidence retention failed: "+String(error));fatal??=String(error);}
  console.log(JSON.stringify({passed:receipt.passed&&!fatal,flowCompleted,phases:phases.map(p=>p.name),fatal,evidence,profileRetained:true}));
}
if(fatal||logFailure||!flowCompleted)process.exitCode=1;
