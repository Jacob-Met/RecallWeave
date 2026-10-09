import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
const root='D:/HAMON/recallweave-differentiation-5f566b5ec8ef';
const peer=path.join(root,'evidence/peer-coordination');
const source=path.join(root,'source');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const pins=Object.fromEntries(['src/numerical-differentiation.mjs','courses/numerical-differentiation.json','courses/numerical-differentiation.md'].map(p=>[p,hash(path.join(source,p))]));
assert.equal(pins['src/numerical-differentiation.mjs'],'bf6a80c8b8bbfc2535629c9558aff92fd3c01dbc1cd49137eb16a03c0928fa56');
assert.equal(hash(path.join(peer,'oracle-expected.json')),'c26ec8456bbeeb14d436ee856293ba6fddc77721541be722c679cbfcc3bfc349');
const {analyzeDifferentiation:analyze,serializeDifferentiation:serialize}=await import(pathToFileURL(path.join(source,'src/numerical-differentiation.mjs')));
const oracle=JSON.parse(fs.readFileSync(path.join(peer,'oracle-expected.json'),'utf8'));
let rationalFields=0,levels=0,rules=0,serialized=0,invalids=0,frozenObjects=0;
function rat(actual,expected,label){
 for(const key of ['numerator','denominator','fraction'])assert.equal(actual[key],expected[key],label+'.'+key);
 assert(Number.isFinite(actual.approximate),label+'.approximate finite');
 assert.equal(actual.approximate,Number(actual.numerator)/Number(actual.denominator));
 rationalFields++;
}
function frozen(x){if(x&&typeof x==='object'){assert(Object.isFrozen(x));frozenObjects++;for(const y of Object.values(x))frozen(y);}}
const witness=[];
for(const c of oracle.cases){
 const report=analyze(c.input),e=c.expected;
 assert.deepEqual(report.input,c.input,c.id+'.input');assert.equal(report.polynomialDegree,e.degree);assert.equal(report.selectedLevel,e.selectedIndex);
 rat(report.exactDerivative,e.derivative,c.id+'.derivative');assert.equal(report.levels.length,6);
 for(let k=0;k<6;k++){
  const a=report.levels[k],b=e.levels[k];levels++;
  assert.equal(a.stepDenominator,b.stepDenominator);rat(a.step,b.h,c.id+'.h'+k);assert.equal(a.samples.length,3);
  for(let j=0;j<3;j++){assert.equal(a.samples[j].offset,j-1);rat(a.samples[j].node,b.nodes[j],c.id+'.node');rat(a.samples[j].value,b.values[j],c.id+'.value');}
  for(const method of ['forward','backward','central']){
   rules++;const am=a.methods[method],bm=b.methods[method];
   for(const key of ['difference','divisor','estimate','signedError','absoluteError'])rat(am[key],bm[key],c.id+'.'+method+'.'+key);
   assert.equal(am.exact,bm.exact);assert.equal(am.guaranteedByDegree,bm.degreeGuaranteed);
   assert.equal(am.degreeGuarantee,method==='central'?2:1);
   assert.deepEqual(am.sampleIndices,method==='central'?[0,2]:method==='forward'?[1,2]:[0,1]);
  }
 }
 frozen(report);
 for(const method of ['forward','backward','central']){
  const text=serialize(report,method),parsed=JSON.parse(text);assert.equal(parsed.inspectedMethod,method);assert.deepEqual(parsed.report,report);assert(text.endsWith('\n'));serialized++;
 }
 if(c.id.includes('lucky')||c.id==='central-secant-offset'||c.id==='central-even-origin'||c.id==='central-even-translated')
  witness.push({id:c.id,input:c.input,derivative:report.exactDerivative.fraction,levels:report.levels.map(l=>({denominator:l.stepDenominator,errors:Object.fromEntries(Object.entries(l.methods).map(([m,v])=>[m,v.signedError.fraction])),degreeGuarantees:Object.fromEntries(Object.entries(l.methods).map(([m,v])=>[m,v.guaranteedByDegree]))}))});
}
const good=()=>({coefficients:[0,0,1,0,0,0],point:1,stepDenominator:2});
function rejects(label,f){assert.throws(f,undefined,label);invalids++;}
for(const v of [null,undefined,true,false,0,'x',[],()=>{}])rejects('input '+String(v),()=>analyze(v));
for(const key of ['coefficients','point','stepDenominator']){const v=good();delete v[key];rejects('missing '+key,()=>analyze(v));}
for(const [key,v] of [['extra',1],[Symbol('extra'),1]]){const x=good();x[key]=v;rejects('extra key',()=>analyze(x));}
for(const c of [[],[0,0,0,0,0],[0,0,0,0,0,0,0],null,{},new Int8Array(6)]){
 const v=good();v.coefficients=c;rejects('coefficient shape',()=>analyze(v));}
