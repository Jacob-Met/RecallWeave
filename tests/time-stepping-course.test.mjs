import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseDeck,serializeDeck} from '../src/deck.mjs';
import {initialMastery,selectNextItem,updateMastery} from '../src/knowledge.mjs';
import {createReview,beginPractice,currentPracticeItem,answerPractice} from '../src/review.mjs';
import {createReflections,updateReflection,updateApplicationReflection} from '../src/reflections.mjs';
import {createStudyNotes} from '../src/session-export.mjs';

const raw = await readFile(new URL('../courses/time-stepping.json',import.meta.url),'utf8');
const deck = parseDeck(raw);
const missedId = 'step-boundary';
const applicationPrompt = 'Explain why a decaying numerical sequence need not be accurate.';
const frozenAnswers = [1,3,0,2,3,1,0,2,1,3,2,0,1,3,2,0];

function session() {
  const mastery = initialMastery(deck.concepts), asked = new Set(), answers = [];
  while (asked.size < deck.items.length) {
    const item = selectNextItem(deck.items,asked,mastery);
    assert.ok(item && !asked.has(item.id));
    const choice = item.id===missedId ? 1 : item.answer;
    const correct = choice===item.answer;
    answers.push({item:item.id,concept:item.concept,choice,correct});
    asked.add(item.id);
    mastery[item.concept] = updateMastery(mastery[item.concept],correct);
  }
  assert.equal(selectNextItem(deck.items,asked,mastery),null);
  return {mastery,answers};
}

test('the original course roundtrips through the unchanged checked-deck consumer',()=>{
  assert.equal(deck.items.length,16);
  assert.equal(deck.concepts.length,4);
  assert.deepEqual(JSON.parse(raw),deck);
  assert.deepEqual(parseDeck(serializeDeck(deck)),deck);
  assert.equal(new TextEncoder().encode(raw).length<262144,true);
  assert.match(deck.license,/CC0-1.0/);
  assert.match(deck.attribution,/not measured device data/);
  for (const concept of deck.concepts) {
    assert.equal(deck.items.filter(item=>item.concept===concept).length,4);
  }
});
test('all answer identities match the independently frozen question-only derivation',()=>{
  // Independent review daa28606 received only question packet ce04b5dd,
  // before the authored course, answer fields or model implementation.
  assert.deepEqual(deck.items.map(item=>item.answer),frozenAnswers);
  const byId=id=>deck.items.find(item=>item.id===id);
  assert.equal(byId('step-backward-rational').options[byId('step-backward-rational').answer],'16/81');
  assert.match(byId('step-boundary').options[byId('step-boundary').answer],/nondecaying/);
  assert.match(byId('step-zero-mask').options[byId('step-zero-mask').answer],/multiplied by -1\.5.*grows in magnitude/);
});
test('the unchanged selector reaches all16 questions with a retained first-answer mistake',()=>{
  const {mastery,answers}=session();
  assert.equal(new Set(answers.map(answer=>answer.item)).size,16);
  assert.equal(answers.filter(answer=>answer.correct).length,15);
  for(const value of Object.values(mastery)) {
    assert.ok(Number.isFinite(value)&&value>=0&&value<=1);
  }
});
test('the unchanged review and retry preserve the original boundary answer separately',()=>{
  const {mastery,answers}=session(),review=createReview(deck.items,answers);
  const before=JSON.stringify({mastery,answers,review});
  const initial=beginPractice(review),current=currentPracticeItem(initial);
  assert.equal(current.id,missedId);
  const practice=answerPractice(initial,current.id,current.answer);
  assert.equal(currentPracticeItem(practice),null);
  assert.equal(practice.answers.length,1);
  assert.equal(practice.answers[0].correct,true);
  assert.equal(initial.answers.length,0);
  assert.equal(JSON.stringify({mastery,answers,review}),before);
  assert.equal(review.find(item=>item.id===missedId).choice,1);
});
test('actual study-note creation contains complete content, reflection and distinct retry',()=>{
  const {mastery,answers}=session(),review=createReview(deck.items,answers);
  const initial=beginPractice(review),current=currentPracticeItem(initial);
  const practice=answerPractice(initial,current.id,current.answer);
  let reflections=createReflections(deck.items);
  reflections=updateReflection(reflections,missedId,'The multiplier -1 alternates without decaying.');
  reflections=updateApplicationReflection(reflections,'Keep the physical endpoint fixed when comparing step sizes.');
  const before=JSON.stringify({deck,review,mastery,practice,reflections});
  const notes=createStudyNotes({deck,review,mastery,practice,reflections,
    exportedAt:'2026-10-09T00:00:00Z',applicationPrompt});
  assert.equal(notes.filename,'recallweave-study-notes-2026-10-09.txt');
  assert.match(notes.text,/15 of 16 connections correct on the first try/);
  assert.match(notes.text,/1 of 1 practice answers recorded; 1 correct on retry/);
  for(const item of deck.items)for(const field of[item.prompt,item.options[item.answer],item.explanation,item.transfer]){
    assert.ok(notes.text.includes(field),item.id);
  }
  assert.ok(notes.text.includes(deck.attribution));
  assert.ok(notes.text.includes(reflections.application));
  assert.ok(notes.text.includes(applicationPrompt));
  assert.equal(JSON.stringify({deck,review,mastery,practice,reflections}),before);
});
test('the same consumer refuses malformed decks and incomplete note state',()=>{
  const duplicate=JSON.parse(raw);duplicate.items[1].id=duplicate.items[0].id;
  assert.throws(()=>parseDeck(JSON.stringify(duplicate)),/duplicates another question ID/);
  const cyclic=JSON.parse(raw);cyclic.items[0].prerequisites=['forward-behavior'];
  assert.throws(()=>parseDeck(JSON.stringify(cyclic)),/must not form a cycle/);
  const {mastery,answers}=session(),review=createReview(deck.items,answers);
  assert.throws(()=>createStudyNotes({deck,mastery,review:review.slice(1)}),/Finish the learning session/);
  const practice=beginPractice(review);
  assert.throws(()=>answerPractice(practice,'step-units',1),/Only the current unanswered/);
  assert.equal(practice.answers.length,0);
});
