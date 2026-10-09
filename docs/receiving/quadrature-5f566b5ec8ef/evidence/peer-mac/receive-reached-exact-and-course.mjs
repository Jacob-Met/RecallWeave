import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const root='/home/jacob/recallweave-quadrature-20261008-5f566b5ec8ef';
const peer=path.join(root,'evidence/peer-mac');
const hash=p=>{const b=fs.readFileSync(p);return {size:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')}};
const model=path.join(root,'source/src/quadrature.mjs');
assert.equal(hash(model).sha256,'86f3f1db3ac306dab470541eae179f75997c3e9ca0697e00de970b93ab4b5af2');
const witness=JSON.parse(fs.readFileSync(path.join(peer,'reached-exact-search.json'),'utf8'));
const {analyzeQuadrature}=await import(pathToFileURL(model));
const report=analyzeQuadrature(witness.found.input);
const rat=x=>({numerator:x.numerator,denominator:x.denominator});
assert.deepEqual(rat(report.exactIntegral),{numerator:'-216',denominator:'1'});
const expected=[
 {n:2,error:'-8',denominator:'1',kind:'first-level',ratio:null},
 {n:4,error:'0',denominator:'1',kind:'reached-exact',ratio:null},
 {n:8,error:'1',denominator:'8',kind:'finite',ratio:{numerator:'0',denominator:'1'}},
 {n:16,error:'5',denominator:'128',kind:'finite',ratio:{numerator:'16',denominator:'5'}},
 {n:32,error:'21',denominator:'2048',kind:'finite',ratio:{numerator:'80',denominator:'21'}}];
for(const [i,e] of expected.entries()){
 const row=report.refinement[i];const rule=row.rules.trapezoid;
 assert.equal(row.subintervals,e.n);
 assert.deepEqual(rat(rule.signedError),{numerator:e.error,denominator:e.denominator});
 assert.equal(rule.guaranteedForDegree,false);
 assert.equal(rule.exact,e.error==='0');
 assert.equal(rule.previousErrorRatio.kind,e.kind);
 assert.deepEqual(rule.previousErrorRatio.value===null?null:rat(rule.previousErrorRatio.value),e.ratio);
}
const blind=JSON.parse(fs.readFileSync(path.join(peer,'blind-derived.json'),'utf8'));
const questions=JSON.parse(fs.readFileSync(path.join(root,'evidence/course-questions-blind.json'),'utf8'));
const coursePath=path.join(root,'source/courses/quadrature.json'),guidePath=path.join(root,'source/courses/quadrature.md');
const course=JSON.parse(fs.readFileSync(coursePath,'utf8'));
assert.equal(course.items.length,12);
for(const [i,item] of course.items.entries()){
 assert.deepEqual({id:item.id,prompt:item.prompt,options:item.options},questions.items[i]);
 assert.equal(item.id,blind.answers[i].id);assert.equal(item.answer,blind.answers[i].option_index);
}
const result={reviewer:'chatgpt:5f566b5ec8ef:mac_continuity',at:new Date().toISOString(),model:hash(model),search:hash(path.join(peer,'reached-exact-search.json')),input:witness.found.input,exactIntegral:rat(report.exactIntegral),trapezoidRefinement:expected,allFiveLevelsMatched:true,degreeFiveGuaranteeRemainsFalse:true,course:hash(coursePath),guide:hash(guidePath),blindAnswers:hash(path.join(peer,'blind-derived.json')),questionBytesMatchBlindProjection:true,matchedKeys:12,sourceUnchanged:true};
fs.writeFileSync(path.join(peer,'reached-exact-and-course-receipt.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({result,receipt:hash(path.join(peer,'reached-exact-and-course-receipt.json'))}));
