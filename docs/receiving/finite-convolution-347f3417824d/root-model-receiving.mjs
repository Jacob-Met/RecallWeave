// Independent receiving authored after freezing analytical vectors and blind answers.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const project=resolve(process.argv[2]), output=resolve(process.argv[3]);
const root='/Users/me/hamon-recallweave-convolution-347f3417824d';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const modelPath=join(project,'src/finite-convolution.mjs');
const modelBytes=await readFile(modelPath);
const courseBytes=await readFile(join(project,'courses/finite-convolution.json'));
const course=JSON.parse(courseBytes), blind=JSON.parse(await readFile(join(root,'root-blind-answers-v1.json'),'utf8'));
const questionBytes=await readFile(join(root,'questions-only-v1.json'));
assert.equal(hash(questionBytes),blind.input_sha256);
const questions=JSON.parse(questionBytes), oracleBytes=await readFile(join(root,'root-numeric-oracles-v1.json'));
const oracles=JSON.parse(oracleBytes);
const model=await import(pathToFileURL(modelPath));
const receipt={observed_at:new Date().toISOString(),node:process.version,project,source_sha256:hash(modelBytes),
  course_sha256:hash(courseBytes),blind_answers_sha256:hash(await readFile(join(root,'root-blind-answers-v1.json'))),
  numerical_oracles_sha256:hash(oracleBytes),groups:[]};
async function group(name,run){try{const detail=await run();receipt.groups.push({name,status:'pass',...detail});console.log('PASS '+name);}
  catch(error){receipt.groups.push({name,status:'fail',error:error.stack});console.log('FAIL '+name+': '+error.message);}}
function ticks(text){
  let sign=1n;if(text.startsWith('-')){sign=-1n;text=text.slice(1);}if(text.startsWith('+'))text=text.slice(1);
  const [whole,fraction='']=text.split('.');return sign*(BigInt(whole||'0')*10000n+BigInt(fraction.padEnd(4,'0')));
}
function rationalText(integer,places=8){
  const sign=integer<0n?'-':'';if(integer<0n)integer=-integer;
  const scale=10n**BigInt(places),whole=integer/scale;
  const fraction=(integer%scale).toString().padStart(places,'0').replace(/0+$/,'');
  return sign+whole+(fraction?'.'+fraction:'');
}
await group('blind-question-key-and-prompt-binding',()=>{
  assert.equal(course.items.length,questions.questions.length);
  for(const q of questions.questions){const actual=course.items.find(item=>item.id===q.id),answer=blind.answers.find(item=>item.id===q.id);
    assert.ok(actual);assert.equal(actual.prompt,q.prompt);assert.deepEqual(actual.options,q.options);assert.equal(actual.answer,answer.answer_index,q.id);}
  return {questions:course.items.length,key:blind.answers.map(a=>a.letter).join('')};
});
for(const c of oracles.cases)await group(c.name,()=>{
  const x=model.parseConvolutionSequence(c.x.join(', ')),h=model.parseConvolutionSequence(c.h.join(' '));
  assert.deepEqual(x,c.x.map(Number));assert.deepEqual(h,c.h.map(Number));
  assert.deepEqual(model.finiteConvolution(x,h),c.expected.map(Number));
  const record=model.createConvolutionRecord(x,h),before=JSON.stringify(record);
  assert.deepEqual(record.y,c.expected.map(Number));assert.equal(record.steps.length,c.expected.length);
  const xt=c.x.map(ticks),ht=c.h.map(ticks);
  let products=0;
  for(let n=0;n<c.expected.length;n++){
    const step=model.convolutionStep(x,h,n);
    assert.equal(step.n,n);assert.equal(step.value,Number(c.expected[n]));assert.equal(model.formatConvolutionValue(step.value),c.expected[n]);
    assert.deepEqual(record.steps[n],step);assert.equal(step.terms.length,x.length);
    for(let k=0;k<x.length;k++){
      const term=step.terms[k],j=n-k,inside=j>=0&&j<h.length;
      const expected=xt[k]*(inside?ht[j]:0n),exact=rationalText(expected);
      assert.deepEqual({k:term.k,input:term.input,kernelIndex:term.kernelIndex,inKernel:term.inKernel,kernel:term.kernel},
        {k,input:x[k],kernelIndex:j,inKernel:inside,kernel:inside?h[j]:0});
      assert.equal(term.product,Number(exact));assert.equal(model.formatConvolutionValue(term.product),exact);products++;
    }
  }
  const mutableX=[...x],mutableH=[...h],snapshot=model.createConvolutionRecord(mutableX,mutableH),saved=JSON.stringify(snapshot);
  mutableX[0]=mutableX[0]===100?-100:100;mutableH[0]=mutableH[0]===100?-100:100;
  assert.equal(JSON.stringify(snapshot),saved);assert.equal(JSON.stringify(record),before);
  assert.deepEqual(JSON.parse(before),record);
  return {outputs:c.expected.length,products,record_unchanged:true};
});
await group('finite-formatter-exponent-preservation',()=>{
  const observed=model.formatConvolutionValue(1e30);
  assert.equal(Number(observed),1e30,'Accepted finite display value must not silently lose exponent digits');
  return {input:1e30,display:observed};
});
assert.equal(hash(await readFile(modelPath)),receipt.source_sha256,'model moved during receiving');
assert.equal(hash(await readFile(join(project,'courses/finite-convolution.json'))),receipt.course_sha256,'course moved during receiving');
receipt.passed=receipt.groups.filter(g=>g.status==='pass').length;receipt.failed=receipt.groups.filter(g=>g.status==='fail').length;
await writeFile(output,JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({passed:receipt.passed,failed:receipt.failed,receipt:output,source_sha256:receipt.source_sha256}));
process.exitCode=receipt.failed?1:0;
