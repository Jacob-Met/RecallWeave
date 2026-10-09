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
const sourcePaths=["START-HERE.html","README.txt","MANIFEST.json","demo.html","courses/hypergeometric-explorer.html","courses/hypergeometric.json","courses/hypergeometric.md"];
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
 const s=await page("START-HERE.html");
 await wait(s,"document.querySelector('.button')");
 const links=await evaluate(s,"[...document.querySelectorAll('a')].map(a=>({text:a.textContent,url:a.href}))");
 assert.ok(links.every(x=>x.url.startsWith(pathToFileURL(root+path.sep).href)));
 await click(s,".button");await wait(s,"document.querySelector('#results') && !document.querySelector('#results').hidden");
 assert.equal((await state(s)).event,"1/2");
 checks.push("Extracted start page follows its real local link to the exact explorer offline");
 const expected=await fs.readFile(path.join(root,"courses/hypergeometric.json"));
 const saved=await download(s,"#download-course","relocated-hypergeometric.json",expected);
 checks.push("Relocated explorer downloads the exact course bytes");
 await click(s,'a[href="../demo.html"]');await wait(s,"document.querySelector('#deck-file')");
 const {root:dom}=await send("DOM.getDocument",{},s);
 const {nodeId}=await send("DOM.querySelector",{nodeId:dom.nodeId,selector:"#deck-file"},s);
 await send("DOM.setFileInputFiles",{nodeId,files:[saved.path]},s);
 await wait(s,"document.querySelector('#start-deck')");await click(s,"#start-deck");
 await wait(s,"document.querySelector('.question-card h2')");
 const prompt=await evaluate(s,"document.querySelector('.question-card h2').textContent");
 assert.ok(course.items.some(x=>x.prompt===prompt));
 checks.push("Actual extracted explorer-to-learner link admits the downloaded lesson");
 assert.deepEqual(errors,[]);assert.deepEqual(requests.filter(x=>/^https?:/.test(x)),[]);
 assert.equal(await evaluate(s,"window.__storageWrites"),0);assert.deepEqual(await hashSources(),before);
 receipt={success:true,at:new Date().toISOString(),node:process.version,browser:version,checks,source:before,downloads:received,requests,errors,links};
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
