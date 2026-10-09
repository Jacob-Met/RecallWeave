// Independent SQL lesson adoption through the retained RecallWeave installation.
// The original exporter, model and SQL are never called as an expected-output oracle.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const ROOT=path.dirname(fileURLToPath(import.meta.url));
const CFG=JSON.parse(fs.readFileSync(path.join(ROOT,'AUTHORITY.json'),'utf8'));
const INSTALL='/Users/me/Applications/RecallWeaveEditDistance-c945953fdeb7';
const ENTRY=path.join(INSTALL,'Open RecallWeave.command');
const DELIVERY='/Users/me/Developer/recallweave-sql-null-membership-c945953fdeb7';
const NOTES=JSON.parse(fs.readFileSync(path.join(ROOT,'EXPECTED-NOTES-FRAGMENTS.json'),'utf8'));
const PYTHON='/Library/Frameworks/Python.framework/Versions/3.13/bin/python3';
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const EXPECTED_URI='file:///Users/me/Applications/RecallWeaveEditDistance-c945953fdeb7/app/START-HERE.html';
const PROFILE=path.join(ROOT,'browser','profile');
const DOWNLOADS=path.join(ROOT,'browser','downloads');
const OUTPUT=path.join(ROOT,'results');
const REFLECTION=NOTES.item_reflection;
const APPLICATION=NOTES.application_reflection;
const CONTRACT='c02b23263fe2c1ec7496698dcd35d89d7f9890aa';
const MIN_DISK=256*1024**2,MIN_MEMORY=2*1024**3,STATIC_CAP=2*1024**2,BROWSER_CAP=96*1024**2;
const started=performance.now();
const receipt={schema:1,receiver:'estate-c945953fdeb7/control_execution',contract:CONTRACT,groups:{},accepted:false,failure:null,
 actual_commands:[],actions:[],browser:{},observations:{exceptions:[],console:[],log:[],requests:[],responses:[],loading_failed:[],downloads:[],input_events:[]},
 scope:['actual retained --no-open command from /tmp','one separately delivered SQL learner session and physical text download','private headless Chrome, no Finder/default profile claim','no SQL, exporter/model oracle, old matrix, restore or source edit']};
let chrome=null,chromeExit=null,chromeStarted=null,deadlineTimer=null,profileTimer=null,boundaryError=null;
let connection=null,session=null,group='admission',before=null,watchPids=new Set();
const guards=[];const profileCensusMisses=[];
function require(ok,msg){if(!ok)throw new Error(msg);}
function pin(b){return {bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex'),git_blob:crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex')};}
function samePin(a,e){return ['bytes','sha256','git_blob'].every(k=>a[k]===e[k]);}
function writefile(name,b){
 require(Buffer.isBuffer(b)&&b.length<=1024**2,'per-evidence-file limit');
 const p=path.join(OUTPUT,name);require(p.startsWith(OUTPUT+path.sep),'owned evidence path');
 require(ownedSize(ROOT,true)+Math.ceil(b.length/4096)*4096<=STATIC_CAP,'static evidence capacity before write');
 fs.mkdirSync(path.dirname(p),{recursive:true});
 const fd=fs.openSync(p,'wx',0o600);try{fs.writeFileSync(fd,b);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}return pin(b);
}
function jsonfile(name,value){return writefile(name,Buffer.from(JSON.stringify(value,null,2)+'\n'));}
function fileIdentity(p){const s=fs.lstatSync(p,{bigint:true});require(s.isFile()&&!s.isSymbolicLink(),'regular file required: '+p);const b=fs.readFileSync(p),after=fs.lstatSync(p,{bigint:true});
 require(s.ino===after.ino&&s.size===after.size&&s.mtimeNs===after.mtimeNs&&BigInt(b.length)===s.size,'file changed during read: '+p);
 return {...pin(b),mode:Number(s.mode&0o7777n).toString(8).padStart(4,'0'),mtime_ns:s.mtimeNs.toString(),inode:s.ino.toString()};}
