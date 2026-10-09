// Independent installed RecallWeave use. The original exporter is not executed as an oracle.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const ROOT=path.dirname(fileURLToPath(import.meta.url));
const CFG=JSON.parse(fs.readFileSync(path.join(ROOT,'AUTHORITY.json'),'utf8'));
const INSTALL='/Users/me/Applications/RecallWeaveEditDistance-c945953fdeb7';
const ENTRY=path.join(INSTALL,'Open RecallWeave.command');
const SOURCE='/Users/me/Developer/recallweave-edit-distance-local-c945953fdeb7/source';
const ORIGINALS='/Users/me/Developer/recallweave-edit-distance-local-c945953fdeb7/ORIGINALS.json';
const PYTHON='/Library/Frameworks/Python.framework/Versions/3.13/bin/python3';
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const EXPECTED_URI='file:///Users/me/Applications/RecallWeaveEditDistance-c945953fdeb7/app/START-HERE.html';
const PROFILE=path.join(ROOT,'browser','profile');
const DOWNLOADS=path.join(ROOT,'browser','downloads');
const OUTPUT=path.join(ROOT,'results');
const REFLECTION='Equal lengths do not make cat and cut identical. With unit costs, changing a to u is one substitution.\nI will check the operation costs before counting edits.';
const APPLICATION='For a spelling-checker explanation, I would show the accepted source and target, the operation costs, and one cheapest alignment. A zero score means the literal scalar sequences match; it does not prove the texts have the same meaning.';
const CONTRACT='499f3a7e240b3eb14a0b2911b4300ba7b77e95c9';
const MIN_DISK=256*1024**2,MIN_MEMORY=2*1024**3,STATIC_CAP=2*1024**2,BROWSER_CAP=96*1024**2;
const started=performance.now();
const receipt={schema:1,receiver:'estate-c945953fdeb7/control_execution',contract:CONTRACT,groups:{},accepted:false,failure:null,
 actual_commands:[],actions:[],browser:{},observations:{exceptions:[],console:[],log:[],requests:[],responses:[],loading_failed:[],downloads:[],input_events:[]},
 scope:['actual installed --no-open command from /tmp','one original learner session and physical text download','private headless Chrome, no Finder/default profile claim','no explorer/old matrix/restore/source editing']};
let chrome=null,chromeExit=null,chromeStarted=null,deadlineTimer=null,profileTimer=null,boundaryError=null;
let connection=null,session=null,group='admission',before=null,watchPids=new Set();
const guards=[];
function require(ok,msg){if(!ok)throw new Error(msg);}
function pin(b){return {bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex'),git_blob:crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex')};}
function samePin(a,e){return ['bytes','sha256','git_blob'].every(k=>a[k]===e[k]);}
function jsonfile(name,value){const p=path.join(OUTPUT,name);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});}
function writefile(name,b){const p=path.join(OUTPUT,name);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,b,{flag:'wx',mode:0o600});return pin(b);}
function fileIdentity(p){const s=fs.lstatSync(p,{bigint:true});require(s.isFile()&&!s.isSymbolicLink(),'regular file required: '+p);const b=fs.readFileSync(p),after=fs.lstatSync(p,{bigint:true});
 require(s.ino===after.ino&&s.size===after.size&&s.mtimeNs===after.mtimeNs&&BigInt(b.length)===s.size,'file changed during read: '+p);
 return {...pin(b),mode:Number(s.mode&0o7777n).toString(8).padStart(4,'0'),mtime_ns:s.mtimeNs.toString()};}
