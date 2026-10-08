import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const root=resolve(process.argv[2]), output=resolve(process.argv[3]);
await mkdir(output);
const profile=join(output,'profile'); await mkdir(profile);
const source=join(root,'source'), html=join(source,'courses/bezier-curves-explorer.html');
const chrome='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const hash=b=>createHash('sha256').update(b).digest('hex');
const pins={};
for(const file of [...JSON.parse(await readFile(join(root,'expected-source.json'),'utf8')).map(x=>x.path),'courses/bezier-curves-explorer.html','demo.html','author.html']) pins[file]=hash(await readFile(join(source,file)));
const checks=[], errors=[], requests=[];
const check=(name,fn)=>{fn();checks.push(name);};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,message){let last;for(let i=0;i<120;i++){try{const value=await fn();if(value)return value;}catch(e){last=e;}await pause(50);}throw new Error(message+(last?': '+last.message:''));}
let child, socket, serial=0;
const pending=new Map();
function send(method,params={}){const id=++serial;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout: '+method));},10000);pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}});socket.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){const value=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(value.exceptionDetails)throw new Error(JSON.stringify(value.exceptionDetails));return value.result.value;}
async function click(selector){const box=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e||e.disabled)throw Error('Unavailable control');e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()`);await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...box});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...box});}
async function fill(selector,text){await click(selector);await send('Input.dispatchKeyEvent',{type:'keyDown',key:'a',code:'KeyA',windowsVirtualKeyCode:65,modifiers:2});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'a',code:'KeyA',windowsVirtualKeyCode:65,modifiers:2});await send('Input.insertText',{text});}
async function select(selector,value){await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);}
async function navigate(file,ready){await send('Page.navigate',{url:pathToFileURL(file).href});await until(()=>evaluate(ready),'Page did not become ready');}
async function upload(selector,file){const {root:doc}=await send('DOM.getDocument');const {nodeId}=await send('DOM.querySelector',{nodeId:doc.nodeId,selector});assert.ok(nodeId);await send('DOM.setFileInputFiles',{nodeId,files:[file]});}
async function download(selector,folder,filename){const destination=join(output,folder);await mkdir(destination);await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:destination});await click(selector);if(filename){const file=join(destination,filename);await until(async()=>{try{return(await readFile(file)).length>0;}catch{return false;}},'Download did not complete: '+filename);return{file,bytes:await readFile(file)};}const name=await until(async()=>{const files=await readdir(destination);return files.find(f=>!f.endsWith('.crdownload'));},'Download did not complete');return{file:join(destination,name),bytes:await readFile(join(destination,name))};}
const snapshot=()=>evaluate(`({point:document.querySelector('#point-value').textContent,derivative:document.querySelector('#derivative-value').textContent,level:Number(document.querySelector('#level').value),hidden:document.querySelector('#result').hidden,downloadDisabled:document.querySelector('#download-trace').disabled,previousDisabled:document.querySelector('#previous').disabled,nextDisabled:document.querySelector('#next').disabled,rows:document.querySelectorAll('#construction tbody tr').length,error:document.querySelector('#error').hidden?'':document.querySelector('#error').textContent})`);
async function screenshot(name){const data=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(output,name),Buffer.from(data.data,'base64'));}
let failure=null, version=null;
try {
  child=spawn(chrome,['--headless=new','--remote-debugging-port=0','--user-data-dir='+profile,'--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','about:blank'],{stdio:['ignore','pipe','pipe']});
  let stdout='',stderr=''; child.stdout.on('data',b=>stdout+=b); child.stderr.on('data',b=>stderr+=b);
  child.on('error',e=>errors.push('Launch: '+e.message));
  const port=await until(async()=>{try{return(await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];}catch{return null;}},'Chrome did not publish its port');
  const tab=await fetch('http://127.0.0.1:'+port+'/json/new?about:blank',{method:'PUT'}).then(r=>r.json());
  socket=new WebSocket(tab.webSocketDebuggerUrl);
  socket.addEventListener('message',event=>{const data=JSON.parse(event.data);if(data.id){const p=pending.get(data.id);if(!p)return;pending.delete(data.id);data.error?p.reject(new Error(JSON.stringify(data.error))):p.resolve(data.result);}else if(data.method==='Runtime.exceptionThrown')errors.push(data.params);else if(data.method==='Network.requestWillBeSent')requests.push(data.params.request.url);});
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');version=await send('Browser.getVersion');
  await send('Emulation.setDeviceMetricsOverride',{width:1240,height:1000,deviceScaleFactor:1,mobile:false});
  await navigate(html,"!!document.querySelector('#result') && !document.querySelector('#result').hidden");
  let s=await snapshot();
  check('default exact point/derivative, complete triangle and level-zero controls',()=>{assert.equal(s.point,'(4, 4)');assert.equal(s.derivative,'(8, 0)');assert.equal(s.rows,3);assert.equal(s.level,0);assert.equal(s.previousDisabled,true);assert.equal(s.nextDisabled,false);});
  await screenshot('desktop.png');
  await click('#next');s=await snapshot();check('next selects retained level one',()=>assert.equal(s.level,1));
  await click('#next');s=await snapshot();check('final level disables next and highlights the exact row',()=>{assert.equal(s.level,2);assert.equal(s.nextDisabled,true);});
  check('highlighted construction matches selected level',()=>{});assert.equal(await evaluate("document.querySelector('#construction tr.selected').dataset.level"),'2');
  await click('#previous');await select('#level','0');s=await snapshot();check('previous and level selector return to level zero',()=>assert.equal(s.level,0));
  await fill('#points','0,0\n4,8\n8,0');s=await snapshot();check('editing retires stale geometry and trace download immediately',()=>{assert.equal(s.hidden,true);assert.equal(s.downloadDisabled,true);});
  await fill('#parameter',' 2/4 ');await click('#apply');await select('#level','2');await click('#show-split');
  const traceDownload=await download('#download-trace','construction-download','bezier-construction.json');const observation=JSON.parse(traceDownload.bytes);
  check('actual download retains applied text, level, exact point and ordered subdivision',()=>{assert.equal(observation.format,'recallweave.bezier-observation/1');assert.deepEqual(observation.entered,{points:'0,0\n4,8\n8,0',parameter:' 2/4 '});assert.equal(observation.selectedLevel,2);assert.equal(observation.trace.parameter,'1/2');assert.deepEqual(observation.trace.point,['4','4']);assert.deepEqual(observation.trace.leftControlPoints,[['0','0'],['2','4'],['4','4']]);assert.deepEqual(observation.trace.rightControlPoints,[['4','4'],['6','4'],['8','0']]);});
  check('subdivision toggle draws both native curve pieces',()=>{});assert.equal(await evaluate("document.querySelectorAll('#plot .split-curve').length"),2);
  await select('#preset','cubic');await click('#load-preset');s=await snapshot();check('changed cubic uses exact non-dyadic point and derivative',()=>{assert.equal(s.point,'(-92/27, 20/27)');assert.equal(s.derivative,'(58/3, -4/3)');assert.equal(s.rows,4);assert.equal(s.level,0);});
  await select('#preset','line');await click('#load-preset');s=await snapshot();check('linear case uses one interpolation and its constant derivative',()=>{assert.equal(s.point,'(-3, -1/2)');assert.equal(s.derivative,'(12, 6)');assert.equal(s.rows,2);});
  await select('#preset','stationary');await click('#load-preset');s=await snapshot();check('stationary endpoint is exact zero and explicitly described',()=>{assert.equal(s.derivative,'(0, 0)');assert.equal(s.point,'(0, 0)');});assert.match(await evaluate("document.querySelector('#stationary').textContent"),/Zero first derivative/);
  await select('#preset','speed');await click('#load-preset');s=await snapshot();check('same geometry advances nonuniformly at one half',()=>{assert.equal(s.point,'(2, 0)');assert.equal(s.derivative,'(8, 0)');});
  await select('#preset','constant');await click('#load-preset');s=await snapshot();check('coincident controls remain a defined constant cubic',()=>{assert.equal(s.point,'(3, -2)');assert.equal(s.derivative,'(0, 0)');assert.equal(s.rows,4);});
  assert.equal(await evaluate("/NaN|Infinity/.test(document.querySelector('#plot').outerHTML)"),false);
  await click('#reset');await fill('#parameter','0');await click('#apply');s=await snapshot();check('endpoint split is accepted without division by zero',()=>{assert.equal(s.point,'(0, 0)');assert.equal(s.derivative,'(8, 16)');});
  for(const [selector,text] of [['#points','21,0;1,1'],['#parameter','0.5'],['#points','<img src=x onerror=alert(1)>,0;1,1']]){
    await click('#reset');await fill(selector,text);await click('#apply');s=await snapshot();check('invalid '+text+' refuses and clears the previous result',()=>{assert.equal(s.hidden,true);assert.equal(s.downloadDisabled,true);assert.ok(s.error.length>0);});assert.equal(await evaluate("document.activeElement.id"),selector.slice(1));assert.equal(await evaluate("document.querySelectorAll('img').length"),0);
  }
  await click('#reset');
  const deckDownload=await download('#download-deck','lesson-download','bezier-curves.json'), guideDownload=await download('#download-guide','guide-download','bezier-curves.md');
  check('actual course download is byte-identical to native course',()=>assert.equal(hash(deckDownload.bytes),pins['courses/bezier-curves.json']));
  check('actual guide download is byte-identical to native guide',()=>assert.equal(hash(guideDownload.bytes),pins['courses/bezier-curves.md']));
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await evaluate('window.scrollTo(0,0)');await screenshot('mobile-top.png');
  check('390px layout has no page-wide horizontal overflow',()=>{});assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"),true);
  await evaluate("document.querySelector('#plot').scrollIntoView({block:'start'})");await screenshot('mobile-plot.png');
  await evaluate("document.querySelector('#next').focus()");assert.equal(await evaluate('document.activeElement.id'),'next');await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  s=await snapshot();check('native Enter activates the focused level control on mobile',()=>assert.equal(s.level,1));
  await send('Emulation.setDeviceMetricsOverride',{width:1240,height:1000,deviceScaleFactor:1,mobile:false});
  await navigate(join(source,'demo.html'),"!!document.querySelector('#deck-file')");
  await upload('#deck-file',deckDownload.file);await until(()=>evaluate("!!document.querySelector('#start-deck')"),'Native learner preview not ready');
  check('native learner previews the actual downloaded course before replacement',()=>{});assert.match(await evaluate("document.querySelector('#deck-preview').textContent"),/Bézier curves/);
  await click('#start-deck');await until(()=>evaluate("!!document.querySelector('.question-card')"),'Native lesson did not start');
  const deck=JSON.parse(deckDownload.bytes),seen=new Set();
  for(let index=0;index<16;index++){
    const prompt=await evaluate("document.querySelector('.question-card h2').textContent"),q=deck.items.find(q=>q.prompt===prompt);
    assert.ok(q);assert.ok(!seen.has(q.id));seen.add(q.id);
    const answer=index%4===0?(q.answer+1)%q.options.length:q.answer;
    await click('[data-choice="'+answer+'"]');
    const feedback=await evaluate("document.querySelector('#feedback-slot').textContent");assert.ok(feedback.includes(q.explanation));assert.ok(feedback.includes(q.transfer));
    await click('#next-button');
  }
  check('actual imported learner visits all sixteen items with original explanations/transfer',()=>assert.equal(seen.size,16));
  check('native review preserves mixed first responses',()=>{});assert.match(await evaluate("document.querySelector('#first-try-summary').textContent"),/12 of 16/);
  const notes=await download('#save-notes-button','notes-download');
  check('actual study notes contain every original course question and explanation',()=>{const text=notes.bytes.toString('utf8');for(const q of deck.items){assert.ok(text.includes(q.prompt));assert.ok(text.includes(q.explanation));}assert.ok(text.includes(deck.attribution));});
  await screenshot('native-learner-review.png');
  await navigate(join(source,'author.html'),"!!document.querySelector('#open-deck')");
  await upload('#open-deck',deckDownload.file);await until(()=>evaluate("!document.querySelector('#open-preview').hidden"),'Native author preview not ready');
  await click('#replace-draft');await click('#check-draft');
  await until(()=>evaluate("!document.querySelector('#download-deck').disabled"),'Native author validation did not pass');
  const authorDownload=await download('#download-deck','author-download');
  check('native authoring preview/download preserves the checked original course bytes',()=>assert.equal(hash(authorDownload.bytes),pins['courses/bezier-curves.json']));
  await screenshot('native-author-preview.png');
  check('no page runtime exceptions or external requests occurred',()=>{assert.deepEqual(errors,[]);assert.deepEqual(requests.filter(url=>!/^file:|^data:|^blob:|^about:/.test(url)),[]);});
  await writeFile(join(output,'chrome.stdout.log'),stdout);await writeFile(join(output,'chrome.stderr.log'),stderr);
} catch(error) {
  failure={name:error.name,message:error.message,stack:error.stack};
  try{await screenshot('failure.png');}catch{}
} finally {
  if(socket?.readyState===1){try{await send('Browser.close');}catch{}socket.close();}
  if(child){await pause(500);if(child.exitCode===null)child.kill();}
}
const after={};for(const file of Object.keys(pins))after[file]=hash(await readFile(join(source,file)));
if(JSON.stringify(after)!==JSON.stringify(pins)&&!failure)failure={message:'Native source inputs changed during browser receiving'};
const artifacts={};for(const file of await readdir(output)){if(file!=='profile'){const p=join(output,file);try{artifacts[file]=hash(await readFile(p));}catch{}}}
const receipt={pass:!failure,checks:checks.length,checkNames:checks,failure,version,node:process.version,platform:process.platform,runner:hash(await readFile(new URL(import.meta.url))),before:pins,after,sourceUnchanged:JSON.stringify(after)===JSON.stringify(pins),errors,requests,artifacts};
await writeFile(join(output,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({pass:receipt.pass,checks:checks.length,failure,version,sourceUnchanged:receipt.sourceUnchanged}));
if(!receipt.pass)process.exitCode=1;
