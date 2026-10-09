// Optional native receiving: Node22+ and an installed sandboxed Chromium.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import {pathToFileURL,fileURLToPath} from "node:url";
import {spawn} from "node:child_process";
import {distribution,observationJSON} from "../../src/hypergeometric.mjs";
const root=path.resolve(process.argv[2]??fileURLToPath(new URL("../../",import.meta.url)));
const out=path.resolve(process.argv[3]??path.join(root,"../evidence/browser-v1"));
await fs.mkdir(out,{recursive:true});const downloads=path.join(out,"downloads");await fs.mkdir(downloads);
const profile=await fs.mkdtemp(path.join(out,"profile-"));
const sourcePaths=["src/hypergeometric.mjs","src/hypergeometric-ui.mjs","courses/hypergeometric.json","courses/hypergeometric.md","courses/hypergeometric-explorer.template.html","courses/hypergeometric-explorer.html","tools/build-hypergeometric.mjs","demo.html"];
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const hashSources=async()=>Object.fromEntries(await Promise.all(sourcePaths.map(async p=>[p,sha(await fs.readFile(path.join(root,p)))])));
const before=await hashSources(),checks=[],errors=[],requests=[],downloadEvents=[],pending=new Map(),received=[];
const course=JSON.parse(await fs.readFile(path.join(root,"courses/hypergeometric.json")));
let browser,socket,version,nextId=0,receipt;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
function send(method,params={},sessionId){
 const id=++nextId;return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{pending.delete(id);reject(new Error("CDP timeout "+method));},45000);
  pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));
 });
}
async function evaluate(s,expression){
 const r=await send("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true},s);
 if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value;
}
async function wait(s,expression){
 const end=Date.now()+45000;while(Date.now()<end){if(await evaluate(s,expression))return;await delay(70);}throw new Error("Page state timeout: "+expression);
}
async function page(relative){
 const {targetId}=await send("Target.createTarget",{url:"about:blank"});
 const {sessionId:s}=await send("Target.attachToTarget",{targetId,flatten:true});
 for(const method of ["Runtime.enable","Page.enable","Network.enable","DOM.enable"])await send(method,{},s);
 await send("Network.emulateNetworkConditions",{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0},s);
 await send("Page.addScriptToEvaluateOnNewDocument",{source:"window.__storageWrites=0; const old=Storage.prototype.setItem; Storage.prototype.setItem=function(...args){window.__storageWrites++;return old.apply(this,args);};"},s);
 await send("Emulation.setDeviceMetricsOverride",{width:1280,height:950,deviceScaleFactor:1,mobile:false},s);
 await send("Page.navigate",{url:pathToFileURL(path.join(root,relative)).href},s);
 return s;
}
async function click(s,selector){
 const point=await evaluate(s,"(()=>{const e=document.querySelector("+JSON.stringify(selector)+");if(!e)throw new Error('Missing element');e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()");
 await send("Input.dispatchMouseEvent",{type:"mousePressed",button:"left",clickCount:1,...point},s);
 await send("Input.dispatchMouseEvent",{type:"mouseReleased",button:"left",clickCount:1,...point},s);
}
async function set(s,values){
 await evaluate(s,"(()=>{for(const [id,value] of Object.entries("+JSON.stringify(values)+")){const e=document.getElementById(id);e.value=String(value);e.dispatchEvent(new Event('input',{bubbles:true}));}})()");
}
async function configure(s,values){await set(s,values);await click(s,"#apply");await wait(s,"!document.querySelector('#results').hidden");}
async function state(s){return evaluate(s,"(()=>({hidden:document.querySelector('#results').hidden,disabled:document.querySelector('#download-observation').disabled,error:document.querySelector('#error').textContent,status:document.querySelector('#status').textContent,active:document.activeElement.id,rows:[...document.querySelectorAll('#distribution-body tr')].map(x=>({k:Number(x.dataset.k),cells:[...x.cells].map(c=>c.textContent),included:x.classList.contains('event-row')})),support:document.querySelector('#support').textContent,event:document.querySelector('#event-fraction').textContent,mean:document.querySelector('#mean').textContent,variance:document.querySelector('#variance').textContent,factors:document.querySelector('#factors').textContent,sample:document.querySelector('#sample-caption').textContent,selected:document.querySelectorAll('#tokens .selected').length,overflow:document.documentElement.scrollWidth>innerWidth+1,storageWrites:window.__storageWrites}))()");}
const frac=f=>f.denominator==="1"?f.numerator:f.numerator+"/"+f.denominator;
async function parity(s,input){
 const expected=distribution(input),actual=await state(s);
 assert.equal(actual.hidden,false);assert.equal(actual.error,"");assert.equal(actual.rows.length,input.draws+1);
 assert.equal(actual.event,frac(expected.event.probability));assert.equal(actual.support,expected.support.minimum+" through "+expected.support.maximum);
 assert.ok(actual.mean.startsWith(frac(expected.mean)+" ≈ "));assert.ok(actual.variance.startsWith(frac(expected.variance)+" ≈ "));
 for(let k=0;k<=input.draws;k++){
  assert.equal(actual.rows[k].cells[1],expected.rows[k].favourableSubsets);
  assert.equal(actual.rows[k].cells[2],frac(expected.rows[k].probability));
  assert.equal(actual.rows[k].included,expected.rows[k].inEvent);
 }
 return actual;
}
async function download(s,selector,name,expected){
 const start=downloadEvents.length;await click(s,selector);
 const deadline=Date.now()+45000;let begin;
 while(Date.now()<deadline){
  begin=downloadEvents.slice(start).find(e=>e.method==="Browser.downloadWillBegin");
  if(begin&&downloadEvents.some(e=>e.method==="Browser.downloadProgress"&&e.params.guid===begin.params.guid&&e.params.state==="completed"))break;
  await delay(80);
 }
 assert.ok(begin,"download started");
 assert.ok(downloadEvents.some(e=>e.method==="Browser.downloadProgress"&&e.params.guid===begin.params.guid&&e.params.state==="completed"),"download completed");
 const bytes=await fs.readFile(path.join(downloads,begin.params.guid));if(expected!==undefined)assert.deepEqual(bytes,Buffer.from(expected));
 const dest=path.join(downloads,name);await fs.writeFile(dest,bytes,{flag:"wx"});await fs.unlink(path.join(downloads,begin.params.guid));
 const row={name,suggested:begin.params.suggestedFilename,bytes:bytes.length,sha256:sha(bytes)};received.push(row);return {bytes,path:dest,row};
}
async function screenshot(s,name){
 await evaluate(s,"window.scrollTo(0,0)");
 const {cssContentSize:size}=await send("Page.getLayoutMetrics",{},s);
 const shot=await send("Page.captureScreenshot",{format:"png",captureBeyondViewport:true,clip:{x:0,y:0,width:size.width,height:size.height,scale:1}},s);
 await fs.writeFile(path.join(out,name),Buffer.from(shot.data,"base64"));
}
try{
 const executable=process.env.HYPER_CHROMIUM??"/snap/chromium/current/usr/lib/chromium-browser/chrome";
 browser=spawn(executable,["--headless=new","--disable-gpu","--no-first-run","--no-default-browser-check","--disable-background-networking","--disable-component-update","--disable-sync","--disable-extensions","--password-store=basic","--remote-debugging-address=127.0.0.1","--remote-debugging-port=0","--user-data-dir="+profile,"about:blank"],{stdio:["ignore","ignore","pipe"]});
 const endpoint=await new Promise((resolve,reject)=>{
  let stderr="";const timer=setTimeout(()=>reject(new Error("Chromium startup timeout "+stderr.slice(-2000))),90000);
  browser.on("error",e=>{clearTimeout(timer);reject(e);});
  browser.on("exit",code=>{clearTimeout(timer);reject(new Error("Chromium exited "+code+" "+stderr.slice(-2000)));});
  browser.stderr.on("data",b=>{stderr+=b;const m=stderr.match(/DevTools listening on (ws:\/\/127\.0\.0\.1:[^\s]+)/);if(m){clearTimeout(timer);resolve(m[1]);}});
 });
 socket=new WebSocket(endpoint);await new Promise((res,rej)=>{socket.addEventListener("open",res,{once:true});socket.addEventListener("error",rej,{once:true});});
 socket.addEventListener("message",e=>{
  const m=JSON.parse(e.data),p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);}
  if(m.method==="Runtime.exceptionThrown")errors.push(m.params.exceptionDetails);
  if(m.method==="Network.requestWillBeSent")requests.push(m.params.request.url);
  if(m.method?.startsWith("Browser.download"))downloadEvents.push(m);
 });
 version=await send("Browser.getVersion");
 await send("Browser.setDownloadBehavior",{behavior:"allowAndName",downloadPath:downloads,eventsEnabled:true});
 const s=await page("courses/hypergeometric-explorer.html");await wait(s,"document.querySelector('#results') && !document.querySelector('#results').hidden");
 const base={population:8,marked:3,draws:4,lower:2,upper:3};
 await parity(s,base);checks.push("Direct-open offline default exact counts, fractions, event, moments and impossible row");
 await screenshot(s,"explorer-desktop.png");assert.equal((await state(s)).overflow,false);
 await set(s,{marked:2});let x=await state(s);assert.equal(x.hidden,true);assert.equal(x.disabled,true);checks.push("Any input edit retires old results and observation download");
 for(const [values,id] of [[{population:"1e2"},"population"],[{...base,marked:9},"marked"],[{...base,draws:9},"draws"],[{...base,lower:3,upper:2},"upper"]]){
  await set(s,values);await click(s,"#apply");x=await state(s);assert.equal(x.hidden,true);assert.equal(x.disabled,true);assert.ok(x.error);assert.equal(x.active,id);
 }
 checks.push("Malformed digits and incompatible marked/sample/event bounds refuse and focus the relevant field");
 await set(s,base);await evaluate(s,"document.querySelector('#upper').focus()");
 await send("Input.dispatchKeyEvent",{type:"keyDown",key:"Enter",code:"Enter",windowsVirtualKeyCode:13,text:"\r",unmodifiedText:"\r"},s);
 await send("Input.dispatchKeyEvent",{type:"keyUp",key:"Enter",code:"Enter",windowsVirtualKeyCode:13},s);
 await wait(s,"!document.querySelector('#results').hidden");await parity(s,base);checks.push("Keyboard Enter applies the draft");
 await click(s,'[aria-label="Inspect X = 4"]');x=await state(s);assert.match(x.sample,/No compatible subset/);assert.equal(x.selected,0);
 await click(s,'[aria-label="Inspect X = 3"]');x=await state(s);assert.match(x.factors,/1 × 5 = 5/);assert.equal(x.selected,4);assert.equal(x.active,"inspected-title");checks.push("Possible and impossible count inspection keeps literal factors and illustrative subset distinction");
 await download(s,"#download-observation","small-inspect3.json",observationJSON(base,3));checks.push("Actual observation download matches recomputed native JSON byte for byte");
 await click(s,'[data-preset="1"]');x=await state(s);assert.equal(x.hidden,true);assert.equal(x.disabled,true);await click(s,"#apply");
 const impossible={population:10,marked:8,draws:7,lower:0,upper:4};await parity(s,impossible);assert.equal((await state(s)).event,"0");checks.push("Preset stays draft; a valid event outside support remains exact zero");
 for(const input of [{population:7,marked:2,draws:0,lower:0,upper:0},{population:1,marked:0,draws:1,lower:0,upper:1},{population:1,marked:1,draws:1,lower:1,upper:1},{population:9,marked:4,draws:9,lower:4,upper:4}]){
  await configure(s,input);await parity(s,input);
 }
 checks.push("Empty sample, both one-token categories and whole-population census handle exact deterministic boundaries");
 const large={population:200,marked:80,draws:50,lower:18,upper:22};await configure(s,large);await parity(s,large);
 await evaluate(s,"document.querySelector('#inspect').value='20';document.querySelector('#inspect').dispatchEvent(new Event('change',{bubbles:true}));");
 await download(s,"#download-observation","large-inspect20.json",observationJSON(large,20));checks.push("200-token large counts retain exact BigInt strings in actual browser display and download");
 await configure(s,base);
 await send("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:1,mobile:true},s);
 await parity(s,base);x=await state(s);assert.equal(x.overflow,false);
 const geometry=await evaluate(s,"(()=>{const e=document.querySelector('.table-scroll');return{client:e.clientWidth,scroll:e.scrollWidth};})()");
 assert.ok(geometry.scroll>geometry.client);await evaluate(s,"document.querySelector('.table-scroll').scrollLeft=999");
 assert.ok(await evaluate(s,"document.querySelector('.table-scroll').scrollLeft>0"));
 await evaluate(s,"document.querySelector('.table-scroll').scrollLeft=0");await screenshot(s,"explorer-phone.png");checks.push("390px layout contains wide table in actual horizontal scroll without page overflow");
 const courseBytes=await fs.readFile(path.join(root,"courses/hypergeometric.json"));
 const guideBytes=await fs.readFile(path.join(root,"courses/hypergeometric.md"));
 const downloadedCourse=await download(s,"#download-course","hypergeometric.json",courseBytes);
 await download(s,"#download-guide","hypergeometric.md",guideBytes);checks.push("Actual course and worked-guide downloads preserve their exact source bytes");
 const learner=await page("demo.html");await wait(learner,"document.querySelector('#deck-file')");
 const {root:dom}=await send("DOM.getDocument",{},learner);
 const {nodeId}=await send("DOM.querySelector",{nodeId:dom.nodeId,selector:"#deck-file"},learner);
 await send("DOM.setFileInputFiles",{nodeId,files:[downloadedCourse.path]},learner);
 await wait(learner,"document.querySelector('#start-deck')");
 assert.equal(await evaluate(learner,"document.querySelectorAll('#deck-preview li').length"),14);
 await click(learner,"#start-deck");await wait(learner,"document.querySelector('.question-card h2')");
 const seen=[],answers=[];
 for(let i=0;i<14;i++){
  const prompt=await evaluate(learner,"document.querySelector('.question-card h2').textContent");
  const item=course.items.find(q=>q.prompt===prompt);assert.ok(item);assert.ok(!seen.includes(item.id));seen.push(item.id);
  const choice=i===0?(item.answer+1)%item.options.length:item.answer;
  await click(learner,'[data-choice="'+choice+'"]');await wait(learner,"document.querySelector('#next-button')");
  const feedback=await evaluate(learner,"document.querySelector('#feedback-slot').textContent");assert.ok(feedback.includes(item.explanation));assert.ok(feedback.includes(item.transfer));
  answers.push({id:item.id,choice,answer:item.answer});await click(learner,"#next-button");
 }
 await wait(learner,"document.querySelector('#first-try-summary')");
 assert.equal(await evaluate(learner,"document.querySelectorAll('.review-item').length"),14);
 assert.match(await evaluate(learner,"document.querySelector('#first-try-summary').textContent"),/13 of 14/);
 await screenshot(learner,"learner-review.png");checks.push("Downloaded course imports into unchanged native learner:14 unique questions, exact feedback/transfers and review trace");
 await click(learner,"#practice-button");await wait(learner,"document.querySelector('.practice-card h2')");
 const retryPrompt=await evaluate(learner,"document.querySelector('.practice-card h2').textContent");
 const missed=course.items.find(q=>q.id===answers[0].id);assert.equal(retryPrompt,missed.prompt);
 await click(learner,'[data-practice-choice="'+missed.answer+'"]');await click(learner,"#practice-next");
 await wait(learner,"document.querySelector('#practice-status')");assert.match(await evaluate(learner,"document.querySelector('#practice-status').textContent"),/1 of 1/);
 await evaluate(learner,"const e=document.querySelector('#application-reflection');e.value='Uniform subsets matter; equal token inclusion alone is not enough.';e.dispatchEvent(new Event('input',{bubbles:true}));");
 const notes=await download(learner,"#save-notes-button","study-notes.txt");
 const noteText=notes.bytes.toString("utf8");assert.ok(noteText.includes(course.title));assert.ok(noteText.includes("Uniform subsets matter; equal token inclusion alone is not enough."));assert.ok(noteText.includes(missed.explanation));
 checks.push("One missed connection receives a separate successful retry and actual study-notes download retains the authored reflection");
 assert.equal(await evaluate(s,"window.__storageWrites"),0);assert.equal(await evaluate(learner,"window.__storageWrites"),0);
 assert.deepEqual(errors,[]);assert.deepEqual(requests.filter(u=>/^https?:/.test(u)),[]);
 assert.deepEqual(await hashSources(),before);checks.push("Both pages stay offline with no external requests, page exceptions, storage writes or source changes");
 receipt={success:true,at:new Date().toISOString(),node:process.version,browser:version,checks,source:before,downloads:received,requests,errors,answers};
}catch(error){
 receipt={success:false,at:new Date().toISOString(),node:process.version,browser:version,checks,source:before,downloads:received,requests,errors,error:String(error.stack??error)};
 process.exitCode=1;
}finally{
 await fs.writeFile(path.join(out,"receipt.json"),JSON.stringify(receipt,null,2)+"\n");
 for(const p of pending.values())clearTimeout(p.timer);pending.clear();
 if(socket?.readyState===1){try{await send("Browser.close");}catch{}}socket?.close();
 if(browser&&browser.exitCode===null){browser.kill("SIGTERM");await delay(500);if(browser.exitCode===null)browser.kill("SIGKILL");}
 await fs.rm(profile,{recursive:true,force:true});
 console.log(JSON.stringify({success:receipt?.success,checks:checks.length,downloads:received.length,path:path.join(out,"receipt.json"),error:receipt?.error}));
}
