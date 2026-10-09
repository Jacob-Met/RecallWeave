import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {computeDiffusion} from '../src/diffusion-stencil.mjs';
import {parseDeck} from '../src/deck.mjs';
import {initialMastery,selectNextItem,updateMastery} from '../src/knowledge.mjs';
import {createReview,beginPractice,answerPractice,currentPracticeItem} from '../src/review.mjs';
const base=()=>({values:[8,0,0,0,0,0,0,0],numerator:1,denominator:4,steps:8});
const f=(n,d=1)=>({numerator:String(n),denominator:String(d)});
const vals=row=>row.values.map(x=>x.denominator==='1'?x.numerator:x.numerator+'/'+x.denominator);
test('simultaneous pulse includes periodic wraparound, complete old-row trace',()=>{
 const x=computeDiffusion(base());assert.deepEqual(vals(x.rows[1]),['4','2','0','0','0','0','0','2']);
 assert.deepEqual(x.rows[1].transition[1].previous,[f(8),f(0),f(0)]);
 assert.deepEqual(x.rows[1].transition[7].indices,[6,7,0]);assert.equal(x.rows[0].transition,null);
 assert.deepEqual(vals(x.rows[2]),['3','2','1/2','0','0','0','1/2','2']);
});
test('zero ratio and zero steps retain exact initial rows',()=>{
 const a=base();a.numerator=0;assert.ok(computeDiffusion(a).rows.every(r=>JSON.stringify(r.values)===JSON.stringify(a.values.map(v=>f(v)))));
 assert.equal(computeDiffusion({...base(),steps:0}).rows.length,1);
});
test('nonreduced ratio records original input and canonical weights',()=>{
 const x=computeDiffusion({...base(),numerator:4,denominator:8});
 assert.equal(x.input.numerator,4);assert.deepEqual(x.ratio,f(1,2));assert.deepEqual(x.weights,[f(1,2),f(0),f(1,2)]);
});
test('constant signed field is fixed even beyond the convex boundary',()=>{
 for(const v of [-20,0,20])for(const n of [0,1,8,16]){
  const x=computeDiffusion({values:Array(8).fill(v),numerator:n,denominator:16,steps:24});
  assert.ok(x.rows.every(r=>r.values.every(x=>JSON.stringify(x)===JSON.stringify(f(v)))));
  assert.ok(x.rows.every(r=>r.squaredDeviations.numerator==='0'));
 }
});
test('alternating exact damping, boundary cycle, growing mode and offset',()=>{
 const values=[1,-1,1,-1,1,-1,1,-1];
 for(const [n,d,expect] of [[1,4,[0,0,0]],[1,2,[-1,1,-1]],[3,4,[-2,4,-8]],[1,1,[-3,9,-27]]]){
  const x=computeDiffusion({values,numerator:n,denominator:d,steps:3});
  assert.deepEqual(x.rows.slice(1).map(r=>r.values[0]),expect.map(v=>f(v)));
  assert.ok(x.rows.every(r=>r.sum.numerator==='0'));
 }
 const y=computeDiffusion({values:[2,0,2,0,2,0,2,0],numerator:3,denominator:4,steps:2});
 assert.deepEqual(vals(y.rows[2]),['5','-3','5','-3','5','-3','5','-3']);
 assert.deepEqual(y.rows.map(r=>r.squaredDeviations),[f(8),f(32),f(128)]);
});
test('sum and exact half-integer mean remain conserved for signed data',()=>{
 const x=computeDiffusion({values:[-2,6,0,0,0,0,0,0],numerator:7,denominator:13,steps:24});
 assert.ok(x.rows.every(r=>JSON.stringify(r.sum)===JSON.stringify(f(4))&&JSON.stringify(r.mean)===JSON.stringify(f(1,2))));
});
test('convex boundary and range envelope for admitted nonnegative weights',()=>{
 for(let d=1;d<=16;d++)for(let n=0;n<=d;n++){
  const x=computeDiffusion({...base(),numerator:n,denominator:d,steps:3});
  assert.equal(x.convexWeights,2*n<=d);
  if(x.convexWeights)for(const r of x.rows){assert.ok(BigInt(r.minimum.numerator)>=0n);assert.ok(BigInt(r.maximum.numerator)<=8n*BigInt(r.maximum.denominator));}
 }
});
test('returned graph is detached recursively frozen and JSON-safe',()=>{
 const a=base(), before=JSON.stringify(a),x=computeDiffusion(a);assert.equal(JSON.stringify(a),before);
 const walk=v=>{if(v&&typeof v==='object'){assert.ok(Object.isFrozen(v));Object.values(v).forEach(walk);}};walk(x);
 a.values[0]=19;assert.equal(x.input.values[0],8);assert.throws(()=>x.rows[1].values[0].numerator='7',TypeError);
 assert.deepEqual(JSON.parse(JSON.stringify(x)),x);
});
test('strict integer and object admission',()=>{
 for(const v of [null,undefined,[],true,3,'x'])assert.throws(()=>computeDiffusion(v));
 for(const key of ['numerator','denominator','steps'])for(const v of [true,'1',NaN,Infinity,-Infinity,0.5,null,undefined])assert.throws(()=>computeDiffusion({...base(),[key]:v}));
 for(const patch of [{numerator:-1},{numerator:17},{denominator:0},{denominator:17},{numerator:2,denominator:1},{steps:-1},{steps:25}])assert.throws(()=>computeDiffusion({...base(),...patch}));
});
test('dense eight-cell input and each bounded value are mandatory',()=>{
 for(const values of [[],Array(7).fill(0),Array(9).fill(0),Array(8),{length:8},'00000000'])assert.throws(()=>computeDiffusion({...base(),values}));
 for(const v of [true,'0',NaN,Infinity,0.5,-21,21,null,undefined]){const values=base().values;values[4]=v;assert.throws(()=>computeDiffusion({...base(),values}));}
 const values=base().values;delete values[2];assert.throws(()=>computeDiffusion({...base(),values}));
});
test('negative zero is admitted as mathematical zero and unknown fields are inert',()=>{
 const a=base();a.values[3]=-0;a.numerator=-0;const x=computeDiffusion({...a,ignored:'yes'});assert.deepEqual(x.ratio,f(0));assert.deepEqual(x.rows[0].values[3],f(0));
 assert.deepEqual(computeDiffusion({...base(),ignored:3}),computeDiffusion(base()));
});
test('maximum horizon remains bounded and every exact denominator positive',()=>{
 const x=computeDiffusion({values:[-20,20,-20,20,-20,20,-20,20],numerator:15,denominator:16,steps:24});
 assert.equal(x.rows.length,25);assert.equal(x.rows.at(-1).transition.length,8);
 const walk=v=>{if(v&&typeof v==='object'){if(typeof v.numerator==='string'){assert.match(v.numerator,/^-?[0-9]+$/);assert.ok(BigInt(v.denominator)>0n);}Object.values(v).forEach(walk);}};walk(x);
 assert.ok(JSON.stringify(x).length<200000);
});
test('original12-question course runs existing adaptive review and missed retry',()=>{
 const deck=parseDeck(fs.readFileSync(new URL('../courses/diffusion-stencil.json',import.meta.url),'utf8'));
 assert.equal(deck.items.length,12);const mastery=initialMastery(deck.concepts),asked=new Set(),answers=[];
 while(asked.size<12){const q=selectNextItem(deck.items,asked,mastery), choice=answers.length===2?(q.answer+1)%4:q.answer;asked.add(q.id);answers.push({item:q.id,choice});mastery[q.concept]=updateMastery(mastery[q.concept],choice===q.answer);}
 const review=createReview(deck.items,answers);assert.equal(review.filter(x=>x.correct).length,11);let round=beginPractice(review);assert.equal(round.items.length,1);const q=currentPracticeItem(round);round=answerPractice(round,q.id,q.answer);assert.equal(currentPracticeItem(round),null);assert.equal(review[2].correct,false);
});
