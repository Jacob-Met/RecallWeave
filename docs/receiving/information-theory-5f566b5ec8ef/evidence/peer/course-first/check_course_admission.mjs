import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {parseDeck,serializeDeck} from '../../../source/src/deck.mjs';
const here=new URL('./',import.meta.url);
const raw=await readFile(new URL('sealed-course.json',here));
const sha=x=>createHash('sha256').update(x).digest('hex');
assert.equal(sha(raw),'1ed27859b54da0f8a836f8e0d8f176f04727dbf3852e10c4b7310446a0f0742b');
const derived=JSON.parse(await readFile(new URL('derived-answers-before-key.json',here)));
const deck=parseDeck(raw.toString('utf8'));
assert.equal(deck.items.length,16);assert.equal(deck.concepts.length,5);
assert(Object.isFrozen(deck)&&Object.isFrozen(deck.items));
for(const item of deck.items){
 assert(Object.isFrozen(item)&&Object.isFrozen(item.options));
 assert.equal(item.answer,derived.answers.find(x=>x.id===item.id).answer);
}
assert.deepEqual(parseDeck(serializeDeck(deck)),deck);
const receipt={schema:'recallweave.information-theory.peer-course-admission.v1',courseSHA256:sha(raw),
 items:deck.items.length,concepts:deck.concepts.length,independentlyDerivedAnswersMatched:16,
 parsedAndFrozen:true,serializeParseRoundTrip:true,
 validator:'Exact unchanged current src/deck.mjs; no learner/runtime changes, no browser or Actions.'};
console.log(JSON.stringify(receipt));
await writeFile(new URL('course-admission-receipt.json',here),JSON.stringify(receipt,null,2)+'\n');
