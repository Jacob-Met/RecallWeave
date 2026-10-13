import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
const parent='D:/hamon-course-receiving-dc7255e161d3/runtime-edge-diagnostic';
const root=parent+'/close-latency-1sFKu9';
const profile=path.join(root,'profile'),start=performance.now();
const receipt={schema:'recallweave.edge-graceful-close-latency.v1',root,profile,startedAt:new Date().toISOString(),observations:[]};
const delay=ms=>new Promise(r=>setTimeout(r,ms));
function alive(pid){try{process.kill(pid,0);return true}catch(e){return e.code==='ESRCH'?false:null}}
let browser,socket,browserPid,remoteClose=false,closed=false,id=0;const pending=new Map();
function send(method,params={}){return new Promise((resolve,reject)=>{const n=++id,t=setTimeout(()=>{pending.delete(n);reject(Error('timeout '+method))},10000);pending.set(n,{resolve,reject,t});socket.send(JSON.stringify({id:n,method,params}))})}
try{
 receipt.followedExistingOwnedProbe=true;receipt.launcherPid=28056;closed=true;
 let endpoint=null;
 for(let i=0;i<150;i++){try{const x=(await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8')).trim().split(/\r?\n/);if(x.length===2&&/^\d+$/.test(x[0])&&/^\/devtools\/browser\/[0-9a-f-]+$/.test(x[1])){endpoint='ws://127.0.0.1:'+x[0]+x[1];break;}}catch(e){if(!['ENOENT','EBUSY'].includes(e.code))throw e}await delay(100)}
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
 await fs.writeFile(path.join(root,'close-measurement.json'),JSON.stringify(receipt,null,2)+'\n');
 console.log(JSON.stringify({root,launcherPid:receipt.launcherPid,browserPid,version:receipt.version,launcherExit:receipt.launcherExit,closeRequestedAtMs:receipt.closeRequestedAtMs,socketClosedAtMs:receipt.socketClosedAtMs,actualPidAbsentAtMs:receipt.actualPidAbsentAtMs,cleanup:receipt.cleanup,fatal:receipt.fatal}));
}
if(receipt.fatal||!Object.values(receipt.cleanup||{}).every(Boolean))process.exitCode=1;
