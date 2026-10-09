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
  const child=spawn(executable,['--headless=new','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking',
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
      const timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout: '+method));},45000);
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
    const codes={Enter:13,Tab:9,Home:36,End:35,ArrowRight:39,ArrowLeft:37,ArrowUp:38,ArrowDown:40};
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
    const alive=()=>child.exitCode===null&&child.signalCode===null;
    const waitExit=async milliseconds=>{if(alive())await Promise.race([new Promise(r=>child.once('exit',r)),pause(milliseconds)]);};
    await waitExit(2000);
    if(alive()){child.kill('SIGTERM');await waitExit(5000);}
    if(alive()){child.kill('SIGKILL');await waitExit(5000);}
    await writeFile(join(output,'browser-stderr.log'),log);
    if(alive())throw new Error('Owned browser did not exit; profile preserved for inspection.');
    await rm(profile,{recursive:true,force:true});
  }
  try{
    const [port,endpoint]=await until(async()=>{
      if(launchError)throw launchError;
      if(child.exitCode!==null)throw new Error('browser exited '+child.exitCode+': '+log);
      const fields=(await readFile(join(profile,'DevToolsActivePort'),'utf8')).trim().split('\n');
      return fields[0]&&fields[1]?fields:false;
    },'Chrome startup',90000);
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
    return {version,childPid:child.pid,profile,command,evaluate,key,activate,close,errors,requests,events,
      async viewport(width,height=1000){await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});},
      async navigate(path,width=1280,height=1000){
        errors.length=0;requests.length=0;
        await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
        const url=pathToFileURL(resolve(path)).href;await command('Page.navigate',{url});
        await until(()=>evaluate('document.URL === '+JSON.stringify(url)+' && document.readyState === "complete"'),'report document load');
      },
      async screenshot(name){
        await evaluate('window.scrollTo(0,0); new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
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





import {execFileSync} from 'node:child_process';
import {copyFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {analyzeOrder} from '../courses/optimal-stopping-core.mjs';
async function receive(){
 const [outputArg,executable]=process.argv.slice(2);if(!outputArg||!executable)throw new Error('Usage: node tools/check-optimal-stopping.mjs <new-output-dir> <Chrome>');
 const output=resolve(outputArg);await mkdir(output);
 const root=fileURLToPath(new URL('../',import.meta.url)),page=join(root,'courses/optimal-stopping-explorer.html');
 const receipt={at:new Date().toISOString(),source:{},groups:[],downloads:[],screenshots:[],artifacts:[],cleanup:null};
 for(const p of ['courses/optimal-stopping.json','courses/optimal-stopping.md','courses/optimal-stopping-core.mjs','courses/optimal-stopping-explorer-ui.mjs','courses/optimal-stopping-explorer.template.html','courses/optimal-stopping-explorer.html','tools/build-optimal-stopping.mjs','tools/check-optimal-stopping.mjs','tests/optimal-stopping.test.mjs'])receipt.source[p]=sha256(await readFile(join(root,p)));
 const course=await readFile(join(root,'courses/optimal-stopping.json')),deck=JSON.parse(course);
 let b,courseDownload;
 const group=async(name,fn)=>{await fn();receipt.groups.push({name,passed:true});console.log('PASS '+name);};
 const set=async(n,s,o)=>b.evaluate('(()=>{for(const [id,value] of '+JSON.stringify([['n',n],['skip',s],['order',o]])+'){const e=document.getElementById(id);e.value=value;e.dispatchEvent(new Event("input",{bubbles:true}));}})()');
 const download=async(selector)=>{const d=await b.download(selector);receipt.downloads.push({path:d.path,bytes:d.bytes.length,sha256:d.sha256,name:d.suggestedFilename,completed:d.completed.state});return d;};
 try{
  b=await openBrowser(output,executable);receipt.browser=b.version;receipt.pid=b.childPid;receipt.profile=b.profile;
  await b.navigate(page,1280,1000);await until(()=>b.evaluate('document.documentElement.dataset.ready==="true"'),'explorer ready');
  await group('Default applied order has exact visible decisions and full finite table',async()=>{
   assert.equal(await b.evaluate('document.querySelector("#chosen").textContent'),'Selected arrival 4 · rank 5');
   assert.deepEqual(await b.evaluate('[...document.querySelectorAll("#trace tr")].map(r=>r.lastElementChild.textContent)'),['Observe & reject','Observe & reject','Reject','Select record','Not observed']);
   assert.equal(await b.evaluate('document.querySelectorAll("#thresholds tr").length'),5);
   assert.match(await b.evaluate('document.querySelector("#best-skips").textContent'),/: 2\./);
  });
  await group('Actual default observation JSON is byte-exact full core output',async()=>{
   const d=await download('#save-observation');assert.equal(d.bytes.toString(),JSON.stringify(analyzeOrder(5,2,[2,4,1,5,3]),null,2)+'\n');
  });
  await group('Course download is exact source bytes, separate from observation format',async()=>{
   courseDownload=await download('#save-course');assert.deepEqual(courseDownload.bytes,course);
   assert.equal(JSON.parse(courseDownload.bytes).format,'recallweave-deck/1');
  });
  await group('Input edits retire prior result and invalid duplicate order cannot export it',async()=>{
   await set('4','1','1,1,3,4');assert.equal(await b.evaluate('document.querySelector("#result").hidden && document.querySelector("#save-observation").disabled && document.querySelector("#print").disabled'),true);
   await b.activate('#run');assert.match(await b.evaluate('document.querySelector("#status").textContent'),/exactly once/);
   assert.equal(await b.evaluate('document.querySelector("#result").hidden'),true);
  });
  await group('Mandatory fallback is visibly distinct and its actual download matches',async()=>{
   await set('4','1','4,1,3,2');await b.activate('#run');
   assert.equal(await b.evaluate('document.querySelector("#trace tr:last-child td:last-child").textContent'),'Select last (fallback)');
   assert.equal(await b.evaluate('document.querySelector("#outcome").textContent'),'Best overall missed');
   const d=await download('#save-observation');assert.deepEqual(JSON.parse(d.bytes),analyzeOrder(4,1,[4,1,3,2]));
  });
  await group('Draft preset requires explicit apply and preserves exact tied best skips',async()=>{
   await b.evaluate('document.querySelector("#preset").value="tie"');await b.activate('#load');
   assert.equal(await b.evaluate('document.querySelector("#result").hidden'),true);await b.key('Enter');
   assert.equal(await b.evaluate('document.querySelectorAll("#thresholds tr.best").length'),2);
  }).catch(error=>{throw error;});
  await group('Both tied rows and single-item edge render without invented winner',async()=>{
   assert.equal(await b.evaluate('document.querySelectorAll("#thresholds tr.best").length'),2);
   assert.match(await b.evaluate('document.querySelector("#best-skips").textContent'),/: 0, 1\./);
   await set('1','0','1');await b.activate('#run');
   assert.equal(await b.evaluate('document.querySelector("#outcome").textContent'),'Best overall selected');
   assert.match(await b.evaluate('document.querySelector("#thresholds").textContent'),/1\/1/);
  });
  await group('Largest allowed case preserves all eight trace rows and exact count rows',async()=>{
   await set('8','3','3,2,5,1,6,8,4,7');await b.activate('#run');
   assert.equal(await b.evaluate('document.querySelectorAll("#trace tr").length'),8);
   assert.equal(await b.evaluate('document.querySelectorAll("#thresholds tr").length'),8);
   const d=await download('#save-observation');assert.deepEqual(JSON.parse(d.bytes),analyzeOrder(8,3,[3,2,5,1,6,8,4,7]));
  });
  await group('Desktop and phone keep the whole page within viewport and all rows',async()=>{
   assert.ok(await b.evaluate('document.documentElement.scrollWidth<=innerWidth'));receipt.screenshots.push(await b.screenshot('desktop.png'));
   await b.viewport(390,844);assert.ok(await b.evaluate('document.documentElement.scrollWidth<=innerWidth'));assert.equal(await b.evaluate('document.querySelectorAll("#trace tr").length'),8);
   receipt.screenshots.push(await b.screenshot('phone.png'));
  });
  await group('Actual Letter PDF retains complete applied trace, table and assumptions',async()=>{
   await b.viewport(739,1000);await b.command('Emulation.setEmulatedMedia',{media:'print'});
   const pdf=await b.command('Page.printToPDF',{printBackground:true,paperWidth:8.5,paperHeight:11,marginTop:.4,marginBottom:.4,marginLeft:.4,marginRight:.4});
   const bytes=Buffer.from(pdf.data,'base64'),path=join(output,'optimal-stopping.pdf');await writeFile(path,bytes);
   const text=execFileSync('pdftotext',['-layout',path,'-'],{encoding:'utf8'});await writeFile(join(output,'print.txt'),text);
   for(const s of ['Applied n=8','skip=3','All 40320 orders','Not observed','not a random sample','real-world decisions'])assert.ok(text.includes(s),'PDF missing '+s);
   receipt.artifacts.push({path,bytes:bytes.length,sha256:sha256(bytes)});await b.command('Emulation.setEmulatedMedia',{media:''});
  });
  await group('Fresh relocated standalone file works offline with no external source dependency',async()=>{
   const dir=join(output,'relocated');await mkdir(dir);const path=join(dir,'explorer.html');await copyFile(page,path);
   await b.navigate(path,390,844);await until(()=>b.evaluate('document.documentElement.dataset.ready==="true"'),'relocated explorer');
   assert.equal(await b.evaluate('document.querySelector("#chosen").textContent'),'Selected arrival 4 · rank 5');assert.ok(b.requests.every(x=>x.startsWith('file:')));assert.equal(b.errors.length,0);
  });
  await group('Actual downloaded course enters unchanged local chooser preview before explicit start',async()=>{
   await b.navigate(join(root,'demo.html'),1280,1000);
   const {root:dom}=await b.command('DOM.getDocument');const {nodeId}=await b.command('DOM.querySelector',{nodeId:dom.nodeId,selector:'#deck-file'});
   await b.command('DOM.setFileInputFiles',{nodeId,files:[courseDownload.path]});
   await until(()=>b.evaluate('document.querySelector("#deck-preview-title")?.textContent=== '+JSON.stringify(deck.title)),'course preview');
   assert.equal(await b.evaluate('document.querySelectorAll("#deck-preview ol li").length'),12);
   assert.equal(await b.evaluate('document.querySelector("#step-count").textContent'),'0 / 6');
   await b.activate('#start-deck');await until(()=>b.evaluate('document.querySelector("#step-count").textContent.includes("/ 12")'),'explicit course start');
   assert.match(await b.evaluate('document.querySelector("#deck-status").textContent'),/Started/);receipt.screenshots.push(await b.screenshot('learner-start.png'));
  });
  await group('Runtime stays free of errors and external requests',async()=>{assert.equal(b.errors.length,0);assert.ok(b.requests.every(x=>x.startsWith('file:')));receipt.requests=[...b.requests];receipt.errors=[...b.errors];});
  receipt.accepted=true;
 }catch(error){receipt.accepted=false;receipt.error=String(error.stack??error);throw error;}
 finally{if(b){await b.close();receipt.cleanup={closed:true,profileRemoved:true};}await writeFile(join(output,'browser-receiving.json'),JSON.stringify(receipt,null,2)+'\n');}
}
receive().catch(error=>{console.error(error);process.exitCode=1;});
