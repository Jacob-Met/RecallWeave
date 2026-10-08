import test from 'node:test';
import assert from 'node:assert/strict';
import {parseBipartiteInput, validateBipartiteGraph, traceBipartiteMatching} from '../src/bipartite-matching.mjs';

const parse = (l='A B', r='X Y', e='A X\nA Y\nB X', m='') => parseBipartiteInput(l,r,e,m);
const validMatching = (graph, ids) => {
  const endpoints=new Set(), seen=new Set();
  for(const id of ids){
    const edge=graph.edges.find(edge=>edge.id===id);
    assert.ok(edge); assert.ok(!seen.has(id)); seen.add(id);
    assert.ok(!endpoints.has(edge.left)); assert.ok(!endpoints.has(edge.right));
    endpoints.add(edge.left); endpoints.add(edge.right);
  }
};
test('greedy maximal matching requires the exact three-edge reversal',()=>{
  const graph=parse(undefined,undefined,undefined,'A X');
  const before=JSON.stringify(graph), trace=traceBipartiteMatching(graph);
  assert.equal(JSON.stringify(graph),before);
  assert.equal(trace.maxSize,2); assert.equal(trace.augmentations,1);
  assert.deepEqual(trace.finalMatching,['e2','e3']);
  const found=trace.events.find(event=>event.kind==='path-found');
  assert.deepEqual(found.path,[
    {edgeId:'e3',from:'B',to:'X',inMatchingBefore:false},
    {edgeId:'e1',from:'X',to:'A',inMatchingBefore:true},
    {edgeId:'e2',from:'A',to:'Y',inMatchingBefore:false}
  ]);
  assert.deepEqual(found.matching,['e1']);
  assert.deepEqual(found.added,['e3','e2']); assert.deepEqual(found.removed,['e1']);
  const flip=trace.events[found.index+1];
  assert.equal(flip.kind,'augment'); assert.deepEqual(flip.matching,['e2','e3']);
});
test('a five-edge path preserves the matching through every search frame',()=>{
  const graph=parse('A B C','X Y Z','A X\nA Y\nB X\nC Y\nC Z','A X\nC Y');
  const trace=traceBipartiteMatching(graph);
  assert.equal(trace.maxSize,3); assert.equal(trace.augmentations,1);
  assert.deepEqual(trace.finalMatching,['e2','e3','e5']);
  const path=trace.events.find(event=>event.kind==='path-found').path;
  assert.deepEqual(path.map(step=>step.from).concat(path.at(-1).to),['B','X','A','Y','C','Z']);
  for(const event of trace.events){validMatching(graph,event.matching);assert.equal(event.size,event.matching.length);}
});
test('maximum can leave isolated vertices and the terminal search is fresh',()=>{
  const graph=parse('A B C','X Y Z','A X\nB X\nC Y');
  const trace=traceBipartiteMatching(graph), done=trace.events.at(-1);
  assert.equal(trace.maxSize,2); assert.equal(done.kind,'maximum');
  assert.deepEqual(done.freeLeft,['B']); assert.deepEqual(done.freeRight,['Z']);
  assert.deepEqual(done.roots,['B']); assert.deepEqual(done.reachedLeft,['A','B']);
  assert.deepEqual(done.reachedRight,['X']);
  assert.equal(done.queue.length,0);
});
test('all free left roots participate; input ordering makes ties reproducible',()=>{
  const graph=parse('A B','X Y','B Y\nA X\nA Y\nB X');
  const a=traceBipartiteMatching(graph),b=traceBipartiteMatching(graph);
  assert.deepEqual(a,b);
  assert.deepEqual(a.events[1].roots,['A','B']);
  assert.equal(a.events.find(event=>event.kind==='inspect').edge,'e2');
  assert.deepEqual(a.finalMatching,['e1','e2']);
});
test('empty edges and already perfect starting matchings terminate correctly',()=>{
  const empty=traceBipartiteMatching(parse('A B','X Y',''));
  assert.equal(empty.maxSize,0); assert.equal(empty.arcInspections,0);
  const perfect=traceBipartiteMatching(parse('A B','X Y','A X\nB Y','B Y\nA X'));
  assert.deepEqual(perfect.finalMatching,['e1','e2']);
  assert.equal(perfect.augmentations,0); assert.equal(perfect.arcInspections,0);
  assert.equal(perfect.events.at(-1).kind,'maximum');
});
test('case-sensitive and prototype-like labels keep exact identities',()=>{
  assert.throws(()=>parse('A a constructor','X x __protoX','A X'));
});
test('supported prototype-like labels and maximum bounds are deterministic',()=>{
  const graph=parse('A a constructor','X x prototype','A X\na x\nconstructor prototype');
  assert.equal(traceBipartiteMatching(graph).maxSize,3);
  const l=['A','B','C','D','E','F'],r=['U','V','W','X','Y','Z'];
  const full=parse(l.join(' '),r.join(' '),l.flatMap(a=>r.map(b=>a+' '+b)).join('\n'));
  const trace=traceBipartiteMatching(full);
  assert.equal(trace.maxSize,6);assert.ok(trace.events.length<1000);
  for(const event of trace.events)validMatching(full,event.matching);
});
test('parser rejects invalid graph and starting-matching declarations',()=>{
  const bad=[
    ()=>parse('','X',''),()=>parse('A A','X',''),()=>parse('A','A',''),
    ()=>parse('1A','X',''),()=>parse('A','<X>',''),()=>parse('A','X','A X extra'),
    ()=>parse('A','X','X A'),()=>parse('A','X','A Y'),()=>parse('A','X','A X\nA X'),
    ()=>parse('A B C D E F G','X',''),()=>parse('A','X','A X','A Y'),
    ()=>parse('A','X Y','A X\nA Y','A X\nA Y'),()=>parse('A','X','A X','A X\nA X'),
    ()=>parse(null,'X',''),()=>parse('A','X',' '.repeat(4097))
  ];
  for(const run of bad)assert.throws(run);
});
test('direct API validation rejects malformed arrays and cannot bypass the bounds',()=>{
  const graph=parse();
  const bad=[
    {...graph,left:[undefined]}, {...graph,left:new Array(1)},
    {...graph,right:['X','X']},{...graph,edges:new Array(1)},
    {...graph,edges:[{id:'other',left:'A',right:'X'}]},
    {...graph,initialMatching:['e1','e2']},{...graph,initialMatching:['missing']},
    {...graph,initialMatching:['e1','e1']},null,[]
  ];
  for(const input of bad)assert.throws(()=>validateBipartiteGraph(input));
});
