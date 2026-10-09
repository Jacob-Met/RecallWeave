import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {interpolatePolynomial} from '../src/polynomial-interpolation.mjs';
import {queryLines,createInterpolationSession,plotInterpolation} from '../src/polynomial-interpolation-ui.mjs';
const sample=()=>({points:[{x:' 2 ',y:'4'},{x:'0',y:'0'},{x:'1',y:'1'}],at:[' 1/2 ','3']});
test('query rows preserve literal strings and authored order',()=>{
 assert.deepEqual(queryLines(' 1/2 \r\n-3\n+2'),[' 1/2 ','-3','+2']);
 assert.deepEqual(queryLines(' \n\t'),[]);assert.deepEqual(queryLines('0\n\n1'),['0','','1']);
 assert.throws(()=>queryLines(null),TypeError);
});
test('new session is unaccepted; exact complete report is the sole observation',()=>{
 const s=createInterpolationSession();assert.equal(s.report,null);assert.throws(()=>s.observation());
 const input=sample(),expected=interpolatePolynomial(input);s.apply(input);
 assert.deepEqual(JSON.parse(s.observation()),expected);assert.equal(s.observation(),JSON.stringify(expected,null,2)+'\n');
});
test('accepted result is recursively frozen and detached from input',()=>{
 const s=createInterpolationSession(),input=sample(),r=s.apply(input),text=s.observation();
 input.points[0].x='999';input.at.splice(0,2,'0');assert.equal(s.observation(),text);
 assert.equal(r.input.points[0].x,' 2 ');assert(Object.isFrozen(r.nodeChecks[0]));
 assert.throws(()=>{r.input.points[0].x='8';},TypeError);assert.throws(()=>r.evaluations.push({}),TypeError);
});
test('retiring refuses export; an invalid apply never revives old state',()=>{
 const s=createInterpolationSession();s.apply(sample());s.retire();assert.equal(s.report,null);assert.throws(()=>s.observation());
 s.apply(sample());assert.throws(()=>s.apply({points:[{x:'1/2',y:'0'},{x:'0.5',y:'2'}],at:[]}),/duplicates/);
 assert.equal(s.report,null);assert.throws(()=>s.observation());
 s.apply(sample());assert.throws(()=>s.apply({points:[{x:'0',y:'1'}],at:queryLines('0\n\n1')}));
 assert.equal(s.report,null);assert.throws(()=>s.observation());
});
test('repaired selection publishes only its own snapshot including optional zero queries',()=>{
 const s=createInterpolationSession();s.apply(sample());s.retire();
 s.apply({points:[{x:'3',y:'-2'}],at:queryLines('')});
 const r=JSON.parse(s.observation());assert.equal(r.degree,0);assert.deepEqual(r.evaluations,[]);assert.deepEqual(r.input.points,[{x:'3',y:'-2'}]);
});
test('zero and actual lower degree remain distinct at the UI boundary',()=>{
 const s=createInterpolationSession();s.apply({points:[{x:'-1',y:'0'},{x:'1',y:'0'}],at:['0']});assert.equal(s.report.degree,null);
 s.apply({points:[{x:'-1',y:'-1'},{x:'0',y:'1'},{x:'1',y:'3'}],at:['2']});
 assert.equal(s.report.degree,1);assert.equal(s.report.evaluations[0].relation,'outside');
});
test('plot is finite, bounded and cannot change exact report or its classifications',()=>{
 for(const input of [sample(),{points:[{x:'3',y:'-2'}],at:['0']},{points:[{x:'-1',y:'0'},{x:'1',y:'0'}],at:[]},
 {points:[{x:'999999/1000000',y:'1000000000'},{x:'1',y:'-1000000000'},{x:'1000001/1000000',y:'0'}],at:['-1000000000','1000000000']}]) {
  const r=interpolatePolynomial(input),before=JSON.stringify(r),g=plotInterpolation(r);assert(g);
  assert.equal(g.curve.length,161);for(const p of [...g.curve,...g.nodes,...g.queries]){assert(Number.isFinite(p.x)&&Number.isFinite(p.y));assert(p.x>=44.99&&p.x<=675.01&&p.y>=34.99&&p.y<=265.01);}
  assert.equal(JSON.stringify(r),before);
 }
});
test('eight samples and sixteen literal queries survive complete interface serialization',()=>{
 const input={points:Array.from({length:8},(_,i)=>({x:String(i-4),y:String((i-4)**2)})),at:Array.from({length:16},(_,i)=>String(i-8))};
 const s=createInterpolationSession();s.apply(input);assert.deepEqual(JSON.parse(s.observation()),interpolatePolynomial(input));
});
test('committed direct-open page exactly rebuilds with pinned accepted course and guide',()=>{
 const script=fileURLToPath(new URL('../tools/build-polynomial-interpolation-explorer.mjs',import.meta.url));
 const r=spawnSync(process.execPath,[script,'--check'],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);
 const html=fs.readFileSync(new URL('../courses/polynomial-interpolation-explorer.html',import.meta.url),'utf8');
 assert(html.includes('Exact rational tables'));assert(!html.includes('/*__INTERPOLATION_PROGRAM__*/'));
 assert(!/src=["']https?:/.test(html));
});
