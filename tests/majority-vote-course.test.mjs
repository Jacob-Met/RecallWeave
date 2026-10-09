import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseDeck } from '../src/deck.mjs';

test('lesson uses original importer and exact frozen question prompts/options',()=>{
  const raw=readFileSync(new URL('../courses/majority-vote.json',import.meta.url),'utf8');
  const deck=parseDeck(raw);
  const questions=JSON.parse(readFileSync(new URL('../docs/receiving/majority-vote-65ae877160f6/questions-only-v2.json',import.meta.url),'utf8')).questions;
  assert.equal(deck.items.length,12);
  assert.deepEqual(deck.concepts,['strict-majority','cancellation','verification','invariants']);
  assert.deepEqual(deck.items.map(({id,concept,prerequisites,prompt,options})=>({id,concept,prerequisites,prompt,options})),questions);
  assert.deepEqual(deck.items.map(x=>x.answer),[1,2,0,3,1,2,1,0,3,2,1,3]);
  assert.ok(deck.items.every(x=>x.explanation.includes(' ')&&x.transfer.includes(' ')));
});
