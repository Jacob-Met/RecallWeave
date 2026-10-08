#!/usr/bin/env node
// Author browser receiving. CDP transport is reused from this worker's independently
// authored SCC receiver (993adf51); matching cases and expectations are original.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const source=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
if(args.length!==2||args[0]!=='--out')throw Error('Usage: node tools/check_bipartite_matching_browser.mjs --out /absolute/new-directory');
const out=path.resolve(args[1]);fs.mkdirSync(out,{recursive:false});
const profile=path.join(out,'browser-profile'),downloads=path.join(out,'downloads');
fs.mkdirSync(profile);fs.mkdirSync(downloads);
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const git=(...a)=>execFileSync('git',['-C',source,...a],{encoding:'utf8'}).trim();
const sourceCommit=git('rev-parse','HEAD');
assert.equal(git('status','--porcelain'),'','source checkout must be clean');
const sourcePaths=['courses/bipartite-matching-explorer.html','courses/bipartite-matching-explorer.template.html','courses/bipartite-matching.json','courses/bipartite-matching.md','src/bipartite-matching.mjs','src/bipartite-matching-ui.mjs','demo.html','src/deck.mjs','src/app.mjs'];
const before=Object.fromEntries(sourcePaths.map(p=>[p,sha(fs.readFileSync(path.join(source,p)))]));
assert.equal(before['src/bipartite-matching.mjs'],'9df48b6ed5f249c4e18e8f2b9eff452db1267ab6053e8a1464cf1766a962509b');
assert.equal(git('diff','48611be99baa20f51d1e3846ed8cd38879748961',sourceCommit,'--','demo.html','src/deck.mjs','src/app.mjs'),'','existing importer changed');
const report={schema:'hamon.bipartite_matching_author_browser.v1',owner:'hamon-2983fe20e77b/mac_assimilation',receiving_kind:'author_browser',source_commit:sourceCommit,independently_received_core_commit:'dbee56265cdacfedc959d11dc5d7faa79d2ddf36',base:'48611be99baa20f51d1e3846ed8cd38879748961',source_paths_sha256:before,harness_sha256:sha(fs.readFileSync(fileURLToPath(import.meta.url))),started_at:new Date().toISOString(),node:process.version,groups:[],requests:[],javascript_exceptions:[],screenshots:[]};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label,timeout=20000){const stop=Date.now()+timeout;let last;while(Date.now()<stop){try{const v=await fn();if(v)return v;}catch(e){last=e;}await pause(100);}throw Error('Timed out: '+label+(last?'; '+last.message:''));}
let browser,cdp,debug;
class Connection{
 constructor(ws){this.ws=ws;this.seq=0;this.pending=new Map();ws.addEventListener('message',event=>{const x=JSON.parse(event.data);if(x.id){const p=this.pending.get(x.id);if(!p)return;this.pending.delete(x.id);clearTimeout(p.timer);x.error?p.reject(Error(JSON.stringify(x.error))):p.resolve(x.result??{});}else if(x.method==='Runtime.exceptionThrown'){report.javascript_exceptions.push(x.params.exceptionDetails);}else if(x.method==='Network.requestWillBeSent'){report.requests.push({url:x.params.request.url,type:x.params.type});}});}
 static async open(url){const ws=new WebSocket(url);await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});return new Connection(ws);}
 send(method,params={}){const id=++this.seq;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(Error('CDP timeout '+method));},25000);this.pending.set(id,{resolve,reject,timer});this.ws.send(JSON.stringify({id,method,params}));});}
}
async function evaluate(expression){const r=await cdp.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text+' '+JSON.stringify(r.exceptionDetails.exception?.description));return r.result?.value;}
const js=v=>JSON.stringify(v);
async function click(selector){const r=await evaluate('(()=>{const e=document.querySelector('+js(selector)+');if(!e||e.disabled)throw Error("Unavailable control "+'+js(selector)+');e.scrollIntoView({block:"center"});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()');await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',...r});await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',...r,button:'left',clickCount:1});await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',...r,button:'left',clickCount:1});}
async function fill(selector,value){await evaluate('(()=>{const e=document.querySelector('+js(selector)+');e.focus();e.select();})()');await cdp.send('Input.insertText',{text:value});}
async function choose(index){await evaluate('(()=>{const e=document.querySelector("#event-slider");e.value='+js(String(index))+';e.dispatchEvent(new Event("input",{bubbles:true}));})()');}
async function navigate(file){await cdp.send('Page.navigate',{url:pathToFileURL(file).href});await until(()=>evaluate('document.readyState==="complete"'),'document load');}
async function screenshot(name){const metrics=await cdp.send('Page.getLayoutMetrics');const s=metrics.cssContentSize;const r=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:Math.ceil(s.width),height:Math.ceil(s.height),scale:1}});fs.writeFileSync(path.join(out,name),Buffer.from(r.data,'base64'));report.screenshots.push({path:name,width:Math.ceil(s.width),height:Math.ceil(s.height),sha256:sha(Buffer.from(r.data,'base64'))});}
async function download(selector,name){const p=path.join(downloads,name);assert.equal(fs.existsSync(p),false,'download name already exists');await click(selector);await until(()=>fs.existsSync(p)&&fs.statSync(p).size>0,'download '+name);await pause(150);return p;}
async function group(name,fn){const started=Date.now();try{const detail=await fn();report.groups.push({name,pass:true,detail,elapsed_ms:Date.now()-started});console.log('PASS '+name);}catch(e){report.groups.push({name,pass:false,error:e.stack,elapsed_ms:Date.now()-started});console.log('FAIL '+name+': '+e.message);}}