const sparse=good();delete sparse.coefficients[3];rejects('sparse',()=>analyze(sparse));
const arrayExtra=good();arrayExtra.coefficients.x=1;rejects('array extra',()=>analyze(arrayExtra));
const arraySymbol=good();arraySymbol.coefficients[Symbol('x')]=1;rejects('array symbol',()=>analyze(arraySymbol));
for(const v of [true,false,'1',null,undefined,NaN,Infinity,-Infinity,0.5,-10,10,1n]){
 const x=good();x.coefficients[3]=v;rejects('coefficient type/domain',()=>analyze(x));}
for(const v of [true,false,'1',null,undefined,NaN,Infinity,-Infinity,0.5,-6,6,1n]){
 const x=good();x.point=v;rejects('point type/domain',()=>analyze(x));}
for(const v of [true,false,'2',null,undefined,NaN,Infinity,-Infinity,0,-1,3,64,1.5,1n]){
 const x=good();x.stepDenominator=v;rejects('step type/domain',()=>analyze(x));}
const input=good(),actual=analyze(input),frozenCopy=JSON.stringify(actual);
input.coefficients[2]=-9;input.point=-5;input.stepDenominator=32;
assert.equal(JSON.stringify(actual),frozenCopy,'detached input');frozen(actual);
for(const fake of [JSON.parse(frozenCopy),{...actual},Object.create(actual),null,{},undefined])
 rejects('forged report',()=>serialize(fake,'central'));
for(const method of ['',null,undefined,'Central','other',0,{},new String('central')])
 rejects('method',()=>serialize(actual,method));
assert.equal(JSON.stringify(actual),frozenCopy);
const deck=JSON.parse(fs.readFileSync(path.join(source,'courses/numerical-differentiation.json'),'utf8'));
const blind=JSON.parse(fs.readFileSync(path.join(peer,'blind-answers.json'),'utf8'));
const masked=JSON.parse(fs.readFileSync(path.join(root,'evidence/course-questions-blind.json'),'utf8'));
assert.equal(deck.items.length,12);
for(const q of deck.items){
 const expected=blind.items.find(x=>x.id===q.id),before=masked.items.find(x=>x.id===q.id);
 assert(expected&&before);assert.equal(q.answer,expected.answerIndex,q.id);
 const {answer,explanation,...without}=q;assert.deepEqual(without,before,'masked question/transfer remained exact');
}
const after=Object.fromEntries(Object.keys(pins).map(p=>[p,hash(path.join(source,p))]));assert.deepEqual(after,pins);
const result={actor:'chatgpt:5f566b5ec8ef:coordination',at:new Date().toISOString(),status:'passed',cases:oracle.cases.length,levels,rules,rationalFields,serializedReports:serialized,recursiveFrozenObjectVisits:frozenObjects,invalidOrForgedRefusals:invalids,blindKeys:12,maskedPromptsAndTransfersUnchanged:true,inputDetached:true,sourceBefore:pins,sourceAfter:after,sourceUnchanged:true,witnesses:witness,limits:['No UI/browser/model-owner-test replay.','Approximate display numbers checked for finite derivation, not used as rational oracle.','Full course explanations and guide also read separately by reviewer; these assertions compare keys and exact masked content.']};
fs.writeFileSync(path.join(peer,'model-course-receipt.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,cases:result.cases,levels,rules,rationalFields,serializedReports:serialized,invalidOrForgedRefusals:invalids,blindKeys:12,sourceUnchanged:true,pins},null,2));
