/**
 * Independent receiving driver, written from the frozen contract/public DTO.
 * Does not import producer tests or a keyed course.
 * Usage: node independent-core-review.mjs EXACT_CORE_MODULE NEW_OUTPUT_JSON
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {expectedInsertion,expectedStableOrder,expectedSelectionComparisons,vectors} from './independent-oracles.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const [sourcePath,outputPath]=process.argv.slice(2);
assert(sourcePath&&outputPath&&path.isAbsolute(sourcePath)&&path.isAbsolute(outputPath));
assert(!fs.existsSync(outputPath),'new result path');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const sourceBytes=fs.readFileSync(sourcePath);
const sourceHash=sha(sourceBytes);
const {buildSortingComparison:build}=await import(pathToFileURL(sourcePath).href);
assert.equal(typeof build,'function');
const checks=[];
function run(name,fn){
 try{const details=fn();checks.push({name,status:'pass',...details});console.log(JSON.stringify({name,status:'pass'}));}
 catch(error){checks.push({name,status:'fail',error:error.stack||String(error)});console.log(JSON.stringify({name,status:'fail',error:error.message}));}
}
const clone=x=>JSON.parse(JSON.stringify(x));
function records(keys,labels){return keys.map((key,index)=>({key,label:labels?.[index]??'Record '+(index+1)}));}
function ids(list){return list.map(r=>r.id);}
function positions(list){return list.map(r=>r.originalPosition-1);}
function immutable(value,seen=new Set()){
 if(value===null||typeof value!=='object'||seen.has(value))return;
 seen.add(value);assert(Object.isFrozen(value),'reachable object is frozen');
 for(const key of Reflect.ownKeys(value)){
  const d=Object.getOwnPropertyDescriptor(value,key);
  assert('value' in d,'output has data fields');
  immutable(d.value,seen);
 }
}
function recordCustody(list,original){
 assert(Array.isArray(list));assert.equal(list.length,original.length);
 assert.deepEqual([...positions(list)].sort((a,b)=>a-b),original.map((_,i)=>i));
 assert.equal(new Set(ids(list)).size,original.length);
 for(const record of list){
  const index=record.originalPosition-1;
  assert.equal(record.id,'record-'+record.originalPosition,'generated position identity');
  assert(record.key===original[index].key,'whole key remains attached (zero signs are ordering equivalent)');
  assert.equal(record.label,original[index].label,'whole label remains attached');
 }
}
function tieFacts(original,final){
 const keys=[...new Set(original.map(r=>r.key))];
 return keys.map(key=>({
  key,inputIds:original.flatMap((r,i)=>r.key===key?['record-'+(i+1)]:[]),
  outputIds:final.filter(r=>r.key===key).map(r=>r.id)
 })).filter(g=>g.inputIds.length>1).map(g=>({...g,preserved:JSON.stringify(g.inputIds)===JSON.stringify(g.outputIds)}));
}
function qualify(comparison,original){
 assert.equal(comparison.schema,'recallweave-sorting-comparison/1');
 immutable(comparison);
 recordCustody(comparison.input,original);
 assert.deepEqual(positions(comparison.input),original.map((_,i)=>i));
 for(const key of ['direction','insertion','selection','comparison','exchange','countMeaning','exportMeaning'])
  assert.equal(typeof comparison.rules[key],'string','declared rule '+key);
 const sortedKeys=original.map(x=>x.key).sort((a,b)=>a-b);
 for(const name of ['insertion','selection']){
  const algorithm=comparison.algorithms[name];
  assert.equal(algorithm.guaranteedStable,name==='insertion');
  recordCustody(algorithm.finalRecords,original);
  assert.deepEqual(algorithm.finalRecords.map(x=>x.key===0?0:x.key),sortedKeys.map(x=>x===0?0:x));
  if(name==='insertion'){
   assert.deepEqual(positions(algorithm.finalRecords),expectedStableOrder(original.map(x=>x.key)));
   assert.deepEqual(algorithm.counts,expectedInsertion(original.map(x=>x.key)));
  }else assert.equal(algorithm.counts.comparisons,expectedSelectionComparisons(original.length));
  const facts=tieFacts(original,algorithm.finalRecords);
  assert.equal(algorithm.observedStable,facts.length?facts.every(g=>g.preserved):null);
  assert.equal(algorithm.tieGroups.length,facts.length);
  for(const fact of facts){
   const actual=algorithm.tieGroups.find(g=>g.key===fact.key);
   assert(actual,'one group for each duplicated key');
   assert.deepEqual(actual.inputIds,fact.inputIds);assert.deepEqual(actual.outputIds,fact.outputIds);assert.equal(actual.preserved,fact.preserved);
  }
  assert(Array.isArray(algorithm.steps)&&algorithm.steps.length>=2);
  assert.equal(algorithm.steps[0].kind,'initial');assert.equal(algorithm.steps.at(-1).kind,'complete');
  const passStates=[];
  for(const [index,step]of algorithm.steps.entries()){
   assert.equal(step.index,index);assert.equal(typeof step.message,'string');
   assert(['initial','compare','exchange','pass-complete','complete'].includes(step.kind));
   recordCustody(step.records,original);
   assert(Number.isInteger(step.sortedPrefix)&&step.sortedPrefix>=0&&step.sortedPrefix<=original.length);
   for(let j=1;j<step.sortedPrefix;j++)assert(step.records[j-1].key<=step.records[j].key,'declared sorted prefix is sorted');
   for(const field of ['comparisons','exchanges'])assert(Number.isInteger(step.counts[field])&&step.counts[field]>=0);
   if(index===0){assert.deepEqual(step.counts,{comparisons:0,exchanges:0});assert.deepEqual(positions(step.records),original.map((_,i)=>i));continue;}
   const prior=algorithm.steps[index-1];
   const compareIncrement=step.kind==='compare'?1:0,exchangeIncrement=step.kind==='exchange'?1:0;
   assert.equal(step.counts.comparisons,prior.counts.comparisons+compareIncrement,'one key decision per compare state');
   assert.equal(step.counts.exchanges,prior.counts.exchanges+exchangeIncrement,'one distinct-position exchange per exchange state');
   if(step.kind==='compare'){
    const c=step.comparison;
    assert(c&&Number.isInteger(c.leftIndex)&&Number.isInteger(c.rightIndex));
    assert(c.leftIndex>=0&&c.leftIndex<original.length&&c.rightIndex>=0&&c.rightIndex<original.length);
    assert.notEqual(c.leftIndex,c.rightIndex);
    assert.equal(c.leftId,step.records[c.leftIndex].id);assert.equal(c.rightId,step.records[c.rightIndex].id);
    const left=step.records[c.leftIndex].key,right=step.records[c.rightIndex].key;
    assert.equal(c.result,left<right?'less':left>right?'greater':'equal','comparison narration matches left versus right key');
    if(name==='insertion')assert.equal(Math.abs(c.leftIndex-c.rightIndex),1,'insertion compares immediate neighbors');
   }
   if(step.kind==='exchange'){
    const e=step.exchange;assert(e&&Array.isArray(e.indices)&&e.indices.length===2);
    const [a,b]=e.indices;assert(Number.isInteger(a)&&a>=0&&a<original.length);assert(Number.isInteger(b)&&b>=0&&b<original.length);assert.notEqual(a,b);
    assert.deepEqual(e.idsBefore,[prior.records[a].id,prior.records[b].id]);
    const next=ids(prior.records);[next[a],next[b]]=[next[b],next[a]];
    assert.deepEqual(ids(step.records),next,'only the declared two whole records exchange');
    if(name==='insertion'){
     assert.equal(Math.abs(a-b),1);
     const left=Math.min(a,b),right=Math.max(a,b);
     assert(prior.records[left].key>prior.records[right].key,'insertion exchanges only a strict inversion');
    }
   }else assert.deepEqual(ids(step.records),ids(prior.records),'non-exchange states preserve order');
   if(step.kind==='pass-complete'){
    assert(Number.isInteger(step.pass)&&step.pass>=1&&step.pass<original.length);
    passStates.push(step.pass);
    const prefix=name==='insertion'?step.pass+1:step.pass;
    assert(step.sortedPrefix>=prefix,'completed pass reports its proved prefix');
    if(name==='insertion'){
     assert.deepEqual(positions(step.records.slice(0,prefix)).sort((a,b)=>a-b),Array.from({length:prefix},(_,i)=>i));
    }else assert.deepEqual(step.records.slice(0,prefix).map(x=>x.key===0?0:x.key),sortedKeys.slice(0,prefix).map(x=>x===0?0:x));
   }
  }
  assert.deepEqual(passStates,Array.from({length:original.length-1},(_,i)=>i+1),'one completed state per declared pass');
  assert.deepEqual(algorithm.steps.at(-1).records,algorithm.finalRecords);
  assert.deepEqual(algorithm.steps.at(-1).counts,algorithm.counts);
  assert.equal(algorithm.steps.at(-1).sortedPrefix,original.length);
 }
}
const worked=JSON.parse(fs.readFileSync(path.join(here,'worked-cases.json'),'utf8')).cases;
for(const example of worked)run('worked '+example.name,()=>{
 const input=records(example.keys,example.labels);
 for(const index of example.negativeZeroAtIndices??[])input[index].key=-0;
 const comparison=build(input);qualify(comparison,input);
 for(const name of ['insertion','selection']){
  assert.deepEqual(positions(comparison.algorithms[name].finalRecords),example[name+'Order']);
  assert.deepEqual(comparison.algorithms[name].counts,{comparisons:example[name+'Counts'][0],exchanges:example[name+'Counts'][1]});
 }
 return{keys:example.keys,expectedInsertion:example.insertionCounts,expectedSelection:example.selectionCounts};
});
run('exhaustive 1089 inputs with independent inversion and final-order oracle',()=>{
 let count=0;
 for(let n=2;n<=6;n++)for(const keys of vectors(n)){
  const input=records(keys,keys.map(()=> 'same'));
  try{qualify(build(input),input);}catch(error){error.message='keys='+JSON.stringify(keys)+' '+error.message;throw error;}
  count++;
 }
 assert.equal(count,1089);return{vectors:count,alphabet:[-1,0,1],lengths:[2,3,4,5,6]};
});
run('exact permitted label/key boundaries, null prototypes and nonenumerable data',()=>{
 const input=[Object.assign(Object.create(null),{key:-99,label:'  Literal <img src=x>  '}),{key:99,label:'😀'.repeat(16)}];
 qualify(build(input),input);
 const nonenumerable=Array(2);
 for(let index=0;index<2;index++){
  const record={};Object.defineProperties(record,{key:{value:index,enumerable:false},label:{value:'Hidden '+index,enumerable:false}});
  Object.defineProperty(nonenumerable,String(index),{value:record,enumerable:false});
 }
 qualify(build(nonenumerable),nonenumerable);
 const bothZeros=records([-0,+0]);qualify(build(bothZeros),bothZeros);
 return{nullPrototypeAccepted:true,requiredNonenumerableFieldsAccepted:true,nonenumerableSlotsAccepted:true,maximumUtf16Units:32};
});
run('reject malformed top-level, sparse, missing and extra data shapes',()=>{
 const invalid=[null,undefined,{},'12',[],records([1]),records(Array(9).fill(0)),new Int8Array([1,2])];
 const hole=records([1,2]);delete hole[1];invalid.push(hole);
 const inherited=Array(2);inherited[0]={key:1,label:'Own'};const proto=Object.create(Array.prototype);proto[1]={key:2,label:'Inherited'};Object.setPrototypeOf(inherited,proto);invalid.push(inherited);
 for(const record of [{label:'No key'},{key:1},{key:1,label:'Valid',extra:true},Object.create({key:1,label:'Inherited'})]){
  invalid.push([record,{key:2,label:'Other'}]);
 }
 const hiddenExtra={key:1,label:'Hidden extra'};Object.defineProperty(hiddenExtra,'extra',{value:1});invalid.push([hiddenExtra,{key:2,label:'Other'}]);
 const symbolExtra={key:1,label:'Symbol extra',[Symbol('extra')]:1};invalid.push([symbolExtra,{key:2,label:'Other'}]);
 for(const input of invalid)assert.throws(()=>build(input));
 return{invalidInputs:invalid.length};
});
run('accessor fields and array slots rejected before getter invocation',()=>{
 let calls=0;const getter=()=>{calls++;return 1;};
 const byKey={label:'Accessor key'};Object.defineProperty(byKey,'key',{get:getter,enumerable:true});
 const byLabel={key:1};Object.defineProperty(byLabel,'label',{get(){calls++;return 'Accessor label';},enumerable:true});
 const bySlot=Array(2);bySlot[0]={key:0,label:'Own'};Object.defineProperty(bySlot,'1',{get(){calls++;return{key:1,label:'Accessor slot'};},enumerable:true});
 for(const input of [[byKey,{key:2,label:'Other'}],[byLabel,{key:2,label:'Other'}],bySlot])assert.throws(()=>build(input));
 assert.equal(calls,0);return{inputs:3,getterCalls:calls};
});
run('numeric admission rejects nonprimitive, nonfinite, fraction and range errors',()=>{
 const bad=[NaN,Infinity,-Infinity,-100,100,0.5,-0.5,'1',true,false,null,undefined,1n,new Number(1)];
 for(const key of bad)assert.throws(()=>build([{key,label:'Invalid key'},{key:1,label:'Other'}]));
 return{invalidKeys:bad.length};
});
run('label admission rejects blanks, nonstrings, all C0/C1 controls and malformed UTF16',()=>{
 const bad=['',' ','\t','\u00a0','\ud800','\udc00','a\ud800b','\ud800\ud800','😀'.repeat(17),null,undefined,3,true,new String('Boxed')];
 for(let code=0;code<=31;code++)bad.push('A'+String.fromCharCode(code)+'B');
 for(let code=128;code<=159;code++)bad.push('A'+String.fromCharCode(code)+'B');
 for(const label of bad)assert.throws(()=>build([{key:1,label},{key:0,label:'Other'}]));
 return{invalidLabels:bad.length};
});
run('caller/output custody and deterministic complete traces',()=>{
 const input=records([2,2,1],[' duplicate ',' duplicate ','<literal>']);
 const comparison=build(input),saved=JSON.stringify(comparison);
 qualify(comparison,input);
 input[0].label='Changed caller';input[0].key=99;input.push({key:-99,label:'New caller'});
 assert.equal(JSON.stringify(comparison),saved);
 const fresh=records([2,2,1],[' duplicate ',' duplicate ','<literal>']);
 for(const record of fresh)Object.freeze(record);Object.freeze(fresh);
 const frozenBuild=build(fresh);qualify(frozenBuild,fresh);
 assert.equal(JSON.stringify(frozenBuild),saved,'pure deterministic replay for identical input');
 assert.throws(()=>{frozenBuild.input[0].label='Changed output';},TypeError);
 assert.throws(()=>frozenBuild.algorithms.insertion.steps.push({}),TypeError);
 assert.equal(JSON.stringify(frozenBuild),saved);
 return{callerDetached:true,callerFrozenAccepted:true,outputRecursivelyFrozen:true,deterministic:true};
});
const result={
 schema:'chatgpt.independent-sorting-core-review.v1',recordedAt:new Date().toISOString(),node:process.version,
 sourcePath,sourceSha256:sourceHash,sourceBytes:sourceBytes.length,
 driverSha256:sha(fs.readFileSync(fileURLToPath(import.meta.url))),
 blindFreezeSha256:sha(fs.readFileSync(path.join(here,'blind-freeze.json'))),
 testsAuthoredBeforeSourceAccess:true,authorTestsRead:false,
 checks,passed:checks.filter(x=>x.status==='pass').length,failed:checks.filter(x=>x.status==='fail').length,
 sourcePreserved:sha(fs.readFileSync(sourcePath))===sourceHash,
 boundary:'Exact native pure-core receiving only. Browser, course content/key, learner and later-parent acceptance are separate.'
};
result.status=result.failed===0&&result.passed===23&&result.sourcePreserved?'pass':'fail';
fs.writeFileSync(outputPath,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:result.status,passed:result.passed,failed:result.failed,outputPath,sourceSha256:sourceHash}));
process.exitCode=result.status==='pass'?0:1;
