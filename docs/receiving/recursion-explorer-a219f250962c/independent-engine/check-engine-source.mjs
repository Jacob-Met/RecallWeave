import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT='/Users/me/recallweave-recursion-content-a219f250962c/receiving/engine-review';
const OWNER='/Users/me/recallweave-recursion-a219f250962c';
const SOURCE=path.join(OWNER,'source');
const SHA=bytes=>createHash('sha256').update(bytes).digest('hex');
const capacity=await fs.statfs(ROOT);
assert(capacity.bavail*capacity.bsize>=256*1024*1024,'256MiB immediate receiving gate');
const manifestBytes=await fs.readFile(path.join(OWNER,'receiving/source-freeze.json'));
assert.equal(SHA(manifestBytes),'a70aa9c61cdfee01c08105078d3132de35b1d08fac7c17e1f9b72b86e78fd342');
const manifest=JSON.parse(manifestBytes);
const report={
  status:'running', review:'Independent event-history receiving; no author test/browser repetition',
  commit:'e8846aa6b5815fa3f47b4905863fe6c51ee8b507',
  tree:'9380029da48cfab89ed17e1baf9e1d2685cfaf29',
  manifestSha256:SHA(manifestBytes), node:process.version,
  freeBytes:capacity.bavail*capacity.bsize,
  scriptSha256:SHA(await fs.readFile(fileURLToPath(import.meta.url))),
  groups:[],runs:[],fixtures:{},source:[],
  limitations:['This gate runs the native pure engine and inspects exact HTML/UI source; it does not create a browser, repeat author browser controls, or claim deployment.']
};
async function save(){
  const h=await fs.open(path.join(ROOT,'receipt.json'),'w');
  try{await h.writeFile(JSON.stringify(report,null,2)+'\n');await h.sync();}finally{await h.close();}
}
async function passed(group){report.groups.push(group);await save();console.log('PASS '+group);}
async function verifySource(){
  const git=spawnSync('/usr/bin/git',['status','--porcelain'],{cwd:SOURCE,encoding:'utf8'});
  assert.equal(git.status,0);assert.equal(git.stdout,'','owner source must remain clean');
  const head=spawnSync('/usr/bin/git',['rev-parse','HEAD'],{cwd:SOURCE,encoding:'utf8'});
  assert.equal(head.stdout.trim(),report.commit);
  for(const row of manifest.files){
    const bytes=await fs.readFile(path.join(SOURCE,row.path));
    assert.equal(bytes.length,row.bytes,row.path);
    assert.equal(SHA(bytes),row.sha256,row.path);
  }
}
function reference(algorithm,n){
  if(algorithm==='factorial'){let value=1n;for(let factor=2;factor<=n;factor++)value*=BigInt(factor);return String(value);}
  let a=0n,b=1n;for(let index=0;index<n;index++)[a,b]=[b,a+b];return String(a);
}
function immutable(value,seen=new Set()){
  if(!value||typeof value!=='object'||seen.has(value))return;
  seen.add(value);assert(Object.isFrozen(value),'nested public value must be frozen');
  for(const next of Object.values(value))immutable(next,seen);
}
try{
  await verifySource();report.source=manifest.files.map(({path,bytes,sha256})=>({path,bytes,sha256}));
  const {createTrace,snapshotAt,traceDocument,parseInput}=await import(pathToFileURL(path.join(SOURCE,'courses/recursion-call-stack-core.mjs')));
  const examples=new Map();
  let inspectedSnapshots=0;
  for(const algorithm of ['factorial','fibonacci','memo-fibonacci'])for(let input=0;input<=10;input++){
    const trace=createTrace(algorithm,input);
    immutable(trace);
    const before=JSON.stringify(trace),records=new Map(),active=[],cache=new Map();
    let calls=0,hits=0,returned=0,maximum=0,prior=null,final=null;
    for(let index=0;index<trace.steps.length;index++){
      const state=snapshotAt(trace,index),event=state.event;
      inspectedSnapshots++;
      assert.strictEqual(state,trace.steps[index]);assert.equal(state.index,index);
      assert(['start','call','cache-hit','suspend','resolve','return'].includes(event.kind));
      let unchangedAncestors=0;
      if(index===0){
        assert.equal(event.kind,'start');assert.equal(event.frameId,null);
      }else if(event.kind==='call'||event.kind==='cache-hit'){
        const parent=active.at(-1)??null;
        assert.equal(event.frameId,records.size+1,'invocation identities are monotonic');
        const isHit=algorithm==='memo-fibonacci'&&cache.has(event.input);
        assert.equal(event.kind==='cache-hit',isHit,'cache membership determines the hit');
        let slot=null;
        if(parent!==null){
          const caller=records.get(parent);
          assert(!caller.hit&&!caller.returned&&!caller.resolved,'only an unresolved computed frame calls a child');
          const expectedChildren=algorithm==='factorial'?(caller.input===0?0:1):(caller.input<=1?0:2);
          assert(caller.children.length<expectedChildren,'no extra or base-case child invocation');
          slot=caller.children.length===0?'left':'right';
          assert.equal(event.input,caller.input-(slot==='left'?1:2),'child input follows the suspended expression');
          if(slot==='right')assert(records.get(caller.children[0]).returned,'left child must return before right entry');
          assert.equal(prior.event.kind,'suspend','child entry follows an explicit caller suspension');
          assert.equal(prior.event.frameId,parent);
          assert.equal(prior.event.line,algorithm==='factorial'?'child':slot);
          caller.children.push(event.frameId);
        }else{
          assert.equal(records.size,0,'only the root has no caller');assert.equal(event.input,input);
        }
        records.set(event.frameId,{id:event.frameId,parent,slot,input:event.input,hit:isHit,children:[],left:null,right:null,result:isHit?cache.get(event.input):null,resolved:false,returned:false});
        active.push(event.frameId);calls++;if(isHit)hits++;maximum=Math.max(maximum,active.length);
        if(isHit)assert.equal(event.value,cache.get(event.input));
        unchangedAncestors=prior.stack.length;
      }else if(event.kind==='suspend'){
        const row=records.get(active.at(-1));assert(row);assert.equal(event.frameId,row.id);assert(!row.hit&&!row.resolved&&!row.returned);
        assert(row.input>(algorithm==='factorial'?0:1),'base cases cannot suspend for children');
        const expectedLine=algorithm==='factorial'?'child':row.children.length===0?'left':'right';
        assert.equal(event.line,expectedLine);
        if(row.children.length)assert(records.get(row.children[0]).returned,'suspension for the sibling keeps a completed first result');
        unchangedAncestors=active.length-1;
      }else if(event.kind==='resolve'){
        const row=records.get(active.at(-1));assert(row);assert.equal(event.frameId,row.id);assert(!row.hit&&!row.resolved&&!row.returned);
        const count=algorithm==='factorial'?(row.input===0?0:1):(row.input<=1?0:2);
        assert.equal(row.children.length,count);assert(row.children.every(id=>records.get(id).returned));
        row.result=reference(algorithm,row.input);row.resolved=true;assert.equal(event.value,row.result);
        if(algorithm==='memo-fibonacci'){
          assert(!cache.has(row.input),'a computed invocation writes its input only once');
          assert.deepEqual(event.cacheWrite,{input:row.input,value:row.result});
          cache.set(row.input,row.result);
        }else assert.equal(event.cacheWrite,undefined);
        unchangedAncestors=active.length-1;
      }else if(event.kind==='return'){
        const row=records.get(active.at(-1));assert(row);assert.equal(event.frameId,row.id,'only the top frame can return');
        assert(row.hit||row.resolved,'return follows resolution or a genuine hit');
        assert(!row.returned);assert.equal(event.value,reference(algorithm,row.input));
        assert.equal(event.to,row.parent);assert.equal(event.slot,row.slot);
        if(row.hit)assert.equal(row.children.length,0,'a hit starts no children');
        row.returned=true;active.pop();returned++;
        if(row.parent!==null)records.get(row.parent)[row.slot]=event.value;else final=event.value;
        unchangedAncestors=Math.max(0,active.length-1);
      }else assert.fail('start is only the initial event');
      assert.deepEqual(state.stack.map(frame=>frame.id),active,'snapshot stack equals live activation ledger');
      for(let depth=0;depth<active.length;depth++){
        const frame=state.stack[depth],row=records.get(active[depth]);
        assert.equal(frame.parentId,depth?active[depth-1]:null);
        assert.equal(frame.input,row.input);assert.equal(frame.left,row.left);assert.equal(frame.right,row.right);assert.equal(frame.result,row.result);
        assert.equal(typeof frame.pending,'string');assert(frame.pending.length>0);
        if(depth<unchangedAncestors)assert.deepEqual(frame,prior.stack[depth],'a suspended ancestor must not change while its descendant runs');
      }
      assert.deepEqual(state.cache,[...cache].sort((a,b)=>a[0]-b[0]).map(([input,value])=>({input,value})));
      assert.deepEqual(state.counters,{calls,computedCalls:calls-hits,cacheHits:hits,returnedCalls:returned,activeDepth:active.length,maxDepth:maximum});
      assert.equal(calls,returned+active.length,'every entered call is either active or returned');
      assert.equal(state.result,final);assert.equal(state.complete,final!==null);
      if(state.complete)assert.equal(index,trace.steps.length-1,'only the terminal root return completes the run');
      prior=state;
    }
    assert.equal(final,reference(algorithm,input));
    assert.equal(trace.result,final);assert.deepEqual(trace.finalCounters,trace.steps.at(-1).counters);
    assert.equal(active.length,0);assert([...records.values()].every(row=>row.returned));
    for(let index=trace.steps.length-1;index>=0;index--)assert.strictEqual(snapshotAt(trace,index),trace.steps[index]);
    assert.equal(JSON.stringify(trace),before,'reverse inspection does not mutate any saved event or snapshot');
    const indices=new Set([0,1,Math.floor(trace.steps.length/2),trace.steps.length-1]);
    const hitIndex=trace.steps.findIndex(step=>step.event.kind==='cache-hit');if(hitIndex>=0)indices.add(hitIndex);
    for(const cursor of indices){
      const document=traceDocument(trace,cursor);immutable(document);
      assert.strictEqual(document.steps,trace.steps);assert.strictEqual(document.selectedState,trace.steps[cursor]);
      assert.equal(document.selectedStep,cursor);assert.equal(document.result,final);
      const json=JSON.parse(JSON.stringify(document));assert.deepEqual(json.selectedState,json.steps[cursor]);
      assert.equal(json.steps.length,trace.steps.length);assert.equal(json.finalCounters.calls,calls);
      if(cursor===0){assert.equal(json.selectedState.result,null);assert.equal(json.selectedState.complete,false);assert.equal(json.selectedState.counters.calls,0);}
      assert.equal(Reflect.set(document,'selectedStep',-1),false);
    }
    const again=createTrace(algorithm,input);
    assert.notStrictEqual(again,trace);assert.deepEqual(again,trace,'fresh run is deterministic without a retained cache');
    assert.notStrictEqual(again.steps[0].cache,trace.steps[0].cache);
    assert.deepEqual(again.steps[0].cache,[]);
    assert.equal(Reflect.set(trace.steps[0].counters,'calls',999),false);
    if(trace.steps[1].stack.length)assert.equal(Reflect.set(trace.steps[1].stack[0],'left','999'),false);
    report.runs.push({algorithm,input,steps:trace.steps.length,calls,hits,returned,maximum,result:final,traceSha256:SHA(Buffer.from(before))});
    if((algorithm==='factorial'&&[3,4].includes(input))||(algorithm==='fibonacci'&&[3,4].includes(input))||(algorithm==='memo-fibonacci'&&input===5))examples.set(algorithm+':'+input,trace);
  }
  report.snapshotsInspected=inspectedSnapshots;
  await passed('33 native runs: independent activation ledger verifies child ownership, LIFO returns, unchanged suspended ancestors, exact locals/cache and all prefix counters');
  await passed('reverse inspection and start/middle/hit/end exports preserve immutable full-trace bytes and exact selected-state identity; fresh runs share no cache');

  const factorial3=examples.get('factorial:3');
  assert.deepEqual(factorial3.steps.filter(s=>s.event.kind==='return').map(s=>[s.event.input,s.event.value]),[[0,'1'],[1,'1'],[2,'2'],[3,'6']]);
  const factorial4=examples.get('factorial:4');
  const waiting=factorial4.steps.find(s=>s.event.kind==='call'&&s.event.input===2);
  assert.deepEqual(waiting.stack.map(f=>({input:f.input,pending:f.pending,left:f.left})),[
    {input:4,pending:'4 × factorial(3)',left:null},
    {input:3,pending:'3 × factorial(2)',left:null},
    {input:2,pending:'check the base case',left:null}
  ]);
  const fibonacci3=examples.get('fibonacci:3');
  assert.deepEqual(fibonacci3.steps.filter(s=>s.event.kind==='return').map(s=>s.event.input),[1,0,2,1,3]);
  const rightChild=fibonacci3.steps.find(s=>s.event.kind==='call'&&s.event.frameId===5);
  assert.deepEqual(rightChild.stack.map(f=>({input:f.input,left:f.left,right:f.right})),[{input:3,left:'1',right:null},{input:1,left:null,right:null}]);
  assert.equal(rightChild.stack[0].pending,'1 + F(1)');
  const naive4=examples.get('fibonacci:4');
  assert.deepEqual(naive4.steps.filter(s=>s.event.kind==='call'&&s.event.input===2).map(s=>s.event.frameId),[3,7]);
  const memo5=examples.get('memo-fibonacci:5');
  assert.deepEqual(memo5.steps.filter(s=>s.event.kind==='call'||s.event.kind==='cache-hit').map(s=>[s.event.input,s.event.kind]),[
    [5,'call'],[4,'call'],[3,'call'],[2,'call'],[1,'call'],[0,'call'],[1,'cache-hit'],[2,'cache-hit'],[3,'cache-hit']
  ]);
  assert.deepEqual(memo5.steps.filter(s=>s.event.kind==='return').map(s=>s.event.frameId),[5,6,4,7,3,8,2,9,1]);
  assert.deepEqual(memo5.steps.filter(s=>s.event.cacheWrite).map(s=>s.event.cacheWrite.input),[1,0,2,3,4,5]);
  report.fixtures={
    factorial3Returns:factorial3.steps.filter(s=>s.event.kind==='return').map(s=>({input:s.event.input,value:s.event.value})),
    factorial4Waiting:waiting,
    fibonacci3SecondChild:rightChild,
    memo5Hits:memo5.steps.filter(s=>s.event.kind==='cache-hit'),
    memo5ReturnIds:memo5.steps.filter(s=>s.event.kind==='return').map(s=>s.event.frameId)
  };
  await passed('hand-derived factorial unwinding, suspended multiplication, sibling Fibonacci state and fresh memo F5 entry/return/cache-write orders agree');

  for(const input of [null,undefined,NaN,Infinity,-Infinity,-1,11,1.5,'5',5n,{},new Number(5)])assert.throws(()=>createTrace('factorial',input));
  for(const text of ['','01','-0','0x2','1e1','10.0','+5','5x','１','1 0','11',null,5])assert.throws(()=>parseInput(text));
  assert.equal(parseInput(' 10\n'),10);assert.equal(parseInput('0'),0);
  for(const index of [-1,factorial3.steps.length,0.5,NaN,'0',null])assert.throws(()=>snapshotAt(factorial3,index));
  assert.throws(()=>snapshotAt(JSON.parse(JSON.stringify(factorial3)),0),'export is not a supported imported engine identity');
  assert.throws(()=>traceDocument({},0));assert.throws(()=>createTrace('__proto__',0));
  await passed('invalid setup/cursor values and cloned/forged trace identities are refused without coercing a new supported run');

  const read=p=>fs.readFile(path.join(SOURCE,p),'utf8');
  const [core,ui,template,html,course,builder]=await Promise.all([
    read('courses/recursion-call-stack-core.mjs'),read('courses/recursion-call-stack-ui.mjs'),
    read('courses/recursion-call-stack-explorer.template.html'),read('courses/recursion-call-stack-explorer.html'),
    read('courses/recursion-call-stack.json'),read('tools/build_recursion_call_stack.mjs')
  ]);
  const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  assert.equal(scripts.length,2,'the standalone artifact has only the course data and one executable module');
  const courseBlock=scripts.find(s=>s[1].includes('id="course-data"'));
  const moduleBlock=scripts.find(s=>s[1].includes('type="module"'));
  assert(courseBlock&&moduleBlock);
  assert.equal(JSON.stringify(JSON.parse(courseBlock[2]),null,2)+'\n',course);
  assert.equal(SHA(Buffer.from(course)),'7a59b4a76f24307e223798bc20006f4f02f755c4163350535fad93aff1002c88');
  const firstNewline=ui.indexOf('\n');
  assert.equal(ui.slice(0,firstNewline),"import {ALGORITHMS, COUNTER_DEFINITIONS, callLabel, createTrace, parseInput, snapshotAt, traceDocument} from './recursion-call-stack-core.mjs';");
  assert.equal(moduleBlock[2].slice(0,core.length+1),'\n'+core);
  assert.equal(moduleBlock[2].slice(core.length+1),'\n'+ui.slice(firstNewline+1));
  const reconstructed=html.replace(courseBlock[0],'<!-- RECURSION_COURSE -->').replace(moduleBlock[0],'<!-- RECURSION_SCRIPT -->');
  assert.equal(reconstructed,template,'removing exact embedded blocks reproduces the full template');
  assert(!/<script\b[^>]*\bsrc\s*=/i.test(html));
  assert(!/<link\b[^>]*\brel=["']?stylesheet/i.test(html));
  assert(!/\b(?:fetch|WebSocket|localStorage|sessionStorage)\s*\(/.test(core+'\n'+ui));
  assert(builder.includes("courseText !== course"));
  assert(builder.includes("script tag."));
  report.artifactBinding={htmlSha256:SHA(Buffer.from(html)),coreSha256:SHA(Buffer.from(core)),uiSha256:SHA(Buffer.from(ui)),templateSha256:SHA(Buffer.from(template)),courseSha256:SHA(Buffer.from(course)),executableScripts:1,dataScripts:1,sourceReconstruction:'exact'};
  await passed('final standalone HTML inversely reconstructs exact template/core/UI and literal canonical course; no external scripts/styles');

  const wires=[
    ["previous","element('previous').addEventListener('click', () => inspect(selectedStep - 1));"],
    ["next","element('next').addEventListener('click', () => inspect(selectedStep + 1));"],
    ["start","element('to-start').addEventListener('click', () => inspect(0));"],
    ["end","element('to-end').addEventListener('click', () => inspectedTrace && inspect(inspectedTrace.steps.length - 1));"],
    ["jump","element('event-jump').addEventListener('change', event => inspect(Number(event.target.value)));"],
    ["prefix returns","inspectedTrace.steps.slice(0, selectedStep + 1).filter(step => step.event.kind === 'return')"],
    ["selected-state export","JSON.stringify(traceDocument(inspectedTrace, selectedStep), null, 2)"],
    ["complete-run comparison","const run = inspectedTrace.algorithm === algorithm ? inspectedTrace : createTrace(algorithm, inspectedTrace.input);"]
  ];
  for(const [name,source]of wires)assert(ui.includes(source),name);
  assert(ui.indexOf('const state = snapshotAt(inspectedTrace, index);')<ui.indexOf('selectedStep = index;'));
  const clearBody=ui.slice(ui.indexOf('function clearTrace('),ui.indexOf('function buildTrace('));
  assert(clearBody.includes('inspectedTrace = null;'));assert(clearBody.includes('selectedStep = 0;'));
  assert(clearBody.includes("'download-trace'"));assert(clearBody.includes("element('comparison').hidden = true"));
  assert(ui.includes("for (const id of ['algorithm', 'input-n'])"));
  assert(ui.includes("clearTrace('Setup changed."));
  assert(template.includes('The trace file contains the full exact trace plus your selected step and displayed state.'));
  assert(template.includes('Previous and Next inspect saved snapshots; Run trace starts a fresh run.'));
  report.uiSourceReview={qualification:'Inspected exact source/control wiring; no independent DOM or rendering run in this gate',verified:wires.map(([name])=>name),setupChangesClearTraceAndDownload:true,fullTraceVersusCursorCopy:true,prefixReturnsVersusCompletedComparison:true};
  await passed('source review binds Previous/Next/reset/jump/download to one immutable cursor and clears edited setups; full-run comparison is separately labeled');

  await verifySource();report.sourceUnchanged=true;report.status='pass';
}catch(error){report.status='fail';report.error={name:error.name,message:error.message,stack:error.stack};process.exitCode=1;console.error(error);}
finally{await save();console.log(JSON.stringify({status:report.status,groups:report.groups.length,snapshots:report.snapshotsInspected,receipt:path.join(ROOT,'receipt.json'),error:report.error?.message}));}
