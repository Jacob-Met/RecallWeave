import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const root='/dev/shm/hamon-query-db371a37f4c8-product-receiving/least-squares';
const source='/dev/shm/hamon-query-db371a37f4c8-capability/least-squares/courses';
const expectedHashes={'least-squares-core.mjs':'44c9f9ad6ad21215c262fb0af879aa59dfb8ce8b3812d0b0bf70807a1eeb6581','least-squares.json':'3c5639727632b01775e054ca05ef90b4fe56e453ced138d355c463ebb27a2cd9','least-squares.md':'195e5abbe107799fd3d4dda29250b00c164c5a7275323dc87b57b918886af2b4'};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const checkInputs=()=>Object.fromEntries(Object.entries(expectedHashes).map(([name,expected])=>{const actual=hash(fs.readFileSync(source+'/'+name));assert.equal(actual,expected,name);return[name,actual];}));
const before=checkInputs();
const contract=JSON.parse(fs.readFileSync(root+'/CONTRACT.json','utf8'));
const courseAnswers=JSON.parse(fs.readFileSync(root+'/COURSE-ANSWERS.json','utf8'));
const {analyze,parseScalar}=await import(pathToFileURL(source+'/least-squares-core.mjs'));
const rational=value=>value===null?null:(value.d===1n?String(value.n):String(value.n)+'/'+String(value.d));
const gcd=(a,b)=>{a=a<0n?-a:a;while(b){const remainder=a%b;a=b;b=remainder;}return a;};
function frozenExact(value){
  if(value===null||typeof value!=='object')return;
  assert.ok(Object.isFrozen(value),'returned object must be frozen');
  if(Object.hasOwn(value,'n')&&Object.hasOwn(value,'d')){assert.equal(typeof value.n,'bigint');assert.equal(typeof value.d,'bigint');assert.ok(value.d>0n);assert.equal(gcd(value.n,value.d),1n);}
  for(const v of Object.values(value))frozenExact(v);
}
const passed=[];const details=[];
function control(name,fn){fn();passed.push(name);}
for(const c of contract.cases)control(c.id,()=>{
  const points=structuredClone(c.points),options={intercept:c.intercept,slope:c.slope,query:c.query},inputBefore=structuredClone({points,options});
  const r=analyze(points,options),e=c.expected;
  assert.deepEqual({points,options},inputBefore,'caller input unchanged');
  assert.equal(r.count,points.length);
  assert.deepEqual(r.points.map(p=>({x:p.x,y:p.y})),points,'ordered duplicate rows retained');
  assert.ok(r.points.every((p,i)=>p!==points[i]));
  assert.equal(rational(r.meanX),e.meanX);assert.equal(rational(r.meanY),e.meanY);assert.equal(rational(r.centeredXX),e.sxx);
  assert.equal(rational(r.fit.intercept),e.intercept);assert.equal(rational(r.fit.slope),e.slope);
  assert.equal(r.fit.kind,e.slope===null?'underdetermined':'unique');
  assert.deepEqual(r.fit.rows.map(row=>rational(row.residual)),e.residuals);
  assert.equal(rational(r.fit.sse),e.sse);assert.equal(rational(r.trial.sse),e.trialSse);assert.equal(rational(r.excessSSE),e.excess);
  assert.equal(rational(r.decomposition.meanTerm),e.meanTerm);assert.equal(rational(r.decomposition.slopeTerm),e.slopeTerm);
  assert.equal(rational(r.decomposition.total),e.excess);
  assert.ok(r.decomposition.meanTerm.n>=0n&&r.decomposition.slopeTerm.n>=0n);
  assert.equal(rational(r.fit.residualSum),'0');assert.equal(rational(r.fit.xResidualSum),'0');
  assert.equal(rational(r.prediction.value),e.query);
  assert.equal(r.prediction.kind,c.id==='all_equal_x'?'shared_x_only':c.id==='all_equal_zero'?'underdetermined':c.id==='boundary_two_points'?'extrapolation':'in_range');
  if(r.fit.kind==='unique'){
    const a=r.fit.intercept,b=r.fit.slope,x=r.meanX,y=r.meanY;
    assert.equal((a.n*b.d*x.d+b.n*x.n*a.d)*y.d,y.n*a.d*b.d*x.d,'mean-point passage by integer cross multiplication');
  }
  frozenExact(r);details.push({id:c.id,intercept:rational(r.fit.intercept),slope:rational(r.fit.slope),sse:rational(r.fit.sse),trialSse:rational(r.trial.sse),excess:rational(r.excessSSE)});
});
control('second_nonunique_minimizer_and_unidentified_query',()=>{
 const r=analyze(contract.cases.find(c=>c.id==='all_equal_x').points,{intercept:'-5',slope:'2',query:'2'});
 assert.equal(rational(r.fit.sse),'18');assert.equal(rational(r.trial.sse),'18');assert.equal(rational(r.excessSSE),'0');assert.equal(r.prediction.value,null);assert.equal(r.prediction.kind,'underdetermined');
});
control('identified_zero_at_shared_x',()=>{const r=analyze([{x:0,y:-2},{x:0,y:2}],{intercept:'0',slope:'9',query:'0'});assert.equal(r.prediction.kind,'shared_x_only');assert.equal(rational(r.prediction.value),'0');});
control('deduplication_changes_equal_weight_fit',()=>{const r=analyze([{x:0,y:0},{x:1,y:2},{x:2,y:1}]);assert.equal(rational(r.fit.intercept),'1/2');assert.equal(rational(r.fit.slope),'1/2');assert.equal(rational(r.fit.sse),'3/2');});
const scalarExpected=['1/2','1/2','0','1000','-1000'];
for(let i=0;i<contract.additionalControls.scalar_valid.length;i++)control('scalar_valid_'+i,()=>assert.equal(rational(parseScalar(contract.additionalControls.scalar_valid[i])),scalarExpected[i]));
for(const text of contract.additionalControls.scalar_invalid)control('scalar_refusal_'+text,()=>assert.throws(()=>parseScalar(text)));
for(const text of contract.additionalControls.query_invalid)control('query_refusal_'+text,()=>assert.throws(()=>analyze([{x:0,y:0},{x:1,y:1}],{query:text})));
const invalidPoints=[[],[{x:0,y:0}],Array.from({length:13},()=>({x:0,y:0})),[{x:0.5,y:0},{x:1,y:1}],[{x:0,y:1.5},{x:1,y:1}],[{x:'0',y:0},{x:1,y:1}],[{x:NaN,y:0},{x:1,y:1}],[{x:0,y:Infinity},{x:1,y:1}],[{x:21,y:0},{x:1,y:1}],[{x:0,y:-21},{x:1,y:1}],[null,{x:1,y:1}],[[0,0],{x:1,y:1}]];
for(let i=0;i<invalidPoints.length;i++)control('point_refusal_'+i,()=>{const input=invalidPoints[i],saved=structuredClone(input);assert.throws(()=>analyze(input));assert.deepEqual(input,saved);});
const course=JSON.parse(fs.readFileSync(source+'/least-squares.json','utf8'));
assert.equal(course.items.length,16);
for(const answer of courseAnswers.answers)control('course_'+answer.id,()=>{const item=course.items.find(x=>x.id===answer.id);assert.ok(item);assert.equal(item.answer,answer.correctIndex);assert.equal(item.options.length,4);assert.equal(new Set(item.options).size,4);});
const after=checkInputs();
const receipt={format:'independent-least-squares-analytical-receipt-v1',at:new Date().toISOString(),node:process.version,contract_sha256:hash(fs.readFileSync(root+'/CONTRACT.json')),course_answers_sha256:hash(fs.readFileSync(root+'/COURSE-ANSWERS.json')),source_before:before,source_after:after,source_unchanged:true,candidate_tests_read:false,controls_passed:passed.length,controls:passed,mathematical_results:details,boundary:'Independent mathematical/core and 16 blind-derived answer-key receiving. Guide prose is reviewed separately. No browser, learner integration, live user data or publication claim.'};
fs.writeFileSync(root+'/receipt-r1.json',JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({controlsPassed:passed.length,sourceFilesUnchanged:Object.keys(after).length,receiptSha256:hash(fs.readFileSync(root+'/receipt-r1.json')),mathematicalResults:details}));
