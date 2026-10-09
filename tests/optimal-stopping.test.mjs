import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {analyzeOrder, thresholdTable} from '../courses/optimal-stopping-core.mjs';
import {parseDeck} from '../src/deck.mjs';
function* permutations(a) { if (!a.length) {yield [];return;} for(let i=0;i<a.length;i++) for(const rest of permutations(a.filter((_,j)=>j!==i))) yield [a[i],...rest]; }
test('all finite table counts equal literal permutation choices', () => {
 for(let n=1;n<=8;n++){const counts=Array(n).fill(0);let total=0;
  for(const order of permutations(Array.from({length:n},(_,i)=>i+1))){total++;
   for(let skip=0;skip<n;skip++){let choice=n-1;for(let i=skip;i<n;i++){if(order.slice(0,i).every(v=>v<order[i])){choice=i;break;}}if(order[choice]===n)counts[skip]++;}
  }
  const table=thresholdTable(n);assert.equal(table.totalPermutations,total);assert.deepEqual(table.thresholds.map(r=>r.wins),counts);
  assert.deepEqual(table.bestSkips,counts.flatMap((w,i)=>w===Math.max(...counts)?[i]:[]));
  for(const r of table.thresholds){assert.equal(r.fraction.numerator/r.fraction.denominator,r.probability);assert.equal(r.total,total);}
 }
});
test('record selection stops observing future rows',()=>{
 const r=analyzeOrder(5,2,[2,4,1,5,3]);assert.deepEqual(r.selected,{index:4,rank:5,action:'select-record'});assert.equal(r.success,true);
 assert.deepEqual(r.trace.map(x=>x.action),['observe','observe','reject','select-record','not-observed']);
 assert.deepEqual(r.trace[4],{index:5,rank:3,observed:false,bestSeenBefore:null,isRecord:null,action:'not-observed'});
});
test('fallback differs from final record and never recalls',()=>{
 assert.deepEqual(analyzeOrder(4,1,[4,1,3,2]).selected,{index:4,rank:2,action:'select-last'});
 assert.deepEqual(analyzeOrder(4,3,[1,3,2,4]).selected,{index:4,rank:4,action:'select-record'});
 assert.equal(analyzeOrder(4,3,[4,1,3,2]).success,false);
});
test('single item, zero skip and all ties remain explicit',()=>{
 assert.deepEqual(thresholdTable(1).bestSkips,[0]);assert.deepEqual(thresholdTable(2).bestSkips,[0,1]);
 assert.equal(analyzeOrder(1,0,[1]).success,true);assert.equal(analyzeOrder(5,0,[3,1,5,2,4]).selected.index,1);
});
test('inputs are preserved and output arrays are detached',()=>{
 const order=Object.freeze([2,1,4,3]);const r=analyzeOrder(4,1,order);r.inputs.order[0]=4;r.trace[0].rank=4;
 assert.deepEqual(order,[2,1,4,3]);assert.equal(analyzeOrder(4,1,order).trace[0].rank,2);
});
test('all strict input bounds and malformed arrays refuse',()=>{
 for(const n of [0,9,-0,1.5,NaN,Infinity,'4',true,null])assert.throws(()=>thresholdTable(n));
 for(const s of [-1,-0,4,1.5,NaN,Infinity,'1',false,null])assert.throws(()=>analyzeOrder(4,s,[1,2,3,4]));
 for(const a of [null,'1234',[1,2,3],[1,2,3,4,5],[1,1,3,4],[0,2,3,4],[-0,2,3,4],[1,2,3,Infinity],[1,2,3,'4'],[1,,3,4],new Uint8Array([1,2,3,4])])assert.throws(()=>analyzeOrder(4,1,a));
});
test('course meets unchanged learner schema with twelve original items',()=>{
 const d=parseDeck(readFileSync(new URL('../courses/optimal-stopping.json',import.meta.url),'utf8'));
 assert.equal(d.items.length,12);assert.equal(d.concepts.length,4);assert.equal(new Set(d.items.map(x=>x.id)).size,12);
});
