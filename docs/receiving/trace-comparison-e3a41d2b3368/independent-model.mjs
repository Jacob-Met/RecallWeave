import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath, pathToFileURL} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../candidate');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=b=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');
const dependencies={
 'src/deck.mjs':'f0f8a4b234489c2388f427633f548d56c6ed4c03',
 'src/trace-archive.mjs':'9976bba47897f7d883cd6d5da177a2a5db3c6b06',
 'src/knowledge.mjs':'1a3a714dc0cf643b911ec196265746fb61c1f5cc',
 'src/review.mjs':'06c76298e0cc60fabedfb8514f5e4851d2381005'
};
const pins=()=>Object.fromEntries([...Object.keys(dependencies),'src/trace-comparison.mjs'].map(name=>{
 const bytes=fs.readFileSync(path.join(root,name));return[name,{sha256:sha(bytes),git_blob:blob(bytes),bytes:bytes.length}];
}));
const before=pins();
for(const [name,expected]of Object.entries(dependencies))assert.equal(before[name].git_blob,expected,name);
assert.equal(before['src/trace-comparison.mjs'].sha256,'c243b3bac7e4a7469d2f84a9c452423c68f9131dd3f405080ff8526f85a34326');
const from=name=>import(pathToFileURL(path.join(root,'src',name)).href);
const {inspectTraceForComparison:inspect,compareTraceArchives:compare}=await from('trace-comparison.mjs');
const {validateDeck}=await from('deck.mjs');
const {createTraceArchive,readTraceArchive}=await from('trace-archive.mjs');
const {initialMastery,updateMastery}=await from('knowledge.mjs');
const {createReview,beginPractice,answerPractice}=await from('review.mjs');
const clone=structuredClone;
const rawDeck={
 title:'Independent Ω trace course',attribution:'Authored receiving fixture',license:'Private test fixture',
 concepts:['Foundation','Transfer'],
 items:[
  {id:'item-z',concept:'Foundation',prerequisites:[],prompt:'Choose zero <img src=x onerror=alert(1)>',options:['Zero','One','Two'],answer:0,explanation:'Zero is this fixture answer.',transfer:'Explain your choice.'},
  {id:'item-a',concept:'Transfer',prerequisites:['Foundation'],prompt:'Choose one.',options:['Zero','One','Two'],answer:1,explanation:'One is this fixture answer.',transfer:'Use another example.'},
  {id:'__proto__',concept:'Foundation',prerequisites:[],prompt:'Choose two.',options:['Zero','One','Two'],answer:2,explanation:'Two is this fixture answer.',transfer:'Name the connection.'},
  {id:'constructor',concept:'Transfer',prerequisites:['Foundation'],prompt:'Choose zero again.',options:['Zero','One','Two'],answer:0,explanation:'Zero is this fixture answer.',transfer:'Consider a counterexample.'}
 ]
};
const deck=validateDeck(rawDeck);
function make({course=deck,choices=course.items.map(item=>item.answer),order=course.items.map(item=>item.id),practice=null,savedAt='2026-10-08T12:00:00.000Z'}={}){
 const byId=new Map(course.items.map((item,index)=>[item.id,{item,choice:choices[index]}]));
 const answers=order.map(id=>({item:id,choice:byId.get(id).choice}));
 const mastery=initialMastery(course.concepts);
 for(const answer of answers){const item=byId.get(answer.item).item;mastery[item.concept]=updateMastery(mastery[item.concept],answer.choice===item.answer);}
 const review=createReview(course.items,answers);
 let round=practice===null?null:beginPractice(review);
 if(round)for(const choice of practice){const item=round.items[round.answers.length];round=answerPractice(round,item.id,choice);}
 return createTraceArchive({deck:course,answers,mastery,practice:round,savedAt}).text;
}
const rewrite=(text,change)=>{const value=JSON.parse(text);change(value);return JSON.stringify(value);};
const results=[];
const check=(name,fn)=>{try{results.push({name,passed:true,evidence:fn()});}catch(error){results.push({name,passed:false,error:error.stack});}};
const ids=deck.items.map(item=>item.id);
const row=(comparison,id)=>comparison.rows.find(item=>item.id===id);
check('native generated archives expose immutable completed summaries',()=>{
 const text=make(),saved=inspect(text),c=compare(text,text);
 assert.equal(saved.course.questionCount,4);assert.equal(saved.summary.correctFirst,4);
 assert.equal(saved.summary.firstAnswers,4);assert.equal(saved.summary.practiceStarted,false);
 assert.deepEqual(c.changes,{firstAnswers:0,practice:0});
 assert.equal(c.rows.length,4);assert.deepEqual(c.rows.map(item=>item.id),ids);
 assert.equal(saved.savedAt,'2026-10-08T12:00:00.000Z');
 return {questions:4,correctFirst:4,changedAnswers:0,changedPractice:0};
});
check('canonical question identity is independent of first-answer order',()=>{
 const a=make({choices:[1,1,2,0],order:['__proto__','item-z','constructor','item-a']});
 const b=make({choices:[1,1,2,0],order:['item-a','constructor','item-z','__proto__']});
 const c=compare(a,b);assert.deepEqual(c.rows.map(item=>item.id),ids);
 assert.deepEqual(c.changes,{firstAnswers:0,practice:0});
 assert.equal(row(c,'item-z').left.first.position,2);assert.equal(row(c,'item-z').right.first.position,3);
 assert.equal(row(c,'__proto__').left.first.position,1);assert.equal(row(c,'__proto__').right.first.position,4);
 assert.equal(row(c,'constructor').left.first.choice,0);
 return {canonicalIds:c.rows.map(item=>item.id),positionsDiffer:true,answerChanges:0};
});
check('different wrong canonical options count as changed answers',()=>{
 const c=compare(make({choices:[1,1,2,0]}),make({choices:[2,1,2,0]}));
 assert.equal(c.left.summary.correctFirst,c.right.summary.correctFirst);
 assert.equal(c.changes.firstAnswers,1);assert.equal(c.changes.practice,0);
 const q=row(c,'item-z');assert.equal(q.left.first.correct,false);assert.equal(q.right.first.correct,false);
 assert.equal(q.left.first.choice,1);assert.equal(q.right.first.choice,2);assert.equal(q.firstChanged,true);
 return {bothWrong:true,choices:[1,2],changedAnswers:1};
});
check('unstarted, pending, answered and not-needed practice remain distinct',()=>{
 const choices=[1,1,0,2],a=make({choices}),b=make({choices,practice:[0]});
 const c=compare(a,b);
 assert.equal(c.changes.firstAnswers,0);assert.equal(c.changes.practice,3);
 assert.equal(row(c,'item-z').left.practice.state,'unstarted');
 assert.deepEqual(row(c,'item-z').right.practice,{state:'answered',choice:0,correct:true});
 assert.deepEqual(row(c,'__proto__').right.practice,{state:'pending',choice:null,correct:null});
 assert.deepEqual(row(c,'constructor').right.practice,{state:'pending',choice:null,correct:null});
 assert.deepEqual(row(c,'item-a').right.practice,{state:'not-needed',choice:null,correct:null});
 assert.equal(c.right.summary.practiceAnswers,1);assert.equal(c.right.summary.practiceTotal,3);
 assert.equal(c.right.summary.correctFirst,1);
 return {practiceChanges:3,firstChanges:0,correctFirstUnchanged:1};
});
check('distinct wrong practice choices never rewrite first answers or estimates',()=>{
 const choices=[1,1,2,0],a=make({choices,practice:[1]}),b=make({choices,practice:[2]});
 const c=compare(a,b),q=row(c,'item-z');
 assert.equal(c.changes.firstAnswers,0);assert.equal(c.changes.practice,1);
 assert.equal(q.left.practice.correct,false);assert.equal(q.right.practice.correct,false);
 assert.equal(q.left.practice.choice,1);assert.equal(q.right.practice.choice,2);
 assert.deepEqual(q.left.first,q.right.first);assert.equal(q.left.first.correct,false);
 assert.deepEqual(readTraceArchive(a,deck).mastery,readTraceArchive(b,deck).mastery);
 return {practiceChoices:[1,2],firstChoice:1,modelEstimatesUnchanged:true};
});
check('all-correct empty practice retains the recorded start without invented retries',()=>{
 const c=compare(make(),make({practice:[]}));
 assert.equal(c.left.summary.practiceStarted,false);assert.equal(c.right.summary.practiceStarted,true);
 assert.equal(c.right.summary.practiceAnswers,0);assert.equal(c.right.summary.practiceTotal,0);
 assert.ok(c.rows.every(item=>item.right.practice.state==='not-needed'));
 assert.deepEqual(c.changes,{firstAnswers:0,practice:0});
 return {emptyRoundStarted:true,eligibleRetries:0,answerDifferences:0};
});
check('A and B remain explicit even when save times run backwards',()=>{
 const a=make({savedAt:'2026-10-08T13:00:00.000Z'}),b=make({savedAt:'2025-01-01T00:00:00.000Z'});
 const c=compare(a,b);
 assert.equal(c.left.savedAt,'2026-10-08T13:00:00.000Z');assert.equal(c.right.savedAt,'2025-01-01T00:00:00.000Z');
 assert.deepEqual(c.changes,{firstAnswers:0,practice:0});
 return {left:c.left.savedAt,right:c.right.savedAt,sorted:false};
});
check('exact raw course identity rejects semantically similar versions',()=>{
 const a=make();
 const mutations=[
  d=>{d.title+=' ';},d=>{d.license+=' changed';},d=>{d.attribution+=' updated';},
  d=>{d.items[0].prompt+=' changed';},
  d=>{[d.items[0].options[0],d.items[0].options[1]]=[d.items[0].options[1],d.items[0].options[0]];d.items[0].answer=1;},
  d=>{d.items.reverse();},d=>{d.concepts.reverse();},d=>{d.extension={source:'author note'};}
 ];
 for(const mutate of mutations){const next=clone(deck);mutate(next);validateDeck(next);const b=make({course:next});inspect(b);assert.throws(()=>compare(a,b),Error);}
 const legacy=clone(deck);delete legacy.format;const old=make({course:legacy});inspect(old);assert.throws(()=>compare(old,a),Error);
 assert.deepEqual(compare(old,old).changes,{firstAnswers:0,practice:0});
 return {differentVersionsRejected:9,unversionedSelfComparisonAccepted:true};
});
check('object key order and JSON whitespace do not invent a course change',()=>{
 const text=make({choices:[1,1,2,0],practice:[0]});
 const reverseKeys=v=>Array.isArray(v)?v.map(reverseKeys):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).reverse().map(([k,x])=>[k,reverseKeys(x)])):v;
 const reordered=JSON.stringify(reverseKeys(JSON.parse(text)),null,3).replaceAll('\n','\r\n');
 const c=compare(text,reordered);assert.deepEqual(c.changes,{firstAnswers:0,practice:0});
 assert.equal(c.rows[0].prompt,deck.items[0].prompt);
 return {objectKeysReordered:true,crlfJsonAccepted:true,literalPromptPreserved:true};
});
check('native archive admission refuses corrupt completed history and model data',()=>{
 const good=make({choices:[1,1,0,0],practice:[0]}),invalids=[
  v=>{v.mastery.Foundation+=Number.EPSILON;},v=>{v.model.name='other-model';},
  v=>{v.model.parameters.prior=0.99;},v=>{v.firstAnswers[1]=clone(v.firstAnswers[0]);},
  v=>{v.firstAnswers.pop();},v=>{v.firstAnswers[0].choice=99;},
  v=>{v.firstAnswers[0].choice='1';},v=>{v.firstAnswers[0].item='missing';},
  v=>{v.practice.answers=[{item:'__proto__',choice:2}];},
  v=>{v.practice.answers.push(clone(v.practice.answers[0]));},
  v=>{v.savedAt='2026-10-08T12:00:00+00:00';},v=>{v.version=2;},v=>{v.extra=true;}
 ];
 for(const mutate of invalids){const bad=rewrite(good,mutate);assert.throws(()=>inspect(bad),Error);assert.throws(()=>compare(good,bad),Error);}
 for(const bad of ['', '[]', 'null', '{', 42, ' '.repeat(2*1024*1024+1)])assert.throws(()=>inspect(bad),Error);
 return {nativeCorruptionsRejected:invalids.length,invalidOrOversizeInputsRejected:6};
});
check('the separate reader validates course content before using embedded archived content',()=>{
 const good=make();
 const mutations=[
  v=>{v.deck.title='';},v=>{v.deck.attribution='';},v=>{v.deck.items[0].prompt='';},
  v=>{v.deck.items[0].options[1]=v.deck.items[0].options[0];},
  v=>{v.deck.items[0].concept='missing';},
  v=>{v.deck.items[0].prerequisites=['Transfer'];}
 ];
 for(const mutate of mutations){const bad=rewrite(good,mutate);assert.throws(()=>inspect(bad),Error);}
 return {invalidEmbeddedCoursesRejected:mutations.length};
});
check('nested result values are immutable and preserve literal data and reserved IDs',()=>{
 const text=make({choices:[1,1,2,0]}),copy=text,c=compare(text,text),s=inspect(text);
 const frozen=value=>{if(value&&typeof value==='object'){assert.ok(Object.isFrozen(value));Object.values(value).forEach(frozen);}};
 frozen(c);frozen(s);
 assert.equal(row(c,'__proto__').answer,2);assert.equal(row(c,'constructor').answer,0);
 assert.equal(c.rows[0].prompt,deck.items[0].prompt);assert.equal(text,copy);
 assert.throws(()=>{c.rows[0].options[0]='changed';},TypeError);
 assert.throws(()=>{c.rows[0].left.first.choice=2;},TypeError);
 assert.throws(()=>{c.course.concepts.push('new');},TypeError);
 assert.ok(!Object.values(c).some(v=>typeof v==='function'));
 return {deepFrozen:true,reservedIdsPreserved:true,literalTextPreserved:true,liveSessionMethods:false};
});
const after=pins();assert.deepEqual(after,before);
const receipt={reviewer:'autonomous-e3a41d2b3368/root',sourceParent:'c00bd1f31c353698957d2ebad311334536cdef98',
 finishedAt:new Date().toISOString(),node:process.version,platform:process.platform,architecture:process.arch,
 harnessSha256:sha(fs.readFileSync(fileURLToPath(import.meta.url))),source:before,sourceUnchanged:true,
 passed:results.filter(x=>x.passed).length,failed:results.filter(x=>!x.passed).length,results,
 boundary:'Independent model/API receiving. Fixtures are created by the unchanged native archive/review/BKT functions; this does not substitute for a real browser or learner efficacy evidence.'};
const output=path.join(here,'model-v1-result.json');fs.writeFileSync(output,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(receipt,null,2));process.exitCode=receipt.failed?1:0;
