import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {goldens} from './goldens.mjs';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const clone = value => structuredClone(value);
const integer = (value, min, max, label) => {
 assert.ok(Number.isInteger(value) && value >= min && value <= max, label);
};
const freeze = value => {
 if (value && typeof value === 'object') {
  Object.freeze(value);
  for (const entry of Object.values(value)) freeze(entry);
 }
 return value;
};
function groups(adjacency) {
 const visited = new Set(), output = [];
 for (let vertex = 0; vertex < adjacency.length; vertex++) {
  if (visited.has(vertex)) continue;
  const queue = [vertex], members = [];
  visited.add(vertex);
  for (let cursor = 0; cursor < queue.length; cursor++) {
   const item = queue[cursor];
   members.push(item);
   for (const next of adjacency[item]) {
    if (!visited.has(next)) { visited.add(next); queue.push(next); }
   }
  }
  output.push(members.sort((a,b) => a-b));
 }
 return output;
}
function rootAndPath(parent, start) {
 const visited = new Set(), walked = [];
 let item = start;
 for (;;) {
  integer(item, 0, parent.length-1, 'parent index range');
  assert.ok(!visited.has(item), 'forest must be acyclic');
  visited.add(item);
  walked.push(item);
  if (parent[item] === item) return {root:item, walked};
  item = parent[item];
 }
}
function inspectState(n, snapshot, adjacency, representatives) {
 assert.ok(snapshot && typeof snapshot === 'object', 'snapshot object');
 assert.ok(Array.isArray(snapshot.parent), 'parent array');
 assert.ok(Array.isArray(snapshot.size), 'size array');
 assert.equal(snapshot.parent.length, n, 'parent length');
 assert.equal(snapshot.size.length, n, 'size length');
 const graphGroups = groups(adjacency);
 integer(snapshot.components, 1, n, 'component count range');
 assert.equal(snapshot.components, graphGroups.length, 'BFS component count');
 for (let i=0;i<n;i++) {
  integer(snapshot.parent[i],0,n-1,'parent index');
  integer(snapshot.size[i],0,n,'stored size');
 }
 const roots = new Map();
 for (let i=0;i<n;i++) {
  const root = rootAndPath(snapshot.parent,i).root;
  assert.equal(root,representatives[i],'root selected by graph cardinality/tie contract');
  if (!roots.has(root)) roots.set(root,[]);
  roots.get(root).push(i);
 }
 const forestGroups = [...roots.values()].sort((a,b)=>a[0]-b[0]);
 assert.deepEqual(forestGroups,graphGroups,'forest components equal authored-edge BFS');
 for(let i=0;i<n;i++) {
  const isRoot = snapshot.parent[i]===i;
  assert.equal(snapshot.size[i],isRoot?roots.get(i).length:0,'root cardinality / nonroot zero');
 }
}
export function validateTrace(n,operations,options,result) {
 integer(n,1,8,'n contract');
 assert.ok(Array.isArray(operations) && operations.length<=32,'operation contract');
 const compress = options?.compress ?? true;
 assert.equal(typeof compress,'boolean','compression contract');
 assert.ok(result && Array.isArray(result.snapshots),'result.snapshots array');
 assert.equal(result.snapshots.length,operations.length+1,'initial plus every operation');
 const adjacency = Array.from({length:n},()=>new Set());
 let representatives = Array.from({length:n},(_,i)=>i);
 const initial = result.snapshots[0];
 inspectState(n,initial,adjacency,representatives);
 assert.deepEqual(initial.parent,representatives,'initial singleton parents');
 assert.deepEqual(initial.size,Array(n).fill(1),'initial singleton sizes');
 let transitions=0;
 for(let step=0;step<operations.length;step++) {
  const op=operations[step], before=result.snapshots[step], after=result.snapshots[step+1];
  assert.ok(op && (op.type==='find'||op.type==='union'),'known operation');
  integer(op.a,0,n-1,'a index');
  if(op.type==='union')integer(op.b,0,n-1,'b index');
  const expectedParent=[...before.parent], expectedSize=[...before.size];
  const find = vertex => {
   const result = rootAndPath(expectedParent,vertex);
   assert.equal(result.root,representatives[vertex],'find representative');
   if(compress)for(const item of result.walked)expectedParent[item]=result.root;
   return result.root;
  };
  const left=find(op.a);
  if(op.type==='union') {
   const right=find(op.b);
   if(left!==right) {
    const beforeGroups=groups(adjacency);
    const leftMembers=beforeGroups.find(set=>set.includes(op.a));
    const rightMembers=beforeGroups.find(set=>set.includes(op.b));
    const winner=leftMembers.length>rightMembers.length?left:
      rightMembers.length>leftMembers.length?right:Math.min(left,right);
    const loser=winner===left?right:left;
    expectedParent[loser]=winner;
    expectedSize[winner]=leftMembers.length+rightMembers.length;
    expectedSize[loser]=0;
    const joined=new Set([...leftMembers,...rightMembers]);
    representatives=representatives.map((value,index)=>joined.has(index)?winner:value);
   }
   adjacency[op.a].add(op.b);
   adjacency[op.b].add(op.a);
  }
  inspectState(n,after,adjacency,representatives);
  assert.deepEqual(after.parent,expectedParent,'only declared union/find parent changes at step '+step);
  assert.deepEqual(after.size,expectedSize,'only declared union size changes at step '+step);
  transitions++;
 }
 return {transitions,snapshots:result.snapshots.length};
}
function projected(result) {
 return {snapshots:result.snapshots.map(({parent,size,components})=>({parent,size,components}))};
}
function selfCheck() {
 const summary={positive_goldens:0,rejected_mutations:[],transitions:0};
 for(const fixture of goldens) {
  const checked=validateTrace(fixture.n,fixture.operations,{compress:fixture.compress},{snapshots:clone(fixture.snapshots)});
  summary.positive_goldens++; summary.transitions+=checked.transitions;
 }
 const checks=[
  ['lost-union',0,f=>{f.snapshots[1]=clone(f.snapshots[0]);}],
  ['cycle',0,f=>{f.snapshots[1].parent[0]=1;}],
  ['out-of-range',0,f=>{f.snapshots[1].parent[7]=8;}],
  ['root-size',0,f=>{f.snapshots[1].size[0]=3;}],
  ['nonroot-size',0,f=>{f.snapshots[1].size[1]=1;}],
  ['wrong-tie-root',0,f=>{
    f.snapshots[1].parent[0]=1; f.snapshots[1].parent[1]=1;
    f.snapshots[1].size[0]=0; f.snapshots[1].size[1]=2;
  }],
  ['compression-disabled-parent-change',0,f=>{f.snapshots[8].parent[7]=0;}],
  ['partial-compression',1,f=>{f.snapshots[8].parent[6]=4;}],
  ['compression-changes-unvisited-path',1,f=>{f.snapshots[8].parent[3]=0;}],
  ['find-changes-size',1,f=>{f.snapshots[8].size[0]=7;}],
  ['redundant-union-grows-size',0,f=>{f.snapshots[10].size[0]=9;}],
  ['missing-snapshot',0,f=>{f.snapshots.pop();}],
  ['wrong-component-count',0,f=>{f.snapshots[7].components=2;}],
  ['redundant-union-skips-second-find',4,f=>{f.snapshots[8].parent[3]=2;}],
  ['smaller-root-wins-against-larger',2,f=>{
    f.snapshots[4].parent=[0,0,2,4,0,4];
    f.snapshots[4].size=[5,0,1,0,0,0];
  }]
 ];
 for(const [name,index,mutate] of checks) {
  const fixture=clone(goldens[index]); mutate(fixture);
  assert.throws(()=>validateTrace(fixture.n,fixture.operations,{compress:fixture.compress},{snapshots:fixture.snapshots}),name);
  summary.rejected_mutations.push(name);
 }
 return summary;
}
function runCandidate(candidate) {
 const summary={goldens:0,exhaustive_histories:0,seeded_histories:0,default_histories:0,empty_histories:0,
  invalid_controls:0,transitions:0,snapshots:0,inputs_unchanged:true};
 function run(n,operations,compress,label,expected) {
  const ops=freeze(clone(operations)), before=JSON.stringify(ops);
  const options=compress===undefined?undefined:freeze({compress});
  const result=options===undefined?candidate(n,ops):candidate(n,ops,options);
  assert.equal(JSON.stringify(ops),before,'input operations unchanged: '+label);
  const checked=validateTrace(n,ops,options,result);
  if(expected)assert.deepEqual(projected(result),{snapshots:expected},'literal golden '+label);
  summary.transitions+=checked.transitions; summary.snapshots+=checked.snapshots;
 }
 for(const fixture of goldens) {
  run(fixture.n,fixture.operations,fixture.compress,fixture.name,fixture.snapshots);
  summary.goldens++;
 }
 for(let n=1;n<=4;n++) {
  const alphabet=[];
  for(let a=0;a<n;a++) {
   alphabet.push({type:'find',a});
   for(let b=0;b<n;b++)alphabet.push({type:'union',a,b});
  }
  for(const first of alphabet)for(const second of alphabet)for(const compress of [false,true]) {
   run(n,[first,second],compress,'exhaustive n='+n);
   summary.exhaustive_histories++;
  }
 }
 for(let n=1;n<=8;n++)for(let seed=1;seed<=32;seed++) {
  let state=(Math.imul(n,0x9e3779b9)^seed)>>>0;
  const next=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return state>>>0;};
  const operations=[];
  for(let i=0;i<32;i++) {
   const kind=next()%3, a=next()%n;
   operations.push(kind===0?{type:'find',a}:{type:'union',a,b:next()%n});
  }
  for(const compress of [false,true]) {
   run(n,operations,compress,'seeded n='+n+' seed='+seed);
   summary.seeded_histories++;
  }
 }
 for(let n=1;n<=8;n++) {
  run(n,[{type:'union',a:n-1,b:0},{type:'find',a:n-1}],undefined,'omitted options n='+n);
  summary.default_histories++;
 }
 for(let n=1;n<=8;n++)for(const compress of [false,true]) {
  run(n,[],compress,'empty history n='+n);
  summary.empty_histories++;
 }
 const invalid=[
  ...[0,9,-1,1.5,NaN,Infinity,-Infinity,'4',null,true].map(n=>({name:'invalid n '+String(n),args:[n,[]]})),
  {name:'null operations',args:[4,null]},
  {name:'nonarray operations',args:[4,{}]},
  {name:'over32 operations',args:[4,Array.from({length:33},()=>({type:'find',a:0}))]},
  ...[-1,4,0.5,'1',null,NaN,Infinity,undefined].map(a=>({name:'invalid find index '+String(a),args:[4,[{type:'find',a}]]})),
  ...[-1,4,0.5,'1',null,NaN,Infinity,undefined].map(b=>({name:'invalid union index '+String(b),args:[4,[{type:'union',a:0,b}]]})),
  {name:'unknown operation',args:[4,[{type:'delete',a:0}]]},
  {name:'null operation',args:[4,[null]]},
  {name:'sparse operation',args:[4,Array(1)]},
  ...['false',0,null].map(compress=>({name:'invalid compression '+String(compress),args:[4,[],{compress}]}))
 ];
 for(const item of invalid) {
  const args=clone(item.args), before=clone(args);
  assert.throws(()=>candidate(...args),'candidate refuses '+item.name);
  assert.deepEqual(args,before,'refused input remains unchanged: '+item.name);
  summary.invalid_controls++;
 }
 return summary;
}
const thisFile=fileURLToPath(import.meta.url);
const ownFiles=['CONTRACT.json','goldens.mjs','receive.mjs'].map(name=>path.join(path.dirname(thisFile),name));
const pins=()=>Object.fromEntries(ownFiles.map(filename=>{
 const bytes=fs.readFileSync(filename);return [path.basename(filename),{bytes:bytes.length,sha256:digest(bytes)}];
}));
const argv=process.argv.slice(2);
if(argv.length && (argv[0]==='--self-check'||!argv[0].startsWith('--'))) {
 const selfOnly=argv[0]==='--self-check';
 const output=argv[1];
 assert.ok(output,'usage: node receive.mjs --self-check|CANDIDATE_MODULE NEW_RECEIPT.json');
 const receipt={owner:'estate-44df5c2e45ae/source_integration',started_at:new Date().toISOString(),
  node:process.version,platform:process.platform,architecture:process.arch,
  mode:selfOnly?'pre-exposure-oracle-self-check':'candidate-core-receiving',source_before:pins(),passed:false};
 try {
  receipt.self_check=selfCheck();
  if(!selfOnly) {
   const modulePath=fs.realpathSync(argv[0]), before=fs.readFileSync(modulePath);
   receipt.candidate={path:modulePath,bytes:before.length,sha256:digest(before)};
   const {traceUnionFind}=await import(pathToFileURL(modulePath).href);
   assert.equal(typeof traceUnionFind,'function','named synchronous core export');
   receipt.receiving=runCandidate(traceUnionFind);
   assert.equal(digest(fs.readFileSync(modulePath)),receipt.candidate.sha256,'candidate module unchanged');
   receipt.candidate_unchanged=true;
  }
  assert.deepEqual(pins(),receipt.source_before,'oracle source unchanged');
  receipt.passed=true;
 } catch(error) {
  receipt.failure={name:error.name,message:error.message,stack:error.stack};
  process.exitCode=1;
 } finally {
  receipt.finished_at=new Date().toISOString();
  fs.writeFileSync(output,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
  process.stdout.write(JSON.stringify({passed:receipt.passed,mode:receipt.mode,self_check:receipt.self_check,
   receiving:receipt.receiving,failure:receipt.failure?.message??null,receipt:output})+'\n');
 }
}
