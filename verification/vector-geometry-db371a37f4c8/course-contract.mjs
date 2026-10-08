// Course-specific receiving through the real learner modules and actual deck
// validator. This gate is separate from the required real-app file-import gate.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const receiver = path.resolve(process.argv[2] ?? fileURLToPath(new URL('../../', import.meta.url)));
const evidence = path.resolve(process.argv[3] ?? fileURLToPath(new URL('./', import.meta.url)));
const coursePath = fileURLToPath(new URL('../../courses/vector-geometry.json', import.meta.url));
const modules = ['src/deck.mjs','src/knowledge.mjs','src/review.mjs','src/answer-order.mjs','src/session-export.mjs'];
const load = name => import(pathToFileURL(path.join(receiver, name)).href);
const [{parseDeck,serializeDeck},{initialMastery,selectNextItem,updateMastery},
  {createReview,beginPractice,currentPracticeItem,answerPractice},{orderOptions},{createStudyNotes}] = await Promise.all(modules.map(load));
const bytes = await fs.readFile(coursePath);
const deck = parseDeck(bytes.toString('utf8'));
assert.deepEqual(parseDeck(serializeDeck(deck)),deck);
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const sourceSha256 = Object.fromEntries(await Promise.all(modules.map(async name => [name,sha256(await fs.readFile(path.join(receiver,name)))])));
const shaBefore = JSON.stringify(sourceSha256);
const cases = [];
await fs.mkdir(evidence,{recursive:true});

for (const mode of ['mixed','all-correct','all-missed']) {
  const mastery = initialMastery(deck.concepts), asked = new Set(), answers = [];
  const firstCourseBytes = JSON.stringify(deck);
  while (asked.size < deck.items.length) {
    const item = selectNextItem(deck.items,asked,mastery);
    assert.ok(item && !asked.has(item.id),'The actual selector supplies each course item exactly once.');
    const order = orderOptions(item.options.length,()=>0.25);
    const correct = mode==='all-correct' || (mode==='mixed' && answers.length%3!==0);
    const canonicalChoice = correct ? item.answer : (item.answer+1)%item.options.length;
    const displayedPosition = order.indexOf(canonicalChoice);
    assert.equal(item.options[order[displayedPosition]],item.options[canonicalChoice]);
    answers.push({item:item.id,choice:order[displayedPosition]});
    mastery[item.concept]=updateMastery(mastery[item.concept],canonicalChoice===item.answer);
    asked.add(item.id);
  }
  assert.equal(selectNextItem(deck.items,asked,mastery),null);
  assert.equal(asked.size,12);
  assert.deepEqual([...asked].sort(),deck.items.map(item=>item.id).sort());
  const review = createReview(deck.items,answers);
  const missed = review.filter(item=>!item.correct);
  assert.equal(missed.length,mode==='all-correct'?0:mode==='mixed'?4:12);
  assert.deepEqual(review.map(item=>item.id),answers.map(answer=>answer.item));
  for (const item of review) {
    const original=deck.items.find(candidate=>candidate.id===item.id);
    for (const field of ['prompt','concept','answer','explanation','transfer']) assert.equal(item[field],original[field]);
    assert.deepEqual(item.options,original.options);
  }
  const firstState = JSON.stringify({answers,mastery,review});
  const input={deck,review,mastery,exportedAt:'2026-10-08T11:00:00.000Z'};
  const unstarted=createStudyNotes(input);
  assert.ok(unstarted.text.includes(`${12-missed.length} of 12 connections correct on the first try.`));
  assert.ok(unstarted.text.includes(deck.title));
  assert.ok(unstarted.text.includes(deck.attribution));
  assert.ok(unstarted.text.includes(deck.license));
  for(const concept of deck.concepts) assert.ok(unstarted.text.includes(`${concept}: `));
  if(!missed.length) assert.match(unstarted.text,/No missed connections/);
  else assert.ok(unstarted.text.includes(`Not started. ${missed.length} missed connections`));
  let practice=beginPractice(review);
  assert.deepEqual(practice.items.map(item=>item.id),missed.map(item=>item.id));
  let retries=0;
  while(currentPracticeItem(practice)){
    const item=currentPracticeItem(practice);
    const choice=retries%2===0?item.answer:(item.answer+1)%item.options.length;
    practice=answerPractice(practice,item.id,choice); retries++;
    if(retries===1 && missed.length>1){
      const paused=createStudyNotes({...input,practice});
      assert.ok(paused.text.includes(`Paused: 1 of ${missed.length} practice answers recorded; 1 correct on retry.`));
      assert.equal((paused.text.match(/Practice answer: not recorded\./g)??[]).length,missed.length-1);
    }
  }
  assert.equal(retries,missed.length);
  const complete=createStudyNotes({...input,practice});
  assert.equal(JSON.stringify({answers,mastery,review}),firstState,'Practice retains the first answers and illustrative model estimates.');
  assert.equal(JSON.stringify(deck),firstCourseBytes);
  let prior=-1;
  for(const item of review){
    const index=complete.text.indexOf(item.prompt);
    assert.ok(index>prior,'Study notes retain actual selector/answer order.'); prior=index;
    for(const text of [`Your first answer: ${item.options[item.choice]}`,
      `Correct answer: ${item.options[item.answer]}`,`Explanation: ${item.explanation}`,`Apply the idea: ${item.transfer}`]){
      assert.ok(complete.text.includes(text));
    }
    const retry=practice.answers.find(answer=>answer.item===item.id);
    if(retry)assert.ok(complete.text.includes(`Practice answer: ${item.options[retry.choice]}`));
  }
  assert.match(complete.text,/MODEL STATE, NOT A GRADE/);
  assert.equal(Buffer.from(complete.text,'utf8').toString('utf8'),complete.text);
  await fs.writeFile(path.join(evidence,`course-${mode}-notes.txt`),complete.text);
  cases.push({mode,firstCorrect:12-missed.length,questions:12,concepts:deck.concepts.length,
    firstAnswerOrder:answers.map(answer=>answer.item),practiceAnswers:retries,
    correctOnRetry:practice.answers.filter(answer=>answer.correct).length,
    notesBytes:Buffer.byteLength(complete.text),notesSha256:sha256(Buffer.from(complete.text))});
}
const after=Object.fromEntries(await Promise.all(modules.map(async name=>[name,sha256(await fs.readFile(path.join(receiver,name)))])));
assert.equal(JSON.stringify(after),shaBefore);
assert.deepEqual(await fs.readFile(coursePath),bytes);
const receipt={status:'pass',node:process.version,courseSha256:sha256(bytes),sourceSha256,cases,
  scope:'Actual module contract receiving with explicit synthetic answer fixtures; no browser/import UI integration or learning outcome claim.',
  courseMutated:false,receivingSourceMutated:false};
await fs.writeFile(path.join(evidence,'course-contract-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt,null,2));
