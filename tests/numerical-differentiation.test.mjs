import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeDifferentiation as analyze,serializeDifferentiation as serialize,STEP_DENOMINATORS as steps,DIFFERENCE_METHODS as methods} from '../src/numerical-differentiation.mjs';
const input=(coefficients=[0,0,1,0,0,0],point=1,stepDenominator=2)=>({coefficients,point,stepDenominator});
const r=(c,x=0,d=1)=>analyze(input(c,x,d));
const fraction=v=>v.fraction;
test('quadratic sample coordinates, central divisor, all signed errors are exact',()=>{
 const a=r([0,0,1,0,0,0],1,2), l=a.levels[a.selectedLevel];
 assert.equal(fraction(a.exactDerivative),'2');
 assert.deepEqual(l.samples.map(s=>[fraction(s.node),fraction(s.value)]),[['1/2','1/4'],['1','1'],['3/2','9/4']]);
 assert.deepEqual(methods.map(m=>fraction(l.methods[m].estimate)),['5/2','3/2','2']);
 assert.deepEqual(methods.map(m=>fraction(l.methods[m].signedError)),['1/2','-1/2','0']);
 assert.equal(fraction(l.methods.central.difference),'2');assert.equal(fraction(l.methods.central.divisor),'1');
});
test('constant and zero polynomial have separate degree with zero exact errors',()=>{
 for(const c of [[7,0,0,0,0,0],[0,0,0,0,0,0]]){
 const a=r(c,-5,32);assert.equal(a.polynomialDegree,c[0]===0?null:0);
 for(const l of a.levels)for(const m of methods){assert.equal(fraction(l.methods[m].estimate),'0');assert.equal(l.methods[m].exact,true);assert.equal(l.methods[m].guaranteedByDegree,true);}
 }
});
test('all admitted translated linear polynomials are exact at every step',()=>{
 for(let x=-5;x<=5;x++)for(let b=-9;b<=9;b++){
 const a=r([9,b,0,0,0,0],x);
 for(const l of a.levels)for(const m of methods)assert.equal(fraction(l.methods[m].estimate),String(b));
 }
});
test('point symmetry may be exact outside a degree guarantee',()=>{
 const a=r([0,0,0,0,1,0]);
 for(const l of a.levels){assert.equal(l.methods.central.exact,true);assert.equal(l.methods.central.guaranteedByDegree,false);}
 assert.equal(fraction(r([0,0,0,0,1,0],1).levels[0].methods.central.estimate),'8');
});
test('cubic and quintic center errors have distinct exact halving powers',()=>{
 for(const [c,power]of [[[0,0,0,1,0,0],2],[[0,0,0,0,0,1],4]]){
 const a=r(c);
 for(const [i,d]of steps.entries()){
 assert.equal(a.levels[i].methods.central.absoluteError.numerator,'1');
 assert.equal(a.levels[i].methods.central.absoluteError.denominator,String(d**power));
 }
 }
});
test('coarse accidental exactness need not improve or favor central',()=>{
 const a=r([0,0,1,-1,0,0]);
 assert.deepEqual(methods.map(m=>fraction(a.levels[0].methods[m].estimate)),['0','-2','-1']);
 assert.deepEqual(methods.map(m=>fraction(a.levels[1].methods[m].estimate)),['1/4','-3/4','-1/4']);
 assert.equal(a.levels[0].methods.forward.exact,true);assert.equal(a.levels[1].methods.forward.exact,false);
});
test('negative point and translated cubic retain direction',()=>{
 assert.equal(fraction(r([0,0,1,0,0,0],-1,2).levels[1].methods.backward.estimate),'-5/2');
 const a=r([0,0,0,1,0,0],1,2);assert.equal(fraction(a.exactDerivative),'3');assert.equal(fraction(a.levels[1].methods.central.estimate),'13/4');
});
test('selected step changes inspection only, not six-level calculations',()=>{
 const a=r([1,-2,3,-4,5,-6],-5,1),b=r([1,-2,3,-4,5,-6],-5,32);
 assert.deepEqual(a.levels,b.levels);assert.equal(a.selectedLevel,0);assert.equal(b.selectedLevel,5);
});
test('extreme quintics retain canonical rational records throughout',()=>{
 function inspect(v){if(v&&typeof v==='object'){if('numerator'in v){const n=BigInt(v.numerator),d=BigInt(v.denominator);assert.ok(d>0);let a=n<0n?-n:n,b=d;while(b)[a,b]=[b,a%b];assert.equal(a,1n);assert.ok(Number.isFinite(v.approximate));assert.equal(v.fraction,d===1n?String(n):n+'/'+d);}for(const x of Object.values(v))inspect(x);}}
 for(const x of [-5,5])for(const sign of [-1,1])inspect(r(Array(6).fill(9*sign),x,32));
});
test('report is detached and recursively frozen',()=>{
 const src=input(),a=analyze(src);src.coefficients[2]=9;src.point=-5;
 assert.deepEqual(a.input.coefficients,[0,0,1,0,0,0]);assert.equal(a.input.point,1);
 function visit(v){if(v&&typeof v==='object'){assert.equal(Object.isFrozen(v),true);for(const x of Object.values(v))visit(x);}}visit(a);
 assert.throws(()=>{a.levels[0].methods.central.exact=false;},TypeError);
});
test('strict object, coefficient and scalar admission refuses ambiguous input',()=>{
 const bad=[null,[],true,1,{...input(),extra:0},{...input(),coefficients:[0,0,1,0,0]},{...input(),coefficients:Array(6)},{...input(),coefficients:[0,0,1,0,0,'0']}];
 for(const value of [true,'1',NaN,Infinity,0.5,-6,6])bad.push({...input(),point:value});
 for(const value of [true,'2',0,-1,3,Infinity])bad.push({...input(),stepDenominator:value});
 for(const value of [true,'0',NaN,Infinity,9.1,10,-10])bad.push({...input(),coefficients:[value,0,0,0,0,0]});
 const sym={...input(),[Symbol('extra')]:0};bad.push(sym);
 for(const value of bad)assert.throws(()=>analyze(value),TypeError);
});
test('six-entry arrays with custom enumerable properties also refuse',()=>{
 const x=input();x.coefficients.foo=1;assert.throws(()=>analyze(x),/six dense/);
});
test('authentic export contains every exact field and separates its view',()=>{
 const a=analyze(input());const value=JSON.parse(serialize(a,'backward'));
 assert.equal(value.inspectedMethod,'backward');assert.deepEqual(value.report,a);
 for(const fake of [null,{},structuredClone(a),JSON.parse(JSON.stringify(a))])assert.throws(()=>serialize(fake,'forward'),/actual admitted/);
 for(const view of [null,'CENTRAL','central '])assert.throws(()=>serialize(a,view),/Choose/);
 assert.equal(serialize(a,'central').endsWith('\n'),true);
});
