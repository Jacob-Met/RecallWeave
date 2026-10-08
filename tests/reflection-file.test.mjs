import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createReflections,updateReflection,updateApplicationReflection} from '../src/reflections.mjs';
import {createReflectionFile,readReflectionFile,REFLECTION_FILE_MAX_BYTES} from '../src/reflection-file.mjs';
const deck=JSON.parse(readFileSync(new URL('../data/deck.json',import.meta.url),'utf8'));
const savedAt='2026-10-08T19:20:00.000Z';
const original=updateApplicationReflection(updateReflection(createReflections(deck.items),deck.items[1].id,'  My wording: π → ATP\n<em>literal</em>\n'),'My application\r\nwith a second line.');
const file=()=>createReflectionFile({deck,reflections:original,savedAt});
const mutate=fn=>{const d=JSON.parse(file().text);fn(d);return JSON.stringify(d);};

test('literal writing round-trips in course order without answer/model state',()=>{
 const result=readReflectionFile(file().text,deck);
 assert.deepEqual(result.reflections,original);
 assert.equal(result.writtenQuestions,1);
 assert.equal(result.savedAt,savedAt);
 assert.deepEqual(Object.keys(JSON.parse(file().text)),['format','version','savedAt','deck','notes','application']);
 assert.ok(Object.isFrozen(result.reflections));
 assert.ok(Object.isFrozen(result.reflections.notes[0]));
 assert.equal(file().text,file().text);
});
test('file input order may differ; question identity controls the result',()=>{
 const result=readReflectionFile(mutate(d=>d.notes.reverse()),deck);
 assert.deepEqual(result.reflections,original);
});
test('whole-course identity rejects corrections, option changes and new attribution',()=>{
 for(const change of [d=>d.title+='!',d=>d.items[0].prompt+='!',d=>d.items[0].options.reverse(),d=>d.license+='!']){
  const other=structuredClone(deck);change(other);
  assert.throws(()=>readReflectionFile(file().text,other),/different course/);
 }
 const reversed=Object.fromEntries(Object.entries(deck).reverse());
 assert.deepEqual(readReflectionFile(file().text,reversed).reflections,original);
});
test('omitted, repeated, wrong and malformed fields refuse without partial writing',()=>{
 for(const change of [d=>d.notes.pop(),d=>d.notes.push(d.notes[0]),d=>d.notes[0].item='unknown',d=>d.notes[0].text=42,d=>delete d.application,d=>d.application={},d=>d.notes[0].answer=0,d=>d.firstAnswers=[],d=>d.version=2]){
  assert.throws(()=>readReflectionFile(mutate(change),deck),RangeError);
 }
 assert.deepEqual(original.notes[1].text,'  My wording: π → ATP\n<em>literal</em>\n');
});
test('all-empty writing is an explicit valid replacement, never omitted',()=>{
 const blank=createReflections(deck.items);
 const result=readReflectionFile(createReflectionFile({deck,reflections:blank,savedAt}).text,deck);
 assert.deepEqual(result.reflections,blank);
 assert.equal(result.writtenQuestions,0);
});
test('limits apply to encoded bytes and never truncate writing',()=>{
 const huge=updateApplicationReflection(original,'🪴'.repeat(REFLECTION_FILE_MAX_BYTES/4));
 assert.throws(()=>createReflectionFile({deck,reflections:huge,savedAt}),/2 MiB/);
 assert.throws(()=>readReflectionFile(' '.repeat(REFLECTION_FILE_MAX_BYTES+1),deck),/2 MiB/);
 assert.equal(huge.application.length,REFLECTION_FILE_MAX_BYTES/2);
});
test('invalid JSON, save times and non-text inputs refuse',()=>{
 for(const text of ['{','null','[]','42',null])assert.throws(()=>readReflectionFile(text,deck),RangeError);
 for(const value of ['yesterday','2026-10-08',null])assert.throws(()=>readReflectionFile(mutate(d=>d.savedAt=value),deck),/save time/);
 assert.throws(()=>createReflectionFile({deck,reflections:original,savedAt:'invalid'}),/save time/);
});
test('creation leaves course and native immutable writing unchanged',()=>{
 const before=JSON.stringify({deck,original});file();readReflectionFile(file().text,deck);
 assert.equal(JSON.stringify({deck,original}),before);
});
