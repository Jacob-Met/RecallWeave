import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {calculateEditDistance,editCell,serializeEditExperiment,validateEditExperiment,EDIT_PRESETS} from '../src/edit-distance.mjs';
import {parseDeck} from '../src/deck.mjs';
import {initialMastery,selectNextItem,updateMastery} from '../src/knowledge.mjs';
import {createReview,beginPractice,answerPractice} from '../src/review.mjs';
const policy=(insert=1,del=1,substitute=1)=>({insert,delete:del,substitute});
const run=(source,target,costs=policy())=>calculateEditDistance({source,target,costs});

/** Exhaustive path enumeration, not the implementation's prefix table. */
function enumerate(source,target,costs){
  const a=Array.from(source),b=Array.from(target);let best=Infinity,last=new Set();
  function walk(i,j,total,kind){
    if(i===a.length&&j===b.length){if(total<best){best=total;last=new Set(kind?[kind]:[]);}else if(total===best&&kind)last.add(kind);return;}
    if(i<a.length&&j<b.length)walk(i+1,j+1,total+(a[i]===b[j]?0:costs.substitute),a[i]===b[j]?'match':'substitute');
    if(i<a.length)walk(i+1,j,total+costs.delete,'delete');
    if(j<b.length)walk(i,j+1,total+costs.insert,'insert');
  }
  walk(0,0,0,null);return{cost:best,last:[...last].sort()};
}
function receiveWitness(result){
  const a=Array.from(result.input.source),b=Array.from(result.input.target);let i=0,j=0,cost=0;
  for(const operation of result.alignment){
    assert.deepEqual(operation.from,[i,j]);
    if(operation.kind!=='insert'){assert.equal(operation.source,a[i]);assert.equal(operation.sourceIndex,i++);}else assert.equal(operation.source,null);
    if(operation.kind!=='delete'){assert.equal(operation.target,b[j]);assert.equal(operation.targetIndex,j++);}else assert.equal(operation.target,null);
    assert.equal(operation.cost,operation.kind==='match'?0:result.input.costs[operation.kind]);
    if(operation.kind==='match')assert.equal(operation.source,operation.target);
    cost+=operation.cost;assert.deepEqual(operation.to,[i,j]);
  }
  assert.deepEqual([i,j],[a.length,b.length]);assert.equal(cost,result.distance);
  assert.equal(result.replay.at(-1).text,result.input.target);
  assert.equal(result.replay.at(-1).remainingSource,'');
  assert.equal(result.replay.at(-1).cost,result.distance);
}
test('empty boundaries, ordinary transformation, no transposition and directional costs',()=>{
  for(const [a,b,costs,cost] of [
    ['','',policy(),0],['','abc',policy(2,3,4),6],['abc','',policy(2,3,4),9],
    ['kitten','sitting',policy(),3],['ab','ba',policy(),2],['a','b',policy(1,1,4),2],
    [' A','a',policy(),2],['aa','a',policy(),1]
  ]){const result=run(a,b,costs);assert.equal(result.distance,cost);receiveWitness(result);}
});
test('every small prefix minimum and tied predecessor matches exhaustive whole paths',()=>{
  const strings=[''];
  for(let n=1;n<=3;n++)for(let mask=0;mask<2**n;mask++)strings.push(Array.from({length:n},(_,i)=>mask&(1<<i)?'b':'a').join(''));
  for(const costs of [policy(),policy(1,1,3),policy(2,1,2),policy(1,3,2)]){
    for(const a of strings)for(const b of strings){
      const result=run(a,b,costs),expected=enumerate(a,b,costs);
      assert.equal(result.distance,expected.cost,JSON.stringify({a,b,costs}));
      assert.deepEqual(result.cells.at(-1).at(-1).candidates.filter(x=>x.optimal).map(x=>x.kind).sort(),expected.last);
      receiveWitness(result);
    }
  }
});
test('canonical ties select diagonal, then deletion, then insertion without dropping other winners',()=>{
  const repeated=run('aa','a'),cell=editCell(repeated,2,1);
  assert.deepEqual(cell.candidates.filter(x=>x.optimal).map(x=>x.kind),['match','delete']);
  assert.equal(cell.chosen,'match');
  assert.deepEqual(repeated.alignment.map(x=>x.kind),['delete','match']);
  const expensive=run('a','b',policy(1,1,4));
  assert.deepEqual(editCell(expensive,1,1).candidates.filter(x=>x.optimal).map(x=>x.kind),['delete','insert']);
  assert.deepEqual(expensive.alignment.map(x=>x.kind),['insert','delete']);
  const three=run('a','b',policy(1,1,2));
  assert.deepEqual(editCell(three,1,1).candidates.filter(x=>x.optimal).map(x=>x.kind),['substitute','delete','insert']);
});
test('Unicode scalar identity preserves literal normalization form, case and whitespace',()=>{
  for(const [a,b,cost] of [['😀','',1],['é','e\u0301',2],['é','é',0],['a','A',1],[' a','a',1],['\u2028','',1]]){
    const result=run(a,b);assert.equal(result.distance,cost);receiveWitness(result);
    assert.equal(JSON.parse(serializeEditExperiment(result)).input.source,a);
  }
  assert.equal(run('😀'.repeat(16),'').sourceSymbols.length,16);
  assert.throws(()=>run('😀'.repeat(17),''),/16/);
});
test('malformed inputs, noninteger costs, controls and unpaired surrogates are refused',()=>{
  for(const value of [null,[],true,{},'source'])assert.throws(()=>validateEditExperiment(value));
  for(const source of [null,1,[],{},'a'.repeat(17),'x\u0000','x\n','x\t','\u007f','\ud800','\udfff'])assert.throws(()=>run(source,''));
  for(const name of ['insert','delete','substitute'])for(const value of [0,-1,10,1.5,NaN,Infinity,'1',null,true])assert.throws(()=>run('a','b',{...policy(),[name]:value}),/integer/);
});
test('accepted input, every cell, alignment and replay are deeply immutable copies',()=>{
  const input={source:'ab',target:'ac',costs:policy()},result=calculateEditDistance(input);
  input.source='changed';input.costs.insert=9;
  assert.equal(result.input.source,'ab');assert.equal(result.input.costs.insert,1);
  function check(value){if(value&&typeof value==='object'){assert.equal(Object.isFrozen(value),true);Object.values(value).forEach(check);}}
  check(result);
  assert.throws(()=>{result.cells[0][0].cost=99;},TypeError);
});
test('complete record retains accepted inputs and exact table/candidates/witness; foreign objects refuse',()=>{
  const result=run('ab','ba',policy(2,3,4)),record=JSON.parse(serializeEditExperiment(result));
  for(const key of ['input','sourceSymbols','targetSymbols','cells','distance','alignment','replay','tieRule'])assert.deepEqual(record[key],result[key]);
  assert.equal(record.format,'recallweave-edit-distance-experiment/1');
  assert.throws(()=>serializeEditExperiment({...result}),/Compute/);
  assert.throws(()=>editCell(result,-1,0),/valid prefix/);
  assert.throws(()=>editCell(result,0,3),/valid prefix/);
  assert.throws(()=>editCell(result,0.5,0),/valid prefix/);
});
test('all declared presets produce valid fully replayable witnesses',()=>{
  for(const preset of EDIT_PRESETS)receiveWitness(calculateEditDistance(preset));
});
test('original twelve-question course works through unchanged learning and separate practice',async()=>{
  const text=await readFile(new URL('../courses/edit-distance.json',import.meta.url),'utf8'),deck=parseDeck(text);
  assert.equal(deck.items.length,12);assert.equal(new Set(deck.items.map(x=>x.id)).size,12);
  assert.deepEqual(deck.items.map(x=>x.answer),[1,2,3,0,1,2,3,0,2,3,0,1]);
  const mastery=initialMastery(deck.concepts),asked=new Set(),answers=[];
  while(asked.size<12){const q=selectNextItem(deck.items,asked,mastery);assert.ok(q);const choice=asked.size%4===0?(q.answer+1)%q.options.length:q.answer;asked.add(q.id);answers.push({item:q.id,choice});mastery[q.concept]=updateMastery(mastery[q.concept],choice===q.answer);}
  const review=createReview(deck.items,answers),before=JSON.stringify({review,mastery});let practice=beginPractice(review);
  assert.equal(practice.items.length,3);for(const q of practice.items)practice=answerPractice(practice,q.id,q.answer);
  assert.equal(practice.answers.filter(x=>x.correct).length,3);assert.equal(JSON.stringify({review,mastery}),before);
});
test('standalone artifact matches the exact model, controller, deck, guide and template',()=>{
  const result=spawnSync(process.execPath,['tools/build-edit-distance.mjs','--check'],{cwd:fileURLToPath(new URL('../',import.meta.url)),encoding:'utf8'});
  assert.equal(result.status,0,result.stdout+result.stderr);
});
