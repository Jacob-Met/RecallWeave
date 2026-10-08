#!/usr/bin/env node
// Independent end-user receiving. No author test or algorithm module is imported.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn, execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';

const root=path.dirname(new URL(import.meta.url).pathname);
const args=process.argv.slice(2);
const arg=(flag,fallback)=>{const n=args.indexOf(flag);return n<0?fallback:args[n+1];};
const runId=arg('--run-id','native-r1');
const source=path.resolve(arg('--source',path.join(root,'.runtime/source')));
const out=path.join(root,'evidence',runId), profile=path.join(root,'.runtime','browser-'+runId);
fs.mkdirSync(out,{recursive:false});fs.mkdirSync(profile,{recursive:false});
const downloads=path.join(out,'downloads');fs.mkdirSync(downloads);
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const git=(...a)=>execFileSync('git',['-C',source,...a],{encoding:'utf8'}).trim();
const sourceCommit=git('rev-parse','HEAD');
assert.equal(sourceCommit,'e39f27d90239b790ae99005cbc8ec48e6809f55d','unqualified source revision');
assert.equal(git('status','--porcelain'),'','source checkout must be clean');
const sourcePaths=['courses/strongly-connected-components-explorer.html','courses/strongly-connected-components-explorer.template.html','courses/strongly-connected-components.json','courses/strongly-connected-components.md','src/strongly-connected-components.mjs','src/strongly-connected-components-ui.mjs','demo.html','src/deck.mjs','src/app.mjs'];
const before=Object.fromEntries(sourcePaths.map(p=>[p,sha(fs.readFileSync(path.join(source,p)))]));
assert.equal(git('diff','3a3704c352f8a12e20c208445c2c5ade412b365d',sourceCommit,'--','demo.html','src/deck.mjs','src/app.mjs'),'','existing importer changed');
const report={schema:'hamon.recall_scc_independent_receiving.v1',reviewer:'hamon-2983fe20e77b-mac_assimilation',implementation_owner:'hamon-2983fe20e77b-estate_production',source_commit:sourceCommit,runtime_source_commit:'a93e7861b4febc2b991276bddec2fa0afcb6fbd5',base:'3a3704c352f8a12e20c208445c2c5ade412b365d',source_paths_sha256:before,harness_sha256:sha(fs.readFileSync(new URL(import.meta.url))),author_tests_imported:false,source_algorithm_imported:false,started_at:new Date().toISOString(),node:process.version,groups:[],requests:[],javascript_exceptions:[],screenshots:[]};
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
async function choose(index){await evaluate('(()=>{const e=document.querySelector("#event-choice");e.value='+js(String(index))+';e.dispatchEvent(new Event("change",{bubbles:true}));})()');}
async function navigate(file){await cdp.send('Page.navigate',{url:pathToFileURL(file).href});await until(()=>evaluate('document.readyState==="complete"'),'document load');}
async function screenshot(name){const metrics=await cdp.send('Page.getLayoutMetrics');const s=metrics.cssContentSize;const r=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:Math.ceil(s.width),height:Math.ceil(s.height),scale:1}});fs.writeFileSync(path.join(out,name),Buffer.from(r.data,'base64'));report.screenshots.push({path:name,width:Math.ceil(s.width),height:Math.ceil(s.height),sha256:sha(Buffer.from(r.data,'base64'))});}
async function download(selector,name){const p=path.join(downloads,name);assert.equal(fs.existsSync(p),false,'download name already exists');await click(selector);await until(()=>fs.existsSync(p)&&fs.statSync(p).size>0,'download '+name);await pause(150);return p;}
async function group(name,fn){const started=Date.now();try{const detail=await fn();report.groups.push({name,pass:true,detail,elapsed_ms:Date.now()-started});console.log('PASS '+name);}catch(e){report.groups.push({name,pass:false,error:e.stack,elapsed_ms:Date.now()-started});console.log('FAIL '+name+': '+e.message);}}
const nodes='B b C1 constructor N0 N00';
const edges='b B\nB C1\nC1 B\nconstructor constructor\nN0 N00\nN00 N0\nC1 N0\nB N00';
const expectedNodes=nodes.split(' ');
const expectedEdges=edges.split('\n').map(e=>{const[from,to]=e.split(' ');return{from,to};});
let trace,tracePath,coursePath,guidePath,selectedEvent,course;
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
 const explorer=path.join(source,'courses/strongly-connected-components-explorer.html');
 await group('direct_file_standalone',async()=>{
  await navigate(explorer);await until(()=>evaluate('document.querySelector("#results")&&!document.querySelector("#results").hidden'),'explorer built');
  const state=await evaluate('({url:location.href,title:document.title,notice:document.querySelector("#notice").textContent,localStorage:localStorage.length,sessionStorage:sessionStorage.length,overflow:document.documentElement.scrollWidth>innerWidth})');
  assert.equal(state.url,pathToFileURL(explorer).href);assert.match(state.notice,/6 nodes and 7 directed edges/);assert.equal(state.localStorage,0);assert.equal(state.sessionStorage,0);assert.equal(state.overflow,false);return state;
 });
 await group('hand_derived_exact_graph_and_selected_export',async()=>{
  await fill('#node-text',nodes);await fill('#edge-text',edges);await click('#build');
  const options=await evaluate('[...document.querySelector("#event-choice").options].map(x=>({index:Number(x.value),text:x.textContent}))');
  selectedEvent=options.find(x=>x.text.includes('Pass 2')&&x.text.endsWith('· edge B')).index;
  await choose(selectedEvent);
  assert.equal(await evaluate('document.querySelector("#event-message").textContent'),'Inspect B → b in the transpose; its destination is already assigned.');
  tracePath=await download('#download-trace','strong-components-trace.json');trace=JSON.parse(fs.readFileSync(tracePath));
  assert.equal(trace.format,'recallweave-strong-components-trace/1');
  assert.deepEqual(trace.graph,{nodes:expectedNodes,edges:expectedEdges});
  assert.deepEqual(trace.enteredText,{nodes,edges});
  assert.deepEqual(trace.result.components,[['constructor'],['b'],['B','C1'],['N0','N00']]);
  assert.deepEqual(trace.result.rootOrder,['constructor','b','B','C1','N0','N00']);
  assert.deepEqual(trace.result.componentByNode,{B:2,b:1,C1:2,constructor:0,N0:3,N00:3});
  assert.deepEqual(trace.counts,{nodes:6,edges:8,forwardEdgeVisits:8,transposeEdgeVisits:8});
  assert.equal(trace.inspection.eventIndex,selectedEvent);assert.equal(Number.isSafeInteger(selectedEvent),true);
  assert.equal(trace.events[selectedEvent].edge,0);assert.equal(trace.events[selectedEvent].edgeVisits.transpose,2);
  assert.equal(trace.events[selectedEvent].message,await evaluate('document.querySelector("#event-message").textContent'));
  return {selected_event_index:selectedEvent,components:trace.result.components,root_order:trace.result.rootOrder,counts:trace.counts,download_sha256:sha(fs.readFileSync(tracePath))};
 });
 await group('step_explanations_transpose_arrows_and_finished_path',async()=>{
  assert.ok(trace,'trace export prerequisite');
  const firstFinish=trace.events.find(e=>e.phase==='forward'&&e.kind==='finish');
  assert.equal(firstFinish.node,'N00');assert.deepEqual(firstFinish.finishOrder,['N00']);assert.deepEqual(firstFinish.stack,['B','C1','N0']);
  await choose(firstFinish.index);assert.equal(await evaluate('document.querySelector("#dfs-path").textContent'),'B → C1 → N0');assert.equal(await evaluate('document.querySelector("#finish-list").textContent'),'N00');
  const reset=trace.events.find(e=>e.kind==='transpose');assert.deepEqual(Object.values(reset.secondState),Array(6).fill('unseen'));assert.deepEqual(Object.values(reset.firstState),Array(6).fill('finished'));
  await choose(selectedEvent);
  const visible=await evaluate('({titles:[...document.querySelectorAll("#network>path>title")].map(x=>x.textContent),message:document.querySelector("#event-message").textContent,phase:document.querySelector("#phase").textContent,rows:[...document.querySelectorAll("#node-states tr")].map(r=>[...r.cells].map(c=>c.textContent)),edgeCount:document.querySelector("#edge-count").textContent})');
  assert.deepEqual(visible.titles,expectedEdges.map(e=>e.to+' → '+e.from));
  assert.match(visible.edgeCount,/Pass 1: 8 \/ 8 · Pass 2: 2 \/ 8/);
  assert.deepEqual(visible.rows.map(r=>r[0]),expectedNodes);assert.equal(visible.rows.find(r=>r[0]==='b')[4],'C2');assert.equal(visible.rows.find(r=>r[0]==='B')[4],'C3');
  await screenshot('desktop-transpose.png');return {first_finish:firstFinish,selected:visible};
 });
 await group('condensation_dag_keeps_direct_edge_witnesses',async()=>{
  assert.ok(trace,'trace export prerequisite');
  assert.deepEqual(trace.result.condensationEdges,[{from:1,to:2,originalEdges:[0]},{from:2,to:3,originalEdges:[6,7]}]);
  assert.deepEqual(trace.result.topologicalComponentOrder,[0,1,2,3]);
  await click('#finish');
  const visible=await evaluate('({hidden:document.querySelector("#certificate").hidden,members:[...document.querySelectorAll("#component-members li")].map(e=>e.textContent),edges:[...document.querySelectorAll("#component-edges li")].map(e=>e.textContent),titles:[...document.querySelectorAll("#condensation>path>title")].map(e=>e.textContent),nodeRows:[...document.querySelectorAll("#node-states tr")].map(r=>[...r.cells].map(c=>c.textContent))})');
  assert.equal(visible.hidden,false);assert.deepEqual(visible.members,['C1 = {constructor}','C2 = {b}','C3 = {B, C1}','C4 = {N0, N00}']);
  assert.deepEqual(visible.edges,['C2 → C3: b → B','C3 → C4: C1 → N0; B → N00']);assert.deepEqual(visible.titles,['C2 → C3','C3 → C4']);
  assert.equal(visible.nodeRows.find(r=>r[0]==='C1')[4],'C3');await screenshot('desktop-condensation.png');return visible;
 });
 await group('prediction_does_not_move_selected_event',async()=>{
  await choose(selectedEvent);const before=await evaluate('document.querySelector("#step-count").dataset.eventIndex');
  await fill('#prediction','1.5');await click('#check-prediction');assert.match(await evaluate('document.querySelector("#prediction-feedback").textContent'),/Choose a whole number from 1 to 6/);
  await fill('#prediction','4');await click('#check-prediction');assert.match(await evaluate('document.querySelector("#prediction-feedback").textContent'),/^Yes\. 4 components/);
  assert.equal(await evaluate('document.querySelector("#step-count").dataset.eventIndex'),before);return {event_index:Number(before),fraction_refused:true,correct_count:4};
 });
 await group('edits_retire_trace_and_invalid_graph_cannot_export',async()=>{
  await fill('#edge-text',edges+'\nB missing');assert.equal(await evaluate('document.querySelector("#results").hidden&&document.querySelector("#download-trace").disabled&&document.querySelector("#prediction").disabled'),true);
  await click('#build');assert.match(await evaluate('document.querySelector("#error").textContent'),/two declared node names/);assert.equal(await evaluate('document.querySelector("#results").hidden&&document.querySelector("#download-trace").disabled'),true);
  await fill('#edge-text','B b\nB b');await click('#build');assert.match(await evaluate('document.querySelector("#error").textContent'),/repeated/);
  await fill('#node-text','B B');await fill('#edge-text','');await click('#build');assert.match(await evaluate('document.querySelector("#error").textContent'),/case-sensitive/);
  await fill('#node-text',nodes);await fill('#edge-text',edges);await click('#build');assert.equal(await evaluate('document.querySelector("#download-trace").disabled'),false);assert.equal(await evaluate('document.querySelector("#step-count").dataset.eventIndex'),'0');
  return {stale_trace_retired:true,unknown_endpoint_refused:true,duplicate_edge_refused:true,duplicate_node_refused:true,rebuild_event_index:0};
 });
 await group('mobile_maximum_node_labels_and_isolated_components',async()=>{
  const labels=Array.from({length:12},(_,i)=>'N'+String(i).padStart(11,'0'));
  await fill('#node-text',labels.join(' '));await fill('#edge-text','');await click('#build');await click('#finish');
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:375,height:900,deviceScaleFactor:1,mobile:false});
  const visible=await evaluate('({overflow:document.documentElement.scrollWidth>innerWidth,rows:[...document.querySelectorAll("#node-states tr")].map(r=>[...r.cells].map(c=>c.textContent)),members:[...document.querySelectorAll("#component-members li")].map(e=>e.textContent),edges:document.querySelector("#component-edges").textContent,counts:document.querySelector("#edge-count").textContent})');
  assert.equal(visible.overflow,false);assert.deepEqual(visible.rows.map(r=>r[0]),labels);assert.equal(visible.members.length,12);
  assert.deepEqual(visible.members,labels.toReversed().map((label,i)=>'C'+(i+1)+' = {'+label+'}'));
  assert.match(visible.edges,/no edges between different components/);assert.match(visible.counts,/Pass 1: 0 \/ 0 · Pass 2: 0 \/ 0/);
  await screenshot('mobile-twelve-labels.png');await cdp.send('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});return visible;
 });
 await group('exact_course_and_guide_browser_downloads',async()=>{
  coursePath=await download('#download-course','strongly-connected-components.json');guidePath=await download('#download-guide','strongly-connected-components.md');
  for(const [downloaded,authored] of [[coursePath,'courses/strongly-connected-components.json'],[guidePath,'courses/strongly-connected-components.md']])assert.equal(sha(fs.readFileSync(downloaded)),before[authored]);
  course=JSON.parse(fs.readFileSync(coursePath));const answers={'scc-return':2,'scc-join':0,'scc-singleton':3,'scc-finish':1,'scc-root-order':2,'scc-finish-meaning':0,'scc-transpose':1,'scc-second-pass':3,'scc-reset':2,'scc-collapse':0,'scc-no-cycle':3,'scc-edge-work':1};
  assert.deepEqual(Object.fromEntries(course.items.map(i=>[i.id,i.answer])),answers);assert.equal(course.items.length,12);
  return {course_sha256:sha(fs.readFileSync(coursePath)),guide_sha256:sha(fs.readFileSync(guidePath)),manually_checked_answer_keys:answers};
 });
 await group('downloaded_course_existing_importer_preview_and_full_session',async()=>{
  assert.ok(coursePath&&course,'downloaded course prerequisite');await navigate(path.join(source,'demo.html'));await until(()=>evaluate('!!document.querySelector("#start-button")'),'bundled lesson ready');
  await click('#start-button');const originalQuestion=await evaluate('document.querySelector(".question-card h2").textContent');
  const doc=await cdp.send('DOM.getDocument');const input=await cdp.send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'#deck-file'});await cdp.send('DOM.setFileInputFiles',{nodeId:input.nodeId,files:[coursePath]});
  await until(()=>evaluate('!document.querySelector("#deck-preview").hidden'),'course preview');
  const preview=await evaluate('document.querySelector("#deck-preview").textContent');assert.match(preview,/Return paths: strongly connected components/);assert.match(preview,/12 questions/);
  assert.equal(await evaluate('document.querySelector(".question-card h2").textContent'),originalQuestion,'preview changed current lesson');
  await screenshot('learner-preview.png');
  const start=await evaluate('(()=>{const b=[...document.querySelectorAll("#deck-preview button")].find(b=>b.textContent.includes("Start this deck"));if(!b)throw Error("Start this deck missing");b.id="independent-start-deck";return "#"+b.id;})()');await click(start);
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
