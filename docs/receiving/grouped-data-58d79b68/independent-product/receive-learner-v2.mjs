import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseDeck} from './source-v2/src/deck.mjs';
import {initialMastery, selectNextItem, updateMastery} from './source-v2/src/knowledge.mjs';
import {orderOptions} from './source-v2/src/answer-order.mjs';
import {createReview, beginPractice, currentPracticeItem, answerPractice} from './source-v2/src/review.mjs';
import {createStudyNotes} from './source-v2/src/session-export.mjs';

const root=dirname(fileURLToPath(import.meta.url));
const out=join(root, process.argv[2] ?? 'learner-v1');
await mkdir(out);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const freeze=JSON.parse(await readFile(join(root,'source-freeze-v2.json'),'utf8'));
const report={status:'running',node:process.version,started_at:new Date().toISOString(),checks:[],source:freeze,downloads:[],sessions:{}};
const check=(name,run)=>{run();report.checks.push(name);console.log('PASS '+name);};
const inputBytes=await readFile(join(root,'source-v2/courses/grouped-data.json'));
const raw=JSON.parse(inputBytes);
let deck;
const fixedTime='2026-10-08T12:00:00.000Z';

function session(mode){
  const mastery=initialMastery(deck.concepts),asked=new Set(),answers=[],trace=[];
  for(let step=0;step<12;step++){
    const item=selectNextItem(deck.items,asked,mastery);
    assert.ok(item,'Every first-answer step must receive a question');
    assert.equal(asked.has(item.id),false);
    const displayOrder=orderOptions(item.options.length,()=>0);
    assert.deepEqual([...displayOrder].sort((a,b)=>a-b),[0,1,2,3]);
    const expectedCorrect=mode==='all-correct'||step%3!==0;
    const canonicalChoice=expectedCorrect?item.answer:(item.answer+1)%item.options.length;
    const displayPosition=displayOrder.indexOf(canonicalChoice);
    assert.notEqual(displayPosition,canonicalChoice,'The receiving fixture must expose a position/index mix-up');
    const pickedCanonical=displayOrder[displayPosition];
    assert.equal(item.options[pickedCanonical],item.options[canonicalChoice]);
    answers.push({item:item.id,choice:pickedCanonical});
    const correct=pickedCanonical===item.answer;
    assert.equal(correct,expectedCorrect);
    trace.push({step,id:item.id,concept:item.concept,display_order:displayOrder,display_position:displayPosition,canonical_choice:pickedCanonical,correct,selected_text:item.options[pickedCanonical],correct_text:item.options[item.answer]});
    asked.add(item.id);
    mastery[item.concept]=updateMastery(mastery[item.concept],correct);
  }
  assert.equal(selectNextItem(deck.items,asked,mastery),null);
  assert.deepEqual([...asked].sort(),deck.items.map(x=>x.id).sort());
  const review=createReview(deck.items,answers);
  return {mastery,answers,trace,review};
}

function verifyNotes(notes,run,practiceExpected){
  assert.equal(notes.filename,'recallweave-study-notes-2026-10-08.txt');
  assert.equal(notes.mediaType,'text/plain;charset=utf-8');
  assert.ok(notes.text.includes(deck.title));
  assert.ok(notes.text.includes(deck.attribution));
  assert.ok(notes.text.includes(deck.license));
  assert.ok(notes.text.includes('MODEL STATE, NOT A GRADE'));
  assert.ok(notes.text.includes('Practice does not change the first-session estimates.'));
  assert.ok(notes.text.includes(practiceExpected));
  let previous=-1;
  for(const answer of run.trace){
    const item=raw.items.find(x=>x.id===answer.id);
    const start=notes.text.indexOf(item.prompt);
    assert.ok(start>previous,'Notes retain the actual first-answer order');
    previous=start;
    const end=notes.text.indexOf('\n\n',start);
    const block=notes.text.slice(start,end<0?undefined:end);
    assert.ok(block.includes('Your first answer: '+item.options[answer.canonical_choice]));
    assert.ok(block.includes('Correct answer: '+item.options[item.answer]));
    assert.ok(block.includes('Explanation: '+item.explanation));
    assert.ok(block.includes('Apply the idea: '+item.transfer));
  }
  assert.ok(notes.text.endsWith('\n'));
}

async function saveNotes(name,notes){
  const bytes=Buffer.from(notes.text);
  await writeFile(join(out,name),bytes);
  report.downloads.push({name,bytes:bytes.length,sha256:sha(bytes),kind:'native export bytes; not a browser download'});
}