function census(root){const out={};function walk(p,rel){for(const name of fs.readdirSync(p).sort()){const q=path.join(p,name),r=rel?rel+'/'+name:name,s=fs.lstatSync(q);require(!s.isSymbolicLink(),'unexpected source symlink '+q);if(s.isDirectory())walk(q,r);else{require(s.isFile(),'source special file '+q);out[r]=fileIdentity(q);}}}walk(root,'');return out;}
function ownedSize(root,excludeBrowser=false){let total=0;if(!fs.existsSync(root))return total;function walk(p){let list;try{list=fs.readdirSync(p);}catch(e){if(e.code==='ENOENT')return;throw e;}for(const name of list){const q=path.join(p,name);if(excludeBrowser&&q===path.join(ROOT,'browser'))continue;let s;try{s=fs.lstatSync(q);}catch(e){if(e.code==='ENOENT')continue;throw e;}if(s.isSymbolicLink())continue;if(s.isDirectory())walk(q);else if(s.isFile())total+=s.size;}}walk(root);return total;}
function ps(){const r=spawnSync('/bin/ps',['-axo','pid=,ppid=,command='],{encoding:'utf8',timeout:5000,maxBuffer:2*1024**2});require(r.status===0,'process census refused');return r.stdout.split('\n').filter(Boolean).map(line=>{const m=line.trim().match(/^(\d+)\s+(\d+)\s+([\s\S]*)$/);return m?{pid:+m[1],ppid:+m[2],command:m[3]}:null;}).filter(Boolean);}
function trackProcesses(){const current=ps();if(chrome?.pid){watchPids.add(chrome.pid);let changed=true;while(changed){changed=false;for(const p of current)if((watchPids.has(p.ppid)||p.command.includes(PROFILE))&&!watchPids.has(p.pid)){watchPids.add(p.pid);changed=true;}}}return current;}
function resourceSnapshot(label){
 const code="import json,os,re,subprocess\ns=os.statvfs('/Users/me');v=subprocess.run(['/usr/bin/vm_stat'],capture_output=True,text=True,check=True,timeout=5).stdout\np=int(re.search(r'page size of (\\d+) bytes',v).group(1));m=sum(int(re.search(r'^'+re.escape(k)+r':\\s+(\\d+)',v,re.M).group(1)) for k in ('Pages free','Pages inactive','Pages speculative'))*p\nprint(json.dumps({'free_disk':s.f_bavail*s.f_frsize,'conservative_memory':m}))";
 const r=spawnSync(PYTHON,['-I','-B','-c',code],{encoding:'utf8',timeout:7000,maxBuffer:65536});require(r.status===0,'capacity observer failed '+r.stderr);
 const g={label,at:new Date().toISOString(),...JSON.parse(r.stdout),receiver_bytes:ownedSize(ROOT,true),browser_bytes:ownedSize(path.join(ROOT,'browser'))};guards.push(g);
 require(g.free_disk>=MIN_DISK&&g.conservative_memory>=MIN_MEMORY&&g.receiver_bytes<=STATIC_CAP&&g.browser_bytes<=BROWSER_CAP,'native resource guard refused '+label);return g;
}
function inventory(){return {installed:census(INSTALL),source:census(SOURCE),original_capsule:fileIdentity(ORIGINALS),
 runtime:{node:fileIdentity(fs.realpathSync(process.execPath)),python:fileIdentity(fs.realpathSync(PYTHON)),chrome_entry:fileIdentity(fs.realpathSync(CHROME))}};}
