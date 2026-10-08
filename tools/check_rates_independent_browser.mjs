#!/usr/bin/env node
// Independent direct-file receiving. Uses an owned Chromium profile and actual input/download events.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir,mkdtemp,rm,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const args=process.argv.slice(2), option=(name,fallback)=>args.includes(name)?args[args.indexOf(name)+1]:fallback;
const root=resolve(option('--root','.')), output=resolve(option('--output','rates-independent-browser'));
const chrome=option('--browser','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
await mkdir(output,{recursive:true});assert.deepEqual(await readdir(output),[],'Receiving output must be new');
const downloads=join(output,'downloads');await mkdir(downloads);const profile=await mkdtemp(join(output,'profile-'));
const sourcePaths=['src/rates-accumulation.mjs','src/rates-accumulation-ui.mjs','courses/rates-accumulation.json','courses/rates-accumulation.md','courses/rates-accumulation-explorer.template.html','courses/rates-accumulation-explorer.html','tools/build-rates-accumulation.mjs'];
const hash=x=>createHash('sha256').update(x).digest('hex');
const pins=async()=>Object.fromEntries(await Promise.all(sourcePaths.map(async p=>[p,hash(await readFile(join(root,p)))])));
const report={format:'recallweave-rates-independent-browser/1',started:new Date().toISOString(),root,node:process.version,sourceSha256:await pins(),checks:[],captures:[],network:[],pageErrors:[],status:'running'};
const pause=ms=>new Promise(r=>setTimeout(r,ms)), pending=new Map();
let browser,socket,sessionId,sequence=0,stderr='';
async function until(check,label){let last;for(let n=0;n<100;n++){try{if(await check())return;}catch(e){last=e;}await pause(100);}throw new Error('Timed out '+label+(last?': '+last.message:''));}
function command(method,params={},scoped=true){
  const id=++sequence;
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP '+method+' timed out'));},12000);
    pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params,...(scoped&&sessionId?{sessionId}:{})}));
  });
}
async function evaluate(expression){
  const r=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);
  return r.result.value;
}
async function key(name){
  const codes={Enter:13,Tab:9,Home:36,End:35,ArrowLeft:37,ArrowRight:39,ArrowUp:38,ArrowDown:40};
  assert.ok(codes[name]);
  for(const type of ['keyDown','keyUp'])await command('Input.dispatchKeyEvent',{type,key:name,code:name,windowsVirtualKeyCode:codes[name],nativeVirtualKeyCode:codes[name],...(name==='Enter'&&type==='keyDown'?{text:'\r',unmodifiedText:'\r'}:{})});
}
async function activate(selector){await evaluate('document.querySelector('+JSON.stringify(selector)+').focus()');await key('Enter');}
async function type(selector,value){
  await evaluate('(()=>{const e=document.querySelector('+JSON.stringify(selector)+');e.focus();e.select();})()');
  if(value==='')await evaluate('(()=>{const e=document.querySelector('+JSON.stringify(selector)+');e.value="";e.dispatchEvent(new Event("input",{bubbles:true}));})()');
  else await command('Input.insertText',{text:value});
}
async function preset(value){
  await evaluate('(()=>{const e=document.querySelector("#rate-preset");e.value='+JSON.stringify(value)+';e.dispatchEvent(new Event("change",{bubbles:true}));})()');
  await activate('#use-example');
}
const state=()=>evaluate('({hidden:document.querySelector("#rates-results").hidden,downloadDisabled:document.querySelector("#download-calculation").disabled,velocity:document.querySelector("#velocity-value").dataset.fraction,displacement:document.querySelector("#displacement-value").dataset.fraction,distance:document.querySelector("#distance-value").dataset.fraction,average:document.querySelector("#average-value").dataset.fraction,acceleration:document.querySelector("#acceleration-value").dataset.kind,time:document.querySelector("#inspect-time").value,curveError:document.querySelector("#curve-error").textContent,inspectionError:document.querySelector("#inspection-error").textContent})');
const pass=name=>{report.checks.push(name);console.log('PASS '+name);};
async function screenshot(name,selector){
  if(selector)await evaluate('document.querySelector('+JSON.stringify(selector)+').scrollIntoView({block:"start"})');
  const r=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false}),bytes=Buffer.from(r.data,'base64');
  await writeFile(join(output,name),bytes);report.captures.push({name,sha256:hash(bytes),bytes:bytes.length});
}
const page=pathToFileURL(join(root,'courses/rates-accumulation-explorer.html')).href;
try{
  browser=spawn(chrome,['--headless=new','--disable-gpu','--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run','--no-default-browser-check','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe']});
  browser.stderr.on('data',chunk=>stderr=(stderr+chunk).slice(-16000));
  let launchError;browser.on('error',e=>launchError=e);
  let port,endpoint;
  await until(async()=>{if(launchError)throw launchError;if(browser.exitCode!==null)throw new Error('Chrome exited '+browser.exitCode);[port,endpoint]=(await readFile(join(profile,'DevToolsActivePort'),'utf8')).trim().split('\n');return port&&endpoint;},'isolated browser');
  socket=new WebSocket('ws://127.0.0.1:'+port+endpoint);
  socket.addEventListener('message',event=>{
    const message=JSON.parse(event.data);
    if(message.id){
      const item=pending.get(message.id);if(!item)return;pending.delete(message.id);clearTimeout(item.timer);
      if(message.error)item.reject(new Error(message.error.message));else item.resolve(message.result);
    }else if(message.method==='Runtime.exceptionThrown')report.pageErrors.push(message.params.exceptionDetails.exception?.description??message.params.exceptionDetails.text);
    else if(message.method==='Network.requestWillBeSent')report.network.push(message.params.request.url);
  });
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  report.browser=await command('Browser.getVersion',{},false);
  await command('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads},false);
  const {targetId}=await command('Target.createTarget',{url:'about:blank'},false);
  ({sessionId}=await command('Target.attachToTarget',{targetId,flatten:true},false));
  await command('Page.enable');await command('Runtime.enable');await command('Network.enable');
  await command('Emulation.setDeviceMetricsOverride',{width:1280,height:1050,deviceScaleFactor:1,mobile:false});
  await command('Page.navigate',{url:page});
  await until(()=>evaluate('document.readyState==="complete"&&document.querySelector("#distance-value")?.dataset.fraction==="16/1"'),'direct file startup');
  assert.equal((await state()).displacement,'0/1');assert.equal((await state()).average,'0/1');
  pass('direct-file original curve yields net0 and distance16 at8s');
  await screenshot('01-wide-default.png','header');

  await preset('crossing');
  await type('#curve-points tr:nth-child(1) [data-velocity]','1');
  assert.equal((await state()).hidden,true);assert.equal((await state()).downloadDisabled,true);
  await type('#curve-points tr:nth-child(2) [data-time]','1');
  await type('#curve-points tr:nth-child(2) [data-velocity]','-2');
  await activate('#apply-curve');await type('#inspect-time','0.5');
  const half=await state();
  assert.equal(half.velocity,'-1/2');assert.equal(half.displacement,'1/8');assert.equal(half.distance,'5/24');assert.equal(half.average,'1/4');assert.equal(half.acceleration,'defined');
  assert.match(await evaluate('document.querySelector("#segment-rows").textContent'),/1\/3/);
  pass('actual point input admits non-grid1/3 root and exact0.5s prefix1/8net5/24distance');

  await evaluate('document.querySelector("#inspect-slider").focus()');await key('Home');
  assert.equal((await state()).time,'0');assert.equal((await state()).average,'undefined');assert.equal((await state()).velocity,'1/1');assert.equal((await state()).acceleration,'start-boundary');
  await key('End');assert.equal((await state()).displacement,'-1/2');assert.equal((await state()).distance,'5/6');assert.equal((await state()).acceleration,'end-boundary');
  await key('ArrowLeft');assert.equal((await state()).time,'0.9');
  pass('real Home End and ArrowLeft preserve zero-duration and interval boundary semantics');

  await type('#inspect-time','0.55');
  assert.equal((await state()).hidden,true);assert.equal((await state()).downloadDisabled,true);assert.match((await state()).inspectionError,/one decimal/);
  await type('#inspect-time','0.5');assert.equal((await state()).hidden,false);assert.equal((await state()).distance,'5/24');
  await type('#curve-points tr:nth-child(2) [data-velocity]','-50.1');
  assert.equal((await state()).hidden,true);assert.equal((await state()).downloadDisabled,true);
  await activate('#apply-curve');assert.equal((await state()).hidden,true);assert.match((await state()).curveError,/between/);
  await type('#curve-points tr:nth-child(2) [data-velocity]','-2');await activate('#apply-curve');await type('#inspect-time','0.5');
  pass('invalid time and invalid point drafts hide all stale output and block calculation downloads until repaired');

  await activate('#download-calculation');
  await until(async()=>(await readdir(downloads)).includes('rates-accumulation-calculation.json'),'native calculation download');
  const calculationBytes=await readFile(join(downloads,'rates-accumulation-calculation.json')),calculation=JSON.parse(calculationBytes);
  assert.equal(calculation.time.fraction,'1/2');assert.equal(calculation.distance.fraction,'5/24');
  assert.equal(calculation.displacement.fraction,'1/8');assert.equal(calculation.segments[0].zeroCrossing.fraction,'1/3');
  assert.equal(calculation.source,'time_s,velocity_m_s\n0,1\n1,-2');
  report.calculationDownload={sha256:hash(calculationBytes),bytes:calculationBytes.length};
  pass('browser-saved calculation carries the actual edited source, exact inspection time and exact root');

  await preset('return');await type('#inspect-time','2');
  assert.equal((await state()).acceleration,'corner');
  assert.match(await evaluate('document.querySelector("#acceleration-value").textContent'),/Position still has derivative 4/);
  await preset('touch');await type('#inspect-time','2');
  assert.equal((await state()).velocity,'0/1');assert.equal((await state()).displacement,'2/1');assert.equal((await state()).distance,'2/1');assert.equal((await state()).acceleration,'corner');
  pass('velocity corners preserve the derivative of position; touching zero retains earlier travel');

  await preset('crossing');await type('#inspect-time','3.5');
  await activate('#segment-details summary');
  await screenshot('02-wide-crossing.png','#inspect-heading');
  report.layout=[];
  for(const width of [390,320]){
    await command('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
    const layout=await evaluate('({width:innerWidth,documentWidth:document.documentElement.scrollWidth,axisLabelHeights:[...document.querySelectorAll(".plot svg text")].map(e=>e.getBoundingClientRect().height),unlabeledInputs:[...document.querySelectorAll("input")].filter(e=>!e.labels?.length&&!e.getAttribute("aria-label")).map(e=>e.id),tableScrollable:document.querySelector(".table-scroll").scrollWidth>document.querySelector(".table-scroll").clientWidth})');
    assert.ok(layout.documentWidth<=layout.width,'page must not horizontally overflow at'+width);
    assert.deepEqual(layout.unlabeledInputs,[]);
    assert.ok(layout.tableScrollable);
    report.layout.push(layout);
    await screenshot('03-'+width+'-plots.png','#velocity-plot-title');
    await screenshot('04-'+width+'-controls.png','#curve-heading');
  }
  pass('390px and320px retain labeled controls and contain horizontal scrolling inside the exact interval table');
  await command('Page.reload',{ignoreCache:true});
  await until(()=>evaluate('document.querySelector("#distance-value")?.dataset.fraction==="16/1"'),'fresh original state');
  assert.equal((await state()).time,'8');assert.equal((await state()).displacement,'0/1');
  assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.network.filter(url=>/^https?:/i.test(url)),[]);
  assert.deepEqual(await pins(),report.sourceSha256,'receiving source bytes changed');
  pass('reload returns to the authored original with no page errors, remote requests or source mutation');
  report.status='passed';
}catch(error){report.status='failed';report.error=error.stack;process.exitCode=1;try{report.failureState=await state();await screenshot('failure.png');}catch{}console.error(error.stack);}
finally{
  report.finished=new Date().toISOString();
  try{await writeFile(join(output,'receipt.json'),JSON.stringify(report,null,2)+'\n');await writeFile(join(output,'browser.log'),stderr);}
  finally{
    if(socket){try{await command('Browser.close',{},false);}catch{}socket.close();}
    if(browser&&browser.exitCode===null){browser.kill();await pause(200);}
    for(const item of pending.values()){clearTimeout(item.timer);item.reject(new Error('Receiving complete'));}pending.clear();
    await rm(profile,{recursive:true,force:true});
  }
  console.log(JSON.stringify({status:report.status,checks:report.checks.length,layout:report.layout,output,error:report.error},null,2));
}
