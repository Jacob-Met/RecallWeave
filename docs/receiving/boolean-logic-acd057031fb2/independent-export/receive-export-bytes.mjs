/** Independent receiving of recorded actual-browser export bytes; no product code is imported. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

const receiverDir=path.dirname(fileURLToPath(import.meta.url));
const args=process.argv.slice(2),arg=name=>args[args.indexOf(name)+1];
for(const name of ['--packet','--output','--expected-demo-sha','--expected-receipt-sha'])assert(args.includes(name),'Required argument: '+name);
const packet=path.resolve(arg('--packet')),output=path.resolve(arg('--output')),expectedDemo=arg('--expected-demo-sha'),expectedReceipt=arg('--expected-receipt-sha');
assert.match(expectedDemo,/^[a-f0-9]{64}$/);
assert.match(expectedReceipt,/^[a-f0-9]{64}$/);
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const blindBytes=fs.readFileSync(path.join(receiverDir,'questions-independent.json'));
assert.equal(sha(blindBytes),'f20b931157946d4886af33ba22fc304c9dd86f5ad253881eaf1dbd9d341cb7c3');
const blind=JSON.parse(blindBytes);
const expectedBytes=fs.readFileSync(path.join(receiverDir,'reviewed-course.json'));
assert.equal(sha(expectedBytes),'1a7be58f575ff35b9b2caa0c711b3389f612406a047da9c2f8467411c3c1633c');
const expected=JSON.parse(expectedBytes),byId=new Map(expected.items.map(i=>[i.id,i])),key=new Map(blind.answers.map(a=>[a.id,a.canonicalOptionIndexZeroBased]));
assert.equal(byId.size,12);assert.equal(key.size,12);
for(const item of expected.items)assert.equal(item.answer,key.get(item.id));
const authorBytes=fs.readFileSync(path.join(packet,'receipt.json')),author=JSON.parse(authorBytes);
assert.equal(sha(authorBytes),expectedReceipt,'Exact frozen source browser receipt required');
assert.equal(author.status,'pass','Only a completed positive browser packet may be admitted');
assert.equal(author.kind,'actual Chromium direct-file receiving');
assert.equal(author.checks.length,12);assert(author.checks.every(c=>c.pass===true));
assert.equal(author.sourceUnchanged,true);assert.deepEqual(author.sourceBefore,author.sourceAfter);
assert.equal(author.sourceBefore['courses/boolean-logic.json'],sha(expectedBytes));
assert.equal(author.sourceBefore['courses/boolean-logic-explorer.html'],'f5df851a847d84040610a10d81177b3f81081a558e0547cc25d201ab3dbc9a35');
assert.equal(author.sourceBefore['src/boolean-logic.mjs'],'cde57de117bbe3b3eb8067dcd973f67b11f7ea7147e0c5104075395e62b0e2aa');
assert.equal(author.sourceBefore['src/boolean-logic-ui.mjs'],'ef874394f2177519870b70e2caeadf2fb998a7fa32431c5b6ca3d0e948835113');
assert.equal(author.sourceBefore['tools/check-boolean-logic-browser.mjs'],'85e8bb5d9ac02fe301c4fab8afa3ec0e5e7544432033f0a87ad7d7af49ba85b4');
assert.equal(author.sourceBefore['demo.html'],expectedDemo);
assert.deepEqual(author.pageErrors,[]);assert(author.requests.every(url=>url.startsWith('file:')));
assert.equal(author.profileCleanup.status,'pass');
assert.equal(author.downloads.length,8);
const files=author.downloads.map(entry=>{
  assert(entry.path.startsWith('downloads/'));assert(!entry.path.split('/').some(p=>!p||p==='.'||p==='..'));
  const full=path.join(packet,entry.path),bytes=fs.readFileSync(full);
  assert.equal(bytes.length,entry.bytes);assert.equal(sha(bytes),entry.sha256);
  return {...entry,bytes:bytes.length,text:bytes.toString('utf8')};
});
const courses=files.filter(f=>f.requestedFilename==='boolean-logic.json'&&f.sha256===sha(expectedBytes));
assert.equal(courses.length,1);
const traceFiles=files.filter(f=>/^recallweave-learning-trace-.*\.json$/.test(f.requestedFilename));
assert.equal(traceFiles.length,3);
const noteFiles=files.filter(f=>/^recallweave-study-notes-.*\.txt$/.test(f.requestedFilename));
assert.equal(noteFiles.length,1);
const eventChecks=author.checks.filter(c=>Array.isArray(c.firstAnswers));assert.equal(eventChecks.length,1);
const events=eventChecks[0].firstAnswers;
assert.equal(events.length,12);assert.equal(new Set(events.map(e=>e.item)).size,12);
for(const [index,event]of events.entries()){
  assert(byId.has(event.item));assert.deepEqual(Object.keys(event).sort(),['choice','item']);
  assert.equal(event.choice,index%2===0?key.get(event.item):(key.get(event.item)+1)%4,'UI event must agree with the independent key and authored alternating interaction contract');
}
const missed=events.filter(e=>e.choice!==key.get(e.item));
assert.equal(missed.length,6);
const retries=missed.map(e=>({item:e.item,choice:key.get(e.item)}));
const payload={course:JSON.parse(courses[0].text),traces:traceFiles.map(f=>JSON.parse(f.text)),notes:noteFiles[0].text};

function noteGroups(text){
  const lines=text.split(/\r?\n/),start=lines.indexOf('REVIEW THE CONNECTIONS'),end=lines.indexOf('DECK ATTRIBUTION');
  assert(start>=0&&end>start,'Required readable note sections');
  const groups=[];
  for(let index=start+1;index<end;index++){
    const heading=/^(\d+)\. (.+)$/.exec(lines[index]);
    if(heading){groups.push({number:Number(heading[1]),prompt:heading[2],fields:{},lineNumbers:{}});continue;}
    if(!lines[index])continue;
    assert(groups.length,'Note data must follow its question heading');
    const field=/^([^:]+): (.*)$/.exec(lines[index]);
    if(!field)continue; // Additional accepted learner annotations are outside the required identity fields.
    const group=groups.at(-1),name=field[1];
    assert(!Object.hasOwn(group.fields,name),'Duplicate labeled field within a question: '+name);
    group.fields[name]=field[2];group.lineNumbers[name]=index;
  }
  return {lines,groups};
}
function semantics(data){
  const checks=[],check=(name,fn)=>{try{fn();checks.push({name,pass:true});}catch(error){checks.push({name,pass:false,message:error.message});}};
  check('downloaded_course_matches_independently_reviewed_lesson',()=>assert.deepEqual(data.course,expected));
  check('every_trace_preserves_exact_course_and_supported_format',()=>{
    assert.equal(data.traces.length,3);
    for(const t of data.traces){assert.equal(t.format,'recallweave.learning-trace');assert.equal(t.version,1);assert.deepEqual(t.deck,expected);}
  });
  check('all_three_traces_preserve_recorded_canonical_first_answers',()=>{
    for(const t of data.traces)assert.deepEqual(t.firstAnswers,events);
  });
  check('first_paused_and_completed_practice_keep_order_and_correct_identity',()=>{
    assert.equal(data.traces[0].practice,null);
    assert.deepEqual(data.traces[1].practice,{answers:retries.slice(0,3)});
    assert.deepEqual(data.traces[2].practice,{answers:retries});
  });
  check('practice_preserves_original_model_state_without_recomputing_it',()=>{
    const first=data.traces[0];
    assert.deepEqual(Object.keys(first.mastery).sort(),[...expected.concepts].sort());
    for(const value of Object.values(first.mastery))assert(Number.isFinite(value)&&value>=0&&value<=1);
    for(const t of data.traces.slice(1)){assert.deepEqual(t.mastery,first.mastery);assert.deepEqual(t.model,first.model);}
  });
  check('notes_have_twelve_distinct_ordered_question_blocks',()=>{
    const {groups}=noteGroups(data.notes);assert.equal(groups.length,12);
    for(const [index,g]of groups.entries()){assert.equal(g.number,index+1);assert.equal(g.prompt,byId.get(events[index].item).prompt);}
  });
  check('notes_pair_first_choice_correct_choice_and_grade_per_question',()=>{
    const {groups}=noteGroups(data.notes);assert.equal(groups.length,12);
    for(const [index,g]of groups.entries()){
      const event=events[index],item=byId.get(event.item),answer=key.get(item.id);
      assert.equal(g.fields.Concept,item.concept,item.id+' concept');
      assert.equal(g.fields['Your first answer'],item.options[event.choice],item.id+' first choice');
      assert.equal(g.fields['Correct answer'],item.options[answer],item.id+' correct choice');
      assert.equal(g.fields['First try'],event.choice===answer?'correct':'needs review',item.id+' first grade');
    }
  });
  check('notes_bind_the_reviewed_explanation_and_transfer_to_each_question',()=>{
    const {groups}=noteGroups(data.notes);
    for(const [index,g]of groups.entries()){
      const item=byId.get(events[index].item);
      assert.equal(g.fields.Explanation,item.explanation,item.id+' explanation');
      assert.equal(g.fields['Apply the idea'],item.transfer,item.id+' transfer');
    }
  });
  check('notes_keep_practice_answers_separate_from_original_choices',()=>{
    const {groups}=noteGroups(data.notes);
    for(const [index,g]of groups.entries()){
      const event=events[index],item=byId.get(event.item);
      if(event.choice!==key.get(item.id)){
        assert.equal(g.fields['Practice answer'],item.options[key.get(item.id)],item.id+' retry');
        assert.equal(g.fields['Practice result'],'correct on retry',item.id+' retry grade');
      }else{
        assert.equal(g.fields['Practice answer'],undefined,item.id+' must not acquire a retry');
        assert.equal(g.fields['Practice result'],undefined,item.id+' must not acquire a retry grade');
      }
    }
  });
  check('notes_preserve_score_model_labels_and_course_attribution',()=>{
    const lines=data.notes.split(/\r?\n/);
    assert.equal(lines[0],'RecallWeave — study notes');assert.equal(lines[1],expected.title);
    assert(lines.includes('6 of 12 connections correct on the first try.'));
    assert(lines.includes('Complete: 6 of 6 practice answers recorded; 6 correct on retry.'));
    assert(lines.includes('ESTIMATED MASTERY — MODEL STATE, NOT A GRADE'));
    for(const concept of expected.concepts)assert(lines.includes(concept+': '+Math.round(data.traces[0].mastery[concept]*100)+'%'));
    assert(lines.includes(expected.attribution));assert(lines.includes(expected.license));
  });
  return checks;
}
const positive=semantics(payload);
const missedPositions=events.map((e,i)=>e.choice!==key.get(e.item)?i:-1).filter(i=>i>=0);
const pair=missedPositions.flatMap((a,i)=>missedPositions.slice(i+1).map(b=>[a,b])).find(([a,b])=>{
  const av=events[a].choice,bv=events[b].choice;
  return av!==bv&&bv!==key.get(events[a].item)&&av!==key.get(events[b].item)
    &&byId.get(events[a].item).options[av]!==byId.get(events[b].item).options[bv];
});
assert(pair,'Two wrong choices with a score-preserving swap must exist');
const correctCount=list=>list.filter(e=>e.choice===key.get(e.item)).length;
const controlResults=[];
function control(name,mutate,requiredFailure){
  const data=structuredClone(payload),detail=mutate(data),checks=semantics(data);
  const failures=checks.filter(c=>!c.pass);
  assert(failures.some(c=>c.name===requiredFailure),name+' must reject on the intended semantic identity boundary');
  controlResults.push({name,admissionBoundary:'In-memory mutation after immutable input admission; production files and raw receipts are not changed. Hash mismatch is not used as the rejection oracle.',detail,checks,failures:failures.map(c=>c.name),rejected:true});
}
control('balanced_wrong_first_choices_swapped_between_trace_records',data=>{
  for(const t of data.traces){
    [t.firstAnswers[pair[0]].choice,t.firstAnswers[pair[1]].choice]=[t.firstAnswers[pair[1]].choice,t.firstAnswers[pair[0]].choice];
    assert.equal(t.firstAnswers.length,12);assert.equal(correctCount(t.firstAnswers),6);
  }
  return {positions:pair,retainedAnswers:12,retainedCorrectCount:6};
},'all_three_traces_preserve_recorded_canonical_first_answers');
control('balanced_wrong_first_answer_text_swapped_between_note_blocks',data=>{
  const {lines,groups}=noteGroups(data.notes),[a,b]=pair.map(i=>groups[i].lineNumbers['Your first answer']);
  [lines[a],lines[b]]=[lines[b],lines[a]];data.notes=lines.join('\n');
  const after=noteGroups(data.notes);
  assert.equal(after.groups.length,12);assert.equal(after.groups.filter(g=>g.fields['First try']==='correct').length,6);
  return {positions:pair,retainedQuestionBlocks:12,retainedCorrectGradeLabels:6,summaryUnchanged:true};
},'notes_pair_first_choice_correct_choice_and_grade_per_question');
control('complete_practice_tuples_reordered_with_same_items_and_correct_count',data=>{
  const answers=data.traces[2].practice.answers;[answers[0],answers[1]]=[answers[1],answers[0]];
  assert.equal(answers.length,6);assert.equal(correctCount(answers),6);
  return {retainedRetryCount:6,retainedCorrectRetries:6,retainedTupleSet:true};
},'first_paused_and_completed_practice_keep_order_and_correct_identity');
const result={schema:'recall-boolean-independent-export-receiving.v1',reviewer:'/root/coordination',kind:'Independent semantic receiving of recorded actual-browser export bytes',packet,authorReceiptSha256:sha(authorBytes),recordedAuthorSource:author.sourceBefore,recordedBrowser:author.browser,recordedBrowserTimes:{startedAt:author.startedAt,finishedAt:author.finishedAt},expectedDemoSha256:expectedDemo,blindReviewSha256:sha(blindBytes),reviewedCourseSha256:sha(expectedBytes),verifiedDownloadedFiles:files.map(({path,bytes,sha256})=>({path,bytes,sha256})),observedUiEvents:events,independentlyDerivedMissedItems:missed.map(e=>e.item),positive,negativeControls:controlResults,status:positive.every(c=>c.pass)?'PASS':'FAIL',existingProductionTestsRerun:0,independentSemanticGroupsExecuted:positive.length,browserExecutionsByReviewer:0,productionModulesImported:0,limitations:['This review receives the actual completed downloads and recorded browser interactions; it does not relabel the author browser run as an independently executed browser run.','Model values are checked for preservation across practice; no empirical learning efficacy or independent model-parameter calibration is claimed.','Old startup and cleanup failures remain separate author receipts and are not replaced by this positive byte-receiving record.']};
assert(!fs.existsSync(output),'Receiving output must be a new owned path');
fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'receipt.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:result.status,positivePassed:positive.filter(c=>c.pass).length,positiveTotal:positive.length,controlsRejected:controlResults.filter(c=>c.rejected).length,receipt:path.join(output,'receipt.json'),receiptSha256:sha(fs.readFileSync(path.join(output,'receipt.json')))}));
if(result.status!=='PASS')process.exitCode=1;
