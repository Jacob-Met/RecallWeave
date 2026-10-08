import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const input=JSON.parse(process.argv[1]);
const pins={};
async function nativeModule(path) {
  const file=input.modules[path];
  const bytes=Buffer.from(file.content,'utf8');
  const blob=createHash('sha1').update('blob '+bytes.length).update(Buffer.from([0])).update(bytes).digest('hex');
  assert.equal(blob,file.git_blob,path+' source changed');
  pins[path]={git_blob:blob,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length};
  return import('data:text/javascript;base64,'+bytes.toString('base64'));
}
const deckModule=await nativeModule('src/deck.mjs');
const reviewModule=await nativeModule('src/review.mjs');
const knowledge=await nativeModule('src/knowledge.mjs');
const orderModule=await nativeModule('src/answer-order.mjs');
const deck=deckModule.parseDeck(input.deck_json);
assert.deepEqual(Object.keys(input.answer_key).sort(),deck.items.map(item=>item.id).sort());
const questions=new Map(input.blind_sheet.map(q=>[q.id,q]));
for(const item of deck.items) {
  const question=questions.get(item.id);
  assert.ok(question,'Missing blind question '+item.id);
  assert.equal(item.prompt,question.prompt,'Question changed after blind review');
  assert.deepEqual(item.options,question.options,'Options changed after blind review');
  const accepted=input.answer_key[item.id];
  assert.equal(item.answer,accepted.index,'Author key differs from independent answer '+item.id);
  assert.equal(item.options[item.answer],accepted.text);
}
const original=JSON.stringify(deck);
assert.deepEqual(deckModule.parseDeck(deckModule.serializeDeck(deck)),deck);
const asked=new Set();
const answers=[];
const displayReceipts=[];
const mastery=knowledge.initialMastery(deck.concepts);
let randomState=0x3dcb83a1;
const random=()=>{randomState=(Math.imul(randomState,1664525)+1013904223)>>>0;return randomState/4294967296;};
while(asked.size<deck.items.length) {
  const item=knowledge.selectNextItem(deck.items,asked,mastery);
  assert.ok(item&&!asked.has(item.id));
  const order=orderModule.orderOptions(item.options.length,random);
  assert.deepEqual([...order].sort((a,b)=>a-b),item.options.map((_,index)=>index));
  const deliberatelyMiss=answers.length%3===1;
  const intended=deliberatelyMiss?(input.answer_key[item.id].index+1)%item.options.length:input.answer_key[item.id].index;
  const displayIndex=order.indexOf(intended);
  const canonicalChoice=order[displayIndex];
  const correct=canonicalChoice===input.answer_key[item.id].index;
  answers.push({item:item.id,choice:canonicalChoice});
  displayReceipts.push({id:item.id,displayOrder:order,displayIndex,canonicalChoice,expectedCorrect:!deliberatelyMiss});
  assert.equal(correct,!deliberatelyMiss);
  mastery[item.concept]=knowledge.updateMastery(mastery[item.concept],correct);
  assert.ok(Number.isFinite(mastery[item.concept])&&mastery[item.concept]>=0&&mastery[item.concept]<=1);
  asked.add(item.id);
}
assert.equal(knowledge.selectNextItem(deck.items,asked,mastery),null);
const review=reviewModule.createReview(deck.items,answers);
assert.deepEqual(review.map(item=>item.id),answers.map(answer=>answer.item));
for(let i=0;i<review.length;i++) {
  assert.equal(review[i].correct,displayReceipts[i].expectedCorrect);
  assert.equal(review[i].answer,input.answer_key[review[i].id].index);
  assert.equal(review[i].explanation,deck.items.find(x=>x.id===review[i].id).explanation);
}
const originalReview=JSON.stringify(review),originalMastery=JSON.stringify(mastery);
let practice=reviewModule.beginPractice(review);
const expectedMissed=review.filter(item=>!item.correct).map(item=>item.id);
assert.deepEqual(practice.items.map(item=>item.id),expectedMissed);
for(const id of expectedMissed) {
  const previous=practice;
  const previousCount=previous.answers.length;
  assert.equal(reviewModule.currentPracticeItem(practice).id,id);
  practice=reviewModule.answerPractice(practice,id,input.answer_key[id].index);
  assert.equal(previous.answers.length,previousCount);
}
assert.equal(reviewModule.currentPracticeItem(practice),null);
assert.equal(practice.answers.length,expectedMissed.length);
assert.ok(practice.answers.every(answer=>answer.correct));
assert.equal(JSON.stringify(deck),original);
assert.equal(JSON.stringify(review),originalReview);
assert.equal(JSON.stringify(mastery),originalMastery);
console.log(JSON.stringify({
  decision:'accepted for the pinned deck, selector, option identity and review/practice contracts',
  sourcePins:pins,
  questions:deck.items.length,
  independentlySolvedKeys:deck.items.length,
  firstAnswers:answers,
  displayedOptionReceipts:displayReceipts,
  firstCorrect:review.filter(item=>item.correct).length,
  initialMissed:expectedMissed,
  practiceCorrect:practice.answers.length,
  noRepeatedSelection:true,
  completeCanonicalReview:true,
  originalDeckReviewAndMasteryRetained:true,
  sourceDelivery:'Exact pinned modules evaluated in native Node from in-memory data URLs',
  nativeFileWrites:0,
  browserExecution:false,
  importedCourseUIClaim:false
},null,2));
