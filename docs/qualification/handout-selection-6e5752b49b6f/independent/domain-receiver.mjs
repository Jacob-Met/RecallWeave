import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

const args=process.argv.slice(2);
assert.equal(args.length,3,'usage: node receive_model.mjs BASELINE_ROOT CANDIDATE_ROOT OUTPUT');
const [baselineRoot,candidateRoot,out]=args.map(x=>resolve(x));
mkdirSync(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const git=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const baselineSource=readFileSync(join(baselineRoot,'src/course-handout.mjs'));
const baselineDeck=readFileSync(join(baselineRoot,'src/deck.mjs'));
assert.equal(git(baselineSource),'1da93ffca03186aca71189541bb85c4b5b972b92');
assert.equal(git(baselineDeck),'f0f8a4b234489c2388f427633f548d56c6ed4c03');
const beforePaths=[join(baselineRoot,'src/course-handout.mjs'),join(baselineRoot,'src/deck.mjs'),
 join(candidateRoot,'src/course-handout.mjs'),join(candidateRoot,'src/deck.mjs')];
const before=beforePaths.map(path=>({path,sha256:sha(readFileSync(path)),git_blob:git(readFileSync(path))}));
assert.equal(before[3].git_blob,'f0f8a4b234489c2388f427633f548d56c6ed4c03','shared validator must remain exact');
const legacy=await import(pathToFileURL(beforePaths[0]));
const candidate=await import(pathToFileURL(beforePaths[2]));
const ids=['  edge  ','__proto__','e\u0301','é','constructor','0'];
const concepts=['RECEIVER_C','RECEIVER_A','RECEIVER_D','RECEIVER_B'];
const assignment=['RECEIVER_B','RECEIVER_D','RECEIVER_C','RECEIVER_A','RECEIVER_D','RECEIVER_B'];
const fixture={
 format:'recallweave-deck/1',
 title:'Receiving 170 — literal <script> title',
 attribution:'Receiver-created fixture\nSource: literal <&> and \u2028 text',
 license:'CC0 receiving fixture only',
 concepts:[...concepts],
 items:ids.map((id,i)=>({
  id,concept:assignment[i],prerequisites:assignment[i]==='RECEIVER_B'?['RECEIVER_A']:assignment[i]==='RECEIVER_A'?['RECEIVER_C']:[],
  prompt:'QMARK_'+i+'_PROMPT </script><img src=x> & \u2029',
  options:Array.from({length:2+i%5},(_,j)=>'QMARK_'+i+'_OPTION_'+j),
  answer:(i+1)%(2+i%5),explanation:'SECRET_EXPLANATION_'+i+'_MUST_STAY_IN_KEY',
  transfer:'QMARK_'+i+'_TRANSFER\nliteral spacing  retained'
 }))
};
const deepFreeze=x=>{if(x&&typeof x==='object'){for(const v of Object.values(x))deepFreeze(v);Object.freeze(x);}return x;};
deepFreeze(fixture);
const fixtureBytes=JSON.stringify(fixture);
writeFileSync(join(out,'receiver-fixture.json'),fixtureBytes+'\n');
const groups=[];
const result={receiver:'recall170-independent-model/1',candidate_blind:true,node:process.version,groups,before};
function group(name,fn){const start=performance.now();const details=fn();groups.push({name,passed:true,milliseconds:performance.now()-start,...details});}
function expected(deck,kind,selection){
 const chosen=new Set(selection);
 const included=deck.items.map((item,index)=>({item,index})).filter(({item})=>chosen.has(item.id));
 return {kind,title:deck.title,attribution:deck.attribution,license:deck.license,
  concepts:deck.concepts.filter(c=>included.some(({item})=>item.concept===c)),
  questions:included.map(({item,index})=>{
   const q={id:item.id,number:index+1,prompt:item.prompt,options:[...item.options],transfer:item.transfer};
   if(kind==='answer-key'){q.answer=item.answer;q.explanation=item.explanation;}
   return q;
  })};
}
function payload(html){
 const start='<script id="handout-data" type="application/json">';
 const index=html.indexOf(start);
 assert.ok(index>=0);assert.equal(html.indexOf(start,index+1),-1);
 const end=html.indexOf('</script>',index+start.length);assert.ok(end>index);
 const body=html.slice(index+start.length,end);
 assert.ok(!body.includes('<')&&!body.includes('>')&&!body.includes('&'),'payload escapes markup');
 return JSON.parse(body);
}
function checkProjection(actual,want){
 assert.deepEqual(actual,want);
 for(const q of actual.questions){
  assert.equal(Object.hasOwn(q,'answer'),actual.kind==='answer-key');
  assert.equal(Object.hasOwn(q,'explanation'),actual.kind==='answer-key');
 }
}
function checkDocument(html,deck,kind,selection){
 const want=expected(deck,kind,selection);
 checkProjection(payload(html),want);
 for(let i=0;i<deck.items.length;i++){
  if(!selection.includes(deck.items[i].id))assert.ok(!html.includes('QMARK_'+i+'_'),'unselected record appears in whole HTML');
  if(kind==='worksheet'||!selection.includes(deck.items[i].id))
   assert.ok(!html.includes('SECRET_EXPLANATION_'+i+'_'),'private explanation appears in whole HTML');
 }
 return want;
}
group('old full documents and all-selected permutations remain byte-exact',()=>{
 const hashes=[];
 for(const kind of ['worksheet','answer-key']){
  const old=legacy.createHandoutDocument(fixture,kind);
  const model=legacy.createHandout(fixture,kind);
  writeFileSync(join(out,'legacy-'+kind+'.html'),old);
  for(const select of [undefined,[...ids],[...ids].reverse(),[ids[4],ids[2],ids[0],ids[5],ids[1],ids[3]]]){
   assert.equal(candidate.createHandoutDocument(fixture,kind,select),old);
   assert.deepEqual(candidate.createHandout(fixture,kind,select),model);
  }
  hashes.push({kind,bytes:Buffer.byteLength(old),sha256:sha(old)});
 }
 assert.deepEqual(candidate.createHandout(fixture),legacy.createHandout(fixture));
 assert.equal(candidate.createHandoutDocument(fixture),legacy.createHandoutDocument(fixture));
 return {kinds:2,variantsPerKind:4,legacy:hashes};
});
group('all 63 subsets retain source indices and only their own concepts and key records',()=>{
 let projections=0;
 for(let mask=1;mask<64;mask++){
  const selection=ids.filter((_,i)=>mask&(1<<i));
  for(const chosen of [selection,[...selection].reverse(),[...selection.slice(1),selection[0]]]){
   const frozen=Object.freeze([...chosen]);const snapshot=JSON.stringify(frozen);
   for(const kind of ['worksheet','answer-key']){
    const got=candidate.createHandout(fixture,kind,frozen);
    checkProjection(got,expected(fixture,kind,chosen));
    assert.ok(Object.isFrozen(got)&&Object.isFrozen(got.questions)&&Object.isFrozen(got.concepts));
    for(const q of got.questions)assert.ok(Object.isFrozen(q)&&Object.isFrozen(q.options));
    checkDocument(candidate.createHandoutDocument(fixture,kind,frozen),fixture,kind,chosen);
    assert.equal(JSON.stringify(frozen),snapshot);
    projections++;
   }
  }
 }
 assert.equal(JSON.stringify(fixture),fixtureBytes);
 const isolated=candidate.createHandout(fixture,'worksheet',[ids[0]]);
 assert.deepEqual(isolated.concepts,['RECEIVER_B'],'selection is a handout, not prerequisite closure');
 assert.equal(isolated.questions[0].number,1);
 const fifth=candidate.createHandout(fixture,'answer-key',[ids[4]]);
 assert.equal(fifth.questions[0].number,5);
 return {subsets:63,projections,prerequisiteConceptsNotAutoAdded:true};
});
group('strict exact-ID dense-array admission refuses without mutation',()=>{
 const sparse=Array(2);sparse[1]=ids[0];
 const trailing=[ids[0]];trailing.length=2;
 const bad=[null,{},new Set([ids[0]]),ids[0],0,false,1n,Symbol('id'),new Uint8Array([0]),
  [],[''],['missing'],['edge'],['  edge '],[ids[0],ids[0]],[ids[1],ids[1]],
  [null],[undefined],[1],[false],[new String(ids[0])],sparse,trailing];
 let refusals=0;
 for(const selection of bad){
  const descriptors=selection&&typeof selection==='object'?Object.getOwnPropertyDescriptors(selection):null;
  for(const kind of ['worksheet','answer-key'])for(const fn of [candidate.createHandout,candidate.createHandoutDocument]){
   assert.throws(()=>fn(fixture,kind,selection));refusals++;
   assert.equal(JSON.stringify(fixture),fixtureBytes);
   if(descriptors)assert.deepEqual(Object.getOwnPropertyDescriptors(selection),descriptors);
  }
 }
 for(const select of [[ids[2]],[ids[3]],[ids[1]],[ids[5]]])
  assert.equal(candidate.createHandout(fixture,'worksheet',select).questions[0].id,select[0]);
 for(const invalidKind of [null,'','key','Worksheet',0])
  for(const fn of [candidate.createHandout,candidate.createHandoutDocument])
   assert.throws(()=>fn(fixture,invalidKind,[ids[0]]));
 return {selectionCases:bad.length,selectionRefusals:refusals,invalidKindRefusals:10,unicodeNormalizationNotCoerced:true};
});
group('projection owns copies and does not mutate source or caller selection',()=>{
 const deck=structuredClone(fixture),selection=[ids[4],ids[0]],selectionBefore=[...selection],deckBefore=JSON.stringify(deck);
 const sheet=candidate.createHandout(deck,'worksheet',selection);
 const key=candidate.createHandout(deck,'answer-key',selection);
 assert.deepEqual(selection,selectionBefore);assert.equal(JSON.stringify(deck),deckBefore);
 const snapshot=JSON.stringify({sheet,key});
 deck.items[0].prompt='changed';deck.items[0].options[0]='changed option';deck.concepts.reverse();selection.reverse();selection.push(ids[5]);
 assert.equal(JSON.stringify({sheet,key}),snapshot);
 assert.throws(()=>sheet.questions[0].options.push('mutation'));
 assert.throws(()=>key.questions[0].explanation='mutation');
 return {sourceAndSelectionCopied:true,outputFrozen:true};
});
group('maximum admitted 100-question deck preserves sparse original numbering',()=>{
 const deck={...structuredClone(fixture),concepts:Array.from({length:32},(_,i)=>'MAX_C_'+i),
  items:Array.from({length:100},(_,i)=>({id:'max-'+i,concept:'MAX_C_'+i%32,prerequisites:[],
   prompt:'MAX_PROMPT_'+i,options:['MAX_A_'+i,'MAX_B_'+i],answer:i%2,explanation:'MAX_SECRET_'+i,transfer:'MAX_TRANSFER_'+i}))};
 deepFreeze(deck);
 const selections=[['max-99'],['max-0','max-99'],deck.items.filter((_,i)=>i%7===0).map(x=>x.id).reverse(),deck.items.map(x=>x.id).reverse()];
 for(const ids of selections)for(const kind of ['worksheet','answer-key']){
  checkProjection(candidate.createHandout(deck,kind,ids),expected(deck,kind,ids));
  assert.deepEqual(payload(candidate.createHandoutDocument(deck,kind,ids)),expected(deck,kind,ids));
 }
 for(const kind of ['worksheet','answer-key'])
  assert.equal(candidate.createHandoutDocument(deck,kind,selections[3]),legacy.createHandoutDocument(deck,kind));
 return {questions:100,concepts:32,selections:4};
});
group('oracle sensitivity rejects six plausible projection corruptions and document leaks',()=>{
 const selection=[ids[1],ids[4]];
 const want=expected(fixture,'answer-key',selection);
 const mutate=[
 x=>{x.questions[0].number=1;},
 x=>{x.concepts=[...fixture.concepts];},
 x=>{x.questions.reverse();},
 x=>{x.questions[0].answer=(x.questions[0].answer+1)%x.questions[0].options.length;},
 x=>{delete x.questions[0].transfer;},
 x=>{x.questions.push(expected(fixture,'answer-key',[ids[5]]).questions[0]);}
 ];
 for(const f of mutate){const x=structuredClone(want);f(x);assert.throws(()=>checkProjection(x,want));}
 const html=candidate.createHandoutDocument(fixture,'worksheet',selection);
 assert.throws(()=>checkDocument(html+'\nQMARK_0_PROMPT',fixture,'worksheet',selection));
 assert.throws(()=>checkDocument(html+'\nSECRET_EXPLANATION_1_',fixture,'worksheet',selection));
 return {projectionMutants:6,wholeDocumentLeaks:2};
});
const after=before.map(x=>({path:x.path,sha256:sha(readFileSync(x.path)),git_blob:git(readFileSync(x.path))}));
assert.deepEqual(after,before);
result.after=after;result.passed=true;
writeFileSync(join(out,'receiving.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({passed:true,groups:groups.length,details:groups}));
