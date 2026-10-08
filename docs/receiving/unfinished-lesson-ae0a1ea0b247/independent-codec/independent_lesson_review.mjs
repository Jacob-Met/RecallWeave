/** Independent native unfinished-lesson receiving; synthetic admitted prerequisite course only. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL, fileURLToPath } from 'node:url';
const SOURCE = process.env.RECALLWEAVE_LESSON_SOURCE || '/dev/shm/ae0a1ea0b247-recallweave-lesson';
const ADMISSION = process.env.RECALLWEAVE_ADMISSION_SOURCE || '/dev/shm/ae0a1ea0b247-recallweave-receiving/src/deck.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const blob = bytes => crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
const sha256 = text => crypto.createHash('sha256').update(text).digest('hex');
const pins = {'src/lesson-archive.mjs':'b55fc0dd514c105c69fdef4dd766c5dfc4cc2a84',
  'src/knowledge.mjs':'1a3a714dc0cf643b911ec196265746fb61c1f5cc'};
for (const [name, expected] of Object.entries(pins)) assert.equal(blob(fs.readFileSync(path.join(SOURCE,name))),expected,name);
assert.equal(blob(fs.readFileSync(ADMISSION)),'f0f8a4b234489c2388f427633f548d56c6ed4c03');
const {createLessonArchive,readLessonArchive,LESSON_ARCHIVE_MAX_BYTES}=await import(pathToFileURL(path.join(SOURCE,'src/lesson-archive.mjs')));
const {DEFAULT_BKT,initialMastery,selectNextItem,updateMastery}=await import(pathToFileURL(path.join(SOURCE,'src/knowledge.mjs')));
const {validateDeck}=await import(pathToFileURL(ADMISSION));
const clone=structuredClone;
const savedAt='2026-10-08T12:00:00.000Z';
const rows=[
  ['Ω','toString',['constructor','hasOwnProperty'],6,4],
  ['z','__proto__',[],3,2],
  ['constructor','constructor',['__proto__'],5,3],
  ['2','hasOwnProperty',['__proto__'],4,1],
  ['__proto__','__proto__',[],2,0],
  ['01','toString',['constructor','hasOwnProperty'],3,1],
  ['10','constructor',['__proto__'],2,1],
  ['toString','hasOwnProperty',['__proto__'],6,5],
  ['00','__proto__',[],4,2]
];
const rawDeck={title:'Synthetic transfer lattice — review only',attribution:'Independent synthetic fixture',license:'CC0',
  concepts:['__proto__','constructor','hasOwnProperty','toString'],
  items:rows.map(([id,concept,prerequisites,n,answer])=>({id,concept,prerequisites,
    prompt:'Choose the canonical option for '+id+' (synthetic).',
    options:Array.from({length:n},(_,i)=>'Choice '+i+' — '+id),answer,
    explanation:'Synthetic explanation for '+id,transfer:'Synthetic transfer <literal> & evidence '+id}))};
const deck=validateDeck(rawDeck);
const beforeSource=JSON.stringify(deck);
const prototypeBefore=Reflect.ownKeys(Object.prototype);
const orders=Object.fromEntries([...deck.items].reverse().map((item,i)=>[item.id,
  item.options.map((_,j)=>(j+i+1)%item.options.length).reverse()]));
const clicks=[1,0,3,1,4,2,0,1,3];
const choose=(item,index)=>orders[item.id][clicks[index]%item.options.length];
function initial(){return{answers:[],mastery:initialMastery(deck.concepts)}}
function step(state,parameters=DEFAULT_BKT){
  const item=selectNextItem(deck.items,new Set(state.answers.map(a=>a.item)),state.mastery);
  if(!item)return null;
  const choice=choose(item,state.answers.length), correct=choice===item.answer;
  state.answers.push({item:item.id,concept:item.concept,choice,correct});
  state.mastery[item.concept]=updateMastery(state.mastery[item.concept],correct,parameters);
  return item;
}
const complete=initial(),prefixes=[];
while(complete.answers.length<deck.items.length){prefixes.push(clone(complete));step(complete);}
const current=state=>selectNextItem(deck.items,new Set(state.answers.map(a=>a.item)),state.mastery);
function input(index,phase='question',identity=deck){const state=clone(prefixes[index]);return{deck:identity,...state,savedAt,
  presentation:{phase,itemId:phase==='question'?current(state).id:state.answers.at(-1)?.item,optionOrders:clone(orders)}};}
const reorder=value=>Array.isArray(value)?value.map(reorder):value&&typeof value==='object'
  ?Object.fromEntries(Object.entries(value).reverse().map(([k,v])=>[k,reorder(v)])):value;
const details={},checks=[];
function check(name,fn){try{details[name]=fn();checks.push({name,pass:true});}catch(error){checks.push({name,pass:false,error:String(error.stack)});}}
function refusal(document,pattern=/./,identity=deck){const raw=JSON.stringify(document),original=sha256(JSON.stringify(deck));
  assert.throws(()=>readLessonArchive(raw,identity),pattern);
  assert.equal(JSON.stringify(document),raw);assert.equal(sha256(JSON.stringify(deck)),original);}

check('One admitted prerequisite course survives every unfinished native prefix in question and feedback phases',()=>{
  const observations=[];
  assert.notDeepEqual(complete.answers.map(a=>a.item),deck.items.map(i=>i.id));
  assert.ok(complete.answers.some(a=>a.correct)&&complete.answers.some(a=>!a.correct));
  for(let index=0;index<prefixes.length;index++) for(const phase of index?['question','feedback']:['question']){
    const state=input(index,phase),before=clone(state);
    const archive=createLessonArchive(state);
    // Deliberately reverse JSON property insertion order, retaining array order.
    const restored=readLessonArchive(JSON.stringify(reorder(JSON.parse(archive.text))),deck);
    assert.deepEqual(restored.answers,state.answers);assert.deepEqual(restored.mastery,state.mastery);
    assert.deepEqual(restored.presentation,state.presentation);
    assert.equal(restored.nextItemId,current(state).id);
    assert.equal(restored.summary.answered,index);assert.equal(restored.summary.remaining,deck.items.length-index);
    const resumed={answers:clone(restored.answers),mastery:clone(restored.mastery)};
    while(resumed.answers.length<deck.items.length)step(resumed);
    assert.deepEqual(resumed,complete);assert.deepEqual(state,before);
    // Canonical choice and shown letter retain their relationship after JSON key sorting.
    for(const answer of restored.answers){
      assert.equal(restored.presentation.optionOrders[answer.item].indexOf(answer.choice),
        orders[answer.item].indexOf(answer.choice));
    }
    if(phase==='feedback')assert.notEqual(restored.presentation.itemId,restored.nextItemId);
    observations.push({answered:index,phase,shown:restored.presentation.itemId,next:restored.nextItemId,
      exactMastery:restored.mastery,bytes:Buffer.byteLength(archive.text)});
  }
  return {restores:observations.length,nativeOrder:complete.answers,completeMastery:complete.mastery,observations};
});

check('Answer-dependent path and exact source/model binding cannot be replaced by internally consistent alternatives',()=>{
  const original=JSON.parse(createLessonArchive(input(5)).text);
  const alternateModel=clone(original);alternateModel.model.parameters.learn=0.27;
  const changedMastery=initialMastery(deck.concepts);
  for(const answer of alternateModel.firstAnswers){const item=deck.items.find(i=>i.id===answer.item);
    changedMastery[item.concept]=updateMastery(changedMastery[item.concept],answer.choice===item.answer,alternateModel.model.parameters);}
  alternateModel.mastery=changedMastery;refusal(alternateModel,/different learning model/);
  const alternateSource=clone(original),target=alternateSource.deck.items[0];
  [target.options[0],target.options[1]]=[target.options[1],target.options[0]];
  if(target.answer<2)target.answer=1-target.answer;
  refusal(alternateSource,/different course/);
  const reorderedPrefix=clone(original);
  [reorderedPrefix.firstAnswers[0],reorderedPrefix.firstAnswers[1]]=[reorderedPrefix.firstAnswers[1],reorderedPrefix.firstAnswers[0]];
  // Even a freshly recomputed mastery cannot excuse the wrong selected prefix.
  reorderedPrefix.mastery=initialMastery(deck.concepts);
  for(const answer of reorderedPrefix.firstAnswers){const item=deck.items.find(i=>i.id===answer.item);
    reorderedPrefix.mastery[item.concept]=updateMastery(reorderedPrefix.mastery[item.concept],answer.choice===item.answer);}
  refusal(reorderedPrefix,/question order/);
  const wrongCursor=clone(original);wrongCursor.presentation.itemId=original.firstAnswers[0].item;
  refusal(wrongCursor,/presentation/);
  return {alternativeModelMastery:changedMastery,rejected:['coherent alternate model','semantically rearranged source options','recomputed nonadaptive prefix','answered question cursor']};
});

check('Bundled raw and admitted normalized identities are deliberately distinct and must match the callers active identity',()=>{
  const rawInput=input(3,'feedback',rawDeck),archive=createLessonArchive(rawInput);
  const own=readLessonArchive(archive.text,rawDeck);
  assert.deepEqual(own.answers,rawInput.answers);assert.deepEqual(own.mastery,rawInput.mastery);
  assert.throws(()=>readLessonArchive(archive.text,deck),/different course/);
  assert.throws(()=>readLessonArchive(createLessonArchive(input(3,'feedback')).text,rawDeck),/different course/);
  return {rawHasFormat:Object.hasOwn(rawDeck,'format'),admittedFormat:deck.format,callerContract:'Pass the active archive identity; do not normalize it during restore.'};
});

check('Prototype-named and integer-like identifiers retain own values and complete serialized option permutations',()=>{
  const restored=readLessonArchive(createLessonArchive(input(4)).text,deck);
  for(const concept of deck.concepts)assert.ok(Object.hasOwn(restored.mastery,concept));
  for(const item of deck.items){assert.ok(Object.hasOwn(restored.presentation.optionOrders,item.id));
    assert.deepEqual([...restored.presentation.optionOrders[item.id]].sort((a,b)=>a-b),item.options.map((_,i)=>i));}
  assert.deepEqual(Reflect.ownKeys(Object.prototype),prototypeBefore);
  const invalid=JSON.parse(createLessonArchive(input(4)).text);
  invalid.presentation.optionOrders['__proto__']=[0,0];refusal(invalid,/answer display order/);
  Object.defineProperty(invalid,'__proto__',{enumerable:true,value:{unexpected:'synthetic'}});
  refusal(invalid,/format/);
  assert.deepEqual(Reflect.ownKeys(Object.prototype),prototypeBefore);
  assert.equal(Object.getPrototypeOf(restored.mastery),Object.prototype);
  assert.equal(Object.getPrototypeOf(restored.presentation.optionOrders),Object.prototype);
  return {conceptOwnKeys:Object.keys(restored.mastery),serializedOrderKeys:Object.keys(restored.presentation.optionOrders)};
});

check('Started-empty state, incomplete feedback, and completed boundary retain distinct meanings',()=>{
  const empty=readLessonArchive(createLessonArchive(input(0)).text,deck);
  assert.deepEqual(empty.answers,[]);assert.equal(empty.presentation.itemId,complete.answers[0].item);
  assert.deepEqual(empty.mastery,initialMastery(deck.concepts));
  const last=readLessonArchive(createLessonArchive(input(8,'feedback')).text,deck);
  assert.equal(last.summary.remaining,1);assert.equal(last.presentation.itemId,complete.answers[7].item);
  assert.equal(last.nextItemId,complete.answers[8].item);
  const done={deck,...clone(complete),savedAt,presentation:{phase:'feedback',itemId:complete.answers.at(-1).item,optionOrders:clone(orders)}};
  const before=clone(done);assert.throws(()=>createLessonArchive(done),/complete/);assert.deepEqual(done,before);
  return {emptyNext:empty.nextItemId,lastFeedback:last.presentation.itemId,lastUnanswered:last.nextItemId};
});

check('UTF-8 size and source-depth refusals stay bounded and leave source and earlier successful values unchanged',()=>{
  const archive=createLessonArchive(input(2)),retained=readLessonArchive(archive.text,deck),before=clone(retained);
  const almost=archive.text+' '.repeat(LESSON_ARCHIVE_MAX_BYTES-Buffer.byteLength(archive.text)-1);
  assert.equal(readLessonArchive(almost,deck).summary.answered,2);
  // Adding a two-byte code point crosses the byte boundary while the UTF-16
  // string length remains under the maximum; size refusal precedes parsing.
  assert.ok((almost+'é').length<=LESSON_ARCHIVE_MAX_BYTES);
  assert.throws(()=>readLessonArchive(almost+'é',deck),/no larger than 2 MiB/);
  const nested=JSON.parse(archive.text);let child={leaf:'synthetic'};
  for(let i=0;i<20;i++)child={child};nested.model.parameters=child;
  refusal(nested,/invalid course or model data/);
  assert.deepEqual(retained,before);assert.equal(JSON.stringify(deck),beforeSource);
  assert.throws(()=>{retained.presentation.optionOrders['__proto__'][0]=99;},TypeError);
  assert.throws(()=>{retained.mastery.constructor=0;},TypeError);
  return {byteCap:LESSON_ARCHIVE_MAX_BYTES,acceptedBytes:Buffer.byteLength(almost),refusedBytes:Buffer.byteLength(almost+'é')};
});

for(const [name,expected]of Object.entries(pins))assert.equal(blob(fs.readFileSync(path.join(SOURCE,name))),expected);
const receipt={candidateCommit:'36acc3e400ab41130231e040eacb2fb93b9f0f77',pins,
  admissionBlob:'f0f8a4b234489c2388f427633f548d56c6ed4c03',node:process.version,
  evidence:'Independent native synthetic prerequisite deck; no browser, model provider, real learner data or source mutation.',
  deck:rawDeck,optionOrders:orders,displayedChoicePositions:clicks,checks,details,
  result:checks.every(c=>c.pass)?'PASS':'FAIL'};
fs.writeFileSync(path.join(HERE,'independent-lesson-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({result:receipt.result,groups:checks.length,checks,fixtureHash:sha256(JSON.stringify(rawDeck)),receipt:path.join(HERE,'independent-lesson-receipt.json')},null,2));
if(receipt.result!=='PASS')process.exitCode=1;
