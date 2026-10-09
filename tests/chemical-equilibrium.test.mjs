import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {solveEquilibrium,sampleExtent} from '../src/chemical-equilibrium.mjs';
import {parseDeck} from '../src/deck.mjs';
import {initialMastery,selectNextItem,updateMastery} from '../src/knowledge.mjs';
import {createReview,beginPractice,answerPractice,currentPracticeItem} from '../src/review.mjs';
import {createStudyNotes} from '../src/session-export.mjs';
import {buildEquilibriumLab} from '../tools/build-chemical-equilibrium.mjs';
const input=(a='2',b='2',c='0',K='1')=>({a,b,c,K});
const frac=s=>{const [n,d]=s.split('/').map(BigInt);assert.ok(d>0n);return [n,d];};
const cmp=(a,b)=>{const [an,ad]=frac(a),[bn,bd]=frac(b),v=an*bd-bn*ad;return v<0n?-1:v>0n?1:0;};
const number=s=>{const [n,d]=frac(s);return Number(n)/Number(d);};
const add=(a,b)=>{const [an,ad]=frac(a),[bn,bd]=frac(b);return (an*bd+bn*ad)+'/'+(ad*bd);};
const sub=(a,b)=>{const [bn,bd]=frac(b);return add(a,(-bn)+'/'+bd);};
const scaled=s=>{const [w,f='']=s.trim().split('.');return BigInt(w)*1000000n+BigInt(f.padEnd(6,'0'));};
function residualNumerator(v,x){
  const [n,d]=frac(x),S=1000000n;
  const A=scaled(v.a),B=scaled(v.b),C=scaled(v.c),K=scaled(v.K);
  return K*(A*d-n*S)*(B*d-n*S)-(C*d+n*S)*S*S*d;
}
function checkExactBounds(v,r){
  assert.equal(r.schema,'recallweave-chemical-equilibrium/1');
  const e=r.equilibrium.extent;
  assert.ok(cmp(e.lower,r.feasible_extent.lower)>=0);
  assert.ok(cmp(e.upper,r.feasible_extent.upper)<=0);
  assert.ok(cmp(e.lower,e.upper)<=0);
  assert.ok(residualNumerator(v,e.lower)>=0n);
  assert.ok(residualNumerator(v,e.upper)<=0n);
  assert.equal(cmp(e.width,sub(e.upper,e.lower)),0);
  const [mn,md]=frac(e.midpoint);
  assert.equal(cmp((2n*mn)+'/'+md,add(e.lower,e.upper)),0);
  const [wn,wd]=frac(e.width),[fn,fd]=frac(sub(r.feasible_extent.upper,r.feasible_extent.lower));
  assert.ok(wn*(2n**64n)*fd<=fn*wd);
  for(const name of ['a','b','c']){
    const q=r.equilibrium.concentrations[name];
    assert.ok(cmp(q.lower,'0/1')>=0);assert.ok(cmp(q.lower,q.midpoint)<=0);assert.ok(cmp(q.midpoint,q.upper)<=0);
    assert.equal(cmp(q.midpoint,name==='c'?add(r.exact_inputs[name],e.midpoint):sub(r.exact_inputs[name],e.midpoint)),0);
  }
  assert.equal(cmp(add(r.equilibrium.concentrations.a.midpoint,r.equilibrium.concentrations.c.midpoint),r.conserved.a_plus_c),0);
  assert.equal(cmp(add(r.equilibrium.concentrations.b.midpoint,r.equilibrium.concentrations.c.midpoint),r.conserved.b_plus_c),0);
  r.trace.forEach((row,index)=>{
    assert.equal(row.step,index);assert.ok(residualNumerator(v,row.lower)>=0n);assert.ok(residualNumerator(v,row.upper)<=0n);
    assert.ok(cmp(row.lower,row.upper)<=0);
    if(index){assert.ok(cmp(row.lower,r.trace[index-1].lower)>=0);assert.ok(cmp(row.upper,r.trace[index-1].upper)<=0);}
  });
  assert.equal(r.trace.at(-1).lower,e.lower);assert.equal(r.trace.at(-1).upper,e.upper);
  assert.ok(r.trace.length<=65);
  if(r.equilibrium.kind==='exact')assert.equal(e.width,'0/1');
  else {assert.equal(r.trace.length,65);assert.notEqual(e.width,'0/1');}
  assert.doesNotThrow(()=>JSON.stringify(r));
}
test('literal roots retain signed extent, stoichiometry and quotient domain',()=>{
  const rows=[
    [input('2','2','0','1'),'forward','1/1',['1/1','1/1','1/1']],
    [input('0','0','2','1'),'reverse','-1/1',['1/1','1/1','1/1']],
    [input('1','1','1','1'),'balanced','0/1',['1/1','1/1','1/1']],
    [input('3','2','0','0.5'),'forward','1/1',['2/1','1/1','1/1']],
    [input('0','1','2','0.5'),'reverse','-1/1',['1/1','2/1','1/1']],
    [input('2','0','0','1'),'no_feasible_change','0/1',['2/1','0/1','0/1']],
    [input('0','0','0','1000'),'no_feasible_change','0/1',['0/1','0/1','0/1']]
  ];
  for(const [v,direction,x,values]of rows){
    const before=JSON.stringify(v),r=solveEquilibrium(Object.freeze(v));checkExactBounds(v,r);
    assert.equal(r.direction,direction);assert.equal(r.equilibrium.extent.midpoint,x);
    assert.equal(r.equilibrium.kind,'exact');
    assert.deepEqual(['a','b','c'].map(k=>r.equilibrium.concentrations[k].midpoint),values);
    assert.equal(JSON.stringify(v),before);
    assert.equal(r.initial_quotient.kind,(v.a==='0'||v.b==='0')?'undefined':'finite');
  }
});
test('same component totals reach the same composition from opposite directions',()=>{
  const rs=[input('2','2','0'),input('0','0','2'),input('1','1','1')].map(solveEquilibrium);
  for(const r of rs){assert.deepEqual(r.conserved,{a_plus_c:'2/1',b_plus_c:'2/1'});assert.deepEqual(r.equilibrium.concentrations,rs[0].equilibrium.concentrations);}
});
test('192 exact brackets agree with an independent stable quadratic formula',()=>{
  let cases=0;
  for(const a of ['0','0.1','1','3'])for(const b of ['0','0.1','1','3'])for(const c of ['0','0.1','1','3'])for(const K of ['0.001','1','1000']){
    const v=input(a,b,c,K),r=solveEquilibrium(v);checkExactBounds(v,r);
    const A=Number(a),B=Number(b),C=Number(c),k=Number(K);
    const discriminant=k*k*(A-B)*(A-B)+2*k*(A+B)+1+4*k*C;
    const x=2*(k*A*B-C)/(k*(A+B)+1+Math.sqrt(discriminant));
    assert.ok(Math.abs(number(r.equilibrium.extent.midpoint)-x)<=1e-11,JSON.stringify(v));
    cases++;
  }
  assert.equal(cases,192);
});
test('bounds include largest inputs and small positive supplied K without cancellation decisions',()=>{
  for(const v of [input('100','100','100','1000'),input('100','0.000001','100','0.001'),input('0.000001','0.000001','0','1000'),input('1.000001','1','1','1'),input('100','100','0','0.001')])checkExactBounds(v,solveEquilibrium(v));
});
test('101 composition inspections conserve components and distinguish domain endpoints',()=>{
  const v=input('3','2','1','2');
  const lo=sampleExtent(v,0),mid=sampleExtent(v,50),hi=sampleExtent(v,100);
  assert.deepEqual([lo.extent,lo.a,lo.b,lo.c],['-1/1','4/1','3/1','0/1']);
  assert.deepEqual(lo.quotient,{kind:'finite',value:'0/1'});assert.equal(lo.direction,'forward');
  assert.deepEqual([mid.extent,mid.a,mid.b,mid.c],['1/2','5/2','3/2','3/2']);
  assert.deepEqual(mid.quotient,{kind:'finite',value:'2/5'});
  assert.deepEqual([hi.extent,hi.a,hi.b,hi.c],['2/1','1/1','0/1','3/1']);
  assert.deepEqual(hi.quotient,{kind:'undefined',reason:'zero_reactant_concentration'});assert.equal(hi.direction,'reverse');
  for(let tick=0;tick<=100;tick++){const p=sampleExtent(v,tick);assert.equal(cmp(add(p.a,p.c),'4/1'),0);assert.equal(cmp(add(p.b,p.c),'3/1'),0);for(const k of ['a','b','c'])assert.ok(cmp(p[k],'0/1')>=0);}
  for(const tick of [-1,101,0.5,'1',true,NaN,Infinity,null])assert.throws(()=>sampleExtent(v,tick));
});
test('strict input refusal is recoverable and does not call accessor fields',()=>{
  const bad=[null,[],true,'2',{},Object.create(null),{...input(),extra:'1'},input(2),input(''),input(' '),input('-1'),input('+1'),input('.1'),input('1.'),input('1e0'),input('0x1'),input('1,2'),input('1_000'),input('NaN'),input('Infinity'),input('0.0000001'),input('100.000001'),input('1'.repeat(33)),input('1','1','1','0'),input('1','1','1','0.000999'),input('1','1','1','1000.000001')];
  for(const v of bad)assert.throws(()=>solveEquilibrium(v));
  const symbolic=input();symbolic[Symbol('extra')]='1';assert.throws(()=>solveEquilibrium(symbolic));
  let touched=false;const accessor=input();Object.defineProperty(accessor,'a',{get(){touched=true;return '2';},enumerable:true});assert.throws(()=>solveEquilibrium(accessor));assert.equal(touched,false);
  const accepted=solveEquilibrium(input(' 2.000000 ','02','0.0','1.000'));
  assert.deepEqual(accepted.exact_inputs,{a:'2/1',b:'2/1',c:'0/1',K:'1/1'});assert.equal(accepted.equilibrium.extent.midpoint,'1/1');
});
test('original course uses unchanged native selection, separate review/practice and complete notes',()=>{
  const raw=fs.readFileSync(new URL('../courses/chemical-equilibrium.json',import.meta.url),'utf8'),deck=parseDeck(raw);
  assert.equal(deck.items.length,12);assert.equal(deck.concepts.length,4);
  assert.deepEqual([0,1,2,3].map(i=>deck.items.filter(x=>x.answer===i).length),[3,3,3,3]);
  const mastery=initialMastery(deck.concepts),asked=new Set(),answers=[];
  while(asked.size<12){const q=selectNextItem(deck.items,asked,mastery);assert.ok(q);const choice=q.id==='chem-eq-08'?(q.answer+1)%4:q.answer;answers.push({item:q.id,choice});asked.add(q.id);mastery[q.concept]=updateMastery(mastery[q.concept],choice===q.answer);}
  const review=createReview(deck.items,answers),before=JSON.stringify({mastery,review,answers});
  assert.equal(review.filter(x=>x.correct).length,11);let practice=beginPractice(review);
  const q=currentPracticeItem(practice);assert.equal(q.id,'chem-eq-08');practice=answerPractice(practice,q.id,q.answer);assert.equal(currentPracticeItem(practice),null);
  const notes=createStudyNotes({deck,review,mastery,practice,exportedAt:new Date('2026-10-09T00:00:00Z')});
  assert.ok(notes.text.includes('11 of 12'));assert.ok(notes.text.includes('1 correct on retry'));
  for(const q of deck.items)for(const k of ['prompt','explanation','transfer'])assert.ok(notes.text.includes(q[k]));
  assert.equal(JSON.stringify({mastery,review,answers}),before);
});
test('standalone artifact rebuilds deterministically and its complete script parses',()=>{
  const a=buildEquilibriumLab(),b=buildEquilibriumLab();assert.equal(a,b);
  assert.equal(fs.readFileSync(new URL('../courses/chemical-equilibrium-lab.html',import.meta.url),'utf8'),a);
  const script=a.match(/<script type="module" id="lab-script">([\s\S]*?)<\/script>/)?.[1];assert.ok(script);
  new vm.Script(script,{filename:'chemical-equilibrium-lab.inline.js'});
  assert.ok(!/^\s*(?:import|export)\s/m.test(script));
  assert.ok(a.includes("connect-src 'none'"));assert.ok(a.includes('aria-live="polite"'));
});
