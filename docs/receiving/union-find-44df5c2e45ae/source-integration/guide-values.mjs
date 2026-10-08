import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

const model='/home/jacob/recallweave-union-find-44df5c2e45ae/src/union-find.mjs';
const guide='/home/jacob/recallweave-union-find-44df5c2e45ae/courses/union-find.md';
const sha=b=>createHash('sha256').update(b).digest('hex');
const beforeModel=fs.readFileSync(model),beforeGuide=fs.readFileSync(guide);
assert.equal(sha(beforeModel),'bb9f71037ca95237e56fad7211a4306a494ad7fc3f231d93d6d6c52cf0c3747b');
const union=(a,b)=>({type:'union',a,b}),find=a=>({type:'find',a});
const cases=[
 {name:'three-islands-compression',n:6,compress:true,
  operations:[union(0,1),union(2,3),union(4,5),union(0,2),find(3),union(3,5),find(5),union(1,4)],
  links:[0,0,0,0,0,2,2,2,2],components:[6,5,4,3,2,2,1,1,1],total:8},
 {name:'three-islands-without-compression',n:6,compress:false,
  operations:[union(0,1),union(2,3),union(4,5),union(0,2),find(3),union(3,5),find(5),union(1,4)],
  links:[0,0,0,0,0,2,3,2,2],components:[6,5,4,3,2,2,1,1,1],total:9},
 {name:'longer-path-compression',n:8,compress:true,
  operations:[union(0,1),union(2,3),union(4,5),union(6,7),union(0,2),union(4,6),union(0,4),find(7),find(7)],
  links:[0,0,0,0,0,0,0,0,3,1],components:[8,7,6,5,4,3,2,1,1,1],total:4},
 {name:'longer-path-without-compression',n:8,compress:false,
  operations:[union(0,1),union(2,3),union(4,5),union(6,7),union(0,2),union(4,6),union(0,4),find(7),find(7)],
  links:[0,0,0,0,0,0,0,0,3,3],components:[8,7,6,5,4,3,2,1,1,1],total:6}
];
const report={owner:'estate-44df5c2e45ae/source_integration',started_at:new Date().toISOString(),
 qualification:'Independently hand-counted documented example observations, after the separately frozen core receiving and source review.',
 node:process.version,model_sha256:sha(beforeModel),guide_sha256:sha(beforeGuide),
 receiver_sha256:sha(fs.readFileSync(new URL(import.meta.url))),cases:[],passed:false};
try {
 const {traceUnionFind}=await import(pathToFileURL(model).href);
 for(const item of cases) {
  const result=traceUnionFind(item.n,item.operations,{compress:item.compress});
  const observed={name:item.name,links:result.snapshots.map(s=>s.linksFollowed),
   components:result.snapshots.map(s=>s.components),total:result.snapshots.at(-1).totalLinks};
  assert.deepEqual(observed.links,item.links,item.name+' hand-counted links');
  assert.deepEqual(observed.components,item.components,item.name+' component counts');
  assert.equal(observed.total,item.total,item.name+' documented total');
  if(item.name==='longer-path-compression') {
   const snapshot=result.snapshots[8];
   assert.deepEqual(snapshot.paths[0].path,[7,6,4,0]);
   assert.deepEqual(snapshot.paths[0].changes,[{node:7,from:6,to:0},{node:6,from:4,to:0}]);
   assert.equal(snapshot.parent[3],2,'unvisited D still points to C');
   assert.equal(snapshot.parent[5],4,'unvisited F still points to E');
  }
  report.cases.push({...observed,passed:true});
 }
 assert.equal(sha(fs.readFileSync(model)),report.model_sha256);
 assert.equal(sha(fs.readFileSync(guide)),report.guide_sha256);
 report.source_unchanged=true;report.passed=true;
} catch(error){report.failure={message:error.message,stack:error.stack};process.exitCode=1;}
finally{
 report.finished_at=new Date().toISOString();
 fs.writeFileSync('GUIDE-VALUES.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({passed:report.passed,cases:report.cases.length,failure:report.failure?.message??null}));
}
