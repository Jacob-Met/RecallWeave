// Independent receiving adapter. Numerical expectations were frozen in oracle.py
// and oracle-expected.json before the model was read or executed.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const modelPath = path.resolve(root, '../../source/src/quadrature.mjs');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const pin = p => ({size:fs.statSync(p).size,sha256:sha(fs.readFileSync(p))});
const modelBefore = pin(modelPath);
assert.equal(modelBefore.sha256,'86f3f1db3ac306dab470541eae179f75997c3e9ca0697e00de970b93ab4b5af2');
const expectedPath=path.join(root,'oracle-expected.json');
assert.equal(pin(expectedPath).sha256,'670cb789cbdcb300b09db1bcd634c9a10b26c6aef933ea035ebe366a91f2a5d7');
const oracle=JSON.parse(fs.readFileSync(expectedPath,'utf8'));
const { analyzeQuadrature, serializeQuadrature }=await import(pathToFileURL(modelPath));
let assertions=0, fractions=0, nodes=0, ruleResults=0, invalidInputs=0, immutableReports=0, serializations=0;
const check=(a,b,message)=>{assert.deepEqual(a,b,message);assertions++;};
function rat(actual,expected,label) {
  check({numerator:actual.numerator,denominator:actual.denominator},expected,label);
  const n=BigInt(actual.numerator),d=BigInt(actual.denominator);
  assert(d>0n);assertions++;
  let x=n<0n?-n:n,y=d;while(y){[x,y]=[y,x%y];}
  check(x,1n,label+' canonical gcd');
  check(actual.fraction,d===1n?String(n):String(n)+'/'+String(d),label+' fraction');
  check(actual.approximate,Number(expected.numerator)/Number(expected.denominator),label+' approximate is a display projection of independent exact result');
  assert(Number.isFinite(actual.approximate));assertions++;fractions++;
}
function deepFrozen(value) {
  if(value&&typeof value==='object'){
    assert(Object.isFrozen(value));assertions++;
    for(const child of Object.values(value)) deepFrozen(child);
  }
}
function compareRule(actual,expected,kind,label) {
  rat(actual.estimate,expected.estimate,label+' estimate');
  rat(actual.signedError,expected.error,label+' signed error');
  rat(actual.absoluteError,expected.absoluteError,label+' absolute error');
  check(actual.exact,expected.isExact,label+' actual exactness');
  check(actual.guaranteedForDegree,expected.guaranteedByDegree,label+' degree guarantee');
  check(actual.degreeGuarantee,kind==='simpson'?3:1,label+' fixed degree ceiling');
  ruleResults++;
}
const evidence=[];
const started=performance.now();
let failure=null;
try{
  for(const [index,expected] of oracle.cases.entries()){
    const input=structuredClone(expected.input), original=structuredClone(input);
    const actual=analyzeQuadrature(input);
    check(input,original,'caller input unchanged');
    check(actual.input,original,'copied report settings');
    assert(actual.input!==input&&actual.input.coefficients!==input.coefficients);assertions++;
    check(actual.polynomialDegree,expected.polynomialDegree,'polynomial degree');
    rat(actual.exactIntegral,expected.exactIntegral,'analytic antiderivative');
    rat(actual.subintervalWidth,expected.width,'mesh width');
    for(const kind of ['midpoint','trapezoid','simpson']){
      const a=actual.rules[kind],e=expected.rules[kind];
      compareRule(a,e,kind,'case '+index+' '+kind);
      check(a.distinctNodes,e.nodes.length,'node count');
      check(a.nodes.length,e.nodes.length,'trace length');
      for(const [j,node] of a.nodes.entries()){
        check(node.index,j,'node index');
        rat(node.x,e.nodes[j].x,'sample coordinate');
        rat(node.y,e.nodes[j].value,'polynomial value');
        rat(node.weight,e.nodes[j].weight,'aggregate weight');
        rat(node.contribution,e.nodes[j].contribution,'weighted contribution');
        nodes++;
      }
    }
    check(actual.refinement.length,5,'all five refinement levels');
    for(const [i,level] of actual.refinement.entries()){
      const e=expected.refinements[i];check(level.subintervals,e.subintervals,'refinement mesh');
      for(const kind of ['midpoint','trapezoid','simpson']){
        const a=level.rules[kind],r=e.rules[kind];compareRule(a,r,kind,'refinement');
        const expectedKind=r.ratio.kind==='first'?'first-level':r.ratio.kind;
        check(a.previousErrorRatio.kind,expectedKind,'ratio case');
        if(expectedKind==='finite') rat(a.previousErrorRatio.value,r.ratio.value,'exact error ratio');
        else check(a.previousErrorRatio.value,null,'undefined/unavailable ratio has no finite value');
      }
    }
    deepFrozen(actual);immutableReports++;
    const saved=JSON.stringify(actual);
    input.coefficients[0]=input.coefficients[0]===9?-9:9;input.lower=4;
    check(JSON.stringify(actual),saved,'caller mutation cannot change report');
    assert.throws(()=>{actual.input.coefficients[0]=8;},TypeError);assertions++;
    const method=['midpoint','trapezoid','simpson'][index%3];
    const serialized=serializeQuadrature(actual,method);
    assert(serialized.endsWith('\n'));assertions++;
    const parsed=JSON.parse(serialized);check(parsed.inspectedMethod,method,'export inspection method');
    delete parsed.inspectedMethod;check(parsed,actual,'complete exported record unchanged');serializations++;
    if(index>=330&&index<340)evidence.push({input:original,exactIntegral:actual.exactIntegral,rules:Object.fromEntries(Object.entries(actual.rules).map(([k,v])=>[k,{estimate:v.estimate,error:v.signedError,exact:v.exact,guaranteedForDegree:v.guaranteedForDegree}])),ratios:actual.refinement.map(x=>({n:x.subintervals,ratios:Object.fromEntries(Object.entries(x.rules).map(([k,v])=>[k,v.previousErrorRatio]))}))});
  }
  const valid={coefficients:[1,2,3,4,5,6],lower:-5,upper:5,subintervals:32};
  const invalid=[null,undefined,[],42,'input',true,{},...[-Infinity,Infinity,NaN,-10,10,0.5,'1',1n,true,null,undefined].map(v=>({...valid,coefficients:[v,0,0,0,0,0]})),
    ...[[],[0],[0,0,0,0,0],[0,0,0,0,0,0,0],new Array(6),new Int8Array(6),{}].map(coefficients=>({...valid,coefficients})),
    ...[-6,6,0.5,'0',NaN,Infinity,null,undefined,true].flatMap(v=>[{...valid,lower:v},{...valid,upper:v}]),
    {...valid,lower:5,upper:5},{...valid,lower:5,upper:-5},
    ...[0,1,3,6,64,2.5,'2',2n,NaN,Infinity,null,undefined,true].map(subintervals=>({...valid,subintervals}))];
  for(const input of invalid){assert.throws(()=>analyzeQuadrature(input));assertions++;invalidInputs++;}
  const actual=analyzeQuadrature(valid);
  for(const forged of [{},JSON.parse(JSON.stringify(actual)),Object.assign({},actual),null,undefined]){assert.throws(()=>serializeQuadrature(forged));assertions++;}
  for(const method of ['',null,undefined,0,'Midpoint','trapezoidal','unknown']){
    if(method===undefined) {check(JSON.parse(serializeQuadrature(actual,method)).inspectedMethod,'midpoint','omitted method default');continue;}
    assert.throws(()=>serializeQuadrature(actual,method));assertions++;
  }
  // Receiver-sensitivity controls alter only fresh test projections, never model source.
  const wrong=structuredClone(actual);wrong.rules.simpson.signedError.numerator='123456789';
  assert.throws(()=>rat(wrong.rules.simpson.signedError,{numerator:'0',denominator:'1'},'intentional corrupted projection'));
  const negativeZero={...valid,coefficients:[-0,0,0,0,0,0]};
  const z=analyzeQuadrature(negativeZero);check(z.polynomialDegree,null,'signed zero is still zero polynomial');check(z.exactIntegral.numerator,'0','signed-zero exact integral');
}catch(error){failure={name:error.name,message:error.message,stack:error.stack};}
check(pin(modelPath),modelBefore,'model bytes unchanged');
const receipt={reviewer:'chatgpt:5f566b5ec8ef:mac_continuity',phase:'independent exact-rational receiving after blind freeze',at:new Date().toISOString(),node:process.version,model:modelBefore,blind:pin(path.join(root,'blind-derived.json')),oracleSource:pin(path.join(root,'oracle.py')),oracleExpected:pin(expectedPath),receiver:pin(fileURLToPath(import.meta.url)),candidateCaseCount:oracle.cases.length,assertions,fractions,nodes,ruleResults,invalidInputs,immutableReports,serializations,durationMs:performance.now()-started,failure,counterexampleEvidence:evidence,scope:'Source/model/course mathematics only; no learner UI or comprehension outcome claim; owner source unchanged'};
fs.writeFileSync(path.join(root,'model-receipt.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({checks:assertions,fractions,nodes,ruleResults,invalidInputs,cases:oracle.cases.length,failure,receipt:pin(path.join(root,'model-receipt.json'))}));
if(failure)process.exitCode=1;
