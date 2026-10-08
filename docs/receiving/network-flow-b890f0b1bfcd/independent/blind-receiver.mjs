import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Frozen before viewing the implementation. The reference maximum is an exhaustive
// partition sum, not another flow solver. Residual paths use reverse distances.
const make = (vertices, source, sink, rows) => ({
  vertices, source, sink,
  edges: rows.map(([id, from, to, capacity]) => ({ id, from, to, capacity }))
});
export const fixtures = [
  { name: 'direct-and-bottleneck', maximum: 5, network: make(['S','A','T'],'S','T',
    [['direct','S','T',2],['in','S','A',5],['out','A','T',3]]) },
  { name: 'disconnected', maximum: 0, network: make(['S','A','T'],'S','T',
    [['dead-end','S','A',8],['zero','A','T',0]]) },
  { name: 'zero-capacities', maximum: 0, network: make(['S','T'],'S','T',
    [['zero-forward','S','T',0],['zero-opposite','T','S',0]]) },
  { name: 'two-vertex-opposites', maximum: 99, network: make(['S','T'],'S','T',
    [['outbound','S','T',99],['original-return','T','S',99]]) },
  { name: 'cancellation-required', maximum: 2, expectedPaths: [
      ['SA:+1','AC:+1','CT:+1'],['SB:+1','BC:+1','AC:-1','AD:+1','DT:+1']
    ], expectedFlow: {SA:1,SB:1,AC:0,AD:1,BC:1,CT:1,DT:1},
    network: make(['S','A','B','C','D','T'],'S','T',
      [['SA','S','A',1],['SB','S','B',1],['AC','A','C',1],['AD','A','D',1],
       ['BC','B','C',1],['CT','C','T',1],['DT','D','T',1]]) },
  { name: 'original-opposite-before-cancellation', maximum: 2, expectedPaths: [
      ['SA:+1','AC:+1','CT:+1'],['SB:+1','BC:+1','CA:+1','AD:+1','DT:+1']
    ], expectedFlow: {SA:1,SB:1,AC:1,AD:1,BC:1,CT:1,DT:1,CA:1},
    network: make(['S','A','B','C','D','T'],'S','T',
      [['SA','S','A',1],['SB','S','B',1],['AC','A','C',1],['AD','A','D',1],
       ['BC','B','C',1],['CT','C','T',1],['DT','D','T',1],['CA','C','A',1]]) },
  { name: 'textbook-six-vertex', maximum: 23, expectedPaths: [
      ['SA:+1','AB:+1','BT:+1'],['SC:+1','CD:+1','DT:+1'],['SC:+1','CD:+1','DB:+1','BT:+1']
    ], expectedFlow: {SA:12,SC:11,AC:0,CA:0,AB:12,BC:0,CD:11,DB:7,BT:19,DT:4},
    network: make(['S','A','B','C','D','T'],'S','T',
      [['SA','S','A',16],['SC','S','C',13],['AC','A','C',10],['CA','C','A',4],
       ['AB','A','B',12],['BC','B','C',9],['CD','C','D',14],['DB','D','B',7],
       ['BT','B','T',20],['DT','D','T',4]]) }
];

