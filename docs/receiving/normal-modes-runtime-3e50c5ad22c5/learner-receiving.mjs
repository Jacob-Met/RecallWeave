import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {waitFor} from './browser-driver.mjs';

export async function receiveLearner({b,learner,coursePath,deck,report,download,capture,geometry}) {
 const surface=await b.open(pathToFileURL(learner).href,{width:390,height:844,downloadPath:report.downloadStaging,offline:true});
 report.surfaces.push({name:'unchanged learner standalone',...surface});
 await waitFor(()=>b.evaluate(()=>!!document.querySelector('#deck-file')),'unchanged learner importer');
 await b.chooseFile('#deck-file',coursePath);
 await waitFor(()=>b.evaluate(t=>!document.querySelector('#deck-preview').hidden&&document.querySelector('#deck-preview-title')?.textContent===t,deck.title),'normal-modes course preview');
 const preview=await b.evaluate(()=>({title:document.querySelector('#deck-preview-title').textContent,count:document.querySelector('.deck-preview-count').textContent,attribution:document.querySelector('.deck-preview-attribution').textContent,license:document.querySelector('.deck-preview-license').textContent,prompts:[...document.querySelectorAll('#deck-preview ol strong')].map(n=>n.textContent),size:document.querySelector('#deck-file').files[0].size}));
 assert.equal(preview.title,deck.title);
 assert.ok(preview.count.includes(String(deck.items.length)+' questions'));
 assert.ok(preview.count.includes(String(deck.concepts.length)+' concepts'));
 assert.equal(preview.attribution,'Attribution supplied in the deck: '+deck.attribution);
 assert.equal(preview.license,'License supplied in the deck: '+deck.license);
 assert.deepEqual(preview.prompts,deck.items.map(i=>i.prompt));
 report.learner={preview,firstAnswers:[],questionStates:[]};
 await geometry('learner preview',['#deck-file','#start-deck','#cancel-deck']);
 await capture('learner-preview-390.png');
 await b.activate('#start-deck');
 await waitFor(()=>b.evaluate(()=>!!document.querySelector('.question-card')),'first normal-modes question');
 assert.equal(await b.evaluate(()=>document.title),deck.title+' — RecallWeave');
 assert.deepEqual(await b.evaluate(()=>[...document.querySelectorAll('#lesson-map .deck-concept')].map(n=>n.textContent)),deck.concepts);
 for(let n=0;n<deck.items.length;n++){
  const state=await b.evaluate(()=>({prompt:document.querySelector('.question-card h2').textContent,choices:[...document.querySelectorAll('[data-choice]')].map(n=>({choice:Number(n.dataset.choice),text:[...n.childNodes].filter(c=>c.nodeType===Node.TEXT_NODE).map(c=>c.textContent).join(''),label:n.querySelector('.choice-key').textContent}))}));
  const item=deck.items.find(i=>i.prompt===state.prompt);
  assert.ok(item,'Canonical authored question');
  assert.ok(!report.learner.firstAnswers.some(a=>a.item===item.id),'Each authored question asked once');
  assert.deepEqual(state.choices.map(c=>c.choice).sort((a,b)=>a-b),item.options.map((_,i)=>i));
  for(let i=0;i<state.choices.length;i++){
   assert.equal(state.choices[i].text,item.options[state.choices[i].choice]);
   assert.equal(state.choices[i].label,String.fromCharCode(65+i));
  }
  if(n===0){await geometry('learner question',['.choice']);await capture('learner-question-390.png');}
  const deliberateMiss=n===0;
  const choice=deliberateMiss?(item.answer+1)%item.options.length:item.answer;
  const order=state.choices.map(c=>c.choice),index=order.indexOf(choice);
  await b.evaluate(()=>document.querySelector('[data-choice]').focus());
  for(let i=0;i<index;i++)await b.key('Tab');
  assert.equal(await b.evaluate(()=>document.activeElement.dataset.choice),String(choice));
  await b.key('Enter');
  await waitFor(()=>b.evaluate(()=>!!document.querySelector('#next-button')),'question feedback '+item.id);
  const feedback=await b.evaluate(()=>({text:document.querySelector('#feedback-slot .feedback').textContent,lead:document.querySelector('#feedback-slot .feedback>strong').textContent,transfer:document.querySelector('#feedback-slot .why').textContent,correct:Number(document.querySelector('.choice.correct').dataset.choice),wrong:document.querySelector('.choice.incorrect')?.dataset.choice??null,allDisabled:[...document.querySelectorAll('[data-choice]')].every(n=>n.disabled),focus:document.activeElement.id}));
  assert.ok(feedback.text.includes(item.explanation));
  assert.equal(feedback.transfer,'Try this transfer: '+item.transfer);
  assert.equal(feedback.correct,item.answer);
  assert.equal(feedback.wrong,deliberateMiss?String(choice):null);
  assert.equal(feedback.allDisabled,true);
  assert.equal(feedback.focus,'next-button');
  report.learner.firstAnswers.push({item:item.id,choice});
  report.learner.questionStates.push({item:item.id,displayOrder:order,deliberateMiss,feedback});
  await b.activate('#next-button');
 }
 await waitFor(()=>b.evaluate(()=>!!document.querySelector('.result-card')),'completed course review');
 const review=await b.evaluate(()=>({summary:document.querySelector('#first-try-summary').textContent,items:[...document.querySelectorAll('.review-item')].map(n=>({prompt:n.querySelector('.review-prompt').textContent,answers:[...n.querySelectorAll('dd')].map(x=>x.textContent),explanation:n.querySelector('.review-body>p').textContent,transfer:n.querySelector('.review-transfer').textContent,missed:!!n.querySelector('.needs-review')}))}));
 assert.ok(review.summary.includes(String(deck.items.length-1)+' of '+deck.items.length));
 assert.equal(review.items.length,deck.items.length);
 assert.equal(review.items.filter(i=>i.missed).length,1);
 for(let i=0;i<report.learner.firstAnswers.length;i++){
  const answer=report.learner.firstAnswers[i],item=deck.items.find(x=>x.id===answer.item),row=review.items[i];
  assert.equal(row.prompt,item.prompt);
  assert.deepEqual(row.answers,[item.options[answer.choice],item.options[item.answer]]);
  assert.equal(row.explanation,item.explanation);
  assert.equal(row.transfer,'Apply the idea: '+item.transfer);
 }
 report.learner.review=review;
 await geometry('learner completed review',['#save-notes-button']);
 await capture('learner-review-390.png');
 const notes=await download('#save-notes-button','learner-notes.txt');
 const text=notes.bytes.toString('utf8');
 for(const field of [deck.title,deck.attribution,deck.license])assert.ok(text.includes(field),'Notes course metadata');
 for(const answer of report.learner.firstAnswers){
  const item=deck.items.find(x=>x.id===answer.item);
  for(const exact of [item.prompt,'Your first answer: '+item.options[answer.choice],'Correct answer: '+item.options[item.answer],'Explanation: '+item.explanation,'Apply the idea: '+item.transfer])assert.ok(text.includes(exact),'Notes preserve '+item.id);
 }
 await b.activate('#trace-archive-panel > summary');
 assert.equal(await b.evaluate(()=>document.querySelector('#save-trace-button').disabled),false);
 const archive=await download('#save-trace-button','learner-completed-trace.json');
 const trace=JSON.parse(archive.bytes);
 assert.equal(trace.format,'recallweave.learning-trace');
 assert.equal(trace.version,1);
 assert.deepEqual(trace.deck,deck);
 assert.deepEqual(trace.firstAnswers,report.learner.firstAnswers);
 report.learner.traceSummary={format:trace.format,version:trace.version,questions:trace.firstAnswers.length,concepts:Object.keys(trace.mastery),notesSha256:notes.sha256,traceSha256:archive.sha256};
 return {items:deck.items.length,concepts:deck.concepts.length,correctFirst:deck.items.length-1,deliberateMiss:report.learner.firstAnswers[0].item,physicalCoursePath:coursePath};
}
