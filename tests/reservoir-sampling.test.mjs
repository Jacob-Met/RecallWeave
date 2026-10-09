import test from 'node:test';
import assert from 'node:assert/strict';
import {traceReservoir, distributionReservoir} from '../src/reservoir-sampling.mjs';

test('a literal chosen history distinguishes slot order from unordered subset', () => {
 const t=traceReservoir({items:['A','B','C','D','E'],capacity:2,draws:[2,4,1]});
 assert.deepEqual(t.sample,[5,3]);assert.deepEqual(t.subset,[3,5]);
 assert.deepEqual(t.steps.map(s=>s.action),['initial','replace','skip','replace']);
 assert.deepEqual(t.steps.map(s=>s.after),[[1,2],[1,3],[1,3],[5,3]]);
 assert.deepEqual(t.steps[2],{seen:4,incoming:{position:4,label:'D'},draw:4,action:'skip',slot:null,removed:null,before:[1,3],after:[1,3]});
 assert.equal(t.steps[3].removed,1);assert.equal(t.steps[1].slot,2);
});
test('empty draw history fills an all-item reservoir exactly once', () => {
 const t=traceReservoir({items:['a','b','c'],capacity:3,draws:[]});
 assert.equal(t.steps.length,1);assert.deepEqual(t.steps[0].before,[]);assert.deepEqual(t.sample,[1,2,3]);
 const d=distributionReservoir({itemCount:3,capacity:3});
 assert.equal(d.histories,1);assert.deepEqual(d.subsets,[{positions:[1,2,3],count:1,probability:{numerator:1,denominator:1}}]);
});
test('duplicate and literal labels retain positional identity and copied frozen state', () => {
 const labels=[' oak ',' oak ','<b>Ω</b>','\0','\ud800'],draws=[1,2,5];
 const t=traceReservoir({items:labels,capacity:2,draws});
 labels[0]='changed';draws[0]=3;
 assert.equal(t.items[0].label,' oak ');assert.equal(t.items[1].label,' oak ');
 assert.equal(t.items[3].label,'\0');assert.equal(t.items[4].label,'\ud800');
 assert.deepEqual(t.sample,[3,4]);assert.equal(t.draws[0],1);
 assert.throws(()=>t.steps[0].after.push(9),TypeError);
 assert.throws(()=>t.items[0].label='changed',TypeError);
 assert.deepEqual(JSON.parse(JSON.stringify(t)),t);
});
test('four-choose-two full distribution has twelve equally likely histories', () => {
 const d=distributionReservoir({itemCount:4,capacity:2});
 assert.equal(d.histories,12);
 assert.deepEqual(d.subsets.map(s=>s.positions),[[1,2],[1,3],[1,4],[2,3],[2,4],[3,4]]);
 assert.ok(d.subsets.every(s=>s.count===2&&s.probability.numerator===1&&s.probability.denominator===6));
 assert.ok(d.marginals.every(s=>s.count===6&&s.probability.numerator===1&&s.probability.denominator===2));
 assert.equal(d.uniformSubsets,true);
 assert.throws(()=>d.subsets[0].positions.reverse(),TypeError);
});
test('all twenty-one admitted dimensions satisfy combinatorial totals and marginals', () => {
 const fact=n=>n<2?1:n*fact(n-1);
 for(let n=1;n<=8;n++)for(let k=1;k<=Math.min(n,3);k++){
  const d=distributionReservoir({itemCount:n,capacity:k}),total=fact(n)/fact(k),combinations=fact(n)/(fact(k)*fact(n-k));
  assert.equal(d.histories,total);assert.equal(d.subsets.length,combinations);
  assert.equal(d.subsets.reduce((s,x)=>s+x.count,0),total);
  assert.ok(d.subsets.every(x=>x.count===total/combinations&&x.positions.length===k));
  assert.ok(d.marginals.every(x=>x.count*n===total*k));
 }
});
test('strict complete input admission refuses malformed or late invalid values', () => {
 const good={items:['A','B','C'],capacity:1,draws:[1,1]};
 const bad=[null,[],{}, {...good,items:[]},{...good,items:[' ']},{...good,items:['a\nb','B','C']},{...good,items:['x'.repeat(49),'B','C']},{...good,items:new Array(3)},
 {...good,capacity:true},{...good,capacity:'1'},{...good,capacity:0},{...good,capacity:4},{...good,draws:[1]},{...good,draws:[1,1,1]},{...good,draws:[1,'2']},{...good,draws:[1,0]},{...good,draws:[1,4]},{...good,draws:[1,1.5]},{...good,draws:[1,Infinity]},{...good,draws:new Array(2)}];
 for(const x of bad)assert.throws(()=>traceReservoir(x),TypeError);
 for(const x of [{itemCount:0,capacity:1},{itemCount:9,capacity:1},{itemCount:3,capacity:4},{itemCount:'3',capacity:1},{itemCount:3,capacity:false}])assert.throws(()=>distributionReservoir(x),TypeError);
 assert.deepEqual(good,{items:['A','B','C'],capacity:1,draws:[1,1]});
});
