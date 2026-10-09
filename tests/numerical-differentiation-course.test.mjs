import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseDeck,serializeDeck} from '../src/deck.mjs';
import {initialMastery,selectNextItem,updateMastery} from '../src/knowledge.mjs';
import {createReview,beginPractice,answerPractice,currentPracticeItem} from '../src/review.mjs';
import {createStudyNotes} from '../src/session-export.mjs';
const text=await readFile(new URL('../courses/numerical-differentiation.json',import.meta.url),'utf8');
const deck=parseDeck(text);
test('original twelve-question course admits and round-trips through unchanged deck validator',()=>{
 assert.equal(deck.items.length,12);assert.equal(deck.concepts.length,4);
 assert.deepEqual(parseDeck(serializeDeck(deck)),deck);
 assert.ok(deck.items.every(x=>x.explanation.length>60&&x.transfer.length>30));
});
test('actual adaptive learner consumes all12 once, preserves first answers through6 retries and notes',()=>{
 const mastery=initialMastery(deck.concepts),asked=new Set(),answers=[];
 let item;while((item=selectNextItem(deck.items,asked,mastery))){
  const choice=asked.size%2?item.answer:(item.answer+1)%item.options.length;
  asked.add(item.id);answers.push({item:item.id,concept:item.concept,choice,correct:choice===item.answer});
  mastery[item.concept]=updateMastery(mastery[item.concept],choice===item.answer);
 }
 assert.equal(asked.size,12);
 const review=createReview(deck.items,answers),before=JSON.stringify(review);let practice=beginPractice(review);
 assert.equal(review.filter(x=>!x.correct).length,6);
 while((item=currentPracticeItem(practice)))practice=answerPractice(practice,item.id,item.answer);
 assert.equal(practice.answers.length,6);assert.equal(JSON.stringify(review),before);
 const notes=createStudyNotes({deck,review,mastery,practice,exportedAt:new Date('2026-10-09T06:00:00Z')});
 assert.ok(notes.text.includes(deck.title));
 for(const q of deck.items){assert.ok(notes.text.includes(q.explanation));assert.ok(notes.text.includes(q.transfer));}
});
test('standalone page embeds exact original deck and guide text with local model only',async()=>{
 const html=await readFile(new URL('../courses/numerical-differentiation-lab.html',import.meta.url),'utf8');
 const guide=await readFile(new URL('../courses/numerical-differentiation.md',import.meta.url),'utf8');
 for(const [name,value]of [['courseText',text],['guideText',guide]]){
  const line=html.split('\n').find(x=>x.startsWith('const '+name+' = '));
  assert.equal(JSON.parse(line.slice(('const '+name+' = ').length,-1)),value);
 }
 assert.ok(!/<script[^>]+src=/i.test(html));assert.ok(!/fetch\(/.test(html));
});
