import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {queryLines,createInterpolationSession,plotInterpolation} from '../recallweave-interpolation-explorer-5f566b5ec8ef/source/src/polynomial-interpolation-ui.mjs';
import {interpolatePolynomial} from '../recallweave-interpolation-explorer-5f566b5ec8ef/source/src/polynomial-interpolation.mjs';
const checks=[]; function group(name,fn){fn();checks.push({name,pass:true});}
const input=()=>({points:[{x:' 2 ',y:'4'},{x:'0',y:' 0 '},{x:'1',y:'1'}],at:[' 1/2 ','3','2']});
group('literal query tokenization and blank distinction',()=>{
 assert.deepEqual(queryLines(' 1/2 \r\n3\r2\n'),[' 1/2 ','3','2','']);
 assert.deepEqual(queryLines(' \r\n\t '),[]);
 assert.deepEqual(queryLines('0\n\n1'),['0','','1']);
 assert.throws(()=>queryLines(0),TypeError);
});
group('complete native report and observation identity without rederiving mathematics',()=>{
 const i=input(),expected=interpolatePolynomial(i),s=createInterpolationSession(),r=s.apply(i);
 assert.deepEqual(r,expected);assert.equal(s.observation(),JSON.stringify(expected,null,2)+'\n');
 assert.deepEqual(r.input.points,i.points);assert.equal(r.evaluations.length,3);
});
group('draft mutation detached and accepted report recursively frozen',()=>{
 const i=input(),s=createInterpolationSession(),r=s.apply(i),bytes=s.observation();
 i.points[0].x='99';i.points.push({x:'100',y:'-1'});i.at[0]='88';
 assert.equal(s.observation(),bytes);assert.equal(r.input.points[0].x,' 2 ');
 const everyFrozen=v=>!v||typeof v!=='object'||Object.isFrozen(v)&&Object.values(v).every(everyFrozen);
 assert(everyFrozen(r));assert.throws(()=>{r.input.points[0].x='77';},TypeError);
 assert.throws(()=>{s.report={};},TypeError);
});
group('invalid apply retires previous accepted observation',()=>{
 const s=createInterpolationSession();s.apply(input());
 assert.throws(()=>s.apply({points:[{x:'1',y:'2'},{x:'2/2',y:'3'}],at:[]}));
 assert.equal(s.report,null);assert.throws(()=>s.observation());
 s.apply(input());assert.throws(()=>s.apply({points:input().points,at:queryLines('0\n\n1')}));
 assert.equal(s.report,null);assert.throws(()=>s.observation());
});
group('explicit retirement and new same-input acceptance have separate identities',()=>{
 const s=createInterpolationSession(),a=s.apply(input()),old=s.observation();s.retire();
 assert.equal(s.report,null);assert.throws(()=>s.observation());
 const b=s.apply(input());assert.notEqual(a,b);assert.equal(s.observation(),old);
});
group('approximate plot handles constant admitted input and refuses synthetic nonfinite geometry',()=>{
 const report=interpolatePolynomial({points:[{x:'3',y:'-2'}],at:[]}),g=plotInterpolation(report);
 assert(g&&g.curve.length===161&&g.nodes.length===1&&g.queries.length===0);
 for(const p of [...g.curve,...g.nodes])assert(Number.isFinite(p.x)&&Number.isFinite(p.y));
 const synthetic=structuredClone(report);synthetic.nodes[0].x='1e999';assert.equal(plotInterpolation(synthetic),null);
 assert.equal(report.nodes[0].x,'3');
});
const result={reviewer:'chatgpt:5f566b5ec8ef:coordination',qualification:'Actual native Node public caller checks; unchanged model is an identity reference, not an independent mathematical oracle. Synthetic nonfinite helper input is not an admitted model report.',checks};
fs.writeFileSync(new URL('./caller-result.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({passed:checks.length}));