function checkBoundary(){if(boundaryError)throw boundaryError;if(chromeStarted!==null)require(performance.now()-chromeStarted<180000,'180-second active browser deadline');}
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
class PipeCDP{
 constructor(child){this.id=0;this.pending=new Map();this.buffer='';
  child.stdio[4].setEncoding('utf8');child.stdio[4].on('data',chunk=>{this.buffer+=chunk;let i;while((i=this.buffer.indexOf('\0'))>=0){const line=this.buffer.slice(0,i);this.buffer=this.buffer.slice(i+1);if(!line)continue;let m;try{m=JSON.parse(line);}catch(e){this.fail(e);continue;}if(m.id){const p=this.pending.get(m.id);if(p){clearTimeout(p.timer);this.pending.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result??{});}}else observe(m);}});
  child.stdio[4].on('error',e=>this.fail(e));child.once('exit',()=>this.fail(new Error('owned Chrome pipe closed')));this.child=child;}
 fail(e){for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(e);}this.pending.clear();}
 send(method,params={},sid=null,timeoutMs=15000){checkBoundary();return new Promise((resolve,reject)=>{const id=++this.id,timer=setTimeout(()=>{this.pending.delete(id);reject(new Error('CDP timeout '+method));},timeoutMs);this.pending.set(id,{resolve,reject,timer});const message={id,method,params};if(sid)message.sessionId=sid;this.child.stdio[3].write(JSON.stringify(message)+'\0');});}
}
function observe(m){
 const o=receipt.observations,p=m.params||{};
 if(m.method==='Runtime.exceptionThrown')o.exceptions.push(p);
 if(m.method==='Runtime.consoleAPICalled')o.console.push(p);
 if(m.method==='Log.entryAdded')o.log.push(p.entry);
 if(m.method==='Network.requestWillBeSent')o.requests.push({requestId:p.requestId,url:p.request.url,method:p.request.method,type:p.type});
 if(m.method==='Network.responseReceived')o.responses.push({requestId:p.requestId,url:p.response.url,status:p.response.status,type:p.type});
 if(m.method==='Network.loadingFailed')o.loading_failed.push(p);
 if(m.method==='Browser.downloadWillBegin'||m.method==='Browser.downloadProgress')o.downloads.push({method:m.method,...p});
}
async function evaluate(expression){const r=await connection.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},session);if(r.exceptionDetails)throw new Error('DOM observer exception: '+JSON.stringify(r.exceptionDetails));return r.result?.value;}
async function waitFor(expression,timeoutMs=10000){const t=performance.now();while(performance.now()-t<timeoutMs){checkBoundary();const v=await evaluate(expression);if(v)return v;await pause(60);}throw new Error('DOM condition timeout: '+expression);}
async function click(selector){
 const q=JSON.stringify(selector);
 const expression="(()=>{const e=document.querySelector("+q+");if(!e||e.disabled)throw Error('missing/disabled '+ "+q+");e.scrollIntoView({block:'center',inline:'nearest'});const r=e.getBoundingClientRect();const x=r.x+r.width/2,y=r.y+r.height/2;const hit=document.elementFromPoint(x,y);return {x,y,width:r.width,height:r.height,visible:r.width>0&&r.height>0&&!!hit&&(hit===e||e.contains(hit)),text:e.textContent};})()";
 const box=await evaluate(expression);require(box.visible,'element not visible '+selector);
 await connection.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:box.x,y:box.y},session);
 await connection.send('Input.dispatchMouseEvent',{type:'mousePressed',x:box.x,y:box.y,button:'left',clickCount:1},session);
 await connection.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:box.x,y:box.y,button:'left',clickCount:1},session);
 receipt.actions.push({action:'trusted_mouse_click',selector,text:box.text,at:new Date().toISOString()});
}
async function type(selector,text){await click(selector);require(await evaluate("document.querySelector("+JSON.stringify(selector)+").value===''"),'initial writing field not empty');
 await connection.send('Input.insertText',{text},session);
 require(await evaluate("document.querySelector("+JSON.stringify(selector)+").value==="+JSON.stringify(text)),'literal inserted writing mismatch');
 receipt.actions.push({action:'browser_Input.insertText',selector,text,at:new Date().toISOString()});}
