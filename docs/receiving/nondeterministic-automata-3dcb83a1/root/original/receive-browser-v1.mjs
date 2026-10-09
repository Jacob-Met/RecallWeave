import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const ROOT='C:\\Users\\jacob\\recallweave-nfa-independent-3dcb83a1';
const SOURCE=path.join(ROOT,'product-received-v1'), OUT=path.join(ROOT,'browser-receiving-v1');
const CHROME='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'browser-source-manifest-v1.json'),'utf8'));
const contract=JSON.parse(fs.readFileSync(path.join(ROOT,'contract.json'),'utf8'));
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const report={schema:'recallweave-root-independent-browser.v1',started_utc:new Date().toISOString(),pid:process.pid,checks:[],cases:[],page_exceptions:[],page_http_requests:[],cleanup_fallback:false,scope:'Actual unchanged native Chrome, exact lab and unchanged base standalone learner; CDP input/file chooser and retained downloads. No physical-person or learning-benefit claim.'};
let child,client,browserExit=null;
const stdout=[],stderr=[];
function bytesPin(b){return {bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex'),git_blob:crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex')};}
function pin(p){return bytesPin(fs.readFileSync(p));}
function equal(label,actual,expected){try{assert.deepEqual(actual,expected);report.checks.push({label,passed:true});}catch(e){report.checks.push({label,passed:false,actual,expected});throw e;}}
function check(label,condition,detail){report.checks.push({label,passed:!!condition,...(detail===undefined?{}:{detail})});if(!condition)throw Error(label);}
function save(name,value){fs.writeFileSync(path.join(OUT,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});}
function inputs(){
 const rows={};
 for(const row of manifest.files)for(const [prefix,base] of [['received',SOURCE],['author',manifest.product_source]]){
  const p=path.join(base,row.path);assert(!fs.lstatSync(p).isSymbolicLink());const got=pin(p);
  for(const k of ['bytes','sha256','git_blob'])assert.equal(got[k],row[k],prefix+'/'+row.path+'/'+k);
  rows[prefix+'/'+row.path]=got;
 }
 for(const p of [manifest.learner.original,path.join(SOURCE,'demo.html')]){const got=pin(p);for(const k of ['bytes','sha256','git_blob'])assert.equal(got[k],manifest.learner[k],p);rows[p]=got;}
 return rows;
}
async function waitFor(fn,label,ms=10000){const end=Date.now()+ms;while(Date.now()<end){const value=await fn();if(value)return value;await pause(40);}throw Error('Bounded wait expired: '+label);}
async function connect(url){
 const ws=new WebSocket(url);
 await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
 let seq=0;const pending=new Map();
 ws.addEventListener('message',ev=>{
  const item=JSON.parse(String(ev.data));
  if(item.id){const q=pending.get(item.id);if(!q)return;clearTimeout(q.timer);pending.delete(item.id);item.error?q.reject(Error(JSON.stringify(item.error))):q.resolve(item.result);}
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
async function key(key,code,virtual,modifiers=0){
 await client.send('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:virtual,modifiers,...(key==='Enter'?{text:'\r',unmodifiedText:'\r'}:{})});
 await client.send('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:virtual,modifiers});
}
async function type(selector,text){await click(selector);await key('a','KeyA',65,2);await key('Backspace','Backspace',8);if(text)await client.send('Input.insertText',{text});}
async function navigate(file,ready){
 const url=pathToFileURL(file).href;await client.send('Page.navigate',{url});
 await waitFor(()=>value("location.href==="+JSON.stringify(url)+" && ("+ready+")"),'actual target page ready');
}
async function screenshot(name){
 const r=await client.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 const b=Buffer.from(r.data,'base64');fs.writeFileSync(path.join(OUT,name),b,{flag:'wx'});(report.screenshots??={})[name]=bytesPin(b);
}
async function download(selector,name){
 const p=path.join(OUT,'downloads',name);assert.equal(fs.existsSync(p),false,'download must be fresh '+name);
 await click(selector);await waitFor(()=>fs.existsSync(p)&&!fs.existsSync(p+'.crdownload'),'actual download '+name);
 const b=fs.readFileSync(p);(report.downloads??={})[name]=bytesPin(b);return {path:p,bytes:b};
}
function setText(states){return states.length?'{'+states.map(q=>'q'+q).join(', ')+'}':'∅';}
// Independent (input-index,state) reachability; no candidate API imported by this receiver.
function activeAt(machine,word){
 const todo=[[0,machine.start]],seen=new Set();
 while(todo.length){const [i,q]=todo.pop(),key=i+':'+q;if(seen.has(key))continue;seen.add(key);
  for(const next of machine.transitions[q].epsilon)todo.push([i,next]);
  if(i<word.length)for(const next of machine.transitions[q][word[i]==='0'?'zero':'one'])todo.push([i+1,next]);
 }
 return Array.from({length:machine.states},(_,q)=>q).filter(q=>seen.has(word.length+':'+q));
}
function expected(item,word){
 const {machine,literalExpectedDfa:dfa}=item,steps=[],dfaPath=['D0'];let id='D0';
 for(let index=0;index<=word.length;index++){
  const prefix=word.slice(0,index),active=activeAt(machine,prefix),symbol=index?word[index-1]:null;
  const moved=index?[...new Set(activeAt(machine,word.slice(0,index-1)).flatMap(q=>machine.transitions[q][symbol==='0'?'zero':'one']))].sort((a,b)=>a-b):[machine.start];
  const accepting=active.some(q=>machine.accepting.includes(q));steps.push({index,prefix,symbol,moved,active,accepting});
  if(index){id=dfa.states.find(x=>x.id===id)[symbol==='0'?'zero':'one'];dfaPath.push(id);}
 }
 return {format:'recallweave-nfa-analysis/1',machine,word,nfa:{word,steps,accepted:steps.at(-1).accepting},dfa,dfaPath,accepted:steps.at(-1).accepting};
}
async function setMachine(machine,word){
 await value("document.querySelector('#state-count').value="+JSON.stringify(String(machine.states)));
 await click('#replace-blank');
 await value("(()=>{const m="+JSON.stringify(machine)+",start=document.querySelector('#start-state');start.value=String(m.start);start.dispatchEvent(new Event('change',{bubbles:true}));for(let i=0;i<m.states;i++){const a=document.querySelector('#accept-'+i);a.checked=m.accepting.includes(i);a.dispatchEvent(new Event('change',{bubbles:true}));for(const field of ['zero','one','epsilon']){const e=document.querySelector('#'+field+'-'+i);e.value=m.transitions[i][field].join(',');e.dispatchEvent(new Event('input',{bubbles:true}));}}})()");
 await type('#word',word);
}
async function analyzeCase(item,word){
 await setMachine(item.machine,word);
 check(item.id+' edits disable stale results',await value("document.querySelector('#result').hidden && document.querySelector('#download-result').disabled && document.querySelectorAll('#trace-body tr').length===0"));
 await click('#analyze');
 const got=await value("({decision:document.querySelector('#decision').textContent,hidden:document.querySelector('#result').hidden,downloadDisabled:document.querySelector('#download-result').disabled,trace:[...document.querySelectorAll('#trace-body tr')].map(r=>[...r.cells].map(x=>x.textContent)),dfa:[...document.querySelectorAll('#subset-body tr')].map(r=>[...r.cells].map(x=>x.textContent))})");
 const want=expected(item,word),visited=new Set(want.dfaPath);
 const rows=want.nfa.steps.map(s=>[String(s.index),s.prefix||'ε',s.symbol===null?'Start seed':'Read '+s.symbol,setText(s.moved),setText(s.active),want.dfaPath[s.index],s.accepting?'Accepting':'Not accepting']);
 const dfa=want.dfa.states.map(s=>[s.id+(s.id==='D0'?' — start':''),setText(s.members),s.accepting?'Yes':'No',s.zero,s.one,s.witness||'ε',visited.has(s.id)?'In this trace':'Other reachable state']);
 equal(item.id+' exact rendered trace and entire DFA',got,{decision:want.accepted?'Accepted':'Rejected',hidden:false,downloadDisabled:false,trace:rows,dfa});
 report.cases.push({id:item.id,word,expected:want,actual_dom:got});return want;
}
async function chooseFile(file){
 const doc=await client.send('DOM.getDocument');
 const node=await client.send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'#deck-file'});
 assert(node.nodeId>0);await client.send('DOM.setFileInputFiles',{nodeId:node.nodeId,files:[file]});
}
try{
 assert.equal(fs.existsSync(OUT),false,'Fresh output required; never silently replay.');
 const disk=fs.statfsSync(ROOT);report.guard={node:process.version,node_path:process.execPath,node_pin:pin(process.execPath),chrome_path:CHROME,chrome_pin:pin(CHROME),available_memory:os.freemem(),disk_available:disk.bavail*disk.bsize};
 assert.equal(report.guard.node,'v24.14.0');assert.equal(report.guard.node_pin.sha256,'63c259c81e5d472b5f11c8d506070130cb04a1ecf84b80377a34ed6ec9048088');
 assert.equal(report.guard.chrome_pin.sha256,'977d6483df6c457eab24a3241b44645c66067f52b73bc2c8dbd7e6469bf15d1f');
 assert(report.guard.available_memory>=4294967296&&report.guard.disk_available>=8589934592,'Fresh resource floors');
 report.inputs_before=inputs();report.contract=pin(path.join(ROOT,'contract.json'));report.receiver=pin(new URL(import.meta.url));
 fs.mkdirSync(OUT);fs.mkdirSync(path.join(OUT,'downloads'));
 const args=['--headless=new','--remote-debugging-port=0','--user-data-dir='+path.join(OUT,'profile'),'--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-default-apps','--disable-sync','--metrics-recording-only','--no-proxy-server','--window-size=1280,960','about:blank'];
 child=spawn(CHROME,args,{stdio:['ignore','pipe','pipe'],windowsHide:true});report.browser={pid:child.pid,args};
 child.stdout.on('data',b=>stdout.push(b));child.stderr.on('data',b=>stderr.push(b));child.on('exit',(code,signal)=>{browserExit={code,signal};});
 child.on('error',e=>{report.browser_spawn_error=String(e);});
 const portFile=path.join(OUT,'profile','DevToolsActivePort');
 const portText=await waitFor(()=>fs.existsSync(portFile)?fs.readFileSync(portFile,'utf8'):null,'private Chrome port',15000);
 const port=Number(portText.split(/\r?\n/)[0]);assert(Number.isInteger(port)&&port>0);
 const targets=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
 client=await connect(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
 await client.send('Page.enable');await client.send('Runtime.enable');await client.send('Network.enable');await client.send('DOM.enable');
 report.browser.version=await client.send('Browser.getVersion');
 await client.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:path.join(OUT,'downloads'),eventsEnabled:true});
 await client.send('Emulation.setDeviceMetricsOverride',{width:1280,height:960,deviceScaleFactor:1,mobile:false});
 await navigate(path.join(SOURCE,'courses/nondeterministic-automata-explorer.html'),"document.readyState==='complete' && document.querySelectorAll('#machine-body tr').length===3");
 check('initial result requires explicit Analyze',await value("document.querySelector('#result').hidden && document.querySelector('#download-result').disabled"));
 const specs=[['epsilon-cycle-branch','10'],['epsilon-empty-word-accept',''],['one-state-no-words','1'],['one-state-all-words','111000'],['after-symbol-epsilon-union','01'],['full32-subsets','0']];
 let last;
 for(const [id,word] of specs){last=await analyzeCase(contract.cases.find(c=>c.id===id),word);
  if(id==='epsilon-cycle-branch'){await value("document.querySelector('#trace-title').scrollIntoView({block:'start'})");await screenshot('epsilon-trace-desktop.png');}
 }
 check('all32 reachable subsets shown even for one-symbol trace',await value("document.querySelectorAll('#subset-body tr').length===32 && document.querySelectorAll('#trace-body tr').length===2"));
 await value("document.querySelector('#subset-title').scrollIntoView({block:'start'})");await screenshot('full32-subsets-desktop.png');
 const analysis=await download('#download-result','nondeterministic-automata-analysis.json');
 equal('actual analysis download matches independent literal-machine oracle',JSON.parse(analysis.bytes.toString('utf8')),last);
 await type('#word','0 ε');await click('#analyze');
 check('invalid word stays visible and clears result',await value("document.querySelector('#word').value==='0 ε' && document.querySelector('#status').classList.contains('error') && document.querySelector('#result').hidden && document.querySelector('#download-result').disabled && document.querySelectorAll('#trace-body tr').length===0 && document.querySelectorAll('#subset-body tr').length===0"));
 await type('#word','1'.repeat(25));await click('#analyze');
 check('25-symbol browser input refused without truncation',await value("document.querySelector('#word').value.length===25 && document.querySelector('#status').classList.contains('error') && document.querySelector('#download-result').disabled"));
 await type('#word','1'.repeat(24));await key('Tab','Tab',9);
 check('keyboard focus reaches Analyze',await value("document.activeElement.id==='analyze'"));
 await key('Enter','Enter',13);
 check('24-symbol keyboard analysis has25 exact prefix rows',await value("!document.querySelector('#result').hidden && document.querySelectorAll('#trace-body tr').length===25 && !document.querySelector('#download-result').disabled"));
 await type('#zero-0','1,1');await click('#analyze');
 check('duplicate edge kept and refused with no stale download',await value("document.querySelector('#zero-0').value==='1,1' && document.querySelector('#status').classList.contains('error') && document.querySelector('#download-result').disabled && document.querySelector('#result').hidden"));
 await type('#zero-0','1');await click('#analyze');await click('#accept-0');
 check('accepting-state edit invalidates old result',await value("document.querySelector('#result').hidden && document.querySelector('#download-result').disabled"));
 await click('#analyze');
 await value("document.querySelector('#start-state').value='1';document.querySelector('#start-state').dispatchEvent(new Event('change',{bubbles:true}))");
 check('start-state edit invalidates old result',await value("document.querySelector('#result').hidden && document.querySelector('#download-result').disabled"));
 await click('#analyze');
 await value("document.querySelector('#state-count').value='2';document.querySelector('#state-count').dispatchEvent(new Event('change',{bubbles:true}))");
 check('choosing future blank size alone leaves current5-state result intact',await value("document.querySelectorAll('#machine-body tr').length===5 && !document.querySelector('#result').hidden"));
 await click('#replace-blank');
 check('explicit blank replacement changes table and clears results',await value("document.querySelectorAll('#machine-body tr').length===2 && document.querySelector('#word').value==='' && document.querySelector('#result').hidden && document.querySelector('#download-result').disabled"));
 await value("document.querySelector('#preset').selectedIndex=0;document.querySelector('#preset').dispatchEvent(new Event('change',{bubbles:true}))");
 check('example selection alone preserves edited table',await value("document.querySelectorAll('#machine-body tr').length===2"));
 await click('#load-preset');
 check('explicit example load restores3-state table without auto-analysis',await value("document.querySelectorAll('#machine-body tr').length===3 && document.querySelector('#word').value==='1010' && document.querySelector('#result').hidden"));
 const course=await download('#download-course','nondeterministic-automata.json');
 const guide=await download('#download-guide','nondeterministic-automata.md');
 const html=await download('#download-html','nondeterministic-automata-explorer.html');
 for(const [name,file] of [['courses/nondeterministic-automata.json',course],['courses/nondeterministic-automata.md',guide],['courses/nondeterministic-automata-explorer.html',html]])equal('download byte equality '+name,bytesPin(file.bytes),pin(path.join(SOURCE,name)));
 await client.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await value("window.scrollTo(0,0)");
 const phone=await value("({width:innerWidth,scroll:document.documentElement.scrollWidth,regions:[...document.querySelectorAll('.scroll')].map(e=>({width:e.clientWidth,scroll:e.scrollWidth,tabindex:e.tabIndex,overflow:getComputedStyle(e).overflowX}))})");
 check('phone page contains wide tables in keyboard-scroll regions',phone.width===390&&phone.scroll<=391&&phone.regions.every(r=>r.tabindex===0&&r.overflow==='auto'),phone);
 await screenshot('lab-phone-390.png');
 await navigate(html.path,"document.readyState==='complete' && document.querySelectorAll('#machine-body tr').length===3");
 await click('#analyze');
 check('physically downloaded relocated lab runs its default machine',await value("document.querySelector('#word').value==='1010' && document.querySelector('#decision').textContent==='Accepted' && !document.querySelector('#result').hidden"));
 await navigate(path.join(SOURCE,'demo.html'),"document.readyState==='complete' && !!document.querySelector('#deck-file') && !!document.querySelector('#start-button')");
 const deck=JSON.parse(course.bytes.toString('utf8'));assert.equal(deck.items.length,12);
 const beforeImport=await value("({session:document.querySelector('#session-content').innerHTML,step:document.querySelector('#step-count').textContent,title:document.title})");
 await chooseFile(analysis.path);
 await waitFor(()=>value("document.querySelector('#deck-status').classList.contains('deck-error')"),'analysis-not-deck refusal');
 equal('analysis file is not admitted as a learner deck',await value("({session:document.querySelector('#session-content').innerHTML,step:document.querySelector('#step-count').textContent,title:document.title})"),beforeImport);
 check('analysis refusal has no startable preview',await value("document.querySelector('#deck-preview').hidden && !document.querySelector('#start-deck')"));
 await chooseFile(course.path);await waitFor(()=>value("!!document.querySelector('#start-deck')"),'actual course preview');
 const preview=await value("({title:document.querySelector('#deck-preview-title').textContent,count:document.querySelector('.deck-preview-count').textContent,prompts:[...document.querySelectorAll('.deck-questions li strong')].map(e=>e.textContent),license:document.querySelector('.deck-preview-license').textContent,attribution:document.querySelector('.deck-preview-attribution').textContent})");
 equal('all12 actual imported prompts preserved',preview.prompts,deck.items.map(i=>i.prompt));equal('preview exact course title',preview.title,deck.title);
 check('preview count and supplied provenance visible',preview.count.includes('12 questions')&&preview.license.includes(deck.license)&&preview.attribution.includes(deck.attribution));
 equal('preview leaves original session and title unchanged',await value("({session:document.querySelector('#session-content').innerHTML,step:document.querySelector('#step-count').textContent,title:document.title})"),beforeImport);
 await value("document.querySelector('#deck-preview-title').scrollIntoView({block:'start'})");await screenshot('learner-preview-phone.png');save('learner-preview.json',preview);
 await click('#start-deck');await waitFor(()=>value("!!document.querySelector('#session-content .question-card h2')"),'explicit imported lesson start');
 check('explicit start installs imported12-question session',await value("document.querySelector('#step-count').textContent.trim()==='0 / 12' && document.querySelector('#deck-preview').hidden && document.title.includes('Nondeterministic automata')"));
 const seen=new Set(),responses=[],wrongIds=new Set(['nfa-03','nfa-07','nfa-11']);
 for(let n=0;n<12;n++){
  const prompt=await value("document.querySelector('#session-content .question-card h2').textContent");
  const item=deck.items.find(i=>i.prompt===prompt);assert(item&&!seen.has(item.id),'Each exact original question once');seen.add(item.id);
  const choice=wrongIds.has(item.id)?(item.answer+1)%item.options.length:item.answer;
  await click('[data-choice="'+choice+'"]');
  const feedback=await value("({text:document.querySelector('#feedback-slot').textContent,disabled:[...document.querySelectorAll('[data-choice]')].every(e=>e.disabled),correct:[...document.querySelectorAll('[data-choice].correct')].map(e=>Number(e.dataset.choice)),progress:document.querySelector('#step-count').textContent})");
  check('exact feedback '+item.id,feedback.text.includes(item.explanation)&&feedback.text.includes(item.options[choice])&&feedback.text.includes(item.options[item.answer])&&feedback.text.includes(item.transfer)&&feedback.disabled&&feedback.correct.length===1&&feedback.correct[0]===item.answer,feedback);
  responses.push({id:item.id,prompt,choice,correct:choice===item.answer,feedback});
  if(n===0){await value("document.querySelector('#feedback-slot').scrollIntoView({block:'start'})");await screenshot('learner-feedback-phone.png');}
  await click('#next-button');
 }
 equal('all12 original question identities reached',Array.from(seen).sort(),deck.items.map(i=>i.id).sort());
 check('completed review retains9correct3missed first tries',await value("document.querySelector('#first-try-summary').textContent.includes('9 of 12') && document.querySelectorAll('.review-item').length===12 && document.querySelectorAll('.review-status.needs-review').length===3 && document.querySelector('#step-count').textContent.trim()==='12 / 12'"));
 const review=await value("[...document.querySelectorAll('.review-item')].map(e=>({prompt:e.querySelector('.review-prompt').textContent,text:e.querySelector('.review-body').textContent}))");
 for(const item of deck.items){const row=review.find(r=>r.prompt===item.prompt);assert(row&&row.text.includes(item.explanation)&&row.text.includes(item.transfer),'Exact original explanation retained '+item.id);}
 report.learner={course_pin:bytesPin(course.bytes),unchanged_base:manifest.base,actual_standalone:pin(path.join(SOURCE,'demo.html')),responses,review};
 await client.send('Emulation.setDeviceMetricsOverride',{width:1280,height:960,deviceScaleFactor:1,mobile:false});
 await value("document.querySelector('#session-content').scrollIntoView({block:'start'});document.querySelector('.review-item').open=true");await screenshot('learner-completed-review.png');
 const firstTry=await value("document.querySelector('#first-try-summary').textContent");
 await click('#practice-button');const practiced=[];
 for(let n=0;n<3;n++){
  const prompt=await value("document.querySelector('#session-content .practice-card h2').textContent"),item=deck.items.find(i=>i.prompt===prompt);
  assert(item&&wrongIds.has(item.id)&&!practiced.includes(item.id));await click('[data-practice-choice="'+item.answer+'"]');
  check('practice exact correction '+item.id,await value("document.querySelector('#practice-feedback').textContent").then(t=>t.includes(item.explanation)&&t.includes(item.options[item.answer])));
  practiced.push(item.id);await click('#practice-next');
 }
 equal('only3 missed connections practiced',practiced.sort(),Array.from(wrongIds).sort());
 equal('practice preserves original first-try count',await value("document.querySelector('#first-try-summary').textContent"),firstTry);
 check('practice finished3of3 with original12 review rows',await value("document.querySelector('#practice-status').textContent.includes('3 of 3') && document.querySelectorAll('.review-item').length===12 && document.querySelectorAll('.review-practice-answer').length===3"));
 const filenamesBefore=new Set(fs.readdirSync(path.join(OUT,'downloads')));await click('#save-notes-button');
 const noteFile=await waitFor(()=>fs.readdirSync(path.join(OUT,'downloads')).find(n=>n.endsWith('.txt')&&!filenamesBefore.has(n)),'actual study notes download');
 const notePath=path.join(OUT,'downloads',noteFile),notes=fs.readFileSync(notePath,'utf8');
 check('actual notes contain original12 questions/explanations',deck.items.every(i=>notes.includes(i.prompt)&&notes.includes(i.explanation))&&notes.includes(deck.title));
 report.downloads[noteFile]=pin(notePath);report.learner.practice_ids=practiced;report.learner.notes_file=noteFile;
 equal('all original and received product/learner files unchanged',inputs(),report.inputs_before);
 equal('no page exceptions',report.page_exceptions,[]);equal('offline lab and learner request no HTTP pages/assets',report.page_http_requests,[]);
 report.accepted=true;
}catch(error){
 report.accepted=false;report.error={name:error.name,message:error.message,stack:error.stack};
 if(client&&fs.existsSync(OUT)){try{await screenshot('failure.png');}catch(e){report.failure_screenshot_error=String(e);}}
}finally{
 if(client){try{await client.send('Browser.close');}catch(e){report.browser_close_transport=String(e);}}
 if(child){try{await waitFor(()=>browserExit,'own Chrome exit',10000);}catch{report.cleanup_fallback=true;child.kill();try{await waitFor(()=>browserExit,'own Chrome termination',3000);}catch{}}}
 if(client)client.close();report.browser_exit=browserExit;
 if(browserExit?.code!==0||report.cleanup_fallback)report.accepted=false;
 report.finished_utc=new Date().toISOString();report.passed=report.checks.filter(x=>x.passed).length;report.failed=report.checks.filter(x=>!x.passed).length;
 if(fs.existsSync(OUT)){
  fs.writeFileSync(path.join(OUT,'chrome.stdout'),Buffer.concat(stdout),{flag:'wx'});fs.writeFileSync(path.join(OUT,'chrome.stderr'),Buffer.concat(stderr),{flag:'wx'});
  report.chrome_stdout=pin(path.join(OUT,'chrome.stdout'));report.chrome_stderr=pin(path.join(OUT,'chrome.stderr'));save('result.json',report);
 }
 console.log(JSON.stringify({accepted:report.accepted,passed:report.passed,failed:report.failed,error:report.error,result:fs.existsSync(path.join(OUT,'result.json'))?pin(path.join(OUT,'result.json')):null,browser_exit:browserExit,cleanup_fallback:report.cleanup_fallback}));
 process.exitCode=report.accepted?0:2;
}