try{
  for(const file of freeze.files){
    const bytes=await readFile(join(root,'source-v2',file.path));
    assert.equal(sha(bytes),file.sha256);
    assert.equal(bytes.length,file.bytes);
  }
  check('all final frozen inputs match their exact received bytes',()=>{
    assert.equal(sha(inputBytes),'8ea687ed9157c0a81f155d2f96bc381ebe3024c0c582cf177c0814656460d20d');
  });
  check('actual parseDeck preserves the twelve-item course and exact content metadata',()=>{
    deck=parseDeck(inputBytes.toString('utf8'));
    assert.equal(deck.items.length,12);
    assert.equal(deck.concepts.length,4);
    assert.deepEqual(deck,raw);
    assert.equal(new Set(deck.items.map(x=>x.id)).size,12);
    assert.ok(deck.items.every(x=>x.options.length===4));
    assert.ok(Object.isFrozen(deck)&&Object.isFrozen(deck.items));
    for(const item of deck.items){
      assert.ok(Object.isFrozen(item)&&Object.isFrozen(item.options)&&Object.isFrozen(item.prerequisites));
    }
    const old=raw.items[0].options[0];
    raw.items[0].options[0]='RECEIVER INPUT-ALIAS CONTROL';
    assert.equal(deck.items[0].options[0],old);
    raw.items[0].options[0]=old;
  });
  const initialCourse=JSON.stringify(deck);
  const mixed=session('mixed');
  report.sessions.mixed={answers:mixed.answers,trace:mixed.trace,mastery:mixed.mastery};
  check('adaptive mixed session receives every ID once with eight canonical correct answers',()=>{
    assert.equal(mixed.trace.filter(x=>x.correct).length,8);
    assert.equal(mixed.trace.filter(x=>!x.correct).length,4);
    assert.equal(mixed.review.length,12);
    assert.ok(Object.values(mixed.mastery).every(x=>Number.isFinite(x)&&x>=0&&x<=1));
    assert.deepEqual(mixed.review.map(x=>x.id),mixed.trace.map(x=>x.id));
    for(let index=0;index<12;index++){
      const r=mixed.review[index],t=mixed.trace[index],item=raw.items.find(x=>x.id===r.id);
      assert.equal(r.choice,t.canonical_choice);
      assert.equal(r.correct,t.correct);
      assert.equal(r.options[r.choice],t.selected_text);
      assert.equal(r.options[r.answer],t.correct_text);
      assert.deepEqual(r.options,item.options);
      assert.equal(r.prompt,item.prompt);
      assert.equal(r.explanation,item.explanation);
      assert.equal(r.transfer,item.transfer);
    }
  });
  const before=JSON.stringify({answers:mixed.answers,review:mixed.review,mastery:mixed.mastery,deck});
  const notesBefore=createStudyNotes({deck,review:mixed.review,mastery:mixed.mastery,exportedAt:fixedTime});
  check('completed first-session notes retain exact answers, explanations, transfers and attribution',()=>{
    assert.ok(notesBefore.text.includes('8 of 12 connections correct on the first try.'));
    verifyNotes(notesBefore,mixed,'Not started. 4 missed connections are available for practice.');
  });
  await saveNotes('before-practice.txt',notesBefore);
  check('this course cannot export study notes with an incomplete first session',()=>{
    assert.throws(()=>createStudyNotes({deck,review:createReview(deck.items,mixed.answers.slice(0,11)),mastery:mixed.mastery,exportedAt:fixedTime}),/Finish the learning session/);
  });
  let round=beginPractice(mixed.review);
  const originalRound=round,roundSnapshot=JSON.stringify(round);
  const expectedMissed=mixed.trace.filter(x=>!x.correct).map(x=>x.id);
  check('practice contains exactly the four original misses in first-answer order',()=>{
    assert.deepEqual(round.items.map(x=>x.id),expectedMissed);
    assert.equal(round.answers.length,0);
    assert.equal(currentPracticeItem(round).id,expectedMissed[0]);
  });
  round=answerPractice(round,currentPracticeItem(round).id,currentPracticeItem(round).answer);
  const pausedRound=round,pausedSnapshot=JSON.stringify(round);
  const paused=createStudyNotes({deck,review:mixed.review,mastery:mixed.mastery,practice:round,exportedAt:fixedTime});
  check('one retry produces truthful paused notes without rewriting the original session',()=>{
    verifyNotes(paused,mixed,'Paused: 1 of 4 practice answers recorded; 1 correct on retry.');
    assert.equal(JSON.stringify(originalRound),roundSnapshot);
    assert.equal(JSON.stringify({answers:mixed.answers,review:mixed.review,mastery:mixed.mastery,deck}),before);
    const first=mixed.review.find(x=>x.id===expectedMissed[0]);
    assert.ok(paused.text.includes('Practice answer: '+first.options[first.answer]));
  });
  await saveNotes('paused-practice.txt',paused);
  for(let index=1;index<4;index++){
    const item=currentPracticeItem(round);
    assert.equal(item.id,expectedMissed[index]);
    const choice=index%2===0?item.answer:(item.answer+1)%item.options.length;
    round=answerPractice(round,item.id,choice);
  }
  check('bounded practice records two correct and two incorrect retries, then ends',()=>{
    assert.equal(currentPracticeItem(round),null);
    assert.equal(round.answers.length,4);
    assert.equal(round.answers.filter(x=>x.correct).length,2);
    assert.deepEqual(round.answers.map(x=>x.item),expectedMissed);
    assert.equal(JSON.stringify(pausedRound),pausedSnapshot);
    assert.equal(JSON.stringify(originalRound),roundSnapshot);
    assert.equal(JSON.stringify({answers:mixed.answers,review:mixed.review,mastery:mixed.mastery,deck}),before);
  });
  const completed=createStudyNotes({deck,review:mixed.review,mastery:mixed.mastery,practice:round,exportedAt:fixedTime});
  check('completed notes retain distinct first answers and exact canonical retry answers',()=>{
    verifyNotes(completed,mixed,'Complete: 4 of 4 practice answers recorded; 2 correct on retry.');
    assert.ok(completed.text.includes('8 of 12 connections correct on the first try.'));
    for(const retry of round.answers){
      const item=raw.items.find(x=>x.id===retry.item),start=completed.text.indexOf(item.prompt),end=completed.text.indexOf('\n\n',start),block=completed.text.slice(start,end<0?undefined:end);
      assert.ok(block.includes('Practice answer: '+item.options[retry.choice]));
      assert.ok(block.includes('Practice result: '+(retry.choice===item.answer?'correct on retry':'keep reviewing')));
    }
  });
  report.sessions.mixed.practice=round.answers;
  await saveNotes('completed-practice.txt',completed);
  const correct=session('all-correct');
  report.sessions.all_correct={answers:correct.answers,trace:correct.trace,mastery:correct.mastery};
  const correctNotes=createStudyNotes({deck,review:correct.review,mastery:correct.mastery,exportedAt:fixedTime});
  check('changed first-answer inputs yield twelve correct, no missed work and separate model state',()=>{
    assert.equal(correct.review.filter(x=>x.correct).length,12);
    assert.equal(beginPractice(correct.review).items.length,0);
    assert.equal(currentPracticeItem(beginPractice(correct.review)),null);
    assert.ok(correctNotes.text.includes('12 of 12 connections correct on the first try.'));
    verifyNotes(correctNotes,correct,'No missed connections in the first session.');
    assert.notDeepEqual(correct.mastery,mixed.mastery);
    assert.equal(JSON.stringify({answers:mixed.answers,review:mixed.review,mastery:mixed.mastery,deck}),before);
    assert.equal(JSON.stringify(deck),initialCourse);
  });
  await saveNotes('all-correct.txt',correctNotes);
  report.status='passed';
}catch(error){
  report.status='failed';
  report.error=error.stack??String(error);
  process.exitCode=1;
  console.error(report.error);
}finally{
  report.source_readback=[];
  for(const file of freeze.files){
    const frozen=await readFile(join(root,'source-v2',file.path));
    const author=await readFile(join(freeze.author_worktree,file.path));
    report.source_readback.push({path:file.path,frozen_sha256:sha(frozen),frozen_unchanged:sha(frozen)===file.sha256,author_current_sha256:sha(author),author_unchanged:sha(author)===file.sha256});
  }
  report.receiver_sha256=sha(await readFile(fileURLToPath(import.meta.url)));
  report.specification_sha256=sha(await readFile(join(root,'RECEIVER-SPEC.md')));
  report.finished_at=new Date().toISOString();
  report.limits=['Exact native module/course receiving; no full learner import, app state, browser learner or real learner efficacy acceptance.','Browser explorer receiving is separate and pending its author freeze.'];
  await writeFile(join(out,'result.json'),JSON.stringify(report,null,2)+'\n');
  console.log(report.status.toUpperCase()+': '+report.checks.length+' independent learner controls');
}
