import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const [source,previous,download,output]=process.argv.slice(2);
if(!output)throw new Error('source previous actual-download output required');
const mod=(root,name)=>import(pathToFileURL(resolve(root,'src',name)).href);
const [D,K,R,L,T,N,F,oldK,oldL]=await Promise.all([
 mod(source,'deck.mjs'),mod(source,'knowledge.mjs'),mod(source,'review.mjs'),mod(source,'lesson-archive.mjs'),
 mod(source,'trace-archive.mjs'),mod(source,'session-export.mjs'),mod(source,'reflections.mjs'),
 mod(previous,'knowledge.mjs'),mod(previous,'lesson-archive.mjs')
]);
const raw=await readFile(download),currentBytes=await readFile(resolve(source,'courses/edit-distance.json'));
assert.equal(createHash('sha256').update(raw).digest('hex'),'753499d3f6909d46d7628a5cabd85f2f5d2f94e9719d58313cbf13d73374df99');
assert.deepEqual(raw,currentBytes);
const deck=D.parseDeck(raw.toString()),savedAt='2026-10-08T19:00:00.000Z';
const orders=Object.fromEntries(deck.items.map(item=>[item.id,item.options.map((_,i)=>i).reverse()]));
const groups=[],states=[];
async function group(name,fn){try{await fn();groups.push({name,pass:true});}catch(error){groups.push({name,pass:false,error:String(error.stack||error)});}}
function schedule(knowledge){
 const mastery=knowledge.initialMastery(deck.concepts),asked=new Set(),answers=[];
 while(asked.size<deck.items.length){
  const item=knowledge.selectNextItem(deck.items,asked,mastery);assert.ok(item);
  const choice=answers.length%4===0?(item.answer+1)%item.options.length:item.answer;
  const answer={item:item.id,concept:item.concept,choice,correct:choice===item.answer};
  answers.push(answer);asked.add(item.id);mastery[item.concept]=knowledge.updateMastery(mastery[item.concept],answer.correct);
 }
 return{answers,mastery};
}
let completed,replayIdentities;
await group('genuine downloaded course keeps current default scheduling and exact first answers',()=>{
 assert.equal(deck.items.length,12);assert.equal(new Set(deck.items.map(item=>item.id)).size,12);
 completed=schedule(K);assert.deepEqual(completed,schedule(oldK));
 assert.equal(completed.answers.filter(x=>x.correct).length,9);
});
await group('all incomplete prefixes retain exact current question and feedback archive state',()=>{
 assert.ok(completed);const mastery=K.initialMastery(deck.concepts),asked=new Set(),answers=[];
 for(let count=0;count<12;count++){
  const next=K.selectNextItem(deck.items,asked,mastery);
  const presentations=[{phase:'question',itemId:next.id,optionOrders:orders}];
  if(count)presentations.push({phase:'feedback',itemId:answers.at(-1).item,optionOrders:orders});
  for(const presentation of presentations){
   const input={deck,answers,mastery,presentation,savedAt};
   const original=JSON.stringify(input);
   const file=L.createLessonArchive(input),restored=L.readLessonArchive(file.text,deck);
   assert.deepEqual(restored.answers,answers);assert.deepEqual(restored.mastery,mastery);
   assert.deepEqual(restored.presentation,presentation);assert.equal(restored.summary.answered,count);
   assert.equal(file.text,oldL.createLessonArchive(input).text);
   assert.deepEqual(restored,oldL.readLessonArchive(file.text,deck));
   assert.equal(JSON.stringify(input),original);
   states.push({count,phase:presentation.phase,item:presentation.itemId,sha256:createHash('sha256').update(file.text).digest('hex')});
  }
  const answer=completed.answers[count];assert.equal(answer.item,next.id);
  answers.push({...answer});asked.add(answer.item);mastery[answer.concept]=K.updateMastery(mastery[answer.concept],answer.correct);
 }
 assert.equal(states.length,23);
});
await group('current exact-maximum replay preserves a legitimate alternate actual-course question',()=>{
 const mastery=K.initialMastery(deck.concepts),asked=new Set(),ordinary=K.selectNextItem(deck.items,asked,mastery);
 const alternatives=deck.items.filter(item=>item.id!==ordinary.id&&K.selectNextItem(deck.items,asked,mastery,K.DEFAULT_BKT,item.id).id===item.id);
 assert.ok(alternatives.length>0,'the actual authored course exposes an admitted exact-score alternative');
 const chosen=alternatives[0],input={deck,answers:[],mastery,presentation:{phase:'question',itemId:chosen.id,optionOrders:orders},savedAt};
 assert.throws(()=>oldL.createLessonArchive(input),/presentation/);
 const file=L.createLessonArchive(input),restored=L.readLessonArchive(file.text,deck);
 assert.equal(restored.presentation.itemId,chosen.id);assert.equal(restored.nextItemId,chosen.id);
 assert.equal(K.selectNextItem(deck.items,asked,mastery).id,ordinary.id);
 const inferior=deck.items.find(item=>K.selectNextItem(deck.items,asked,mastery,K.DEFAULT_BKT,item.id).id!==item.id);
 assert.ok(inferior);const tampered=JSON.parse(file.text);tampered.presentation.itemId=inferior.id;
 assert.throws(()=>L.readLessonArchive(JSON.stringify(tampered),deck),/presentation/);
 replayIdentities={ordinary:ordinary.id,admitted:chosen.id,refused:inferior.id};
});
await group('complete trace and separate practice round-trip preserve original estimates and notes',()=>{
 assert.ok(completed);const review=R.createReview(deck.items,completed.answers);
 const before=JSON.stringify({completed,review});let practice=R.beginPractice(review);
 while(R.currentPracticeItem(practice)){const item=R.currentPracticeItem(practice);practice=R.answerPractice(practice,item.id,item.answer);}
 assert.equal(practice.answers.length,3);assert.ok(practice.answers.every(answer=>answer.correct));
 const file=T.createTraceArchive({deck,...completed,practice,savedAt}),restored=T.readTraceArchive(file.text,deck);
 assert.deepEqual(restored.answers,completed.answers);assert.deepEqual(restored.mastery,completed.mastery);
 assert.deepEqual(restored.review,review);assert.deepEqual(restored.practice,practice);
 assert.equal(restored.summary.correctFirst,9);assert.equal(restored.summary.practiceAnswers,3);
 let reflections=F.createReflections(deck.items);
 reflections=F.updateReflection(reflections,deck.items[0].id,'Literal scalars: é and e\u0301 remain different.');
 const notes=N.createStudyNotes({deck,review,mastery:completed.mastery,practice,reflections,exportedAt:savedAt});
 assert.match(notes.text,/9 of 12 connections correct on the first try/);
 assert.match(notes.text,/3 of 3 practice answers recorded; 3 correct on retry/);
 assert.match(notes.text,/Literal scalars: é and e\u0301 remain different/);
 const tampered=JSON.parse(file.text);tampered.mastery[deck.concepts[0]]+=0.001;
 assert.throws(()=>T.readTraceArchive(JSON.stringify(tampered),deck),/model estimates/);
 assert.throws(()=>T.readTraceArchive(file.text,{...deck,title:deck.title+' changed'}),/different course/);
 assert.equal(JSON.stringify({completed,review}),before);
});
const result={schema:'recallweave.current-learner-integration/1',source,previous,download,
 downloadedSha256:createHash('sha256').update(raw).digest('hex'),sourceParent:'698902f9c9c1d5c5023092b85b3632a7cb7a01ed',
 authoredProductTree:'c80febfe92c5b8613766ba9124a9d17ea05f52fe',node:process.version,
 groups,replayIdentities,archiveStates:states,passed:groups.filter(x=>x.pass===true).length,failed:groups.filter(x=>x.pass===false).length,
 boundary:'Native APIs with genuine previously downloaded course bytes; no current-parent browser or public-delivery claim.'};
await writeFile(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
if(result.failed)process.exitCode=1;