let tracePath,coursePath,guidePath,course,greedyTrace,longTrace;
async function seekKind(kind){
  for(let n=0;n<1000;n++){
    if(await evaluate('document.querySelector("#event-kind").textContent')===kind)return;
    await click('#next-event');
  }
  throw Error('Event kind not reached: '+kind);
}
try{
 const stderr=fs.openSync(path.join(out,'chromium.stderr.log'),'wx');
 browser=spawn('/snap/bin/chromium',['--headless=new','--disable-gpu','--no-sandbox','--no-first-run','--no-default-browser-check','--disable-background-networking','--remote-debugging-port=0','--user-data-dir='+profile,'--window-size=1280,1000','about:blank'],{stdio:['ignore','ignore',stderr]});
 const active=path.join(profile,'DevToolsActivePort');
 const port=await until(()=>fs.existsSync(active)&&Number(fs.readFileSync(active,'utf8').split('\n')[0]),'fresh browser debug port',40000);
 debug='http://127.0.0.1:'+port;
 const version=await(await fetch(debug+'/json/version')).json();report.browser=version.Browser;
 const page=await(await fetch(debug+'/json/new?about:blank',{method:'PUT'})).json();cdp=await Connection.open(page.webSocketDebuggerUrl);
 await cdp.send('Runtime.enable');await cdp.send('Page.enable');await cdp.send('Network.enable');
 await cdp.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads,eventsEnabled:true});
 await cdp.send('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});
 const explorer=path.join(source,'courses/bipartite-matching-explorer.html');

 await group('direct_file_greedy_start',async()=>{
  await navigate(explorer);await until(()=>evaluate('document.querySelector("#input-status").textContent.startsWith("Trace ready")'),'matching lab ready');
  const visible=await evaluate('({url:location.href,title:document.title,size:document.querySelector("#matching-size").textContent,pairs:document.querySelector("#matching-pairs").textContent,nodes:[...document.querySelectorAll(".graph-node>span")].map(e=>e.textContent),event:document.querySelector("#event-position").textContent,overflow:document.documentElement.scrollWidth>innerWidth,localStorage:localStorage.length,sessionStorage:sessionStorage.length})');
  assert.equal(visible.url,pathToFileURL(explorer).href);assert.equal(visible.size,'1');assert.deepEqual(visible.nodes,['A','B','X','Y']);assert.match(visible.pairs,/A–X/);assert.equal(visible.overflow,false);assert.equal(visible.localStorage,0);assert.equal(visible.sessionStorage,0);return visible;
 });
 await group('actual_selected_trace_and_exact_three_edge_path',async()=>{
  await seekKind('Augmenting path');
  const p=await download('#download-trace','bipartite-matching-trace.json');
  tracePath=path.join(downloads,'greedy-selected-trace.json');fs.renameSync(p,tracePath);greedyTrace=JSON.parse(fs.readFileSync(tracePath));
  assert.equal(greedyTrace.format,'recallweave-bipartite-matching-export/1');
  assert.deepEqual(greedyTrace.selectedEvent,greedyTrace.trace.events[greedyTrace.selectedEventIndex]);
  assert.equal(greedyTrace.selectedEvent.kind,'path-found');assert.deepEqual(greedyTrace.selectedEvent.matching,['e1']);
  assert.deepEqual(greedyTrace.selectedEvent.path,[
    {edgeId:'e3',from:'B',to:'X',inMatchingBefore:false},
    {edgeId:'e1',from:'X',to:'A',inMatchingBefore:true},
    {edgeId:'e2',from:'A',to:'Y',inMatchingBefore:false}
  ]);
  assert.deepEqual(greedyTrace.trace.finalMatching,['e2','e3']);assert.equal(greedyTrace.trace.maxSize,2);
  const shown=await evaluate('({path:document.querySelector("#path-vertices").textContent,heading:document.querySelector("#path-heading").textContent,size:document.querySelector("#matching-size").textContent,steps:[...document.querySelectorAll("#path-steps li")].map(e=>e.textContent),message:document.querySelector("#event-message").textContent})');
  assert.equal(shown.path,'B → X → A → Y');assert.equal(shown.size,'1');assert.match(shown.heading,/not applied yet/);assert.equal(shown.message,greedyTrace.selectedEvent.message);
  await screenshot('desktop-path-before-flip.png');return {visible:shown,selected_event_index:greedyTrace.selectedEventIndex,download_sha256:sha(fs.readFileSync(tracePath))};
 });
 await group('atomic_flip_updates_pairs_and_search_arrows',async()=>{
  await click('#next-event');const state=await evaluate('({kind:document.querySelector("#event-kind").textContent,size:document.querySelector("#matching-size").textContent,pairs:[...document.querySelectorAll("#matching-pairs .pair")].map(e=>e.textContent),arcs:[...document.querySelectorAll("#graph svg>g")].map(e=>[e.dataset.edgeId,e.dataset.from,e.dataset.to]),caption:document.querySelector("#graph-caption").textContent})');
  assert.equal(state.kind,'Whole-path flip');assert.equal(state.size,'2');assert.deepEqual(state.pairs,['A–Y · e2','B–X · e3']);
  assert.deepEqual(state.arcs,[['e1','A','X'],['e2','Y','A'],['e3','X','B']]);assert.match(state.caption,/Matching after/);
  await click('#previous-event');assert.equal(await evaluate('document.querySelector("#matching-size").textContent'),'1');
  await click('#last-event');assert.equal(await evaluate('document.querySelector("#event-kind").textContent'),'Maximum matching');
  await screenshot('desktop-maximum.png');return state;
 });
 await group('longer_rearrangement_download_retains_five_edge_path',async()=>{
  await evaluate('document.querySelector("#example").value="chain"');await click('#load-example');await seekKind('Augmenting path');
  const p=await download('#download-trace','bipartite-matching-trace.json');const saved=path.join(downloads,'long-selected-trace.json');fs.renameSync(p,saved);longTrace=JSON.parse(fs.readFileSync(saved));
  const e=longTrace.selectedEvent;assert.deepEqual(e.path.map(s=>s.from).concat(e.path.at(-1).to),['B','X','A','Y','C','Z']);
  assert.deepEqual(e.matching,['e1','e4']);assert.deepEqual(e.added,['e3','e2','e5']);assert.deepEqual(e.removed,['e1','e4']);assert.equal(longTrace.trace.maxSize,3);
  assert.equal(await evaluate('document.querySelector("#path-vertices").textContent'),'B → X → A → Y → C → Z');
  return {selected:e,download_sha256:sha(fs.readFileSync(saved))};
 });
 await group('prediction_refuses_fraction_and_preserves_selected_event',async()=>{
  const index=await evaluate('document.querySelector("#event-slider").value');
  await fill('#prediction','2.5');await click('#check-prediction');assert.match(await evaluate('document.querySelector("#prediction-status").textContent'),/whole number from 0 to 3/);
  await fill('#prediction','3');await click('#check-prediction');assert.match(await evaluate('document.querySelector("#prediction-status").textContent'),/^Correct: the maximum is 3/);
  assert.equal(await evaluate('document.querySelector("#event-slider").value'),index);return {fraction_refused:true,predicted_maximum:3,event_index:Number(index)};
 });
 await group('editing_retires_trace_and_invalid_inputs_cannot_export',async()=>{
  await fill('#matching-input','A X\nB X');
  assert.equal(await evaluate('document.querySelector("#download-trace").disabled'),true);
  assert.equal(await evaluate('document.querySelectorAll("#graph .graph-node").length'),0);
  await click('#build-trace');assert.match(await evaluate('document.querySelector("#input-status").textContent'),/share a vertex/);
  assert.equal(await evaluate('document.querySelector("#download-trace").disabled'),true);
  await fill('#matching-input','');await fill('#edges-input','X A');await click('#build-trace');assert.match(await evaluate('document.querySelector("#input-status").textContent'),/entered left label/);
  await fill('#edges-input','A X\nA X');await click('#build-trace');assert.match(await evaluate('document.querySelector("#input-status").textContent'),/Repeated edge/);
  await fill('#right-input','A Y');await click('#build-trace');assert.match(await evaluate('document.querySelector("#input-status").textContent'),/both sides/);
  await evaluate('document.querySelector("#example").value="trap"');await click('#load-example');
  assert.equal(await evaluate('document.querySelector("#event-slider").value'),'0');assert.equal(await evaluate('document.querySelector("#download-trace").disabled'),false);
  return {conflicting_matching_refused:true,reversed_side_refused:true,duplicate_edge_refused:true,overlapping_sides_refused:true,old_trace_retired:true};
 });
 await group('mobile_maximum_labels_and_complete_six_by_six_graph',async()=>{
  const left=Array.from({length:6},(_,i)=>'L'+String(i+1).padStart(11,'0')),right=Array.from({length:6},(_,i)=>'R'+String(i+1).padStart(11,'0'));
  await fill('#left-input',left.join(' '));await fill('#right-input',right.join(' '));await fill('#edges-input',left.flatMap(l=>right.map(r=>l+' '+r)).join('\n'));await fill('#matching-input','');await click('#build-trace');await click('#last-event');
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:375,height:900,deviceScaleFactor:1,mobile:false});
  const state=await evaluate('({overflow:document.documentElement.scrollWidth>innerWidth,nodes:[...document.querySelectorAll(".graph-node>span")].map(e=>e.textContent),size:document.querySelector("#matching-size").textContent,rows:[...document.querySelectorAll("#edge-table tbody tr")].map(r=>[...r.cells].map(c=>c.textContent)),pairs:[...document.querySelectorAll("#matching-pairs .pair")].map(e=>e.textContent)})');
  assert.equal(state.overflow,false);assert.deepEqual(state.nodes,[...left,...right]);assert.equal(state.size,'6');assert.equal(state.rows.length,36);assert.equal(state.pairs.length,6);
  await screenshot('mobile-six-by-six.png');await cdp.send('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});return state;
 });
 await group('source_identical_original_lesson_and_guide_downloads',async()=>{
  coursePath=await download('#download-course','bipartite-matching.json');guidePath=await download('#download-guide','bipartite-matching.md');
  for(const [file,p]of [[coursePath,'courses/bipartite-matching.json'],[guidePath,'courses/bipartite-matching.md']])assert.equal(sha(fs.readFileSync(file)),before[p]);
  course=JSON.parse(fs.readFileSync(coursePath));assert.equal(course.items.length,12);
  assert.deepEqual(course.items.map(i=>i.answer),[1,3,0,2,0,1,3,2,0,2,1,3]);
  return {course_sha256:sha(fs.readFileSync(coursePath)),guide_sha256:sha(fs.readFileSync(guidePath)),question_count:course.items.length};
 });
 await group('downloaded_course_existing_importer_preview_and_full_session',async()=>{
  assert.ok(coursePath&&course,'downloaded course prerequisite');await navigate(path.join(source,'demo.html'));await until(()=>evaluate('!!document.querySelector("#start-button")'),'bundled lesson ready');
  await click('#start-button');const originalQuestion=await evaluate('document.querySelector(".question-card h2").textContent');
  const doc=await cdp.send('DOM.getDocument');const input=await cdp.send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'#deck-file'});await cdp.send('DOM.setFileInputFiles',{nodeId:input.nodeId,files:[coursePath]});
  await until(()=>evaluate('!document.querySelector("#deck-preview").hidden'),'course preview');
  const preview=await evaluate('document.querySelector("#deck-preview").textContent');assert.match(preview,/Make room for one more pair: bipartite matching/);assert.match(preview,/12 questions/);
  assert.equal(await evaluate('document.querySelector(".question-card h2").textContent'),originalQuestion,'preview changed current lesson');
  await screenshot('learner-preview.png');
  const start=await evaluate('(()=>{const b=[...document.querySelectorAll("#deck-preview button")].find(b=>b.textContent.includes("Start this deck"));if(!b)throw Error("Start this deck missing");b.id="matching-author-start-deck";return "#"+b.id;})()');await click(start);
  const asked=[],feedback=[];const byPrompt=new Map(course.items.map(i=>[i.prompt,i]));
  for(let n=0;n<12;n++){
   await until(()=>evaluate('!!document.querySelector(".question-card h2")'),'imported question');
   const prompt=await evaluate('document.querySelector(".question-card h2").textContent');const item=byPrompt.get(prompt);assert.ok(item,'question was not from downloaded course');assert.equal(asked.includes(item.id),false,'learner repeated question');asked.push(item.id);
   const choice=n===0?(item.answer+1)%item.options.length:item.answer;await click('.choice[data-choice="'+choice+'"]');
   const shown=await evaluate('document.querySelector("#feedback-slot").textContent');assert.ok(shown.includes(item.explanation));assert.ok(shown.includes(item.transfer));assert.ok(shown.includes(n===0?'Here’s the correction.':'That connection holds.'));
   feedback.push({id:item.id,choice,correct:n!==0,explanation_visible:true,transfer_visible:true});
   if(n===0)await screenshot('learner-correction.png');
   await click('#next-button');
  }
  const final=await evaluate('({result:!!document.querySelector(".result-card"),reviewRows:document.querySelectorAll(".review-item").length,incorrect:document.querySelectorAll(".review-status.needs-review").length,correct:document.querySelectorAll(".review-status.is-correct").length,progress:document.querySelector(".progress-track").getAttribute("aria-valuenow"),overflow:document.documentElement.scrollWidth>innerWidth})');
  assert.equal(final.result,true);assert.equal(final.reviewRows,12);assert.equal(final.incorrect,1);assert.equal(final.correct,11);assert.equal(final.progress,'12');assert.equal(final.overflow,false);await screenshot('learner-complete.png');return {preview_preserved_existing_session:true,original_question:originalQuestion,asked,feedback,final};
 });
 await group('algorithm_trace_refused_as_course_without_losing_learner_result',async()=>{
  assert.ok(tracePath,'algorithm trace prerequisite');const previous=await evaluate('document.querySelector("#session-content").textContent');
  const doc=await cdp.send('DOM.getDocument');const input=await cdp.send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'#deck-file'});await cdp.send('DOM.setFileInputFiles',{nodeId:input.nodeId,files:[tracePath]});
  await until(()=>evaluate('document.querySelector("#deck-status").classList.contains("deck-error")'),'wrong-format error');
  assert.equal(await evaluate('document.querySelector("#session-content").textContent'),previous);return {error:await evaluate('document.querySelector("#deck-status").textContent'),learner_result_preserved:true};
 });
 await group('offline_exceptions_and_source_custody',async()=>{
  const external=report.requests.filter(r=>/^https?:/.test(r.url));assert.deepEqual(external,[]);assert.deepEqual(report.javascript_exceptions,[]);
  const after=Object.fromEntries(sourcePaths.map(p=>[p,sha(fs.readFileSync(path.join(source,p)))]));assert.deepEqual(after,before);assert.equal(git('status','--porcelain'),'');
  return {http_requests:0,javascript_exceptions:0,unchanged_source_files:sourcePaths.length,source_clean:true};
 });
}catch(e){report.fatal=e.stack;console.error(e.stack);}
finally{
 report.finished_at=new Date().toISOString();report.passed=report.groups.filter(g=>g.pass).length;report.total=report.groups.length;report.verdict=!report.fatal&&report.total===11&&report.passed===11?'pass':'fail';
 fs.writeFileSync(path.join(out,'receipt.json'),JSON.stringify(report,null,2)+'\n');
 if(cdp){try{await cdp.send('Browser.close');}catch{}cdp.ws.close();}if(browser&&!browser.killed)browser.kill('SIGTERM');
 console.log(JSON.stringify({receipt:path.join(out,'receipt.json'),verdict:report.verdict,passed:report.passed,total:report.total}));
 process.exitCode=report.verdict==='pass'?0:1;
}
