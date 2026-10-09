import fs from 'node:fs';
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
export const sha=b=>createHash('sha256').update(b).digest('hex');
export const delay=ms=>new Promise(r=>setTimeout(r,ms));
export async function until(fn,label,timeout=20000){const end=Date.now()+timeout;let last;while(Date.now()<end){try{const value=await fn();if(value)return value;}catch(e){last=e;}await delay(100);}throw Error('Timed out: '+label+(last?' / '+last.message:''));}
// Receiver-only lifecycle budgets; event-loop starvation still needs an outer process deadline.
const LIFECYCLE = Object.freeze({open:10000,startup:20000,closeCommand:10000,grace:5000,term:5000,kill:5000,io:5000,remove:5000});
async function bounded(label,ms,operation){
 const controller=new AbortController();let timer;
 const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{const e=Error('Receiver deadline: '+label);controller.abort(e);reject(e);},ms);});
 try{return await Promise.race([Promise.resolve().then(()=>operation(controller.signal)),timeout]);}
 finally{clearTimeout(timer);}
}
function socketOpened(socket,ms=LIFECYCLE.open){
 return bounded('WebSocket open',ms,signal=>new Promise((resolve,reject)=>{
  const clean=()=>{socket.removeEventListener('open',onOpen);socket.removeEventListener('error',onError);socket.removeEventListener('close',onClose);signal.removeEventListener('abort',onAbort);};
  const finish=e=>{clean();e?reject(e):resolve();};
  const onOpen=()=>finish(),onError=e=>finish(Error('WebSocket error before open: '+(e.message||e.type))),onClose=()=>finish(Error('WebSocket closed before open')),onAbort=()=>finish(signal.reason);
  socket.addEventListener('open',onOpen);socket.addEventListener('error',onError);socket.addEventListener('close',onClose);signal.addEventListener('abort',onAbort,{once:true});
  if(socket.readyState===1)finish();else if(socket.readyState===2||socket.readyState===3)onClose();else if(signal.aborted)onAbort();
 }));
}
async function startupEndpoint(readEndpoint,isExited,ms=LIFECYCLE.startup){
 return bounded('browser startup endpoint read',ms,async signal=>{
  while(!signal.aborted){
   if(isExited())throw Error('Own browser exited before DevTools endpoint');
   try{const [port,endpoint]=(await readEndpoint(signal)).trim().split('\n');if(port&&endpoint)return{port,endpoint};}
   catch(e){if(signal.aborted)throw signal.reason;if(e.code!=='ENOENT')throw e;}
   await delay(100);
  }
  throw signal.reason;
 });
}
function watchChild(child){
 const state={pid:child.pid,exitObserved:false,closeObserved:false,code:null,signal:null,error:null};
 state.closed=new Promise(resolve=>{
  child.once('exit',(code,signal)=>{state.exitObserved=true;state.code=code;state.signal=signal;});
  child.once('close',(code,signal)=>{state.closeObserved=true;state.code=code;state.signal=signal;resolve();});
  child.once('error',e=>{state.error=e.message;resolve();});
 });
 return state;
}
function childExited(child,state){
 return !child || state?.exitObserved || state?.closeObserved ||
  child.exitCode!==null || child.signalCode!==null ||
  (!Number.isInteger(state?.pid)&&!!state?.error);
}
async function stopOwnChild(child,state,budgets=LIFECYCLE){
 if(!child)return{status:'passed',spawned:false,exited:true,signals:[]};
 const signals=[];
 const wait=async ms=>{if(childExited(child,state))return;await Promise.race([state.closed,delay(ms)]);};
 await wait(budgets.grace);
 for(const [signal,ms] of [['SIGTERM',budgets.term],['SIGKILL',budgets.kill]]){
  if(childExited(child,state))break;
  if(!Number.isInteger(state?.pid)||state.pid<=0||child.pid!==state.pid)throw Error('Refusing signal: own spawned PID identity unavailable');
  const sent=child.kill(signal);signals.push({pid:state.pid,signal,sent});await wait(ms);
 }
 const exited=childExited(child,state);
 return{status:exited?'passed':'failed',spawned:true,pid:state.pid,exited,exitCode:child.exitCode,signalCode:child.signalCode,exitObserved:state.exitObserved,closeObserved:state.closeObserved,spawnError:state.error,signals};
}
async function removeOwnedProfile({profile,canRemove,budgets=LIFECYCLE,io={rm,exists:fs.existsSync}}){
 const result={phases:[],profileRemoved:false,retainedProfileReason:null};
 if(!canRemove){result.retainedProfileReason='Own spawned browser exit is unconfirmed';return result;}
 try{
  await bounded('owned profile removal',budgets.remove,()=>io.rm(profile,{recursive:true,force:true,maxRetries:8,retryDelay:150}));
  result.profileRemoved=!io.exists(profile);
  if(!result.profileRemoved)throw Error('Owned profile still exists');
  result.phases.push({phase:'profile',status:'passed'});
 }catch(e){result.phases.push({phase:'profile',status:'failed',error:e.message});}
 return result;
}
// Exposed only for small receiver lifecycle tests; no product/browser assertion is delegated here.
export const receiverLifecycle=Object.freeze({bounded,socketOpened,startupEndpoint,watchChild,childExited,stopOwnChild,removeOwnedProfile,LIFECYCLE});

