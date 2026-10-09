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
import {analyzeGame} from '../courses/coalition-power-core.mjs';
async function receive(){
 const [outputArg,executable,portableArg]=process.argv.slice(2);
 if(!outputArg||!executable)throw new Error('Usage: node tools/check-coalition-power.mjs <new-output-dir> <Chrome>');
 const output=resolve(outputArg);await mkdir(output);
 const root=fileURLToPath(new URL('../',import.meta.url)),page=join(root,'courses/coalition-power-explorer.html');
 const receipt={at:new Date().toISOString(),source:{},groups:[],downloads:[],screenshots:[],artifacts:[],cleanup:null};
 for(const p of ['courses/coalition-power.json','courses/coalition-power.md','courses/coalition-power-core.mjs','courses/coalition-power-explorer-ui.mjs','courses/coalition-power-explorer.template.html','courses/coalition-power-explorer.html','tools/build-coalition-power.mjs','tools/check-coalition-power.mjs','tests/coalition-power.test.mjs'])receipt.source[p]=sha256(await readFile(join(root,p)));
 const course=await readFile(join(root,'courses/coalition-power.json')),guide=await readFile(join(root,'courses/coalition-power.md')),deck=JSON.parse(course);
 let b,courseDownload;
 let learnerPath=join(root,'demo.html');
 const group=async(name,fn)=>{await fn();receipt.groups.push({name,passed:true});console.log('PASS '+name);};
 const fill=async(id,text)=>{
  await b.evaluate('(()=>{const e=document.getElementById('+JSON.stringify(id)+');e.focus();e.select();})()');
  await b.command('Input.insertText',{text});
 };
 const set=async(weights,quota)=>{await fill('weights',weights);await fill('quota',quota);};
 const download=async selector=>{const d=await b.download(selector);receipt.downloads.push({path:d.path,bytes:d.bytes.length,sha256:d.sha256,name:d.suggestedFilename,completed:d.completed.state});return d;};
 const observation=(weights,quota,index=1,critical=false)=>JSON.stringify({format:'recallweave-coalition-power-observation/1',analysis:analyzeGame(weights,quota),view:{player_index:index,critical_only:critical}},null,2)+'\n';
 const click=async selector=>{
  const r=await b.evaluate('(()=>{const r=document.querySelector('+JSON.stringify(selector)+').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()');
  await b.command('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...r});
  await b.command('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...r});
 };
 try{
  b=await openBrowser(output,executable);receipt.browser=b.version;receipt.pid=b.childPid;receipt.profile=b.profile;
  await b.navigate(page,1280,1000);
  await until(()=>b.evaluate('!document.querySelector("#result").hidden'),'applied authored game');
  await group('Default visible table and cards retain exact critical membership and two denominators',async()=>{
   assert.deepEqual(await b.evaluate('[...document.querySelectorAll("#metrics strong")].map(e=>e.textContent)'),['8','3','5','7']);
   assert.equal(await b.evaluate('document.querySelectorAll("#coalitions tr").length'),8);
   assert.deepEqual(await b.evaluate('[...document.querySelectorAll("#coalitions tr")].map(r=>r.lastElementChild.textContent)'),['none','none','none','A, B','none','A, C','none','A']);
   assert.match(await b.evaluate('document.querySelector(".player").textContent'),/3\/4.*3\/5/);
  });
  await group('Keyboard focus outline belongs only to the focused control',async()=>{
   const initial=await b.evaluate('[...document.querySelectorAll("button")].map(e=>({id:e.id,style:getComputedStyle(e).outlineStyle,width:getComputedStyle(e).outlineWidth}))');
   assert.ok(initial.every(x=>x.style==='none'||x.width==='0px'));
   await b.key('Tab');
   assert.equal(await b.evaluate('document.activeElement.id'),'course-save');
   assert.deepEqual(await b.evaluate('(()=>{const e=document.activeElement,s=getComputedStyle(e);return {visible:e.matches(":focus-visible"),style:s.outlineStyle,width:s.outlineWidth};})()'),{visible:true,style:'solid',width:'3px'});
   assert.equal(await b.evaluate('[...document.querySelectorAll("button")].filter(e=>getComputedStyle(e).outlineStyle!=="none"&&getComputedStyle(e).outlineWidth!=="0px").length'),1);
  });
  await group('Actual default observation is the exact applied analysis and view wrapper',async()=>{
   const d=await download('#observation-save');assert.equal(d.bytes.toString(),observation([6,4,2],7));
   assert.equal(d.suggestedFilename,'coalition-power-observation.json');
  });
  await group('Course and worked-guide downloads preserve exact source bytes and distinct formats',async()=>{
   courseDownload=await download('#course-save');assert.deepEqual(courseDownload.bytes,course);
   assert.equal(courseDownload.suggestedFilename,'coalition-power-course.json');
   const d=await download('#guide-save');assert.deepEqual(d.bytes,guide);
   assert.equal(d.suggestedFilename,'coalition-power-guide.md');
  });
  await group('Actual keyboard edits immediately retire results and malformed values cannot export',async()=>{
   await set('6, 4, -0','7');
   assert.equal(await b.evaluate('document.querySelector("#result").hidden && document.querySelector("#observation-save").disabled'),true);
   await b.activate('#apply');assert.match(await b.evaluate('document.querySelector("#status").textContent'),/without signs/);
   assert.equal(await b.evaluate('document.querySelector("#result").hidden'),true);
   await set('6,4,2','13');await b.activate('#apply');
   assert.match(await b.evaluate('document.querySelector("#status").textContent'),/1 through 12/);
   assert.equal(await b.evaluate('document.querySelector("#observation-save").disabled'),true);
  });
  await group('A preset remains unapplied until explicit Apply and a dummy has no invented witness',async()=>{
   await b.activate('[data-preset="5,3,1|7"]');
   assert.equal(await b.evaluate('document.querySelector("#result").hidden'),true);
   await b.activate('#apply');
   await b.evaluate('document.querySelector("#player").focus()');await b.key('End');
   assert.equal(await b.evaluate('document.querySelector("#player").value'),'3');
   await click('#critical-only');
   assert.equal(await b.evaluate('document.querySelectorAll("#coalitions tr").length'),0);
   assert.equal(await b.evaluate('document.querySelector("#no-rows").hidden'),false);
   assert.match(await b.evaluate('document.querySelector("#witnesses").textContent'),/No swing exists/);
   assert.deepEqual(await b.evaluate('[...document.querySelectorAll(".count")].map(e=>e.textContent)'),['2 swings','2 swings','0 swings']);
   const d=await download('#observation-save');assert.equal(d.bytes.toString(),observation([5,3,1],7,3,true));
  });
  await group('Zero-weight addition doubles raw counts and retains reduced measures and ordinals',async()=>{
   await set('6,4,2,0','7');await b.activate('#apply');
   assert.deepEqual(await b.evaluate('[...document.querySelectorAll(".count")].map(e=>e.textContent)'),['6 swings','2 swings','2 swings','0 swings']);
   assert.equal(await b.evaluate('document.querySelectorAll("#coalitions tr").length'),16);
   assert.match(await b.evaluate('document.querySelector(".player").textContent'),/3\/4.*3\/5/);
   assert.equal(await b.evaluate('document.querySelector("#player option:last-child").textContent'),'D · weight 0');
  });
  await group('Largest six-player game keeps all 64 rows and exact observation',async()=>{
   await set('20,20,20,20,20,20','120');await b.activate('#apply');
   assert.equal(await b.evaluate('document.querySelectorAll("#coalitions tr").length'),64);
   assert.equal(await b.evaluate('document.querySelector("#coalitions tr:last-child").lastElementChild.textContent'),'A, B, C, D, E, F');
   assert.match(await b.evaluate('document.querySelector(".player").textContent'),/1\/32.*1\/6/);
   const d=await download('#observation-save');assert.equal(d.bytes.toString(),observation([20,20,20,20,20,20],120));
  });
  await group('Actual Letter PDF preserves complete maximum table, exact measures and model limits',async()=>{
   await b.viewport(739,1000);await b.command('Emulation.setEmulatedMedia',{media:'print'});
   const pdf=await b.command('Page.printToPDF',{printBackground:true,paperWidth:8.5,paperHeight:11,marginTop:.4,marginBottom:.4,marginLeft:.4,marginRight:.4});
   const bytes=Buffer.from(pdf.data,'base64'),path=join(output,'coalition-power.pdf');await writeFile(path,bytes);
   const text=execFileSync('pdftotext',['-layout',path,'-'],{encoding:'utf8'});await writeFile(join(output,'print.txt'),text);
   for(const s of ['quota 120','64 coalitions','1/32','1/6','A, B, C, D, E, F','coordination','fairness'])assert.ok(text.replace(/\s+/g,' ').includes(s),'PDF missing '+s);
   receipt.artifacts.push({path,bytes:bytes.length,sha256:sha256(bytes)});await b.command('Emulation.setEmulatedMedia',{media:''});
  });
  await group('One-player edge includes the empty other-player coalition without fictitious peers',async()=>{
   await set('1','1');await b.activate('#apply');
   assert.equal(await b.evaluate('document.querySelectorAll("#coalitions tr").length'),2);
   assert.equal(await b.evaluate('document.querySelectorAll("#player option").length'),1);
   assert.match(await b.evaluate('document.querySelector("#witnesses").textContent'),/none \(empty\).*0 loses.*1 passes/);
   assert.match(await b.evaluate('document.querySelector(".player").textContent'),/1\/1.*1\/1/);
  });
  await group('Desktop and 390-pixel phone retain readable controls without page overflow',async()=>{
   await set('6,4,2','7');await b.activate('#apply');
   await b.viewport(1280,1000);
   assert.ok(await b.evaluate('document.documentElement.scrollWidth<=innerWidth'));
   receipt.screenshots.push(await b.screenshot('desktop.png'));
   await b.viewport(390,844);
   assert.ok(await b.evaluate('document.documentElement.scrollWidth<=innerWidth'));
   assert.equal(await b.evaluate('document.querySelectorAll("#coalitions tr").length'),8);
   receipt.screenshots.push(await b.screenshot('phone.png'));
  });
  await group('Fresh relocated standalone page works with network offline and exact embedded downloads',async()=>{
   const dir=join(output,'relocated');await mkdir(dir);const path=join(dir,'explorer.html');await copyFile(page,path);
   await b.navigate(path,390,844);await until(()=>b.evaluate('!document.querySelector("#result").hidden'),'relocated applied game');
   assert.equal(await b.evaluate('document.querySelectorAll("#coalitions tr").length'),8);
   const d=await download('#course-save');assert.deepEqual(d.bytes,course);
   assert.ok(b.requests.every(x=>x.startsWith('file:')));assert.equal(b.errors.length,0);
  });
  if(portableArg) await group('Fresh extracted quickstart and relative explorer/learner routes preserve exact content',async()=>{
   const portable=resolve(portableArg);
   await b.navigate(join(portable,'START-HERE.html'),1280,1000);
   await b.activate('a[href="courses/coalition-power-explorer.html"]');
   await until(()=>b.evaluate('location.href.endsWith("/courses/coalition-power-explorer.html") && !document.querySelector("#result")?.hidden'),'quickstart relative explorer');
   const d=await download('#course-save');assert.deepEqual(d.bytes,course);courseDownload=d;
   await b.activate('#learner-link');
   await until(()=>b.evaluate('location.href.endsWith("/demo.html") && !!document.querySelector("#deck-file")'),'relative portable learner');
   learnerPath=join(portable,'demo.html');
   assert.equal(await b.evaluate('location.href'),pathToFileURL(learnerPath).href);
   receipt.portable={root:portable,course_sha256:d.sha256,learner_sha256:sha256(await readFile(learnerPath))};
  });
  await group('Downloaded course enters unchanged learner preview before explicit Start',async()=>{
   await b.navigate(learnerPath,1280,1000);
   const {root:dom}=await b.command('DOM.getDocument');
   const {nodeId}=await b.command('DOM.querySelector',{nodeId:dom.nodeId,selector:'#deck-file'});
   await b.command('DOM.setFileInputFiles',{nodeId,files:[courseDownload.path]});
   await until(()=>b.evaluate('document.querySelector("#deck-preview-title")?.textContent === '+JSON.stringify(deck.title)),'course preview');
   assert.equal(await b.evaluate('document.querySelectorAll("#deck-preview ol li").length'),12);
   assert.equal(await b.evaluate('document.querySelector("#step-count").textContent'),'0 / 6');
   await b.activate('#start-deck');
   await until(()=>b.evaluate('document.querySelector("#step-count").textContent.includes("/ 12")'),'explicit course start');
   assert.match(await b.evaluate('document.querySelector("#deck-status").textContent'),/Started/);
   receipt.screenshots.push(await b.screenshot('learner-start.png'));
  });
  await group('No runtime exception or external request is observed',async()=>{
   assert.equal(b.errors.length,0);assert.ok(b.requests.every(x=>x.startsWith('file:')));
   receipt.requests=[...b.requests];receipt.errors=[...b.errors];
  });
  receipt.accepted=true;
 }catch(error){receipt.accepted=false;receipt.error=String(error.stack??error);if(b){try{receipt.failureState=await b.evaluate('({url:location.href,status:document.querySelector("#status")?.textContent,weights:document.querySelector("#weights")?.value,quota:document.querySelector("#quota")?.value,resultHidden:document.querySelector("#result")?.hidden})');}catch{}}throw error;}
 finally{if(b){await b.close();receipt.cleanup={closed:true,profileRemoved:true};}await writeFile(join(output,'browser-receiving.json'),JSON.stringify(receipt,null,2)+'\n');}
}
receive().catch(error=>{console.error(error);process.exitCode=1;});
