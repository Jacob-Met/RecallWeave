// Independent native receiver transport. Adapted from the accepted RecallWeave
// tools/check_browser.mjs at d8a9ff81. Uses an isolated headless Chrome profile.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir,mkdtemp,readFile,writeFile,rm,stat} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function until(check,label,milliseconds=12000){
  const end=Date.now()+milliseconds;let last;
  while(Date.now()<end){try{const value=await check();if(value)return value;}catch(error){last=error;}await pause(100);}
  throw new Error('Timed out: '+label+(last?' ('+last.message+')':''));
}
export async function openBrowser(output,executable='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'){
  output=resolve(output);await mkdir(output,{recursive:true});
  const profile=await mkdtemp(join(output,'profile-'));
  const downloads=join(output,'downloads');await mkdir(downloads,{recursive:true});
  const child=spawn(executable,['--headless=new','--disable-gpu','--disable-background-networking',
    '--disable-component-update','--disable-sync','--no-first-run','--no-default-browser-check',
    '--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],
    {stdio:['ignore','ignore','pipe']});
  let log='',launchError,socket,sessionId,sequence=0;
  const pending=new Map(),events=[],errors=[],requests=[],downloadsStarted=[],downloadsCompleted=new Map();
  child.stderr.on('data',bytes=>{log=(log+bytes.toString()).slice(-12000);});
  child.on('error',error=>{launchError=error;});
  function command(method,params={},scoped=true){
    const id=++sequence;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout: '+method));},10000);
      pending.set(id,{resolve,reject,timer});
      socket.send(JSON.stringify({id,method,params,...(scoped&&sessionId?{sessionId}:{})}));
    });
  }
  async function evaluate(expression){
    const r=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);
    return r.result.value;
  }
  async function key(name){
    const codes={Enter:13,Tab:9,Home:36,End:35,ArrowRight:39,ArrowLeft:37};
    for(const type of ['keyDown','keyUp'])await command('Input.dispatchKeyEvent',{
      type,key:name,code:name,windowsVirtualKeyCode:codes[name]??0,nativeVirtualKeyCode:codes[name]??0,
      ...(name==='Enter'&&type==='keyDown'?{text:'\r',unmodifiedText:'\r'}:{})
    });
  }
  async function activate(selector){
    assert.ok(await evaluate('!!document.querySelector('+JSON.stringify(selector)+')'),'missing '+selector);
    await evaluate('document.querySelector('+JSON.stringify(selector)+').focus()');await key('Enter');
  }
  async function close(){
    if(socket?.readyState===1){try{await command('Browser.close',{},false);}catch{}socket.close();}
    for(const p of pending.values()){clearTimeout(p.timer);p.reject(new Error('browser closed'));}pending.clear();
    if(child.exitCode===null){await Promise.race([new Promise(r=>child.once('exit',r)),pause(2000)]);}
    if(child.exitCode===null){child.kill('SIGTERM');await Promise.race([new Promise(r=>child.once('exit',r)),pause(1000)]);}
    await writeFile(join(output,'browser-stderr.log'),log);
    if(child.exitCode!==null||child.signalCode!==null)await rm(profile,{recursive:true,force:true});
  }
  try{
    const [port,endpoint]=await until(async()=>{
      if(launchError)throw launchError;
      if(child.exitCode!==null)throw new Error('browser exited '+child.exitCode+': '+log);
      const fields=(await readFile(join(profile,'DevToolsActivePort'),'utf8')).trim().split('\n');
      return fields[0]&&fields[1]?fields:false;
    },'Chrome startup');
    socket=new WebSocket('ws://127.0.0.1:'+port+endpoint);
    socket.addEventListener('message',event=>{
      const m=JSON.parse(event.data);
      if(m.id){const p=pending.get(m.id);if(!p)return;pending.delete(m.id);clearTimeout(p.timer);
        if(m.error)p.reject(new Error(m.error.message));else p.resolve(m.result);return;}
      events.push(m);
      if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text);
      if(m.method==='Network.requestWillBeSent')requests.push(m.params.request.url);
      if(m.method==='Browser.downloadWillBegin')downloadsStarted.push(m.params);
      if(m.method==='Browser.downloadProgress')downloadsCompleted.set(m.params.guid,m.params);
    });
    await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
    const version=await command('Browser.getVersion',{},false);
    const {targetId}=await command('Target.createTarget',{url:'about:blank'},false);
    ({sessionId}=await command('Target.attachToTarget',{targetId,flatten:true},false));
    await command('Page.enable');await command('Runtime.enable');await command('Network.enable');
    await command('Browser.setDownloadBehavior',{behavior:'allowAndName',downloadPath:downloads,eventsEnabled:true},false);
    await command('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
    return {version,command,evaluate,key,activate,close,errors,requests,events,
      async viewport(width,height=1000){await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});},
      async navigate(path,width=1280,height=1000){
        errors.length=0;requests.length=0;
        await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
        const url=pathToFileURL(resolve(path)).href;await command('Page.navigate',{url});
        await until(()=>evaluate('document.URL === '+JSON.stringify(url)+' && document.readyState === "complete"'),'report document load');
      },
      async screenshot(name){
        const {cssContentSize:s}=await command('Page.getLayoutMetrics');
        const {data}=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,
          clip:{x:0,y:0,width:s.width,height:Math.min(s.height,7000),scale:1}});
        const bytes=Buffer.from(data,'base64');const path=join(output,name);await writeFile(path,bytes);
        return {path,sha256:sha256(bytes),bytes:bytes.length};
      },
      async download(selector){
        const count=downloadsStarted.length;await activate(selector);
        const start=await until(()=>downloadsStarted[count],'download start');
        const completed=await until(()=>{const p=downloadsCompleted.get(start.guid);if(p?.state==='canceled')throw new Error('download canceled');return p?.state==='completed'?p:false;},'download completion');
        const path=join(downloads,start.guid);await until(async()=>{try{return(await stat(path)).isFile();}catch{return false;}},'download file');
        const bytes=await readFile(path);return {path,bytes,suggestedFilename:start.suggestedFilename,sha256:sha256(bytes),completed};
      }
    };
  }catch(error){await close();throw error;}
}
