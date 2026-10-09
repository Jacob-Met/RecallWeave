import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fixedCorpus, scalarUnits, enumeratedOptimum, expectedPrefixTable, certificateCost } from './core-oracle-v1.mjs';

const root = path.resolve(process.argv[2]), out = path.resolve(process.argv[3]);
const m = await import(pathToFileURL(path.join(root, 'src/edit-distance.mjs')));
const deckApi = await import(pathToFileURL(path.join(root, 'src/deck.mjs')));
const knowledge = await import(pathToFileURL(path.join(root, 'src/knowledge.mjs')));
const reviewApi = await import(pathToFileURL(path.join(root, 'src/review.mjs')));
const report = { schema: 'recallweave.independent-edit-distance.native.v1', node: process.version, source: root, groups: [], candidateTree: '7b087777a243d25c5ff6e5b3e2b9d14e91a8fac5', started: new Date().toISOString() };
const sha = b => createHash('sha256').update(b).digest('hex');
report.oracleSha256 = sha(await readFile(new URL('./core-oracle-v1.mjs', import.meta.url)));
report.receiverSha256 = sha(await readFile(new URL(import.meta.url)));
const group = async (name, fn) => {
  try { const detail = await fn(); report.groups.push({ name, passed: true, detail }); }
  catch (error) { report.groups.push({ name, passed: false, error: error.stack }); }
};
function receiveRun(source, target, costs, expected = expectedPrefixTable(source, target, costs)) {
  const input = { source, target, costs: { ...costs } }, literalBefore = JSON.stringify(input);
  const run = m.calculateEditDistance(input);
  assert.equal(JSON.stringify(input), literalBefore);
  assert.deepEqual(run.input, input);
  assert.deepEqual(run.sourceSymbols, scalarUnits(source)); assert.deepEqual(run.targetSymbols, scalarUnits(target));
  assert.deepEqual(run.cells.map(row => row.map(cell => cell.cost)), expected);
  assert.equal(run.distance, expected.at(-1).at(-1));
  for (let i = 0; i < expected.length; i++) for (let j = 0; j < expected[i].length; j++) {
    const cell = m.editCell(run, i, j);
    assert.equal(cell, run.cells[i][j]); assert.equal(cell.i, i); assert.equal(cell.j, j);
    const declared = [];
    const add = (kind, a, b, extra) => declared.push({ kind, from: [a,b], previous: expected[a][b], operationCost: extra, cost: expected[a][b]+extra, optimal: expected[a][b]+extra===expected[i][j] });
    if (i && j) add(run.sourceSymbols[i-1]===run.targetSymbols[j-1]?'match':'substitute', i-1, j-1, run.sourceSymbols[i-1]===run.targetSymbols[j-1]?0:costs.substitute);
    if (i) add('delete', i-1, j, costs.delete);
    if (j) add('insert', i, j-1, costs.insert);
    assert.deepEqual(cell.candidates, declared);
    assert.equal(cell.chosen, declared.find(x=>x.optimal)?.kind ?? null);
  }
  const steps = run.alignment.map(x => ({op:x.kind,from:x.source,to:x.target}));
  assert.equal(certificateCost(source,target,steps,costs),run.distance);
  let i=0,j=0,cost=0,emitted='';
  assert.deepEqual(run.replay[0],{step:0,sourceUsed:0,targetPrefix:'',remainingSource:source,text:source,cost:0});
  assert.equal(run.replay.length,steps.length+1);
  for (let n=0;n<steps.length;n++) {
    const step=steps[n], op=run.alignment[n];
    assert.deepEqual(op.from,[i,j]);
    assert.equal(op.sourceIndex,step.from===null?null:i);
    assert.equal(op.targetIndex,step.to===null?null:j);
    if(step.from!==null)i++;
    if(step.to!==null){j++;emitted+=step.to;}
    const extra=step.op==='match'?0:costs[step.op];
    assert.equal(op.cost,extra);cost+=extra;assert.deepEqual(op.to,[i,j]);
    const remaining=run.sourceSymbols.slice(i).join('');
    assert.deepEqual(run.replay[n+1],{step:n+1,sourceUsed:i,targetPrefix:emitted,remainingSource:remaining,text:emitted+remaining,cost});
  }
  assert.equal(run.replay.at(-1).text,target);
  const exported=JSON.parse(m.serializeEditExperiment(run));
  assert.equal(exported.format,'recallweave-edit-distance-experiment/1');
  for(const key of ['input','sourceSymbols','targetSymbols','cells','distance','alignment','replay','tieRule']) assert.deepEqual(exported[key],run[key]);
  const before=m.serializeEditExperiment(run);
  input.source='changed';input.costs.insert=9;
  assert.equal(m.serializeEditExperiment(run),before);
  assert(Object.isFrozen(run)&&Object.isFrozen(run.cells[0])&&Object.isFrozen(run.input.costs));
  return run;
}
await group('exhaustive table, tie candidates, legal path, replay and literal export',()=>{
  let pairs=0,cells=0;
  for(const costs of fixedCorpus.costs)for(const source of fixedCorpus.strings)for(const target of fixedCorpus.strings){
    const table=expectedPrefixTable(source,target,costs);receiveRun(source,target,costs,table);pairs++;cells+=table.reduce((n,row)=>n+row.length,0);
  }
  for(const [source,target] of fixedCorpus.extraPairs)receiveRun(source,target,fixedCorpus.costs[0]);
  return {pairs,prefixCells:cells,extraPairs:fixedCorpus.extraPairs.length};
});
await group('scalar maximum, refused values and documented tie ordering',()=>{
  const unit=fixedCorpus.costs[0];
  for(const text of ['😀'.repeat(16),'a'.repeat(16),'\ufeff','\u2028',String.fromCodePoint(0x10ffff)]){
    const run=m.calculateEditDistance({source:text,target:'',costs:unit});
    assert.equal(run.distance,scalarUnits(text).length);assert.deepEqual(run.sourceSymbols,scalarUnits(text));
  }
  for(const [source,target] of fixedCorpus.tiePairs){
    const run=receiveRun(source,target,unit);
    assert.deepEqual(run,m.calculateEditDistance({source,target,costs:unit}));
  }
  const bad=[...fixedCorpus.invalidScalars,'a'.repeat(17),'😀'.repeat(17),'\u0000','a\tb','x\ny','\u007f',null,7,{},[]];
  for(const value of bad)for(const field of ['source','target'])assert.throws(()=>m.calculateEditDistance({source:'a',target:'b',costs:unit,[field]:value}));
  for(const value of [0,10,-1,1.5,NaN,Infinity,'1',null,undefined])for(const key of ['insert','delete','substitute'])assert.throws(()=>m.calculateEditDistance({source:'a',target:'b',costs:{...unit,[key]:value}}));
  const run=m.calculateEditDistance({source:'a',target:'b',costs:unit});
  for(const coords of [[-1,0],[2,0],[0,2],[0,0.5],['0',0],[NaN,0]])assert.throws(()=>m.editCell(run,...coords));
  assert.throws(()=>m.serializeEditExperiment({...run}));
  assert.throws(()=>m.editCell({...run},0,0));
  return {boundaryScalars:16,rejectedInputValues:bad.length*2,rejectedCostValues:27,forgedOrOutOfBoundsRefusals:8};
});
await group('blind course keys, native deck admission and unchanged first-answer practice semantics',async()=>{
  const source=await readFile(path.join(root,'courses/edit-distance.json'),'utf8');
  const deck=deckApi.parseDeck(source);
  const blind=JSON.parse(await readFile(new URL('./blind-course-prompts-v2.json',import.meta.url),'utf8'));
  const independent=[1,2,3,0,1,2,3,0,2,3,0,1];
  assert.equal(deck.items.length,12);
  assert.deepEqual(deck.items.map(x=>({id:x.id,prompt:x.prompt,options:[...x.options]})),blind.items);
  assert.deepEqual(deck.items.map(x=>x.answer),independent);
  const mastery=knowledge.initialMastery(deck.concepts),asked=new Set(),answers=[];
  let missed=null;
  while(answers.length<deck.items.length){
    const item=knowledge.selectNextItem(deck.items,asked,mastery);
    assert(item&&!asked.has(item.id));asked.add(item.id);
    const choice=answers.length===0?(item.answer+1)%item.options.length:item.answer;
    if(answers.length===0)missed=item.id;
    const correct=choice===item.answer;
    mastery[item.concept]=knowledge.updateMastery(mastery[item.concept],correct);
    answers.push({item:item.id,choice,correct});
  }
  assert.equal(knowledge.selectNextItem(deck.items,asked,mastery),null);
  const review=reviewApi.createReview(deck.items,answers),before=JSON.stringify(review);
  let practice=reviewApi.beginPractice(review);
  assert.deepEqual(practice.items.map(x=>x.id),[missed]);
  const item=reviewApi.currentPracticeItem(practice);
  practice=reviewApi.answerPractice(practice,item.id,item.answer);
  assert.equal(reviewApi.currentPracticeItem(practice),null);assert.equal(practice.answers[0].correct,true);
  assert.equal(JSON.stringify(review),before);assert.equal(review[0].correct,false);
  assert.deepEqual(deckApi.parseDeck(deckApi.serializeDeck(deck)),deck);
  return {questions:12,allBlindKeysMatch:true,firstMissPreservedAfterPractice:true,canonicalOptionIdentity:true};
});
report.finished=new Date().toISOString();report.passed=report.groups.every(x=>x.passed);
await writeFile(out,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));process.exitCode=report.passed?0:1;
