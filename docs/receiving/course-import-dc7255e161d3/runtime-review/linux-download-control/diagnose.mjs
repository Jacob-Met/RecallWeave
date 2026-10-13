import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';
const root=path.dirname(new URL(import.meta.url).pathname);
const receipt={schema:'recallweave.download-environment-control.v1',startedAt:new Date().toISOString(),owner:'dc7255e161d3/estate_runtime',root,controls:[],events:[],exceptions:[],cleanup:{}};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const payload='Independent RecallWeave browser download control.\n';
const html='<!doctype html><meta charset=utf-8><title>Owned download controls</title><button id=blob>Blob control</button><a id=http href=/control.txt download=control-http.txt>HTTP control</a><script>document.querySelector("#blob").onclick=()=>{let u=URL.createObjectURL(new Blob(['+JSON.stringify(payload)+'],{type:"text/plain;charset=utf-8"}));let a=document.createElement("a");a.href=u;a.download="control-blob.txt";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),10000)};<\/script>';
let browser,socket,server,session,id=0,closed=false;
const pending=new Map();
function send(method,params={},sid=session){return new Promise((resolve,reject)=>{const n=++id,timer=setTimeout(()=>{pending.delete(n);reject(Error('Timeout '+method))},12000);pending.set(n,{resolve,reject,timer});socket.send(JSON.stringify({id:n,method,params,...(sid?{sessionId:sid}:{})}));})}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
async function until(f){const end=Date.now()+10000;while(Date.now()<end){if(await f())return;await delay(80);}throw Error('Condition timeout');}
async function click(sel){const p=await evaluate('(()=>{const r=document.querySelector('+JSON.stringify(sel)+').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()');await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...p});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...p});}
try{
 receipt.fs=Object.fromEntries(await Promise.all([root,'/tmp'].map(async p=>{const s=await fs.statfs(p);return[p,{available_bytes:s.bavail*s.bsize,free_inodes:s.ffree}]})));
 server=http.createServer((req,res)=>{if(req.url==='/control.txt'){res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8','Content-Disposition':'attachment; filename="control-http.txt"','Content-Length':Buffer.byteLength(payload)});res.end(payload)}else{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html)}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 receipt.origin='http://127.0.0.1:'+server.address().port;
 const args=['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-sync','--disable-extensions','--password-store=basic','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+path.join(root,'profile'),'about:blank'];
 receipt.browserCommand={binary:'/snap/bin/chromium',args,TMPDIR:path.join(root,'tmp')};
 browser=spawn('/snap/bin/chromium',args,{stdio:['ignore','ignore','pipe'],env:{...process.env,TMPDIR:path.join(root,'tmp')}});
 receipt.browserPid=browser.pid;browser.once('close',()=>{closed=true});
 const endpoint=await new Promise((resolve,reject)=>{let text='';const timer=setTimeout(()=>reject(Error('Browser startup '+text.slice(-1000))),15000);browser.once('error',reject);browser.stderr.on('data',b=>{fs.appendFile(path.join(root,'chrome.stderr.log'),b).catch(()=>{});text+=b;const m=text.match(/DevTools listening on (ws:\/\/127\.0\.0\.1:[^\s]+)/);if(m){clearTimeout(timer);resolve(m[1])}})});
 socket=new WebSocket(endpoint);
 await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})});
 socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result)}
 if(m.method?.startsWith('Browser.download'))receipt.events.push({method:m.method,...m.params});
 if(m.method==='Runtime.exceptionThrown')receipt.exceptions.push(m.params)});
 receipt.version=await send('Browser.getVersion',{},null);
 await send('Browser.setDownloadBehavior',{behavior:'allowAndName',downloadPath:path.join(root,'downloads'),eventsEnabled:true},null);
 const t=await send('Target.createTarget',{url:'about:blank'},null);session=(await send('Target.attachToTarget',{targetId:t.targetId,flatten:true},null)).sessionId;
 await send('Runtime.enable');await send('Page.enable');await send('Page.navigate',{url:receipt.origin});await until(()=>evaluate('!!document.querySelector("#blob")'));
 for(const type of ['http','blob']){
  const first=receipt.events.length;await click('#'+type);
  await until(()=>receipt.events.slice(first).some(e=>['completed','canceled'].includes(e.state)));
  const ev=receipt.events.slice(first),terminal=ev.findLast(e=>['completed','canceled'].includes(e.state));
  const control={type,payloadSha256:sha(payload),payloadBytes:Buffer.byteLength(payload),terminal,events:ev};
  if(terminal.state==='completed'){const bytes=await fs.readFile(path.join(root,'downloads',terminal.guid));control.actualBytes=bytes.length;control.actualSha256=sha(bytes);control.byteMatch=bytes.toString()===payload;}
  receipt.controls.push(control);
 }
 const dt=await send('Target.createTarget',{url:'chrome://downloads/'},null);session=(await send('Target.attachToTarget',{targetId:dt.targetId,flatten:true},null)).sessionId;
 await send('Runtime.enable');await send('Page.enable');
 await until(()=>evaluate('!!document.querySelector("downloads-manager")?.shadowRoot'));
 await delay(300);
 receipt.downloadsUi=await evaluate('(()=>{const m=document.querySelector("downloads-manager"),simple=x=>Object.fromEntries(Object.entries(x||{}).filter(([k,v])=>v===null||["string","number","boolean"].includes(typeof v)));return {items:[...(m.items_||[])].map(simple),rows:[...m.shadowRoot.querySelectorAll("downloads-item")].map(e=>({data:simple(e.data),text:e.shadowRoot?.textContent}))}})()');
}catch(e){receipt.fatal=e.stack||String(e);}
finally{
 if(socket?.readyState===1){try{await send('Browser.close',{},null)}catch(e){receipt.closeError=String(e)}socket.close()}
 for(let i=0;browser&&!closed&&i<20;i++)await delay(50);
 if(browser&&!closed)browser.kill('SIGTERM');
 for(let i=0;browser&&!closed&&i<40;i++)await delay(50);
 if(browser&&!closed)browser.kill('SIGKILL');
 for(let i=0;browser&&!closed&&i<40;i++)await delay(50);
 if(server){server.closeAllConnections();await new Promise(r=>server.close(r))}
 for(const p of pending.values())clearTimeout(p.timer);
 if(closed){
  try{receipt.history=JSON.parse(execFileSync('/usr/bin/python3',['-B','-c',`import sqlite3,json,sys,pathlib
p=pathlib.Path(sys.argv[1])
c=sqlite3.connect('file:'+str(p)+'?mode=ro',uri=True)
c.row_factory=sqlite3.Row
print(json.dumps({'downloads':[dict(r) for r in c.execute('select * from downloads')],'chains':[dict(r) for r in c.execute('select * from downloads_url_chains')]},default=lambda x:x.hex() if isinstance(x,bytes) else str(x)))
`,path.join(root,'profile','Default','History')],{encoding:'utf8',timeout:5000}));}catch(e){receipt.historyError=String(e)}
  await fs.rm(path.join(root,'profile'),{recursive:true,force:true});receipt.cleanup.profileRemoved=true;
 }
 receipt.cleanup.browserClosed=!browser||closed;receipt.cleanup.serverClosed=!server?.listening;
 receipt.completedAt=new Date().toISOString();
 await fs.writeFile(path.join(root,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');
 console.log(JSON.stringify({root,controls:receipt.controls.map(x=>({type:x.type,terminal:x.terminal,byteMatch:x.byteMatch})),history:receipt.history,downloadsUi:receipt.downloadsUi,cleanup:receipt.cleanup,fatal:receipt.fatal}));
}
if(receipt.fatal||!receipt.cleanup.browserClosed)process.exitCode=1;
