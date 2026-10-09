import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeWalk} from '../src/absorbing-walk.mjs';
const input=(overrides={})=>({upper:3,start:1,rightNumerator:1,rightDenominator:2,horizon:3,...overrides});
const f=(n,d=1)=>({numerator:String(n),denominator:String(d)});
const pair=x=>[BigInt(x.numerator),BigInt(x.denominator)];
const same=(x,n,d=1)=>assert.deepEqual(x,f(n,d));
function sumEqual(values,wanted) {
 let n=0n,d=1n;
 for(const x of values){const [a,b]=pair(x);n=n*b+a*d;d*=b;}
 const [a,b]=pair(wanted);assert.equal(n*b,a*d);
}
function weighted(values,weights,wanted,constant=0n) {
 let n=constant,d=1n;
 for(let i=0;i<values.length;i++){const[a,b]=pair(values[i]);const[c,e]=pair(weights[i]);n=n*b*e+a*c*d;d*=b*e;}
 const [a,b]=pair(wanted);assert.equal(n*b,a*d);
}
test('literal fair first arrivals and finite survival differ from absorbed mass',()=>{
 const a=analyzeWalk(input());
 assert.deepEqual(a.frames.map(x=>x.distribution),[
 [f(0),f(1),f(0),f(0)],
 [f(1,2),f(0),f(1,2),f(0)],
 [f(1,2),f(1,4),f(0),f(1,4)],
 [f(5,8),f(0),f(1,8),f(1,4)]
 ]);
 assert.deepEqual(a.frames.map(x=>x.firstArrival.left),[f(0),f(1,2),f(0),f(1,8)]);
 assert.deepEqual(a.frames.map(x=>x.firstArrival.right),[f(0),f(0),f(1,4),f(0)]);
 assert.deepEqual(a.frames.map(x=>x.truncatedExpectedSteps),[f(0),f(1),f(3,2),f(7,4)]);
 same(a.eventual[1].right,1,3);same(a.eventual[1].expectedSteps,2);same(a.frames[3].expectedExcessSteps,1,4);
});
test('biased solution, unreduced input and full JSON retain exact meaning',()=>{
 const source=input({upper:4,start:2,rightNumerator:4,rightDenominator:6,horizon:30});
 const before=JSON.stringify(source),a=analyzeWalk(source);
 same(a.probabilities.right,2,3);same(a.eventual[2].right,4,5);same(a.eventual[2].expectedSteps,18,5);
 assert.equal(a.input.rightNumerator,4);assert.equal(a.input.rightDenominator,6);
 assert.equal(a.frames.length,31);assert.equal(JSON.stringify(source),before);
 assert.deepEqual(JSON.parse(JSON.stringify(a)),a);
});
test('deterministic walks and boundary time zero retain post-absorption frames',()=>{
 for(const right of [0,1]){
  const a=analyzeWalk(input({upper:6,start:4,rightNumerator:right,rightDenominator:1,horizon:8}));
  const distance=right?2:4,end=right?6:0;
  same(a.eventual[4].expectedSteps,distance);
  for(const frame of a.frames){same(frame.distribution[frame.step>=distance?end:right?4+frame.step:4-frame.step],1);}
  same(a.frames[distance].firstArrival[right?'right':'left'],1);
  same(a.frames[distance+1].firstArrival[right?'right':'left'],0);
 }
 for(const start of [0,6])for(const rightNumerator of [0,1,2]){
  const a=analyzeWalk(input({upper:6,start,rightNumerator,rightDenominator:2,horizon:2}));
  same(a.frames[0].firstArrival[start?'right':'left'],1);
  for(const row of a.frames){same(row.survival,0);same(row.truncatedExpectedSteps,0);same(row.expectedExcessSteps,0);}
 }
});
test('zero horizon has no contributions and eventual time is still meaningful',()=>{
 const a=analyzeWalk(input({upper:6,start:3,horizon:0}));
 assert.equal(a.frames.length,1);assert.deepEqual(a.frames[0].contributions,[]);
 same(a.frames[0].survival,1);same(a.frames[0].truncatedExpectedSteps,0);same(a.frames[0].expectedExcessSteps,9);
});
test('all denominator bounds satisfy exact independent boundary recurrences',()=>{
 for(let upper=2;upper<=8;upper++)for(let denominator=1;denominator<=12;denominator++)for(let numerator=0;numerator<=denominator;numerator++){
  const a=analyzeWalk(input({upper,start:1,rightNumerator:numerator,rightDenominator:denominator,horizon:0}));
  same(a.eventual[0].right,0);same(a.eventual[upper].right,1);
  same(a.eventual[0].expectedSteps,0);same(a.eventual[upper].expectedSteps,0);
  for(let i=1;i<upper;i++){
   weighted([a.eventual[i-1].right,a.eventual[i+1].right],[a.probabilities.left,a.probabilities.right],a.eventual[i].right);
   weighted([a.eventual[i-1].expectedSteps,a.eventual[i+1].expectedSteps],[a.probabilities.left,a.probabilities.right],a.eventual[i].expectedSteps,1n);
   sumEqual([a.eventual[i].left,a.eventual[i].right],f(1));
  }
 }
});
test('full finite traces conserve mass, telescope arrivals and reconstruct from all ordered edges',()=>{
 for(let upper=2;upper<=8;upper++)for(const[a,b]of[[0,1],[1,1],[1,2],[1,12],[11,12],[2,3]])for(const start of [0,1,upper]){
  const result=analyzeWalk(input({upper,start,rightNumerator:a,rightDenominator:b,horizon:30}));
  const left=[],right=[],survival=[];
  for(const frame of result.frames){
   sumEqual(frame.distribution,f(1));sumEqual([frame.absorbed.left,frame.absorbed.right,frame.survival],f(1));
   left.push(frame.firstArrival.left);right.push(frame.firstArrival.right);
   sumEqual(left,frame.absorbed.left);sumEqual(right,frame.absorbed.right);
   sumEqual(survival,frame.truncatedExpectedSteps);
   survival.push(frame.survival);
   sumEqual([frame.expectedExcessSteps,frame.truncatedExpectedSteps],result.eventual[start].expectedSteps);
   if(frame.step>0){
    const edges=[];for(let from=0;from<=upper;from++)if(from===0||from===upper)edges.push([from,from]);else edges.push([from,from-1],[from,from+1]);
    assert.deepEqual(frame.contributions.map(x=>[x.from,x.to]),edges);
    for(let to=0;to<=upper;to++)sumEqual(frame.contributions.filter(x=>x.to===to).map(x=>x.mass),frame.distribution[to]);
   }
  }
 }
});
test('strict refusal never coerces missing, extra or out-of-range fields',()=>{
 const invalid=[null,[],0,'walk',{}, {...input(),extra:0},{...input(),[Symbol('extra')]:0}];
 for(const key of Object.keys(input())){
  const missing=input();delete missing[key];invalid.push(missing);
  for(const value of ['1',null,true,NaN,Infinity,1.5,undefined])invalid.push(input({[key]:value}));
 }
 for(const change of [{upper:1},{upper:9},{start:-1},{start:4},{rightDenominator:0},{rightDenominator:13},{rightNumerator:-1},{rightNumerator:3},{horizon:-1},{horizon:31}])invalid.push(input(change));
 for(const value of invalid)assert.throws(()=>analyzeWalk(value),Error);
});
