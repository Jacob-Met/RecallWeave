import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parseDeck,serializeDeck} from '../src/deck.mjs';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8');
test('original matching lesson is accepted without loss by the maintained validator',()=>{
  const text=read('courses/bipartite-matching.json'),deck=parseDeck(text);
  assert.equal(serializeDeck(deck),text);assert.equal(deck.items.length,12);
  assert.deepEqual(deck.concepts,['matching-rules','augmenting-paths','alternating-search','maximum-cardinality']);
  for(const concept of deck.concepts)assert.equal(deck.items.filter(item=>item.concept===concept).length,3);
  for(const item of deck.items){
    assert.ok(item.explanation.length>100);assert.ok(item.transfer.length>50);
    assert.ok(item.options.every(option=>option.trim().length>0));
  }
});
test('standalone downloads are exact UTF-8 lesson and guide assets',()=>{
  const html=read('courses/bipartite-matching-explorer.html');
  const match=html.match(/<script type="application\/json" id="matching-assets">([^<]+)<\/script>/);
  assert.ok(match);const assets=JSON.parse(match[1]);
  for(const [key,file]of [['course','bipartite-matching.json'],['guide','bipartite-matching.md']]){
    assert.equal(assets[key].name,file);
    assert.deepEqual(Buffer.from(assets[key].base64,'base64'),readFileSync(new URL('courses/'+file,root)));
  }
  assert.equal((html.match(/<!-- BIPARTITE_/g)||[]).length,0);
  assert.equal((html.match(/<script[^>]+src=/g)||[]).length,0);
});
test('standalone check is read-only and invalid flags leave the published file intact',()=>{
  const original=read('courses/bipartite-matching-explorer.html');
  execFileSync(process.execPath,['tools/build-bipartite-matching.mjs','--check'],{cwd:fileURLToPath(root),stdio:'pipe'});
  assert.throws(()=>execFileSync(process.execPath,['tools/build-bipartite-matching.mjs','--unknown'],{cwd:fileURLToPath(root),stdio:'pipe'}));
  assert.equal(read('courses/bipartite-matching-explorer.html'),original);
});
