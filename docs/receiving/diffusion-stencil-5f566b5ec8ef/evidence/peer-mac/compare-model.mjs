import fs from 'node:fs'; import assert from 'node:assert/strict'; import crypto from 'node:crypto';
import {computeDiffusion} from '../../source/src/diffusion-stencil.mjs';
const root=new URL('./',import.meta.url), read=p=>fs.readFileSync(new URL(p,root));
const expected=JSON.parse(read('oracle-expected.json')), modelPath=new URL('../../source/src/diffusion-stencil.mjs',root);
const pin=crypto.createHash('sha256').update(fs.readFileSync(modelPath)).digest('hex'); const groups=[];
for (let i=0;i<expected.length;i++){
 const e=expected[i], snapshot=JSON.stringify(e.input), actual=computeDiffusion(e.input);
 assert.equal(JSON.stringify(e.input),snapshot);
 assert.deepEqual(actual.input,e.input);
 for(const k of ['weights','alternatingMultiplier','convexWeights']) assert.deepEqual(actual[k],e[k],i+':'+k);
 assert.equal(actual.rows.length,e.rows.length);
 actual.rows.forEach((r,n)=>{assert.equal(r.step,n); const {step,...rest}=r; assert.deepEqual(rest,e.rows[n],i+':row'+n);});
}
groups.push({name:'204 independently frozen Fraction cases, complete rows and all transition terms',passed:true});
const valid={values:[-7,3,19,-2,0,11,-20,6],numerator:4,denominator:8,steps:2};
const report=computeDiffusion(valid), saved=JSON.stringify(report);
function frozen(x){if(x&&typeof x==='object'){assert(Object.isFrozen(x));Object.values(x).forEach(frozen);}}
frozen(report); valid.values[0]=20;valid.steps=1;assert.equal(JSON.stringify(report),saved);
groups.push({name:'Every output object frozen, input detached and unreduced spelling preserved',passed:true});
let bad=0;
for(const field of ['numerator','denominator','steps']) for(const value of [true,false,'1',null,NaN,Infinity,1.5,-1,17+(field==='steps'?8:0)]){
 assert.throws(()=>computeDiffusion({...valid,[field]:value}));bad++;
}
for(const value of [true,false,'1',null,NaN,Infinity,1.5,-21,21]){
 assert.throws(()=>computeDiffusion({...valid,values:[value,...valid.values.slice(1)]}));bad++;
}
const sparse=Array(8);sparse[0]=1;assert.throws(()=>computeDiffusion({...valid,values:sparse}));bad++;
assert.throws(()=>computeDiffusion({...valid,numerator:9,denominator:8}));bad++;
assert.throws(()=>computeDiffusion({...valid,values:new Int32Array(8)}));bad++;
const zero=computeDiffusion({values:[-0,0,0,0,0,0,0,0],numerator:-0,denominator:3,steps:0,unused:{secret:'ignored'}});
assert.deepEqual(zero.rows[0].values,Array(8).fill({numerator:'0',denominator:'1'}));assert(!('unused' in zero.input));
groups.push({name:'Strict scalar, density and range boundaries; negative zero and unknown fields',passed:true,refusals:bad});
const receipt={modelSha256:pin,cases:expected.length,groups,sourceUnchanged:pin===crypto.createHash('sha256').update(fs.readFileSync(modelPath)).digest('hex'),scope:'Independent exact model receiving, no owner tests or browser replay'};
fs.writeFileSync(new URL('model-receipt.json',root),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
