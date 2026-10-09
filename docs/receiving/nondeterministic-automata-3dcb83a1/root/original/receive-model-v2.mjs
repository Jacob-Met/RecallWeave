import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import os from 'node:os';
import {pathToFileURL,fileURLToPath} from 'node:url';
const ROOT=String.raw`C:\Users\jacob\recallweave-nfa-independent-3dcb83a1`;
const SOURCE=String.raw`C:\Users\jacob\recallweave-nfa-3dcb83a1\source\src\nondeterministic-automata.mjs`;
const EXPECTED='9ea57582393415ed0b0590d9f4f72d9268a731c81837a54a1288c877bf421b6b';
const OUT=path.join(ROOT,'model-receiving-v2');
const report={schema:'recallweave.root-independent-nfa-model.v1',started:new Date().toISOString(),pid:process.pid,cases:[],no_random_generation:true,no_browser_execution:true};
function pin(file){const b=fs.readFileSync(file);return{bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex'),git_blob:crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex')}}
function clone(x){return structuredClone(x)}
function freeze(x){if(x&&typeof x==='object'){for(const v of Object.values(x))freeze(v);Object.freeze(x)}return x}
function canonical(m){return{...clone(m),accepting:[...m.accepting].sort((a,b)=>a-b),transitions:m.transitions.map(r=>({zero:[...r.zero].sort((a,b)=>a-b),one:[...r.one].sort((a,b)=>a-b),epsilon:[...r.epsilon].sort((a,b)=>a-b)}))}}
function closure(m,seeds){const reached=new Set(seeds),todo=[...seeds];for(let j=0;j<todo.length;j++)for(const q of m.transitions[todo[j]].epsilon)if(!reached.has(q)){reached.add(q);todo.push(q)}return[...reached].sort((a,b)=>a-b)}
function configurations(m,word){
 const reached=new Set([m.start+':0']),todo=[[m.start,0]],active=Array.from({length:word.length+1},()=>new Set());
 for(let j=0;j<todo.length;j++){
  const[q,i]=todo[j];active[i].add(q);
  const next=m.transitions[q].epsilon.map(t=>[t,i]);
  if(i<word.length)for(const t of m.transitions[q][word[i]==='0'?'zero':'one'])next.push([t,i+1]);
  for(const[t,k]of next){const key=t+':'+k;if(!reached.has(key)){reached.add(key);todo.push([t,k])}}
 }
 return active.map(s=>[...s].sort((a,b)=>a-b));
}
function oracleTrace(m,word){
 const active=configurations(m,word),accepting=s=>s.some(q=>m.accepting.includes(q));
 const steps=active.map((a,i)=>{
  let moved=[m.start];
  if(i){const raw=new Set();for(const q of active[i-1])for(const t of m.transitions[q][word[i-1]==='0'?'zero':'one'])raw.add(t);moved=[...raw].sort((a,b)=>a-b)}
  return{index:i,prefix:word.slice(0,i),symbol:i?word[i-1]:null,moved,active:a,accepting:accepting(a)}
 });
 return{word,steps,accepted:accepting(active.at(-1))};
}
function words(max){const result=[''];for(let n=1;n<=max;n++)for(let bits=0;bits<2**n;bits++)result.push(bits.toString(2).padStart(n,'0'));return result}
function group(id,run){const record={id,passed:false};try{run(record);record.passed=true}catch(e){record.error={name:e.name,message:e.message,stack:e.stack}}report.cases.push(record)}
fs.mkdirSync(OUT,{recursive:false});
try{
 assert.equal(process.version,'v24.14.0');
 assert.equal(pin(process.execPath).sha256,'63c259c81e5d472b5f11c8d506070130cb04a1ecf84b80377a34ed6ec9048088');
 const disk=fs.statfsSync(ROOT,{bigint:true});assert(os.freemem()>=2*1024**3&&disk.bavail*disk.bsize>=8n*1024n**3n);
 report.guard={node:process.version,executable:process.execPath,runtime:pin(process.execPath),available_memory:os.freemem(),disk_available:Number(disk.bavail*disk.bsize)};
 report.receiver=pin(fileURLToPath(import.meta.url));report.contract=pin(path.join(ROOT,'contract.json'));report.source_before=pin(SOURCE);
 assert.equal(report.source_before.sha256,EXPECTED);
 const contract=JSON.parse(fs.readFileSync(path.join(ROOT,'contract.json'),'utf8'));
 assert.equal(contract.schema,'recallweave-root-independent-epsilon-nfa-contract.v1');
 const nfa=await import(pathToFileURL(SOURCE).href);
 for(const name of ['admitMachine','epsilonClosure','trace','determinize','analyze'])assert.equal(typeof nfa[name],'function',name);
 const allWords=[...words(9),'0'.repeat(24),'1'.repeat(24),'01'.repeat(12)];
 for(const c of contract.cases)group(c.id,record=>{
  const m=freeze(clone(c.machine)),before=JSON.stringify(m),expectedMachine=canonical(m);
  const admitted=nfa.admitMachine(m);assert.deepEqual(admitted,expectedMachine);assert.notEqual(admitted,m);assert.notEqual(admitted.transitions,m.transitions);
  for(let i=0;i<m.states;i++)for(const key of ['zero','one','epsilon'])assert.notEqual(admitted.transitions[i][key],m.transitions[i][key]);
  assert.deepEqual(nfa.determinize(m),c.literalExpectedDfa);
  const seeds=m.start===m.states-1?[m.start]:[m.states-1,m.start];assert.deepEqual(nfa.epsilonClosure(m,freeze(seeds)),closure(m,seeds));
  const outputHash=crypto.createHash('sha256');let count=0,prefixes=0;
  for(const word of allWords){
   record.current_word=word;
   const wanted=oracleTrace(m,word),trace=nfa.trace(m,word),analysis=nfa.analyze(m,word);
   assert.deepEqual(trace,wanted);
   let state='D0';const dfaPath=[state];
   for(const a of word){state=c.literalExpectedDfa.states[Number(state.slice(1))][a==='0'?'zero':'one'];dfaPath.push(state)}
   assert.deepEqual(analysis,{format:'recallweave-nfa-analysis/1',machine:expectedMachine,word,nfa:wanted,dfa:c.literalExpectedDfa,dfaPath,accepted:wanted.accepted});
   assert.equal(wanted.accepted,c.literalExpectedDfa.states[Number(state.slice(1))].accepting);
   outputHash.update(JSON.stringify(analysis)+'\n');count++;prefixes+=wanted.steps.length;
  }
  delete record.current_word;assert.equal(JSON.stringify(m),before);
  record.words_checked=count;record.prefixes_checked=prefixes;record.complete_dfa_states=c.literalExpectedDfa.states.length;record.all_analysis_sha256=outputHash.digest('hex');
 });
 const valid=clone(contract.cases[4].machine);valid.transitions[0].zero=[2,1];valid.accepting=[4,1];
 group('canonical-copy-and-mutation',record=>{
  const before=JSON.stringify(valid),a=nfa.admitMachine(freeze(valid));assert.deepEqual(a,canonical(valid));
  assert.notEqual(a.accepting,valid.accepting);assert.notEqual(a.transitions[0].zero,valid.transitions[0].zero);
  for(const attempt of [()=>a.accepting.push(0),()=>a.transitions[0].zero.push(4)]){try{attempt()}catch(e){assert(e instanceof TypeError)}}
  assert.equal(JSON.stringify(valid),before);
  record.canonical_copy_verified=true;
 });
 const base=clone(contract.cases[0].machine);
 const mutations=[
  ['zero-states',m=>m.states=0],['six-states',m=>m.states=6],['fractional-states',m=>m.states=1.5],['boolean-states',m=>m.states=true],
  ['start-negative',m=>m.start=-1],['start-outside',m=>m.start=4],['start-string',m=>m.start='0'],['wrong-format',m=>m.format='other'],
  ['extra-machine-key',m=>m.extra=1],['accepting-duplicate',m=>m.accepting=[3,3]],['accepting-outside',m=>m.accepting=[4]],['accepting-nonarray',m=>m.accepting=3],
  ['missing-transition-row',m=>m.transitions.pop()],['extra-transition-row',m=>m.transitions.push({zero:[],one:[],epsilon:[]})],
  ['unknown-transition-key',m=>m.transitions[0].extra=[]],['missing-epsilon',m=>delete m.transitions[0].epsilon],['transition-duplicate',m=>m.transitions[0].zero=[0,0]],
  ['epsilon-duplicate',m=>m.transitions[0].epsilon=[1,1]],['transition-outside',m=>m.transitions[0].one=[4]],['transition-fraction',m=>m.transitions[0].one=[1.5]],
  ['transition-string-state',m=>m.transitions[0].one=['1']],['transition-not-array',m=>m.transitions[0].one='1'],['transition-null',m=>m.transitions[0]=null]
 ];
 group('invalid-machine-admission',record=>{
  let count=0;
  for(const[name,mutate]of mutations){const m=clone(base);mutate(m);const before=JSON.stringify(m);record.current_refusal=name;assert.throws(()=>nfa.admitMachine(m),name);assert.equal(JSON.stringify(m),before);count++}
  for(const m of [null,[],42,'machine']){assert.throws(()=>nfa.admitMachine(m));count++}
  delete record.current_refusal;record.refusals=count;
 });
 group('invalid-word-admission',record=>{
  const bad=['ε','0 1',' 01','01 ','2','0\n1','0'.repeat(25),null,0,['0'],{}];
  for(const word of bad){assert.throws(()=>nfa.trace(base,word));assert.throws(()=>nfa.analyze(base,word))}
  record.refusals=bad.length*2;
 });
 report.source_after=pin(SOURCE);assert.deepEqual(report.source_after,report.source_before);
 report.contract_after=pin(path.join(ROOT,'contract.json'));assert.deepEqual(report.contract_after,report.contract);
 report.accepted=report.cases.every(c=>c.passed);
}catch(e){report.accepted=false;report.fatal={name:e.name,message:e.message,stack:e.stack}}
report.finished=new Date().toISOString();report.passed_groups=report.cases.filter(c=>c.passed).length;report.failed_groups=report.cases.filter(c=>!c.passed).length;
fs.writeFileSync(path.join(OUT,'result.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
process.stdout.write(JSON.stringify({accepted:report.accepted,passed_groups:report.passed_groups,failed_groups:report.failed_groups,fatal:report.fatal,result:pin(path.join(OUT,'result.json'))})+'\n');
process.exitCode=report.accepted?0:1;
