import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { allMatchings, maximumSize, shortestAugmentingLength } from './oracle.mjs';
import { parseBipartiteInput, validateBipartiteGraph, traceBipartiteMatching } from './frozen/bipartite-matching.mjs';
const started = new Date();
const source = JSON.parse(fs.readFileSync(new URL('./SOURCE.json', import.meta.url)));
assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('./frozen/bipartite-matching.mjs', import.meta.url))).digest('hex'), source.sha256);
let graphCount=0, caseCount=0, eventCount=0, augmentCount=0, reverseCount=0, negativeCount=0, directNegativeCount=0;
const groups=[];
function matchingCheck(graph, ids) {
  assert(Array.isArray(ids));
  assert.equal(new Set(ids).size, ids.length);
  const edges=ids.map(id=>{const e=graph.edges.find(x=>x.id===id); assert(e,'matching edge exists');return e;});
  assert.equal(new Set(edges.map(e=>e.left)).size,edges.length);
  assert.equal(new Set(edges.map(e=>e.right)).size,edges.length);
  assert.deepEqual(ids,graph.edges.filter(e=>ids.includes(e.id)).map(e=>e.id),'matching preserves entered-edge order');
}
function receive(graph, label) {
  const before=JSON.stringify(graph), optimum=maximumSize(graph.left,graph.edges);
  const trace=traceBipartiteMatching(graph);
  assert.equal(JSON.stringify(graph),before,'input graph mutated '+label);
  assert.deepEqual(trace,traceBipartiteMatching(JSON.parse(before)),'determinism '+label);
  matchingCheck(graph,trace.finalMatching);
  assert.equal(trace.maxSize,optimum,'maximum oracle '+label);
  assert.equal(trace.finalMatching.length,optimum);
  assert.equal(trace.initialSize,graph.initialMatching.length);
  assert.equal(trace.augmentations,optimum-graph.initialMatching.length);
  assert.equal(trace.events[0].kind,'initial');
  assert.equal(trace.events.at(-1).kind,'maximum');
  let previous=[...graph.initialMatching], inspected=0, augmented=0, found=null;
  for(const [index,event] of trace.events.entries()) {
    eventCount++;
    assert.equal(event.index,index);
    matchingCheck(graph,event.matching);
    assert.equal(event.size,event.matching.length);
    const selected=new Set(event.matching);
    assert.deepEqual(event.freeLeft,graph.left.filter(v=>!graph.edges.some(e=>selected.has(e.id)&&e.left===v)));
    assert.deepEqual(event.freeRight,graph.right.filter(v=>!graph.edges.some(e=>selected.has(e.id)&&e.right===v)));
    if(event.kind==='inspect') {
      inspected++;
      const e=graph.edges.find(e=>e.id===event.edge);assert(e);
      assert.deepEqual([event.from,event.to],selected.has(e.id)?[e.right,e.left]:[e.left,e.right]);
    }
    if(event.kind==='search-start') {
      assert.deepEqual(event.roots,event.freeLeft);
      assert.deepEqual(event.queue,event.freeLeft);
      assert.deepEqual(event.reachedLeft,event.freeLeft);
      assert.deepEqual(event.reachedRight,[]);
    }
    if(event.kind==='path-found') {
      assert.equal(found,null);
      const path=event.path;assert(path.length>0&&path.length%2===1);
      assert.equal(path.length,shortestAugmentingLength(graph,previous),'BFS shortest length '+label);
      assert(event.freeLeft.includes(path[0].from));
      assert(event.freeRight.includes(path.at(-1).to));
      const vertices=[path[0].from];
      for(const [i,p] of path.entries()){
        const edge=graph.edges.find(e=>e.id===p.edgeId);assert(edge);
        assert.equal(p.inMatchingBefore,previous.includes(p.edgeId));
        assert.equal(p.inMatchingBefore,i%2===1);
        assert.deepEqual([p.from,p.to],p.inMatchingBefore?[edge.right,edge.left]:[edge.left,edge.right]);
        if(i)assert.equal(path[i-1].to,p.from);
        vertices.push(p.to);
      }
      assert.equal(new Set(vertices).size,vertices.length,'simple augmenting path');
      assert.deepEqual(event.added,path.filter(p=>!p.inMatchingBefore).map(p=>p.edgeId));
      assert.deepEqual(event.removed,path.filter(p=>p.inMatchingBefore).map(p=>p.edgeId));
      found=event;
    }
    if(event.kind==='augment') {
      assert(found,'augment follows discovered path');
      assert.equal(trace.events[index-1].kind,'path-found','atomic whole-path flip');
      assert.deepEqual(event.path,found.path);
      assert.deepEqual(event.added,found.added);assert.deepEqual(event.removed,found.removed);
      const toggled=new Set(previous);
      for(const p of found.path){if(toggled.has(p.edgeId))toggled.delete(p.edgeId);else toggled.add(p.edgeId);}
      assert.deepEqual(event.matching,graph.edges.filter(e=>toggled.has(e.id)).map(e=>e.id));
      assert.equal(event.matching.length,previous.length+1);
      augmented++;augmentCount++;if(event.removed.length)reverseCount++;
      previous=[...event.matching];found=null;
    } else assert.deepEqual(event.matching,previous,'matching changes only atomically');
    assert.equal(event.arcInspections,inspected);
    assert.equal(event.augmentations,augmented);
  }
  assert.equal(found,null);assert.equal(trace.arcInspections,inspected);
  assert.deepEqual(previous,trace.finalMatching);
  assert.equal(shortestAugmentingLength(graph,trace.finalMatching),Infinity);
  caseCount++;
}
function graphFor(left,right,edges,matching=[]){
  const text=edges.map(([l,r])=>l+' '+r).join('\n');
  const g=parseBipartiteInput(left.join(' '),right.join(','),text);
  g.initialMatching=g.edges.filter(e=>matching.includes(e.id)).map(e=>e.id);
  return g;
}
try {
  assert.equal(maximumSize(['A','B'],[{id:'e1',left:'A',right:'X'},{id:'e2',left:'A',right:'Y'},{id:'e3',left:'B',right:'X'}]),2);
  const left=['A','B','C'],right=['X','Y','Z'],universe=left.flatMap(l=>right.map(r=>[l,r]));
  for(let mask=0;mask<512;mask++){
    const edges=universe.filter((_,i)=>mask&(1<<i));const g=graphFor(left,right,edges);graphCount++;
    for(const matching of allMatchings(g.left,g.edges)){
      receive({...g,initialMatching:g.edges.filter(e=>matching.includes(e.id)).map(e=>e.id)},'3x3-mask-'+mask);
    }
  }
  groups.push({name:'Every 3x3 graph, every feasible initial matching',graphs:512,cases:caseCount,result:'pass'});
  let seed=0x2983fe20;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};
  const largerStart=caseCount;
  for(let i=0;i<180;i++){
    const l=Array.from({length:4+i%3},(_,n)=>'L'+n),r=Array.from({length:1+(i*5)%6},(_,n)=>'R'+n);
    const edges=l.flatMap(a=>r.map(b=>[a,b])).filter(()=>random()<0.1+(i%9)/10);
    // Randomize declaration order independently; IDs follow that entered order.
    for(let n=edges.length-1;n>0;n--){const p=Math.floor(random()*(n+1));[edges[n],edges[p]]=[edges[p],edges[n]];}
    const g=graphFor(l,r,edges),choices=allMatchings(g.left,g.edges);graphCount++;
    for(const matching of [[],choices[Math.floor(random()*choices.length)],choices.reduce((a,b)=>a.length>=b.length?a:b)]){
      receive({...g,initialMatching:g.edges.filter(e=>matching.includes(e.id)).map(e=>e.id)},'larger-'+i);
    }
  }
  groups.push({name:'Bounded 4-6 left, 1-6 right deterministic independent graph family',graphs:180,cases:caseCount-largerStart,result:'pass'});
  const trap=parseBipartiteInput('A B','X Y','A X\nA Y\nB X','A X');
  receive(trap,'explicit reversal');
  const trapTrace=traceBipartiteMatching(trap);assert(trapTrace.events.some(e=>e.kind==='augment'&&e.removed.includes('e1')));
  const parserNegatives=[
    ['empty left','','X',''],['empty right','A','',''],['left upper bound','A B C D E F G','X',''],
    ['right upper bound','A','T U V W X Y Z',''],['duplicate left','A A','X',''],
    ['overlap sides','A','A',''],['digit first','1A','X',''],['hyphen','A-B','X',''],
    ['unicode','Å','X',''],['label length','ABCDEFGHIJKLM','X',''],
    ['edge unknown left','A','X','B X'],['edge unknown right','A','X','A Y'],
    ['reversed edge','A','X','X A'],['edge same partition','A B','X','A B'],
    ['edge extra field','A','X','A X tail'],['edge missing field','A','X','A'],
    ['duplicate edge','A','X','A X\nA X'],
    ['starting pair absent','A B','X Y','A X','B Y'],
    ['starting duplicate','A','X','A X','A X\nA X'],
    ['starting reuses left','A','X Y','A X\nA Y','A X\nA Y'],
    ['starting reuses right','A B','X','A X\nB X','A X\nB X']
  ];
  for(const [label,l,r,e,m] of parserNegatives){assert.throws(()=>parseBipartiteInput(l,r,e,m??''),undefined,label);negativeCount++;}
  const base=parseBipartiteInput('A B','X Y','A X\nA Y\nB X');
  const directMutations=[
    ['null',()=>null],['left type',g=>({...g,left:'A B'})],['edges type',g=>({...g,edges:{}})],
    ['unknown left',g=>(g.edges[0].left='Ghost',g)],['unknown right',g=>(g.edges[0].right='Ghost',g)],
    ['repeated edge id',g=>(g.edges[1].id=g.edges[0].id,g)],
    ['duplicate endpoint pair',g=>(g.edges[1].right='X',g)],
    ['unknown matched edge',g=>({...g,initialMatching:['missing']})],
    ['matched duplicate',g=>({...g,initialMatching:['e1','e1']})],
    ['matched shared left',g=>({...g,initialMatching:['e1','e2']})],
    ['matched shared right',g=>({...g,initialMatching:['e1','e3']})],
    ['overlap partitions',g=>({...g,right:['A','Y']})]
  ];
  for(const [label,mutate] of directMutations){
    const bad=mutate(structuredClone(base));
    assert.throws(()=>validateBipartiteGraph(bad),undefined,label);
    assert.throws(()=>traceBipartiteMatching(bad),undefined,'trace '+label);directNegativeCount++;
  }
  const comma=parseBipartiteInput(' A,\nB ','X, Y','\n A X \n B Y\n',' B Y \n');
  receive(comma,'permitted separators');
  groups.push({name:'Parser rejection and direct API refusal',parser:negativeCount,direct:directNegativeCount,result:'pass'});
  // Negative receiving control: a valid greedy matching is not accepted as maximum.
  const bad=structuredClone(trapTrace);bad.maxSize=1;
  assert.notEqual(bad.maxSize,maximumSize(trap.left,trap.edges));
  groups.push({name:'Suboptimal greedy result control and explicit path reversal',result:'pass'});
  const receipt={schema:'hamon.independent_receiving.v1',reviewer:'hamon-2983fe20e77b-thinkpad',source,started_at:started.toISOString(),finished_at:new Date().toISOString(),wall_ms:Date.now()-started.getTime(),result:'pass',graphCount,caseCount,eventCount,augmentCount,reverseCount,negativeCount,directNegativeCount,groups,boundary:'Frozen algorithm/parser source only; no browser, course, installed service, or shared product mutation'};
  fs.writeFileSync(new URL('./RECEIPT.json',import.meta.url),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));
} catch(error){
  const fail={result:'fail',source,at:{graphCount,caseCount,eventCount,negativeCount,directNegativeCount},error:{message:error.message,stack:error.stack},finished_at:new Date().toISOString()};
  fs.writeFileSync(new URL('./FAILED.json',import.meta.url),JSON.stringify(fail,null,2)+'\n');console.error(JSON.stringify(fail,null,2));process.exitCode=1;
}