async function screenshot(name){const r=await connection.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true},session);const b=Buffer.from(r.data,'base64');require(b.length>1000&&b.length<700000,'screenshot byte budget');return writefile(name,b);}
function expectedNotes(deck,review,mastery,savedAt,applicationPrompt){
 const lines=['RecallWeave — study notes',deck.title,'Saved: '+savedAt,'','FIRST SESSION','11 of 12 connections correct on the first try.',
  'This count describes this session; it is not a measure of your ability.','','ESTIMATED MASTERY — MODEL STATE, NOT A GRADE',
  'These estimates come from the demo’s learning model. They are not a validated assessment.','Practice does not change the first-session estimates.'];
 for(const concept of deck.concepts)lines.push(concept+': '+mastery[concept]);
 lines.push('','PRACTICE','Not started. 1 missed connection is available for practice.',
  'Practice follows the explanations and is recorded separately from the first answers.','','REVIEW THE CONNECTIONS');
 for(let i=0;i<review.length;i++){const r=review[i],item=deck.items.find(v=>v.id===r.id),choice=item.id==='edit-01'?0:item.answer;
  lines.push('',String(i+1)+'. '+item.prompt,'Concept: '+item.concept,'Your first answer: '+item.options[choice],
   'First try: '+(choice===item.answer?'correct':'needs review'),'Correct answer: '+item.options[item.answer],
   'Explanation: '+item.explanation,'Apply the idea: '+item.transfer,'Your explanation — reflection, not scored:');
  if(item.id==='edit-01')for(const line of REFLECTION.split('\n'))lines.push('  > '+line);else lines.push('  Not written.');
  if(item.id==='edit-01')lines.push('Practice answer: not recorded.');
 }
 lines.push('','YOUR APPLICATION REFLECTION — NOT SCORED','Prompt: '+applicationPrompt,'  > '+APPLICATION,'','DECK ATTRIBUTION',
  deck.attribution,deck.license,'','Saved from this browser session. The download does not upload the session or restore it after a refresh.');
 return lines.join('\n')+'\n';
}
async function closeOwnedBrowser(){
 if(profileTimer)clearInterval(profileTimer);if(deadlineTimer)clearTimeout(deadlineTimer);if(!chrome)return;
 const during=trackProcesses();receipt.browser.tracked_processes=during.filter(p=>watchPids.has(p.pid));let requested=false;
 if(!chromeExit){try{await connection.send('Browser.close',{},null,2000);requested=true;}catch(e){receipt.browser.close_request_note=String(e);}}
 for(let i=0;i<60&&!chromeExit;i++)await pause(50);
 if(!chromeExit){chrome.kill('SIGTERM');receipt.browser.owned_SIGTERM=true;for(let i=0;i<60&&!chromeExit;i++)await pause(50);}
 if(!chromeExit){chrome.kill('SIGKILL');receipt.browser.owned_SIGKILL=true;for(let i=0;i<60&&!chromeExit;i++)await pause(50);}
 let remaining=[];
 for(let i=0;i<30;i++){remaining=ps().filter(p=>watchPids.has(p.pid)||p.command.includes(PROFILE));if(remaining.length===0)break;await pause(100);}
 receipt.browser.close_requested=requested;receipt.browser.actual_exit=chromeExit;receipt.browser.remaining_owned_processes=remaining;
 require(chromeExit!==null&&remaining.length===0,'owned browser process closure not complete');
 receipt.browser.active_seconds=(performance.now()-chromeStarted)/1000;
}
async function main(){
 require(!fs.existsSync(OUTPUT),'new output required');fs.mkdirSync(OUTPUT,{mode:0o700});
 require(pin(fs.readFileSync(path.join(ROOT,'CONTRACT.md'))).git_blob===CONTRACT,'frozen contract identity');
 require(pin(fs.readFileSync(fileURLToPath(import.meta.url))).git_blob===CFG.receiver_source.git_blob,'frozen receiver source identity');
 const sourceOriginal=fs.readFileSync(ORIGINALS);require(samePin(pin(sourceOriginal),CFG.original_capsule),'original-only capsule identity');
 const capsule=JSON.parse(sourceOriginal);require(capsule.originals_only===true&&capsule.new_launcher_or_installer_source_included===false,'original capsule scope');
 const deck=JSON.parse(capsule.files['courses/edit-distance.json'].content);
 require(deck.items.length===12&&new Set(deck.items.map(i=>i.id)).size===12,'original12 identities');
 resourceSnapshot('before-installed-command');before=inventory();jsonfile('identity-before.json',before);
 require(samePin(before.installed['INSTALLATION.json'],CFG.installed_marker),'offered installed marker');
 const marker=JSON.parse(fs.readFileSync(path.join(INSTALL,'INSTALLATION.json')));
 require(marker.root===INSTALL&&marker.schema==='recall-edit-distance-local-installation/v1','installed marker scope');
 require(JSON.stringify(Object.keys(before.installed).sort())===JSON.stringify([...Object.keys(marker.files),'INSTALLATION.json'].sort()),'complete installed file census');
 for(const [name,p] of Object.entries(marker.files))require(samePin(before.installed[name],p)&&before.installed[name].mode===p.mode,'installed declared pin/mode '+name);
 for(const [name,p] of Object.entries(capsule.files))require(samePin(before.installed['app/'+name],p),'all8 originals exact '+name);
 for(const [name,p] of Object.entries(CFG.source_files))require(samePin(before.source[name],p),'candidate source exact '+name);
 require(samePin(before.runtime.python,marker.python),'selected Python binary identity');
 group='R1';const commandStart=Date.now();
 const launched=spawnSync(ENTRY,['--no-open'],{cwd:'/tmp',encoding:null,timeout:15000,maxBuffer:1024*1024});
 const command={executable:ENTRY,args:['--no-open'],cwd:'/tmp',pid:launched.pid,status:launched.status,signal:launched.signal,
  elapsed_ms:Date.now()-commandStart,stdout_pin:pin(launched.stdout??Buffer.alloc(0)),stderr_pin:pin(launched.stderr??Buffer.alloc(0))};
 receipt.actual_commands.push(command);writefile('entry.stdout.txt',launched.stdout??Buffer.alloc(0));writefile('entry.stderr.txt',launched.stderr??Buffer.alloc(0));
 require(launched.status===0&&!launched.error,'actual shebang --no-open exit');const launch=JSON.parse(launched.stdout.toString('utf8'));
 require(launch.entry_uri===EXPECTED_URI&&launch.entry===path.join(INSTALL,'app','START-HERE.html')&&launch.opened===false
  &&samePin(launch.marker,CFG.installed_marker)&&samePin(launch.original_archive,capsule.original_archive),'actual admitted URI/identity');
 receipt.launch=launch;resourceSnapshot('before-one-browser');
 require(!fs.existsSync(path.join(ROOT,'browser')),'fresh private browser allocation');
 fs.mkdirSync(PROFILE,{recursive:true,mode:0o700});fs.mkdirSync(DOWNLOADS,{recursive:true,mode:0o700});
 const chromeArgs=['--headless=new','--remote-debugging-pipe','--user-data-dir='+PROFILE,'--no-first-run','--no-default-browser-check',
  '--disable-background-networking','--disable-component-update','--disable-sync','--disable-extensions','--disable-default-apps',
  '--metrics-recording-only','--password-store=basic','--use-mock-keychain','--disable-breakpad','--disable-crash-reporter',
  '--disk-cache-size=1048576','--media-cache-size=1048576','about:blank'];
 chromeStarted=performance.now();chrome=spawn(CHROME,chromeArgs,{stdio:['ignore','pipe','pipe','pipe','pipe'],cwd:'/tmp'});
 let chromeStdout='',chromeStderr='';
 chrome.stdout.on('data',b=>{chromeStdout+=b.toString();if(chromeStdout.length>2*1024**2)boundaryError=new Error('Chrome stdout cap');});
 chrome.stderr.on('data',b=>{chromeStderr+=b.toString();if(chromeStderr.length>2*1024**2)boundaryError=new Error('Chrome stderr cap');});
 chrome.on('exit',(code,signal)=>{chromeExit={pid:chrome.pid,code,signal,at:new Date().toISOString()};});
 chrome.on('error',e=>{boundaryError=e;});
 receipt.browser.command={executable:CHROME,args:chromeArgs,pid:chrome.pid,control:'private inherited CDP pipe; no application or debugging listener'};
 watchPids.add(chrome.pid);connection=new PipeCDP(chrome);
 deadlineTimer=setTimeout(()=>{boundaryError=new Error('180-second owned browser deadline');connection.fail(boundaryError);chrome.kill('SIGTERM');},180000);
 profileTimer=setInterval(()=>{try{if(ownedSize(path.join(ROOT,'browser'))>BROWSER_CAP||ownedSize(ROOT,true)>STATIC_CAP){boundaryError=new Error('owned browser/evidence cap');connection.fail(boundaryError);chrome.kill('SIGTERM');}}catch(e){boundaryError=e;connection.fail(e);}},500);
 try{
  const version=await connection.send('Browser.getVersion');receipt.browser.version=version;
  require(version.product===CFG.chrome_product,'offered Chrome version changed: '+version.product);
  await connection.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:DOWNLOADS,eventsEnabled:true});
  const target=await connection.send('Target.createTarget',{url:'about:blank'});
  session=(await connection.send('Target.attachToTarget',{targetId:target.targetId,flatten:true})).sessionId;
  await connection.send('Page.enable',{},session);await connection.send('Runtime.enable',{},session);
  await connection.send('Network.enable',{},session);await connection.send('Log.enable',{},session);
  await connection.send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false},session);
  await connection.send('Page.addScriptToEvaluateOnNewDocument',{source:"window.__estateReceivingEvents=[];for(const type of ['click','input','change'])document.addEventListener(type,e=>{const t=e.target;window.__estateReceivingEvents.push({type,isTrusted:e.isTrusted,id:t.id||null,choice:t.closest?.('[data-choice]')?.dataset.choice??null,value:t.matches?.('textarea')?t.value:null,fileCount:t.type==='file'?t.files.length:null});},true);"},session);
  await connection.send('Page.navigate',{url:launch.entry_uri},session);
  await waitFor("document.readyState==='complete'&&document.querySelector('a[href=\"demo.html\"]')");
  const entryDOM=await evaluate("({url:location.href,title:document.title,text:document.body.innerText,learnerHref:document.querySelector('a[href=\"demo.html\"]').href})");
  require(entryDOM.url===EXPECTED_URI&&entryDOM.learnerHref===new URL('demo.html',EXPECTED_URI).href,'installed original entry/link');
  jsonfile('entry-DOM.json',entryDOM);receipt.entry_screenshot=await screenshot('01-installed-entry.png');
  await click('a[href="demo.html"]');await waitFor("document.readyState==='complete'&&document.querySelector('#deck-file')");
  require(await evaluate("location.href")===new URL('demo.html',EXPECTED_URI).href,'learner entered through actual link');
  const initial=await evaluate("({title:document.title,description:document.querySelector('#lesson-description').textContent,bundledTitle:JSON.parse(document.querySelector('#deck-json').textContent).title})");
  require(initial.description!==deck.title&&initial.bundledTitle==='Energy in cells: from light to ATP','bundled initial learner context');
  const doc=await connection.send('DOM.getDocument',{depth:0},session);
  const node=await connection.send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'#deck-file'},session);
  const physicalCourse=path.join(INSTALL,'app','courses','edit-distance.json');
  await connection.send('DOM.setFileInputFiles',{nodeId:node.nodeId,files:[physicalCourse]},session);
  receipt.actions.push({action:'native_physical_file_input',selector:'#deck-file',path:physicalCourse,pin:before.installed['app/courses/edit-distance.json']});
  await waitFor("document.querySelector('#deck-preview')&&!document.querySelector('#deck-preview').hidden&&document.querySelector('#start-deck')");
  const preview=await evaluate("({title:document.querySelector('#deck-preview h3').textContent,count:document.querySelector('.deck-preview-count').textContent,attribution:document.querySelector('.deck-preview-attribution').textContent,license:document.querySelector('.deck-preview-license').textContent,prompts:Array.from(document.querySelectorAll('#deck-preview ol li strong'),e=>e.textContent)})");
  require(preview.title===deck.title&&preview.count.includes('12 questions')&&preview.attribution.includes(deck.attribution)
   &&preview.license.includes(deck.license)&&JSON.stringify(preview.prompts)===JSON.stringify(deck.items.map(i=>i.prompt)),'original physical course preview');
  await click('#start-deck');await waitFor("document.querySelector('.question-card h2')");
  require(await evaluate("document.querySelector('#lesson-description').textContent")===deck.title,'started original deck');
  receipt.groups.R1={pass:true,entry_command:command,initial,preview,physical_course:physicalCourse};jsonfile('R1-entry-and-import.json',receipt.groups.R1);
  group='R2';resourceSnapshot('before-one-session');trackProcesses();
  const answered=[],byPrompt=new Map(deck.items.map(i=>[i.prompt,i]));
  for(let n=0;n<12;n++){
   const q=await evaluate("({prompt:document.querySelector('.question-card h2')?.textContent,options:Array.from(document.querySelectorAll('.choices [data-choice]'),e=>({choice:Number(e.dataset.choice),text:Array.from(e.childNodes).filter(n=>n.nodeType===3).map(n=>n.textContent).join(''),display:e.querySelector('.choice-key').textContent}))})");
   const item=byPrompt.get(q.prompt);require(item&&!answered.some(a=>a.id===item.id),'actual unique original question');
   require(q.options.length===item.options.length&&q.options.every(o=>o.text===item.options[o.choice])
    &&new Set(q.options.map(o=>o.choice)).size===item.options.length,'original shuffled option identities');
   const choice=item.id==='edit-01'?0:item.answer;
   await click('.choices [data-choice="'+choice+'"]');await waitFor("document.querySelector('#next-button')");
   const feedback=await evaluate("document.querySelector('#feedback-slot').textContent");
   require(feedback.includes(item.options[choice])&&feedback.includes(item.options[item.answer])&&feedback.includes(item.explanation),'actual answer feedback');
   answered.push({order:n+1,id:item.id,prompt:item.prompt,choice,choice_text:item.options[choice],correct:choice===item.answer,displayed_option_order:q.options,feedback});
   await click('#next-button');
   if(n<11)await waitFor("document.querySelector('.question-card h2')");else await waitFor("document.querySelector('.result-card #first-try-summary')");
  }
  require(answered.filter(a=>a.correct).length===11&&new Set(answered.map(a=>a.id)).size===12,'complete fixed answer scenario');
  const review=await evaluate("Array.from(document.querySelectorAll('details.review-item'),d=>({id:d.querySelector('[data-reflection-item]').dataset.reflectionItem,prompt:d.querySelector('.review-prompt').textContent,status:d.querySelector('.review-status').textContent,first:d.querySelectorAll('.review-answers dd')[0].textContent,correct:d.querySelectorAll('.review-answers dd')[1].textContent,bodyParagraphs:Array.from(d.querySelectorAll('.review-body>p'),e=>e.textContent),reflection:d.querySelector('textarea').value}))");
  require(review.length===12&&new Set(review.map(r=>r.id)).size===12,'complete review identities');
  for(const r of review){const item=deck.items.find(i=>i.id===r.id),actual=answered.find(a=>a.id===r.id);
   require(r.prompt===item.prompt&&r.first===item.options[actual.choice]&&r.correct===item.options[item.answer]&&r.bodyParagraphs.includes(item.explanation)
    &&r.reflection===''&&r.status.startsWith(actual.correct?'Correct':'Needs review'),'original review by identity '+r.id);}
  const summary=await evaluate("document.querySelector('#first-try-summary').textContent");require(summary.includes('11 of 12'),'visible first-session summary');
  await click('details.review-item:has([data-reflection-item="edit-01"]) summary');
  await type('[data-reflection-item="edit-01"]',REFLECTION);receipt.reflection_screenshot=await screenshot('02-original-review-and-reflection.png');
  await type('#application-reflection',APPLICATION);
  const writing=await evaluate("({item:document.querySelector('[data-reflection-item=\"edit-01\"]').value,application:document.querySelector('#application-reflection').value,prompt:document.querySelector('#application-prompt').textContent,source:document.querySelector('.source-note').textContent,mastery:Array.from(document.querySelectorAll('.result-card .mastery-row'),r=>({concept:r.firstElementChild.textContent,value:r.querySelector('output').textContent}))})");
  require(writing.item===REFLECTION&&writing.application===APPLICATION&&writing.source.includes(deck.attribution)&&writing.source.includes(deck.license),'literal actual writing/attribution');
  require(writing.prompt==='Choose one connection from this deck and explain how it relates to another idea in your own words.','original imported-deck application prompt');
  const mastery=Object.fromEntries(writing.mastery.map(r=>[r.concept,r.value]));
  require(JSON.stringify(writing.mastery.map(r=>r.concept))===JSON.stringify(deck.concepts)&&Object.values(mastery).every(v=>/^(100|[0-9]{1,2})%$/.test(v)),'visible original mastery percentages');
  receipt.groups.R2={pass:true,answers:answered,review,summary,writing,answer_scenario:'edit-01 original option0 wrong; eleven original correct answers; display order observed, not fixed'};
  jsonfile('R2-session-and-writing.json',receipt.groups.R2);
  group='R3';resourceSnapshot('before-physical-notes');trackProcesses();const exportBefore=await evaluate("Date.now()");
  await click('#save-notes-button');const downloadStart=performance.now();let begin=null,complete=null;
  while(performance.now()-downloadStart<20000){checkBoundary();
   begin=receipt.observations.downloads.find(d=>d.method==='Browser.downloadWillBegin'&&/^recallweave-study-notes-\d{4}-\d{2}-\d{2}\.txt$/.test(d.suggestedFilename));
   if(begin)complete=receipt.observations.downloads.find(d=>d.method==='Browser.downloadProgress'&&d.guid===begin.guid&&d.state==='completed');
   if(complete&&fs.existsSync(path.join(DOWNLOADS,begin.suggestedFilename)))break;await pause(80);}
  require(begin&&complete,'actual browser notes download completed');
  const downloaded=path.join(DOWNLOADS,begin.suggestedFilename),physical=fs.readFileSync(downloaded),identity=fileIdentity(downloaded);
  require(physical.length>0&&physical.length===complete.receivedBytes&&physical.length===complete.totalBytes,'physical full downloaded length');
  require(fs.readdirSync(DOWNLOADS).length===1,'single complete physical artifact, no partial download');
  const text=new TextDecoder('utf-8',{fatal:true}).decode(physical),saved=text.match(/^Saved: (.+)$/m);require(saved,'physical export saved timestamp');
  const exportAfter=await evaluate("Date.now()"),savedMs=Date.parse(saved[1]);
  require(Number.isFinite(savedMs)&&savedMs>=exportBefore&&savedMs<=exportAfter&&begin.suggestedFilename==='recallweave-study-notes-'+saved[1].slice(0,10)+'.txt','actual unfixed save timestamp');
  const expected=Buffer.from(expectedNotes(deck,review,mastery,saved[1],writing.prompt),'utf8');
  require(physical.equals(expected),'complete physical notes equal independently assembled original layout/actual session');
  writefile('physical-study-notes.txt',physical);writefile('independent-expected-notes.txt',expected);
  const status=await evaluate("document.querySelector('#save-notes-status').textContent");require(status.includes('Download requested'),'product notes status');
  receipt.notes_screenshot=await screenshot('03-application-and-completed-download.png');
  receipt.groups.R3={pass:true,download_event:begin,completion_event:complete,physical_path:downloaded,physical:identity,independent_expected:pin(expected),
   exact_complete_bytes:true,saved_timestamp:saved[1],browser_clock_before:exportBefore,browser_clock_after:exportAfter,product_status:status,
   artifact_scope:'Readable physical text, no restore/resume acceptance',literal_reflection:REFLECTION,literal_application:APPLICATION};
  jsonfile('R3-physical-notes.json',receipt.groups.R3);group='R4';
  const afterAnswers=await evaluate("Array.from(document.querySelectorAll('details.review-item'),d=>({id:d.querySelector('[data-reflection-item]').dataset.reflectionItem,first:d.querySelectorAll('.review-answers dd')[0].textContent,status:d.querySelector('.review-status').textContent}))");
  require(JSON.stringify(afterAnswers)===JSON.stringify(review.map(r=>({id:r.id,first:r.first,status:r.status}))),'writing/export preserved first answers');
  receipt.observations.input_events=await evaluate("window.__estateReceivingEvents");
  require(receipt.observations.input_events.filter(e=>e.type==='click'&&e.choice!==null&&e.isTrusted).length===12,'twelve trusted original choice clicks');
  require(receipt.observations.input_events.some(e=>e.type==='click'&&e.id==='save-notes-button'&&e.isTrusted),'trusted visible notes click');
  require(receipt.observations.input_events.some(e=>e.type==='change'&&e.id==='deck-file'&&e.fileCount===1),'physical file input event observed');
  receipt.actuation={mouse_clicks:'CDP Input.dispatchMouseEvent, isTrusted observed',writing:'CDP Input.insertText through focused rendered textareas',
   file_input:'DOM.setFileInputFiles selects physical installed course; no constructed File/Blob',synthetic_product_state_changes:0};
 }finally{await closeOwnedBrowser();writefile('chrome.stdout.txt',Buffer.from(chromeStdout));writefile('chrome.stderr.txt',Buffer.from(chromeStderr));}
 const after=inventory();jsonfile('identity-after.json',after);require(JSON.stringify(after)===JSON.stringify(before),'complete installed/source/original/runtime bytes modes mtimes unchanged');
 resourceSnapshot('after-browser-closure');const finalps=ps(),entryPid=receipt.actual_commands[0]?.pid;
 require(!entryPid||!finalps.some(p=>p.pid===entryPid),'actual entry child remains');
 receipt.groups.R4={pass:true,installed_files:Object.keys(after.installed).length,source_files:Object.keys(after.source).length,
  complete_byte_mode_mtime_preservation:true,first_answers_preserved:true,browser_actual_exit:chromeExit,remaining_owned_processes:receipt.browser.remaining_owned_processes,
  entry_child_absent:true,application_listener_started:false,console_exceptions:receipt.observations.exceptions.length,
  console_messages:receipt.observations.console.length,log_entries:receipt.observations.log.length,resource_failures:receipt.observations.loading_failed.length,
  non_file_blob_requests:receipt.observations.requests.filter(r=>!r.url.startsWith('file:')&&!r.url.startsWith('blob:')&&!r.url.startsWith('data:')),
  disclosure:'Private headless --no-open installed route; classify all actual errors separately, with no default-browser or persistence claim.'};
 jsonfile('R4-preservation-and-closure.json',receipt.groups.R4);receipt.accepted=true;
}
try{await main();}catch(e){
 receipt.failure={group,name:e.name,message:e.message,stack:e.stack};console.error(e.stack);
 try{await closeOwnedBrowser();}catch(closeError){receipt.closure_failure={message:closeError.message,stack:closeError.stack};}
 if(before){try{const after=inventory();jsonfile('failure-identity-after.json',after);receipt.failed_attempt_preservation=JSON.stringify(before)===JSON.stringify(after);}catch(p){receipt.preservation_error=String(p);}}
}finally{
 if(profileTimer)clearInterval(profileTimer);if(deadlineTimer)clearTimeout(deadlineTimer);
 receipt.guards=guards;receipt.total_seconds=(performance.now()-started)/1000;receipt.completed_utc=new Date().toISOString();
 receipt.controller_pid=process.pid;receipt.controller_exit_pending_until_remote_tool_completion=true;
 receipt.owned_final={source_evidence_bytes:ownedSize(ROOT,true),browser_bytes:ownedSize(path.join(ROOT,'browser'))};
 if(receipt.owned_final.source_evidence_bytes>STATIC_CAP||receipt.owned_final.browser_bytes>BROWSER_CAP)receipt.accepted=false;
 fs.mkdirSync(OUTPUT,{recursive:true});jsonfile('receipt.json',receipt);
 console.log(JSON.stringify({accepted:receipt.accepted,groups:Object.fromEntries(Object.entries(receipt.groups).map(([k,v])=>[k,v.pass])),
  failure:receipt.failure,receipt:pin(fs.readFileSync(path.join(OUTPUT,'receipt.json'))),controller_pid:process.pid,browser_exit:chromeExit,
  scope:'one installed original learner session, actual physical notes, no original matrix rerun'}));
 process.exitCode=receipt.accepted?0:1;
}
