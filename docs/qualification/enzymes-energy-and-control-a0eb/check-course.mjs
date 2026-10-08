import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const project=path.resolve(here,'../../..');
const receiving=process.env.RECALLWEAVE_RECEIVING_ROOT||project;
const course=process.env.RECALLWEAVE_COURSE_FILE||path.join(project,'courses/enzymes-energy-and-control.json');
const get=name=>import(pathToFileURL(path.join(receiving,'src',name)).href);
const {parseDeck,serializeDeck}=await get('deck.mjs');
const {initialMastery,updateMastery,selectNextItem}=await get('knowledge.mjs');
const {createReview,beginPractice,currentPracticeItem,answerPractice}=await get('review.mjs');
const {createStudyNotes}=await get('session-export.mjs');
const {createTraceArchive,readTraceArchive}=await get('trace-archive.mjs');
const {draftFromDeck,checkDraft}=await get('deck-author.mjs');
const bytes=fs.readFileSync(course);
const raw=JSON.parse(bytes);
const deck=parseDeck(bytes.toString('utf8'));
const byId=new Map(deck.items.map(item=>[item.id,item]));
const textNumbers=string=>[...string.replaceAll('−','-').matchAll(/[+-]?\d+(?:\.\d+)?/g)].map(x=>Number(x[0]));
test('literal course is admitted by the current shared native deck contract',()=>{
 assert.deepEqual(deck,raw);
 assert.equal(deck.items.length,12);
 assert.equal(deck.concepts.length,4);
 assert.ok(bytes.length<262144);
 assert.equal(new Set(deck.items.map(x=>x.id)).size,12);
 assert.deepEqual([0,1,2,3].map(n=>deck.items.filter(x=>x.answer===n).length),[3,3,3,3]);
 assert.equal(deck.items.filter(x=>x.options[x.answer].length>Math.max(...x.options.filter((_,i)=>i!==x.answer).map(s=>s.length))).length,2);
 assert.equal(deck.items.filter(x=>x.prerequisites.length===0).length,3);
 assert.deepEqual(parseDeck(serializeDeck(deck)),deck);
});
test('quantitative answers and illustrative saturation data match their stated model',()=>{
 const energy=byId.get('enz-energy-2');
 assert.deepEqual(textNumbers(energy.options[energy.answer]),[8-20,68-20]);
 const catalyst=byId.get('enz-catalysis-1');
 assert.deepEqual(textNumbers(catalyst.options[catalyst.answer]),[29-5,-3-5]);
 const saturationData=byId.get('enz-binding-2');
 const concentrations=[1,4,16];
 const rates=concentrations.map(s=>Math.round(10*(10*s/(1+s)))/10);
 assert.deepEqual(textNumbers(saturationData.prompt),[...concentrations,...rates]);
 const saturation=byId.get('enz-binding-3');
 assert.deepEqual(textNumbers(saturation.options[saturation.answer]),[10*(0.20/0.10)]);
});
test('current author draft conversion preserves every question, choice identity and explanation',()=>{
 const draft=draftFromDeck(deck),checked=checkDraft(draft);
 assert.equal(checked.ok,true);
 assert.deepEqual(checked.deck,deck);
 assert.deepEqual(parseDeck(checked.json),deck);
 assert.ok(checked.json.includes('ΔG'));
 assert.ok(checked.json.includes('μmol/L'));
});
for(const pattern of ['all-correct','all-missed','mixed']){
 test('actual adaptive/model/review/practice/notes/archive flow: '+pattern,()=>{
  const asked=new Set(),mastery=initialMastery(deck.concepts),answers=[];
  while(asked.size<deck.items.length){
   const item=selectNextItem(deck.items,asked,mastery);
   assert.ok(item&&!asked.has(item.id));
   const correct=pattern==='all-correct'||(pattern==='mixed'&&answers.length%2===0);
   const choice=correct?item.answer:(item.answer+1)%item.options.length;
   asked.add(item.id);mastery[item.concept]=updateMastery(mastery[item.concept],correct);
   answers.push({item:item.id,concept:item.concept,choice,correct});
  }
  assert.equal(selectNextItem(deck.items,asked,mastery),null);
  const review=createReview(deck.items,answers);
  const first=JSON.stringify({answers,mastery,review});
  let practice=beginPractice(review);
  const missed=review.filter(x=>!x.correct).map(x=>x.id);
  assert.deepEqual(practice.items.map(x=>x.id),missed);
  for(const id of missed){
   const next=currentPracticeItem(practice);assert.equal(next.id,id);
   practice=answerPractice(practice,id,next.answer);
  }
  assert.equal(currentPracticeItem(practice),null);
  assert.equal(JSON.stringify({answers,mastery,review}),first);
  const notes=createStudyNotes({deck,review,mastery,practice,exportedAt:'2026-10-08T12:00:00.000Z'});
  for(const item of deck.items){
   assert.ok(notes.text.includes(item.prompt));
   assert.ok(notes.text.includes('Correct answer: '+item.options[item.answer]));
   assert.ok(notes.text.includes(item.explanation));
   assert.ok(notes.text.includes(item.transfer));
  }
  assert.ok(notes.text.includes('MODEL STATE, NOT A GRADE'));
  assert.ok(notes.text.includes(deck.attribution));
  const archive=createTraceArchive({deck,answers,mastery,practice,savedAt:'2026-10-08T12:00:00.000Z'});
  const restored=readTraceArchive(archive.text,deck);
  assert.deepEqual(restored.answers,answers);
  assert.deepEqual(restored.mastery,mastery);
  assert.deepEqual(restored.review,review);
  assert.deepEqual(restored.practice,practice);
  const changed=structuredClone(deck);changed.items[0].explanation+=' Revised.';
  assert.throws(()=>readTraceArchive(archive.text,changed),/different course/);
 });
}
