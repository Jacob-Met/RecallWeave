import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeGroupedData,parseGroupedCount,serializeGroupedComparison,GROUPED_PRESETS} from './core-v1.mjs';
const oracle=JSON.parse(fs.readFileSync(new URL('./numerical-expectations.json',import.meta.url)));
const invalid=JSON.parse(fs.readFileSync(new URL('./invalid-drafts.json',import.meta.url)));
const toNative=input=>Object.fromEntries([['a','A'],['b','B']].map(([key,source])=>[key,Object.fromEntries(['newcomers','experienced'].map((g,i)=>[g,{successes:input[source][i].success,total:input[source][i].total}]))]));
const encode=f=>f===null?null:`${f.numerator}/${f.denominator}`;
const direction={a_higher:'A',b_higher:'B',equal:'tie',unavailable:'unavailable'};
function assertView(report,e) {
  assert.equal(report.reference.experiencedPercent,e.weight);
  assert.deepEqual(report.groups.map(g=>direction[g.comparison]),e.within);
  assert.equal(direction[report.observed.comparison],e.pooled);
  assert.equal(direction[report.reference.comparison],e.reference);
  assert.equal(report.classification==='strict_reversal',e.strictReversal);
  for(const [native,own] of [['a','A'],['b','B']]) {
    assert.deepEqual(report.groups.map(g=>encode(g[native])),e[own].rates);
    assert.equal(encode(report.observed[native].rate),e[own].pooled);
    assert.equal(encode(report.observed[native].experiencedWeight),e[own].weights[1]);
    assert.equal(encode(report.reference[native]),e[own].reference);
    assert.equal(report.observed[native].successes,e[own].pooledCounts.success);
    assert.equal(report.observed[native].total,e[own].pooledCounts.total);
    assert.deepEqual(report.counts[native],Object.fromEntries(['newcomers','experienced'].map((g,i)=>[g,{successes:e[own].counts[i].success,total:e[own].counts[i].total}])));
    const expectedMissing=['newcomers','experienced'].filter((g,i)=>(i===0?100-e.weight:e.weight)>0&&e[own].counts[i].total===0);
    assert.deepEqual(report.reference.missing[native],expectedMissing);
  }
}
const classifications={
 pooled_tie_both_groups_A:'pooled_tie',one_subgroup_tie:'subgroup_tie',opposing_subgroups:'mixed_groups',
 missing_newcomer_weight_100:'unavailable',missing_experienced_weight_0:'unavailable',available_zero_rates:'subgroup_tie',float_collapsed_reference_difference:'mixed_groups'
};
for(const row of oracle.cases) test('independent exact oracle: '+row.id,()=>{
 const counts=toNative(row.input),before=JSON.stringify(counts);
 const report=analyzeGroupedData(counts,row.input.weight);
 assertView(report,row.expected);
 assert.equal(JSON.stringify(counts),before,'caller counts preserved');
 if(classifications[row.id]) assert.equal(report.classification,classifications[row.id]);
 const exported=JSON.parse(serializeGroupedComparison(counts,row.input.weight));
 assert.equal(exported.format,'recallweave-grouped-data/1');assertView(exported,row.expected);
 assert.equal(JSON.stringify(counts),before,'export preserves caller counts');
 if(row.id==='float_collapsed_reference_difference') {
   assert.equal(report.reference.a.value,report.reference.b.value,'display approximations coincide');
   assert.equal(report.reference.comparison,'b_higher','exact reference comparison remains strict');
   assert.notEqual(report.reference.difference.numerator,'0');
 }
});
for(const row of invalid.cases) test('invalid draft admission: '+row.id,()=>{
 const fields=toNative(invalid.baseline);
 for(const option of ['a','b'])for(const group of ['newcomers','experienced'])for(const field of ['successes','total'])fields[option][group][field]=String(fields[option][group][field]);
 let w=String(invalid.baseline.weight);
 if(row.path[0]==='weight') w=row.rawDraft;
 else fields[row.path[0].toLowerCase()][['newcomers','experienced'][row.path[1]]][row.path[2]==='success'?'successes':'total']=row.rawDraft;
 assert.throws(()=>{
   const counts=Object.fromEntries(['a','b'].map(option=>[option,Object.fromEntries(['newcomers','experienced'].map(group=>[group,{successes:parseGroupedCount(fields[option][group].successes),total:parseGroupedCount(fields[option][group].total)}]))]));
   analyzeGroupedData(counts,parseGroupedCount(w));
 });
});
test('original presets include distinct reversal, nonreversal, empty-support cases',()=>{
 assert(Object.keys(GROUPED_PRESETS).length>=3);
 const outcomes=Object.values(GROUPED_PRESETS).map(p=>analyzeGroupedData(p.counts,p.experiencedPercent));
 assert(outcomes.some(x=>x.classification==='strict_reversal'));
 assert(outcomes.some(x=>x.classification==='same_direction'));
 assert(outcomes.some(x=>x.reference.a===null||x.reference.b===null));
});
test('typed kernel rejects non-integer values without caller mutation',()=>{
 const types=[null,undefined,true,NaN,Infinity,-Infinity,'0',{},[]];
 for(const v of types){
   const input=toNative(invalid.baseline);input.b.experienced.successes=v;
   assert.throws(()=>analyzeGroupedData(input,50));
 }
});