function census(root){const out={};function walk(p,rel){for(const name of fs.readdirSync(p).sort()){const q=path.join(p,name),r=rel?rel+'/'+name:name,s=fs.lstatSync(q);require(!s.isSymbolicLink(),'unexpected source symlink '+q);if(s.isDirectory())walk(q,r);else{require(s.isFile(),'source special file '+q);out[r]=fileIdentity(q);}}}walk(root,'');return out;}
function ownedAllocation(root,excludeBrowser=false){
 let logical=0,allocated=0;if(!fs.existsSync(root))return {logical,allocated};
 const volatile=root===path.join(ROOT,'browser');
 function missing(q,e){if(e.code!=='ENOENT'||!volatile)throw e;
  require(profileCensusMisses.length<128,'bounded volatile profile census observations');profileCensusMisses.push({path:path.relative(ROOT,q),at:new Date().toISOString()});}
 function walk(p){let list;try{list=fs.readdirSync(p);}catch(e){missing(p,e);return;}
  for(const name of list){const q=path.join(p,name);if(excludeBrowser&&q===path.join(root,'browser'))continue;
   let st;try{st=fs.lstatSync(q);}catch(e){missing(q,e);continue;}
   if(st.isSymbolicLink())continue;if(st.isDirectory())walk(q);else if(st.isFile()){logical+=st.size;allocated+=(st.blocks||0)*512;}}}
 walk(root);return {logical,allocated};
}
function ownedSize(root,excludeBrowser=false){const a=ownedAllocation(root,excludeBrowser);return Math.max(a.logical,a.allocated);}
function ps(){const r=spawnSync('/bin/ps',['-axo','pid=,ppid=,command='],{encoding:'utf8',timeout:5000,maxBuffer:2*1024**2});require(r.status===0,'process census refused');return r.stdout.split('\n').filter(Boolean).map(line=>{const m=line.trim().match(/^(\d+)\s+(\d+)\s+([\s\S]*)$/);return m?{pid:+m[1],ppid:+m[2],command:m[3]}:null;}).filter(Boolean);}
function trackProcesses(){const current=ps();if(chrome?.pid){watchPids.add(chrome.pid);let changed=true;while(changed){changed=false;for(const p of current)if((watchPids.has(p.ppid)||p.command.includes(PROFILE))&&!watchPids.has(p.pid)){watchPids.add(p.pid);changed=true;}}}return current;}
function resourceSnapshot(label){
 const code="import json,os,re,subprocess\ns=os.statvfs('/Users/me');v=subprocess.run(['/usr/bin/vm_stat'],capture_output=True,text=True,check=True,timeout=5).stdout\np=int(re.search(r'page size of (\\d+) bytes',v).group(1));m=sum(int(re.search(r'^'+re.escape(k)+r':\\s+(\\d+)',v,re.M).group(1)) for k in ('Pages free','Pages inactive','Pages speculative'))*p\nprint(json.dumps({'free_disk':s.f_bavail*s.f_frsize,'conservative_memory':m}))";
 const r=spawnSync(PYTHON,['-I','-B','-c',code],{encoding:'utf8',timeout:7000,maxBuffer:65536});require(r.status===0,'capacity observer failed '+r.stderr);
 const g={label,at:new Date().toISOString(),...JSON.parse(r.stdout),receiver_bytes:ownedSize(ROOT,true),browser_bytes:ownedSize(path.join(ROOT,'browser')),charged_metric:'max(logical, allocated)',receiver_allocation:ownedAllocation(ROOT,true),browser_allocation:ownedAllocation(path.join(ROOT,'browser'))};guards.push(g);
 require(g.free_disk>=MIN_DISK&&g.conservative_memory>=MIN_MEMORY&&g.receiver_bytes<=STATIC_CAP&&g.browser_bytes<=BROWSER_CAP,'native resource guard refused '+label);return g;
}
function inventory(){return {installed:census(INSTALL),delivered:census(DELIVERY),
 receiver_inputs:Object.fromEntries(['receiver.mjs','AUTHORITY.json','CONTRACT.json','EXPECTED-NOTES-FRAGMENTS.json'].map(n=>[n,fileIdentity(path.join(ROOT,n))])),
 runtime:{node:fileIdentity(fs.realpathSync(process.execPath)),python:fileIdentity(fs.realpathSync(PYTHON)),
 python_framework:fileIdentity('/Library/Frameworks/Python.framework/Versions/3.13/Python'),chrome_entry:fileIdentity(fs.realpathSync(CHROME))}};}
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
 require(applicationPrompt===NOTES.application_prompt,'frozen imported application prompt');
 require(review.length===12&&new Set(review.map(r=>r.id)).size===12,'complete independently bound review order');
 require(JSON.stringify(deck.concepts)===JSON.stringify(NOTES.mastery_concepts),'independent concept order');
 let text=NOTES.header_before_saved+savedAt+NOTES.header_after_saved;
 for(const concept of NOTES.mastery_concepts){
  require(typeof mastery[concept]==='string'&&/^(100|[0-9]{1,2})%$/.test(mastery[concept]),'observed original mastery string');
  text+=concept+': '+mastery[concept]+'\n';
 }
 text+=NOTES.after_mastery;
 review.forEach((r,index)=>{require(Object.hasOwn(NOTES.record_blocks,r.id),'fixed independent review block');text+='\n'+(index+1)+'. '+NOTES.record_blocks[r.id];});
 return text+NOTES.tail;
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
 require(pin(fs.readFileSync(path.join(ROOT,'CONTRACT.json'))).git_blob===CONTRACT,'frozen contract identity');
 require(pin(fs.readFileSync(fileURLToPath(import.meta.url))).git_blob===CFG.receiver_source.git_blob,'frozen receiver source identity');
 require(samePin(pin(fs.readFileSync(path.join(ROOT,'EXPECTED-NOTES-FRAGMENTS.json'))),CFG.notes_fragments),'frozen independent full notes fragments');
 const deck=JSON.parse(fs.readFileSync(path.join(DELIVERY,'courses','sql-null-membership.json'),'utf8'));
 require(deck.items.length===12&&new Set(deck.items.map(i=>i.id)).size===12,'exact SQL twelve identities');
 require(JSON.stringify(deck.items.map(i=>i.id))===JSON.stringify(NOTES.scenario.map(i=>i.id)),'independent scenario identities/order');
 require(NOTES.scenario.every(row=>CFG.chosen_options[row.id]===row.chosen&&deck.items.find(i=>i.id===row.id).answer===row.correct),'frozen chosen/correct original identities');
 resourceSnapshot('before-installed-command');before=inventory();jsonfile('identity-before.json',before);
 for(const [kind,expected] of [['installed',CFG.installed_files],['delivered',CFG.delivery_files]]){
  require(JSON.stringify(Object.keys(before[kind]).sort())===JSON.stringify(Object.keys(expected).sort()),'complete '+kind+' file census');
  for(const [name,p] of Object.entries(expected))require(['bytes','sha256','git_blob','mode','mtime_ns','inode'].every(k=>p[k]===undefined||before[kind][name][k]===p[k]),'exact offered '+kind+' identity '+name);
 }
 require(samePin(before.installed['INSTALLATION.json'],CFG.installed_marker),'retained installed marker');
 const marker=JSON.parse(fs.readFileSync(path.join(INSTALL,'INSTALLATION.json'),'utf8'));
 require(marker.root===INSTALL&&marker.schema==='recall-edit-distance-local-installation/v1','installed marker scope');
 const delivery=JSON.parse(fs.readFileSync(path.join(DELIVERY,'DELIVERY.json'),'utf8'));
 require(delivery.schema==='recallweave-sql-lesson-delivery/v1'&&delivery.root===DELIVERY&&delivery.parser_result.accepted===true&&delivery.parser_result.parseDeck_calls===1,'accepted physical course delivery');
 for(const [name,p] of Object.entries(CFG.runtime))require(['bytes','sha256','git_blob','mode','mtime_ns'].every(k=>p[k]===undefined||before.runtime[name][k]===p[k]),'pinned runtime identity '+name);
 require(process.version==='v26.3.0','existing Node version');
 group='L1';const commandStart=Date.now();
 const launched=spawnSync(ENTRY,['--no-open'],{cwd:'/tmp',encoding:null,timeout:15000,maxBuffer:1024*1024});
 const command={executable:ENTRY,args:['--no-open'],cwd:'/tmp',pid:launched.pid,status:launched.status,signal:launched.signal,
  elapsed_ms:Date.now()-commandStart,stdout_pin:pin(launched.stdout??Buffer.alloc(0)),stderr_pin:pin(launched.stderr??Buffer.alloc(0))};
 receipt.actual_commands.push(command);writefile('entry.stdout.txt',launched.stdout??Buffer.alloc(0));writefile('entry.stderr.txt',launched.stderr??Buffer.alloc(0));
 require(launched.status===0&&!launched.error,'actual shebang --no-open exit');const launch=JSON.parse(launched.stdout.toString('utf8'));
 require(launch.entry_uri===EXPECTED_URI&&launch.entry===path.join(INSTALL,'app','START-HERE.html')&&launch.opened===false
  &&samePin(launch.marker,CFG.installed_marker)&&samePin(launch.original_archive,CFG.original_archive),'actual admitted URI/identity');
 receipt.launch=launch;resourceSnapshot('before-one-browser');
 require(!fs.existsSync(path.join(ROOT,'browser')),'fresh private browser allocation');
 fs.mkdirSync(PROFILE,{recursive:true,mode:0o700});fs.mkdirSync(DOWNLOADS,{recursive:true,mode:0o700});
 const chromeArgs=['--headless=new','--remote-debugging-pipe','--user-data-dir='+PROFILE,'--no-first-run','--no-default-browser-check',
  '--disable-background-networking','--disable-component-update','--disable-sync','--disable-extensions','--disable-default-apps',
  '--metrics-recording-only','--password-store=basic','--use-mock-keychain','--disable-breakpad','--disable-crash-reporter',
  '--disk-cache-size=1048576','--media-cache-size=1048576','about:blank'];
 chromeStarted=performance.now();chrome=spawn(CHROME,chromeArgs,{stdio:['ignore','pipe','pipe','pipe','pipe'],cwd:'/tmp'});
 let chromeStdout=[],chromeStderr=[],chromeStdoutBytes=0,chromeStderrBytes=0;
 chrome.stdout.on('data',b=>{chromeStdout.push(b);chromeStdoutBytes+=b.length;if(chromeStdoutBytes>1024**2)boundaryError=new Error('Chrome stdout cap');});
 chrome.stderr.on('data',b=>{chromeStderr.push(b);chromeStderrBytes+=b.length;if(chromeStderrBytes>1024**2)boundaryError=new Error('Chrome stderr cap');});
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
  await connection.send('Page.addScriptToEvaluateOnNewDocument',{source:"window.__estateReceivingEvents=[];window.__estateReceivingEventsOverflow=false;for(const type of ['click','input','change'])document.addEventListener(type,e=>{const t=e.target;if(window.__estateReceivingEvents.length>=256){window.__estateReceivingEventsOverflow=true;return;}window.__estateReceivingEvents.push({type,isTrusted:e.isTrusted,id:t.id||null,choice:t.closest?.('[data-choice]')?.dataset.choice??null,reflectionItem:t.dataset?.reflectionItem??null,value:t.matches?.('textarea')?t.value:null,fileCount:t.type==='file'?t.files.length:null});},{capture:true,passive:true});"},session);
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
  const physicalCourse=path.join(DELIVERY,'courses','sql-null-membership.json');
  await connection.send('DOM.setFileInputFiles',{nodeId:node.nodeId,files:[physicalCourse]},session);
  receipt.actions.push({action:'native_physical_file_input',selector:'#deck-file',path:physicalCourse,pin:before.delivered['courses/sql-null-membership.json']});
  await waitFor("document.querySelector('#deck-preview')&&!document.querySelector('#deck-preview').hidden&&document.querySelector('#start-deck')");
  const preview=await evaluate("({title:document.querySelector('#deck-preview h3').textContent,count:document.querySelector('.deck-preview-count').textContent,attribution:document.querySelector('.deck-preview-attribution').textContent,license:document.querySelector('.deck-preview-license').textContent,prompts:Array.from(document.querySelectorAll('#deck-preview ol li strong'),e=>e.textContent)})");
  require(preview.title===deck.title&&preview.count.includes('12 questions')&&preview.attribution.includes(deck.attribution)
   &&preview.license.includes(deck.license)&&JSON.stringify(preview.prompts)===JSON.stringify(deck.items.map(i=>i.prompt)),'original physical course preview');
  await click('#start-deck');await waitFor("document.querySelector('.question-card h2')");
  require(await evaluate("document.querySelector('#lesson-description').textContent")===deck.title,'started original deck');
  receipt.groups.L1={pass:true,entry_command:command,initial,preview,physical_course:physicalCourse};jsonfile('L1-entry-and-import.json',receipt.groups.L1);
  group='L2';resourceSnapshot('before-one-session');trackProcesses();
  const answered=[],byPrompt=new Map(deck.items.map(i=>[i.prompt,i]));
  for(let n=0;n<12;n++){
   const q=await evaluate("({prompt:document.querySelector('.question-card h2')?.textContent,options:Array.from(document.querySelectorAll('.choices [data-choice]'),e=>({choice:Number(e.dataset.choice),text:Array.from(e.childNodes).filter(n=>n.nodeType===3).map(n=>n.textContent).join(''),display:e.querySelector('.choice-key').textContent}))})");
   const item=byPrompt.get(q.prompt);require(item&&!answered.some(a=>a.id===item.id),'actual unique original question');
   require(q.options.length===item.options.length&&q.options.every(o=>o.text===item.options[o.choice])
    &&new Set(q.options.map(o=>o.choice)).size===item.options.length,'original shuffled option identities');
   const choice=CFG.chosen_options[item.id];require(Number.isInteger(choice)&&choice>=0&&choice<item.options.length,'frozen chosen original option');
   await click('.choices [data-choice="'+choice+'"]');await waitFor("document.querySelector('#next-button')");
   const feedback=await evaluate("document.querySelector('#feedback-slot').textContent");
   require(feedback.includes(item.options[choice])&&feedback.includes(item.options[item.answer])&&feedback.includes(item.explanation),'actual answer feedback');
   answered.push({order:n+1,id:item.id,prompt:item.prompt,choice,choice_text:item.options[choice],correct:choice===item.answer,displayed_option_order:q.options,feedback});
   await click('#next-button');
   if(n<11)await waitFor("document.querySelector('.question-card h2')");else await waitFor("document.querySelector('.result-card #first-try-summary')");
  }
  require(answered.filter(a=>a.correct).length===11&&new Set(answered.map(a=>a.id)).size===12,'complete fixed answer scenario');
  const review=await evaluate("Array.from(document.querySelectorAll('details.review-item'),d=>({id:d.querySelector('[data-reflection-item]').dataset.reflectionItem,prompt:d.querySelector('.review-prompt').textContent,status:d.querySelector('.review-status').textContent,first:d.querySelectorAll('.review-answers dd')[0].textContent,correct:d.querySelectorAll('.review-answers dd')[1].textContent,bodyParagraphs:Array.from(d.querySelectorAll('.review-body>p'),e=>e.textContent),reflection:d.querySelector('textarea').value}))");
  require(review.length===12&&new Set(review.map(r=>r.id)).size===12&&JSON.stringify(review.map(r=>r.id))===JSON.stringify(answered.map(a=>a.id)),'complete review identities and actual answer order');
  for(const r of review){const item=deck.items.find(i=>i.id===r.id),actual=answered.find(a=>a.id===r.id);
   require(r.prompt===item.prompt&&r.first===item.options[actual.choice]&&r.correct===item.options[item.answer]&&r.bodyParagraphs.includes(item.explanation)
    &&r.bodyParagraphs.includes('Apply the idea: '+item.transfer)&&r.reflection===''&&r.status.startsWith(actual.correct?'Correct':'Needs review'),'original review by identity '+r.id);}
  const summary=await evaluate("document.querySelector('#first-try-summary').textContent");require(summary.includes('11 of 12'),'visible first-session summary');
  await click('details.review-item:has([data-reflection-item="null-member-11"]) summary');
  await type('[data-reflection-item="null-member-11"]',REFLECTION);receipt.reflection_screenshot=await screenshot('02-original-review-and-reflection.png');
  await type('#application-reflection',APPLICATION);
  const writing=await evaluate("({item:document.querySelector('[data-reflection-item=\"null-member-11\"]').value,application:document.querySelector('#application-reflection').value,prompt:document.querySelector('#application-prompt').textContent,source:document.querySelector('.source-note').textContent,mastery:Array.from(document.querySelectorAll('.result-card .mastery-row'),r=>({concept:r.firstElementChild.textContent,value:r.querySelector('output').textContent}))})");
  require(writing.item===REFLECTION&&writing.application===APPLICATION&&writing.source.includes(deck.attribution)&&writing.source.includes(deck.license),'literal actual writing/attribution');
  require(writing.prompt==='Choose one connection from this deck and explain how it relates to another idea in your own words.','original imported-deck application prompt');
  const mastery=Object.fromEntries(writing.mastery.map(r=>[r.concept,r.value]));
  require(JSON.stringify(writing.mastery.map(r=>r.concept))===JSON.stringify(deck.concepts)&&Object.values(mastery).every(v=>/^(100|[0-9]{1,2})%$/.test(v)),'visible original mastery percentages');
  receipt.groups.L2={pass:true,answers:answered,review,summary,writing,answer_scenario:'null-member-11 original option0 wrong; eleven original correct answers; display order observed, not fixed'};
  jsonfile('L2-session-and-writing.json',receipt.groups.L2);
  group='L3';resourceSnapshot('before-physical-notes');trackProcesses();const nativeExportBefore=Date.now(),exportBefore=await evaluate("Date.now()");
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
  const exportAfter=await evaluate("Date.now()"),nativeExportAfter=Date.now(),savedMs=Date.parse(saved[1]);
  require(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(saved[1])&&Number.isFinite(savedMs)&&savedMs>=exportBefore&&savedMs<=exportAfter&&savedMs>=nativeExportBefore&&savedMs<=nativeExportAfter&&begin.suggestedFilename==='recallweave-study-notes-'+saved[1].slice(0,10)+'.txt','actual unfixed save timestamp');
  const expected=Buffer.from(expectedNotes(deck,review,mastery,saved[1],writing.prompt),'utf8');
  require(physical.equals(expected),'complete physical notes equal independently assembled original layout/actual session');
  writefile('physical-study-notes.txt',physical);writefile('independent-expected-notes.txt',expected);
  const status=await evaluate("document.querySelector('#save-notes-status').textContent");require(status.includes('Download requested'),'product notes status');
  receipt.notes_screenshot=await screenshot('03-application-and-completed-download.png');
  receipt.groups.L3={pass:true,download_event:begin,completion_event:complete,physical_path:downloaded,physical:identity,independent_expected:pin(expected),
   exact_complete_bytes:true,saved_timestamp:saved[1],browser_clock_before:exportBefore,browser_clock_after:exportAfter,native_clock_before:nativeExportBefore,native_clock_after:nativeExportAfter,product_status:status,
   artifact_scope:'Readable physical text, no restore/resume acceptance',literal_reflection:REFLECTION,literal_application:APPLICATION};
  jsonfile('L3-physical-notes.json',receipt.groups.L3);group='L4';
  const afterAnswers=await evaluate("Array.from(document.querySelectorAll('details.review-item'),d=>({id:d.querySelector('[data-reflection-item]').dataset.reflectionItem,first:d.querySelectorAll('.review-answers dd')[0].textContent,status:d.querySelector('.review-status').textContent}))");
  require(JSON.stringify(afterAnswers)===JSON.stringify(review.map(r=>({id:r.id,first:r.first,status:r.status}))),'writing/export preserved first answers');
  receipt.observations.input_events=await evaluate("window.__estateReceivingEvents");
  require(await evaluate("window.__estateReceivingEventsOverflow===false"),'bounded passive input event receipt');
  require(receipt.observations.input_events.filter(e=>e.type==='click'&&e.choice!==null&&e.isTrusted).length===12,'twelve trusted original choice clicks');
  require(receipt.observations.input_events.some(e=>e.type==='click'&&e.id==='save-notes-button'&&e.isTrusted),'trusted visible notes click');
  require(receipt.observations.input_events.some(e=>e.type==='change'&&e.id==='deck-file'&&e.fileCount===1),'physical file input event observed');
  require(receipt.observations.input_events.some(e=>e.type==='input'&&e.reflectionItem==='null-member-11'&&e.isTrusted&&e.value===REFLECTION),'trusted literal item writing event');
  require(receipt.observations.input_events.some(e=>e.type==='input'&&e.id==='application-reflection'&&e.isTrusted&&e.value===APPLICATION),'trusted literal application writing event');
  require(receipt.observations.downloads.filter(e=>e.method==='Browser.downloadWillBegin').length===1,'one actual notes download only');
  receipt.actuation={mouse_clicks:'CDP Input.dispatchMouseEvent, isTrusted observed',writing:'CDP Input.insertText through focused rendered textareas',
   file_input:'DOM.setFileInputFiles selects the separately delivered physical SQL course; no constructed File/Blob',synthetic_product_state_changes:0};
 }finally{await closeOwnedBrowser();writefile('chrome.stdout.txt',Buffer.concat(chromeStdout));writefile('chrome.stderr.txt',Buffer.concat(chromeStderr));}
 const after=inventory();jsonfile('identity-after.json',after);require(JSON.stringify(after)===JSON.stringify(before),'complete installed/delivered/receiver/runtime bytes modes mtimes unchanged');
 resourceSnapshot('after-browser-closure');const finalps=ps(),entryPid=receipt.actual_commands[0]?.pid;
 require(!entryPid||!finalps.some(p=>p.pid===entryPid),'actual entry child remains');
 receipt.groups.L4={pass:true,installed_files:Object.keys(after.installed).length,delivered_files:Object.keys(after.delivered).length,
  complete_byte_mode_mtime_preservation:true,first_answers_preserved:true,browser_actual_exit:chromeExit,remaining_owned_processes:receipt.browser.remaining_owned_processes,
  entry_child_absent:true,application_listener_started:false,console_exceptions:receipt.observations.exceptions.length,
  console_messages:receipt.observations.console.length,log_entries:receipt.observations.log.length,resource_failures:receipt.observations.loading_failed.length,
  non_file_blob_requests:receipt.observations.requests.filter(r=>!r.url.startsWith('file:')&&!r.url.startsWith('blob:')&&!r.url.startsWith('data:')),
  disclosure:'Private headless --no-open installed route; classify all actual errors separately, with no default-browser or persistence claim.'};
 jsonfile('L4-preservation-and-closure.json',receipt.groups.L4);receipt.accepted=true;
}
try{await main();}catch(e){
 receipt.failure={group,name:e.name,message:e.message,stack:e.stack};console.error(e.stack);
 try{await closeOwnedBrowser();}catch(closeError){receipt.closure_failure={message:closeError.message,stack:closeError.stack};}
 if(before){try{const after=inventory();jsonfile('failure-identity-after.json',after);receipt.failed_attempt_preservation=JSON.stringify(before)===JSON.stringify(after);}catch(p){receipt.preservation_error=String(p);}}
}finally{
 if(profileTimer)clearInterval(profileTimer);if(deadlineTimer)clearTimeout(deadlineTimer);
 receipt.guards=guards;receipt.profile_census_disappearances=profileCensusMisses;receipt.total_seconds=(performance.now()-started)/1000;receipt.completed_utc=new Date().toISOString();
 receipt.controller_pid=process.pid;receipt.controller_exit_pending_until_remote_tool_completion=true;
 receipt.owned_final={source_evidence_bytes:ownedSize(ROOT,true),browser_bytes:ownedSize(path.join(ROOT,'browser')),charged_metric:'max(logical, allocated)',receiver_allocation:ownedAllocation(ROOT,true),browser_allocation:ownedAllocation(path.join(ROOT,'browser'))};
 if(receipt.owned_final.source_evidence_bytes>STATIC_CAP||receipt.owned_final.browser_bytes>BROWSER_CAP)receipt.accepted=false;
 fs.mkdirSync(OUTPUT,{recursive:true});jsonfile('receipt.json',receipt);
 console.log(JSON.stringify({accepted:receipt.accepted,groups:Object.fromEntries(Object.entries(receipt.groups).map(([k,v])=>[k,v.pass])),
  failure:receipt.failure,receipt:pin(fs.readFileSync(path.join(OUTPUT,'receipt.json'))),controller_pid:process.pid,browser_exit:chromeExit,
  scope:'one separately delivered SQL session through retained installed learner, physical independent notes comparison, no SQL/model/exporter oracle or old matrix rerun'}));
 process.exitCode=receipt.accepted?0:1;
}
