import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const candidate='/home/jacob/recallweave-eigen-2479534e1930';
const { analyzeEigen }=await import(pathToFileURL(path.join(candidate,'src/eigen-directions.mjs')).href);
const results=[];
function check(name,fn) { try { fn(); results.push({name,status:'pass'}); } catch(e) { results.push({name,status:'fail',message:e.message,stack:e.stack}); } }
check('contract clarification 1: whole-number matrix strings equal numeric inputs',()=>{
  assert.deepEqual(analyzeEigen([['1','0'],['0','1']],[1,1]),analyzeEigen([[1,0],[0,1]],[1,1]));
});
check('contract clarification 2: whole-number probe strings equal numeric inputs',()=>{
  assert.deepEqual(analyzeEigen([[1,0],[0,1]],['1','0']),analyzeEigen([[1,0],[0,1]],[1,0]));
});
check('documented leading signs and whitespace at bounds',()=>{
  assert.deepEqual(analyzeEigen([[' +9 ','-9'],['-9','+9']],[' +20 ',' -20 ']),analyzeEigen([[9,-9],[-9,9]],[20,-20]));
});
const refused=['','   ','1.0','1/2','1e0','Infinity','NaN','0x1','+','1 0','10'];
for(const text of refused) check('refuse nonadmitted matrix text '+JSON.stringify(text),()=>{
  assert.throws(()=>analyzeEigen([[text,0],[0,1]],[1,1]));
});
for(const text of ['',' ','0.5','1e0','Infinity','21']) check('refuse nonadmitted probe text '+JSON.stringify(text),()=>{
  assert.throws(()=>analyzeEigen([[1,0],[0,1]],[text,1]));
});
const frozen=JSON.parse(fs.readFileSync(path.join(here,'blind-contract-freeze.json'),'utf8'));
const blind=JSON.parse(fs.readFileSync(path.join(candidate,'docs/receiving/eigen-directions-2479534e1930/content-blind.json'),'utf8'));
const key=JSON.parse(fs.readFileSync(path.join(candidate,'courses/eigen-directions.json'),'utf8'));
const comparison=frozen.answers.map(a=>{
  const k=key.items.find(x=>x.id===a.id), b=blind.items.find(x=>x.id===a.id);
  assert.ok(k && b,'missing stable ID '+a.id);
  assert.equal(k.prompt,b.prompt,'prompt changed '+a.id);
  assert.deepEqual(k.options,b.options,'options changed '+a.id);
  return {id:a.id,receiverAnswerIndex:a.answerIndex,publishedAnswerIndex:k.answer,agrees:a.answerIndex===k.answer,ambiguities:a.ambiguities};
});
const report={
  estate:'2479534e1930',
  recordedAtUTC:new Date().toISOString(),
  node:process.version,
  epistemicStatus:'Post-source, separate contract clarification. Does not change or replace the blind freeze or original 38/40 result.',
  reason:'The initial public API summary said bounded integers but did not specify intentional acceptance of numeric text. The published guide and model permit signed whole-number strings and surrounding whitespace. Both original failures were this stronger receiver type assumption.',
  clarificationCases:results.slice(0,2),
  textGrammarChecks:results.slice(2),
  passed:results.filter(x=>x.status==='pass').length,
  failed:results.filter(x=>x.status==='fail').length,
  originalFrozenResult:{file:'model-results.json',tests:40,passed:38,failed:2,failures:['reject string matrix entry','reject string probe entry']},
  sourceHead:spawnSync('git',['-C',candidate,'rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim(),
  contentComparison:comparison,
  contentAgreement:comparison.filter(x=>x.agrees).length,
  contentCount:comparison.length,
  mathematicalReview:'All 14 frozen arithmetic/spectral controls passed. Scalar/repeated/complex classification, signed and zero scales, radical approximate bases, exact cross-product refusals, bounds, sparse shape refusal, and deep immutability/caller independence passed. Source reading found no remaining substantive algebra error.',
  contentReview:'All 14 items have unique correct answers. Explanations and guide transfer checks are consistent: ed-01 transfer (0,-7); ed-02 (3,1) and (1,5); ed-08 eigenpairs (1,1)->5 and (1,-2)->2; ed-13 transfer (3,2)->(5,3), cross=-1; ed-14 powers -8 and 16. Nonzero definition, zero eigenvalue, multiplicity versus dimension, real versus complex fields, and approximate versus exact alignment are handled correctly.',
  materialIssue:'No substantive algebra/content defect established. The documented numeric-text acceptance resolves the two receiver-assumption failures without a producer change.'
};
fs.writeFileSync(path.join(here,'contract-clarification-receipt.json'),JSON.stringify(report,null,2)+'\n');
const files=[
  'blind-contract-freeze.json','receiver-model.mjs','model-results.json','contract-clarification.mjs','contract-clarification-receipt.json'
].map(x=>path.join(here,x)).concat([
  'src/eigen-directions.mjs','courses/eigen-directions.json','courses/eigen-directions.md','docs/receiving/eigen-directions-2479534e1930/content-blind.json'
].map(x=>path.join(candidate,x)));
const hashes=files.map(file=>({file,sha256:createHash('sha256').update(fs.readFileSync(file)).digest('hex')}));
fs.writeFileSync(path.join(here,'receipt-hashes.json'),JSON.stringify({recordedAtUTC:new Date().toISOString(),sourceHead:report.sourceHead,files:hashes},null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,failed:report.failed,originalFrozenResult:report.originalFrozenResult,sourceHead:report.sourceHead,contentAgreement:report.contentAgreement,contentCount:report.contentCount,materialIssue:report.materialIssue,hashes},null,2));
process.exitCode=report.failed || report.contentAgreement!==14 ? 1 : 0;
