import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {analyzeInduction, parseInductionInputs, EXAMPLES, fractionText} from '../src/mathematical-induction.mjs';
import {parseDeck} from '../src/deck.mjs';

const fields = ['a', 'b', 'A', 'B', 'C', 'D', 'n0'];
const input = example => Object.fromEntries(fields.map(key => [key, example[key]]));
const odd = input(EXAMPLES[0]);
const numericSum = (a,b,n) => { let total=0; for(let k=1;k<=n;k++) total += a*k+b; return total; };
const qnum = (v,n) => v.A*n*n+v.B*n+v.C;
const equivalent = (fraction,numerator,denominator=1) => {
  assert.equal(BigInt(fraction.numerator)*BigInt(denominator), BigInt(numerator)*BigInt(fraction.denominator));
};

test('six worked examples distinguish base, step and finite evidence', () => {
  const results = EXAMPLES.map(example => analyzeInduction(input(example)));
  assert.deepEqual(results.map(r => [r.base.pass,r.successor.pass,r.proved]), [
    [true,true,true],[true,true,true],[false,true,false],
    [true,false,false],[true,false,false],[true,true,true]
  ]);
  assert.equal(results[2].base.actual,'0');
  assert.equal(fractionText(results[2].base.proposed),'5');
  assert.deepEqual(results[4].rows.slice(0,3).map(row => [row.n,row.actual,fractionText(row.proposed),row.equal]), [
    [1,'1','1',true],[2,'3','3',true],[3,'6','8',false]
  ]);
  assert.equal(results[4].firstDisplayedCounterexample,3);
  assert.equal(results[5].rows[3].actual,'-3');
});

test('independent finite sums and differences receive 1458 bounded exact certificates', () => {
  let count=0;
  for(const a of [-2,0,3]) for(const b of [-2,0,3])
  for(const A of [-2,0,3]) for(const B of [-2,0,3]) for(const C of [-2,0,3])
  for(const D of [1,2,7]) for(const n0 of [0,1]) {
    const v={a,b,A,B,C,D,n0};
    const r=analyzeInduction(v);
    const base=qnum(v,n0)===D*numericSum(a,b,n0);
    const independentDifference=n => qnum(v,n+1)-qnum(v,n)-D*(a*(n+1)+b);
    const step=[n0,n0+1].every(n=>independentDifference(n)===0);
    assert.equal(r.base.pass,base);
    assert.equal(r.successor.pass,step);
    assert.equal(r.proved,base&&step);
    assert.equal(r.finiteRowsAreProof,false);
    for(const row of r.rows) {
      assert.equal(Number(row.actual),numericSum(a,b,row.n));
      equivalent(row.proposed,qnum(v,row.n),D);
      equivalent(row.proposedNext,qnum(v,row.n+1),D);
      equivalent(row.hypothesisPlusNext,qnum(v,row.n)+D*(a*(row.n+1)+b),D);
      equivalent(row.residual,independentDifference(row.n),D);
      assert.equal(row.equal,qnum(v,row.n)===D*numericSum(a,b,row.n));
      assert.equal(Number(r.successor.linearNumerator)*row.n+Number(r.successor.constantNumerator),independentDifference(row.n));
    }
    assert.equal(r.proved,r.rows.every(row=>row.equal));
    count++;
  }
  assert.equal(count,1458);
  console.log('Independent arithmetic cases: '+count+'; finite rows received: '+count*10);
});

test('coefficient extremes and denominator bounds preserve exact arithmetic', () => {
  for(const sign of [-1,1]) for(const D of [1,20]) for(const n0 of [0,1]) {
    const v={a:20*sign,b:-20*sign,A:20*sign,B:-20*sign,C:20*sign,D,n0};
    const r=analyzeInduction(v);
    for(const row of r.rows) equivalent(row.proposed,qnum(v,row.n),D);
  }
  const constant=analyzeInduction({a:0,b:5,A:0,B:5,C:0,D:1,n0:0});
  assert.equal(constant.proved,true);
  assert.equal(constant.rows[9].actual,'45');
});

test('equivalent rational representation and zero denominator refusal', () => {
  const r=analyzeInduction({a:1,b:0,A:2,B:2,C:0,D:4,n0:0});
  assert.equal(r.proved,true);
  assert.equal(fractionText(r.rows[2].proposed),'3');
  assert.throws(()=>analyzeInduction({...odd,D:0}),/D must/);
});

test('strict admission rejects malformed, missing, fractional and out-of-range inputs', () => {
  const bad=['', ' ', ' 1', '1 ', '+1', '01', '1.0', '1e1', '0x1', 'NaN', 'Infinity', '999999', null, undefined, true, [], {}, 1.5, Infinity, -21, 21];
  for(const value of bad) assert.throws(()=>parseInductionInputs({...odd,a:value}));
  for(const value of [0,-1,21]) assert.throws(()=>parseInductionInputs({...odd,D:value}));
  for(const value of [-1,2]) assert.throws(()=>parseInductionInputs({...odd,n0:value}));
  for(const value of [null,[],42]) assert.throws(()=>parseInductionInputs(value));
  assert.throws(()=>parseInductionInputs({...odd,extra:0}),/Unexpected/);
  const missing={...odd};delete missing.C;assert.throws(()=>parseInductionInputs(missing),/C must/);
  assert.deepEqual(parseInductionInputs(Object.fromEntries(Object.entries(odd).map(([key,value])=>[key,String(value)]))),odd);
});

test('accepted inputs and every exported record branch are immutable', () => {
  const raw={...odd};
  const result=analyzeInduction(raw);
  raw.a=20;
  assert.equal(result.inputs.a,2);
  assert.throws(()=>{result.inputs.a=20;},TypeError);
  assert.throws(()=>{result.rows[0].proposed.numerator='9';},TypeError);
  assert.throws(()=>{result.rows.push({});},TypeError);
  assert.deepEqual(JSON.parse(JSON.stringify(result)).inputs,odd);
});

test('course uses unchanged native deck contract and frozen independent question wording', async () => {
  const deck=parseDeck(await readFile(new URL('../courses/mathematical-induction.json',import.meta.url),'utf8'));
  const blind=JSON.parse(await readFile(new URL('../docs/receiving/mathematical-induction-0378a7b6/questions-only.json',import.meta.url),'utf8'));
  assert.equal(deck.items.length,12);
  assert.equal(deck.concepts.length,4);
  assert.deepEqual(deck.items.map(({id,concept,prerequisites,prompt,options})=>({id,concept,prerequisites,prompt,options})),blind);
  assert.deepEqual([0,1,2,3].map(answer=>deck.items.filter(item=>item.answer===answer).length),[3,3,3,3]);
  assert.equal(Object.isFrozen(deck),true);
});
