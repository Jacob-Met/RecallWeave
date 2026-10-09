import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {parseDeck,serializeDeck,MAX_DECK_BYTES} from '../src/deck.mjs';
import {renderedChoiceKey,inspectChoices,AUDIT_FORMAT} from '../src/choice-visibility.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
function fixture(options=['A','B']) {
 return {format:'recallweave-deck/1',title:'Review',attribution:'Original',license:'Original',concepts:['One'],items:[{id:'q',concept:'One',prerequisites:[],prompt:'Choose.',options,answer:0,explanation:'Explain.',transfer:'Transfer.'}]};
}
const analyze=options=>inspectChoices(parseDeck(JSON.stringify(fixture(options))));

test('native importer still admits exact-text variants without changing their original bytes',()=>{
 const deck=parseDeck(JSON.stringify(fixture(['A',' A '])));
 assert.deepEqual(deck.items[0].options,['A',' A ']);
 assert.deepEqual(parseDeck(serializeDeck(deck)).items[0].options,['A',' A ']);
});
test('leading and trailing CSS-collapsed spacing produces a visible collision',()=>{
 const report=analyze(['A',' A ']);
 assert.equal(report.format,AUDIT_FORMAT);assert.equal(report.questionsScanned,1);
 assert.equal(report.collisions.length,1);
 assert.deepEqual(report.collisions[0].optionIndexes,[0,1]);
 assert.deepEqual(report.collisions[0].exactTexts,['A',' A ']);
});
test('tabs and newlines collapse to the same rendered wording',()=>{
 const report=analyze(['A  B','A B','A\tB','A\nB']);
 assert.equal(report.collisions.length,1);assert.deepEqual(report.collisions[0].optionIndexes,[0,1,2,3]);
});
test('same raw option remains rejected by unchanged importer before inspection',()=>{
 assert.throws(()=>analyze(['A','A']),/distinct/);
});
test('genuinely distinct options are not reported',()=>{
 assert.deepEqual(analyze(['A B','AB']).collisions,[]);
 assert.deepEqual(analyze(['1','2']).invisible,[]);
});
test('nonbreaking and invisible format controls are separately advisory',()=>{
 const report=analyze(['A B','A\u00a0B','A\u200bB']);
 assert.deepEqual(report.collisions,[]);
 assert.equal(report.invisible.length,2);
 assert.deepEqual(report.invisible.map(x=>x.optionIndex),[1,2]);
});
test('Unicode mathematical alternatives remain distinct',()=>{
 const report=analyze(['λ h < 1','λ h ≤ 1','λ h > 1','λ h = 1']);
 assert.equal(report.collisions.length,0);
});
test('all findings keep original question identifiers and correct alternative indices unchanged',()=>{
 const d=fixture(['A',' A ']);d.items[0].answer=1;
 const copy=JSON.stringify(d), parsed=parseDeck(copy), report=inspectChoices(parsed);
 assert.equal(report.collisions[0].questionId,'q');assert.equal(parsed.items[0].answer,1);
 assert.equal(JSON.stringify(d),copy);
});
test('report freezes collision arrays and metadata',()=>{
 const report=analyze(['A',' A ']);
 assert.ok(Object.isFrozen(report)&&Object.isFrozen(report.collisions)&&Object.isFrozen(report.collisions[0].optionIndexes));
});
test('reject nontext alternatives and unvalidated data instead of coercing them',()=>{
 assert.throws(()=>renderedChoiceKey(null),/string/);
 assert.throws(()=>inspectChoices({title:'x',items:[{id:'q',options:[1,2]}]}),/string/);
});
test('two independent real importer samples preserve exact choice keys and answer placement',()=>{
 const d=fixture(['1 + 1 = 2','2 + 2 = 4','3 + 3 = 6']);
 d.items[0].answer=2;
 const before=JSON.stringify(d), parsed=parseDeck(before), report=inspectChoices(parsed);
 assert.equal(report.questionsScanned,1); assert.equal(report.collisions.length,0);
 assert.equal(report.invisible.length,0); assert.equal(parsed.items[0].answer,2);
 assert.equal(JSON.stringify(d),before);
});
test('size admission and parse errors remain native and unchanged',()=>{
 assert.equal(MAX_DECK_BYTES,262144);
 assert.throws(()=>parseDeck('{oops'),/valid JSON/);
 assert.throws(()=>parseDeck('x'.repeat(MAX_DECK_BYTES+1)),/256 KiB/);
});
test('stand-alone page deterministically embeds exact unchanged native importer',()=>{
 const output=readFileSync(path.resolve(here,'../courses/choice-visibility-review.html'),'utf8');
 const native=readFileSync(path.resolve(here,'../src/deck.mjs'),'utf8').replace(/\bexport\s+/gu,'');
 assert.ok(output.includes(native));
 assert.equal(output.includes('/*__NATIVE_DECK__*/'),false);
 assert.equal(output.includes('<script src='),false);
 execFileSync(process.execPath,[path.resolve(here,'../tools/build-choice-visibility.mjs'),'--check']);
});
test('changed importer source must invalidate generated page in --check mode',()=>{
 const output=path.resolve(here,'../courses/choice-visibility-review.html');
 const current=readFileSync(output,'utf8');
 try {
  writeFileSync(output,current.replace('Choose a file to begin.','Choose a suspicious file to begin.'));
  assert.throws(()=>execFileSync(process.execPath,[path.resolve(here,'../tools/build-choice-visibility.mjs'),'--check']),/Stale standalone output/);
 } finally {writeFileSync(output,current);}
});
