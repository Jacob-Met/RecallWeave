/** Receiving-only CDP transport, adapted from the existing check_notes_browser.mjs plumbing.
 * Assertions and fixtures live in the independent receiver, not the author's tests.
 */
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,mkdtemp,rm,readdir,lstat,statfs} from 'node:fs/promises';
import {join,resolve,extname} from 'node:path';

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function waitFor(check,label,attempts=100){
  let last;
  for(let i=0;i<attempts;i++){
    try{const value=await check();if(value)return value;}catch(error){last=error;}
    await sleep(100);
  }
  throw new Error('Timed out: '+label+(last?' ('+last.message+')':''));
}

export async function startBrowser(project,out){
  await mkdir(out,{recursive:true});
  const disk=await statfs(out);
  if(disk.bavail*disk.bsize<100_000_000)throw new Error('Insufficient observed headroom for the one isolated browser profile');
  const downloadPath=join(out,'downloads');
  await mkdir(downloadPath,{recursive:true});
  const profile=await mkdtemp(join(out,'profile-'));
  const serverRequests=[],requests=[],blockedRequests=[],pageErrors=[],downloads=new Map(),pending=new Map();
  let sequence=0,sessionId,socket,browserLog='',closed=false;
  const server=createServer(async(req,res)=>{
    serverRequests.push({method:req.method,url:req.url});
    if(req.method!=='GET'){res.writeHead(405).end();return;}
    try{
      const url=new URL(req.url,'http://127.0.0.1'),file=resolve(project,'.'+decodeURIComponent(url.pathname));
      if(!file.startsWith(resolve(project)+'/')){res.writeHead(403).end();return;}
      const body=await readFile(file),type={'.html':'text/html','.mjs':'text/javascript','.json':'application/json','.css':'text/css'}[extname(file)];
      res.writeHead(200,{'Content-Type':(type??'application/octet-stream')+'; charset=utf-8','Cache-Control':'no-store'}).end(body);
    }catch{res.writeHead(404).end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  function command(method,params={},scoped=true){
    const id=++sequence;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout: '+method));},10000);
      pending.set(id,{resolve,reject,timer});
      socket.send(JSON.stringify({id,method,params,...(scoped&&sessionId?{sessionId}:{})}));
    });
  }
  async function evaluate(expression){
    const result=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description??result.exceptionDetails.text);
    return result.result.value;
  }
  async function key(name,{ctrl=false,shift=false}={}){
    const codes={Tab:9,Enter:13,Backspace:8,Home:36,End:35,ArrowLeft:37,ArrowRight:39,ArrowUp:38,ArrowDown:40,a:65,Escape:27,' ':32};
    const code=name==='a'?'KeyA':name===' '?'Space':name;
    for(const type of ['keyDown','keyUp'])await command('Input.dispatchKeyEvent',{
      type,key:name,code,windowsVirtualKeyCode:codes[name]??0,nativeVirtualKeyCode:codes[name]??0,modifiers:(ctrl?2:0)|(shift?8:0),
      ...(name==='Enter'&&type==='keyDown'?{text:'\r',unmodifiedText:'\r'}:{})
    });
  }
  async function activate(selector){
    const focused=await evaluate('(()=>{const n=document.querySelector('+JSON.stringify(selector)+');if(!n)return false;n.focus();return document.activeElement===n;})()');
    if(!focused)throw new Error('Cannot focus '+selector);
    await key('Enter');
  }
  async function replace(selector,text){
    const focused=await evaluate('(()=>{const n=document.querySelector('+JSON.stringify(selector)+');if(!n)return false;n.focus();return document.activeElement===n;})()');
    if(!focused)throw new Error('Cannot focus editable control '+selector);
    await key('a',{ctrl:true});
    await key('Backspace');
    if(text!=='')await command('Input.insertText',{text:String(text)});
  }
  async function screenshot(name){
    const {data}=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    await writeFile(join(out,name),Buffer.from(data,'base64'));
    return name;
  }
  async function navigate(url,width=1280,height=1000){
    await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
    await command('Page.navigate',{url});
    await waitFor(()=>evaluate('document.URL === '+JSON.stringify(url)+' && document.readyState === "complete"'),'document ready');
  }
  async function storage(){
    return evaluate(`(async()=>{
      const read=fn=>{try{return fn();}catch(e){return {unavailable:e.name};}};
      let databases;try{databases=typeof indexedDB.databases==='function'?await indexedDB.databases():null;}catch(e){databases={unavailable:e.name};}
      let cacheNames;try{cacheNames=typeof caches!=='undefined'?await caches.keys():null;}catch(e){cacheNames={unavailable:e.name};}
      return {calls:globalThis.__receivingStorageCalls??[],instrumented:globalThis.__receivingStorageInstrumented??[],local:read(()=>Object.keys(localStorage)),session:read(()=>Object.keys(sessionStorage)),cookie:read(()=>document.cookie),databases,cacheNames};
    })()`);
  }
  const browser=spawn('/snap/bin/chromium',[
    '--headless=new','--no-sandbox','--disable-gpu','--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run','--no-default-browser-check',
    '--disk-cache-size=1048576','--media-cache-size=1048576','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'
  ],{stdio:['ignore','ignore','pipe']});
  await writeFile(join(out,'browser-launch.json'),JSON.stringify({pid:browser.pid,profile,executable:'/snap/bin/chromium',startup_allowance_seconds:40},null,2)+'\n');
  browser.stderr.on('data',bytes=>{browserLog=(browserLog+bytes).slice(-12000);});
  let launchError;browser.on('error',error=>{launchError=error;});
  async function close(){
    if(closed)return;closed=true;
    if(socket?.readyState===WebSocket.OPEN){try{await command('Browser.close',{},false);}catch{}}
    socket?.close();
    for(const request of pending.values())clearTimeout(request.timer);
    if(browser.exitCode===null){browser.kill('SIGTERM');for(let i=0;i<30&&browser.exitCode===null;i++)await sleep(100);}
    server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
    const measure=async p=>{let n=0;for(const e of await readdir(p,{withFileTypes:true})){const f=join(p,e.name);if(e.isSymbolicLink())continue;if(e.isDirectory())n+=await measure(f);else n+=(await lstat(f)).size;}return n;};
    let profileBytes=null;try{profileBytes=await measure(profile);}catch{}
    const cleanup={profile,profile_apparent_bytes:profileBytes,browser_exit_code:browser.exitCode,browser_signal_code:browser.signalCode,profile_removed:false};
    if(browser.exitCode!==null||browser.signalCode!==null){await rm(profile,{recursive:true,force:true});cleanup.profile_removed=true;}
    await writeFile(join(out,'browser-cleanup.json'),JSON.stringify(cleanup,null,2)+'\n');
    await writeFile(join(out,'chromium-stderr.log'),browserLog);
    await writeFile(join(out,'browser-observations.json'),JSON.stringify({serverRequests,requests,blockedRequests,pageErrors},null,2)+'\n');
    return cleanup;
  }
  try{
    const portData=await waitFor(async()=>{
      if(launchError)throw launchError;
      if(browser.exitCode!==null)throw new Error('Chromium exited '+browser.exitCode+': '+browserLog);
      const lines=(await readFile(join(profile,'DevToolsActivePort'),'utf8')).trim().split('\n');
      return lines[0]&&lines[1]?lines:null;
    },'isolated Chromium startup',400);
    socket=new WebSocket('ws://127.0.0.1:'+portData[0]+portData[1]);
    socket.addEventListener('message',event=>{
      const message=JSON.parse(event.data);
      if(message.id){
        const request=pending.get(message.id);if(!request)return;
        pending.delete(message.id);clearTimeout(request.timer);
        if(message.error)request.reject(new Error(message.error.message));else request.resolve(message.result);
      }else if(message.method==='Browser.downloadWillBegin'||message.method==='Browser.downloadProgress'){
        const p=message.params;downloads.set(p.guid,{...downloads.get(p.guid),...p});
      }else if(message.method==='Runtime.exceptionThrown'){
        pageErrors.push(message.params.exceptionDetails.exception?.description??message.params.exceptionDetails.text);
      }else if(message.method==='Network.requestWillBeSent'){
        requests.push({url:message.params.request.url,method:message.params.request.method,type:message.params.type});
      }else if(message.method==='Fetch.requestPaused'){
        const p=message.params,allowed=p.request.url.startsWith(base+'/');
        if(!allowed)blockedRequests.push(p.request.url);
        command(allowed?'Fetch.continueRequest':'Fetch.failRequest',{requestId:p.requestId,...(allowed?{}:{errorReason:'BlockedByClient'})}).catch(e=>pageErrors.push('Receiving fetch control: '+e.message));
      }
    });
    await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
    const version=await command('Browser.getVersion',{},false);
    await command('Browser.setDownloadBehavior',{behavior:'allowAndName',downloadPath,eventsEnabled:true},false);
    const {targetId}=await command('Target.createTarget',{url:'about:blank'},false);
    ({sessionId}=await command('Target.attachToTarget',{targetId,flatten:true},false));
    await command('Page.enable');await command('Runtime.enable');await command('Network.enable');
    await command('Fetch.enable',{patterns:[{urlPattern:'http://*',requestStage:'Request'},{urlPattern:'https://*',requestStage:'Request'}]});
    await command('Page.addScriptToEvaluateOnNewDocument',{source:`(()=>{
      const calls=[],instrumented=[];globalThis.__receivingStorageCalls=calls;globalThis.__receivingStorageInstrumented=instrumented;
      const wrap=(object,key,label)=>{try{const original=object?.[key];if(typeof original!=='function')return;object[key]=function(...args){calls.push({operation:label,key:typeof args[0]==='string'?args[0]:null});return Reflect.apply(original,this,args);};instrumented.push(label);}catch{}};
      wrap(globalThis.Storage?.prototype,'setItem','Storage.setItem');wrap(globalThis.Storage?.prototype,'removeItem','Storage.removeItem');wrap(globalThis.Storage?.prototype,'clear','Storage.clear');
      wrap(globalThis.indexedDB,'open','indexedDB.open');wrap(globalThis.indexedDB,'deleteDatabase','indexedDB.deleteDatabase');wrap(globalThis.caches,'open','caches.open');wrap(globalThis.caches,'delete','caches.delete');
      wrap(navigator.serviceWorker,'register','serviceWorker.register');wrap(navigator,'sendBeacon','sendBeacon');
      try{const d=Object.getOwnPropertyDescriptor(Document.prototype,'cookie');if(d?.set&&d.configurable){Object.defineProperty(Document.prototype,'cookie',{...d,set(value){calls.push({operation:'document.cookie'});return d.set.call(this,value);}});instrumented.push('document.cookie');}}catch{}
    })()`});
    return {base,profile,downloadPath,version,command,evaluate,key,activate,replace,navigate,screenshot,storage,close,downloads,requests,blockedRequests,pageErrors,serverRequests};
  }catch(error){await close();throw error;}
}
