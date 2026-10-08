import assert from 'node:assert/strict';
import {buildSearchComparison, EXAMPLES} from '../recallweave-substring-discovery/candidate/src/substring-search.mjs';
const results=[];
function receive(name,fn){try{const detail=fn();results.push({name,passed:true,detail});}catch(error){results.push({name,passed:false,error:error.message,actual:error.actual,expected:error.expected});}}
receive('named combining example contains the declared three code points',()=>{
 const example=EXAMPLES.find(x=>x.name==='Combining text is not normalized');
 const expected=String.fromCodePoint(0x65,0x301,0xe9);
 assert.equal(example.text,expected);
 const result=buildSearchComparison(example.text,example.pattern);
 assert.deepEqual(result.kmp.matches,[2]);
 return {code_points:Array.from(example.text,x=>x.codePointAt(0)),matches:result.kmp.matches};
});
receive('every naive state has a truthful matched prefix at its displayed start',()=>{
 const pairs=[['ABABABABA','ABABA'],['ZZABAX','ABA'],['AAAAAB','AAA'],['','AB'],['A','ABC']];
 for(const [text,pattern]of pairs){
  const result=buildSearchComparison(text,pattern);
  for(const [index,step]of result.naive.steps.entries()){
   assert.deepEqual(result.textTokens.slice(step.start,step.start+step.offset),result.patternTokens.slice(0,step.offset),
    JSON.stringify({text,pattern,index,kind:step.kind,start:step.start,offset:step.offset}));
  }
 }
 return {pairs:pairs.length};
});
console.log(JSON.stringify({runtime:process.version,results,failed:results.filter(x=>!x.passed).length},null,2));
process.exitCode=results.some(x=>!x.passed)?1:0;

