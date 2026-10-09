import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const ROOT='C:\\Users\\jacob\\recallweave-nfa-3dcb83a1';
const PEER='C:\\Users\\jacob\\recallweave-nfa-independent-3dcb83a1';
const OUT=path.join(ROOT,'notes-followup-v1');
const COURSE=path.join(PEER,'browser-receiving-v1','downloads','nondeterministic-automata.json');
const LEARNER=path.join(PEER,'product-received-v1','demo.html');
const CONTRACT=path.join(PEER,'notes-custody-followup-contract-v1.json');
const CHROME='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const contract=JSON.parse(fs.readFileSync(CONTRACT,'utf8'));
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const report={schema:'recallweave-notes-custody-followup.v1',contract_author:'root-3dcb83a1',receiver_author:'estate_continuity-3dcb83a1',started_utc:new Date().toISOString(),pid:process.pid,checks:[],page_exceptions:[],page_http_requests:[],download_events:[],cleanup_fallback:false,scope:'One fresh actual unchanged learner notes download; completion before shutdown and exact bytes after shutdown. Does not relabel original cancelled file as retained.'};
let child,client,browserClient,browserExit=null,notePath=null;
const stdout=[],stderr=[];
function bytesPin(b){return {bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex'),git_blob:crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex')};}
function pin(p){return bytesPin(fs.readFileSync(p));}
function equal(label,actual,expected){try{assert.deepEqual(actual,expected);report.checks.push({label,passed:true});}catch(e){report.checks.push({label,passed:false,actual,expected});throw e;}}
function check(label,condition,detail){report.checks.push({label,passed:!!condition,...(detail===undefined?{}:{detail})});if(!condition)throw Error(label);}
function save(name,value){fs.writeFileSync(path.join(OUT,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});}
async function waitFor(fn,label,ms=10000){const end=Date.now()+ms;while(Date.now()<end){const value=await fn();if(value)return value;await pause(40);}throw Error('Bounded wait expired: '+label);}
async function connect(url){
 const ws=new WebSocket(url);
 await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
 let seq=0;const pending=new Map();
 ws.addEventListener('message',ev=>{
  const item=JSON.parse(String(ev.data));
  if(item.id){const q=pending.get(item.id);if(!q)return;clearTimeout(q.timer);pending.delete(item.id);item.error?q.reject(Error(JSON.stringify(item.error))):q.resolve(item.result);}
  else if(item.method==='Browser.downloadWillBegin'||item.method==='Browser.downloadProgress')report.download_events.push({received_utc:new Date().toISOString(),method:item.method,params:item.params});
  else if(item.method==='Runtime.exceptionThrown')report.page_exceptions.push(item.params);
  else if(item.method==='Network.requestWillBeSent'&&/^https?:/.test(item.params.request.url))report.page_http_requests.push(item.params.request.url);
 });
 return {send(method,params={}){return new Promise((resolve,reject)=>{const id=++seq;const timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout '+method));},12000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}));});},close(){for(const q of pending.values()){clearTimeout(q.timer);q.reject(Error('Connection closed'));}pending.clear();ws.close();}};
}
async function value(expression){const r=await client.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
async function click(selector){
 const r=await value("(()=>{const e=document.querySelector("+JSON.stringify(selector)+");if(!e)throw Error('Missing click target');e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,disabled:!!e.disabled};})()");
 assert.equal(r.disabled,false,'click target enabled '+selector);
 await client.send('Input.dispatchMouseEvent',{type:'mousePressed',x:r.x,y:r.y,button:'left',clickCount:1});
 await client.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:r.x,y:r.y,button:'left',clickCount:1});
}
async function navigate(file,ready){
 const url=pathToFileURL(file).href;await client.send('Page.navigate',{url});
 await waitFor(()=>value("location.href==="+JSON.stringify(url)+" && ("+ready+")"),'actual target page ready');
}
async function screenshot(name){
 const r=await client.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 const b=Buffer.from(r.data,'base64');fs.writeFileSync(path.join(OUT,name),b,{flag:'wx'});(report.screenshots??={})[name]=bytesPin(b);
}
async function chooseFile(file){
 const doc=await client.send('DOM.getDocument');
 const node=await client.send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'#deck-file'});
 assert(node.nodeId>0);await client.send('DOM.setFileInputFiles',{nodeId:node.nodeId,files:[file]});
}
function sourcePins(){
 const rows={learner:pin(LEARNER),course:pin(COURSE),contract:pin(CONTRACT),receiver:pin(new URL(import.meta.url))};
 for(const key of ['learner','course'])for(const k of ['bytes','sha256'])assert.equal(rows[key][k],contract.inputs[key][k],key+'/'+k);
 return rows;
}
try{
 assert.equal(fs.existsSync(OUT),false,'Fresh exclusive output; no relaxed retry');
 report.guard={node:process.version,node_path:process.execPath,node_pin:pin(process.execPath),chrome:CHROME,chrome_pin:pin(CHROME),available_memory:os.freemem(),disk_available:fs.statfsSync(ROOT).bavail*fs.statfsSync(ROOT).bsize};
 assert.equal(report.guard.node,'v24.14.0');assert.equal(report.guard.node_pin.sha256,'63c259c81e5d472b5f11c8d506070130cb04a1ecf84b80377a34ed6ec9048088');assert.equal(report.guard.chrome_pin.sha256,'977d6483df6c457eab24a3241b44645c66067f52b73bc2c8dbd7e6469bf15d1f');
 assert(report.guard.available_memory>=4294967296&&report.guard.disk_available>=38654705664);
 report.inputs_before=sourcePins();
 fs.mkdirSync(OUT);fs.mkdirSync(path.join(OUT,'downloads'));
 const args=['--headless=new','--remote-debugging-port=0','--user-data-dir='+path.join(OUT,'profile'),'--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-default-apps','--disable-sync','--metrics-recording-only','--no-proxy-server','--window-size=1280,960','about:blank'];
 child=spawn(CHROME,args,{stdio:['ignore','pipe','pipe'],windowsHide:true});report.browser={pid:child.pid,args};
 child.stdout.on('data',b=>stdout.push(b));child.stderr.on('data',b=>stderr.push(b));child.on('exit',(code,signal)=>{browserExit={code,signal};});child.on('error',e=>{report.browser_spawn_error=String(e);});
 const portFile=path.join(OUT,'profile','DevToolsActivePort');
 const portText=await waitFor(()=>fs.existsSync(portFile)?fs.readFileSync(portFile,'utf8'):null,'private Chrome endpoint',15000);
 const [portLine,browserEndpoint]=portText.trim().split(/\r?\n/);const port=Number(portLine);assert(Number.isInteger(port)&&port>0&&browserEndpoint.startsWith('/devtools/browser/'));
 browserClient=await connect('ws://127.0.0.1:'+port+browserEndpoint);
 const targets=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();client=await connect(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
 await client.send('Page.enable');await client.send('Runtime.enable');await client.send('Network.enable');await client.send('DOM.enable');
 report.browser.version=await browserClient.send('Browser.getVersion');
 await browserClient.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:path.join(OUT,'downloads'),eventsEnabled:true});
 await navigate(LEARNER,"document.readyState==='complete' && !!document.querySelector('#deck-file') && !!document.querySelector('#start-button')");
 const deck=JSON.parse(fs.readFileSync(COURSE,'utf8'));assert.equal(deck.items.length,12);
 const beforeImport=await value("({session:document.querySelector('#session-content').innerHTML,step:document.querySelector('#step-count').textContent,title:document.title})");
 await chooseFile(COURSE);await waitFor(()=>value("!!document.querySelector('#start-deck')"),'actual course preview');
 equal('actual course preview preserves12 literal prompts',await value("[...document.querySelectorAll('.deck-questions li strong')].map(e=>e.textContent)"),deck.items.map(i=>i.prompt));
 equal('preview preserves original session',await value("({session:document.querySelector('#session-content').innerHTML,step:document.querySelector('#step-count').textContent,title:document.title})"),beforeImport);
 await click('#start-deck');await waitFor(()=>value("!!document.querySelector('#session-content .question-card h2')"),'explicit Start');
 const seen=new Set(),responses=[],wrongIds=new Set(['nfa-03','nfa-07','nfa-11']);
 for(let n=0;n<12;n++){
  const prompt=await value("document.querySelector('#session-content .question-card h2').textContent"),item=deck.items.find(i=>i.prompt===prompt);
  assert(item&&!seen.has(item.id));seen.add(item.id);
  const choice=wrongIds.has(item.id)?(item.answer+1)%item.options.length:item.answer;
  await click('[data-choice="'+choice+'"]');
  const feedback=await value("({text:document.querySelector('#feedback-slot').textContent,disabled:[...document.querySelectorAll('[data-choice]')].every(e=>e.disabled),correct:[...document.querySelectorAll('[data-choice].correct')].map(e=>Number(e.dataset.choice))})");
  check('normal first-pass feedback '+item.id,feedback.text.includes(item.explanation)&&feedback.text.includes(item.options[choice])&&feedback.text.includes(item.options[item.answer])&&feedback.text.includes(item.transfer)&&feedback.disabled&&feedback.correct.length===1&&feedback.correct[0]===item.answer);
  responses.push({id:item.id,choice,correct:choice===item.answer});await click('#next-button');
 }
 equal('all12 identities',Array.from(seen).sort(),deck.items.map(i=>i.id).sort());
 check('original9of12 and three misses',await value("document.querySelector('#first-try-summary').textContent.includes('9 of 12') && document.querySelectorAll('.review-item').length===12 && document.querySelectorAll('.review-status.needs-review').length===3"));
 const firstTry=await value("document.querySelector('#first-try-summary').textContent");await click('#practice-button');
 const practiced=[];
 for(let n=0;n<3;n++){
  const prompt=await value("document.querySelector('#session-content .practice-card h2').textContent"),item=deck.items.find(i=>i.prompt===prompt);assert(item&&wrongIds.has(item.id)&&!practiced.includes(item.id));
  await click('[data-practice-choice="'+item.answer+'"]');check('normal practice feedback '+item.id,await value("document.querySelector('#practice-feedback').textContent").then(t=>t.includes(item.explanation)&&t.includes(item.options[item.answer])));
  practiced.push(item.id);await click('#practice-next');
 }
 equal('exact missed identities practiced',practiced.sort(),Array.from(wrongIds).sort());
 equal('first-try result preserved',await value("document.querySelector('#first-try-summary').textContent"),firstTry);
 check('practice completion preserved',await value("document.querySelector('#practice-status').textContent.includes('3 of 3') && document.querySelectorAll('.review-practice-answer').length===3"));
 report.learner={responses,practiced,first_try:firstTry};
 assert.equal(report.download_events.length,0);
 const saveStarted=Date.now();report.save_clicked_utc=new Date().toISOString();await click('#save-notes-button');
 const begin=await waitFor(()=>report.download_events.find(e=>e.method==='Browser.downloadWillBegin'),'downloadWillBegin',contract.execution_boundary.timeout_seconds*1000);
 equal('literal notes filename',begin.params.suggestedFilename,contract.expected_notes.filename);
 const guid=begin.params.guid;assert(typeof guid==='string'&&guid.length>0);
 const completion=await waitFor(()=>{
  const terminal=report.download_events.find(e=>e.method==='Browser.downloadProgress'&&e.params.guid===guid&&['completed','canceled'].includes(e.params.state));
  if(terminal?.params.state==='canceled')throw Error('Actual notes download canceled; no retry');
  return terminal;
 },'same-guid completed download',Math.max(1,contract.execution_boundary.timeout_seconds*1000-(Date.now()-saveStarted)));
 equal('same-guid actual completed download',completion.params.state,'completed');
 notePath=path.join(OUT,'downloads',contract.expected_notes.filename);
 const live=pin(notePath);for(const k of ['bytes','sha256'])equal('live notes '+k,live[k],contract.expected_notes[k]);
 report.completed_download={guid,will_begin:begin,completed:completion,live_pin:live,elapsed_ms:Date.now()-saveStarted,path:notePath};
 equal('source inputs unchanged before shutdown',sourcePins(),report.inputs_before);
 equal('no page exceptions',report.page_exceptions,[]);equal('no HTTP page or asset requests',report.page_http_requests,[]);
 report.accepted=true;
}catch(error){
 report.accepted=false;report.error={name:error.name,message:error.message,stack:error.stack};
 if(client&&fs.existsSync(OUT)){try{await screenshot('failure.png');}catch(e){report.failure_screenshot_error=String(e);}}
}finally{
 if(browserClient){try{await browserClient.send('Browser.close');}catch(e){report.browser_close_transport=String(e);}}
 else if(client){try{await client.send('Browser.close');}catch(e){report.browser_close_transport=String(e);}}
 if(child){try{await waitFor(()=>browserExit,'own Chrome exit',10000);}catch{report.cleanup_fallback=true;child.kill();try{await waitFor(()=>browserExit,'own Chrome termination',3000);}catch{}}}
 if(client)client.close();if(browserClient)browserClient.close();report.browser_exit=browserExit;
 if(browserExit?.code!==0||report.cleanup_fallback)report.accepted=false;
 if(report.accepted){
  try{const after=pin(notePath);for(const k of ['bytes','sha256'])equal('post-exit notes '+k,after[k],contract.expected_notes[k]);report.completed_download.post_exit_pin=after;equal('source inputs unchanged after exit',sourcePins(),report.inputs_before);}
  catch(error){report.accepted=false;report.post_exit_error={name:error.name,message:error.message,stack:error.stack};}
 }
 report.finished_utc=new Date().toISOString();report.passed=report.checks.filter(x=>x.passed).length;report.failed=report.checks.filter(x=>!x.passed).length;
 if(fs.existsSync(OUT)){fs.writeFileSync(path.join(OUT,'chrome.stdout'),Buffer.concat(stdout),{flag:'wx'});fs.writeFileSync(path.join(OUT,'chrome.stderr'),Buffer.concat(stderr),{flag:'wx'});report.chrome_stdout=pin(path.join(OUT,'chrome.stdout'));report.chrome_stderr=pin(path.join(OUT,'chrome.stderr'));save('result.json',report);}
 console.log(JSON.stringify({accepted:report.accepted,passed:report.passed,failed:report.failed,error:report.error,post_exit_error:report.post_exit_error,result:fs.existsSync(path.join(OUT,'result.json'))?pin(path.join(OUT,'result.json')):null,browser_exit:browserExit,cleanup_fallback:report.cleanup_fallback}));
 process.exitCode=report.accepted?0:2;
}
