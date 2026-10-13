import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
const parent='D:/hamon-course-receiving-dc7255e161d3/runtime-edge-diagnostic';
const root=await fs.mkdtemp(parent+'/close-latency-');
for(const x of ['profile','tmp','downloads'])await fs.mkdir(path.join(root,x));
const profile=path.join(root,'profile'),start=performance.now();
const receipt={schema:'recallweave.edge-graceful-close-latency.v1',root,profile,startedAt:new Date().toISOString(),observations:[]};
const delay=ms=>new Promise(r=>setTimeout(r,ms));
function alive(pid){try{process.kill(pid,0);return true}catch(e){return e.code==='ESRCH'?false:null}}
let browser,socket,browserPid,remoteClose=false,closed=false,id=0;const pending=new Map();
function send(method,params={}){return new Promise((resolve,reject)=>{const n=++id,t=setTimeout(()=>{pending.delete(n);reject(Error('timeout '+method))},10000);pending.set(n,{resolve,reject,t});socket.send(JSON.stringify({id:n,method,params}))})}
try{
 const args=['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-sync','--disable-extensions','--password-store=basic','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'];
 browser=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args,{stdio:['ignore','ignore','pipe'],env:{...process.env,TMP:path.join(root,'tmp'),TEMP:path.join(root,'tmp'),TMPDIR:path.join(root,'tmp')}});
 receipt.launcherPid=browser.pid;
 browser.on('exit',(code,signal)=>{receipt.launcherExit={code,signal,elapsed:performance.now()-start}});
 browser.on('close',()=>{closed=true});
 browser.on('error',e=>{receipt.spawnError=String(e)});
 browser.stderr.on('data',b=>fs.appendFile(path.join(root,'chrome.stderr.log'),b).catch(()=>{}));
 let endpoint=null;
 for(let i=0;i<150;i++){try{const x=(await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8')).trim().split(/\r?\n/);if(x.length===2&&/^\d+$/.test(x[0])&&/^\/devtools\/browser\/[0-9a-f-]+$/.test(x[1])){endpoint='ws://127.0.0.1:'+x[0]+x[1];break;}}catch(e){if(e.code!=='ENOENT')throw e}await delay(100)}
 if(!endpoint)throw Error('No owned endpoint');
 socket=new WebSocket(endpoint);
 socket.addEventListener('close',()=>{remoteClose=true;receipt.socketClosedAtMs=performance.now()-start});
 await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})});
 socket.addEventListener('message',e=>{const m=JSON.parse(e.data),p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.t);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result)}});
 receipt.version=await send('Browser.getVersion');
 browserPid=(await send('SystemInfo.getProcessInfo')).processInfo.find(x=>x.type==='browser').id;receipt.actualBrowserPid=browserPid;
 for(let i=0;i<2;i++){const t=await send('Target.createTarget',{url:'about:blank'});await send('Target.closeTarget',{targetId:t.targetId})}
 const closeStart=performance.now();receipt.closeRequestedAtMs=closeStart-start;
 try{receipt.closeReply=await send('Browser.close')}catch(e){receipt.closeError=String(e)}
 for(let i=0;i<350;i++){
  const running=alive(browserPid),elapsed=performance.now()-closeStart;
  receipt.observations.push({elapsedSinceCloseMs:elapsed,running,remoteClose});
  if(running===false&&remoteClose){receipt.actualPidAbsentAtMs=elapsed;break}
  await delay(100);
 }
 receipt.cleanup={actualPidAbsent:alive(browserPid)===false,remoteSocketClosed:remoteClose,launcherClosed:closed,profileRemoved:false};
 if(Object.values(receipt.cleanup).slice(0,3).every(Boolean)){await fs.rm(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});receipt.cleanup.profileRemoved=true;}
}catch(e){receipt.fatal=e.stack||String(e);}
finally{
 for(const x of pending.values())clearTimeout(x.t);
 socket?.close();receipt.completedAt=new Date().toISOString();receipt.elapsedMs=performance.now()-start;
 await fs.writeFile(path.join(root,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');
 console.log(JSON.stringify({root,launcherPid:receipt.launcherPid,browserPid,version:receipt.version,launcherExit:receipt.launcherExit,closeRequestedAtMs:receipt.closeRequestedAtMs,socketClosedAtMs:receipt.socketClosedAtMs,actualPidAbsentAtMs:receipt.actualPidAbsentAtMs,cleanup:receipt.cleanup,fatal:receipt.fatal}));
}
if(receipt.fatal||!Object.values(receipt.cleanup||{}).every(Boolean))process.exitCode=1;
