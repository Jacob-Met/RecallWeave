import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { UNION_FIND_PRESETS, parseUnionFindInput, traceUnionFind } from '../src/union-find.mjs';
import { parseDeck } from '../src/deck.mjs';

const join = (a, b) => ({type: 'union', a, b});
const find = a => ({type: 'find', a});
test('the island example separates merges, finds and redundant joins', () => {
  const preset = UNION_FIND_PRESETS[0], ops = parseUnionFindInput(preset.count, preset.text);
  const result = traceUnionFind(preset.count, ops);
  assert.deepEqual(result.snapshots.map(state => state.components), [6,5,4,3,2,2,1,1,1]);
  assert.deepEqual(result.snapshots[4].parent, [0,0,0,2,4,4]);
  assert.deepEqual(result.snapshots[5].paths, [{start:3,path:[3,2,0],root:0,changes:[{node:3,from:2,to:0}]}]);
  assert.deepEqual(result.snapshots[6].joined, {child:4,parent:0,childSize:2,parentSizeBefore:4});
  assert.equal(result.snapshots[8].joined, null);
  assert.deepEqual(result.snapshots[8].parent, [0,0,0,0,0,0]);
  assert.deepEqual(result.snapshots[8].size, [6,0,0,0,0,0]);
  assert.equal(result.snapshots[8].totalLinks, 8);
  assert.equal(traceUnionFind(6, ops, {compress:false}).snapshots.at(-1).totalLinks, 9);
});
test('full compression changes precisely the visited path and not its other branches', () => {
  const preset = UNION_FIND_PRESETS[1], ops = parseUnionFindInput(preset.count, preset.text);
  const compressed = traceUnionFind(8, ops), plain = traceUnionFind(8, ops, {compress:false});
  assert.deepEqual(compressed.snapshots[7].parent, [0,0,0,2,0,4,4,6]);
  assert.deepEqual(compressed.snapshots[8].parent, [0,0,0,2,0,4,0,0]);
  assert.deepEqual(compressed.snapshots[8].paths[0].path, [7,6,4,0]);
  assert.deepEqual(compressed.snapshots[8].paths[0].changes, [{node:7,from:6,to:0},{node:6,from:4,to:0}]);
  assert.equal(compressed.snapshots[9].linksFollowed, 1);
  assert.equal(plain.snapshots[9].linksFollowed, 3);
  assert.deepEqual(plain.snapshots[7].parent, plain.snapshots[9].parent);
  assert.deepEqual(compressed.snapshots.at(-1).size, [8,0,0,0,0,0,0,0]);
});
test('component size wins over label and argument order, with explicit equal-size ties', () => {
  const prefix = [join(4,5),join(4,6),join(0,1)];
  const a = traceUnionFind(7, [...prefix, join(0,4)]).snapshots.at(-1);
  const b = traceUnionFind(7, [...prefix, join(4,0)]).snapshots.at(-1);
  assert.deepEqual(a.parent, b.parent);
  assert.equal(a.parent[0], 4);
  assert.equal(a.size[4], 5);
  assert.equal(a.size[0], 0);
  assert.equal(a.components, 3);
  assert.deepEqual(traceUnionFind(4,[join(3,2),join(1,0),join(2,0)]).snapshots.at(-1).parent,[0,0,0,2]);
});
test('redundant joins still run both finds in order but preserve size and partition', () => {
  const prefix = [join(0,1),join(2,3),join(0,2),join(4,5),join(6,7),join(4,6),join(0,4)];
  const result = traceUnionFind(8,[...prefix,join(7,3)]);
  const before = result.snapshots[7], after = result.snapshots[8];
  assert.equal(after.joined,null);
  assert.equal(after.components,before.components);
  assert.deepEqual(after.size,before.size);
  assert.deepEqual(after.paths.map(path=>path.start),[7,3]);
  assert.deepEqual(after.paths.map(path=>path.path),[[7,6,4,0],[3,2,0]]);
  assert.deepEqual(after.parent,[0,0,0,0,0,4,0,0]);
});
test('self joins, empty histories and one element retain the initial partition', () => {
  const result = traceUnionFind(1,[join(0,0),find(0)]);
  assert.equal(result.snapshots.length,3);
  for(const state of result.snapshots) {
    assert.equal(state.components,1);
    assert.deepEqual(state.parent,[0]);
    assert.deepEqual(state.size,[1]);
    assert.equal(state.totalLinks,0);
  }
  assert.equal(traceUnionFind(8,[]).snapshots.length,1);
  assert.equal(traceUnionFind(8,[]).snapshots[0].components,8);
});
test('a separate reachability calculation matches every prefix and both modes', () => {
  let seed=73153;
  const random=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
  for(let scenario=0;scenario<24;scenario++) {
    const count=1+random(8),ops=Array.from({length:32},()=>random(3)?join(random(count),random(count)):find(random(count)));
    const edges=Array.from({length:count},()=>new Set());
    const traces=[traceUnionFind(count,ops),traceUnionFind(count,ops,{compress:false})];
    for(let index=0;index<=ops.length;index++) {
      if(index&&ops[index-1].type==='union'){const {a,b}=ops[index-1];edges[a].add(b);edges[b].add(a);}
      const groups=[],seen=new Set();
      for(let node=0;node<count;node++) if(!seen.has(node)) {
        const pending=[node],group=[];seen.add(node);
        while(pending.length){const current=pending.pop();group.push(current);for(const next of edges[current])if(!seen.has(next)){seen.add(next);pending.push(next);}}
        groups.push(group.sort((a,b)=>a-b));
      }
      const canonical=groups.sort((a,b)=>a[0]-b[0]);
      for(const result of traces){
        const state=result.snapshots[index];
        assert.equal(state.components,canonical.length);
        assert.deepEqual(state.groups.map(group=>group.members).sort((a,b)=>a[0]-b[0]),canonical);
        for(const group of state.groups)assert.equal(state.size[group.root],group.members.length);
      }
    }
  }
});
test('results and inputs retain detached immutable evidence', () => {
  const ops=[join(0,1),join(2,3),join(1,3),find(3)],before=structuredClone(ops);
  const result=traceUnionFind(4,ops);
  assert.deepEqual(ops,before);
  ops[0].a=3;
  assert.equal(result.operations[0].a,0);
  assert.throws(()=>{result.snapshots[0].parent[0]=3;},TypeError);
  assert.throws(()=>{result.snapshots[3].groups[0].members.push(7);},TypeError);
  assert.throws(()=>{result.snapshots[4].paths[0].path.push(7);},TypeError);
  assert.deepEqual(result.snapshots[0].parent,[0,1,2,3]);
});
test('invalid complete inputs are refused without partial input mutation', () => {
  for(const count of [0,9,-1,1.5,NaN,Infinity,'4',null])assert.throws(()=>traceUnionFind(count,[]));
  const invalid=[null,{},new Array(1),Array(33).fill(find(0)),[null],[[]],[{type:'find',a:'0'}],[{type:'find',a:4}],[{type:'find',a:0,b:1}],[{type:'union',a:0}],[{type:'union',a:0,b:-1}],[{type:'union',a:0,b:NaN}],[{type:'split',a:0}]];
  for(const operations of invalid) {
    const before=structuredClone(operations);
    assert.throws(()=>traceUnionFind(4,operations));
    assert.deepEqual(operations,before);
  }
  for(const options of [null,[],{compress:null},{compress:0},{compress:'true'},{other:true}])assert.throws(()=>traceUnionFind(4,[],options));
});
test('command parser has explicit bounds, names and line-specific refusals', () => {
  assert.deepEqual(parseUnionFindInput(4,' \njoin A B\r\nfind D\n'),[join(0,1),find(3)]);
  assert.deepEqual(parseUnionFindInput(1,''),[]);
  assert.equal(parseUnionFindInput(8,Array(32).fill('find H').join('\n')).length,32);
  for(const input of ['join A','join A B C','union A B','find a','find E','find 0','join A B\nunknown','x'.repeat(4097),Array(33).fill('find A').join('\n')])assert.throws(()=>parseUnionFindInput(4,input));
  assert.throws(()=>parseUnionFindInput(4,'find A\nfind E'),/Line 2/);
});
test('the original course passes the unchanged deck reader and contains twelve distinct questions',async()=>{
  const text=await readFile(new URL('../courses/union-find.json',import.meta.url),'utf8');
  const course=parseDeck(text);
  assert.equal(course.items.length,12);
  assert.equal(new Set(course.items.map(item=>item.id)).size,12);
  assert.equal(course.concepts.length,6);
  assert.ok(new TextEncoder().encode(text).length<=262144);
});
test('the standalone explorer matches all declared model, content and UI inputs',()=>{
  const result=spawnSync(process.execPath,[fileURLToPath(new URL('../tools/build-union-find.mjs',import.meta.url)),'--check'],{encoding:'utf8'});
  assert.equal(result.status,0,result.stdout+result.stderr);
});
