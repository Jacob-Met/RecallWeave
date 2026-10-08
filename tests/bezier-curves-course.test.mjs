import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseDeck, serializeDeck } from '../src/deck.mjs';
import { checkDraft, draftFromDeck } from '../src/deck-author.mjs';
import { initialMastery, selectNextItem, updateMastery } from '../src/knowledge.mjs';
import { createReview, beginPractice, currentPracticeItem, answerPractice } from '../src/review.mjs';
import { createStudyNotes } from '../src/session-export.mjs';

const raw=await readFile(new URL('../courses/bezier-curves.json',import.meta.url),'utf8');
const deck=parseDeck(raw), item=id=>deck.items.find(q=>q.id===id);
const selected=id=>{const q=item(id);assert.ok(q);return q.options[q.answer];};
const vector=s=>{const m=/^\((-?\d+), (-?\d+)\)$/.exec(s);return m&&m.slice(1).map(Number);};
function checkVector(id,expected,anchors) {
  const q=item(id); for(const a of anchors)assert.ok(q.prompt.includes(a));
  assert.deepEqual(q.options.flatMap((s,i)=>JSON.stringify(vector(s))===JSON.stringify(expected)?[i]:[]),[q.answer]);
}
test('sixteen original items round trip through current native deck and authoring APIs',()=>{
  assert.equal(deck.items.length,16);assert.equal(deck.concepts.length,4);
  for(const c of deck.concepts)assert.equal(deck.items.filter(q=>q.concept===c).length,4);
  assert.deepEqual([0,1,2,3].map(i=>deck.items.filter(q=>q.answer===i).length),[4,4,4,4]);
  assert.equal(serializeDeck(deck),raw);
  const draft=draftFromDeck(deck), result=checkDraft(draft);
  assert.equal(result.ok,true);assert.equal(result.json,raw);
  assert.ok(deck.items.every(q=>q.explanation.length>200&&q.transfer.length>90));
});
test('displayed vector answers satisfy the independent stated arithmetic',()=>{
  checkVector('bz-interpolate',[.75*2+.25*10,.75*(-2)+.25*6],['A = (2, -2)','B = (10, 6)','L(1/4)']);
  checkVector('bz-translation',[4-3,0+5],['L(1/4) = (4, 0)','v = (-3, 5)']);
  checkVector('bz-quadratic',[.25*0+.5*4+.25*8,.25*0+.5*8+.25*0],['P1 = (4, 8)','t = 1/2']);
  checkVector('bz-cubic',[(0+3*0+3*8+8)/8,(0+3*8+3*8+0)/8],['(0, 0), (0, 8), (8, 8), (8, 0)','B(1/2)']);
  checkVector('bz-collinear',[8/4,0],['P1 = (4, 0)','B(1/4)']);
  checkVector('bz-start-derivative',[3*(3-1),3*(6-2)],['P0 = (1, 2)','P1 = (3, 6)']);
  checkVector('bz-end-derivative',[3*(8-4),3*(1+1)],['P2 = (4, -1)','P3 = (8, 1)']);
});
test('subdivision keys preserve traversal and explicitly map local parameters',()=>{
  assert.equal(selected('bz-left-split'),'(0, 0), (2, 4), (4, 4)');
  assert.equal(selected('bz-right-split'),'(4, 4), (6, 4), (8, 0)');
  const fraction=s=>{const [n,d='1']=s.split('/');return Number(n)/Number(d);};
  assert.equal(fraction(selected('bz-left-parameter')),.25*.5);
  assert.equal(fraction(selected('bz-right-parameter')),.25+.75/3);
  assert.ok(item('bz-left-parameter').prompt.includes('t0 = 1/4'));
  assert.ok(item('bz-right-parameter').prompt.includes('u = 1/3'));
});
test('qualitative claims retain the stated hypotheses and degeneracy distinctions',()=>{
  assert.equal(selected('bz-endpoints'),'A, then B');
  assert.equal(selected('bz-convex'),'Its weights are nonnegative and add to 1.');
  assert.ok(item('bz-convex').prompt.includes('0 <= t <= 1'));
  assert.equal(selected('bz-control-point'),"No; its maximum height is 4, below P1's height 8.");
  assert.equal(16*.5*(1-.5),4);
  assert.equal(selected('bz-stationary'),"B'(0) = (0, 0), but later points move along the x-axis.");
  assert.equal(selected('bz-parameter-speed'),[8*.5**2,8-8*.5**2].join(' and '));
});
test('current learner, review, practice and study notes consume every new course item',()=>{
  for(const mode of ['correct','missed','mixed']){
    const mastery=initialMastery(deck.concepts),asked=new Set(),answers=[];
    while(asked.size<deck.items.length){
      const question=selectNextItem(deck.items,asked,mastery);assert.ok(question);assert.ok(!asked.has(question.id));
      const correct=mode==='correct'||(mode==='mixed'&&asked.size%3!==0);
      const choice=correct?question.answer:(question.answer+1)%question.options.length;
      asked.add(question.id);answers.push({item:question.id,choice});
      mastery[question.concept]=updateMastery(mastery[question.concept],correct);
    }
    assert.equal(selectNextItem(deck.items,asked,mastery),null);
    const review=createReview(deck.items,answers),before=JSON.stringify({review,mastery});
    let practice=beginPractice(review);
    while(currentPracticeItem(practice)){const question=currentPracticeItem(practice);practice=answerPractice(practice,question.id,question.answer);}
    assert.equal(JSON.stringify({review,mastery}),before);
    const notes=createStudyNotes({deck,review,mastery,practice,exportedAt:'2026-10-08T20:00:00Z'});
    for(const q of deck.items){assert.ok(notes.text.includes(q.prompt));assert.ok(notes.text.includes(q.explanation));assert.ok(notes.text.includes(q.transfer));}
    assert.ok(notes.text.includes(deck.attribution));assert.ok(notes.text.includes(deck.license));
  }
});