export async function withBrowser({output,profileParent,executable='/snap/bin/chromium'},run){
 await mkdir(output,{recursive:true});
 const profile=await mkdtemp(join(profileParent,'dc-profile-'));
 let downloads;
 const report={startedAt:new Date().toISOString(),browserExecutable:executable,profile,downloads,pageErrors:[],requests:[],responses:[],downloadEvents:[],checks:[],observations:[]};
 let browser,socket,sessionId,sequence=0,stderr='',closed,childState;
 const pending=new Map();
 const command=(method,params={},scoped=true)=>new Promise((resolve,reject)=>{
  const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout '+method));},10000);
  pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params,...typeof scoped==="string"?{sessionId:scoped}:scoped&&sessionId?{sessionId}:{}}));
 });
 const evaluate=async expression=>{const r=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value;};
 const click=async selector=>{
  const point=await evaluate('(()=>{const n=document.querySelector('+JSON.stringify(selector)+');if(!n)throw Error("Missing element");n.scrollIntoView({block:"center"});const r=n.getBoundingClientRect();if(!r.width||!r.height)throw Error("Hidden element");return{x:r.x+r.width/2,y:r.y+r.height/2}})()');
  for(const type of ['mouseMoved','mousePressed','mouseReleased'])await command('Input.dispatchMouseEvent',{type,...point,...type!=='mouseMoved'?{button:'left',clickCount:1}:{}});
 };
 const key=async (key,code,modifiers=0)=>{const physicalCode=key==='a'?'KeyA':key===' '?'Space':key;const text=key==='Enter'?'\r':key===' '?' ':undefined;for(const type of ['keyDown','keyUp'])await command('Input.dispatchKeyEvent',{type,key,code:physicalCode,windowsVirtualKeyCode:code,nativeVirtualKeyCode:code,modifiers,...type==='keyDown'&&!modifiers&&text!==undefined?{text,unmodifiedText:text}:{}});};
 const type=async (selector,text)=>{await click(selector);await key('a',65,2);await command('Input.insertText',{text});};
 const viewport=async(width,height=1000)=>command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
 const navigate=async url=>{await command('Page.navigate',{url});await until(()=>evaluate('document.readyState==="complete"'),'document complete');};
 const screenshot=async name=>{const r=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});const out=join(output,name);await writeFile(out,Buffer.from(r.data,'base64'));return{path:out,sha256:sha(Buffer.from(r.data,'base64'))};};
 const check=async(name,fn)=>{try{await fn();report.checks.push({name,status:'passed'});console.log('PASS '+name);}catch(e){report.checks.push({name,status:'failed',error:e.stack});console.log('FAIL '+name+': '+e.message);}};
 try{
  downloads=await mkdir(join(profile,'downloads'),{recursive:true}).then(()=>join(profile,'downloads'));
  report.downloads=downloads;
  browser=spawn(executable,['--headless=new','--no-sandbox','--disable-gpu','--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run','--no-default-browser-check','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe']});
  childState=watchChild(browser);closed=childState.closed;
  browser.stderr.on('data',b=>{stderr=(stderr+b.toString()).slice(-12000);});
  const {port,endpoint}=await startupEndpoint(signal=>readFile(join(profile,'DevToolsActivePort'),{encoding:'utf8',signal}),()=>childExited(browser,childState));
  socket=new WebSocket('ws://127.0.0.1:'+port+endpoint);
  socket.addEventListener('message',e=>{
   const m=JSON.parse(e.data);
   if(m.id){const p=pending.get(m.id);if(!p)return;pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}
   else if(m.method==='Log.entryAdded')(report.browserLog??=[]).push(m.params.entry);
   else if(m.method==='Runtime.exceptionThrown')report.pageErrors.push(m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text);
   else if(m.method==='Network.requestWillBeSent')report.requests.push({url:m.params.request.url,type:m.params.type});
   else if(m.method==='Network.responseReceived')report.responses.push({url:m.params.response.url,status:m.params.response.status,mime:m.params.response.mimeType});
   else if(m.method==='Browser.downloadWillBegin'||m.method==='Browser.downloadProgress')report.downloadEvents.push({method:m.method,...m.params});
  });
  await socketOpened(socket);
  report.browser=await command('Browser.getVersion',{},false);
  await command('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads,eventsEnabled:true},false);
  const {targetId}=await command('Target.createTarget',{url:'about:blank'},false);
  ({sessionId}=await command('Target.attachToTarget',{targetId,flatten:true},false));
  for(const method of ['Page.enable','Runtime.enable','Network.enable'])await command(method);
  await run({report,command,evaluate,click,key,type,viewport,navigate,screenshot,check,downloads,output});
  report.status=report.checks.some(x=>x.status==='failed')||report.pageErrors.length?'failed':'passed';
 }catch(e){report.status='failed';report.error=e.stack;}
 finally{
  const phases=[];
  const phase=async(name,fn)=>{try{const value=await fn();phases.push({phase:name,status:'passed'});return value;}catch(e){phases.push({phase:name,status:'failed',error:e.message});report.status='failed';return null;}};
  if(socket?.readyState===1){
   try{await bounded('CDP Browser.close',LIFECYCLE.closeCommand,()=>Promise.race([command('Browser.close',{},false),closed]));phases.push({phase:'Browser.close request',status:'passed'});}
   catch(e){phases.push({phase:'Browser.close request',status:'diagnostic',error:e.message,meaning:'Actual own-child exit is checked separately below'});}
  }
  const stopped=await phase('own child stop',()=>stopOwnChild(browser,childState));
  report.spawnedBrowserExit=stopped;
  if(!stopped?.exited){report.status='failed';phases.push({phase:'own child exit confirmation',status:'failed'});}
  await phase('CDP socket and pending commands',async()=>{
   try{if(socket)socket.close();}finally{for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('receiver closed'));}pending.clear();}
  });
  const files=await removeOwnedProfile({profile,canRemove:!!stopped?.exited});
  phases.push(...files.phases);
  report.cleanup={status:files.profileRemoved&&phases.every(p=>p.status!=='failed')?'passed':'failed',profileRemoved:files.profileRemoved,retainedProfileReason:files.retainedProfileReason,phases};
  if(report.cleanup.status!=='passed')report.status='failed';
  report.finishedAt=new Date().toISOString();report.browserStderrTail=stderr;
  await bounded('browser report write',LIFECYCLE.io,signal=>writeFile(join(output,'browser-report.json'),JSON.stringify(report,null,2)+'\n',{signal}));
 }
 return report;
}
