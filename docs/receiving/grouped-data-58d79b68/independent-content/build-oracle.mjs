import fs from 'node:fs';
import assert from 'node:assert/strict';
import {expected,fraction,add,multiply,compare,encode} from './oracle.mjs';
const group=(success,total)=>({success,total});
const data=(A,B,weight=50)=>({A:A.map(x=>group(...x)),B:B.map(x=>group(...x)),weight});
const fixtures=[
 ['strict_reversal',data([[1,10],[81,90]],[[16,80],[19,20]])],
 ['aligned_nonreversal',data([[3,4],[4,5]],[[2,4],[3,5]],60)],
 ['pooled_tie_both_groups_A',data([[2,10],[8,10]],[[1,10],[14,20]])],
 ['one_subgroup_tie',data([[50,100],[9,10]],[[1,2],[8,10]])],
 ['opposing_subgroups',data([[3,4],[2,5]],[[2,4],[4,5]])],
 ...[0,37,100].map(w=>['missing_newcomer_weight_'+w,data([[0,0],[6,10]],[[2,10],[8,10]],w)]),
 ...[0,37,100].map(w=>['missing_experienced_weight_'+w,data([[4,10],[0,0]],[[2,10],[8,10]],w)]),
 ...[0,50,100].map(w=>['entire_option_empty_weight_'+w,data([[0,0],[0,0]],[[0,5],[0,10]],w)]),
 ['available_zero_rates',data([[0,1],[0,3]],[[0,2],[0,7]])],
 ['maximum_valid_counts',data([[1000000,1000000],[1000000,1000000]],[[1000000,1000000],[1000000,1000000]],100)],
 ['tiny_strict_reversal',data([[99999,200000],[500001,1000000]],[[499996,1000000],[100001,200000]])],
 ['float_collapsed_reference_difference',data([[999996,999997],[999999,1000000]],[[999997,999998],[999998,999999]])],
];
const base=data([[1,10],[81,90]],[[16,80],[19,20]],37);
fixtures.push(['symmetry_base_37',base]);
fixtures.push(['swap_A_B',{A:structuredClone(base.B),B:structuredClone(base.A),weight:37}]);
fixtures.push(['swap_groups_complement_weight',{A:structuredClone(base.A).reverse(),B:structuredClone(base.B).reverse(),weight:63}]);
fixtures.push(['scale_A_seven',{A:base.A.map(g=>group(g.success*7,g.total*7)),B:structuredClone(base.B),weight:37}]);
const rows=fixtures.map(([id,input])=>({id,input,expected:expected(input)}));
const byId=Object.fromEntries(rows.map(r=>[r.id,r.expected]));
assert.deepEqual(byId.strict_reversal.within,['B','B']);
assert.equal(byId.strict_reversal.pooled,'A'); assert.equal(byId.strict_reversal.strictReversal,true);
assert.equal(byId.strict_reversal.A.pooled,'41/50'); assert.equal(byId.strict_reversal.B.pooled,'7/20');
assert.equal(byId.strict_reversal.A.reference,'1/2'); assert.equal(byId.strict_reversal.B.reference,'23/40');
assert.deepEqual(byId.pooled_tie_both_groups_A.within,['A','A']); assert.equal(byId.pooled_tie_both_groups_A.pooled,'tie'); assert.equal(byId.pooled_tie_both_groups_A.strictReversal,false);
assert.deepEqual(byId.one_subgroup_tie.within,['tie','A']); assert.equal(byId.one_subgroup_tie.pooled,'B'); assert.equal(byId.one_subgroup_tie.strictReversal,false);
assert.deepEqual(byId.opposing_subgroups.within,['A','B']); assert.equal(byId.opposing_subgroups.strictReversal,false);
assert.equal(byId.missing_newcomer_weight_100.A.reference,'3/5'); assert.equal(byId.missing_newcomer_weight_0.A.reference,null); assert.equal(byId.missing_newcomer_weight_37.A.reference,null);
assert.equal(byId.missing_experienced_weight_0.A.reference,'2/5'); assert.equal(byId.missing_experienced_weight_37.A.reference,null); assert.equal(byId.missing_experienced_weight_100.A.reference,null);
for(const w of [0,50,100]) { assert.equal(byId['entire_option_empty_weight_'+w].A.reference,null); assert.equal(byId['entire_option_empty_weight_'+w].B.reference,'0/1'); }
assert.equal(byId.available_zero_rates.A.pooled,'0/1'); assert.equal(byId.available_zero_rates.pooled,'tie');
assert.deepEqual(byId.tiny_strict_reversal.within,['B','B']); assert.equal(byId.tiny_strict_reversal.pooled,'A'); assert.equal(byId.tiny_strict_reversal.B.pooled,'199999/400000'); assert.equal(byId.tiny_strict_reversal.strictReversal,true);
const n=999997n, delta=fraction(2n*n+3n,n*(n+1n)*(n+2n)*(n+3n));
const exact=byId.float_collapsed_reference_difference;
assert.equal(exact.reference,'B'); assert.equal(exact.pooled,'tie');
const parse=s=>{const [n,d]=s.split('/').map(BigInt);return fraction(n,d);};
const observedDelta=add(parse(exact.B.reference),multiply(parse(exact.A.reference),-1));
assert.equal(encode(observedDelta),encode(delta));
const directA=((999996/999997)+(999999/1000000))/2,directB=((999997/999998)+(999998/999999))/2;
assert.equal(directA,directB);
const s=byId.symmetry_base_37,ab=byId.swap_A_B,g=byId.swap_groups_complement_weight,scaled=byId.scale_A_seven;
assert.equal(ab.A.reference,s.B.reference);assert.equal(ab.B.reference,s.A.reference);assert.equal(ab.strictReversal,s.strictReversal);
for(const k of ['A','B']) { assert.equal(g[k].pooled,s[k].pooled);assert.equal(g[k].reference,s[k].reference); }
for(const k of ['rates','weights','pooled','reference']) assert.deepEqual(scaled.A[k],s.A[k]);
const invalid=[];
const bad=[['empty',''],['whitespace','  '],['malformed','not-a-number'],['negative','-1'],['fractional','0.25'],['nonfinite','Infinity'],['overflow_nonfinite','1e309'],['over_limit','1000001']];
for(const option of ['A','B']) for(const group of [0,1]) for(const field of ['success','total']) for(const [kind,value] of bad) invalid.push({id:[option,group,field,kind].join('_'),path:[option,group,field],rawDraft:value,expected:'invalid_current_output_and_downloads_unavailable'});
for(const [kind,value] of [...bad.filter(x=>x[0]!=='over_limit'),['over_limit','101']]) invalid.push({id:'weight_'+kind,path:['weight'],rawDraft:value,expected:'invalid_current_output_and_downloads_unavailable'});
for(const option of ['A','B']) for(const group of [0,1]) {
 invalid.push({id:[option,group,'success_above_total'].join('_'),path:[option,group,'success'],rawDraft:String(base[option][group].total+1),expected:'invalid_current_output_and_downloads_unavailable'});
 invalid.push({id:[option,group,'total_below_success'].join('_'),path:[option,group,'total'],rawDraft:String(base[option][group].success-1),expected:'invalid_current_output_and_downloads_unavailable'});
}
fs.writeFileSync(new URL('./numerical-expectations.json',import.meta.url),JSON.stringify({schema:'recallweave.blind_numerical_expectations.v1',contractSha256:'6314d6fa5e886305de6bf1a833049cffe6b591a6b09b1c50d4fa02b94cbc974d',productSourceRead:false,cases:rows},null,2)+'\n',{flag:'wx',mode:0o444});
fs.writeFileSync(new URL('./invalid-drafts.json',import.meta.url),JSON.stringify({schema:'recallweave.blind_invalid_drafts.v1',baseline:base,cases:invalid,lexicalNonrequirements:['1.0','1e3']},null,2)+'\n',{flag:'wx',mode:0o444});
console.log(JSON.stringify({oracleSanity:'pass',numericalCases:rows.length,invalidDraftCases:invalid.length,ordinaryFloatReferenceEquality:directA===directB,exactReferenceWinner:exact.reference,exactReferenceBMinusA:encode(delta),rootImplementationInspected:false}));
