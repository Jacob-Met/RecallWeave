import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeNewton,approximateRational,polynomialLabel,NEWTON_PRESETS} from '../src/newton-method.mjs';
const run=(coefficients,start='2',steps=6)=>analyzeNewton({coefficients,start,steps});
test('an affine tangent lands exactly on its root',()=>{
  const r=run([-3,2,0,0],'4');assert.equal(r.outcome.kind,'exact-root');
  assert.deepEqual(r.steps,[{index:0,x:'4',value:'5',derivative:'2',correction:'5/2',next:'3/2',nextValue:'0'}]);
});
test('square-root steps retain exact residuals instead of rounded convergence',()=>{
  const r=run([-2,0,1,0],'2',3);
  assert.deepEqual(r.points.map(p=>p.x),['2','3/2','17/12','577/408']);
  assert.deepEqual(r.points.map(p=>p.value),['2','1/4','1/144','1/166464']);
  assert.deepEqual(r.steps.map(s=>s.correction),['1/2','1/12','1/408']);
  assert.equal(r.outcome.kind,'step-limit');
});
test('a nonroot horizontal tangent stops without fabricating a step',()=>{
  const r=run([-2,0,1,0],'0');assert.equal(r.outcome.kind,'zero-slope');assert.equal(r.steps.length,0);assert.equal(r.points[0].value,'-2');
});
test('an exact initial root wins over a zero derivative',()=>{
  const r=run([0,0,1,0],'0');assert.equal(r.outcome.kind,'exact-root');assert.equal(r.steps.length,0);
});
test('constant functions retain their distinct meanings',()=>{
  assert.equal(run([0,0,0,0],'-7/3').outcome.kind,'exact-root');
  assert.equal(run([5,0,0,0],'-7/3').outcome.kind,'zero-slope');
});
test('the cubic 0 to 1 to 0 cycle is detected exactly',()=>{
  const r=run([2,-2,0,1],'0');
  assert.deepEqual(r.points.map(p=>p.x),['0','1','0']);
  assert.deepEqual(r.points.map(p=>p.value),['2','1','2']);
  assert.equal(r.outcome.kind,'cycle');assert.equal(r.outcome.cycleStart,0);assert.equal(r.outcome.cycleLength,2);
});
test('a repeated root approaches without being declared equal',()=>{
  const r=run([1,-2,1,0],'3',3);
  assert.deepEqual(r.points.map(p=>p.x),['3','2','3/2','5/4']);
  assert.deepEqual(r.points.map(p=>p.value),['4','1','1/4','1/16']);
  assert.equal(r.outcome.kind,'step-limit');
});
test('a cubic can land on an exact root in one genuine step',()=>{
  const r=run([0,2,-2,1],'1');assert.equal(r.steps[0].next,'0');assert.equal(r.outcome.kind,'exact-root');
});
test('multiplying a polynomial by a nonzero constant preserves its tangent intercepts',()=>{
  const a=run([-2,0,1,0],'2',4),b=run([6,0,-3,0],'2',4);
  assert.deepEqual(a.points.map(p=>p.x),b.points.map(p=>p.x));
  assert.deepEqual(a.steps.map(s=>s.correction),b.steps.map(s=>s.correction));
});
test('opposite initial signs can approach different roots',()=>{
  assert.equal(run([-4,0,1,0],'-3',1).points[1].x,'-13/6');
  assert.equal(run([-4,0,1,0],'3',1).points[1].x,'13/6');
});
test('finite decimal and fraction inputs are parsed as exact rationals',()=>{
  assert.equal(run([0,1,0,0],'1.250').input.start,'5/4');
  assert.equal(run([0,1,0,0],'-.5').input.start,'-1/2');
  assert.equal(run([0,1,0,0],'1000/1000').input.start,'1');
  assert.equal(run([0,1,0,0],'19.999').input.start,'19999/1000');
});
test('input bounds refuse partial parsing, coercion and unreasonable requests',()=>{
  for(const start of ['','1/0','1/1001','1e2','0x10','Infinity','NaN','21','20.001','1.0001','1/2junk',true,null,0.1])assert.throws(()=>run([0,1,0,0],start),undefined,String(start));
  for(const steps of [0,9,'2.5','1e1',null,true])assert.throws(()=>run([0,1,0,0],'1',steps));
  for(const coefficients of [[0,1,0],[0,1,0,0,0],[13,0,0,0],[0,true,0,0],['1x',0,0,0],[Infinity,0,0,0]])assert.throws(()=>run(coefficients));
});
test('the bounded arithmetic stop keeps only complete steps',()=>{
  const r=run([-1,-1,0,1],'19.999',8);
  assert.equal(r.outcome.kind,'arithmetic-limit');assert.ok(r.steps.length>0&&r.steps.length<8);
  assert.equal(r.points.length,r.steps.length+1);assert.equal(r.outcome.index,r.steps.length);
  assert.ok(r.steps.every((s,i)=>s.next===r.points[i+1].x&&s.nextValue===r.points[i+1].value));
});
test('drawing an enormous numerator and denominator does not produce Infinity over Infinity',()=>{
  const n=1n<<2000n;const exact=n+'/'+(n+1n);
  assert.equal(approximateRational(exact),1);assert.notEqual(exact,'1');
  assert.equal(approximateRational('-1/2'),-.5);
});
test('input objects stay unchanged and each run is independent',()=>{
  const input={coefficients:[-2,0,1,0],start:'2',steps:3},before=JSON.stringify(input);
  const a=analyzeNewton(input),b=analyzeNewton(input);
  assert.equal(JSON.stringify(input),before);assert.deepEqual(a,b);
  assert.ok(Object.isFrozen(a)&&Object.isFrozen(a.points)&&Object.isFrozen(a.steps));
});
test('polynomial labels and all presets describe admissible independent experiments',()=>{
  assert.equal(polynomialLabel([-2,0,1,0]),'x² − 2');
  assert.equal(polynomialLabel([0,0,0,0]),'0');
  assert.equal(polynomialLabel([2,-2,0,1]),'x³ − 2x + 2');
  for(const p of NEWTON_PRESETS)assert.doesNotThrow(()=>analyzeNewton(p));
});
