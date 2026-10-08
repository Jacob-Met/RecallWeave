import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {LIMITS,canonicalScenario,mathematicalHome,referenceRun,stateKey,freezeDeep} from './reference.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const args=process.argv.slice(2);
function option(name){const i=args.indexOf(name);return i<0?null:args[i+1];}
const out=option('--out');if(!out)throw new Error('Usage: node receive-model.mjs --out NEW_DIRECTORY [--module MODEL_PATH] [--corpus FROZEN_CORPUS]');
const modelPath=option('--module'),corpusPath=option('--corpus');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const objectBlob=b=>crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
fs.mkdirSync(out,{mode:0o700});
const witnessBytes=fs.readFileSync(path.join(root,'independent-witnesses.json'));
const witnesses=JSON.parse(witnessBytes);
let currentCase=null;
const receipt={schema:'recallweave.hash-tables.independent-model-receiving.v1',started:new Date().toISOString(),status:'running',mode:modelPath?'candidate':'independent-reference-only',reference:{path:path.join(root,'reference.mjs'),sha256:sha(fs.readFileSync(path.join(root,'reference.mjs')))},receiver:{path:fileURLToPath(import.meta.url),sha256:sha(fs.readFileSync(fileURLToPath(import.meta.url)))},witnesses:{bytes:witnessBytes.length,sha256:sha(witnessBytes)},primary_expected_values:'Frozen before candidate inspection; BigInt modular permutation plus first-empty prefix selection, independently checked against abstract set semantics.',counts:{witnesses:0,reference_cases:0,candidate_cases:0,validation_controls:0,home_index_checks:0},failures:[]};
function write(name,value){const b=Buffer.from(JSON.stringify(value,null,2)+'\n');fs.writeFileSync(path.join(out,name),b,{flag:'wx',mode:0o600});return{path:name,bytes:b.length,sha256:sha(b)};}
function simpleSlots(slots){return slots.map(s=>s.kind==='occupied'?s.key:s.kind==='empty'?null:'deleted');}
function simpleOperations(result){return result.operations.map(r=>[r.status,r.index,r.probes.map(p=>p.index)]);}
function selfWitnesses(){
  for(const w of witnesses){currentCase='hand-witness:'+w.name;const scenario={capacity:w.capacity,operations:w.operations.map(([type,key])=>({type,key}))},expected=referenceRun(scenario);
    assert.deepEqual(simpleOperations(expected),w.expected.map(([status,index,probes])=>[status==='missing'?'absent':status,index,probes]),w.name);
    assert.deepEqual(simpleSlots(expected.finalSlots),w.final,w.name);receipt.counts.witnesses++;
  }
}
function makeCorpus(){
  const rows=[],metadata={capacity3:{alphabet:[0,3,6,1],states:0,edges:0,max_shortest_history:0,unexpanded_depth_bound_states:0},capacities:[]};
  for(const w of witnesses)rows.push({id:'witness:'+w.name,scenario:{capacity:w.capacity,operations:w.operations.map(([type,key])=>({type,key}))}});
  const queue=[[]],seen=new Set([stateKey(referenceRun({capacity:3,operations:[]}).finalSlots)]);
  for(let at=0;at<queue.length;at++){
    const history=queue[at];metadata.capacity3.max_shortest_history=Math.max(metadata.capacity3.max_shortest_history,history.length);
    if(history.length>=24){metadata.capacity3.unexpanded_depth_bound_states++;continue;}
    for(const type of ['insert','find','delete'])for(const key of metadata.capacity3.alphabet){
      const operations=[...history,{type,key}],scenario={capacity:3,operations},result=referenceRun(scenario);
      rows.push({id:'reachable-state-'+at+':'+type+':'+key,scenario});metadata.capacity3.edges++;
      const id=stateKey(result.finalSlots);if(!seen.has(id)){seen.add(id);queue.push(operations);}
    }
  }
  metadata.capacity3.states=seen.size;
  assert.equal(metadata.capacity3.unexpanded_depth_bound_states,0,'finite state exploration must be complete before the operation limit');
  let seed=0x77e137;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
  for(let capacity=3;capacity<=17;capacity++){
    metadata.capacities.push(capacity);
    rows.push({id:'empty:'+capacity,scenario:{capacity,operations:[]}});
    for(let variant=0;variant<4;variant++){
      const home=[capacity-1,0,Math.floor(capacity/2),1][variant],base=home-capacity;
      const operations=[{type:'insert',key:base},{type:'insert',key:base+capacity},{type:'delete',key:base},{type:'find',key:base+capacity},{type:'insert',key:base+2*capacity}];
      while(operations.length<24){
        const type=['insert','find','delete'][random()%3],live=referenceRun({capacity,operations}).finalSlots.filter(s=>s.kind==='occupied').map(s=>s.key);
        const pool=[-9999,9999,-1,0,1,base,base+capacity,base+2*capacity];
        const key=live.length&&random()%2?live[random()%live.length]:pool[random()%pool.length];
        operations.push({type,key});
      }
      rows.push({id:'signed-mixed:'+capacity+':'+variant,scenario:{capacity,operations}});
    }
  }
  for(const row of rows){const expected=referenceRun(row.scenario);row.expectedSha256=sha(JSON.stringify(expected));}
  return{schema:'recallweave.hash-tables.independent-frozen-corpus.v1',referenceSha256:receipt.reference.sha256,witnessesSha256:receipt.witnesses.sha256,metadata,cases:rows};
}
function badRun(scenario,mode){
  let slots=Array.from({length:scenario.capacity},()=>({kind:'empty'}));const operations=[];
  for(const operation of scenario.operations){
    const before=structuredClone(slots),home=mathematicalHome(operation.key,scenario.capacity),probes=[];let tomb=null,hit=null,empty=null,early=null;
    for(let offset=0;offset<scenario.capacity;offset++){
      const raw=home+offset;if(mode==='omit-wraparound'&&raw>=scenario.capacity)break;
      const index=raw%scenario.capacity,slot=slots[index];probes.push(index);
      if(slot.kind==='occupied'&&slot.key===operation.key){hit=index;break;}
      if(slot.kind==='empty'){empty=index;break;}
      if(slot.kind==='deleted'&&tomb===null){
        tomb=index;
        if(mode==='reuse-before-duplicate'&&operation.type==='insert'){early=index;break;}
      }
    }
    let status,index=null;
    if(hit!==null){index=hit;status=operation.type==='insert'?'present':operation.type==='find'?'found':'deleted';}
    else if(operation.type==='insert'){index=early!==null?early:tomb!==null?tomb:empty;status=index===null?'full':'inserted';}
    else status='absent';
    if(status==='inserted')slots[index]={kind:'occupied',key:operation.key};
    if(status==='deleted')slots[index]={kind:mode==='empty-on-delete'?'empty':'deleted'};
    operations.push({status,index,probes,after:structuredClone(slots),before});
  }
  return operations;
}
function faultControls(){
  const modes=[['empty-on-delete',witnesses[0]],['reuse-before-duplicate',witnesses[0]],['omit-wraparound',witnesses[1]]];
  const controls=modes.map(([mode,w])=>{
    const scenario={capacity:w.capacity,operations:w.operations.map(([type,key])=>({type,key}))},expected=referenceRun(scenario),bad=badRun(scenario,mode);
    const first=bad.findIndex((r,i)=>JSON.stringify({status:r.status,index:r.index,probes:r.probes,after:r.after})!==JSON.stringify({status:expected.operations[i].status,index:expected.operations[i].index,probes:expected.operations[i].probes.map(x=>x.index),after:expected.operations[i].after}));
    assert.ok(first>=0,'fault must be rejected: '+mode);
    return{mode,witness:w.name,rejected:true,first_divergence_operation:first,expected:{status:expected.operations[first].status,index:expected.operations[first].index,probes:expected.operations[first].probes.map(x=>x.index),after:expected.operations[first].after},fault_observation:bad[first]};
  });
  return{schema:'recallweave.hash-tables.independent-receiver-controls.v1',scope:'Intentional defects in a separate bounded reference subject; none is a product-candidate failure.',controls};
}
function deepFrozen(value,seen=new Set()){
  if(value&&typeof value==='object'&&!seen.has(value)){seen.add(value);assert.equal(Object.isFrozen(value),true,'returned value must be deeply frozen');for(const key of Reflect.ownKeys(value))deepFrozen(value[key],seen);}
}
function validationCases(){
  const good=()=>({capacity:3,operations:[{type:'insert',key:0}]});
  const cases=[
    ['root null',()=>null,TypeError,[]],['root array',()=>[],TypeError,[]],['root Date',()=>new Date(0),TypeError,[]],
    ['root custom prototype',()=>Object.assign(Object.create({}),good()),TypeError,[]],
    ['missing capacity',()=>({operations:[]}),TypeError,['capacity']],
    ['missing operations',()=>({capacity:3}),TypeError,['operations']],
    ['extra root key',()=>({...good(),extra:0}),TypeError,[]],
    ['extra root symbol',()=>({...good(),[Symbol('extra')]:0}),TypeError,[]],
    ['operations nonarray',()=>({capacity:3,operations:{}}),TypeError,['operations']],
    ['sparse operations',()=>({capacity:3,operations:new Array(1)}),TypeError,['operations']],
    ['operation null',()=>({capacity:3,operations:[null]}),TypeError,['operations']],
    ['operation array',()=>({capacity:3,operations:[[]]}),TypeError,['operations']],
    ['operation custom prototype',()=>({capacity:3,operations:[Object.assign(Object.create({}),{type:'insert',key:0})]}),TypeError,['operations']],
    ['extra operation key',()=>({capacity:3,operations:[{type:'insert',key:0,extra:0}]}),TypeError,['operations']],
    ['extra operation symbol',()=>({capacity:3,operations:[{type:'insert',key:0,[Symbol('extra')]:0}]}),TypeError,['operations']],
    ['missing operation type',()=>({capacity:3,operations:[{key:0}]}),TypeError,['operations']],
    ['missing operation key',()=>({capacity:3,operations:[{type:'insert'}]}),TypeError,['operations']],
    ['unknown operation',()=>({capacity:3,operations:[{type:'upsert',key:0}]}),TypeError,['type']],
    ['too many operations',()=>({capacity:3,operations:Array.from({length:25},()=>({type:'find',key:0}))}),RangeError,['operations']]
  ];
  for(const value of ['3',true,null,undefined,NaN,Infinity,-Infinity,3.5])cases.push(['capacity type '+String(value),()=>({capacity:value,operations:[]}),TypeError,['capacity']]);
  for(const value of [2,18,-1])cases.push(['capacity range '+value,()=>({capacity:value,operations:[]}),RangeError,['capacity']]);
  for(const value of ['0',true,null,undefined,NaN,Infinity,-Infinity,0.5])cases.push(['key type '+String(value),()=>({capacity:3,operations:[{type:'find',key:value}]}),TypeError,['key']]);
  for(const value of [-10000,10000])cases.push(['key range '+value,()=>({capacity:3,operations:[{type:'find',key:value}]}),RangeError,['key']]);
  return cases;
}
try{
  selfWitnesses();
  receipt.receiver_controls=write('receiver-controls.json',faultControls());
  const corpus=corpusPath?JSON.parse(fs.readFileSync(corpusPath)):makeCorpus();
  assert.equal(corpus.referenceSha256,receipt.reference.sha256,'reference changed after corpus freeze');
  assert.equal(corpus.witnessesSha256,receipt.witnesses.sha256,'witnesses changed after corpus freeze');
  const expected=[];
  for(const row of corpus.cases){currentCase='reference:'+row.id;const result=referenceRun(row.scenario);assert.equal(sha(JSON.stringify(result)),row.expectedSha256,row.id);expected.push(result);receipt.counts.reference_cases++;}
  receipt.corpus=write('corpus.json',corpus);receipt.coverage=corpus.metadata;
  if(modelPath){
    const moduleBytes=fs.readFileSync(modelPath);receipt.candidate={path:path.resolve(modelPath),bytes:moduleBytes.length,sha256:sha(moduleBytes),gitBlob:objectBlob(moduleBytes)};
    const candidate=await import(pathToFileURL(path.resolve(modelPath)).href);
    assert.deepEqual(candidate.LIMITS,LIMITS,'public limits');
    for(let i=0;i<corpus.cases.length;i++){
      const row=corpus.cases[i];currentCase='candidate:'+row.id;
      const input=freezeDeep(structuredClone(row.scenario)),before=JSON.stringify(input);
      const canonical=candidate.validateScenario(input);assert.deepEqual(canonical,expected[i].scenario,row.id+' canonical scenario');deepFrozen(canonical);assert.notEqual(canonical,input,'canonical copy aliases caller');
      const result=candidate.runScenario(input);assert.deepEqual(result,expected[i],row.id);deepFrozen(result);assert.equal(JSON.stringify(input),before,'input mutated');
      if(i<witnesses.length)assert.deepEqual(candidate.runScenario(input),result,'repeatability '+row.id);
      receipt.counts.candidate_cases++;
    }
    for(const [label,make,Type,fragments]of validationCases()){
      currentCase='admission:'+label;const value=make();let caught=null;try{candidate.validateScenario(value);}catch(error){caught=error;}
      assert.ok(caught instanceof Type,label+' expected '+Type.name);for(const fragment of fragments)assert.ok(caught.message.toLowerCase().includes(fragment.toLowerCase()),label+' field path');
      let runCaught=null;try{candidate.runScenario(make());}catch(error){runCaught=error;}assert.ok(runCaught instanceof Type,label+' runScenario expected '+Type.name);
      receipt.counts.validation_controls++;
    }
    const nullObject=Object.assign(Object.create(null),{capacity:3,operations:[Object.assign(Object.create(null),{type:'insert',key:-0})]});
    const expectedNull=canonicalScenario(nullObject),actualNull=candidate.validateScenario(nullObject);assert.deepEqual(actualNull,expectedNull);deepFrozen(actualNull);assert.equal(Object.is(actualNull.operations[0].key,-0),false);assert.deepEqual(candidate.runScenario(nullObject),referenceRun(nullObject));
    receipt.counts.validation_controls++;
    for(let capacity=3;capacity<=17;capacity++)for(const key of [-9999,-capacity-1,-capacity,-1,-0,0,1,capacity-1,capacity,capacity+1,9999]){
      currentCase='home:'+key+':'+capacity;const actual=candidate.homeIndex(key,capacity);assert.equal(actual,mathematicalHome(key,capacity));assert.equal(Object.is(actual,-0),false);receipt.counts.home_index_checks++;
    }
    for(const [key,capacity,Type]of [[10000,3,RangeError],[-10000,3,RangeError],[0,2,RangeError],[0,18,RangeError],['0',3,TypeError],[NaN,3,TypeError],[0,3.5,TypeError],[0,'3',TypeError]]){
      assert.throws(()=>candidate.homeIndex(key,capacity),Type);receipt.counts.home_index_checks++;
    }
    assert.equal(sha(fs.readFileSync(modelPath)),receipt.candidate.sha256,'candidate changed during receiving');
  }
  currentCase=null;receipt.status='accepted';
}catch(error){
  receipt.status='rejected';receipt.failures.push({case:currentCase,name:error.name,message:error.message,stack:error.stack});
}finally{
  receipt.finished=new Date().toISOString();const record=write('receipt.json',receipt);console.log(JSON.stringify({status:receipt.status,counts:receipt.counts,coverage:receipt.coverage,receipt:record,first_failure:receipt.failures[0]?.case}));if(receipt.status!=='accepted')process.exitCode=1;
}