export function cutOracle(network) {
  const middle = network.vertices.filter(v => v !== network.source && v !== network.sink);
  let best = Infinity;
  const minimizers = [];
  for (let mask = 0; mask < 2 ** middle.length; mask++) {
    const side = new Set([network.source, ...middle.filter((_,i) => mask & (1 << i))]);
    const capacity = network.edges.reduce((sum,e) => sum +
      (side.has(e.from) && !side.has(e.to) ? e.capacity : 0), 0);
    if (capacity < best) { best = capacity; minimizers.length = 0; }
    if (capacity === best) minimizers.push([...side]);
  }
  return { maximum: best, minimizers };
}
function residualArcs(network, flows) {
  const arcs = [];
  for (const [i,e] of network.edges.entries()) {
    if (flows[i] < e.capacity) arcs.push({from:e.from,to:e.to,edgeId:e.id,direction:1,available:e.capacity-flows[i],index:i});
    if (flows[i] > 0) arcs.push({from:e.to,to:e.from,edgeId:e.id,direction:-1,available:flows[i],index:i});
  }
  return arcs;
}
export function pathOracle(network, flows) {
  const arcs = residualArcs(network, flows);
  const distance = new Map([[network.sink, 0]]);
  let frontier = [network.sink];
  while (frontier.length) {
    const next = [];
    for (const v of frontier) for (const a of arcs) {
      if (a.to === v && !distance.has(a.from)) {
        distance.set(a.from,distance.get(v)+1); next.push(a.from);
      }
    }
    frontier = next;
  }
  if (!distance.has(network.source)) return [];
  const result = [];
  let current = network.source;
  while (current !== network.sink) {
    const eligible = arcs.filter(a => a.from === current &&
      distance.get(a.to) === distance.get(current)-1).sort((a,b) =>
      network.vertices.indexOf(a.to)-network.vertices.indexOf(b.to) ||
      b.direction-a.direction || a.index-b.index);
    assert(eligible.length, 'reference shortest-path distance has a descending arc');
    const {index, ...arc} = eligible[0];
    result.push(arc); current = arc.to;
  }
  return result;
}
function typeOf(step) { return step.type ?? step.kind; }
function assertFlow(network, edges, expected, label) {
  assert.equal(edges.length, network.edges.length, label + ' edge count');
  const balance = new Map(network.vertices.map(v => [v,0]));
  edges.forEach((e,i) => {
    const original = network.edges[i];
    for (const k of ['id','from','to','capacity']) assert.equal(e[k],original[k],label+' '+k);
    assert(Number.isInteger(e.flow) && e.flow >= 0 && e.flow <= e.capacity,label+' capacity/integrality');
    if (expected) assert.equal(e.flow,expected[i],label+' replay '+e.id);
    balance.set(e.from,balance.get(e.from)+e.flow);
    balance.set(e.to,balance.get(e.to)-e.flow);
  });
  for (const [v,b] of balance) if (v !== network.source && v !== network.sink)
    assert.equal(b,0,label+' conservation at '+v);
  assert.equal(balance.get(network.source),-balance.get(network.sink),label+' terminal net balance');
  return balance.get(network.source);
}
function checkCut(network, edges, cut, maximum, label) {
  assert(cut && Array.isArray(cut.sourceSide) && Array.isArray(cut.sinkSide),label+' explicit partition');
  const sourceSide = new Set(cut.sourceSide), sinkSide = new Set(cut.sinkSide);
  assert.equal(sourceSide.size,cut.sourceSide.length,label+' unique source side');
  assert.equal(sinkSide.size,cut.sinkSide.length,label+' unique sink side');
  assert(sourceSide.has(network.source) && !sourceSide.has(network.sink),label+' terminal separation');
  assert(sinkSide.has(network.sink) && !sinkSide.has(network.source),label+' sink separation');
  assert.equal(sourceSide.size+sinkSide.size,network.vertices.length,label+' partition size');
  for (const v of network.vertices) assert(sourceSide.has(v) !== sinkSide.has(v),label+' exact vertex partition');
  let capacity = 0, netFlow = 0;
  const ids = [];
  for (const e of edges) {
    if (sourceSide.has(e.from) && sinkSide.has(e.to)) {
      capacity += e.capacity; netFlow += e.flow; ids.push(e.id);
      assert.equal(e.flow,e.capacity,label+' forward cut edge is saturated '+e.id);
    } else if (sinkSide.has(e.from) && sourceSide.has(e.to)) {
      netFlow -= e.flow;
      assert.equal(e.flow,0,label+' backward cut edge carries zero '+e.id);
    }
  }
  assert.deepEqual(cut.edgeIds,ids,label+' original outgoing cut IDs');
  assert.equal(cut.capacity,capacity,label+' cut capacity sum');
  assert.equal(cut.netFlow,netFlow,label+' signed cut net flow');
  assert.equal(capacity,maximum,label+' flow-cut equality');
  assert.equal(netFlow,maximum,label+' cut net equals source flow');
  const reachable = new Set([network.source]);
  let changed = true;
  const arcs = residualArcs(network,edges.map(e=>e.flow));
  while(changed) { changed=false; for(const a of arcs) if(reachable.has(a.from)&&!reachable.has(a.to)) {reachable.add(a.to);changed=true;} }
  assert.deepEqual(network.vertices.filter(v=>sourceSide.has(v)),network.vertices.filter(v=>reachable.has(v)),label+' final residual source side');
}
export function receive(solveNetwork, network, label, explicit) {
  const before = JSON.stringify(network);
  const oracle = cutOracle(network);
  if (explicit) assert.equal(oracle.maximum,explicit.maximum,label+' worked answer agrees with cut enumeration');
  const result = solveNetwork(network);
  assert.equal(JSON.stringify(network),before,label+' input remains unchanged');
  assert.equal(result.maximumFlow,oracle.maximum,label+' maximum by independent cuts');
  assert(Array.isArray(result.steps) && result.steps.length >= 2,label+' initial and final snapshots');
  assert.equal(typeOf(result.steps[0]),'initial',label+' initial step');
  assert.equal(typeOf(result.steps.at(-1)),'complete',label+' final step');
  assertFlow(network,result.steps[0].edges,network.edges.map(()=>0),label+' initial');
  let flows = network.edges.map(()=>0), count=0;
  const paths = [];
  for(const step of result.steps.slice(1,-1)) {
    assert.equal(typeOf(step),'augment',label+' augmentation step type');
    const expectedPath = pathOracle(network,flows);
    assert(expectedPath.length,label+' augmenting path exists');
    assert.deepEqual(step.path.map(({from,to,edgeId,direction,available})=>({from,to,edgeId,direction,available})),expectedPath,label+' deterministic shortest residual path');
    const amount = Math.min(...expectedPath.map(a=>a.available));
    assert.equal(step.bottleneck,amount,label+' bottleneck');
    const previousValue = assertFlow(network,network.edges.map((e,i)=>({...e,flow:flows[i]})),flows,label+' prior');
    for(const arc of expectedPath) flows[network.edges.findIndex(e=>e.id===arc.edgeId)] += arc.direction*amount;
    const value = assertFlow(network,step.edges,flows,label+' augmentation');
    assert.equal(value,previousValue+amount,label+' augmentation increases net flow');
    paths.push(expectedPath.map(a=>a.edgeId+':'+(a.direction===1?'+1':'-1'))); count++;
  }
  assert.equal(pathOracle(network,flows).length,0,label+' no final residual source-sink path');
  assert.equal(result.augmentationCount,count,label+' augmentation count');
  assert.equal(assertFlow(network,result.steps.at(-1).edges,flows,label+' final'),oracle.maximum,label+' final flow value');
  checkCut(network,result.steps.at(-1).edges,result.steps.at(-1).cut,oracle.maximum,label+' final cut');
  if(explicit?.expectedPaths) assert.deepEqual(paths,explicit.expectedPaths,label+' independently worked path sequence');
  if(explicit?.expectedFlow) assert.deepEqual(Object.fromEntries(network.edges.map((e,i)=>[e.id,flows[i]])),explicit.expectedFlow,label+' independently worked final assignment');
  return {name:label,maximum:oracle.maximum,augmentations:count,cancelled:paths.some(p=>p.some(a=>a.endsWith(':-1')))};
}
function generatedNetworks() {
  const items=[];
  const three=['S','A','T'];
  const pairs3=three.flatMap(from=>three.filter(to=>to!==from).map(to=>[from,to]));
  for(let value=0;value<3**pairs3.length;value++) {
    let digits=value;
    items.push(make(three,'S','T',pairs3.map(([from,to],i)=>{const capacity=digits%3;digits=Math.floor(digits/3);return ['e'+i,from,to,capacity];})));
  }
  const four=['S','A','B','T'];
  const pairs4=four.flatMap(from=>four.filter(to=>to!==from).map(to=>[from,to]));
  for(let mask=0;mask<2**pairs4.length;mask++)
    items.push(make(four,'S','T',pairs4.map(([from,to],i)=>['e'+i,from,to,(mask>>>i)&1])));
  let state=0xb890f0b1;
  const rand=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return state>>>0;};
  for(let n=5;n<=8;n++) for(let sample=0;sample<80;sample++) {
    const vertices=Array.from({length:n},(_,i)=>'V'+i);
    // Deterministic varying vertex order and input edge order challenge tie handling.
    if(sample%2) vertices.reverse();
    const rows=[];
    for(const from of vertices) for(const to of vertices) if(from!==to && rand()%3)
      rows.push(['arc'+rows.length,from,to,rand()%100]);
    if(sample%3===0) rows.reverse();
    items.push(make(vertices,vertices[0],vertices.at(-1),rows));
  }
  return items;
}
function assertRejections(solveNetwork) {
  const valid=make(['S','A','T'],'S','T',[['SA','S','A',2],['AT','A','T',2]]);
  const malformed=[
    {...valid,vertices:['S']},
    {...valid,vertices:['S','A','B','C','D','E','F','G','T']},
    {...valid,sink:'S'}, {...valid,source:'missing'},
    {...valid,edges:[...valid.edges,{id:'again',from:'S',to:'A',capacity:1}]},
    ...[-1,100,1.5,NaN,Infinity].map(capacity=>({...valid,edges:[{id:'bad',from:'S',to:'T',capacity}]})),
    {...valid,edges:[{id:'bad',from:'missing',to:'T',capacity:1}]}
  ];
  for(const [i,n] of malformed.entries()) assert.throws(()=>solveNetwork(n),'invalid admitted '+i);
  return malformed.length;
}
export function run(solveNetwork) {
  const named=fixtures.map(f=>receive(solveNetwork,f.network,f.name,f));
  const generated=generatedNetworks();
  let maxAugmentations=0,cancellationCases=0;
  generated.forEach((n,i)=>{const r=receive(solveNetwork,n,'generated-'+i);maxAugmentations=Math.max(maxAugmentations,r.augmentations);if(r.cancelled)cancellationCases++;});
  const malformedRejected=assertRejections(solveNetwork);
  return {passed:true,named,generated:generated.length,maxAugmentations,cancellationCases,malformedRejected};
}
if(process.argv[2] === '--self-check') {
  for(const f of fixtures) assert.equal(cutOracle(f.network).maximum,f.maximum,f.name);
  const initial=fixtures[4].network.edges.map(()=>0);
  assert.deepEqual(pathOracle(fixtures[4].network,initial).map(a=>a.edgeId),['SA','AC','CT']);
  const preCancel=[1,0,1,0,0,1,0];
  assert.deepEqual(pathOracle(fixtures[4].network,preCancel).map(a=>a.edgeId+':'+a.direction),['SB:1','BC:1','AC:-1','AD:1','DT:1']);
  assert.deepEqual(pathOracle(fixtures[5].network,[...preCancel,0]).map(a=>a.edgeId+':'+a.direction),['SB:1','BC:1','CA:1','AD:1','DT:1']);
  console.log(JSON.stringify({passed:true,phase:'blind-oracle-self-check',worked:fixtures.map(f=>({name:f.name,maximum:cutOracle(f.network).maximum})),sha256:createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex')},null,2));
} else if(process.argv[2]) {
  const target=process.argv[2],sourceHash=createHash('sha256').update(readFileSync(target)).digest('hex');
  try {
    const module=await import(pathToFileURL(target));
    const receipt={source:target,sourceHash,oracleHash:createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'),...run(module.solveNetwork)};
    if(process.argv[3]) writeFileSync(process.argv[3],JSON.stringify(receipt,null,2)+'\n');
    console.log(JSON.stringify(receipt,null,2));
  } catch(error) {
    const receipt={passed:false,source:target,sourceHash,error:{name:error.name,message:error.message,stack:error.stack,actual:error.actual,expected:error.expected}};
    if(process.argv[3]) writeFileSync(process.argv[3],JSON.stringify(receipt,null,2)+'\n');
    console.error(JSON.stringify(receipt,null,2));process.exitCode=1;
  }
}
