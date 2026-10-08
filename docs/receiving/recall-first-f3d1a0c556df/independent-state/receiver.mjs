import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {validateDeck} from './baseline-deck.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('./fixture-deck.json',import.meta.url),'utf8'));
assert.ok(process.env.RECALL_FIRST_MODULE,'exact frozen module path is required');
const api=await import(pathToFileURL(process.env.RECALL_FIRST_MODULE).href);
const {createRecall,currentRecall,writeRecall,revealRecall,judgeRecall,beginRevisit,recallSummary}=api;
const clone=x=>structuredClone(x);
const bytes=x=>JSON.stringify(x);
function unchanged(state,operation) {const before=bytes(state);assert.throws(operation);assert.equal(bytes(state),before);}
function next(state,operation) {const before=bytes(state);const result=operation();assert.equal(bytes(state),before);assert.notEqual(result,state);return result;}
function checked(state) {
 assert.ok(Object.isFrozen(state));assert.ok(Object.isFrozen(state.deck));
 for(const key of ['queue','first','revisit'])assert.ok(Object.isFrozen(state[key]),key);
 for(const row of [...state.first,...state.revisit]) {
  assert.ok(Object.isFrozen(row));assert.deepEqual(Object.keys(row).sort(),['item','judgment','text']);
 }
}
function finish(state,judgment,text='') {
 state=next(state,()=>writeRecall(state,text));state=next(state,()=>revealRecall(state));
 return next(state,()=>judgeRecall(state,judgment));
}
test('creation copies checked content and preserves source order despite IDs and prerequisite order',()=>{
 const input=clone(fixture),before=bytes(input),s=createRecall(input);
 assert.equal(bytes(input),before);
 assert.equal(s.pass,'first');assert.equal(s.index,0);assert.equal(s.revealed,false);assert.equal(s.draft,'');
 assert.deepEqual(s.queue,[0,1,2,3]);assert.deepEqual(s.first,[]);assert.deepEqual(s.revisit,[]);
 assert.equal(currentRecall(s).id,'z-start');
 assert.deepEqual(s.deck,validateDeck(fixture));checked(s);
 input.items[0].prompt='caller mutation';input.items.reverse();input.concepts.push('caller addition');
 assert.equal(currentRecall(s).prompt,fixture.items[0].prompt);assert.deepEqual(s.queue,[0,1,2,3]);
 assert.deepEqual(recallSummary(s),{completed:false,pass:'first',total:4,firstChecked:0,revisitChecked:0,markedFirst:0,revisitRemaining:0});
});
test('Reveal gates self-judgment and invalid transitions leave all prior snapshots exact',()=>{
 let s=createRecall(fixture);const history=[[s,bytes(s)]];
 unchanged(s,()=>judgeRecall(s,'ready'));unchanged(s,()=>beginRevisit(s));
 s=next(s,()=>writeRecall(s,'A deliberately incorrect answer accepted as personal text.'));history.push([s,bytes(s)]);
 s=next(s,()=>revealRecall(s));history.push([s,bytes(s)]);assert.equal(s.revealed,true);assert.equal(currentRecall(s).id,'z-start');
 unchanged(s,()=>revealRecall(s));unchanged(s,()=>writeRecall(s,'late replacement'));
 for(const label of ['correct','incorrect','READY','Revisit','',null,0])unchanged(s,()=>judgeRecall(s,label));
 s=next(s,()=>judgeRecall(s,'ready'));history.push([s,bytes(s)]);
 assert.deepEqual(s.first,[{item:'z-start',text:'A deliberately incorrect answer accepted as personal text.',judgment:'ready'}]);
 assert.equal(currentRecall(s).id,'a-next');assert.equal(s.draft,'');assert.equal(s.revealed,false);checked(s);
 for(const [prior,saved] of history)assert.equal(bytes(prior),saved);
 assert.deepEqual(Object.keys(recallSummary(s)).sort(),['completed','firstChecked','markedFirst','pass','revisitChecked','revisitRemaining','total']);
});
test('optional answer is literal and bounded by UTF16 code units with atomic rejection',()=>{
 let s=createRecall(fixture);
 for(const text of ['', '  \n\t  ', '<b>my own text</b>', 'x'.repeat(4000),'😀'.repeat(2000)]) {
  const changed=next(s,()=>writeRecall(s,text));assert.equal(changed.draft,text);checked(changed);
 }
 for(const bad of ['x'.repeat(4001),'😀'.repeat(2000)+'x','😀'.repeat(2001),null,undefined,42,[],{}])unchanged(s,()=>writeRecall(s,bad));
 s=next(s,()=>revealRecall(s));s=next(s,()=>judgeRecall(s,'revisit'));
 assert.deepEqual(s.first,[{item:'z-start',text:'',judgment:'revisit'}]);
});
test('first pass visits each source item exactly once and preserves self-reported labels',()=>{
 let s=createRecall(fixture);const observed=[];
 const labels=['revisit','ready','revisit','ready'];const texts=['first z',fixture.items[1].options[0],'','not the reference'];
 for(let i=0;i<4;i++) {
  observed.push(currentRecall(s).id);assert.equal(s.revealed,false);assert.equal(s.draft,'');
  s=finish(s,labels[i],texts[i]);checked(s);
 }
 assert.deepEqual(observed,['z-start','a-next','m-middle','b-last']);assert.equal(new Set(observed).size,4);
 assert.equal(currentRecall(s),null);
 assert.deepEqual(s.first,observed.map((item,i)=>({item,text:texts[i],judgment:labels[i]})));
 assert.deepEqual(recallSummary(s),{completed:true,pass:'first',total:4,firstChecked:4,revisitChecked:0,markedFirst:2,revisitRemaining:2});
 for(const op of [()=>writeRecall(s,'late'),()=>revealRecall(s),()=>judgeRecall(s,'ready')])unchanged(s,op);
});
test('one bounded revisit retains both records and may finish with one self-flag still marked',()=>{
 let s=createRecall(fixture);
 for(const [label,text] of [['revisit','first z'],['ready','first a'],['revisit','first m'],['ready','first b']])s=finish(s,label,text);
 const original=s,firstBytes=bytes(s.first);s=next(s,()=>beginRevisit(s));
 assert.equal(s.pass,'revisit');assert.deepEqual(s.queue,[0,2]);assert.equal(currentRecall(s).id,'z-start');
 assert.equal(s.index,0);assert.equal(s.draft,'');assert.equal(s.revealed,false);unchanged(s,()=>beginRevisit(s));
 s=finish(s,'ready','revision z');assert.equal(currentRecall(s).id,'m-middle');
 assert.equal(recallSummary(s).revisitRemaining,1);
 s=finish(s,'revisit','keep m open');
 assert.equal(currentRecall(s),null);assert.equal(bytes(s.first),firstBytes);assert.equal(bytes(original.first),firstBytes);
 assert.deepEqual(s.revisit,[{item:'z-start',text:'revision z',judgment:'ready'},{item:'m-middle',text:'keep m open',judgment:'revisit'}]);
 assert.deepEqual(recallSummary(s),{completed:true,pass:'revisit',total:4,firstChecked:4,revisitChecked:2,markedFirst:2,revisitRemaining:1});
 unchanged(s,()=>beginRevisit(s));unchanged(s,()=>judgeRecall(s,'ready'));unchanged(s,()=>revealRecall(s));checked(s);
});
test('no-flag completion has no revisit and explicit restart leaves completed history intact',()=>{
 let s=createRecall(fixture);for(let i=0;i<4;i++)s=finish(s,'ready');
 assert.equal(recallSummary(s).completed,true);assert.equal(recallSummary(s).revisitRemaining,0);unchanged(s,()=>beginRevisit(s));
 const prior=bytes(s);const fresh=createRecall(s.deck);assert.equal(bytes(s),prior);assert.equal(s.first.length,4);
 assert.equal(currentRecall(fresh).id,'z-start');assert.equal(fresh.pass,'first');
 assert.deepEqual(fresh.first,[]);assert.deepEqual(fresh.revisit,[]);assert.equal(fresh.draft,'');assert.equal(fresh.revealed,false);checked(fresh);
});
test('one-item deck still requires Reveal and cannot loop into a third pass',()=>{
 const one=clone(fixture);one.concepts=['foundation'];one.items=[clone(fixture.items[1])];
 let s=createRecall(one);assert.deepEqual(s.queue,[0]);s=finish(s,'revisit','uncertain');
 s=beginRevisit(s);assert.deepEqual(s.queue,[0]);unchanged(s,()=>judgeRecall(s,'revisit'));
 s=finish(s,'revisit','still uncertain');assert.equal(currentRecall(s),null);
 assert.deepEqual(recallSummary(s),{completed:true,pass:'revisit',total:1,firstChecked:1,revisitChecked:1,markedFirst:1,revisitRemaining:1});
 unchanged(s,()=>beginRevisit(s));assert.equal(s.first.length,1);assert.equal(s.revisit.length,1);
});
test('invalid decks preserve exact existing validator errors and input bytes',()=>{
 const variants=[null,[],{}, {...clone(fixture),format:'unsupported'}];
 const add=fn=>{const d=clone(fixture);fn(d);variants.push(d);};
 add(d=>d.title=' ');add(d=>d.items=[]);add(d=>d.concepts.push('uncovered'));
 add(d=>d.items[1].id=d.items[0].id);add(d=>d.items[0].answer=2);
 add(d=>d.items[0].prerequisites=['extension']);add(d=>d.items[1].prerequisites=['extension']);
 add(d=>d.items[0].options=['same','same']);add(d=>d.items=Array.from({length:101},(_,i)=>({...clone(d.items[0]),id:String(i)})));
 for(const d of variants) {
  const before=bytes(d);let expected;try{validateDeck(d);}catch(e){expected=e.message;}
  assert.equal(typeof expected,'string','fixture must actually violate canonical validator');
  assert.throws(()=>createRecall(d),e=>e instanceof Error&&e.message===expected,expected);assert.equal(bytes(d),before);
 }
});
